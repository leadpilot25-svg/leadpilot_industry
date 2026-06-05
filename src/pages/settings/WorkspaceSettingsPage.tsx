import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import type { WorkspaceSettings, BusinessType } from '../../types/tenant'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'real_estate', label: 'Real Estate'      },
  { value: 'insurance',   label: 'Insurance'        },
  { value: 'travel',      label: 'Travel Agency'    },
  { value: 'tarot',       label: 'Tarot & Healing'  },
  { value: 'coach',       label: 'Coaching'         },
  { value: 'education',   label: 'Education'        },
  { value: 'taxi',        label: 'Taxi & Transport' },
  { value: 'marketing',   label: 'Marketing Agency' },
  { value: 'general',     label: 'General Business' },
  { value: 'custom',      label: 'Custom / Other'   },
]

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
]

const CURRENCIES = [
  { value: 'INR', label: 'INR — Indian Rupee'      },
  { value: 'USD', label: 'USD — US Dollar'          },
  { value: 'EUR', label: 'EUR — Euro'               },
  { value: 'GBP', label: 'GBP — British Pound'      },
  { value: 'AED', label: 'AED — UAE Dirham'         },
  { value: 'SGD', label: 'SGD — Singapore Dollar'   },
  { value: 'AUD', label: 'AUD — Australian Dollar'  },
]

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  id, label, hint, children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
const selectCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

// ─── Form state type ─────────────────────────────────────────────────────────

interface FormState {
  company_name:    string
  whatsapp_number: string
  business_type:   BusinessType
  timezone:        string
  currency:        string
  brand_color:     string
}

function settingsToForm(ws: WorkspaceSettings): FormState {
  return {
    company_name:    ws.company_name,
    whatsapp_number: ws.whatsapp_number ?? '',
    business_type:   ws.business_type,
    timezone:        ws.timezone,
    currency:        ws.currency,
    brand_color:     ws.brand_color,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WorkspaceSettingsPage() {
  const { profile, user, isRole } = useAuth()
  const tenantId    = profile?.tenant_id ?? null
  // Only super_admin can change business_type — all others see it read-only
  const canChangeIndustry = isRole('super_admin')

  const [settings,    setSettings]    = useState<WorkspaceSettings | null>(null)
  const [form,        setForm]        = useState<FormState | null>(null)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Logo upload state
  const [logoFile,       setLogoFile]       = useState<File | null>(null)
  const [logoPreview,    setLogoPreview]     = useState<string | null>(null)
  const [uploadingLogo,  setUploadingLogo]   = useState(false)
  const [logoError,      setLogoError]       = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load workspace settings ──────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return

    supabase
      .from('workspace_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setLoadError(`Could not load settings: ${error.message}`)
          return
        }
        const ws = data as WorkspaceSettings
        setSettings(ws)
        setForm(settingsToForm(ws))
        if (ws.logo_url) setLogoPreview(ws.logo_url)
      })
  }, [tenantId])

  // ── Form field change ────────────────────────────────────────────────────
  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => prev ? { ...prev, [field]: value } : prev)
    setSaveSuccess(false)
  }

  // ── Logo file selection ──────────────────────────────────────────────────
  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Please upload a PNG, JPG, WebP, or SVG file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2 MB.')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  // ── Upload logo to Supabase Storage ─────────────────────────────────────
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return settings?.logo_url ?? null

    const ext  = logoFile.name.split('.').pop() ?? 'png'
    const path = `${user.id}/logo-${Date.now()}.${ext}`

    setUploadingLogo(true)
    const { error } = await supabase.storage
      .from('logos')
      .upload(path, logoFile, { upsert: true })
    setUploadingLogo(false)

    if (error) {
      setLogoError(`Logo upload failed: ${error.message}`)
      return null
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form || !tenantId || !settings) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Upload logo first if one was selected
      const logoUrl = await uploadLogo()
      if (logoFile && !logoUrl) {
        // uploadLogo already set logoError
        setSaving(false)
        return
      }

      // business_type is excluded from the update payload for non-super-admin.
      // The DB trigger also blocks it as a second line of defence.
      const update: Partial<WorkspaceSettings> = {
        company_name:    form.company_name.trim(),
        whatsapp_number: form.whatsapp_number.trim() || null,
        timezone:        form.timezone,
        currency:        form.currency,
        brand_color:     form.brand_color,
        ...(canChangeIndustry ? { business_type: form.business_type } : {}),
      }

      if (logoUrl !== null) {
        update.logo_url = logoUrl
      }

      const { error } = await supabase
        .from('workspace_settings')
        .update(update)
        .eq('tenant_id', tenantId)

      if (error) throw new Error(error.message)

      // Refresh local state
      setSettings(prev => prev ? { ...prev, ...update } : prev)
      setLogoFile(null)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-rose-400">{loadError}</p>
        </div>
      </AppLayout>
    )
  }

  if (!form) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Workspace settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage your company profile and preferences.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── Company section ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900">Company</h2>

            {/* Logo */}
            <div>
              <p className="block text-sm font-medium text-gray-300 mb-2">Company logo</p>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 10.5h.008v.008H13.5V10.5z" />
                    </svg>
                  )}
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
                  >
                    {logoFile ? 'Change logo' : 'Upload logo'}
                  </button>
                  {logoFile && (
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview(settings?.logo_url ?? null) }}
                      className="block text-xs text-gray-500 hover:text-rose-400 transition"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-gray-600">PNG, JPG, WebP, SVG — max 2 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
              {logoError && <p className="mt-1.5 text-xs text-rose-400">{logoError}</p>}
            </div>

            {/* Company name */}
            <Field id="company_name" label="Company name">
              <input
                id="company_name"
                type="text"
                required
                value={form.company_name}
                onChange={e => handleChange('company_name', e.target.value)}
                placeholder="Acme Pvt Ltd"
                className={inputCls}
              />
            </Field>

            {/* Business type — read-only for client_admin and agent */}
            <Field id="business_type" label="Business type">
              {canChangeIndustry ? (
                <select
                  id="business_type"
                  value={form.business_type}
                  onChange={e => handleChange('business_type', e.target.value)}
                  className={selectCls}
                >
                  {BUSINESS_TYPES.map(bt => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {BUSINESS_TYPES.find(bt => bt.value === form.business_type)?.label ?? form.business_type}
                  </p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Assigned by admin
                  </span>
                </div>
              )}
            </Field>

            {/* WhatsApp number */}
            <Field
              id="whatsapp_number"
              label="WhatsApp number"
              hint="Used for quick-dial links on lead detail pages."
            >
              <div className="flex rounded-lg shadow-sm">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-200 bg-gray-100 px-3 text-sm text-gray-500">
                  +
                </span>
                <input
                  id="whatsapp_number"
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={e => handleChange('whatsapp_number', e.target.value)}
                  placeholder="91 98765 43210"
                  className="block w-full rounded-r-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </Field>

            {/* Brand colour */}
            <Field
              id="brand_color"
              label="Brand colour"
              hint="Used for accents in reports and future customisation."
            >
              <div className="flex items-center gap-3">
                <input
                  id="brand_color"
                  type="color"
                  value={form.brand_color}
                  onChange={e => handleChange('brand_color', e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />
                <input
                  type="text"
                  value={form.brand_color}
                  onChange={e => handleChange('brand_color', e.target.value)}
                  placeholder="#6366F1"
                  maxLength={7}
                  className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </Field>
          </div>

          {/* ── Regional section ───────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900">Regional</h2>

            <Field id="timezone" label="Timezone">
              <select
                id="timezone"
                value={form.timezone}
                onChange={e => handleChange('timezone', e.target.value)}
                className={selectCls}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>

            <Field id="currency" label="Currency">
              <select
                id="currency"
                value={form.currency}
                onChange={e => handleChange('currency', e.target.value)}
                className={selectCls}
              >
                {CURRENCIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Feedback ───────────────────────────────────────────────── */}
          {saveError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Settings saved successfully.
            </div>
          )}

          {/* ── Public form shortcut ──────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Public Form</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Share a form link or QR code to capture leads from anywhere.
                </p>
              </div>
              <Link
                to="/settings/public-form"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Build form
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Custom fields shortcut ─────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Custom fields</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Add extra fields to your lead forms for your industry.
                </p>
              </div>
              <Link
                to="/settings/custom-fields"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Manage fields
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── WhatsApp templates shortcut ────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">WhatsApp templates</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Create reusable message templates for quick client outreach.
                </p>
              </div>
              <Link
                to="/settings/whatsapp-templates"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Manage templates
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Google Sheets shortcut ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Google Sheets sync</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Back up every lead to a Google Sheet automatically.
                </p>
              </div>
              <Link
                to="/settings/google-sheets"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                Configure
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Save button ────────────────────────────────────────────── */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingLogo || !form.company_name.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(saving || uploadingLogo) && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {saving || uploadingLogo ? 'Saving…' : 'Save settings'}
            </button>
          </div>

        </form>
      </div>
    </AppLayout>
  )
}
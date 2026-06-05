import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  fetchFormForBuilder, fetchFormAnalytics, DEFAULT_FIELDS,
  type FormField, type FormBranding, type FieldType, type FormAnalytics,
} from '../../lib/services/publicForm.service'
import { supabase } from '../../lib/supabase'

// ─── QR Code (pure canvas, no npm package) ───────────────────────────────────
// Uses the public QR code API — no npm dependency, works offline-gracefully

function QRCode({ url, size = 200 }: { url: string; size?: number }) {
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=111827&margin=10`
  return (
    <img
      src={apiUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-xl border border-gray-200 shadow-sm"
    />
  )
}

// ─── Field type options ───────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'phone',    label: 'Phone' },
  { value: 'email',    label: 'Email' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'number',   label: 'Number' },
]

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
const CORE_FIELDS = ['name', 'phone', 'email', 'city', 'notes']

function newField(): FormField {
  return {
    id:          `f_${Date.now()}`,
    label:       '',
    field_key:   `field_${Date.now()}`,
    type:        'text',
    required:    false,
    placeholder: '',
    options:     [],
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FormBuilderPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  console.log('[FormBuilderPage] mount — tenantId:', tenantId, 'role:', profile?.role)

  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [slug,       setSlug]       = useState<string | null>(null)
  const [isActive,   setIsActive]   = useState(false)
  const [formName,   setFormName]   = useState('Contact Us')
  const [fields,     setFields]     = useState<FormField[]>(DEFAULT_FIELDS)
  const [branding,   setBranding]   = useState<FormBranding>({
    company_name:  '',
    logo_url:      null,
    primary_color: '#10B981',
    header_text:   'Get in touch',
  })
  const [thankYou,   setThankYou]   = useState('Thank you! We will contact you shortly.')
  const [tab,        setTab]        = useState<'fields' | 'branding' | 'share' | 'analytics'>('fields')
  const [copied,     setCopied]     = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [analytics,  setAnalytics]  = useState<FormAnalytics | null>(null)

  const formUrl = slug
    ? `${window.location.origin}/f/${slug}`
    : null

  useEffect(() => {
    console.log('[FormBuilderPage] useEffect — tenantId:', tenantId)
    if (!tenantId) {
      console.log('[FormBuilderPage] no tenantId — stopping loader')
      setLoading(false)
      return
    }
    fetchFormAnalytics(tenantId).then(a => setAnalytics(a))
    fetchFormForBuilder(tenantId).then(data => {
      if (!data) {
        setLoading(false)
        return
      }
      setSlug(data.slug)
      setFormName(data.name)
      setFields(data.field_config)
      setBranding(data.branding)
      setThankYou(data.thank_you_msg)
      setIsActive(data.is_active)
      setLoading(false)
    }).catch(() => setLoading(false))   // never hang on error
  }, [tenantId])

  const handleSave = async () => {
    if (!tenantId) return
    setSaving(true)
    setError(null)
    try {
      const { data, error: rpcErr } = await supabase.rpc('upsert_public_form', {
        p_tenant_id:    tenantId,
        p_name:         formName,
        p_field_config: fields,
        p_branding:     branding,
        p_thank_you:    thankYou,
        p_is_active:    isActive,
      })
      if (rpcErr) throw new Error(rpcErr.message)
      const result = data as { success: boolean; slug: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Save failed')
      if (!slug) setSlug(result.slug)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = () => {
    if (!formUrl) return
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const addField = () => {
    const f = newField()
    setFields(prev => [...prev, f])
    setEditingIdx(fields.length)
  }

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx))
    setEditingIdx(null)
  }

  const updateField = (idx: number, patch: Partial<FormField>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const moveField = (idx: number, dir: 'up' | 'down') => {
    const next = [...fields]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setFields(next)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  const TAB_CLS = (active: boolean) =>
    `px-4 py-2 text-sm font-semibold rounded-xl transition ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Public Form</h1>
            <p className="mt-0.5 text-sm text-gray-500">Share a link and capture leads automatically.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">{isActive ? 'Live' : 'Disabled'}</span>
              <button
                onClick={() => setIsActive(v => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error  && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {saved  && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ Changes saved.</div>}

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {(['fields', 'branding', 'share', 'analytics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={TAB_CLS(tab === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Fields tab ── */}
        {tab === 'fields' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Form title</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className={inputCls} placeholder="Contact Us" />
            </div>

            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* Field header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {field.label || 'Untitled field'}
                    </p>
                    <p className="text-xs text-gray-400">{FIELD_TYPES.find(t => t.value === field.type)?.label} {field.required ? '· Required' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => moveField(idx, 'up')} disabled={idx === 0}
                      className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}
                      className="rounded p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {!CORE_FIELDS.includes(field.field_key) && (
                      <button onClick={() => removeField(idx)}
                        className="rounded p-1 text-gray-400 hover:text-rose-500">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded editor */}
                {editingIdx === idx && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(idx, { label: e.target.value })}
                          className={inputCls}
                          placeholder="Field label"
                          disabled={CORE_FIELDS.includes(field.field_key)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                        <select
                          value={field.type}
                          onChange={e => updateField(idx, { type: e.target.value as FieldType })}
                          className={inputCls}
                          disabled={CORE_FIELDS.includes(field.field_key)}
                        >
                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={e => updateField(idx, { placeholder: e.target.value })}
                        className={inputCls}
                        placeholder="Hint text…"
                      />
                    </div>
                    {field.type === 'select' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Options (one per line)</label>
                        <textarea
                          rows={4}
                          value={field.options.join('\n')}
                          onChange={e => updateField(idx, { options: e.target.value.split('\n').filter(Boolean) })}
                          className={`${inputCls} resize-none`}
                          placeholder={"Option 1\nOption 2\nOption 3"}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(idx, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Required field</span>
                    </label>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addField}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3.5 text-sm font-semibold text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add field
            </button>
          </div>
        )}

        {/* ── Branding tab ── */}
        {tab === 'branding' && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company / Business name</label>
              <input type="text" value={branding.company_name}
                onChange={e => setBranding(b => ({ ...b, company_name: e.target.value }))}
                className={inputCls} placeholder="Acme Insurance" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Header text</label>
              <input type="text" value={branding.header_text}
                onChange={e => setBranding(b => ({ ...b, header_text: e.target.value }))}
                className={inputCls} placeholder="Get in touch" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Primary colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={branding.primary_color}
                  onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-200 p-0.5" />
                <input type="text" value={branding.primary_color}
                  onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                  className={`${inputCls} w-36`} placeholder="#10B981" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Logo URL <span className="font-normal text-gray-400">(optional)</span></label>
              <input type="url" value={branding.logo_url ?? ''}
                onChange={e => setBranding(b => ({ ...b, logo_url: e.target.value || null }))}
                className={inputCls} placeholder="https://yoursite.com/logo.png" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Thank you message</label>
              <textarea rows={3} value={thankYou}
                onChange={e => setThankYou(e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Thank you! We will contact you shortly." />
            </div>
          </div>
        )}

        {/* ── Share tab ── */}
        {tab === 'share' && (
          <div className="space-y-4">
            {!slug ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="text-sm font-medium text-amber-800">Save the form first to get a shareable link.</p>
              </div>
            ) : !isActive ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="text-sm font-medium text-amber-800">Enable the form (toggle at top) and save to make it live.</p>
              </div>
            ) : (
              <>
                {/* Link card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Form link</p>
                  <div className="flex gap-2">
                    <input readOnly value={formUrl!}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 select-all" />
                    <button onClick={copyLink}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${copied ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <a href={formUrl!} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition">
                    Preview form →
                  </a>
                </div>

                {/* QR code card */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">QR Code</p>
                  <div className="flex flex-col items-center gap-4">
                    <QRCode url={`${formUrl}?src=qr`} size={200} />
                    <p className="text-xs text-gray-500 text-center">
                      Print this on brochures, posters, or business cards.<br />
                      Leads from QR code are tracked separately.
                    </p>
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${formUrl}?src=qr`)}&bgcolor=ffffff&color=111827&margin=10`}
                      download="leadpilot-qr.png"
                      className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download QR PNG
                    </a>
                  </div>
                </div>

                {/* Source tracking info */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Source tracking</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>• Direct link → source tagged as <span className="font-mono font-semibold">public_form</span></p>
                    <p>• QR code scan → source tagged as <span className="font-mono font-semibold">qr_code</span></p>
                    <p>• Both appear as filters in your Leads page</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Analytics tab ── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            {!slug ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="text-sm font-medium text-amber-800">Save the form first to see analytics.</p>
              </div>
            ) : !analytics ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse h-24" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: 'Form Views',
                      value: analytics.view_count.toLocaleString(),
                      icon: '👁️',
                      sub: 'Total page loads',
                      color: 'bg-blue-50 border-blue-100',
                      num: 'text-blue-700',
                    },
                    {
                      label: 'Submissions',
                      value: analytics.submit_count.toLocaleString(),
                      icon: '📥',
                      sub: 'Leads captured',
                      color: 'bg-emerald-50 border-emerald-100',
                      num: 'text-emerald-700',
                    },
                    {
                      label: 'Conversion Rate',
                      value: `${analytics.conversion_rate}%`,
                      icon: '📊',
                      sub: 'Views → Submissions',
                      color: 'bg-violet-50 border-violet-100',
                      num: 'text-violet-700',
                    },
                    {
                      label: 'Last Submission',
                      value: analytics.last_submitted_at
                        ? new Date(analytics.last_submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Never',
                      icon: '🕐',
                      sub: analytics.last_submitted_at
                        ? new Date(analytics.last_submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—',
                      color: 'bg-amber-50 border-amber-100',
                      num: 'text-amber-700',
                    },
                  ].map(card => (
                    <div key={card.label} className={`rounded-2xl border p-4 ${card.color}`}>
                      <div className="flex items-start justify-between">
                        <span className="text-xl">{card.icon}</span>
                      </div>
                      <p className={`mt-2 text-2xl font-bold ${card.num}`}>{card.value}</p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-600">{card.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Views are counted each time someone opens the form URL.
                    Submissions are counted on successful lead creation.
                    Duplicates are not counted as new submissions.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
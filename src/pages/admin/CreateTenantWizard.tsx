import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/layout/AdminLayout'
import type { BusinessType } from '../../types/tenant'

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'trial' | 'starter' | 'pro' | 'enterprise'
type Step = 1 | 2 | 3

interface WizardState {
  // Step 1 — Company
  company_name:  string
  business_type: BusinessType
  timezone:      string
  currency:      string
  // Step 2 — Client admin
  admin_name:    string
  admin_email:   string
  // Step 3 — Plan
  plan:          Plan
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_TYPES: { value: BusinessType; label: string; emoji: string }[] = [
  { value: 'real_estate', label: 'Real Estate',      emoji: '🏠' },
  { value: 'insurance',   label: 'Insurance',         emoji: '🛡️' },
  { value: 'travel',      label: 'Travel Agency',     emoji: '✈️' },
  { value: 'tarot',       label: 'Tarot & Healing',   emoji: '🔮' },
  { value: 'coach',       label: 'Coaching',          emoji: '🎯' },
  { value: 'education',   label: 'Education',         emoji: '🎓' },
  { value: 'taxi',        label: 'Taxi & Transport',  emoji: '🚕' },
  { value: 'marketing',   label: 'Marketing Agency',  emoji: '📣' },
  { value: 'general',     label: 'General Business',  emoji: '💼' },
  { value: 'custom',      label: 'Custom',            emoji: '⚙️' },
]

const PLANS: { value: Plan; label: string; desc: string; price: string }[] = [
  { value: 'trial',      label: 'Free Trial',   desc: '14-day trial, all features',   price: 'Free'    },
  { value: 'starter',    label: 'Starter',      desc: 'Up to 5 users, 1000 leads',    price: '₹999/mo' },
  { value: 'pro',        label: 'Pro',          desc: 'Up to 20 users, unlimited leads', price: '₹2999/mo' },
  { value: 'enterprise', label: 'Enterprise',   desc: 'Unlimited users & leads',      price: 'Custom'  },
]

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']

// ─── UI helpers ───────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition'
  + ' focus:ring-emerald-500 focus:border-emerald-500'
const borderNormal = 'border-slate-700'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all"
        style={
          done   ? { background: '#10B981', color: '#fff' } :
          active ? { background: 'rgba(16,185,129,0.2)', border: '2px solid #10B981', color: '#10B981' } :
                   { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6B7280' }
        }
      >
        {done ? (
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : n}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CreateTenantWizard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [step,       setStep]       = useState<Step>(1)
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [form, setForm] = useState<WizardState>({
    company_name:  '',
    business_type: 'custom',
    timezone:      'Asia/Kolkata',
    currency:      'INR',
    admin_name:    '',
    admin_email:   '',
    plan:          'trial',
  })

  const set = (key: keyof WizardState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleCreate = async () => {
    setCreating(true)
    setError(null)

    try {
      if (!profile?.id) throw new Error('Super admin profile not found')

      // Phase 1: Create tenant, workspace, subscription, pipeline, invitation row.
      const { data, error: rpcErr } = await supabase.rpc('create_tenant_with_invitation', {
        p_company_name:  form.company_name,
        p_business_type: form.business_type,
        p_timezone:      form.timezone,
        p_currency:      form.currency,
        p_plan:          form.plan,
        p_admin_email:   form.admin_email,
        p_admin_name:    form.admin_name,
        p_invited_by:    profile.id,
      })

      if (rpcErr) throw new Error(rpcErr.message)

      const result = data as {
        success:     boolean
        error?:      string
        tenant_id?:  string
        token?:      string
        email?:      string
      }
      if (!result.success) throw new Error(result.error ?? 'Tenant creation failed')

      // Phase 2: Send magic link. When clicked, Supabase creates auth.users,
      // handle_new_user trigger fires, reads the invitation row, and sets
      // tenant_id + role = client_admin on the new profile automatically.
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: form.admin_email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/accept-invite?token=${result.token}`,
          shouldCreateUser: true,
        },
      })

      if (otpErr) {
        console.warn('Magic link not sent:', otpErr.message)
      }

      setSuccessMsg(
        `Tenant "${form.company_name}" created. ` +
        `Invitation sent to ${form.admin_email}. ` +
        `If email is not configured, they can use Forgot Password to access their account.`
      )

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  if (successMsg) {
    return (
      <AdminLayout>
        <div className="flex min-h-full items-center justify-center p-8">
          <div className="w-full max-w-md text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-white">Tenant Created</p>
              <p className="mt-2 text-sm text-slate-400">{successMsg}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/admin/tenants')}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                View all tenants
              </button>
              <button
                onClick={() => { setSuccessMsg(null); setStep(1); setForm({ company_name: '', business_type: 'custom', timezone: 'Asia/Kolkata', currency: 'INR', admin_name: '', admin_email: '', plan: 'trial' }) }}
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Create another
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="px-6 py-7 max-w-xl">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/admin/tenants')} className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to tenants
          </button>
          <h1 className="text-2xl font-bold text-white">Create Tenant</h1>
          <p className="mt-1 text-sm text-slate-500">Set up a new workspace and invite the client admin.</p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center gap-3">
          {[
            { n: 1, label: 'Company' },
            { n: 2, label: 'Admin'   },
            { n: 3, label: 'Plan'    },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                <span className={`text-xs font-medium ${step === s.n ? 'text-white' : step > s.n ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className="w-8 h-px" style={{ background: step > s.n ? '#10B981' : 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)' }}
        >

          {/* Step 1 — Company */}
          {step === 1 && (
            <>
              <h2 className="text-base font-semibold text-white">Company details</h2>
              <Field label="Company name" required>
                <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)}
                  placeholder="Acme Travel Pvt Ltd" className={`${inputCls} ${borderNormal}`} />
              </Field>
              <Field label="Business type">
                <select value={form.business_type} onChange={e => set('business_type', e.target.value)}
                  className={`${inputCls} ${borderNormal}`}>
                  {BUSINESS_TYPES.map(bt => (
                    <option key={bt.value} value={bt.value}>{bt.emoji} {bt.label}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Timezone">
                  <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
                    className={`${inputCls} ${borderNormal}`}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={form.currency} onChange={e => set('currency', e.target.value)}
                    className={`${inputCls} ${borderNormal}`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* Step 2 — Client Admin */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-base font-semibold text-white">Client Admin details</h2>
                <p className="mt-0.5 text-xs text-slate-500">This person will manage the workspace and create their own agents.</p>
              </div>
              <Field label="Full name" required>
                <input type="text" value={form.admin_name} onChange={e => set('admin_name', e.target.value)}
                  placeholder="Priya Sharma" className={`${inputCls} ${borderNormal}`} />
              </Field>
              <Field label="Email address" required>
                <input type="email" value={form.admin_email} onChange={e => set('admin_email', e.target.value)}
                  placeholder="priya@company.com" className={`${inputCls} ${borderNormal}`} />
              </Field>
              <div className="rounded-xl p-4 text-sm text-slate-400" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="font-medium text-emerald-400 mb-1">What happens next</p>
                <ul className="space-y-1 text-xs">
                  <li>• An invite email is sent to the client admin</li>
                  <li>• They click the link and set their password</li>
                  <li>• They log in and manage their own agents and leads</li>
                  <li>• You (super admin) do not manage their daily operations</li>
                </ul>
              </div>
            </>
          )}

          {/* Step 3 — Plan */}
          {step === 3 && (
            <>
              <h2 className="text-base font-semibold text-white">Subscription plan</h2>
              <div className="space-y-3">
                {PLANS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('plan', p.value)}
                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all"
                    style={
                      form.plan === p.value
                        ? { background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.4)' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    <div>
                      <p className={`text-sm font-semibold ${form.plan === p.value ? 'text-emerald-400' : 'text-white'}`}>{p.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${form.plan === p.value ? 'text-emerald-400' : 'text-slate-400'}`}>{p.price}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Summary</p>
                {[
                  ['Company',    form.company_name],
                  ['Business',   BUSINESS_TYPES.find(b => b.value === form.business_type)?.label ?? ''],
                  ['Admin',      `${form.admin_name} (${form.admin_email})`],
                  ['Plan',       form.plan],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-slate-500">{k}</span>
                    <span className="text-xs text-white text-right">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-1">
            {step > 1 && (
              <button
                onClick={() => setStep(s => (s - 1) as Step)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !form.company_name.trim()) return
                  if (step === 2 && (!form.admin_name.trim() || !form.admin_email.trim())) return
                  setStep(s => (s + 1) as Step)
                }}
                disabled={
                  (step === 1 && !form.company_name.trim()) ||
                  (step === 2 && (!form.admin_name.trim() || !form.admin_email.trim()))
                }
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                {creating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {creating ? 'Creating…' : 'Create Tenant & Send Invite'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
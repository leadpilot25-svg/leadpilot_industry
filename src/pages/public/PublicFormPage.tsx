import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  fetchFormBySlug, submitForm, trackFormView,
  type PublicFormConfig, type FormField, type FormSubmission,
} from '../../lib/services/publicForm.service'

// ─── Field renderer ───────────────────────────────────────────────────────────

function FormFieldInput({
  field, value, onChange, error,
}: {
  field:    FormField
  value:    string
  onChange: (v: string) => void
  error:    string | null
}) {
  const base = [
    'w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
    'focus:outline-none focus:ring-2 transition',
    error
      ? 'border-rose-300 bg-rose-50 focus:ring-rose-300'
      : 'border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-100',
  ].join(' ')

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={`${base} resize-none`}
      />
    )
  }

  if (field.type === 'select' && field.options.length > 0) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={base}>
        <option value="">Select {field.label}</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  const typeMap: Record<string, string> = {
    email: 'email', phone: 'tel', number: 'number', text: 'text',
  }

  return (
    <input
      type={typeMap[field.type] ?? 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      inputMode={field.type === 'phone' ? 'tel' : field.type === 'number' ? 'numeric' : undefined}
      className={base}
    />
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-gray-100" />
        {[1,2,3].map(i => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
            <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Thank you screen ─────────────────────────────────────────────────────────

function ThankYou({ message, color }: { message: string; color: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: color + '20' }}
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">Submitted!</p>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-bold text-gray-900">Form not found</p>
        <p className="text-sm text-gray-500">This form link may have expired or been disabled.</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('src') === 'qr' ? 'qr_code' as const : 'public_form' as const

  const [form,      setForm]      = useState<PublicFormConfig | null>(null)
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'submitting' | 'done' | 'not_found'>('loading')
  const [values,    setValues]    = useState<Record<string, string>>({})
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) { setPageState('not_found'); return }
    fetchFormBySlug(slug).then(f => {
      if (!f) { setPageState('not_found'); return }
      setForm(f)
      const init: Record<string, string> = {}
      f.fields.forEach(field => { init[field.field_key] = '' })
      setValues(init)
      setPageState('ready')
      // Track view — fire and forget
      trackFormView(f.id)
    })
  }, [slug])

  const setValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = (): boolean => {
    if (!form) return false
    const errs: Record<string, string> = {}
    form.fields.forEach(f => {
      if (f.required && !values[f.field_key]?.trim()) {
        errs[f.field_key] = `${f.label} is required`
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form || !validate()) return
    setPageState('submitting')
    setSubmitErr(null)

    const coreKeys = ['name', 'phone', 'email', 'city', 'notes']
    const custom_data: Record<string, string> = {}
    form.fields
      .filter(f => !coreKeys.includes(f.field_key))
      .forEach(f => { if (values[f.field_key]) custom_data[f.field_key] = values[f.field_key] })

    const submission: FormSubmission = {
      name:        values.name ?? '',
      phone:       values.phone ?? '',
      email:       values.email ?? '',
      city:        values.city ?? '',
      notes:       values.notes ?? '',
      custom_data,
    }

    const result = await submitForm(form, submission, source)

    if (result.status === 'error') {
      setSubmitErr(result.message)
      setPageState('ready')
      return
    }

    setPageState('done')
  }

  if (pageState === 'loading')   return <Skeleton />
  if (pageState === 'not_found') return <NotFound />
  if (pageState === 'done' && form) {
    return <ThankYou message={form.thank_you_msg} color={form.branding.primary_color} />
  }
  if (!form) return <NotFound />

  const { branding } = form
  const primaryColor = branding.primary_color || '#10B981'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center" style={{ backgroundColor: primaryColor + '10' }}>
        {branding.logo_url && (
          <img
            src={branding.logo_url}
            alt={branding.company_name}
            className="mx-auto mb-3 h-12 w-auto object-contain"
          />
        )}
        {!branding.logo_url && branding.company_name && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
            {branding.company_name}
          </p>
        )}
        <h1 className="text-xl font-bold text-gray-900">
          {branding.header_text || form.name}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="px-4 pb-12 pt-4 max-w-md mx-auto space-y-3">

        {form.fields.map(field => (
          <div key={field.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            <FormFieldInput
              field={field}
              value={values[field.field_key] ?? ''}
              onChange={v => setValue(field.field_key, v)}
              error={errors[field.field_key] ?? null}
            />
            {errors[field.field_key] && (
              <p className="mt-1 text-xs text-rose-600">{errors[field.field_key]}</p>
            )}
          </div>
        ))}

        {submitErr && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitErr}
          </div>
        )}

        <button
          type="submit"
          disabled={pageState === 'submitting'}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-70"
          style={{ backgroundColor: primaryColor }}
        >
          {pageState === 'submitting' ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Submitting…
            </>
          ) : 'Submit'}
        </button>

        <p className="text-center text-xs text-gray-400 pt-1">
          Powered by <span className="font-semibold text-gray-500">LeadPilot</span>
        </p>
      </form>

    </div>
  )
}
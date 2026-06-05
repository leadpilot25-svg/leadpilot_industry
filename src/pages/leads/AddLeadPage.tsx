import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVocab } from '../../lib/services/industryVocab'
import { getIndustryFields } from '../../lib/services/industryLeadFields'
import { useAuth } from '../../hooks/useAuth'
import { useAgents } from '../../hooks/useAgents'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { createLead } from '../../lib/services/leads.service'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCustomFields } from '../../hooks/useCustomFields'
import { LeadFormFields, EMPTY_FORM, type LeadFormData } from '../../components/leads/LeadFormFields'
import type { PipelineStage } from '../../types/pipeline'

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition'

export function AddLeadPage() {
  const vocab    = useVocab()
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const tenantId    = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)
  const businessType = settings?.business_type ?? null

  const { agents } = useAgents(tenantId)
  const { fields: customFields } = useCustomFields(tenantId, 'lead')
  const industryFields = getIndustryFields(businessType)

  const [form,       setForm]       = useState<LeadFormData>(EMPTY_FORM)
  const [stages,     setStages]     = useState<PipelineStage[]>([])
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order')
      .then(({ data }) => setStages((data ?? []) as PipelineStage[]))
  }, [tenantId])

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleIndustryChange = (key: string, value: string) => {
    setCustomData(prev => ({ ...prev, [key]: value }))
    // For taxi: mirror pickup_datetime to followup_date so follow-ups work
    if (key === 'pickup_datetime') {
      setForm(prev => ({ ...prev, followup_date: value }))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tenantId || !form.name.trim()) return
    setSubmitting(true); setError(null)
    try {
      const mergedCustomData = { ...customData }
      const lead = await createLead({
        tenant_id:         tenantId,
        name:              form.name,
        phone:             form.phone,
        email:             form.email,
        whatsapp:          form.whatsapp,
        status:            form.status,
        source:            form.source,
        notes:             form.notes,
        assigned_agent_id: form.assigned_agent_id || null,
        pipeline_stage_id: form.pipeline_stage_id || null,
        followup_date:     form.followup_date || null,
        custom_data:       Object.keys(mergedCustomData).length > 0 ? mergedCustomData : null,
      })
      navigate(`/leads/${lead.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
      setSubmitting(false)
    }
  }

  const pageTitle = vocab.addLead

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
            <p className="text-sm text-gray-500">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">

            {/* Standard lead fields */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <LeadFormFields
                data={form}
                onChange={handleChange}
                agents={agents}
                stages={stages}
                customFields={customFields}
                customData={customData}
                onCustomChange={(key, value) => setCustomData(prev => ({ ...prev, [key]: value }))}
              />
            </div>

            {/* Industry-specific fields */}
            {industryFields.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  {businessType === 'taxi' ? 'Trip Details' : 'Additional Details'}
                </p>
                <div className="space-y-3">
                  {industryFields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {field.label}{field.required && ' *'}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={String(customData[field.key] ?? '')}
                          onChange={e => handleIndustryChange(field.key, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options?.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={String(customData[field.key] ?? '')}
                          onChange={e => handleIndustryChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          required={field.required}
                          className={inputCls}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Saving…' : pageTitle}
            </button>
          </div>
        </form>

      </div>
    </AppLayout>
  )
}
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAgents } from '../../hooks/useAgents'
import { createLead } from '../../lib/services/leads.service'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import { useCustomFields } from '../../hooks/useCustomFields'
import { LeadFormFields, EMPTY_FORM, type LeadFormData } from '../../components/leads/LeadFormFields'
import type { PipelineStage } from '../../types/pipeline'
import { useEffect } from 'react'

export function AddLeadPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const tenantId    = profile?.tenant_id ?? null

  const { agents } = useAgents(tenantId)
  const { fields: customFields } = useCustomFields(tenantId, 'lead')

  const [form,       setForm]       = useState<LeadFormData>(EMPTY_FORM)
  const [stages,     setStages]     = useState<PipelineStage[]>([])
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Load pipeline stages
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!tenantId || !form.name.trim()) return

    setSubmitting(true)
    setError(null)

    try {
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
        followup_date:     form.followup_date     || null,
        custom_data:       Object.keys(customData).length > 0 ? customData : null,
      })
      navigate(`/leads/${lead.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Add lead</h1>
            <p className="text-sm text-gray-500">Create a new lead record</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
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

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Saving…' : 'Save lead'}
            </button>
          </div>
        </form>

      </div>
    </AppLayout>
  )
}
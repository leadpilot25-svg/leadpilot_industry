import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCustomFields } from '../../hooks/useCustomFields'
import { useAgents } from '../../hooks/useAgents'
import { loadTemplates, buildWhatsAppUrl, ensureDefaultTemplates, type WhatsAppTemplate }
  from '../../lib/services/whatsappTemplates.service'
import { fetchLeadById, softDeleteLead, updateLead, logActivity } from '../../lib/services/leads.service'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import type { Lead, LeadActivity, LeadActivityType } from '../../types/lead'

const ACTIVITY_TYPES: { value: LeadActivityType; label: string }[] = [
  { value: 'call',     label: 'Call'      },
  { value: 'whatsapp', label: 'WhatsApp'  },
  { value: 'sms',      label: 'SMS'       },
  { value: 'email',    label: 'Email'     },
  { value: 'note',     label: 'Note'      },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

const activityBg: Record<LeadActivityType, string> = {
  call:          'bg-blue-500/20',
  whatsapp:      'bg-emerald-500/20',
  sms:           'bg-violet-500/20',
  email:         'bg-sky-500/20',
  status_change: 'bg-amber-500/20',
  assignment:    'bg-indigo-500/20',
  note:          'bg-gray-500/20',
}
const activityText: Record<LeadActivityType, string> = {
  call:          'text-blue-400',
  whatsapp:      'text-emerald-400',
  sms:           'text-violet-400',
  email:         'text-sky-400',
  status_change: 'text-amber-400',
  assignment:    'text-indigo-400',
  note:          'text-gray-400',
}
const activityLabel: Record<LeadActivityType, string> = {
  call:          'Call',
  whatsapp:      'WhatsApp',
  sms:           'SMS',
  email:         'Email',
  status_change: 'Status changed',
  assignment:    'Assigned',
  note:          'Note',
}


// Maps stored source values to display labels
const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  google:   'Google',
  website:  'Website',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  manual:   'Manual',
  other:    'Other',
  // legacy values from before this update
  facebook_form: 'Facebook Form',
  google_sheets: 'Google Sheets',
}
function sourceLabel(value: string | null): string {
  if (!value) return '—'
  return SOURCE_LABEL[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}

// ─── Communication action buttons ────────────────────────────────────────────

interface CommAction {
  label:    string
  href:     (lead: Lead) => string | null
  bg:       string
  text:     string
  icon:     React.ReactNode
}

function buildPhone(raw: string | null): string | null {
  if (!raw) return null
  // Strip spaces, dashes, brackets — keep + and digits
  return raw.replace(/[\s\-()]/g, '')
}

const COMM_ACTIONS: CommAction[] = [
  {
    label: 'Call',
    bg:    'bg-blue-500/20',
    text:  'text-blue-400',
    href:  (l) => {
      const p = buildPhone(l.phone ?? l.whatsapp)
      return p ? `tel:${p}` : null
    },
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    bg:    'bg-emerald-500/20',
    text:  'text-emerald-400',
    href:  (l) => {
      const p = buildPhone(l.whatsapp ?? l.phone)
      return p ? `https://wa.me/${p.replace(/^\+/, '')}` : null
    },
    icon: (
      <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    label: 'Email',
    bg:    'bg-sky-500/20',
    text:  'text-sky-400',
    href:  (l) => l.email ? `mailto:${l.email}` : null,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: 'SMS',
    bg:    'bg-violet-500/20',
    text:  'text-violet-400',
    href:  (l) => {
      const p = buildPhone(l.phone)
      return p ? `sms:${p}` : null
    },
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
]

function CommunicationActions({ lead, templates }: { lead: Lead; templates: WhatsAppTemplate[] }) {
  const available = COMM_ACTIONS.filter(a => a.href(lead) !== null)
  const unavailable = COMM_ACTIONS.filter(a => a.href(lead) === null)

  if (available.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {COMM_ACTIONS.map(action => {
        const href = action.href(lead)
        const disabled = href === null
        if (disabled) {
          return (
            <span
              key={action.label}
              title={`No ${action.label.toLowerCase()} available`}
              className={[
                'flex items-center gap-2 rounded-xl px-4 py-2.5',
                'text-sm font-medium cursor-not-allowed opacity-30',
                action.bg,
                action.text,
              ].join(' ')}
            >
              {action.icon}
              {action.label}
            </span>
          )
        }
        return (
          <a
            key={action.label}
            href={href}
            target={action.label === 'WhatsApp' ? '_blank' : undefined}
            rel={action.label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2.5',
              'text-sm font-medium transition active:scale-95',
              'hover:brightness-110',
              action.bg,
              action.text,
            ].join(' ')}
          >
            {action.icon}
            {action.label}
          </a>
        )
      })}

      {/* WhatsApp template quick-send */}
      {templates.length > 0 && (lead.phone || lead.whatsapp) && (
        <div className="mt-3 flex items-center gap-2">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" className="shrink-0 text-emerald-500">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <select
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none"
            defaultValue=""
            onChange={e => {
              const tmpl = templates.find(t => t.id === e.target.value)
              if (!tmpl) return
              e.target.value = ''
              window.open(buildWhatsAppUrl(tmpl, lead), '_blank', 'noopener,noreferrer')
            }}
          >
            <option value="">Send via template…</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

export function LeadDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { profile, isRole } = useAuth()
  const tenantId     = profile?.tenant_id ?? null
  const { fields: customFields } = useCustomFields(tenantId, 'lead')
  const { agents }   = useAgents(tenantId)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  useEffect(() => {
    if (!tenantId) return
    ensureDefaultTemplates(tenantId)
    setTemplates(loadTemplates(tenantId))
  }, [tenantId])

  const [lead,        setLead]        = useState<Lead | null>(null)
  const [activities,  setActivities]  = useState<LeadActivity[]>([])
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [savingAgent, setSavingAgent] = useState(false)

  // Activity log form
  const [actType,     setActType]     = useState<LeadActivityType>('call')
  const [actNotes,    setActNotes]    = useState('')
  const [logging,     setLogging]     = useState(false)
  const [logError,    setLogError]    = useState<string | null>(null)

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    setActivities((data ?? []) as LeadActivity[])
  }

  useEffect(() => {
    if (!id) return
    fetchLeadById(id)
      .then(l => { setLead(l); loadActivities(l.id) })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Lead not found'))
  }, [id])

  const handleDelete = async () => {
    if (!lead || !window.confirm(`Delete "${lead.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await softDeleteLead(lead.id, lead.tenant_id)
      navigate('/leads', { replace: true })
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const handleLogActivity = async (e: FormEvent) => {
    e.preventDefault()
    if (!lead || !profile) return
    setLogging(true)
    setLogError(null)
    try {
      await logActivity(lead.tenant_id, lead.id, profile.id, actType, actNotes)
      setActNotes('')
      await loadActivities(lead.id)
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log activity')
    } finally {
      setLogging(false)
    }
  }

  if (loadError) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-rose-400">{loadError}</p>
        </div>
      </AppLayout>
    )
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start gap-4">
          <button
            onClick={() => navigate('/leads')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-white">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} size="md" />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              Added {formatDateTime(lead.created_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/leads/${lead.id}/edit`)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Communication actions */}
        <CommunicationActions lead={lead} templates={templates} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Lead details */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Contact details</h2>
              <dl className="space-y-3">
                {[
                  { label: 'Phone',    value: lead.phone    },
                  { label: 'WhatsApp', value: lead.whatsapp },
                  { label: 'Email',    value: lead.email    },
                  { label: 'Source',   value: sourceLabel(lead.source) },
                  { label: 'Follow-up',value: lead.followup_date ? formatDateTime(lead.followup_date) : null },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="text-sm text-white">{value ?? <span className="text-gray-600">—</span>}</dd>
                  </div>
                ))}

                {/* Assigned Agent — with change/remove actions for admins */}
                <div>
                  <dt className="text-xs text-gray-500 mb-1">Assigned agent</dt>
                  <dd className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {lead.assigned_agent_id ? (
                        <>
                          <span className="text-white">
                            {agents.find(a => a.id === lead.assigned_agent_id)?.full_name ?? 'Unknown agent'}
                          </span>
                          {lead.assigned_agent_id === agents.find(a => a.user_id === profile?.user_id)?.id && (
                            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                              Assigned to you
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-600">Unassigned</span>
                      )}
                    </div>

                    {/* Admin-only assignment controls */}
                    {isRole('client_admin', 'super_admin') && agents.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          disabled={savingAgent}
                          value={lead.assigned_agent_id ?? ''}
                          onChange={async e => {
                            const agentId = e.target.value || null
                            setSavingAgent(true)
                            try {
                              await updateLead({
                                id:                lead.id,
                                tenant_id:         lead.tenant_id,
                                assigned_agent_id: agentId,
                              })
                              setLead(prev => prev ? { ...prev, assigned_agent_id: agentId } : prev)
                            } finally {
                              setSavingAgent(false)
                            }
                          }}
                          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {agents.map(a => (
                            <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>
                          ))}
                        </select>

                        {lead.assigned_agent_id && (
                          <button
                            disabled={savingAgent}
                            onClick={async () => {
                              setSavingAgent(true)
                              try {
                                await updateLead({
                                  id:                lead.id,
                                  tenant_id:         lead.tenant_id,
                                  assigned_agent_id: null,
                                })
                                setLead(prev => prev ? { ...prev, assigned_agent_id: null } : prev)
                              } finally {
                                setSavingAgent(false)
                              }
                            }}
                            className="flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                          >
                            {savingAgent ? '…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {lead.notes && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="mb-2 text-sm font-semibold text-white">Notes</h2>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Custom fields read-only panel — only shown when fields exist */}
            {customFields.filter(f => f.show_in_card).length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="mb-4 text-sm font-semibold text-white">Additional details</h2>
                <dl className="space-y-3">
                  {customFields
                    .filter(f => f.show_in_card)
                    .map(field => {
                      const rawVal = (lead.custom_data as Record<string, unknown> | null)?.[field.field_key]
                      let display: string = '—'
                      if (rawVal != null && rawVal !== '') {
                        if (Array.isArray(rawVal)) {
                          display = rawVal.join(', ')
                        } else if (field.field_type === 'boolean') {
                          display = rawVal ? 'Yes' : 'No'
                        } else {
                          display = String(rawVal)
                        }
                      }
                      return (
                        <div key={field.field_key}>
                          <dt className="text-xs text-gray-500">{field.field_label}</dt>
                          <dd className="text-sm text-white">
                            {display === '—'
                              ? <span className="text-gray-600">—</span>
                              : display}
                          </dd>
                        </div>
                      )
                    })}
                </dl>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="lg:col-span-2 space-y-4">

            {/* Log activity form */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Log activity</h2>
              <form onSubmit={handleLogActivity} noValidate className="space-y-3">
                <div className="flex gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setActType(t.value)}
                      className={[
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                        actType === t.value
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white',
                      ].join(' ')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={actNotes}
                  onChange={e => setActNotes(e.target.value)}
                  placeholder="Add notes about this interaction…"
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {logError && (
                  <p className="text-xs text-rose-400">{logError}</p>
                )}

                <button
                  type="submit"
                  disabled={logging}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {logging && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {logging ? 'Logging…' : 'Log activity'}
                </button>
              </form>
            </div>

            {/* Activity timeline */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900">
              <div className="border-b border-gray-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-white">
                  Activity history
                  <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    {activities.length}
                  </span>
                </h2>
              </div>

              {activities.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-xs text-gray-500">No activity logged yet.</p>
                </div>
              ) : (
                <ol className="divide-y divide-gray-800">
                  {activities.map(act => (
                    <li key={act.id} className="flex gap-3 px-5 py-4">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activityBg[act.activity_type]} ${activityText[act.activity_type]}`}>
                        <span className="text-xs font-bold">
                          {activityLabel[act.activity_type].charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-white">
                            {activityLabel[act.activity_type]}
                          </span>
                          <span className="text-xs text-gray-600 shrink-0">
                            {timeAgo(act.created_at)}
                          </span>
                        </div>
                        {act.notes && (
                          <p className="mt-0.5 text-xs text-gray-400">{act.notes}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  )
}
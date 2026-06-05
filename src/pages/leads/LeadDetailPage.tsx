import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCustomFields } from '../../hooks/useCustomFields'
import { useAgents } from '../../hooks/useAgents'
import {
  loadTemplates, ensureDefaultTemplates, migrateFromWhatsAppTemplates,
  buildWhatsAppUrl, buildEmailUrl, buildSmsUrl,
  substituteVars,
  type Template,
} from '../../lib/services/templates.service'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useVocab } from '../../lib/services/industryVocab'
import { fetchLeadById, softDeleteLead, updateLead, logActivity } from '../../lib/services/leads.service'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import type { Lead, LeadActivity, LeadActivityType } from '../../types/lead'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

const activityCfg: Record<LeadActivityType, { bg: string; text: string; label: string }> = {
  call:          { bg: 'bg-blue-50',    text: 'text-blue-600',    label: 'Call'           },
  whatsapp:      { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'WhatsApp'       },
  sms:           { bg: 'bg-violet-50',  text: 'text-violet-600',  label: 'SMS'            },
  email:         { bg: 'bg-sky-50',     text: 'text-sky-600',     label: 'Email'          },
  status_change: { bg: 'bg-amber-50',   text: 'text-amber-600',   label: 'Status changed' },
  assignment:    { bg: 'bg-indigo-50',  text: 'text-indigo-600',  label: 'Assigned'       },
  note:          { bg: 'bg-gray-100',   text: 'text-gray-600',    label: 'Note'           },
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual', public_form: 'Public Form', qr_code: 'QR Code',
  facebook: 'Facebook', google: 'Google', website: 'Website',
  whatsapp: 'WhatsApp', referral: 'Referral', other: 'Other',
}

function buildPhone(raw: string | null): string | null {
  if (!raw) return null
  return raw.replace(/[\s\-()]/g, '')
}

// ─── Action buttons config ────────────────────────────────────────────────────

const COMM_ACTIONS = [
  {
    label: 'Call', type: 'call' as LeadActivityType,
    bg: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    href: (l: Lead) => { const p = buildPhone(l.phone ?? l.whatsapp); return p ? `tel:${p}` : null },
    icon: (
      <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp', type: 'whatsapp' as LeadActivityType,
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    href: (l: Lead) => { const p = buildPhone(l.whatsapp ?? l.phone); return p ? `https://wa.me/${p.replace(/^\+/, '')}` : null },
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    label: 'Email', type: 'email' as LeadActivityType,
    bg: 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100',
    href: (l: Lead) => l.email ? `mailto:${l.email}` : null,
    icon: (
      <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: 'SMS', type: 'sms' as LeadActivityType,
    bg: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100',
    href: (l: Lead) => { const p = buildPhone(l.phone); return p ? `sms:${p}` : null },
    icon: (
      <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LeadDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { profile, isRole } = useAuth()
  const vocab = useVocab()
  const tenantId    = profile?.tenant_id ?? null
  const { fields: customFields } = useCustomFields(tenantId, 'lead')
  const { agents }  = useAgents(tenantId)
  const [templates,   setTemplates]   = useState<Template[]>([])
  const [highlighted, setHighlighted] = useState(false)
  const [meetingScheduled, setMeetingScheduled] = useState(false)
  const [meetingDateTime,  setMeetingDateTime]  = useState('')
  const [meetingNotes,     setMeetingNotes]     = useState('')
  const { settings } = useWorkspaceSettings(tenantId)

  useEffect(() => {
    if (!tenantId) return
    migrateFromWhatsAppTemplates(tenantId)
    ensureDefaultTemplates(tenantId, settings?.business_type ?? null)
    setTemplates(loadTemplates(tenantId))
  }, [tenantId, settings?.business_type])

  const [lead,       setLead]        = useState<Lead | null>(null)
  const [activities, setActivities]  = useState<LeadActivity[]>([])
  const [loadError,  setLoadError]   = useState<string | null>(null)
  const [deleting,   setDeleting]    = useState(false)
  const [savingAgent,setSavingAgent] = useState(false)

  // Activity log
  const [actNotes, setActNotes] = useState('')
  const [actType,  setActType]  = useState<LeadActivityType>('note')
  const [logging,  setLogging]  = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const loadActivities = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    setActivities((data ?? []) as LeadActivity[])
  }

  useEffect(() => {
    if (!id || !tenantId) return
    fetchLeadById(id)
      .then(l => {
        if (l) { setLead(l); loadActivities(l.id) }
        else setLoadError('Lead not found')
      })
      .catch(() => setLoadError('Failed to load lead'))
  }, [id, tenantId])

  const handleStatusChange = async (status: string) => {
    if (!lead || !tenantId) return
    const updated = await updateLead({ ...lead, status: status as Lead['status'], tenant_id: tenantId })
    setLead(updated); loadActivities(updated.id)
  }

  const handleFollowupChange = async (date: string) => {
    if (!lead || !tenantId) return
    const updated = await updateLead({ ...lead, followup_date: date || null, tenant_id: tenantId })
    setLead(updated)
  }

  const handleAgentChange = async (agentId: string) => {
    if (!lead || !tenantId) return
    setSavingAgent(true)
    try {
      const updated = await updateLead({ ...lead, assigned_agent_id: agentId || null, tenant_id: tenantId })
      setLead(updated); loadActivities(updated.id)
    } finally { setSavingAgent(false) }
  }

  const handleDelete = async () => {
    if (!lead || !tenantId) return
    if (!window.confirm('Delete this lead? This cannot be undone.')) return
    setDeleting(true)
    try { await softDeleteLead(lead.id, tenantId); navigate('/leads', { replace: true }) }
    catch { setDeleting(false) }
  }

  const handleLogActivity = async () => {
    if (!lead || !tenantId) return
    const noteText = meetingScheduled && meetingDateTime
      ? `Meeting scheduled: ${new Date(meetingDateTime).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}${meetingNotes ? ` — ${meetingNotes}` : ''}`
      : actNotes.trim()
    if (!noteText) return
    setLogging(true); setLogError(null)
    try {
      const activityType = meetingScheduled ? 'note' : actType
      await logActivity(tenantId, lead.id, profile?.id ?? '', activityType, noteText)
      setActNotes('')
      setActType('note')
      setMeetingScheduled(false)
      setMeetingDateTime('')
      setMeetingNotes('')
      loadActivities(lead.id)
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setLogging(false) }
  }

  // ── Loading states ─────────────────────────────────────────────────────────

  if (loadError) return (
    <AppLayout>
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-400">{loadError}</p>
      </div>
    </AppLayout>
  )

  if (!lead) return (
    <AppLayout>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  )

  const assignedAgent = agents.find(a => a.id === lead.assigned_agent_id)

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8 space-y-3">

        {/* ── 1. Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 pt-4">
          <button
            onClick={() => navigate('/leads')}
            className="mt-1 shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} size="md" />
            </div>
            {(lead.phone || lead.whatsapp) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {lead.phone ?? lead.whatsapp}
                {assignedAgent && ` · ${assignedAgent.full_name}`}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Added {formatDate(lead.created_at)}
              {lead.source ? ` · ${SOURCE_LABEL[lead.source] ?? lead.source}` : ''}
            </p>
          </div>

          <button
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Edit
          </button>
        </div>

        {/* ── 2. Action buttons — equal size, 4 across ───────────────────── */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {COMM_ACTIONS.map(action => {
              const href = action.href(lead)
              const cls = `flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition ${action.bg}`
              if (!href) return (
                <span key={action.label} className={`${cls} opacity-30 cursor-not-allowed`}>
                  {action.icon}{action.label}
                </span>
              )
              return (
                <a
                  key={action.label}
                  href={href}
                  target={action.label === 'WhatsApp' ? '_blank' : undefined}
                  rel={action.label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
                  onClick={() => { setActType(action.type); setHighlighted(true); setTimeout(() => setHighlighted(false), 8000) }}
                  className={`${cls} active:scale-95`}
                >
                  {action.icon}{action.label}
                </a>
              )
            })}
          </div>

          {/* Unified template dropdown — WhatsApp, Email, SMS */}
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400 shrink-0">Template</span>
              <select
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none"
                defaultValue=""
                onChange={e => {
                  const tmpl = templates.find(t => t.id === e.target.value)
                  if (!tmpl) return
                  e.target.value = ''
                  const company = settings?.company_name ?? ''
                  // Auto-fill notes with body
                  setActNotes(substituteVars(tmpl.body, lead, company))
                  if (tmpl.channel === 'whatsapp') {
                    setActType('whatsapp')
                    window.open(buildWhatsAppUrl(tmpl, lead, company), '_blank', 'noopener,noreferrer')
                  } else if (tmpl.channel === 'email') {
                    setActType('email')
                    window.open(buildEmailUrl(tmpl, lead, company))
                  } else if (tmpl.channel === 'sms') {
                    setActType('sms')
                    window.open(buildSmsUrl(tmpl, lead, company))
                  }
                  setHighlighted(true)
                  setTimeout(() => setHighlighted(false), 8000)
                }}
              >
                <option value="">Use a template…</option>
                {(['whatsapp','email','sms'] as const).map(ch => {
                  const group = templates.filter(t => t.channel === ch)
                  if (group.length === 0) return null
                  const chLabel = ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'SMS'
                  return (
                    <optgroup key={ch} label={`${chLabel} Templates`}>
                      {group.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  )
                })}
              </select>
            </div>
          )}
        </div>

        {/* ── 3. UPDATE AFTER CALL ─────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 shadow-sm space-y-4 transition-all duration-500 ${
          highlighted ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100' : 'border-gray-100 bg-white'
        }`}>

          {/* Section header */}
          <div className="flex items-center gap-2">
            {highlighted && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
            <p className={`text-sm font-bold ${highlighted ? 'text-emerald-700' : 'text-gray-700'}`}>
              {highlighted ? 'Update outcome now' : 'Update After Call'}
            </p>
          </div>

          {/* Outcome quick-select */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Outcome</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Interested',         status: 'qualified', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    meeting: false },
                { label: 'Follow Up Later',    status: 'contacted', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   meeting: false },
                { label: 'No Answer',          status: 'new',       bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',    meeting: false },
                { label: 'Not Interested',     status: 'lost',      bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    meeting: false },
                { label: 'Meeting Scheduled',  status: 'qualified', bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  meeting: true  },
                { label: vocab.won,            status: 'won',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', meeting: false },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => {
                    handleStatusChange(opt.status)
                    setMeetingScheduled(opt.meeting)
                    if (!opt.meeting) setHighlighted(false)
                  }}
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 hover:opacity-80 ${
                    (lead.status === opt.status && !meetingScheduled && !opt.meeting) ||
                    (opt.meeting && meetingScheduled)
                      ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-offset-1 ring-emerald-400`
                      : `${opt.bg} ${opt.text} ${opt.border}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting fields — shown when Meeting Scheduled is selected */}
          {meetingScheduled && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-2.5">
              <p className="text-xs font-bold text-indigo-700">📅 Schedule Meeting</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Date & Time</label>
                <input
                  type="datetime-local"
                  value={meetingDateTime}
                  onChange={e => {
                    setMeetingDateTime(e.target.value)
                    // Auto-set followup_date to meeting time so it feeds dashboard counts
                    handleFollowupChange(e.target.value)
                  }}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Notes</label>
                <input
                  type="text"
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  placeholder="e.g. Discuss premium options, bring documents"
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-indigo-600">
                This meeting will appear in today's dashboard count when the date arrives.
              </p>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-xs font-semibold text-gray-500">Status</label>
            <select
              value={lead.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
            >
              {['new','contacted','qualified','proposal','won','lost'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Next Follow-up */}
          <div className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-xs font-semibold text-gray-500">Next Follow-up</label>
            <input
              type="datetime-local"
              value={lead.followup_date ? lead.followup_date.slice(0, 16) : ''}
              onChange={e => handleFollowupChange(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Agent (admin only) */}
          {isRole('client_admin', 'super_admin') && agents.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-500">
                Agent{savingAgent ? ' …' : ''}
              </label>
              <select
                value={lead.assigned_agent_id ?? ''}
                onChange={e => handleAgentChange(e.target.value)}
                disabled={savingAgent}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={actNotes}
              onChange={e => setActNotes(e.target.value)}
              placeholder={
                actType === 'call'     ? 'What was discussed on the call?' :
                actType === 'whatsapp' ? 'Message sent via WhatsApp…'      :
                actType === 'email'    ? 'Email content or summary…'       :
                actType === 'sms'      ? 'SMS message…'                    :
                'Add a note about this interaction…'
              }
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition"
            />
            {logError && <p className="text-xs text-rose-600 mt-1">{logError}</p>}
          </div>

          {/* Save Update button */}
          <button
            onClick={() => void handleLogActivity()}
            disabled={logging || (!actNotes.trim() && !(meetingScheduled && meetingDateTime))}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
          >
            {logging && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {logging ? 'Saving…' : 'Save Update'}
          </button>

          {/* Template quick-send */}
          {templates.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {(['whatsapp', 'sms', 'email'] as const).map(ch => {
                const group = templates.filter(t => t.channel === ch)
                if (group.length === 0) return null
                const cfg = {
                  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  sms:      { label: 'SMS',       cls: 'bg-violet-50  text-violet-700  border-violet-200'  },
                  email:    { label: 'Email',     cls: 'bg-sky-50     text-sky-700     border-sky-200'     },
                }[ch]
                return (
                  <select
                    key={ch}
                    defaultValue=""
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold cursor-pointer ${cfg.cls}`}
                    onChange={e => {
                      const tmpl = templates.find(t => t.id === e.target.value)
                      if (!tmpl) return
                      e.target.value = ''
                      const company = settings?.company_name ?? ''
                      setActNotes(substituteVars(tmpl.body, lead, company))
                      setActType(ch)
                      if (ch === 'whatsapp') window.open(buildWhatsAppUrl(tmpl, lead, company), '_blank', 'noopener,noreferrer')
                      else if (ch === 'email') window.open(buildEmailUrl(tmpl, lead, company))
                      else window.open(buildSmsUrl(tmpl, lead, company))
                      setHighlighted(true)
                      setTimeout(() => setHighlighted(false), 8000)
                    }}
                  >
                    <option value="">Send {cfg.label} ▾</option>
                    {group.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 4. Saved notes (read-only) ─────────────────────────────────── */}
        {lead.notes && (
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-1.5">Saved Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* ── 5. Custom fields ───────────────────────────────────────────── */}
        {customFields.filter(f => f.show_in_card).length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-2">Details</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {customFields.filter(f => f.show_in_card).map(field => {
                const rawVal = (lead.custom_data as Record<string, unknown> | null)?.[field.field_key]
                let display = '—'
                if (rawVal != null && rawVal !== '') {
                  if (Array.isArray(rawVal)) display = rawVal.join(', ')
                  else if (field.field_type === 'boolean') display = rawVal ? 'Yes' : 'No'
                  else display = String(rawVal)
                }
                return (
                  <div key={field.field_key}>
                    <dt className="text-[10px] text-gray-400">{field.field_label}</dt>
                    <dd className="text-xs font-medium text-gray-800 mt-0.5">{display}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}


        {/* ── 7. Activity history ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Activity</p>
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {activities.length}
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-400">No activity yet. Use the buttons above to log a call or note.</p>
            </div>
          ) : (
            <ol className="divide-y divide-gray-50">
              {activities.map(act => {
                const cfg = activityCfg[act.activity_type as LeadActivityType] ?? activityCfg.note
                return (
                  <li key={act.id} className="flex gap-3 px-4 py-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
                      <span className="text-[10px] font-bold">{cfg.label.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(act.created_at)}</span>
                      </div>
                      {act.notes && (
                        <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{act.notes}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {/* Delete — bottom of page, less prominent */}
        <div className="flex justify-end pt-1 pb-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-rose-400 hover:text-rose-600 transition disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete this lead'}
          </button>
        </div>

      </div>
    </AppLayout>
  )
}
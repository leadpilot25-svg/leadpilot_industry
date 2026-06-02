import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import type { Lead, LeadStatus } from '../../types/lead'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'today' | 'upcoming' | 'completed'

// Shape we care about from the leads table
interface FollowupLead {
  id:            string
  name:          string
  phone:         string | null
  email:         string | null
  status:        LeadStatus
  followup_date: string
  notes:         string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}

function todayEnd() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
}

function tomorrowStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date()
}

const TERMINAL_STATUSES: LeadStatus[] = ['won', 'lost']

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useFollowupLeads(tenantId: string | null, tab: FilterTab) {
  const [leads,   setLeads]   = useState<FollowupLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        let query = supabase
          .from('leads')
          .select('id, name, phone, email, status, followup_date, notes')
          .eq('tenant_id', tenantId!)
          .is('deleted_at', null)
          .not('followup_date', 'is', null)

        if (tab === 'today') {
          // Has a followup date today AND is not in a terminal status
          query = query
            .gte('followup_date', todayStart())
            .lte('followup_date', todayEnd())
            .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
            .order('followup_date', { ascending: true })
        } else if (tab === 'upcoming') {
          // Has a followup date after today AND is not in a terminal status
          query = query
            .gte('followup_date', tomorrowStart())
            .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
            .order('followup_date', { ascending: true })
        } else {
          // Completed = leads with a followup_date that reached won or lost
          query = query
            .in('status', TERMINAL_STATUSES)
            .order('followup_date', { ascending: false })
            .limit(50)
        }

        const { data, error: err } = await query
        if (err) throw new Error(err.message)

        if (!cancelled) {
          setLeads((data ?? []) as FollowupLead[])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load follow-ups')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tenantId, tab, tick])

  return { leads, loading, error, refetch }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusBg: Record<LeadStatus, string> = {
  new:         'bg-indigo-500/20',
  contacted:   'bg-blue-500/20',
  qualified:   'bg-amber-500/20',
  won:         'bg-emerald-500/20',
  lost:        'bg-gray-500/20',
  unqualified: 'bg-rose-500/20',
}
const statusText: Record<LeadStatus, string> = {
  new:         'text-indigo-400',
  contacted:   'text-blue-400',
  qualified:   'text-amber-400',
  won:         'text-emerald-400',
  lost:        'text-gray-400',
  unqualified: 'text-rose-400',
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBg[status]} ${statusText[status]}`}>
      {status}
    </span>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  lead:       FollowupLead
  tab:        FilterTab
  onDone:     (id: string) => void
  completing: string | null
}

function FollowupRow({ lead, tab, onDone, completing }: RowProps) {
  const navigate = useNavigate()
  const overdue  = tab !== 'completed' && isOverdue(lead.followup_date)

  return (
    <tr className="transition-colors hover:bg-gray-800/30">

      {/* Lead name */}
      <td className="px-4 py-3">
        <button onClick={() => navigate(`/leads/${lead.id}`)} className="text-left">
          <p className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            {lead.name}
          </p>
          {lead.phone && (
            <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
          )}
        </button>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>

      {/* Follow-up date */}
      <td className="px-4 py-3">
        <span className={`text-xs ${overdue ? 'font-medium text-rose-400' : 'text-gray-400'}`}>
          {overdue && (
            <span className="mr-1.5 inline-flex items-center rounded-full bg-rose-500/20 px-1.5 py-0.5 text-xs font-medium text-rose-400">
              Overdue
            </span>
          )}
          {formatDateTime(lead.followup_date)}
        </span>
      </td>

      {/* Notes */}
      <td className="px-4 py-3 max-w-xs">
        <p className="truncate text-xs text-gray-500">
          {lead.notes ?? <span className="text-gray-700">—</span>}
        </p>
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        {tab !== 'completed' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDone(lead.id)}
              disabled={completing === lead.id}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {completing === lead.id ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              ) : (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              Done
            </button>
            <button
              onClick={() => navigate(`/leads/${lead.id}/edit`)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
            >
              Edit
            </button>
          </div>
        ) : (
          <StatusBadge status={lead.status} />
        )}
      </td>

    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FollowupsPage() {
  const { profile }  = useAuth()
  const tenantId     = profile?.tenant_id ?? null

  const [tab,        setTab]        = useState<FilterTab>('today')
  const [completing, setCompleting] = useState<string | null>(null)
  const [actionErr,  setActionErr]  = useState<string | null>(null)

  const { leads, loading, error, refetch } = useFollowupLeads(tenantId, tab)

  // "Done" clears the followup_date on the lead, removing it from Today/Upcoming.
  // It does not change the lead status — the agent updates status separately.
  const handleDone = async (leadId: string) => {
    if (!tenantId) return
    setCompleting(leadId)
    setActionErr(null)

    const { error: err } = await supabase
      .from('leads')
      .update({ followup_date: null })
      .eq('id', leadId)
      .eq('tenant_id', tenantId)

    setCompleting(null)

    if (err) {
      setActionErr(`Failed to clear follow-up: ${err.message}`)
    } else {
      refetch()
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'today',     label: 'Today'     },
    { key: 'upcoming',  label: 'Upcoming'  },
    { key: 'completed', label: 'Completed' },
  ]

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const emptyMessages: Record<FilterTab, string> = {
    today:     'No follow-ups scheduled for today.',
    upcoming:  'No upcoming follow-ups.',
    completed: 'No won or lost leads with a follow-up date yet.',
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Follow-ups</h1>
          <p className="mt-0.5 text-sm text-gray-500">{today}</p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'rounded-md px-4 py-1.5 text-sm font-medium transition',
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {(error || actionErr) && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error ?? actionErr}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Lead', 'Status', 'Follow-up date', 'Notes', 'Action'].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">

                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[40, 20, 30, 40, 15].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-800" style={{ width: `${w}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {!loading && leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <p className="text-sm text-gray-500">{emptyMessages[tab]}</p>
                      {tab !== 'completed' && (
                        <p className="mt-1 text-xs text-gray-600">
                          Set a follow-up date when editing a lead to see it here.
                        </p>
                      )}
                    </td>
                  </tr>
                )}

                {!loading && leads.map(lead => (
                  <FollowupRow
                    key={lead.id}
                    lead={lead}
                    tab={tab}
                    onDone={handleDone}
                    completing={completing}
                  />
                ))}

              </tbody>
            </table>
          </div>

          {!loading && leads.length > 0 && (
            <div className="border-t border-gray-800 px-4 py-3">
              <p className="text-xs text-gray-600">
                {leads.length} lead{leads.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
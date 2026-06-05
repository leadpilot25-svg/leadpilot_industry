import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVocab } from '../../lib/services/industryVocab'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useAgents } from '../../hooks/useAgents'
import { usePipelineStages } from '../../hooks/usePipelineStages'
import { softDeleteLead, updateLead, resolveFilterParam } from '../../lib/services/leads.service'
import { AppLayout } from '../../components/layout/AppLayout'
import { LeadStatusBadge } from '../../components/leads/LeadStatusBadge'
import type { Lead, LeadStatus } from '../../types/lead'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'All statuses'  },
  { value: 'new',         label: 'New'            },
  { value: 'contacted',   label: 'Contacted'      },
  { value: 'qualified',   label: 'Qualified'      },
  { value: 'won',         label: 'Won'            },
  { value: 'lost',        label: 'Lost'           },
  { value: 'unqualified', label: 'Unqualified'    },
]

const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook',    google:   'Google',
  website:  'Website',     whatsapp: 'WhatsApp',
  referral: 'Referral',    manual:   'Manual',
  other:    'Other',
  facebook_form: 'Facebook Form', google_sheets: 'Google Sheets',
}

function sourceLabel(v: string | null): string {
  if (!v) return '—'
  return SOURCE_LABEL[v] ?? v.charAt(0).toUpperCase() + v.slice(1)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Age badge ──────────────────────────────────────────────────────────────

function AgeBadge({ iso }: { iso: string }) {
  const d = ageDays(iso)
  if (d <= 2) return <span className="ml-1 text-xs text-emerald-400">{d}d</span>
  if (d <= 6) return <span className="ml-1 text-xs text-amber-400">{d}d</span>
  return <span className="ml-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 text-xs font-medium text-rose-400">{d}d</span>
}

// ─── Bulk action bar ────────────────────────────────────────────────────────

interface BulkBarProps {
  selected:  Set<string>
  leads:     Lead[]
  tenantId:  string
  onDone:    () => void
  stages:    { id: string; name: string }[]
  agents:    { id: string; full_name: string | null }[]
  isAdmin:   boolean
}

function BulkActionBar({ selected, leads, tenantId, onDone, stages, agents, isAdmin }: BulkBarProps) {
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const count = selected.size

  const run = async (action: (lead: Lead) => Promise<void>) => {
    setBusy(true); setErr(null)
    try {
      const targets = leads.filter(l => selected.has(l.id))
      await Promise.all(targets.map(action))
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
        <span className="text-sm font-semibold text-gray-900">{count} selected</span>
        <div className="h-4 w-px bg-gray-200" />

        {/* Change status */}
        <select
          disabled={busy}
          defaultValue=""
          onChange={e => {
            const v = e.target.value as LeadStatus
            if (!v) return
            e.target.value = ''
            run(lead => updateLead({ id: lead.id, tenant_id: tenantId, status: v }).then(() => {}))
          }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Set status…</option>
          {STATUS_OPTIONS.filter(o => o.value !== 'all').map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Move stage */}
        {stages.length > 0 && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={e => {
              const v = e.target.value
              if (!v) return
              e.target.value = ''
              run(lead => updateLead({ id: lead.id, tenant_id: tenantId, pipeline_stage_id: v || null }).then(() => {}))
            }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Move to stage…</option>
            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="">— Clear stage</option>
          </select>
        )}

        {/* Assign / remove agent — admin only */}
        {isAdmin && agents.length > 0 && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={e => {
              const v = e.target.value
              if (!v) return
              e.target.value = ''
              run(lead => updateLead({ id: lead.id, tenant_id: tenantId, assigned_agent_id: v }).then(() => {}))
            }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Assign agent…</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.full_name ?? a.id}</option>)}
          </select>
        )}

        {isAdmin && (
          <button
            disabled={busy}
            onClick={() => run(l =>
              updateLead({ id: l.id, tenant_id: tenantId, assigned_agent_id: null }).then(() => {})
            )}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Unassign
          </button>
        )}

        {/* Delete */}
        <button
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete ${count} lead${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
            run(lead => softDeleteLead(lead.id, tenantId))
          }}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </button>

        <div className="h-4 w-px bg-gray-200" />

        {/* Close */}
        <button
          onClick={onDone}
          className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition hover:text-white"
        >
          Cancel
        </button>

        {busy && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        )}
        {err && <span className="text-xs text-rose-400">{err}</span>}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'aged'


// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(leads: Lead[]) {
  const HEADERS = ['Date', 'Name', 'Phone', 'WhatsApp', 'Email', 'Status', 'Source', 'Follow-up', 'Notes']
  const rows = leads.map(l => [
    new Date(l.created_at).toLocaleDateString('en-IN'),
    l.name,
    l.phone ?? '',
    l.whatsapp ?? '',
    l.email ?? '',
    l.status,
    l.source ?? '',
    l.followup_date ? new Date(l.followup_date).toLocaleDateString('en-IN') : '',
    (l.notes ?? '').replace(/,/g, ';'),
  ])
  const csv = [HEADERS, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function LeadsListPage() {
  const { profile, isRole } = useAuth()
  const vocab = useVocab()
  const navigate    = useNavigate()
  const tenantId    = profile?.tenant_id ?? null

  const [searchParams, setSearchParams] = useSearchParams()

  // URL-driven filter param from dashboard cards and Lead Overview cards
  const filterParam  = searchParams.get('filter')
  const { filters: urlFilters, label: filterLabel } = resolveFilterParam(filterParam)

  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState<LeadStatus | 'all'>(() => {
    const param = searchParams.get('status')
    const valid: Array<LeadStatus | 'all'> = ['all', 'new', 'contacted', 'qualified', 'won', 'lost', 'unqualified']
    return valid.includes(param as LeadStatus) ? (param as LeadStatus) : 'all'
  })
  const [tab,       setTab]       = useState<FilterTab>('all')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  // Merge URL-driven filters with manual search/status — URL filter takes precedence
  const activeFilters = {
    ...urlFilters,
    search: search || undefined,
    status: !filterParam && status !== 'all' ? status : urlFilters.status,
  }

  const { leads, loading, error, refetch } = useLeads(tenantId, activeFilters)
  const { agents }  = useAgents(tenantId)
  const { stages }  = usePipelineStages(tenantId)

  // Aged filter — leads not updated in 7+ days, excluding won/lost
  const agedLeads = leads.filter(l =>
    ageDays(l.updated_at) >= 7 &&
    l.status !== 'won' && l.status !== 'lost' && l.status !== 'unqualified'
  )
  const displayLeads = tab === 'aged' ? agedLeads : leads

  // ── Selection helpers ────────────────────────────────────────────────────
  const allSelected = displayLeads.length > 0 && displayLeads.every(l => selected.has(l.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(displayLeads.map(l => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
    refetch()
  }

  // ── Single delete ────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete lead "${name}"? This cannot be undone.`)) return
    if (!tenantId) return
    setDeleting(id)
    setDeleteErr(null)
    try {
      await softDeleteLead(id, tenantId)
      refetch()
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {filterParam ? filterLabel : 'Leads'}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading ? '…' : `${displayLeads.length} lead${displayLeads.length !== 1 ? 's' : ''}`}
              {tab === 'aged' && <span className="ml-1.5 text-rose-400 text-xs">• aged leads</span>}
              {filterParam && (
                <button
                  onClick={() => setSearchParams({})}
                  className="ml-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
                >
                  × Clear filter
                </button>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRole('client_admin', 'super_admin') && (
              <button
                onClick={() => navigate('/leads/import')}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import CSV
              </button>
            )}
            <button
              onClick={() => exportToCSV(displayLeads)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => navigate('/leads/new')}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {vocab.addLead}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setTab('all')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'all' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All leads
          </button>
          <button
            onClick={() => setTab('aged')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === 'aged' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Aged (7d+)
            {agedLeads.length > 0 && (
              <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-400">
                {agedLeads.length}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as LeadStatus | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {(error || deleteErr) && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error ?? deleteErr}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {/* Checkbox header */}
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  {['Name', 'Phone', 'Status', 'Source', 'Follow-up', 'Age', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">

                {loading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-100" /></td>
                    {[55, 40, 25, 30, 30, 20].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: `${w}%` }} />
                      </td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                ))}

                {!loading && displayLeads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <p className="text-sm text-gray-500">
                        {tab === 'aged' ? 'No aged leads — great work!' : 'No leads found'}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {tab === 'all' && (search || status !== 'all') ? 'Try adjusting your filters.' :
                         tab === 'all' ? 'Add your first lead to get started.' : ''}
                      </p>
                    </td>
                  </tr>
                )}

                {!loading && displayLeads.map(lead => (
                  <tr
                    key={lead.id}
                    className={`cursor-pointer transition-colors ${selected.has(lead.id) ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      {lead.email && <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.phone ?? lead.whatsapp ?? '—'}</td>
                    <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{sourceLabel(lead.source)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {lead.followup_date ? formatDate(lead.followup_date) : '—'}
                    </td>
                    {/* Age badge */}
                    <td className="px-4 py-3">
                      <AgeBadge iso={lead.updated_at} />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}/edit`)}
                          className="rounded p-1.5 text-gray-500 transition hover:bg-gray-700 hover:text-white"
                          title="Edit"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id, lead.name)}
                          disabled={deleting === lead.id}
                          className="rounded p-1.5 text-gray-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                          title="Delete"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && tenantId && (
        <BulkActionBar
          selected={selected}
          leads={leads}
          tenantId={tenantId}
          stages={stages}
          agents={agents}
          isAdmin={isRole('client_admin', 'super_admin')}
          onDone={clearSelection}
        />
      )}

    </AppLayout>
  )
}
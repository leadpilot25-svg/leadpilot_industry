import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, isToday, isWithinDays, formatDate, formatDateTime, formatCurrency, daysUntil,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect, btnPrimary, btnSecondary, inputCls,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

// ─── Constants ────────────────────────────────────────────────────────────────

const COACHING_STAGES = [
  'New Inquiry',
  'Discovery Call',
  'Proposal Sent',
  'Joined',
  'Active',
  'Completed',
  'Dropped',
]

const COACHING_TYPES = ['Business', 'Life', 'Career', 'Fitness', 'Relationship', 'Executive', 'NLP']

const stageColor: Record<string, string> = {
  'New Inquiry':    'bg-gray-500/20 text-gray-400',
  'Discovery Call': 'bg-sky-500/20 text-sky-400',
  'Proposal Sent':  'bg-amber-500/20 text-amber-400',
  'Joined':         'bg-indigo-500/20 text-indigo-400',
  'Active':         'bg-emerald-500/20 text-emerald-400',
  'Completed':      'bg-violet-500/20 text-violet-400',
  'Dropped':        'bg-rose-500/20 text-rose-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); try { await fn() } finally { setBusy(null); refetch() }
  }
  return { busy, run }
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 font-medium">{count}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-400">{msg}</td>
    </tr>
  )
}

function ColHeaders({ headers }: { headers: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-100">
        {headers.map(h => (
          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>
        ))}
      </tr>
    </thead>
  )
}

// ─── Update Sessions Modal ────────────────────────────────────────────────────

function UpdateSessionsModal({
  lead, onClose, onSave,
}: {
  lead:    Lead
  onClose: () => void
  onSave:  (completed: number) => void
}) {
  const [completed, setCompleted] = useState(String(cdNum(lead, 'sessions_completed')))
  const booked = cdNum(lead, 'sessions_booked')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Update Sessions — {lead.name}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sessions Booked</label>
            <p className="text-sm text-gray-700">{booked || '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sessions Completed</label>
            <input
              type="number"
              value={completed}
              onChange={e => setCompleted(e.target.value)}
              min={0}
              max={booked || 999}
              placeholder="0"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(Number(completed))}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────


// ─── Zero-state guidance card ─────────────────────────────────────────────────

function GuidanceCard() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3">
      <div className="text-3xl">🎯</div>
      <div>
        <p className="text-sm font-semibold text-amber-900">Track clients and sessions</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">Add coaching stage and session details to your leads to see active clients and monthly revenue.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Custom fields to fill</p>
        <p className="font-mono text-[11px] text-gray-600">coaching_stage, monthly_fee, start_date</p>
      </div>
      <p className="text-xs text-amber-600">
        Go to <strong>Leads → Lead Detail</strong> and fill in these fields to unlock insights.
      </p>
    </div>
  )
}

export function CoachingWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'coach') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)
  const [sessionModalLead, setSessionModalLead] = useState<Lead | null>(null)

  // ── Derived views ──────────────────────────────────────────────────────────

  const activeStudents  = leads.filter(l =>
    cd(l, 'coaching_stage') === 'Active' || cd(l, 'coaching_stage') === 'Joined' || l.status === 'won'
  )
  const newAdmissions   = leads
    .filter(l => cd(l, 'start_date') && isWithinDays(cd(l, 'start_date'), 30))
    .sort((a, b) => cd(a, 'start_date').localeCompare(cd(b, 'start_date')))

  const followUpDue = leads.filter(l =>
    l.followup_date && isWithinDays(l.followup_date.slice(0, 10), 3)
  )

  const todaySessions = leads.filter(l => l.followup_date && isToday(l.followup_date))

  // Fee tracking — students with monthly_fee set
  const feeTracking = leads
    .filter(l => cdNum(l, 'monthly_fee') > 0)
    .sort((a, b) => cdNum(b, 'monthly_fee') - cdNum(a, 'monthly_fee'))

  const totalMonthlyRevenue = feeTracking.reduce((s, l) => s + cdNum(l, 'monthly_fee'), 0)

  // By coaching type
  const typeMap: Record<string, number> = {}
  leads.forEach(l => {
    const t = cd(l, 'coaching_type') || 'Other'
    typeMap[t] = (typeMap[t] ?? 0) + 1
  })
  const typeList = Object.entries(typeMap).sort((a, b) => b[1] - a[1])

  // Stage board
  const byStage = COACHING_STAGES.map(s => ({
    stage: s,
    leads: leads.filter(l =>
      cd(l, 'coaching_stage') === s ||
      (!cd(l, 'coaching_stage') && s === 'New Inquiry')
    ),
  })).filter(g => g.leads.length > 0)

  // Session progress — students with sessions_booked set
  const sessionProgress = leads.filter(l => cdNum(l, 'sessions_booked') > 0)

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Business — Coaching</h1>
          <p className="mt-0.5 text-sm text-gray-500">Student management, sessions, and revenue tracking</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Students"    value={leads.length}              accent="indigo" />
          <KpiCard label="Active Students"   value={activeStudents.length}     accent="emerald" />
          <KpiCard label="Sessions Today"    value={todaySessions.length}      accent="sky" />
          <KpiCard label="Monthly Revenue"   value={formatCurrency(totalMonthlyRevenue)} accent="amber" sub="from active students" />
        </div>

        {/* Today's Sessions */}
        <Section title="Today's Sessions" count={todaySessions.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Student', 'Coaching Type', 'Sessions', 'Fee', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
                  </td></tr>
                )}
                {!loading && todaySessions.length === 0 && <EmptyRow cols={5} msg="No sessions scheduled today" />}
                {!loading && todaySessions.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'coaching_type') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {cdNum(lead, 'sessions_completed')}/{cdNum(lead, 'sessions_booked') || '?'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-400">
                      {cdNum(lead, 'monthly_fee') > 0 ? formatCurrency(cdNum(lead, 'monthly_fee')) + '/mo' : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          className={btnPrimary}
                          onClick={() => run(lead.id + '_sess', async () => {
                            const next = cdNum(lead, 'sessions_completed') + 1
                            await patchCustomField(lead, 'sessions_completed', next)
                            if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Session ${next} completed`)
                          })}
                        >
                          {busy === lead.id + '_sess' ? '…' : '+1 Session'}
                        </button>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Active Students */}
        <Section title="Active Students" count={activeStudents.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Student', 'Coaching Type', 'Goal', 'Sessions Progress', 'Start Date', 'Monthly Fee', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && activeStudents.length === 0 && <EmptyRow cols={7} msg="No active students" />}
                {!loading && activeStudents.map(lead => {
                  const booked    = cdNum(lead, 'sessions_booked')
                  const completed = cdNum(lead, 'sessions_completed')
                  const pct = booked > 0 ? Math.round((completed / booked) * 100) : 0
                  return (
                    <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'coaching_type') || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-32 truncate">{cd(lead, 'goal') || '—'}</td>
                      <td className="px-4 py-3">
                        {booked > 0 ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-gray-700">
                                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{completed}/{booked}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(cd(lead, 'start_date'))}</td>
                      <td className="px-4 py-3 text-sm font-medium text-amber-400">
                        {cdNum(lead, 'monthly_fee') > 0 ? formatCurrency(cdNum(lead, 'monthly_fee')) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          className={btnSecondary}
                          onClick={() => setSessionModalLead(lead)}
                        >
                          Sessions
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* New Admissions */}
        <Section title="New Admissions (starting in 30 days)" count={newAdmissions.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Student', 'Coaching Type', 'Start Date', 'Days Away', 'Monthly Fee', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && newAdmissions.length === 0 && <EmptyRow cols={6} msg="No new admissions in the next 30 days" />}
                {!loading && newAdmissions.map(lead => {
                  const d = daysUntil(cd(lead, 'start_date'))
                  return (
                    <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'coaching_type') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(cd(lead, 'start_date'))}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${d <= 7 ? 'text-amber-400' : 'text-gray-300'}`}>{d}d</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-400">
                        {cdNum(lead, 'monthly_fee') > 0 ? formatCurrency(cdNum(lead, 'monthly_fee')) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          {lead.phone && <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>}
                          <button
                            className={btnPrimary}
                            onClick={() => run(lead.id + '_active', async () => {
                              await patchCustomField(lead, 'coaching_stage', 'Active')
                              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, 'Student marked Active')
                            })}
                          >
                            {busy === lead.id + '_active' ? '…' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Follow-up Reminders */}
        <Section title="Student Follow-ups" count={followUpDue.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Student', 'Coaching Type', 'Follow-up Date', 'Stage', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && followUpDue.length === 0 && <EmptyRow cols={5} msg="No follow-ups due in the next 3 days" />}
                {!loading && followUpDue.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'coaching_type') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.followup_date ? formatDateTime(lead.followup_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={cd(lead, 'coaching_stage') || lead.status}
                        color={stageColor[cd(lead, 'coaching_stage')] ?? 'bg-gray-500/20 text-gray-400'}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {lead.phone && <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>}
                        {lead.whatsapp && (
                          <a href={`https://wa.me/${(lead.whatsapp).replace(/\D/g,'')}`}
                            target="_blank" rel="noopener noreferrer"
                            className={btnSecondary} onClick={e => e.stopPropagation()}>WA</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Coaching Type Breakdown + Fee Tracker */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Coaching types */}
          <Section title="By Coaching Type" count={typeList.length}>
            <ul className="divide-y divide-gray-100">
              {typeList.map(([type, count]) => (
                <li key={type} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-700">{type}</span>
                  <span className="text-sm font-semibold text-indigo-400">{count}</span>
                </li>
              ))}
              {typeList.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-gray-400">No coaching types set</li>
              )}
            </ul>
          </Section>

          {/* Stage board mini */}
          <Section title="Pipeline Stage" count={leads.length}>
            <ul className="divide-y divide-gray-100">
              {byStage.map(({ stage, leads: group }) => (
                <li key={stage} className="flex items-center justify-between px-5 py-3">
                  <Badge label={stage} color={stageColor[stage] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-sm font-semibold text-gray-300">{group.length}</span>
                </li>
              ))}
            </ul>
          </Section>

        </div>

        {/* Session progress for all students with booked sessions */}
        {sessionProgress.length > 0 && (
          <Section title="Session Progress" count={sessionProgress.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <ColHeaders headers={['Student', 'Type', 'Booked', 'Completed', 'Progress', 'Action']} />
                <tbody className="divide-y divide-gray-100">
                  {sessionProgress.map(lead => {
                    const booked    = cdNum(lead, 'sessions_booked')
                    const completed = cdNum(lead, 'sessions_completed')
                    const pct = booked > 0 ? Math.round((completed / booked) * 100) : 0
                    return (
                      <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => navigate(`/leads/${lead.id}`)}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'coaching_type') || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{booked}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{completed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-gray-700">
                              <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            className={btnSecondary}
                            onClick={() => setSessionModalLead(lead)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}

      </div>

      {/* Session update modal */}
      {sessionModalLead && (
        <UpdateSessionsModal
          lead={sessionModalLead}
          onClose={() => setSessionModalLead(null)}
          onSave={async completed => {
            const lead = sessionModalLead
            setSessionModalLead(null)
            await run(lead.id + '_su', async () => {
              await patchCustomField(lead, 'sessions_completed', completed)
              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Sessions completed: ${completed}`)
            })
          }}
        />
      )}

    </AppLayout>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, isToday, formatDate, formatDateTime, formatCurrency, daysUntil,
  isWithinDays, patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect, btnPrimary, btnSecondary,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TYPES = ['Tarot Reading', 'Astrology Chart', 'Numerology', 'Healing Session', 'Vastu', 'Palmistry']

const CONSULTATION_STATUSES = [
  'New Inquiry',
  'Session Scheduled',
  'Session Completed',
  'Follow Up',
  'Repeat Client',
  'Closed',
]

const statusColor: Record<string, string> = {
  'New Inquiry':       'bg-gray-500/20 text-gray-400',
  'Session Scheduled': 'bg-sky-500/20 text-sky-400',
  'Session Completed': 'bg-violet-500/20 text-violet-400',
  'Follow Up':         'bg-amber-500/20 text-amber-400',
  'Repeat Client':     'bg-emerald-500/20 text-emerald-400',
  'Closed':            'bg-gray-700/50 text-gray-500',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TarotWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'tarot') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)

  // ── Derived views ──────────────────────────────────────────────────────────

  // Leads with a follow-up date set = upcoming sessions
  const upcoming = leads
    .filter(l => l.followup_date && !isToday(l.followup_date))
    .sort((a, b) => (a.followup_date ?? '').localeCompare(b.followup_date ?? ''))
    .slice(0, 20)

  const todaysSessions = leads.filter(l => l.followup_date && isToday(l.followup_date))

  const repeatClients = leads.filter(l => cd(l, 'consultation_status') === 'Repeat Client' || l.status === 'won')

  const followUpDue = leads.filter(l =>
    cd(l, 'consultation_status') === 'Follow Up' ||
    (l.followup_date && isWithinDays(l.followup_date.slice(0, 10), 3))
  )

  // Revenue by session type
  const revenueByType: Record<string, { count: number; revenue: number }> = {}
  SESSION_TYPES.forEach(t => { revenueByType[t] = { count: 0, revenue: 0 } })
  revenueByType['Other'] = { count: 0, revenue: 0 }
  leads.forEach(l => {
    const t = cd(l, 'session_type') || 'Other'
    if (!revenueByType[t]) revenueByType[t] = { count: 0, revenue: 0 }
    revenueByType[t].count++
    revenueByType[t].revenue += cdNum(l, 'session_fee')
  })
  const revenueTable = Object.entries(revenueByType)
    .filter(([, d]) => d.count > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue)

  // By consultation status
  const byStatus = CONSULTATION_STATUSES.map(s => ({
    status: s,
    leads:  leads.filter(l =>
      cd(l, 'consultation_status') === s ||
      (!cd(l, 'consultation_status') && s === 'New Inquiry')
    ),
  })).filter(g => g.leads.length > 0)

  // KPIs
  const totalRevenue   = leads.reduce((s, l) => s + cdNum(l, 'session_fee'), 0)
  const totalSessions  = leads.filter(l => cd(l, 'consultation_status') === 'Session Completed').length
  const repeatCount    = repeatClients.length

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tarot & Healing Workspace</h1>
          <p className="mt-0.5 text-sm text-gray-500">Appointments, sessions, and client management</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Clients"       value={leads.length}        accent="violet" />
          <KpiCard label="Sessions Today"      value={todaysSessions.length} accent="sky" />
          <KpiCard label="Repeat Clients"      value={repeatCount}         accent="emerald" />
          <KpiCard label="Total Revenue"       value={formatCurrency(totalRevenue)} accent="amber" />
        </div>

        {/* Today's Sessions */}
        <Section title="Today's Sessions" count={todaysSessions.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client', 'Session Type', 'Birth Details', 'Status', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
                  </td></tr>
                )}
                {!loading && todaysSessions.length === 0 && (
                  <EmptyRow cols={5} msg="No sessions scheduled for today" />
                )}
                {!loading && todaysSessions.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'session_type') || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {cd(lead, 'birth_date') && <span>{formatDate(cd(lead, 'birth_date'))}</span>}
                      {cd(lead, 'birth_time') && <span className="ml-1">{cd(lead, 'birth_time')}</span>}
                      {cd(lead, 'birth_place') && <span className="block text-gray-600">{cd(lead, 'birth_place')}</span>}
                      {!cd(lead, 'birth_date') && '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <InlineSelect
                        value={cd(lead, 'consultation_status') || 'Session Scheduled'}
                        options={CONSULTATION_STATUSES}
                        onChange={v => run(lead.id + '_cs', async () => {
                          await patchCustomField(lead, 'consultation_status', v)
                          if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Status: ${v}`)
                        })}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          className={btnPrimary}
                          onClick={() => run(lead.id + '_done', async () => {
                            await patchCustomField(lead, 'consultation_status', 'Session Completed')
                            if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, 'Session completed')
                          })}
                        >
                          {busy === lead.id + '_done' ? '…' : 'Done ✓'}
                        </button>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>
                        )}
                        {lead.whatsapp && (
                          <a
                            href={`https://wa.me/${(lead.whatsapp).replace(/\D/g,'')}`}
                            target="_blank" rel="noopener noreferrer"
                            className={btnSecondary}
                            onClick={e => e.stopPropagation()}
                          >
                            WA
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Upcoming Appointments */}
        <Section title="Upcoming Appointments" count={upcoming.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client', 'Session Type', 'Scheduled', 'Fee', 'Status', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && upcoming.length === 0 && (
                  <EmptyRow cols={6} msg="No upcoming appointments" />
                )}
                {!loading && upcoming.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'session_type') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.followup_date ? formatDateTime(lead.followup_date) : '—'}
                      {lead.followup_date && (
                        <span className="ml-1 text-xs text-gray-600">
                          ({daysUntil(lead.followup_date.slice(0, 10))}d)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-400">
                      {cdNum(lead, 'session_fee') > 0 ? formatCurrency(cdNum(lead, 'session_fee')) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <InlineSelect
                        value={cd(lead, 'consultation_status') || 'New Inquiry'}
                        options={CONSULTATION_STATUSES}
                        onChange={v => run(lead.id + '_cs2', async () => {
                          await patchCustomField(lead, 'consultation_status', v)
                          if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Status: ${v}`)
                        })}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {lead.whatsapp ? (
                        <a
                          href={`https://wa.me/${(lead.whatsapp).replace(/\D/g,'')}`}
                          target="_blank" rel="noopener noreferrer"
                          className={btnSecondary}
                          onClick={e => e.stopPropagation()}
                        >
                          WhatsApp
                        </a>
                      ) : lead.phone ? (
                        <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Follow-up Reminders */}
        <Section title="Follow-up Reminders" count={followUpDue.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client', 'Session Type', 'Last Status', 'Follow-up Due', 'Actions']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && followUpDue.length === 0 && <EmptyRow cols={5} msg="No follow-ups due" />}
                {!loading && followUpDue.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'session_type') || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        label={cd(lead, 'consultation_status') || 'New Inquiry'}
                        color={statusColor[cd(lead, 'consultation_status')] ?? 'bg-gray-500/20 text-gray-400'}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.followup_date ? formatDate(lead.followup_date.slice(0, 10)) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {lead.phone && <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>}
                        {lead.whatsapp && (
                          <a href={`https://wa.me/${(lead.whatsapp).replace(/\D/g,'')}`}
                            target="_blank" rel="noopener noreferrer"
                            className={btnSecondary} onClick={e => e.stopPropagation()}>WA</a>
                        )}
                        <button
                          className={btnPrimary}
                          onClick={() => run(lead.id + '_rc', async () => {
                            await patchCustomField(lead, 'consultation_status', 'Repeat Client')
                            if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, 'Marked as repeat client')
                          })}
                        >
                          {busy === lead.id + '_rc' ? '…' : 'Repeat ✓'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Consultation Status Board */}
        <Section title="Consultation Status" count={leads.length}>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-3">
            {byStatus.map(({ status, leads: group }) => (
              <div key={status} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Badge label={status} color={statusColor[status] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.slice(0, 5).map(l => (
                    <li key={l.id}
                      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 hover:border-gray-600 transition"
                      onClick={() => navigate(`/leads/${l.id}`)}>
                      <p className="text-xs font-medium text-gray-900 truncate">{l.name}</p>
                      <p className="text-xs text-gray-500">{cd(l, 'session_type') || ''}</p>
                    </li>
                  ))}
                  {group.length > 5 && <li className="text-xs text-gray-600 pl-1">+{group.length - 5} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Revenue Summary by Session Type */}
        <Section title="Revenue by Session Type" count={revenueTable.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Session Type', 'Total Sessions', 'Total Revenue', 'Avg per Session']} />
              <tbody className="divide-y divide-gray-100">
                {!loading && revenueTable.length === 0 && <EmptyRow cols={4} msg="No session revenue recorded" />}
                {!loading && revenueTable.map(([type, data]) => (
                  <tr key={type} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-white">{type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{data.count}</td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-400">{formatCurrency(data.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {data.count > 0 ? formatCurrency(Math.round(data.revenue / data.count)) : '—'}
                    </td>
                  </tr>
                ))}
                {!loading && revenueTable.length > 0 && (
                  <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{totalSessions}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-amber-400">{formatCurrency(totalRevenue)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

      </div>
    </AppLayout>
  )
}

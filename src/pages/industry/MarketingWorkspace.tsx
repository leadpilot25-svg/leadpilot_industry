import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, cdBool, daysUntil, isWithinDays, formatDate, formatCurrency,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect, btnPrimary, btnSecondary, inputCls,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_STATUSES = ['Prospect', 'Proposal Sent', 'Negotiating', 'Active', 'Paused', 'Cancelled', 'Completed']
const CAMPAIGN_TYPES    = ['SEO', 'Google Ads', 'Meta Ads', 'Email', 'Content', 'Social Media', 'Influencer', 'PR']

const contractColor: Record<string, string> = {
  'Prospect':      'bg-gray-500/20 text-gray-400',
  'Proposal Sent': 'bg-amber-500/20 text-amber-400',
  'Negotiating':   'bg-sky-500/20 text-sky-400',
  'Active':        'bg-emerald-500/20 text-emerald-400',
  'Paused':        'bg-orange-500/20 text-orange-400',
  'Cancelled':     'bg-rose-500/20 text-rose-400',
  'Completed':     'bg-violet-500/20 text-violet-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); try { await fn() } finally { setBusy(null); refetch() }
  }
  return { busy, run }
}

function Section({ title, count, extra, children }: {
  title: string; count: number; extra?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {extra}
        </div>
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-500">{msg}</td>
    </tr>
  )
}

function ColHeaders({ headers }: { headers: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-800">
        {headers.map(h => (
          <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ─── Assign Account Manager Modal ─────────────────────────────────────────────

function AssignManagerModal({
  lead, onClose, onSave,
}: {
  lead:    Lead
  onClose: () => void
  onSave:  (manager: string) => void
}) {
  const [manager, setManager] = useState(cd(lead, 'account_manager'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">Assign Account Manager — {lead.name}</h3>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Account Manager Name</label>
          <input
            type="text"
            value={manager}
            onChange={e => setManager(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className={inputCls}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(manager)}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Update Revenue Modal ─────────────────────────────────────────────────────

function UpdateRevenueModal({
  lead, onClose, onSave,
}: {
  lead:    Lead
  onClose: () => void
  onSave:  (revenue: number) => void
}) {
  const [amount, setAmount] = useState(String(cdNum(lead, 'revenue_to_date')))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">Update Revenue — {lead.name}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Contract Value</label>
            <p className="text-sm text-gray-300">{formatCurrency(cdNum(lead, 'contract_value'))}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Revenue To Date</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(Number(amount))}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MarketingWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'marketing') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)

  const [renewalDays,     setRenewalDays]     = useState<'30' | '60' | '90'>('30')
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null)
  const [revenueModalLead,setRevenueModalLead]= useState<Lead | null>(null)

  const days = parseInt(renewalDays)

  // ── Derived views ──────────────────────────────────────────────────────────
  const retainers  = leads.filter(l => cdBool(l, 'retainer') && cd(l, 'contract_status') === 'Active')
  const renewalsDue = leads
    .filter(l => cd(l, 'contract_end') && isWithinDays(cd(l, 'contract_end'), days))
    .sort((a, b) => cd(a, 'contract_end').localeCompare(cd(b, 'contract_end')))

  const totalContractValue = leads
    .filter(l => cd(l, 'contract_status') === 'Active')
    .reduce((s, l) => s + cdNum(l, 'contract_value'), 0)
  const totalRevenue = leads.reduce((s, l) => s + cdNum(l, 'revenue_to_date'), 0)
  const activeClients = leads.filter(l => cd(l, 'contract_status') === 'Active').length

  // By campaign type
  const campaignMap: Record<string, { count: number; value: number }> = {}
  leads.forEach(l => {
    const raw = (l.custom_data as Record<string, unknown> | null)?.campaign_type
    const types: string[] = Array.isArray(raw) ? raw : (raw ? [String(raw)] : ['Uncategorised'])
    types.forEach(t => {
      if (!campaignMap[t]) campaignMap[t] = { count: 0, value: 0 }
      campaignMap[t].count++
      campaignMap[t].value += cdNum(l, 'contract_value')
    })
  })
  const campaigns = Object.entries(campaignMap)
    .sort((a, b) => b[1].count - a[1].count)

  // By account manager
  const managerMap: Record<string, { name: string; clients: number; revenue: number; active: number }> = {}
  leads.forEach(l => {
    const name = cd(l, 'account_manager') || 'Unassigned'
    if (!managerMap[name]) managerMap[name] = { name, clients: 0, revenue: 0, active: 0 }
    managerMap[name].clients++
    managerMap[name].revenue += cdNum(l, 'revenue_to_date')
    if (cd(l, 'contract_status') === 'Active') managerMap[name].active++
  })
  const managers = Object.values(managerMap).sort((a, b) => b.active - a.active)

  // Contract status board
  const byStatus = CONTRACT_STATUSES.map(s => ({
    status: s,
    leads:  leads.filter(l =>
      cd(l, 'contract_status') === s ||
      (!cd(l, 'contract_status') && s === 'Prospect')
    ),
  })).filter(g => g.leads.length > 0)

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Marketing Workspace</h1>
          <p className="mt-0.5 text-sm text-gray-500">Campaign management, retainers, and revenue tracking</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Active Clients"    value={activeClients}                accent="indigo" />
          <KpiCard label="Retainers"         value={retainers.length}             accent="emerald" />
          <KpiCard label="Active MRR"        value={formatCurrency(totalContractValue / 12)} accent="sky" sub="est. monthly" />
          <KpiCard label="Revenue To Date"   value={formatCurrency(totalRevenue)} accent="amber" />
        </div>

        {/* Active Retainers */}
        <Section title="Active Retainers" count={retainers.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client','Account Manager','Campaigns','Contract End','Value','Revenue','Status','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
                  </td></tr>
                )}
                {!loading && retainers.length === 0 && (
                  <EmptyRow cols={8} msg="No active retainer clients" />
                )}
                {!loading && retainers.map(lead => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer transition-colors hover:bg-gray-800/30"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{cd(lead, 'industry') || lead.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {cd(lead, 'account_manager') || <span className="text-rose-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {cd(lead, 'campaign_type') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {cd(lead, 'contract_end') ? (
                        <span className={`text-sm ${daysUntil(cd(lead, 'contract_end')) <= 30 ? 'text-amber-400 font-medium' : 'text-gray-300'}`}>
                          {formatDate(cd(lead, 'contract_end'))}
                          <span className="ml-1 text-xs text-gray-600">({daysUntil(cd(lead, 'contract_end'))}d)</span>
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatCurrency(cdNum(lead, 'contract_value'))}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                      {formatCurrency(cdNum(lead, 'revenue_to_date'))}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <InlineSelect
                        value={cd(lead, 'contract_status') || 'Active'}
                        options={CONTRACT_STATUSES}
                        onChange={v => run(lead.id + '_cs', async () => {
                          await patchCustomField(lead, 'contract_status', v)
                          if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Contract status: ${v}`)
                        })}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          className={btnPrimary}
                          onClick={() => setRevenueModalLead(lead)}
                        >
                          Revenue
                        </button>
                        <button
                          className={btnSecondary}
                          onClick={() => setAssignModalLead(lead)}
                        >
                          AM
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Contract Renewals Due */}
        <Section
          title="Contract Renewals"
          count={renewalsDue.length}
          extra={
            <div className="flex gap-1">
              {(['30','60','90'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setRenewalDays(d)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    renewalDays === d
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client','Account Manager','Contract End','Days Left','Value','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {!loading && renewalsDue.length === 0 && (
                  <EmptyRow cols={6} msg={`No contracts ending in ${days} days`} />
                )}
                {!loading && renewalsDue.map(lead => {
                  const d = daysUntil(cd(lead, 'contract_end'))
                  return (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:bg-gray-800/30"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-gray-500">{cd(lead, 'industry') || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {cd(lead, 'account_manager') || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatDate(cd(lead, 'contract_end'))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${d <= 14 ? 'text-rose-400' : d <= 30 ? 'text-amber-400' : 'text-gray-300'}`}>
                          {d}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {formatCurrency(cdNum(lead, 'contract_value'))}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button
                            className={btnPrimary}
                            onClick={() => run(lead.id + '_renew', async () => {
                              await patchCustomField(lead, 'contract_status', 'Active')
                              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, 'Contract renewed')
                            })}
                          >
                            {busy === lead.id + '_renew' ? '…' : 'Renewed ✓'}
                          </button>
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className={btnSecondary}
                              onClick={e => e.stopPropagation()}
                            >
                              Call
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Campaign Overview */}
        <Section title="Campaign Overview" count={campaigns.length}>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {campaigns.map(([type, data]) => (
              <div key={type} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <p className="text-sm font-medium text-white truncate">{type}</p>
                <p className="mt-1 text-2xl font-bold text-indigo-400">{data.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(data.value)}</p>
              </div>
            ))}
            {!loading && campaigns.length === 0 && (
              <p className="col-span-4 py-8 text-center text-sm text-gray-500">
                No campaign types configured
              </p>
            )}
          </div>
        </Section>

        {/* Revenue Tracker */}
        <Section title="Revenue Tracker" count={leads.filter(l => cdNum(l, 'contract_value') > 0).length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client','Account Manager','Contract Value','Revenue To Date','% Collected','Contract Status','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {!loading && leads.filter(l => cdNum(l, 'contract_value') > 0).length === 0 && (
                  <EmptyRow cols={7} msg="No contracts with value set" />
                )}
                {!loading && leads
                  .filter(l => cdNum(l, 'contract_value') > 0)
                  .sort((a, b) => cdNum(b, 'contract_value') - cdNum(a, 'contract_value'))
                  .map(lead => {
                    const cv   = cdNum(lead, 'contract_value')
                    const rv   = cdNum(lead, 'revenue_to_date')
                    const pct  = cv > 0 ? Math.round((rv / cv) * 100) : 0
                    return (
                      <tr
                        key={lead.id}
                        className="cursor-pointer transition-colors hover:bg-gray-800/30"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{lead.name}</p>
                          <p className="text-xs text-gray-500">{cd(lead, 'industry') || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {cd(lead, 'account_manager') || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(cv)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-400">{formatCurrency(rv)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-gray-700">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={cd(lead, 'contract_status') || 'Prospect'}
                            color={contractColor[cd(lead, 'contract_status')] ?? 'bg-gray-500/20 text-gray-400'}
                          />
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            className={btnSecondary}
                            onClick={() => setRevenueModalLead(lead)}
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

        {/* Account Manager Performance */}
        <Section title="Account Manager Performance" count={managers.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Account Manager','Total Clients','Active','Revenue','Avg per Client']} />
              <tbody className="divide-y divide-gray-800">
                {!loading && managers.map(m => (
                  <tr key={m.name} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-medium text-white">{m.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{m.clients}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-emerald-400">{m.active}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {m.clients > 0 ? formatCurrency(Math.round(m.revenue / m.clients)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Contract Status Board */}
        <Section title="Contract Status Board" count={leads.length}>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {byStatus.map(({ status, leads: group }) => (
              <div key={status} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge label={status} color={contractColor[status] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.slice(0, 4).map(l => (
                    <li
                      key={l.id}
                      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 hover:border-gray-600 transition"
                      onClick={() => navigate(`/leads/${l.id}`)}
                    >
                      <p className="text-xs font-medium text-white truncate">{l.name}</p>
                      <p className="text-xs text-gray-500">{cd(l, 'account_manager') || ''}</p>
                    </li>
                  ))}
                  {group.length > 4 && (
                    <li className="text-xs text-gray-600 pl-1">+{group.length - 4} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Assign Manager Modal */}
      {assignModalLead && (
        <AssignManagerModal
          lead={assignModalLead}
          onClose={() => setAssignModalLead(null)}
          onSave={async manager => {
            const lead = assignModalLead
            setAssignModalLead(null)
            await run(lead.id + '_am', async () => {
              await patchCustomField(lead, 'account_manager', manager)
              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Account manager assigned: ${manager}`)
            })
          }}
        />
      )}

      {/* Update Revenue Modal */}
      {revenueModalLead && (
        <UpdateRevenueModal
          lead={revenueModalLead}
          onClose={() => setRevenueModalLead(null)}
          onSave={async revenue => {
            const lead = revenueModalLead
            setRevenueModalLead(null)
            await run(lead.id + '_rev', async () => {
              await patchCustomField(lead, 'revenue_to_date', revenue)
              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Revenue updated: ${formatCurrency(revenue)}`)
            })
          }}
        />
      )}

    </AppLayout>
  )
}

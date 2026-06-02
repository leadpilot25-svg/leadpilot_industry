import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, daysUntil, isWithinDays, formatDate, formatCurrency,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect, btnPrimary, btnSecondary,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

const POLICY_STATUSES  = ['New Lead', 'Quote Sent', 'Policy Issued', 'Renewal Due', 'Renewed', 'Lapsed']
const PAYMENT_FREQS    = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually']

const statusColor: Record<string, string> = {
  'New Lead':    'bg-gray-500/20 text-gray-400',
  'Quote Sent':  'bg-amber-500/20 text-amber-400',
  'Policy Issued':'bg-sky-500/20 text-sky-400',
  'Renewal Due': 'bg-rose-500/20 text-rose-400',
  'Renewed':     'bg-emerald-500/20 text-emerald-400',
  'Lapsed':      'bg-gray-700/50 text-gray-500',
}

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); try { await fn() } finally { setBusy(null); refetch() }
  }
  return { busy, run }
}

function Section({ title, count, extra, children }: { title: string; count: number; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
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
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-500">{msg}</td></tr>
}

export function InsuranceWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'insurance') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)
  const [renewalDays, setRenewalDays] = useState<'30' | '60' | '90'>('30')
  const days = parseInt(renewalDays)

  // ── Derived views ──────────────────────────────────────────────────────────
  const expiring = leads
    .filter(l => cd(l, 'policy_expiry_date') && isWithinDays(cd(l, 'policy_expiry_date'), days))
    .sort((a, b) => cd(a, 'policy_expiry_date').localeCompare(cd(b, 'policy_expiry_date')))

  const premiumDue = leads
    .filter(l => cd(l, 'next_premium_due') && isWithinDays(cd(l, 'next_premium_due'), 30))
    .sort((a, b) => cd(a, 'next_premium_due').localeCompare(cd(b, 'next_premium_due')))

  const byStatus = POLICY_STATUSES.map(s => ({
    status: s,
    leads:  leads.filter(l => cd(l, 'policy_status') === s || (!cd(l, 'policy_status') && s === 'New Lead')),
  })).filter(g => g.leads.length > 0)

  // Agent performance
  const agentMap: Record<string, { name: string; total: number; issued: number; premium: number }> = {}
  leads.forEach(l => {
    const name = cd(l, 'assigned_agent_name') || 'Unassigned'
    if (!agentMap[name]) agentMap[name] = { name, total: 0, issued: 0, premium: 0 }
    agentMap[name].total++
    if (cd(l, 'policy_status') === 'Policy Issued' || cd(l, 'policy_status') === 'Renewed') agentMap[name].issued++
    agentMap[name].premium += cdNum(l, 'premium_amount')
  })
  const agentList = Object.values(agentMap).sort((a, b) => b.issued - a.issued)

  // KPIs
  const totalPremium   = leads.reduce((s, l) => s + cdNum(l, 'premium_amount'), 0)
  const totalSumInsured = leads.reduce((s, l) => s + cdNum(l, 'sum_insured'), 0)
  const renewalCount   = leads.filter(l => cd(l, 'policy_status') === 'Renewal Due').length

  const ColHeaders = ({ headers }: { headers: string[] }) => (
    <thead><tr className="border-b border-gray-800">
      {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>)}
    </tr></thead>
  )

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-white">Insurance Workspace</h1>
          <p className="mt-0.5 text-sm text-gray-500">Renewals, premium tracking, and policy management</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Policies"   value={leads.length}           accent="indigo" />
          <KpiCard label="Renewal Due"      value={renewalCount}           accent="rose" />
          <KpiCard label="Total Premium"    value={formatCurrency(totalPremium)} accent="emerald" sub="annual" />
          <KpiCard label="Sum Insured"      value={formatCurrency(totalSumInsured)} accent="sky" />
        </div>

        {/* Renewal Center */}
        <Section
          title="Renewal Center"
          count={expiring.length}
          extra={
            <div className="flex gap-1">
              {(['30','60','90'] as const).map(d => (
                <button key={d} onClick={() => setRenewalDays(d)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${renewalDays === d ? 'bg-indigo-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-white'}`}>
                  {d}d
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client','Policy Type','Policy No.','Expiry','Days Left','Premium','Status','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center"><div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"/></td></tr>}
                {!loading && expiring.length === 0 && <EmptyRow cols={8} msg={`No policies expiring in ${days} days`} />}
                {!loading && expiring.map(lead => {
                  const d = daysUntil(cd(lead, 'policy_expiry_date'))
                  return (
                    <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-800/30" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'policy_type') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'policy_number') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'policy_expiry_date'))}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${d <= 14 ? 'text-rose-400' : d <= 30 ? 'text-amber-400' : 'text-gray-300'}`}>{d}d</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(cdNum(lead, 'premium_amount'))}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <InlineSelect
                          value={cd(lead, 'policy_status') || 'Policy Issued'}
                          options={POLICY_STATUSES}
                          onChange={v => run(lead.id + '_ps', async () => {
                            await patchCustomField(lead, 'policy_status', v)
                            if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Policy status: ${v}`)
                          })}
                        />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button
                            className={busy === lead.id + '_renew' ? 'opacity-50 ' + btnPrimary : btnPrimary}
                            onClick={() => run(lead.id + '_renew', async () => {
                              await patchCustomField(lead, 'policy_status', 'Renewed')
                              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, 'Policy marked as Renewed')
                            })}>
                            {busy === lead.id + '_renew' ? '…' : 'Renewed ✓'}
                          </button>
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>
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

        {/* Premium Tracker */}
        <Section title="Premium Due (next 30 days)" count={premiumDue.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Client','Policy Type','Frequency','Next Due','Premium Amount','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {!loading && premiumDue.length === 0 && <EmptyRow cols={6} msg="No premiums due in the next 30 days" />}
                {!loading && premiumDue.map(lead => (
                  <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-800/30" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'policy_type') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'payment_frequency') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'next_premium_due'))}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">{formatCurrency(cdNum(lead, 'premium_amount'))}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {lead.phone && <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>}
                        {lead.whatsapp && (
                          <a href={`https://wa.me/${(lead.whatsapp).replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
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

        {/* Policy Status Board */}
        <Section title="Policy Status Board" count={leads.length}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {byStatus.map(({ status, leads: group }) => (
              <div key={status} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge label={status} color={statusColor[status] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.slice(0, 5).map(l => (
                    <li key={l.id} className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 hover:border-gray-600 transition"
                      onClick={() => navigate(`/leads/${l.id}`)}>
                      <p className="text-xs font-medium text-white truncate">{l.name}</p>
                      <p className="text-xs text-gray-500">{cd(l, 'policy_type') || ''}</p>
                    </li>
                  ))}
                  {group.length > 5 && <li className="text-xs text-gray-600 pl-1">+{group.length - 5} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Agent Performance */}
        <Section title="Agent Performance" count={agentList.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Agent','Total Clients','Policies Issued','Conversion','Total Premium']} />
              <tbody className="divide-y divide-gray-800">
                {agentList.map(a => (
                  <tr key={a.name} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm font-medium text-white">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{a.total}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{a.issued}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {a.total > 0 ? `${Math.round((a.issued / a.total) * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-400">{formatCurrency(a.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

      </div>
    </AppLayout>
  )
}

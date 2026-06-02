import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, formatDate, formatCurrency,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect, btnPrimary, btnSecondary, inputCls,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

const ENROLLMENT_STATUSES = ['Inquiry', 'Counselling', 'Demo Scheduled', 'Demo Done', 'Enrolled', 'Dropped Out']
const PAYMENT_MODES       = ['Cash', 'Online', 'Cheque', 'EMI', 'Scholarship']

const statusColor: Record<string, string> = {
  'Inquiry':        'bg-gray-500/20 text-gray-400',
  'Counselling':    'bg-amber-500/20 text-amber-400',
  'Demo Scheduled': 'bg-sky-500/20 text-sky-400',
  'Demo Done':      'bg-violet-500/20 text-violet-400',
  'Enrolled':       'bg-emerald-500/20 text-emerald-400',
  'Dropped Out':    'bg-rose-500/20 text-rose-400',
}

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); try { await fn() } finally { setBusy(null); refetch() }
  }
  return { busy, run }
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-500">{msg}</td></tr>
}

// Modal to record fee payment
function FeePaymentModal({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (paid: number, mode: string) => void }) {
  const [amount, setAmount] = useState(String(cdNum(lead, 'fee_paid')))
  const [mode,   setMode]   = useState(cd(lead, 'payment_mode') || 'Online')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">Update Fee — {lead.name}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Fee Quoted</label>
            <p className="text-sm text-gray-300">{formatCurrency(cdNum(lead, 'fee_quoted'))}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Total Fee Paid</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Payment Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">Cancel</button>
          <button onClick={() => onSave(Number(amount), mode)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save Payment</button>
        </div>
      </div>
    </div>
  )
}

export function EducationWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'education') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)
  const [feeModalLead, setFeeModalLead] = useState<Lead | null>(null)

  // ── Derived views ──────────────────────────────────────────────────────────
  const enrolled = leads.filter(l => cd(l, 'enrollment_status') === 'Enrolled')
  const totalFeeQuoted  = leads.reduce((s, l) => s + cdNum(l, 'fee_quoted'), 0)
  const totalFeePaid    = leads.reduce((s, l) => s + cdNum(l, 'fee_paid'), 0)
  const totalPending    = totalFeeQuoted - totalFeePaid

  // Batch groups
  const batchMap: Record<string, Lead[]> = {}
  leads.forEach(l => {
    const b = cd(l, 'batch') || 'No Batch'
    if (!batchMap[b]) batchMap[b] = []
    batchMap[b].push(l)
  })
  const batches = Object.entries(batchMap)
    .map(([name, members]) => ({
      name,
      total:    members.length,
      enrolled: members.filter(l => cd(l, 'enrollment_status') === 'Enrolled').length,
      feePaid:  members.reduce((s, l) => s + cdNum(l, 'fee_paid'), 0),
      feeQuoted:members.reduce((s, l) => s + cdNum(l, 'fee_quoted'), 0),
      members,
    }))
    .sort((a, b) => b.enrolled - a.enrolled)

  // Status board
  const byStatus = ENROLLMENT_STATUSES.map(s => ({
    status: s,
    leads:  leads.filter(l => cd(l, 'enrollment_status') === s || (!cd(l, 'enrollment_status') && s === 'Inquiry')),
  })).filter(g => g.leads.length > 0)

  // Fee pending
  const feePending = leads
    .filter(l => cdNum(l, 'fee_quoted') > cdNum(l, 'fee_paid') && cdNum(l, 'fee_quoted') > 0)
    .sort((a, b) => (cdNum(b, 'fee_quoted') - cdNum(b, 'fee_paid')) - (cdNum(a, 'fee_quoted') - cdNum(a, 'fee_paid')))

  const ColHeaders = ({ headers }: { headers: string[] }) => (
    <thead><tr className="border-b border-gray-800">
      {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>)}
    </tr></thead>
  )

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-white">Education Workspace</h1>
          <p className="mt-0.5 text-sm text-gray-500">Batch management, enrollment, and fee tracking</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Students"  value={leads.length}              accent="indigo" />
          <KpiCard label="Enrolled"        value={enrolled.length}           accent="emerald" />
          <KpiCard label="Fee Collected"   value={formatCurrency(totalFeePaid)} accent="sky" />
          <KpiCard label="Fee Pending"     value={formatCurrency(totalPending)} accent="rose" />
        </div>

        {/* Batch Overview */}
        <Section title="Batch Overview" count={batches.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Batch','Total Students','Enrolled','Dropout','Fee Collected','Fee Pending','Action']} />
              <tbody className="divide-y divide-gray-800">
                {loading && <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"/></td></tr>}
                {!loading && batches.length === 0 && <EmptyRow cols={7} msg="No batches configured. Add a Batch field to your leads." />}
                {!loading && batches.map(batch => {
                  const dropout = batch.members.filter(l => cd(l, 'enrollment_status') === 'Dropped Out').length
                  return (
                    <tr key={batch.name} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm font-medium text-white">{batch.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{batch.total}</td>
                      <td className="px-4 py-3"><span className="text-sm font-medium text-emerald-400">{batch.enrolled}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-rose-400">{dropout}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(batch.feePaid)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${batch.feeQuoted - batch.feePaid > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {formatCurrency(batch.feeQuoted - batch.feePaid)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className={btnSecondary} onClick={() => navigate(`/leads?search=${encodeURIComponent(batch.name)}`)}>
                          View Students
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Enrollment Status Board */}
        <Section title="Enrollment Status" count={leads.length}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {byStatus.map(({ status, leads: group }) => (
              <div key={status} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge label={status} color={statusColor[status] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {group.slice(0, 5).map(l => (
                    <li key={l.id}
                      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 hover:border-gray-600 transition"
                      onClick={() => navigate(`/leads/${l.id}`)}>
                      <p className="text-xs font-medium text-white truncate">{l.name}</p>
                      <p className="text-xs text-gray-500">{cd(l, 'course') || cd(l, 'batch') || ''}</p>
                    </li>
                  ))}
                  {group.length > 5 && <li className="text-xs text-gray-600 pl-1">+{group.length - 5} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Fee Tracker */}
        <Section title="Fee Pending" count={feePending.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <ColHeaders headers={['Student','Course','Batch','Fee Quoted','Fee Paid','Balance','Actions']} />
              <tbody className="divide-y divide-gray-800">
                {!loading && feePending.length === 0 && <EmptyRow cols={7} msg="All fees collected" />}
                {!loading && feePending.map(lead => {
                  const balance = cdNum(lead, 'fee_quoted') - cdNum(lead, 'fee_paid')
                  return (
                    <tr key={lead.id} className="cursor-pointer transition-colors hover:bg-gray-800/30" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'course') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'batch') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatCurrency(cdNum(lead, 'fee_quoted'))}</td>
                      <td className="px-4 py-3 text-sm text-emerald-400">{formatCurrency(cdNum(lead, 'fee_paid'))}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-400">{formatCurrency(balance)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button className={btnPrimary} onClick={() => setFeeModalLead(lead)}>
                            Update Fee
                          </button>
                          {lead.phone && <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Fee payment modal */}
        {feeModalLead && (
          <FeePaymentModal
            lead={feeModalLead}
            onClose={() => setFeeModalLead(null)}
            onSave={async (paid, mode) => {
              const lead = feeModalLead
              setFeeModalLead(null)
              await run(lead.id + '_fee', async () => {
                const existing = (lead.custom_data as Record<string, unknown> | null) ?? {}
                const next = { ...existing, fee_paid: paid, payment_mode: mode }
                const { updateLead } = await import('../../lib/services/leads.service')
                await updateLead({ id: lead.id, tenant_id: lead.tenant_id, custom_data: next })
                if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Fee updated: paid ${formatCurrency(paid)} via ${mode}`)
              })
            }}
          />
        )}

      </div>
    </AppLayout>
  )
}

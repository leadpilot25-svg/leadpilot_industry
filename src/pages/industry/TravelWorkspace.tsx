import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdBool, daysUntil, isWithinDays, formatDate, formatCurrency, cdNum,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect,
  btnPrimary, btnSecondary, selectCls,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

// ─── Guards ───────────────────────────────────────────────────────────────────

const BOOKING_STATUSES = ['Inquiry', 'Quote Sent', 'Advance Paid', 'Confirmed', 'Completed', 'Cancelled']
const VISA_STATUSES    = ['Not Required', 'Pending', 'Applied', 'Approved', 'Rejected']

const bookingColor: Record<string, string> = {
  'Inquiry':      'bg-gray-500/20 text-gray-400',
  'Quote Sent':   'bg-amber-500/20 text-amber-400',
  'Advance Paid': 'bg-sky-500/20 text-sky-400',
  'Confirmed':    'bg-indigo-500/20 text-indigo-400',
  'Completed':    'bg-emerald-500/20 text-emerald-400',
  'Cancelled':    'bg-rose-500/20 text-rose-400',
}
const visaColor: Record<string, string> = {
  'Not Required': 'bg-gray-500/20 text-gray-400',
  'Pending':      'bg-amber-500/20 text-amber-400',
  'Applied':      'bg-sky-500/20 text-sky-400',
  'Approved':     'bg-emerald-500/20 text-emerald-400',
  'Rejected':     'bg-rose-500/20 text-rose-400',
}

// ─── Inline action helpers ────────────────────────────────────────────────────

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id)
    try { await fn() } finally { setBusy(null); refetch() }
  }
  return { busy, run }
}

// ─── Shared lead row ──────────────────────────────────────────────────────────

function LeadRow({
  lead, children, onClick,
}: { lead: Lead; children?: React.ReactNode; onClick: () => void }) {
  return (
    <tr className="cursor-pointer transition-colors hover:bg-gray-800/30" onClick={onClick}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">{lead.name}</p>
        <p className="text-xs text-gray-500">{lead.phone ?? lead.whatsapp ?? ''}</p>
      </td>
      {children}
    </tr>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-500">{message}</td></tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TravelWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  // Redirect if wrong industry
  if (settings && settings.business_type !== 'travel') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)

  const [daysFilter, setDaysFilter] = useState<'30' | '60' | '90'>('30')
  const days = parseInt(daysFilter)

  // ── Derived views ──────────────────────────────────────────────────────────
  const upcoming    = leads
    .filter(l => cd(l, 'departure_date') && isWithinDays(cd(l, 'departure_date'), days))
    .sort((a, b) => cd(a, 'departure_date').localeCompare(cd(b, 'departure_date')))

  const visaNeeded  = leads.filter(l => cdBool(l, 'visa_required') && cd(l, 'visa_status') !== 'Approved')
  const passportExp = leads.filter(l => {
    const exp = cd(l, 'passport_expiry')
    if (!exp) return false
    const d = daysUntil(exp)
    return d >= 0 && d <= 180
  }).sort((a, b) => cd(a, 'passport_expiry').localeCompare(cd(b, 'passport_expiry')))

  const byBooking   = BOOKING_STATUSES.map(status => ({
    status,
    leads: leads.filter(l => cd(l, 'booking_status') === status || (!cd(l, 'booking_status') && status === 'Inquiry')),
  })).filter(g => g.leads.length > 0)

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalBudget    = leads.reduce((s, l) => s + cdNum(l, 'budget'), 0)
  const confirmedCount = leads.filter(l => cd(l, 'booking_status') === 'Confirmed').length
  const visaPending    = leads.filter(l => cd(l, 'visa_status') === 'Pending' || cd(l, 'visa_status') === 'Applied').length

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Travel Workspace</h1>
          <p className="mt-0.5 text-sm text-gray-500">Bookings, visa tracking, and departure management</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total Inquiries"    value={leads.length}     accent="indigo" />
          <KpiCard label="Confirmed Bookings" value={confirmedCount}   accent="emerald" />
          <KpiCard label="Visa Pending"       value={visaPending}      accent="amber" />
          <KpiCard label="Total Budget"       value={formatCurrency(totalBudget)} accent="sky" sub="across all bookings" />
        </div>

        {/* Upcoming Departures */}
        <Section title="Upcoming Departures" count={upcoming.length}>
          <div className="flex items-center gap-2 border-b border-gray-800 px-5 py-3">
            <span className="text-xs text-gray-500">Show next:</span>
            {(['30','60','90'] as const).map(d => (
              <button key={d}
                onClick={() => setDaysFilter(d)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${daysFilter === d ? 'bg-indigo-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-white'}`}
              >{d} days</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {['Client','Destination','Departure','Return','Passengers','Booking Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {loading && <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"/></td></tr>}
                {!loading && upcoming.length === 0 && <EmptyRow cols={7} message={`No departures in the next ${days} days`} />}
                {!loading && upcoming.map(lead => (
                  <LeadRow key={lead.id} lead={lead} onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'destination') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'departure_date'))}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'return_date'))}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'passengers') || '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <InlineSelect
                        value={cd(lead, 'booking_status') || 'Inquiry'}
                        options={BOOKING_STATUSES}
                        onChange={v => run(lead.id + '_bs', () => patchCustomField(lead, 'booking_status', v))}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <a href={`https://wa.me/${(lead.whatsapp ?? lead.phone ?? '').replace(/\D/g,'')}`}
                          target="_blank" rel="noopener noreferrer"
                          className={btnSecondary}
                          onClick={e => e.stopPropagation()}>
                          WhatsApp
                        </a>
                        <button className={btnPrimary} onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                          {busy === lead.id + '_bs' ? '…' : 'Edit'}
                        </button>
                      </div>
                    </td>
                  </LeadRow>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Visa Tracking */}
        <Section title="Visa Tracking" count={visaNeeded.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {['Client','Destination','Departure','Visa Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {!loading && visaNeeded.length === 0 && <EmptyRow cols={5} message="No visa-required bookings pending" />}
                {!loading && visaNeeded.map(lead => (
                  <LeadRow key={lead.id} lead={lead} onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'destination') || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'departure_date'))}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <InlineSelect
                        value={cd(lead, 'visa_status') || 'Pending'}
                        options={VISA_STATUSES}
                        onChange={v => run(lead.id + '_vs', async () => {
                          await patchCustomField(lead, 'visa_status', v)
                          if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Visa status updated to: ${v}`)
                        })}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button className={btnPrimary}
                        onClick={() => run(lead.id + '_vr', () => patchCustomField(lead, 'visa_status', 'Applied'))}>
                        Mark Applied
                      </button>
                    </td>
                  </LeadRow>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Passport Expiry */}
        <Section title="Passport Alerts (expiring within 6 months)" count={passportExp.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">
                {['Client','Passport No.','Expiry Date','Days Left','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {!loading && passportExp.length === 0 && <EmptyRow cols={5} message="No passport expiry alerts" />}
                {!loading && passportExp.map(lead => {
                  const days = daysUntil(cd(lead, 'passport_expiry'))
                  return (
                    <LeadRow key={lead.id} lead={lead} onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td className="px-4 py-3 text-sm text-gray-300">{cd(lead, 'passport_number') || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(cd(lead, 'passport_expiry'))}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${days <= 30 ? 'text-rose-400' : days <= 90 ? 'text-amber-400' : 'text-gray-300'}`}>
                          {days} days
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <a href={`tel:${lead.phone}`} className={btnSecondary}>Call Client</a>
                      </td>
                    </LeadRow>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Booking Status Board */}
        <Section title="Booking Status Board" count={leads.length}>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {byBooking.map(({ status, leads: group }) => (
              <div key={status} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge label={status} color={bookingColor[status] ?? 'bg-gray-500/20 text-gray-400'} />
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <ul className="space-y-2">
                  {group.slice(0, 5).map(lead => (
                    <li key={lead.id}
                      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 hover:border-gray-600 transition"
                      onClick={() => navigate(`/leads/${lead.id}`)}>
                      <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500">{cd(lead, 'destination') || 'No destination'}</p>
                    </li>
                  ))}
                  {group.length > 5 && <li className="text-xs text-gray-600 pl-1">+{group.length - 5} more</li>}
                </ul>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </AppLayout>
  )
}

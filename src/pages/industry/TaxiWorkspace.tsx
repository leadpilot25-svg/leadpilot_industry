import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  cd, cdNum, isToday, formatDateTime, formatCurrency, daysUntil,
  patchCustomField, logWorkspaceActivity,
  KpiCard, Badge, InlineSelect,
  btnPrimary, btnSecondary, btnSuccess, inputCls,
} from '../../lib/services/workspaceUtils'
import type { Lead } from '../../types/lead'

const TRIP_STATUSES = ['Pending', 'Assigned', 'In Transit', 'Completed', 'Cancelled']
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Mini-bus', 'Bus', 'Tempo Traveller']

const tripColor: Record<string, string> = {
  'Pending':    'bg-amber-500/20 text-amber-400',
  'Assigned':   'bg-sky-500/20 text-sky-400',
  'In Transit': 'bg-indigo-500/20 text-indigo-400',
  'Completed':  'bg-emerald-500/20 text-emerald-400',
  'Cancelled':  'bg-rose-500/20 text-rose-400',
}

function useAction(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id)
    try { await fn() } finally { setBusy(null); refetch() }
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
  return <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-gray-400">{msg}</td></tr>
}

// Driver assignment modal
function AssignDriverModal({
  lead, onClose, onSave,
}: { lead: Lead; onClose: () => void; onSave: (driver: string, phone: string, vehicle: string) => void }) {
  const [driverName, setDriverName]   = useState(cd(lead, 'driver_name'))
  const [driverPhone, setDriverPhone] = useState(cd(lead, 'driver_phone'))
  const [vehicleNo, setVehicleNo]     = useState(cd(lead, 'vehicle_number'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Assign Driver — {lead.name}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Driver Name</label>
            <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
              placeholder="Driver full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Driver Phone</label>
            <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)}
              placeholder="+91 98765 43210" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Vehicle Number</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)}
              placeholder="MH01AB1234" className={inputCls} />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => onSave(driverName, driverPhone, vehicleNo)}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-indigo-700">
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Zero-state guidance card ─────────────────────────────────────────────────

function GuidanceCard() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center space-y-3">
      <div className="text-3xl">🚕</div>
      <div>
        <p className="text-sm font-semibold text-amber-900">Track trips and pickups</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">Add pickup date and location to your leads to see today's trips, upcoming pickups, and revenue.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Custom fields to fill</p>
        <p className="font-mono text-[11px] text-gray-600">pickup_datetime, pickup_location, trip_fare</p>
      </div>
      <p className="text-xs text-amber-600">
        Go to <strong>Leads → Lead Detail</strong> and fill in these fields to unlock insights.
      </p>
    </div>
  )
}

export function TaxiWorkspace() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  if (settings && settings.business_type !== 'taxi') {
    navigate('/dashboard', { replace: true })
    return null
  }

  const { leads, loading, refetch } = useLeads(tenantId)
  const { busy, run } = useAction(refetch)
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null)

  const todaysTrips    = leads.filter(l => cd(l, 'pickup_datetime') && isToday(cd(l, 'pickup_datetime')))
  const upcomingTrips  = leads.filter(l => {
    const dt = cd(l, 'pickup_datetime')
    if (!dt) return false
    const d = daysUntil(dt.slice(0, 10))
    return d > 0 && d <= 7
  }).sort((a, b) => cd(a, 'pickup_datetime').localeCompare(cd(b, 'pickup_datetime')))
  const unassigned     = leads.filter(l => !cd(l, 'driver_name') && cd(l, 'trip_status') !== 'Completed' && cd(l, 'trip_status') !== 'Cancelled')
  const totalRevenue   = leads.filter(l => cd(l, 'trip_status') === 'Completed').reduce((s, l) => s + cdNum(l, 'fare'), 0)

  const vehicleGroups = VEHICLE_TYPES.map(v => ({
    type: v, leads: leads.filter(l => cd(l, 'vehicle_type') === v),
  })).filter(g => g.leads.length > 0)

  const TripRow = ({ lead }: { lead: Lead }) => (
    <tr className="cursor-pointer transition-colors hover:bg-gray-50" onClick={() => navigate(`/leads/${lead.id}`)}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{lead.name}</p>
        <p className="text-xs text-gray-500">{lead.phone}</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'pickup_location') || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'drop_location') || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(cd(lead, 'pickup_datetime'))}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{cd(lead, 'driver_name') || <span className="text-rose-400">Unassigned</span>}</td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <InlineSelect
          value={cd(lead, 'trip_status') || 'Pending'}
          options={TRIP_STATUSES}
          onChange={v => run(lead.id + '_ts', async () => {
            await patchCustomField(lead, 'trip_status', v)
            if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Trip status: ${v}`)
          })}
        />
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1.5">
          <button onClick={() => setAssigningLead(lead)} className={btnPrimary}>
            {busy?.startsWith(lead.id) ? '…' : 'Assign'}
          </button>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className={btnSecondary} onClick={e => e.stopPropagation()}>Call</a>
          )}
        </div>
      </td>
    </tr>
  )

  const headers = ['Client', 'Pickup', 'Drop', 'Time', 'Driver', 'Status', 'Actions']

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Business — Taxi</h1>
          <p className="mt-0.5 text-sm text-gray-500">Trips, driver assignment, and vehicle scheduling</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Today's Trips"   value={todaysTrips.length}   accent="sky" />
          <KpiCard label="Upcoming (7d)"   value={upcomingTrips.length} accent="indigo" />
          <KpiCard label="Unassigned"      value={unassigned.length}    accent="rose" />
          <KpiCard label="Revenue (Completed)" value={formatCurrency(totalRevenue)} accent="emerald" />
        </div>

        {/* Today's Trips */}
        <Section title="Today's Trips" count={todaysTrips.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={7} className="px-4 py-8 text-center"><div className="h-5 w-5 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" /></td></tr>}
                {!loading && todaysTrips.length === 0 && <EmptyRow cols={7} msg="No trips today" />}
                {!loading && todaysTrips.map(l => <TripRow key={l.id} lead={l} />)}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Unassigned Trips */}
        <Section title="Unassigned Trips" count={unassigned.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {!loading && unassigned.length === 0 && <EmptyRow cols={7} msg="All trips are assigned" />}
                {!loading && unassigned.map(l => <TripRow key={l.id} lead={l} />)}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Upcoming Trips */}
        <Section title="Upcoming Trips (next 7 days)" count={upcomingTrips.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {!loading && upcomingTrips.length === 0 && <EmptyRow cols={7} msg="No upcoming trips in the next 7 days" />}
                {!loading && upcomingTrips.map(l => <TripRow key={l.id} lead={l} />)}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Vehicle Scheduling */}
        {vehicleGroups.length > 0 && (
          <Section title="Vehicle Scheduling" count={leads.length}>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleGroups.map(({ type, leads: group }) => (
                <div key={type} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">{type}</p>
                    <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">{group.length} trips</span>
                  </div>
                  <ul className="space-y-2">
                    {group.slice(0, 4).map(l => (
                      <li key={l.id} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-emerald-300 transition"
                        onClick={() => navigate(`/leads/${l.id}`)}>
                        <p className="text-xs font-medium text-gray-900 truncate">{l.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${tripColor[cd(l, 'trip_status')] ?? 'text-gray-500'}`}>
                            {cd(l, 'trip_status') || 'Pending'}
                          </span>
                          <span className="text-xs text-gray-600">{formatDateTime(cd(l, 'pickup_datetime'))}</span>
                        </div>
                      </li>
                    ))}
                    {group.length > 4 && <li className="text-xs text-gray-600 pl-1">+{group.length - 4} more</li>}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* Driver assignment modal */}
      {assigningLead && (
        <AssignDriverModal
          lead={assigningLead}
          onClose={() => setAssigningLead(null)}
          onSave={async (driverName, driverPhone, vehicleNo) => {
            const lead = assigningLead
            setAssigningLead(null)
            await run(lead.id + '_assign', async () => {
              const existing = (lead.custom_data as Record<string, unknown> | null) ?? {}
              const next = { ...existing, driver_name: driverName, driver_phone: driverPhone, vehicle_number: vehicleNo, trip_status: 'Assigned' }
              const { updateLead } = await import('../../lib/services/leads.service')
              await updateLead({ id: lead.id, tenant_id: lead.tenant_id, custom_data: next })
              if (profile) await logWorkspaceActivity(tenantId!, lead.id, profile.id, `Driver assigned: ${driverName} (${vehicleNo})`)
            })
          }}
        />
      )}
    </AppLayout>
  )
}
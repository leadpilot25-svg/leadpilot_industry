import type { Lead, LeadStatus } from '../../types/lead'

interface RecentLeadsProps {
  leads:   Lead[]
  loading: boolean
}

// Each status has its own separate bg/text/ring class — no multi-space strings.
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

function SkeletonRow() {
  return (
    <tr>
      {[60, 45, 30, 40].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 animate-pulse rounded bg-gray-800"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

export function RecentLeads({ leads, loading }: RecentLeadsProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900">

      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h2 className="text-sm font-semibold text-white">Recent Leads</h2>
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
          {loading ? '…' : leads.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Name', 'Phone', 'Status', 'Added'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">

            {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <p className="text-xs text-gray-500">No leads yet</p>
                  <p className="mt-1 text-xs text-gray-600">Leads you add will appear here.</p>
                </td>
              </tr>
            )}

            {!loading && leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-white">{lead.name}</span>
                  {lead.email && (
                    <p className="text-xs text-gray-500 mt-0.5">{lead.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {lead.phone ?? lead.whatsapp ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBg[lead.status]} ${statusText[lead.status]}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

    </div>
  )
}

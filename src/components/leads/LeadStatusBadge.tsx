import type { LeadStatus } from '../../types/lead'

interface LeadStatusBadgeProps {
  status: LeadStatus
  size?:  'sm' | 'md'
}

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
const statusLabel: Record<LeadStatus, string> = {
  new:         'New',
  contacted:   'Contacted',
  qualified:   'Qualified',
  won:         'Won',
  lost:        'Lost',
  unqualified: 'Unqualified',
}

export function LeadStatusBadge({ status, size = 'sm' }: LeadStatusBadgeProps) {
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${pad} ${statusBg[status]} ${statusText[status]}`}>
      {statusLabel[status]}
    </span>
  )
}

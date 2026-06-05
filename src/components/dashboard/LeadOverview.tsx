import { useNavigate } from 'react-router-dom'
import type { DashboardStats } from '../../types/lead'
import type { BusinessType } from '../../types/tenant'

interface LeadOverviewProps {
  stats:        DashboardStats | null
  loading:      boolean
  businessType: BusinessType | null
}

// Industry-aware labels for the 4 overview tiles
const LABELS: Partial<Record<BusinessType, { total: string; open: string; won: string; followup: string }>> = {
  insurance: { total: 'Prospects',     open: 'Active',    won: 'Policies Issued', followup: "Follow-ups" },
  travel:    { total: 'Inquiries',     open: 'Active',    won: 'Bookings',        followup: "Follow-ups" },
  education: { total: 'Students',      open: 'Inquiries', won: 'Enrolled',        followup: "Follow-ups" },
  coach:     { total: 'Prospects',     open: 'Active',    won: 'Joined',          followup: "Follow-ups" },
  tarot:     { total: 'Clients',       open: 'Inquiries', won: 'Completed',       followup: "Follow-ups" },
  marketing: { total: 'Leads',         open: 'Active',    won: 'Contracts',       followup: "Follow-ups" },
  taxi:      { total: 'Bookings',      open: 'Pending',   won: 'Completed',       followup: "Follow-ups" },
}

const DEFAULT_LABELS = { total: 'Total Leads', open: 'New Leads', won: 'Won', followup: 'Follow-ups Due' }

function Tile({
  label, value, accent, href, loading,
}: {
  label:   string
  value:   number
  accent:  'emerald' | 'blue' | 'violet' | 'amber'
  href:    string
  loading: boolean
}) {
  const navigate = useNavigate()

  const cfg = {
    emerald: { num: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    blue:    { num: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
    violet:  { num: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100'  },
    amber:   { num: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
  }[accent]

  return (
    <button
      onClick={() => navigate(href)}
      className={`flex-1 rounded-2xl border ${cfg.border} ${cfg.bg} p-4 text-left transition hover:shadow-sm active:scale-[0.98]`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded-lg bg-white/70" />
      ) : (
        <p className={`mt-1.5 text-2xl font-bold ${cfg.num}`}>{value}</p>
      )}
    </button>
  )
}

export function LeadOverview({ stats, loading, businessType }: LeadOverviewProps) {
  const lbl = businessType ? (LABELS[businessType] ?? DEFAULT_LABELS) : DEFAULT_LABELS
  const s   = stats ?? { total_leads: 0, new_leads: 0, won_leads: 0, lost_leads: 0, todays_followups: 0 }

  return (
    <div className="px-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Lead Overview</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <Tile label={lbl.total}   value={s.total_leads}      accent="emerald" href="/leads"             loading={loading} />
        <Tile label={lbl.open}    value={s.new_leads}        accent="blue"    href="/leads?status=new"  loading={loading} />
        <Tile label={lbl.won}     value={s.won_leads}        accent="violet"  href="/leads?status=won"  loading={loading} />
        <Tile label={lbl.followup} value={s.todays_followups} accent="amber"   href="/followups"         loading={loading} />
      </div>
    </div>
  )
}

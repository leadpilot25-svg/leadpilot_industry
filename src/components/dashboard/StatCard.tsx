import { useNavigate } from 'react-router-dom'

interface StatCardProps {
  label:   string
  value:   number | string
  icon:    React.ReactNode
  accent:  'emerald' | 'blue' | 'amber' | 'rose'
  loading: boolean
  href?:   string
}

const accentConfig = {
  emerald: { iconBg: 'bg-emerald-100',  iconText: 'text-emerald-600', valueText: 'text-emerald-600', dot: 'bg-emerald-500' },
  blue:    { iconBg: 'bg-blue-100',     iconText: 'text-blue-600',    valueText: 'text-blue-600',    dot: 'bg-blue-500'    },
  amber:   { iconBg: 'bg-amber-100',    iconText: 'text-amber-600',   valueText: 'text-amber-600',   dot: 'bg-amber-500'   },
  rose:    { iconBg: 'bg-rose-100',     iconText: 'text-rose-600',    valueText: 'text-rose-600',    dot: 'bg-rose-500'    },
}

export function StatCard({ label, value, icon, accent, loading, href }: StatCardProps) {
  const navigate = useNavigate()
  const cfg = accentConfig[accent]

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.iconText}`}>
          {icon}
        </div>
        {href && (
          <svg width="14" height="14" className="text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <p className={`mt-1 text-3xl font-bold ${cfg.valueText}`}>{value}</p>
        )}
      </div>
    </>
  )

  const base = 'rounded-2xl bg-white p-5 border border-gray-100 shadow-sm'

  if (href) {
    return (
      <button
        onClick={() => navigate(href)}
        className={`${base} w-full text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus:outline-none`}
      >
        {inner}
      </button>
    )
  }

  return <div className={base}>{inner}</div>
}

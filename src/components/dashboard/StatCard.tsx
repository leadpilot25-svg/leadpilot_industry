import React from 'react'
import { useNavigate } from 'react-router-dom'

interface StatCardProps {
  label:   string
  value:   number | string
  icon:    React.ReactNode
  accent:  'emerald' | 'blue' | 'amber' | 'rose' | 'violet' | 'sky'
  loading: boolean
  href?:   string
}

const accentConfig = {
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', valueText: 'text-emerald-600' },
  blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    valueText: 'text-blue-600'    },
  amber:   { iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   valueText: 'text-amber-600'   },
  rose:    { iconBg: 'bg-rose-100',    iconText: 'text-rose-600',    valueText: 'text-rose-600'    },
  violet:  { iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  valueText: 'text-violet-600'  },
  sky:     { iconBg: 'bg-sky-100',     iconText: 'text-sky-600',     valueText: 'text-sky-600'     },
}

export function StatCard({ label, value, icon, accent, loading, href }: StatCardProps) {
  const navigate = useNavigate()
  const cfg = accentConfig[accent as keyof typeof accentConfig] ?? accentConfig.emerald

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconText}`}>
          {icon}
        </div>
        {href && (
          <svg width="12" height="12" className="text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-14 animate-pulse rounded-md bg-gray-100" />
        ) : (
          <p className={`mt-0.5 text-xl font-bold ${cfg.valueText}`}>{value}</p>
        )}
      </div>
    </>
  )

  const base = 'rounded-xl bg-white p-4 border border-gray-100 shadow-sm'

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
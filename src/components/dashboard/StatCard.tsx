import { useNavigate } from 'react-router-dom'

interface StatCardProps {
  label:   string
  value:   number | string
  icon:    React.ReactNode
  accent:  'indigo' | 'emerald' | 'amber' | 'rose'
  loading: boolean
  href?:   string
}

const gradients: Record<StatCardProps['accent'], string> = {
  indigo:  'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.07))',
  emerald: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
  amber:   'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
  rose:    'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(225,29,72,0.08))',
}

const borders: Record<StatCardProps['accent'], string> = {
  indigo:  'rgba(16,185,129,0.22)',
  emerald: 'rgba(16,185,129,0.25)',
  amber:   'rgba(245,158,11,0.25)',
  rose:    'rgba(244,63,94,0.25)',
}

const iconGradients: Record<StatCardProps['accent'], string> = {
  indigo:  'linear-gradient(135deg, #10B981, #059669)',
  emerald: 'linear-gradient(135deg, #10B981, #059669)',
  amber:   'linear-gradient(135deg, #F59E0B, #D97706)',
  rose:    'linear-gradient(135deg, #F43F5E, #E11D48)',
}

const valueColors: Record<StatCardProps['accent'], string> = {
  indigo:  '#34D399',
  emerald: '#34D399',
  amber:   '#FCD34D',
  rose:    '#FB7185',
}

export function StatCard({ label, value, icon, accent, loading, href }: StatCardProps) {
  const navigate = useNavigate()

  const inner = (
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        {loading ? (
          <div className="mt-2.5 h-8 w-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ) : (
          <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: valueColors[accent] }}>
            {value}
          </p>
        )}
      </div>
      <div
        className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
        style={{ background: iconGradients[accent] }}
      >
        {icon}
      </div>
    </div>
  )

  const baseStyle = {
    background: gradients[accent],
    border: `1px solid ${borders[accent]}`,
    backdropFilter: 'blur(8px)',
  }

  if (href) {
    return (
      <button
        onClick={() => navigate(href)}
        className="relative w-full rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        style={{
          ...baseStyle,
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}
      >
        {inner}
        <svg
          width="12" height="12"
          className="absolute bottom-3.5 right-3.5 text-slate-600"
          fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    )
  }

  return (
    <div
      className="relative rounded-2xl p-5"
      style={{ ...baseStyle, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}
    >
      {inner}
    </div>
  )
}
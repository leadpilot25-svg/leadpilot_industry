import { useNavigate } from 'react-router-dom'

interface DashboardGreetingProps {
  name:         string | null
  date:         string
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning',   emoji: '🌤️' }
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' }
  return           { text: 'Good evening',   emoji: '🌙' }
}

export function DashboardGreeting({ name, date }: DashboardGreetingProps) {
  const navigate = useNavigate()
  const { text, emoji } = getGreeting()

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {text} {emoji}
        </h1>
        <p className="mt-0.5 text-sm font-medium text-gray-500">
          Welcome back{name ? `, ${name.split(' ')[0]}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{date}</p>
      </div>

      <button
        onClick={() => navigate('/leads/new')}
        className="flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md active:scale-95 sm:self-auto"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Lead
      </button>
    </div>
  )
}

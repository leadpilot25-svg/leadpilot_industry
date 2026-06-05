import { NavLink } from 'react-router-dom'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useAuth } from '../../hooks/useAuth'

const WORKSPACE_ROUTES: Partial<Record<string, string>> = {
  travel: '/industry/travel', taxi: '/industry/taxi',
  insurance: '/industry/insurance', education: '/industry/education',
  marketing: '/industry/marketing', tarot: '/industry/tarot', coach: '/industry/coaching',
}

const mainNav = [
  {
    to: '/dashboard', label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/leads', label: 'Leads',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    to: '/pipeline', label: 'Pipeline',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    to: '/followups', label: 'Follow-ups',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    ),
  },
  {
    to: '/settings', label: 'More',
    icon: (active: boolean) => (
      <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)
  const workspaceRoute = settings?.business_type ? (WORKSPACE_ROUTES[settings.business_type] ?? null) : null

  // Replace "More" with workspace if tenant has one
  const nav = workspaceRoute
    ? mainNav.map(item =>
        item.to === '/settings'
          ? { ...item, to: workspaceRoute, label: 'My Business' }
          : item
      )
    : mainNav

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden"
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #E5E7EB',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => [
              'flex flex-1 flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-150',
              isActive ? 'text-emerald-600' : 'text-gray-400',
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'scale-110 transition-transform duration-150' : ''}>
                  {item.icon(isActive)}
                </span>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

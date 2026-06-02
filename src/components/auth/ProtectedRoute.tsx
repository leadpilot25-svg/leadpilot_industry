import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'

interface ProtectedRouteProps {
  allowedRoles?:     Role[]
  requiresOnboarding?: boolean
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#0D1117' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

export function ProtectedRoute({
  allowedRoles,
  requiresOnboarding = true,
}: ProtectedRouteProps) {
  const { session, profile, loading, onboardingComplete } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  // Not signed in → login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) return <LoadingScreen />

  // super_admin always skips onboarding gate and goes to /admin
  if (profile.role === 'super_admin') {
    // If the route requires onboarding (i.e. it's a regular app route),
    // and the user is super_admin, redirect them to /admin
    if (requiresOnboarding && !location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin" replace />
    }
    // Role check still applies for admin-section routes
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to="/admin" replace />
    }
    return <Outlet />
  }

  // Onboarding gate for non-super_admin
  if (requiresOnboarding && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  // Already onboarded — don't show onboarding again
  if (!requiresOnboarding && onboardingComplete) {
    return <Navigate to="/dashboard" replace />
  }

  // Role check — wrong role → dashboard
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types/auth'

interface ProtectedRouteProps {
  /** Restrict to specific roles. Omit to allow any authenticated user. */
  allowedRoles?: Role[]
  /**
   * When true (default), users who haven't completed onboarding are
   * redirected to /onboarding.
   * Set to false for the /onboarding route itself so it doesn't loop.
   */
  requiresOnboarding?: boolean
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Loading…</p>
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

  // Wait for Supabase session + profile fetch
  if (loading) return <LoadingScreen />

  // Not signed in → login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Signed in but profile still loading edge case
  if (!profile) return <LoadingScreen />

  // Onboarding gate — redirect to /onboarding if not yet complete
  if (requiresOnboarding && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  // Already onboarded but landed on /onboarding → go to dashboard
  if (!requiresOnboarding && onboardingComplete) {
    return <Navigate to="/dashboard" replace />
  }

  // Role check — wrong role → dashboard
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

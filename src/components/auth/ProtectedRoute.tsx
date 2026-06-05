import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { Role } from '../../types/auth'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  )
}

interface ProtectedRouteProps {
  allowedRoles?:       Role[]
  requiresOnboarding?: boolean
}

export function ProtectedRoute({
  allowedRoles,
  requiresOnboarding = true,
}: ProtectedRouteProps) {
  const { session, profile, loading, onboardingComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) {
    return <LoadingScreen />
  }

  if (profile.role === 'super_admin') {
    if (allowedRoles && allowedRoles.includes('super_admin')) {
      return <Outlet />
    }
    if (!location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin" replace />
    }
    return <Outlet />
  }

  if (requiresOnboarding && !onboardingComplete) {
    if (!profile) return <LoadingScreen />
    return <Navigate to="/onboarding" replace />
  }

  if (!requiresOnboarding && onboardingComplete) {
    return <Navigate to="/dashboard" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

interface IndustryRouteProps { industry: string }

export function IndustryRoute({ industry }: IndustryRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const tenantId = profile?.tenant_id ?? null
  const { settings, loading: settingsLoading } = useWorkspaceSettings(tenantId)

  if (loading || settingsLoading) return <LoadingScreen />
  if (!session || !profile) return <Navigate to="/login" state={{ from: location }} replace />
  if (profile.role === 'super_admin') return <Navigate to="/admin" replace />
  if (!settings) return <Navigate to="/dashboard" replace />
  if (settings.business_type !== industry) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
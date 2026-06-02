import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { Role } from '../../types/auth'

// ─── Shared loading screen ────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  )
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

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

  if (loading) return <LoadingScreen />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) return <LoadingScreen />

  // super_admin skips all onboarding gates — always goes to /admin
  if (profile.role === 'super_admin') {
    if (requiresOnboarding && !location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin" replace />
    }
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to="/admin" replace />
    }
    return <Outlet />
  }

  // Onboarding gate for non-super_admin
  if (requiresOnboarding && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  // Already onboarded — skip onboarding page
  if (!requiresOnboarding && onboardingComplete) {
    return <Navigate to="/dashboard" replace />
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

// ─── IndustryRoute ────────────────────────────────────────────────────────────
// Route-level guard for all /industry/* pages.
// Redirects before the workspace page mounts if the tenant's business_type
// does not match the required industry — no flash, no partial render.

interface IndustryRouteProps {
  industry: string
}

export function IndustryRoute({ industry }: IndustryRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const tenantId = profile?.tenant_id ?? null
  const { settings, loading: settingsLoading } = useWorkspaceSettings(tenantId)

  if (loading || settingsLoading) return <LoadingScreen />

  if (!session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // super_admin never enters tenant workspaces
  if (profile.role === 'super_admin') {
    return <Navigate to="/admin" replace />
  }

  // Not yet onboarded
  if (!settings) {
    return <Navigate to="/dashboard" replace />
  }

  // Wrong industry — silent redirect
  if (settings.business_type !== industry) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
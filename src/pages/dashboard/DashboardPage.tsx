import { useAuth } from '../../hooks/useAuth'
import { useDashboard } from '../../hooks/useDashboard'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { WidgetGrid } from '../../components/dashboard/WidgetGrid'
import { RecentLeads } from '../../components/dashboard/RecentLeads'
import { RecentActivity } from '../../components/dashboard/RecentActivity'
import { AppLayout } from '../../components/layout/AppLayout'

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-6 mt-6 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-sm text-rose-300">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="ml-4 shrink-0 rounded-lg border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
      >
        Retry
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null

  const { data, loading, error, refetch } = useDashboard(tenantId)
  const { settings } = useWorkspaceSettings(tenantId)
  const businessType = settings?.business_type ?? null

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <AppLayout>
      <div>

        {/* Page heading */}
        <div className="px-6 pt-7 pb-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">{today}</p>
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} onRetry={refetch} />}

        {/* Industry-aware stat cards */}
        <WidgetGrid
          stats={data?.stats}
          loading={loading}
          businessType={businessType}
        />

        {/* Lower panels */}
        <div className="grid grid-cols-1 gap-5 px-6 pb-8 pt-5 lg:grid-cols-3">
          {/* Recent leads — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <RecentLeads
              leads={data?.recentLeads ?? []}
              loading={loading}
            />
          </div>

          {/* Recent activity — takes 1/3 width on large screens */}
          <div className="lg:col-span-1">
            <RecentActivity
              activities={data?.recentActivity ?? []}
              loading={loading}
            />
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
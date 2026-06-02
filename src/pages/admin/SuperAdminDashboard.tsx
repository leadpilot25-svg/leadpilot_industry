import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/layout/AdminLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  total_tenants:  number
  active_tenants: number
  total_users:    number
  total_leads:    number
}

interface RecentTenant {
  id:           string
  name:         string
  plan:         string
  is_active:    boolean
  created_at:   string
  user_count:   number
  lead_count:   number
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function AdminStatCard({
  label, value, sub, accent, loading,
}: {
  label:   string
  value:   string | number
  sub?:    string
  accent:  'teal' | 'blue' | 'amber' | 'rose'
  loading: boolean
}) {
  const colors = {
    teal:  { bg: '#F0FDF4', border: '#D1FAE5', text: '#059669', top: '#10B981' },
    blue:  { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', top: '#3B82F6' },
    amber: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', top: '#F59E0B' },
    rose:  { bg: '#FFF1F2', border: '#FECDD3', text: '#E11D48', top: '#F43F5E' },
  }
  const c = colors[accent]

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background:  c.bg,
        border:      `1px solid ${c.border}`,
        borderTop:   `3px solid ${c.top}`,
        boxShadow:   '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }} />
      ) : (
        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      )}
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ─── Plan badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    trial:      'bg-slate-700/50 text-slate-400',
    starter:    'bg-blue-500/15 text-blue-400',
    pro:        'bg-violet-500/15 text-violet-400',
    enterprise: 'bg-amber-500/15 text-amber-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[plan] ?? styles.trial}`}>
      {plan}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState<PlatformStats | null>(null)
  const [tenants, setTenants] = useState<RecentTenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Fetch all tenants
      const { data: tenantRows } = await supabase
        .from('tenants')
        .select('id, name, plan, is_active, created_at')
        .order('created_at', { ascending: false })

      if (cancelled || !tenantRows) return

      // Fetch user counts per tenant
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('tenant_id')

      // Fetch lead counts per tenant
      const { data: leadRows } = await supabase
        .from('leads')
        .select('tenant_id')
        .is('deleted_at', null)

      if (cancelled) return

      const userByTenant: Record<string, number> = {}
      const leadByTenant: Record<string, number> = {}

      profileRows?.forEach(p => {
        if (p.tenant_id) userByTenant[p.tenant_id] = (userByTenant[p.tenant_id] ?? 0) + 1
      })
      leadRows?.forEach(l => {
        if (l.tenant_id) leadByTenant[l.tenant_id] = (leadByTenant[l.tenant_id] ?? 0) + 1
      })

      const enriched: RecentTenant[] = tenantRows.map(t => ({
        ...t,
        user_count: userByTenant[t.id] ?? 0,
        lead_count: leadByTenant[t.id] ?? 0,
      }))

      setTenants(enriched)
      setStats({
        total_tenants:  tenantRows.length,
        active_tenants: tenantRows.filter(t => t.is_active).length,
        total_users:    Object.values(userByTenant).reduce((a, b) => a + b, 0),
        total_leads:    Object.values(leadByTenant).reduce((a, b) => a + b, 0),
      })
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <AdminLayout>
      <div className="px-6 py-7 space-y-8 max-w-6xl">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Overview</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/tenants/new')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Tenant
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminStatCard label="Total Tenants"  value={stats?.total_tenants  ?? 0} accent="teal"  loading={loading} />
          <AdminStatCard label="Active Tenants" value={stats?.active_tenants ?? 0} accent="blue"  loading={loading} sub={stats ? `${stats.total_tenants - stats.active_tenants} suspended` : undefined} />
          <AdminStatCard label="Total Users"    value={stats?.total_users    ?? 0} accent="amber" loading={loading} />
          <AdminStatCard label="Total Leads"    value={stats?.total_leads    ?? 0} accent="rose"  loading={loading} />
        </div>

        {/* Tenant table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100"
            style={{}}
          >
            <h2 className="text-sm font-semibold text-gray-900">All Tenants</h2>
            <button
              onClick={() => navigate('/admin/tenants')}
              className="text-xs font-medium transition hover:text-white"
              style={{ color: '#10B981' }}
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500">No tenants yet.</p>
              <button
                onClick={() => navigate('/admin/tenants/new')}
                className="mt-3 text-sm font-medium"
                style={{ color: '#10B981' }}
              >
                Create your first tenant →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Company', 'Plan', 'Users', 'Leads', 'Created', 'Status', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.slice(0, 10).map(tenant => (
                    <tr
                      key={tenant.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50 border-b border-gray-50"
                      onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                      
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            className="bg-emerald-100 text-emerald-700"
                          >
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><PlanBadge plan={tenant.plan} /></td>
                      <td className="px-5 py-4 text-slate-400">{tenant.user_count}</td>
                      <td className="px-5 py-4 text-slate-400">{tenant.lead_count}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(tenant.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        {tenant.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}

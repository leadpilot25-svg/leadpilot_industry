import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AdminLayout } from '../../components/layout/AdminLayout'

interface Tenant {
  id:           string
  name:         string
  slug:         string
  plan:         string
  business_type: string
  is_active:    boolean
  created_at:   string
  user_count:   number
  lead_count:   number
  admin_email:  string
}

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

export function TenantsPage() {
  const navigate = useNavigate()
  const [tenants,  setTenants]  = useState<Tenant[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'all' | 'active' | 'suspended'>('all')
  const [acting,   setActing]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    const { data: tenantRows } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (!tenantRows) { setLoading(false); return }

    const { data: profileRows } = await supabase
      .from('profiles')
      .select('tenant_id, role, user_id')

    const { data: leadRows } = await supabase
      .from('leads')
      .select('tenant_id')
      .is('deleted_at', null)

    const { data: userRows } = await supabase
      .from('auth').select('*')
      .limit(0)  // just to avoid TS error — not used

    // Get emails from profiles + auth.users join via user_id
    const { data: authUsers } = await supabase
      .rpc('get_admin_users_for_tenants')
      .limit(0) // stub — may not exist

    const userByTenant: Record<string, number> = {}
    const adminByTenant: Record<string, string> = {}
    const leadByTenant: Record<string, number> = {}

    profileRows?.forEach(p => {
      if (p.tenant_id) {
        userByTenant[p.tenant_id] = (userByTenant[p.tenant_id] ?? 0) + 1
      }
    })
    leadRows?.forEach(l => {
      if (l.tenant_id) leadByTenant[l.tenant_id] = (leadByTenant[l.tenant_id] ?? 0) + 1
    })

    const enriched: Tenant[] = tenantRows.map(t => ({
      ...t,
      user_count:  userByTenant[t.id]  ?? 0,
      lead_count:  leadByTenant[t.id]  ?? 0,
      admin_email: adminByTenant[t.id] ?? '—',
    }))

    setTenants(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (tenant: Tenant) => {
    setActing(tenant.id)
    await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id)
    await load()
    setActing(null)
  }

  const filtered = tenants
    .filter(t => filter === 'all' || (filter === 'active' ? t.is_active : !t.is_active))
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <AdminLayout>
      <div className="px-6 py-7 space-y-6 max-w-6xl">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
            <p className="mt-0.5 text-sm text-gray-500">{tenants.length} total workspaces</p>
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

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg width="15" height="15" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search tenants…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-1 rounded-xl p-1" className="bg-gray-100 rounded-xl p-1">
            {(['all', 'active', 'suspended'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition"
                style={filter === f ? { background: '#fff', color: '#059669', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#6B7280' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-t-transparent" className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-slate-500">No tenants found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Company', 'Business Type', 'Plan', 'Users', 'Leads', 'Created', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tenant => (
                    <tr
                      key={tenant.id}
                      className="border-b border-gray-50"
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/admin/tenants/${tenant.id}`)}>
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{ background: "#D1FAE5", color: "#059669" }}
                          >
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 hover:text-emerald-600 transition">{tenant.name}</p>
                            <p className="text-xs text-gray-500">{tenant.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs capitalize text-slate-400">
                        {tenant.business_type?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-4"><PlanBadge plan={tenant.plan} /></td>
                      <td className="px-5 py-4 text-slate-400">{tenant.user_count}</td>
                      <td className="px-5 py-4 text-slate-400">{tenant.lead_count}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(tenant.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        {tenant.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={acting === tenant.id}
                            onClick={() => toggleActive(tenant)}
                            className={[
                              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                              tenant.is_active
                                ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
                              acting === tenant.id ? 'opacity-50 cursor-not-allowed' : '',
                            ].join(' ')}
                          >
                            {acting === tenant.id ? '…' : tenant.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
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

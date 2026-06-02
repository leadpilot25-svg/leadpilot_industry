import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, ActivityWithLead, DashboardStats } from '../types/lead'

interface DashboardData {
  stats:          DashboardStats
  recentLeads:    Lead[]
  recentActivity: ActivityWithLead[]
}

interface UseDashboardResult {
  data:    DashboardData | null
  loading: boolean
  error:   string | null
  refetch: () => void
}

const EMPTY_STATS: DashboardStats = {
  total_leads:      0,
  new_leads:        0,
  won_leads:        0,
  lost_leads:       0,
  todays_followups: 0,
}

export function useDashboard(tenantId: string | null): UseDashboardResult {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // Run all three independent queries in parallel.
        // Stats RPC, recent leads, and recent activity have no dependency
        // on each other — awaiting them sequentially wastes ~600ms per load.
        const [statsResult, leadsResult, activityResult] = await Promise.all([

          // 1. Stats via RPC
          supabase.rpc('get_dashboard_stats', { p_tenant_id: tenantId }),

          // 2. Recent leads — newest first, limit 10
          supabase
            .from('leads')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(10),

          // 3. Recent activity with lead name joined via FK — eliminates
          // the separate name-lookup round-trip (Step 4 from previous version)
          supabase
            .from('lead_activities')
            .select('*, leads(name)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        // ── Stats ────────────────────────────────────────────────────────────
        let stats: DashboardStats = EMPTY_STATS

        if (statsResult.error) {
          // RPC missing — fall back to manual counts (also parallel)
          const today = new Date().toISOString().slice(0, 10)
          const [totalRes, newRes, wonRes, followupRes] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).is('deleted_at', null),
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'new').is('deleted_at', null),
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'won').is('deleted_at', null),
            supabase.from('followups').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('completed', false).gte('scheduled_at', `${today}T00:00:00`).lte('scheduled_at', `${today}T23:59:59`),
          ])
          stats = {
            total_leads:      totalRes.count   ?? 0,
            new_leads:        newRes.count      ?? 0,
            won_leads:        wonRes.count      ?? 0,
            lost_leads:       0,
            todays_followups: followupRes.count ?? 0,
          }
        } else {
          stats = (statsResult.data as DashboardStats) ?? EMPTY_STATS
        }

        // ── Leads ────────────────────────────────────────────────────────────
        if (leadsResult.error) {
          throw new Error(`Failed to load leads: ${leadsResult.error.message}`)
        }

        // ── Activity — flatten the joined leads(name) into lead_name ────────
        if (activityResult.error) {
          throw new Error(`Failed to load activity: ${activityResult.error.message}`)
        }

        const recentActivity: ActivityWithLead[] = (activityResult.data ?? []).map(
          // PostgREST returns the joined row as `leads: { name: string } | null`
          (row: Record<string, unknown>) => ({
            id:            row.id            as string,
            tenant_id:     row.tenant_id     as string,
            lead_id:       row.lead_id       as string,
            agent_id:      row.agent_id      as string,
            activity_type: row.activity_type as ActivityWithLead['activity_type'],
            notes:         row.notes         as string | null,
            metadata:      row.metadata      as Record<string, unknown> | null,
            created_at:    row.created_at    as string,
            lead_name:     (row.leads as { name: string } | null)?.name ?? null,
          })
        )

        if (!cancelled) {
          setData({
            stats,
            recentLeads:    (leadsResult.data ?? []) as Lead[],
            recentActivity,
          })
        }

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tenantId, tick])

  return { data, loading, error, refetch }
}
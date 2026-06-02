import { useEffect, useState, useCallback } from 'react'
import { fetchLeads, type LeadFilters } from '../lib/services/leads.service'
import type { Lead } from '../types/lead'

interface UseLeadsResult {
  leads:   Lead[]
  loading: boolean
  error:   string | null
  refetch: () => void
}

export function useLeads(
  tenantId: string | null,
  filters:  LeadFilters = {},
): UseLeadsResult {
  const [leads,   setLeads]   = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  // Stable filter key so the effect only re-runs when filters actually change
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchLeads(tenantId, filters)
      .then(data => { if (!cancelled) setLeads(data) })
      .catch(err  => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leads') })
      .finally(()  => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filterKey, tick])

  return { leads, loading, error, refetch }
}

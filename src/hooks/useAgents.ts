import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/auth'

interface UseAgentsResult {
  agents:  Profile[]
  loading: boolean
  error:   string | null
  refetch: () => void
}

export function useAgents(tenantId: string | null): UseAgentsResult {
  const [agents,  setAgents]  = useState<Profile[]>([])
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
    setLoading(true)
    setError(null)

    supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('role', ['client_admin', 'agent'])
      .order('full_name', { ascending: true })
      .then(({ data, error: err }) => {
 

  if (cancelled) return

  if (err) {
    setError(err.message)
    return
  }

  setAgents((data ?? []) as Profile[])
})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [tenantId, tick])

  return { agents, loading, error, refetch }
}
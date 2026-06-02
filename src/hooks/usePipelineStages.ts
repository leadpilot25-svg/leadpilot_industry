import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { PipelineStage } from '../types/pipeline'

interface UsePipelineStagesResult {
  stages:  PipelineStage[]
  loading: boolean
  error:   string | null
  refetch: () => void
}

export function usePipelineStages(tenantId: string | null): UsePipelineStagesResult {
  const [stages,  setStages]  = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        setStages((data ?? []) as PipelineStage[])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tenantId, tick])

  return { stages, loading, error, refetch }
}

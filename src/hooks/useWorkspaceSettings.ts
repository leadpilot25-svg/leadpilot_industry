import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkspaceSettings } from '../types/tenant'

interface UseWorkspaceSettingsResult {
  settings: WorkspaceSettings | null
  loading:  boolean
}

// Module-level cache — survives navigation, prevents null flash between routes.
// Key: tenantId. Value: fetched settings. Never evicted during a session.
const CACHE = new Map<string, WorkspaceSettings>()

export function useWorkspaceSettings(tenantId: string | null): UseWorkspaceSettingsResult {
  // Initialise directly from cache if available — no loading flash on re-navigation
  const [settings, setSettings] = useState<WorkspaceSettings | null>(
    tenantId ? (CACHE.get(tenantId) ?? null) : null
  )
  const [loading, setLoading] = useState(
    tenantId ? !CACHE.has(tenantId) : false
  )

  useEffect(() => {
    if (!tenantId) {
      setSettings(null)
      setLoading(false)
      return
    }

    // Already cached — serve immediately, no spinner, no flash
    if (CACHE.has(tenantId)) {
      setSettings(CACHE.get(tenantId) ?? null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('workspace_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          const ws = data as WorkspaceSettings | null
          if (ws) CACHE.set(tenantId, ws)
          setSettings(ws)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [tenantId])

  return { settings, loading }
}
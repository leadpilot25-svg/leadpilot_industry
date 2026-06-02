import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkspaceSettings } from '../types/tenant'

interface UseWorkspaceSettingsResult {
  settings: WorkspaceSettings | null
  loading:  boolean
}

export function useWorkspaceSettings(tenantId: string | null): UseWorkspaceSettingsResult {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!tenantId) {
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
          setSettings(data as WorkspaceSettings | null)
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
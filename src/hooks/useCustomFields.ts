import { useEffect, useState, useCallback } from 'react'
import { fetchCustomFields } from '../lib/services/customFields.service'
import type { CustomField, CustomFieldEntity } from '../types/pipeline'

interface UseCustomFieldsResult {
  fields:  CustomField[]
  loading: boolean
  error:   string | null
  refetch: () => void
}

export function useCustomFields(
  tenantId: string | null,
  entity:   CustomFieldEntity = 'lead',
): UseCustomFieldsResult {
  const [fields,  setFields]  = useState<CustomField[]>([])
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

    fetchCustomFields(tenantId, entity)
      .then(data => { if (!cancelled) setFields(data) })
      .catch(err  => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load custom fields') })
      .finally(()  => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [tenantId, entity, tick])

  return { fields, loading, error, refetch }
}
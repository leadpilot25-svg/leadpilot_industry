import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { PipelineStage } from '../../types/pipeline'

interface PipelineSummaryProps {
  tenantId: string | null
}

interface StageCount {
  stage: PipelineStage
  count: number
}

export function PipelineSummary({ tenantId }: PipelineSummaryProps) {
  const navigate = useNavigate()
  const [stageCounts, setStageCounts] = useState<StageCount[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }
    let cancelled = false

    const load = async () => {
      const [{ data: stages }, { data: leads }] = await Promise.all([
        supabase.from('pipeline_stages').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order'),
        supabase.from('leads').select('pipeline_stage_id').eq('tenant_id', tenantId).is('deleted_at', null),
      ])
      if (cancelled || !stages) return

      const countMap: Record<string, number> = {}
      leads?.forEach(l => {
        if (l.pipeline_stage_id) countMap[l.pipeline_stage_id] = (countMap[l.pipeline_stage_id] ?? 0) + 1
      })

      setStageCounts(stages.map(s => ({ stage: s as PipelineStage, count: countMap[s.id] ?? 0 })))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [tenantId])

  return (
    <div className="px-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Pipeline</h2>
        <button
          onClick={() => navigate('/pipeline')}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
        >
          View board →
        </button>
      </div>

      <div
        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition"
        onClick={() => navigate('/pipeline')}
      >
        {loading ? (
          <div className="flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-8 flex-1 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : stageCounts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No pipeline stages yet</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {stageCounts.map(({ stage, count }) => (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 flex-1 min-w-[60px]"
                style={{ backgroundColor: stage.color + '18', borderColor: stage.color + '30', border: '1px solid' }}
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: stage.color }}
                >
                  {count}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 text-center leading-tight">
                  {stage.name.length > 8 ? stage.name.slice(0, 8) + '…' : stage.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

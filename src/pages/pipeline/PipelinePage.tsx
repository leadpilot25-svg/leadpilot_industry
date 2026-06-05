import React, { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLeads } from '../../hooks/useLeads'
import { usePipelineStages } from '../../hooks/usePipelineStages'
import { AppLayout } from '../../components/layout/AppLayout'
import { updateLead } from '../../lib/services/leads.service'
import type { Lead } from '../../types/lead'
import type { PipelineStage } from '../../types/pipeline'

// ─── Helpers ──────────────────────────────────────────────────────────────

function ageDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function AgeBadge({ days }: { days: number }) {
  if (days <= 2)  return <span className="text-xs text-emerald-400">{days}d</span>
  if (days <= 6)  return <span className="text-xs text-amber-400">{days}d</span>
  return <span className="text-xs font-semibold text-rose-400">{days}d old</span>
}

// ─── Analytics strip ──────────────────────────────────────────────────────

function AnalyticsStrip({ leads }: { leads: Lead[] }) {
  const active     = leads.filter(l => l.status !== 'won' && l.status !== 'lost' && l.status !== 'unqualified')
  const won        = leads.filter(l => l.status === 'won')
  const lost       = leads.filter(l => l.status === 'lost')
  const conversion = leads.length > 0 ? Math.round((won.length / leads.length) * 100) : 0

  const cards = [
    { label: 'Total Leads',   value: leads.length,   color: 'text-emerald-600',  border: 'border-emerald-500/20',  bg: 'bg-emerald-500/10' },
    { label: 'Active',        value: active.length,  color: 'text-sky-400',     border: 'border-sky-500/20',     bg: 'bg-sky-500/10'    },
    { label: 'Won',           value: won.length,     color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10'},
    { label: 'Lost',          value: lost.length,    color: 'text-rose-400',    border: 'border-rose-500/20',    bg: 'bg-rose-500/10'   },
    { label: 'Conversion',    value: `${conversion}%`, color: 'text-amber-400', border: 'border-amber-500/20',   bg: 'bg-amber-500/10'  },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map(c => (
        <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{c.label}</p>
          <p className={`mt-0.5 text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Lead card ────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead:       Lead
  onDragStart:(e: React.DragEvent, leadId: string) => void
  onClick:    () => void
}

function LeadCard({ lead, onDragStart, onClick }: LeadCardProps) {
  const days = ageDays(lead.updated_at)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 shadow-sm select-none transition-all hover:border-gray-300 hover:shadow-md active:opacity-70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">{lead.name}</p>
        <AgeBadge days={days} />
      </div>
      {(lead.phone ?? lead.whatsapp) && (
        <p className="mt-1 text-xs text-gray-500">{lead.phone ?? lead.whatsapp}</p>
      )}
      {lead.source && (
        <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
          {lead.source}
        </span>
      )}
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────

interface ColumnProps {
  stage:    PipelineStage
  leads:    Lead[]
  onDrop:   (stageId: string) => void | Promise<void>
  onDragStart: (e: React.DragEvent, leadId: string) => void
  onCardClick: (leadId: string) => void | unknown
}

function Column({ stage, leads, onDrop, onDragStart, onCardClick }: ColumnProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => setIsOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    onDrop(stage.id)
  }

  return (
    <div className="flex flex-col min-w-[240px] w-60 shrink-0">
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-semibold text-gray-800 truncate">{stage.name}</span>
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-medium">
          {leads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex-1 rounded-2xl border-2 p-2 space-y-2 min-h-[200px] transition-colors',
          isOver
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-dashed border-gray-200 bg-gray-50',
        ].join(' ')}
      >
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onClick={() => onCardClick(lead.id)}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-gray-700">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Unassigned column ────────────────────────────────────────────────────

function UnassignedColumn({
  leads, onDrop, onDragStart, onCardClick,
}: {
  leads:       Lead[]
  onDrop:      (stageId: string) => void
  onDragStart: (e: React.DragEvent, leadId: string) => void
  onCardClick: (leadId: string) => void
}) {
  const [isOver, setIsOver] = useState(false)

  return (
    <div className="flex flex-col min-w-[240px] w-60 shrink-0">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-600" />
        <span className="text-sm font-semibold text-gray-400">No Stage</span>
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 font-medium">
          {leads.length}
        </span>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setIsOver(true) }}
        onDragLeave={() => setIsOver(false)}
        onDrop={e => { e.preventDefault(); setIsOver(false); onDrop('') }}
        className={[
          'flex-1 rounded-2xl border-2 p-2 space-y-2 min-h-[200px] transition-colors',
          isOver ? 'border-emerald-300 bg-emerald-50/50' : 'border-dashed border-gray-200 bg-gray-50',
        ].join(' ')}
      >
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onClick={() => onCardClick(lead.id)} />
        ))}
        {leads.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-gray-700">No unassigned leads</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export function PipelinePage() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()
  const highlightStageId = searchParams.get('stage')
  const tenantId     = profile?.tenant_id ?? null

  const { leads, loading: leadsLoading, refetch } = useLeads(tenantId)
  const { stages, loading: stagesLoading }         = usePipelineStages(tenantId)

  const [search,   setSearch]   = useState('')
  const [moving,   setMoving]   = useState(false)
  const draggingId = useRef<string | null>(null)

  const filteredLeads = search.trim()
    ? leads.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.phone ?? '').includes(search) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : leads

  // Group leads by stage
  const leadsByStage: Record<string, Lead[]> = {}
  stages.forEach(s => { leadsByStage[s.id] = [] })
  const unassigned: Lead[] = []

  filteredLeads.forEach(l => {
    if (l.pipeline_stage_id && leadsByStage[l.pipeline_stage_id]) {
      leadsByStage[l.pipeline_stage_id].push(l)
    } else {
      unassigned.push(l)
    }
  })

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    draggingId.current = leadId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (targetStageId: string) => {
    const leadId = draggingId.current
    draggingId.current = null
    if (!leadId || !tenantId) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    // Same stage — no-op
    if (lead.pipeline_stage_id === targetStageId) return

    setMoving(true)
    try {
      await updateLead({
        id:                lead.id,
        tenant_id:         tenantId,
        pipeline_stage_id: targetStageId || null,
      })
      refetch()
    } finally {
      setMoving(false)
    }
  }

  const loading = leadsLoading || stagesLoading

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pipeline Board</h1>
            <p className="mt-0.5 text-sm text-gray-500">Drag leads between stages to update their position.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <svg width="16" height="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Analytics */}
        {!loading && <AnalyticsStrip leads={leads} />}

        {/* Moving indicator */}
        {moving && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Moving lead…
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {/* Board */}
        {!loading && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: `${(stages.length + 1) * 256}px` }}>

              {stages.map(stage => (
                <div
                  key={stage.id}
                  className={`rounded-2xl transition-all duration-300 ${
                    highlightStageId === stage.id
                      ? 'ring-2 ring-emerald-400 ring-offset-2'
                      : ''
                  }`}
                >
                  <Column
                    stage={stage}
                    leads={leadsByStage[stage.id] ?? []}
                    onDrop={handleDrop}
                    onDragStart={handleDragStart}
                    onCardClick={(id: string) => { navigate(`/leads/${id}`) }}
                  />
                </div>
              ))}

              <UnassignedColumn
                leads={unassigned}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onCardClick={(id: string) => { navigate(`/leads/${id}`) }}
              />

            </div>
          </div>
        )}

        {!loading && stages.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-sm text-gray-500">No pipeline stages found.</p>
            <p className="mt-1 text-xs text-gray-600">Complete onboarding or add stages in your pipeline settings.</p>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
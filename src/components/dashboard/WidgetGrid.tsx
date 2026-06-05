import React from 'react'
import { StatCard } from './StatCard'
import { getWidgetsForIndustry, type AccentColor } from '../../lib/services/widgetConfig'
import type { DashboardStats } from '../../types/lead'
import type { BusinessType } from '../../types/tenant'

// ─── Icons keyed by icon identifier ──────────────────────────────────────────

function LeadsIcon() {
  return (
    <svg width="20" height="20" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function NewLeadsIcon() {
  return (
    <svg width="20" height="20" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

function WonIcon() {
  return (
    <svg width="20" height="20" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  )
}

function FollowupsIcon() {
  return (
    <svg width="20" height="20" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15h.008v.008H12V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9.75 15h.008v.008H9.75V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function LostIcon() {
  return (
    <svg width="20" height="20" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

type IconKey = 'leads' | 'new_leads' | 'won' | 'followups' | 'lost' | 'contacted' | 'qualified'

const ICON_MAP: Record<IconKey, React.ReactNode> = {
  leads:     <LeadsIcon />,
  new_leads: <NewLeadsIcon />,
  won:       <WonIcon />,
  followups: <FollowupsIcon />,
  lost:      <LostIcon />,
  contacted: <LeadsIcon />,
  qualified: <WonIcon />,
}

// Validate accent — StatCard only accepts the 4 base accents.
// Map the 3 additional industry accents to the closest base accent.
const ACCENT_MAP: Record<AccentColor, 'emerald' | 'amber' | 'rose' | 'blue'> = {
  indigo:  'emerald',
  amber:   'amber',
  emerald: 'emerald',
  rose:    'rose',
  sky:     'blue',
  violet:  'blue',
  orange:  'amber',
  blue:    'blue',
}

// ─── WidgetGrid ───────────────────────────────────────────────────────────────

interface WidgetGridProps {
  stats:        DashboardStats | undefined
  loading:      boolean
  businessType: BusinessType | null | undefined
}

/**
 * Renders the 4 stat cards for the current industry.
 * Falls back to the core 4 cards (Total / New / Won / Follow-ups) for
 * unknown or null business types — guaranteeing existing tenants see
 * exactly the same dashboard they always have.
 */
export function WidgetGrid({ stats, loading, businessType }: WidgetGridProps) {
  const widgets = getWidgetsForIndustry(businessType)

  return (
    <div className="grid grid-cols-2 gap-4 px-6 pt-4 pb-2 lg:grid-cols-4">
      {widgets.map(widget => (
        <StatCard
          key={widget.key}
          label={widget.label}
          value={stats ? widget.getValue(stats) : 0}
          icon={ICON_MAP[widget.icon]}
          accent={ACCENT_MAP[widget.accent] as 'emerald' | 'amber' | 'rose' | 'blue'}
          loading={loading}
          href={widget.href}
        />
      ))}
    </div>
  )
}
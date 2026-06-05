import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import { useVocab } from '../../lib/services/industryVocab'
import type { BusinessType } from '../../types/tenant'

// ─── Greeting ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning',   emoji: '👋' }
  if (h < 17) return { text: 'Good afternoon', emoji: '☀️' }
  return           { text: 'Good evening',   emoji: '🌙' }
}

// ─── Industry KPI config ──────────────────────────────────────────────────────
// Each card: label, icon, colour pair (bg + text), how to compute value

type CardColor =
  | 'amber'    // warm yellow
  | 'rose'     // red/danger
  | 'green'    // success/emerald
  | 'blue'     // info
  | 'violet'   // purple
  | 'orange'   // orange

const COLOR_MAP: Record<CardColor, { bg: string; text: string; icon: string }> = {
  amber:  { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-500'   },
  rose:   { bg: 'bg-rose-50',    text: 'text-rose-600',    icon: 'text-rose-500'    },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  blue:   { bg: 'bg-blue-50',    text: 'text-blue-600',    icon: 'text-blue-500'    },
  violet: { bg: 'bg-violet-50',  text: 'text-violet-600',  icon: 'text-violet-500'  },
  orange: { bg: 'bg-orange-50',  text: 'text-orange-600',  icon: 'text-orange-500'  },
}

// SVG icons for each card type
const ICONS = {
  clock: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  alert: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  trophy: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  users: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  money: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75m0-1.5h.375a.75.75 0 000-1.5H21m-2.25.75v.75a.75.75 0 01-.75.75H9.75" />
    </svg>
  ),
  car: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  home: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  bolt: (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
}

type IconKey = keyof typeof ICONS

interface KpiCardDef {
  label:  string
  icon:   IconKey
  color:  CardColor
  href:   string
  // how to get the value from the fetched stats object
  key:    string
}

// ─── Per-industry card definitions ────────────────────────────────────────────
//
// All industries share the same 4-card structure:
//   Card 1 — today's follow-ups (people to contact)
//   Card 2 — missed follow-ups  (overdue)
//   Card 3 — scheduled appointments (label varies)
//   Card 4 — successful outcomes    (label varies)
//
// Business KPIs (revenue, MRR, active clients, etc.) belong in My Business.

const INDUSTRY_CARDS: Partial<Record<BusinessType, KpiCardDef[]>> = {
  insurance: [
    { label: "Today's Follow-ups", icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',  icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Client Meetings',    icon: 'calendar', color: 'blue',   href: '/leads?filter=meetings-today',      key: 'today_followups'  },
    { label: 'Policies Sold',      icon: 'trophy',   color: 'green',  href: '/leads?filter=bookings-confirmed', key: 'won_this_month'   },
  ],
  travel: [
    { label: "Today's Follow-ups",  icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',   icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Consultation Calls',  icon: 'calendar', color: 'blue',   href: '/leads?filter=consultations-today', key: 'today_followups'  },
    { label: 'Bookings Confirmed',  icon: 'trophy',   color: 'green',  href: '/leads?filter=new-clients',    key: 'won_this_month'   },
  ],
  marketing: [
    { label: "Today's Follow-ups", icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',  icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Meetings Today',     icon: 'calendar', color: 'blue',   href: '/leads?filter=meetings-today',      key: 'today_followups'  },
    { label: 'New Clients',        icon: 'trophy',   color: 'green',  href: '/leads?filter=properties-sold', key: 'won_this_month'   },
  ],
  real_estate: [
    { label: "Today's Follow-ups", icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',  icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Site Visits Today',  icon: 'home',     color: 'blue',   href: '/leads?filter=site-visits-today',   key: 'today_followups'  },
    { label: 'Properties Sold',    icon: 'trophy',   color: 'green',  href: '/leads?filter=admissions',     key: 'won_this_month'   },
  ],
  education: [
    { label: "Today's Follow-ups",   icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',    icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Counseling Sessions',  icon: 'calendar', color: 'blue',   href: '/leads?filter=consultations-today', key: 'today_followups'  },
    { label: 'Admissions',           icon: 'trophy',   color: 'green',  href: '/leads?filter=enrollments',    key: 'won_this_month'   },
  ],
  coach: [
    { label: "Today's Follow-ups",  icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',   icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Coaching Sessions',   icon: 'calendar', color: 'blue',   href: '/leads?filter=coaching-today',      key: 'today_followups'  },
    { label: 'Enrollments',         icon: 'trophy',   color: 'green',  href: '/leads?filter=sessions-booked', key: 'won_this_month'   },
  ],
  tarot: [
    { label: "Today's Follow-ups", icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Follow-ups',  icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Readings Today',     icon: 'bolt',     color: 'violet', href: '/leads?filter=readings-today',      key: 'today_followups'  },
    { label: 'Sessions Booked',    icon: 'trophy',   color: 'green',  href: '/leads?filter=completed-trips', key: 'won_this_month'   },
  ],
  taxi: [
    { label: "Today's Pickups",  icon: 'car',      color: 'amber',  href: '/leads?filter=today-followups', key: 'today_followups'  },
    { label: 'Missed Pickups',   icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
    { label: 'Scheduled Trips',  icon: 'calendar', color: 'blue',   href: '/leads?filter=today-pickups',       key: 'upcoming_trips'   },
    { label: 'Completed Trips',  icon: 'trophy',   color: 'green',  href: '/leads?filter=completed-trips', key: 'won_this_month'   },
  ],
}

const DEFAULT_CARDS: KpiCardDef[] = [
  { label: "Today's Follow-ups", icon: 'clock',    color: 'amber',  href: '/leads?filter=today-followups',  key: 'today_followups'  },
  { label: 'Missed Follow-ups',  icon: 'alert',    color: 'rose',   href: '/leads?filter=missed-followups', key: 'missed_followups' },
  { label: 'Meetings Today',     icon: 'calendar', color: 'blue',   href: '/leads?filter=meetings-today',      key: 'today_followups'  },
  { label: 'Closed Deals',       icon: 'trophy',   color: 'green',  href: '/leads?filter=won-this-month', key: 'won_this_month'   },
]

// ─── Lead Overview config ─────────────────────────────────────────────────────

interface OverviewDef { label: string; key: string; filterParam: string }

const INDUSTRY_OVERVIEW: Partial<Record<BusinessType, OverviewDef[]>> = {
  insurance: [
    { label: 'Total Prospects',  key: 'total_leads',     filterParam: 'all'              },
    { label: 'Active Policies',  key: 'active_leads',    filterParam: 'active-policies'  },
    { label: 'Policies Sold',    key: 'won_this_month',  filterParam: 'policies-sold'    },
    { label: 'Renewals Due',     key: 'upcoming_trips',  filterParam: 'today-followups'  },
  ],
  marketing: [
    { label: 'Total Clients',   key: 'total_leads',    filterParam: 'all'             },
    { label: 'Active Clients',  key: 'active_leads',   filterParam: 'active-clients'  },
    { label: 'Retainers',       key: 'active_leads',   filterParam: 'active-clients'  },
    { label: 'Renewals',        key: 'won_this_month', filterParam: 'new-clients'     },
  ],
  real_estate: [
    { label: 'Total Buyers',   key: 'total_leads',    filterParam: 'all'             },
    { label: 'Active Buyers',  key: 'active_leads',   filterParam: 'active-buyers'   },
    { label: 'Site Visits',    key: 'today_followups',filterParam: 'site-visits-today'},
    { label: 'Closed Deals',   key: 'won_this_month', filterParam: 'properties-sold' },
  ],
  education: [
    { label: 'Total Students',   key: 'total_leads',     filterParam: 'all'            },
    { label: 'Active Students',  key: 'active_leads',    filterParam: 'active-students'},
    { label: 'Admissions',       key: 'won_this_month',  filterParam: 'admissions'     },
    { label: 'Follow-ups Due',   key: 'missed_followups',filterParam: 'missed-followups'},
  ],
  travel: [
    { label: 'Total Travelers',    key: 'total_leads',      filterParam: 'all'                },
    { label: 'Active Bookings',    key: 'active_leads',     filterParam: 'active-bookings'    },
    { label: 'Confirmed Bookings', key: 'won_this_month',   filterParam: 'bookings-confirmed' },
    { label: 'Pending Bookings',   key: 'pending_bookings', filterParam: 'new-leads'          },
  ],
  taxi: [
    { label: 'Total Bookings',   key: 'total_leads',      filterParam: 'all'             },
    { label: 'Active Trips',     key: 'active_leads',     filterParam: 'active-trips'    },
    { label: 'Drivers Assigned', key: 'pending_bookings', filterParam: 'active-trips'    },
    { label: 'Completed Trips',  key: 'won_this_month',   filterParam: 'completed-trips' },
  ],
  coach: [
    { label: 'Total Leads',     key: 'total_leads',     filterParam: 'all'              },
    { label: 'Active Clients',  key: 'active_leads',    filterParam: 'active-clients'   },
    { label: 'Enrollments',     key: 'won_this_month',  filterParam: 'enrollments'      },
    { label: 'Follow-ups Due',  key: 'missed_followups',filterParam: 'missed-followups' },
  ],
  tarot: [
    { label: 'Total Clients',   key: 'total_leads',     filterParam: 'all'              },
    { label: 'Active Clients',  key: 'active_leads',    filterParam: 'active-clients'   },
    { label: 'Sessions Booked', key: 'won_this_month',  filterParam: 'sessions-booked'  },
    { label: 'Follow-ups Due',  key: 'missed_followups',filterParam: 'missed-followups' },
  ],
}

const DEFAULT_OVERVIEW: OverviewDef[] = [
  { label: 'Total',  key: 'total_leads',    filterParam: 'all'             },
  { label: 'Open',   key: 'active_leads',   filterParam: 'active-leads'    },
  { label: 'Closed', key: 'won_this_month', filterParam: 'won-this-month'  },
  { label: 'Today',  key: 'today_followups',filterParam: 'today-followups' },
]

// ─── Stats fetcher ────────────────────────────────────────────────────────────

interface DashStats {
  total_leads:     number
  active_leads:    number   // new + contacted + qualified
  new_leads:       number
  won_this_month:  number
  won_today:       number
  lost_leads:      number
  today_followups: number
  missed_followups:number
  pending_bookings:number   // status=new
  upcoming_trips:  number   // followup in next 7 days
  premium_due:     number
  renewals_month:  number
}

function useDashStats(tenantId: string | null, businessType: BusinessType | null) {
  const [stats,   setStats]   = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [missed,  setMissed]  = useState(0)   // for the alert banner

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }
    let cancelled = false

    const now        = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenOut   = new Date(now); sevenOut.setDate(sevenOut.getDate() + 7)
    const thirtyOut  = new Date(now); thirtyOut.setDate(thirtyOut.getDate() + 30)

    Promise.all([
      // total
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null),
      // active (new+contacted+qualified)
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null)
        .in('status', ['new', 'contacted', 'qualified']),
      // new only
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'new'),
      // won this month
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'won')
        .gte('updated_at', monthStart.toISOString()),
      // won today
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'won')
        .gte('updated_at', todayStart.toISOString()),
      // lost
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null).eq('status', 'lost'),
      // today follow-ups
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null)
        .gte('followup_date', todayStart.toISOString())
        .lte('followup_date', todayEnd.toISOString()),
      // missed (overdue, active)
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null)
        .lt('followup_date', todayStart.toISOString())
        .in('status', ['new', 'contacted', 'qualified']),
      // upcoming trips / readings (next 7 days, not today)
      supabase.from('leads').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).is('deleted_at', null)
        .gt('followup_date', todayEnd.toISOString())
        .lte('followup_date', sevenOut.toISOString()),
    ]).then(([total, active, newL, wonMonth, wonToday, lost, todayF, missed, upcoming]) => {
      if (cancelled) return
      const s: DashStats = {
        total_leads:      total.count     ?? 0,
        active_leads:     active.count    ?? 0,
        new_leads:        newL.count      ?? 0,
        won_this_month:   wonMonth.count  ?? 0,
        won_today:        wonToday.count  ?? 0,
        lost_leads:       lost.count      ?? 0,
        today_followups:  todayF.count    ?? 0,
        missed_followups: missed.count    ?? 0,
        pending_bookings: newL.count      ?? 0,   // reuse new_leads for pending
        upcoming_trips:   upcoming.count  ?? 0,
        premium_due:      0,   // computed below for insurance
        renewals_month:   wonMonth.count  ?? 0,
      }
      setStats(s)
      setMissed(missed.count ?? 0)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [tenantId, businessType])

  return { stats, loading, missed }
}

// ─── Components ───────────────────────────────────────────────────────────────

function MissedAlert({ count }: { count: number }) {
  const navigate = useNavigate()
  if (count === 0) return null
  return (
    <div
      className="mx-4 sm:mx-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 cursor-pointer active:opacity-80"
      onClick={() => navigate('/followups?tab=overdue')}
    >
      <svg width="18" height="18" className="shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-rose-700">
        You have <span className="font-bold">{count} missed follow-up{count !== 1 ? 's' : ''}</span>
      </p>
    </div>
  )
}

function KpiCards({
  businessType, stats, loading,
}: {
  businessType: BusinessType | null
  stats:        DashStats | null
  loading:      boolean
}) {
  const navigate = useNavigate()
  const cards = (businessType && INDUSTRY_CARDS[businessType]) ?? DEFAULT_CARDS

  return (
    <div className="px-4 sm:px-6 grid grid-cols-2 gap-3">
      {cards.map(card => {
        const colorCfg = COLOR_MAP[card.color]
        const value    = stats ? (stats[card.key as keyof DashStats] ?? 0) : 0
        return (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            className={`${colorCfg.bg} rounded-2xl p-4 text-left transition active:scale-95 hover:opacity-90`}
          >
            <span className={`${colorCfg.icon} block mb-1`}>
              {ICONS[card.icon]}
            </span>
            {loading ? (
              <div className="h-7 w-10 animate-pulse rounded bg-white/50 mb-1 mt-1" />
            ) : (
              <p className={`text-3xl font-bold tabular-nums mt-1 ${colorCfg.text}`}>
                {value}
              </p>
            )}
            <p className="text-xs text-gray-600 mt-0.5 leading-tight font-medium">
              {card.label}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function LeadOverview({
  businessType, stats, loading,
}: {
  businessType: BusinessType | null
  stats:        DashStats | null
  loading:      boolean
}) {
  const navigate = useNavigate()
  const items    = (businessType && INDUSTRY_OVERVIEW[businessType]) ?? DEFAULT_OVERVIEW

  return (
    <div className="mx-4 sm:mx-6 rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Lead Overview</p>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => {
          const value = stats ? (stats[item.key as keyof DashStats] ?? 0) : 0
          return (
            <button
              key={item.label}
              onClick={() => navigate(`/leads?filter=${item.filterParam}`)}
              className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 text-left transition hover:bg-gray-100 active:scale-95"
            >
              <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              {loading ? (
                <div className="h-6 w-8 animate-pulse rounded bg-gray-200 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{value}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PipelineStrip({ tenantId }: { tenantId: string | null }) {
  const navigate = useNavigate()
  const [stages, setStages] = useState<{ id: string; name: string; color: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }
    let cancelled = false
    Promise.all([
      supabase.from('pipeline_stages').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('sort_order'),
      supabase.from('leads').select('pipeline_stage_id').eq('tenant_id', tenantId).is('deleted_at', null),
    ]).then(([{ data: stagesData }, { data: leadsData }]) => {
      if (cancelled) return
      const countMap: Record<string, number> = {}
      leadsData?.forEach(l => {
        if (l.pipeline_stage_id) countMap[l.pipeline_stage_id] = (countMap[l.pipeline_stage_id] ?? 0) + 1
      })
      setStages((stagesData ?? []).map(s => ({
        id: s.id, name: s.name, color: s.color,
        count: countMap[s.id] ?? 0,
      })))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [tenantId])

  return (
    <div className="mx-4 sm:mx-6 rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pipeline</p>
        <button
          onClick={() => navigate('/pipeline')}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition"
        >
          View →
        </button>
      </div>
      {loading ? (
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-14 flex-1 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-gray-400 py-2 text-center">No pipeline stages yet</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {stages.map(s => (
            <div
              key={s.id}
              className="flex-1 min-w-[60px] flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 cursor-pointer hover:opacity-80 transition"
              style={{ backgroundColor: s.color + '18', border: `1px solid ${s.color}30` }}
              onClick={() => navigate(`/pipeline?stage=${s.id}`)}
            >
              <span className="text-xl font-bold" style={{ color: s.color }}>{s.count}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 text-center leading-tight">
                {s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { profile }   = useAuth()
  const tenantId      = profile?.tenant_id ?? null
  const { settings }  = useWorkspaceSettings(tenantId)
  const businessType  = settings?.business_type ?? null
  const vocab         = useVocab()
  const navigate      = useNavigate()
  const { text, emoji } = getGreeting()
  const { stats, loading, missed } = useDashStats(tenantId, businessType)

  return (
    <AppLayout>
      <div className="pb-28 lg:pb-10 space-y-4">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-6 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
              {text} {emoji}
            </h1>
          </div>
          <button
            onClick={() => navigate('/leads/new')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {vocab.addLead}
          </button>
        </div>

        {/* ── Missed follow-ups alert ────────────────────────────────────── */}
        <MissedAlert count={missed} />

        {/* ── 4 KPI cards ───────────────────────────────────────────────── */}
        <KpiCards businessType={businessType} stats={stats} loading={loading} />

        {/* ── Lead Overview ─────────────────────────────────────────────── */}
        <LeadOverview businessType={businessType} stats={stats} loading={loading} />

        {/* ── Pipeline ──────────────────────────────────────────────────── */}
        <PipelineStrip tenantId={tenantId} />

      </div>
    </AppLayout>
  )
}
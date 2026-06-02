import type { BusinessType } from '../../types/tenant'
import type { DashboardStats } from '../../types/lead'

// ─── Widget definition ────────────────────────────────────────────────────────

export type AccentColor = 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'orange'

export interface StatWidgetDef {
  key:     string
  label:   string
  accent:  AccentColor
  href:    string
  getValue: (stats: DashboardStats) => number
  icon:    'leads' | 'new_leads' | 'won' | 'followups' | 'lost' | 'contacted' | 'qualified'
}

// ─── Core 4 widgets — every industry gets these ───────────────────────────────
// Fallback when business_type is unknown or null.

export const CORE_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Leads',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Leads',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Won',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Follow-ups Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

// ─── Industry widget overrides ────────────────────────────────────────────────
// Only specify the widgets that DIFFER from the core 4.
// Label changes, accent changes, href changes — all supported.
// Industries not listed here get the core 4 unchanged.

const REAL_ESTATE_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Buyers',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Bookings',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Site Visits Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const INSURANCE_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Prospects',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Prospects',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Policies Issued',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Follow-ups Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const TRAVEL_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Inquiries',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Bookings Confirmed',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Follow-ups Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const TAROT_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Clients',
    accent:   'violet',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Sessions Completed',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Sessions Due Today',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const COACH_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Prospects',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Students Joined',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Follow-ups Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const EDUCATION_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Students',
    accent:   'indigo',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Enrolled',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Counselling Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const TAXI_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Bookings',
    accent:   'sky',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Inquiries',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Trips Completed',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Pickups Due Today',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

const MARKETING_WIDGETS: StatWidgetDef[] = [
  {
    key:      'total_leads',
    label:    'Total Clients',
    accent:   'orange',
    href:     '/leads',
    getValue: s => s.total_leads,
    icon:     'leads',
  },
  {
    key:      'new_leads',
    label:    'New Leads',
    accent:   'amber',
    href:     '/leads?status=new',
    getValue: s => s.new_leads,
    icon:     'new_leads',
  },
  {
    key:      'won_leads',
    label:    'Contracts Signed',
    accent:   'emerald',
    href:     '/leads?status=won',
    getValue: s => s.won_leads,
    icon:     'won',
  },
  {
    key:      'followups',
    label:    'Follow-ups Due',
    accent:   'rose',
    href:     '/followups',
    getValue: s => s.todays_followups,
    icon:     'followups',
  },
]

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INDUSTRY_WIDGETS: Partial<Record<BusinessType, StatWidgetDef[]>> = {
  real_estate: REAL_ESTATE_WIDGETS,
  insurance:   INSURANCE_WIDGETS,
  travel:      TRAVEL_WIDGETS,
  tarot:       TAROT_WIDGETS,
  coach:       COACH_WIDGETS,
  education:   EDUCATION_WIDGETS,
  taxi:        TAXI_WIDGETS,
  marketing:   MARKETING_WIDGETS,
  // general, custom, and any unknown type → CORE_WIDGETS (fallback)
}

export function getWidgetsForIndustry(businessType: BusinessType | null | undefined): StatWidgetDef[] {
  if (!businessType) return CORE_WIDGETS
  return INDUSTRY_WIDGETS[businessType] ?? CORE_WIDGETS
}
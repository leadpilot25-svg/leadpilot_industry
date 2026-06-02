export type BusinessType =
  | 'real_estate'
  | 'insurance'
  | 'travel'
  | 'tarot'
  | 'coach'
  | 'education'
  | 'custom'
  | 'taxi'
  | 'marketing'
  | 'general'

export type SubscriptionPlan = 'trial' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'paused'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: SubscriptionPlan
  business_type: BusinessType
  is_active: boolean
  created_at: string
}

export interface WorkspaceSettings {
  id: string
  tenant_id: string
  company_name: string
  logo_url: string | null
  brand_color: string
  business_type: BusinessType
  timezone: string
  currency: string
  whatsapp_number: string | null
  updated_at: string
}

export interface Subscription {
  id: string
  tenant_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
}

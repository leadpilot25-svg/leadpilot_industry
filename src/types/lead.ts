export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'won'
  | 'lost'
  | 'unqualified'

export type LeadActivityType =
  | 'call'
  | 'whatsapp'
  | 'sms'
  | 'email'
  | 'status_change'
  | 'assignment'
  | 'note'

export type LeadSourceType =
  | 'manual'
  | 'facebook_form'
  | 'google_sheets'
  | 'website'
  | 'referral'
  | 'other'

export interface Lead {
  id:                string
  tenant_id:         string
  assigned_agent_id: string | null
  pipeline_stage_id: string | null
  name:              string
  phone:             string | null
  email:             string | null
  whatsapp:          string | null
  status:            LeadStatus
  source:            string | null
  notes:             string | null
  followup_date:     string | null
  custom_data:       Record<string, unknown> | null
  deleted_at:        string | null
  created_at:        string
  updated_at:        string
}

export interface LeadActivity {
  id:            string
  tenant_id:     string
  lead_id:       string
  agent_id:      string
  activity_type: LeadActivityType
  notes:         string | null
  metadata:      Record<string, unknown> | null
  created_at:    string
}

/**
 * LeadActivity row with the lead name joined in — used by the
 * dashboard activity feed and RecentActivity component.
 */
export interface ActivityWithLead extends LeadActivity {
  lead_name: string | null
}

export interface Followup {
  id:           string
  tenant_id:    string
  lead_id:      string
  agent_id:     string
  note:         string | null
  scheduled_at: string
  completed:    boolean
  created_at:   string
}

export interface LeadSource {
  id:         string
  tenant_id:  string
  name:       string
  type:       LeadSourceType
  is_active:  boolean
  created_at: string
}

export interface DashboardStats {
  total_leads:      number
  new_leads:        number
  won_leads:        number
  lost_leads:       number
  todays_followups: number
}
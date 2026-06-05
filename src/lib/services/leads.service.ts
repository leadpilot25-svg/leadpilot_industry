import { supabase } from '../supabase'
import { syncLeadToSheet } from './googleSheets.service'
import type { LeadSyncPayload } from './googleSheets.service'
import type { Lead, LeadStatus, LeadActivityType } from '../../types/lead'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  tenant_id:         string
  name:              string
  phone:             string
  email:             string
  whatsapp:          string
  status:            LeadStatus
  source:            string
  notes:             string
  assigned_agent_id: string | null
  pipeline_stage_id: string | null
  followup_date:     string | null
  custom_data?:      Record<string, unknown> | null
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  id: string
}

export interface LeadFilters {
  status?:         LeadStatus | 'all'
  search?:         string
  agentId?:        string | 'all'
  // Date range filters on followup_date
  followupFrom?:   string   // ISO date — inclusive lower bound
  followupTo?:     string   // ISO date — inclusive upper bound
  followupMissed?: boolean  // followup_date < today AND status not won/lost
  // Outcome date filters on updated_at (for "won today/this month")
  wonFrom?:        string   // ISO date
  wonTo?:          string   // ISO date
  // Pipeline stage
  pipelineStageId?: string
  // Active (non-terminal) statuses
  activeOnly?:     boolean  // status IN new,contacted,qualified
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchLeads(
  tenantId: string,
  filters: LeadFilters = {},
): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.activeOnly) {
    query = query.in('status', ['new', 'contacted', 'qualified'])
  }

  if (filters.agentId && filters.agentId !== 'all') {
    query = query.eq('assigned_agent_id', filters.agentId)
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim()
    query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
  }

  if (filters.followupFrom) {
    query = query.gte('followup_date', filters.followupFrom)
  }

  if (filters.followupTo) {
    query = query.lte('followup_date', filters.followupTo)
  }

  if (filters.followupMissed) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    query = query
      .lt('followup_date', todayStart.toISOString())
      .in('status', ['new', 'contacted', 'qualified'])
  }

  if (filters.wonFrom) {
    query = query.eq('status', 'won').gte('updated_at', filters.wonFrom)
  }

  if (filters.wonTo) {
    query = query.lte('updated_at', filters.wonTo)
  }

  if (filters.pipelineStageId) {
    query = query.eq('pipeline_stage_id', filters.pipelineStageId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`)
  return (data ?? []) as Lead[]
}

export async function fetchLeadById(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Lead not found: ${error.message}`)
  return data as Lead
}


// ─── Build sync payload from a lead row ──────────────────────────────────────

function buildSyncPayload(lead: Lead): LeadSyncPayload {
  const custom = lead.custom_data as Record<string, string> | null ?? {}
  return {
    row_id:        lead.id,
    date:          new Date(lead.created_at).toLocaleDateString('en-IN'),
    name:          lead.name,
    phone:         lead.phone         ?? lead.whatsapp ?? '',
    email:         lead.email         ?? '',
    city:          (custom.city as string) ?? '',
    source:        lead.source        ?? 'manual',
    status:        lead.status,
    agent:         '',   // agent name not available here — sheet script can join if needed
    notes:         lead.notes         ?? '',
    followup_date: lead.followup_date
                     ? new Date(lead.followup_date).toLocaleDateString('en-IN')
                     : '',
    ...Object.fromEntries(
      Object.entries(custom).map(([k, v]) => [k, String(v ?? '')])
    ),
  }
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id:         input.tenant_id,
      name:              input.name.trim(),
      phone:             input.phone.trim()   || null,
      email:             input.email.trim()   || null,
      whatsapp:          input.whatsapp.trim()|| null,
      status:            input.status,
      source:            input.source.trim()  || null,
      notes:             input.notes.trim()   || null,
      assigned_agent_id: input.assigned_agent_id || null,
      pipeline_stage_id: input.pipeline_stage_id || null,
      followup_date:     input.followup_date  || null,
      custom_data:       input.custom_data    ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create lead: ${error.message}`)
  const lead = data as Lead
  // Fire-and-forget sync — never blocks lead creation
  syncLeadToSheet(lead.tenant_id, buildSyncPayload(lead))
  return lead
}

export async function updateLead(input: UpdateLeadInput): Promise<Lead> {
  const { id, ...fields } = input

  const update: Record<string, unknown> = {}
  if (fields.name              !== undefined) update.name              = fields.name?.trim()
  if (fields.phone             !== undefined) update.phone             = fields.phone?.trim()   || null
  if (fields.email             !== undefined) update.email             = fields.email?.trim()   || null
  if (fields.whatsapp          !== undefined) update.whatsapp          = fields.whatsapp?.trim()|| null
  if (fields.status            !== undefined) update.status            = fields.status
  if (fields.source            !== undefined) update.source            = fields.source?.trim()  || null
  if (fields.notes             !== undefined) update.notes             = fields.notes?.trim()   || null
  if (fields.assigned_agent_id !== undefined) update.assigned_agent_id = fields.assigned_agent_id || null
  if (fields.pipeline_stage_id !== undefined) update.pipeline_stage_id = fields.pipeline_stage_id || null
  if (fields.followup_date     !== undefined) update.followup_date     = fields.followup_date   || null
  if (fields.custom_data       !== undefined) update.custom_data       = fields.custom_data      ?? null

  const { data, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update lead: ${error.message}`)
  const lead = data as Lead
  syncLeadToSheet(lead.tenant_id, buildSyncPayload(lead))
  return lead
}

export async function softDeleteLead(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)   // required: PostgREST validates WITH CHECK against explicit filters

  if (error) throw new Error(`Failed to delete lead: ${error.message}`)
}

// ─── Activity logging ─────────────────────────────────────────────────────────

export async function logActivity(
  tenantId:  string,
  leadId:    string,
  agentId:   string,
  type:      LeadActivityType,
  notes:     string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('lead_activities')
    .insert({
      tenant_id:     tenantId,
      lead_id:       leadId,
      agent_id:      agentId,
      activity_type: type,
      notes:         notes.trim() || null,
      metadata:      metadata ?? null,
    })

  if (error) throw new Error(`Failed to log activity: ${error.message}`)
}

// ─── URL filter param → LeadFilters ──────────────────────────────────────────
//
// Dashboard and Lead Overview cards link to /leads?filter=<key>.
// This function translates the key into the matching LeadFilters object so
// LeadsListPage only needs to call resolveFilterParam(param) and pass the result
// to useLeads.

export function resolveFilterParam(param: string | null): {
  filters: LeadFilters
  label:   string
} {
  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  switch (param) {
    // ── Today's follow-ups / pickups / meetings / sessions ──────────────
    case 'today-followups':
    case 'today-pickups':
    case 'meetings-today':
    case 'sessions-today':
    case 'readings-today':
    case 'site-visits-today':
    case 'consultations-today':
    case 'coaching-today':
      return {
        filters: {
          followupFrom: todayStart.toISOString(),
          followupTo:   todayEnd.toISOString(),
        },
        label: 'Today',
      }

    // ── Missed / overdue ─────────────────────────────────────────────────
    case 'missed-followups':
    case 'missed-pickups':
      return {
        filters: { followupMissed: true },
        label: 'Missed follow-ups',
      }

    // ── Won outcomes ─────────────────────────────────────────────────────
    case 'won-today':
    case 'new-clients-today':
    case 'policies-sold-today':
    case 'properties-sold-today':
    case 'completed-trips-today':
    case 'enrollments-today':
    case 'admissions-today':
    case 'bookings-confirmed-today':
    case 'sessions-booked-today':
      return {
        filters: {
          status:  'won',
          wonFrom: todayStart.toISOString(),
          wonTo:   todayEnd.toISOString(),
        },
        label: 'Completed today',
      }

    // ── Won this month ────────────────────────────────────────────────────
    case 'won-this-month':
    case 'new-clients':
    case 'policies-sold':
    case 'properties-sold':
    case 'completed-trips':
    case 'enrollments':
    case 'admissions':
    case 'bookings-confirmed':
    case 'sessions-booked':
      return {
        filters: {
          status:  'won',
          wonFrom: monthStart.toISOString(),
        },
        label: 'Closed this month',
      }

    // ── Active (open) leads ───────────────────────────────────────────────
    case 'active-leads':
    case 'active-clients':
    case 'active-policies':
    case 'active-buyers':
    case 'active-students':
    case 'active-bookings':
    case 'active-trips':
      return {
        filters: { activeOnly: true },
        label: 'Active',
      }

    // ── New / total ───────────────────────────────────────────────────────
    case 'new-leads':
      return { filters: { status: 'new' }, label: 'New' }

    case 'all':
    default:
      return { filters: {}, label: 'All' }
  }
}
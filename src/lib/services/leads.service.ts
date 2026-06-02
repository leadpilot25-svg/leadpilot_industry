import { supabase } from '../supabase'
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
  status?:  LeadStatus | 'all'
  search?:  string
  agentId?: string | 'all'
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

  if (filters.agentId && filters.agentId !== 'all') {
    query = query.eq('assigned_agent_id', filters.agentId)
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim()
    query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
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
  return data as Lead
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
  return data as Lead
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
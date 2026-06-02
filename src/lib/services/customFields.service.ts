import { supabase } from '../supabase'
import type { CustomField, CustomFieldType, CustomFieldEntity } from '../../types/pipeline'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCustomFieldInput {
  tenant_id:    string
  entity:       CustomFieldEntity
  field_key:    string
  field_label:  string
  field_type:   CustomFieldType
  options?:     string[]
  required?:    boolean
  sort_order?:  number
  show_in_list?: boolean
  show_in_card?: boolean
  placeholder?: string
}

export interface UpdateCustomFieldInput {
  id:            string
  tenant_id:     string
  field_label?:  string
  field_type?:   CustomFieldType
  options?:      string[] | null
  required?:     boolean
  sort_order?:   number
  show_in_list?: boolean
  show_in_card?: boolean
  placeholder?:  string | null
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCustomFields(
  tenantId: string,
  entity:   CustomFieldEntity = 'lead',
): Promise<CustomField[]> {
  const { data, error } = await supabase
    .from('custom_fields')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity', entity)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch custom fields: ${error.message}`)
  return (data ?? []) as CustomField[]
}

export async function createCustomField(input: CreateCustomFieldInput): Promise<CustomField> {
  const { data, error } = await supabase
    .from('custom_fields')
    .insert({
      tenant_id:    input.tenant_id,
      entity:       input.entity ?? 'lead',          // defensive default
      field_key:    input.field_key.trim().toLowerCase().replace(/\s+/g, '_'),
      field_label:  input.field_label.trim(),
      field_type:   input.field_type,
      options:      input.options   ?? null,
      required:     input.required  ?? false,
      sort_order:   input.sort_order  ?? 0,
      show_in_list: input.show_in_list ?? false,
      show_in_card: input.show_in_card ?? true,
      placeholder:  input.placeholder  ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create custom field: ${error.message}`)
  return data as CustomField
}

export async function updateCustomField(input: UpdateCustomFieldInput): Promise<CustomField> {
  const update: Record<string, unknown> = {}
  if (input.field_label  !== undefined) update.field_label  = input.field_label.trim()
  if (input.field_type   !== undefined) update.field_type   = input.field_type
  if (input.options      !== undefined) update.options      = input.options
  if (input.required     !== undefined) update.required     = input.required
  if (input.sort_order   !== undefined) update.sort_order   = input.sort_order
  if (input.show_in_list !== undefined) update.show_in_list = input.show_in_list
  if (input.show_in_card !== undefined) update.show_in_card = input.show_in_card
  if (input.placeholder  !== undefined) update.placeholder  = input.placeholder

  const { data, error } = await supabase
    .from('custom_fields')
    .update(update)
    .eq('id', input.id)
    .eq('tenant_id', input.tenant_id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update custom field: ${error.message}`)
  return data as CustomField
}

export async function deleteCustomField(id: string, tenantId: string): Promise<void> {
  const { error } = await supabase
    .from('custom_fields')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete custom field: ${error.message}`)
}

export async function reorderCustomFields(
  fields:   { id: string; sort_order: number }[],
  tenantId: string,
): Promise<void> {
  // Update each field's sort_order sequentially
  // Small arrays (< 50) — sequential is fine
  for (const { id, sort_order } of fields) {
    await supabase
      .from('custom_fields')
      .update({ sort_order })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  }
}

/** Bulk-insert seed fields for a new tenant. Ignores conflicts (already seeded). */
export async function seedCustomFields(
  tenantId: string,
  fields:   Omit<CreateCustomFieldInput, 'tenant_id'>[],
): Promise<void> {
  if (fields.length === 0) return

  const rows = fields.map(f => ({
    tenant_id:    tenantId,
    entity:       f.entity,
    field_key:    f.field_key,
    field_label:  f.field_label,
    field_type:   f.field_type,
    options:      f.options      ?? null,
    required:     f.required     ?? false,
    sort_order:   f.sort_order   ?? 0,
    show_in_list: f.show_in_list ?? false,
    show_in_card: f.show_in_card ?? true,
    placeholder:  f.placeholder  ?? null,
  }))

  const { error } = await supabase
    .from('custom_fields')
    .upsert(rows, { onConflict: 'tenant_id,entity,field_key', ignoreDuplicates: true })

  if (error) throw new Error(`Failed to seed custom fields: ${error.message}`)
}
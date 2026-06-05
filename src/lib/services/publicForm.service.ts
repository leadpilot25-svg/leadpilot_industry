/**
 * Public form service — runs with the ANON key.
 * No authentication required. Security enforced by Supabase RLS:
 *   - forms: public SELECT allowed when is_active=true AND is_public=true
 *   - leads: INSERT allowed when source='public_form' AND tenant is form owner
 */

import { supabase } from '../supabase'
import { createLead } from './leads.service'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number'

export interface FormField {
  id:          string
  label:       string
  field_key:   string
  type:        FieldType
  required:    boolean
  placeholder: string
  options:     string[]   // for select type
}

export interface FormBranding {
  company_name: string
  logo_url:     string | null
  primary_color: string
  header_text:  string
}

export interface PublicFormConfig {
  id:           string
  slug:         string
  tenant_id:    string
  name:         string
  fields:       FormField[]
  branding:     FormBranding
  thank_you_msg: string
  is_active:    boolean
}

export interface FormSubmission {
  name:        string
  phone:       string
  email:       string
  city:        string
  notes:       string
  custom_data: Record<string, string>
}

// ─── Default fields every form has ───────────────────────────────────────────

export const DEFAULT_FIELDS: FormField[] = [
  { id: 'f_name',  label: 'Full Name',    field_key: 'name',  type: 'text',     required: true,  placeholder: 'Your full name',    options: [] },
  { id: 'f_phone', label: 'Phone Number', field_key: 'phone', type: 'phone',    required: true,  placeholder: '+91 98765 43210',   options: [] },
  { id: 'f_email', label: 'Email',        field_key: 'email', type: 'email',    required: false, placeholder: 'you@example.com',   options: [] },
  { id: 'f_city',  label: 'City',         field_key: 'city',  type: 'text',     required: false, placeholder: 'Mumbai',            options: [] },
  { id: 'f_notes', label: 'Message',      field_key: 'notes', type: 'textarea', required: false, placeholder: 'How can we help?',  options: [] },
]

// ─── Fetch form config by slug ────────────────────────────────────────────────

export async function fetchFormBySlug(slug: string): Promise<PublicFormConfig | null> {
  const { data, error } = await supabase
    .from('forms')
    .select('id, slug, tenant_id, name, field_config, branding, thank_you_msg, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null

  return {
    id:           data.id,
    slug:         data.slug,
    tenant_id:    data.tenant_id,
    name:         data.name,
    fields:       (data.field_config as FormField[])?.length
                    ? (data.field_config as FormField[])
                    : DEFAULT_FIELDS,
    branding:     (data.branding as FormBranding) ?? {
                    company_name: data.name,
                    logo_url: null,
                    primary_color: '#10B981',
                    header_text: `Contact ${data.name}`,
                  },
    thank_you_msg: data.thank_you_msg ?? 'Thank you! We will contact you shortly.',
    is_active:    data.is_active,
  }
}

// ─── Submit form — with duplicate detection ───────────────────────────────────

export type SubmitResult =
  | { status: 'created';   leadId: string }
  | { status: 'duplicate'; leadId: string; message: string }
  | { status: 'error';     message: string }

export async function submitForm(
  form:       PublicFormConfig,
  submission: FormSubmission,
  source:     'public_form' | 'qr_code' = 'public_form',
): Promise<SubmitResult> {

  const { name, phone, email, city, notes, custom_data } = submission

  // ── 1. Duplicate check by phone or email ─────────────────────────────────
  if (phone || email) {
    let query = supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', form.tenant_id)
      .is('deleted_at', null)

    if (phone && email) {
      query = query.or(`phone.eq.${phone},email.eq.${email}`)
    } else if (phone) {
      query = query.eq('phone', phone)
    } else if (email) {
      query = query.eq('email', email)
    }

    const { data: existing } = await query.limit(1).maybeSingle()

    if (existing) {
      // Log a new activity on the existing lead
      await supabase.from('lead_activities').insert({
        tenant_id:     form.tenant_id,
        lead_id:       existing.id,
        activity_type: 'note',
        notes:         `Re-submitted via public form. Message: ${notes || '(none)'}`,
      })

      return {
        status:  'duplicate',
        leadId:  existing.id,
        message: 'We already have your details. Our team will follow up with you.',
      }
    }
  }

  // ── 2. Create lead via createLead() — same path as manual/CSV/import ────────
  // This ensures buildSyncPayload() and syncLeadToSheet() are called automatically
  // for ALL lead sources. Public form, QR code, manual, CSV — one unified path.
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)

  const custom_data_with_city = city
    ? { ...custom_data, city }
    : custom_data

  let leadId: string
  try {
    const lead = await createLead({
      tenant_id:         form.tenant_id,
      name:              name.trim(),
      phone:             phone?.trim() ?? '',
      email:             email?.trim() ?? '',
      whatsapp:          '',
      notes:             notes?.trim() ?? '',
      source,
      status:            'new',
      followup_date:     tomorrow.toISOString(),
      assigned_agent_id: null,
      pipeline_stage_id: null,
      custom_data:       Object.keys(custom_data_with_city).length > 0
                           ? custom_data_with_city
                           : null,
    })
    leadId = lead.id
  } catch {
    return { status: 'error', message: 'Something went wrong. Please try again.' }
  }

  // ── 4. Write activity log so client admin sees where the lead came from ──────
  const sourceLabel = source === 'qr_code' ? 'QR Code scan' : 'Public Form'
  await supabase.from('lead_activities').insert({
    tenant_id:     form.tenant_id,
    lead_id:       leadId,
    activity_type: 'note',
    notes:         `Lead received via ${sourceLabel}. Follow-up scheduled for tomorrow.`,
  })

  // ── 5. Increment submit counter ───────────────────────────────────────────
  await supabase.rpc('increment_form_submit_count', { p_form_id: form.id })

  return { status: 'created', leadId }
}

// ─── Fetch form config for builder (authenticated) ────────────────────────────

export async function fetchFormForBuilder(tenantId: string): Promise<{
  id: string | null
  slug: string | null
  name: string
  field_config: FormField[]
  branding: FormBranding
  thank_you_msg: string
  is_active: boolean
} | null> {
  const { data } = await supabase
    .from('forms')
    .select('id, slug, name, field_config, branding, thank_you_msg, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'website')
    .maybeSingle()

  if (!data) return {
    id: null,
    slug: null,
    name: 'Contact Us',
    field_config: DEFAULT_FIELDS,
    branding: { company_name: '', logo_url: null, primary_color: '#10B981', header_text: 'Get in touch' },
    thank_you_msg: 'Thank you! We will contact you shortly.',
    is_active: false,
  }

  return {
    id:           data.id,
    slug:         data.slug,
    name:         data.name,
    field_config: (data.field_config as FormField[])?.length ? data.field_config as FormField[] : DEFAULT_FIELDS,
    branding:     (data.branding as FormBranding) ?? { company_name: '', logo_url: null, primary_color: '#10B981', header_text: '' },
    thank_you_msg: data.thank_you_msg ?? 'Thank you! We will contact you shortly.',
    is_active:    data.is_active,
  }
}

// ─── Track form view ──────────────────────────────────────────────────────────

export async function trackFormView(formId: string): Promise<void> {
  // Fire-and-forget — increment view counter via RPC
  await supabase.rpc('increment_form_view_count', { p_form_id: formId })
}

// ─── Fetch form analytics ─────────────────────────────────────────────────────

export interface FormAnalytics {
  view_count:        number
  submit_count:      number
  conversion_rate:   number   // percentage 0–100
  last_submitted_at: string | null
}

export async function fetchFormAnalytics(tenantId: string): Promise<FormAnalytics | null> {
  const { data } = await supabase
    .from('forms')
    .select('view_count, submit_count, last_submitted_at')
    .eq('tenant_id', tenantId)
    .eq('provider', 'website')
    .maybeSingle()

  if (!data) return null

  const views   = data.view_count   ?? 0
  const submits = data.submit_count ?? 0

  return {
    view_count:        views,
    submit_count:      submits,
    conversion_rate:   views > 0 ? Math.round((submits / views) * 100) : 0,
    last_submitted_at: data.last_submitted_at ?? null,
  }
}
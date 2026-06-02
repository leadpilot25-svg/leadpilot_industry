import type { Lead } from '../../types/lead'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id:      string
  name:    string
  message: string   // supports {{name}}, {{phone}}, {{status}}, {{source}},
                    // {{followup_date}}, plus any {{custom_field_key}}
}

// ─── Storage key ───────────────────────────────────────────────────────────

function storageKey(tenantId: string): string {
  return `lp_wa_templates_${tenantId}`
}

// ─── CRUD ──────────────────────────────────────────────────────────────────

export function loadTemplates(tenantId: string): WhatsAppTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (!raw) return []
    return JSON.parse(raw) as WhatsAppTemplate[]
  } catch {
    return []
  }
}

export function saveTemplates(tenantId: string, templates: WhatsAppTemplate[]): void {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(templates))
}

export function createTemplate(
  tenantId: string,
  name:    string,
  message: string,
): WhatsAppTemplate {
  const templates = loadTemplates(tenantId)
  const next: WhatsAppTemplate = {
    id:      `t_${Date.now()}`,
    name:    name.trim(),
    message: message.trim(),
  }
  saveTemplates(tenantId, [...templates, next])
  return next
}

export function updateTemplate(
  tenantId: string,
  id:       string,
  name:     string,
  message:  string,
): void {
  const templates = loadTemplates(tenantId).map(t =>
    t.id === id ? { ...t, name: name.trim(), message: message.trim() } : t
  )
  saveTemplates(tenantId, templates)
}

export function deleteTemplate(tenantId: string, id: string): void {
  const templates = loadTemplates(tenantId).filter(t => t.id !== id)
  saveTemplates(tenantId, templates)
}

// ─── Variable substitution ─────────────────────────────────────────────────

/**
 * Replaces {{variable}} tokens in a message template with real lead values.
 *
 * Standard variables:
 *   {{name}}          — lead.name
 *   {{phone}}         — lead.phone
 *   {{whatsapp}}      — lead.whatsapp
 *   {{email}}         — lead.email
 *   {{status}}        — lead.status
 *   {{source}}        — lead.source
 *   {{followup_date}} — lead.followup_date formatted
 *
 * Custom field variables:
 *   {{destination}}, {{policy_number}}, etc. — from lead.custom_data[key]
 *
 * Unknown variables are left as-is.
 */
export function composeMessage(template: WhatsAppTemplate, lead: Lead): string {
  const customData = (lead.custom_data as Record<string, unknown> | null) ?? {}

  const STANDARD: Record<string, string> = {
    name:          lead.name,
    phone:         lead.phone        ?? '',
    whatsapp:      lead.whatsapp     ?? '',
    email:         lead.email        ?? '',
    status:        lead.status,
    source:        lead.source       ?? '',
    followup_date: lead.followup_date
      ? new Date(lead.followup_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '',
  }

  return template.message.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    // Standard field first
    if (key in STANDARD) return STANDARD[key]
    // Fall back to custom_data
    const val = customData[key]
    if (val != null && val !== '') {
      if (Array.isArray(val)) return val.join(', ')
      return String(val)
    }
    return match   // leave unknown variables unchanged
  })
}

/**
 * Returns the full wa.me URL with the composed message for a lead.
 * Uses whatsapp > phone, strips non-digits except leading +.
 */
export function buildWhatsAppUrl(template: WhatsAppTemplate, lead: Lead): string {
  const rawPhone = (lead.whatsapp ?? lead.phone ?? '').replace(/[\s\-().]/g, '')
  const phone    = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone
  const message  = composeMessage(template, lead)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// ─── Default starter templates ─────────────────────────────────────────────

export const DEFAULT_TEMPLATES: Omit<WhatsAppTemplate, 'id'>[] = [
  {
    name:    'Initial greeting',
    message: 'Hi {{name}}, thank you for your inquiry! We\'d love to help. Could you share more details so we can assist you better?',
  },
  {
    name:    'Follow-up reminder',
    message: 'Hi {{name}}, just following up on our earlier conversation. Are you still interested? We have some great options for you.',
  },
  {
    name:    'Appointment confirmation',
    message: 'Hi {{name}}, your appointment is confirmed for {{followup_date}}. Please let us know if you need to reschedule.',
  },
  {
    name:    'Quote sent',
    message: 'Hi {{name}}, we\'ve sent across the details for your review. Please let us know if you have any questions!',
  },
  {
    name:    'Closing check-in',
    message: 'Hi {{name}}, we wanted to check in on the proposal we sent. Would you like to proceed or do you have any questions?',
  },
]

export function ensureDefaultTemplates(tenantId: string): void {
  const existing = loadTemplates(tenantId)
  if (existing.length === 0) {
    const defaults: WhatsAppTemplate[] = DEFAULT_TEMPLATES.map((t, i) => ({
      ...t,
      id: `default_${i}`,
    }))
    saveTemplates(tenantId, defaults)
  }
}

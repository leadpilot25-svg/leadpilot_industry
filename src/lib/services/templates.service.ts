/**
 * Unified templates service — WhatsApp, Email, SMS.
 *
 * Storage: localStorage keyed by tenantId.
 * Variables: {{name}}, {{phone}}, {{email}}, {{followup_date}},
 *            {{company}}, {{status}}, {{source}}, {{custom_field_key}}
 *
 * Replacing WhatsAppTemplatesPage — this is the single template system.
 */

import type { Lead } from '../../types/lead'
import type { BusinessType } from '../../types/tenant'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateChannel = 'whatsapp' | 'email' | 'sms'

export interface Template {
  id:       string
  channel:  TemplateChannel
  name:     string
  subject:  string    // email only — empty for whatsapp/sms
  body:     string    // message body
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function storageKey(tenantId: string): string {
  return `lp_templates_v2_${tenantId}`
}

export function loadTemplates(tenantId: string): Template[] {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    if (!raw) return []
    return JSON.parse(raw) as Template[]
  } catch { return [] }
}

export function saveTemplates(tenantId: string, templates: Template[]): void {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(templates))
}

export function createTemplate(tenantId: string, t: Omit<Template, 'id'>): Template {
  const template: Template = { ...t, id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2,7)}` }
  const existing = loadTemplates(tenantId)
  saveTemplates(tenantId, [...existing, template])
  return template
}

export function updateTemplate(tenantId: string, updated: Template): void {
  const templates = loadTemplates(tenantId).map(t => t.id === updated.id ? updated : t)
  saveTemplates(tenantId, templates)
}

export function deleteTemplate(tenantId: string, id: string): void {
  saveTemplates(tenantId, loadTemplates(tenantId).filter(t => t.id !== id))
}

// ─── Variable substitution ────────────────────────────────────────────────────

export function substituteVars(
  text:        string,
  lead:        Lead,
  companyName: string = ''
): string {
  const custom = (lead.custom_data ?? {}) as Record<string, string>
  return text
    .replace(/{{name}}/g,          lead.name           ?? '')
    .replace(/{{phone}}/g,         lead.phone          ?? lead.whatsapp ?? '')
    .replace(/{{email}}/g,         lead.email          ?? '')
    .replace(/{{status}}/g,        lead.status         ?? '')
    .replace(/{{source}}/g,        lead.source         ?? '')
    .replace(/{{company}}/g,       companyName)
    .replace(/{{followup_date}}/g, lead.followup_date
      ? new Date(lead.followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '')
    .replace(/{{(\w+)}}/g, (_, key) => custom[key] ?? '')
}

// ─── Channel URLs ─────────────────────────────────────────────────────────────

export function buildWhatsAppUrl(template: Template, lead: Lead, company = ''): string {
  const phone = (lead.whatsapp ?? lead.phone ?? '').replace(/[\s\-()]/g, '').replace(/^\+/, '')
  const text  = substituteVars(template.body, lead, company)
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

export function buildEmailUrl(template: Template, lead: Lead, company = ''): string {
  const subject = encodeURIComponent(substituteVars(template.subject, lead, company))
  const body    = encodeURIComponent(substituteVars(template.body,    lead, company))
  return `mailto:${lead.email ?? ''}?subject=${subject}&body=${body}`
}

export function buildSmsUrl(template: Template, lead: Lead, company = ''): string {
  const phone = (lead.phone ?? '').replace(/[\s\-()]/g, '')
  const body  = encodeURIComponent(substituteVars(template.body, lead, company))
  return `sms:${phone}?body=${body}`
}

// ─── Default templates per industry ──────────────────────────────────────────

type DefaultTemplate = Omit<Template, 'id'>

const GENERIC_DEFAULTS: DefaultTemplate[] = [
  {
    channel: 'whatsapp', name: 'Initial Greeting', subject: '',
    body: 'Hi {{name}}! Thank you for your enquiry. We would love to help. Could you share a good time to connect?',
  },
  {
    channel: 'whatsapp', name: 'Follow-up', subject: '',
    body: 'Hi {{name}}, just following up on our earlier conversation. Are you still interested? We have some great options for you.',
  },
  {
    channel: 'whatsapp', name: 'Appointment Confirmation', subject: '',
    body: 'Hi {{name}}, your appointment is confirmed for {{followup_date}}. Please let us know if you need to reschedule.',
  },
  {
    channel: 'email', name: 'Introduction Email', subject: 'Thank you for your enquiry',
    body: 'Dear {{name}},\n\nThank you for reaching out to {{company}}.\n\nWe have received your enquiry and will be in touch shortly.\n\nBest regards,\n{{company}}',
  },
  {
    channel: 'email', name: 'Follow-up Email', subject: 'Following up on your enquiry',
    body: 'Dear {{name}},\n\nI wanted to follow up on our recent conversation. Do you have any questions I can help with?\n\nBest regards,\n{{company}}',
  },
  {
    channel: 'sms', name: 'Quick Follow-up', subject: '',
    body: 'Hi {{name}}, this is a quick follow-up from {{company}}. Please call us back at your earliest convenience.',
  },
]

const INDUSTRY_DEFAULTS: Partial<Record<BusinessType, DefaultTemplate[]>> = {
  insurance: [
    {
      channel: 'whatsapp', name: 'Policy Quote', subject: '',
      body: 'Hi {{name}}, we have prepared a policy quote for you. The premium starts from a very affordable amount. Shall we discuss the details?',
    },
    {
      channel: 'whatsapp', name: 'Renewal Reminder', subject: '',
      body: 'Hi {{name}}, your policy is due for renewal on {{followup_date}}. To avoid any lapse in coverage, let\'s renew it today. Shall I call you?',
    },
    {
      channel: 'whatsapp', name: 'Policy Issued', subject: '',
      body: 'Hi {{name}}, great news! Your policy has been issued successfully. Your policy documents will be shared shortly. Congratulations!',
    },
    {
      channel: 'email', name: 'Policy Quote', subject: 'Your Insurance Quote from {{company}}',
      body: 'Dear {{name}},\n\nThank you for your interest in our insurance plans.\n\nWe have prepared a customised quote based on your requirements. Our advisor will call you on {{followup_date}} to walk you through the details.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Renewal Reminder', subject: 'Your Policy Renewal is Due — Action Required',
      body: 'Dear {{name}},\n\nThis is a reminder that your insurance policy is due for renewal on {{followup_date}}.\n\nTo ensure uninterrupted coverage, please renew your policy at the earliest.\n\nFor any queries, please contact us.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Policy Issued', subject: 'Your Policy Has Been Issued Successfully',
      body: 'Dear {{name}},\n\nWe are pleased to inform you that your insurance policy has been successfully issued.\n\nPlease find your policy documents attached. For any questions, do not hesitate to contact us.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'sms', name: 'Renewal Due', subject: '',
      body: 'Hi {{name}}, your insurance renewal is due on {{followup_date}}. Call {{company}} to renew and stay covered.',
    },
  ],

  travel: [
    {
      channel: 'whatsapp', name: 'Package Details', subject: '',
      body: 'Hi {{name}}, thank you for your enquiry! We have some amazing packages for your trip. Let me share the details. When are you planning to travel?',
    },
    {
      channel: 'whatsapp', name: 'Booking Confirmation', subject: '',
      body: 'Hi {{name}}, your travel booking is confirmed! Your departure is on {{followup_date}}. We will share the full itinerary shortly. Have a wonderful trip!',
    },
    {
      channel: 'whatsapp', name: 'Travel Reminder', subject: '',
      body: 'Hi {{name}}, just a reminder that your trip is coming up on {{followup_date}}. Please ensure your documents are ready. Have a safe journey!',
    },
    {
      channel: 'email', name: 'Package Details', subject: 'Your Personalised Travel Package — {{company}}',
      body: 'Dear {{name}},\n\nThank you for enquiring with {{company}}.\n\nWe have curated a personalised travel package based on your preferences. Our travel consultant will contact you on {{followup_date}} to share the complete details.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Booking Confirmation', subject: 'Booking Confirmed — Your Trip Details',
      body: 'Dear {{name}},\n\nWe are delighted to confirm your travel booking.\n\nDeparture: {{followup_date}}\n\nPlease find the complete itinerary attached. For any queries, please reach out to us.\n\nWishing you a wonderful journey!\n\n{{company}}',
    },
    {
      channel: 'email', name: 'Travel Reminder', subject: 'Reminder: Your Trip is Coming Up!',
      body: 'Dear {{name}},\n\nThis is a friendly reminder that your trip is scheduled for {{followup_date}}.\n\nPlease ensure you have all required documents including passport, visa, and insurance.\n\nSafe travels!\n\n{{company}}',
    },
    {
      channel: 'sms', name: 'Booking Confirmation', subject: '',
      body: 'Hi {{name}}, your trip is confirmed! Departure: {{followup_date}}. For details call {{company}}.',
    },
  ],

  education: [
    {
      channel: 'whatsapp', name: 'Course Information', subject: '',
      body: 'Hi {{name}}, thank you for enquiring about our courses! We offer some excellent programmes that match your interests. Can we schedule a counselling call to help you choose the right one?',
    },
    {
      channel: 'whatsapp', name: 'Admission Follow-up', subject: '',
      body: 'Hi {{name}}, following up on your admission enquiry. Your counselling session is scheduled for {{followup_date}}. Please let us know if you need to reschedule.',
    },
    {
      channel: 'whatsapp', name: 'Enrollment Confirmation', subject: '',
      body: 'Hi {{name}}, congratulations! Your enrollment has been confirmed. Welcome to our institution. Classes begin on {{followup_date}}. We look forward to seeing you!',
    },
    {
      channel: 'email', name: 'Course Information', subject: 'Course Details from {{company}}',
      body: 'Dear {{name}},\n\nThank you for your interest in our programmes.\n\nWe would love to share detailed information about courses that match your goals. Our counsellor will contact you on {{followup_date}}.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Admission Follow-up', subject: 'Following Up on Your Admission Enquiry',
      body: 'Dear {{name}},\n\nWe are following up on your admission enquiry at {{company}}.\n\nYour counselling session is scheduled for {{followup_date}}. Please arrive 10 minutes early with your academic documents.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Enrollment Confirmation', subject: 'Enrollment Confirmed — Welcome to {{company}}!',
      body: 'Dear {{name}},\n\nCongratulations! We are thrilled to confirm your enrollment at {{company}}.\n\nYour classes begin on {{followup_date}}. Please complete all documentation before your start date.\n\nWe look forward to being part of your learning journey.\n\n{{company}}',
    },
    {
      channel: 'sms', name: 'Session Reminder', subject: '',
      body: 'Hi {{name}}, your counselling session with {{company}} is on {{followup_date}}. Bring your academic documents.',
    },
  ],

  taxi: [
    {
      channel: 'whatsapp', name: 'Booking Confirmation', subject: '',
      body: 'Hi {{name}}, your taxi booking is confirmed! Pickup on {{followup_date}}. Your driver will be in touch shortly. Thank you for choosing {{company}}!',
    },
    {
      channel: 'whatsapp', name: 'Driver Assigned', subject: '',
      body: 'Hi {{name}}, your driver has been assigned for your trip on {{followup_date}}. You will receive the driver details shortly. Have a safe journey!',
    },
    {
      channel: 'whatsapp', name: 'Trip Reminder', subject: '',
      body: 'Hi {{name}}, reminder: your trip is scheduled for {{followup_date}}. Your driver will arrive 5 minutes early. Please be ready.',
    },
    {
      channel: 'email', name: 'Booking Confirmation', subject: 'Booking Confirmed — {{company}}',
      body: 'Dear {{name}},\n\nYour taxi booking has been confirmed.\n\nPickup: {{followup_date}}\n\nYour driver details will be shared 30 minutes before pickup.\n\nThank you for choosing {{company}}!',
    },
    {
      channel: 'email', name: 'Driver Assigned', subject: 'Your Driver Has Been Assigned',
      body: 'Dear {{name}},\n\nWe are pleased to inform you that a driver has been assigned for your trip on {{followup_date}}.\n\nDriver details will be sent to you shortly.\n\n{{company}}',
    },
    {
      channel: 'email', name: 'Trip Reminder', subject: 'Reminder: Your Trip is Tomorrow',
      body: 'Dear {{name}},\n\nThis is a reminder that your trip is scheduled for {{followup_date}}.\n\nPlease be ready at the pickup location. Your driver will arrive on time.\n\nSafe travels!\n\n{{company}}',
    },
    {
      channel: 'sms', name: 'Booking Confirmation', subject: '',
      body: 'Booking confirmed! Pickup: {{followup_date}}. Driver details coming soon. {{company}}',
    },
  ],

  coach: [
    {
      channel: 'whatsapp', name: 'Discovery Call Invite', subject: '',
      body: 'Hi {{name}}, thank you for your interest! I\'d love to learn more about your goals. Can we schedule a 30-minute discovery call? I have slots available on {{followup_date}}.',
    },
    {
      channel: 'whatsapp', name: 'Session Reminder', subject: '',
      body: 'Hi {{name}}, just a reminder about our session on {{followup_date}}. Looking forward to connecting with you!',
    },
    {
      channel: 'whatsapp', name: 'Enrollment Confirmation', subject: '',
      body: 'Hi {{name}}, welcome aboard! Your enrollment in the programme is confirmed. Let\'s start your journey to success! Your first session is on {{followup_date}}.',
    },
    {
      channel: 'email', name: 'Discovery Call', subject: 'Let\'s Connect — Discovery Call Invitation',
      body: 'Hi {{name}},\n\nThank you for your interest in working with {{company}}.\n\nI would love to learn more about your goals and share how I can help.\n\nI have a discovery call slot available on {{followup_date}}. Please confirm if that works for you.\n\nLooking forward to connecting!\n\n{{company}}',
    },
    {
      channel: 'email', name: 'Session Reminder', subject: 'Reminder: Your Coaching Session',
      body: 'Hi {{name}},\n\nThis is a reminder about your coaching session on {{followup_date}}.\n\nPlease come prepared with any questions or topics you would like to discuss.\n\nSee you soon!\n\n{{company}}',
    },
    {
      channel: 'sms', name: 'Session Reminder', subject: '',
      body: 'Hi {{name}}, your coaching session with {{company}} is on {{followup_date}}. See you then!',
    },
  ],

  tarot: [
    {
      channel: 'whatsapp', name: 'Booking Confirmation', subject: '',
      body: 'Hi {{name}}, your reading session is confirmed for {{followup_date}}. Please be in a quiet, comfortable space. Looking forward to our session!',
    },
    {
      channel: 'whatsapp', name: 'Session Reminder', subject: '',
      body: 'Hi {{name}}, just a gentle reminder about your reading session on {{followup_date}}. Please prepare any specific questions you would like guidance on.',
    },
    {
      channel: 'whatsapp', name: 'Follow-up', subject: '',
      body: 'Hi {{name}}, it was a pleasure connecting with you. I hope the insights from your reading were helpful. Do reach out whenever you need guidance!',
    },
    {
      channel: 'email', name: 'Session Confirmation', subject: 'Your Reading Session is Confirmed',
      body: 'Dear {{name}},\n\nThank you for booking a reading session with {{company}}.\n\nYour session is confirmed for {{followup_date}}. Please be in a calm and quiet space for our session.\n\nLooking forward to connecting with you.\n\nWith light and guidance,\n{{company}}',
    },
    {
      channel: 'sms', name: 'Session Reminder', subject: '',
      body: 'Hi {{name}}, your reading session with {{company}} is on {{followup_date}}. Be in a quiet space.',
    },
  ],

  marketing: [
    {
      channel: 'whatsapp', name: 'Initial Pitch', subject: '',
      body: 'Hi {{name}}, we specialize in helping businesses grow through targeted digital campaigns. Would you be open to a quick call to explore how we can help {{company}}?',
    },
    {
      channel: 'whatsapp', name: 'Proposal Follow-up', subject: '',
      body: 'Hi {{name}}, following up on the proposal we shared. Do you have any questions or feedback? We\'re happy to customise it further.',
    },
    {
      channel: 'whatsapp', name: 'Campaign Update', subject: '',
      body: 'Hi {{name}}, great news! Your campaign is live and already showing early results. I\'ll share a detailed report by {{followup_date}}.',
    },
    {
      channel: 'email', name: 'Agency Introduction', subject: 'Grow Your Business with {{company}}',
      body: 'Dear {{name}},\n\nThank you for your interest in {{company}}.\n\nWe help businesses like yours achieve measurable growth through data-driven marketing strategies.\n\nI would love to schedule a strategy call on {{followup_date}} to explore how we can help.\n\nBest regards,\n{{company}}',
    },
    {
      channel: 'email', name: 'Proposal', subject: 'Marketing Proposal from {{company}}',
      body: 'Dear {{name}},\n\nPlease find attached our customised marketing proposal for your business.\n\nOur team is available on {{followup_date}} to walk you through the proposal and answer any questions.\n\nLooking forward to a long partnership!\n\n{{company}}',
    },
    {
      channel: 'sms', name: 'Meeting Reminder', subject: '',
      body: 'Hi {{name}}, your strategy meeting with {{company}} is on {{followup_date}}. See you then!',
    },
  ],
}

// ─── Migration from old WhatsApp-only storage ─────────────────────────────────
// Old key: lp_wa_templates_{tenantId}  field: message
// New key: lp_templates_v2_{tenantId}  field: body + channel + subject
// Called once on TemplatesPage mount before ensureDefaultTemplates.
// Old key is NEVER deleted — kept as backup.

export function migrateFromWhatsAppTemplates(tenantId: string): void {
  const newKey = `lp_templates_v2_${tenantId}`
  const oldKey = `lp_wa_templates_${tenantId}`

  // Only migrate if new storage is empty
  if (localStorage.getItem(newKey)) return

  const raw = localStorage.getItem(oldKey)
  if (!raw) return

  try {
    const oldTemplates = JSON.parse(raw) as Array<{
      id: string
      name: string
      message: string   // old field name
    }>

    if (!Array.isArray(oldTemplates) || oldTemplates.length === 0) return

    const migrated: Template[] = oldTemplates.map(t => ({
      id:      t.id ?? `migrated_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      channel: 'whatsapp' as TemplateChannel,
      name:    t.name    ?? 'Untitled',
      subject: '',
      body:    t.message ?? '',   // message → body, variables unchanged
    }))

    localStorage.setItem(newKey, JSON.stringify(migrated))
    console.log(`[Templates] Migrated ${migrated.length} WhatsApp template(s) for tenant ${tenantId}`)
  } catch (err) {
    // Migration failed silently — ensureDefaultTemplates will seed fresh defaults
    console.warn('[Templates] Migration failed:', err)
  }
}



export function ensureDefaultTemplates(
  tenantId:     string,
  businessType: BusinessType | null | undefined
): void {
  const existing = loadTemplates(tenantId)
  if (existing.length > 0) return

  const industryDefaults = (businessType && INDUSTRY_DEFAULTS[businessType]) ?? []
  const allDefaults       = industryDefaults.length > 0 ? industryDefaults : GENERIC_DEFAULTS

  const seeded: Template[] = allDefaults.map((t, i) => ({
    ...t,
    id: `default_${i}_${Date.now()}`,
  }))

  saveTemplates(tenantId, seeded)
}

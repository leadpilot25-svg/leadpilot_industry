/**
 * Industry-specific lead form fields.
 *
 * These fields are stored in leads.custom_data (jsonb).
 * Zero database schema changes required.
 *
 * Usage:
 *   const fields = getIndustryFields(businessType)
 *   // Render each field; save values to customData[field.key]
 */

import type { BusinessType } from '../../types/tenant'

export type FieldType = 'text' | 'number' | 'date' | 'datetime-local' | 'select'

export interface IndustryField {
  key:         string        // key in custom_data
  label:       string        // shown in form
  type:        FieldType
  placeholder: string
  required?:   boolean
  options?:    string[]      // for select type
}

const INSURANCE_FIELDS: IndustryField[] = [
  { key: 'insurance_type', label: 'Insurance Type', type: 'select',   placeholder: 'Select type',
    options: ['Term Life', 'Health', 'Motor', 'Home', 'Travel', 'Other'] },
  { key: 'premium_amount', label: 'Premium (₹)',    type: 'number',   placeholder: 'e.g. 12000' },
  { key: 'policy_expiry_date', label: 'Renewal Date', type: 'date',  placeholder: '' },
]

const TRAVEL_FIELDS: IndustryField[] = [
  { key: 'destination',   label: 'Destination',      type: 'text',   placeholder: 'e.g. Dubai, Maldives' },
  { key: 'travel_date',   label: 'Travel Date',       type: 'date',   placeholder: '' },
  { key: 'package_value', label: 'Package Value (₹)', type: 'number', placeholder: 'e.g. 50000' },
]

const EDUCATION_FIELDS: IndustryField[] = [
  { key: 'course',  label: 'Course',  type: 'text',   placeholder: 'e.g. MBA, B.Tech, IELTS' },
  { key: 'intake',  label: 'Intake',  type: 'select', placeholder: 'Select intake',
    options: ['Jan 2025', 'Apr 2025', 'Jul 2025', 'Oct 2025', 'Jan 2026', 'Apr 2026', 'Jul 2026', 'Oct 2026'] },
]

const COACH_FIELDS: IndustryField[] = [
  { key: 'program', label: 'Program',    type: 'text',   placeholder: 'e.g. Life Coach, Business Mentor' },
  { key: 'budget',  label: 'Budget (₹)', type: 'number', placeholder: 'e.g. 25000' },
]

const TAROT_FIELDS: IndustryField[] = [
  { key: 'session_type',    label: 'Session Type',   type: 'select', placeholder: 'Select session',
    options: ['Tarot', 'Numerology', 'Vastu', 'Astrology', 'Palmistry', 'Other'] },
  { key: 'preferred_date',  label: 'Preferred Date', type: 'date',   placeholder: '' },
]

const MARKETING_FIELDS: IndustryField[] = [
  { key: 'company_name',   label: 'Company Name',   type: 'text',   placeholder: 'Client company name' },
  { key: 'campaign_type',  label: 'Campaign Type',  type: 'select', placeholder: 'Select type',
    options: ['SEO', 'Social Media', 'PPC', 'Content', 'Email', 'Other'] },
  { key: 'contract_value', label: 'Budget (₹/mo)',  type: 'number', placeholder: 'e.g. 30000' },
]

const REAL_ESTATE_FIELDS: IndustryField[] = [
  { key: 'property_type', label: 'Property Type', type: 'select', placeholder: 'Select type',
    options: ['Flat / Apartment', 'Villa', 'Plot / Land', 'Commercial', 'Other'] },
  { key: 'budget',        label: 'Budget (₹)',     type: 'number', placeholder: 'e.g. 5000000' },
  { key: 'location',      label: 'Location',       type: 'text',   placeholder: 'e.g. Whitefield, Bengaluru' },
]

const TAXI_FIELDS: IndustryField[] = [
  { key: 'pickup_location',  label: 'Pickup Location',  type: 'text',            placeholder: 'e.g. Bandra West', required: true },
  { key: 'drop_location',    label: 'Drop Location',    type: 'text',            placeholder: 'e.g. CST Airport',  required: true },
  { key: 'pickup_datetime',  label: 'Pickup Date & Time', type: 'datetime-local', placeholder: '',                   required: true },
  { key: 'driver_name',      label: 'Driver Assigned',  type: 'text',            placeholder: 'Driver name (optional)' },
  { key: 'vehicle',          label: 'Vehicle',          type: 'text',            placeholder: 'e.g. Swift Dzire MH01AB1234' },
  { key: 'distance_km',      label: 'Distance (KM)',    type: 'number',          placeholder: 'e.g. 28' },
  { key: 'trip_fare',        label: 'Trip Fare (₹)',    type: 'number',          placeholder: 'e.g. 850' },
]

// ─── Public API ───────────────────────────────────────────────────────────────

export function getIndustryFields(
  businessType: BusinessType | null | undefined
): IndustryField[] {
  switch (businessType) {
    case 'insurance':   return INSURANCE_FIELDS
    case 'travel':      return TRAVEL_FIELDS
    case 'education':   return EDUCATION_FIELDS
    case 'coach':       return COACH_FIELDS
    case 'tarot':       return TAROT_FIELDS
    case 'marketing':   return MARKETING_FIELDS
    case 'real_estate': return REAL_ESTATE_FIELDS
    case 'taxi':        return TAXI_FIELDS
    default:            return []
  }
}

/**
 * Extract industry-specific custom_data values from a lead's custom_data blob.
 * Returns a flat Record<string, string> for form state.
 */
export function extractIndustryValues(
  customData: Record<string, unknown> | null | undefined,
  fields:     IndustryField[]
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const f of fields) {
    const val = (customData ?? {})[f.key]
    result[f.key] = val != null ? String(val) : ''
  }
  return result
}
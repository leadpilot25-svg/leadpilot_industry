/**
 * Industry Vocabulary Layer
 *
 * Single source of truth for all industry-specific labels.
 * Only labels change — zero database or logic changes.
 *
 * Usage:
 *   const vocab = useVocab(businessType)
 *   <button>{vocab.addLead}</button>   →  "Add Prospect" for insurance
 */

import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useAuth } from '../../hooks/useAuth'
import type { BusinessType } from '../../types/tenant'

// ─── Vocabulary shape ─────────────────────────────────────────────────────────

export interface IndustryVocab {
  // Lead noun
  lead:          string   // "prospect" / "enquiry" / "student"
  leads:         string   // "prospects" / "enquiries" / "students"
  addLead:       string   // "Add Prospect" / "Add Enquiry"
  newLead:       string   // "New Enquiry" / "New Student"

  // Outcomes
  won:           string   // "Policy Sold" / "Booking Confirmed"
  lost:          string   // "Declined" / "Cancelled"

  // Actions
  followUp:      string   // "Renewal Call" / "Travel Call"
  meeting:       string   // "Consultation" / "Discovery Call"

  // People
  agent:         string   // "Advisor" / "Consultant" / "Coach"

  // Fields
  notes:         string   // "Policy Notes" / "Trip Notes"

  // Page titles
  pipeline:      string   // "Renewals Pipeline" / "Bookings Pipeline"
  closedDeals:   string   // "Policies Sold" / "Bookings Confirmed"
  myBusiness:    string   // "My Business — Insurance"
}

// ─── Vocabulary map ───────────────────────────────────────────────────────────

const VOCAB: Record<BusinessType, IndustryVocab> = {
  insurance: {
    lead:        'prospect',
    leads:       'prospects',
    addLead:     'Add Prospect',
    newLead:     'New Enquiry',
    won:         'Policy Sold',
    lost:        'Declined',
    followUp:    'Renewal Call',
    meeting:     'Consultation',
    agent:       'Advisor',
    notes:       'Policy Notes',
    pipeline:    'Renewals Pipeline',
    closedDeals: 'Policies Sold',
    myBusiness:  'My Business — Insurance',
  },
  travel: {
    lead:        'enquiry',
    leads:       'enquiries',
    addLead:     'Add Enquiry',
    newLead:     'New Enquiry',
    won:         'Booking Confirmed',
    lost:        'Cancelled',
    followUp:    'Travel Call',
    meeting:     'Travel Consultation',
    agent:       'Consultant',
    notes:       'Trip Notes',
    pipeline:    'Bookings Pipeline',
    closedDeals: 'Bookings Confirmed',
    myBusiness:  'My Business — Travel',
  },
  education: {
    lead:        'student',
    leads:       'students',
    addLead:     'Add Student',
    newLead:     'New Student',
    won:         'Admitted',
    lost:        'Not Admitted',
    followUp:    'Counselling Call',
    meeting:     'Counselling Session',
    agent:       'Counsellor',
    notes:       'Student Notes',
    pipeline:    'Admissions Pipeline',
    closedDeals: 'Admissions',
    myBusiness:  'My Business — Education',
  },
  coach: {
    lead:        'lead',
    leads:       'leads',
    addLead:     'Add Lead',
    newLead:     'New Lead',
    won:         'Enrolled',
    lost:        'Dropped',
    followUp:    'Follow-up',
    meeting:     'Discovery Call',
    agent:       'Coach',
    notes:       'Session Notes',
    pipeline:    'Coaching Pipeline',
    closedDeals: 'Enrollments',
    myBusiness:  'My Business — Coaching',
  },
  tarot: {
    lead:        'client',
    leads:       'clients',
    addLead:     'Add Client',
    newLead:     'New Client',
    won:         'Session Booked',
    lost:        'Cancelled',
    followUp:    'Session Reminder',
    meeting:     'Reading Session',
    agent:       'Reader',
    notes:       'Reading Notes',
    pipeline:    'Sessions Pipeline',
    closedDeals: 'Sessions Booked',
    myBusiness:  'My Business — Tarot',
  },
  marketing: {
    lead:        'lead',
    leads:       'leads',
    addLead:     'Add Client',
    newLead:     'New Lead',
    won:         'Contract Signed',
    lost:        'Lost',
    followUp:    'Follow-up',
    meeting:     'Strategy Call',
    agent:       'Account Manager',
    notes:       'Campaign Notes',
    pipeline:    'Agency Pipeline',
    closedDeals: 'Contracts Signed',
    myBusiness:  'My Business — Marketing',
  },
  taxi: {
    lead:        'booking',
    leads:       'bookings',
    addLead:     'Add Booking',
    newLead:     'New Booking',
    won:         'Trip Completed',
    lost:        'Cancelled',
    followUp:    'Pickup',
    meeting:     'Pickup',
    agent:       'Driver',
    notes:       'Trip Notes',
    pipeline:    'Bookings Pipeline',
    closedDeals: 'Trips Completed',
    myBusiness:  'My Business — Taxi',
  },
  real_estate: {
    lead:        'client',
    leads:       'clients',
    addLead:     'Add Buyer',
    newLead:     'New Client',
    won:         'Property Sold',
    lost:        'Lost',
    followUp:    'Site Visit',
    meeting:     'Site Visit',
    agent:       'Agent',
    notes:       'Property Notes',
    pipeline:    'Properties Pipeline',
    closedDeals: 'Properties Sold',
    myBusiness:  'My Business — Real Estate',
  },
  general: {
    lead:        'lead',
    leads:       'leads',
    addLead:     'Add Lead',
    newLead:     'New Lead',
    won:         'Won',
    lost:        'Lost',
    followUp:    'Follow-up',
    meeting:     'Meeting',
    agent:       'Agent',
    notes:       'Notes',
    pipeline:    'Pipeline',
    closedDeals: 'Deals Closed',
    myBusiness:  'My Business',
  },
  custom: {
    lead:        'lead',
    leads:       'leads',
    addLead:     'Add Lead',
    newLead:     'New Lead',
    won:         'Won',
    lost:        'Lost',
    followUp:    'Follow-up',
    meeting:     'Meeting',
    agent:       'Agent',
    notes:       'Notes',
    pipeline:    'Pipeline',
    closedDeals: 'Deals Closed',
    myBusiness:  'My Business',
  },
}

const DEFAULT_VOCAB = VOCAB.general

// ─── Public getter ────────────────────────────────────────────────────────────

export function getVocab(businessType: BusinessType | null | undefined): IndustryVocab {
  if (!businessType) return DEFAULT_VOCAB
  return VOCAB[businessType] ?? DEFAULT_VOCAB
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVocab(): IndustryVocab {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)
  return getVocab(settings?.business_type ?? null)
}
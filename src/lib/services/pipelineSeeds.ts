import type { BusinessType } from '../../types/tenant'
import type { PipelineSeed } from '../../types/pipeline'

export const PIPELINE_SEEDS: Record<BusinessType, PipelineSeed> = {
  real_estate: {
    name: 'Real Estate Pipeline',
    stages: [
      { name: 'New Lead',               color: '#6366F1', sort_order: 1 },
      { name: 'Contacted',              color: '#8B5CF6', sort_order: 2 },
      { name: 'Site Visit Scheduled',   color: '#F59E0B', sort_order: 3 },
      { name: 'Site Visit Completed',   color: '#F97316', sort_order: 4 },
      { name: 'Negotiation',            color: '#EF4444', sort_order: 5 },
      { name: 'Booking',                color: '#3B82F6', sort_order: 6 },
      { name: 'Won',                    color: '#10B981', sort_order: 7 },
      { name: 'Lost',                   color: '#6B7280', sort_order: 8 },
    ],
  },
  insurance: {
    name: 'Insurance Pipeline',
    stages: [
      { name: 'New Lead',      color: '#6366F1', sort_order: 1 },
      { name: 'Contacted',     color: '#8B5CF6', sort_order: 2 },
      { name: 'Quote Sent',    color: '#F59E0B', sort_order: 3 },
      { name: 'Follow Up',     color: '#F97316', sort_order: 4 },
      { name: 'Policy Issued', color: '#3B82F6', sort_order: 5 },
      { name: 'Renewal Due',   color: '#EC4899', sort_order: 6 },
      { name: 'Renewed',       color: '#10B981', sort_order: 7 },
    ],
  },
  travel: {
    name: 'Travel Agency Pipeline',
    stages: [
      { name: 'New Inquiry',       color: '#6366F1', sort_order: 1 },
      { name: 'Package Shared',    color: '#8B5CF6', sort_order: 2 },
      { name: 'Follow Up',         color: '#F59E0B', sort_order: 3 },
      { name: 'Visa Processing',   color: '#F97316', sort_order: 4 },
      { name: 'Booking Confirmed', color: '#3B82F6', sort_order: 5 },
      { name: 'Travel Completed',  color: '#10B981', sort_order: 6 },
    ],
  },
  tarot: {
    name: 'Tarot & Healing Pipeline',
    stages: [
      { name: 'New Inquiry',       color: '#6366F1', sort_order: 1 },
      { name: 'Session Scheduled', color: '#8B5CF6', sort_order: 2 },
      { name: 'Session Completed', color: '#7C3AED', sort_order: 3 },
      { name: 'Follow Up',         color: '#F59E0B', sort_order: 4 },
      { name: 'Repeat Client',     color: '#10B981', sort_order: 5 },
    ],
  },
  coach: {
    name: 'Coaching Pipeline',
    stages: [
      { name: 'New Inquiry',    color: '#6366F1', sort_order: 1 },
      { name: 'Discovery Call', color: '#8B5CF6', sort_order: 2 },
      { name: 'Proposal Sent',  color: '#F59E0B', sort_order: 3 },
      { name: 'Joined',         color: '#3B82F6', sort_order: 4 },
      { name: 'Completed',      color: '#10B981', sort_order: 5 },
    ],
  },
  education: {
    name: 'Education Pipeline',
    stages: [
      { name: 'New Student',       color: '#6366F1', sort_order: 1 },
      { name: 'Counselling',       color: '#8B5CF6', sort_order: 2 },
      { name: 'Demo Class',        color: '#F59E0B', sort_order: 3 },
      { name: 'Admission Pending', color: '#F97316', sort_order: 4 },
      { name: 'Enrolled',          color: '#10B981', sort_order: 5 },
    ],
  },
  taxi: {
    name: 'Taxi & Transport Pipeline',
    stages: [
      { name: 'New Inquiry',       color: '#6366F1', sort_order: 1 },
      { name: 'Quote Sent',        color: '#8B5CF6', sort_order: 2 },
      { name: 'Booking Confirmed', color: '#3B82F6', sort_order: 3 },
      { name: 'Trip Completed',    color: '#10B981', sort_order: 4 },
      { name: 'Cancelled',         color: '#6B7280', sort_order: 5 },
    ],
  },
  marketing: {
    name: 'Marketing Agency Pipeline',
    stages: [
      { name: 'New Lead',          color: '#6366F1', sort_order: 1 },
      { name: 'Discovery Call',    color: '#8B5CF6', sort_order: 2 },
      { name: 'Proposal Sent',     color: '#F59E0B', sort_order: 3 },
      { name: 'Contract Signed',   color: '#3B82F6', sort_order: 4 },
      { name: 'Campaign Live',     color: '#F97316', sort_order: 5 },
      { name: 'Reporting',         color: '#EC4899', sort_order: 6 },
      { name: 'Retained',          color: '#10B981', sort_order: 7 },
    ],
  },
  general: {
    name: 'General Business Pipeline',
    stages: [
      { name: 'New Lead',  color: '#6366F1', sort_order: 1 },
      { name: 'Contacted', color: '#8B5CF6', sort_order: 2 },
      { name: 'Won',       color: '#10B981', sort_order: 3 },
      { name: 'Lost',      color: '#6B7280', sort_order: 4 },
    ],
  },
  custom: {
    name: 'Custom Pipeline',
    stages: [
      { name: 'New Lead',  color: '#6366F1', sort_order: 1 },
      { name: 'Contacted', color: '#8B5CF6', sort_order: 2 },
      { name: 'Won',       color: '#10B981', sort_order: 3 },
      { name: 'Lost',      color: '#6B7280', sort_order: 4 },
    ],
  },
}

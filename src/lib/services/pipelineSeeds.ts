import type { BusinessType } from '../../types/tenant'
import type { PipelineSeed } from '../../types/pipeline'

export const PIPELINE_SEEDS: Record<BusinessType, PipelineSeed> = {
  real_estate: {
    name: 'Real Estate Pipeline',
    stages: [
      { name: 'New Buyer',   color: '#6366F1', sort_order: 1 },
      { name: 'Site Visit',  color: '#F59E0B', sort_order: 2 },
      { name: 'Negotiation', color: '#EF4444', sort_order: 3 },
      { name: 'Booking',     color: '#3B82F6', sort_order: 4 },
      { name: 'Closed',      color: '#10B981', sort_order: 5 },
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
      { name: 'New Student', color: '#6366F1', sort_order: 1 },
      { name: 'Counseling',  color: '#8B5CF6', sort_order: 2 },
      { name: 'Application', color: '#F59E0B', sort_order: 3 },
      { name: 'Admission',   color: '#F97316', sort_order: 4 },
      { name: 'Enrolled',    color: '#10B981', sort_order: 5 },
    ],
  },

  marketing: {
    name: 'Marketing Agency Pipeline',
    stages: [
      { name: 'New Inquiry',    color: '#6366F1', sort_order: 1 },
      { name: 'Discovery Call', color: '#8B5CF6', sort_order: 2 },
      { name: 'Proposal Sent',  color: '#F59E0B', sort_order: 3 },
      { name: 'Active Client',  color: '#3B82F6', sort_order: 4 },
      { name: 'Retainer',       color: '#10B981', sort_order: 5 },
    ],
  },
  insurance: {
    name: 'Insurance Pipeline',
    stages: [
      { name: 'New Prospect',       color: '#6366F1', sort_order: 1 },
      { name: 'Quote Sent',         color: '#F59E0B', sort_order: 2 },
      { name: 'Documents Pending',  color: '#F97316', sort_order: 3 },
      { name: 'Policy Issued',      color: '#3B82F6', sort_order: 4 },
      { name: 'Renewal',            color: '#10B981', sort_order: 5 },
    ],
  },
  taxi: {
    name: 'Taxi & Transport Pipeline',
    stages: [
      { name: 'New Booking',      color: '#6366F1', sort_order: 1 },
      { name: 'Driver Assigned',  color: '#F59E0B', sort_order: 2 },
      { name: 'Pickup Scheduled', color: '#F97316', sort_order: 3 },
      { name: 'In Trip',          color: '#3B82F6', sort_order: 4 },
      { name: 'Completed',        color: '#10B981', sort_order: 5 },
    ],
  },
  travel: {
    name: 'Travel Agency Pipeline',
    stages: [
      { name: 'New Inquiry',    color: '#6366F1', sort_order: 1 },
      { name: 'Consultation',   color: '#8B5CF6', sort_order: 2 },
      { name: 'Itinerary Sent', color: '#F59E0B', sort_order: 3 },
      { name: 'Booking Pending',color: '#F97316', sort_order: 4 },
      { name: 'Booked',         color: '#10B981', sort_order: 5 },
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
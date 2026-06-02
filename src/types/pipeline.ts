import type { BusinessType } from './tenant'

export interface Pipeline {
  id: string
  tenant_id: string
  name: string
  business_type: BusinessType
  is_default: boolean
  // soft delete
  deleted_at: string | null
  created_at: string
}

export interface PipelineStage {
  id: string
  tenant_id: string
  pipeline_id: string
  name: string
  color: string
  sort_order: number
  // soft delete
  deleted_at: string | null
  created_at: string
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'currency'
  | 'boolean'
  | 'select'
  | 'multi_select'

export type CustomFieldEntity = 'lead' | 'contact' | 'pipeline_stage'

export interface CustomField {
  id:           string
  tenant_id:    string
  entity:       CustomFieldEntity
  field_key:    string
  field_label:  string
  field_type:   CustomFieldType
  options:      string[] | null
  required:     boolean
  sort_order:   number
  show_in_list: boolean
  show_in_card: boolean
  placeholder:  string | null
  created_at:   string
}

/** Shape used by customFieldSeeds.ts to pre-configure fields at onboarding */
export interface CustomFieldSeed {
  field_key:    string
  field_label:  string
  field_type:   CustomFieldType
  options?:     string[]
  required?:    boolean
  sort_order:   number
  show_in_list: boolean
  show_in_card: boolean
  placeholder?: string
}

// Seed data shape used by the pipeline seeding function
export interface PipelineSeedStage {
  name: string
  color: string
  sort_order: number
}

export interface PipelineSeed {
  name: string
  stages: PipelineSeedStage[]
}
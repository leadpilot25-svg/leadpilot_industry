import type { Profile } from '../../types/auth'
import type { LeadStatus } from '../../types/lead'
import type { PipelineStage, CustomField } from '../../types/pipeline'
import { CustomFieldsSection } from './CustomFieldsSection'

export interface LeadFormData {
  name:              string
  phone:             string
  email:             string
  whatsapp:          string
  status:            LeadStatus
  source:            string
  notes:             string
  assigned_agent_id: string
  pipeline_stage_id: string
  followup_date:     string
}

export const EMPTY_FORM: LeadFormData = {
  name:              '',
  phone:             '',
  email:             '',
  whatsapp:          '',
  status:            'new',
  source:            '',
  notes:             '',
  assigned_agent_id: '',
  pipeline_stage_id: '',
  followup_date:     '',
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new',         label: 'New'         },
  { value: 'contacted',   label: 'Contacted'   },
  { value: 'qualified',   label: 'Qualified'   },
  { value: 'won',         label: 'Won'         },
  { value: 'lost',        label: 'Lost'        },
  { value: 'unqualified', label: 'Unqualified' },
]

const SOURCE_OPTIONS = [
  { value: '',         label: 'Select source…' },
  { value: 'facebook', label: 'Facebook'       },
  { value: 'google',   label: 'Google'         },
  { value: 'website',  label: 'Website'        },
  { value: 'whatsapp', label: 'WhatsApp'       },
  { value: 'referral', label: 'Referral'       },
  { value: 'manual',   label: 'Manual'         },
  { value: 'other',    label: 'Other'          },
]

interface FieldProps {
  id:          string
  label:       string
  required?:   boolean
  children:    React.ReactNode
}

function Field({ id, label, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const selectCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

interface LeadFormFieldsProps {
  data:           LeadFormData
  onChange:       (field: keyof LeadFormData, value: string) => void
  agents:         Profile[]
  stages:         PipelineStage[]
  /** Custom field definitions for this tenant. Defaults to [] — no change for existing callers. */
  customFields?:  CustomField[]
  /** Custom field values keyed by field_key. Defaults to {} */
  customData?:    Record<string, unknown>
  onCustomChange?: (key: string, value: unknown) => void
}

export function LeadFormFields({ data, onChange, agents, stages, customFields = [], customData = {}, onCustomChange }: LeadFormFieldsProps) {
  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="name" label="Full name" required>
          <input
            id="name"
            type="text"
            required
            value={data.name}
            onChange={e => onChange('name', e.target.value)}
            placeholder="John Smith"
            className={inputCls}
          />
        </Field>

        <Field id="status" label="Status" required>
          <select
            id="status"
            value={data.status}
            onChange={e => onChange('status', e.target.value)}
            className={selectCls}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="phone" label="Phone">
          <input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={e => onChange('phone', e.target.value)}
            placeholder="+91 98765 43210"
            className={inputCls}
          />
        </Field>

        <Field id="whatsapp" label="WhatsApp">
          <input
            id="whatsapp"
            type="tel"
            value={data.whatsapp}
            onChange={e => onChange('whatsapp', e.target.value)}
            placeholder="+91 98765 43210"
            className={inputCls}
          />
        </Field>
      </div>

      <Field id="email" label="Email">
        <input
          id="email"
          type="email"
          value={data.email}
          onChange={e => onChange('email', e.target.value)}
          placeholder="john@example.com"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="source" label="Source">
          <select
            id="source"
            value={data.source}
            onChange={e => onChange('source', e.target.value)}
            className={selectCls}
          >
            {SOURCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field id="followup_date" label="Follow-up date">
          <input
            id="followup_date"
            type="datetime-local"
            value={data.followup_date}
            onChange={e => onChange('followup_date', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="assigned_agent_id" label="Assign to agent">
          <select
            id="assigned_agent_id"
            value={data.assigned_agent_id}
            onChange={e => onChange('assigned_agent_id', e.target.value)}
            className={selectCls}
          >
            <option value="">Unassigned</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>
                {a.full_name ?? a.role}
              </option>
            ))}
          </select>
        </Field>

        <Field id="pipeline_stage_id" label="Pipeline stage">
          <select
            id="pipeline_stage_id"
            value={data.pipeline_stage_id}
            onChange={e => onChange('pipeline_stage_id', e.target.value)}
            className={selectCls}
          >
            <option value="">No stage</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="notes" label="Notes">
        <textarea
          id="notes"
          rows={3}
          value={data.notes}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Any additional information…"
          className={`${inputCls} resize-none`}
        />
      </Field>

      {customFields.length > 0 && onCustomChange && (
        <CustomFieldsSection
          fields={customFields}
          data={customData}
          onChange={onCustomChange}
        />
      )}

    </div>
  )
}
import { CustomFieldRenderer } from './CustomFieldRenderer'
import type { CustomField } from '../../types/pipeline'

interface CustomFieldsSectionProps {
  fields:   CustomField[]
  data:     Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

/**
 * Renders all custom fields for a tenant below the static lead form fields.
 * Returns null when fields is empty so no section heading appears for tenants
 * that have not configured any custom fields.
 */
export function CustomFieldsSection({
  fields,
  data,
  onChange,
  disabled = false,
}: CustomFieldsSectionProps) {
  if (fields.length === 0) return null

  return (
    <div className="border-t border-gray-800 pt-4 mt-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
        Additional details
      </p>
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.field_key}>
            <label
              htmlFor={field.field_key}
              className="block text-xs font-medium text-gray-400 mb-1"
            >
              {field.field_label}
              {field.required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
            <CustomFieldRenderer
              field={field}
              value={data[field.field_key] ?? ''}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
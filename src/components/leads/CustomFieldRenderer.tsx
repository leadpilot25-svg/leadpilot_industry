import type { CustomField } from '../../types/pipeline'

interface CustomFieldRendererProps {
  field:    CustomField
  value:    unknown
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50'
const selectCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50'

export function CustomFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
}: CustomFieldRendererProps) {
  const strVal = value != null ? String(value) : ''

  switch (field.field_type) {
    case 'text':
      return (
        <input
          type="text"
          id={field.field_key}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          placeholder={field.placeholder ?? ''}
          disabled={disabled}
          className={inputCls}
        />
      )

    case 'textarea':
      return (
        <textarea
          id={field.field_key}
          rows={3}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          placeholder={field.placeholder ?? ''}
          disabled={disabled}
          className={`${inputCls} resize-none`}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          id={field.field_key}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder ?? '0'}
          disabled={disabled}
          className={inputCls}
        />
      )

    case 'currency':
      return (
        <input
          type="number"
          id={field.field_key}
          step="0.01"
          min="0"
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder ?? '0.00'}
          disabled={disabled}
          className={inputCls}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          id={field.field_key}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      )

    case 'datetime':
      return (
        <input
          type="datetime-local"
          id={field.field_key}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          disabled={disabled}
          className={`${inputCls} min-h-[42px]`}
        />
      )

    case 'boolean':
      return (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(field.field_key, !value)}
            disabled={disabled}
            className={[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900',
              value ? 'bg-indigo-600' : 'bg-gray-700',
              disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow',
                'transition duration-200 ease-in-out',
                value ? 'translate-x-5' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
          <span className="text-sm text-gray-400">
            {value ? 'Yes' : 'No'}
          </span>
        </div>
      )

    case 'select': {
      const opts = field.options ?? []
      return (
        <select
          id={field.field_key}
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          disabled={disabled}
          className={selectCls}
        >
          <option value="">Select…</option>
          {opts.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
    }

    case 'multi_select': {
      const opts     = field.options ?? []
      const selected = Array.isArray(value) ? (value as string[]) : []

      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter(v => v !== opt)
          : [...selected, opt]
        onChange(field.field_key, next)
      }

      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {opts.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              disabled={disabled}
              className={[
                'rounded-lg px-3 py-1 text-xs font-medium transition',
                selected.includes(opt)
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white',
                disabled ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    default:
      return (
        <input
          type="text"
          value={strVal}
          onChange={e => onChange(field.field_key, e.target.value)}
          placeholder={field.placeholder ?? ''}
          disabled={disabled}
          className={inputCls}
        />
      )
  }
}
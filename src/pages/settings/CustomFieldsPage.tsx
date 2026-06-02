import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useCustomFields } from '../../hooks/useCustomFields'
import { AppLayout } from '../../components/layout/AppLayout'
import { CustomFieldRenderer } from '../../components/leads/CustomFieldRenderer'
import {
  createCustomField,
  updateCustomField,
  deleteCustomField,
  reorderCustomFields,
} from '../../lib/services/customFields.service'
import type { CustomField, CustomFieldType } from '../../types/pipeline'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: CustomFieldType; label: string; description: string }[] = [
  { value: 'text',         label: 'Text',          description: 'Single line text'         },
  { value: 'textarea',     label: 'Text area',      description: 'Multi-line text'           },
  { value: 'number',       label: 'Number',         description: 'Numeric value'             },
  { value: 'currency',     label: 'Currency',       description: 'Monetary amount'           },
  { value: 'date',         label: 'Date',           description: 'Calendar date'             },
  { value: 'datetime',     label: 'Date & time',    description: 'Date with time'            },
  { value: 'boolean',      label: 'Yes / No',       description: 'Toggle switch'             },
  { value: 'select',       label: 'Dropdown',       description: 'Choose one option'         },
  { value: 'multi_select', label: 'Multi-select',   description: 'Choose multiple options'   },
]

const inputCls    = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const selectCls   = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const checkboxCls = 'h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900'

// ─── Field form ───────────────────────────────────────────────────────────────

interface FieldFormState {
  field_label:  string
  field_type:   CustomFieldType
  options_text: string   // comma-separated for select/multi_select
  required:     boolean
  show_in_list: boolean
  show_in_card: boolean
  placeholder:  string
}

const EMPTY_FORM: FieldFormState = {
  field_label:  '',
  field_type:   'text',
  options_text: '',
  required:     false,
  show_in_list: false,
  show_in_card: true,
  placeholder:  '',
}

function toFieldKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function parseOptions(text: string): string[] {
  return text.split(',').map(s => s.trim()).filter(Boolean)
}

interface FieldFormProps {
  initial:    FieldFormState
  submitLabel: string
  onSubmit:   (form: FieldFormState) => Promise<void>
  onCancel:   () => void
}

function FieldForm({ initial, submitLabel, onSubmit, onCancel }: FieldFormProps) {
  const [form,    setForm]    = useState<FieldFormState>(initial)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const needsOptions = form.field_type === 'select' || form.field_type === 'multi_select'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.field_label.trim()) return
    if (needsOptions && parseOptions(form.options_text).length === 0) {
      setError('Please add at least one option.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Field label <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.field_label}
            onChange={e => setForm(p => ({ ...p, field_label: e.target.value }))}
            placeholder="e.g. Budget, Destination"
            className={inputCls}
          />
          {form.field_label && (
            <p className="mt-1 text-xs text-gray-600">
              Key: <code className="text-gray-500">{toFieldKey(form.field_label)}</code>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Field type</label>
          <select
            value={form.field_type}
            onChange={e => setForm(p => ({ ...p, field_type: e.target.value as CustomFieldType }))}
            className={selectCls}
          >
            {FIELD_TYPES.map(ft => (
              <option key={ft.value} value={ft.value}>{ft.label} — {ft.description}</option>
            ))}
          </select>
        </div>
      </div>

      {needsOptions && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Options <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.options_text}
            onChange={e => setForm(p => ({ ...p, options_text: e.target.value }))}
            placeholder="Option 1, Option 2, Option 3"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-600">Separate options with commas.</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Placeholder text</label>
        <input
          type="text"
          value={form.placeholder}
          onChange={e => setForm(p => ({ ...p, placeholder: e.target.value }))}
          placeholder="Optional hint shown inside the input"
          className={inputCls}
        />
      </div>

      <div className="flex flex-wrap gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.required}
            onChange={e => setForm(p => ({ ...p, required: e.target.checked }))}
            className={checkboxCls}
          />
          <span className="text-sm text-gray-300">Required</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_in_list}
            onChange={e => setForm(p => ({ ...p, show_in_list: e.target.checked }))}
            className={checkboxCls}
          />
          <span className="text-sm text-gray-300">Show in leads list</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.show_in_card}
            onChange={e => setForm(p => ({ ...p, show_in_card: e.target.checked }))}
            className={checkboxCls}
          />
          <span className="text-sm text-gray-300">Show on lead detail</span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-rose-400">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.field_label.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── Preview pane ─────────────────────────────────────────────────────────────

function FieldPreview({ field }: { field: CustomField }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Preview</p>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          {field.field_label}
          {field.required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        <CustomFieldRenderer
          field={field}
          value=""
          onChange={() => {}}
          disabled={false}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CustomFieldsPage() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id ?? null

  const { fields, loading, error, refetch } = useCustomFields(tenantId, 'lead')

  const [showAdd,    setShowAdd]    = useState(false)
  const [editing,    setEditing]    = useState<CustomField | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [actionErr,  setActionErr]  = useState<string | null>(null)
  const [previewField, setPreviewField] = useState<CustomField | null>(null)

  const handleAdd = async (form: FieldFormState) => {
    if (!tenantId) return
    await createCustomField({
      tenant_id:    tenantId,
      entity:       'lead',
      field_key:    toFieldKey(form.field_label),
      field_label:  form.field_label,
      field_type:   form.field_type,
      options:      (form.field_type === 'select' || form.field_type === 'multi_select')
                      ? parseOptions(form.options_text)
                      : undefined,
      required:     form.required,
      sort_order:   fields.length,
      show_in_list: form.show_in_list,
      show_in_card: form.show_in_card,
      placeholder:  form.placeholder || undefined,
    })
    setShowAdd(false)
    refetch()
  }

  const handleEdit = async (form: FieldFormState) => {
    if (!editing || !tenantId) return
    await updateCustomField({
      id:           editing.id,
      tenant_id:    tenantId,
      field_label:  form.field_label,
      field_type:   form.field_type,
      options:      (form.field_type === 'select' || form.field_type === 'multi_select')
                      ? parseOptions(form.options_text)
                      : null,
      required:     form.required,
      show_in_list: form.show_in_list,
      show_in_card: form.show_in_card,
      placeholder:  form.placeholder || null,
    })
    setEditing(null)
    refetch()
  }

  const handleDelete = async (field: CustomField) => {
    if (!tenantId || !window.confirm(`Delete "${field.field_label}"? Existing data in this field will not be lost from leads, but the field will no longer be visible.`)) return
    setDeleting(field.id)
    setActionErr(null)
    try {
      await deleteCustomField(field.id, tenantId)
      refetch()
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const moveField = async (index: number, direction: 'up' | 'down') => {
    if (!tenantId) return
    const next = [...fields]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    const updates = next.map((f, i) => ({ id: f.id, sort_order: i }))
    await reorderCustomFields(updates, tenantId)
    refetch()
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Custom fields</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Add extra fields to your lead forms. Values are saved per lead.
            </p>
          </div>
          {!showAdd && !editing && (
            <button
              onClick={() => { setShowAdd(true); setPreviewField(null) }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add field
            </button>
          )}
        </div>

        {/* Inline add form */}
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-gray-900 p-6">
            <h2 className="mb-4 text-sm font-semibold text-white">New field</h2>
            <FieldForm
              initial={EMPTY_FORM}
              submitLabel="Add field"
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        )}

        {/* Error */}
        {(error || actionErr) && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error ?? actionErr}
          </div>
        )}

        {/* Field list */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900">

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          )}

          {!loading && fields.length === 0 && !showAdd && (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No custom fields yet.</p>
              <p className="mt-1 text-xs text-gray-600">
                Add fields to collect industry-specific data on your leads.
              </p>
            </div>
          )}

          {!loading && fields.length > 0 && (
            <ul className="divide-y divide-gray-800">
              {fields.map((field, idx) => (
                <li key={field.id}>
                  {/* Edit inline */}
                  {editing?.id === field.id ? (
                    <div className="p-5">
                      <h3 className="mb-4 text-sm font-semibold text-white">Edit field</h3>
                      <FieldForm
                        initial={{
                          field_label:  field.field_label,
                          field_type:   field.field_type,
                          options_text: (field.options ?? []).join(', '),
                          required:     field.required,
                          show_in_list: field.show_in_list,
                          show_in_card: field.show_in_card,
                          placeholder:  field.placeholder ?? '',
                        }}
                        submitLabel="Save changes"
                        onSubmit={handleEdit}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-5 py-4">
                      {/* Reorder arrows */}
                      <div className="flex flex-col gap-0.5 pt-0.5 shrink-0">
                        <button
                          onClick={() => moveField(idx, 'up')}
                          disabled={idx === 0}
                          className="rounded p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20"
                          title="Move up"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveField(idx, 'down')}
                          disabled={idx === fields.length - 1}
                          className="rounded p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20"
                          title="Move down"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>

                      {/* Field info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-white">{field.field_label}</span>
                          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400 capitalize">
                            {FIELD_TYPES.find(f => f.value === field.field_type)?.label ?? field.field_type}
                          </span>
                          {field.required && (
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">Required</span>
                          )}
                          {field.show_in_list && (
                            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400">In list</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          key: <code>{field.field_key}</code>
                          {field.options && field.options.length > 0 && (
                            <> · options: {field.options.join(', ')}</>
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setPreviewField(prev => prev?.id === field.id ? null : field)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
                          title="Preview"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setEditing(field); setShowAdd(false) }}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
                          title="Edit"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(field)}
                          disabled={deleting === field.id}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                          title="Delete"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Preview pane inline */}
                  {previewField?.id === field.id && editing?.id !== field.id && (
                    <div className="border-t border-gray-800 px-5 pb-5 pt-3">
                      <FieldPreview field={field} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
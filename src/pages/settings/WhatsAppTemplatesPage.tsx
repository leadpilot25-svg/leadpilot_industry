import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  loadTemplates, createTemplate, updateTemplate, deleteTemplate, ensureDefaultTemplates,
  type WhatsAppTemplate,
} from '../../lib/services/whatsappTemplates.service'

const VARIABLES = [
  '{{name}}', '{{phone}}', '{{status}}', '{{source}}',
  '{{followup_date}}', '{{email}}', '{{whatsapp}}',
]

const inputCls    = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
const textareaCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none'

// ─── Template form ─────────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?:     WhatsAppTemplate
  onSave:       (name: string, message: string) => void
  onCancel:     () => void
  submitLabel:  string
}

function TemplateForm({ initial, onSave, onCancel, submitLabel }: TemplateFormProps) {
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [message, setMessage] = useState(initial?.message ?? '')

  const insertVar = (v: string) => {
    setMessage(prev => prev + v)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    onSave(name, message)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Template name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Initial greeting"
          className={inputCls}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-400">
            Message <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs text-gray-600">{message.length} chars</span>
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Hi {{name}}, thank you for your inquiry…"
          className={textareaCls}
          required
        />
      </div>

      {/* Variable chips */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Insert variable:</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300 transition hover:bg-gray-700 hover:text-white"
            >
              {v}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-600">
          Custom fields also work — e.g. <code className="text-gray-500">{'{{destination}}'}</code>, <code className="text-gray-500">{'{{policy_number}}'}</code>
        </p>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || !message.trim()}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function WhatsAppTemplatesPage() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id ?? null

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [editing,   setEditing]   = useState<WhatsAppTemplate | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    ensureDefaultTemplates(tenantId)
    setTemplates(loadTemplates(tenantId))
  }, [tenantId])

  const reload = () => {
    if (tenantId) setTemplates(loadTemplates(tenantId))
  }

  const handleAdd = (name: string, message: string) => {
    if (!tenantId) return
    createTemplate(tenantId, name, message)
    setShowAdd(false)
    reload()
  }

  const handleEdit = (name: string, message: string) => {
    if (!tenantId || !editing) return
    updateTemplate(tenantId, editing.id, name, message)
    setEditing(null)
    reload()
  }

  const handleDelete = (id: string) => {
    if (!tenantId || !window.confirm('Delete this template?')) return
    deleteTemplate(tenantId, id)
    reload()
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">WhatsApp Templates</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Reusable message templates with variable substitution. Stored on this device.
            </p>
          </div>
          {!showAdd && !editing && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New template
            </button>
          )}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-gray-900 p-6">
            <h2 className="mb-4 text-sm font-semibold text-white">New template</h2>
            <TemplateForm submitLabel="Add template" onSave={handleAdd} onCancel={() => setShowAdd(false)} />
          </div>
        )}

        {/* Template list */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900">
          {templates.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No templates yet.</p>
              <p className="mt-1 text-xs text-gray-600">Create a template to send quick WhatsApp messages to leads.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {templates.map(tmpl => (
                <li key={tmpl.id}>
                  {editing?.id === tmpl.id ? (
                    <div className="p-5">
                      <h3 className="mb-4 text-sm font-semibold text-white">Edit template</h3>
                      <TemplateForm
                        initial={tmpl}
                        submitLabel="Save changes"
                        onSave={handleEdit}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{tmpl.name}</p>
                          {preview === tmpl.id ? (
                            <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-400 leading-relaxed">
                              {tmpl.message}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-500 truncate">{tmpl.message}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => setPreview(prev => prev === tmpl.id ? null : tmpl.id)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
                            title="Preview"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setEditing(tmpl); setShowAdd(false) }}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-white"
                            title="Edit"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(tmpl.id)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                            title="Delete"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Variable reference */}
        <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Available variables</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            {[...VARIABLES, '{{custom_field_key}}'].map(v => (
              <code key={v}>{v}</code>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Custom field keys match the keys in your Custom Fields settings, e.g. <code>{'{{destination}}'}</code> or <code>{'{{policy_number}}'}</code>.
          </p>
        </div>

      </div>
    </AppLayout>
  )
}

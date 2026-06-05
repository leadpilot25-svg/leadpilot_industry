import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  loadTemplates, saveTemplates, createTemplate, updateTemplate, deleteTemplate,
  ensureDefaultTemplates, migrateFromWhatsAppTemplates,
  type Template, type TemplateChannel,
} from '../../lib/services/templates.service'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { id: TemplateChannel; label: string; icon: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'email',    label: 'Email',    icon: '✉️'  },
  { id: 'sms',      label: 'SMS',      icon: '📱'  },
]

const VARIABLES = ['{{name}}', '{{phone}}', '{{email}}', '{{followup_date}}', '{{company}}']

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-100 transition'

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template, onEdit, onDelete,
}: {
  template: Template
  onEdit:   (t: Template) => void
  onDelete: (id: string)  => void
  key?: React.Key
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{template.name}</p>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(template)}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
      {template.channel === 'email' && template.subject && (
        <p className="text-xs text-gray-500 font-medium">Subject: {template.subject}</p>
      )}
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">
        {template.body}
      </p>
    </div>
  )
}

// ─── Template form ────────────────────────────────────────────────────────────

function TemplateForm({
  channel, initial, onSave, onCancel,
}: {
  channel:  TemplateChannel
  initial:  Partial<Template> | null
  onSave:   (data: Omit<Template, 'id' | 'channel'>) => void
  onCancel: () => void
}) {
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [body,    setBody]    = useState(initial?.body    ?? '')

  const insertVar = (v: string) => setBody(prev => prev + v)

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-900">
        {initial ? 'Edit template' : 'New template'}
      </p>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Template name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Renewal Reminder"
          className={inputCls}
        />
      </div>

      {channel === 'email' && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Subject line</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Your policy renewal is due"
            className={inputCls}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
        <textarea
          rows={channel === 'email' ? 8 : 4}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={channel === 'sms' ? 'Keep it under 160 characters…' : 'Write your message…'}
          className={`${inputCls} resize-none`}
        />
        {channel === 'sms' && (
          <p className={`text-xs mt-1 ${body.length > 160 ? 'text-rose-500' : 'text-gray-400'}`}>
            {body.length}/160 characters
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Insert variable</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-mono text-gray-600 transition hover:bg-gray-50 hover:border-emerald-300"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name, subject, body })}
          disabled={!name.trim() || !body.trim()}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          Save template
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TemplatesPage() {
  const { profile }  = useAuth()
  const tenantId     = profile?.tenant_id ?? null
  const { settings } = useWorkspaceSettings(tenantId)

  const [templates,   setTemplates]   = useState<Template[]>([])
  const [activeChannel, setActiveChannel] = useState<TemplateChannel>('whatsapp')
  const [editing,     setEditing]     = useState<Template | null>(null)
  const [adding,      setAdding]      = useState(false)

  useEffect(() => {
    if (!tenantId) return
    migrateFromWhatsAppTemplates(tenantId)           // runs once, no-ops if already migrated
    ensureDefaultTemplates(tenantId, settings?.business_type ?? null)
    setTemplates(loadTemplates(tenantId))
  }, [tenantId, settings?.business_type])

  const reload = () => tenantId && setTemplates(loadTemplates(tenantId))

  const handleSave = (data: Omit<Template, 'id' | 'channel'>) => {
    if (!tenantId) return
    if (editing) {
      updateTemplate(tenantId, { ...editing, ...data })
    } else {
      createTemplate(tenantId, { ...data, channel: activeChannel })
    }
    setEditing(null); setAdding(false); reload()
  }

  const handleDelete = (id: string) => {
    if (!tenantId || !window.confirm('Delete this template?')) return
    deleteTemplate(tenantId, id)
    reload()
  }

  const channelTemplates = templates.filter(t => t.channel === activeChannel)

  const TAB_CLS = (active: boolean) =>
    `flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Templates</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              WhatsApp, Email, and SMS templates with auto-fill variables.
            </p>
          </div>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => { setActiveChannel(ch.id); setAdding(false); setEditing(null) }}
              className={TAB_CLS(activeChannel === ch.id)}
            >
              <span>{ch.icon}</span>
              {ch.label}
              <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                {templates.filter(t => t.channel === ch.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Add form or add button */}
        {(adding || editing) ? (
          <TemplateForm
            channel={activeChannel}
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setAdding(false); setEditing(null) }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3.5 text-sm font-semibold text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New {CHANNELS.find(c => c.id === activeChannel)?.label} template
          </button>
        )}

        {/* Templates list */}
        {channelTemplates.length === 0 && !adding ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-10 text-center">
            <p className="text-2xl mb-2">{CHANNELS.find(c => c.id === activeChannel)?.icon}</p>
            <p className="text-sm font-semibold text-gray-700">No {activeChannel} templates yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "New template" above to create your first one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {channelTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={tmpl => { setEditing(tmpl); setAdding(false) }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Variables reference */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Available variables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: '{{name}}',          desc: 'Lead name'       },
              { v: '{{phone}}',         desc: 'Phone number'    },
              { v: '{{email}}',         desc: 'Email address'   },
              { v: '{{followup_date}}', desc: 'Follow-up date'  },
              { v: '{{company}}',       desc: 'Your company'    },
            ].map(({ v, desc }) => (
              <div key={v} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                <p className="font-mono text-[11px] text-emerald-700 font-semibold">{v}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

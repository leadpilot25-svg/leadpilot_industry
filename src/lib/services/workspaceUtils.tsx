import { supabase } from '../supabase'
import { updateLead } from './leads.service'
import type { Lead } from '../../types/lead'

// ─── custom_data helpers ──────────────────────────────────────────────────────

/** Read a value from a lead's custom_data by field key */
export function cd(lead: Lead, key: string): string {
  const val = (lead.custom_data as Record<string, unknown> | null)?.[key]
  if (val == null || val === '') return ''
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

/** Read a numeric value from custom_data, returns 0 if missing */
export function cdNum(lead: Lead, key: string): number {
  const val = (lead.custom_data as Record<string, unknown> | null)?.[key]
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

/** Check boolean custom_data field */
export function cdBool(lead: Lead, key: string): boolean {
  const val = (lead.custom_data as Record<string, unknown> | null)?.[key]
  return val === true || val === 'true'
}

// ─── Patch a single custom_data field on a lead ───────────────────────────────

export async function patchCustomField(
  lead:    Lead,
  key:     string,
  value:   unknown,
): Promise<void> {
  const existing = (lead.custom_data as Record<string, unknown> | null) ?? {}
  const next = { ...existing, [key]: value }
  await updateLead({
    id:          lead.id,
    tenant_id:   lead.tenant_id,
    custom_data: next,
  })
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(isoDate: string): number {
  if (!isoDate) return Infinity
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isToday(isoDatetime: string): boolean {
  if (!isoDatetime) return false
  return isoDatetime.slice(0, 10) === today()
}

export function isWithinDays(isoDate: string, days: number): boolean {
  const d = daysUntil(isoDate)
  return d >= 0 && d <= days
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Log an activity on a lead ───────────────────────────────────────────────

export async function logWorkspaceActivity(
  tenantId: string,
  leadId:   string,
  agentId:  string,
  notes:    string,
): Promise<void> {
  await supabase.from('lead_activities').insert({
    tenant_id:     tenantId,
    lead_id:       leadId,
    agent_id:      agentId,
    activity_type: 'note',
    notes,
  })
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

export const inputCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
export const selectCls = 'rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
export const btnPrimary = 'flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700'
export const btnSecondary = 'flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white'
export const btnSuccess = 'flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700'
export const btnDanger = 'flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/20'

/** KPI card component — used at the top of every workspace */
export interface KpiProps {
  label:   string
  value:   string | number
  accent:  'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
  sub?:    string
}

const accentBg:   Record<KpiProps['accent'], string> = {
  indigo: 'bg-indigo-500/20',  emerald: 'bg-emerald-500/20',
  amber:  'bg-amber-500/20',   rose:    'bg-rose-500/20',
  sky:    'bg-sky-500/20',     violet:  'bg-violet-500/20',
}
const accentText: Record<KpiProps['accent'], string> = {
  indigo: 'text-indigo-400',  emerald: 'text-emerald-400',
  amber:  'text-amber-400',   rose:    'text-rose-400',
  sky:    'text-sky-400',     violet:  'text-violet-400',
}
const accentBorder: Record<KpiProps['accent'], string> = {
  indigo: 'border-indigo-500/20',  emerald: 'border-emerald-500/20',
  amber:  'border-amber-500/20',   rose:    'border-rose-500/20',
  sky:    'border-sky-500/20',     violet:  'border-violet-500/20',
}

export function KpiCard({ label, value, accent, sub }: KpiProps) {
  return (
    <div className={`rounded-2xl border ${accentBorder[accent]} ${accentBg[accent]} p-5`}>
      <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accentText[accent]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-600">{sub}</p>}
    </div>
  )
}

/** Badge component */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

/** Quick inline select — used for status change actions in workspace tables */
export function InlineSelect({
  value, options, onChange, className = '',
}: {
  value:    string
  options:  string[]
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${selectCls} ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

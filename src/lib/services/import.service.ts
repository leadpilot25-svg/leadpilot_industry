import { supabase } from '../supabase'
import { createLead } from './leads.service'
import type { LeadStatus } from '../../types/lead'
import type { Profile } from '../../types/auth'

// ─── Public types ─────────────────────────────────────────────────────────────

/** The 7 fields a CSV column can be mapped to, plus Skip */
export type CsvFieldMapping =
  | 'name'
  | 'phone'
  | 'email'
  | 'source'
  | 'notes'
  | 'status'
  | 'assigned_agent'
  | 'skip'

export interface ColumnMap {
  [csvHeader: string]: CsvFieldMapping
}

export interface ParsedCsvResult {
  headers: string[]
  rows:    Record<string, string>[]
  /** Suggested mapping auto-detected from header names */
  suggestedMapping: ColumnMap
}

export interface RowError {
  rowNumber: number
  name:      string
  phone:     string
  email:     string
  reason:    string
}

export interface ImportProgress {
  processed: number
  total:     number
  imported:  number
  skipped:   number
  failed:    number
}

export interface ImportResult {
  imported: number
  skipped:  number
  errors:   RowError[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES: LeadStatus[] = [
  'new', 'contacted', 'qualified', 'won', 'lost', 'unqualified',
]

const KNOWN_SOURCES = [
  'facebook', 'google', 'website', 'whatsapp',
  'referral', 'manual', 'other',
  // legacy values
  'facebook_form', 'google_sheets',
]

/** Headers that auto-map to a field — checked as lowercase partial match */
const HEADER_AUTO_MAP: Array<{ keywords: string[]; field: CsvFieldMapping }> = [
  { keywords: ['name', 'full name', 'fullname', 'contact', 'client'],              field: 'name'           },
  { keywords: ['phone', 'mobile', 'cell', 'tel', 'contact number', 'number'],      field: 'phone'          },
  { keywords: ['email', 'e-mail', 'mail'],                                          field: 'email'          },
  { keywords: ['source', 'lead source', 'how', 'channel', 'medium'],               field: 'source'         },
  { keywords: ['note', 'notes', 'comment', 'comments', 'remarks', 'description'],  field: 'notes'          },
  { keywords: ['status', 'stage', 'lead status'],                                   field: 'status'         },
  { keywords: ['agent', 'assigned', 'owner', 'salesperson', 'rep'],                field: 'assigned_agent' },
]

/** Maximum rows allowed per import */
export const MAX_IMPORT_ROWS = 2000

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parses a CSV string into headers, rows, and a suggested column mapping.
 * Does NOT use papaparse to avoid a dependency — handles the common cases
 * correctly: quoted fields, commas inside quotes, CRLF and LF line endings.
 */
export function parseCsv(text: string): ParsedCsvResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nonEmpty = lines.filter(l => l.trim().length > 0)

  if (nonEmpty.length < 2) {
    return { headers: [], rows: [], suggestedMapping: {} }
  }

  const headers = splitCsvRow(nonEmpty[0]).map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = splitCsvRow(nonEmpty[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim()
    })
    rows.push(row)
  }

  const suggestedMapping = buildSuggestedMapping(headers)

  return { headers, rows, suggestedMapping }
}

/** Splits a single CSV row respecting double-quoted fields */
function splitCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Auto-detects likely field mapping from header names */
function buildSuggestedMapping(headers: string[]): ColumnMap {
  const mapping: ColumnMap = {}
  const usedFields = new Set<CsvFieldMapping>()

  for (const header of headers) {
    const lc = header.toLowerCase()
    let matched: CsvFieldMapping = 'skip'

    for (const rule of HEADER_AUTO_MAP) {
      if (rule.keywords.some(k => lc.includes(k))) {
        if (!usedFields.has(rule.field)) {
          matched = rule.field
          usedFields.add(rule.field)
        }
        break
      }
    }

    mapping[header] = matched
  }

  return mapping
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/** Strips formatting from phone numbers, preserves leading + */
export function normalisePhone(raw: string): string {
  if (!raw) return ''
  const stripped = raw.replace(/[\s\-().]/g, '')
  // If purely numeric and 10 digits starting with 6-9 → assume Indian mobile
  if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}`
  return stripped
}

/** Normalises email to lowercase, validates basic format */
export function normaliseEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  return trimmed.includes('@') ? trimmed : null
}

/** Maps a raw status string to a valid LeadStatus, defaults to 'new' */
export function normaliseStatus(raw: string): LeadStatus {
  const lc = raw.trim().toLowerCase()
  return (VALID_STATUSES.find(s => s === lc) ?? 'new') as LeadStatus
}

/** Maps a raw source string to a known source value, defaults to 'other' */
export function normaliseSource(raw: string): string {
  const lc = raw.trim().toLowerCase()
  return KNOWN_SOURCES.find(s => lc.includes(s)) ?? (raw.trim() || 'manual')
}

// ─── Row extraction ───────────────────────────────────────────────────────────

interface ExtractedRow {
  name:            string
  phone:           string
  email:           string | null
  source:          string
  notes:           string
  status:          LeadStatus
  assigned_agent:  string   // raw name from CSV — resolved to UUID later
}

export function extractRow(
  row:     Record<string, string>,
  mapping: ColumnMap,
): ExtractedRow {
  const get = (field: CsvFieldMapping): string => {
    const header = Object.entries(mapping).find(([, f]) => f === field)?.[0]
    return header ? (row[header] ?? '') : ''
  }

  return {
    name:           get('name').trim(),
    phone:          normalisePhone(get('phone')),
    email:          normaliseEmail(get('email')),
    source:         normaliseSource(get('source')),
    notes:          get('notes').trim(),
    status:         normaliseStatus(get('status')),
    assigned_agent: get('assigned_agent').trim(),
  }
}

// ─── Agent resolution ─────────────────────────────────────────────────────────

/** Builds a lookup map: lowercase full_name → profile.id */
export function buildAgentMap(agents: Profile[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const agent of agents) {
    if (agent.full_name) {
      map.set(agent.full_name.toLowerCase(), agent.id)
    }
  }
  return map
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

interface DuplicateCheckResult {
  isDuplicate: boolean
  reason:      string
}

/**
 * Checks phone and email against:
 *  1. In-file Sets (catches duplicates within the same CSV)
 *  2. Database (catches duplicates already in the tenant's leads)
 */
export async function checkDuplicate(
  phone:        string,
  email:        string | null,
  tenantId:     string,
  seenPhones:   Set<string>,
  seenEmails:   Set<string>,
): Promise<DuplicateCheckResult> {
  // ── In-file phone check ─────────────────────────────────────────────────────
  if (phone && seenPhones.has(phone)) {
    return { isDuplicate: true, reason: `Duplicate phone in file: ${phone}` }
  }

  // ── In-file email check ─────────────────────────────────────────────────────
  if (email && seenEmails.has(email)) {
    return { isDuplicate: true, reason: `Duplicate email in file: ${email}` }
  }

  // ── Database phone check ────────────────────────────────────────────────────
  if (phone) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle()

    if (data) {
      return { isDuplicate: true, reason: `Phone already exists: ${phone}` }
    }
  }

  // ── Database email check ────────────────────────────────────────────────────
  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (data) {
      return { isDuplicate: true, reason: `Email already exists: ${email}` }
    }
  }

  return { isDuplicate: false, reason: '' }
}

// ─── Main import function ─────────────────────────────────────────────────────

export interface RunImportOptions {
  rows:      Record<string, string>[]
  mapping:   ColumnMap
  tenantId:  string
  agents:    Profile[]
  /** Called after each row is processed */
  onProgress: (progress: ImportProgress) => void
  /** Checked before each batch — set to true to cancel */
  cancelled:  { current: boolean }
}

export async function runImport(opts: RunImportOptions): Promise<ImportResult> {
  const { rows, mapping, tenantId, agents, onProgress, cancelled } = opts

  const agentMap  = buildAgentMap(agents)
  const seenPhones = new Set<string>()
  const seenEmails = new Set<string>()

  const errors: RowError[] = []
  let imported = 0
  let skipped  = 0

  const total = Math.min(rows.length, MAX_IMPORT_ROWS)

  // Process rows in batches of 10 for browser responsiveness
  const BATCH = 10

  for (let batchStart = 0; batchStart < total; batchStart += BATCH) {
    if (cancelled.current) break

    const chunk = rows.slice(batchStart, batchStart + BATCH)

    // Process each row in the batch sequentially within the batch
    // (parallel DB duplicate checks would race on in-file duplicates)
    for (let i = 0; i < chunk.length; i++) {
      const rowIndex = batchStart + i
      if (cancelled.current) break

      const rawRow = chunk[i]
      const extracted = extractRow(rawRow, mapping)

      // ── Validation ──────────────────────────────────────────────────────────
      if (!extracted.name) {
        errors.push({
          rowNumber: rowIndex + 2, // +2: 1 for header, 1 for 0-index
          name:      '(empty)',
          phone:     extracted.phone,
          email:     extracted.email ?? '',
          reason:    'Name is required',
        })
        onProgress({ processed: rowIndex + 1, total, imported, skipped, failed: errors.length })
        continue
      }

      if (extracted.email !== null && !extracted.email.includes('@')) {
        errors.push({
          rowNumber: rowIndex + 2,
          name:      extracted.name,
          phone:     extracted.phone,
          email:     extracted.email,
          reason:    'Invalid email format',
        })
        onProgress({ processed: rowIndex + 1, total, imported, skipped, failed: errors.length })
        continue
      }

      // ── Duplicate check ─────────────────────────────────────────────────────
      const dupCheck = await checkDuplicate(
        extracted.phone,
        extracted.email,
        tenantId,
        seenPhones,
        seenEmails,
      )

      if (dupCheck.isDuplicate) {
        skipped++
        errors.push({
          rowNumber: rowIndex + 2,
          name:      extracted.name,
          phone:     extracted.phone,
          email:     extracted.email ?? '',
          reason:    dupCheck.reason,
        })
        onProgress({ processed: rowIndex + 1, total, imported, skipped, failed: errors.length })
        continue
      }

      // ── Resolve agent ───────────────────────────────────────────────────────
      const agentId = extracted.assigned_agent
        ? (agentMap.get(extracted.assigned_agent.toLowerCase()) ?? null)
        : null

      // ── Insert ──────────────────────────────────────────────────────────────
      try {
        await createLead({
          tenant_id:         tenantId,
          name:              extracted.name,
          phone:             extracted.phone,
          email:             extracted.email ?? '',
          whatsapp:          '',
          status:            extracted.status,
          source:            extracted.source,
          notes:             extracted.notes,
          assigned_agent_id: agentId,
          pipeline_stage_id: null,
          followup_date:     null,
        })

        // Register in in-file Sets after successful insert
        if (extracted.phone) seenPhones.add(extracted.phone)
        if (extracted.email) seenEmails.add(extracted.email)

        imported++
      } catch (err) {
        errors.push({
          rowNumber: rowIndex + 2,
          name:      extracted.name,
          phone:     extracted.phone,
          email:     extracted.email ?? '',
          reason:    err instanceof Error ? err.message : 'Insert failed',
        })
      }

      onProgress({ processed: rowIndex + 1, total, imported, skipped, failed: errors.length })
    }

    // Yield to the browser event loop between batches so the UI updates
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return { imported, skipped, errors }
}

// ─── Error report CSV ─────────────────────────────────────────────────────────

/** Generates a downloadable CSV string from the error list */
export function buildErrorReportCsv(errors: RowError[]): string {
  const header = 'Row,Name,Phone,Email,Reason'
  const lines  = errors.map(e =>
    [e.rowNumber, `"${e.name}"`, `"${e.phone}"`, `"${e.email}"`, `"${e.reason}"`].join(',')
  )
  return [header, ...lines].join('\n')
}

/** Triggers a browser download of the error report */
export function downloadErrorReport(errors: RowError[]): void {
  const csv  = buildErrorReportCsv(errors)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Sample CSV ───────────────────────────────────────────────────────────────

export const SAMPLE_CSV = `Name,Phone,Email,Source,Status,Notes,Agent
John Smith,+919876543210,john@example.com,Facebook,new,Interested in premium plan,
Priya Sharma,+919123456789,,Google,contacted,,
Raj Kumar,+918765432109,raj@example.com,WhatsApp,qualified,Budget confirmed,
`

export function downloadSampleCsv(): void {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'leadpilot-import-sample.csv'
  a.click()
  URL.revokeObjectURL(url)
}
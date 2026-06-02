import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAgents } from '../../hooks/useAgents'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  parseCsv,
  runImport,
  downloadErrorReport,
  downloadSampleCsv,
  MAX_IMPORT_ROWS,
  type CsvFieldMapping,
  type ColumnMap,
  type ImportProgress,
  type ImportResult,
} from '../../lib/services/import.service'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'importing' | 'done'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_OPTIONS: { value: CsvFieldMapping; label: string }[] = [
  { value: 'skip',           label: 'Skip'           },
  { value: 'name',           label: 'Name'           },
  { value: 'phone',          label: 'Phone'          },
  { value: 'email',          label: 'Email'          },
  { value: 'source',         label: 'Source'         },
  { value: 'notes',          label: 'Notes'          },
  { value: 'status',         label: 'Status'         },
  { value: 'assigned_agent', label: 'Assigned Agent' },
]

const selectCls = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step | 'importing'; label: string }[] = [
    { key: 'upload',    label: 'Upload'  },
    { key: 'map',       label: 'Map'     },
    { key: 'importing', label: 'Import'  },
  ]
  const active = step === 'done' ? 2 : steps.findIndex(s => s.key === step)

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={[
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
              i < active  ? 'bg-indigo-100 text-indigo-600'  :
              i === active ? 'bg-indigo-600 text-white'        :
                             'bg-gray-800 text-gray-500',
            ].join(' ')}>
              {i < active ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === active ? 'text-indigo-400' : 'text-gray-500'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 ${i < active ? 'bg-indigo-400' : 'bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

interface UploadStepProps {
  onParsed: (
    headers: string[],
    rows:    Record<string, string>[],
    mapping: ColumnMap,
  ) => void
}

function UploadStep({ onParsed }: UploadStepProps) {
  const [dragging,  setDragging]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [fileName,  setFileName]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    setError(null)

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a .csv file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5 MB.')
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows, suggestedMapping } = parseCsv(text)

      if (headers.length === 0) {
        setError('Could not detect any columns. Make sure the file has a header row.')
        return
      }
      if (rows.length === 0) {
        setError('The file has no data rows.')
        return
      }
      if (rows.length > MAX_IMPORT_ROWS) {
        setError(`File has ${rows.length} rows. Maximum is ${MAX_IMPORT_ROWS}. Please split the file.`)
        return
      }

      onParsed(headers, rows, suggestedMapping)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-3',
          'rounded-2xl border-2 border-dashed px-6 py-14 transition',
          dragging
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-gray-700 bg-gray-900 hover:border-gray-600',
        ].join(' ')}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">
            {fileName ?? 'Drop your CSV file here'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            or click to browse — .csv only, max 5 MB, max {MAX_IMPORT_ROWS} rows
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Sample CSV download */}
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">Not sure about the format?</p>
          <p className="text-xs text-gray-500">Download our sample CSV to see the expected columns.</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); downloadSampleCsv() }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Sample CSV
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Column mapping ───────────────────────────────────────────────────

interface MapStepProps {
  headers:    string[]
  rows:       Record<string, string>[]
  mapping:    ColumnMap
  onMappingChange: (mapping: ColumnMap) => void
  onBack:     () => void
  onProceed:  () => void
}

function MapStep({ headers, rows, mapping, onMappingChange, onBack, onProceed }: MapStepProps) {
  const preview = rows.slice(0, 3)
  const hasName = Object.values(mapping).includes('name')

  const handleChange = (header: string, value: CsvFieldMapping) => {
    // If the user picks a field that's already mapped elsewhere, swap to 'skip'
    const existing = Object.entries(mapping).find(
      ([h, f]) => h !== header && f === value && value !== 'skip'
    )
    const next = { ...mapping, [header]: value }
    if (existing) next[existing[0]] = 'skip'
    onMappingChange(next)
  }

  return (
    <div className="space-y-5">
      {/* Mapping table */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Map columns</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Match each CSV column to a lead field. At minimum, <span className="text-white">Name</span> must be mapped.
          </p>
        </div>
        <div className="divide-y divide-gray-800">
          {headers.map(header => (
            <div key={header} className="flex items-center gap-4 px-5 py-3">
              {/* CSV header */}
              <div className="w-40 shrink-0">
                <p className="text-sm font-medium text-white truncate">{header}</p>
                <p className="text-xs text-gray-600 truncate">
                  {preview[0]?.[header] ?? '—'}
                </p>
              </div>
              {/* Arrow */}
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {/* Field selector */}
              <select
                value={mapping[header] ?? 'skip'}
                onChange={e => handleChange(header, e.target.value as CsvFieldMapping)}
                className={`flex-1 ${selectCls}`}
              >
                {FIELD_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="border-b border-gray-800 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Preview (first {preview.length} rows)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {headers.map(h => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-800/30">
                    {headers.map(h => (
                      <td key={h} className="px-4 py-2 text-gray-300 whitespace-nowrap max-w-32 truncate">
                        {row[h] || <span className="text-gray-700">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasName && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          Map at least one column to <strong>Name</strong> before proceeding.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
        >
          Back
        </button>
        <button
          onClick={onProceed}
          disabled={!hasName}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start import ({rows.length} rows)
        </button>
      </div>
    </div>
  )
}

// ─── Step 3a: Importing (progress) ────────────────────────────────────────────

function ImportingStep({ progress, onCancel }: { progress: ImportProgress; onCancel: () => void }) {
  const pct = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20">
          <svg width="24" height="24" className="animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-white">Importing leads…</p>
        <p className="mt-1 text-xs text-gray-500">
          {progress.processed} of {progress.total} rows processed
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-gray-500">
          <span>{pct}%</span>
          <span>{progress.imported} imported · {progress.skipped} skipped · {progress.failed} failed</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        onClick={onCancel}
        className="w-full rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white"
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Step 3b: Done (results) ──────────────────────────────────────────────────

function DoneStep({
  result,
  totalRows,
  onImportMore,
  onGoToLeads,
}: {
  result:       ImportResult
  totalRows:    number
  onImportMore: () => void
  onGoToLeads:  () => void
}) {
  const duplicateErrors = result.errors.filter(e =>
    e.reason.startsWith('Duplicate') || e.reason.startsWith('Phone already') || e.reason.startsWith('Email already')
  )
  const failedErrors = result.errors.filter(e =>
    !e.reason.startsWith('Duplicate') && !e.reason.startsWith('Phone already') && !e.reason.startsWith('Email already')
  )

  return (
    <div className="space-y-4">

      {/* Summary card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-white">Import complete</h2>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-emerald-500/10 px-4 py-4">
            <dd className="text-2xl font-bold text-emerald-400">{result.imported}</dd>
            <dt className="mt-1 text-xs text-emerald-600">Imported</dt>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-4 py-4">
            <dd className="text-2xl font-bold text-amber-400">{result.skipped}</dd>
            <dt className="mt-1 text-xs text-amber-600">Skipped (duplicate)</dt>
          </div>
          <div className="rounded-xl bg-rose-500/10 px-4 py-4">
            <dd className="text-2xl font-bold text-rose-400">{failedErrors.length}</dd>
            <dt className="mt-1 text-xs text-rose-600">Failed</dt>
          </div>
        </dl>
      </div>

      {/* Error list */}
      {result.errors.length > 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h3 className="text-sm font-semibold text-white">
              Issues ({result.errors.length})
            </h3>
            <button
              onClick={() => downloadErrorReport(result.errors)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download error report
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-800">
            {result.errors.slice(0, 100).map((err, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 shrink-0 text-xs text-gray-600">Row {err.rowNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{err.name || '(no name)'}</p>
                  <p className="text-xs text-rose-400">{err.reason}</p>
                </div>
              </div>
            ))}
            {result.errors.length > 100 && (
              <div className="px-5 py-3 text-xs text-gray-500">
                … and {result.errors.length - 100} more. Download the error report to see all.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onImportMore}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
        >
          Import another file
        </button>
        <button
          onClick={onGoToLeads}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Go to leads
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ImportLeadsPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const tenantId    = profile?.tenant_id ?? null

  const { agents } = useAgents(tenantId)

  // ── Step state ────────────────────────────────────────────────────────────
  const [step,     setStep]     = useState<Step>('upload')
  const [headers,  setHeaders]  = useState<string[]>([])
  const [rows,     setRows]     = useState<Record<string, string>[]>([])
  const [mapping,  setMapping]  = useState<ColumnMap>({})
  const [progress, setProgress] = useState<ImportProgress>({ processed: 0, total: 0, imported: 0, skipped: 0, failed: 0 })
  const [result,   setResult]   = useState<ImportResult | null>(null)

  const cancelled = useRef({ current: false })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleParsed = useCallback((
    h: string[],
    r: Record<string, string>[],
    m: ColumnMap,
  ) => {
    setHeaders(h)
    setRows(r)
    setMapping(m)
    setStep('map')
  }, [])

  const handleStartImport = async () => {
    if (!tenantId) return

    cancelled.current = { current: false }
    setProgress({ processed: 0, total: rows.length, imported: 0, skipped: 0, failed: 0 })
    setStep('importing')

    const importResult = await runImport({
      rows,
      mapping,
      tenantId,
      agents,
      onProgress: setProgress,
      cancelled:  cancelled.current,
    })

    setResult(importResult)
    setStep('done')
  }

  const handleCancel = () => {
    cancelled.current.current = true
  }

  const handleReset = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setMapping({})
    setResult(null)
    cancelled.current = { current: false }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Import leads</h1>
            <p className="text-sm text-gray-500">Upload a CSV file to bulk-import leads into LeadPilot.</p>
          </div>
        </div>

        {/* Step indicator (hidden on done) */}
        {step !== 'done' && <StepIndicator step={step} />}

        {/* Step content */}
        {step === 'upload' && (
          <UploadStep onParsed={handleParsed} />
        )}

        {step === 'map' && (
          <MapStep
            headers={headers}
            rows={rows}
            mapping={mapping}
            onMappingChange={setMapping}
            onBack={() => setStep('upload')}
            onProceed={handleStartImport}
          />
        )}

        {step === 'importing' && (
          <ImportingStep
            progress={progress}
            onCancel={handleCancel}
          />
        )}

        {step === 'done' && result && (
          <DoneStep
            result={result}
            totalRows={rows.length}
            onImportMore={handleReset}
            onGoToLeads={() => navigate('/leads')}
          />
        )}

      </div>
    </AppLayout>
  )
}
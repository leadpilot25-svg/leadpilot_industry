import type { BusinessType } from '../../../types/tenant'
import { PIPELINE_SEEDS } from '../../../lib/services/pipelineSeeds'

interface IndustryStepProps {
  businessType: BusinessType
  companyName: string
  onConfirm: () => void
  onBack: () => void
  saving: boolean
  error: string | null
}

const INDUSTRY_META: Record<BusinessType, { label: string; icon: string; description: string }> = {
  real_estate:  { label: 'Real Estate',       icon: '🏠', description: 'Property sales & rentals'     },
  insurance:    { label: 'Insurance',          icon: '🛡️', description: 'Policies & renewals'           },
  travel:       { label: 'Travel Agency',      icon: '✈️', description: 'Bookings & itineraries'        },
  tarot:        { label: 'Tarot & Healing',    icon: '🔮', description: 'Sessions & repeat clients'     },
  coach:        { label: 'Coaching',           icon: '🎯', description: 'Discovery to completion'       },
  education:    { label: 'Education',          icon: '🎓', description: 'Admissions & enrolments'       },
  taxi:         { label: 'Taxi & Transport',   icon: '🚕', description: 'Bookings & fleet management'   },
  marketing:    { label: 'Marketing Agency',   icon: '📣', description: 'Campaigns & retainer clients'  },
  general:      { label: 'General Business',   icon: '💼', description: 'Any product or service'        },
  custom:       { label: 'Custom',             icon: '⚙️', description: 'Your own workflow'              },
}

export function IndustryStep({
  businessType,
  companyName,
  onConfirm,
  onBack,
  saving,
  error,
}: IndustryStepProps) {
  const meta   = INDUSTRY_META[businessType]
  const seed   = PIPELINE_SEEDS[businessType]
  const stages = seed.stages

  return (
    <div className="space-y-6">

      {/* Selected industry summary */}
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
        <span className="text-2xl" role="img" aria-label={meta.label}>{meta.icon}</span>
        <div>
          <p className="text-sm font-semibold text-indigo-900">{meta.label}</p>
          <p className="text-xs text-indigo-600">{meta.description}</p>
        </div>
      </div>

      {/* Pipeline preview */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">
          Pipeline stages that will be created for{' '}
          <span className="font-semibold text-gray-900">{companyName || 'your workspace'}</span>:
        </p>

        <ol className="space-y-2">
          {stages.map((stage, index) => (
            <li key={stage.name} className="flex items-center gap-3">
              {/* Stage number */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                {index + 1}
              </span>
              {/* Colour dot */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              {/* Stage name */}
              <span className="text-sm text-gray-700">{stage.name}</span>
            </li>
          ))}
        </ol>

        <p className="mt-3 text-xs text-gray-400">
          You can add, rename, reorder, or delete stages after setup.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Setting up…
            </>
          ) : (
            <>
              Get started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>

    </div>
  )
}

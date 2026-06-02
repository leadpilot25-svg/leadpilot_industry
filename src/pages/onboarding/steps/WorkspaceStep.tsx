import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import type { BusinessType } from '../../../types/tenant'

export interface WorkspaceFormData {
  companyName: string
  businessType: BusinessType
  whatsappNumber: string
  logoFile: File | null
  logoPreviewUrl: string | null
}

interface WorkspaceStepProps {
  onNext: (data: WorkspaceFormData) => void
}

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'real_estate',  label: 'Real Estate'       },
  { value: 'insurance',    label: 'Insurance'          },
  { value: 'travel',       label: 'Travel Agency'      },
  { value: 'tarot',        label: 'Tarot & Healing'    },
  { value: 'coach',        label: 'Coaching'           },
  { value: 'education',    label: 'Education'          },
  { value: 'taxi',         label: 'Taxi & Transport'   },
  { value: 'marketing',    label: 'Marketing Agency'   },
  { value: 'general',      label: 'General Business'   },
  { value: 'custom',       label: 'Custom / Other'     },
]

export function WorkspaceStep({ onNext }: WorkspaceStepProps) {
  const [companyName,     setCompanyName]     = useState('')
  const [businessType,    setBusinessType]    = useState<BusinessType>('custom')
  const [whatsappNumber,  setWhatsappNumber]  = useState('')
  const [logoFile,        setLogoFile]        = useState<File | null>(null)
  const [logoPreviewUrl,  setLogoPreviewUrl]  = useState<string | null>(null)
  const [logoError,       setLogoError]       = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setLogoError('Please upload a PNG, JPG, WebP, or SVG file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2 MB.')
      return
    }

    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onNext({ companyName, businessType, whatsappNumber, logoFile, logoPreviewUrl })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* Company name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Company name <span className="text-red-500">*</span>
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="Acme Realty Pvt Ltd"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Business type */}
      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
          Business type <span className="text-red-500">*</span>
        </label>
        <select
          id="businessType"
          value={businessType}
          onChange={e => setBusinessType(e.target.value as BusinessType)}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {BUSINESS_TYPES.map(bt => (
            <option key={bt.value} value={bt.value}>{bt.label}</option>
          ))}
        </select>
      </div>

      {/* WhatsApp number */}
      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
          WhatsApp number
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <div className="mt-1 flex rounded-lg shadow-sm">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
            +
          </span>
          <input
            id="whatsapp"
            type="tel"
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            placeholder="91 98765 43210"
            className="block w-full rounded-r-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Company logo
          <span className="ml-1 text-xs font-normal text-gray-400">(optional, max 2 MB)</span>
        </label>

        <div className="mt-1 flex items-center gap-4">
          {/* Preview */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden">
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 10.5h.008v.008H13.5V10.5z" />
              </svg>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {logoFile ? 'Change logo' : 'Upload logo'}
            </button>
            {logoFile && (
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreviewUrl(null) }}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoChange}
            className="hidden"
          />
        </div>

        {logoError && (
          <p className="mt-1.5 text-xs text-red-600">{logoError}</p>
        )}
      </div>

      {/* Next */}
      <button
        type="submit"
        disabled={!companyName.trim()}
        className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
        <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>

    </form>
  )
}

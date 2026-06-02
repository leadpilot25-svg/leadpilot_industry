import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabaseConfigured } from '../../lib/supabase'
import { completeOnboarding, uploadLogo } from '../../lib/services/onboarding.service'
import { WorkspaceStep, type WorkspaceFormData } from './steps/WorkspaceStep'
import { IndustryStep } from './steps/IndustryStep'
import type { BusinessType } from '../../types/tenant'

type Step = 1 | 2

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Workspace' },
    { n: 2, label: 'Pipeline'  },
  ] as const

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                current === s.n
                  ? 'bg-indigo-600 text-white'
                  : current > s.n
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-400',
              ].join(' ')}
            >
              {current > s.n ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span className={`text-xs font-medium ${current === s.n ? 'text-indigo-600' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 ${current > s.n ? 'bg-indigo-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step,      setStep]      = useState<Step>(1)
  const [formData,  setFormData]  = useState<WorkspaceFormData | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-sm font-medium text-amber-800">
            Supabase is not configured. Add your credentials to{' '}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">.env.local</code>{' '}
            and restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  const handleWorkspaceNext = (data: WorkspaceFormData) => {
    setFormData(data)
    setStep(2)
  }

  const handleConfirm = async () => {
    if (!formData) return

    setSaving(true)
    setSaveError(null)

    try {
      let logoUrl: string | null = null
      if (formData.logoFile) {
        logoUrl = await uploadLogo(formData.logoFile, user.id)
      }

      await completeOnboarding({
        userId:         user.id,
        profileId:      profile.id,
        companyName:    formData.companyName,
        businessType:   formData.businessType as BusinessType,
        whatsappNumber: formData.whatsappNumber,
        logoUrl,
      })

      await refreshProfile(user.id)

      navigate('/dashboard', { replace: true })

    } catch (err) {
      // Show the EXACT error message — not a generic fallback
      const message = err instanceof Error ? err.message : String(err)
      console.error('[OnboardingPage] handleConfirm caught error:', message)
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-indigo-600">Lead</span>
            <span className="text-gray-900">Pilot</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">Let's set up your workspace</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm space-y-6">

          <div className="flex justify-center">
            <StepIndicator current={step} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {step === 1 ? 'Create your workspace' : 'Confirm your pipeline'}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {step === 1
                ? 'Tell us about your business to get started.'
                : 'These stages will be created automatically. You can edit them later.'}
            </p>
          </div>

          {step === 1 && (
            <WorkspaceStep onNext={handleWorkspaceNext} />
          )}

          {step === 2 && formData && (
            <IndustryStep
              businessType={formData.businessType as BusinessType}
              companyName={formData.companyName}
              onConfirm={handleConfirm}
              onBack={() => { setSaveError(null); setStep(1) }}
              saving={saving}
              error={saveError}
            />
          )}

        </div>

      </div>
    </div>
  )
}

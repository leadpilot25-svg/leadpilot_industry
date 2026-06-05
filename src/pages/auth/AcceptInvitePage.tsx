import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '../../components/Logo'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type PageState = 'validating' | 'set_password' | 'invalid' | 'done'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate        = useNavigate()
  const token           = searchParams.get('token')

  const [state,      setState]      = useState<PageState>('validating')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Just validate the token exists and is pending — do NOT mark accepted yet.
  // Acceptance happens atomically in accept_invitation RPC after password is set.
  useEffect(() => {
    if (!token) { setState('invalid'); return }

    supabase
      .from('invitations')
      .select('id, status, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setState('invalid'); return }
        setState('set_password')
      })
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Set the user's password (they are already authenticated via magic link)
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Step 2: Ensure profile row exists and is linked to the tenant.
      //
      // Why this is necessary: signInWithOtp with shouldCreateUser:true only
      // fires handle_new_user if the email did NOT already exist in auth.users.
      // If the email existed (e.g. from a previous signup attempt, password reset,
      // or a prior invitation), the trigger never fires and no profiles row is created.
      //
      // ensure_profile_and_accept_invitation:
      //   1. Upserts the profiles row if missing
      //   2. Links profile.tenant_id from the invitation
      //   3. Marks invitation accepted — all atomically.
      const { data: { user } } = await supabase.auth.getUser()
      if (user && token) {
        const { data: result } = await supabase.rpc('ensure_profile_and_accept_invitation', {
          p_user_id: user.id,
          p_token:   token,
        })
        if (result && !result.success) {
          // Surface the error — this is not recoverable silently
          throw new Error(`Account activation failed: ${result.error}`)
        }
      }

      setState('done')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'validating') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
            <svg className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-base font-semibold text-white">Invitation not valid</p>
          <p className="text-sm text-gray-500">
            This link may have expired or already been used. Ask your admin to send a new invite.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 px-4">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Account activated. Redirecting…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center">
          <div className="flex justify-center mb-2">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lead<span className="text-emerald-500">Pilot</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Set your password to activate your account</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Activating…' : 'Activate account'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
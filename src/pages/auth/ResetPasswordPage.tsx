import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../../lib/supabase'

type PageState = 'waiting' | 'ready' | 'saving' | 'done' | 'invalid'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [state,    setState]    = useState<PageState>('waiting')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return

    // Supabase puts the access token in the URL hash when the user
    // clicks the reset link. onAuthStateChange fires PASSWORD_RECOVERY
    // once the client has parsed the hash and established a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setState('ready')
        }
        // If SIGNED_IN fires without PASSWORD_RECOVERY and we are still
        // waiting, the link was invalid or already used.
      },
    )

    // Safety: if the hash token is malformed or missing, nothing fires.
    // After 6 seconds without a PASSWORD_RECOVERY event, show invalid state.
    const timer = setTimeout(() => {
      setState(prev => prev === 'waiting' ? 'invalid' : prev)
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setState('saving')

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setState('ready')
      return
    }

    setState('done')
    setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
  }

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-500">Supabase is not configured.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-indigo-600">Lead</span>
            <span className="text-gray-900">Pilot</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">Set a new password</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">

          {/* Waiting for PASSWORD_RECOVERY event */}
          {state === 'waiting' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="text-sm text-gray-500">Verifying reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {state === 'invalid' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Link expired or invalid</p>
                <p className="mt-1 text-sm text-gray-500">
                  This reset link may have expired or already been used.
                </p>
              </div>
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Request a new reset link
              </button>
            </div>
          )}

          {/* Password form */}
          {(state === 'ready' || state === 'saving') && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={state === 'saving'}
                  placeholder="At least 8 characters"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  disabled={state === 'saving'}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state === 'saving' || !password || !confirm}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'saving' && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {state === 'saving' ? 'Saving…' : 'Set new password'}
              </button>

            </form>
          )}

          {/* Success */}
          {state === 'done' && (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Password updated</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard…</p>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
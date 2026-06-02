import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function AdminPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
          <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">Super Admin</h2>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as{' '}
            <span className="font-medium text-gray-700">
              {profile?.full_name ?? 'super admin'}
            </span>
          </p>
        </div>

        <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3">
          <p className="text-xs text-purple-700">
            Super admin module — coming soon
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

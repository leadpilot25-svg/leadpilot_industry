import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAgents } from '../../hooks/useAgents'
import { supabase } from '../../lib/supabase'
import { AppLayout } from '../../components/layout/AppLayout'
import type { Profile, Role } from '../../types/auth'

// ─── Role badge ───────────────────────────────────────────────────────────────

const roleBg: Record<Role, string> = {
  super_admin:  'bg-purple-500/20',
  client_admin: 'bg-emerald-500/20',
  agent:        'bg-gray-500/20',
}
const roleText: Record<Role, string> = {
  super_admin:  'text-purple-400',
  client_admin: 'text-emerald-600',
  agent:        'text-gray-400',
}
const roleLabel: Record<Role, string> = {
  super_admin:  'Super Admin',
  client_admin: 'Admin',
  agent:        'Agent',
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBg[role]} ${roleText[role]}`}>
      {roleLabel[role]}
    </span>
  )
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  tenantId:  string
  profileId: string
  onClose:   () => void
  onSuccess: () => void
}

function InviteModal({ tenantId, profileId, onClose, onSuccess }: InviteModalProps) {
  const [email,      setEmail]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const token     = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Record the invitation
      const { error: invErr } = await supabase
        .from('invitations')
        .insert({
          tenant_id:      tenantId,
          invited_by:     profileId,
          email:          email.trim().toLowerCase(),
          role:           'agent',
          token,
          status:         'pending',
          email_provider: 'supabase',
          expires_at:     expiresAt,
        })

      if (invErr) throw new Error(`Could not record invitation: ${invErr.message}`)

      // 2. Send invite email via Supabase built-in
      // Note: supabase.auth.signInWithOtp sends a magic link which the invited
      // user can use to set their password. This is the browser-safe approach —
      // supabase.auth.admin.inviteUserByEmail requires a service role key which
      // must never be exposed in browser code.
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/accept-invite?token=${token}`,
          data: {
            tenant_id:        tenantId,
            role:             'agent',
            invitation_token: token,
          },
          shouldCreateUser: true,
        },
      })

      if (otpErr) throw new Error(`Could not send invite email: ${otpErr.message}`)

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6">

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Invite agent</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-50 hover:text-white"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-medium text-gray-400 mb-1">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agent@company.com"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3">
            <p className="text-xs text-gray-400">
              The agent will receive an email with a magic link to set their password and join your workspace as an <span className="font-medium text-white">Agent</span>.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const { profile, isRole } = useAuth()
  const tenantId = profile?.tenant_id ?? null

  const { agents, loading, error, refetch } = useAgents(tenantId)

  const [showInvite,  setShowInvite]  = useState(false)
  const [disabling,   setDisabling]   = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)

  const canManage = isRole('super_admin', 'client_admin')

  const handleDisable = async (agent: Profile) => {
    if (!window.confirm(`Disable ${agent.full_name ?? agent.user_id}? They will no longer be able to sign in.`)) return

    setDisabling(agent.id)
    setActionError(null)

    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', agent.id)
      .eq('tenant_id', tenantId!)

    setDisabling(null)

    if (err) {
      setActionError(`Failed to disable agent: ${err.message}`)
    } else {
      setSuccessMsg(`${agent.full_name ?? 'Agent'} has been disabled.`)
      refetch()
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleInviteSuccess = () => {
    setShowInvite(false)
    setSuccessMsg('Invite sent successfully. The agent will receive an email shortly.')
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Agents</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {loading ? '…' : `${agents.length} member${agents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Invite agent
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {successMsg}
          </div>
        )}

        {(error || actionError) && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error ?? actionError}
          </div>
        )}

        {/* Agents table */}
        <div className="rounded-2xl border border-gray-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Role', 'Status', 'Joined', canManage ? 'Actions' : ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">

                {/* Loading */}
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {[50, 25, 20, 30, 20].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-50" style={{ width: `${w}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Empty */}
                {!loading && agents.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-4 py-16 text-center">
                      <p className="text-sm text-gray-500">No team members yet.</p>
                      {canManage && (
                        <p className="mt-1 text-xs text-gray-600">
                          Invite your first agent using the button above.
                        </p>
                      )}
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!loading && agents.map(agent => (
                  <tr key={agent.id} className="transition-colors hover:bg-gray-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar initial */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-600">
                          {(agent.full_name ?? agent.user_id).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {agent.full_name ?? <span className="text-gray-500">No name set</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={agent.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${agent.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${agent.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        {agent.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(agent.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {/* Don't show disable button for yourself or already disabled agents */}
                        {agent.is_active && agent.user_id !== profile?.user_id && (
                          <button
                            onClick={() => handleDisable(agent)}
                            disabled={disabling === agent.id}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                          >
                            {disabling === agent.id ? 'Disabling…' : 'Disable'}
                          </button>
                        )}
                        {!agent.is_active && (
                          <span className="text-xs text-gray-600">Disabled</span>
                        )}
                        {agent.user_id === profile?.user_id && (
                          <span className="text-xs text-gray-600">You</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Invite modal */}
      {showInvite && profile && tenantId && (
        <InviteModal
          tenantId={tenantId}
          profileId={profile.id}
          onClose={() => setShowInvite(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

    </AppLayout>
  )
}
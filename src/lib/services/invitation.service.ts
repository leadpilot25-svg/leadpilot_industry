import { supabase } from '../supabase'
import type { Role } from '../../types/auth'

export interface CreateInvitationParams {
  email:        string
  role:         Role
  tenantId:     string
  invitedBy:    string
  name?:        string
  companyName?: string
}

/**
 * Creates an invitation record and sends the invitation email.
 *
 * Strategy: try Edge Function (admin.inviteUserByEmail, no rate limit) first.
 * If not deployed, fall back to signInWithOtp — this works when Supabase SMTP
 * is configured, as confirmed by password-reset emails delivering.
 */
export async function createInvitation({
  email,
  role,
  tenantId,
  invitedBy,
  name = '',
  companyName = '',
}: CreateInvitationParams) {
  const token     = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const acceptUrl = `${window.location.origin}/auth/accept-invite?token=${token}`

  // 1. Insert invitation row
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id:      tenantId,
      invited_by:     invitedBy,
      email,
      role,
      token,
      status:         'pending',
      email_provider: 'supabase',
      expires_at:     expiresAt,
    })
    .select()
    .single()

  if (error) throw error

  // 2. Send invitation email — Edge Function first, OTP fallback
  let emailSent = false

  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'send-invitation',
      { body: { email, token, tenant_id: tenantId, role, admin_name: name, company_name: companyName } }
    )
    const fnResult = fnData as { success?: boolean } | null
    if (!fnError && fnResult?.success) emailSent = true
  } catch { /* Edge Function not deployed */ }

  if (!emailSent) {
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: acceptUrl,
        shouldCreateUser: true,
        data: { tenant_id: tenantId, role, invitation_token: token },
      },
    })
    if (otpErr) {
      throw new Error(
        `Invitation recorded but email could not be sent: ${otpErr.message}. ` +
        `Manual link: ${acceptUrl}`
      )
    }
  }

  return data
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)

  if (error) throw error
}

export async function acceptInvitation(token: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) throw new Error('Invitation not found or expired.')

  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', data.id)

  if (updateError) throw updateError

  return data
}
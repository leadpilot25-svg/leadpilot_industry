import { supabase } from '../supabase'
import { PIPELINE_SEEDS } from './pipelineSeeds'
import { CUSTOM_FIELD_SEEDS } from './customFieldSeeds'
import { seedCustomFields } from './customFields.service'
import type { BusinessType } from '../../types/tenant'
import type { PipelineSeed, PipelineSeedStage } from '../../types/pipeline'

// ─── Public payload type ──────────────────────────────────────────────────────

export interface OnboardingPayload {
  userId: string
  profileId: string
  companyName: string
  businessType: BusinessType
  whatsappNumber: string
  logoUrl: string | null
}

// ─── Internal type for the fallback writer ───────────────────────────────────

interface FallbackParams {
  userId: string
  profileId: string
  companyName: string
  businessType: BusinessType
  whatsappNumber: string
  logoUrl: string | null
  slug: string
  timezone: string
  seed: PipelineSeed
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSlug(name: string): string {
  return (
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 7)
  )
}

function errStr(e: { message?: string; code?: string; details?: string; hint?: string } | null): string {
  if (!e) return 'unknown error'
  return [
    e.message,
    e.code    ? `code=${e.code}`       : null,
    e.details ? `details=${e.details}` : null,
    e.hint    ? `hint=${e.hint}`       : null,
  ].filter(Boolean).join(' | ')
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function completeOnboarding(payload: OnboardingPayload): Promise<void> {
  const { userId, profileId, companyName, businessType, whatsappNumber, logoUrl } = payload

  const slug     = buildSlug(companyName)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  const seed: PipelineSeed = PIPELINE_SEEDS[businessType]

  // ── STEP 0: verify the profile row exists and log its current state ───────
  const { data: profileBefore, error: profileReadError } = await supabase
    .from('profiles')
    .select('id, user_id, tenant_id, role')
    .eq('id', profileId)
    .single()


  if (profileReadError || !profileBefore) {
    throw new Error(`Cannot read profile row (id=${profileId}): ${errStr(profileReadError)}. Make sure the profiles table exists and RLS allows SELECT on own row.`)
  }

  // ── STEP 1: attempt RPC ───────────────────────────────────────────────────
  const rpcParams = {
    p_profile_id:    profileId,
    p_company_name:  companyName.trim(),
    p_slug:          slug,
    p_business_type: businessType,
    p_whatsapp:      whatsappNumber.trim() || null,
    p_logo_url:      logoUrl,
    p_timezone:      timezone,
    p_pipeline_name: seed.name,
    p_stages:        JSON.stringify(seed.stages),
  }


  const { data: rpcData, error: rpcError } = await supabase.rpc('complete_onboarding', rpcParams)


  if (!rpcError) {
    // RPC reported success — but verify the profile was actually updated
    const { data: profileAfter } = await supabase
      .from('profiles')
      .select('id, tenant_id, role')
      .eq('id', profileId)
      .single()


    if (profileAfter?.tenant_id) {
      return
    }

    // RPC returned no error but nothing was written — the function exists
    // but is silently failing (e.g. wrong parameter types, internal exception
    // caught by postgres that didn't propagate). Fall through to sequential.
    console.warn('[onboarding] ⚠ RPC returned no error but tenant_id is still NULL — falling back to sequential writes')
  } else {
    console.error('[onboarding] ✗ RPC error:', {
      message: rpcError.message,
      code:    rpcError.code,
      details: rpcError.details,
      hint:    rpcError.hint,
    })

    const functionMissing =
      rpcError.code === 'PGRST202' ||
      (rpcError.message ?? '').includes('Could not find the function') ||
      (rpcError.message ?? '').includes('function public.complete_onboarding')

    if (!functionMissing) {
      // Known error, not a missing-function — surface it immediately
      throw new Error(`complete_onboarding RPC failed: ${errStr(rpcError)}`)
    }

    console.warn('[onboarding] RPC function not found — using sequential fallback')
  }

  // ── STEP 2: sequential fallback ───────────────────────────────────────────
  await sequentialFallback({ userId, profileId, companyName, businessType, whatsappNumber, logoUrl, slug, timezone, seed })
}

// ─── Sequential fallback ──────────────────────────────────────────────────────

async function sequentialFallback(p: FallbackParams): Promise<void> {

  // 1. Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name:          p.companyName.trim(),
      slug:          p.slug,
      plan:          'trial',
      business_type: p.businessType,
      is_active:     true,
    })
    .select('id')
    .single()


  if (tenantError || !tenant) {
    throw new Error(`Failed to create tenant: ${errStr(tenantError)}`)
  }

  const tenantId: string = tenant.id

  // 2. Create workspace_settings
  const { error: wsError } = await supabase
    .from('workspace_settings')
    .insert({
      tenant_id:       tenantId,
      company_name:    p.companyName.trim(),
      logo_url:        p.logoUrl,
      brand_color:     '#6366F1',
      business_type:   p.businessType,
      timezone:        p.timezone,
      currency:        'INR',
      whatsapp_number: p.whatsappNumber.trim() || null,
    })

  if (wsError) throw new Error(`Failed to save workspace settings: ${errStr(wsError)}`)

  // 3. UPDATE profile — set tenant_id + role
  const { data: updatedProfile, error: profileError } = await supabase
    .from('profiles')
    .update({ tenant_id: tenantId, role: 'client_admin' })
    .eq('id', p.profileId)
    .select('id, tenant_id, role')
    .single()


  if (profileError) throw new Error(`Failed to update profile: ${errStr(profileError)}`)
  if (!updatedProfile?.tenant_id) {
    throw new Error(
      `Profile update ran without error but tenant_id is still null. ` +
      `This is an RLS policy issue — the UPDATE policy on profiles is blocking the write. ` +
      `Check: Supabase → Authentication → Policies → profiles table → UPDATE policy.`
    )
  }

  // 4. Create pipeline
  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .insert({
      tenant_id:     tenantId,
      name:          p.seed.name,
      business_type: p.businessType,
      is_default:    true,
    })
    .select('id')
    .single()

  if (pipelineError || !pipeline) throw new Error(`Failed to create pipeline: ${errStr(pipelineError)}`)

  // 5. Seed pipeline stages
  const stageRows = p.seed.stages.map((s: PipelineSeedStage) => ({
    tenant_id:   tenantId,
    pipeline_id: pipeline.id,
    name:        s.name,
    color:       s.color,
    sort_order:  s.sort_order,
  }))

  const { error: stagesError } = await supabase
    .from('pipeline_stages')
    .insert(stageRows)

  if (stagesError) throw new Error(`Failed to seed pipeline stages: ${errStr(stagesError)}`)

  // 6. Seed custom fields for this industry (non-fatal)
  // Wrapped in try/catch — if seeding fails, onboarding still completes.
  // Existing fields are never overwritten (ON CONFLICT DO NOTHING).
  try {
    const fieldSeeds = CUSTOM_FIELD_SEEDS[p.businessType] ?? []
    if (fieldSeeds.length > 0) {
      await seedCustomFields(
        tenantId,
        fieldSeeds.map(f => ({ ...f, entity: 'lead' as const })),
      )
    }
  } catch {
    // Non-fatal — log silently, do not re-throw
  }

  void p.userId
}

// ─── Logo upload ──────────────────────────────────────────────────────────────

export async function uploadLogo(file: File, userId: string): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'png'
  const path = `${userId}/logo-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
  if (error) throw new Error(`Logo upload failed: ${errStr(error)}`)

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}

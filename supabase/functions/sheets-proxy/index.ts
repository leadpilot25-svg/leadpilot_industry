/**
 * Supabase Edge Function: sheets-proxy
 *
 * Receives a lead payload from the LeadPilot browser app and forwards it
 * to the tenant's configured Google Apps Script URL.
 *
 * Running server-side eliminates the CORS restriction that blocks
 * direct browser → Apps Script requests.
 *
 * Deploy:
 *   supabase functions deploy sheets-proxy --project-ref YOUR_PROJECT_REF
 *
 * Set secrets:
 *   supabase secrets set SUPABASE_URL=https://xxx.supabase.co
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ProxyRequest {
  tenant_id: string
  payload:   Record<string, string>
  test?:     boolean
}

Deno.serve(async (req: Request) => {
  // Allow CORS from the LeadPilot frontend
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json() as ProxyRequest

    if (!body.tenant_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key — bypasses RLS, safe server-side only
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Load the tenant's Google Sheets config
    const { data: config, error: configErr } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('tenant_id', body.tenant_id)
      .eq('provider', 'google_sheets')
      .eq('status', 'active')
      .maybeSingle()

    if (configErr || !config) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No active Google Sheets integration' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cfg = config.config as { scriptUrl: string; sheetName: string }

    if (!cfg.scriptUrl) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Script URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the payload to send to Apps Script
    const scriptPayload = body.test
      ? { test: true }
      : { sheetName: cfg.sheetName ?? 'Leads', ...body.payload }

    // POST to Google Apps Script — server-side, no CORS restriction
    const scriptRes = await fetch(cfg.scriptUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(scriptPayload),
    })

    let scriptBody: Record<string, unknown> = {}
    try {
      scriptBody = await scriptRes.json()
    } catch {
      scriptBody = { ok: scriptRes.ok }
    }

    // Update last_synced_at on success
    if (!body.test && scriptRes.ok) {
      await supabase
        .from('integration_configs')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('tenant_id', body.tenant_id)
        .eq('provider', 'google_sheets')
    }

    return new Response(
      JSON.stringify({ ok: true, script: scriptBody }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
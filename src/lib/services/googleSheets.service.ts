import { supabase } from '../supabase'

export interface SheetSyncConfig {
  scriptUrl: string
  sheetName: string
  enabled:   boolean
}

export interface SheetSyncStatus {
  connected:    boolean
  scriptUrl:    string | null
  sheetName:    string
  lastSyncedAt: string | null
}

export interface LeadSyncPayload {
  row_id:        string
  date:          string
  name:          string
  phone:         string
  email:         string
  city:          string
  source:        string
  status:        string
  agent:         string
  notes:         string
  followup_date: string
  [key: string]: string
}

// ─── Load config ──────────────────────────────────────────────────────────────

export async function loadSheetSyncStatus(tenantId: string): Promise<SheetSyncStatus> {
  const { data } = await supabase
    .from('integration_configs')
    .select('config, status, last_synced_at')
    .eq('tenant_id', tenantId)
    .eq('provider', 'google_sheets')
    .maybeSingle()

  if (!data || data.status !== 'active') {
    return { connected: false, scriptUrl: null, sheetName: 'Leads', lastSyncedAt: null }
  }

  const cfg = data.config as SheetSyncConfig
  return {
    connected:    true,
    scriptUrl:    cfg.scriptUrl  ?? null,
    sheetName:    cfg.sheetName  ?? 'Leads',
    lastSyncedAt: data.last_synced_at ?? null,
  }
}

// ─── Save config ──────────────────────────────────────────────────────────────

export async function saveSheetSyncConfig(
  tenantId:  string,
  scriptUrl: string,
  sheetName: string,
  enabled:   boolean
): Promise<void> {
  const cfg: SheetSyncConfig = { scriptUrl, sheetName, enabled }
  const { error } = await supabase
    .from('integration_configs')
    .upsert({
      tenant_id: tenantId,
      provider:  'google_sheets',
      status:    enabled ? 'active' : 'inactive',
      config:    cfg,
    }, { onConflict: 'tenant_id,provider' })
  if (error) throw new Error(error.message)
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectSheetSync(tenantId: string): Promise<void> {
  await supabase
    .from('integration_configs')
    .update({ status: 'inactive', config: {} })
    .eq('tenant_id', tenantId)
    .eq('provider', 'google_sheets')
}

// ─── Sync a single lead ───────────────────────────────────────────────────────
// Fire-and-forget — never blocks lead creation.
// Routes through the sheets-proxy Edge Function (server-side → no CORS restriction).

export async function syncLeadToSheet(
  tenantId: string,
  payload:  LeadSyncPayload
): Promise<void> {
  try {
    // Optimisation: skip the Edge Function call entirely if no active integration exists.
    const { data, error: configError } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('provider', 'google_sheets')
      .eq('status', 'active')
      .maybeSingle()

    if (configError) {
      console.error('[GoogleSheets] Failed to load config:', configError.message)
      return
    }

    if (!data) return  // no active integration — skip silently

    // Proxy reads the script URL server-side with service role key and returns
    // a real HTTP status from Apps Script — last_synced_at is only updated on success.
    supabase.functions.invoke('sheets-proxy', {
      body: { tenant_id: tenantId, payload },
    }).catch((err: Error) => {
      console.error('[GoogleSheets] Proxy invoke error:', err.message)
    })
  } catch (err) {
    console.error('[GoogleSheets] Unexpected error:', err)
  }
}

// ─── Test connection ──────────────────────────────────────────────────────────

export async function testSheetConnection(
  tenantId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('sheets-proxy', {
      body: { tenant_id: tenantId, test: true },
    })
    if (error) return { ok: false, error: error.message }
    const result = data as { ok: boolean; error?: string } | null
    if (!result) return { ok: false, error: 'No response from proxy' }
    return result
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}
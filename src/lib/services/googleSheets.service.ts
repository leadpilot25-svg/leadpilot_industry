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
// Uses no-cors so the browser can POST to Apps Script without CORS errors.

export async function syncLeadToSheet(
  tenantId: string,
  payload:  LeadSyncPayload
): Promise<void> {
  try {
    const { data, error: configError } = await supabase
      .from('integration_configs')
      .select('config, status')
      .eq('tenant_id', tenantId)
      .eq('provider', 'google_sheets')
      .eq('status', 'active')
      .maybeSingle()

    if (configError) {
      console.error('[GoogleSheets] Failed to load config:', configError.message)
      return
    }

    if (!data) return  // no active integration — skip silently

    const cfg = data.config as SheetSyncConfig
    if (!cfg.scriptUrl) return

    fetch(cfg.scriptUrl, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({ sheetName: cfg.sheetName ?? 'Leads', ...payload }),
    }).then(() => {
      supabase
        .from('integration_configs')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('provider', 'google_sheets')
        .catch((e: Error) => console.error('[GoogleSheets] Failed to update last_synced_at:', e.message))
    }).catch((err: Error) => {
      console.error('[GoogleSheets] Sync request failed:', err.message)
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
    const { data, error: configError } = await supabase
      .from('integration_configs')
      .select('config, status')
      .eq('tenant_id', tenantId)
      .eq('provider', 'google_sheets')
      .eq('status', 'active')
      .maybeSingle()

    if (configError) return { ok: false, error: configError.message }
    if (!data) return { ok: false, error: 'No active Google Sheets integration. Enter your Script URL and enable sync.' }

    const cfg = data.config as SheetSyncConfig
    if (!cfg.scriptUrl) return { ok: false, error: 'Script URL is empty.' }

    await fetch(cfg.scriptUrl, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({ test: true }),
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}
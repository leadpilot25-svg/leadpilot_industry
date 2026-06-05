import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AppLayout } from '../../components/layout/AppLayout'
import {
  loadSheetSyncStatus, saveSheetSyncConfig,
  disconnectSheetSync, testSheetConnection,
  type SheetSyncStatus,
} from '../../lib/services/googleSheets.service'

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

// The Apps Script code the client pastes into Google Apps Script editor
const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.test) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || 'Leads';
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    var FIXED = ['ID','Date','Name','Phone','Email','City','Source','Status','Agent','Notes','Follow-up'];
    var FIXED_KEYS = { 'ID':'row_id','Date':'date','Name':'name','Phone':'phone','Email':'email',
      'City':'city','Source':'source','Status':'status','Agent':'agent','Notes':'notes','Follow-up':'followup_date' };
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var lastRow = sheet.getLastRow();
    var existingHdr = lastRow > 0 ? sheet.getRange(1,1,1,lastCol).getValues()[0].map(String) : [];
    if (existingHdr.length === 0 || (existingHdr.length === 1 && existingHdr[0] === '')) {
      sheet.appendRow(FIXED); sheet.getRange(1,1,1,FIXED.length).setFontWeight('bold');
      existingHdr = FIXED.slice(); lastRow = 1;
    }
    var fixedPayloadKeys = Object.values(FIXED_KEYS).concat(['sheetName']);
    var customKeys = Object.keys(data).filter(function(k) { return fixedPayloadKeys.indexOf(k) === -1; });
    customKeys.forEach(function(key) {
      var label = key.replace(/_/g,' ').replace(/([A-Z])/g,' $1').replace(/\\b\\w/g,function(c){return c.toUpperCase();}).trim();
      if (existingHdr.indexOf(label) === -1) {
        var newCol = existingHdr.length + 1;
        sheet.getRange(1, newCol).setValue(label).setFontWeight('bold');
        existingHdr.push(label);
      }
    });
    var row = existingHdr.map(function(header) {
      var payloadKey = FIXED_KEYS[header];
      if (payloadKey !== undefined) return data[payloadKey] || '';
      var matchKey = Object.keys(data).find(function(k) {
        var label = k.replace(/_/g,' ').replace(/([A-Z])/g,' $1').replace(/\\b\\w/g,function(c){return c.toUpperCase();}).trim();
        return label === header;
      });
      return matchKey ? (data[matchKey] || '') : '';
    });
    var found = false;
    if (lastRow > 1) {
      var ids = sheet.getRange(2,1,lastRow-1,1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(data.row_id)) {
          sheet.getRange(i+2,1,1,row.length).setValues([row]); found = true; break;
        }
      }
    }
    if (!found) sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}`

export function GoogleSheetsPage() {
  const { profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null

  const [status,     setStatus]     = useState<SheetSyncStatus | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [scriptUrl,  setScriptUrl]  = useState('')
  const [sheetName,  setSheetName]  = useState('Leads')
  const [enabled,    setEnabled]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [showScript, setShowScript] = useState(false)

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }
    loadSheetSyncStatus(tenantId).then(s => {
      setStatus(s)
      if (s.connected) {
        setScriptUrl(s.scriptUrl ?? '')
        setSheetName(s.sheetName ?? 'Leads')
        setEnabled(true)
      }
      setLoading(false)
    })
  }, [tenantId])

  const handleSave = async () => {
    if (!tenantId) return
    if (!scriptUrl.trim()) { setError('Script URL is required'); return }
    setSaving(true); setError(null)
    try {
      await saveSheetSyncConfig(tenantId, scriptUrl.trim(), sheetName.trim() || 'Leads', enabled)
      const s = await loadSheetSyncStatus(tenantId)
      setStatus(s)
      setSuccess('Saved. New leads will sync to your sheet automatically.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!tenantId || !scriptUrl.trim()) { setError('Enter the Script URL first'); return }
    if (scriptUrl.trim() !== (status?.scriptUrl ?? '')) {
      setError('Save your settings first, then test the connection.')
      return
    }
    setTesting(true); setTestResult(null); setError(null)
    const result = await testSheetConnection(tenantId)
    setTestResult(result.ok ? 'ok' : 'fail')
    if (!result.ok) setError(result.error ?? 'Connection failed')
    setTesting(false)
  }

  const handleDisconnect = async () => {
    if (!tenantId || !window.confirm('Disconnect Google Sheets?')) return
    await disconnectSheetSync(tenantId)
    setStatus(await loadSheetSyncStatus(tenantId))
    setScriptUrl(''); setEnabled(false)
    setSuccess('Disconnected.')
    setTimeout(() => setSuccess(null), 3000)
  }

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Google Sheets Sync</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Every lead syncs to your Google Sheet automatically.
            </p>
          </div>
          {status?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Not connected
            </span>
          )}
        </div>

        {/* Alerts */}
        {error   && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Step 1 — Setup instructions */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer bg-gray-50"
            onClick={() => setShowScript(s => !s)}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Step 1 — Set up Apps Script</p>
              <p className="text-xs text-gray-500 mt-0.5">One-time setup in your Google Sheet</p>
            </div>
            <svg width="16" height="16" className={`text-gray-400 transition-transform ${showScript ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          {showScript && (
            <div className="px-5 pb-5 pt-4 space-y-4">
              <ol className="space-y-2 text-sm text-gray-700">
                {[
                  'Open your Google Sheet',
                  'Click Extensions → Apps Script',
                  'Delete the default code',
                  'Paste the script below',
                  'Click Save (💾), then Deploy → New Deployment',
                  'Type: Web App | Execute as: Me | Access: Anyone',
                  'Click Deploy → Copy the Web App URL',
                  'Paste the URL in Step 2 below',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="relative">
                <pre className="rounded-xl bg-gray-900 p-4 text-xs text-gray-300 overflow-x-auto max-h-48 scrollbar-thin">
                  {APPS_SCRIPT_CODE}
                </pre>
                <button
                  onClick={copyScript}
                  className={`absolute top-3 right-3 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${copied ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2 — Connect */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Step 2 — Connect your sheet</p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Web App URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={scriptUrl}
              onChange={e => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">Paste the URL from Apps Script → Deploy → Web App URL</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Worksheet name</label>
            <input
              type="text"
              value={sheetName}
              onChange={e => setSheetName(e.target.value)}
              placeholder="Leads"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400">The tab name in your spreadsheet. Default: Leads</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setEnabled(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">{enabled ? 'Sync enabled' : 'Sync disabled'}</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || !scriptUrl.trim()}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {testing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" /> : null}
              {testing ? 'Testing…' : testResult === 'ok' ? '✓ Connected' : 'Test connection'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !scriptUrl.trim()}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving…' : 'Save'}
            </button>

            {status?.connected && (
              <button onClick={handleDisconnect} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100">
                Disconnect
              </button>
            )}
          </div>

          {testResult === 'ok' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Connection successful. Click Save to activate sync.
            </div>
          )}
        </div>

        {/* Status card */}
        {status?.connected && status.lastSyncedAt && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Last sync</p>
            <p className="text-sm text-gray-700">
              {new Date(status.lastSyncedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How it works</p>
          {[
            ['➕', 'New lead created → row added to your sheet'],
            ['✏️', 'Lead updated → row updated automatically'],
            ['📱', 'Public Form, QR Code, CSV Import — all sync the same way'],
            ['🔒', 'Script URL stored in your database — never exposed in the app'],
            ['⚡', 'Sync happens instantly in the background'],
          ].map(([icon, text]) => (
            <div key={icon as string} className="flex items-start gap-2 text-xs text-gray-600">
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  )
}
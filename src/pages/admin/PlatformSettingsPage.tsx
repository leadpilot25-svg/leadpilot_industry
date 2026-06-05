import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'

type DeploymentMode = 'solo' | 'saas'

const STORAGE_KEY = 'lp_deployment_mode'

export function getDeploymentMode(): DeploymentMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'solo' || v === 'saas' ? v : 'saas'
  } catch { return 'saas' }
}

export function PlatformSettingsPage() {
  const [mode,  setMode]  = useState<DeploymentMode>(() => getDeploymentMode())
  const [saved, setSaved] = useState(false)

  const save = (m: DeploymentMode) => {
    setMode(m)
    localStorage.setItem(STORAGE_KEY, m)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const cardStyle = (active: boolean): React.CSSProperties => active
    ? { background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.4)' }
    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <AdminLayout>
      <div className="px-6 py-7 max-w-2xl space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure how LeadPilot is deployed for your use case.</p>
        </div>

        {/* Deployment mode */}
        <div
          className="rounded-2xl p-6 space-y-5 bg-white border border-gray-200 shadow-sm"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Deployment Mode</h2>
            <p className="mt-0.5 text-xs text-gray-500">Choose how this platform operates.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Solo CRM */}
            <button
              onClick={() => save('solo')}
              className="rounded-xl p-4 text-left transition-all duration-150 hover:scale-[1.01]"
              style={cardStyle(mode === 'solo')}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  👤
                </div>
                {mode === 'solo' && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#10B981" }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
              <p className={`mt-3 text-sm font-semibold ${mode === 'solo' ? 'text-emerald-400' : 'text-white'}`}>Solo CRM</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Single workspace for one business. No tenant management. Ideal for coaches, consultants, local businesses.
              </p>
              <ul className="mt-3 space-y-1">
                {['Simplified interface', 'Single workspace', 'No SaaS features', 'Direct lead management'].map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span style={{ color: '#10B981' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </button>

            {/* Multi-tenant SaaS */}
            <button
              onClick={() => save('saas')}
              className="rounded-xl p-4 text-left transition-all duration-150 hover:scale-[1.01]"
              style={cardStyle(mode === 'saas')}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  🏢
                </div>
                {mode === 'saas' && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#10B981" }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
              <p className={`mt-3 text-sm font-semibold ${mode === 'saas' ? 'text-emerald-400' : 'text-white'}`}>Multi-Tenant SaaS</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Sell LeadPilot as a SaaS platform. Manage multiple client workspaces, plans, and billing.
              </p>
              <ul className="mt-3 space-y-1">
                {['Full tenant management', 'Client admin creation', 'Subscription plans', 'Platform analytics'].map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span style={{ color: '#10B981' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </button>
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span style={{ color: '#10B981' }}>Mode saved. Changes take effect on next page load.</span>
            </div>
          )}
        </div>

        {/* Role responsibilities reference */}
        <div
          className="rounded-2xl p-6 space-y-4 bg-white border border-gray-200 shadow-sm space-y-5"
        >
          <h2 className="text-sm font-semibold text-gray-900">Role Responsibilities</h2>
          <div className="space-y-4">
            {[
              {
                role:   'Super Admin',
                color:  '#10B981',
                bg:     'rgba(16,185,129,0.1)',
                items:  ['Create / manage tenants', 'Create client admins', 'Activate / suspend tenants', 'View platform statistics', 'Manage subscriptions & plans'],
                not:    ['Create agents', 'Manage daily operations', 'Assign leads'],
              },
              {
                role:   'Client Admin',
                color:  '#818CF8',
                bg:     'rgba(129,140,248,0.1)',
                items:  ['Invite & manage agents', 'Manage workspace settings', 'Manage leads & pipelines', 'Custom fields & templates'],
                not:    [],
              },
              {
                role:   'Agent',
                color:  '#94A3B8',
                bg:     'rgba(148,163,184,0.08)',
                items:  ['Work assigned leads', 'Log activities', 'Schedule follow-ups'],
                not:    ['Invite users', 'Change settings'],
              },
            ].map(r => (
              <div
                key={r.role}
                className="rounded-xl p-4 bg-gray-50 border border-gray-100"
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: r.color }}>{r.role}</p>
                <div className="space-y-1">
                  {r.items.map(item => (
                    <p key={item} className="text-xs text-gray-700 flex items-center gap-1.5">
                      <span style={{ color: r.color }}>✓</span> {item}
                    </p>
                  ))}
                  {r.not.map(item => (
                    <p key={item} className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="text-slate-700">✗</span> {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { DashboardStats } from '../../types/lead'

interface AlertCardsProps {
  stats:    DashboardStats | null
  loading:  boolean
  tenantId: string | null
}

interface Alert {
  key:   string
  color: 'rose' | 'amber' | 'blue' | 'emerald'
  msg:   string
  sub:   string
  href:  string
}

const colors = {
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    sub: 'text-rose-500',    chevron: 'text-rose-400'    },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   sub: 'text-amber-500',   chevron: 'text-amber-400'   },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    sub: 'text-blue-500',    chevron: 'text-blue-400'    },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', sub: 'text-emerald-500', chevron: 'text-emerald-400' },
}

export function AlertCards({ stats, loading, tenantId }: AlertCardsProps) {
  const navigate = useNavigate()
  const [formLeadsToday, setFormLeadsToday] = useState(0)

  // Count form/QR leads created today
  useEffect(() => {
    if (!tenantId) return
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('source', ['public_form', 'qr_code'])
      .gte('created_at', todayStart.toISOString())
      .is('deleted_at', null)
      .then(({ count }) => {
        setFormLeadsToday(count ?? 0)
      })
  }, [tenantId])

  if (loading || !stats) return null

  const alerts: Alert[] = []

  if (formLeadsToday > 0) {
    alerts.push({
      key:   'form_leads',
      color: 'emerald',
      msg:   `${formLeadsToday} new lead${formLeadsToday !== 1 ? 's' : ''} from your form today`,
      sub:   'Tap to view and follow up',
      href:  '/leads?source=public_form',
    })
  }

  if (stats.todays_followups > 0) {
    alerts.push({
      key:   'followups',
      color: 'amber',
      msg:   `${stats.todays_followups} follow-up${stats.todays_followups !== 1 ? 's' : ''} due today`,
      sub:   'Tap to view and take action',
      href:  '/followups',
    })
  }

  if (stats.new_leads > 0) {
    alerts.push({
      key:   'new_leads',
      color: 'blue',
      msg:   `${stats.new_leads} new lead${stats.new_leads !== 1 ? 's' : ''} waiting`,
      sub:   'Contact them before they go cold',
      href:  '/leads?status=new',
    })
  }

  if (alerts.length === 0) return null

  return (
    <div className="px-4 sm:px-6 space-y-2">
      {alerts.map(alert => {
        const c = colors[alert.color]
        return (
          <button
            key={alert.key}
            onClick={() => navigate(alert.href)}
            className={`w-full flex items-center gap-3 rounded-xl border ${c.bg} ${c.border} px-4 py-3 text-left transition hover:shadow-sm active:scale-[0.99]`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${c.text}`}>{alert.msg}</p>
              <p className={`text-xs ${c.sub}`}>{alert.sub}</p>
            </div>
            <svg width="14" height="14" className={`shrink-0 ${c.chevron}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

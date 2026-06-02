import type { LeadActivityType, ActivityWithLead } from '../../types/lead'

interface RecentActivityProps {
  activities: ActivityWithLead[]
  loading:    boolean
}

// Split into separate maps — no compound strings with multiple spaces.
const activityLabel: Record<LeadActivityType, string> = {
  call:          'Call',
  whatsapp:      'WhatsApp',
  sms:           'SMS',
  email:         'Email',
  status_change: 'Status changed',
  assignment:    'Assigned',
  note:          'Note added',
}
const activityBg: Record<LeadActivityType, string> = {
  call:          'bg-blue-50',
  whatsapp:      'bg-emerald-50',
  sms:           'bg-violet-50',
  email:         'bg-sky-50',
  status_change: 'bg-amber-50',
  assignment:    'bg-indigo-50',
  note:          'bg-gray-100',
}
const activityText: Record<LeadActivityType, string> = {
  call:          'text-blue-400',
  whatsapp:      'text-emerald-400',
  sms:           'text-violet-400',
  email:         'text-sky-400',
  status_change: 'text-amber-400',
  assignment:    'text-indigo-400',
  note:          'text-gray-400',
}

// Inline SVG icons keyed by activity type
const ActivityIcon = ({ type }: { type: LeadActivityType }) => {
  const cls = 'h-3.5 w-3.5'
  switch (type) {
    case 'call':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
    case 'whatsapp':
      return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
    case 'email':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
    case 'status_change':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
    case 'assignment':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
  }
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins  / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

export function RecentActivity({ activities, loading }: RecentActivityProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 font-medium">
          {loading ? '…' : activities.length}
        </span>
      </div>

      <div className="overflow-y-auto">

        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-6 py-3">
            <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-gray-100" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-800" />
            </div>
          </div>
        ))}

        {!loading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <p className="text-xs text-gray-500">No activity yet</p>
            <p className="text-xs text-gray-600">Actions on leads will appear here.</p>
          </div>
        )}

        {!loading && activities.length > 0 && (
          <ol className="divide-y divide-gray-800">
            {activities.map(item => (
              <li key={item.id} className="flex gap-3 px-6 py-3 hover:bg-gray-800/30 transition-colors">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${activityBg[item.activity_type]} ${activityText[item.activity_type]}`}>
                  <ActivityIcon type={item.activity_type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-300">
                    <span className="font-medium">{activityLabel[item.activity_type]}</span>
                    {item.lead_name && (
                      <> on <span className="font-medium text-white">{item.lead_name}</span></>
                    )}
                  </p>
                  {item.notes && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{item.notes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-600">{timeAgo(item.created_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

      </div>
    </div>
  )
}

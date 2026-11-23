// Notification history (Home → bell): stored in Supabase for this guest, newest first. Opening it marks everything read;
// a simulated flight update is labelled as such and shows "Resolved" once reset or fixed. Tapping an entry opens its flight.
import { useEffect, useState } from 'react'
import { Check, Clock, DoorOpen, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import { useApp } from '../../store'
import { Sheet, cx } from '../../components/ui'
import type { NotificationRow } from '../../api/repositories'

const ICON: Record<NotificationRow['kind'], LucideIcon> = { flight_time: Clock, gate: DoorOpen, plan_saved: Check, fix_applied: Wrench }
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function NotificationInbox({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, readNotifications, plans, go } = useApp()
  // Opening marks everything read (the badge clears); what was unread keeps its dot while the inbox stays open.
  const [unread, setUnread] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id)
    setUnread(ids); if (ids.length) readNotifications(ids)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      {!notifications.length ? (
        <div className="grid justify-items-center gap-2 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent-tint text-accent-dark"><Sparkles size={22} aria-hidden="true" /></span>
          <p className="text-body font-semibold">No notifications yet</p>
          <p className="text-sub text-muted-text">Saved itineraries and flight changes appear here.</p>
        </div>
      ) : (
        <ul aria-label="Notification history" className="grid gap-2 pb-2">
          {notifications.map((n) => {
            const Icon = ICON[n.kind], hasFlight = !!n.layover_id && plans.some((p) => p.id === n.layover_id)
            return (
              <li key={n.id}>
                <button type="button" disabled={!hasFlight} onClick={() => { onClose(); go({ name: 'plan', id: n.layover_id! }) }}
                  className={cx('press flex w-full items-start gap-3 rounded-card p-3 text-left ring-1 ring-line', unread.includes(n.id) ? 'bg-accent-tint' : 'bg-ink-tint')}>
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-tint text-accent-dark"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <b className="text-body font-semibold leading-tight">{n.title}</b>
                      {unread.includes(n.id) && <span className="size-2 rounded-full bg-accent" aria-label="Unread" role="img" />}
                    </span>
                    {n.body && <span className="mt-0.5 block text-sub text-muted-text">{n.body}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-cap text-muted-text">{when(n.created_at)}
                      {n.simulated && <span className="rounded-full bg-ink-tint px-2 py-0.5 font-semibold">Simulated</span>}
                      {n.resolved_at && <span className="rounded-full bg-success-tint px-2 py-0.5 font-semibold text-success">Resolved</span>}
                    </span>
                  </span>
                </button>
              </li>)
          })}
        </ul>
      )}
    </Sheet>
  )
}

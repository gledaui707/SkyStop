import { Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { ACTIVITIES, getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { budget, fmtDay, fmtDur, fmtTime, layoverMinutesAt } from '../data/time'

interface Props { plan: Plan; onView: () => void; onAdd: () => void }

/** Ticket-inspired summary of a saved journey. Shows only what the user entered. */
export function TripTicket({ plan, onView, onAdd }: Props) {
  const ap = getAirport(plan.airport)
  const o = airportInfo(plan.origin), d = airportInfo(plan.destination)
  const arr = new Date(plan.arrival), dep = new Date(plan.departure)
  const items = plan.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const b = budget(layoverMinutesAt(plan.arrival, plan.departure, ap.timezone), plan.bufferMin, items)
  const paper = 'bg-white px-4 py-4 sm:px-5'
  return (
    <article aria-label="Upcoming trip" className="overflow-hidden rounded-[1.75rem] text-ink drop-shadow-[0_8px_18px_rgb(0_0_0/0.08)]">
      <div className={paper}>
        <p className="flex items-center gap-1.5 text-cap font-bold uppercase tracking-wide text-accent-dark">
          <Plane size={14} aria-hidden="true" /> Next connection
        </p>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div>
            <p className="text-cap font-semibold uppercase tracking-wide text-muted-text">From</p>
            {plan.origin ? (
              <>
                <p className="text-[2rem] font-bold leading-tight tracking-tight">{o?.code ?? plan.origin}</p>
                {o && <p className="break-words text-sub text-muted-text">{o.name}</p>}
              </>
            ) : <p className="mt-1 text-sub text-muted-text">Not provided</p>}
          </div>
          <Plane size={22} className="rotate-90 text-accent-dark" aria-hidden="true" />
          <div className="text-right">
            <p className="text-cap font-semibold uppercase tracking-wide text-muted-text">To</p>
            {plan.destination ? (
              <>
                <p className="text-[2rem] font-bold leading-tight tracking-tight">{d?.code ?? plan.destination}</p>
                {d && <p className="break-words text-sub text-muted-text">{d.name}</p>}
              </>
            ) : <p className="mt-1 text-sub text-muted-text">Not provided</p>}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="flex h-6 items-center bg-white px-5" style={{
        mask: 'radial-gradient(circle at left center, transparent 11px, black 12px) left / 51% 100% no-repeat, radial-gradient(circle at right center, transparent 11px, black 12px) right / 51% 100% no-repeat',
      }}>
        <div className="w-full border-t-2 border-dotted border-line" />
      </div>
      <section aria-label="Transit" className={paper}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h2 className="text-card font-semibold">Transit in <span className="text-accent-dark">{ap.city} ({ap.code})</span></h2>
          <p className="text-cap text-muted-text">{fmtDur(b.total)} layover</p>
        </div>
        <dl className="mt-3 grid grid-cols-3 items-start gap-1 border-t border-line pt-3">
          <div>
            <dt className="text-cap text-muted-text">Arrival</dt>
            <dd className="text-card font-bold tabular-nums">{fmtTime(arr)}</dd>
            <dd className="text-cap text-muted-text">{fmtDay(arr)}</dd>
          </div>
          <div className="text-center">
            <dt className="text-cap text-muted-text">Usable time</dt>
            <dd className="mt-1 inline-block rounded-full bg-accent-tint px-2 py-0.5 text-sub font-bold tabular-nums text-accent-dark">{fmtDur(b.usable)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-cap text-muted-text">Departure</dt>
            <dd className="text-card font-bold tabular-nums">{fmtTime(dep)}</dd>
            <dd className="text-cap text-muted-text">{fmtDay(dep)}</dd>
          </div>
        </dl>
        {items.length > 0 && <p className="mt-3 text-cap text-muted-text">{items.length} {items.length === 1 ? 'activity' : 'activities'} saved</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onView} className="btn-coral press min-h-11 rounded-full px-2 text-sub font-semibold">View layover</button>
          <button onClick={onAdd} className="press min-h-11 rounded-full border border-line px-2 text-sub font-semibold text-ink">New layover</button>
        </div>
      </section>
    </article>
  )
}

import { ArrowRight, Plane } from 'lucide-react'
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
  return (
    <article aria-label="Upcoming trip" className="relative overflow-hidden rounded-[1.75rem] bg-white text-ink shadow-[0_8px_30px_rgb(0_0_0/0.08)] ring-1 ring-line">
      <div className="px-4 pt-4 sm:px-5">
        <p className="flex items-center gap-1.5 text-cap font-bold uppercase tracking-wide text-accent-dark">
          <Plane size={14} aria-hidden="true" /> Next connection
        </p>
        {o && d ? (
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div><p className="truncate text-sub text-muted-text">{o.city}</p><p className="text-[2rem] font-bold leading-tight tracking-tight">{o.code}</p></div>
            <ArrowRight size={22} className="text-accent-dark" aria-hidden="true" />
            <div className="text-right"><p className="truncate text-sub text-muted-text">{d.city}</p><p className="text-[2rem] font-bold leading-tight tracking-tight">{d.code}</p></div>
          </div>
        ) : (
          <div className="mt-3"><p className="text-sub text-muted-text">{ap.city}</p><p className="text-[2rem] font-bold leading-tight tracking-tight">{ap.code}</p></div>
        )}
        <p className="mt-2 text-sub font-semibold">Layover in <span className="text-accent-dark">{ap.city} ({ap.code})</span></p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div><dt className="text-cap text-muted-text">Arrive {ap.code}</dt><dd className="text-card font-semibold tabular-nums">{fmtTime(arr)}</dd><dd className="text-sub text-muted-text">{fmtDay(arr)}</dd></div>
          <div className="text-right"><dt className="text-cap text-muted-text">Depart {ap.code}</dt><dd className="text-card font-semibold tabular-nums">{fmtTime(dep)}</dd><dd className="text-sub text-muted-text">{fmtDay(dep)}</dd></div>
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div><dt className="text-cap text-muted-text">Layover</dt><dd className="text-card font-semibold">{fmtDur(b.total)}</dd></div>
          <div className="text-right"><dt className="text-cap text-muted-text">Usable time</dt><dd className="text-card font-bold text-accent-dark">{fmtDur(b.usable)}</dd></div>
        </dl>
        {items.length > 0 && <p className="mt-2 text-sub text-muted-text">{items.length} {items.length === 1 ? 'activity' : 'activities'} saved</p>}
      </div>
      <div className="relative my-3 h-4" aria-hidden="true">
        <span className="absolute -left-2 top-0 size-4 rounded-full bg-canvas" />
        <span className="absolute -right-2 top-0 size-4 rounded-full bg-canvas" />
        <span className="absolute inset-x-4 top-2 border-t-2 border-dotted border-line" />
      </div>
      <div className="px-4 pb-4 sm:px-5">
        <div aria-hidden="true" className="mx-auto mb-4 h-8 w-3/4 text-ink/75" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px, currentColor 5px 9px, transparent 9px 11px, currentColor 11px 12px, transparent 12px 16px, currentColor 16px 19px, transparent 19px 21px, currentColor 21px 22px, transparent 22px 26px)',
        }} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onView} className="btn-coral press min-h-11 rounded-full px-2 text-sub font-semibold">View layover</button>
          <button onClick={onAdd} className="press min-h-11 rounded-full border border-line px-2 text-sub font-semibold text-ink">New layover</button>
        </div>
      </div>
    </article>
  )
}

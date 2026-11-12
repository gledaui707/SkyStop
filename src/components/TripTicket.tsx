import { Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { ACTIVITIES, getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { budget, fmtDay, fmtDur, fmtTime, layoverMinutes } from '../data/time'
import { sized } from '../data/images'

interface Props { plan: Plan; onView: () => void; onAdd: () => void }

/** Ticket-inspired summary of a saved journey. Shows only what the user entered. */
export function TripTicket({ plan, onView, onAdd }: Props) {
  const ap = getAirport(plan.airport)
  const o = airportInfo(plan.origin), d = airportInfo(plan.destination)
  const arr = new Date(plan.arrival), dep = new Date(plan.departure)
  const items = plan.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const b = budget(layoverMinutes(plan.arrival, plan.departure), plan.bufferMin, items)
  return (
    <article aria-label="Upcoming trip" className="relative overflow-hidden rounded-[1.5rem] bg-deep text-white shadow-[0_16px_36px_rgb(16_47_57/0.28)]">
      <img src={sized(ap.image, 700, 500)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-deep/60 to-deep/95" />
      <div className="relative px-5 pt-4">
        <p className="text-cap font-semibold uppercase tracking-wider text-accent">Next connection</p>
        <div className="mt-2 flex items-center">
          {o && <div className="min-w-0"><p className="text-h1 font-bold leading-none">{o.code}</p><p className="mt-1 truncate text-sub text-white/75">{o.city}</p></div>}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2" aria-hidden="true">
            <span className="h-px flex-1 border-t border-dashed border-white/40" />
            <span className="glass-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sub font-bold"><Plane size={14} className="text-white/70" />{ap.code}</span>
            <span className="h-px flex-1 border-t border-dashed border-white/40" />
          </div>
          {d && <div className="min-w-0 text-right"><p className="text-h1 font-bold leading-none">{d.code}</p><p className="mt-1 truncate text-sub text-white/75">{d.city}</p></div>}
        </div>
        <p className="sr-only">Connecting in {ap.city}</p>
      </div>
      <div className="relative my-3 h-5" aria-hidden="true">
        <span className="absolute -left-2.5 top-0 size-5 rounded-full bg-canvas" /><span className="absolute -right-2.5 top-0 size-5 rounded-full bg-canvas" />
        <span className="absolute inset-x-5 top-2.5 border-t border-dashed border-white/30" />
      </div>
      <div className="relative px-5 pb-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div><dt className="text-cap text-white/65">Arrive {ap.code}</dt><dd className="text-card font-semibold tabular-nums">{fmtTime(arr)}</dd><dd className="text-sub text-white/70">{fmtDay(arr)}</dd></div>
          <div><dt className="text-cap text-white/65">Depart {ap.code}</dt><dd className="text-card font-semibold tabular-nums">{fmtTime(dep)}</dd><dd className="text-sub text-white/70">{fmtDay(dep)}</dd></div>
          <div><dt className="text-cap text-white/65">Layover</dt><dd className="text-card font-semibold">{fmtDur(b.total)}</dd></div>
          <div><dt className="text-cap text-white/65">Usable time</dt><dd className="text-card font-semibold text-accent">{fmtDur(b.usable)}</dd></div>
        </dl>
        {items.length > 0 && <p className="mt-3 text-sub text-white/80">{items.length} {items.length === 1 ? 'activity' : 'activities'} saved</p>}
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button onClick={onView} className="min-h-[3.25rem] rounded-full bg-accent px-5 text-body font-semibold text-white">View layover</button>
          <button onClick={onAdd} className="glass-dark min-h-[3.25rem] rounded-[0.875rem] px-5 text-body font-semibold">Add flight</button>
        </div>
      </div>
    </article>
  )
}

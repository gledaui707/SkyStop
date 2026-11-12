import { ChevronRight, Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { fmtDay, fmtDur, layoverMinutesAt } from '../data/time'

interface Props { plan: Plan; onView: () => void }

export function TripTicket({ plan, onView }: Props) {
  const airport = getAirport(plan.airport)
  const origin = airportInfo(plan.origin)
  const destination = airportInfo(plan.destination)
  const usable = Math.max(0, layoverMinutesAt(plan.arrival, plan.departure, airport.timezone) - plan.bufferMin)
  const activityCount = plan.activityIds.length
  const hasRoute = !!(plan.origin && plan.destination)
  const airportCode = 'block text-[clamp(1.5rem,7.5vw,2.25rem)] font-bold leading-none tracking-tight'

  return (
    <article aria-label="Upcoming trip" className="rounded-[1.75rem] bg-white p-4 text-ink shadow-[0_8px_26px_rgb(70_35_25/0.08)] ring-1 ring-line sm:p-5">
      <h2 className="text-cap font-semibold uppercase tracking-wide text-muted-text">Next layover</h2>
      {hasRoute && (
        <div role="group" aria-label="Full route" className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5">
          <div>
            <span className={airportCode}>{plan.origin}</span>
            <span className="mt-1 block break-words text-cap text-muted-text">{origin?.city ?? 'Origin'}</span>
          </div>
          <Plane size={15} className="mt-1.5 rotate-90 text-muted-text" aria-hidden="true" />
          <div className="text-center">
            <span className={`${airportCode} text-accent-dark`}>{airport.code}</span>
            <span className="mt-1 block text-cap font-semibold text-accent-dark">Connection</span>
          </div>
          <ChevronRight size={15} className="mt-1.5 text-muted-text" aria-hidden="true" />
          <div className="text-right">
            <span className={airportCode}>{plan.destination}</span>
            <span className="mt-1 block break-words text-cap text-muted-text">{destination?.city ?? 'Destination'}</span>
          </div>
        </div>
      )}
      <section aria-label="Transit" className={hasRoute ? 'mt-4 border-t border-line pt-4' : 'mt-4'}>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            {!hasRoute && <span className={`${airportCode} text-accent-dark`}>{airport.code}</span>}
            <h3 className={`text-card font-semibold ${hasRoute ? '' : 'mt-1'}`}>{airport.city}</h3>
          </div>
          <div>
            <p className="text-cap text-muted-text">Time to explore</p>
            <p className="text-[1.65rem] font-bold leading-tight tabular-nums text-accent-dark">{fmtDur(usable)}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-canvas px-3 py-2.5">
          <div>
            <dt className="text-cap text-muted-text">Layover arrival</dt>
            <dd className="text-[1.375rem] font-bold tabular-nums">{plan.arrival.slice(11, 16)}</dd>
            <dd className="text-cap text-muted-text">{fmtDay(new Date(plan.arrival.slice(0, 10) + 'T12:00:00'))}</dd>
          </div>
          <div className="text-right">
            <dt className="text-cap text-muted-text">Onward departure</dt>
            <dd className="text-[1.375rem] font-bold tabular-nums">{plan.departure.slice(11, 16)}</dd>
            <dd className="text-cap text-muted-text">{fmtDay(new Date(plan.departure.slice(0, 10) + 'T12:00:00'))}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sub text-muted-text">{activityCount} {activityCount === 1 ? 'activity' : 'activities'} saved</p>
          <button onClick={onView} className="btn-coral press min-h-11 rounded-full px-4 text-sub font-semibold">View layover</button>
        </div>
      </section>
    </article>
  )
}

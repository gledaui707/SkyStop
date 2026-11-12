import { Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { SAMPLE_JOURNEYS } from '../data/journeys'
import { budget, fmtDur, fmtTime, layoverMinutesAt } from '../data/time'

interface Props { plan: Plan; onView: () => void }

/** Ticket-inspired summary of a saved journey. Shows only what the user entered. */
export function TripTicket({ plan, onView }: Props) {
  const ap = getAirport(plan.airport)
  const o = airportInfo(plan.origin), d = airportInfo(plan.destination)
  const sample = SAMPLE_JOURNEYS.find((journey) =>
    journey.ref === plan.bookingRef && journey.origin === plan.origin
      && journey.destination === plan.destination && journey.connection === plan.airport)
  const activityCount = plan.activityIds.length
  const { usable } = budget(layoverMinutesAt(plan.arrival, plan.departure, ap.timezone), plan.bufferMin, [])
  return (
    <article aria-label="Upcoming trip" className="overflow-hidden rounded-[1.75rem] text-ink drop-shadow-[0_8px_18px_rgb(0_0_0/0.08)]">
      <div className="bg-white px-4 pb-5 pt-4 sm:px-5">
        <p className="text-cap font-semibold uppercase tracking-wide text-accent-dark">Next connection</p>
        <div className="mt-3 grid grid-cols-2 items-end gap-3">
          <div>
            <p className="text-sub text-muted-text">{o ? `From · ${o.city}` : 'From'}</p>
            <p className="text-[2rem] font-bold leading-tight tracking-tight">{o?.code ?? plan.origin ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-sub text-muted-text">{d ? `To · ${d.city}` : 'To'}</p>
            <p className="text-[2rem] font-bold leading-tight tracking-tight">{d?.code ?? plan.destination ?? '—'}</p>
          </div>
        </div>
        <div className="my-3 flex items-center gap-3" aria-hidden="true">
          <span className="h-0.5 flex-1 rounded-full bg-accent/75" />
          <Plane size={24} className="rotate-90 text-accent-dark" />
          <span className="h-0.5 flex-1 rounded-full bg-line" />
        </div>
        <dl className="grid grid-cols-3 items-start gap-2">
          <div>
            <dt className="text-cap text-muted-text">{sample ? 'Departure' : 'Transit arrival'}</dt>
            <dd className="text-card font-bold tabular-nums">{sample?.segments[0].depart.time ?? fmtTime(new Date(plan.arrival))}</dd>
          </div>
          <div className="text-center">
            <dt className="text-cap text-muted-text">Usable transit time</dt>
            <dd className="mt-1 inline-block rounded-full bg-accent-tint px-2.5 py-0.5 text-sub font-bold tabular-nums text-accent-dark">{fmtDur(usable)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-cap text-muted-text">{sample ? 'Final arrival' : 'Transit departure'}</dt>
            <dd className="text-card font-bold tabular-nums">{sample?.segments[1].arrive.time ?? fmtTime(new Date(plan.departure))}</dd>
          </div>
        </dl>
      </div>
      <div aria-hidden="true" className="flex h-6 items-center bg-white px-5" style={{
        mask: 'radial-gradient(circle at left center, transparent 11px, black 12px) left / 51% 100% no-repeat, radial-gradient(circle at right center, transparent 11px, black 12px) right / 51% 100% no-repeat',
      }}>
        <div className="w-full border-t-2 border-dotted border-line" />
      </div>
      <section aria-label="Transit" className="bg-white px-4 pb-4 pt-1 sm:px-5">
        <p className="text-cap font-semibold uppercase tracking-wide text-muted-text">Transit</p>
        <h2 className="mt-1 text-h2 font-bold"><span className="text-accent-dark">{ap.code}</span> · {ap.city}</h2>
        <p className="mt-1 text-sub text-muted-text">{activityCount} {activityCount === 1 ? 'activity' : 'activities'} saved</p>
        <button onClick={onView} className="btn-coral press mt-4 min-h-11 w-full rounded-full px-3 text-sub font-semibold">View layover</button>
      </section>
    </article>
  )
}

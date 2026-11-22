import { Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { fmtDur } from '../data/time'
import { computeItinerary } from '../data/itinerary'
import { flightView } from '../features/flightUpdates/updates'
import { cx } from './ui'

interface Props { plan: Plan; onView: () => void }

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const time = (local: string) => local.slice(11, 16)

/** Boarding-pass composition. Top: the journey (origin and destination as large IATA codes, the transit airport in a
 *  coral pill on the dashed flight line). Below it, one strip that belongs to the TRANSIT airport: Arrive SIN · the
 *  connection's length · Depart SIN (airport-local times and dates, +1 when the departure is on a later day), so the
 *  times are never read as origin or destination times. Lower part: the time to explore = connection − buffer.
 *  Data comes from the saved plan (route labels restored from the sample booking where applicable). */
export function TripTicket({ plan, onView }: Props) {
  const ap = getAirport(plan.airport)
  // The flight as it is now (booking + any flight update), through the same calculation as every other screen.
  const v = flightView(plan)
  const { total, usable } = computeItinerary(plan).hero
  const count = plan.activityIds.length
  const hasRoute = !!(plan.origin && plan.destination)
  const from = hasRoute ? airportInfo(plan.origin) : undefined, to = hasRoute ? airportInfo(plan.destination) : undefined
  const plusDays = Math.round((Date.parse(v.departure.slice(0, 10)) - Date.parse(v.arrival.slice(0, 10))) / 86400000)
  /** Day caption; a changed time also shows the booked one, struck through. */
  const sub = (now: string, was: string, changed: boolean) => changed
    ? <><s className="text-muted-text/80"><span className="sr-only">booked </span>{time(was)}</s> · {day(now)}</> : day(now)

  const code = 'block text-[clamp(2.25rem,11.5vw,3rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-ink'
  const big = 'block text-[clamp(1.3rem,6.9vw,2rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink'
  const name = 'block truncate text-[clamp(1.25rem,6vw,1.5rem)] font-semibold leading-tight tracking-[-0.01em] text-ink/75'
  const label = 'block whitespace-nowrap text-tab font-semibold uppercase tracking-[0.06em] text-muted-text'
  const caption = 'mt-1 block whitespace-nowrap text-tab leading-tight text-muted-text'

  return (
    <article aria-label="Upcoming trip" className="theme-paper paper relative overflow-hidden rounded-surface">
      <section aria-label={hasRoute ? `Journey ${plan.origin} to ${plan.destination} via ${ap.code}` : `Connection at ${ap.code}`} className="px-5 pb-5 pt-5">
        {hasRoute ? (<>
          {/* the journey: names, then codes with the transit airport on the flight line between them */}
          <div className="flex justify-between gap-3">
            <span className={name}>{from?.city ?? plan.origin}</span>
            <span className={cx(name, 'text-right')}>{to?.city ?? plan.destination}</span>
          </div>
          <div className="mt-1 grid grid-cols-[auto_minmax(2.25rem,1fr)_auto] items-center gap-x-2.5">
            <span className={code}>{plan.origin}</span>
            <span className="flex min-w-0 flex-col items-center" aria-label={`Transit ${ap.code}`}>
              <span className="btn-coral rounded-lg px-2 py-0.5 text-cap font-bold leading-tight tracking-[0.02em]">{ap.code}</span>
              <span aria-hidden="true" className="mt-1 flex w-full min-w-0 items-center gap-1.5 text-ink/75">
                <span className="h-0 min-w-2 flex-1 border-t-[1.5px] border-dashed border-ink/25" />
                <Plane size={24} strokeWidth={1} fill="currentColor" className="shrink-0 rotate-45" />
                <span className="h-0 min-w-2 flex-1 border-t-[1.5px] border-dashed border-ink/25" />
              </span>
            </span>
            <span className={cx(code, 'text-right')}>{plan.destination}</span>
          </div>
        </>) : (
          <div className="flex items-center gap-3">
            <span className="btn-coral rounded-lg px-2.5 py-1 text-h2 font-bold leading-none">{ap.code}</span>
            <span className={name}>{ap.city}</span>
          </div>
        )}
        {/* the connection at the transit airport: arrive, length, depart */}
        <div aria-label={`At ${ap.code}: arrive ${time(v.arrival)} ${day(v.arrival)}, ${fmtDur(total)} connection, depart ${time(v.departure)} ${day(v.departure)}${v.changed.arrival || v.changed.departure ? ' (time changed)' : ''}`}
          className="mt-4 grid grid-cols-[auto_1fr_auto] items-end gap-1.5 rounded-2xl bg-ink/[0.045] px-3 py-3">
          <span className="min-w-0">
            <span className={label}>Arrive {ap.code}</span>
            <span className={cx(big, 'mt-1', v.changed.arrival && '!text-accent-dark')}>{time(v.arrival)}</span>
            <span className={caption}>{sub(v.arrival, v.original.arrival, v.changed.arrival)}</span>
          </span>
          <span className="flex min-w-0 flex-col items-center pb-[1.15rem]" aria-hidden="true">
            <span className="text-tab font-semibold uppercase tracking-[0.06em] text-muted-text [@media(max-width:360px)]:text-[0.5625rem] [@media(max-width:360px)]:tracking-[0.02em]">Connection</span>
            <span className="mt-1 flex w-full items-center gap-1">
              <span className="h-0 min-w-1 flex-1 border-t-[1.5px] border-ink/20" />
              <span className="whitespace-nowrap text-sub font-semibold tabular-nums text-ink">{fmtDur(total)}</span>
              <span className="h-0 min-w-1 flex-1 border-t-[1.5px] border-ink/20" />
            </span>
          </span>
          <span className="min-w-0 text-right">
            <span className={label}>Depart {ap.code}</span>
            <span className={cx(big, 'mt-1', v.changed.departure && '!text-accent-dark')}>{time(v.departure)}{plusDays > 0 && <sup className="ml-0.5 text-cap font-semibold text-accent-dark">+{plusDays}</sup>}</span>
            <span className={caption}>{sub(v.departure, v.original.departure, v.changed.departure)}</span>
          </span>
        </div>
      </section>

      {/* boarding-pass tear line */}
      <div aria-hidden="true" className="relative h-0">
        {/* The tear-off: two cut-outs and a perforation across the pass. */}
        <span className="absolute -left-3.5 -top-3.5 size-7 rounded-full bg-canvas shadow-[inset_-2px_0_4px_rgb(0_0_0/0.5)]" />
        <span className="absolute -right-3.5 -top-3.5 size-7 rounded-full bg-canvas shadow-[inset_2px_0_4px_rgb(0_0_0/0.5)]" />
        <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-ink/20" />
      </div>

      <section aria-label="Layover" className="px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sub font-semibold text-accent-dark">Transit {ap.code}</p>
            <p className="mt-0.5 truncate text-body font-semibold">{ap.city}</p>
            {v.gate && <p className="mt-0.5 text-micro text-muted-text">Gate <b className={cx('font-semibold', v.changed.gate ? 'text-accent-dark' : 'text-ink')}>{v.gate}</b>
              {v.changed.gate && <> <s><span className="sr-only">booked </span>{v.original.gate}</s></>}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-micro text-muted-text">Time to explore</p>
            <p className="text-h1 font-bold leading-none tracking-[-0.03em] tabular-nums text-accent-dark">{fmtDur(usable)}</p>
          </div>
        </div>
        <p className="mt-1.5 text-right text-micro tabular-nums text-muted-text">{fmtDur(total)} connection − {fmtDur(plan.bufferMin)} buffer
          {count > 0 && <> · {count} {count === 1 ? 'activity' : 'activities'} saved</>}</p>
        <button onClick={onView} className="btn-coral press mt-4 flex min-h-12 w-full scroll-mb-[calc(var(--nav-h)+1rem)] items-center justify-center rounded-full text-body font-semibold">View layover</button>
      </section>
    </article>
  )
}

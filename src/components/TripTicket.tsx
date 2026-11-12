import { Plane } from 'lucide-react'
import type { Plan } from '../data/types'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { fmtDur, layoverMinutesAt } from '../data/time'
import { cx } from './ui'

interface Props { plan: Plan; onView: () => void }

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const time = (local: string) => local.slice(11, 16)

/** Boarding-pass composition: the journey's end points as huge IATA codes at opposite ends with a centred plane on a
 *  dashed line, the CONNECTION's arrival and departure times beneath them, then a compact layover section.
 *  Data comes from the saved plan (route labels restored from the sample booking where applicable). */
export function TripTicket({ plan, onView }: Props) {
  const ap = getAirport(plan.airport)
  const total = layoverMinutesAt(plan.arrival, plan.departure, ap.timezone)
  const usable = Math.max(0, total - plan.bufferMin)
  const count = plan.activityIds.length
  const hasRoute = !!(plan.origin && plan.destination)
  const from = hasRoute ? airportInfo(plan.origin) : undefined, to = hasRoute ? airportInfo(plan.destination) : undefined
  const plusDays = Math.round((Date.parse(plan.departure.slice(0, 10)) - Date.parse(plan.arrival.slice(0, 10))) / 86400000)

  // Upper section: [name / CODE / time / caption] at each end, plane in the middle.
  const code = 'block text-[clamp(2.5rem,12.5vw,3rem)] font-bold leading-[0.95] tracking-[-0.035em] text-ink'
  const big = 'block text-[clamp(1.875rem,9.5vw,2.25rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink'
  const name = 'block truncate text-[clamp(1.25rem,6vw,1.5rem)] font-semibold leading-tight tracking-[-0.01em] text-ink/75'
  const caption = 'mt-1.5 block whitespace-nowrap text-[0.6875rem] leading-tight text-muted-text'

  return (
    <article aria-label="Upcoming trip" className="relative overflow-hidden rounded-[1.75rem] bg-white text-ink shadow-[0_10px_30px_rgb(70_35_25/0.09)] ring-1 ring-[rgb(35_26_23/0.06)]">
      <section aria-label={hasRoute ? `Journey ${plan.origin} to ${plan.destination} via ${ap.code}` : `Connection at ${ap.code}`} className="px-5 pb-5 pt-5">
        {/* names at opposite ends */}
        <div className="flex justify-between gap-3">
          <span className={name}>{hasRoute ? from?.city ?? plan.origin : 'Arrive'}</span>
          <span className={cx(name, 'text-right')}>{hasRoute ? to?.city ?? plan.destination : 'Depart'}</span>
        </div>
        {/* codes (or, without a route, the connection times) with the plane on a dashed line between them */}
        <div className="mt-1 grid grid-cols-[auto_minmax(2.5rem,1fr)_auto] items-center gap-x-2.5">
          <span className={hasRoute ? code : big}>{hasRoute ? plan.origin : time(plan.arrival)}</span>
          <span aria-hidden="true" className="flex min-w-0 items-center gap-1.5">
            <span className="h-0 min-w-2 flex-1 border-t-[1.5px] border-dashed border-[rgb(35_26_23/0.28)]" />
            <Plane size={30} strokeWidth={1.5} fill="currentColor" className="shrink-0 rotate-45 text-ink" />
            <span className="h-0 min-w-2 flex-1 border-t-[1.5px] border-dashed border-[rgb(35_26_23/0.28)]" />
          </span>
          <span className={cx(hasRoute ? code : big, 'text-right')}>{hasRoute ? plan.destination : time(plan.departure)}</span>
        </div>
        {/* the connection's arrival and departure times beneath the codes */}
        {hasRoute && (
          <div className="mt-3 flex justify-between gap-3">
            <span className={big}>{time(plan.arrival)}</span>
            <span className={cx(big, 'text-right')}>{time(plan.departure)}</span>
          </div>)}
        <div className="flex justify-between gap-3">
          <span className={caption}>{hasRoute ? `Arrive ${ap.code}` : `at ${ap.code}`} · {day(plan.arrival)}</span>
          <span className={cx(caption, 'text-right')}>{hasRoute ? `Depart ${ap.code}` : `at ${ap.code}`} · {day(plan.departure)}{plusDays > 0 && <sup className="ml-0.5 font-semibold text-accent-dark">+{plusDays}</sup>}</span>
        </div>
      </section>

      {/* boarding-pass tear line */}
      <div aria-hidden="true" className="relative h-0">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-canvas ring-1 ring-[rgb(35_26_23/0.06)]" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-canvas ring-1 ring-[rgb(35_26_23/0.06)]" />
        <span className="absolute inset-x-5 top-0 border-t-[1.5px] border-dashed border-[rgb(35_26_23/0.14)]" />
      </div>

      <section aria-label="Layover" className="px-5 pb-5 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-accent-dark">Transit</p>
            <p className="mt-0.5 truncate text-[1.0625rem] font-semibold">{ap.code} · {ap.city}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.75rem] text-muted-text">Time to explore</p>
            <p className="text-[1.75rem] font-bold leading-none tracking-[-0.02em] tabular-nums text-accent-dark">{fmtDur(usable)}</p>
          </div>
        </div>
        <p className="mt-2 text-[0.75rem] text-muted-text"><span className="whitespace-nowrap">{fmtDur(total)} connection − {fmtDur(plan.bufferMin)} buffer</span>{count > 0 && <> · <span className="whitespace-nowrap">{count} {count === 1 ? 'activity' : 'activities'} saved</span></>}</p>
        <button onClick={onView} className="btn-coral press mt-4 flex min-h-12 w-full scroll-mb-[calc(var(--nav-h)+1rem)] items-center justify-center rounded-full text-body font-semibold">View layover</button>
      </section>
    </article>
  )
}

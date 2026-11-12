import { useState } from 'react'
import type { Plan } from '../data/types'
import { getAirport } from '../data/mock'
import { TripTicket } from './TripTicket'
import { cx } from './ui'

const shortDay = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Apple Wallet-style stack: the selected flight (by default the nearest upcoming one) is the full boarding pass in
 *  front; up to three other flights peek above it as slim strips. Tapping a strip brings that flight to the front. */
export function FlightStack({ flights, onOpen }: { flights: Plan[]; onOpen: (p: Plan) => void }) {
  const [frontId, setFrontId] = useState<string | null>(null)
  const front = flights.find((f) => f.id === frontId) ?? flights[0]
  if (!front) return null
  // Strips: other upcoming flights in date order, the nearest sitting just above the front card.
  const behind = flights.filter((f) => f.id !== front.id).slice(0, 3).reverse()
  const depth = behind.length
  return (
    <section aria-label="Upcoming layovers" className="relative">
      {behind.map((f, i) => {
        const level = depth - i // 1 = directly behind the front card
        const route = f.origin && f.destination ? `${f.origin} → ${f.destination}` : getAirport(f.airport).code
        return (
          <button key={f.id} onClick={() => setFrontId(f.id)} aria-label={`Show flight ${f.origin && f.destination ? `${f.origin} to ${f.destination} via ${f.airport}` : `connecting at ${f.airport}`}, ${shortDay(f.arrival)}`}
            style={{ zIndex: i, transform: `scale(${1 - level * 0.035})` }}
            className={cx('press relative -mb-[1.65rem] flex h-[4.4rem] w-full origin-bottom items-start justify-between gap-3 rounded-t-[1.6rem] rounded-b-xl px-5 pt-3 text-left',
              'ring-1 ring-[rgb(234_81_57/0.1)] transition-transform duration-300 motion-reduce:transition-none',
              // near-white cards; the coral comes through as a glow that grows further back in the stack
              level === 1 ? 'bg-[#fffaf7] shadow-[0_-6px_18px_rgb(234_81_57/0.14)]' : level === 2 ? 'bg-[#fff6f1] shadow-[0_-8px_22px_rgb(234_81_57/0.22)]' : 'bg-[#fff2eb] shadow-[0_-10px_26px_rgb(234_81_57/0.3)]')}>
            <span className="min-w-0 truncate text-[1.375rem] font-bold leading-none tracking-[-0.02em] text-ink">{route}</span>
            <span className="shrink-0 text-right text-[0.75rem] leading-tight text-ink/70">via <b className="font-semibold text-ink">{f.airport}</b><br />{shortDay(f.arrival)}</span>
          </button>
        )
      })}
      <div key={front.id} className="anim-rise relative" style={{ zIndex: 10 }}>
        <TripTicket plan={front} onView={() => onOpen(front)} />
      </div>
    </section>
  )
}

import { ChevronLeft, ChevronRight, Compass, Map as MapIcon, MapPin, Pencil, Plane, Plus } from 'lucide-react'
import { IMAGES, sized } from '../data/images'
import { useApp } from '../store'
import { ACTIVITIES, getAirport, isSupported } from '../data/mock'
import { fmtDur, isOvernight } from '../data/time'
import { useState } from 'react'
import type { Activity, Plan } from '../data/types'
import { computeItinerary, terminalChoices } from '../data/itinerary'
import { ItineraryTimeline } from '../components/Timeline'
import { BudgetHero } from '../components/BudgetHero'
import { ActivitySheet, Backdrop, Button, Header, Notice, Photo, SectionTitle, Skeleton, cx, IconButton } from '../components/ui'
import { flightView } from '../features/flightUpdates/updates'
import { planningImpact } from '../features/flightUpdates/impact'
import { GateRow, PlanReview, TimeCell, UpdateLine } from '../features/flightUpdates/FlightUpdateUI'

/** A saved flight as an editable draft (same plan id: saving it updates this flight, never adds another). */
const toDraft = (p: Plan) => ({ planId: p.id, revision: p.revision, bookingRef: p.bookingRef, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure,
  bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination, arrivalLocation: p.arrivalLocation, departureLocation: p.departureLocation })
const itemsOf = (p: Plan) => p.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const dayLabel = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** One saved itinerary: the connecting airport's photo on top, then a glass "boarding strip" with the arrive and depart
 *  times joined by a bar of how the layover is spent, so each plan reads at a glance. */
function PlanCard({ p, i }: { p: Plan; i: number }) {
  const { go } = useApp()
  const ap = getAirport(p.airport)
  const h = computeItinerary(p).hero, over = h.remaining < 0
  const total = Math.max(h.total, 1), pct = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`
  const n = p.activityIds.length
  const v = flightView(p), changed = v.changed.arrival || v.changed.departure
  const nextDay = v.departure.slice(0, 10) !== v.arrival.slice(0, 10)
  return (
    <li className="anim-rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
      <button onClick={() => go({ name: 'plan', id: p.id })} className="panel press block w-full overflow-hidden rounded-surface text-left"
        aria-label={`${p.name}, ${dayLabel(v.arrival)}, ${n} ${n === 1 ? 'activity' : 'activities'}, ${over ? `${fmtDur(-h.remaining)} over` : `${fmtDur(h.remaining)} left`}${changed ? ', flight time changed' : ''}`}>
        <span className="ph relative block h-36 overflow-hidden">
          <Photo img={ap.image} w={420} h={144} className="absolute inset-0 size-full" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
          <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-cap font-bold tracking-wide text-white">{p.airport}</span>
          {ap.country && (
            <span className="glass-dark absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-cap font-medium text-white">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />{ap.country}
            </span>)}
          <span className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
            <b className="min-w-0 truncate text-h2 font-bold [text-shadow:0_2px_12px_rgb(0_0_0/0.4)]">{p.name}</b>
            <ChevronRight size={22} className="mb-0.5 shrink-0 text-white/80" aria-hidden="true" />
          </span>
        </span>
        <span aria-hidden="true" className="block px-4 pb-4 pt-3.5">
          <span className="flex items-center justify-between text-cap text-muted-text"><span>{dayLabel(v.arrival)}{changed && <span className="font-semibold text-accent-dark"> · Time changed</span>}</span>
            <span className={cx('rounded-full px-2.5 py-0.5 font-semibold', over ? 'bg-error-tint text-error' : 'bg-accent-tint text-accent-dark')}>
              {n} {n === 1 ? 'activity' : 'activities'} · {over ? `${fmtDur(-h.remaining)} over` : `${fmtDur(h.remaining)} left`}</span></span>
          <span className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <span className={cx('text-h2 font-bold tabular-nums leading-none', v.changed.arrival && 'text-accent-dark')}>{v.arrival.slice(11, 16)}</span>
            <span className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className="bg-[repeating-linear-gradient(135deg,rgb(255_240_232/0.5)_0_3px,rgb(255_240_232/0.2)_3px_6px)]" style={{ width: pct(h.buffer) }} />
              <span className={over ? 'bg-error' : 'bg-[image:var(--coral-grad)]'} style={{ width: pct(h.activityMin) }} />
              {h.routing && <span className="bg-amber" style={{ width: pct(h.transferMin) }} />}
            </span>
            <span className={cx('text-h2 font-bold tabular-nums leading-none', v.changed.departure && 'text-accent-dark')}>{v.departure.slice(11, 16)}{nextDay && <sup className="ml-0.5 text-micro text-muted-text">+1</sup>}</span>
          </span>
          <span className="mt-1.5 flex justify-between text-micro text-muted-text"><span>Arrive {p.airport}</span><span>{fmtDur(h.total)} layover</span><span>Depart</span></span>
        </span>
      </button>
    </li>)
}

/** Screen 5: retrieve and reopen saved plans. A photographic header from the next plan's airport, then the plans. */
export function Plans() {
  const { plans: allPlans, plansState, reload, go } = useApp()
  // My Plans = saved activity itineraries. Flights without one are listed in My Flights.
  const plans = allPlans.filter((p) => p.activityIds.length > 0)
  const bare = allPlans.length - plans.length
  const lead = plans[0] && IMAGES.airports[plans[0].airport]
  const first = plans.map((p) => p.arrival).sort()[0] ?? ''
  return (
    <div className="relative pb-[calc(var(--nav-h)+1.5rem)]">
      <Backdrop img={lead ?? IMAGES.airports.SIN} className="h-[17rem]" />
      <div className="relative px-gutter pb-5 pt-[calc(var(--safe-top)+4.5rem)]">
        <h1 className="text-title font-bold leading-none tracking-[-0.03em] [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">My plans</h1>
        <p className="mt-2 text-sub text-ink/85 [text-shadow:0_1px_10px_rgb(0_0_0/0.5)]">
          {plansState.status === 'ready' && plans.length
            ? `${plans.length} ${plans.length === 1 ? 'itinerary' : 'itineraries'} saved · from ${dayLabel(first)}`
            : 'Your saved layover itineraries'}</p>
      </div>
      <div className="relative px-5">
        {plansState.status === 'loading' ? (
          <div role="status" className="grid gap-4"><span className="sr-only">Loading your plans…</span>
            <Skeleton className="h-56 rounded-surface" /><Skeleton className="h-56 rounded-surface" /></div>
        ) : plansState.status === 'error' ? (
          <Notice tone="warn"><p className="font-semibold">We could not load your plans</p>
            <p>Check your connection and try again.</p>
            <Button variant="secondary" className="mt-2" onClick={reload}>Try again</Button></Notice>
        ) : plans.length === 0 ? (
          <div className="glass-premium rounded-surface p-6 text-center">
            <span aria-hidden="true" className="relative mx-auto mb-5 grid size-20 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(234_81_57/0.35),transparent_70%)]" />
              <span className="btn-coral relative grid size-14 place-items-center rounded-full"><Plane size={24} className="-rotate-45" /></span>
            </span>
            <p className="text-h2 font-bold">No saved itineraries yet</p>
            <p className="mt-2 text-body text-muted-text">{bare ? `You have ${bare} saved ${bare === 1 ? 'flight' : 'flights'} without activities. Open one to plan your layover.` : 'Add a flight, choose activities and save your itinerary.'}</p>
            <Button className="mt-5 w-full" onClick={() => go(bare ? { name: 'flights' } : { name: 'booking' })}>{bare ? 'My flights' : 'Add flight'}</Button>
          </div>
        ) : (
          <ul className="grid gap-4">
            {plans.map((p, i) => <PlanCard key={p.id} p={p} i={i} />)}
            <li>
              <button onClick={() => go({ name: 'booking' })} className="press flex min-h-20 w-full items-center gap-4 rounded-surface border border-dashed border-white/20 bg-white/[0.04] px-5 py-4 text-left">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-dark"><Plus size={22} /></span>
                <span className="min-w-0"><b className="block text-card font-semibold">Plan another layover</b>
                  <span className="block text-sub text-muted-text">Add a flight to start a new itinerary.</span></span>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}

export function PlanDetail({ id }: { id: string }) {
  const { plans, plansState, setDraft, go, back, savePlan, setNotice } = useApp()
  const [open, setOpen] = useState<Activity | null>(null)
  const p = plans.find((x) => x.id === id)
  if (!p) return <div><Header title="Plan" /><p className="p-6 text-center text-muted-text">{plansState.status === 'loading' ? 'Loading your plan…' : 'This plan is not available.'}</p></div>
  const items = itemsOf(p)
  const ap = getAirport(p.airport)
  // Every number below reads the flight as it is now (booking + any flight update); the booking itself is unchanged.
  const plan = computeItinerary(p)
  const v = flightView(p), impact = planningImpact(p)
  return (
    <div className="pb-8">
      <div className="ph relative h-[19rem] overflow-hidden">
        <img src={sized(ap.image, 900, 620)} alt={ap.image.alt} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-deep/90 via-deep/45 to-transparent" />
        <div className="hero-melt absolute inset-x-0 bottom-0 h-10" />
        <IconButton label="Back" icon={ChevronLeft} tone="dark" iconSize={26} onClick={back} className="absolute left-gutter top-[calc(var(--safe-top)+0.25rem)]" />
        <div className="absolute inset-x-5 bottom-10 text-white">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold">{ap.name} ({ap.code})</p>
          <h1 className="mt-2 text-title font-bold leading-tight">{p.name}</h1>
        </div>
      </div>
      <div className="grid gap-3 px-5 pt-2">
        <div className="panel grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-card p-4">
          <TimeCell label="Arrive" now={v.arrival} was={v.original.arrival} changed={v.changed.arrival} fmt={when} />
          <span aria-hidden="true" className="btn-coral grid size-9 place-items-center rounded-full"><Plane size={16} /></span>
          <TimeCell label="Depart" now={v.departure} was={v.original.departure} changed={v.changed.departure} fmt={when} right />
          <GateRow v={v} />
        </div>
        {impact && <UpdateLine i={impact} planned={items.length > 0} />}
        <BudgetHero n={plan.hero} overnight={isOvernight(new Date(v.arrival), new Date(v.departure))} />
        <PlanReview plan={p} onApply={async (r) => {
          const saved = await savePlan({ ...toDraft(p), activityIds: r.activityIds }, { fix: true })
          setNotice(`Plan updated: ${fmtDur(computeItinerary(saved).hero.remaining)} left to explore.`)
        }} />
        {items.length ? (<>
          <SectionTitle>Activities ({items.length})</SectionTitle>
          <ItineraryTimeline airportCode={ap.code} arrival={new Date(v.arrival)} departure={new Date(v.departure)}
            arrivalNote={p.arrivalLocation ? terminalChoices(p.airport).find((t) => t.id === p.arrivalLocation)?.name : undefined}
            departureNote={v.departureLocation ? terminalChoices(p.airport).find((t) => t.id === v.departureLocation)?.name : undefined}
            items={plan.items} hops={plan.itin.hops} usable={plan.hero.usable} buffer={plan.hero.buffer} onOpen={setOpen} />
        </>) : (
          // A saved flight is not yet a plan: the way forward is discovering what fits.
          <section aria-label="Itinerary" className="panel mt-1 rounded-surface p-5 text-center">
            <span aria-hidden="true" className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-accent-tint text-accent-dark"><Compass size={22} /></span>
            <p className="text-card font-semibold">No activities planned yet</p>
            <p className="mt-1 text-body text-muted-text">Discover what you can do during your layover.</p>
            <Button className="mt-4 w-full" icon={Compass} onClick={() => { setDraft(toDraft(p)); go(isSupported(p.airport) ? { name: 'airport', code: p.airport, view: 'list' } : { name: 'builder' }) }}>Explore activities</Button>
          </section>
        )}
        <div className="mt-3 grid gap-2">
          {items.length > 0 && <Button variant="secondary" icon={MapIcon} onClick={() => { setDraft({ planId: p.id, revision: p.revision, bookingRef: p.bookingRef, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure, bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination, arrivalLocation: p.arrivalLocation, departureLocation: p.departureLocation }); go({ name: 'airport', code: p.airport, view: 'map', map: 'plan' }) }}>
            View route on map</Button>}
          {items.length > 0 && <Button icon={Pencil} onClick={() => {
          setDraft({ planId: p.id, revision: p.revision, bookingRef: p.bookingRef, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure, bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination, arrivalLocation: p.arrivalLocation, departureLocation: p.departureLocation })
          go({ name: 'builder' })
        }}>Edit plan</Button>}
        </div>
      </div>
      <ActivitySheet a={open} onClose={() => setOpen(null)} />
    </div>
  )
}

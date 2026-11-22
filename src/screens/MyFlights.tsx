import { useState } from 'react'
import { Plane, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { localToInstant } from '../domain'
import { Backdrop, Button, Header, Notice, Sheet, cx, EmptyState, SectionHeader, IconButton } from '../components/ui'
import { IMAGES } from '../data/images'
import type { Plan } from '../data/types'
import { flightView } from '../features/flightUpdates/updates'

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const departsAt = (p: Plan) => {
  const dep = flightView(p).departure // current departure (booking + any flight update)
  try { return localToInstant(dep.slice(0, 10), dep.slice(11, 16), getAirport(p.airport).timezone).epochMilliseconds } catch { return Date.parse(dep) }
}

/** My Flights: every saved flight journey (upcoming first, then past). A flight may or may not have an itinerary. */
export function MyFlights() {
  const { plans, go, removePlan, plansState } = useApp()
  const [confirm, setConfirm] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = Date.now()
  const sorted = [...plans].sort((a, b) => departsAt(a) - departsAt(b))
  const upcoming = sorted.filter((p) => departsAt(p) >= now), past = sorted.filter((p) => departsAt(p) < now).reverse()

  const remove = async () => {
    if (!confirm || busy) return
    setBusy(true); setError(null)
    try { await removePlan(confirm.id); setConfirm(null) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const Row = ({ p }: { p: Plan }) => {
    const ap = getAirport(p.airport), n = p.activityIds.length
    const route = !!(p.origin && p.destination)
    const v = flightView(p), changed = v.changed.arrival || v.changed.departure
    return (
      <li className="panel relative isolate overflow-hidden rounded-card">
        {/* the connecting airport's bundled photo fades in from the right, behind the text */}
        {IMAGES.airports[p.airport] && (
          <div aria-hidden="true" className="ph pointer-events-none absolute inset-y-0 right-0 -z-10 w-[62%] [mask-image:linear-gradient(to_right,transparent,#000_55%)]">
            <img src={IMAGES.airports[p.airport].url} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="size-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-canvas/70 to-black/20" />
          </div>)}
        <button onClick={() => go({ name: 'plan', id: p.id })} className="press block w-full px-4 pb-3.5 pt-4 pr-14 text-left"
          aria-label={`${route ? `${p.origin} to ${p.destination} via ${p.airport}` : `Connection at ${p.airport}`}, ${day(v.arrival)}${changed ? ', flight time changed' : ''}`}>
          {route ? (
            <span className="flex items-center gap-2 text-h1 font-bold leading-none tracking-[-0.03em]">
              {p.origin}<span aria-hidden="true" className="flex min-w-6 flex-1 items-center gap-1 text-ink">
                <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-white/30" /><Plane size={16} fill="currentColor" className="rotate-45" />
                <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-white/30" /></span>{p.destination}
            </span>
          ) : <span className="block text-h1 font-bold leading-none tracking-[-0.03em]">{ap.code}</span>}
          <span className="mt-2 block text-sub text-ink">{route ? <>via <b className="font-semibold">{ap.code}</b> · {airportInfo(p.airport)?.city ?? ap.city}</> : <>Connection in {ap.city}</>}</span>
          <span className="block text-sub text-muted-text">{day(v.arrival)} · <span className={cx(v.changed.arrival && 'font-semibold text-accent-dark')}>{v.arrival.slice(11, 16)}</span> → <span className={cx(v.changed.departure && 'font-semibold text-accent-dark')}>{v.departure.slice(11, 16)}</span>{v.departure.slice(0, 10) !== v.arrival.slice(0, 10) ? ' +1' : ''}{changed && <span className="text-accent-dark"> · Time changed</span>}</span>
          <span className={cx('mt-2 inline-flex rounded-full px-2.5 py-0.5 text-cap font-semibold', n ? 'bg-accent-tint text-accent-dark' : 'bg-ink-tint text-muted-text')}>
            {n ? `Itinerary · ${n} ${n === 1 ? 'activity' : 'activities'}` : 'No itinerary yet'}</span>
        </button>
        <IconButton label={`Remove flight ${route ? `${p.origin} to ${p.destination}` : `at ${p.airport}`}`} icon={Trash2} tone="danger" size="sm" iconSize={19} className="absolute right-2 top-2.5"
          onClick={() => { setError(null); setConfirm(p) }} />
      </li>
    )
  }

  return (
    <div className="relative pb-[calc(var(--nav-h)+2rem)]">
      <Backdrop img={IMAGES.airports[upcoming[0]?.airport ?? ''] ?? IMAGES.airports.DXB} className="h-[18rem]" />
      <Header title="My flights" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 px-5 pt-2">
        {plans.length > 0 && (
          <div className="pt-16">
            <p className="text-title font-bold leading-none tracking-[-0.03em] [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">
              {upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'flight' : 'flights'} ahead` : 'All flown'}</p>
            <p className="mt-1.5 text-sub text-white/85 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
              {plans.filter((p) => p.activityIds.length).length} with an itinerary · {past.length} past</p>
          </div>)}
        {plansState.status === 'error' && <Notice tone="warn">Your flights could not be loaded. Check your connection and try again.</Notice>}
        {plans.length === 0 && plansState.status === 'ready' && (
          <EmptyState title="No flights yet">Add a booked flight with its booking reference or by hand.</EmptyState>)}
        {upcoming.length > 0 && <section aria-label="Upcoming flights"><SectionHeader className="mb-3">Upcoming</SectionHeader><ul className="grid gap-3">{upcoming.map((p) => <Row key={p.id} p={p} />)}</ul></section>}
        {past.length > 0 && <section aria-label="Past flights"><SectionHeader className="mb-3 text-muted-text">Past</SectionHeader><ul className="grid gap-3 opacity-80">{past.map((p) => <Row key={p.id} p={p} />)}</ul></section>}
        <Button icon={Plus} className="w-full" onClick={() => go({ name: 'booking' })}>Add flight</Button>
      </div>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Remove this flight?">
        {confirm && (
          <div className="grid gap-3 pb-2">
            <p className="text-body text-ink/85">{confirm.activityIds.length
              ? `Its itinerary (${confirm.activityIds.length} ${confirm.activityIds.length === 1 ? 'activity' : 'activities'}) is part of this flight and will be removed too.`
              : 'This flight has no saved itinerary.'} This cannot be undone.</p>
            {error && <Notice tone="warn">{error}</Notice>}
            <Button variant="danger" icon={Trash2} disabled={busy} onClick={remove}>{busy ? 'Removing…' : confirm.activityIds.length ? 'Remove flight and itinerary' : 'Remove flight'}</Button>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Keep it</Button>
          </div>)}
      </Sheet>
    </div>
  )
}

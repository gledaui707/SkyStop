import { useState } from 'react'
import { ChevronRight, ListChecks, Plane, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { localToInstant } from '../domain'
import { Backdrop, Button, Header, Notice, Photo, Sheet, Skeleton, cx, SectionHeader, IconButton } from '../components/ui'
import { fmtDur } from '../data/time'
import { IMAGES } from '../data/images'
import type { Plan } from '../data/types'
import { flightView } from '../features/flightUpdates/updates'

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const departsAt = (p: Plan) => {
  const dep = flightView(p).departure // current departure (booking + any flight update)
  try { return localToInstant(dep.slice(0, 10), dep.slice(11, 16), getAirport(p.airport).timezone).epochMilliseconds } catch { return Date.parse(dep) }
}

const instant = (p: Plan, local: string) => {
  try { return localToInstant(local.slice(0, 10), local.slice(11, 16), getAirport(p.airport).timezone).epochMilliseconds } catch { return Date.parse(local) }
}
const minutesBetween = (p: Plan, a: string, b: string) => Math.max(0, Math.round((instant(p, b) - instant(p, a)) / 60000))
/** Whole calendar days from today to the arrival date (negative when past). */
const daysUntil = (_p: Plan, local: string, now: number) =>
  Math.round((Date.parse(`${local.slice(0, 10)}T00:00:00Z`) - Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000)

const hoursLabel = (min: number) => `${Math.round(min / 60)}h`

const Dash = () => <span className="h-0 border-t-[1.5px] border-dashed border-white/30" />
function Node({ code, label, time, changed, right, big }: { code: string; label: string; time: string; changed?: boolean; right?: boolean; big: 'code' | 'time' }) {
  return (
    <span className={cx('grid', right ? 'justify-items-end text-right' : 'justify-items-start')}>
      <span className="text-micro font-semibold uppercase tracking-[0.08em] text-muted-text">{label}</span>
      <span className={cx('text-h2 font-bold tabular-nums leading-tight', changed && big === 'time' && 'text-accent-dark')}>{big === 'time' ? time : code}</span>
      {big === 'code' && <span className={cx('text-sub tabular-nums', changed ? 'font-semibold text-accent-dark' : 'text-muted-text')}>{time}</span>}
    </span>)
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

  const Row = ({ p, next, i }: { p: Plan; next?: boolean; i: number }) => {
    const ap = getAirport(p.airport), n = p.activityIds.length
    const route = !!(p.origin && p.destination)
    const v = flightView(p), changed = v.changed.arrival || v.changed.departure
    const nextDay = v.departure.slice(0, 10) !== v.arrival.slice(0, 10)
    const conn = minutesBetween(p, v.arrival, v.departure)
    const until = daysUntil(p, v.arrival, now)
    const photo = IMAGES.airports[p.airport] ?? ap.image
    return (
      <li className="anim-rise relative" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
        <button onClick={() => go({ name: 'plan', id: p.id })}
          className={cx('press block w-full overflow-hidden rounded-surface text-left', next ? 'panel-accent' : 'panel')}
          aria-label={`${route ? `${p.origin} to ${p.destination} via ${p.airport}` : `Connection at ${p.airport}`}, ${day(v.arrival)}, ${fmtDur(conn)} connection${changed ? ', flight time changed' : ''}, ${n ? `itinerary with ${n} ${n === 1 ? 'activity' : 'activities'}` : 'no itinerary yet'}`}>
          {/* window: the connecting airport, its city and when */}
          <span aria-hidden="true" className="ph relative block h-28 overflow-hidden">
            {photo && <Photo img={photo} w={420} h={112} className="absolute inset-0 size-full" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
            <span className="absolute inset-x-4 bottom-3 flex items-end gap-3 pr-0 text-white">
              <b className="text-h1 font-bold leading-none tracking-[-0.03em] [text-shadow:0_2px_12px_rgb(0_0_0/0.4)]">{ap.code}</b>
              <span className="min-w-0 flex-1 truncate pb-0.5 text-sub text-white/90">{airportInfo(p.airport)?.city ?? ap.city}</span>
            </span>
            <span className={cx('absolute left-4 top-3 rounded-full px-3 py-1 text-cap font-semibold', next ? 'btn-coral' : 'glass-dark text-white')}>
              {until > 1 ? `In ${until} days` : until === 1 ? 'Tomorrow' : until === 0 ? 'Today' : day(v.arrival)}</span>
          </span>
          {/* ticket body: route rail with the layover as the coral node */}
          <span aria-hidden="true" className="block px-4 pb-3 pt-3.5">
            <span className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2">
              <Node code={p.origin ?? ap.code} label={route ? `Arrive from` : 'Arrive'} time={v.arrival.slice(11, 16)} changed={v.changed.arrival} big={route ? 'code' : 'time'} />
              <Dash />
              <span className="grid justify-items-center">
                <span className="btn-coral grid size-9 place-items-center rounded-full shadow-glow"><Plane size={16} fill="currentColor" className="rotate-45" /></span>
                <span className="mt-1 text-micro font-semibold tabular-nums text-accent-dark">{fmtDur(conn)}</span>
              </span>
              <Dash />
              <Node right code={p.destination ?? ap.code} label={route ? 'Depart to' : 'Depart'} time={`${v.departure.slice(11, 16)}${nextDay ? ' +1' : ''}`} changed={v.changed.departure} big={route ? 'code' : 'time'} />
            </span>
          </span>
          {/* perforation between ticket and stub */}
          <span aria-hidden="true" className="relative mx-4 block border-t border-dashed border-white/20" />
          <span aria-hidden="true" className="flex items-center justify-between gap-3 px-4 pb-3.5 pt-3 text-sub">
            <span className="min-w-0 text-muted-text">
              <span className="text-ink">{day(v.arrival)}</span>{nextDay ? ' · next-day departure' : ''}
              {changed && <span className="block text-cap font-semibold text-accent-dark">Time changed</span>}
            </span>
            <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-cap font-semibold', n ? 'bg-accent-tint text-accent-dark' : 'bg-ink-tint text-muted-text')}>
              {n ? <><ListChecks size={14} />{n} {n === 1 ? 'stop' : 'stops'}</> : 'No itinerary yet'}<ChevronRight size={14} /></span>
          </span>
        </button>
        <IconButton label={`Remove flight ${route ? `${p.origin} to ${p.destination}` : `at ${p.airport}`}`} icon={Trash2} tone="dark" size="sm" iconSize={18} className="absolute right-2.5 top-2"
          onClick={() => { setError(null); setConfirm(p) }} />
      </li>
    )
  }

  const planned = plans.filter((p) => p.activityIds.length).length
  return (
    <div className="relative pb-[calc(var(--nav-h)+2rem)]">
      <Backdrop img={IMAGES.airports[upcoming[0]?.airport ?? ''] ?? IMAGES.airports.DXB} className="h-[20rem]" />
      <Header title="My flights" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-6 px-5 pt-2">
        {plans.length > 0 && (
          <div className="pt-10">
            <p className="text-title font-bold leading-none tracking-[-0.03em] [text-shadow:0_2px_16px_rgb(0_0_0/0.45)]">
              {upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'flight' : 'flights'} ahead` : 'All flown'}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {([['Layovers', hoursLabel(upcoming.reduce((t, p) => { const v = flightView(p); return t + minutesBetween(p, v.arrival, v.departure) }, 0))], ['Planned', `${planned} of ${plans.length}`], ['Past', String(past.length)]] as const).map(([k, val]) => (
                <div key={k} className="glass-subtle min-w-0 rounded-card px-3 py-2">
                  <dt className="truncate text-cap text-white/80">{k}</dt>
                  <dd className="truncate text-card font-bold tabular-nums leading-tight">{val}</dd>
                </div>))}
            </dl>
          </div>)}
        {plansState.status === 'loading' && plans.length === 0 && (
          <div role="status" className="grid gap-4 pt-16"><span className="sr-only">Loading your flights…</span><Skeleton className="h-60 rounded-surface" /></div>)}
        {plansState.status === 'error' && <Notice tone="warn">Your flights could not be loaded. Check your connection and try again.</Notice>}
        {plans.length === 0 && plansState.status === 'ready' && (
          <div className="glass-premium mt-16 rounded-surface p-6 text-center">
            <span aria-hidden="true" className="relative mx-auto mb-5 grid size-20 place-items-center">
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(234_81_57/0.35),transparent_70%)]" />
              <span className="btn-coral relative grid size-14 place-items-center rounded-full"><Plane size={24} className="-rotate-45" /></span>
            </span>
            <p className="text-h2 font-bold">No flights yet</p>
            <p className="mt-2 text-body text-muted-text">Add a booked flight with its booking reference or by hand.</p>
            <Button icon={Plus} className="mt-5 w-full" onClick={() => go({ name: 'booking' })}>Add flight</Button>
          </div>)}
        {upcoming.length > 0 && <section aria-label="Upcoming flights">{past.length > 0 && <SectionHeader className="mb-3">Upcoming</SectionHeader>}<ul className="grid gap-4">{upcoming.map((p, i) => <Row key={p.id} p={p} i={i} next={i === 0} />)}</ul></section>}
        {past.length > 0 && <section aria-label="Past flights"><SectionHeader className="mb-3 text-muted-text">Past</SectionHeader><ul className="grid gap-4 opacity-75 saturate-50">{past.map((p, i) => <Row key={p.id} p={p} i={i} />)}</ul></section>}
        {plans.length > 0 && (
          <button onClick={() => go({ name: 'booking' })} className="press flex min-h-20 w-full items-center gap-4 rounded-surface border border-dashed border-white/20 bg-white/[0.04] px-5 py-4 text-left">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-dark"><Plus size={22} /></span>
            <span className="min-w-0"><b className="block text-card font-semibold">Add flight</b>
              <span className="block text-sub text-muted-text">With a booking reference or by hand.</span></span>
          </button>)}
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

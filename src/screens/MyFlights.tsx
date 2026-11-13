import { useState } from 'react'
import { Plane, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport } from '../data/mock'
import { airportInfo } from '../data/airportDirectory'
import { localToInstant } from '../domain'
import { Button, Header, Notice, Sheet, cx, EmptyState, SectionHeader, IconButton } from '../components/ui'
import type { Plan } from '../data/types'

const day = (local: string) => new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const departsAt = (p: Plan) => {
  try { return localToInstant(p.departure.slice(0, 10), p.departure.slice(11, 16), getAirport(p.airport).timezone).epochMilliseconds } catch { return Date.parse(p.departure) }
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
    return (
      <li className="relative overflow-hidden rounded-card bg-white shadow-[0_6px_20px_rgb(70_35_25/0.07)] ring-1 ring-[rgb(35_26_23/0.06)]">
        <button onClick={() => go({ name: 'plan', id: p.id })} className="press block w-full px-4 pb-3.5 pt-4 pr-14 text-left"
          aria-label={`${route ? `${p.origin} to ${p.destination} via ${p.airport}` : `Connection at ${p.airport}`}, ${day(p.arrival)}`}>
          {route ? (
            <span className="flex items-center gap-2 text-h1 font-bold leading-none tracking-[-0.03em]">
              {p.origin}<span aria-hidden="true" className="flex min-w-6 flex-1 items-center gap-1 text-ink">
                <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-[rgb(35_26_23/0.25)]" /><Plane size={16} fill="currentColor" className="rotate-45" />
                <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-[rgb(35_26_23/0.25)]" /></span>{p.destination}
            </span>
          ) : <span className="block text-h1 font-bold leading-none tracking-[-0.03em]">{ap.code}</span>}
          <span className="mt-2 block text-sub text-ink">{route ? <>via <b className="font-semibold">{ap.code}</b> · {airportInfo(p.airport)?.city ?? ap.city}</> : <>Connection in {ap.city}</>}</span>
          <span className="block text-sub text-muted-text">{day(p.arrival)} · {p.arrival.slice(11, 16)} → {p.departure.slice(11, 16)}{p.departure.slice(0, 10) !== p.arrival.slice(0, 10) ? ' +1' : ''}</span>
          <span className={cx('mt-2 inline-flex rounded-full px-2.5 py-0.5 text-cap font-semibold', n ? 'bg-accent-tint text-accent-dark' : 'bg-ink-tint text-muted-text')}>
            {n ? `Itinerary · ${n} ${n === 1 ? 'activity' : 'activities'}` : 'No itinerary yet'}</span>
        </button>
        <IconButton label={`Remove flight ${route ? `${p.origin} to ${p.destination}` : `at ${p.airport}`}`} icon={Trash2} tone="danger" size="sm" iconSize={19} className="absolute right-2 top-2.5"
          onClick={() => { setError(null); setConfirm(p) }} />
      </li>
    )
  }

  return (
    <div className="pb-[calc(var(--nav-h)+2rem)]">
      <Header title="My flights" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 px-5 pt-2">
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

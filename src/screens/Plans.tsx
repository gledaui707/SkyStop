import { useState } from 'react'
import { ChevronLeft, MapPin, Pencil, Plane, Trash2 } from 'lucide-react'
import { sized } from '../data/images'
import { useApp } from '../store'
import { ACTIVITIES, getAirport } from '../data/mock'
import { budget, fmtDur, isOvernight, layoverMinutesAt } from '../data/time'
import type { Plan } from '../data/types'
import { computeItinerary } from '../data/itinerary'
import { BudgetHero } from '../components/BudgetHero'
import { ActivityRow, Button, Header, LargeTitle, Notice, Photo, SectionTitle, Sheet, cx, IconButton } from '../components/ui'

const itemsOf = (p: Plan) => p.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Screen 5: retrieve and reopen saved plans. */
export function Plans() {
  const { plans: allPlans, plansState, reload, go } = useApp()
  // Every saved layover plan, soonest first; plans still without activities are included.
  const plans = [...allPlans].sort((a, b) => a.arrival.localeCompare(b.arrival))
  return (
    <div className="pb-6">
      <LargeTitle>My plans</LargeTitle>
      <div className="px-5">
        {plansState.status === 'loading' ? (
          <p role="status" className="py-8 text-center text-body text-muted-text">Loading your plans…</p>
        ) : plansState.status === 'error' ? (
          <Notice tone="warn"><p className="font-semibold">We could not load your plans</p>
            <p>Check your connection and try again.</p>
            <Button variant="secondary" className="mt-2" onClick={reload}>Try again</Button></Notice>
        ) : plans.length === 0 ? (
          <div className="panel-accent rounded-surface p-6 text-center">
            <span aria-hidden="true" className="btn-coral mx-auto mb-4 grid size-14 place-items-center rounded-full"><Plane size={24} className="-rotate-45" /></span>
            <p className="text-card font-semibold">No saved plans yet</p>
            <p className="mt-1 text-body text-muted-text">Plan a layover, choose activities and save it here.</p>
            <Button className="mt-4 w-full" onClick={() => go({ name: 'trip' })}>Plan a layover</Button>
          </div>
        ) : (
          <ul className="grid gap-4">
            {plans.map((p, i) => {
              const ap = getAirport(p.airport)
              const r = computeItinerary(p).hero, b = { over: r.remaining < 0, remaining: r.remaining }
              return (
                <li key={p.id} className="anim-rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                  <button onClick={() => go({ name: 'plan', id: p.id })} className="ph press relative block h-44 w-full overflow-hidden rounded-surface text-left text-white">
                    <Photo img={ap.image} w={420} h={176} className="absolute inset-0 size-full" />
                    <span className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
                    <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-cap font-bold tracking-wide">{p.airport}</span>
                    {ap.country && (
                      <span className="glass-dark absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-cap font-medium">
                        <MapPin size={14} className="shrink-0" aria-hidden="true" />{ap.country}
                      </span>
                    )}
                    <span className="absolute inset-x-4 bottom-4 block">
                      <b className="block truncate text-h2 font-bold">{p.name}</b>
                      <span className="block text-sub text-white/80">{when(p.arrival)}</span>
                      <span className={cx('mt-2 inline-flex rounded-full px-3 py-1 text-cap font-semibold backdrop-blur-md', b.over ? 'bg-[#ff5c4d]/30 text-white' : 'bg-white/20 text-white')}>
                        {p.activityIds.length ? `${p.activityIds.length} ${p.activityIds.length === 1 ? 'activity' : 'activities'} · ${b.over ? `${fmtDur(-b.remaining)} over` : `${fmtDur(b.remaining)} left`}` : `No activities yet · ${fmtDur(r.usable)} usable`}</span>
                    </span>
                  </button>
                </li>)
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export function PlanDetail({ id }: { id: string }) {
  const { plans, plansState, setDraft, go, back, removePlan, setNotice } = useApp()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const p = plans.find((x) => x.id === id)
  if (!p) return <div><Header title="Plan" /><p className="p-6 text-center text-muted-text">{plansState.status === 'loading' ? 'Loading your plan…' : 'This plan is not available.'}</p></div>
  const items = itemsOf(p)
  const ap = getAirport(p.airport)
  const mins = layoverMinutesAt(p.arrival, p.departure, ap.timezone)
  const b = budget(mins, p.bufferMin, items)
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
          <div><p className="text-cap text-muted-text">Arrive</p><p className="text-body font-semibold">{when(p.arrival)}</p></div>
          <span aria-hidden="true" className="btn-coral grid size-9 place-items-center rounded-full"><Plane size={16} /></span>
          <div className="text-right"><p className="text-cap text-muted-text">Depart</p><p className="text-body font-semibold">{when(p.departure)}</p></div>
        </div>
        <BudgetHero n={computeItinerary(p).hero} overnight={isOvernight(new Date(p.arrival), new Date(p.departure))} />
        <SectionTitle>Activities ({items.length})</SectionTitle>
        {items.length ? <ul className="grid gap-3">{items.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
          : <p className="text-body text-muted-text">No activities yet. Edit the plan to add some.</p>}
        <Button icon={Pencil} className="mt-3" onClick={() => {
          setDraft({ planId: p.id, revision: p.revision, bookingRef: p.bookingRef, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure, bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination, arrivalLocation: p.arrivalLocation, departureLocation: p.departureLocation })
          go({ name: 'builder' })
        }}>Edit plan</Button>
        <Button variant="ghost" icon={Trash2} className="text-error" onClick={() => { setError(null); setConfirm(true) }}>Remove plan</Button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Remove this plan?">
        <div className="grid gap-3 pb-2">
          <p className="text-body text-ink/85">{items.length ? `Its ${items.length} ${items.length === 1 ? 'activity' : 'activities'} will be removed too.` : 'This plan has no activities.'} This cannot be undone.</p>
          {error && <Notice tone="warn">{error}</Notice>}
          <Button variant="danger" icon={Trash2} disabled={busy} onClick={async () => {
            setBusy(true); setError(null)
            try { await removePlan(p.id); setConfirm(false); back(); setNotice('Plan removed') } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
          }}>{busy ? 'Removing…' : 'Remove plan'}</Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep it</Button>
        </div>
      </Sheet>
    </div>
  )
}

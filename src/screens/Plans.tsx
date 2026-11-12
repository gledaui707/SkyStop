import { ChevronLeft, ChevronRight, Pencil, Plane } from 'lucide-react'
import { sized } from '../data/images'
import { useApp } from '../store'
import { ACTIVITIES, getAirport } from '../data/mock'
import { budget, fmtDur, isOvernight, layoverMinutesAt } from '../data/time'
import type { Plan } from '../data/types'
import { BudgetHero } from '../components/BudgetHero'
import { ActivityRow, Button, DemoNote, Header, LargeTitle, Notice, Photo, SectionTitle, cx } from '../components/ui'

const itemsOf = (p: Plan) => p.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Screen 5: retrieve and reopen saved plans. */
export function Plans() {
  const { plans, plansState, reload, go } = useApp()
  return (
    <div className="pb-6">
      <LargeTitle>My plans</LargeTitle>
      <div className="px-5">
        {plansState.status === 'loading' ? (
          <p role="status" className="py-8 text-center text-body text-muted-text">Loading…</p>
        ) : plansState.status === 'error' ? (
          <Notice tone="warn"><p className="font-semibold">We could not load your plans</p>
            <p>Check your connection and try again.</p>
            <Button variant="secondary" className="mt-2" onClick={reload}>Try again</Button></Notice>
        ) : plans.length === 0 ? (
          <div className="panel-accent rounded-[1.75rem] p-6 text-center">
            <span aria-hidden="true" className="btn-coral mx-auto mb-4 grid size-14 place-items-center rounded-full"><Plane size={24} className="-rotate-45" /></span>
            <p className="text-card font-semibold">No saved plans yet</p>
            <Button className="mt-4 w-full" onClick={() => go({ name: 'trip' })}>Plan a layover</Button>
          </div>
        ) : (
          <ul className="grid gap-4">
            {plans.map((p, i) => {
              const ap = getAirport(p.airport)
              const b = budget(layoverMinutesAt(p.arrival, p.departure, ap.timezone), p.bufferMin, itemsOf(p))
              return (
                <li key={p.id} className="anim-rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                  <button onClick={() => go({ name: 'plan', id: p.id })} className="ph press relative block h-44 w-full overflow-hidden rounded-[1.75rem] text-left text-white">
                    <Photo img={ap.image} w={420} h={176} className="absolute inset-0 size-full" />
                    <span className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
                    <span className="glass-dark absolute left-4 top-4 rounded-full px-3 py-1 text-cap font-bold tracking-wide">{p.airport}</span>
                    <span className="glass-dark absolute right-4 top-4 grid size-10 place-items-center rounded-full"><ChevronRight size={20} /></span>
                    <span className="absolute inset-x-4 bottom-4 block">
                      <b className="block truncate text-h2 font-bold">{p.name}</b>
                      <span className="block text-sub text-white/80">{when(p.arrival)}</span>
                      <span className={cx('mt-2 inline-flex rounded-full px-3 py-1 text-cap font-semibold backdrop-blur-md', b.over ? 'bg-[#ff5c4d]/30 text-white' : 'bg-white/20 text-white')}>
                        {p.activityIds.length} {p.activityIds.length === 1 ? "activity" : "activities"} · {b.over ? `${fmtDur(-b.remaining)} over` : `${fmtDur(b.remaining)} left`}</span>
                    </span>
                  </button>
                </li>)
            })}
          </ul>
        )}
        <div className="mt-5"><DemoNote>Saved to this browser as a guest. Clearing browser data loses access.</DemoNote></div>
      </div>
    </div>
  )
}

export function PlanDetail({ id }: { id: string }) {
  const { plans, plansState, setDraft, go, back } = useApp()
  const p = plans.find((x) => x.id === id)
  if (!p) return <div><Header title="Plan" /><p className="p-6 text-center text-muted-text">{plansState.status === 'loading' ? 'Loading…' : 'This plan is not available.'}</p></div>
  const items = itemsOf(p)
  const ap = getAirport(p.airport)
  const mins = layoverMinutesAt(p.arrival, p.departure, ap.timezone)
  const b = budget(mins, p.bufferMin, items)
  return (
    <div className="pb-8">
      <div className="ph relative h-[19rem] overflow-hidden">
        <img src={sized(ap.image, 900, 620)} alt={ap.image.alt} onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
        <div className="hero-melt absolute inset-x-0 bottom-0 h-[70%]" />
        <button onClick={back} aria-label="Back" className="glass-dark press absolute left-4 top-[calc(var(--safe-top)+0.25rem)] grid size-12 place-items-center rounded-full text-white"><ChevronLeft size={26} strokeWidth={2.4} /></button>
        <div className="absolute inset-x-5 bottom-3 text-white">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold uppercase tracking-[0.08em]">{ap.name} ({ap.code})</p>
          <h1 className="mt-2 text-title font-bold leading-tight">{p.name}</h1>
        </div>
      </div>
      <div className="grid gap-3 px-5 pt-2">
        <div className="panel grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[1.5rem] p-4">
          <div><p className="text-cap text-muted-text">Arrive</p><p className="text-body font-semibold">{when(p.arrival)}</p></div>
          <span aria-hidden="true" className="btn-coral grid size-9 place-items-center rounded-full"><Plane size={16} /></span>
          <div className="text-right"><p className="text-cap text-muted-text">Depart</p><p className="text-body font-semibold">{when(p.departure)}</p></div>
        </div>
        <BudgetHero b={b} overnight={isOvernight(new Date(p.arrival), new Date(p.departure))} />
        <SectionTitle>Activities ({items.length})</SectionTitle>
        {items.length ? <ul className="grid gap-3">{items.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
          : <p className="text-body text-muted-text">No activities yet.</p>}
        <Button icon={Pencil} className="mt-3" onClick={() => {
          setDraft({ planId: p.id, revision: p.revision, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure, bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination })
          go({ name: 'builder' })
        }}>Edit plan</Button>
      </div>
    </div>
  )
}

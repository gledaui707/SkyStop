import { useState } from 'react'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { ACTIVITIES, getAirport } from '../data/mock'
import { budget, fmtDur, isOvernight, layoverMinutes, money } from '../data/time'
import type { Plan } from '../data/types'
import { BudgetHero } from '../components/BudgetHero'
import { ActivityRow, Button, Header, LargeTitle, Notice, Photo, SectionTitle, cx } from '../components/ui'

const itemsOf = (p: Plan) => p.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Screen 5: retrieve and reopen saved plans. */
export function Plans() {
  const { plans, go, switchTab } = useApp()
  return (
    <div className="pb-6">
      <LargeTitle>My plans</LargeTitle>
      <div className="px-5">
        {plans.length === 0 ? (
          <div className="rounded-card border border-dashed border-muted p-6 text-center">
            <p className="text-card font-semibold">No saved plans yet</p>
            <p className="mt-1 text-body text-muted-text">Choose a connection or an airport, add activities and save your itinerary.</p>
            <Button className="mt-4 w-full" onClick={() => go({ name: 'trip' })}>Plan my layover</Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {plans.map((p) => {
              const b = budget(layoverMinutes(p.arrival, p.departure), p.bufferMin, itemsOf(p))
              const ap = getAirport(p.airport)
              return (
                <li key={p.id}>
                  <button onClick={() => go({ name: 'plan', id: p.id })} className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left">
                    <Photo img={ap.image} w={72} h={72} className="size-[4.5rem] shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-card font-semibold">{p.name}</b>
                      <span className="block text-sub text-muted-text">{p.airport} · {when(p.arrival)}</span>
                      <span className={cx('block text-sub font-medium', b.over ? 'text-error' : 'text-success')}>
                        {p.activityIds.length} {p.activityIds.length === 1 ? "activity" : "activities"} · {b.over ? `${fmtDur(-b.remaining)} over` : `${fmtDur(b.remaining)} left`}</span>
                    </span><ChevronRight size={20} className="shrink-0 text-muted" />
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
  const { plans, setDraft, go, back, deletePlan } = useApp()
  const [confirm, setConfirm] = useState(false)
  const p = plans.find((x) => x.id === id)
  if (!p) return <div><Header title="Plan" /><p className="p-6 text-center text-muted-text">This plan no longer exists.</p></div>
  const items = itemsOf(p)
  const mins = layoverMinutes(p.arrival, p.departure)
  const b = budget(mins, p.bufferMin, items)
  const ap = getAirport(p.airport)
  return (
    <div className="pb-8">
      <Header title={p.name} subtitle={`${ap.name} (${ap.code})`} />
      <div className="grid gap-3 px-5 pt-2">
        <div className="rounded-card border border-line bg-surface p-4 text-body">
          <p><span className="text-muted-text">Arrive</span> <b>{when(p.arrival)}</b></p>
          <p className="mt-1"><span className="text-muted-text">Depart</span> <b>{when(p.departure)}</b></p>
        </div>
        <BudgetHero b={b} overnight={isOvernight(new Date(p.arrival), new Date(p.departure))} />
        <SectionTitle>Activities ({items.length})</SectionTitle>
        {items.length ? <ul className="grid gap-3">{items.map((a) => <ActivityRow key={a.id} a={a} />)}</ul>
          : <p className="text-body text-muted-text">No activities yet. Edit the plan to add some.</p>}
        {items.length > 0 && <p className="text-sub text-muted-text">Estimated spend {money(b.cost)}</p>}
        <Button icon={Pencil} className="mt-2" onClick={() => {
          setDraft({ planId: p.id, name: p.name, airport: p.airport, arrival: p.arrival, departure: p.departure, bufferMin: p.bufferMin, activityIds: p.activityIds, origin: p.origin, destination: p.destination })
          go({ name: 'builder' })
        }}>Edit plan</Button>
        {confirm ? (
          <Notice tone="warn"><p className="font-semibold">Delete this plan?</p>
            <div className="mt-2 flex gap-2"><Button variant="danger" className="flex-1 !bg-error !text-white" onClick={() => { deletePlan(p.id); back() }}>Delete</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>Cancel</Button></div></Notice>
        ) : <Button variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>Delete plan</Button>}
      </div>
    </div>
  )
}

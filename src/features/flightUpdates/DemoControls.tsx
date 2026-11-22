// Settings → Demo controls: simulate a schedule or gate change on a saved flight, and reset it. Kept out of the
// flight screens on purpose: the planning screens only ever see "a flight update", whatever its source.
import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { useApp } from '../../store'
import { fmtDur } from '../../data/time'
import type { Plan } from '../../data/types'
import { Button, Sheet, cx } from '../../components/ui'
import { SCENARIOS, bookedGate, updateFor, type ScenarioId } from './updates'
import { planningImpact } from './impact'
import { changeLines } from './FlightUpdateUI'

const flightLabel = (p: Plan) => (p.origin && p.destination ? `${p.origin} → ${p.destination} via ${p.airport}` : `Connection at ${p.airport}`)

/** One-sentence outcome after a simulation, from the same impact the plan screens use. */
function outcome(p: Plan): string {
  const i = planningImpact(p)
  if (!i) return 'Booked times and gate.'
  const what = changeLines(i.view).join(' · ')
  const planned = p.activityIds.length > 0
  const so = i.kind === 'conflict' ? `Your plan no longer fits: ${fmtDur(i.overBy)} over.`
    : i.kind === 'less-time' ? `${fmtDur(-i.deltaUsable)} less to explore${planned ? '; your plan still fits' : ''}.`
    : i.kind === 'more-time' ? `${fmtDur(i.deltaUsable)} more to explore${planned ? '; your plan is unchanged' : ''}.`
    : i.view.returnTransferUnknown ? 'Time to explore unchanged; the walk to the new gate isn’t verified.'
    : i.view.returnTransferRecalculated ? `The walk to the new gate is recalculated: ${fmtDur(i.after.remaining)} left.` : 'Time to explore unchanged.'
  const gate = i.kind === 'gate' || !i.view.changed.gate ? '' : i.view.returnTransferUnknown ? ' The walk to the new gate isn’t verified.'
    : i.view.returnTransferRecalculated ? ' The walk to the new gate is recalculated.' : ''
  return `${what}. ${so}${gate}`
}

export function DemoControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { plans, flightUpdates, simulateFlightUpdate, resetFlightUpdate, go } = useApp()
  void flightUpdates
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [last, setLast] = useState<string | null>(null)
  const plan = plans.find((p) => p.id === pickedId) ?? plans[0]
  const u = plan && updateFor(plan)
  const run = (s: ScenarioId) => { if (plan && simulateFlightUpdate(plan.id, s)) setLast(plan.id) }
  return (
    <Sheet open={open} onClose={onClose} title="Demo controls">
      <div className="grid gap-4 pb-2">
        <p className="text-sub text-muted-text">Simulate a flight update to see how your layover plan responds. Nothing is sent to or received from an airline, and your saved booking is not changed.</p>
        {!plan ? <p className="rounded-card bg-ink-tint p-4 text-body">Save a flight first, then come back here.</p> : (<>
          {plans.length > 1 && (
            <div role="radiogroup" aria-label="Flight" className="grid gap-2">
              {plans.map((p) => (
                <button key={p.id} role="radio" aria-checked={p.id === plan.id} onClick={() => { setPickedId(p.id); setLast(null) }}
                  className={cx('press flex min-h-12 items-center justify-between gap-3 rounded-control px-3.5 text-left text-sub font-semibold ring-1', p.id === plan.id ? 'pill-on ring-transparent' : 'bg-ink-tint ring-line')}>
                  <span className="min-w-0 truncate">{flightLabel(p)}</span>{p.bookingRef && <span className="shrink-0 font-mono text-cap opacity-80">{p.bookingRef}</span>}
                </button>))}
            </div>)}
          <section aria-label="Simulate flight update" className="grid gap-2">
            <h3 className="text-cap font-semibold uppercase tracking-[0.06em] text-muted-text">Simulate flight update{plans.length === 1 ? ` · ${flightLabel(plan)}` : ''}</h3>
            {SCENARIOS.map((s) => {
              const off = s.id === 'gate' && !bookedGate(plan)
              const on = u?.scenario === s.id
              return (
                <button key={s.id} disabled={off} aria-pressed={on} onClick={() => run(s.id)}
                  className={cx('press flex min-h-14 items-center gap-3 rounded-card px-3.5 py-2.5 text-left ring-1 disabled:opacity-50', on ? 'bg-accent-tint ring-accent-dark/60' : 'bg-ink-tint ring-line')}>
                  <span className="min-w-0 flex-1"><span className="block text-body font-semibold">{s.label}</span>
                    <span className="block text-sub tabular-nums text-muted-text">{s.detail(plan)}</span></span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-text" />
                </button>)
            })}
          </section>
          <p role="status" className={cx('rounded-control px-3.5 py-2.5 text-sub', u ? 'bg-accent-tint text-ink' : 'bg-ink-tint text-muted-text')}>
            {u ? outcome(plan) : last === plan.id ? 'Reset to the booked times and gate.' : 'Using the booked times and gate.'}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" icon={RotateCcw} disabled={!u} onClick={() => { resetFlightUpdate(plan.id); setLast(plan.id) }}>Reset</Button>
            <Button onClick={() => { onClose(); go({ name: 'plan', id: plan.id }) }}>View layover</Button>
          </div>
        </>)}
      </div>
    </Sheet>
  )
}

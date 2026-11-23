// Flight-update surfaces. Three separate things, kept separate on screen:
//   flight update     what changed (times, gate), shown with the flight wherever its times are shown;
//   planning impact   what that means for the itinerary (fits / less or more time / over), shown with the plan;
//   notification      a one-off note on Home that something changed, dismissed once seen.
// Updates come from the simulation in Settings, so they are labelled "Simulated update", never as airline data.
import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { AlertTriangle, Check, Clock, DoorOpen, X } from 'lucide-react'
import { useApp } from '../../store'
import { fmtDur } from '../../data/time'
import { ACTIVITIES } from '../../data/catalogue'
import type { Plan } from '../../data/types'
import { Button, cx } from '../../components/ui'
import { changeLines, flightView, timeWithDay, updateFor, type FlightLike, type FlightView } from './updates'
export { changeLines, timeWithDay }
const stamp = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const nameOf = (id: string) => ACTIVITIES.find((a) => a.id === id)?.name ?? 'an activity'
import { planningImpact, suggestRevisions, type PlanningImpact, type Revision } from './impact'
import type { PlanLike } from '../../data/itinerary'

/** The return-transfer status after a gate change, in one sentence (or nothing to say). */
const gateNote = (v: FlightView) => (!v.changed.gate ? '' : v.returnTransferUnknown ? 'The walk to the new gate isn’t verified, so it isn’t counted.'
  : v.returnTransferRecalculated ? 'The walk to the new gate is recalculated.' : '')

/** One plain sentence on what the change means for the plan. */
function impactLine(i: PlanningImpact, planned: boolean): string {
  if (i.kind === 'conflict') return 'Your current layover plan no longer fits the available time.'
  if (i.kind === 'less-time') return `${fmtDur(-i.deltaUsable)} less to explore.${planned ? ' Your plan still fits.' : ''}`
  if (i.kind === 'more-time') return `${fmtDur(i.deltaUsable)} more to explore.${planned ? ' Your plan is unchanged.' : ''}`
  if (i.kind === 'gate') return gateNote(i.view) || 'Your time to explore is unchanged.'
  return ''
}
const headline = (i: PlanningImpact) => (i.view.changed.arrival || i.view.changed.departure ? 'Your flight time changed.' : 'Your departure gate changed.')

/** Home: the one-off note about a flight update, for the first upcoming flight with an unseen one. */
export function FlightUpdateNotice({ plans }: { plans: Plan[] }) {
  const { go, markFlightUpdate, flightUpdates } = useApp()
  void flightUpdates // re-render when updates change
  const hit = plans.map((p) => ({ p, u: updateFor(p) })).find(({ u }) => u && !u.seen && !u.decision)
  const i = hit && planningImpact(hit.p)
  const show = !!(hit && i && i.kind !== 'none')
  return (
    <MotionConfig reducedMotion="user"><AnimatePresence initial={false}>
      {show && (
        <motion.section key={hit!.u!.updatedAt} role="status" aria-label="Flight update"
          initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
          <div className={cx('panel mb-3 rounded-surface p-4', i!.kind === 'conflict' && 'ring-1 ring-error/40')}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className={cx('grid size-10 shrink-0 place-items-center rounded-full', i!.kind === 'conflict' ? 'bg-error-tint text-error' : 'bg-accent-tint text-accent-dark')}>
                {i!.view.changed.arrival || i!.view.changed.departure ? <Clock size={19} /> : <DoorOpen size={19} />}</span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold leading-snug">{headline(i!)}</p>
                <p className="mt-0.5 text-sub text-muted-text">{impactLine(i!, hit!.p.activityIds.length > 0)}</p>
                <p className="mt-1.5 text-cap tabular-nums text-muted-text">{[...changeLines(i!.view), `Simulated update ${stamp(hit!.u!.updatedAt)}`].join(' · ')}</p>
              </div>
              <button type="button" aria-label="Dismiss" onClick={() => markFlightUpdate(hit!.p.id, { seen: true })}
                className="press -mr-1.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-muted-text"><X size={18} /></button>
            </div>
            <Button size="sm" variant={i!.kind === 'conflict' ? 'primary' : 'secondary'} className="mt-3 w-full"
              onClick={() => { markFlightUpdate(hit!.p.id, { seen: true }); go({ name: 'plan', id: hit!.p.id }) }}>
              {i!.kind === 'conflict' ? 'Review plan' : 'View layover'}</Button>
          </div>
        </motion.section>)}
    </AnimatePresence></MotionConfig>
  )
}

/** Arrive or depart with the current time; a changed value shows the booked one struck through below it. */
export function TimeCell({ label, now, was, changed, right, fmt }: { label: string; now: string; was: string; changed: boolean; right?: boolean; fmt: (local: string) => string }) {
  return (
    <div className={right ? 'text-right' : undefined}>
      <p className="text-cap text-muted-text">{label}</p>
      <motion.p key={now} initial={changed ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} className={cx('text-body font-semibold', changed && 'text-accent-dark')}>{fmt(now)}</motion.p>
      {changed && <p className="text-cap text-muted-text"><span className="sr-only">Booked </span><s>{fmt(was)}</s></p>}
    </div>
  )
}

/** Gate row under the times (sample bookings carry a gate). What a change means is said in the update line. */
export function GateRow({ v }: { v: FlightView }) {
  if (!v.gate) return null
  return (
    <div className="col-span-3 mt-1 flex items-center justify-between gap-3 border-t border-line pt-3 text-sub">
      <span className="text-muted-text">Departure gate</span>
      <span className="font-semibold">
        {v.changed.gate && <span className="mr-1.5 font-normal text-muted-text"><span className="sr-only">Booked </span><s>{v.original.gate}</s><span className="sr-only">, now</span></span>}
        <span className={cx(v.changed.gate && 'text-accent-dark')}>{v.gate}</span>{v.gateTerminal && <span className="font-normal text-muted-text"> · Terminal {v.gateTerminal.replace(/^T/, '')}</span>}
      </span>
    </div>
  )
}

/** A compact line with the plan's flight: what changed and what it means (for less/more time, or a gate change). */
export function UpdateLine({ i, planned }: { i: PlanningImpact; planned: boolean }) {
  if (i.kind === 'none' || i.kind === 'conflict') return null
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="note" aria-label="Flight update"
      className="flex gap-2.5 rounded-control bg-accent-tint px-3.5 py-2.5 text-sub text-ink">
      {i.view.changed.arrival || i.view.changed.departure ? <Clock size={17} className="mt-0.5 shrink-0 text-accent-dark" aria-hidden="true" /> : <DoorOpen size={17} className="mt-0.5 shrink-0 text-accent-dark" aria-hidden="true" />}
      <span className="min-w-0"><b className="font-semibold">{headline(i)}</b> {impactLine(i, planned)}{i.kind !== 'gate' && gateNote(i.view) && ` ${gateNote(i.view)}`}
        <span className="block text-cap text-muted-text">Simulated update {stamp(i.view.update!.updatedAt)}</span></span>
    </motion.p>
  )
}

/** Plan review: the conflict, rule-based revisions to choose from, and Apply changes / Keep my plan. Nothing changes
 *  until the traveller applies a revision; a kept plan keeps its warning. */
export function PlanReview({ plan, onApply, applyNote }: { plan: PlanLike & FlightLike & { id: string }; onApply: (r: Revision) => Promise<void> | void; applyNote?: string }) {
  const { flightUpdates, markFlightUpdate } = useApp()
  void flightUpdates
  const i = planningImpact(plan)
  const [pick, setPick] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!i || i.kind !== 'conflict') return null
  const u = i.view.update!
  const kept = u.decision === 'kept' && !reviewing
  const revisions = suggestRevisions(plan)
  const chosen = revisions[Math.min(pick, revisions.length - 1)]
  const apply = async () => {
    if (!chosen || busy) return
    setBusy(true); setError(null)
    try { await onApply(chosen); markFlightUpdate(plan.id, { decision: 'applied', seen: true }); setReviewing(false) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <MotionConfig reducedMotion="user"><AnimatePresence mode="wait" initial={false}>
      {kept ? (
        <motion.section key="kept" aria-label="Plan review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-start gap-3 rounded-card border border-error/30 bg-error-tint p-3.5 text-sub">
          <AlertTriangle size={19} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />
          <p className="min-w-0 flex-1">You kept your plan. It’s <b className="font-semibold">{fmtDur(i.overBy)} over</b> the time available.</p>
          <button type="button" onClick={() => setReviewing(true)} className="min-h-11 shrink-0 -my-2.5 font-semibold text-accent-dark">Review</button>
        </motion.section>
      ) : (
        <motion.section key="review" aria-label="Plan review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }} className="panel rounded-surface p-4 ring-1 ring-error/35">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-error-tint text-error"><AlertTriangle size={19} /></span>
            <div className="min-w-0">
              <h2 className="text-card font-semibold leading-snug">Your plan no longer fits</h2>
              <p className="mt-0.5 text-sub text-muted-text">{changeLines(i.view).join(' · ')}</p>
            </div>
          </div>
          <p className="mt-3 text-cap font-semibold uppercase tracking-[0.06em] text-muted-text">Time to explore</p>
          <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center">
            {([['Was', fmtDur(i.before.usable), ''], ['Now', fmtDur(i.after.usable), 'text-accent-dark'], ['Over by', fmtDur(i.overBy), 'text-error']] as const).map(([k, val, c]) => (
              <div key={k} className="rounded-control bg-ink-tint px-1.5 py-2"><dt className="text-cap text-muted-text">{k}</dt><dd className={cx('whitespace-nowrap text-body font-bold tabular-nums', c)}>{val}</dd></div>))}
          </dl>
          {i.lateIds.length > 0 && <p className="mt-3 text-sub"><span className="text-muted-text">Doesn’t fit: </span><b className="font-semibold">{i.lateIds.map(nameOf).join(', ')}</b></p>}

          {revisions.length > 0 ? (<>
            <h3 className="mt-4 text-cap font-semibold uppercase tracking-[0.06em] text-muted-text">Suggested changes</h3>
            <div role="radiogroup" aria-label="Suggested changes" className="mt-2 grid gap-2">
              {revisions.map((r, k) => {
                const on = r === chosen
                const removed = plan.activityIds.filter((id) => !r.activityIds.includes(id)), added = r.activityIds.filter((id) => !plan.activityIds.includes(id))
                return (
                  <button key={r.title} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)}
                    className={cx('press flex items-start gap-3 rounded-card p-3 text-left ring-1 transition-colors', on ? 'bg-accent-tint ring-accent-dark/60' : 'bg-ink-tint ring-line')}>
                    <span aria-hidden="true" className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-accent-dark bg-accent-dark text-canvas' : 'border-muted')}>{on && <Check size={12} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold leading-snug">{r.title}</span>
                      <span className="block text-sub text-muted-text">{r.detail}</span>
                      {(removed.length > 0 || added.length > 0) && (
                        <span className="mt-1 flex flex-wrap gap-x-2 text-cap">
                          {removed.map((id) => <span key={id} className="text-error"><s>{nameOf(id)}</s></span>)}
                          {added.map((id) => <span key={id} className="text-success">+ {nameOf(id)}</span>)}
                        </span>)}
                    </span>
                    <span className="shrink-0 text-right text-cap text-muted-text"><b className="block text-sub font-bold tabular-nums text-success">{fmtDur(r.remaining)}</b>left</span>
                  </button>)
              })}
            </div>
            <Button className="mt-4 w-full" disabled={busy} onClick={() => void apply()}>{busy ? 'Applying…' : 'Apply changes'}</Button>
          </>) : <p className="mt-3 text-sub text-muted-text">No single change brings this plan inside the time available. Edit the plan to choose what to keep.</p>}
          <Button variant="secondary" className="mt-2 w-full" disabled={busy} onClick={() => { markFlightUpdate(plan.id, { decision: 'kept', seen: true }); setReviewing(false) }}>Keep my plan</Button>
          {error && <p role="alert" className="mt-2 text-sub text-error">{error}</p>}
          <p className="mt-2 text-center text-cap text-muted-text">{applyNote ?? 'Nothing changes until you apply.'}</p>
        </motion.section>
      )}
    </AnimatePresence></MotionConfig>
  )
}

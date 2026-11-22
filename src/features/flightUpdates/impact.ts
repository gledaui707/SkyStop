// What a flight update means for a saved itinerary, and deterministic ways to make it fit again.
// Pure: every number comes from the one time calculation (computeItinerary), run on the booking and on the updated
// flight. Nothing here changes a plan; suggestions are lists of activity ids the traveller may choose to apply.
import { ACTIVITIES } from '../../data/catalogue'
import { computeItinerary, type PlanLike } from '../../data/itinerary'
import type { HeroNumbers } from '../../components/BudgetHero'
import type { Activity } from '../../data/types'
import { flightView, type FlightLike, type FlightView } from './updates'

export type ImpactKind = 'conflict' | 'less-time' | 'more-time' | 'gate' | 'none'
export interface PlanningImpact {
  kind: ImpactKind
  view: FlightView
  before: HeroNumbers
  after: HeroNumbers
  /** Change in usable time (effective − booking). */
  deltaUsable: number
  /** How far the plan is over its usable time now (0 when it fits). */
  overBy: number
  /** Activities that end after the usable time runs out (same running total as the itinerary timeline). */
  lateIds: string[]
}

type P = PlanLike & FlightLike

/** Same running total as the itinerary timeline: transfer to a stop (when known) + the stop's duration. When every
 *  stop fits but the walk back to the gate does not, the last stop is the one that runs late. */
export function lateActivities(p: P): string[] {
  const { items, itin, hero } = computeItinerary(p)
  let used = 0
  const late = items.filter((a, i) => {
    const h = itin.hops[i]
    used += (h && h.kind !== 'unknown' ? h.max : 0) + a.durationMin
    return used > hero.usable
  }).map((a) => a.id)
  return !late.length && hero.remaining < 0 && items.length ? [items[items.length - 1].id] : late
}

export function planningImpact(p: P): PlanningImpact | null {
  const view = flightView(p)
  if (!view.update) return null
  const before = computeItinerary(p, { original: true }).hero
  const after = computeItinerary(p).hero
  const deltaUsable = after.usable - before.usable
  const overBy = Math.max(0, -after.remaining)
  const timeChanged = view.changed.arrival || view.changed.departure
  // A conflict is one this update caused: the plan is over now and is worse off than with the booked times.
  const kind: ImpactKind = p.activityIds.length && after.remaining < 0 && after.remaining < before.remaining ? 'conflict'
    : timeChanged && deltaUsable < 0 ? 'less-time'
    : timeChanged && deltaUsable > 0 ? 'more-time'
    : view.changed.gate ? 'gate' : 'none'
  return { kind, view, before, after, deltaUsable, overBy, lateIds: kind === 'conflict' ? lateActivities(p) : [] }
}

export type RevisionKind = 'reorder' | 'replace' | 'remove' | 'end-earlier'
export interface Revision {
  kind: RevisionKind
  title: string
  detail: string
  activityIds: string[]
  /** Remaining time with the revision applied (≥ 0). */
  remaining: number
  /** Activity minutes given up. */
  lostMin: number
}

const byId = (id: string) => ACTIVITIES.find((a) => a.id === id)
const dur = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m` }
/** Permutations of a short list (itineraries here have a handful of stops; longer ones skip reordering). */
const perms = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r])))
/** A shorter stand-in: same airport and kind of activity, access no less certain, not already in the plan. */
const alternatives = (a: Activity, plan: string[]) => ACTIVITIES.filter((b) => b.airport === a.airport && b.category === a.category && b.id !== a.id
  && !plan.includes(b.id) && b.durationMin < a.durationMin && (b.access === a.access || b.access === 'Airside'))

/** Rule-based revisions that bring the itinerary back inside the usable time, least disruptive first:
 *  1. reorder (nothing given up; only where route data makes order matter),
 *  2. give up as few activity minutes as possible: swap one stop for a shorter one of the same kind, skip one stop,
 *     or end the day earlier (drop stops from the end),
 *  ties broken by touching later stops first, so the start of the day stays as planned.
 *  Returns the best revision and the best one of a different kind, at most two. Empty when the plan fits. */
export function suggestRevisions(p: P): Revision[] {
  const ids = p.activityIds
  if (!ids.length || computeItinerary(p).hero.remaining >= 0) return []
  const fits = (next: string[]) => { const r = computeItinerary({ ...p, activityIds: next }).hero.remaining; return r >= 0 ? r : null }
  const out: (Revision & { pos: number })[] = []
  const name = (id: string) => byId(id)?.name ?? 'this stop'

  if (computeItinerary(p).itin.routing && ids.length <= 6) {
    let best: { order: string[]; r: number } | null = null
    for (const order of perms(ids)) { const r = fits(order); if (r !== null && (!best || r > best.r)) best = { order, r } }
    if (best) {
      const moved = best.order.findIndex((id, i) => id !== ids[i])
      out.push({ kind: 'reorder', title: 'Change the order', detail: `Visit ${name(best.order[moved])} earlier to cut the walking between stops. Every activity stays.`,
        activityIds: best.order, remaining: best.r, lostMin: 0, pos: moved })
    }
  }
  ids.forEach((id, i) => {
    const a = byId(id)
    if (!a) return
    for (const b of alternatives(a, ids)) {
      const next = ids.map((x) => (x === id ? b.id : x)), r = fits(next)
      if (r !== null) out.push({ kind: 'replace', title: `Swap ${a.name} for ${b.name}`, detail: `${b.name} takes ${dur(b.durationMin)} instead of ${dur(a.durationMin)}.`,
        activityIds: next, remaining: r, lostMin: a.durationMin - b.durationMin, pos: i })
    }
    const next = ids.filter((x) => x !== id), r = fits(next)
    if (r !== null) {
      const last = i === ids.length - 1
      out.push({ kind: last ? 'end-earlier' : 'remove', title: last && i > 0 ? `End after ${name(ids[i - 1])}` : `Skip ${a.name}`,
        detail: last && i > 0 ? `Skip ${a.name} (${dur(a.durationMin)}); everything before it stays.` : `Saves ${dur(a.durationMin)}; the rest of your plan stays in order.`,
        activityIds: next, remaining: r, lostMin: a.durationMin, pos: i })
    }
  })
  // Ending earlier by more than one stop, when no single change is enough.
  for (let k = 2; k < ids.length; k++) {
    const next = ids.slice(0, ids.length - k), r = fits(next)
    if (r === null) continue
    out.push({ kind: 'end-earlier', title: `End after ${name(next[next.length - 1])}`, detail: `Skip the last ${k} activities; everything before them stays.`,
      activityIds: next, remaining: r, lostMin: ids.slice(-k).reduce((s, x) => s + (byId(x)?.durationMin ?? 0), 0), pos: ids.length - k })
    break
  }
  out.sort((a, b) => a.lostMin - b.lostMin || b.pos - a.pos || b.remaining - a.remaining)
  const family = (k: RevisionKind) => (k === 'end-earlier' ? 'remove' : k)
  const first = out[0]
  if (!first) return []
  const second = out.find((r) => family(r.kind) !== family(first.kind))
  return [first, ...(second ? [second] : [])].map(({ pos: _pos, ...r }) => r)
}

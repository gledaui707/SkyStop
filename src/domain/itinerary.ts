// Constraint-aware itinerary planning. Pure functions, no UI or network.
//
// Time model (explainable, no double counting):
//   remaining = usable − activity time − transfer time
//   usable    = total layover − planning buffer            (unchanged from before)
// The planning buffer covers what every connecting passenger does anyway: leaving the aircraft, transfer screening,
// the final walk to the gate and boarding. It does NOT cover moving between terminals or venues, nor leaving and
// re-entering the transit area. Those moves are the transfers below.
//   * Transfers use the airport's published minute ranges where they exist ('official'), otherwise a labelled
//     planning estimate. SkyStop counts the UPPER end of every range, and reports the lower end for comparison.
//   * Arrival immigration, check-in and departure immigration/security after a landside visit have no published
//     waiting times, so they are never given a number: they make the time result "cannot verify".
//   * A move whose route is not recorded is "not verified": it adds no minutes and makes the result "cannot verify".

export type Zone = 'airside' | 'landside' | 'unknown'
export interface GraphLocation { id: string; name: string; zone: Zone; terminal: string | null; kind: string }
export interface GraphTransfer {
  id: string; from: string; to: string; mode: string; min: number; max: number
  immigration: boolean; departureChecks: boolean; throughCheck: boolean
  verification: 'official' | 'planning_estimate'; source: string | null; note: string
}
export interface TransferGraph { locations: GraphLocation[]; transfers: GraphTransfer[] }
export interface PlanActivity { id: string; name: string; durationMin: number; zone: Zone; locationIds: string[] }

/** Moving around inside one transit or public area: no published times exist, so a labelled planning estimate. */
export const WITHIN_AREA = { min: 2, max: 10 } as const
/** Remaining time under this counts as a tight plan. */
export const TIGHT_MIN = 15

export type HopKind = 'same-area' | 'route' | 'unknown'
export interface Hop {
  kind: HopKind
  fromLabel: string; toLabel: string
  /** location the move starts from, if known */
  fromLocation?: string
  /** location chosen for the destination stop (for multi-location venues), if known */
  toLocation?: string
  min: number; max: number
  verification: 'official' | 'planning_estimate' | 'none'
  modes: string[]
  immigration: boolean; departureChecks: boolean; throughCheck: boolean
  notes: string[]; sources: string[]
  isReturn: boolean
}

export type TimeState = 'fits' | 'tight' | 'exceeds' | 'unverified'
export type AccessState = 'airside' | 'entry-required' | 'unverified'

export interface Itinerary {
  routing: boolean                      // false: no transfer data for this airport (activities only)
  hops: Hop[]                           // arrival→1st, between stops, last→departure (empty when routing is false)
  activityMin: number
  transferMin: number                   // counted (upper ends)
  transferMinLow: number                // lower ends, for comparison
  unknownTransfers: number
  proceduresUnknown: boolean            // immigration / re-entry checks with no published time
  usable: number
  remaining: number
  time: TimeState
  access: AccessState
  warnings: string[]
}

interface Path { min: number; max: number; edges: GraphTransfer[] }

/** Cheapest path (by upper bound) between two locations over the directed transfer graph. Tiny graph: Dijkstra. */
export function shortestPath(g: TransferGraph, from: string, to: string): Path | null {
  if (from === to) return { min: 0, max: 0, edges: [] }
  const dist = new Map<string, Path>([[from, { min: 0, max: 0, edges: [] }]])
  const done = new Set<string>()
  while (true) {
    let cur: string | null = null
    for (const [k, v] of dist) if (!done.has(k) && (cur === null || v.max < dist.get(cur)!.max)) cur = k
    if (cur === null) return null
    if (cur === to) return dist.get(cur)!
    done.add(cur)
    const base = dist.get(cur)!
    for (const e of g.transfers) {
      if (e.from !== cur || done.has(e.to)) continue
      const cand = { min: base.min + e.min, max: base.max + e.max, edges: [...base.edges, e] }
      const old = dist.get(e.to)
      if (!old || cand.max < old.max) dist.set(e.to, cand)
    }
  }
}

const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`)
const locName = (g: TransferGraph, id: string) => g.locations.find((l) => l.id === id)?.name ?? id

/** Best move from any of `froms` to any of `tos` (venues may exist in several terminals). */
function hop(g: TransferGraph, froms: string[], tos: string[], fromLabel: string, toLabel: string, isReturn: boolean): Hop {
  const base = { fromLabel, toLabel, isReturn, immigration: false, departureChecks: false, throughCheck: false, notes: [] as string[], sources: [] as string[], modes: [] as string[] }
  let best: { p: Path; to: string; from: string } | null = null
  for (const f of froms) for (const t of tos) {
    const p = shortestPath(g, f, t)
    if (p && (!best || p.max < best.p.max)) best = { p, to: t, from: f }
  }
  if (!best) return { ...base, kind: 'unknown', min: 0, max: 0, verification: 'none' }
  if (best.p.edges.length === 0) {
    return { ...base, kind: 'same-area', fromLocation: best.from, toLocation: best.to, min: WITHIN_AREA.min, max: WITHIN_AREA.max, verification: 'planning_estimate',
      modes: ['walk'], notes: [`Within the ${locName(g, best.to)}: no published walking time.`] }
  }
  const es = best.p.edges
  return {
    ...base, kind: 'route', fromLocation: best.from, toLocation: best.to, min: best.p.min, max: best.p.max,
    verification: es.every((e) => e.verification === 'official') ? 'official' : 'planning_estimate',
    modes: es.map((e) => e.mode), immigration: es.some((e) => e.immigration), departureChecks: es.some((e) => e.departureChecks),
    throughCheck: es.some((e) => e.throughCheck), notes: es.map((e) => e.note).filter(Boolean), sources: [...new Set(es.map((e) => e.source).filter((s): s is string => !!s))],
  }
}

export interface PlanInput {
  usable: number
  activities: PlanActivity[]
  graph: TransferGraph | null
  arrivalLocation?: string | null
  departureLocation?: string | null
}

export function planItinerary({ usable, activities, graph, arrivalLocation, departureLocation }: PlanInput): Itinerary {
  const activityMin = activities.reduce((s, a) => s + a.durationMin, 0)
  const warnings: string[] = []
  const landside = activities.filter((a) => a.zone === 'landside')
  const unknownZone = activities.filter((a) => a.zone === 'unknown')
  for (const a of landside) warnings.push(`${a.name} is outside the transit area. Immigration clearance is required, and you must pass departure checks again to return.`)
  for (const a of unknownZone) warnings.push(`Whether ${a.name} is airside or landside has not been confirmed.`)

  const routing = !!graph && graph.locations.length > 0
  const hops: Hop[] = []
  if (routing && activities.length > 0) {
    const g = graph!
    let froms = arrivalLocation ? [arrivalLocation] : []
    let fromLabel = arrivalLocation ? `Arrival · ${locName(g, arrivalLocation)}` : 'Arrival (terminal not set)'
    activities.forEach((a) => {
      const h = froms.length && a.locationIds.length ? hop(g, froms, a.locationIds, fromLabel, a.name, false)
        : { ...hop(g, [], [], fromLabel, a.name, false) }
      hops.push(h)
      froms = h.toLocation ? [h.toLocation] : a.locationIds
      fromLabel = a.name
    })
    const toLabel = departureLocation ? `Departure · ${locName(g, departureLocation)}` : 'Departure (terminal not set)'
    hops.push(froms.length && departureLocation ? hop(g, froms, [departureLocation], fromLabel, toLabel, true) : hop(g, [], [], fromLabel, toLabel, true))
    if (!arrivalLocation || !departureLocation) warnings.push('Choose your arrival and departure terminals so transfers to the first activity and back to your gate can be estimated.')
    for (const h of hops) if (h.kind === 'unknown' && (arrivalLocation || !h.fromLabel.startsWith('Arrival')) && (departureLocation || !h.isReturn))
      warnings.push(`Access between ${h.fromLabel} and ${h.toLabel} has not been verified, so no transfer time is included.`)
    if (hops.some((h) => h.throughCheck)) warnings.push('The Terminal 4 transit shuttle is only for passengers whose itinerary is through-checked to the final destination.')
  }

  const known = hops.filter((h) => h.kind !== 'unknown')
  const transferMin = known.reduce((s, h) => s + h.max, 0)
  const transferMinLow = known.reduce((s, h) => s + h.min, 0)
  const unknownTransfers = hops.filter((h) => h.kind === 'unknown').length
  const crossesBorder = landside.length > 0 || hops.some((h) => h.immigration || h.departureChecks)
  const proceduresUnknown = crossesBorder
  if (proceduresUnknown) warnings.push('Time for immigration, check-in and security after leaving the transit area is not included: no waiting times are published.')
  const remaining = usable - activityMin - transferMin

  let time: TimeState
  if (activityMin + transferMinLow > usable) time = 'exceeds'
  else if (unknownTransfers > 0 || proceduresUnknown) time = 'unverified'
  else if (remaining < TIGHT_MIN) time = 'tight'
  else time = 'fits'
  if (time === 'exceeds') warnings.unshift(`This itinerary exceeds your estimated available time by at least ${dur(Math.max(1, activityMin + transferMinLow - usable))}.`)

  const access: AccessState = unknownTransfers > 0 || unknownZone.length > 0 ? (crossesBorder ? 'entry-required' : 'unverified')
    : crossesBorder ? 'entry-required' : 'airside'
  return { routing, hops, activityMin, transferMin, transferMinLow, unknownTransfers, proceduresUnknown, usable, remaining, time, access, warnings }
}

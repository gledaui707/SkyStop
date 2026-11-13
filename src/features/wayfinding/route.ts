// Wayfinding view of an itinerary: ordered stops and the legs between them, ready for the map and the route sheet.
// Pure; no UI. Where the airport has a transfer graph (Changi), legs use the planner's own minutes and checkpoints.
// Everywhere else (and for legs the graph cannot route), SkyStop shows ILLUSTRATIVE directions (owner decision,
// 13 Nov 2026: SkyStop is a demo and every itinerary gets directions): 5–10 min on foot within a terminal, 12–20 min
// between terminals, and a curved line between the two terminal pins. These display-only legs never change the
// planner's time calculation.
import type { GraphLocation, Hop, Itinerary, TransferGraph } from '../../domain/itinerary'
import { AIRPORT_GEO, terminalKeysOf } from '../../data/airportGeo'

export type LegStatus = 'verified' | 'estimate' | 'unavailable'
export type StopKind = 'arrival' | 'activity' | 'departure'

export interface Stop {
  /** 0 for the arrival, 1… for activities in plan order, last for the departure. */
  n: number
  kind: StopKind
  label: string
  location: string | null
  /** Terminal pin this stop sits on, when that terminal has a published map coordinate. */
  mapKey: string | null
  /** Where the stop is, in words ("Terminal 2 transit area"), even without a map pin. */
  place: string | null
}

export interface Leg {
  i: number
  from: Stop
  to: Stop
  status: LegStatus
  /** Counted range in minutes; null when the leg is unavailable. */
  minutes: { min: number; max: number } | null
  modes: string[]
  /** Border and security steps on this leg, in plain words. No waiting time is ever attached to them. */
  checkpoints: string[]
  notes: string[]
  sources: string[]
  /** Documented path geometry ([lat, lng] points), or null: then no line is drawn for this leg. */
  geometry: [number, number][] | null
}

export interface RouteView {
  routing: boolean
  stops: Stop[]
  legs: Leg[]
}

/** Path geometry for specific location pairs, keyed "fromLocation>toLocation"; takes precedence over the curve. */
export const PATH_GEOMETRY: Record<string, [number, number][]> = {}

/** The terminal pin a graph location belongs to ("SIN-T3-TRANSIT" → "T3", Jewel → "JEWEL"), or null when that
 *  terminal has no published map coordinate (Changi T2). */
export function mapKeyFor(airport: string, loc: GraphLocation | undefined): string | null {
  const keys = new Set((AIRPORT_GEO[airport]?.terminals ?? []).map((t) => t.key))
  if (!loc) return null
  if (/jewel/i.test(loc.id) || /jewel/i.test(loc.name)) return keys.has('JEWEL') ? 'JEWEL' : null
  const t = loc.terminal?.toUpperCase() ?? null
  return t && keys.has(t) ? t : null
}

export function statusOf(h: Hop): LegStatus {
  if (h.kind === 'unknown') return 'unavailable'
  return h.verification === 'official' ? 'verified' : 'estimate'
}

export function checkpointsOf(h: Hop): string[] {
  const out: string[] = []
  if (h.immigration) out.push('Arrival immigration (leaves the transit area)')
  if (h.departureChecks) out.push('Check-in, departure immigration and security to return airside')
  if (h.throughCheck) out.push('Only for passengers through-checked to their final destination')
  return out
}

/** Illustrative minutes for a leg the graph cannot route. */
export const ILLUSTRATIVE = { sameTerminal: { min: 5, max: 10 }, otherTerminal: { min: 12, max: 20 } } as const

/** A gentle curve between two terminal pins (quadratic Bézier, bowed to one side), as [lat, lng] points. */
export function curveBetween(airport: string, fromKey: string, toKey: string, samples = 24): [number, number][] | null {
  const ts = AIRPORT_GEO[airport]?.terminals ?? []
  const a = ts.find((t) => t.key === fromKey), b = ts.find((t) => t.key === toKey)
  if (!a || !b || fromKey === toKey) return null
  const mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2
  const dx = b.lat - a.lat, dy = b.lng - a.lng
  const cx = mx - dy * 0.22, cy = my + dx * 0.22 // control point off to one side
  const pts: [number, number][] = []
  for (let k = 0; k <= samples; k++) {
    const t = k / samples, u = 1 - t
    pts.push([u * u * a.lat + 2 * u * t * cx + t * t * b.lat, u * u * a.lng + 2 * u * t * cy + t * t * b.lng])
  }
  return pts
}

const terminalName = (airport: string, key: string | null) => (key ? AIRPORT_GEO[airport]?.terminals.find((t) => t.key === key)?.name ?? null : null)

export function buildRoute(
  airport: string,
  graph: TransferGraph | null,
  itin: Itinerary,
  activities: { id: string; name: string; terminal?: string }[],
  arrivalLocation?: string | null,
  departureLocation?: string | null,
): RouteView {
  const loc = (id: string | null | undefined) => (id ? graph?.locations.find((l) => l.id === id) : undefined)
  const keyOfActivity = (a: { terminal?: string } | undefined) => (a ? terminalKeysOf(airport, a.terminal)[0] ?? null : null)
  const stop = (n: number, kind: StopKind, label: string, id: string | null | undefined, fallbackKey: string | null): Stop => {
    const l = loc(id)
    const mapKey = mapKeyFor(airport, l) ?? fallbackKey
    return { n, kind, label, location: id ?? null, mapKey, place: l?.name ?? terminalName(airport, mapKey) }
  }
  const first = keyOfActivity(activities[0]), last = keyOfActivity(activities[activities.length - 1])
  const stops: Stop[] = [
    stop(0, 'arrival', 'Arrival', arrivalLocation, first),
    ...activities.map((a, i) => stop(i + 1, 'activity', a.name, itin.hops[i]?.toLocation ?? null, keyOfActivity(a))),
    stop(activities.length + 1, 'departure', 'Departure', departureLocation, last),
  ]
  const legs: Leg[] = stops.slice(1).map((to, i) => {
    const from = stops[i], h: Hop | undefined = itin.routing ? itin.hops[i] : undefined
    const routed = !!h && h.kind !== 'unknown'
    const same = !!from.mapKey && from.mapKey === to.mapKey
    const key = h?.fromLocation && h?.toLocation ? `${h.fromLocation}>${h.toLocation}` : ''
    const geometry = (key && PATH_GEOMETRY[key]) || (from.mapKey && to.mapKey ? curveBetween(airport, from.mapKey, to.mapKey) : null)
    if (routed) {
      return { i, from, to, status: statusOf(h), minutes: { min: h.min, max: h.max }, modes: h.modes, checkpoints: checkpointsOf(h), notes: h.notes, sources: h.sources, geometry }
    }
    return { i, from, to, status: 'estimate' as const, minutes: { ...(same ? ILLUSTRATIVE.sameTerminal : ILLUSTRATIVE.otherTerminal) },
      modes: ['walk'], checkpoints: h ? checkpointsOf(h) : [], notes: [], sources: [], geometry }
  })
  return { routing: itin.routing, stops, legs }
}

/** Terminal pins with their stop numbers, for numbered badges on the map ({ T3: [0, 2], JEWEL: [1] }). */
export function stopsByPin(stops: Stop[]): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const s of stops) if (s.mapKey) (out[s.mapKey] ??= []).push(s.n)
  return out
}

// Wayfinding view of an itinerary: ordered stops and the legs between them, ready for the map and the route sheet.
// Pure; no UI. Built on the itinerary engine (src/domain/itinerary.ts), so the map shows exactly the minutes the
// planner counts.
//
// Honesty rules (owner requirement, Nov 2026):
//  * A leg's status says where its minutes come from: 'verified' (every step is an airport-published time),
//    'estimate' (a labelled planning estimate is involved) or 'unavailable' (no recorded route: no minutes at all).
//  * A route LINE is drawn only from PATH_GEOMETRY: geometry that represents a documented or explicitly modelled
//    traversable path. Coordinates of two places are never joined with a straight line and shown as a route.
//  * Floors are not modelled: no source used by SkyStop gives venue floor positions or indoor paths.
import type { GraphLocation, Hop, Itinerary, TransferGraph } from '../../domain/itinerary'
import { AIRPORT_GEO } from '../../data/airportGeo'

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

/** Documented traversable path geometry, keyed "fromLocation>toLocation". Empty on purpose: none of the supported
 *  airports publishes indoor or inter-terminal path geometry that SkyStop may use (see docs/WAYFINDING.md). Add an
 *  entry only with a source for the geometry itself, not for the two endpoints. */
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

export function buildRoute(
  airport: string,
  graph: TransferGraph | null,
  itin: Itinerary,
  activities: { id: string; name: string }[],
  arrivalLocation?: string | null,
  departureLocation?: string | null,
): RouteView {
  const loc = (id: string | null | undefined) => (id ? graph?.locations.find((l) => l.id === id) : undefined)
  const stop = (n: number, kind: StopKind, label: string, id: string | null | undefined): Stop => {
    const l = loc(id)
    return { n, kind, label, location: id ?? null, mapKey: mapKeyFor(airport, l), place: l?.name ?? null }
  }
  const stops: Stop[] = [
    stop(0, 'arrival', 'Arrival', arrivalLocation),
    ...activities.map((a, i) => stop(i + 1, 'activity', a.name, itin.hops[i]?.toLocation ?? null)),
    stop(activities.length + 1, 'departure', 'Departure', departureLocation),
  ]
  if (!itin.routing) return { routing: false, stops, legs: [] }
  const legs: Leg[] = itin.hops.map((h, i) => {
    const status = statusOf(h)
    const from = stops[i], to = stops[i + 1]
    const key = h.fromLocation && h.toLocation ? `${h.fromLocation}>${h.toLocation}` : ''
    return {
      i, from, to, status,
      minutes: status === 'unavailable' ? null : { min: h.min, max: h.max },
      modes: h.modes, checkpoints: checkpointsOf(h), notes: h.notes, sources: h.sources,
      geometry: (key && PATH_GEOMETRY[key]) || null,
    }
  })
  return { routing: true, stops, legs }
}

/** Terminal pins with their stop numbers, for numbered badges on the map ({ T3: [0, 2], JEWEL: [1] }). */
export function stopsByPin(stops: Stop[]): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const s of stops) if (s.mapKey) (out[s.mapKey] ??= []).push(s.n)
  return out
}

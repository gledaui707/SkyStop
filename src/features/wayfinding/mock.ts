// SIMULATED wayfinding data for the MVP (owner decision, 13 Nov 2026). Kept apart from verified data:
//   verified  terminal coordinates in src/data/airportGeo.ts (each with a source); Changi's transfer minutes, modes and
//             checkpoints in the database transfer graph.
//   simulated everything produced here: venue spots inside a terminal, gate areas, route lines (smooth schematic paths
//             through each terminal's hub), walking distances along those paths, and generic directions text.
// Deterministic: the same itinerary always gives the same route, distances and steps. Pure; no UI.
import { AIRPORT_GEO } from '../../data/airportGeo'

export type LatLng = [number, number]

const M_PER_DEG = 111_320
/** Walking pace through a terminal (m per minute, ≈ 4.2 km/h). */
export const WALK_M_PER_MIN = 70

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }
const terminalPoint = (airport: string, key: string | null): LatLng | null => {
  const t = AIRPORT_GEO[airport]?.terminals.find((x) => x.key === key)
  return t ? [t.lat, t.lng] : null
}
/** Move `m` metres from p at a bearing (degrees from north). */
export function offset(p: LatLng, bearingDeg: number, m: number): LatLng {
  const b = (bearingDeg * Math.PI) / 180
  return [p[0] + (Math.cos(b) * m) / M_PER_DEG, p[1] + (Math.sin(b) * m) / (M_PER_DEG * Math.cos((p[0] * Math.PI) / 180))]
}
export function metres(a: LatLng, b: LatLng): number {
  const dy = (b[0] - a[0]) * M_PER_DEG, dx = (b[1] - a[1]) * M_PER_DEG * Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180)
  return Math.hypot(dx, dy)
}
export const pathLength = (p: LatLng[]) => p.slice(1).reduce((s, q, i) => s + metres(p[i], q), 0)
export function bearing(a: LatLng, b: LatLng): number {
  const dy = b[0] - a[0], dx = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180)
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
}

/** An illustrative spot for a venue inside its terminal: 70–190 m from the terminal point, at a stable angle. */
export function venuePoint(airport: string, venueId: string, terminalKey: string | null): LatLng | null {
  const t = terminalPoint(airport, terminalKey)
  if (!t) return null
  const h = hash(venueId)
  return offset(t, h % 360, 70 + (h >> 9) % 120)
}
/** Illustrative arrival / departure gate area of a terminal. */
export function gatePoint(airport: string, terminalKey: string | null, kind: 'arrival' | 'departure'): LatLng | null {
  const t = terminalPoint(airport, terminalKey)
  return t ? offset(t, kind === 'arrival' ? 35 : 215, 210) : null
}

/** A smooth schematic path from a to b that bows through `via` (a terminal's main concourse hub). */
function viaHub(a: LatLng, via: LatLng, b: LatLng, samples = 16): LatLng[] {
  if (metres(a, b) < 15) return [a, b]
  return Array.from({ length: samples + 1 }, (_, k) => { const t = k / samples, u = 1 - t; return [u * u * a[0] + 2 * u * t * via[0] + t * t * b[0], u * u * a[1] + 2 * u * t * via[1] + t * t * b[1]] as LatLng })
}
/** A gentle curved connector between two terminals (train, bridge or shuttle). */
export function connector(a: LatLng, b: LatLng, samples = 20): LatLng[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]
  const cx = mx - dy * 0.22, cy = my + dx * 0.22
  return Array.from({ length: samples + 1 }, (_, k) => { const t = k / samples, u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]] as LatLng })
}
/** Simulated route: through the terminal's hub; between terminals, hub → connector → hub. Never a straight line. */
export function mockPath(airport: string, from: LatLng, fromKey: string | null, to: LatLng, toKey: string | null): LatLng[] {
  const ha = terminalPoint(airport, fromKey), hb = terminalPoint(airport, toKey)
  if (!ha || !hb) return viaHub(from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], to)
  if (fromKey === toKey) return viaHub(from, ha, to)
  const leave = viaHub(from, offset(ha, bearing(ha, hb), 40), ha)
  return [...leave, ...connector(ha, hb).slice(1), ...viaHub(hb, offset(hb, bearing(hb, to), 40), to).slice(1)]
}

export const walkMinutes = (m: number) => Math.max(2, Math.round(m / WALK_M_PER_MIN))

const AREA: Record<string, string> = { Food: 'the dining area', Rest: 'the lounges', Shopping: 'the shopping area', Sights: 'the attractions', Work: 'the work spaces' }
const CROSS: Record<string, (to: string) => string> = {
  skytrain_or_walk: (to) => `Take the Skytrain or travellator to ${to}`,
  shuttle_bus: (to) => `Take the transit shuttle bus to ${to}`,
  link_bridge_walk: (to) => `Cross the link bridge to ${to}`,
}
const short = (place: string) => place.replace(/ transit area$/i, '').replace(/\s*\(public area\)$/i, '')

export interface StepInput {
  fromLabel: string; fromKind: 'arrival' | 'activity' | 'departure'
  toLabel: string; toKind: 'arrival' | 'activity' | 'departure'
  fromPlace: string | null; toPlace: string | null
  changesTerminal: boolean
  /** Transfer mode from the airport's data (Changi), if any. */
  mode?: string
  category?: string
  /** True when the move leaves the transit area (arrival immigration), from the airport's data. */
  immigration?: boolean
  /** True when the move re-enters airside (check-in, departure immigration and security), from the airport's data. */
  departureChecks?: boolean
}

/** Short, generic directions adapted to the route (simulated). No gates, checkpoints or escalators are invented;
 *  the only named transfers and immigration steps come from the airport's own transfer data. */
export function mockSteps(s: StepInput): string[] {
  const start = s.fromKind === 'arrival' ? `Start at your arrival gate area${s.fromPlace ? ` in ${short(s.fromPlace)}` : ''}` : `Start at ${s.fromLabel}`
  const steps = [start]
  if (s.immigration) steps.push('Clear arrival immigration')
  if (s.changesTerminal && s.toPlace) steps.push((CROSS[s.mode ?? ''] ?? ((to: string) => `Follow the signs to ${to}`))(short(s.toPlace)))
  if (s.departureChecks) steps.push('Check in, then clear departure immigration and security')
  if (s.toKind === 'departure') {
    steps.push('Follow the main concourse toward the departure gates')
    steps.push('Continue to your departure gate area')
  } else {
    steps.push(`Follow the main concourse toward ${AREA[s.category ?? ''] ?? `${s.toLabel}`}`)
    steps.push(`Continue to ${s.toLabel}`)
  }
  return steps
}

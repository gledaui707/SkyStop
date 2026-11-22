// Flight updates: changes to a saved flight's schedule or gate, kept apart from the booking itself.
//
//   booking (original)   the saved flight in Supabase (arrival, departure; the sample booking's gate). Never rewritten
//                        by an update: saving a plan always writes the original times.
//   update               the current effective arrival / departure / gate for that flight, its source and time, and
//                        what the traveller did about it. Today the only source is the simulation in Settings → Demo
//                        controls; a future authorised flight-status provider would write the same record with
//                        source 'provider'. Kept per flight in this browser; deleting it restores the original.
//   effective view       booking + update. Every time calculation (computeItinerary) and every flight display reads
//                        this view, so Home, layover details, the builder, My Plans and alerts always agree.
import { localToInstant, instantToLocal } from '../../domain'
import { GRAPHS, getAirport } from '../../data/catalogue'
import { SAMPLE_JOURNEYS } from '../../data/journeys'

export type UpdateSource = 'simulation' | 'provider'
export type ScenarioId = 'earlier-departure' | 'delayed-departure' | 'delayed-arrival' | 'both-legs' | 'gate'

export interface FlightUpdate {
  planId: string
  source: UpdateSource
  scenario?: ScenarioId
  /** When the update was received (ISO). A new update is a new event: its notice shows again. */
  updatedAt: string
  /** Effective airport-local times ('YYYY-MM-DDTHH:mm'), present only when they differ from the booking. */
  arrival?: string
  departure?: string
  /** Effective onward departure gate, when it differs from the booking's. */
  gate?: string
  /** The booking's times the update was made against. If the flight's own times are edited later, the update no
   *  longer describes it and is ignored. */
  basis: { arrival: string; departure: string }
  /** The traveller has seen the notice for this update. */
  seen?: boolean
  /** What the traveller did about a planning conflict caused by this update. */
  decision?: 'kept' | 'applied'
}

/** Minimal flight shape the view needs (a saved Plan or an editing Draft). */
export interface FlightLike {
  id?: string; planId?: string; airport: string; arrival: string; departure: string
  bookingRef?: string; departureLocation?: string | null
}

const KEY = 'skystop.flightupdates.v1'
let cache: Record<string, FlightUpdate> | null = null
const read = (): Record<string, FlightUpdate> => {
  if (cache) return cache
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { cache = {} }
  return cache!
}
export const updatesStore = {
  all: (): Record<string, FlightUpdate> => ({ ...read() }),
  get: (planId?: string): FlightUpdate | undefined => (planId ? read()[planId] : undefined),
  set(u: FlightUpdate) { cache = { ...read(), [u.planId]: u }; persist() },
  patch(planId: string, p: Partial<FlightUpdate>) { const u = read()[planId]; if (u) { cache = { ...read(), [planId]: { ...u, ...p } }; persist() } },
  remove(planId: string) { const next = { ...read() }; delete next[planId]; cache = next; persist() },
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cache ?? {})) } catch { /* in-memory only */ } }

/** The booking's own departure gate (sample bookings carry one; other flights have none). */
export function bookedGate(f: Pick<FlightLike, 'bookingRef' | 'airport'>): string | undefined {
  return f.bookingRef ? SAMPLE_JOURNEYS.find((j) => j.ref === f.bookingRef && j.connection === f.airport)?.gate : undefined
}

/** Gate letters → terminal, only where the airport's gate areas belong to one terminal (published layouts). */
const GATE_TERMINAL: Record<string, Record<string, string>> = {
  SIN: { A: 'T3', B: 'T3', C: 'T1', D: 'T1', F: 'T2', G: 'T4', H: 'T4' },
  DXB: { A: 'T3', B: 'T3', C: 'T3', D: 'T1', F: 'T2' },
}
export const gateTerminal = (airport: string, gate?: string) => (gate ? GATE_TERMINAL[airport]?.[gate[0].toUpperCase()] : undefined)

/** Moves an airport-local time by some minutes through the airport's time zone (correct across midnight and DST). */
export function shiftLocal(local: string, minutes: number, timezone: string): string {
  const at = localToInstant(local.slice(0, 10), local.slice(11, 16), timezone)
  const l = instantToLocal(new Date(at.epochMilliseconds + minutes * 60000).toISOString(), timezone)
  return `${l.date}T${l.time}`
}

export interface FlightView {
  arrival: string; departure: string; gate?: string; gateTerminal?: string
  original: { arrival: string; departure: string; gate?: string }
  changed: { arrival: boolean; departure: boolean; gate: boolean }
  update?: FlightUpdate
  /** Departure location for the return transfer: moved to the new gate's terminal when the airport's transfer data
   *  covers it and the plan had a departure terminal; otherwise unchanged. */
  departureLocation?: string | null
  /** The gate moved to another terminal, but no route data covers the walk to it. */
  returnTransferUnknown: boolean
  /** The gate moved to another terminal and the walk back was recalculated from the airport's transfer data. */
  returnTransferRecalculated: boolean
}

const same = (a: string, b: string) => a.slice(0, 16) === b.slice(0, 16)
/** The update for this flight, if it still describes the booking as saved. */
export function updateFor(f: FlightLike): FlightUpdate | undefined {
  const u = updatesStore.get(f.planId ?? f.id)
  return u && same(u.basis.arrival, f.arrival) && same(u.basis.departure, f.departure) ? u : undefined
}

/** Booking + update → what is true now for this flight. */
export function flightView(f: FlightLike): FlightView {
  const u = updateFor(f)
  const gate0 = bookedGate(f)
  const arrival = u?.arrival ?? f.arrival, departure = u?.departure ?? f.departure, gate = u?.gate ?? gate0
  let departureLocation = f.departureLocation ?? null
  let returnTransferUnknown = false
  const t0 = gateTerminal(f.airport, gate0), t1 = gateTerminal(f.airport, gate)
  if (u?.gate && t1 && t1 !== t0) {
    const graph = GRAPHS[f.airport]
    const target = graph?.locations.find((l) => l.kind === 'transit_area' && l.terminal?.toUpperCase() === t1)
    // Recalculated only where the airport's route data covers the new terminal, and only if the plan already knew
    // its departure terminal; otherwise the walk back is marked unknown rather than guessed.
    if (target) { if (departureLocation) departureLocation = target.id }
    else returnTransferUnknown = true
  }
  return {
    arrival, departure, gate, gateTerminal: t1,
    original: { arrival: f.arrival, departure: f.departure, gate: gate0 },
    changed: { arrival: !same(arrival, f.arrival), departure: !same(departure, f.departure), gate: !!u?.gate && u.gate !== gate0 },
    update: u, departureLocation, returnTransferUnknown, returnTransferRecalculated: departureLocation !== (f.departureLocation ?? null),
  }
}

/** The flight with its effective times and departure location (for the time calculation). */
export function withUpdate<T extends FlightLike>(f: T): T {
  if (!updateFor(f)) return f
  const v = flightView(f)
  return { ...f, arrival: v.arrival, departure: v.departure, departureLocation: v.departureLocation }
}

export interface Scenario { id: ScenarioId; label: string; detail: (f: FlightLike) => string }
const hm = (local: string) => local.slice(11, 16)
/** Deterministic scenarios, all relative to the booking (applying one twice gives the same result). */
export const SCENARIOS: Scenario[] = [
  { id: 'earlier-departure', label: 'Earlier departure', detail: (f) => `Departure ${hm(f.departure)} → ${hm(shift(f, 'departure', -45))}` },
  { id: 'delayed-departure', label: 'Departure delayed', detail: (f) => `Departure ${hm(f.departure)} → ${hm(shift(f, 'departure', 120))}` },
  { id: 'delayed-arrival', label: 'Arrival delayed', detail: (f) => `Arrival ${hm(f.arrival)} → ${hm(shift(f, 'arrival', 90))}` },
  { id: 'both-legs', label: 'Both flights changed', detail: (f) => `Arrival ${hm(f.arrival)} → ${hm(shift(f, 'arrival', 65))}, departure ${hm(f.departure)} → ${hm(shift(f, 'departure', 50))}` },
  { id: 'gate', label: 'Gate changed', detail: (f) => (bookedGate(f) ? `Gate ${bookedGate(f)} → ${NEW_GATE[f.airport] ?? 'D24'}` : 'No gate on this booking') },
]
const NEW_GATE: Record<string, string> = { SIN: 'D24', DXB: 'D24', LHR: 'C55', LIS: '41' }
const shift = (f: FlightLike, k: 'arrival' | 'departure', m: number) => shiftLocal(f[k], m, getAirport(f.airport).timezone)

/** The update a scenario produces for this flight. Time scenarios replace earlier time changes; the gate scenario
 *  keeps them (and vice versa), so a gate change can be combined with a delay. */
export function simulate(f: FlightLike & { id: string }, scenario: ScenarioId, now = new Date()): FlightUpdate | null {
  const prev = updateFor(f)
  const basis = { arrival: f.arrival, departure: f.departure }
  const base: FlightUpdate = { planId: f.id, source: 'simulation', scenario, updatedAt: now.toISOString(), basis, gate: prev?.gate }
  switch (scenario) {
    case 'earlier-departure': return { ...base, departure: shift(f, 'departure', -45) }
    case 'delayed-departure': return { ...base, departure: shift(f, 'departure', 120) }
    case 'delayed-arrival': return { ...base, arrival: shift(f, 'arrival', 90) }
    case 'both-legs': return { ...base, arrival: shift(f, 'arrival', 65), departure: shift(f, 'departure', 50) }
    case 'gate': {
      const g0 = bookedGate(f)
      if (!g0) return null
      return { planId: f.id, source: 'simulation', scenario, updatedAt: now.toISOString(), basis, arrival: prev?.arrival, departure: prev?.departure, gate: NEW_GATE[f.airport] ?? 'D24' }
    }
  }
}

// Sample journeys for the booking-reference flow. SkyStop does NOT connect to airline reservation systems: these four
// references are illustrative examples, not real bookings, and no airline or flight number is shown.
// Times are airport-local and resolved through the shared time-zone logic, so every duration below is computed
// (and unit-tested), not typed in. Dates are relative to today so the samples always lie in the future.
import { localToInstant } from '../domain'

export const AIRPORT_TZ: Record<string, string> = {
  CGK: 'Asia/Jakarta', SIN: 'Asia/Singapore', CDG: 'Europe/Paris', OPO: 'Europe/Lisbon', LIS: 'Europe/Lisbon',
  JFK: 'America/New_York', LHR: 'Europe/London', DXB: 'Asia/Dubai', HND: 'Asia/Tokyo',
}

interface LocalTime { day: number; time: string } // day offset from the journey's base date, airport-local HH:mm
interface SegmentSpec { from: string; to: string; depart: LocalTime; arrive: LocalTime }
export interface SampleJourneySpec {
  ref: string
  origin: string
  connection: string
  destination: string
  segments: [SegmentSpec, SegmentSpec]
  bufferMin: number
  /** Days from today to the first departure. */
  startsInDays: number
}

export const SAMPLE_JOURNEYS: SampleJourneySpec[] = [
  { ref: 'AXR7KD', origin: 'CGK', connection: 'SIN', destination: 'CDG', bufferMin: 120, startsInDays: 9,
    segments: [{ from: 'CGK', to: 'SIN', depart: { day: 0, time: '08:20' }, arrive: { day: 0, time: '11:15' } },
               { from: 'SIN', to: 'CDG', depart: { day: 0, time: '23:35' }, arrive: { day: 1, time: '06:20' } }] },
  { ref: 'BQ3LMV', origin: 'OPO', connection: 'LIS', destination: 'JFK', bufferMin: 90, startsInDays: 10,
    segments: [{ from: 'OPO', to: 'LIS', depart: { day: 0, time: '07:10' }, arrive: { day: 0, time: '08:05' } },
               { from: 'LIS', to: 'JFK', depart: { day: 0, time: '13:25' }, arrive: { day: 0, time: '16:30' } }] },
  { ref: 'CJ8NWT', origin: 'JFK', connection: 'LHR', destination: 'SIN', bufferMin: 120, startsInDays: 11,
    segments: [{ from: 'JFK', to: 'LHR', depart: { day: 0, time: '18:30' }, arrive: { day: 1, time: '06:35' } },
               { from: 'LHR', to: 'SIN', depart: { day: 1, time: '12:05' }, arrive: { day: 2, time: '09:05' } }] },
  { ref: 'DH5PRZ', origin: 'CDG', connection: 'DXB', destination: 'HND', bufferMin: 120, startsInDays: 12,
    segments: [{ from: 'CDG', to: 'DXB', depart: { day: 0, time: '15:05' }, arrive: { day: 1, time: '00:45' } },
               { from: 'DXB', to: 'HND', depart: { day: 1, time: '07:45' }, arrive: { day: 1, time: '22:35' } }] },
]

export interface Leg { from: string; to: string; departLocal: string; arriveLocal: string; departAt: string; arriveAt: string; durationMin: number }
export interface ResolvedJourney {
  ref: string; origin: string; connection: string; destination: string; legs: [Leg, Leg]
  /** Layover at the connecting airport, airport-local 'YYYY-MM-DDTHH:mm' as used by plan drafts. */
  layover: { arrivalLocal: string; departureLocal: string; totalMin: number; bufferMin: number; usableMin: number }
}

const addDays = (isoDate: string, n: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const minutes = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)

/** Resolves a sample journey to concrete local times and UTC instants, relative to `today` (UTC date). */
export function resolveJourney(j: SampleJourneySpec, today = new Date()): ResolvedJourney {
  const base = addDays(today.toISOString().slice(0, 10), j.startsInDays)
  const at = (code: string, t: LocalTime) => {
    const date = addDays(base, t.day)
    return { local: `${date}T${t.time}`, instant: localToInstant(date, t.time, AIRPORT_TZ[code]).toString() }
  }
  const legs = j.segments.map((s) => {
    const d = at(s.from, s.depart), a = at(s.to, s.arrive)
    return { from: s.from, to: s.to, departLocal: d.local, arriveLocal: a.local, departAt: d.instant, arriveAt: a.instant, durationMin: minutes(d.instant, a.instant) }
  }) as [Leg, Leg]
  const totalMin = minutes(legs[0].arriveAt, legs[1].departAt)
  return { ref: j.ref, origin: j.origin, connection: j.connection, destination: j.destination, legs,
    layover: { arrivalLocal: legs[0].arriveLocal, departureLocal: legs[1].departLocal, totalMin, bufferMin: j.bufferMin, usableMin: Math.max(0, totalMin - j.bufferMin) } }
}

export const normaliseRef = (input: string) => input.replace(/\s+/g, '').toUpperCase()
export const isRefFormat = (ref: string) => /^[A-Z0-9]{6}$/.test(ref)
/** Exact match against the sample references only; anything else returns null (never a fabricated result). */
export function findSampleJourney(input: string, today = new Date()): ResolvedJourney | null {
  const ref = normaliseRef(input)
  const spec = SAMPLE_JOURNEYS.find((j) => j.ref === ref)
  return spec ? resolveJourney(spec, today) : null
}

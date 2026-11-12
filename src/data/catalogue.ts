// Live catalogue loaded from Supabase (airports, activities, curated itineraries).
// The arrays are filled once at app start by loadCatalogue(); screens read them synchronously afterwards.
import type { Activity, Airport, Category, Template } from './types'
import { IMAGES, type Img } from './images'
import { getSupabase } from '../api/client'
import { listAirports, listActivities, listTemplates } from '../api/repositories'
import type { ActivityRow, AirportRow } from '../types/database.types'

export const AIRPORTS: Airport[] = []
export const ACTIVITIES: Activity[] = []
export const TEMPLATES: Template[] = []

// Presentation details the database does not hold. Photos and map positions are illustrative.
const PLACE: Record<string, { city: string; country: string }> = {
  LIS: { city: 'Lisbon', country: 'Portugal' },
  SIN: { city: 'Singapore', country: 'Singapore' },
}
const CATEGORY: Record<ActivityRow['category'], Category> = { food: 'Food', rest: 'Rest', shopping: 'Shopping', work: 'Work', culture: 'City' }
const PHOTO: Record<string, Partial<Record<ActivityRow['category'], Img>>> = {
  LIS: { food: IMAGES.activities.l1, rest: IMAGES.activities.l3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.l2, work: IMAGES.activities.s4 },
  SIN: { food: IMAGES.activities.s1, rest: IMAGES.activities.s3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.s2, work: IMAGES.activities.s4 },
}
const ZONE_Y = { airside: 28, unknown: 65, landside: 88 } as const
const ZONE_X = [32, 66, 50, 18, 82]

const costLabel = (label: string) =>
  /^unknown$/i.test(label.trim()) ? 'Cost not verified' : `${label.replace(/^illustrative:\s*/i, '').replace(/^./, (c) => c.toUpperCase())} cost (illustrative)`

function toAirport(r: AirportRow): Airport {
  const place = PLACE[r.id] ?? { city: r.name.replace(/\s+Airport$/i, ''), country: '' }
  return { code: r.id, name: r.name, timezone: r.timezone, ...place, image: IMAGES.airports[r.id] ?? IMAGES.results,
    terminals: 'Terminal details to be confirmed with the airport.', note: r.dataset_label }
}
function toActivities(rows: ActivityRow[]): Activity[] {
  const seen: Record<string, number> = {}
  return rows.map((r) => {
    const n = (seen[r.access_zone] = (seen[r.access_zone] ?? 0) + 1) - 1
    return {
      id: r.id, airport: r.airport_id, name: r.name, category: CATEGORY[r.category] ?? 'Rest', durationMin: r.duration_minutes,
      costUsd: 0, costLabel: costLabel(r.budget_label),
      access: r.access_zone === 'airside' ? 'Airside' : r.access_zone === 'landside' ? 'Landside' : 'Unverified',
      terminal: r.terminal, image: PHOTO[r.airport_id]?.[r.category] ?? IMAGES.results, note: r.description,
      leavesAirport: r.access_zone === 'landside',
      map: { x: ZONE_X[n % ZONE_X.length], y: ZONE_Y[r.access_zone] ?? 65 },
    }
  })
}

/** Reads the whole catalogue from the database. Throws on failure (no mock fallback). */
export async function loadCatalogue(): Promise<void> {
  const sb = getSupabase()
  const airports = await listAirports(sb)
  const perAirport = await Promise.all(airports.map(async (a) => ({
    activities: await listActivities(sb, a.id), templates: await listTemplates(sb, a.id),
  })))
  AIRPORTS.splice(0, AIRPORTS.length, ...airports.map(toAirport))
  ACTIVITIES.splice(0, ACTIVITIES.length, ...perAirport.flatMap((p) => toActivities(p.activities)))
  TEMPLATES.splice(0, TEMPLATES.length, ...perAirport.flatMap((p) => p.templates.map((t) => ({
    id: t.id, airport: t.airport_id, name: t.name, blurb: t.description, activityIds: t.items.map((i) => i.activity_id),
  }))))
}

export const isSupported = (code: string) => AIRPORTS.some((a) => a.code === code)
/** Supported airports come from the database; any other airport gets a neutral stand-in. */
export const getAirport = (code: string): Airport =>
  AIRPORTS.find((a) => a.code === code) ?? { code, name: `${code} Airport`, timezone: 'UTC', city: code, country: '', image: IMAGES.results, terminals: '', note: '' }
export const getActivities = (code: string) => ACTIVITIES.filter((a) => a.airport === code)
export const getTemplates = (code: string) => TEMPLATES.filter((t) => t.airport === code)

// Live catalogue loaded from Supabase (airports, activities, curated itineraries).
// The arrays are filled once at app start by loadCatalogue(); screens read them synchronously afterwards.
import type { Activity, Airport, Category, Template } from './types'
import { IMAGES, type Img } from './images'
import { getSupabase } from '../api/client'
import { listAirports, listActivities, listTemplates, listTransferGraph } from '../api/repositories'
import type { TransferGraph } from '../domain/itinerary'
import type { ActivityRow, AirportRow } from '../types/database.types'
import { layoutMarkers } from './mapLayout'

export const AIRPORTS: Airport[] = []
export const ACTIVITIES: Activity[] = []
export const TEMPLATES: Template[] = []
/** Transfer graph per airport code; only airports with recorded routing data have one. */
export const GRAPHS: Record<string, TransferGraph> = {}

// Presentation details the database does not hold. Photos and map positions are illustrative.
const PLACE: Record<string, { city: string; country: string }> = {
  LIS: { city: 'Lisbon', country: 'Portugal' },
  SIN: { city: 'Singapore', country: 'Singapore' },
  LHR: { city: 'London', country: 'United Kingdom' },
  DXB: { city: 'Dubai', country: 'United Arab Emirates' },
}
const TERMINALS: Record<string, string> = {
  LIS: 'Terminal 1 (main) and Terminal 2',
  SIN: 'Terminals 1–4, with Jewel in the public area',
  LHR: 'Terminals 2, 3, 4 and 5 — separate buildings; allow time to transfer',
  DXB: 'Terminals 1 and 3 (Concourses A, B, C and D)',
}
const CATEGORY: Record<ActivityRow['category'], Category> = { food: 'Food', rest: 'Rest', shopping: 'Shopping', work: 'Work', culture: 'Sights' }
const PHOTO: Record<string, Partial<Record<ActivityRow['category'], Img>>> = {
  LIS: { food: IMAGES.activities.l1, rest: IMAGES.activities.l3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.l2, work: IMAGES.activities.s4 },
  SIN: { food: IMAGES.activities.s1, rest: IMAGES.activities.s3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.s2, work: IMAGES.activities.s4 },
  LHR: { food: IMAGES.activities.s1, rest: IMAGES.activities.s3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.l4, work: IMAGES.activities.s4 },
  DXB: { food: IMAGES.activities.s1, rest: IMAGES.activities.l3, shopping: IMAGES.activities.l4, culture: IMAGES.activities.l4, work: IMAGES.activities.s4 },
}

// Budget wording comes from the database: 'Free' / 'Paid' only where the official source says so.
const costLabel = (label: string) => {
  const l = label.trim()
  if (/^unknown$/i.test(l)) return 'Price not listed'
  if (/^free$/i.test(l)) return 'Free'
  if (/^paid$/i.test(l)) return 'Paid entry'
  return `${l.replace(/^illustrative:\s*/i, '').replace(/^./, (c) => c.toUpperCase())} cost (illustrative)`
}

function toAirport(r: AirportRow): Airport {
  const place = PLACE[r.id] ?? { city: r.name.replace(/\s+Airport$/i, ''), country: '' }
  return { code: r.id, name: r.name, timezone: r.timezone, ...place, image: IMAGES.airports[r.id] ?? IMAGES.results,
    terminals: TERMINALS[r.id] ?? 'Terminal details to be confirmed with the airport.', note: r.dataset_label, entryGuidanceUrl: r.entry_guidance_url ?? undefined }
}
function toActivities(rows: ActivityRow[]): Activity[] {
  const pos = layoutMarkers(rows.map((r) => r.access_zone))
  return rows.map((r, i) => {
    return {
      id: r.id, airport: r.airport_id, name: r.name, category: CATEGORY[r.category] ?? 'Rest', durationMin: r.duration_minutes,
      costUsd: 0, costLabel: costLabel(r.budget_label),
      access: r.access_zone === 'airside' ? 'Airside' : r.access_zone === 'landside' ? 'Landside' : 'Unverified',
      terminal: r.terminal === 'Unverified' ? undefined : r.terminal, sourceUrl: r.source_url ?? undefined, image: PHOTO[r.airport_id]?.[r.category] ?? IMAGES.results, note: r.description,
      leavesAirport: r.access_zone === 'landside',
      map: pos[i], locationIds: [],
    }
  })
}

/** Reads the whole catalogue from the database. Throws on failure (no mock fallback). */
export async function loadCatalogue(): Promise<void> {
  const sb = getSupabase()
  const airports = await listAirports(sb)
  const perAirport = await Promise.all(airports.map(async (a) => ({
    activities: await listActivities(sb, a.id), templates: await listTemplates(sb, a.id), graph: await listTransferGraph(sb, a.id),
  })))
  AIRPORTS.splice(0, AIRPORTS.length, ...airports.map(toAirport))
  ACTIVITIES.splice(0, ACTIVITIES.length, ...perAirport.flatMap((p) => toActivities(p.activities).map((a) => ({
    ...a, locationIds: p.graph.activityLocations.filter((l) => l.activity_id === a.id).map((l) => l.location_id),
  }))))
  for (const k of Object.keys(GRAPHS)) delete GRAPHS[k]
  airports.forEach((a, i) => {
    const g = perAirport[i].graph
    if (!g.locations.length) return
    GRAPHS[a.id] = {
      locations: g.locations.map((l) => ({ id: l.id, name: l.name, zone: l.zone, terminal: l.terminal, kind: l.kind })),
      transfers: g.transfers.map((t) => ({ id: t.id, from: t.from_location, to: t.to_location, mode: t.mode, min: t.min_minutes, max: t.max_minutes,
        immigration: t.requires_immigration, departureChecks: t.requires_departure_checks, throughCheck: t.requires_through_check,
        verification: t.verification, source: t.source_url, note: t.note })),
    }
  })
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

// Saved flights and plans: Supabase is the source of truth. One `layovers` row is one saved flight journey (its
// connection), its `plan_items` are the activity itinerary (possibly empty), and `layover_details` holds the journey
// labels (origin, destination, booking reference, name, terminals). All are owner-only. A browser-side copy of
// the labels (written before layover_details existed) is used as a fallback and copied up once.
import type { Draft, Plan } from './types'
import { AIRPORTS, getAirport } from './catalogue'
import { getSupabase } from '../api/client'
import { hasGuestSession } from '../api/session'
import * as repo from '../api/repositories'
import { instantToLocal, validateLayover } from '../domain'

interface Meta { name?: string; origin?: string; destination?: string; bookingRef?: string; arrivalLocation?: string | null; departureLocation?: string | null }
const META_KEY = 'skystop.planmeta.v1'
const readMeta = (): Record<string, Meta> => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} } }
const writeMeta = (id: string, m: Meta) => { try { localStorage.setItem(META_KEY, JSON.stringify({ ...readMeta(), [id]: m })) } catch { /* labels are optional */ } }

export function toUiPlan(row: repo.Plan): Plan {
  const ap = getAirport(row.airport_id)
  const local = (iso: string) => { const l = instantToLocal(iso, ap.timezone); return `${l.date}T${l.time}` }
  const det = Array.isArray(row.layover_details) ? row.layover_details[0] : row.layover_details
  const stored = readMeta()[row.id] ?? {}
  const meta: Meta = det ? { name: det.name ?? stored.name, origin: det.origin_airport ?? undefined, destination: det.destination_airport ?? undefined,
    bookingRef: det.booking_ref ?? undefined, arrivalLocation: det.arrival_location, departureLocation: det.departure_location } : stored
  return {
    id: row.id, name: meta.name || `${ap.city} layover`, airport: row.airport_id,
    arrival: local(row.arrival_at), departure: local(row.departure_at), bufferMin: row.buffer_minutes,
    activityIds: [...row.plan_items].sort((a, b) => a.position - b.position).map((i) => i.activity_id),
    updatedAt: row.updated_at, revision: row.revision, origin: meta.origin, destination: meta.destination, bookingRef: meta.bookingRef,
    arrivalLocation: meta.arrivalLocation ?? null, departureLocation: meta.departureLocation ?? null,
  }
}

/** This guest's saved plans. A browser that has never saved has no session and therefore no plans. */
export async function fetchPlans(): Promise<Plan[]> {
  const sb = getSupabase()
  if (!(await hasGuestSession(sb))) return []
  const rows = await repo.listPlans(sb)
  // one-time copy of labels saved before journey details were stored in the database (best effort)
  const local = readMeta()
  for (const r of rows) {
    const hasDb = Array.isArray(r.layover_details) ? r.layover_details.length > 0 : !!r.layover_details
    const m = local[r.id]
    if (!hasDb && m && (m.origin || m.destination || m.bookingRef || m.name)) void repo.saveLayoverDetails(sb, detailsRow(r.id, m)).catch(() => {})
  }
  return rows.map(toUiPlan)
}

/** Saves the draft to the database and returns the server's copy. Throws with a readable message on failure. */
export async function saveDraft(d: Draft): Promise<Plan> {
  const ap = AIRPORTS.find((a) => a.code === d.airport)
  if (!ap) throw new Error('Plans can only be saved for airports with a layover guide.')
  const [arrivalDate, arrivalTime = ''] = d.arrival.split('T'), [departureDate, departureTime = ''] = d.departure.split('T')
  const v = validateLayover({
    timezone: ap.timezone, arrivalDate, arrivalTime: arrivalTime.slice(0, 5), departureDate, departureTime: departureTime.slice(0, 5),
    bufferMinutes: d.bufferMin, now: new Date(), isNew: false,
  })
  if (!v.ok) throw new Error(Object.values(v.errors)[0] ?? 'Check the connection times.')
  const sb = getSupabase()
  const id = d.planId ?? d.newId
  if (!id) throw new Error('This plan has no identifier. Start the plan again.')
  const payload = { id, airportId: ap.code, arrivalAt: v.value.arrivalAt, departureAt: v.value.departureAt, bufferMinutes: d.bufferMin, activityIds: d.activityIds }
  let saved: repo.Plan
  try {
    saved = await repo.savePlan(sb, payload, d.revision ?? 0)
  } catch (e) {
    // A first save may have reached the server even though the reply was lost. If this plan id already
    // exists for this guest, continue from the server's revision instead of creating a duplicate.
    const existing = d.planId ? null : await repo.getPlan(sb, id).catch(() => null)
    if (!existing) throw friendly(e)
    try { saved = await repo.savePlan(sb, payload, existing.revision) } catch (e2) { throw friendly(e2) }
  }
  const m: Meta = { name: d.name.trim() || undefined, origin: d.origin, destination: d.destination, bookingRef: d.bookingRef,
    arrivalLocation: d.arrivalLocation ?? null, departureLocation: d.departureLocation ?? null }
  try { await repo.saveLayoverDetails(sb, detailsRow(id, m)) } catch { /* the flight itself is saved; labels stay in this browser */ }
  writeMeta(id, { name: d.name.trim() || undefined, origin: d.origin, destination: d.destination, bookingRef: d.bookingRef,
    arrivalLocation: d.arrivalLocation ?? null, departureLocation: d.departureLocation ?? null })
  return toUiPlan(saved)
}

function friendly(e: unknown): Error {
  const code = (e as { code?: string })?.code, msg = e instanceof Error ? e.message : String(e)
  if (/timeout|aborted|Failed to fetch|NetworkError/i.test(msg)) return new Error('Could not reach the server. Check your connection and try again. Your plan is still here.')
  if (code === '23514' || code === '22023') return new Error('The server rejected these details. Check the times and activities, then try again.')
  if (code === '42501') return new Error('This plan belongs to a different guest session and cannot be changed here.')
  return new Error(`Could not save: ${msg}`)
}

const code = (c?: string) => (c && /^[A-Z]{3}$/.test(c) ? c : null)
function detailsRow(id: string, m: Meta) {
  return { layover_id: id, name: m.name?.slice(0, 80) ?? null, origin_airport: code(m.origin), destination_airport: code(m.destination),
    booking_ref: m.bookingRef && /^[A-Z0-9]{6}$/.test(m.bookingRef) ? m.bookingRef : null,
    arrival_location: m.arrivalLocation ?? null, departure_location: m.departureLocation ?? null }
}

/** Removes a saved flight and, with it, its itinerary (the server deletes both together). */
export async function removePlan(id: string): Promise<void> {
  try { await repo.deletePlan(getSupabase(), id) } catch (e) { throw friendly(e) }
  const all = readMeta(); delete all[id]
  try { localStorage.setItem(META_KEY, JSON.stringify(all)) } catch { /* optional */ }
}

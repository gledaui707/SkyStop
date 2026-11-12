// Saved plans: Supabase is the source of truth (layovers + plan_items, owned by the anonymous guest).
// The database has no columns for a plan's display name or origin/destination, so those cosmetic labels
// are remembered per browser only; times, airport, buffer and activities always come from the database.
import type { Draft, Plan } from './types'
import { AIRPORTS, getAirport } from './catalogue'
import { getSupabase } from '../api/client'
import { hasGuestSession } from '../api/session'
import * as repo from '../api/repositories'
import { instantToLocal, validateLayover } from '../domain'

interface Meta { name?: string; origin?: string; destination?: string }
const META_KEY = 'skystop.planmeta.v1'
const readMeta = (): Record<string, Meta> => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') } catch { return {} } }
const writeMeta = (id: string, m: Meta) => { try { localStorage.setItem(META_KEY, JSON.stringify({ ...readMeta(), [id]: m })) } catch { /* labels are optional */ } }

export function toUiPlan(row: repo.Plan): Plan {
  const ap = getAirport(row.airport_id)
  const local = (iso: string) => { const l = instantToLocal(iso, ap.timezone); return `${l.date}T${l.time}` }
  const meta = readMeta()[row.id] ?? {}
  return {
    id: row.id, name: meta.name || `${ap.city} layover`, airport: row.airport_id,
    arrival: local(row.arrival_at), departure: local(row.departure_at), bufferMin: row.buffer_minutes,
    activityIds: [...row.plan_items].sort((a, b) => a.position - b.position).map((i) => i.activity_id),
    updatedAt: row.updated_at, revision: row.revision, origin: meta.origin, destination: meta.destination,
  }
}

/** This guest's saved plans. A browser that has never saved has no session and therefore no plans. */
export async function fetchPlans(): Promise<Plan[]> {
  const sb = getSupabase()
  if (!(await hasGuestSession(sb))) return []
  return (await repo.listPlans(sb)).map(toUiPlan)
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
  writeMeta(id, { name: d.name.trim() || undefined, origin: d.origin, destination: d.destination })
  return toUiPlan(saved)
}

function friendly(e: unknown): Error {
  const code = (e as { code?: string })?.code, msg = e instanceof Error ? e.message : String(e)
  if (/timeout|aborted|Failed to fetch|NetworkError/i.test(msg)) return new Error('Could not reach the server. Check your connection and try again. Your plan is still here.')
  if (code === '23514' || code === '22023') return new Error('The server rejected these details. Check the times and activities, then try again.')
  if (code === '42501') return new Error('This plan belongs to a different guest session and cannot be changed here.')
  return new Error(`Could not save: ${msg}`)
}

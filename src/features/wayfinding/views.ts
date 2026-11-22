// What each map mode draws, from the one itinerary state. Pure helpers shared by Explore, Plan and Directions.
//   Explore     venue markers (each venue at its illustrative spot in its terminal), no route.
//   Plan        the draft's stops and every leg between them (computeItinerary + buildRoute).
//   Directions  one leg: a stop of the plan to the next, or the arrival gate to a venue.
// Time comes from the planner (computeItinerary / planItinerary) and the route model (route.ts); nothing here adds
// minutes of its own, so the three modes and the itinerary builder always show the same numbers.
import { GRAPHS } from '../../data/catalogue'
import { computeItinerary } from '../../data/itinerary'
import { venueLocations, type VenueLocation } from '../../data/venueLocations'
import { terminalKeysOf } from '../../data/airportGeo'
import { planItinerary } from '../../domain/itinerary'
import type { Activity, Draft } from '../../data/types'
import { buildRoute, mapKeyFor, type RouteView } from './route'
import { venuePoint, type LatLng } from './mock'

/** A venue's default location: its catalogue (listed) one, else its first. */
export const defaultLoc = (a: Activity): VenueLocation | null => { const l = venueLocations(a); return l.find((x) => x.listed) ?? l[0] ?? null }

/** The venue as a route stop at one of its locations (another branch moves it to that terminal and area). */
export function atBranch(code: string, a: Activity, id: string | null): { act: Activity; zone: 'airside' | 'landside' | 'unknown' } {
  const graph = GRAPHS[code] ?? null
  const base = a.access === 'Airside' ? 'airside' as const : a.access === 'Landside' ? 'landside' as const : 'unknown' as const
  const def = defaultLoc(a)
  const loc = id && id !== def?.id ? venueLocations(a).find((l) => l.id === id) : (def && !def.listed ? def : null)
  if (!loc) return { act: a, zone: base }
  const ids = graph?.locations.filter((l) => mapKeyFor(code, l) === loc.terminal && l.zone === loc.zone).map((l) => l.id) ?? []
  return { act: { ...a, id: loc === def ? a.id : `${a.id}#${loc.id}`, terminal: loc.terminalName, locationIds: ids }, zone: loc.zone }
}

/** Terminal pin key of a venue stop (same rule as the route model). */
function keyOf(code: string, a: Activity): string | null {
  const graph = GRAPHS[code] ?? null
  const loc = a.locationIds?.[0] ? graph?.locations.find((l) => l.id === a.locationIds[0]) : undefined
  return terminalKeysOf(code, a.terminal)[0] ?? mapKeyFor(code, loc) ?? null
}

/** Where a venue's marker sits on the Explore map (illustrative spot inside its terminal), at a location if given. */
export function venueMarkerPoint(code: string, a: Activity, branch: string | null = null): LatLng | null {
  const { act } = atBranch(code, a, branch)
  return venuePoint(code, act.id, keyOf(code, act))
}

/** The plan's route: every stop of the draft in order, and the legs between them. */
export function planRoute(code: string, draft: Draft | null): RouteView | null {
  if (!draft || draft.airport !== code || !draft.activityIds.length) return null
  const { items, itin } = computeItinerary(draft)
  return buildRoute(code, GRAPHS[code] ?? null, itin, items, draft.arrivalLocation, draft.departureLocation)
}

/** From the arrival gate to one venue (and on to departure), when the venue is not a stop of the plan. */
export function venueRoute(code: string, draft: Draft | null, a: Activity, branch: string | null): RouteView {
  const graph = GRAPHS[code] ?? null
  const { act, zone } = atBranch(code, a, branch)
  const mine = draft?.airport === code ? draft : null
  const usable = mine ? computeItinerary(mine).hero.usable : 0
  const itin = planItinerary({ usable, graph, arrivalLocation: mine?.arrivalLocation, departureLocation: mine?.departureLocation,
    activities: [{ id: act.id, name: act.name, durationMin: act.durationMin, zone, locationIds: act.locationIds }] })
  return buildRoute(code, graph, itin, [act], mine?.arrivalLocation, mine?.departureLocation)
}

/** Directions to a venue: the plan's leg into it when it is a stop (at its own location), else arrival gate → venue. */
export function directionsToVenue(code: string, draft: Draft | null, a: Activity, branch: string | null): { route: RouteView; leg: number; inPlan: boolean } {
  const plan = planRoute(code, draft)
  const n = draft?.activityIds.indexOf(a.id) ?? -1
  if (plan && n >= 0 && !branch) return { route: plan, leg: n, inPlan: true }
  return { route: venueRoute(code, draft, a, branch), leg: 0, inPlan: false }
}

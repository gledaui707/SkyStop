// Hand-off from a booking to the planner. One builder for the planning draft, shared by the journey overview
// (Add flight → booking reference) and the interactive onboarding, so both start the same itinerary engine with the
// same data. Plus a small store that keeps the onboarding's plan while Account Access is shown (it survives a reload or
// an email sign-in link opening the app again in this browser).
import type { Draft } from '../../data/types'
import type { ResolvedJourney } from '../../data/journeys'
import { airportInfo } from '../../data/airportDirectory'

/** The planning draft for a resolved booking: its layover, a planning buffer and any chosen activities. */
export function journeyDraft(j: ResolvedJourney, bufferMin = j.layover.bufferMin, activityIds: string[] = []): Draft {
  return {
    name: `${airportInfo(j.connection)?.city ?? j.connection} layover`, airport: j.connection,
    arrival: j.layover.arrivalLocal, departure: j.layover.departureLocal, bufferMin, activityIds,
    origin: j.origin, destination: j.destination, bookingRef: j.ref,
  }
}

/** What the onboarding hands over: the draft and the screen to open after Account Access. */
export interface Handoff<R> { draft: Draft | null; then: R }

const KEY = 'skystop.onboarding.handoff.v1'
export const handoffStore = {
  get<R>(): Handoff<R> | null {
    try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Handoff<R>) : null } catch { return null }
  },
  set<R>(h: Handoff<R>) { try { localStorage.setItem(KEY, JSON.stringify(h)) } catch { /* ignore: the in-memory draft still applies */ } },
  clear() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } },
}

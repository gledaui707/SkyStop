import type { Img } from './images'
export type Category = 'Food' | 'Rest' | 'Shopping' | 'Work' | 'Sights'
export type Access = 'Airside' | 'Landside' | 'Unverified'

export interface Airport {
  code: string
  /** IANA time zone of the airport; all layover times are local to it. */
  timezone: string
  name: string
  city: string
  country: string
  image: Img
  terminals: string
  /** Official immigration guidance for the airport's country. */
  entryGuidanceUrl?: string
  note: string
}
export interface Activity {
  id: string
  airport: string
  name: string
  category: Category
  durationMin: number
  costUsd: number
  /** Budget wording from the database (no invented prices). */
  costLabel: string
  access: Access
  terminal?: string
  /** Official page the venue details were checked against. */
  sourceUrl?: string
  image: Img
  note: string
  leavesAirport?: boolean
  /** Transfer-graph locations this venue is in (empty when the airport has no routing data). */
  locationIds: string[]
  /** Position on the illustrative schematic map, in percent. Not a real coordinate. */
  map: { x: number; y: number }
}
export interface Template {
  id: string
  airport: string
  name: string
  blurb: string
  activityIds: string[]
}
export interface Flight {
  id: string
  airline: string
  origin: string
  destination: string
  via: 'LIS' | 'SIN'
  departAt: Date
  legOneMin: number
  layoverMin: number
  legTwoMin: number
  priceUsd: number
}
export interface Plan {
  id: string
  name: string
  airport: string
  arrival: string // ISO local datetime
  departure: string
  bufferMin: number
  activityIds: string[]
  updatedAt: string
  /** Server revision, needed to save an edit. */
  revision: number
  origin?: string
  destination?: string
  /** Sample booking reference the plan was started from, if any (label only). */
  bookingRef?: string
  /** Transfer-graph location ids of the arrival and departure terminals (airports with routing data). */
  arrivalLocation?: string | null
  departureLocation?: string | null
}
export interface Draft {
  planId?: string
  /** Client-generated id for a not-yet-saved plan; kept across retries. */
  newId?: string
  revision?: number
  name: string
  airport: string
  arrival: string
  departure: string
  bufferMin: number
  activityIds: string[]
  fromFlight?: string
  origin?: string
  destination?: string
  bookingRef?: string
  arrivalLocation?: string | null
  departureLocation?: string | null
}

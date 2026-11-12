import type { Img } from './images'
export type Category = 'Food' | 'Rest' | 'Shopping' | 'Work' | 'City'
export type Access = 'Airside' | 'Landside' | 'Unverified'

export interface Airport {
  code: 'LIS' | 'SIN'
  name: string
  city: string
  country: string
  image: Img
  terminals: string
  note: string
}
export interface Activity {
  id: string
  airport: string
  name: string
  category: Category
  durationMin: number
  costUsd: number
  access: Access
  terminal?: string
  image: Img
  note: string
  leavesAirport?: boolean
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
  origin?: string
  destination?: string
}
export interface Draft {
  planId?: string
  name: string
  airport: string
  arrival: string
  departure: string
  bufferMin: number
  activityIds: string[]
  fromFlight?: string
  origin?: string
  destination?: string
}

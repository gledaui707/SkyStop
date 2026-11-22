import { beforeEach, describe, expect, it } from 'vitest'
import { ACTIVITIES, AIRPORTS, GRAPHS } from '../../data/catalogue'
import { computeItinerary } from '../../data/itinerary'
import type { Activity, Draft } from '../../data/types'
import { directionsToVenue, planRoute, venueMarkerPoint, venueRoute } from './views'

// The three map modes read one draft; these checks pin that they agree with the planner and with each other.
const act = (id: string, terminal: string, locationIds: string[], durationMin = 30): Activity =>
  ({ id, airport: 'SIN', name: id, category: 'Sights', durationMin, costUsd: 0, costLabel: '', access: 'Airside', terminal, image: '' as never, note: '', locationIds, map: { x: 0, y: 0 } })

beforeEach(() => {
  AIRPORTS.splice(0, AIRPORTS.length, { code: 'SIN', name: 'Singapore Changi Airport', timezone: 'Asia/Singapore', city: 'Singapore', country: 'Singapore', image: '' as never, terminals: '', note: '' })
  ACTIVITIES.splice(0, ACTIVITIES.length, act('Garden', 'Terminal 3 transit, Level 2', ['SIN-T3']), act('Pool', 'Terminal 1 transit, Level 3', ['SIN-T1'], 60), act('Dumplings', 'Terminal 3 transit, Level 2', ['SIN-T3'], 45))
  for (const k of Object.keys(GRAPHS)) delete GRAPHS[k]
  const e = (from: string, to: string) => ({ id: from + to, from, to, mode: 'skytrain_or_walk', min: 5, max: 10, immigration: false, departureChecks: false, throughCheck: false, verification: 'official' as const, source: null, note: '' })
  GRAPHS.SIN = {
    locations: [{ id: 'SIN-T1', name: 'Terminal 1 transit area', zone: 'airside', terminal: 'T1', kind: 'transit_area' }, { id: 'SIN-T3', name: 'Terminal 3 transit area', zone: 'airside', terminal: 'T3', kind: 'transit_area' }],
    transfers: [e('SIN-T1', 'SIN-T3'), e('SIN-T3', 'SIN-T1')],
  }
})
const draft = (activityIds: string[]): Draft => ({ name: 'x', airport: 'SIN', arrival: '2026-11-24T11:15', departure: '2026-11-24T23:35', bufferMin: 120, activityIds, arrivalLocation: 'SIN-T1', departureLocation: 'SIN-T3' })

describe('map modes share one itinerary', () => {
  it('Plan: stops in the draft order, a leg between each, and the same transfer minutes the time budget counts', () => {
    const d = draft(['Garden', 'Pool'])
    const r = planRoute('SIN', d)!
    expect(r.stops.map((s) => [s.n, s.kind, s.label])).toEqual([[0, 'arrival', 'Arrival'], [1, 'activity', 'Garden'], [2, 'activity', 'Pool'], [3, 'departure', 'Departure']])
    expect(r.legs).toHaveLength(3)
    expect(r.legs.reduce((s, l) => s + (l.minutes?.max ?? 0), 0)).toBe(computeItinerary(d).hero.transferMin) // no double counting
  })
  it('Plan: reordering the draft renumbers the stops and reconnects the legs', () => {
    const r = planRoute('SIN', draft(['Pool', 'Garden']))!
    expect(r.stops.slice(1, 3).map((s) => s.label)).toEqual(['Pool', 'Garden'])
    expect([r.legs[0].to.label, r.legs[1].from.label, r.legs[1].to.label]).toEqual(['Pool', 'Pool', 'Garden'])
  })
  it('Plan: nothing to draw without stops (or for another airport)', () => {
    expect(planRoute('SIN', draft([]))).toBeNull()
    expect(planRoute('LIS', draft(['Garden']))).toBeNull()
  })
  it('Directions to a stop of the plan use the plan\'s leg into it', () => {
    const d = draft(['Garden', 'Pool'])
    const t = directionsToVenue('SIN', d, ACTIVITIES[1], null)
    expect(t).toMatchObject({ leg: 1, inPlan: true })
    expect([t.route.legs[t.leg].from.label, t.route.legs[t.leg].to.label]).toEqual(['Garden', 'Pool'])
  })
  it('Directions to a venue outside the plan start at the arrival gate', () => {
    const t = directionsToVenue('SIN', draft(['Garden']), ACTIVITIES[2], null)
    expect(t).toMatchObject({ leg: 0, inPlan: false })
    expect([t.route.legs[0].from.kind, t.route.legs[0].to.label]).toEqual(['arrival', 'Dumplings'])
  })
  it('Explore puts a venue\'s marker where Directions end (deterministic illustrative spot)', () => {
    const a = ACTIVITIES[2]
    const p = venueMarkerPoint('SIN', a)
    expect(p).toEqual(venueMarkerPoint('SIN', a))
    expect(venueRoute('SIN', draft([]), a, null).legs[0].to.point).toEqual(p)
  })
})

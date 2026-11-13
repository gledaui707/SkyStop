import { afterEach, describe, expect, it } from 'vitest'
import { planItinerary, type TransferGraph } from '../../domain/itinerary'
import { PATH_GEOMETRY, buildRoute, mapKeyFor, stopsByPin } from './route'

// A small Changi-like graph (shape of the real data; values are test fixtures).
const g: TransferGraph = {
  locations: [
    { id: 'SIN-T1-TRANSIT', name: 'Terminal 1 transit area', zone: 'airside', terminal: 'T1', kind: 'transit_area' },
    { id: 'SIN-T2-TRANSIT', name: 'Terminal 2 transit area', zone: 'airside', terminal: 'T2', kind: 'transit_area' },
    { id: 'SIN-T3-TRANSIT', name: 'Terminal 3 transit area', zone: 'airside', terminal: 'T3', kind: 'transit_area' },
    { id: 'SIN-JEWEL', name: 'Jewel (public area)', zone: 'landside', terminal: null, kind: 'public_area' },
  ],
  transfers: [
    { id: 'a', from: 'SIN-T1-TRANSIT', to: 'SIN-T3-TRANSIT', mode: 'skytrain_or_walk', min: 5, max: 10, immigration: false, departureChecks: false, throughCheck: false, verification: 'official', source: 'https://www.changiairport.com/', note: '' },
    { id: 'b', from: 'SIN-T3-TRANSIT', to: 'SIN-T1-TRANSIT', mode: 'skytrain_or_walk', min: 5, max: 10, immigration: false, departureChecks: false, throughCheck: false, verification: 'official', source: 'https://www.changiairport.com/', note: '' },
    { id: 'c', from: 'SIN-T1-TRANSIT', to: 'SIN-JEWEL', mode: 'walk', min: 5, max: 10, immigration: true, departureChecks: false, throughCheck: false, verification: 'planning_estimate', source: null, note: 'Clear immigration first.' },
    { id: 'd', from: 'SIN-JEWEL', to: 'SIN-T1-TRANSIT', mode: 'walk', min: 5, max: 10, immigration: false, departureChecks: true, throughCheck: false, verification: 'planning_estimate', source: null, note: '' },
  ],
}
const act = (id: string, locationIds: string[], zone: 'airside' | 'landside' = 'airside') => ({ id, name: id, durationMin: 30, zone, locationIds })
const route = (acts: ReturnType<typeof act>[], arrival: string | null, departure: string | null, graph: TransferGraph | null = g) => {
  const itin = planItinerary({ usable: 600, activities: acts, graph, arrivalLocation: arrival, departureLocation: departure })
  return buildRoute('SIN', graph, itin, acts, arrival, departure)
}

afterEach(() => { for (const k of Object.keys(PATH_GEOMETRY)) delete PATH_GEOMETRY[k] })

describe('wayfinding route view', () => {
  it('orders stops: arrival, activities in plan order, departure', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT']), act('Garden', ['SIN-T1-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T3-TRANSIT')
    expect(r.stops.map((s) => [s.n, s.kind, s.mapKey])).toEqual([[0, 'arrival', 'T1'], [1, 'activity', 'T3'], [2, 'activity', 'T1'], [3, 'departure', 'T3']])
    expect(r.legs).toHaveLength(3)
  })
  it('labels a leg verified only when every step is an airport-published time', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0]).toMatchObject({ status: 'verified', minutes: { min: 5, max: 10 } })
  })
  it('labels a leg with a planning estimate as an estimate and lists its checkpoints without a waiting time', () => {
    const r = route([act('Rain Vortex', ['SIN-JEWEL'], 'landside')], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].status).toBe('estimate')
    expect(r.legs[0].checkpoints.join(' ')).toMatch(/immigration/i)
    expect(r.legs[1].checkpoints.join(' ')).toMatch(/departure immigration and security/i)
  })
  it('fills a leg the graph cannot route with illustrative minutes (between terminals 12–20 min)', () => {
    const r = route([act('Lounge', ['SIN-T2-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT') // no T1↔T2 edge in the fixture
    expect(r.legs[0]).toMatchObject({ status: 'estimate', minutes: { min: 12, max: 20 } })
  })
  it('draws a curved line between two different terminals, and none within one terminal', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT']), act('Cafe', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].geometry!.length).toBeGreaterThan(10)
    expect(r.legs[1].geometry).toBeNull()
    const mid = r.legs[0].geometry![12], [a, b] = [r.legs[0].geometry![0], r.legs[0].geometry!.at(-1)!]
    expect(Math.abs((mid[0] - a[0]) * (b[1] - a[1]) - (mid[1] - a[1]) * (b[0] - a[0]))).toBeGreaterThan(0) // bowed, not straight
  })
  it('uses registered path geometry when there is one', () => {
    PATH_GEOMETRY['SIN-T1-TRANSIT>SIN-T3-TRANSIT'] = [[1.36, 103.99], [1.355, 103.986]]
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(r.legs[0].geometry).toHaveLength(2)
  })
  it('places every Changi stop on a pin, including T2 and Jewel', () => {
    expect(mapKeyFor('SIN', g.locations[1])).toBe('T2')
    expect(mapKeyFor('SIN', g.locations[3])).toBe('JEWEL')
  })
  it('gives directions at an airport without routing data, from the venues\' terminals', () => {
    const itin = planItinerary({ usable: 600, activities: [act('Cafe', [])], graph: null })
    const r = buildRoute('LHR', null, itin, [{ id: 'a', name: 'Cafe', terminal: 'Terminal 5' }, { id: 'b', name: 'Shop', terminal: 'Terminal 3' }])
    expect(r.stops.map((s) => s.mapKey)).toEqual(['T5', 'T5', 'T3', 'T3'])
    expect(r.legs.map((l) => l.minutes)).toEqual([{ min: 5, max: 10 }, { min: 12, max: 20 }, { min: 5, max: 10 }])
    expect(r.legs[1].geometry).not.toBeNull()
  })
  it('groups stop numbers by terminal pin for map badges', () => {
    const r = route([act('Lounge', ['SIN-T3-TRANSIT'])], 'SIN-T1-TRANSIT', 'SIN-T1-TRANSIT')
    expect(stopsByPin(r.stops)).toEqual({ T1: [0, 2], T3: [1] })
  })
})

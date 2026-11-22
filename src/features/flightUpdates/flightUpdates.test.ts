import { describe, it, expect, beforeEach } from 'vitest'
import { ACTIVITIES, AIRPORTS, GRAPHS } from '../../data/catalogue'
import { computeItinerary } from '../../data/itinerary'
import type { Activity, Airport } from '../../data/types'
import { flightView, shiftLocal, simulate, updatesStore, gateTerminal, SCENARIOS } from './updates'
import { planningImpact, suggestRevisions, lateActivities } from './impact'

const ap = (code: string, timezone: string): Airport => ({ code, name: code, timezone, city: code, country: '', image: '' as never, terminals: '', note: '' })
const act = (id: string, airport: string, category: Activity['category'], durationMin: number, access: Activity['access'] = 'Airside', locationIds: string[] = []): Activity =>
  ({ id, airport, name: id, category, durationMin, costUsd: 0, costLabel: '', access, image: '' as never, note: '', locationIds, map: { x: 0, y: 0 } })

beforeEach(() => {
  AIRPORTS.splice(0, AIRPORTS.length, ap('SIN', 'Asia/Singapore'), ap('DXB', 'Asia/Dubai'), ap('LIS', 'Europe/Lisbon'))
  ACTIVITIES.splice(0, ACTIVITIES.length,
    // Dubai (no route data), as in the database
    act('Sleepover lounge', 'DXB', 'Rest', 120), act('Al Majlis', 'DXB', 'Food', 60), act('Timeless Spa', 'DXB', 'Rest', 60),
    act('Dubai Duty Free', 'DXB', 'Shopping', 40), act('Be Relax spa', 'DXB', 'Rest', 45), act('Aesop', 'DXB', 'Shopping', 15, 'Unverified'),
    // Singapore with a two-terminal test graph
    act('T3 dumplings', 'SIN', 'Food', 45, 'Airside', ['T3']), act('T1 pool', 'SIN', 'Rest', 60, 'Airside', ['T1']), act('T3 garden', 'SIN', 'Sights', 30, 'Airside', ['T3']))
  for (const k of Object.keys(GRAPHS)) delete GRAPHS[k]
  const edge = (from: string, to: string) => ({ id: `${from}${to}`, from, to, mode: 'skytrain_or_walk', min: 10, max: 25, immigration: false, departureChecks: false, throughCheck: false, verification: 'official' as const, source: null, note: '' })
  GRAPHS.SIN = { locations: [{ id: 'T1', name: 'T1 transit', zone: 'airside', terminal: 'T1', kind: 'transit_area' }, { id: 'T3', name: 'T3 transit', zone: 'airside', terminal: 'T3', kind: 'transit_area' }],
    transfers: [edge('T1', 'T3'), edge('T3', 'T1')] }
  for (const id of Object.keys(updatesStore.all())) updatesStore.remove(id)
})

// AXR7KD at Singapore: lands 11:15, departs 23:35, 2h buffer, gate B12.
const sin = (activityIds: string[] = [], extra: object = {}) => ({ id: 'p-sin', airport: 'SIN', arrival: '2026-11-24T11:15', departure: '2026-11-24T23:35', bufferMin: 120, activityIds, bookingRef: 'AXR7KD', ...extra })
// DH5PRZ at Dubai: lands 00:45, departs 07:45, 2h buffer, gate B12. 4h 40m of activities in 5h usable.
const DXB_PLAN = ['Sleepover lounge', 'Al Majlis', 'Timeless Spa', 'Dubai Duty Free']
const dxb = (activityIds = DXB_PLAN) => ({ id: 'p-dxb', airport: 'DXB', arrival: '2026-11-25T00:45', departure: '2026-11-25T07:45', bufferMin: 120, activityIds, bookingRef: 'DH5PRZ' })
const run = (f: { id: string } & Parameters<typeof simulate>[0], s: Parameters<typeof simulate>[1]) => { const u = simulate(f, s)!; updatesStore.set(u); return u }

describe('time shifting', () => {
  it('moves local times through the airport time zone, across midnight and daylight saving', () => {
    expect(shiftLocal('2026-11-24T23:35', 120, 'Asia/Singapore')).toBe('2026-11-25T01:35')
    expect(shiftLocal('2026-11-24T00:10', -45, 'Asia/Dubai')).toBe('2026-11-23T23:25')
    // Lisbon leaves summer time at 02:00 on 25 Oct 2026 (clocks go back to 01:00): two real hours later is 01:30.
    expect(shiftLocal('2026-10-25T00:30', 120, 'Europe/Lisbon')).toBe('2026-10-25T01:30')
  })
})

describe('scenarios recalculate the connection with the one time calculation', () => {
  it('starts from the booking: 12h 20m connection, 10h 20m to explore', () => { expect(computeItinerary(sin()).hero).toMatchObject({ total: 740, usable: 620 }) })

  it('A. earlier departure 23:35 → 22:50 takes 45 minutes off the time to explore', () => {
    const u = run(sin(), 'earlier-departure')
    expect(u.departure).toBe('2026-11-24T22:50'); expect(u.arrival).toBeUndefined()
    const h = computeItinerary(sin()).hero
    expect(h.total).toBe(695); expect(h.usable).toBe(575)
    expect(planningImpact(sin())).toMatchObject({ kind: 'less-time', deltaUsable: -45, overBy: 0 }) // nothing planned yet: no conflict
  })
  it('B. delayed departure 23:35 → 01:35 the next day adds 2 hours and keeps the itinerary', () => {
    const plan = sin(['T3 dumplings', 'T3 garden'], { arrivalLocation: 'T3', departureLocation: 'T3' })
    const before = computeItinerary(plan).hero
    const u = run(plan, 'delayed-departure')
    expect(u.departure).toBe('2026-11-25T01:35')
    const imp = planningImpact(plan)!
    expect(imp.kind).toBe('more-time'); expect(imp.deltaUsable).toBe(120)
    expect(imp.after.remaining).toBe(before.remaining + 120)
    expect(computeItinerary(plan).items.map((a) => a.id)).toEqual(['T3 dumplings', 'T3 garden'])
    expect(suggestRevisions(plan)).toEqual([])
  })
  it('C. delayed arrival 11:15 → 12:45 takes 90 minutes off', () => {
    const u = run(sin(), 'delayed-arrival')
    expect(u.arrival).toBe('2026-11-24T12:45')
    expect(computeItinerary(sin()).hero.usable).toBe(530)
  })
  it('D. both flights changed: recomputed from both new times, across midnight', () => {
    const u = run(sin(), 'both-legs')
    expect(u).toMatchObject({ arrival: '2026-11-24T12:20', departure: '2026-11-25T00:25' })
    expect(computeItinerary(sin()).hero).toMatchObject({ total: 725, usable: 605 })
  })
  it('counts the buffer once and never goes below zero usable time', () => {
    run(sin(), 'both-legs')
    const h = computeItinerary(sin()).hero
    expect(h.buffer).toBe(120); expect(h.usable).toBe(h.total - h.buffer)
    // A short connection: departure pulled 45 minutes earlier leaves less than the buffer.
    const tight = { ...sin(), departure: '2026-11-24T13:00' }
    updatesStore.set(simulate(tight, 'earlier-departure')!)
    expect(computeItinerary(tight).hero).toMatchObject({ total: 60, usable: 0 })
  })
  it('applying the same scenario twice gives the same result (relative to the booking, not stacked)', () => {
    run(sin(), 'earlier-departure'); run(sin(), 'earlier-departure')
    expect(computeItinerary(sin()).hero.total).toBe(695)
  })
  it('keeps the booking itself unchanged and reset restores it', () => {
    const f = sin(), base = computeItinerary(f).hero
    run(f, 'earlier-departure')
    expect(f.departure).toBe('2026-11-24T23:35')
    expect(computeItinerary(f, { original: true }).hero.total).toBe(740)
    updatesStore.remove(f.id)
    expect(computeItinerary(f).hero).toEqual(base)
    expect(flightView(f).update).toBeUndefined()
  })
  it('ignores an update once the flight’s own times are edited', () => {
    run(sin(), 'earlier-departure')
    expect(computeItinerary({ ...sin(), departure: '2026-11-24T23:00' }).hero.total).toBe(705)
  })
})

describe('E. gate change', () => {
  it('Singapore B12 → D24 moves the walk back to Terminal 1, recalculated from route data', () => {
    const plan = sin(['T3 dumplings'], { arrivalLocation: 'T3', departureLocation: 'T3' })
    const before = computeItinerary(plan).hero
    run(plan, 'gate')
    const v = flightView(plan)
    expect(v).toMatchObject({ gate: 'D24', gateTerminal: 'T1', departureLocation: 'T1', returnTransferUnknown: false, returnTransferRecalculated: true, changed: { gate: true, arrival: false, departure: false } })
    expect(v.original.gate).toBe('B12')
    const after = computeItinerary(plan).hero
    expect(after.usable).toBe(before.usable)
    expect(after.transferMin).toBe(before.transferMin - 10 + 25) // same-area walk replaced by the T3 → T1 transfer
    expect(planningImpact(plan)!.kind).toBe('gate')
  })
  it('Dubai B12 → D24 changes terminal without route data: the walk back is marked unknown, nothing invented', () => {
    run(dxb(), 'gate')
    const v = flightView(dxb())
    expect(v).toMatchObject({ gate: 'D24', gateTerminal: 'T1', returnTransferUnknown: true, returnTransferRecalculated: false })
    expect(computeItinerary(dxb()).hero).toEqual(computeItinerary(dxb(), { original: true }).hero)
  })
  it('keeps a time change when the gate changes too', () => {
    run(dxb(), 'earlier-departure'); run(dxb(), 'gate')
    expect(flightView(dxb())).toMatchObject({ gate: 'D24', departure: '2026-11-25T07:00' })
  })
  it('is not offered for flights without a booked gate', () => {
    expect(simulate({ ...dxb(), bookingRef: undefined }, 'gate')).toBeNull()
    expect(SCENARIOS.find((s) => s.id === 'gate')!.detail({ ...dxb(), bookingRef: undefined })).toBe('No gate on this booking')
    expect(gateTerminal('LHR', 'C55')).toBeUndefined()
  })
})

describe('planning impact and revisions', () => {
  it('the Dubai plan fits as booked (20 minutes left)', () => {
    expect(computeItinerary(dxb()).hero).toMatchObject({ usable: 300, activityMin: 280, remaining: 20 })
    expect(suggestRevisions(dxb())).toEqual([])
  })
  it('an earlier departure is a genuine conflict: 25 minutes over, last stop runs late', () => {
    run(dxb(), 'earlier-departure')
    const imp = planningImpact(dxb())!
    expect(imp).toMatchObject({ kind: 'conflict', deltaUsable: -45, overBy: 25, lateIds: ['Dubai Duty Free'] })
    expect(imp.before.remaining).toBe(20); expect(imp.after.remaining).toBe(-25)
  })
  it('suggests ending earlier first (last stop only), then a shorter swap; never changes the plan itself', () => {
    const plan = dxb()
    run(plan, 'earlier-departure')
    const s = suggestRevisions(plan)
    expect(s.map((r) => [r.kind, r.title, r.remaining])).toEqual([
      ['end-earlier', 'End after Timeless Spa', 15],
      ['replace', 'Swap Sleepover lounge for Be Relax spa', 50],
    ])
    expect(s[0].activityIds).toEqual(['Sleepover lounge', 'Al Majlis', 'Timeless Spa'])
    expect(plan.activityIds).toEqual(DXB_PLAN)
    for (const r of s) expect(computeItinerary({ ...plan, activityIds: r.activityIds }).hero.remaining).toBe(r.remaining)
  })
  it('a 90-minute late arrival prefers the swap that keeps every stop', () => {
    run(dxb(), 'delayed-arrival')
    expect(planningImpact(dxb())!.overBy).toBe(70)
    expect(suggestRevisions(dxb()).map((r) => [r.kind, r.remaining, r.lostMin])).toEqual([['replace', 5, 75], ['end-earlier', 30, 100]])
  })
  it('never swaps in an activity whose access is less certain', () => {
    run(dxb(['Dubai Duty Free', 'Sleepover lounge', 'Al Majlis', 'Timeless Spa']), 'earlier-departure')
    const s = suggestRevisions(dxb(['Dubai Duty Free', 'Sleepover lounge', 'Al Majlis', 'Timeless Spa']))
    expect(s.flatMap((r) => r.activityIds)).not.toContain('Aesop')
  })
  it('less time that still fits is reported without a conflict', () => {
    run(dxb(['Al Majlis']), 'earlier-departure')
    expect(planningImpact(dxb(['Al Majlis']))!.kind).toBe('less-time')
  })
  it('offers a reorder first where route data makes order matter', () => {
    // T3 → T1 → T3 costs two cross-terminal transfers; T3, T3, T1 costs one.
    const plan = sin(['T3 dumplings', 'T1 pool', 'T3 garden'], { arrivalLocation: 'T3', departureLocation: 'T1', departure: '2026-11-24T16:45' })
    const h = computeItinerary(plan).hero
    expect(h.remaining).toBe(330 - 120 - 135 - (10 + 25 + 25 + 25)) // −10: arrival walk, T3→T1, T1→T3, T3→T1
    const s = suggestRevisions(plan)
    expect(s[0]).toMatchObject({ kind: 'reorder', lostMin: 0, activityIds: ['T3 dumplings', 'T3 garden', 'T1 pool'] })
    expect(lateActivities(plan)).toEqual(['T3 garden'])
  })
})

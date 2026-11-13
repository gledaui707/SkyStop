import { describe, it, expect } from 'vitest'
import { SAMPLE_JOURNEYS, findSampleJourney, resolveJourney, isRefFormat } from './journeys'

const TODAY = new Date('2026-11-12T09:00:00Z')

describe('sample journeys', () => {
  it('has four six-character references beginning with A, B, C and D', () => {
    expect(SAMPLE_JOURNEYS.map((j) => j.ref[0])).toEqual(['A', 'B', 'C', 'D'])
    for (const j of SAMPLE_JOURNEYS) expect(isRefFormat(j.ref)).toBe(true)
  })
  it('match the required routes', () => {
    expect(SAMPLE_JOURNEYS.map((j) => `${j.origin}-${j.connection}-${j.destination}`)).toEqual(['CGK-SIN-CDG', 'OPO-LIS-JFK', 'JFK-LHR-SIN', 'CDG-DXB-HND'])
  })
  it.each(SAMPLE_JOURNEYS.map((j) => [j.ref, j] as const))('%s is internally consistent', (_r, spec) => {
    const r = resolveJourney(spec, TODAY)
    // segments chain through the connecting airport
    expect(r.legs[0].to).toBe(r.connection); expect(r.legs[1].from).toBe(r.connection)
    // plausible flight times (computed across time zones), and the layover starts at landing and ends at take-off
    for (const l of r.legs) { expect(l.durationMin).toBeGreaterThanOrEqual(45); expect(l.durationMin).toBeLessThanOrEqual(16 * 60) }
    expect(r.layover.arrivalLocal).toBe(r.legs[0].arriveLocal); expect(r.layover.departureLocal).toBe(r.legs[1].departLocal)
    expect(r.layover.totalMin).toBe((Date.parse(r.legs[1].departAt) - Date.parse(r.legs[0].arriveAt)) / 60000)
    expect(r.layover.totalMin).toBeGreaterThan(spec.bufferMin)
    expect(r.layover.usableMin).toBe(r.layover.totalMin - spec.bufferMin)
    // in the future
    expect(Date.parse(r.legs[0].departAt)).toBeGreaterThan(TODAY.getTime())
  })
  it('computes the expected durations', () => {
    const f = (ref: string) => findSampleJourney(ref, TODAY)!
    expect(f('AXR7KD').legs.map((l) => l.durationMin)).toEqual([115, 825]) // CGK→SIN 1h55, SIN→CDG 13h45
    expect(f('AXR7KD').layover).toMatchObject({ totalMin: 740, bufferMin: 120, usableMin: 620 })
    expect(f('BQ3LMV').layover).toMatchObject({ totalMin: 320, usableMin: 230 })
    expect(f('BQ3LMV').legs[1].durationMin).toBe(485) // LIS 13:25 WET → JFK 16:30 EST = 8h05
    expect(f('CJ8NWT').layover).toMatchObject({ totalMin: 330, usableMin: 210 })
    expect(f('DH5PRZ').layover).toMatchObject({ totalMin: 420, usableMin: 300 }) // overnight in Dubai
  })
  it('accepts lower case and spaces; rejects everything else', () => {
    expect(findSampleJourney(' axr7kd ', TODAY)?.ref).toBe('AXR7KD')
    expect(findSampleJourney('AXR7KE', TODAY)).toBeNull()
    expect(findSampleJourney('', TODAY)).toBeNull()
    expect(isRefFormat('AB12')).toBe(false)
  })
})

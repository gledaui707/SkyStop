import { describe, it, expect } from 'vitest'
import { layoverMinutesAt } from './time'

describe('layoverMinutesAt (airport-local inputs, measured in the airport time zone)', () => {
  it('same-day layover', () => expect(layoverMinutesAt('2026-11-17T10:00', '2026-11-17T15:00', 'Europe/Lisbon')).toBe(300))
  it('overnight layover', () => expect(layoverMinutesAt('2026-11-17T23:30', '2026-11-18T02:00', 'Asia/Singapore')).toBe(150))
  it('across the spring-forward night counts real elapsed time', () => {
    expect(layoverMinutesAt('2027-03-28T00:30', '2027-03-28T03:30', 'Europe/Lisbon')).toBe(120)
  })
  it('does not depend on the browser time zone', () => {
    const orig = process.env.TZ
    const results = ['America/New_York', 'Asia/Tokyo', 'Europe/Lisbon'].map((tz) => { process.env.TZ = tz; return layoverMinutesAt('2027-03-28T00:30', '2027-03-28T03:30', 'Europe/Lisbon') })
    if (orig === undefined) delete process.env.TZ; else process.env.TZ = orig
    expect(results).toEqual([120, 120, 120])
  })
  it('falls back to wall-clock difference for a time that does not exist in the zone, or an unknown airport', () => {
    expect(layoverMinutesAt('2027-03-28T01:30', '2027-03-28T03:30', 'Europe/Lisbon')).toBe(120)
    expect(layoverMinutesAt('2026-11-17T10:00', '2026-11-17T15:00')).toBe(300)
  })
  it('returns 0 for empty or invalid input', () => expect(layoverMinutesAt('', '')).toBe(0))
})

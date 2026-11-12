import { describe, it, expect } from 'vitest'
import { layoutMarkers } from './mapLayout'

// Each marker occupies an icon (about 11% wide x 13 units tall) with a name label below it (up to 35% wide x 7.5 tall).
type P = { x: number; y: number }
const rects = (p: P) => [
  { l: p.x - 5.6, r: p.x + 5.6, t: p.y - 6.5, b: p.y + 6.5 },
  { l: p.x - 17.5, r: p.x + 17.5, t: p.y + 6.5, b: p.y + 14 },
]
const hit = (a: ReturnType<typeof rects>[number], b: ReturnType<typeof rects>[number]) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
const overlaps = (a: P, b: P) => rects(a).some((x) => rects(b).some((y) => hit(x, y)))

describe('layoutMarkers', () => {
  const lis = ['airside', 'airside', 'unknown', 'airside'] // seeded Lisbon: food, rest, shopping, work
  const sin = ['airside', 'landside', 'airside', 'unknown'] // seeded Singapore
  // A zone holds at most three markers cleanly (the seeded catalogue has at most three); a 4th+ continues in a new group
  // below, which can reach into the next zone band. '6 airside' only checks markers within the same zone.
  it.each([
    ['LIS', lis], ['SIN', sin], ['3 airside', Array(3).fill('airside')], ['6 airside', Array(6).fill('airside')],
    ['mixed, max 3 per zone', ['airside', 'landside', 'unknown', 'airside', 'landside', 'unknown', 'airside']],
  ])('no overlapping markers or labels: %s', (_n, zones) => {
    const p = layoutMarkers(zones as string[])
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(overlaps(p[i], p[j]), `${i} vs ${j}`).toBe(false)
  })
  it('keeps seeded-size layouts inside the canvas and their zone band', () => {
    for (const q of layoutMarkers(lis)) { expect(q.x).toBeGreaterThanOrEqual(15); expect(q.x).toBeLessThanOrEqual(85) }
    const air = layoutMarkers(['airside', 'airside', 'airside']); for (const q of air) { expect(q.y).toBeGreaterThanOrEqual(8); expect(q.y).toBeLessThanOrEqual(42) }
    const land = layoutMarkers(['landside'])[0]; expect(land.y + 14).toBeLessThanOrEqual(96)
  })
  it('is deterministic and puts each zone in its band', () => {
    expect(layoutMarkers(lis)).toEqual(layoutMarkers(lis))
    const p = layoutMarkers(['airside', 'unknown', 'landside'])
    expect(p[0].y).toBeLessThan(p[1].y); expect(p[1].y).toBeLessThan(p[2].y)
  })
  it('treats an unrecognised zone as "to be confirmed"', () => {
    expect(layoutMarkers(['weird'])[0].y).toBe(layoutMarkers(['unknown'])[0].y)
  })
})

import { describe, it, expect } from 'vitest'
import { layoutMarkers } from './mapLayout'

// Geometry in CSS px on a 390 px wide phone. `area` = height of the map below the controls (short phones with the tip
// card open have ~200 px; a tall phone without it ~450 px). A marker is a 48 px button (44 px icon) with its name label
// starting 48 px below the button top, up to 136 px wide and ~22 px tall.
const W = 390
type P = { x: number; y: number }
const rects = (p: P, area: number) => {
  const cx = (p.x / 100) * W, cy = (p.y / 100) * area
  return [
    { l: cx - 22, r: cx + 22, t: cy - 22, b: cy + 22 },
    { l: cx - 68, r: cx + 68, t: cy + 24, b: cy + 46 },
  ]
}
const hit = (a: ReturnType<typeof rects>[number], b: ReturnType<typeof rects>[number]) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b
const overlaps = (a: P, b: P, area: number) => rects(a, area).some((x) => rects(b, area).some((y) => hit(x, y)))

const lis = ['airside', 'airside', 'unknown', 'airside'] // seeded Lisbon: food, rest, shopping, work
const sin = ['airside', 'landside', 'airside', 'unknown'] // seeded Singapore

describe('layoutMarkers', () => {
  for (const area of [200, 300, 450]) {
    it.each([['LIS', lis], ['SIN', sin], ['3 airside', Array(3).fill('airside')], ['mixed: 3 airside + 1 unknown + 1 landside', ['airside', 'landside', 'unknown', 'airside', 'airside']]])(
      `no overlapping markers or labels at ${area}px map height: %s`, (_n, zones) => {
        const p = layoutMarkers(zones as string[])
        for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(overlaps(p[i], p[j], area), `${i} vs ${j}`).toBe(false)
      })
  }
  it('keeps every seeded marker inside the horizontal bounds and its icon inside the map', () => {
    for (const q of [...layoutMarkers(lis), ...layoutMarkers(sin)]) {
      expect(q.x).toBeGreaterThanOrEqual(20); expect(q.x).toBeLessThanOrEqual(80)
      expect((q.y / 100) * 200 - 22).toBeGreaterThanOrEqual(0); expect((q.y / 100) * 200 + 22).toBeLessThanOrEqual(200)
    }
  })
  it('is deterministic and keeps zones in order top to bottom', () => {
    expect(layoutMarkers(lis)).toEqual(layoutMarkers(lis))
    const p = layoutMarkers(['airside', 'unknown', 'landside'])
    expect(p[0].y).toBeLessThan(p[1].y); expect(p[1].y).toBeLessThan(p[2].y)
  })
  it('treats an unrecognised zone as "to be confirmed"', () => {
    expect(layoutMarkers(['weird'])[0].y).toBe(layoutMarkers(['unknown'])[0].y)
  })
})

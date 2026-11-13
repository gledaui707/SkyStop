import { describe, expect, it } from 'vitest'
import { PIN_H, clusterPins } from './pins'

const width = (keys: string[]) => (keys.length > 1 ? 120 : 64)

describe('map pin clustering', () => {
  it('keeps pins that do not touch as separate pins on their true points', () => {
    const out = clusterPins([{ key: 'T1', x: 50, y: 100, w: 64 }, { key: 'T3', x: 250, y: 100, w: 64 }], width)
    expect(out.map((c) => [c.keys, c.x, c.y])).toEqual([[['T1'], 50, 100], [['T3'], 250, 100]])
  })
  it('merges pins whose capsules would overlap into one cluster at their centroid', () => {
    const out = clusterPins([{ key: 'T1', x: 100, y: 100, w: 64 }, { key: 'JEWEL', x: 130, y: 110, w: 80 }], width)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ keys: ['JEWEL', 'T1'], x: 115, y: 105, w: 120 })
  })
  it('keeps merging until nothing overlaps (chains of close pins)', () => {
    const pins = [0, 1, 2, 3].map((i) => ({ key: `T${i}`, x: 100 + i * 50, y: 100, w: 64 }))
    const out = clusterPins(pins, width)
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j]
      const apart = Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= PIN_H
      expect(apart).toBe(true)
    }
    expect(out.flatMap((c) => c.keys).sort()).toEqual(['T0', 'T1', 'T2', 'T3'])
  })
  it('separates pins stacked vertically by more than a capsule height', () => {
    const out = clusterPins([{ key: 'A', x: 100, y: 100, w: 64 }, { key: 'B', x: 100, y: 100 + PIN_H + 20, w: 64 }], width)
    expect(out).toHaveLength(2)
  })
})

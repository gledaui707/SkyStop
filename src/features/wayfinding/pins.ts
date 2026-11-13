// Pin layout for the airport map. Each pin is a capsule that sits ABOVE its true point, with a pointer on the point
// (no leader lines, no displaced pins). Pins whose capsules would touch at the current zoom merge into one cluster at
// the members' centroid; merging repeats until nothing overlaps. Tapping a cluster zooms to its members.

export interface PinInput { key: string; x: number; y: number; w: number }
export interface PinCluster { keys: string[]; x: number; y: number; w: number }

/** Capsule height and the pointer's length (px). */
export const PIN_H = 40
export const PIN_TAIL = 8

const box = (c: { x: number; y: number; w: number }) => ({ l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y - PIN_TAIL - PIN_H, b: c.y })
const touch = (a: PinCluster, b: PinCluster, gap: number) => {
  const p = box(a), q = box(b)
  return p.l < q.r + gap && q.l < p.r + gap && p.t < q.b + gap && q.t < p.b + gap
}

/** `width(keys)` gives the capsule width for a set of members (a cluster label is longer than a single one). */
export function clusterPins(pins: PinInput[], width: (keys: string[]) => number, gap = 6): PinCluster[] {
  let out: PinCluster[] = pins.map((p) => ({ keys: [p.key], x: p.x, y: p.y, w: p.w }))
  for (let merged = true; merged;) {
    merged = false
    outer: for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      if (!touch(out[i], out[j], gap)) continue
      const a = out[i], b = out[j], n = a.keys.length + b.keys.length
      const keys = [...a.keys, ...b.keys]
      const c = { keys, x: (a.x * a.keys.length + b.x * b.keys.length) / n, y: (a.y * a.keys.length + b.y * b.keys.length) / n, w: width(keys) }
      out = [...out.slice(0, i), c, ...out.slice(i + 1, j), ...out.slice(j + 1)]
      merged = true
      break outer
    }
  }
  // Stable order (top to bottom, then left to right) so keyboard order follows the map.
  return out.map((c) => ({ ...c, keys: [...c.keys].sort() })).sort((a, b) => a.y - b.y || a.x - b.x)
}

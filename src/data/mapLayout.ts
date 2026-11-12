// Positions for the illustrative schematic map (percent of the map canvas, NOT real coordinates).
// The database has no coordinates, so markers are laid out per zone in groups of three: two side by side, and a third
// in the gap between them and slightly lower, so neither the markers nor their name labels (up to ~35% wide, shown
// under each marker) overlap. Zone bands match components/AirportMap.tsx.
export type ZoneName = 'airside' | 'landside' | 'unknown'

const BASE_Y: Record<ZoneName, number> = { airside: 18, unknown: 60, landside: 81 }
const GROUP = [{ x: 25, dy: 0 }, { x: 75, dy: 0 }, { x: 50, dy: 9 }]
const GROUP_GAP = 31

export function layoutMarkers(zones: readonly string[]): { x: number; y: number }[] {
  const seen: Record<string, number> = {}
  return zones.map((z) => {
    const zone: ZoneName = z === 'airside' || z === 'landside' ? z : 'unknown'
    const i = (seen[zone] = (seen[zone] ?? 0) + 1) - 1
    const slot = GROUP[i % GROUP.length]
    return { x: slot.x, y: BASE_Y[zone] + Math.floor(i / GROUP.length) * GROUP_GAP + slot.dy }
  })
}

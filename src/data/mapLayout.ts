// Positions for the illustrative schematic map (percent of the map area BELOW the controls, NOT real coordinates).
// The database has no coordinates, so markers are laid out per zone in groups of three: two side by side, and a third
// in the gap between them and lower, so neither the markers nor their name labels (shown under each marker, up to
// ~136 px wide) overlap, even on short phone screens. Zone bands match components/AirportMap.tsx.
export type ZoneName = 'airside' | 'landside' | 'unknown'

export const BASE_Y: Record<ZoneName, number> = { airside: 12, unknown: 62, landside: 80 }
export const GROUP = [{ x: 22, dy: 0 }, { x: 69, dy: 0 }, { x: 45.5, dy: 14 }]
export const GROUP_GAP = 38
/** Landside markers start in the right-hand column so they never sit under an unknown-zone marker above them. */
const START_SLOT: Record<ZoneName, number> = { airside: 0, unknown: 0, landside: 1 }

export function layoutMarkers(zones: readonly string[]): { x: number; y: number }[] {
  const seen: Record<string, number> = {}
  return zones.map((z) => {
    const zone: ZoneName = z === 'airside' || z === 'landside' ? z : 'unknown'
    const i = (seen[zone] = (seen[zone] ?? 0) + 1) - 1 + START_SLOT[zone]
    const slot = GROUP[i % GROUP.length]
    return { x: slot.x, y: BASE_Y[zone] + Math.floor(i / GROUP.length) * GROUP_GAP + slot.dy }
  })
}

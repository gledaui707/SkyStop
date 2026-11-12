// Real positions of the supported airports' terminals, for the map view (WGS84).
// Each point is a published coordinate for that terminal building (Wikipedia/Wikidata unless stated). They mark the
// terminal, not a venue: the catalogue has no venue-level coordinates, so venues are grouped on their terminal's pin.
// Checked 2026-11-12. `approx` = only a lower-quality or indirect source was available.

export interface TerminalPoint {
  key: string
  /** Short label on the pin. */
  short: string
  name: string
  lat: number
  lng: number
  source: string
  approx?: boolean
}
export interface AirportGeo { terminals: TerminalPoint[] }

const dms = (d: number, m: number, s: number) => d + m / 60 + s / 3600

export const AIRPORT_GEO: Record<string, AirportGeo> = {
  LIS: {
    terminals: [
      // The Aeroporto metro station lies directly beneath Terminal 1.
      { key: 'T1', short: 'T1', name: 'Terminal 1', lat: dms(38, 46, 8), lng: -dms(9, 7, 44), source: 'https://en.wikipedia.org/wiki/Aeroporto_Station_(Lisbon_Metro)', approx: true },
    ],
  },
  SIN: {
    terminals: [
      { key: 'JEWEL', short: 'Jewel', name: 'Jewel', lat: dms(1, 21, 52), lng: dms(103, 59, 29), source: 'https://en.wikipedia.org/wiki/Jewel_Changi_Airport' },
      { key: 'T1', short: 'T1', name: 'Terminal 1', lat: 1.361858, lng: 103.990327, source: 'https://www.findlatitudeandlongitude.com/l/Changi+Airport+Terminal+1/5718110/', approx: true },
      { key: 'T3', short: 'T3', name: 'Terminal 3', lat: dms(1, 21, 22.4), lng: dms(103, 59, 11.7), source: 'https://www.wikidata.org/wiki/Q21974333' },
      { key: 'T4', short: 'T4', name: 'Terminal 4', lat: dms(1, 20, 18.8), lng: dms(103, 59, 1.6), source: 'https://www.wikidata.org/wiki/Q21044469' },
    ],
  },
  LHR: {
    terminals: [
      { key: 'T2', short: 'T2', name: 'Terminal 2', lat: dms(51, 28, 13), lng: -dms(0, 27, 7), source: 'https://en.wikipedia.org/wiki/Heathrow_Terminal_2' },
      { key: 'T3', short: 'T3', name: 'Terminal 3', lat: dms(51, 28, 15), lng: -dms(0, 27, 36), source: 'https://en.wikipedia.org/wiki/Heathrow_Terminal_3' },
      { key: 'T4', short: 'T4', name: 'Terminal 4', lat: dms(51, 27, 34), lng: -dms(0, 26, 49), source: 'https://en.wikipedia.org/wiki/Heathrow_Terminal_4' },
      { key: 'T5', short: 'T5', name: 'Terminal 5', lat: dms(51, 28, 22), lng: -dms(0, 29, 15), source: 'https://en.wikipedia.org/wiki/Heathrow_Terminal_5' },
    ],
  },
  DXB: {
    terminals: [
      // Terminal 1: position of its metro station at the terminal front.
      { key: 'T1', short: 'T1', name: 'Terminal 1', lat: dms(25, 14, 54), lng: dms(55, 21, 8), source: 'https://en.wikipedia.org/wiki/Airport_Terminal_1_(Dubai_Metro)', approx: true },
      { key: 'T3', short: 'T3', name: 'Terminal 3', lat: dms(25, 14, 55), lng: dms(55, 21, 41), source: 'https://en.wikipedia.org/wiki/Dubai_International_Terminal_3' },
    ],
  },
}

/** Which terminal pin a venue belongs on, from its verified terminal text. A venue that spans several terminals,
 *  or whose terminal is unknown, gets no pin (null) rather than an invented position. */
export function terminalKeyOf(airport: string, terminal?: string): string | null {
  if (!terminal) return null
  const geo = AIRPORT_GEO[airport]
  if (!geo) return null
  if (/^jewel/i.test(terminal)) return geo.terminals.some((t) => t.key === 'JEWEL') ? 'JEWEL' : null
  if (/T\d\s*[–-]\s*T\d/.test(terminal)) return null // a range such as "T1–T4"
  const nums = new Set([...terminal.matchAll(/(?:Terminals?\s+|\bT)(\d)/g)].map((m) => m[1]))
  // "Terminals 2, 3, 4 and 5": the first number is captured above; the rest follow the plural word
  if (/Terminals\s/i.test(terminal)) for (const m of terminal.matchAll(/\b(\d)\b/g)) nums.add(m[1])
  if (nums.size !== 1) return null
  const key = `T${[...nums][0]}`
  return geo.terminals.some((t) => t.key === key) ? key : null
}

import { AIRPORTS } from './mock'

export interface DirAirport { code: string; name: string; city: string; country: string; supported: boolean }

const OTHERS: Omit<DirAirport, 'supported'>[] = [
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'Indonesia' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom' },
  { code: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'United States' },
  { code: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia' },
  { code: 'GRU', name: 'Guarulhos International', city: 'Sao Paulo', country: 'Brazil' },
  { code: 'MAD', name: 'Adolfo Suarez Madrid-Barajas', city: 'Madrid', country: 'Spain' },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan' },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan' },
  { code: 'OPO', name: 'Francisco Sá Carneiro', city: 'Porto', country: 'Portugal' },
]

/** Airports the user can pick. Only airports with activity data support a layover plan. */
/** Built on demand because supported airports are loaded from the database at start-up. */
export const directory = (): DirAirport[] => [
  ...AIRPORTS.map((a) => ({ code: a.code, name: a.name, city: a.city, country: a.country, supported: true })),
  ...OTHERS.filter((o) => !AIRPORTS.some((a) => a.code === o.code)).map((a) => ({ ...a, supported: false })),
]

export const findAirport = (code?: string) => directory().find((a) => a.code === code)
export const airportLabel = (code?: string) => { const a = findAirport(code); return a ? `${a.city} (${a.code})` : code ?? '' }

/** Always returns something displayable, including airports typed in manually. */
export const airportInfo = (code?: string): DirAirport | undefined => {
  if (!code) return undefined
  return findAirport(code) ?? { code, name: `${code} Airport`, city: code, country: '', supported: false }
}

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
]

/** Airports the user can pick. Only airports with activity data support a layover plan. */
export const DIRECTORY: DirAirport[] = [
  ...AIRPORTS.map((a) => ({ code: a.code, name: a.name, city: a.city, country: a.country, supported: true })),
  ...OTHERS.map((a) => ({ ...a, supported: false })),
]

export const findAirport = (code?: string) => DIRECTORY.find((a) => a.code === code)
export const airportLabel = (code?: string) => { const a = findAirport(code); return a ? `${a.city} (${a.code})` : code ?? '' }

/** Always returns something displayable, including airports typed in manually. */
export const airportInfo = (code?: string): DirAirport | undefined => {
  if (!code) return undefined
  return findAirport(code) ?? { code, name: `${code} Airport`, city: code, country: '', supported: false }
}

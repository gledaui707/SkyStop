// Central image registry. Replace any entry (url, credit) without touching UI components.
// Activity photos are from Unsplash and are ILLUSTRATIVE (not the named venue). Airport photos are real photos of
// each airport from Wikimedia Commons under Creative Commons licences; their credit is shown where they appear.
export interface Img {
  url: string
  alt: string
  credit: string // photographer
  page: string // Unsplash profile or Commons file page
  source?: 'Unsplash' | 'Wikimedia Commons'
  license?: string
}

/** A Wikimedia Commons file, served as a 1280 px thumbnail (a standard Commons size). */
const commons = (file: string, hash: string, alt: string, credit: string, license: string): Img => ({
  url: `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash}/${encodeURIComponent(file)}/1280px-${encodeURIComponent(file)}`,
  alt, credit, license, source: 'Wikimedia Commons',
  page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
})
/** Short credit line, e.g. "Photo: Matteo Morando · CC BY-SA 4.0". */
export const creditLine = (img: Img) => `Photo: ${img.credit} · ${img.license ?? img.source ?? 'Unsplash'}`

const photo = (id: string, alt: string, credit: string, handle: string): Img => ({
  url: `https://images.unsplash.com/photo-${id}`,
  alt,
  credit,
  page: `https://unsplash.com/@${handle}?utm_source=skystop&utm_medium=referral`,
})

/** Append sizing params for responsive cropping. */
export const sized = (img: Img, w: number, h?: number) =>
  img.source === 'Wikimedia Commons' ? img.url : `${img.url}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ''}`

export const IMAGES = {
  onboarding: {} as Record<'connection' | 'discover' | 'plan', Img>, // filled below
  hero: photo('1593182440709-4b7b56482c55', 'Aircraft wing above the clouds', 'Johny Goerend', 'johnygoerend'),
  results: photo('1530469641172-8ac15d0a7d6a', 'View of an aircraft wing from a window seat', 'Blake Guidry', 'blakeguidry'),
  airports: {
    SIN: commons('JewelSingaporeVortex1.jpg', 'e9', 'The Rain Vortex waterfall inside Jewel, Changi Airport', 'Matteo Morando', 'CC BY-SA 4.0'),
    LIS: commons('Aeroporto_Humberto_Delgado_(Portela_Airport_Aeroporto_de_Lisboa),_Lisbon,_Portugal_(51323558287).jpg', '20', 'Lisbon Humberto Delgado Airport', 'Sharon Hahn Darlin', 'CC BY 2.0'),
    LHR: commons('TerminalFiveAirportHeathrowAugust2012.JPG', '7a', 'Departures area in Heathrow Terminal 5', 'Citizen59', 'CC BY-SA 3.0'),
    DXB: commons('Interior_of_Terminal_3_Dubai_Airport._United_Arab_Emirates.jpg', '48', 'Interior of Terminal 3, Dubai International Airport', 'Ввласенко', 'CC BY-SA 3.0'),
  } as Record<string, Img>,
  activities: {
    l1: photo('1716360806681-b4defdfba134', 'Plate of pastries (illustrative)', 'Magdalena Raczka', 'magda_raczka'),
    l2: photo('1697748525265-7431cba075b6', 'Yellow trams on a Lisbon street', 'Henry Ren', 'henryren'),
    l3: photo('1549897411-b06572cdf806', 'Empty airport seating (illustrative)', 'Dennis Gecaj', 'dannis'),
    l4: photo('1629308993023-bb7ca078abdc', 'People walking through a terminal (illustrative)', 'Rach Teo', 'rachteo'),
    s1: photo('1739857554154-80c15b7b1af7', 'People walking through a food court (illustrative)', 'Scribbling Geek', 'scribblinggeek'),
    s2: photo('1508964942454-1a56651d54ac', 'Walkway between Supertrees at Gardens by the Bay', 'Coleen Rivas', 'coleenr'),
    s3: photo('1655920885311-9ff59799bfa3', 'Seating beside large airport windows (illustrative)', 'Ankur Khandelwal', 'iamankurkhandelwal'),
    s4: photo('1581409518789-b43c70ad0e97', 'People seated in an airport (illustrative)', 'Rayhan Fahmi', 'rayhn_f'),
  } as Record<string, Img>,
}

export const allCredits = (): Img[] => [
  IMAGES.hero, IMAGES.results, ...Object.values(IMAGES.airports), ...Object.values(IMAGES.activities),
]

// Onboarding photography: photos already in the project with known Unsplash credits (usage rights confirmed with the
// export). Requested specific shots (Jewel Rain Vortex, Heathrow) could not be licence-checked from the build environment;
// swap here once verified, e.g. https://unsplash.com/photos/GFp1bgwKAh4 (Rain Vortex) — check it is not an Unsplash+ image.
IMAGES.onboarding = { connection: IMAGES.airports.SIN, discover: IMAGES.activities.l4, plan: IMAGES.hero }

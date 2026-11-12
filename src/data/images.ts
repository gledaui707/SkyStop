import dxb from '../../images/DXB.jpeg'
import lhr from '../../images/LHR.webp'
import lis from '../../images/LIS.webp'
import sin from '../../images/SIN.jpg'

// Airport photos are bundled from the repository. Activity photos are illustrative Unsplash images.
export interface Img {
  url: string
  alt: string
  credit: string // photographer
  page: string // Photo source page
  source?: 'Unsplash' | 'SkyStop repository'
  license?: string
}

const airportPhoto = (url: string, file: string, alt: string): Img => ({
  url,
  alt,
  credit: 'Repository image',
  page: `https://github.com/gledaui707/SkyStop/blob/main/images/${file}`,
  source: 'SkyStop repository',
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
  img.source === 'SkyStop repository' ? img.url : `${img.url}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ''}`

export const IMAGES = {
  onboarding: {} as Record<'connection' | 'discover' | 'plan', Img>, // filled below
  hero: photo('1593182440709-4b7b56482c55', 'Aircraft wing above the clouds', 'Johny Goerend', 'johnygoerend'),
  results: photo('1530469641172-8ac15d0a7d6a', 'View of an aircraft wing from a window seat', 'Blake Guidry', 'blakeguidry'),
  airports: {
    SIN: airportPhoto(sin, 'SIN.jpg', 'Singapore Changi Airport'),
    LIS: airportPhoto(lis, 'LIS.webp', 'Lisbon Humberto Delgado Airport'),
    LHR: airportPhoto(lhr, 'LHR.webp', 'London Heathrow Airport'),
    DXB: airportPhoto(dxb, 'DXB.jpeg', 'Dubai International Airport'),
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

IMAGES.onboarding = { connection: IMAGES.airports.SIN, discover: IMAGES.activities.l4, plan: IMAGES.hero }

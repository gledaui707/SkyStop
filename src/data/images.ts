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
  source?: 'Unsplash' | 'SkyStop repository' | 'Wikimedia Commons'
  license?: string
}

const airportPhoto = (url: string, file: string, alt: string): Img => ({
  url,
  alt,
  credit: 'Repository image',
  page: `https://github.com/gledaui707/SkyStop/blob/main/images/${file}`,
  source: 'SkyStop repository',
})

/** A Wikimedia Commons file (free licence), served as a 1280 px thumbnail (a standard Commons size). */
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
  img.source === 'SkyStop repository' || img.source === 'Wikimedia Commons' ? img.url : `${img.url}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ''}`

export const IMAGES = {
  onboarding: {} as Record<'connection' | 'discover' | 'plan', Img>, // filled below
  venues: {} as Record<string, Img>, // filled below
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

// Real photos for specific venues (Wikimedia Commons, free licences). Keyed by activity id; other venues keep the
// category photos above. "brand" entries show the same brand's store elsewhere (no free photo of the airport outlet).
IMAGES.venues = {
  '20000000-0000-4000-8000-000000000002': IMAGES.airports.SIN, // Jewel Rain Vortex
  '20000000-0000-4000-8000-000000000004': commons('Butterflies_at_Butterfly_Garden,_Changi_Airport,_Singapore_12.jpg', 'a2', 'Butterflies in the Butterfly Garden, Changi Terminal 3', 'Melancholic-.-Euphoria', 'CC BY 4.0'),
  '20000000-0000-4000-8000-000000000005': commons('Canopy_Park_in_Jewel_Changi_Airport.jpg', '8b', 'Canopy Park at the top of Jewel, Changi', 'cattan2011', 'CC BY 2.0'),
  '20000000-0000-4000-8000-000000000006': commons('Swimming_Pool_at_the_Changi_Airport.jpg', '2d', 'Swimming pool at Changi Airport', 'Wikimedia Commons contributor', 'Commons free licence'),
  '40000000-0000-4000-8000-000000000001': commons('Gordon_Ramsay_Plane_Food_@_Heathrow.jpg', 'c4', 'Gordon Ramsay Plane Food, Heathrow Terminal 5', 'Jeremy Couture', 'CC BY 2.0'),
  '40000000-0000-4000-8000-000000000008': commons('Harrods_Heathrow.JPG', 'ed', 'Harrods shop at Heathrow', 'MaryG90', 'CC BY-SA 3.0'),
  '10000000-0000-4000-8000-000000000005': commons('Lego_Store_Taipei_Taiwan_20200102.jpg', '01', 'A LEGO Store (brand photo)', 'Wikimedia Commons contributor', 'CC BY 2.0'), // brand
  '10000000-0000-4000-8000-000000000004': commons('Rue_de_Rennes,_Paris_(FNAC,_big_music_shop).JPG', '06', 'A Fnac store (brand photo)', 'Wikimedia Commons contributor', 'Commons free licence'), // brand
  '50000000-0000-4000-8000-000000000007': commons('AESOP_in_Emporium_Melbourne_2017.jpg', '3a', 'An Aesop store (brand photo)', 'Wikimedia Commons contributor', 'Commons free licence'), // brand
}

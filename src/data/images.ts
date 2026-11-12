// Central image registry. Replace any entry (url, credit) without touching UI components.
// All photos are from Unsplash (https://unsplash.com) and are ILLUSTRATIVE: they do not
// necessarily depict the named airport, venue or business.
export interface Img {
  url: string
  alt: string
  credit: string // photographer
  page: string // Unsplash profile
}

const photo = (id: string, alt: string, credit: string, handle: string): Img => ({
  url: `https://images.unsplash.com/photo-${id}`,
  alt,
  credit,
  page: `https://unsplash.com/@${handle}?utm_source=skystop&utm_medium=referral`,
})

/** Append sizing params for responsive cropping. */
export const sized = (img: Img, w: number, h?: number) =>
  `${img.url}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ''}`

export const IMAGES = {
  hero: photo('1593182440709-4b7b56482c55', 'Aircraft wing above the clouds', 'Johny Goerend', 'johnygoerend'),
  results: photo('1530469641172-8ac15d0a7d6a', 'View of an aircraft wing from a window seat', 'Blake Guidry', 'blakeguidry'),
  airports: {
    LIS: photo('1611782571163-aa82aac33685', 'Aircraft on an airport apron in daylight (illustrative)', 'Hugo Silva', 'hugomigueldasilva'),
    SIN: photo('1688693105312-0ad821a15bd9', 'Large airport atrium with a chandelier (illustrative)', 'Michael Stevanus Hartono', 'michaelstevanus'),
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

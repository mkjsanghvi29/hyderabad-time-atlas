import type { Coordinates } from './types'

export type CityDistrict = {
  id: string
  name: string
  coordinates: Coordinates
  radius: readonly [eastWestKm: number, northSouthKm: number]
  character: 'fort' | 'bazaar' | 'civic' | 'cantonment' | 'residential' | 'campus' | 'technology' | 'industrial'
  activity: string
  // Relative visual emphasis at each chapter, not a census or a settlement foundation date.
  growth: readonly [number, number, number, number, number, number, number, number]
}

export const CITY_DISTRICTS: CityDistrict[] = [
  { id: 'golconda-town', name: 'Golconda & the fort town', coordinates: [78.409, 17.384], radius: [1.9, 1.8], character: 'fort', activity: 'Fort approaches, courtyard houses and overland trade', growth: [.8, .75, .75, .5, .45, .55, .7, .85] },
  { id: 'karwan', name: 'Karwan & the western approach', coordinates: [78.438, 17.375], radius: [1.6, 1.4], character: 'bazaar', activity: 'A connecting landscape between the fort and the new city', growth: [.12, .38, .52, .62, .72, .8, .9, 1] },
  { id: 'old-city', name: 'Charminar & the old city', coordinates: [78.478, 17.359], radius: [2.2, 1.8], character: 'bazaar', activity: 'Shaded bazaars, workshops and compact domestic courtyards', growth: [0, .55, .8, .9, 1, 1, 1, 1] },
  { id: 'south-city', name: 'Southern neighbourhoods', coordinates: [78.485, 17.330], radius: [2.7, 1.5], character: 'residential', activity: 'A transition from gardens and open land to dense neighbourhoods', growth: [0, .04, .08, .1, .3, .45, .8, 1] },
  { id: 'koti', name: 'Koti & the north bank', coordinates: [78.491, 17.385], radius: [1.4, 1.5], character: 'civic', activity: 'River crossings, institutions and mixed shopping streets', growth: [0, .07, .15, .3, .78, .95, 1, 1] },
  { id: 'abids', name: 'Abids & Nampally', coordinates: [78.473, 17.394], radius: [1.6, 1.5], character: 'civic', activity: 'The later city of commercial streets, public buildings and travel', growth: [0, 0, .02, .04, .6, .95, 1, 1] },
  { id: 'mehdipatnam', name: 'Mehdipatnam & the western link', coordinates: [78.438, 17.398], radius: [1.8, 1.7], character: 'residential', activity: 'Houses and shops connecting the historic core to the west', growth: [0, .03, .05, .08, .2, .38, .85, 1] },
  { id: 'lake-edge', name: 'Hussain Sagar approaches', coordinates: [78.460, 17.414], radius: [1.2, 1.1], character: 'residential', activity: 'Water, open edges and the later expansion toward the twin city', growth: [0, .03, .05, .08, .25, .55, .95, 1] },
  { id: 'secunderabad', name: 'Secunderabad', coordinates: [78.504, 17.441], radius: [2.5, 1.6], character: 'cantonment', activity: 'A distinct cantonment, railway and commercial urban pattern', growth: [0, 0, 0, 0, .7, .95, 1, 1] },
  { id: 'osmania-campus', name: 'Osmania & the eastern campuses', coordinates: [78.529, 17.420], radius: [1.5, 1.8], character: 'campus', activity: 'Institutional buildings in a more open landscape', growth: [0, 0, 0, 0, .03, .55, .8, .85] },
  { id: 'begumpet', name: 'Begumpet & Ameerpet', coordinates: [78.454, 17.443], radius: [1.7, 1.5], character: 'residential', activity: 'Garden edges becoming a mixed residential and employment corridor', growth: [0, 0, 0, .02, .16, .4, .92, 1] },
  { id: 'banjara', name: 'Banjara & Jubilee Hills', coordinates: [78.418, 17.423], radius: [2.2, 2], character: 'residential', activity: 'Granite terrain and later hillside neighbourhoods', growth: [0, 0, 0, 0, .03, .12, .65, .92] },
  { id: 'sanathnagar', name: 'Sanathnagar & Balanagar', coordinates: [78.444, 17.473], radius: [2.1, 1.8], character: 'industrial', activity: 'Workshops, industrial sheds and later mixed development', growth: [0, 0, 0, 0, .02, .24, .8, .9] },
  { id: 'hitec', name: 'Madhapur & HITEC City', coordinates: [78.3814, 17.4504], radius: [1.9, 1.6], character: 'technology', activity: 'Open western terrain becomes a technology employment centre', growth: [0, 0, 0, 0, .01, .025, .3, 1] },
  { id: 'gachibowli', name: 'Gachibowli', coordinates: [78.347, 17.441], radius: [2.3, 1.8], character: 'technology', activity: 'Large later campuses, offices and residential compounds', growth: [0, 0, 0, 0, .01, .02, .12, .95] },
  { id: 'financial-district', name: 'Nanakramguda & the Financial District', coordinates: [78.326, 17.418], radius: [2.1, 1.6], character: 'technology', activity: 'A contemporary western skyline rather than a 1990s city centre', growth: [0, 0, 0, 0, 0, .01, .025, .85] },
  { id: 'kukatpally', name: 'Kukatpally', coordinates: [78.402, 17.491], radius: [2.3, 2], character: 'residential', activity: 'Expanding housing districts and metropolitan movement', growth: [0, 0, 0, 0, .01, .03, .55, 1] },
  { id: 'miyapur', name: 'Miyapur', coordinates: [78.356, 17.501], radius: [2.1, 1.8], character: 'residential', activity: 'A northwestern suburban extension in the later chapters', growth: [0, 0, 0, 0, .01, .02, .16, .82] },
  { id: 'patancheru', name: 'Patancheru corridor', coordinates: [78.289, 17.523], radius: [2.5, 1.8], character: 'industrial', activity: 'An outer industrial and residential corridor', growth: [0, 0, 0, 0, .01, .02, .32, .7] },
  { id: 'alwal', name: 'Alwal & the northern city', coordinates: [78.504, 17.501], radius: [2.1, 2], character: 'residential', activity: 'A northern landscape of settlements and later suburban growth', growth: [0, 0, 0, 0, .04, .12, .45, .83] },
  { id: 'kompally', name: 'Kompally corridor', coordinates: [78.488, 17.543], radius: [2.1, 2.4], character: 'residential', activity: 'The later northern metropolitan edge', growth: [0, 0, 0, 0, .01, .02, .12, .6] },
  { id: 'tarnaka', name: 'Tarnaka & Malkajgiri', coordinates: [78.537, 17.449], radius: [1.8, 2], character: 'residential', activity: 'Neighbourhoods around the eastern institutional and railway landscape', growth: [0, 0, 0, 0, .04, .15, .68, .95] },
  { id: 'uppal', name: 'Uppal & the eastern city', coordinates: [78.559, 17.403], radius: [2.1, 2], character: 'industrial', activity: 'Eastern employment areas and growing residential fabric', growth: [0, 0, 0, 0, .02, .08, .5, .9] },
  { id: 'lb-nagar', name: 'Dilsukhnagar & LB Nagar', coordinates: [78.544, 17.361], radius: [2.4, 2], character: 'residential', activity: 'An expanding southeastern corridor of housing and commerce', growth: [0, 0, 0, 0, .02, .08, .55, .95] },
  { id: 'shamshabad', name: 'Shamshabad & the southern corridor', coordinates: [78.403, 17.260], radius: [2.3, 2], character: 'residential', activity: 'An outer settlement landscape, with much later metropolitan connections', growth: [0, 0, 0, 0, .015, .02, .08, .42] },
]

// Schematic connections between districts, not historic alignments of named roads.
export const CITY_CONNECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['golconda-town', 'karwan'], ['karwan', 'old-city'], ['karwan', 'mehdipatnam'],
  ['old-city', 'south-city'], ['old-city', 'koti'], ['koti', 'abids'],
  ['abids', 'mehdipatnam'], ['abids', 'lake-edge'], ['koti', 'osmania-campus'],
  ['lake-edge', 'begumpet'], ['begumpet', 'secunderabad'], ['secunderabad', 'osmania-campus'],
  ['begumpet', 'banjara'], ['mehdipatnam', 'banjara'], ['banjara', 'hitec'],
  ['hitec', 'gachibowli'], ['gachibowli', 'financial-district'], ['financial-district', 'golconda-town'],
  ['hitec', 'kukatpally'], ['begumpet', 'sanathnagar'], ['sanathnagar', 'kukatpally'],
  ['kukatpally', 'miyapur'], ['miyapur', 'patancheru'], ['secunderabad', 'alwal'],
  ['alwal', 'kompally'], ['secunderabad', 'tarnaka'], ['tarnaka', 'uppal'],
  ['osmania-campus', 'uppal'], ['uppal', 'lb-nagar'], ['lb-nagar', 'old-city'],
  ['south-city', 'shamshabad'],
]

export const CHAPTER_YEARS = [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025] as const

export function districtEmphasis(district: CityDistrict, year: number) {
  const index = CHAPTER_YEARS.findIndex((chapter) => chapter === year)
  return index < 0 ? 0 : district.growth[index]
}

export function districtsInEra(year: number) {
  return CITY_DISTRICTS.filter((district) => districtEmphasis(district, year) >= .1)
}

export function nearestDistrict([longitude, latitude]: Coordinates, year: number) {
  return districtsInEra(year).reduce<CityDistrict | null>((nearest, district) => {
    if (!nearest) return district
    const distance = (point: Coordinates) => Math.hypot((point[0] - longitude) * Math.cos(latitude * Math.PI / 180), point[1] - latitude)
    return distance(district.coordinates) < distance(nearest.coordinates) ? district : nearest
  }, null)
}

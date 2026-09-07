import type { SatelliteScene } from './mapTypes'

function landsat(id: string, date: string, bounds: SatelliteScene['bounds']): SatelliteScene {
  const params = new URLSearchParams([
    ['collection', 'landsat-c2-l2'], ['item', id],
    ['assets', 'red'], ['assets', 'green'], ['assets', 'blue'],
    ['color_formula', 'gamma RGB 2.7, saturation 1.5, sigmoidal RGB 15 0.55'],
    ['format', 'png'],
  ])
  return {
    id, date, bounds, maxZoom: 13, resolution: '30 m per source pixel',
    tiles: [`https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${params}`],
    attribution: 'Landsat - USGS/NASA; <a href="https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2">Microsoft Planetary Computer</a>',
    sourceUrl: `https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2/items/${id}`,
  }
}

export const SATELLITE_SCENES: Partial<Record<number, SatelliteScene>> = {
  1998: landsat('LT05_L2SP_144048_19980607_02_T1', '1998-06-07', [77.1229396, 16.36231449, 79.36333187, 18.32119551]),
  2025: landsat('LC09_L2SP_144048_20250217_02_T1', '2025-02-17', [77.0953896743, 16.2644444931, 79.2939719407, 18.4127155069]),
}

export const MAP_REFERENCES = [
  { title: 'OpenFreeMap: public vector maps', url: 'https://openfreemap.org/', detail: 'Serves current OpenStreetMap-derived roads, labels and mapped building footprints. This is a live cartographic reference, not a frozen 2025 survey.' },
  { title: 'OpenStreetMap copyright and data licence', url: 'https://www.openstreetmap.org/copyright', detail: 'Map data © OpenStreetMap contributors, available under the Open Database Licence. Coverage and height information vary; missing buildings are not invented.' },
  { title: 'Photon: city-wide place search', url: 'https://github.com/komoot/photon', detail: 'Search current OpenStreetMap landmarks, streets and places within the Hyderabad viewing area. Queries are sent only on submission, not while typing. This public demo service has fair-use limits and no availability guarantee; results are not historical evidence.' },
  { title: 'Mapterhorn terrain', url: 'https://mapterhorn.com/attribution', detail: 'Open-data elevation reference. The global terrain grid is approximately 30 metres, not a building or historical elevation survey.' },
  { title: 'Landsat Collection 2 Level-2', url: 'https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2', detail: 'Dated USGS/NASA observations hosted by Microsoft Planetary Computer. June 1998 and February 2025 are different seasons, not annual composites; colour differences are not solely urban growth.' },
  { title: 'Hyderabad airport chronology', url: 'https://en.wikipedia.org/wiki/Rajiv_Gandhi_International_Airport#Construction_and_opening_(2005%E2%80%932008)', detail: 'Secondary reference: RGIA began commercial operations on 23 March 2008. Begumpet was the commercial airport in 1998. Airport pins are reference coordinates, not entrance locations.' },
]

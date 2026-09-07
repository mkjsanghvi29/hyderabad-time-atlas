import { CITY_MAP_BOUNDS, HYDERABAD_MAP_REGION, type MapRegion } from './mapTypes'
import { validCoordinates } from './navigation'
import type { Coordinates } from './types'

export const PLACE_SEARCH_ENDPOINT = 'https://photon.komoot.io/api/'

export type PlaceResult = {
  id: string
  name: string
  coordinates: Coordinates
  kind: string
  description: string
  zoom: number
  sourceUrl?: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function parsePlaceResults(value: unknown, bounds: MapRegion['bounds'] = CITY_MAP_BOUNDS): PlaceResult[] {
  if (!record(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error('The place-search service returned an invalid result list.')
  }
  const results = new Map<string, PlaceResult>()
  for (const feature of value.features) {
    if (!record(feature) || !record(feature.geometry) || feature.geometry.type !== 'Point'
      || !Array.isArray(feature.geometry.coordinates) || !record(feature.properties)) {
      throw new Error('The place-search service returned an invalid map point.')
    }
    const [longitude, latitude] = feature.geometry.coordinates
    if (typeof longitude !== 'number' || typeof latitude !== 'number' || !validCoordinates([longitude, latitude])) {
      throw new Error('The place-search service returned invalid coordinates.')
    }
    const [west, south, east, north] = bounds
    if (longitude < west || longitude > east || latitude < south || latitude > north) continue
    const properties = feature.properties
    const name = text(properties.name) || [text(properties.housenumber), text(properties.street)].filter(Boolean).join(' ')
    if (!name) continue
    const osmType = properties.osm_type === 'N' ? 'node' : properties.osm_type === 'W' ? 'way' : properties.osm_type === 'R' ? 'relation' : null
    const sourceUrl = osmType && typeof properties.osm_id === 'number' && Number.isSafeInteger(properties.osm_id) && properties.osm_id > 0
      ? `https://www.openstreetmap.org/${osmType}/${properties.osm_id}` : undefined
    const id = sourceUrl ?? `${longitude},${latitude}:${name}`
    const category = text(properties.osm_value)
    let zoom = 16
    const extent = properties.extent
    if (Array.isArray(extent) && extent.length === 4 && extent.every((part) => typeof part === 'number' && Number.isFinite(part))) {
      // Photon extents use west, north, east, south; frame large parks/campuses as well as buildings.
      const [left, top, right, bottom] = extent
      if (right > left && top > bottom) {
        const span = Math.max(right - left, (top - bottom) / Math.cos(latitude * Math.PI / 180))
        zoom = Math.max(9, Math.min(16, Math.log2(180 / span)))
      }
    }
    results.set(id, {
      id, name, coordinates: [longitude, latitude], sourceUrl, zoom,
      kind: ((category === 'yes' || category === 'no' ? text(properties.osm_key) : category) || 'Mapped place').replaceAll('_', ' '),
      description: [...new Set(['street', 'locality', 'district', 'city', 'postcode'].map((key) => text(properties[key])).filter(Boolean))].join(', '),
    })
  }
  return [...results.values()]
}

export function createPlaceSearch(fetcher: typeof fetch = fetch, region: MapRegion = HYDERABAD_MAP_REGION) {
  const cache = new Map<string, PlaceResult[]>()
  let lastRequest = -Infinity
  return async (query: string, signal: AbortSignal): Promise<PlaceResult[]> => {
    const term = query.trim()
    if (term.length < 2 || term.length > 160) throw new Error('Enter a place name between 2 and 160 characters.')
    signal.throwIfAborted()
    const key = term.toLowerCase()
    const cached = cache.get(key)
    if (cached) return cached
    if (Date.now() - lastRequest < 1100) throw new Error('Please wait a moment before another map search.')
    lastRequest = Date.now()
    const url = new URL(PLACE_SEARCH_ENDPOINT)
    url.search = new URLSearchParams({
      q: term, bbox: region.bounds.join(','), lon: String(region.center[0]),
      lat: String(region.center[1]), limit: '8', lang: 'en',
    }).toString()
    const response = await fetcher(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      credentials: 'omit', headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error(response.status === 429
      ? 'The place-search service is busy. Please try again shortly.'
      : `Place search is unavailable (HTTP ${response.status}). Try again, choose a map point, or enter coordinates.`)
    const results = parsePlaceResults(await response.json(), region.bounds)
    signal.throwIfAborted()
    if (cache.size >= 40) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, results)
    return results
  }
}

export const searchCityPlaces = createPlaceSearch()

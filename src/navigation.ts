import { districtsInEra } from './city'
import { LANDMARKS } from './data'
import { MAP_BOUNDS } from './geography'
import type { Coordinates } from './types'

export type Destination = {
  id: string
  name: string
  coordinates: Coordinates
  kind: 'Landmark' | 'Neighbourhood' | 'Airport'
  note: string
  landmarkId?: string
}

export function destinationsForYear(year: number): Destination[] {
  const destinations: Destination[] = [
    ...LANDMARKS.filter((place) => place.visibleFrom <= year).map((place): Destination => ({
      id: place.id, name: place.name, coordinates: place.coordinates,
      kind: 'Landmark', note: place.dateLabel, landmarkId: place.id,
    })),
    ...districtsInEra(year).map((district): Destination => ({
      id: `area-${district.id}`, name: district.name, coordinates: district.coordinates,
      kind: 'Neighbourhood', note: 'Area anchor; modern names help you find your way.',
    })),
  ]
  if (year >= 1998) destinations.unshift({
    id: 'begumpet-airport', name: 'Begumpet Airport', coordinates: [78.4675, 17.45305556],
    kind: 'Airport', note: year === 1998 ? 'Hyderabad’s commercial airport in this chapter.' : 'The former commercial gateway; the airfield remains.',
  })
  if (year >= 2008) destinations.unshift({
    id: 'rajiv-gandhi-airport', name: 'Rajiv Gandhi International Airport (HYD)', coordinates: [78.43194444, 17.23],
    kind: 'Airport', note: 'Opened 23 March 2008. Airport reference point, not a terminal entrance.',
  })
  return destinations
}

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  const latitude = Number(match[1]), longitude = Number(match[2])
  return validCoordinates([longitude, latitude]) ? [longitude, latitude] : null
}

export function validCoordinates([longitude, latitude]: Coordinates): boolean {
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    && longitude >= -180 && longitude <= 180 && latitude >= -85 && latitude <= 85
}

export function insideReconstruction([longitude, latitude]: Coordinates): boolean {
  return longitude >= MAP_BOUNDS.west && longitude <= MAP_BOUNDS.east
    && latitude >= MAP_BOUNDS.south && latitude <= MAP_BOUNDS.north
}

export function coordinatesFromUrl(search: string): Coordinates | null {
  const params = new URLSearchParams(search)
  if (!params.has('lat') || !params.has('lon') || params.has('place')) return null
  return parseCoordinates(`${params.get('lat')},${params.get('lon')}`)
}

export function zoomFromUrl(search: string): number | undefined {
  const value = new URLSearchParams(search).get('zoom')
  if (!value?.trim()) return undefined
  const zoom = Number(value)
  return Number.isFinite(zoom) && zoom >= 1 && zoom <= 20 ? zoom : undefined
}

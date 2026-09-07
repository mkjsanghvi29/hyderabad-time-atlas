import type { Coordinates } from '../types'
import type { Bounds, CityPlace, WorldCity } from './types'

export function yearLabel(year: number) {
  return year < 0 ? `${Math.abs(year).toLocaleString('en-US')} BCE` : String(year)
}

export function placesInChapter(city: WorldCity, year: number): CityPlace[] {
  return city.places.filter((place) => place.visibleFrom <= year && (place.visibleUntil === undefined || year < place.visibleUntil))
}

export function insideBounds([lon, lat]: Coordinates, [west, south, east, north]: Bounds) {
  return lon >= west && lon <= east && lat >= south && lat <= north
}

// Match the original atlas scale: one world unit represents about 100 metres.
export function projectCity(city: Pick<WorldCity, 'center'>, [lon, lat]: Coordinates): [number, number] {
  return [(lon - city.center[0]) * 1113.2 * Math.cos(city.center[1] * Math.PI / 180), -(lat - city.center[1]) * 1113.2]
}

export function unprojectCity(city: Pick<WorldCity, 'center'>, [x, z]: readonly [number, number]): Coordinates {
  return [city.center[0] + x / (1113.2 * Math.cos(city.center[1] * Math.PI / 180)), city.center[1] - z / 1113.2]
}

export function pointInPolygon(x: number, z: number, points: readonly (readonly [number, number])[]) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

export function segmentDistance(x: number, z: number, a: readonly [number, number], b: readonly [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

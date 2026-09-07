import type { Coordinates } from './types'

export type GeographicLayer = 'streets' | 'satellite'

export type SatelliteScene = {
  id: string
  date: string
  tiles: string[]
  attribution: string
  bounds: [west: number, south: number, east: number, north: number]
  maxZoom: number
  sourceUrl: string
  resolution: string
}

export const CITY_MAP_CENTER: Coordinates = [78.46, 17.40]
// Viewing envelope, not an administrative boundary.
export const CITY_MAP_BOUNDS: [number, number, number, number] = [78.10, 17.10, 78.90, 17.75]
export const OPEN_MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'

import type { Coordinates } from './types'

// Local equirectangular projection. One scene unit is approximately 100 metres.
export const ORIGIN: Coordinates = [78.455, 17.400]
export const MAP_BOUNDS = { west: 78.24, east: 78.69, south: 17.20, north: 17.65 }

export function project([longitude, latitude]: Coordinates): [number, number] {
  return [
    (longitude - ORIGIN[0]) * 1113.2 * Math.cos(ORIGIN[1] * Math.PI / 180),
    -(latitude - ORIGIN[1]) * 1113.2,
  ]
}

export function unproject(x: number, z: number): Coordinates {
  return [
    ORIGIN[0] + x / (1113.2 * Math.cos(ORIGIN[1] * Math.PI / 180)),
    ORIGIN[1] - z / 1113.2,
  ]
}

// Hand-traced orientation guides, not historical shorelines or flood extents.
export const MUSI: Coordinates[] = [
  [78.24, 17.388], [78.29, 17.385], [78.33, 17.380],
  [78.355, 17.382], [78.375, 17.380], [78.392, 17.373], [78.410, 17.367],
  [78.429, 17.365], [78.443, 17.364], [78.452, 17.369], [78.4594, 17.3711], [78.466, 17.373],
  [78.476, 17.372], [78.490, 17.375], [78.504, 17.379], [78.517, 17.382],
  [78.535, 17.381], [78.575, 17.374], [78.625, 17.366], [78.69, 17.352],
]

export const HUSSAIN_SAGAR: Coordinates[] = [
  [78.464, 17.437], [78.470, 17.440], [78.478, 17.439], [78.485, 17.434],
  [78.488, 17.426], [78.486, 17.419], [78.481, 17.413], [78.474, 17.412],
  [78.469, 17.417], [78.466, 17.430],
]

export function seededRandom(seed: string): () => number {
  let value = 2166136261
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619)
  return () => {
    value = Math.imul(value, 1664525) + 1013904223
    return (value >>> 0) / 4294967296
  }
}

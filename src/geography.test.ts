import { describe, expect, it } from 'vitest'
import { ERAS, LANDMARKS, SOURCES } from './data'
import { HUSSAIN_SAGAR, MAP_BOUNDS, MUSI, ORIGIN, project, seededRandom, unproject } from './geography'
import { Vector2, ShapeUtils } from 'three'

describe('atlas geography and chronology', () => {
  it('projects real coordinates east-right and north-up without losing their location', () => {
    expect(project(ORIGIN)).toEqual([0, -0])
    for (const place of LANDMARKS) {
      const [x, z] = project(place.coordinates)
      const restored = unproject(x, z)
      expect(restored[0]).toBeCloseTo(place.coordinates[0], 8)
      expect(restored[1]).toBeCloseTo(place.coordinates[1], 8)
      expect(place.coordinates[0]).toBeGreaterThanOrEqual(MAP_BOUNDS.west)
      expect(place.coordinates[0]).toBeLessThanOrEqual(MAP_BOUNDS.east)
      expect(place.coordinates[1]).toBeGreaterThanOrEqual(MAP_BOUNDS.south)
      expect(place.coordinates[1]).toBeLessThanOrEqual(MAP_BOUNDS.north)
    }
    expect(project([ORIGIN[0] + .01, ORIGIN[1]])[0]).toBeGreaterThan(0)
    expect(project([ORIGIN[0], ORIGIN[1] + .01])[1]).toBeLessThan(0)
  })

  it('has ordered eras, unique ids and source records for every historical claim card', () => {
    expect(ERAS.map((era) => era.year)).toEqual([1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025])
    expect(new Set(LANDMARKS.map((item) => item.id)).size).toBe(LANDMARKS.length)
    expect(new Set(SOURCES.map((item) => item.id)).size).toBe(SOURCES.length)
    for (const entry of [...ERAS, ...LANDMARKS]) {
      expect(entry.sources.length).toBeGreaterThan(0)
      for (const id of entry.sources) expect(SOURCES.some((source) => source.id === id)).toBe(true)
    }
    for (const source of SOURCES) expect(new URL(source.url).protocol).toBe('https:')
  })

  it('never tours a landmark before its appearance date', () => {
    for (const era of ERAS) {
      expect(era.tour.length).toBeGreaterThan(0)
      for (const id of era.tour) {
        const place = LANDMARKS.find((item) => item.id === id)
        expect(place, `missing landmark ${id}`).toBeDefined()
        expect(place!.visibleFrom, `${id} in ${era.year}`).toBeLessThanOrEqual(era.year)
      }
    }
  })

  it('keeps the cyber skyline and completed Mughal-era mosque out of the founding scene', () => {
    const founding = LANDMARKS.filter((item) => item.visibleFrom <= 1591)
    expect(founding.some((place) => place.id === 'charminar')).toBe(true)
    expect(founding.some((place) => place.model === 'cyber')).toBe(false)
    expect(founding.some((place) => place.id === 'mecca-masjid')).toBe(false)
  })

  it('keeps later institutional buildings out of the flood chapter', () => {
    const flood = LANDMARKS.filter((item) => item.visibleFrom <= 1908)
    expect(flood.map((place) => place.id)).not.toContain('high-court')
    expect(flood.map((place) => place.id)).not.toContain('osmania')
    expect(flood.map((place) => place.id)).toContain('falaknuma')
    expect(ERAS.find((era) => era.year === 1763)!.description).toContain('1769')
    expect(LANDMARKS.find((place) => place.id === 'osmania')!.caveat).toContain('1938/1939')
  })

  it('aligns the schematic bridge with the river and places the statue inside the lake', () => {
    const bridge = LANDMARKS.find((place) => place.id === 'purana-pul')!
    expect(MUSI).toContainEqual(bridge.coordinates)
    const statue = new Vector2(...project(LANDMARKS.find((place) => place.id === 'buddha')!.coordinates))
    const shore = HUSSAIN_SAGAR.map((point) => new Vector2(...project(point)))
    const triangles = ShapeUtils.triangulateShape(shore, [])
    const inside = triangles.some(([a, b, c]) => {
      const cross = (p: Vector2, q: Vector2) => q.clone().sub(p).cross(statue.clone().sub(p))
      const signs = [cross(shore[a], shore[b]), cross(shore[b], shore[c]), cross(shore[c], shore[a])]
      return signs.every((sign) => sign >= 0) || signs.every((sign) => sign <= 0)
    })
    expect(inside).toBe(true)
  })

  it('generates reproducible but non-identical city texture seeds', () => {
    const a = seededRandom('1591'), b = seededRandom('1591'), c = seededRandom('1998')
    const sequence = Array.from({ length: 20 }, a)
    expect(sequence).toEqual(Array.from({ length: 20 }, b))
    expect(sequence).not.toEqual(Array.from({ length: 20 }, c))
    expect(sequence.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})

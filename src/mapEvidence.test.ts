import { describe, expect, it } from 'vitest'
import { SATELLITE_SCENES } from './mapEvidence'
import { CITY_MAP_BOUNDS } from './mapTypes'

describe('dated satellite evidence', () => {
  it('uses independently dated scenes without signing tokens or invented resolution', () => {
    expect(SATELLITE_SCENES[1998]?.date).toBe('1998-06-07')
    expect(SATELLITE_SCENES[2025]?.date).toBe('2025-02-17')
    for (const year of [1998, 2025]) {
      const scene = SATELLITE_SCENES[year]!
      const url = new URL(scene.tiles[0])
      expect(url.searchParams.getAll('assets')).toEqual(['red', 'green', 'blue'])
      expect(url.searchParams.get('item')).toBe(scene.id)
      expect(url.searchParams.has('sig')).toBe(false)
      expect(scene.maxZoom).toBe(13)
      expect(scene.resolution).toContain('30 m')
      expect(scene.bounds[0]).toBeLessThan(CITY_MAP_BOUNDS[0])
      expect(scene.bounds[1]).toBeLessThan(CITY_MAP_BOUNDS[1])
      expect(scene.bounds[2]).toBeGreaterThan(CITY_MAP_BOUNDS[2])
      expect(scene.bounds[3]).toBeGreaterThan(CITY_MAP_BOUNDS[3])
    }
  })
})

import { describe, expect, it } from 'vitest'
import { CHAPTER_YEARS, CITY_CONNECTIONS, CITY_DISTRICTS, districtEmphasis, districtsInEra, nearestDistrict } from './city'
import { CITY_LIFE } from './life'
import { SOURCES } from './data'

describe('the lived city', () => {
  it('provides a cited lived-history story at every chapter', () => {
    expect(CITY_LIFE.map((story) => story.year)).toEqual(CHAPTER_YEARS)
    for (const story of CITY_LIFE) {
      expect(story.observations).toHaveLength(3)
      expect(story.uncertainty.length).toBeGreaterThan(30)
      for (const source of story.sources) expect(SOURCES.some((entry) => entry.id === source)).toBe(true)
    }
  })

  it('uses known district nodes for every schematic connection', () => {
    expect(new Set(CITY_DISTRICTS.map((district) => district.id)).size).toBe(CITY_DISTRICTS.length)
    for (const pair of CITY_CONNECTIONS) {
      for (const id of pair) expect(CITY_DISTRICTS.some((district) => district.id === id)).toBe(true)
    }
  })

  it('shows regional expansion without projecting the mature west into earlier chapters', () => {
    expect(districtsInEra(1518).length).toBeLessThan(districtsInEra(1908).length)
    expect(districtsInEra(1908).length).toBeLessThan(districtsInEra(2025).length)
    expect(districtsInEra(1591).some((district) => district.id === 'old-city')).toBe(true)
    expect(districtsInEra(1763).some((district) => district.id === 'secunderabad')).toBe(false)
    const west = CITY_DISTRICTS.find((district) => district.id === 'financial-district')!
    expect(districtEmphasis(west, 1998)).toBeLessThan(districtEmphasis(west, 2025) / 10)
    expect(nearestDistrict([78.409, 17.384], 1518)?.id).toBe('golconda-town')
  })
})

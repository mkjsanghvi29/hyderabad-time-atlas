import { describe, expect, it } from 'vitest'
import { WORLD_CITIES } from './registry'
import { insideBounds, placesInChapter, projectCity, unprojectCity, yearLabel } from './geography'
import { readWorldLocation } from './navigation'
import { cityLink, CITY_OPTIONS } from './CityPicker'

describe('the shared world city catalogue', () => {
  it('covers six inhabited continents and preserves Hyderabad as a separate working edition', () => {
    expect(WORLD_CITIES.map((city) => city.id)).toEqual(['london', 'cairo', 'tokyo', 'new-york', 'rio', 'sydney'])
    expect(new Set(WORLD_CITIES.map((city) => city.continent)).size).toBe(6)
    expect(CITY_OPTIONS).toHaveLength(7)
    expect(CITY_OPTIONS[0].id).toBe('hyderabad')
  })
  it.each(WORLD_CITIES)('$name has ordered, source-linked chapters and bounded geographic anchors', (city) => {
    expect(city.chapters).toHaveLength(6)
    expect(city.chapters.at(-1)?.year).toBe(2025)
    expect(new Set(city.chapters.map((chapter) => chapter.year)).size).toBe(city.chapters.length)
    expect(city.chapters.map((chapter) => chapter.year)).toEqual(city.chapters.map((chapter) => chapter.year).sort((a, b) => a - b))
    const sources = new Set(city.sources.map((source) => source.id))
    expect(sources.size).toBe(city.sources.length)
    const hasSources = (ids: string[]) => {
      expect(ids.length).toBeGreaterThan(0)
      for (const id of ids) expect(sources.has(id), `Missing source ${id}`).toBe(true)
    }
    for (const source of city.sources) expect(new URL(source.url).protocol).toBe('https:')
    for (const chapter of city.chapters) {
      hasSources(chapter.sources)
      expect(chapter.stats.length).toBeGreaterThanOrEqual(2)
      for (const stat of chapter.stats) {
        hasSources([stat.source])
        for (const value of [stat.label, stat.value, stat.scope, stat.asOf]) expect(value.trim().length).toBeGreaterThan(0)
      }
      expect(placesInChapter(city, chapter.year).length, `No places in ${chapter.year}`).toBeGreaterThan(0)
      expect(insideBounds(chapter.focus, city.historicalBounds)).toBe(true)
      expect(chapter.spanKm).toBeGreaterThan(0)
      expect(chapter.density).toBeGreaterThan(0)
      expect(chapter.density).toBeLessThanOrEqual(1)
    }
    expect(new Set(city.places.map((place) => place.id)).size).toBe(city.places.length)
    for (const place of city.places) {
      hasSources(place.sources)
      expect(insideBounds(place.coordinates, city.historicalBounds), place.name).toBe(true)
      expect(insideBounds(place.coordinates, city.mapBounds), place.name).toBe(true)
      if (place.visibleUntil !== undefined) expect(place.visibleUntil).toBeGreaterThan(place.visibleFrom)
      expect(place.caveat.length).toBeGreaterThan(20)
    }
    expect(city.water.length).toBeGreaterThan(0)
    expect(insideBounds(city.center, city.mapBounds)).toBe(true)
    const restored = unprojectCity(city, projectCity(city, city.chapters[0].focus))
    expect(restored[0]).toBeCloseTo(city.chapters[0].focus[0], 8)
    expect(restored[1]).toBeCloseTo(city.chapters[0].focus[1], 8)
  })
  it('formats ancient eras without inventing a negative CE date', () => {
    expect(yearLabel(-2500)).toBe('2,500 BCE')
    expect(yearLabel(969)).toBe('969')
  })
  it.each(WORLD_CITIES)('$name rejects another city’s place/year and keeps modern geography opt-in offline', (city) => {
    const invalid = readWorldLocation(city, '?year=-99999&place=charminar&lat=17.4&lon=78.46', 'https:')
    expect(invalid.index).toBe(0)
    expect(invalid.selectedId).toBeNull()
    expect(invalid.destination).toBeNull()
    expect(invalid.notice).not.toBe('')
    expect(readWorldLocation(city, '?year=2025', 'file:').preferMap).toBe(false)
    expect(readWorldLocation(city, '?year=2025', 'https:').preferMap).toBe(true)
    expect(readWorldLocation(city, '?year=2025&view=atlas', 'https:').preferMap).toBe(false)
    const modern = readWorldLocation(city, `?year=2025&lat=${city.center[1]}&lon=${city.center[0]}&zoom=15`, 'https:')
    expect(modern.destination).toEqual(city.center)
    expect(modern.zoom).toBe(15)
  })
  it('clears stale city-specific context when hopping between cities', () => {
    const url = new URL(cityLink('cairo', 'https://example.org/atlas/?year=1998&place=charminar&lat=17.4&lon=78.4&layer=satellite&view=atlas&scoutTheme=dark#old'))
    expect(url.searchParams.get('city')).toBe('cairo')
    expect(url.searchParams.get('scoutTheme')).toBe('dark')
    expect([...url.searchParams.keys()]).toEqual(['city', 'scoutTheme'])
    expect(url.hash).toBe('')
  })
})

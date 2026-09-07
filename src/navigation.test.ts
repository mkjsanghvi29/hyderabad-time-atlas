import { describe, expect, it } from 'vitest'
import { coordinatesFromUrl, destinationsForYear, insideReconstruction, parseCoordinates, zoomFromUrl } from './navigation'

describe('city-wide navigation', () => {
  it('accepts arbitrary coordinates without restricting travel to the landmark catalogue', () => {
    expect(parseCoordinates('17.2403, 78.4294')).toEqual([78.4294, 17.2403])
    expect(parseCoordinates('17.55;78.22')).toEqual([78.22, 17.55])
    expect(parseCoordinates('91,78')).toBeNull()
    expect(parseCoordinates('17,200')).toBeNull()
    expect(parseCoordinates('17,78,99')).toBeNull()
    expect(parseCoordinates('not a coordinate')).toBeNull()
    expect(coordinatesFromUrl('?year=2025&lat=17.55&lon=78.22')).toEqual([78.22, 17.55])
    expect(coordinatesFromUrl('?year=2025&lat=&lon=78.22')).toBeNull()
    expect(coordinatesFromUrl('?lat=17&lon=78&place=charminar')).toBeNull()
    expect(zoomFromUrl('?zoom=14')).toBe(14)
    expect(zoomFromUrl('?zoom=Infinity')).toBeUndefined()
    expect(zoomFromUrl('?zoom=100')).toBeUndefined()
    expect(zoomFromUrl('?zoom=')).toBeUndefined()
  })
  it('does not send 1998 visitors to an airport which opened in 2008', () => {
    expect(destinationsForYear(1998).some((item) => item.id === 'rajiv-gandhi-airport')).toBe(false)
    expect(destinationsForYear(1998).some((item) => item.id === 'begumpet-airport')).toBe(true)
    expect(destinationsForYear(2025).find((item) => item.id === 'rajiv-gandhi-airport')?.coordinates).toEqual([78.43194444, 17.23])
    for (const year of [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025]) {
      const destinations = destinationsForYear(year)
      expect(new Set(destinations.map((item) => item.id)).size).toBe(destinations.length)
    }
  })
  it('makes the smaller offline reconstruction extent explicit', () => {
    expect(insideReconstruction([78.4294, 17.2403])).toBe(true)
    expect(insideReconstruction([78.80, 17.70])).toBe(false)
  })
})

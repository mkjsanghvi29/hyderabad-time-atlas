import { afterEach, describe, expect, it, vi } from 'vitest'
import { CITY_MAP_BOUNDS, type MapRegion } from './mapTypes'
import { createPlaceSearch, parsePlaceResults } from './placeSearch'

const museum = {
  type: 'Feature',
  properties: {
    name: 'Salar Jung Museum', osm_type: 'W', osm_id: 238284090, osm_key: 'tourism', osm_value: 'museum',
    street: 'Darul Shifa Road', locality: 'Dar-Ul-Shifa', postcode: '500024',
    extent: [78.4789386, 17.3726115, 78.4821739, 17.3700913],
  },
  geometry: { type: 'Point', coordinates: [78.4801498, 17.371392] },
}
const collection = (features = [museum]) => ({ type: 'FeatureCollection', features })
const signal = () => new AbortController().signal
afterEach(() => vi.restoreAllMocks())

describe('city-wide place search', () => {
  it('isolates bounds, search bias and cached results for each city', async () => {
    const region: MapRegion = { name: 'London', center: [-.12, 51.5], bounds: [-.6, 51.2, .4, 51.8] }
    const londonMuseum = { ...museum, properties: { ...museum.properties, name: 'British Museum', osm_id: 1 }, geometry: { type: 'Point', coordinates: [-.1269, 51.5194] } }
    expect(parsePlaceResults(collection([museum, londonMuseum]), region.bounds).map((entry) => entry.name)).toEqual(['British Museum'])
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(collection([museum, londonMuseum])))
    const searchLondon = createPlaceSearch(fetcher, region)
    const searchHyderabad = createPlaceSearch(fetcher)
    expect((await searchLondon('museum', signal()))[0].name).toBe('British Museum')
    expect((await searchHyderabad('museum', signal()))[0].name).toBe('Salar Jung Museum')
    const londonUrl = new URL(String(fetcher.mock.calls[0][0]))
    expect(londonUrl.searchParams.get('bbox')).toBe(region.bounds.join(','))
    expect(londonUrl.searchParams.get('lon')).toBe('-0.12')
    expect(londonUrl.searchParams.get('lat')).toBe('51.5')
  })
  it('keeps mapped identities, coordinates, address detail and sensible framing', () => {
    const result = parsePlaceResults(collection())[0]
    expect(result).toMatchObject({
      name: 'Salar Jung Museum', coordinates: [78.4801498, 17.371392],
      sourceUrl: 'https://www.openstreetmap.org/way/238284090', kind: 'museum',
      description: 'Darul Shifa Road, Dar-Ul-Shifa, 500024',
    })
    expect(result.zoom).toBeGreaterThan(14)
    expect(result.zoom).toBeLessThanOrEqual(16)
    expect(parsePlaceResults(collection([{ ...museum, properties: { ...museum.properties, osm_value: 'yes', osm_key: 'building' } }]))[0].kind).toBe('building')
  })

  it('deduplicates map records and excludes results outside Hyderabad', () => {
    expect(parsePlaceResults(collection([museum, museum, {
      ...museum, geometry: { type: 'Point', coordinates: [77.59, 12.97] },
    }]))).toHaveLength(1)
    expect(parsePlaceResults(collection([]))).toEqual([])
  })

  it('surfaces malformed responses rather than treating them as no matches', () => {
    for (const value of [null, {}, { type: 'FeatureCollection', features: [null] },
      { type: 'FeatureCollection', features: [{ ...museum, geometry: { type: 'Point', coordinates: ['78', 17] } }] }]) {
      expect(() => parsePlaceResults(value)).toThrow(/invalid/)
    }
  })

  it('uses a bounded, credential-free query and caches only in memory', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(collection()))
    const search = createPlaceSearch(fetcher)
    const results = await search('Salar Jung Museum', signal())
    expect(await search('  SALAR JUNG MUSEUM  ', signal())).toBe(results)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('q')).toBe('Salar Jung Museum')
    expect(url.searchParams.get('bbox')).toBe(CITY_MAP_BOUNDS.join(','))
    expect(url.searchParams.get('limit')).toBe('8')
    expect(fetcher.mock.calls[0][1]?.credentials).toBe('omit')
  })

  it('limits request frequency without blocking cached queries', async () => {
    let time = 10_000
    vi.spyOn(Date, 'now').mockImplementation(() => time)
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(collection()))
    const search = createPlaceSearch(fetcher)
    await search('museum', signal())
    await expect(search('temple', signal())).rejects.toThrow('wait a moment')
    await expect(search('museum', signal())).resolves.toHaveLength(1)
    time += 1100
    await expect(search('temple', signal())).resolves.toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([429, 503])('reports service failure %s explicitly', async (status) => {
    const search = createPlaceSearch(vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status })))
    await expect(search('museum', signal())).rejects.toThrow(status === 429 ? 'busy' : '503')
  })

  it('rejects empty queries and respects cancellation', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(collection()))
    const search = createPlaceSearch(fetcher)
    await expect(search(' ', signal())).rejects.toThrow('place name')
    const controller = new AbortController()
    controller.abort()
    await expect(search('museum', controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).not.toHaveBeenCalled()
    const pending = new AbortController()
    const response = search('museum', pending.signal)
    pending.abort()
    await expect(response).rejects.toMatchObject({ name: 'AbortError' })
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createExpression, validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import type { StyleSpecification } from 'maplibre-gl'
import {
  BUILDING_ESTIMATED_HEIGHT, BUILDING_LAYER_ID, OPEN_MAP_ATTRIBUTION, SATELLITE_SOURCE_ID,
  TERRAIN_ATTRIBUTION, TERRAIN_SOURCE_ID,
  assertSatelliteScene, createSatelliteStyle, createStreetStyle, isRoadLayer,
  layerVisibility, usesDatedImagery, withReferenceTerrain,
} from './geographicStyle'
import type { MapPalette, StreetAppearance } from './geographicStyle'
import type { SatelliteScene } from './mapTypes'

const theme = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')
const color = (name: string) => {
  const value = theme.match(new RegExp(`--cp-${name}:\\s*([^;]+);`))?.[1]
  if (!value) throw new Error(`Missing theme variable ${name}`)
  return value
}
const palette: MapPalette = {
  background: color('bg'), surface: color('surface'), soft: color('surface-soft'),
  border: color('border'), borderStrong: color('border-strong'),
  text: color('text'), muted: color('text-muted'), accent: color('accent'),
  link: color('link'), success: color('success'),
}
const satellite: SatelliteScene = {
  id: 'test-dated-scene', date: '1998-02-05', tiles: ['https://example.org/scene/{z}/{x}/{y}.png'],
  attribution: 'Test scene provider', bounds: [78.1, 17.1, 78.9, 17.75],
  maxZoom: 12, sourceUrl: 'https://example.org/catalog/scene', resolution: '30 m',
}
const style: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    overlay: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
  },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'building-top', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', paint: { 'fill-translate': [-2, -2] } },
    { id: 'highway-primary', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'railway', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'road-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', layout: { 'text-field': '{name}' } },
    { id: 'water-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'water_name', layout: { 'text-field': '{name}' } },
    { id: 'unrelated-overlay', type: 'line', source: 'overlay' },
  ],
}
const visible: StreetAppearance = { showLabels: true, showRoads: true, showCity: true, timeOfDay: 'day' }

describe('geographic source chronology and street style', () => {
  it('uses current vectors only for the 2025 street-map chapter', () => {
    expect(usesDatedImagery(2025, 'streets')).toBe(false)
    for (const year of [1518, 1948, 1998]) expect(usesDatedImagery(year, 'streets')).toBe(true)
    expect(usesDatedImagery(2025, 'satellite')).toBe(true)
  })

  it('builds 1998 from the dated raster alone, without current geography or labels', () => {
    const result = createSatelliteStyle(1998, satellite, palette)
    expect(validateStyleMin(result)).toEqual([])
    expect(Object.keys(result.sources)).toEqual([SATELLITE_SOURCE_ID])
    expect(result.layers.map((layer) => layer.type)).toEqual(['background', 'raster'])
    expect(result.glyphs).toBeUndefined()
    expect(result.sprite).toBeUndefined()
    expect(result.sources[SATELLITE_SOURCE_ID]).toMatchObject({
      tiles: satellite.tiles, bounds: satellite.bounds, maxzoom: 12, attribution: satellite.attribution,
    })
  })

  it('also keeps 2025 satellite imagery free of vector overlays', () => {
    const result = createSatelliteStyle(2025, { ...satellite, date: '2025-02-05' }, palette)
    expect(Object.values(result.sources).every((source) => source.type === 'raster')).toBe(true)
    expect(result.layers.some((layer) => layer.type === 'fill-extrusion' || layer.type === 'symbol')).toBe(false)
  })

  it('rejects missing, wrong-year, impossible-date and malformed scene metadata', () => {
    expect(() => createSatelliteStyle(1998, null, palette)).toThrow('Present-day geography will not be substituted')
    for (const date of ['2025-02-05', '1998', '1998-02-31', '1998-13-05']) {
      expect(() => assertSatelliteScene(1998, { ...satellite, date })).toThrow('acquisition date')
    }
    expect(() => assertSatelliteScene(1998, { ...satellite, tiles: [] })).toThrow('HTTPS')
    expect(() => assertSatelliteScene(1998, { ...satellite, bounds: [79, 17, 78, 18] })).toThrow('bounds')
    expect(() => assertSatelliteScene(1998, { ...satellite, maxZoom: -1 })).toThrow('zoom')
  })

  it('clones source cartography and adds only real source building footprints', () => {
    const before = structuredClone(style)
    const result = createStreetStyle(style, palette, true)
    expect(validateStyleMin(result)).toEqual([])
    expect(style).toEqual(before)
    expect(result.sources.openmaptiles).toMatchObject({ attribution: OPEN_MAP_ATTRIBUTION })
    expect(result.glyphs).toBe(style.glyphs)
    expect(result.layers.find((layer) => layer.id === 'building-top')).toMatchObject({ paint: { 'fill-translate': [0, 0] } })
    expect(result.layers.find((layer) => layer.id === BUILDING_LAYER_ID)).toMatchObject({
      type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building',
    })
    expect(result.layers.find((layer) => layer.id === 'unrelated-overlay')).toEqual(style.layers.at(-1))
  })

  it('retains upstream attribution and does not create 3D buildings in the overview', () => {
    const attributed = structuredClone(style)
    attributed.sources.openmaptiles = { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: 'Original provider attribution' }
    const result = createStreetStyle(attributed, palette, false)
    expect(result.sources.openmaptiles).toMatchObject({ attribution: 'Original provider attribution' })
    expect(result.layers.some((layer) => layer.type === 'fill-extrusion')).toBe(false)
  })

  it('replaces upstream building extrusions instead of drawing duplicate footprints', () => {
    const upstream = structuredClone(style)
    upstream.layers.push({ id: 'upstream-buildings', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building' })
    expect(createStreetStyle(upstream, palette, true).layers.filter((layer) => layer.type === 'fill-extrusion').map((layer) => layer.id)).toEqual([BUILDING_LAYER_ID])
    expect(createStreetStyle(upstream, palette, false).layers.some((layer) => layer.type === 'fill-extrusion')).toBe(false)
  })

  it('adds real, non-exaggerated terrain to the 2025 main map without altering cartography', () => {
    const base = createStreetStyle(style, palette, true)
    const result = withReferenceTerrain(base, 2025, false)
    expect(validateStyleMin(result)).toEqual([])
    expect(result.sources[TERRAIN_SOURCE_ID]).toEqual({
      type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json',
      tileSize: 512, encoding: 'terrarium', attribution: TERRAIN_ATTRIBUTION,
    })
    expect(result.terrain).toEqual({ source: TERRAIN_SOURCE_ID, exaggeration: 1 })
    expect(result.layers).toEqual(base.layers)
    expect(result.sources.openmaptiles).toEqual(base.sources.openmaptiles)
    expect(base.terrain).toBeUndefined()
    expect(base.sources[TERRAIN_SOURCE_ID]).toBeUndefined()
    expect(TERRAIN_ATTRIBUTION).toContain('https://mapterhorn.com/attribution')
    expect(TERRAIN_ATTRIBUTION).toContain('non-dated')
    expect(result.metadata).toMatchObject({ 'atlas:terrain-reference': expect.stringContaining('not a 2025 or historical terrain survey') })
  })

  it('never loads the non-dated DEM in historical maps or either overview size', () => {
    const historical = createSatelliteStyle(1998, satellite, palette)
    expect(withReferenceTerrain(historical, 1998, false)).toBe(historical)
    expect(withReferenceTerrain(historical, 1998, true)).toBe(historical)
    const overview = withReferenceTerrain(createStreetStyle(style, palette, false), 2025, true)
    expect(overview.terrain).toBeUndefined()
    expect(overview.sources[TERRAIN_SOURCE_ID]).toBeUndefined()
    expect(Object.values(historical.sources).every((source) => source.type === 'raster')).toBe(true)
  })

  it('drapes 2025 dated satellite imagery over the labelled reference DEM without vector overlays', () => {
    const imagery = createSatelliteStyle(2025, { ...satellite, date: '2025-02-05' }, palette)
    const result = withReferenceTerrain(imagery, 2025, false)
    expect(validateStyleMin(result)).toEqual([])
    expect(result.layers).toEqual(imagery.layers)
    expect(result.sources[SATELLITE_SOURCE_ID]).toEqual(imagery.sources[SATELLITE_SOURCE_ID])
    expect(Object.values(result.sources).map((source) => source.type)).toEqual(['raster', 'raster-dem'])
    expect(result.terrain?.exaggeration).toBe(1)
  })

  it('uses positive source heights, with a documented six-metre fallback only when absent', () => {
    const building = createStreetStyle(style, palette, true).layers.find((layer) => layer.id === BUILDING_LAYER_ID)
    if (!building || building.type !== 'fill-extrusion') throw new Error('Missing extrusions')
    const parsed = createExpression(building.paint?.['fill-extrusion-height'])
    if (parsed.result !== 'success') throw new Error(JSON.stringify(parsed.value))
    const height = (properties: Record<string, number | string>) => parsed.value.evaluate({ zoom: 16 }, { type: 'Polygon', properties })
    expect(height({ render_height: 45, height: 25 })).toBe(45)
    expect(height({ height: '18' })).toBe(18)
    expect(height({ render_height: 0, height: 12 })).toBe(12)
    expect(height({})).toBe(BUILDING_ESTIMATED_HEIGHT)
    expect(height({ render_height: -10 })).toBe(6)
    expect(building.metadata).toMatchObject({ heightFallback: expect.stringContaining('6 m estimate') })
  })

  it('changes only city, road and label visibility, preserving unrelated layers', () => {
    const result = createStreetStyle(style, palette, true)
    const layers = Object.fromEntries(result.layers.map((layer) => [layer.id, layer]))
    expect(isRoadLayer(layers['highway-primary'])).toBe(true)
    expect(isRoadLayer(layers.railway)).toBe(false)
    expect(layerVisibility(layers['road-label'], { ...visible, showRoads: false })).toBe('none')
    expect(layerVisibility(layers['road-label'], visible)).toBe('visible')
    expect(layerVisibility(layers['water-label'], { ...visible, showLabels: false })).toBe('none')
    expect(layerVisibility(layers[BUILDING_LAYER_ID], { ...visible, showCity: false })).toBe('none')
    expect(layerVisibility(layers.water, { ...visible, showRoads: false })).toBeUndefined()
    expect(layerVisibility(layers.railway, { ...visible, showRoads: false })).toBeUndefined()
    expect(layerVisibility(layers['unrelated-overlay'], visible)).toBeUndefined()
  })
})

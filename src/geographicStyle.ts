import { useLayoutEffect, useRef, useState } from 'react'
import {
  AttributionControl, Map as LibreMap, Marker, NavigationControl, ScaleControl,
  type LayerSpecification, type StyleSpecification,
} from 'maplibre-gl'
import { CITY_MAP_BOUNDS, CITY_MAP_CENTER, OPEN_MAP_STYLE } from './mapTypes'
import type { GeographicLayer, SatelliteScene } from './mapTypes'
import type { Coordinates, Landmark, MapView, TimeOfDay } from './types'

export const BUILDING_ESTIMATED_HEIGHT = 6
export const BUILDING_LAYER_ID = 'atlas-building-extrusions'
export const SATELLITE_SOURCE_ID = 'atlas-dated-imagery'
export const TERRAIN_SOURCE_ID = 'atlas-reference-terrain'
export const TERRAIN_ATTRIBUTION = '<a href="https://mapterhorn.com/attribution">&copy; Mapterhorn</a> (non-dated DEM)'
export const OPEN_MAP_ATTRIBUTION = '<a href="https://openfreemap.org/">OpenFreeMap</a> &middot; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &middot; &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

export type MapPalette = {
  background: string
  surface: string
  soft: string
  border: string
  borderStrong: string
  text: string
  muted: string
  accent: string
  link: string
  success: string
}

export function readMapPalette(element: Element): MapPalette {
  const css = getComputedStyle(element)
  const color = (name: string) => {
    const value = css.getPropertyValue(`--cp-${name}`).trim()
    if (!value) throw new Error(`The map theme is missing --cp-${name}.`)
    return value
  }
  return {
    background: color('bg'), surface: color('surface'), soft: color('surface-soft'),
    border: color('border'), borderStrong: color('border-strong'),
    text: color('text'), muted: color('text-muted'), accent: color('accent'),
    link: color('link'), success: color('success'),
  }
}

export function usesDatedImagery(year: number, layer: GeographicLayer) {
  return year !== 2025 || layer === 'satellite'
}

export function assertSatelliteScene(year: number, scene: SatelliteScene | null): asserts scene is SatelliteScene {
  if (!scene) throw new Error(`No verified, dated ${year} satellite scene is available. Present-day geography will not be substituted.`)
  const date = new Date(`${scene.date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scene.date) || !Number.isFinite(date.getTime())
    || date.toISOString().slice(0, 10) !== scene.date || date.getUTCFullYear() !== year) {
    throw new Error(`The imagery acquisition date must be a verified YYYY-MM-DD date in ${year}; received "${scene.date}".`)
  }
  if (!scene.tiles.length || scene.tiles.some((url) => !url.startsWith('https://'))
    || !scene.sourceUrl.startsWith('https://') || !scene.attribution.trim()) {
    throw new Error('Satellite imagery requires public HTTPS tiles, a source link, and source attribution.')
  }
  const [west, south, east, north] = scene.bounds
  if (!scene.bounds.every(Number.isFinite) || west >= east || south >= north
    || west < -180 || east > 180 || south < -85.051129 || north > 85.051129
    || !Number.isInteger(scene.maxZoom) || scene.maxZoom < 0 || scene.maxZoom > 24) {
    throw new Error('The supplied satellite scene has invalid geographic bounds or native maximum zoom.')
  }
}

export function createSatelliteStyle(year: number, scene: SatelliteScene | null, palette: MapPalette): StyleSpecification {
  assertSatelliteScene(year, scene)
  return {
    version: 8,
    name: `${scene.date} dated satellite imagery`,
    sources: {
      [SATELLITE_SOURCE_ID]: {
        type: 'raster', tiles: [...scene.tiles], tileSize: 256,
        bounds: [...scene.bounds], maxzoom: scene.maxZoom, attribution: scene.attribution,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': palette.background } },
      {
        id: 'atlas-satellite', type: 'raster', source: SATELLITE_SOURCE_ID,
        paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear' },
      },
    ],
  }
}

export function geographicCameraLimits(year: number, layer: GeographicLayer, scene: SatelliteScene | null, overview: boolean) {
  const raster = usesDatedImagery(year, layer)
  let maxZoom = 20
  if (raster) {
    assertSatelliteScene(year, scene)
    maxZoom = Math.min(13, scene.maxZoom)
  }
  return { maxZoom, maxPitch: overview || raster ? 0 : 80 }
}

export function withReferenceTerrain(style: StyleSpecification, year: number, overview: boolean): StyleSpecification {
  if (year !== 2025 || overview) return style
  return {
    ...style,
    sources: {
      ...style.sources,
      [TERRAIN_SOURCE_ID]: {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 512,
        encoding: 'terrarium',
        attribution: TERRAIN_ATTRIBUTION,
      },
    },
    terrain: { source: TERRAIN_SOURCE_ID, exaggeration: 1 },
    metadata: {
      ...(typeof style.metadata === 'object' && style.metadata !== null ? style.metadata : {}),
      'atlas:terrain-reference': 'Non-dated global elevation reference, approximately 30 m; not a 2025 or historical terrain survey.',
    },
  }
}

function isStreetStyle(value: unknown): value is StyleSpecification {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 8
    || !('sources' in value) || typeof value.sources !== 'object' || value.sources === null
    || !('layers' in value) || !Array.isArray(value.layers)) return false
  const sources = value.sources
  return 'openmaptiles' in sources && typeof sources.openmaptiles === 'object'
    && sources.openmaptiles !== null && 'type' in sources.openmaptiles
    && sources.openmaptiles.type === 'vector'
    && value.layers.every((layer: unknown) => typeof layer === 'object' && layer !== null
      && 'id' in layer && typeof layer.id === 'string' && 'type' in layer && typeof layer.type === 'string')
}

function isOpenMapLayer(layer: LayerSpecification) {
  return 'source' in layer && layer.source === 'openmaptiles'
}

function isBuildingLayer(layer: LayerSpecification) {
  return isOpenMapLayer(layer) && 'source-layer' in layer && layer['source-layer'] === 'building'
}

export function isRoadLayer(layer: LayerSpecification) {
  return isOpenMapLayer(layer) && 'source-layer' in layer
    && ['transportation', 'transportation_name'].includes(layer['source-layer'] ?? '')
    && !/(rail|ferry|pier)/i.test(layer.id)
}

export type StreetAppearance = {
  showLabels: boolean
  showRoads: boolean
  showCity: boolean
  timeOfDay: TimeOfDay
}

export function layerVisibility(layer: LayerSpecification, appearance: StreetAppearance): 'none' | 'visible' | undefined {
  if (!isOpenMapLayer(layer)) return undefined
  if (isBuildingLayer(layer)) return appearance.showCity ? 'visible' : 'none'
  if (isRoadLayer(layer) && !appearance.showRoads) return 'none'
  if (layer.type === 'symbol') return appearance.showLabels ? 'visible' : 'none'
  if (isRoadLayer(layer)) return 'visible'
  return undefined
}

function themeLayer(layer: LayerSpecification, palette: MapPalette): LayerSpecification {
  if (layer.type === 'background') {
    return { ...layer, paint: { ...layer.paint, 'background-color': palette.background } }
  }
  if (!isOpenMapLayer(layer)) return layer
  const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : ''
  const water = sourceLayer === 'water' || sourceLayer === 'waterway'
  const vegetation = sourceLayer === 'park' || sourceLayer === 'landcover'
  if (layer.type === 'fill') {
    return {
      ...layer,
      paint: {
        ...layer.paint,
        'fill-color': water ? palette.link : vegetation ? palette.success
          : isBuildingLayer(layer) ? palette.borderStrong : palette.soft,
        ...(water || vegetation ? { 'fill-opacity': water ? .32 : .14 } : {}),
        ...(layer.paint?.['fill-outline-color'] ? { 'fill-outline-color': palette.border } : {}),
        // The upstream decorative building-top offset is not a second footprint.
        ...(isBuildingLayer(layer) ? { 'fill-translate': [0, 0] as [number, number] } : {}),
      },
    }
  }
  if (layer.type === 'line') {
    return {
      ...layer,
      paint: {
        ...layer.paint,
        'line-color': water ? palette.link : isRoadLayer(layer)
          ? /casing/.test(layer.id) ? palette.borderStrong : palette.surface : palette.muted,
      },
    }
  }
  if (layer.type === 'symbol') {
    return {
      ...layer,
      paint: { ...layer.paint, 'text-color': palette.text, 'text-halo-color': palette.surface },
    }
  }
  return layer
}

export function createStreetStyle(base: StyleSpecification, palette: MapPalette, extrusions: boolean): StyleSpecification {
  const style = structuredClone(base)
  const source = style.sources.openmaptiles
  if (!source || source.type !== 'vector') throw new Error('The street style is missing its OpenMapTiles vector source.')
  source.attribution = source.attribution || OPEN_MAP_ATTRIBUTION
  style.layers = style.layers.filter((layer) => !(isBuildingLayer(layer) && layer.type === 'fill-extrusion'))
    .map((layer) => themeLayer(layer, palette))
  if (extrusions) {
    const firstLabel = style.layers.findIndex((layer) => layer.type === 'symbol')
    style.layers.splice(firstLabel < 0 ? style.layers.length : firstLabel, 0, {
      id: BUILDING_LAYER_ID, type: 'fill-extrusion', source: 'openmaptiles',
      'source-layer': 'building', minzoom: 14,
      filter: ['!=', ['get', 'hide_3d'], true],
      metadata: { heightFallback: `${BUILDING_ESTIMATED_HEIGHT} m estimate; source-provided heights may also be estimates.` },
      paint: {
        'fill-extrusion-color': palette.borderStrong,
        'fill-extrusion-opacity': .85,
        'fill-extrusion-height': [
          'case',
          ['>', ['to-number', ['get', 'render_height'], 0], 0], ['to-number', ['get', 'render_height'], 0],
          ['>', ['to-number', ['get', 'height'], 0], 0], ['to-number', ['get', 'height'], 0],
          BUILDING_ESTIMATED_HEIGHT,
        ],
        'fill-extrusion-base': ['max', 0, ['to-number', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0], 0]],
      },
    })
  }
  return style
}

export function applyStreetAppearance(map: LibreMap, appearance: StreetAppearance) {
  for (const layer of map.getStyle().layers) {
    const visibility = layerVisibility(layer, appearance)
    if (visibility !== undefined && layer.layout?.visibility !== visibility) {
      map.setLayoutProperty(layer.id, 'visibility', visibility)
    }
  }
  if (map.getLayer(BUILDING_LAYER_ID)) {
    map.setLight({
      anchor: 'viewport',
      position: appearance.timeOfDay === 'golden' ? [1.5, 245, 65] : [1.5, 210, 30],
      intensity: appearance.timeOfDay === 'night' ? .18 : .45,
    })
  }
}

export function applyMapPalette(map: LibreMap, palette: MapPalette) {
  for (const layer of map.getStyle().layers) {
    const themed = themeLayer(layer, palette)
    if (themed !== layer && 'paint' in themed) {
      for (const [name, value] of Object.entries(themed.paint ?? {})) {
        if (name.endsWith('-color')) map.setPaintProperty(layer.id, name, value)
      }
    }
  }
  if (map.getLayer(BUILDING_LAYER_ID)) map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-color', palette.borderStrong)
  for (const [id, property, color] of [
    ['atlas-viewport-fill', 'fill-color', palette.accent],
    ['atlas-viewport-outline', 'line-color', palette.accent],
    ['atlas-view-center', 'circle-color', palette.accent],
    ['atlas-view-center', 'circle-stroke-color', palette.surface],
  ]) {
    if (map.getLayer(id)) map.setPaintProperty(id, property, color)
  }
}

export function readMapView(map: LibreMap): MapView {
  const center = map.getCenter().wrap()
  const bounds = map.getBounds()
  return {
    center: [center.lng, center.lat],
    bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
    zoom: map.getZoom(), bearing: map.getBearing(),
  }
}

export function motionDuration(milliseconds: number) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds
}

export function addLandmarkMarkers(map: LibreMap, options: {
  landmarks: Landmark[]
  year: number
  selectedId: string | null
  showLabels: boolean
  compact?: boolean
  onSelect: (id: string) => void
}) {
  const markers = options.landmarks.filter((landmark) => landmark.visibleFrom <= options.year).map((landmark) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `geographic-landmark${options.compact ? ' is-compact' : ''}${options.showLabels ? ' shows-label' : ''}`
    button.classList.toggle('is-selected', landmark.id === options.selectedId)
    button.dataset.landmarkId = landmark.id
    button.setAttribute('aria-label', `Explore ${landmark.name}`)
    button.setAttribute('aria-pressed', String(landmark.id === options.selectedId))
    button.title = landmark.name
    const label = document.createElement('span')
    label.className = 'geographic-landmark-label'
    label.textContent = landmark.name
    label.setAttribute('aria-hidden', 'true')
    button.append(label)
    const select = (event: MouseEvent) => {
      event.stopPropagation()
      options.onSelect(landmark.id)
    }
    const stop = (event: Event) => event.stopPropagation()
    button.addEventListener('click', select)
    button.addEventListener('dblclick', stop)
    button.addEventListener('pointerdown', stop)
    button.addEventListener('mousedown', stop)
    button.addEventListener('touchstart', stop)
    button.addEventListener('keydown', stop)
    const marker = new Marker({ element: button, anchor: 'center' })
      .setLngLat([landmark.coordinates[0], landmark.coordinates[1]]).addTo(map)
    const remove = () => {
      button.removeEventListener('click', select)
      button.removeEventListener('dblclick', stop)
      button.removeEventListener('pointerdown', stop)
      button.removeEventListener('mousedown', stop)
      button.removeEventListener('touchstart', stop)
      button.removeEventListener('keydown', stop)
      marker.remove()
    }
    return { button, landmark, remove }
  })
  const updateLabels = () => {
    if (options.compact || !options.showLabels) return
    const occupied: Array<{ left: number; right: number; top: number; bottom: number }> = []
    const ordered = [...markers].sort((a, b) => Number(b.landmark.id === options.selectedId) - Number(a.landmark.id === options.selectedId))
    for (const { button, landmark } of ordered) {
      const point = map.project([landmark.coordinates[0], landmark.coordinates[1]])
      const box = { left: point.x + 24, right: point.x + 24 + Math.min(164, landmark.name.length * 6 + 14), top: point.y - 13, bottom: point.y + 13 }
      const overlaps = occupied.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)
      button.classList.toggle('label-obscured', overlaps)
      if (!overlaps) occupied.push(box)
    }
  }
  map.on('move', updateLabels)
  updateLabels()
  return () => {
    map.off('move', updateLabels)
    markers.forEach((item) => item.remove())
  }
}

export function addDestinationMarker(map: LibreMap, coordinates: Coordinates) {
  const element = document.createElement('span')
  element.className = 'geographic-destination'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', `Destination: ${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`)
  element.title = 'Your destination'
  return new Marker({ element, anchor: 'center' }).setLngLat([coordinates[0], coordinates[1]]).addTo(map)
}

type GeographicMapOptions = {
  year: number
  layer: GeographicLayer
  satellite: SatelliteScene | null
  overview: boolean
  onLoad?: (map: LibreMap) => void
  onReady?: (map: LibreMap) => void
  onLoading?: () => void
  onMoveEnd?: (map: LibreMap) => void
  onNavigate: (coordinates: Coordinates) => void
  onError?: (message: string) => void
}

// Shared lifecycle keeps the main map and overview on the same chronology rules.
export function useGeographicMap(options: GeographicMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const latest = useRef(options)
  latest.current = options
  const [loadedMap, setLoadedMap] = useState<{ map: LibreMap; key: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rememberedView = useRef<MapView | null>(null)
  const raster = usesDatedImagery(options.year, options.layer)
  const sceneKey = raster ? JSON.stringify(options.satellite) : ''
  const mapKey = `${options.year}|${options.overview}|${raster}|${sceneKey}`

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false
    let failed = false
    let map: LibreMap | null = null
    let resizeObserver: ResizeObserver | undefined
    let themeObserver: MutationObserver | undefined
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    const abort = new AbortController()
    setLoadedMap(null)
    setError(null)
    latest.current.onLoading?.()
    const fail = (message: string) => {
      if (disposed || failed) return
      failed = true
      clearTimeout(readyTimer)
      if (map) map.getCanvas().dataset.ready = 'false'
      setError(message)
      latest.current.onError?.(message)
    }
    readyTimer = setTimeout(() => {
      abort.abort()
      fail('Map data did not finish loading. Check the connection or retry; no substitute geography has been shown.')
    }, 45000)
    const initialize = async () => {
      try {
        const initial = latest.current
        const palette = readMapPalette(container)
        let style: StyleSpecification
        if (raster) {
          style = createSatelliteStyle(initial.year, initial.satellite, palette)
        } else {
          const response = await fetch(OPEN_MAP_STYLE, { signal: abort.signal })
          if (!response.ok) throw new Error(`OpenFreeMap style request failed (HTTP ${response.status}).`)
          const base: unknown = await response.json()
          if (!isStreetStyle(base)) throw new Error('OpenFreeMap returned an unsupported or invalid vector style.')
          style = createStreetStyle(base, palette, !initial.overview)
        }
        style = withReferenceTerrain(style, initial.year, initial.overview)
        if (disposed) return
        const previous = rememberedView.current
        const limits = geographicCameraLimits(initial.year, initial.layer, initial.satellite, initial.overview)
        map = new LibreMap({
          container, style, attributionControl: false,
          center: previous ? [...previous.center] : [...CITY_MAP_CENTER],
          zoom: Math.min(previous?.zoom ?? (initial.overview ? 9 : 12), limits.maxZoom),
          bearing: previous?.bearing ?? 0,
          pitch: initial.overview || raster ? 0 : 48,
          maxZoom: limits.maxZoom,
          minZoom: 1, maxPitch: limits.maxPitch,
          renderWorldCopies: false, canvasContextAttributes: { antialias: !initial.overview },
          fadeDuration: motionDuration(200),
        })
        const current = map
        const canvas = current.getCanvas()
        canvas.dataset.engine = 'maplibre'
        canvas.dataset.era = String(initial.year)
        canvas.dataset.ready = 'false'
        canvas.dataset.terrain = style.terrain ? 'non-dated-reference' : 'none'
        canvas.setAttribute('aria-label', `${initial.overview ? 'City overview' : 'Geographic map'}, ${initial.year}. Arrow keys pan; plus and minus zoom. Click a location to navigate.`)
        current.addControl(new AttributionControl({ compact: false }), 'bottom-left')
        current.addControl(new ScaleControl({ maxWidth: initial.overview ? 75 : 120, unit: 'metric' }), 'bottom-left')
        current.addControl(new NavigationControl({ showZoom: initial.overview, showCompass: !initial.overview, visualizePitch: !initial.overview }), 'top-right')
        let ready = false
        const sourceId = raster ? SATELLITE_SOURCE_ID : 'openmaptiles'
        const requiredSources = [sourceId, ...(style.terrain ? [TERRAIN_SOURCE_ID] : [])]
        current.on('load', () => {
          if (disposed || failed) return
          try {
            applyMapPalette(current, readMapPalette(container))
            if (initial.overview && !previous) {
              current.fitBounds(CITY_MAP_BOUNDS, {
                padding: { top: 20, right: 32, bottom: 38, left: 10 },
                duration: 0,
              })
            }
            latest.current.onLoad?.(current)
            setLoadedMap({ map: current, key: mapKey })
            if (!current.isMoving()) emitView()
          } catch (cause) {
            fail(`Geographic map setup failed: ${cause instanceof Error ? cause.message : String(cause)}`)
          }
        })
        const emitView = () => {
          if (disposed) return
          const view = readMapView(current)
          rememberedView.current = view
          canvas.dataset.cameraLongitude = String(view.center[0])
          canvas.dataset.cameraLatitude = String(view.center[1])
          canvas.dataset.cameraZoom = String(view.zoom)
          canvas.dataset.cameraPitch = String(current.getPitch())
          canvas.dataset.center = view.center.join(',')
          container.dataset.center = view.center.join(',')
          latest.current.onMoveEnd?.(current)
        }
        current.on('moveend', emitView)
        current.on('click', (event) => {
          const point = event.lngLat.wrap()
          latest.current.onNavigate([point.lng, point.lat])
        })
        current.on('idle', () => {
          canvas.dataset.tilesLoaded = String(current.areTilesLoaded())
          if (current.getLayer(BUILDING_LAYER_ID)) {
            canvas.dataset.mappedBuildings = String(current.queryRenderedFeatures({ layers: [BUILDING_LAYER_ID] }).length)
          }
          if (!ready && !failed && current.isStyleLoaded() && current.areTilesLoaded()
            && requiredSources.every((id) => current.isSourceLoaded(id))) {
            ready = true
            canvas.dataset.ready = 'true'
            clearTimeout(readyTimer)
            latest.current.onReady?.(current)
          }
        })
        current.on('movestart', () => { canvas.dataset.tilesLoaded = 'false' })
        current.on('error', (event) => fail(`Geographic map data could not be loaded: ${event.error.message}`))
        current.on('webglcontextlost', () => fail('The geographic map lost its graphics context. Retry the map to continue.'))
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) current.resize()
        })
        resizeObserver.observe(container)
        themeObserver = new MutationObserver(() => {
          if (!current.isStyleLoaded()) return
          try {
            applyMapPalette(current, readMapPalette(container))
          } catch (cause) {
            fail(`Map theme could not be applied: ${cause instanceof Error ? cause.message : String(cause)}`)
          }
        })
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] })
      } catch (cause) {
        if (!disposed) fail(`Geographic map unavailable: ${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }
    void initialize()
    return () => {
      disposed = true
      abort.abort()
      clearTimeout(readyTimer)
      resizeObserver?.disconnect()
      themeObserver?.disconnect()
      map?.remove()
    }
  }, [mapKey])

  return { containerRef, map: loadedMap?.key === mapKey ? loadedMap.map : null, error }
}

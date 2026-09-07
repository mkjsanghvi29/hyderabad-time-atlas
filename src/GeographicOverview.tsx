import { useEffect, useRef } from 'react'
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl'
import type { FeatureCollection, Geometry } from 'geojson'
import type { SatelliteScene } from './mapTypes'
import type { Coordinates, Landmark, MapView } from './types'
import { validCoordinates } from './navigation'
import {
  addDestinationMarker, addLandmarkMarkers, readMapPalette, useGeographicMap,
} from './geographicStyle'
import 'maplibre-gl/dist/maplibre-gl.css'
import './GeographicScene.css'

export type GeographicOverviewProps = {
  year: number
  landmarks: Landmark[]
  selectedId: string | null
  destination: Coordinates | null
  view: MapView | null
  satellite: SatelliteScene | null
  onSelect: (id: string) => void
  onNavigate: (coordinates: Coordinates) => void
  expanded?: boolean
  onError?: (message: string) => void
}

function viewportData(view: MapView | null): FeatureCollection<Geometry> {
  if (!view) return { type: 'FeatureCollection', features: [] }
  const [west, south, east, north] = view.bounds
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature', properties: { kind: 'viewport' },
        geometry: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
      },
      {
        type: 'Feature', properties: { kind: 'center' },
        geometry: { type: 'Point', coordinates: [...view.center] },
      },
    ],
  }
}

function setViewport(map: LibreMap, view: MapView | null) {
  const data = viewportData(view)
  const source = map.getSource<GeoJSONSource>('atlas-current-viewport')
  if (source) {
    source.setData(data)
    return
  }
  const palette = readMapPalette(map.getContainer())
  map.addSource('atlas-current-viewport', { type: 'geojson', data })
  map.addLayer({
    id: 'atlas-viewport-fill', type: 'fill', source: 'atlas-current-viewport',
    filter: ['==', ['get', 'kind'], 'viewport'],
    paint: { 'fill-color': palette.accent, 'fill-opacity': .1 },
  })
  map.addLayer({
    id: 'atlas-viewport-outline', type: 'line', source: 'atlas-current-viewport',
    filter: ['==', ['get', 'kind'], 'viewport'],
    paint: { 'line-color': palette.accent, 'line-width': 1.5, 'line-dasharray': [3, 2] },
  })
  map.addLayer({
    id: 'atlas-view-center', type: 'circle', source: 'atlas-current-viewport',
    filter: ['==', ['get', 'kind'], 'center'],
    paint: {
      'circle-color': palette.accent, 'circle-radius': 4,
      'circle-stroke-color': palette.surface, 'circle-stroke-width': 2,
    },
  })
}

export default function GeographicOverview(props: GeographicOverviewProps) {
  const latest = useRef(props)
  latest.current = props
  const { containerRef, map, error } = useGeographicMap({
    year: props.year, layer: 'streets', satellite: props.satellite, overview: true,
    onNavigate: (coordinates) => latest.current.onNavigate(coordinates),
    onError: (message) => latest.current.onError?.(message),
    onLoad: (loaded) => setViewport(loaded, latest.current.view),
  })

  useEffect(() => {
    if (map) setViewport(map, props.view)
  }, [map, props.view])

  useEffect(() => {
    if (!map) return
    return addLandmarkMarkers(map, {
      landmarks: props.landmarks, year: props.year, selectedId: props.selectedId,
      showLabels: false, compact: true, onSelect: (id) => latest.current.onSelect(id),
    })
  }, [map, props.landmarks, props.year, props.selectedId])

  useEffect(() => {
    if (!map || !props.destination) return
    if (!validCoordinates(props.destination)) {
      latest.current.onError?.('The overview destination has invalid geographic coordinates.')
      return
    }
    const marker = addDestinationMarker(map, props.destination)
    return () => { marker.remove() }
  }, [map, props.destination])

  useEffect(() => {
    map?.resize()
  }, [map, props.expanded])

  useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()
    const keyboardContainer = map.getCanvasContainer()
    const isolateMapKeys = (event: KeyboardEvent) => {
      if (document.activeElement === canvas
        && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) event.stopPropagation()
    }
    keyboardContainer.addEventListener('keydown', isolateMapKeys)
    return () => keyboardContainer.removeEventListener('keydown', isolateMapKeys)
  }, [map])

  return (
    <div
      className={`geographic-overview${props.expanded ? ' is-expanded' : ''}`}
      data-testid="geographic-overview"
      data-engine="maplibre"
      data-era={props.year}
      aria-label={`Interactive ${props.year} city overview`}
    >
      <div ref={containerRef} className="geographic-map-canvas" />
      <p className="geographic-overview-legend">
        <span className="geographic-viewport-key" aria-hidden="true" /> Viewport bounds
        {props.destination && <><span className="geographic-destination-key" aria-hidden="true" /> Destination</>}
      </p>
      {error && <p className="geographic-map-error" role="alert">{error}</p>}
    </div>
  )
}

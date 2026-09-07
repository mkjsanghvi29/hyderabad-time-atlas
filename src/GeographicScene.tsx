import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Map as LibreMap } from 'maplibre-gl'
import { districtsInEra, nearestDistrict } from './city'
import { CITY_MAP_BOUNDS, CITY_MAP_CENTER } from './mapTypes'
import type { GeographicLayer, SatelliteScene } from './mapTypes'
import { validCoordinates } from './navigation'
import {
  addDestinationMarker, addLandmarkMarkers, applyStreetAppearance, motionDuration,
  readMapView, useGeographicMap, usesDatedImagery,
} from './geographicStyle'
import type { AtlasSceneHandle, AtlasSceneProps, Coordinates } from './types'
import 'maplibre-gl/dist/maplibre-gl.css'
import './GeographicScene.css'

export type GeographicSceneProps = AtlasSceneProps & {
  layer: GeographicLayer
  satellite: SatelliteScene | null
  destination: Coordinates | null
  destinationZoom?: number
  onNavigate: (coordinates: Coordinates) => void
  onError: (message: string) => void
}

type CameraCommand =
  | { type: 'focus'; id: string }
  | { type: 'travel'; id: string }
  | { type: 'locate'; coordinates: Coordinates; zoom?: number }
  | { type: 'home' | 'region' }
  | { type: 'zoom'; direction: 'in' | 'out' }
  | { type: 'move'; direction: 'forward' | 'backward' | 'left' | 'right' }

const GeographicScene = forwardRef<AtlasSceneHandle, GeographicSceneProps>(function GeographicScene(props, forwardedRef) {
  const latest = useRef(props)
  latest.current = props
  const liveMap = useRef<LibreMap | null>(null)
  const queuedCommands = useRef<CameraCommand[]>([])
  const commandFrame = useRef<number | null>(null)
  const lastDistrict = useRef<string | null>(null)
  const selectedAtLoad = useRef<string | null>(null)
  const cameraApplied = useRef<{ map: LibreMap; mode: AtlasSceneProps['cameraMode'] } | null>(null)
  const reportedError = useRef(false)
  const pendingGuided = useRef<{ id: number; coordinates: Coordinates } | null>(null)
  const guidedApplied = useRef<number | null>(null)

  const reportError = (message: string) => {
    reportedError.current = true
    latest.current.onStatus('unavailable')
    latest.current.onError(message)
  }
  const execute = (map: LibreMap, command: CameraCommand, immediate = false) => {
    const current = latest.current
    const raster = usesDatedImagery(current.era.year, current.layer)
    const walking = !raster && current.cameraMode === 'walk'
    const locate = (coordinates: Coordinates, zoom = raster ? 12.5 : walking ? 18 : 16) => {
      if (!validCoordinates(coordinates)) {
        reportError('That destination has invalid longitude or latitude coordinates.')
        return
      }
      cameraApplied.current = { map, mode: current.cameraMode }
      map.flyTo({
        center: [...coordinates], zoom: Math.min(zoom, map.getMaxZoom()),
        pitch: raster ? 0 : walking ? 74 : 52,
        duration: immediate ? 0 : motionDuration(1100),
      })
    }
    switch (command.type) {
      case 'focus': {
        const landmark = current.landmarks.find((place) => place.id === command.id && place.visibleFrom <= current.era.year)
        if (landmark) locate(landmark.coordinates)
        else reportError(`Landmark "${command.id}" is not available in ${current.era.year}.`)
        break
      }
      case 'travel': {
        const district = districtsInEra(current.era.year).find((area) => area.id === command.id)
        if (district) locate(district.coordinates, walking ? 17 : 14)
        else reportError(`District "${command.id}" is not available in ${current.era.year}.`)
        break
      }
      case 'locate': locate(command.coordinates, command.zoom); break
      case 'home': locate(CITY_MAP_CENTER, 12); break
      case 'region':
        cameraApplied.current = { map, mode: current.cameraMode }
        map.fitBounds(CITY_MAP_BOUNDS, { padding: 48, pitch: 0, bearing: 0, duration: immediate ? 0 : motionDuration(1000) })
        break
      case 'zoom': map.zoomTo(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + (command.direction === 'in' ? 1 : -1))), { duration: immediate ? 0 : motionDuration(240) }); break
      case 'move': {
        const distance = walking ? 80 : 160
        const offset: [number, number] = command.direction === 'left' ? [-distance, 0]
          : command.direction === 'right' ? [distance, 0]
            : command.direction === 'forward' ? [0, -distance] : [0, distance]
        map.panBy(offset, { duration: immediate ? 0 : motionDuration(200) })
        break
      }
    }
  }
  const commandRef = useRef(execute)
  commandRef.current = execute
  const dispatch = (command: CameraCommand) => {
    queuedCommands.current.push(command)
    if (liveMap.current && commandFrame.current === null) {
      // Let a same-event mode/selection update commit before applying the camera command.
      commandFrame.current = requestAnimationFrame(() => {
        commandFrame.current = null
        const currentMap = liveMap.current
        if (!currentMap) return
        const pending = queuedCommands.current.splice(0)
        pending.forEach((item, index) => commandRef.current(currentMap, item, index < pending.length - 1))
      })
    }
  }

  useImperativeHandle(forwardedRef, () => ({
    focus: (id) => dispatch({ type: 'focus', id }),
    travel: (id) => dispatch({ type: 'travel', id }),
    locate: (coordinates, zoom) => dispatch({ type: 'locate', coordinates, zoom }),
    home: () => dispatch({ type: 'home' }),
    region: () => dispatch({ type: 'region' }),
    zoom: (direction) => { latest.current.onExplore?.(); dispatch({ type: 'zoom', direction }) },
    move: (direction) => { latest.current.onExplore?.(); dispatch({ type: 'move', direction }) },
  }), [])

  const { containerRef, map } = useGeographicMap({
    year: props.era.year, layer: props.layer, satellite: props.satellite, overview: false,
    onLoading: () => {
      liveMap.current = null
      reportedError.current = false
      if (commandFrame.current !== null) cancelAnimationFrame(commandFrame.current)
      commandFrame.current = null
      lastDistrict.current = null
      latest.current.onStatus('loading')
    },
    onLoad: (loaded) => {
      liveMap.current = loaded
      applyStreetAppearance(loaded, latest.current)
      cameraApplied.current = { map: loaded, mode: latest.current.cameraMode }
      const pending = queuedCommands.current.splice(0)
      selectedAtLoad.current = latest.current.selectedId
      if (pending.length) pending.forEach((command) => commandRef.current(loaded, command, true))
      else if (latest.current.destination) commandRef.current(loaded, { type: 'locate', coordinates: latest.current.destination, zoom: latest.current.destinationZoom })
      else if (latest.current.selectedId) commandRef.current(loaded, { type: 'focus', id: latest.current.selectedId })
      else if (latest.current.cameraMode === 'walk' && !usesDatedImagery(latest.current.era.year, latest.current.layer)) {
        loaded.jumpTo({ pitch: 74, zoom: Math.min(18, loaded.getMaxZoom()) })
      }
    },
    onReady: () => {
      if (!reportedError.current) latest.current.onStatus('ready')
    },
    onError: reportError,
    onNavigate: (coordinates) => latest.current.onNavigate(coordinates),
    onExplore: () => latest.current.onExplore?.(),
    onIdle: (current) => {
      const pending = pendingGuided.current
      if (!pending || latest.current.guidedVisit?.requestId !== pending.id) return
      const center = current.getCenter()
      if (Math.abs(center.lng - pending.coordinates[0]) > .0002 || Math.abs(center.lat - pending.coordinates[1]) > .0002) return
      pendingGuided.current = null
      current.getCanvas().dataset.guidedArrival = String(pending.id)
      latest.current.onGuidedArrival?.(pending.id)
    },
    onMoveEnd: (current) => {
      const view = readMapView(current)
      latest.current.onViewChange?.(view)
      const district = nearestDistrict(view.center, latest.current.era.year)
      if (!district) return
      const eastWest = (view.center[0] - district.coordinates[0]) * 111.32 * Math.cos(view.center[1] * Math.PI / 180)
      const northSouth = (view.center[1] - district.coordinates[1]) * 111.32
      // These are neighbourhood anchors, not boundaries or an all-city nearest-label tessellation.
      const nearby = Math.hypot(eastWest / district.radius[0], northSouth / district.radius[1]) <= 1.4
      if (nearby && district.id !== lastDistrict.current) {
        lastDistrict.current = district.id
        latest.current.onDistrictChange?.(district.id)
      } else if (!nearby) lastDistrict.current = null
    },
  })

  useEffect(() => () => {
    if (commandFrame.current !== null) cancelAnimationFrame(commandFrame.current)
    commandFrame.current = null
    liveMap.current = null
  }, [])

  useEffect(() => {
    if (!map) return
    applyStreetAppearance(map, props)
  }, [map, props.showLabels, props.showCity, props.showRoads, props.timeOfDay])

  useEffect(() => {
    if (!map) return
    return addLandmarkMarkers(map, {
      landmarks: props.landmarks, year: props.era.year, selectedId: props.selectedId,
      showLabels: props.showLabels, onSelect: (id) => latest.current.onSelect(id),
    })
  }, [map, props.landmarks, props.era.year, props.selectedId, props.showLabels])

  useEffect(() => {
    if (!map || !props.destination) return
    if (!validCoordinates(props.destination)) {
      reportError('The selected destination has invalid geographic coordinates.')
      return
    }
    const marker = addDestinationMarker(map, props.destination)
    return () => { marker.remove() }
  }, [map, props.destination])

  useEffect(() => {
    if (!map || props.selectedId === selectedAtLoad.current) return
    selectedAtLoad.current = props.selectedId
    if (!props.selectedId) return
    commandRef.current(map, { type: 'focus', id: props.selectedId })
  }, [map, props.selectedId])

  useEffect(() => {
    if (!map) return
    if (cameraApplied.current?.map === map && cameraApplied.current.mode === props.cameraMode) return
    cameraApplied.current = { map, mode: props.cameraMode }
    const raster = usesDatedImagery(props.era.year, props.layer)
    const walking = !raster && props.cameraMode === 'walk'
    map.easeTo({
      pitch: raster ? 0 : walking ? 74 : 48,
      ...(walking ? { zoom: Math.min(Math.max(map.getZoom(), 17.5), map.getMaxZoom()) } : {}),
      duration: motionDuration(450),
    })
  }, [map, props.cameraMode, props.era.year, props.layer])

  useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()
    const keyboardContainer = map.getCanvasContainer()
    const keydown = (event: KeyboardEvent) => {
      if (document.activeElement !== canvas || event.altKey || event.ctrlKey || event.metaKey) return
      const directions = { w: 'forward', s: 'backward', a: 'left', d: 'right' } as const
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 's' || key === 'a' || key === 'd') {
        latest.current.onExplore?.()
        event.preventDefault()
        event.stopPropagation()
        commandRef.current(map, { type: 'move', direction: directions[key] })
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) {
        event.stopPropagation()
      }
    }
    // MapLibre's own keyboard handler runs on this container before this listener.
    keyboardContainer.addEventListener('keydown', keydown)
    return () => {
      keyboardContainer.removeEventListener('keydown', keydown)
      if (liveMap.current === map) liveMap.current = null
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const visit = props.guidedVisit
    if (!visit) {
      if (pendingGuided.current) map.stop()
      pendingGuided.current = null
      guidedApplied.current = null
      return
    }
    if (visit.year !== props.era.year || guidedApplied.current === visit.requestId) return
    const target = visit.target.kind === 'landmark'
      ? props.landmarks.find((place) => place.id === visit.target.id)
      : districtsInEra(props.era.year).find((district) => district.id === visit.target.id)
    if (!target) { reportError('The guided-tour destination is not available in this chapter.'); return }
    guidedApplied.current = visit.requestId
    pendingGuided.current = { id: visit.requestId, coordinates: target.coordinates }
    commandRef.current(map, visit.target.kind === 'landmark'
      ? { type: 'focus', id: visit.target.id } : { type: 'travel', id: visit.target.id })
  }, [map, props.guidedVisit, props.era.year, props.landmarks])

  useEffect(() => {
    if (!map) return
    const enabled = !!props.cinematicMotion && !usesDatedImagery(props.era.year, props.layer)
      && !matchMedia('(prefers-reduced-motion: reduce)').matches
    map.getCanvas().dataset.cinematic = String(enabled)
    if (!enabled) return
    let stopped = false
    const rotate = () => {
      if (!stopped) map.easeTo({ bearing: map.getBearing() + 6, duration: 12_000, easing: (value) => value })
    }
    map.on('moveend', rotate)
    rotate()
    return () => { stopped = true; map.off('moveend', rotate); map.stop() }
  }, [map, props.cinematicMotion, props.era.year, props.layer])

  return (
    <div className="geographic-scene" data-engine="maplibre" data-era={props.era.year} data-layer={usesDatedImagery(props.era.year, props.layer) ? 'satellite' : 'streets'}>
      <div ref={containerRef} className="geographic-map-canvas" />
    </div>
  )
})

export default GeographicScene

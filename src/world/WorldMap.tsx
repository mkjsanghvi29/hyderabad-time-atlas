import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { Map as LibreMap } from 'maplibre-gl'
import {
  addDestinationMarker, addLandmarkMarkers, applyStreetAppearance, motionDuration, readMapView, useGeographicMap,
} from '../geographicStyle'
import type { AtlasSceneHandle, Coordinates } from '../types'
import { placesInChapter } from './geography'
import type { CitySceneProps } from './types'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../GeographicScene.css'

export default forwardRef<AtlasSceneHandle, CitySceneProps>(function WorldMap(props, ref) {
  const latest = useRef(props)
  latest.current = props
  const region = useMemo(() => ({ name: props.city.name, center: props.city.center, bounds: props.city.mapBounds }), [props.city])
  const places = useMemo(() => placesInChapter(props.city, props.chapter.year), [props.city, props.chapter.year])
  const locate = (map: LibreMap, coordinates: Coordinates, zoom = 16) => map.flyTo({
    center: [...coordinates], zoom, pitch: latest.current.cameraMode === 'walk' ? 72 : 48, duration: motionDuration(1100),
  })
  const { containerRef, map } = useGeographicMap({
    region, year: props.chapter.year, layer: 'streets', satellite: null, overview: false,
    onNavigate: (coordinates) => latest.current.onNavigate(coordinates),
    onLoading: () => latest.current.onStatus('loading'),
    onReady: () => latest.current.onStatus('ready'),
    onError: (message) => { latest.current.onStatus('unavailable'); latest.current.onError(message) },
    onMoveEnd: (current) => latest.current.onViewChange(readMapView(current)),
    onLoad: (loaded) => {
      const current = latest.current
      loaded.getCanvas().dataset.city = current.city.id
      loaded.jumpTo({ center: [...current.chapter.focus], zoom: 14, pitch: 48 })
      applyStreetAppearance(loaded, { ...current, showCity: true, showRoads: true })
    },
  })
  useImperativeHandle(ref, () => ({
    focus: (id) => { const place = places.find((entry) => entry.id === id); if (map && place) locate(map, place.coordinates) },
    travel: (name) => { const district = props.city.districts.find((entry) => entry.name === name); if (map && district) locate(map, district.coordinates, 14) },
    locate: (coordinates, zoom) => { if (map) locate(map, coordinates, zoom) },
    home: () => { if (map) locate(map, props.chapter.focus, 14) },
    region: () => map?.fitBounds([...region.bounds], { padding: 50, pitch: 0, bearing: 0, duration: motionDuration(900) }),
    zoom: (direction) => map?.zoomTo(Math.max(1, Math.min(20, map.getZoom() + (direction === 'in' ? 1 : -1))), { duration: motionDuration(250) }),
    move: (direction) => map?.panBy(direction === 'forward' ? [0, -100] : direction === 'backward' ? [0, 100] : direction === 'left' ? [-100, 0] : [100, 0], { duration: motionDuration(220) }),
  }), [map, places, props.city, props.chapter, region])

  useEffect(() => {
    if (!map) return
    if (props.destination) locate(map, props.destination, props.destinationZoom)
    else {
      const selected = places.find((place) => place.id === props.selectedId)
      if (selected) locate(map, selected.coordinates)
      else {
        const pitch = props.cameraMode === 'walk' ? 72 : 48
        if (Math.abs(map.getPitch() - pitch) > .1) map.easeTo({ pitch, duration: motionDuration(400) })
      }
    }
  }, [map, places, props.selectedId, props.destination, props.destinationZoom, props.cameraMode])
  useEffect(() => {
    if (!map) return
    applyStreetAppearance(map, { ...props, showCity: true, showRoads: true })
  }, [map, props.timeOfDay, props.showLabels])
  useEffect(() => {
    if (!map) return
    return addLandmarkMarkers(map, {
      landmarks: places, year: props.chapter.year, selectedId: props.selectedId, showLabels: props.showLabels,
      onSelect: (id) => latest.current.onSelect(id),
    })
  }, [map, places, props.chapter.year, props.selectedId, props.showLabels])
  useEffect(() => {
    if (!map || !props.destination) return
    const marker = addDestinationMarker(map, props.destination)
    return () => { marker.remove() }
  }, [map, props.destination])
  useEffect(() => {
    if (!map) return
    const canvas = map.getCanvas()
    const move = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (document.activeElement !== canvas || !['w', 'a', 's', 'd'].includes(key)) return
      event.preventDefault()
      event.stopPropagation()
      map.panBy(key === 'w' ? [0, -100] : key === 's' ? [0, 100] : key === 'a' ? [-100, 0] : [100, 0], { duration: motionDuration(160) })
    }
    canvas.addEventListener('keydown', move)
    return () => canvas.removeEventListener('keydown', move)
  }, [map])

  return <div className="geographic-scene" data-city={props.city.id} data-era={props.chapter.year}>
    <div className="geographic-map-canvas" ref={containerRef} />
  </div>
})

import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { readMapPalette } from '../geographicStyle'
import type { AtlasSceneHandle, CameraMode, Coordinates } from '../types'
import { placesInChapter, projectCity, unprojectCity } from './geography'
import {
  buildHistoricalWorld, historicalBounds, historicalPalette, landmarkRadius,
  type HistoricalWorld,
} from './historicalModels'
import type { CityChapter, CitySceneProps } from './types'
import './WorldHistoricalScene.css'

type Runtime = AtlasSceneHandle & {
  rebuild: (chapter: CityChapter) => void
  appearance: () => void
  mode: (mode: CameraMode) => void
  selection: () => void
}
type Flight = { position: THREE.Vector3; target: THREE.Vector3 }
type LabelBox = { x: number; y: number; width: number; height: number }
type MoveDirection = Parameters<AtlasSceneHandle['move']>[0]
const KEY_DIRECTIONS: Readonly<Record<string, MoveDirection | undefined>> = {
  arrowup: 'forward', w: 'forward', arrowdown: 'backward', s: 'backward',
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
}

const WorldHistoricalScene = forwardRef<AtlasSceneHandle, CitySceneProps>(function WorldHistoricalScene(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null), canvasRef = useRef<HTMLCanvasElement>(null)
  const labels = useRef(new Map<string, HTMLButtonElement>())
  const latest = useRef(props), runtime = useRef<Runtime | null>(null)
  const descriptionId = useId()
  latest.current = props
  const activePlaces = useMemo(() => placesInChapter(props.city, props.chapter.year), [props.city, props.chapter.year])

  useImperativeHandle(ref, () => ({
    focus: (id) => runtime.current?.focus(id),
    travel: (id) => runtime.current?.travel(id),
    locate: (coordinates, zoom) => runtime.current?.locate(coordinates, zoom),
    home: () => runtime.current?.home(),
    region: () => runtime.current?.region(),
    zoom: (direction) => runtime.current?.zoom(direction),
    move: (direction) => runtime.current?.move(direction),
  }), [])

  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current
    if (!host || !canvas) return
    const city = props.city, bounds = historicalBounds(city)
    const disposers: (() => void)[] = []
    let disposed = false, failed = false, frame = 0
    let world: HistoricalWorld | null = null
    const cleanup = () => {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      runtime.current = null
      world?.dispose()
      world = null
      for (const dispose of disposers.reverse()) dispose()
      for (const label of labels.current.values()) label.style.visibility = 'hidden'
    }
    const failure = (error: unknown) => {
      if (failed || disposed) return
      failed = true
      canvas.dataset.ready = 'false'
      try {
        latest.current.onStatus('unavailable')
        latest.current.onError(error instanceof Error ? error.message : `The ${city.name} historical scene could not be rendered.`)
      } finally { cleanup() }
    }
    try {
      latest.current.onStatus('loading')
      canvas.dataset.ready = 'false'
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
      disposers.push(() => {
        renderer.dispose()
        // StrictMode reuses the canvas; losing that context would also kill the next mount.
        if (!canvas.isConnected) renderer.forceContextLoss()
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.shadowMap.autoUpdate = false
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(43, 1, .06, 5000)
      const controls = new OrbitControls(camera, canvas)
      disposers.push(() => controls.dispose())
      controls.enableDamping = true
      controls.dampingFactor = .09
      controls.screenSpacePanning = false
      controls.minDistance = 2
      controls.maxDistance = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 3
      controls.maxPolarAngle = Math.PI / 2 - .05
      controls.minPolarAngle = .12
      controls.zoomSpeed = .85
      controls.panSpeed = .85
      controls.target.set(0, .15, 0)
      camera.position.set(30, 70, 60)

      const sun = new THREE.DirectionalLight(), ambient = new THREE.AmbientLight()
      const hemisphere = new THREE.HemisphereLight()
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      sun.shadow.bias = -.0003
      sun.shadow.normalBias = .045
      sun.shadow.radius = 3
      sun.shadow.camera.near = .5
      sun.shadow.camera.far = 1600
      scene.add(sun, sun.target, ambient, hemisphere)
      disposers.push(() => sun.dispose())
      const ringGeometry = new THREE.RingGeometry(.82, 1, 48).rotateX(-Math.PI / 2)
      const ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: .85, depthWrite: false })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.position.y = .16
      ring.visible = false
      scene.add(ring)
      disposers.push(() => { ringGeometry.dispose(); ringMaterial.dispose() })
      const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
      let chapter = latest.current.chapter, cameraMode = latest.current.cameraMode
      let width = 1, height = 1, panel = 0, flight: Flight | null = null
      let ready = false, lastTime = 0, lastPublish = 0, lastView = ''
      let pointerStart: { x: number; y: number; time: number } | null = null
      const keys = new Set<string>()
      const pointers = new Set<number>()
      let palette = readTheme()

      function readTheme() {
        const warmth = getComputedStyle(host!).getPropertyValue('--cp-warning').trim()
        if (!warmth) throw new Error('The historical scene theme is missing --cp-warning.')
        return historicalPalette(readMapPalette(host!), warmth)
      }
      function clamp(point: THREE.Vector3) {
        point.x = THREE.MathUtils.clamp(point.x, bounds.minX, bounds.maxX)
        point.z = THREE.MathUtils.clamp(point.z, bounds.minZ, bounds.maxZ)
        return point
      }
      function pointAt(coordinates: Coordinates) {
        if (!coordinates.every(Number.isFinite)) throw new Error('The historical scene received invalid location coordinates.')
        const [x, z] = projectCity(city, coordinates)
        return clamp(new THREE.Vector3(x, .15, z))
      }
      function shiftToBounds() {
        const previous = controls.target.clone()
        clamp(controls.target)
        camera.position.add(controls.target.clone().sub(previous))
      }
      function shadowPosition() {
        const extent = THREE.MathUtils.clamp(controls.getDistance() * .75, 25, 350)
        sun.target.position.copy(controls.target)
        sun.position.copy(controls.target).add(new THREE.Vector3(-extent * .75, extent * 1.5, extent * .55))
        const shadow = sun.shadow.camera
        shadow.left = shadow.bottom = -extent
        shadow.right = shadow.top = extent
        shadow.updateProjectionMatrix()
        renderer.shadowMap.needsUpdate = true
      }
      function appearance() {
        palette = readTheme()
        const time = latest.current.timeOfDay, night = time === 'night', golden = time === 'golden'
        world?.setTheme(palette, time)
        scene.background = night ? palette.ink.clone().multiplyScalar(.22).lerp(palette.sky, .08) : palette.sky.clone()
        scene.fog = new THREE.FogExp2(scene.background, night ? .00075 : .00032)
        sun.color.copy(golden ? palette.glow : night ? palette.water.clone().lerp(palette.trim, .6) : palette.trim)
        sun.intensity = night ? 1.1 : golden ? 3.1 : 2.7
        hemisphere.color.copy(palette.sky).lerp(palette.trim, .55)
        hemisphere.groundColor.copy(palette.land)
        hemisphere.intensity = night ? .8 : 1.8
        ambient.color.copy(palette.trim)
        ambient.intensity = night ? .6 : .55
        renderer.toneMappingExposure = night ? .85 : golden ? 1.08 : 1.12
        ringMaterial.color.copy(palette.roof).lerp(palette.glow, .25)
        shadowPosition()
      }
      function applyFlight(target: THREE.Vector3, position: THREE.Vector3, immediate = false) {
        flight = { target: clamp(target), position }
        if (immediate || reducedMotion.matches) {
          controls.target.copy(flight.target)
          camera.position.copy(flight.position)
          flight = null
          controls.update()
          shadowPosition()
        }
      }
      function pose(coordinates: Coordinates, spanKm: number, immediate = false, clearance = 0, targetHeight = .15) {
        const target = pointAt(coordinates)
        target.y = targetHeight
        if (cameraMode === 'walk') {
          const bearing = camera.position.clone().sub(controls.target).setY(0).normalize()
          if (bearing.lengthSq() < .1) bearing.set(.3, 0, 1).normalize()
          const position = target.clone().addScaledVector(bearing, Math.max(6, clearance * 1.8))
          position.y = targetHeight + 2
          applyFlight(target, position, immediate)
        } else {
          const usableWidth = Math.max(width - panel - 48, width * .38)
          const visibleWidth = spanKm * 10 * width / usableWidth
          const distance = THREE.MathUtils.clamp(visibleWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
            9, controls.maxDistance)
          const offset = new THREE.Vector3(.3, .86, .78).normalize().multiplyScalar(distance)
          applyFlight(target, target.clone().add(offset), immediate)
        }
      }
      function selection() {
        const props = latest.current
        const place = placesInChapter(city, chapter.year).find((item) => item.id === props.selectedId)
        const coordinates = place?.coordinates ?? props.destination
        ring.visible = Boolean(coordinates)
        if (coordinates) {
          const target = pointAt(coordinates)
          ring.position.set(target.x, .16, target.z)
          ring.scale.setScalar(place ? landmarkRadius(place, chapter, city) * 1.13 : 1.6)
        }
      }
      function rebuild(next: CityChapter) {
        if (world && chapter === next) return
        chapter = next
        latest.current.onStatus('loading')
        canvas!.dataset.ready = 'false'
        ready = false
        if (world) { scene.remove(world.group); world.dispose() }
        world = null
        world = buildHistoricalWorld(city, chapter, palette)
        scene.add(world.group)
        canvas!.dataset.city = city.id
        canvas!.dataset.era = String(chapter.year)
        canvas!.dataset.landmarks = placesInChapter(city, chapter.year).map((place) => place.id).join(',')
        canvas!.dataset.cityBuildings = String(world.buildings)
        appearance()
        selection()
        const active = placesInChapter(city, chapter.year).find((place) => place.id === latest.current.selectedId)
        if (active) focus(active.id)
        else if (latest.current.destination) locate(latest.current.destination, latest.current.destinationZoom)
        else pose(chapter.focus, chapter.spanKm, !lastTime)
      }
      function locate(coordinates: Coordinates, zoom?: number) {
        if (zoom !== undefined && !Number.isFinite(zoom)) throw new Error('The historical scene received an invalid zoom level.')
        const span = zoom === undefined ? Math.min(chapter.spanKm, 5)
          : Math.max(.7, 156.543 * Math.cos(coordinates[1] * Math.PI / 180) * Math.max(width - panel, 240) / 2 ** THREE.MathUtils.clamp(zoom, 5, 20))
        pose(coordinates, span)
      }
      function focus(id: string) {
        const place = placesInChapter(city, chapter.year).find((item) => item.id === id)
        if (!place) throw new Error(`The landmark "${id}" is not present in this historical chapter.`)
        const radius = landmarkRadius(place, chapter, city)
        pose(place.coordinates, Math.min(chapter.spanKm, Math.max(3, radius * 1.2)), false, radius,
          place.model === 'hill' ? radius * .6 : .15)
      }
      function travel(id: string) {
        const district = city.districts.find((item) => item.name === id && item.visibleFrom <= chapter.year)
        if (!district) throw new Error(`The district "${id}" is not present in this historical chapter.`)
        pose(district.coordinates, Math.max(district.radiusKm * 3, 2.5))
      }
      function move(direction: MoveDirection, amount?: number) {
        flight = null
        const forward = controls.target.clone().sub(camera.position).setY(0).normalize()
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
        const vector = direction === 'forward' || direction === 'backward' ? forward : right
        const sign = direction === 'backward' || direction === 'left' ? -1 : 1
        vector.multiplyScalar((amount ?? (cameraMode === 'walk' ? 1.4 : Math.max(2, controls.getDistance() * .075))) * sign)
        controls.target.add(vector)
        camera.position.add(vector)
        shiftToBounds()
        shadowPosition()
      }
      function mode(next: CameraMode) {
        if (next === cameraMode) return
        cameraMode = next
        const place = placesInChapter(city, chapter.year).find((item) => item.id === latest.current.selectedId)
        if (place) { focus(place.id); return }
        const target = flight?.target ?? controls.target
        pose(unprojectCity(city, [target.x, target.z]), chapter.spanKm * .48)
      }
      function zoom(direction: 'in' | 'out') {
        const target = flight?.target.clone() ?? controls.target.clone()
        const offset = (flight?.position.clone() ?? camera.position.clone()).sub(target)
        const distance = THREE.MathUtils.clamp(offset.length() * (direction === 'in' ? .74 : 1.35), controls.minDistance, controls.maxDistance)
        applyFlight(target, target.clone().add(offset.setLength(distance)))
      }
      function resize() {
        const rect = host!.getBoundingClientRect()
        width = Math.max(1, rect.width)
        height = Math.max(1, rect.height)
        panel = width > 980 ? 330 : 0
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.setViewOffset(width, height, -panel / 2, 0, width, height)
        camera.updateProjectionMatrix()
        if (!world) pose(chapter.focus, chapter.spanKm, true)
      }
      function projectLabels() {
        const occupied: LabelBox[] = []
        const selected = latest.current.selectedId
        const entries = [...(world?.labels.entries() ?? [])].sort(([a, pa], [b, pb]) => {
          if (a === selected || labels.current.get(a) === document.activeElement) return -1
          if (b === selected || labels.current.get(b) === document.activeElement) return 1
          return camera.position.distanceToSquared(pa) - camera.position.distanceToSquared(pb)
        })
        for (const [id, position] of entries) {
          const element = labels.current.get(id)
          if (!element) continue
          const projected = position.clone().project(camera)
          const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
          const labelWidth = element.offsetWidth || 140, labelHeight = element.offsetHeight || 26
          const box = { x: x - labelWidth / 2, y: y - labelHeight, width: labelWidth, height: labelHeight }
          const visible = latest.current.showLabels && projected.z > -1 && projected.z < 1
            && box.x >= panel + 12 && box.x + box.width < width - 12
            && box.y > 76 && box.y + box.height < height - 72
            && !occupied.some((other) => box.x < other.x + other.width + 9 && box.x + box.width + 9 > other.x
              && box.y < other.y + other.height + 8 && box.y + box.height + 8 > other.y)
          element.style.visibility = visible ? 'visible' : 'hidden'
          if (visible) {
            occupied.push(box)
            element.style.transform = `translate3d(${box.x.toFixed(1)}px,${box.y.toFixed(1)}px,0)`
          }
        }
      }
      function publish(now: number) {
        if (now - lastPublish < 240) return
        lastPublish = now
        canvas!.dataset.cameraX = camera.position.x.toFixed(3)
        canvas!.dataset.cameraZ = camera.position.z.toFixed(3)
        canvas!.dataset.cameraY = camera.position.y.toFixed(3)
        canvas!.dataset.drawCalls = String(renderer.info.render.calls)
        const center = unprojectCity(city, [controls.target.x, controls.target.z])
        const span = controls.getDistance() * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2
        const positions: THREE.Vector3[] = []
        for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
          const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3())
          if (hit && hit.distanceTo(controls.target) < controls.maxDistance * 2) positions.push(clamp(hit))
        }
        if (positions.length < 4) positions.push(
          clamp(controls.target.clone().add(new THREE.Vector3(-span * camera.aspect, 0, -span))),
          clamp(controls.target.clone().add(new THREE.Vector3(span * camera.aspect, 0, span))),
        )
        const westSouth = unprojectCity(city, [Math.min(...positions.map((p) => p.x)), Math.max(...positions.map((p) => p.z))])
        const eastNorth = unprojectCity(city, [Math.max(...positions.map((p) => p.x)), Math.min(...positions.map((p) => p.z))])
        const view = {
          center,
          bounds: [westSouth[0], westSouth[1], eastNorth[0], eastNorth[1]] as const,
          zoom: THREE.MathUtils.clamp(Math.log2(156543.03392 * Math.cos(center[1] * Math.PI / 180) / (span * 100 / height)), 3, 20),
          bearing: THREE.MathUtils.radToDeg(Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)),
        }
        const signature = `${center.map((n) => n.toFixed(5)).join(',')}:${view.bounds.map((n) => n.toFixed(5)).join(',')}:${view.zoom.toFixed(2)}:${view.bearing.toFixed(1)}`
        if (signature !== lastView) { lastView = signature; latest.current.onViewChange(view) }
      }
      const safe = <Args extends unknown[]>(callback: (...args: Args) => void) => (...args: Args) => {
        if (disposed) return
        try { callback(...args) } catch (error) { failure(error) }
      }
      const onPointerDown = (event: PointerEvent) => {
        canvas.focus({ preventScroll: true })
        pointers.add(event.pointerId)
        pointerStart = pointers.size === 1 ? { x: event.clientX, y: event.clientY, time: performance.now() } : null
      }
      const onPointerUp = safe((event: PointerEvent) => {
        pointers.delete(event.pointerId)
        if (!pointerStart || event.button !== 0 || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6
          || performance.now() - pointerStart.time > 650) { pointerStart = null; return }
        pointerStart = null
        const rect = canvas.getBoundingClientRect()
        pointer.set((event.clientX - rect.left) / width * 2 - 1, -(event.clientY - rect.top) / height * 2 + 1)
        raycaster.setFromCamera(pointer, camera)
        const id = world?.pick(raycaster.intersectObjects(world.group.children, false))
        if (id) latest.current.onSelect(id)
        else if (raycaster.ray.intersectPlane(ground, intersection)) {
          const target = clamp(intersection)
          latest.current.onNavigate(unprojectCity(city, [target.x, target.z]))
        }
      })
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.target !== canvas || event.ctrlKey || event.metaKey || event.altKey || !KEY_DIRECTIONS[event.key.toLowerCase()]) return
        event.preventDefault()
        keys.add(event.key.toLowerCase())
      }
      const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()) }
      const clearKeys = () => { keys.clear(); pointers.clear(); pointerStart = null }
      const onControlStart = () => { flight = null }
      const onControlEnd = safe(shadowPosition)
      controls.addEventListener('start', onControlStart)
      controls.addEventListener('end', onControlEnd)
      disposers.push(() => {
        controls.removeEventListener('start', onControlStart)
        controls.removeEventListener('end', onControlEnd)
      })
      const abort = new AbortController(), listenerOptions = { signal: abort.signal }
      disposers.push(() => abort.abort())
      canvas.addEventListener('pointerdown', onPointerDown, listenerOptions)
      canvas.addEventListener('pointerup', onPointerUp, listenerOptions)
      canvas.addEventListener('pointercancel', clearKeys, listenerOptions)
      canvas.addEventListener('keydown', onKeyDown, listenerOptions)
      window.addEventListener('keyup', onKeyUp, listenerOptions)
      canvas.addEventListener('blur', clearKeys, listenerOptions)
      window.addEventListener('blur', clearKeys, listenerOptions)
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault()
        failure(new Error(`The ${city.name} 3D scene lost its graphics context. Reload the historical view to retry.`))
      }, listenerOptions)
      const observer = new ResizeObserver(safe(resize))
      observer.observe(host)
      disposers.push(() => observer.disconnect())
      const themeObserver = new MutationObserver(safe(appearance))
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] })
      disposers.push(() => themeObserver.disconnect())
      const themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
      themeMedia.addEventListener('change', safe(appearance), listenerOptions)
      resize()
      rebuild(chapter)
      const api: Runtime = {
        focus: safe(focus), travel: safe(travel), locate: safe(locate),
        home: safe(() => pose(chapter.focus, chapter.spanKm)),
        region: safe(() => {
          const center = unprojectCity(city, [(bounds.minX + bounds.maxX) / 2, (bounds.minZ + bounds.maxZ) / 2])
          if (cameraMode === 'walk') {
            const target = pointAt(center)
            applyFlight(target, target.clone().add(new THREE.Vector3(0, 2, 6)))
          } else pose(center, Math.max(bounds.maxX - bounds.minX, (bounds.maxZ - bounds.minZ) * camera.aspect) / 10 * 1.12)
        }),
        zoom: safe(zoom), move: safe(move), rebuild: safe(rebuild), appearance: safe(appearance),
        mode: safe(mode), selection: safe(selection),
      }
      runtime.current = api
      const animate = safe((now: number) => {
        const delta = Math.min((now - (lastTime || now)) / 1000, .05)
        lastTime = now
        if (flight) {
          const blend = 1 - Math.exp(-delta * 5.8)
          camera.position.lerp(flight.position, blend)
          controls.target.lerp(flight.target, blend)
          if (camera.position.distanceToSquared(flight.position) + controls.target.distanceToSquared(flight.target) < .002) {
            camera.position.copy(flight.position)
            controls.target.copy(flight.target)
            flight = null
            shadowPosition()
          }
        }
        for (const key of keys) {
          const direction = KEY_DIRECTIONS[key]
          if (direction) move(direction, delta * (cameraMode === 'walk' ? 4 : Math.max(6, controls.getDistance() * .45)))
        }
        controls.update()
        shiftToBounds()
        if (cameraMode === 'walk' && !flight) {
          camera.position.y = THREE.MathUtils.clamp(camera.position.y, controls.target.y + 1.15, controls.target.y + 3.45)
          camera.lookAt(controls.target)
        }
        camera.updateMatrixWorld()
        renderer.render(scene, camera)
        if (!ready) {
          ready = true
          canvas.dataset.ready = 'true'
          latest.current.onStatus('ready')
        }
        projectLabels()
        publish(now)
        frame = requestAnimationFrame(animate)
      })
      frame = requestAnimationFrame(animate)
    } catch (error) {
      failure(error)
    }
    return cleanup
  }, [props.city])

  useEffect(() => { runtime.current?.rebuild(props.chapter) }, [props.city, props.chapter])
  useEffect(() => { runtime.current?.appearance() }, [props.timeOfDay])
  useEffect(() => { runtime.current?.mode(props.cameraMode) }, [props.cameraMode])
  useEffect(() => {
    runtime.current?.selection()
    if (props.selectedId) runtime.current?.focus(props.selectedId)
  }, [props.selectedId])
  useEffect(() => {
    runtime.current?.selection()
    if (props.destination) runtime.current?.locate(props.destination, props.destinationZoom)
  }, [props.destination, props.destinationZoom])

  return <div className="world-historical-scene" ref={hostRef}>
    <canvas ref={canvasRef} className="world-historical-scene__canvas" tabIndex={0}
      data-engine="three" data-city={props.city.id} data-era={props.chapter.year}
      aria-label={`${props.city.name}, ${props.chapter.label}: interactive historical city diorama`}
      aria-describedby={descriptionId} />
    <p id={descriptionId} className="world-historical-scene__description">
      Interpretive miniatures, not surveyed architecture. Drag to orbit, right-drag or use two fingers to pan,
      and scroll or pinch to zoom. Focus this scene and use the arrow or WASD keys to move.
      All places are also available in the city landmark list.
    </p>
    <div className="world-historical-scene__labels">
      {activePlaces.map((place) => <button key={place.id} type="button"
        ref={(element) => { if (element) labels.current.set(place.id, element); else labels.current.delete(place.id) }}
        className="world-historical-scene__label" data-landmark-id={place.id}
        aria-label={`Explore ${place.name}`} aria-pressed={props.selectedId === place.id}
        title={`${place.name} - ${place.dateLabel}`} onClick={() => latest.current.onSelect(place.id)}>
        {place.name}
      </button>)}
    </div>
  </div>
})

export default WorldHistoricalScene

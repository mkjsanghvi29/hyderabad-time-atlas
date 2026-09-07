import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  PerspectiveCamera,
  PCFSoftShadowMap,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Mesh,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CITY_DISTRICTS, nearestDistrict } from './city'
import { project, unproject } from './geography'
import { createAtmosphere } from './scene/atmosphere'
import type { AtlasSceneHandle, AtlasSceneProps, Coordinates, Landmark, TimeOfDay } from './types'
import { createMaterials, disposeMaterials, readPalette, setNightMaterials, type AtlasMaterials, type AtlasPalette } from './scene/palette'
import { buildWorld, createSelectionRing, surfaceHeight, WORLD_BOUNDS, type World } from './scene/world'

type Flight = {
  startTime: number
  duration: number
  fromPosition: Vector3
  toPosition: Vector3
  fromTarget: Vector3
  toTarget: Vector3
}

type Runtime = {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  controls: OrbitControls
  palette: AtlasPalette
  materials: AtlasMaterials
  atmosphere: ReturnType<typeof createAtmosphere>
  world: World | null
  selectionRing: Mesh
  sun: DirectionalLight
  hemisphere: HemisphereLight
  ambient: AmbientLight
  raycaster: Raycaster
  pointer: Vector2
  frame: number
  flight: Flight | null
  reducedMotion: boolean
  cameraMode: AtlasSceneProps['cameraMode']
  selectedId: string | null
  showLabels: boolean
  resizeObserver: ResizeObserver
  pointerDown: Vector2 | null
  pointerLast: Vector2 | null
  pointerId: number | null
  readyReported: boolean
  contextLost: boolean
  lastFrameTime: number
  keys: Set<string>
  fastMove: boolean
}

// Geography is in 100-metre units; the old 20-unit camera missed almost every site.
const HOME_TARGET = new Vector3(-8, 0.5, 32)
const HOME_POSITION = new Vector3(25, 58, 70)
const MODERN_HOME_TARGET = new Vector3(-20, 0.5, -5)
const MODERN_HOME_POSITION = new Vector3(42, 118, 95)
const REGION_TARGET = new Vector3(-8, .5, 0)
const REGION_POSITION = new Vector3(65, 295, 170)
const WALK_EYE_HEIGHT = 0.13

function overviewPose(year: number): [Vector3, Vector3] {
  return year >= 1998 ? [MODERN_HOME_POSITION, MODERN_HOME_TARGET] : [HOME_POSITION, HOME_TARGET]
}

function clampToWorld(vector: Vector3, margin = 0.25): void {
  vector.x = MathUtils.clamp(vector.x, WORLD_BOUNDS.minX + margin, WORLD_BOUNDS.maxX - margin)
  vector.z = MathUtils.clamp(vector.z, WORLD_BOUNDS.minZ + margin, WORLD_BOUNDS.maxZ - margin)
}

function isInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, select, textarea, button, a, dialog, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="textbox"]'))
}

function updateCamera(runtime: Runtime): void {
  if (runtime.cameraMode === 'walk') runtime.camera.lookAt(runtime.controls.target)
  else runtime.controls.update()
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function lightingColors(palette: AtlasPalette, time: TimeOfDay): {
  background: Color
  sun: Color
  sky: Color
  ground: Color
  fog: Color
  exposure: number
  sunIntensity: number
  hemisphereIntensity: number
  ambientIntensity: number
  fogDensity: number
} {
  if (time === 'night') {
    return {
      background: palette.night.clone().lerp(palette.sky, 0.14),
      sun: palette.accent.clone().lerp(palette.sky, 0.48),
      sky: palette.water.clone().multiplyScalar(0.55),
      ground: palette.terrainDark,
      fog: palette.night.clone().lerp(palette.water, 0.09),
      exposure: 0.62,
      sunIntensity: 1.25,
      hemisphereIntensity: 0.52,
      ambientIntensity: 0.3,
      fogDensity: 0.0017,
    }
  }
  if (time === 'day') {
    return {
      background: palette.sky.clone().lerp(palette.water, 0.08),
      sun: palette.sandstoneLight,
      sky: palette.sky,
      ground: palette.terrain,
      fog: palette.sky,
      exposure: 1.02,
      sunIntensity: 2.4,
      hemisphereIntensity: 0.95,
      ambientIntensity: 0.32,
      fogDensity: 0.0007,
    }
  }
  return {
    background: palette.sky.clone().lerp(palette.accent, 0.06),
    sun: palette.sandstoneLight.clone().lerp(palette.sandstone, 0.34),
    sky: palette.sandstoneLight,
    ground: palette.terrainDark,
    fog: palette.sky.clone().lerp(palette.sandstone, 0.12),
    exposure: 0.92,
    sunIntensity: 2.5,
    hemisphereIntensity: 0.78,
    ambientIntensity: 0.3,
    fogDensity: 0.0009,
  }
}

const rootStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: 'var(--cp-bg)',
  touchAction: 'none',
}

const labelLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
}

const labelStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  transform: 'translate(-50%, calc(-100% - 10px))',
  padding: '5px 8px',
  border: '1px solid var(--cp-border)',
  borderRadius: 10,
  background: 'var(--cp-panel-strong)',
  color: 'var(--cp-text)',
  boxShadow: '0 1px 2px var(--cp-border)',
  fontSize: 9,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  pointerEvents: 'auto',
  transition: 'opacity 120ms ease',
}

function labelKey(landmark: Landmark): string {
  return `${landmark.id}:${landmark.visibleFrom}:${landmark.coordinates.join(',')}`
}

const AtlasScene = forwardRef<AtlasSceneHandle, AtlasSceneProps>(function AtlasScene(props, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<Runtime | null>(null)
  const labelsRef = useRef(new Map<string, HTMLButtonElement>())
  const onSelectRef = useRef(props.onSelect)
  const onStatusRef = useRef(props.onStatus)
  const propsRef = useRef(props)
  onSelectRef.current = props.onSelect
  onStatusRef.current = props.onStatus
  propsRef.current = props

  const visibleLandmarks = useMemo(
    () => props.landmarks.filter((landmark) => props.era.year >= landmark.visibleFrom),
    [props.era.year, props.landmarks],
  )

  function beginFlight(position: Vector3, target: Vector3, duration = 850): void {
    const runtime = runtimeRef.current
    if (!runtime || runtime.contextLost) return
    clampToWorld(position)
    clampToWorld(target)
    const ground = surfaceHeight(position.x, position.z, propsRef.current.era.year >= 1563)
    position.y = Math.max(position.y, ground + WALK_EYE_HEIGHT)
    if (position.distanceToSquared(target) < 0.1) target.y = position.y - 0.5
    if (runtime.reducedMotion) {
      runtime.camera.position.copy(position)
      runtime.controls.target.copy(target)
      runtime.flight = null
      updateCamera(runtime)
      return
    }
    runtime.flight = {
      startTime: performance.now(),
      duration,
      fromPosition: runtime.camera.position.clone(),
      toPosition: position,
      fromTarget: runtime.controls.target.clone(),
      toTarget: target,
    }
  }

  function focusLandmark(landmarkId: string): void {
    const runtime = runtimeRef.current
    const landmark = runtime?.world?.landmarks.get(landmarkId)
    if (!runtime || !landmark) return
    const target = new Vector3()
    landmark.root.getWorldPosition(target)
    target.y += landmark.height * 0.43
    const bearing = landmark.root.rotation.y + 0.72
    const walking = runtime.cameraMode === 'walk'
    const portraitFit = walking ? 1 : Math.max(1, 1 / runtime.camera.aspect)
    const distance = Math.max(walking ? 2.5 : 3.8, landmark.radius * (walking ? 1.7 : 3.1)) * portraitFit
    const position = new Vector3(
      target.x + Math.sin(bearing) * distance,
      target.y + (walking ? 0 : distance * 0.7),
      target.z + Math.cos(bearing) * distance,
    )
    if (walking) position.y = surfaceHeight(position.x, position.z, propsRef.current.era.year >= 1563) + WALK_EYE_HEIGHT
    beginFlight(position, target, 900)
  }

  function home(): void {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.cameraMode = 'orbit'
    runtime.controls.enabled = true
    const [position, target] = overviewPose(propsRef.current.era.year)
    beginFlight(position.clone(), target.clone(), 950)
  }

  function region(): void {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.cameraMode = 'orbit'
    runtime.controls.enabled = true
    beginFlight(REGION_POSITION.clone(), REGION_TARGET.clone(), 900)
  }

  function travel(districtId: string): void {
    const runtime = runtimeRef.current
    const district = CITY_DISTRICTS.find((entry) => entry.id === districtId)
    if (!runtime?.world || !district) return
    const [x, z] = project(district.coordinates)
    const road = runtime.world.living.metadata.roadSegments.reduce<typeof runtime.world.living.metadata.roadSegments[number] | null>((closest, segment) => {
      const distance = (item: typeof segment) => Math.hypot((item.a[0] + item.b[0]) / 2 - x, (item.a[1] + item.b[1]) / 2 - z)
      return !closest || distance(segment) < distance(closest) ? segment : closest
    }, null)
    if (!road) return
    const position = new Vector3((road.a[0] + road.b[0]) / 2, WALK_EYE_HEIGHT + .04, (road.a[1] + road.b[1]) / 2)
    const direction = new Vector3(road.b[0] - road.a[0], 0, road.b[1] - road.a[1]).normalize()
    runtime.cameraMode = 'walk'
    runtime.controls.enabled = false
    beginFlight(position, position.clone().addScaledVector(direction, 2), 900)
    runtime.renderer.domElement.focus({ preventScroll: true })
  }

  function locate(coordinates: Coordinates): void {
    const runtime = runtimeRef.current
    if (!runtime) return
    const [x, z] = project(coordinates)
    const target = new Vector3(x, .15, z)
    const position = runtime.cameraMode === 'walk'
      ? target.clone().add(new Vector3(0, 0, .8))
      : target.clone().add(new Vector3(4, 7, 6))
    beginFlight(position, target)
  }

  function zoom(direction: 'in' | 'out'): void {
    const runtime = runtimeRef.current
    if (!runtime || runtime.contextLost) return
    if (runtime.cameraMode === 'walk' && !runtime.flight) {
      move(direction === 'in' ? 'forward' : 'backward')
      return
    }
    const offset = runtime.camera.position.clone().sub(runtime.controls.target)
    const factor = direction === 'in' ? 0.76 : 1.3
    const distance = MathUtils.clamp(offset.length() * factor, 0.8, 650)
    offset.setLength(distance)
    beginFlight(runtime.controls.target.clone().add(offset), runtime.controls.target.clone(), 320)
  }

  function move(direction: 'forward' | 'backward' | 'left' | 'right', faster = false, step = 1): void {
    const runtime = runtimeRef.current
    if (!runtime || runtime.contextLost) return
    runtime.flight = null
    const forward = new Vector3()
    runtime.camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1)
    forward.normalize()
    const right = new Vector3().crossVectors(forward, runtime.camera.up).normalize()
    const movement = direction === 'forward'
      ? forward
      : direction === 'backward'
        ? forward.negate()
        : direction === 'right'
          ? right
          : right.negate()
    movement.multiplyScalar((runtime.cameraMode === 'walk' ? 0.28 : 1.6) * (faster ? 3 : 1) * step)
    const margin = runtime.cameraMode === 'walk' ? 2 : 0.25
    movement.x = MathUtils.clamp(movement.x,
      WORLD_BOUNDS.minX + margin - Math.min(runtime.camera.position.x, runtime.controls.target.x),
      WORLD_BOUNDS.maxX - margin - Math.max(runtime.camera.position.x, runtime.controls.target.x))
    movement.z = MathUtils.clamp(movement.z,
      WORLD_BOUNDS.minZ + margin - Math.min(runtime.camera.position.z, runtime.controls.target.z),
      WORLD_BOUNDS.maxZ - margin - Math.max(runtime.camera.position.z, runtime.controls.target.z))
    runtime.camera.position.add(movement)
    runtime.controls.target.add(movement)
    if (runtime.cameraMode === 'walk') {
      const ground = surfaceHeight(runtime.camera.position.x, runtime.camera.position.z, propsRef.current.era.year >= 1563)
      const height = Math.max(0.02, ground) + WALK_EYE_HEIGHT
      runtime.controls.target.y += height - runtime.camera.position.y
      runtime.camera.position.y = height
    }
    updateCamera(runtime)
  }

  useImperativeHandle(forwardedRef, () => ({
    focus: focusLandmark,
    travel,
    locate,
    home,
    region,
    zoom,
    move: (direction) => move(direction),
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    onStatusRef.current('loading')
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
    const reducedMotion = motionPreference.matches
    const palette = readPalette(container)
    const materials = createMaterials(palette)
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      })
    } catch (error) {
      console.warn('Hyderabad atlas: WebGL initialization failed.', error)
      disposeMaterials(materials)
      onStatusRef.current('unavailable')
      return
    }
    if (!renderer.getContext()) {
      renderer.dispose()
      disposeMaterials(materials)
      onStatusRef.current('unavailable')
      return
    }

    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.domElement.dataset.testid = 'atlas-canvas'
    renderer.domElement.setAttribute('aria-label', 'Navigable three-dimensional interpretive map of Hyderabad')
    renderer.domElement.setAttribute('role', 'application')
    renderer.domElement.tabIndex = 0
    container.prepend(renderer.domElement)

    const scene = new Scene()
    scene.background = palette.sky
    scene.fog = new FogExp2(palette.sky, 0.003)
    const atmosphere = createAtmosphere(palette)
    atmosphere.setTime(propsRef.current.timeOfDay)
    scene.add(atmosphere.root)
    const camera = new PerspectiveCamera(43, 1, 0.03, 1600)
    const initialWidth = Math.max(1, container.clientWidth)
    const initialHeight = Math.max(1, container.clientHeight)
    renderer.setSize(initialWidth, initialHeight, false)
    camera.aspect = initialWidth / initialHeight
    camera.updateProjectionMatrix()
    const [homePosition, homeTarget] = overviewPose(propsRef.current.era.year)
    camera.position.copy(homePosition)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(homeTarget)
    controls.enableDamping = !reducedMotion
    controls.dampingFactor = 0.075
    controls.enablePan = true
    controls.screenSpacePanning = false
    controls.minDistance = 0.8
    controls.maxDistance = 650
    controls.minPolarAngle = 0.12
    controls.maxPolarAngle = Math.PI * 0.47
    controls.zoomToCursor = true
    controls.update()

    const sun = new DirectionalLight(palette.sandstoneLight, 3.6)
    sun.position.set(-35, 70, 45)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -13
    sun.shadow.camera.right = 13
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -12
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 220
    sun.shadow.bias = -0.00025
    sun.shadow.normalBias = 0.035
    scene.add(sun, sun.target)
    const hemisphere = new HemisphereLight(palette.sky, palette.terrainDark, 0.92)
    scene.add(hemisphere)
    const ambient = new AmbientLight(palette.sky, 0.48)
    scene.add(ambient)
    const selectionRing = createSelectionRing(materials)
    scene.add(selectionRing)

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width)
      const height = Math.max(1, entry.contentRect.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    resizeObserver.observe(container)

    const runtime: Runtime = {
      renderer,
      scene,
      camera,
      controls,
      palette,
      materials,
      atmosphere,
      world: null,
      selectionRing,
      sun,
      hemisphere,
      ambient,
      raycaster: new Raycaster(),
      pointer: new Vector2(),
      frame: 0,
      flight: null,
      reducedMotion,
      cameraMode: propsRef.current.cameraMode,
      selectedId: propsRef.current.selectedId,
      showLabels: propsRef.current.showLabels,
      resizeObserver,
      pointerDown: null,
      pointerLast: null,
      pointerId: null,
      readyReported: false,
      contextLost: false,
      lastFrameTime: performance.now(),
      keys: new Set(),
      fastMove: false,
    }
    runtimeRef.current = runtime

    const updateLabels = () => {
      const currentWorld = runtime.world
      if (!currentWorld || !runtime.showLabels) {
        for (const button of labelsRef.current.values()) button.style.display = 'none'
        return
      }
      const width = renderer.domElement.clientWidth
      const height = renderer.domElement.clientHeight
      const candidates: Array<{ id: string; button: HTMLButtonElement; position: Vector3; distance: number }> = []
      for (const [id, landmark] of currentWorld.landmarks) {
        const button = labelsRef.current.get(id)
        if (!button) continue
        const position = new Vector3()
        landmark.anchor.getWorldPosition(position)
        const distance = position.distanceTo(camera.position)
        position.project(camera)
        if (position.z < -1 || position.z > 1 || Math.abs(position.x) > 0.98 || Math.abs(position.y) > 0.96 || distance > 240) {
          button.style.display = 'none'
          continue
        }
        candidates.push({ id, button, position, distance })
      }
      candidates.sort((a, b) => {
        if (a.id === runtime.selectedId) return -1
        if (b.id === runtime.selectedId) return 1
        return a.distance - b.distance
      })
      const occupied: Array<{ left: number; right: number; top: number; bottom: number }> = []
      for (const candidate of candidates) {
        const x = (candidate.position.x * 0.5 + 0.5) * width
        const y = (-candidate.position.y * 0.5 + 0.5) * height
        const halfWidth = Math.max(55, candidate.button.textContent!.length * 2.9 + 9)
        const rect = { left: x - halfWidth, right: x + halfWidth, top: y - 33, bottom: y - 7 }
        if (occupied.some((box) => rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top)
          && candidate.id !== runtime.selectedId && document.activeElement !== candidate.button) {
          candidate.button.style.display = 'none'
          continue
        }
        occupied.push(rect)
        candidate.button.style.display = 'block'
        candidate.button.style.left = `${x}px`
        candidate.button.style.top = `${y}px`
        candidate.button.style.opacity = candidate.distance > 160 ? '0.8' : '1'
        candidate.button.setAttribute('aria-pressed', String(candidate.id === runtime.selectedId))
      }
    }

    const renderFrame = () => {
      if (runtime.contextLost) return
      runtime.frame = requestAnimationFrame(renderFrame)
      const now = performance.now()
      const delta = Math.min(0.05, (now - runtime.lastFrameTime) / 1000)
      runtime.lastFrameTime = now
      if (document.hidden) return
      const elapsed = now / 1000
      const canvasFocused = document.activeElement === renderer.domElement && !document.querySelector('dialog[open], [aria-modal="true"]')
      if (!canvasFocused) runtime.keys.clear()
      for (const direction of ['forward', 'backward', 'left', 'right'] as const) {
        if (runtime.keys.has(direction)) move(direction, runtime.fastMove, delta * 10)
      }
      if (runtime.flight) {
        const progress = Math.min(1, (performance.now() - runtime.flight.startTime) / runtime.flight.duration)
        const eased = easeInOutCubic(progress)
        camera.position.lerpVectors(runtime.flight.fromPosition, runtime.flight.toPosition, eased)
        controls.target.lerpVectors(runtime.flight.fromTarget, runtime.flight.toTarget, eased)
        if (progress >= 1) runtime.flight = null
      }
      updateCamera(runtime)
      clampToWorld(controls.target)
      clampToWorld(camera.position, runtime.cameraMode === 'walk' ? 2 : 0.25)
      const ground = surfaceHeight(camera.position.x, camera.position.z, propsRef.current.era.year >= 1563)
      if (runtime.cameraMode === 'walk') {
        if (!runtime.flight) {
          const eye = Math.max(0.02, ground) + WALK_EYE_HEIGHT
          controls.target.y += eye - camera.position.y
          camera.position.y = eye
        }
      } else {
        camera.position.y = Math.max(ground + 0.25, camera.position.y)
      }
      camera.lookAt(controls.target)
      atmosphere.update(camera.position, runtime.reducedMotion ? 0 : elapsed)
      const near = camera.position.y > 10 ? Math.min(3, camera.position.y * .01) : .03
      if (Math.abs(camera.near - near) > .005) {
        camera.near = near
        camera.updateProjectionMatrix()
      }
      if (runtime.world) {
        runtime.world.living.activity.visible = propsRef.current.showCity && camera.position.y < 40
        if (!runtime.reducedMotion && runtime.world.living.activity.visible) runtime.world.living.update(elapsed)
        if (runtime.cameraMode === 'walk' && !runtime.flight) {
          const district = nearestDistrict(unproject(camera.position.x, camera.position.z), propsRef.current.era.year)
          if (district && renderer.domElement.dataset.district !== district.id) {
            renderer.domElement.dataset.district = district.id
            propsRef.current.onDistrictChange?.(district.id)
          }
        }
      }
      if (!runtime.reducedMotion && runtime.selectionRing.visible) {
        const radius = Number(runtime.selectionRing.userData.radius ?? 1)
        const pulse = radius * (1 + Math.sin(elapsed * 2.4) * 0.025)
        runtime.selectionRing.scale.set(pulse, 1, pulse)
      }
      if (!runtime.reducedMotion && propsRef.current.timeOfDay === 'night') {
        runtime.materials.window.emissiveIntensity = 1.25 + Math.sin(elapsed * 1.7) * 0.18
        runtime.materials.water.emissiveIntensity = 0.07 + Math.sin(elapsed * 0.45) * 0.02
      }
      const shadowExtent = MathUtils.clamp(camera.position.distanceTo(controls.target) * 0.7, 8, 110)
      sun.target.position.copy(controls.target)
      sun.position.copy(controls.target).add(new Vector3(-35, 70, 45))
      sun.shadow.camera.left = -shadowExtent
      sun.shadow.camera.right = shadowExtent
      sun.shadow.camera.top = shadowExtent
      sun.shadow.camera.bottom = -shadowExtent
      sun.shadow.camera.updateProjectionMatrix()
      renderer.render(scene, camera)
      updateLabels()
      renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls)
      renderer.domElement.dataset.triangles = String(renderer.info.render.triangles)
      renderer.domElement.dataset.geometries = String(renderer.info.memory.geometries)
      renderer.domElement.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(3)).join(',')
      renderer.domElement.dataset.cameraTarget = controls.target.toArray().map((value) => value.toFixed(3)).join(',')
      if (!runtime.readyReported && runtime.world) {
        runtime.readyReported = true
        onStatusRef.current('ready')
      }
    }

    const pointerDown = (event: PointerEvent) => {
      runtime.flight = null
      if (!event.isPrimary || event.button !== 0) {
        runtime.pointerDown = null
        return
      }
      runtime.pointerDown = new Vector2(event.clientX, event.clientY)
      runtime.pointerLast = runtime.pointerDown.clone()
      runtime.pointerId = event.pointerId
      if (runtime.cameraMode === 'walk') renderer.domElement.setPointerCapture(event.pointerId)
      renderer.domElement.focus({ preventScroll: true })
    }
    const pointerMove = (event: PointerEvent) => {
      if (runtime.cameraMode !== 'walk' || event.pointerId !== runtime.pointerId || !runtime.pointerLast) return
      const dx = event.clientX - runtime.pointerLast.x
      const dy = event.clientY - runtime.pointerLast.y
      runtime.pointerLast.set(event.clientX, event.clientY)
      const direction = camera.getWorldDirection(new Vector3())
      const yaw = Math.atan2(direction.x, direction.z) - dx * 0.004
      const pitch = MathUtils.clamp(Math.asin(direction.y) - dy * 0.004, -1.15, 1.15)
      direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      controls.target.copy(camera.position).addScaledVector(direction, 1.5)
      camera.lookAt(controls.target)
    }
    const clearPointer = () => {
      runtime.pointerDown = null
      runtime.pointerLast = null
      runtime.pointerId = null
    }
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerId !== runtime.pointerId) return
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
      if (!runtime.pointerDown || runtime.pointerDown.distanceTo(new Vector2(event.clientX, event.clientY)) > 5) {
        clearPointer()
        return
      }
      clearPointer()
      const bounds = renderer.domElement.getBoundingClientRect()
      runtime.pointer.set(
        (event.clientX - bounds.left) / bounds.width * 2 - 1,
        -(event.clientY - bounds.top) / bounds.height * 2 + 1,
      )
      runtime.raycaster.setFromCamera(runtime.pointer, camera)
      const hitTargets = [...(runtime.world?.landmarks.values() ?? [])].flatMap((landmark) => landmark.hitTargets)
      const hit = runtime.raycaster.intersectObjects(hitTargets, false)[0]
      const id = hit?.object.userData.landmarkId
      if (typeof id === 'string') onSelectRef.current(id)
    }
    const clearKeys = () => runtime.keys.clear()
    const directions: Partial<Record<string, 'forward' | 'backward' | 'left' | 'right'>> = {
      w: 'forward', ArrowUp: 'forward', s: 'backward', ArrowDown: 'backward',
      a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right',
    }
    const keyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== renderer.domElement || isInteractiveElement(event.target)
        || document.querySelector('dialog[open], [aria-modal="true"]')
        || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
      const direction = directions[event.key] ?? directions[event.key.toLowerCase()]
      if (!direction) return
      event.preventDefault()
      if (!runtime.keys.has(direction)) move(direction, event.shiftKey, 0.35)
      runtime.keys.add(direction)
      runtime.fastMove = event.shiftKey
    }
    const keyUp = (event: KeyboardEvent) => {
      const direction = directions[event.key] ?? directions[event.key.toLowerCase()]
      if (direction) runtime.keys.delete(direction)
      runtime.fastMove = event.shiftKey
    }
    const wheel = (event: WheelEvent) => {
      runtime.flight = null
      if (runtime.cameraMode !== 'walk') return
      event.preventDefault()
      move(event.deltaY < 0 ? 'forward' : 'backward')
    }
    const contextLost = (event: Event) => {
      event.preventDefault()
      runtime.contextLost = true
      runtime.flight = null
      runtime.keys.clear()
      cancelAnimationFrame(runtime.frame)
      for (const label of labelsRef.current.values()) label.style.display = 'none'
      onStatusRef.current('unavailable')
    }
    const contextRestored = () => {
      if (!runtime.contextLost) return
      runtime.contextLost = false
      runtime.readyReported = false
      runtime.lastFrameTime = performance.now()
      onStatusRef.current('loading')
      renderFrame()
    }
    const motionChanged = (event: MediaQueryListEvent) => {
      runtime.reducedMotion = event.matches
      controls.enableDamping = !event.matches
      if (event.matches && runtime.flight) {
        camera.position.copy(runtime.flight.toPosition)
        controls.target.copy(runtime.flight.toTarget)
        runtime.flight = null
        updateCamera(runtime)
      }
    }
    const orbitStarted = () => { runtime.flight = null }
    controls.addEventListener('start', orbitStarted)
    motionPreference.addEventListener('change', motionChanged)
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('pointercancel', clearPointer)
    renderer.domElement.addEventListener('wheel', wheel, { passive: false })
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    renderer.domElement.addEventListener('webglcontextrestored', contextRestored)
    renderer.domElement.addEventListener('blur', clearKeys)
    window.addEventListener('blur', clearKeys)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    renderFrame()

    return () => {
      cancelAnimationFrame(runtime.frame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', clearPointer)
      renderer.domElement.removeEventListener('wheel', wheel)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestored)
      renderer.domElement.removeEventListener('blur', clearKeys)
      window.removeEventListener('blur', clearKeys)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      motionPreference.removeEventListener('change', motionChanged)
      controls.removeEventListener('start', orbitStarted)
      controls.dispose()
      runtime.world?.dispose()
      runtime.atmosphere.dispose()
      runtime.selectionRing.geometry.dispose()
      sun.shadow.dispose()
      disposeMaterials(materials)
      renderer.renderLists.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      runtimeRef.current = null
    }
  }, [])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.readyReported = false
    const atOverview = [overviewPose(1591), overviewPose(2025)].some(([position, target]) =>
      runtime.camera.position.distanceToSquared(position) < 0.01
      && runtime.controls.target.distanceToSquared(target) < 0.01)
    runtime.flight = null
    runtime.keys.clear()
    if (!runtime.contextLost) onStatusRef.current('loading')
    if (runtime.world) {
      runtime.scene.remove(runtime.world.root)
      runtime.world.dispose()
    }
    const world = buildWorld(props.era, props.landmarks, runtime.materials, runtime.palette)
    runtime.world = world
    world.living.setNight(propsRef.current.timeOfDay === 'night')
    runtime.renderer.domElement.dataset.era = String(props.era.year)
    delete runtime.renderer.domElement.dataset.district
    runtime.renderer.domElement.dataset.landmarks = [...world.landmarks.keys()].join(',')
    runtime.renderer.domElement.dataset.lakePresent = String(Boolean(world.lake))
    runtime.renderer.domElement.dataset.cityBuildings = String(world.living.metadata.buildings.length)
    runtime.renderer.domElement.dataset.cityDistricts = String(world.living.metadata.districts.filter((district) => district.buildings > 0).length)
    runtime.renderer.domElement.dataset.monumentFabric = [...world.landmarks].map(([id, site]) => `${id}:${site.root.userData.fabric}`).join(',')
    runtime.scene.add(world.root)
    runtime.scene.remove(runtime.selectionRing)
    runtime.scene.add(runtime.selectionRing)
    runtime.selectionRing.visible = false
    if (props.selectedId) {
      const selected = world.landmarks.get(props.selectedId)
      if (selected) {
        const position = new Vector3()
        selected.root.getWorldPosition(position)
        runtime.selectionRing.position.set(position.x, position.y + 0.2, position.z)
        runtime.selectionRing.userData.radius = selected.radius + 0.3
        runtime.selectionRing.scale.set(selected.radius + 0.3, 1, selected.radius + 0.3)
        runtime.selectionRing.visible = true
        focusLandmark(props.selectedId)
      }
    } else if (atOverview && runtime.cameraMode === 'orbit') {
      const [position, target] = overviewPose(props.era.year)
      beginFlight(position.clone(), target.clone())
    }
  }, [props.era, props.landmarks])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.selectedId = props.selectedId
    runtime.selectionRing.visible = false
    if (!props.selectedId) return
    const landmark = runtime.world?.landmarks.get(props.selectedId)
    if (!landmark) return
    const position = new Vector3()
    landmark.root.getWorldPosition(position)
    runtime.selectionRing.position.set(position.x, position.y + 0.2, position.z)
    runtime.selectionRing.userData.radius = landmark.radius + 0.3
    runtime.selectionRing.scale.set(landmark.radius + 0.3, 1, landmark.radius + 0.3)
    runtime.selectionRing.visible = true
  }, [props.selectedId])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    const lighting = lightingColors(runtime.palette, props.timeOfDay)
    runtime.scene.background = lighting.background
    if (runtime.scene.fog instanceof FogExp2) {
      runtime.scene.fog.color.copy(lighting.fog)
      runtime.scene.fog.density = lighting.fogDensity
    }
    runtime.sun.color.copy(lighting.sun)
    runtime.sun.intensity = lighting.sunIntensity
    runtime.hemisphere.color.copy(lighting.sky)
    runtime.hemisphere.groundColor.copy(lighting.ground)
    runtime.hemisphere.intensity = lighting.hemisphereIntensity
    runtime.ambient.color.copy(lighting.sky)
    runtime.ambient.intensity = lighting.ambientIntensity
    runtime.renderer.toneMappingExposure = lighting.exposure
    setNightMaterials(runtime.materials, props.timeOfDay === 'night')
    runtime.world?.living.setNight(props.timeOfDay === 'night')
    runtime.atmosphere.setTime(props.timeOfDay)
  }, [props.timeOfDay])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    const previousMode = runtime.cameraMode
    runtime.cameraMode = props.cameraMode
    runtime.controls.enabled = props.cameraMode === 'orbit'
    runtime.controls.minDistance = 0.8
    runtime.controls.maxPolarAngle = Math.PI * 0.47
    runtime.controls.screenSpacePanning = false
    runtime.keys.clear()
    if (props.cameraMode === 'walk') {
      runtime.renderer.domElement.focus({ preventScroll: true })
      if (previousMode === 'walk') return
      if (propsRef.current.selectedId && runtime.world?.landmarks.has(propsRef.current.selectedId)) {
        focusLandmark(propsRef.current.selectedId)
        return
      }
      const direction = new Vector3()
      runtime.camera.getWorldDirection(direction)
      direction.y = 0
      if (direction.lengthSq() < 0.001) direction.set(0, 0, -1)
      direction.normalize()
      const anchor = runtime.controls.target.clone()
      const position = anchor.clone().addScaledVector(direction, -1.15)
      clampToWorld(position, 2)
      const ground = surfaceHeight(position.x, position.z, propsRef.current.era.year >= 1563)
      position.y = Math.max(0.02, ground) + WALK_EYE_HEIGHT
      const target = position.clone().addScaledVector(direction, 1.5)
      target.y = position.y
      beginFlight(position, target, 550)
    } else if (previousMode === 'walk') {
      if (propsRef.current.selectedId) focusLandmark(propsRef.current.selectedId)
      else {
        const target = runtime.controls.target.clone()
        target.y = Math.max(0.08, surfaceHeight(target.x, target.z, propsRef.current.era.year >= 1563))
        beginFlight(target.clone().add(new Vector3(5, 8, 7)), target, 550)
      }
    }
  }, [props.cameraMode])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime?.world) return
    runtime.world.city.visible = props.showCity
    runtime.world.living.activity.visible = props.showCity
    runtime.world.roads.visible = props.showRoads
  }, [props.showCity, props.showRoads, props.era, props.landmarks])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.showLabels = props.showLabels
    if (!props.showLabels) {
      for (const button of labelsRef.current.values()) button.style.display = 'none'
    }
  }, [props.showLabels])

  return (
    <div ref={containerRef} style={rootStyle} aria-label="Hyderabad time atlas 3D world">
      <div style={labelLayerStyle} aria-label="Landmark labels">
        {visibleLandmarks.map((landmark) => (
          <button
            key={labelKey(landmark)}
            ref={(button) => {
              if (button) labelsRef.current.set(landmark.id, button)
              else labelsRef.current.delete(landmark.id)
            }}
            type="button"
            style={{
              ...labelStyle,
              borderColor: props.selectedId === landmark.id ? 'var(--cp-accent)' : 'var(--cp-border)',
              color: props.selectedId === landmark.id ? 'var(--cp-accent)' : 'var(--cp-text)',
              display: 'none',
            }}
            aria-label={`Focus ${landmark.name} on the 3D map`}
            aria-pressed={props.selectedId === landmark.id}
            onClick={() => onSelectRef.current(landmark.id)}
          >
            {landmark.name}
          </button>
        ))}
      </div>
    </div>
  )
})

export default AtlasScene

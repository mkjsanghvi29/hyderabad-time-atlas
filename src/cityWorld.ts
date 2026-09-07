import {
  BoxGeometry, Color, CylinderGeometry, DynamicDrawUsage, Group, IcosahedronGeometry,
  InstancedMesh, Matrix4, MeshStandardMaterial, Object3D,
  type BufferGeometry,
} from 'three'
import { CITY_CONNECTIONS, CITY_DISTRICTS, districtEmphasis, type CityDistrict } from './city'
import { HUSSAIN_SAGAR, MUSI, project, seededRandom } from './geography'
import type { AtlasPalette } from './scene/palette'
import type { Era, Landmark, ModelKind } from './types'
import { makeSurface } from './scene/surfaces'

type Point = readonly [x: number, z: number]
type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }
export type CityClearance = { id: string; x: number; z: number; radius: number }
export type BuildingKind = 'courtyard' | 'terrace' | 'bungalow' | 'campus' | 'shed' | 'shop' | 'apartment' | 'office'
export type CityBuilding = {
  district: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  angle: number
  radius: number
  kind: BuildingKind
}
export type CityRoad = {
  a: Point
  b: Point
  width: number
  bridge: boolean
  connection: string | null
}
export type LivingCityOptions = {
  /** Measured scene-model radii, including the desired pedestrian plaza margin. */
  landmarkClearances?: readonly CityClearance[]
  static?: boolean
}
export type LivingCity = {
  root: Group
  fabric: Group
  roads: Group
  activity: Group
  update: (elapsedSeconds: number) => void
  setNight: (night: boolean) => void
  dispose: () => void
  /** Rendered-object counts and narrative emphasis, not observed traffic or cadastral density. */
  metadata: {
    schematic: true
    buildings: CityBuilding[]
    roadSegments: CityRoad[]
    clearances: CityClearance[]
    districts: Array<{ id: string; emphasis: number; buildings: number }>
    connections: Array<{ from: string; to: string; points: Point[] }>
    activityCounts: Record<'person' | 'cart' | 'bicycle' | 'vehicle', number>
    instances: number
    drawCalls: number
  }
}

export const CITY_GROUND_Y = .02
const BLOCK = 4.8
const RIVER_MARGIN = 1.1
const LAKE_MARGIN = .65
const river = MUSI.map(project)
const lake = HUSSAIN_SAGAR.map(project)
const lakeEdge = [...lake, lake[0]]
const defaultRadii: Record<ModelKind, number> = {
  fort: 11, tombs: 6.5, charminar: 2.1, mosque: 2.7, palace: 4.6,
  bridge: 2.2, residency: 4, court: 4.3, university: 4.5, cyber: 4.5, buddha: 1.2, clock: 1.5,
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const lengthSquared = dx * dx + dz * dz
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / lengthSquared))
  return Math.hypot(point[0] - a[0] - dx * t, point[1] - a[1] - dz * t)
}

function distanceToLine(point: Point, points: readonly Point[]): number {
  let distance = Infinity
  for (let index = 1; index < points.length; index++) {
    distance = Math.min(distance, distanceToSegment(point, points[index - 1], points[index]))
  }
  return distance
}

function insideLake([x, z]: Point): boolean {
  let inside = false
  for (let i = 0, j = lake.length - 1; i < lake.length; j = i++) {
    const [ax, az] = lake[i], [bx, bz] = lake[j]
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside
  }
  return inside
}

function waterClear(point: Point, radius: number, year: number, allowRiver = false): boolean {
  return (allowRiver || distanceToLine(point, river) > radius + RIVER_MARGIN)
    && (year < 1563 || (!insideLake(point) && distanceToLine(point, lakeEdge) > radius + LAKE_MARGIN))
}

function circleClear(point: Point, radius: number, clearances: readonly CityClearance[]): boolean {
  return clearances.every((site) => Math.hypot(point[0] - site.x, point[1] - site.z) > site.radius + radius)
}

function grid(index: number): number {
  // Shared, slightly uneven street lines keep adjoining neighbourhoods joined.
  return index * BLOCK + Math.sin(index * .87) * .26
}

function gridIndex(coordinate: number): number {
  let index = Math.floor(coordinate / BLOCK)
  while (grid(index) > coordinate) index--
  while (grid(index + 1) <= coordinate) index++
  return index
}

function contains(rect: Rect, point: Point): boolean {
  return point[0] > rect.minX && point[0] < rect.maxX && point[1] > rect.minZ && point[1] < rect.maxZ
}

function crossesRect(a: Point, b: Point, rect: Rect): boolean {
  let low = 0, high = 1
  for (const [start, delta, min, max] of [
    [a[0], b[0] - a[0], rect.minX + .0001, rect.maxX - .0001],
    [a[1], b[1] - a[1], rect.minZ + .0001, rect.maxZ - .0001],
  ]) {
    if (Math.abs(delta) < .00001) {
      if (start <= min || start >= max) return false
    } else {
      const first = (min - start) / delta, second = (max - start) / delta
      low = Math.max(low, Math.min(first, second))
      high = Math.min(high, Math.max(first, second))
      if (low > high) return false
    }
  }
  return low <= high
}

function routeBetween(start: Point, end: Point, obstacles: Rect[]): Point[] {
  if (obstacles.every((rect) => !crossesRect(start, end, rect))) return [start, end]
  const corners: Point[] = obstacles.flatMap((rect) => [
    [rect.minX, rect.minZ] as Point, [rect.maxX, rect.minZ] as Point,
    [rect.maxX, rect.maxZ] as Point, [rect.minX, rect.maxZ] as Point,
  ]).filter((point) => obstacles.every((rect) => !contains(rect, point)))
  const nodes = [start, end, ...corners]
  const distances = nodes.map(() => Infinity), previous = nodes.map(() => -1)
  const visited = new Set<number>()
  distances[0] = 0
  for (let step = 0; step < nodes.length; step++) {
    let current = -1
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && (current < 0 || distances[i] < distances[current])) current = i
    }
    if (current < 0 || !Number.isFinite(distances[current])) break
    if (current === 1) {
      const result: Point[] = []
      for (let i = 1; i >= 0; i = previous[i]) result.unshift(nodes[i])
      return result
    }
    visited.add(current)
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next) || obstacles.some((rect) => crossesRect(nodes[current], nodes[next], rect))) continue
      const candidate = distances[current] + Math.hypot(nodes[current][0] - nodes[next][0], nodes[current][1] - nodes[next][1])
      if (candidate < distances[next]) {
        distances[next] = candidate
        previous[next] = current
      }
    }
  }
  throw new Error('Unable to route a schematic city connection around its exclusions')
}

class SpatialIndex<T> {
  private bins = new Map<string, T[]>()
  add(item: T, minX: number, minZ: number, maxX: number, maxZ: number): void {
    for (let x = Math.floor(minX / BLOCK); x <= Math.floor(maxX / BLOCK); x++) {
      for (let z = Math.floor(minZ / BLOCK); z <= Math.floor(maxZ / BLOCK); z++) {
        const key = `${x}:${z}`
        const entries = this.bins.get(key) ?? []
        entries.push(item)
        this.bins.set(key, entries)
      }
    }
  }
  near(x: number, z: number): readonly T[] {
    return this.bins.get(`${Math.floor(x / BLOCK)}:${Math.floor(z / BLOCK)}`) ?? []
  }
}

type MaterialKey = 'sand' | 'pale' | 'stone' | 'roof' | 'recess' | 'trim' | 'glass' | 'canopy' | 'foliage' | 'trunk' | 'paving' | 'road' | 'mark'
type GeometryKey = 'box' | 'round' | 'crown' | 'wheel'
type Part = { geometry: GeometryKey; material: MaterialKey; values: number[] }

class Batches {
  readonly parts = new Map<string, Part>()
  add(material: MaterialKey, x: number, y: number, z: number, width: number, height: number, depth: number, angle = 0, geometry: GeometryKey = 'box'): void {
    const key = `${material}:${geometry}`
    const part = this.parts.get(key) ?? { material, geometry, values: [] }
    part.values.push(x, y, z, width, height, depth, angle)
    this.parts.set(key, part)
  }
  finish(group: Group, geometries: Record<GeometryKey, BufferGeometry>, materials: Record<MaterialKey, MeshStandardMaterial>): number {
    const transform = new Object3D()
    let count = 0
    for (const [key, part] of this.parts) {
      const mesh = new InstancedMesh(geometries[part.geometry], materials[part.material], part.values.length / 7)
      mesh.name = `${group.name}-${key}`
      const tint = new Color()
      for (let i = 0; i < part.values.length; i += 7) {
        transform.position.set(part.values[i], part.values[i + 1], part.values[i + 2])
        transform.scale.set(part.values[i + 3], part.values[i + 4], part.values[i + 5])
        transform.rotation.set(0, part.values[i + 6], 0)
        transform.updateMatrix()
        mesh.setMatrixAt(i / 7, transform.matrix)
        const variation = Math.sin(part.values[i] * 12.9898 + part.values[i + 2] * 78.233)
        tint.setScalar(.88 + Math.abs(variation) * .18)
        mesh.setColorAt(i / 7, tint)
      }
      mesh.castShadow = part.material !== 'road' && part.material !== 'paving' && part.material !== 'mark'
      mesh.receiveShadow = true
      mesh.computeBoundingSphere()
      group.add(mesh)
      count += mesh.count
    }
    this.parts.clear()
    return count
  }
}

function chooseKind(district: CityDistrict, year: number, random: () => number): BuildingKind {
  const pick = random()
  if (year < 1900) return pick < .72 ? 'courtyard' : 'terrace'
  if (district.character === 'cantonment' && pick < .65) return 'bungalow'
  if (district.character === 'campus' && year >= 1948) return 'campus'
  if (district.character === 'industrial' && year >= 1948 && pick < .64) return 'shed'
  if (district.character === 'technology') {
    if (year >= 2025) return pick < .6 ? 'office' : 'apartment'
    return pick < .3 ? 'campus' : 'terrace'
  }
  if ((district.character === 'bazaar' || district.character === 'fort') && pick < .56) return 'courtyard'
  if (year >= 1998 && pick > .52) return 'apartment'
  return pick < .2 ? 'terrace' : 'shop'
}

function addBuilding(batch: Batches, building: CityBuilding, year: number, random: () => number): void {
  const { x, z, width: w, depth: d, height: h, angle, kind } = building
  const wall: MaterialKey = random() < .5 ? 'sand' : random() < .6 ? 'pale' : 'stone'
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const put = (material: MaterialKey, lx: number, y: number, lz: number, width: number, height: number, depth: number, geometry: GeometryKey = 'box') => {
    batch.add(material, x + lx * cos + lz * sin, CITY_GROUND_Y + y, z - lx * sin + lz * cos, width, height, depth, angle, geometry)
  }
  const parapet = (height: number, frontHeight = height) => {
    put('trim', 0, height + .025, -d / 2 + .025, w, .05, .05)
    put('trim', 0, frontHeight + .025, d / 2 - .025, w, .05, .05)
    put('trim', -w / 2 + .025, height + .025, 0, .05, .05, d)
    put('trim', w / 2 - .025, height + .025, 0, .05, .05, d)
  }
  const window = (lx: number, y: number, lz: number, width: number, height: number) => {
    put('trim', lx, y, lz, width + .045, height + .035, .035)
    put(kind === 'office' ? 'glass' : 'recess', lx, y + .004, lz + .02, width, height, .02)
  }
  put('paving', 0, .008, 0, w + .10, .016, d + .10)
  if (kind === 'courtyard') {
    // Four domestic wings leave a real, open-air courtyard, not a painted roof.
    put(wall, 0, h / 2, -d * .35, w, h, d * .3)
    put(wall, -w * .36, h / 2, d * .07, w * .28, h, d * .55)
    put(wall, w * .36, h / 2, d * .07, w * .28, h, d * .55)
    put(wall, 0, h * .40, d * .4, w, h * .8, d * .2)
    put('roof', 0, h + .012, -d * .35, w, .024, d * .3)
    put('roof', -w * .36, h + .012, d * .07, w * .28, .024, d * .55)
    put('roof', w * .36, h + .012, d * .07, w * .28, .024, d * .55)
    put('roof', 0, h * .8 + .012, d * .4, w, .024, d * .2)
    parapet(h, h * .8)
    put('trim', -w * .1, .022, 0, w * .18, .044, d * .14, 'round')
  } else {
    put(wall, 0, h / 2, 0, w, h, d)
    put('roof', 0, h + .012, 0, w + .035, .024, d + .035)
    if (kind === 'shed') {
      put('stone', 0, h + .065, 0, w * .92, .1, d * .3)
      put('recess', 0, h * .4, d / 2 + .016, w * .55, h * .68, .032)
    } else if (kind === 'bungalow' || kind === 'campus') {
      put('roof', 0, h * .73, d * .61, w * 1.05, .055, d * .27)
      for (const side of [-.4, 0, .4]) put('trim', w * side, h * .36, d * .69, .038, h * .72, .038)
    } else {
      parapet(h)
    }
  }
  if (kind !== 'shed') {
    const doorHeight = Math.min(h * .64, .18)
    put('trim', 0, (doorHeight + .025) / 2, d / 2 + .018, .145, doorHeight + .025, .045)
    put('recess', 0, doorHeight / 2, d / 2 + .043, .105, doorHeight, .014)
    const floors = Math.min(7, Math.max(1, Math.floor(h / .25)))
    for (let floor = 0; floor < floors; floor++) {
      const y = Math.min(h * .62, .20) + floor * (h - .2) / Math.max(1, floors)
      for (const side of [-.31, .31]) window(w * side, y, d / 2 + .018, w * .18, Math.min(.105, h * .22))
      if (kind === 'office' || kind === 'apartment') {
        put(kind === 'office' ? 'glass' : 'trim', -w / 2 - .012, y, 0, .025, .08, d * .75)
        put(kind === 'office' ? 'glass' : 'trim', w / 2 + .012, y, 0, .025, .08, d * .75)
      }
    }
  }
  if (kind === 'shop' || (kind === 'courtyard' && random() < .66)) {
    put('canopy', 0, Math.min(.22, h * .72), d / 2 + .16, w * .9, .025, .32)
    for (const side of [-.4, .4]) put('trunk', w * side, .10, d / 2 + .29, .018, .20, .018)
    put('sand', w * .23, .045, d / 2 + .17, .16, .09, .09)
    put('foliage', w * .23, .10, d / 2 + .17, .13, .04, .07)
    for (const side of [-.22, -.06]) {
      put('sand', w * side, .04, d / 2 + .13, .07, .08, .07, 'round')
    }
  }
  if (kind === 'terrace' || kind === 'courtyard' || kind === 'shop') {
    put(wall, -w * .26, h + .055, -d * .3, w * .2, .11, d * .23)
    if (random() < .5) put('canopy', w * .23, h + .037, -d * .30, w * .22, .018, d * .18)
    if (year >= 1948 && random() < .52) put('roof', w * .25, h + .10, -d * .3, .13, .16, .13, 'round')
  }
}

type ActorKind = keyof LivingCity['metadata']['activityCounts']
type Actor = { kind: ActorKind; points: Point[]; lengths: number[]; total: number; speed: number; phase: number }
type ActorPart = { actor: Actor; local: Matrix4; mesh: InstancedMesh; index: number }

function makeActivity(
  actors: Actor[], group: Group, geometries: Record<GeometryKey, BufferGeometry>, materials: Record<MaterialKey, MeshStandardMaterial>,
): { render: (elapsed: number) => void; instances: number } {
  const source: Array<{ actor: Actor; geometry: GeometryKey; material: MaterialKey; local: Matrix4 }> = []
  const dummy = new Object3D()
  for (const actor of actors) {
    const part = (material: MaterialKey, geometry: GeometryKey, x: number, y: number, z: number, w: number, h: number, d: number) => {
      dummy.position.set(x, y, z)
      dummy.scale.set(w, h, d)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      source.push({ actor, material, geometry, local: dummy.matrix.clone() })
    }
    if (actor.kind === 'person') {
      part('canopy', 'box', 0, .059, 0, .034, .064, .025)
      part('sand', 'crown', 0, .107, 0, .029, .03, .029)
      for (const x of [-.011, .011]) part('roof', 'box', x, .018, 0, .010, .036, .013)
    } else {
      const vehicle = actor.kind === 'vehicle', bike = actor.kind === 'bicycle'
      const width = bike ? .045 : .13, length = bike ? .14 : .24
      part(vehicle ? 'stone' : 'trunk', 'box', 0, .068, 0, width, vehicle ? .075 : .025, length)
      if (vehicle) {
        part('glass', 'box', 0, .135, -.015, .105, .055, .12)
      } else {
        part('canopy', 'box', 0, .121, -.035, .032, .059, .03)
        part('sand', 'crown', 0, .163, -.035, .028, .029, .028)
        if (!bike) part('sand', 'box', 0, .1, .025, .10, .045, .1)
      }
      for (const side of [-1, 1]) {
        for (const axle of [-1, 1]) part('roof', 'wheel', side * width / 2, .038, axle * length * .30, .018, .065, .065)
      }
    }
  }
  const groups = new Map<string, typeof source>()
  for (const item of source) {
    const key = `${item.material}:${item.geometry}`
    const items = groups.get(key) ?? []
    items.push(item)
    groups.set(key, items)
  }
  const parts: ActorPart[] = []
  for (const [key, items] of groups) {
    const mesh = new InstancedMesh(geometries[items[0].geometry], materials[items[0].material], items.length)
    mesh.name = `living-activity-${key}`
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.castShadow = true
    group.add(mesh)
    items.forEach((item, index) => parts.push({ actor: item.actor, local: item.local, mesh, index }))
  }
  const transforms = new Map(actors.map((actor) => [actor, new Matrix4()]))
  const matrix = new Matrix4()
  const render = (elapsed: number) => {
    for (const actor of actors) {
      const cycle = (actor.phase + elapsed * actor.speed) % (2 * actor.total)
      const backwards = cycle > actor.total
      let distance = backwards ? 2 * actor.total - cycle : cycle
      let segment = 0
      while (segment < actor.lengths.length - 1 && distance > actor.lengths[segment]) distance -= actor.lengths[segment++]
      const a = actor.points[segment], b = actor.points[segment + 1]
      const length = actor.lengths[segment]
      const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length
      const lane = actor.kind === 'person' ? .12 : -.09
      const x = a[0] + dx * distance - dz * lane, z = a[1] + dz * distance + dx * lane
      dummy.position.set(x, distanceToLine([x, z], river) < RIVER_MARGIN ? .135 : CITY_GROUND_Y + .025, z)
      dummy.scale.set(1, 1, 1)
      dummy.rotation.set(0, Math.atan2(dx, dz) + (backwards ? Math.PI : 0), 0)
      dummy.updateMatrix()
      transforms.get(actor)!.copy(dummy.matrix)
    }
    for (const part of parts) {
      matrix.multiplyMatrices(transforms.get(part.actor)!, part.local)
      part.mesh.setMatrixAt(part.index, matrix)
    }
    for (const child of group.children) if (child instanceof InstancedMesh) child.instanceMatrix.needsUpdate = true
  }
  render(0)
  return { render, instances: parts.length }
}

/** Original, interpretive urban fabric; neither surveyed roads nor a historical building inventory. */
export function buildLivingCity(era: Era, palette: AtlasPalette, landmarks: readonly Landmark[], options: LivingCityOptions = {}): LivingCity {
  if (!Number.isFinite(era.year)) throw new RangeError('The living city requires a finite chapter year')
  const root = new Group(), roads = new Group(), activity = new Group(), fabric = new Group()
  root.name = `living-city-${era.year}`
  roads.name = 'living-roads'
  fabric.name = 'living-buildings'
  activity.name = 'living-activity'
  root.add(fabric, roads, activity)
  const clearances = landmarks.filter((site) => era.year >= site.visibleFrom).map((site) => {
    const supplied = options.landmarkClearances?.find((entry) => entry.id === site.id)
    const [x, z] = project(site.coordinates)
    return supplied ? { ...supplied } : { id: site.id, x, z, radius: defaultRadii[site.model] }
  })
  for (const site of clearances) {
    if (![site.x, site.z, site.radius].every(Number.isFinite) || site.radius < 0) throw new RangeError(`Invalid city clearance: ${site.id}`)
  }
  const obstacles: Rect[] = clearances.map((site) => ({
    minX: site.x - site.radius - 1.2, maxX: site.x + site.radius + 1.2,
    minZ: site.z - site.radius - 1.2, maxZ: site.z + site.radius + 1.2,
  }))
  if (era.year >= 1563) obstacles.push({
    minX: Math.min(...lake.map((p) => p[0])) - 1.9, maxX: Math.max(...lake.map((p) => p[0])) + 1.9,
    minZ: Math.min(...lake.map((p) => p[1])) - 1.9, maxZ: Math.max(...lake.map((p) => p[1])) + 1.9,
  })
  const active = CITY_DISTRICTS.filter((district) => districtEmphasis(district, era.year) >= .075)
  const districtStats = CITY_DISTRICTS.map((district) => ({ id: district.id, emphasis: districtEmphasis(district, era.year), buildings: 0 }))
  const cells = new Map<string, { ix: number; iz: number; district: CityDistrict; density: number; score: number }>()
  const hubs = new Map<string, Point>()
  const addCell = (ix: number, iz: number, district: CityDistrict, density: number, score: number) => {
    const key = `${ix}:${iz}`, existing = cells.get(key)
    if (!existing || score > existing.score) cells.set(key, { ix, iz, district, density, score })
  }
  for (const district of active) {
    const [cx, cz] = project(district.coordinates), growth = districtEmphasis(district, era.year)
    const spread = .28 + .72 * Math.sqrt(growth)
    const rx = district.radius[0] * 10 * spread, rz = district.radius[1] * 10 * spread
    for (let ix = gridIndex(cx - rx); ix <= gridIndex(cx + rx); ix++) {
      for (let iz = gridIndex(cz - rz); iz <= gridIndex(cz + rz); iz++) {
        const nx = ((grid(ix) + grid(ix + 1)) / 2 - cx) / rx
        const nz = ((grid(iz) + grid(iz + 1)) / 2 - cz) / rz
        const distance = Math.hypot(nx, nz)
        if (distance < 1) addCell(ix, iz, district, growth, (1 - distance) * .6 + growth)
      }
    }
    const centerX = gridIndex(cx), centerZ = gridIndex(cz)
    let hub: Point | undefined
    for (let ring = 0; ring < 20 && !hub; ring++) {
      const candidates: Point[] = []
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue
          const point: Point = [grid(centerX + dx), grid(centerZ + dz)]
          if (obstacles.every((rect) => !contains(rect, point)) && waterClear(point, .6, era.year)) candidates.push(point)
        }
      }
      candidates.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz))
      hub = candidates[0]
    }
    if (!hub) throw new Error(`No dry street approach found for ${district.id}`)
    hubs.set(district.id, hub)
  }
  const connections: LivingCity['metadata']['connections'] = []
  for (const [from, to] of CITY_CONNECTIONS) {
    const a = hubs.get(from), b = hubs.get(to)
    if (!a || !b) continue
    const points = routeBetween(a, b, obstacles)
    connections.push({ from, to, points })
    const source = active.find((district) => district.id === from)!
    const target = active.find((district) => district.id === to)!
    const density = Math.min(districtEmphasis(source, era.year), districtEmphasis(target, era.year)) * .72
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1], end = points[i]
      const count = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / BLOCK))
      for (let step = 0; step <= count; step++) {
        const t = step / count, x = start[0] + (end[0] - start[0]) * t, z = start[1] + (end[1] - start[1]) * t
        addCell(gridIndex(x), gridIndex(z), t < .5 ? source : target, density, density * .6)
      }
    }
  }
  const roadSegments: CityRoad[] = []
  const roadIndex = new SpatialIndex<CityRoad>()
  const roadBatch = new Batches(), buildingBatch = new Batches()
  const streetWidth = era.year < 1900 ? .42 : era.year < 1998 ? .5 : .6
  const addRoad = (a: Point, b: Point, width: number, connection: string | null) => {
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (distance < .001) return
    const pieces = Math.ceil(distance / .85)
    for (let i = 0; i < pieces; i++) {
      const start: Point = [a[0] + (b[0] - a[0]) * i / pieces, a[1] + (b[1] - a[1]) * i / pieces]
      const end: Point = [a[0] + (b[0] - a[0]) * (i + 1) / pieces, a[1] + (b[1] - a[1]) * (i + 1) / pieces]
      const midpoint: Point = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
      if (!waterClear(midpoint, width / 2 + .45, era.year, true) || !circleClear(midpoint, width / 2 + .45, clearances)) continue
      const bridge = distanceToLine(midpoint, river) < RIVER_MARGIN + .45
      const segment = { a: start, b: end, width, bridge, connection }
      roadSegments.push(segment)
      roadIndex.add(segment, Math.min(start[0], end[0]) - 2, Math.min(start[1], end[1]) - 2, Math.max(start[0], end[0]) + 2, Math.max(start[1], end[1]) + 2)
      const angle = Math.atan2(end[0] - start[0], end[1] - start[1]), length = distance / pieces + .016
      roadBatch.add('road', midpoint[0], bridge ? .115 : CITY_GROUND_Y + .009, midpoint[1], width, .018, length, angle)
      if (era.year >= 1948 && connection && i % 3 === 0) roadBatch.add('mark', midpoint[0], bridge ? .126 : CITY_GROUND_Y + .020, midpoint[1], .023, .003, length * .48, angle)
      if (bridge && connection) {
        for (const side of [-1, 1]) {
          roadBatch.add('trim', midpoint[0] + Math.cos(angle) * side * width * .49, .17, midpoint[1] - Math.sin(angle) * side * width * .49, .027, .06, length, angle)
        }
      }
    }
  }
  for (const connection of connections) {
    for (let i = 1; i < connection.points.length; i++) addRoad(connection.points[i - 1], connection.points[i], streetWidth * 1.45, `${connection.from}:${connection.to}`)
  }
  const edges = new Set<string>()
  for (const { ix, iz } of cells.values()) {
    for (const [x1, z1, x2, z2] of [[ix, iz, ix + 1, iz], [ix, iz + 1, ix + 1, iz + 1], [ix, iz, ix, iz + 1], [ix + 1, iz, ix + 1, iz + 1]]) {
      const key = `${x1}:${z1}:${x2}:${z2}`
      if (!edges.has(key)) {
        edges.add(key)
        addRoad([grid(x1), grid(z1)], [grid(x2), grid(z2)], streetWidth, null)
      }
    }
  }
  const buildings: CityBuilding[] = []
  const occupied = new SpatialIndex<CityBuilding>()
  for (const cell of cells.values()) {
    const random = seededRandom(`living-parcel:${cell.ix}:${cell.iz}`)
    const minX = grid(cell.ix), maxX = grid(cell.ix + 1), minZ = grid(cell.iz), maxZ = grid(cell.iz + 1)
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2
    const plots: Array<[number, number, number]> = []
    for (const slot of [-1, 0, 1]) {
      plots.push([cx + slot * 1.18, minZ + 1.40, Math.PI], [cx + slot * 1.18, maxZ - 1.40, 0])
    }
    plots.push([minX + 1.40, cz, -Math.PI / 2], [maxX - 1.40, cz, Math.PI / 2])
    const open = cell.district.character === 'cantonment' || cell.district.character === 'campus'
    for (const [x, z, angle] of plots) {
      const chance = random()
      const kind = chooseKind(cell.district, era.year, random)
      const width = .60 + random() * .32
      const depth = .53 + random() * .34
      const tall = kind === 'office' || kind === 'apartment'
      const height = kind === 'office' ? 1.5 + random() * 3.2
        : kind === 'apartment' ? .68 + random() * (era.year >= 2025 ? 1.75 : .72)
        : kind === 'campus' ? .32 + random() * .34
        : kind === 'shed' ? .26 + random() * .14 : .18 + random() * .21
      if (chance > (.19 + cell.density * .77) * (open ? .58 : 1)) continue
      const radius = Math.hypot(width, depth) / 2 + .30
      const point: Point = [x, z]
      if (!waterClear(point, radius, era.year) || !circleClear(point, radius, clearances)) continue
      if (roadIndex.near(x, z).some((road) => distanceToSegment(point, road.a, road.b) < radius + road.width / 2 + .03)) continue
      if (occupied.near(x, z).some((other) => Math.hypot(x - other.x, z - other.z) < radius + other.radius - .17)) continue
      const building = { district: cell.district.id, x, z, angle, width, depth, height, radius, kind }
      buildings.push(building)
      occupied.add(building, x - radius * 2, z - radius * 2, x + radius * 2, z + radius * 2)
      districtStats.find((district) => district.id === cell.district.id)!.buildings++
      addBuilding(buildingBatch, building, era.year, random)
      if (tall && era.year >= 2025) buildingBatch.add('stone', x, CITY_GROUND_Y + height + .09, z, width * .3, .18, depth * .36, angle)
    }
    const gardenPoint: Point = [cx, cz]
    if (random() < (open ? .95 : .55) && waterClear(gardenPoint, .5, era.year) && circleClear(gardenPoint, .5, clearances)
      && roadIndex.near(cx, cz).every((road) => distanceToSegment(gardenPoint, road.a, road.b) > road.width / 2 + .55)
      && occupied.near(cx, cz).every((building) => Math.hypot(cx - building.x, cz - building.z) > building.radius + .3)) {
      buildingBatch.add('trunk', cx, CITY_GROUND_Y + .16, cz, .055, .32, .055, 0, 'round')
      for (let lobe = 0; lobe < 5; lobe++) {
        const angle = lobe * 2.4
        const radius = lobe === 0 ? 0 : .17
        buildingBatch.add('foliage', cx + Math.cos(angle) * radius, CITY_GROUND_Y + .37 + (lobe === 0 ? .12 : 0), cz + Math.sin(angle) * radius, .36, .33, .35, angle, 'crown')
      }
      if (open) buildingBatch.add('paving', cx, CITY_GROUND_Y + .006, cz, 1.15, .012, 1.05)
    }
  }
  const color = (a: Color, b: Color, amount: number) => a.clone().lerp(b, amount)
  const material = (value: Color, roughness = .9) => new MeshStandardMaterial({ color: value, roughness })
  const materials: Record<MaterialKey, MeshStandardMaterial> = {
    sand: material(palette.sandstone), pale: material(palette.sandstoneLight), stone: material(palette.stone),
    roof: material(palette.roof), recess: material(color(palette.granite, palette.night, .5)),
    trim: material(color(palette.sandstoneLight, palette.stone, .45)), glass: material(color(palette.water, palette.stone, .55), .36),
    canopy: material(palette.accent), foliage: material(palette.foliage), trunk: material(color(palette.granite, palette.sandstone, .35)),
    paving: material(color(palette.terrain, palette.stone, .20)),
    road: material(era.year < 1900 ? color(palette.terrainDark, palette.sandstone, .45) : era.year < 1948 ? palette.terrainDark : color(palette.road, palette.granite, .25)),
    mark: material(palette.sandstoneLight),
  }
  const plaster = makeSurface('plaster'), masonry = makeSurface('masonry'), roofSurface = makeSurface('roof')
  const pavingSurface = makeSurface('ground'), roadSurface = makeSurface('road'), cloth = makeSurface('cloth')
  const textures = [plaster, masonry, roofSurface, pavingSurface, roadSurface, cloth]
  for (const finish of [materials.sand, materials.pale]) {
    finish.map = plaster
    finish.bumpMap = plaster
    finish.bumpScale = .004
  }
  materials.stone.map = masonry
  materials.stone.bumpMap = masonry
  materials.stone.bumpScale = .006
  materials.roof.map = roofSurface
  materials.paving.map = pavingSurface
  materials.road.map = roadSurface
  materials.canopy.map = cloth
  materials.glass.metalness = .35
  const wheel = new CylinderGeometry(.5, .5, 1, 8)
  wheel.rotateZ(Math.PI / 2)
  const geometries: Record<GeometryKey, BufferGeometry> = {
    box: new BoxGeometry(1, 1, 1), round: new CylinderGeometry(.5, .5, 1, 8),
    crown: new IcosahedronGeometry(.5, 1), wheel,
  }
  let instances = buildingBatch.finish(fabric, geometries, materials) + roadBatch.finish(roads, geometries, materials)
  const actors: Actor[] = []
  const activityCounts: LivingCity['metadata']['activityCounts'] = { person: 0, cart: 0, bicycle: 0, vehicle: 0 }
  const routes = connections.length ? connections.map((connection) => connection.points)
    : roadSegments.filter((segment) => !segment.bridge).slice(0, 12).map((segment) => [segment.a, segment.b])
  const movementRandom = seededRandom(`living-activity:${era.year}`)
  for (let i = 0; i < Math.min(168, Math.max(12, active.length * 6)) && routes.length; i++) {
    const points = routes[i % routes.length]
    const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]))
    const total = lengths.reduce((sum, length) => sum + length, 0)
    if (total < .001) continue
    const pick = movementRandom()
    const motorFraction = era.year >= 2025 ? .34 : era.year >= 1998 ? .24 : era.year >= 1948 ? .08 : era.year >= 1908 ? .015 : 0
    const kind: ActorKind = pick < motorFraction ? 'vehicle' : era.year >= 1908 && pick < motorFraction + .12 ? 'bicycle' : pick > .81 ? 'cart' : 'person'
    activityCounts[kind]++
    actors.push({ kind, points, lengths, total, speed: kind === 'vehicle' ? .35 : kind === 'bicycle' ? .15 : kind === 'cart' ? .065 : .045, phase: movementRandom() * total * 2 })
  }
  const movement = makeActivity(actors, activity, geometries, materials)
  instances += movement.instances
  let disposed = false
  return {
    root, fabric, roads, activity,
    metadata: { schematic: true, buildings, roadSegments, clearances, districts: districtStats, connections, activityCounts, instances, drawCalls: fabric.children.length + roads.children.length + activity.children.length },
    update: (elapsed) => {
      if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('City animation time must be a finite, nonnegative number')
      if (!disposed && !options.static) movement.render(elapsed)
    },
    setNight: (night) => {
      materials.recess.emissive.copy(palette.window)
      materials.recess.emissiveIntensity = night ? .36 : 0
      materials.glass.emissive.copy(palette.window)
      materials.glass.emissiveIntensity = night ? .22 : 0
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      root.removeFromParent()
      root.traverse((object) => { if (object instanceof InstancedMesh) object.dispose() })
      for (const geometry of Object.values(geometries)) geometry.dispose()
      for (const owned of Object.values(materials)) owned.dispose()
      for (const texture of textures) texture.dispose()
      root.clear()
    },
  }
}

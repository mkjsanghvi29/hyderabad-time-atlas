import * as THREE from 'three'
import { seededRandom } from '../geography'
import type { MapPalette } from '../geographicStyle'
import type { TimeOfDay } from '../types'
import { placesInChapter, pointInPolygon, projectCity, segmentDistance } from './geography'
import type { CityChapter, CityPlace, WorldCity, WorldModel } from './types'

type Point = readonly [number, number]
export type HistoricalPalette = Record<
  'sky' | 'land' | 'cliff' | 'sand' | 'stone' | 'roof' | 'trim' | 'water' | 'foam' | 'leaves' | 'trunk' | 'glow' | 'ink',
  THREE.Color
>
export type WaterFootprint = { kind: 'river' | 'area'; points: Point[]; halfWidth: number }
export type BuildingPlot = {
  x: number; z: number; width: number; depth: number; height: number; angle: number; variation: number
}
export type HistoricalBounds = { minX: number; maxX: number; minZ: number; maxZ: number }
type Primitive = 'box' | 'cylinder' | 'cone' | 'pyramid' | 'sphere' | 'dome' | 'arch' | 'shell'
type Tone = Exclude<keyof HistoricalPalette, 'sky' | 'ink'>
type Part = { matrix: THREE.Matrix4; owner: string | null }

export function historicalPalette(source: MapPalette, warmth: string): HistoricalPalette {
  const color = (value: string) => new THREE.Color(value)
  const blend = (a: string, b: string, amount: number) => color(a).lerp(color(b), amount)
  return {
    sky: color(source.background),
    land: blend(source.background, warmth, .18).lerp(color(source.success), .035),
    cliff: blend(source.borderStrong, source.background, .34),
    sand: blend(source.surface, warmth, .27),
    stone: blend(source.surface, source.muted, .19),
    roof: blend(source.accent, source.text, .38),
    trim: blend(source.surface, warmth, .06),
    water: blend(source.link, source.background, .28),
    foam: blend(source.surface, source.link, .14),
    leaves: blend(source.success, source.muted, .43).multiplyScalar(.78),
    trunk: blend(source.muted, warmth, .2),
    glow: blend(warmth, source.surface, .3),
    ink: color(source.text),
  }
}

export function historicalBounds(city: WorldCity): HistoricalBounds {
  const [west, south, east, north] = city.historicalBounds
  const [minX, maxZ] = projectCity(city, [west, south])
  const [maxX, minZ] = projectCity(city, [east, north])
  return { minX, maxX, minZ, maxZ }
}

export function projectWater(city: WorldCity): WaterFootprint[] {
  return city.water.map((water) => ({
    kind: water.kind,
    points: water.points.map((point) => projectCity(city, point)),
    halfWidth: (water.widthKm ?? .24) * 5,
  }))
}

export function onWater(x: number, z: number, water: WaterFootprint[], clearance = 0): boolean {
  return water.some((body) => {
    if (body.kind === 'area' && pointInPolygon(x, z, body.points)) return true
    const count = body.kind === 'area' ? body.points.length : body.points.length - 1
    for (let i = 0; i < count; i++) {
      if (segmentDistance(x, z, body.points[i], body.points[(i + 1) % body.points.length])
        <= clearance + (body.kind === 'river' ? body.halfWidth : 0)) return true
    }
    return false
  })
}

export function landmarkScale(chapter: CityChapter): number {
  return THREE.MathUtils.clamp(chapter.spanKm * .095, .7, 2.2)
}

const MODEL_SIZE: Record<WorldModel, { radius: number; height: number }> = {
  pyramid: { radius: 4.1, height: 6.5 }, temple: { radius: 3.6, height: 3.6 },
  fort: { radius: 4.4, height: 3.8 }, cathedral: { radius: 3.8, height: 7.5 },
  palace: { radius: 4.5, height: 4 }, pagoda: { radius: 2.8, height: 6.4 },
  tower: { radius: 2.1, height: 10 }, bridge: { radius: 5.6, height: 4.5 },
  dome: { radius: 3.6, height: 5.6 }, port: { radius: 4.2, height: 4 },
  opera: { radius: 4.5, height: 4.8 }, statue: { radius: 2, height: 7 },
  district: { radius: 3.7, height: 3.2 }, park: { radius: 4.2, height: 2.4 },
  hill: { radius: 6.2, height: 5.5 },
}

function localLandmarkScale(city: WorldCity | undefined, place: CityPlace, chapter: CityChapter): number {
  const base = landmarkScale(chapter)
  if (!city) return base
  const [x, z] = projectCity(city, place.coordinates)
  let scale = base
  for (const neighbor of placesInChapter(city, chapter.year)) {
    if (neighbor.id === place.id) continue
    const [nx, nz] = projectCity(city, neighbor.coordinates)
    scale = Math.min(scale, Math.hypot(x - nx, z - nz) / (MODEL_SIZE[place.model].radius + MODEL_SIZE[neighbor.model].radius) * .92)
  }
  return Math.max(.3, scale)
}

export function landmarkRadius(place: CityPlace, chapter: CityChapter, city?: WorldCity): number {
  return MODEL_SIZE[place.model].radius * localLandmarkScale(city, place, chapter)
}

function shorelineAngle(point: Point, water: WaterFootprint[], fallback: number): number {
  let distance = Infinity, angle = fallback
  for (const body of water) {
    const count = body.kind === 'area' ? body.points.length : body.points.length - 1
    for (let i = 0; i < count; i++) {
      const a = body.points[i], b = body.points[(i + 1) % body.points.length]
      const next = segmentDistance(point[0], point[1], a, b)
      if (next < distance) {
        distance = next
        angle = Math.atan2(b[1] - a[1], b[0] - a[0])
      }
    }
  }
  return angle
}

export function districtBuildings(city: WorldCity, chapter: CityChapter): BuildingPlot[] {
  const bounds = historicalBounds(city), water = projectWater(city)
  const landmarks = placesInChapter(city, chapter.year).map((place) => ({
    point: projectCity(city, place.coordinates), radius: landmarkRadius(place, chapter, city) + .65,
  }))
  const result: BuildingPlot[] = []
  const occupied = new Map<string, BuildingPlot[]>()
  const cell = 3
  const heightFactor = chapter.year < 800 ? .65 : chapter.year < 1700 ? 1 : chapter.year < 1900 ? 1.65 : 2.6
  const districts = city.districts.filter((item) => item.visibleFrom <= chapter.year)
  const budget = Math.floor(2400 / Math.max(city.districts.length, 1))
  for (const district of districts) {
    const random = seededRandom(`${city.id}:${district.name}:streets`)
    const [cx, cz] = projectCity(city, district.coordinates)
    const radius = district.radiusKm * 10
    const spacing = THREE.MathUtils.clamp(radius / 12, .85, 1.8)
    const count = Math.ceil(radius / spacing)
    const angle = shorelineAngle([cx, cz], water, Math.atan2(cz, cx) + Math.PI / 4)
    const density = Math.min(THREE.MathUtils.clamp(chapter.density, 0, 1), budget / (Math.PI * count * count * .7))
    let districtCount = 0
    for (let row = -count; row <= count && districtCount < budget; row++) {
      for (let col = -count; col <= count && districtCount < budget; col++) {
        const chance = random(), variation = random(), jitterX = random(), jitterZ = random()
        if (Math.abs(row) % 5 === 0 || Math.abs(col) % 6 === 0 || chance > density) continue
        // Bend local streets around each district instead of stamping a city-wide grid.
        const u = col * spacing + Math.sin(row / count * 2.4) * radius * .11 + (jitterX - .5) * spacing * .15
        const v = row * spacing + (jitterZ - .5) * spacing * .15
        if (Math.hypot(u, v) > radius) continue
        const x = cx + u * Math.cos(angle) - v * Math.sin(angle)
        const z = cz + u * Math.sin(angle) + v * Math.cos(angle)
        const width = spacing * (.45 + variation * .22), depth = spacing * (.47 + jitterZ * .2)
        const clearance = Math.hypot(width, depth) / 2 + .16
        if (x < bounds.minX + clearance || x > bounds.maxX - clearance
          || z < bounds.minZ + clearance || z > bounds.maxZ - clearance
          || onWater(x, z, water, clearance)
          || landmarks.some(({ point, radius: exclusion }) => Math.hypot(x - point[0], z - point[1]) < exclusion + clearance)) continue
        const gx = Math.floor(x / cell), gz = Math.floor(z / cell)
        let collision = false
        for (let dx = -1; dx <= 1 && !collision; dx++) {
          for (let dz = -1; dz <= 1 && !collision; dz++) {
            collision = (occupied.get(`${gx + dx}:${gz + dz}`) ?? []).some((other) =>
              Math.hypot(x - other.x, z - other.z) < clearance + Math.hypot(other.width, other.depth) / 2)
          }
        }
        if (collision) continue
        const plot = { x, z, width, depth, height: (.32 + variation * .8) * heightFactor, angle: -angle, variation }
        result.push(plot)
        districtCount++
        const key = `${gx}:${gz}`
        const neighbors = occupied.get(key) ?? []
        neighbors.push(plot)
        occupied.set(key, neighbors)
      }
    }
  }
  return result
}

function clipPolygon(input: Point[], bounds: HistoricalBounds): Point[] {
  let points = input
  const edges: [0 | 1, number, boolean][] = [
    [0, bounds.minX, true], [0, bounds.maxX, false], [1, bounds.minZ, true], [1, bounds.maxZ, false],
  ]
  for (const [axis, limit, greater] of edges) {
    const output: Point[] = []
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length]
      const aInside = greater ? a[axis] >= limit : a[axis] <= limit
      const bInside = greater ? b[axis] >= limit : b[axis] <= limit
      if (aInside) output.push(a)
      if (aInside !== bInside) {
        const t = (limit - a[axis]) / (b[axis] - a[axis])
        output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
      }
    }
    points = output
  }
  return points
}

function riverPolygon(body: WaterFootprint): Point[] {
  const left: Point[] = [], right: Point[] = []
  body.points.forEach((point, index) => {
    const before = body.points[Math.max(0, index - 1)], after = body.points[Math.min(body.points.length - 1, index + 1)]
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1
    const dx = -(after[1] - before[1]) / length * body.halfWidth
    const dz = (after[0] - before[0]) / length * body.halfWidth
    left.push([point[0] + dx, point[1] + dz])
    right.push([point[0] - dx, point[1] - dz])
  })
  return [...left, ...right.reverse()]
}

export type HistoricalWorld = {
  group: THREE.Group
  buildings: number
  labels: Map<string, THREE.Vector3>
  pick: (hits: THREE.Intersection[]) => string | null
  setTheme: (palette: HistoricalPalette, time: TimeOfDay) => void
  dispose: () => void
}

export function buildHistoricalWorld(city: WorldCity, chapter: CityChapter, palette: HistoricalPalette): HistoricalWorld {
  const group = new THREE.Group(), geometries = new Map<Primitive, THREE.BufferGeometry>()
  const materials = new Map<Tone, THREE.MeshStandardMaterial>(), batches = new Map<string, Part[]>()
  const ownedGeometry = new Set<THREE.BufferGeometry>()
  const picks = new Map<THREE.Object3D, (string | null)[]>(), labels = new Map<string, THREE.Vector3>()
  const water = projectWater(city), bounds = historicalBounds(city)
  const activePlaces = placesInChapter(city, chapter.year)
  const landmarkAreas = activePlaces.map((place) => ({ point: projectCity(city, place.coordinates), radius: landmarkRadius(place, chapter, city) }))
  const dummy = new THREE.Object3D(), root = new THREE.Matrix4()
  let owner: string | null = null
  const dispose = () => {
    for (const child of group.children) if (child instanceof THREE.InstancedMesh) child.dispose()
    for (const item of ownedGeometry) item.dispose()
    for (const item of materials.values()) item.dispose()
    group.clear()
    picks.clear()
    labels.clear()
  }
  const material = (tone: Tone) => {
    let item = materials.get(tone)
    if (!item) {
      item = new THREE.MeshStandardMaterial({
        color: palette[tone], roughness: tone === 'water' ? .32 : .82,
        metalness: tone === 'water' ? .2 : 0, side: tone === 'trim' ? THREE.DoubleSide : THREE.FrontSide,
      })
      materials.set(tone, item)
    }
    return item
  }
  const geometry = (kind: Primitive) => {
    let item = geometries.get(kind)
    if (!item) {
      switch (kind) {
        case 'box': item = new THREE.BoxGeometry(1, 1, 1); break
        case 'cylinder': item = new THREE.CylinderGeometry(.5, .5, 1, 12); break
        case 'cone': item = new THREE.ConeGeometry(.5, 1, 12); break
        case 'pyramid': item = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4); break
        case 'sphere': item = new THREE.IcosahedronGeometry(.5, 1); break
        case 'dome': item = new THREE.SphereGeometry(.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); break
        case 'arch': item = new THREE.TorusGeometry(.5, .065, 6, 18, Math.PI); break
        case 'shell': item = new THREE.SphereGeometry(.5, 18, 12, 0, Math.PI, 0, Math.PI * .62); break
      }
      geometries.set(kind, item)
      ownedGeometry.add(item)
    }
    return item
  }
  const part = (kind: Primitive, tone: Tone, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, ry = 0, rx = 0, rz = 0) => {
    dummy.position.set(x, y, z)
    dummy.scale.set(sx, sy, sz)
    dummy.rotation.set(rx, ry, rz)
    dummy.updateMatrix()
    const key = `${kind}:${tone}`, entries = batches.get(key) ?? []
    entries.push({ matrix: new THREE.Matrix4().multiplyMatrices(root, dummy.matrix), owner })
    batches.set(key, entries)
  }
  const box = (tone: Tone, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) =>
    part('box', tone, x, y, z, sx, sy, sz, ry)
  const tree = (x: number, z: number, size = 1) => {
    part('cylinder', 'trunk', x, size * .55, z, size * .14, size, size * .14)
    part('sphere', 'leaves', x, size * 1.2, z, size * .85, size * 1.3, size * .85)
  }
  const column = (x: number, z: number, height: number, y = 0) => {
    part('cylinder', 'trim', x, y + height / 2, z, .26, height, .26)
    box('sand', x, y + height, z, .42, .18, .42)
  }
  const windows = (x: number, y: number, z: number, count: number, spacing = .65) => {
    for (let i = 0; i < count; i++) box('glow', x + (i - (count - 1) / 2) * spacing, y, z, .17, .35, .04)
  }
  const roof = (x: number, y: number, z: number, width: number, height: number, depth: number) =>
    part('pyramid', 'roof', x, y, z, width, height, depth)

  try {
    const width = bounds.maxX - bounds.minX, depth = bounds.maxZ - bounds.minZ
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2
    const thickness = THREE.MathUtils.clamp(Math.max(width, depth) * .023, 2.4, 8)
    box('cliff', cx, -thickness / 2 - .15, cz, width, thickness, depth)
    box('sand', cx, -thickness - .22, cz, width + .55, .25, depth + .55)
    box('land', cx, -.12, cz, width, .24, depth)

    for (const body of water) {
      const outline = clipPolygon(body.kind === 'area' ? body.points : riverPolygon(body), bounds)
      if (outline.length < 3) continue
      const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
      const surface = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2)
      ownedGeometry.add(surface)
      const mesh = new THREE.Mesh(surface, material('water'))
      mesh.position.y = .035
      mesh.receiveShadow = true
      group.add(mesh)
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i], b = outline[(i + 1) % outline.length]
        const length = Math.hypot(b[0] - a[0], b[1] - a[1])
        box('foam', (a[0] + b[0]) / 2, .06, (a[1] + b[1]) / 2, length, .045, .12,
          -Math.atan2(b[1] - a[1], b[0] - a[0]))
      }
    }

    const plots = districtBuildings(city, chapter)
    for (const plot of plots) {
      const { x, z, width: w, depth: d, height: h, angle, variation } = plot
      box(variation > .48 ? 'sand' : 'stone', x, h / 2 + .04, z, w, h, d, angle)
      if (chapter.year < 1900 && variation > .35) {
        part('pyramid', 'roof', x, h + .18, z, w * 1.12, .36, d * 1.12, angle)
      } else {
        box('roof', x, h + .04, z, w * 1.05, .12, d * 1.05, angle)
        if (chapter.year >= 1900 && variation > .87) {
          box('stone', x, h + .35, z, w * .65, .6, d * .65, angle)
        }
      }
      if (variation > .7) {
        part('box', 'glow', x + Math.sin(angle) * d * .51, h * .64, z + Math.cos(angle) * d * .51,
          w * .64, .12, .025, angle)
      }
    }

    for (const district of city.districts.filter((item) => item.visibleFrom <= chapter.year)) {
      const [x, z] = projectCity(city, district.coordinates), r = district.radiusKm * 10
      const angle = shorelineAngle([x, z], water, 0)
      for (let i = -Math.ceil(r); i <= r; i++) {
        const px = x + Math.cos(angle) * i, pz = z + Math.sin(angle) * i
        if (px < bounds.minX + .6 || px > bounds.maxX - .6 || pz < bounds.minZ + .6 || pz > bounds.maxZ - .6
          || onWater(px, pz, water, .4)
          || landmarkAreas.some(({ point, radius }) => Math.hypot(px - point[0], pz - point[1]) < radius + 1.5)) continue
        box('stone', px, .025, pz, 1.03, .035, .36, -angle)
        if (i % 5 === 0 && !onWater(px, pz + .6, water, .4)
          && !plots.some((plot) => Math.hypot(plot.x - px, plot.z - pz - .6) < 1.1)) tree(px, pz + .6, .65)
      }
    }

    for (const place of activePlaces) {
      owner = place.id
      const scale = localLandmarkScale(city, place, chapter)
      const [x, z] = projectCity(city, place.coordinates)
      const angle = place.model === 'bridge' ? -shorelineAngle([x, z], water, 0) + Math.PI / 2
        : place.model === 'port' ? -shorelineAngle([x, z], water, 0) : 0
      root.compose(new THREE.Vector3(x, .09, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
        new THREE.Vector3(scale, scale, scale))
      const model = place.model
      if (!['hill', 'park', 'bridge', 'port'].includes(model)) {
        box('stone', 0, .1, 0, MODEL_SIZE[model].radius * 1.65, .2, MODEL_SIZE[model].radius * 1.35)
      }
      switch (model) {
        case 'pyramid':
          for (let tier = 0; tier < 3; tier++) box('sand', 0, .15 + tier * .18, 0, 7.2 - tier * .3, .18, 7.2 - tier * .3)
          part('pyramid', 'sand', 0, 3.05, 0, 6.7, 5.3, 6.7)
          part('pyramid', 'trim', 0, 5.47, 0, .55, .5, .55)
          box('roof', 0, .65, 3.38, .45, .65, .08)
          break
        case 'temple':
          box('sand', 0, .32, 0, 5.5, .35, 3.9)
          box('stone', 0, 1.25, -.4, 2.5, 1.6, 2.1)
          for (const zc of [-1.4, 1.4]) for (let xc = -2.15; xc <= 2.2; xc += .86) column(xc, zc, 1.9, .45)
          box('trim', 0, 2.47, 0, 5.3, .32, 3.7)
          roof(0, 2.95, 0, 5.6, .7, 4)
          break
        case 'fort':
          for (const wall of [-1, 1]) {
            box('sand', 0, 1.3, wall * 2.6, 6, 2.5, .58)
            box('sand', wall * 2.7, 1.3, 0, .58, 2.5, 5.8)
            for (let i = -3; i <= 3; i++) {
              box('trim', i * .83, 2.68, wall * 2.6, .4, .45, .65)
              box('trim', wall * 2.7, 2.68, i * .8, .65, .45, .4)
            }
            for (const side of [-1, 1]) {
              part('cylinder', 'stone', wall * 2.7, 1.75, side * 2.6, 1.5, 3.5, 1.5)
              part('cylinder', 'trim', wall * 2.7, 3.45, side * 2.6, 1.7, .35, 1.7)
            }
          }
          box('roof', 0, .9, 2.92, 1.2, 1.8, .04)
          break
        case 'cathedral':
          box('stone', 0, 1.9, 0, 2.1, 3.4, 5.4)
          box('stone', 0, 1.55, -.7, 4.3, 2.7, 1.6)
          roof(0, 3.8, 0, 2.4, 1.2, 5.7)
          for (const side of [-1, 1]) {
            box('trim', side * 1.25, 2.7, 2, .95, 5.3, 1.15)
            part('cone', 'roof', side * 1.25, 6.1, 2, 1.3, 1.8, 1.3)
            windows(side * 1.25, 4.5, 2.59, 1)
          }
          part('cylinder', 'glow', 0, 2.85, 2.74, .95, .05, .95, 0, Math.PI / 2)
          for (let i = 0; i < 4; i++) for (const side of [-1, 1]) box('sand', side * 1.23, 1.45, i * 1.2 - 2, .4, 2.6, .25)
          break
        case 'palace':
          box('sand', 0, 1.35, -.8, 6.8, 2.5, 2.1)
          for (const side of [-1, 1]) {
            box('stone', side * 2.7, 1.2, 1, 1.4, 2.2, 3)
            roof(side * 2.7, 2.62, 1, 1.65, .65, 3.25)
          }
          roof(0, 2.9, -.8, 7.1, .75, 2.4)
          box('trim', 0, 1.7, .45, 2.1, 2.9, .75)
          part('dome', 'roof', 0, 3.15, -.3, 2, 1.3, 2)
          windows(0, 1.8, .27, 9)
          break
        case 'pagoda':
          for (let level = 0; level < 5; level++) {
            const size = 3.3 - level * .43, y = .5 + level * 1.03
            box('sand', 0, y, 0, size * .65, .85, size * .65)
            roof(0, y + .55, 0, size, .65, size)
            box('trim', 0, y + .29, 0, size, .11, size)
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
              part('cone', 'roof', sx * size * .45, y + .48, sz * size * .45, .28, .52, .28)
            }
          }
          part('cone', 'glow', 0, 5.95, 0, .23, 1.2, .23)
          break
        case 'tower':
          for (let tier = 0; tier < 4; tier++) {
            const size = 2.5 - tier * .45
            box('stone', 0, 1.1 + tier * 1.8, 0, size, 1.85, size)
            box('roof', 0, 2.02 + tier * 1.8, 0, size * 1.08, .15, size * 1.08)
            for (let floor = 0; floor < 3; floor++) windows(0, .5 + tier * 1.8 + floor * .49, size / 2 + .025, 3, size / 4)
          }
          part('cone', 'trim', 0, 8.6, 0, .75, 2.1, .75)
          break
        case 'bridge':
          box('stone', 0, 1.45, 0, 10.5, .35, 1.8)
          for (const side of [-1, 1]) {
            box('trim', 0, 1.8, side * .86, 10.5, .38, .16)
            for (let pier = -3; pier <= 3; pier += 3) {
              box('sand', pier, .75, side * .52, .42, 1.4, .5)
              part('arch', 'sand', pier + 1.5, .5, side * .53, 2.6, 1.35, 1)
            }
            box('stone', side * 3.2, 2.4, 0, .6, 3.3, 2.25)
            part('pyramid', 'roof', side * 3.2, 4.2, 0, .85, .5, 2.45)
          }
          break
        case 'dome':
          box('sand', 0, 1.45, 0, 4.2, 2.7, 3.5)
          part('cylinder', 'trim', 0, 2.9, 0, 3.5, .55, 3.5)
          part('dome', 'roof', 0, 3.15, 0, 3.9, 3.25, 3.9)
          part('cone', 'glow', 0, 5.15, 0, .2, .9, .2)
          for (const side of [-1, 1]) {
            part('cylinder', 'stone', side * 2.65, 1.95, 1.1, .62, 3.8, .62)
            part('dome', 'roof', side * 2.65, 3.85, 1.1, .85, .9, .85)
          }
          windows(0, 1.5, 1.78, 5)
          break
        case 'port':
          box('trunk', 0, .2, 0, 6.5, .4, 2.7)
          for (const side of [-1, 1]) {
            box('trunk', side * 2, .1, 2.4, .75, .3, 4)
            box('sand', side * 1.55, 1, -.5, 2.35, 1.6, 1.9)
            roof(side * 1.55, 1.95, -.5, 2.6, .55, 2.1)
          }
          part('sphere', 'roof', .1, .45, 2.7, 1, .65, 3.3)
          part('cylinder', 'trunk', .1, 1.8, 2.7, .1, 3, .1)
          part('pyramid', 'trim', .35, 2.2, 2.7, .13, 2.1, 1.8, 0, 0, -.2)
          break
        case 'opera':
          box('sand', 0, .35, 0, 7, .65, 5.2)
          for (let sail = 0; sail < 5; sail++) {
            const y = sail % 2 === 0 ? 1.2 : 1.55
            part('shell', 'trim', (sail - 2) * 1.15, y, (sail % 2) * -.65, 2.4, 5.4 - Math.abs(sail - 2) * .6, 3.8,
              -.28 + sail * .12, -.32, -.15 + sail * .075)
          }
          box('roof', 0, .8, 1.95, 5.5, .45, .3)
          break
        case 'statue':
          box('stone', 0, .6, 0, 2.6, 1.2, 2.6)
          box('sand', 0, 1.7, 0, 1.55, 1.3, 1.55)
          part('cone', 'leaves', 0, 3.9, 0, 1.4, 3.2, 1)
          part('sphere', 'leaves', 0, 5.75, 0, .7, .85, .7)
          part('cylinder', 'leaves', -.76, 5.1, 0, .24, 1.9, .24, 0, 0, -.62)
          part('sphere', 'glow', -1.29, 6.13, 0, .4, .7, .4)
          part('cylinder', 'leaves', .65, 4.6, 0, .24, 1.4, .24, 0, 0, .8)
          break
        case 'district':
          for (let i = 0; i < 7; i++) {
            const angle = i * Math.PI * 2 / 7, h = 1.2 + (i % 3) * .5
            const px = Math.cos(angle) * 2.2, pz = Math.sin(angle) * 2
            box(i % 2 ? 'sand' : 'stone', px, h / 2, pz, 1.2, h, 1.15, -angle)
            part('pyramid', 'roof', px, h + .3, pz, 1.4, .6, 1.35, -angle)
          }
          part('cylinder', 'trim', 0, .13, 0, 1.5, .25, 1.5)
          break
        case 'park':
          part('cylinder', 'leaves', 0, .04, 0, 7.4, .07, 6.8)
          box('sand', 0, .09, 0, 6.6, .06, .4)
          box('sand', 0, .09, 0, .4, .06, 6.6)
          part('cylinder', 'water', 0, .15, 0, 1.5, .08, 1.5)
          for (let i = 0; i < 12; i++) tree(Math.cos(i * Math.PI / 6) * 2.7, Math.sin(i * Math.PI / 6) * 2.6, .85 + (i % 3) * .13)
          break
        case 'hill':
          part('dome', 'cliff', 0, -.1, 0, 11.5, 10, 9.5)
          part('dome', 'leaves', -.25, .1, -.2, 10.6, 9.7, 8.7)
          box('sand', .2, 4.92, 0, 1.25, .12, 1.25)
          break
      }
      labels.set(place.id, new THREE.Vector3(x, MODEL_SIZE[model].height * scale + .7, z))
    }
    for (const [key, entries] of batches) {
      const [kind, tone] = key.split(':') as [Primitive, Tone]
      const mesh = new THREE.InstancedMesh(geometry(kind), material(tone), entries.length)
      entries.forEach((entry, index) => mesh.setMatrixAt(index, entry.matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = tone !== 'water' && tone !== 'foam' && tone !== 'glow'
      mesh.receiveShadow = tone !== 'glow'
      mesh.computeBoundingSphere()
      group.add(mesh)
      picks.set(mesh, entries.map((entry) => entry.owner))
    }
    return {
      group, buildings: plots.length, labels,
      pick(hits) {
        const hit = hits[0]
        return hit?.instanceId === undefined ? null : picks.get(hit.object)?.[hit.instanceId] ?? null
      },
      setTheme(next, time) {
        for (const [tone, value] of materials) {
          value.color.copy(next[tone])
          if (tone === 'glow' || tone === 'water') {
            value.emissive.copy(next[tone])
            value.emissiveIntensity = time === 'night' ? tone === 'glow' ? 1.7 : .15 : tone === 'glow' ? .12 : 0
          }
        }
      },
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}

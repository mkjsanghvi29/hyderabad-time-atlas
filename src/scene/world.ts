import {
  Box3, BufferGeometry, DodecahedronGeometry, Euler, Group, InstancedMesh,
  Line, LineBasicMaterial, Matrix4, Mesh, Object3D, PlaneGeometry, Quaternion,
  RingGeometry, Shape, ShapeGeometry, Vector2, Vector3,
} from 'three'
import { HUSSAIN_SAGAR, MAP_BOUNDS, MUSI, project, seededRandom } from '../geography'
import { buildLivingCity, type LivingCity } from '../cityWorld'
import { monumentAppearance } from '../monumentHistory'
import type { Coordinates, Era, Landmark } from '../types'
import { createFalaknumaModel, createLandmarkModel, disposeObject } from './models'
import type { AtlasMaterials, AtlasPalette } from './palette'

const northWest = project([MAP_BOUNDS.west, MAP_BOUNDS.north])
const southEast = project([MAP_BOUNDS.east, MAP_BOUNDS.south])
export const WORLD_BOUNDS = { minX: northWest[0], maxX: southEast[0], minZ: northWest[1], maxZ: southEast[1] }
const WATER_LEVEL = .01
const RIVER_HALF_WIDTH = .48

export type LandmarkObject = {
  root: Group
  anchor: Object3D
  hitTargets: Object3D[]
  radius: number
  height: number
}

export type World = {
  root: Group
  city: Group
  roads: Group
  living: LivingCity
  landmarks: Map<string, LandmarkObject>
  river: Mesh
  lake: Mesh | null
  dispose: () => void
}

// A shared flat traversal datum keeps streets and buildings aligned; this is not measured terrain.
export function surfaceHeight(_x: number, _z: number, _lakePresent = true): number {
  return .02
}

function makeTerrain(materials: AtlasMaterials): Mesh {
  const geometry = new PlaneGeometry(WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ, 90, 90)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate((WORLD_BOUNDS.maxX + WORLD_BOUNDS.minX) / 2, -.025, (WORLD_BOUNDS.maxZ + WORLD_BOUNDS.minZ) / 2)
  const terrain = new Mesh(geometry, materials.terrain)
  terrain.receiveShadow = true
  return terrain
}

function waterShape(coordinates: readonly Coordinates[], halfWidth?: number): Shape {
  const points = coordinates.map((coordinate) => {
    const [x, z] = project(coordinate)
    return new Vector2(x, -z)
  })
  let outline = points
  if (halfWidth !== undefined) {
    const left: Vector2[] = [], right: Vector2[] = []
    for (let i = 0; i < points.length; i++) {
      const direction = points[Math.min(points.length - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize()
      const normal = new Vector2(-direction.y, direction.x).multiplyScalar(halfWidth)
      left.push(points[i].clone().add(normal))
      right.push(points[i].clone().sub(normal))
    }
    outline = [...left, ...right.reverse()]
  }
  const shape = new Shape()
  shape.moveTo(outline[0].x, outline[0].y)
  for (const point of outline.slice(1)) shape.lineTo(point.x, point.y)
  shape.closePath()
  return shape
}

function makeWater(shape: Shape, materials: AtlasMaterials): Mesh {
  const mesh = new Mesh(new ShapeGeometry(shape), materials.water)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = WATER_LEVEL
  mesh.receiveShadow = true
  return mesh
}

function boundary(palette: AtlasPalette): Line {
  const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS
  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(minX, .01, minZ), new Vector3(maxX, .01, minZ),
    new Vector3(maxX, .01, maxZ), new Vector3(minX, .01, maxZ), new Vector3(minX, .01, minZ),
  ])
  return new Line(geometry, new LineBasicMaterial({ color: palette.road, transparent: true, opacity: .25 }))
}

function createLandmarks(era: Era, landmarks: readonly Landmark[], materials: AtlasMaterials): Map<string, LandmarkObject> {
  const objects = new Map<string, LandmarkObject>()
  for (const landmark of landmarks) {
    if (era.year < landmark.visibleFrom) continue
    const root = landmark.id === 'falaknuma' ? createFalaknumaModel(materials)
      : createLandmarkModel(landmark.model, materials, era.year)
    const [x, z] = project(landmark.coordinates)
    root.position.set(x, .06, z)
    root.rotation.y = landmark.model === 'bridge' ? .3 : 0
    if (landmark.model === 'mosque') root.scale.setScalar(.68)
    const size = new Box3().setFromObject(root).getSize(new Vector3())
    const radius = Math.hypot(size.x, size.z) / 2
    root.userData.landmarkId = landmark.id
    root.userData.fabric = monumentAppearance(landmark.id, era.year).fabric
    const hitTargets: Object3D[] = []
    root.traverse((child) => {
      child.userData.landmarkId = landmark.id
      if (child instanceof Mesh) hitTargets.push(child)
    })
    const anchor = new Object3D()
    anchor.position.set(0, size.y / root.scale.y + .25, 0)
    root.add(anchor)
    objects.set(landmark.id, { root, anchor, hitTargets, radius, height: size.y })
  }
  return objects
}

function graniteOutcrops(materials: AtlasMaterials, living: LivingCity): InstancedMesh {
  const random = seededRandom('deccan-outcrops')
  const rocks = new InstancedMesh(new DodecahedronGeometry(.18), materials.granite, 110)
  const matrix = new Matrix4()
  let count = 0
  for (let i = 0; i < 800 && count < rocks.count; i++) {
    const x = -150 + random() * 125, z = -75 + random() * 155, scale = 1 + random() * 4
    if (living.metadata.buildings.some((building) => Math.hypot(x - building.x, z - building.z) < building.radius + scale)) continue
    if (living.metadata.clearances.some((site) => Math.hypot(x - site.x, z - site.z) < site.radius + scale)) continue
    if (living.metadata.roadSegments.some((road) => {
      const dx = road.b[0] - road.a[0], dz = road.b[1] - road.a[1]
      const t = Math.max(0, Math.min(1, ((x - road.a[0]) * dx + (z - road.a[1]) * dz) / (dx * dx + dz * dz)))
      return Math.hypot(x - road.a[0] - t * dx, z - road.a[1] - t * dz) < scale
    })) continue
    matrix.compose(new Vector3(x, .1 * scale, z), new Quaternion().setFromEuler(new Euler(random(), random() * Math.PI, random())), new Vector3(scale, .65 * scale, scale))
    rocks.setMatrixAt(count++, matrix)
  }
  rocks.count = count
  rocks.castShadow = true
  rocks.receiveShadow = true
  rocks.instanceMatrix.needsUpdate = true
  return rocks
}

export function buildWorld(era: Era, landmarks: readonly Landmark[], materials: AtlasMaterials, palette: AtlasPalette): World {
  const root = new Group()
  root.name = `hyderabad-${era.year}`
  root.add(makeTerrain(materials), boundary(palette))
  const river = makeWater(waterShape(MUSI, RIVER_HALF_WIDTH), materials)
  const lake = era.year >= 1563 ? makeWater(waterShape(HUSSAIN_SAGAR), materials) : null
  root.add(river)
  if (lake) root.add(lake)
  const landmarkObjects = createLandmarks(era, landmarks, materials)
  for (const landmark of landmarkObjects.values()) root.add(landmark.root)
  const living = buildLivingCity(era, palette, landmarks, {
    landmarkClearances: [...landmarkObjects].map(([id, site]) => ({
      id, x: site.root.position.x, z: site.root.position.z, radius: site.radius + .65,
    })),
  })
  root.add(living.root, graniteOutcrops(materials, living))
  return {
    root, river, lake, landmarks: landmarkObjects, living, city: living.fabric, roads: living.roads,
    dispose: () => {
      living.dispose()
      disposeObject(root)
      root.traverse((object) => {
        if (object instanceof Line) {
          object.geometry.dispose()
          object.material.dispose()
        }
      })
    },
  }
}

export function createSelectionRing(materials: AtlasMaterials): Mesh {
  const geometry = new RingGeometry(1, 1.01, 96)
  geometry.rotateX(-Math.PI / 2)
  const ring = new Mesh(geometry, materials.accent)
  ring.visible = false
  return ring
}

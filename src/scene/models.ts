import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Path,
  Shape,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ModelKind } from '../types'
import type { AtlasMaterials } from './palette'

type Mat = Material | Material[]

function shadow(mesh: Mesh): Mesh {
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function box(parent: Object3D, size: [number, number, number], position: [number, number, number], material: Mat): Mesh {
  const mesh = shadow(new Mesh(new BoxGeometry(...size), material))
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

function cylinder(
  parent: Object3D,
  radii: [number, number],
  height: number,
  position: [number, number, number],
  material: Mat,
  sides = 16,
): Mesh {
  const mesh = shadow(new Mesh(new CylinderGeometry(radii[0], radii[1], height, sides), material))
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

function dome(parent: Object3D, radius: number, position: [number, number, number], material: Mat, squash = 0.75): Mesh {
  const mesh = shadow(new Mesh(new SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), material))
  mesh.position.set(...position)
  mesh.scale.y = squash
  parent.add(mesh)
  return mesh
}

function spire(parent: Object3D, position: [number, number, number], material: Mat, scale = 1): void {
  dome(parent, 0.12 * scale, position, material, 1.1)
  const finial = shadow(new Mesh(new ConeGeometry(0.035 * scale, 0.19 * scale, 10), material))
  finial.position.set(position[0], position[1] + 0.18 * scale, position[2])
  parent.add(finial)
}

function archedFacade(width: number, height: number, depth: number, material: Mat, openings: number): Mesh {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(width / 2, height)
  shape.lineTo(-width / 2, height)
  shape.closePath()

  const openingWidth = width / (openings * 1.75)
  for (let index = 0; index < openings; index += 1) {
    const center = -width / 2 + width * (index + 0.5) / openings
    const hole = new Path()
    const left = center - openingWidth / 2
    const right = center + openingWidth / 2
    const spring = height * 0.48
    hole.moveTo(left, 0.04)
    hole.lineTo(right, 0.04)
    hole.lineTo(right, spring)
    hole.absarc(center, spring, openingWidth / 2, 0, Math.PI, false)
    hole.lineTo(left, 0.04)
    shape.holes.push(hole)
  }
  return shadow(new Mesh(new ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material))
}

function addArcade(
  parent: Object3D,
  width: number,
  height: number,
  depth: number,
  position: [number, number, number],
  material: Mat,
  openings: number,
): Mesh {
  const facade = archedFacade(width, height, depth, material, openings)
  facade.position.set(...position)
  parent.add(facade)
  return facade
}

function addCrenellations(parent: Object3D, width: number, z: number, y: number, material: Mat): void {
  const count = Math.max(4, Math.floor(width / 0.18))
  for (let index = 0; index < count; index += 1) {
    box(parent, [0.09, 0.13, 0.1], [-width / 2 + width * (index + 0.5) / count, y, z], material)
  }
}

function createCharminar(m: AtlasMaterials, year: number): Group {
  const group = new Group()
  box(group, [1.28, 0.18, 1.28], [0, 0.09, 0], m.stone)
  box(group, [1.08, 0.2, 1.08], [0, 0.27, 0], m.sandstoneLight)
  addArcade(group, 0.92, 0.9, 0.18, [0, 0.36, 0.45], m.sandstone, 1)
  const back = addArcade(group, 0.92, 0.9, 0.18, [0, 0.36, -0.45], m.sandstone, 1)
  back.rotation.y = Math.PI
  const left = addArcade(group, 0.92, 0.9, 0.18, [-0.45, 0.36, 0], m.sandstone, 1)
  left.rotation.y = -Math.PI / 2
  const right = addArcade(group, 0.92, 0.9, 0.18, [0.45, 0.36, 0], m.sandstone, 1)
  right.rotation.y = Math.PI / 2
  box(group, [1.05, 0.15, 1.05], [0, 1.28, 0], m.sandstoneLight)
  for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const gallery = new Group()
    addArcade(gallery, 0.92, 0.25, 0.065, [0, 1.35, 0.46], m.sandstoneLight, 5)
    gallery.rotation.y = rotation
    group.add(gallery)
    if (year >= 1889) {
      const clock = new Group()
      const face = cylinder(clock, [0.09, 0.09], 0.012, [0, 1.15, 0.643], m.stone, 20)
      face.rotation.x = Math.PI / 2
      box(clock, [0.01, 0.07, 0.012], [0, 1.18, 0.654], m.roof)
      box(clock, [0.055, 0.01, 0.012], [0.023, 1.15, 0.654], m.roof)
      clock.rotation.y = rotation
      group.add(clock)
    }
  }

  for (const [x, z] of [[-0.57, -0.57], [-0.57, 0.57], [0.57, -0.57], [0.57, 0.57]] as const) {
    cylinder(group, [0.115, 0.16], 1.72, [x, 1, z], m.sandstone, 20)
    for (const y of [0.56, 0.98, 1.42, 1.78]) cylinder(group, [0.19, 0.19], 0.07, [x, y, z], m.sandstoneLight, 20)
    dome(group, 0.15, [x, 1.86, z], m.sandstoneLight, 1.05)
    const finial = shadow(new Mesh(new ConeGeometry(0.023, 0.15, 10), m.roof))
    finial.position.set(x, 2.07, z)
    group.add(finial)
  }
  return group
}

function createGolconda(m: AtlasMaterials, year: number): Group {
  const group = new Group()
  const early = year < 1591
  const ruin = year >= 1908
  const weathered = year >= 1763
  cylinder(group, [1.35, 1.7], 0.42, [0, 0.21, 0], m.granite, 9)
  cylinder(group, [0.86, 1.2], 0.42, [0.05, 0.6, -0.08], m.terrainDark, 10)
  const masonry = weathered ? m.granite : m.sandstone
  box(group, [0.9, 0.08, 0.8], [0.08, .85, -.08], m.stone)
  addArcade(group, .8, ruin ? .35 : .5, .09, [.08, .89, .27], masonry, 3)
  box(group, [.1, ruin ? .27 : .5, .75], [-.33, ruin ? 1.025 : 1.14, -.08], masonry)
  box(group, [.1, ruin ? .17 : .5, .75], [.49, ruin ? .975 : 1.14, -.08], masonry)
  if (!ruin) {
    box(group, [.94, .1, .85], [.08, 1.43, -.08], m.sandstoneLight)
    if (!early) {
      box(group, [.42, .32, .38], [.08, 1.62, -.08], m.sandstone)
      box(group, [.48, .08, .44], [.08, 1.82, -.08], m.sandstoneLight)
    }
    addCrenellations(group, .9, .31, 1.5, m.stone)
  } else {
    for (let i = 0; i < 8; i++) {
      box(group, [.10, .06 + (i % 3) * .035, .08], [-.25 + i * .09, .92, -.25 + (i % 2) * .18], masonry)
    }
  }

  const wallPoints = [
    [-1.28, -0.3], [-0.85, -1.1], [0.08, -1.34], [1.18, -0.82],
    [1.42, 0.16], [0.72, 1.18], [-0.38, 1.3], [-1.28, 0.62],
  ] as const
  for (let index = 0; index < wallPoints.length; index += 1) {
    const [x1, z1] = wallPoints[index]
    const [x2, z2] = wallPoints[(index + 1) % wallPoints.length]
    const length = Math.hypot(x2 - x1, z2 - z1)
    const wall = box(group, [length, ruin && index % 3 === 0 ? .12 : .22, 0.1], [(x1 + x2) / 2, 0.48, (z1 + z2) / 2], m.stone)
    wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
    cylinder(group, [0.12, 0.14], 0.42, [x1, 0.48, z1], m.stone, 12)
    if (!early && !ruin) {
      const count = Math.floor(length / .16)
      for (let merlon = 0; merlon < count; merlon++) {
        const t = (merlon + .5) / count
        box(group, [.07, .09, .07], [x1 + (x2 - x1) * t, .63, z1 + (z2 - z1) * t], m.sandstoneLight)
      }
    }
  }
  if (!early) for (const [x, z] of [[-.8, .35], [.75, .35], [0, .9]] as const) {
    box(group, [.42, .06, .3], [x, .47, z], m.stone)
    addArcade(group, .4, .28, .06, [x, .5, z + .12], masonry, 2)
    box(group, [.4, .22, .06], [x, .61, z - .13], masonry)
    if (!ruin && !(weathered && x === 0)) box(group, [.47, .06, .37], [x, .81, z], m.sandstoneLight)
  }
  for (let step = 0; step < 5; step += 1) {
    box(group, [0.32, 0.08, 0.18], [-0.2, 0.67 + step * 0.1, 0.72 - step * 0.16], m.sandstoneLight)
  }
  return group
}

function tombPavilion(parent: Group, x: number, z: number, scale: number, m: AtlasMaterials): void {
  box(parent, [0.72 * scale, 0.12, 0.72 * scale], [x, 0.06, z], m.stone)
  addArcade(parent, 0.62 * scale, 0.45 * scale, 0.08, [x, 0.12, z + 0.3 * scale], m.sandstone, 2)
  box(parent, [0.62 * scale, 0.14, 0.62 * scale], [x, 0.58 * scale, z], m.sandstoneLight)
  dome(parent, 0.3 * scale, [x, 0.65 * scale, z], m.roof, 0.82)
  spire(parent, [x, 0.9 * scale, z], m.roof, 0.55 * scale)
}

function createTombs(m: AtlasMaterials, year: number): Group {
  const group = new Group()
  const finishes = year >= 2025 ? { ...m, sandstone: m.sandstoneLight, roof: m.stone }
    : year >= 1908 ? { ...m, sandstone: m.stone, sandstoneLight: m.stone, roof: m.granite } : m
  tombPavilion(group, 0, 0, 1.4, finishes)
  tombPavilion(group, -0.95, 0.42, 0.82, finishes)
  if (year >= 1600) {
    tombPavilion(group, 0.94, 0.5, 0.76, finishes)
    tombPavilion(group, -0.58, -0.86, 0.68, finishes)
    tombPavilion(group, 0.64, -0.84, 0.72, finishes)
  }
  if (year >= 2025) {
    box(group, [2.5, .025, .18], [0, .015, .85], m.stone)
    for (const x of [-1.2, -.6, 0, .6, 1.2]) cylinder(group, [.08, .12], .10, [x, .06, 1.1], m.foliage, 8)
  }
  return group
}

function createMosque(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.45, 0.16, 1.1], [0, 0.08, 0], m.stone)
  box(group, [2.18, 0.75, 0.72], [0, 0.52, -0.12], m.sandstone)
  const arcade = addArcade(group, 2.05, 0.62, 0.12, [0, 0.18, 0.25], m.sandstoneLight, 7)
  arcade.castShadow = true
  for (const x of [-1.06, 1.06]) {
    cylinder(group, [0.1, 0.13], 1.25, [x, 0.73, -0.1], m.sandstoneLight, 16)
    dome(group, 0.14, [x, 1.35, -0.1], m.roof)
    spire(group, [x, 1.48, -0.1], m.roof, 0.6)
  }
  for (const x of [-0.65, 0, 0.65]) dome(group, 0.25, [x, 0.92, -0.08], m.roof, 0.62)
  return group
}

function createCourtyardPalace(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.35, 0.16, 1.55], [0, 0.08, 0], m.stone)
  box(group, [2.18, 0.55, 0.34], [0, 0.42, -0.58], m.sandstoneLight)
  box(group, [0.36, 0.48, 1.02], [-0.91, 0.39, 0], m.sandstone)
  box(group, [0.36, 0.48, 1.02], [0.91, 0.39, 0], m.sandstone)
  const arcade = addArcade(group, 1.62, 0.46, 0.09, [0, 0.16, 0.5], m.sandstoneLight, 6)
  arcade.rotation.y = Math.PI
  box(group, [0.5, 0.78, 0.4], [0, 0.55, -0.59], m.sandstone)
  dome(group, 0.25, [0, 0.96, -0.59], m.roof, 0.58)
  for (const x of [-0.76, 0.76]) spire(group, [x, 0.78, -0.58], m.roof, 0.72)
  return group
}

function createFalaknuma(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.8, 0.15, 1.15], [0, 0.08, 0], m.stone)
  box(group, [2.45, 0.56, 0.62], [0, 0.43, 0], m.sandstoneLight)
  box(group, [0.86, 0.28, 1.25], [-0.93, 0.35, 0], m.sandstone)
  box(group, [0.86, 0.28, 1.25], [0.93, 0.35, 0], m.sandstone)
  box(group, [0.72, 0.26, 0.38], [0, 0.84, 0], m.sandstone)
  for (let index = -5; index <= 5; index += 1) {
    const x = index * 0.2
    cylinder(group, [0.035, 0.045], 0.37, [x, 0.44, 0.34], m.stone, 10)
    if (index % 2 === 0) box(group, [0.09, 0.12, 0.025], [x, 0.48, -0.32], m.window)
  }
  box(group, [2.6, 0.12, 0.82], [0, 0.76, 0], m.roof)
  return group
}

function createBridge(m: AtlasMaterials): Group {
  const group = new Group()
  const deck = addArcade(group, 2.75, 0.56, 0.62, [-0.31, 0.14, 0], m.stone, 8)
  deck.rotation.y = Math.PI / 2
  box(group, [0.16, 0.14, 2.85], [-0.4, 0.76, 0], m.sandstoneLight)
  box(group, [0.16, 0.14, 2.85], [0.4, 0.76, 0], m.sandstoneLight)
  return group
}

function createResidency(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.35, 0.16, 1.1], [0, 0.08, 0], m.stone)
  box(group, [2.05, 0.68, 0.72], [0, 0.5, 0], m.sandstoneLight)
  box(group, [0.94, 0.18, 0.42], [0, 0.96, 0.28], m.stone)
  for (let index = -3; index <= 3; index += 1) {
    cylinder(group, [0.055, 0.07], 0.7, [index * 0.24, 0.52, 0.43], m.stone, 14)
  }
  const pediment = new Mesh(new ConeGeometry(0.58, 0.32, 3), m.sandstone)
  pediment.rotation.set(0, 0, -Math.PI / 2)
  pediment.position.set(0, 1.14, 0.25)
  group.add(shadow(pediment))
  return group
}

function createCourt(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.55, 0.18, 1.1], [0, 0.09, 0], m.stone)
  box(group, [2.3, 0.6, 0.72], [0, 0.48, 0], m.accent)
  for (const x of [-0.92, -0.46, 0, 0.46, 0.92]) {
    dome(group, x === 0 ? 0.29 : 0.2, [x, x === 0 ? 0.92 : 0.86, 0], m.roof, 0.82)
    spire(group, [x, x === 0 ? 1.18 : 1.03, 0], m.roof, 0.5)
  }
  const arcade = addArcade(group, 2.05, 0.46, 0.08, [0, 0.2, 0.37], m.sandstoneLight, 7)
  arcade.castShadow = true
  return group
}

function createUniversity(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [2.7, 0.16, 1.12], [0, 0.08, 0], m.stone)
  box(group, [2.35, 0.58, 0.76], [0, 0.46, 0], m.sandstone)
  box(group, [0.76, 0.82, 0.86], [0, 0.57, 0], m.sandstoneLight)
  const entry = addArcade(group, 0.56, 0.56, 0.09, [0, 0.18, 0.4], m.stone, 1)
  entry.castShadow = true
  for (const x of [-0.91, -0.55, 0.55, 0.91]) box(group, [0.17, 0.3, 0.04], [x, 0.5, 0.4], m.window)
  dome(group, 0.38, [0, 1.0, 0], m.roof, 0.46)
  return group
}

function createCyber(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [1.75, 0.16, 1.4], [0, 0.08, 0], m.stone)
  const wings = [
    [-0.55, 0, 0.42, 1.65], [0.55, 0, -0.42, 1.65],
    [0, -0.5, 0.42, 1.2], [0, 0.5, -0.42, 1.2],
  ] as const
  for (const [x, z, rotation, height] of wings) {
    const wing = box(group, [0.56, height, 0.48], [x, height / 2 + 0.12, z], m.stone)
    wing.rotation.y = rotation
    for (let floor = 0; floor < 5; floor += 1) {
      box(group, [0.34, 0.045, 0.025], [x, 0.38 + floor * 0.25, z + 0.25], m.window).rotation.y = rotation
    }
  }
  cylinder(group, [0.38, 0.45], 2.05, [0, 1.14, 0], m.roof, 8)
  for (let floor = 0; floor < 7; floor += 1) {
    cylinder(group, [0.42, 0.42], 0.035, [0, 0.35 + floor * 0.27, 0], m.window, 8)
  }
  return group
}

function createBuddha(m: AtlasMaterials): Group {
  const group = new Group()
  cylinder(group, [0.55, 0.66], 0.25, [0, 0.13, 0], m.stone, 14)
  box(group, [0.56, 0.72, 0.34], [0, 0.69, 0], m.sandstoneLight)
  const shoulders = cylinder(group, [0.23, 0.28], 0.52, [0, 1.2, 0], m.sandstoneLight, 16)
  shoulders.scale.x = 1.45
  const head = shadow(new Mesh(new SphereGeometry(0.19, 18, 12), m.sandstoneLight))
  head.position.set(0, 1.58, 0)
  head.scale.set(0.82, 1.08, 0.86)
  group.add(head)
  spire(group, [0, 1.77, 0], m.sandstoneLight, 0.42)
  return group
}

function createClock(m: AtlasMaterials): Group {
  const group = new Group()
  box(group, [0.75, 0.18, 0.75], [0, 0.09, 0], m.stone)
  box(group, [0.48, 1.28, 0.48], [0, 0.78, 0], m.sandstone)
  box(group, [0.62, 0.16, 0.62], [0, 1.44, 0], m.sandstoneLight)
  for (const rotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const dial = shadow(new Mesh(new CylinderGeometry(0.18, 0.18, 0.025, 20), m.window))
    dial.rotation.set(Math.PI / 2, 0, 0)
    dial.rotateOnWorldAxis(new Vector3(0, 1, 0), rotation)
    dial.position.set(Math.sin(rotation) * 0.255, 1.17, Math.cos(rotation) * 0.255)
    group.add(dial)
  }
  dome(group, 0.29, [0, 1.52, 0], m.roof, 0.72)
  spire(group, [0, 1.75, 0], m.roof, 0.7)
  return group
}

export function createLandmarkModel(kind: ModelKind, materials: AtlasMaterials, year = 2025): Group {
  const factories: Record<ModelKind, () => Group> = {
    fort: () => createGolconda(materials, year),
    tombs: () => createTombs(materials, year),
    charminar: () => createCharminar(materials, year),
    mosque: () => createMosque(materials),
    palace: () => createCourtyardPalace(materials),
    bridge: () => createBridge(materials),
    residency: () => createResidency(materials),
    court: () => createCourt(materials),
    university: () => createUniversity(materials),
    cyber: () => createCyber(materials),
    buddha: () => createBuddha(materials),
    clock: () => createClock(materials),
  }
  const model = factories[kind]()
  model.name = `landmark-model-${kind}`
  return batchModel(model)
}

export function createFalaknumaModel(materials: AtlasMaterials): Group {
  return batchModel(createFalaknuma(materials))
}

// Static architectural detail shares one draw call per material, not per column.
function batchModel(root: Group): Group {
  root.updateMatrixWorld(true)
  const batches = new Map<Material, BufferGeometry[]>()
  const originals = new Set<BufferGeometry>()
  root.traverse((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
    geometry.applyMatrix4(object.matrixWorld)
    const batch = batches.get(object.material) ?? []
    batch.push(geometry)
    batches.set(object.material, batch)
    originals.add(object.geometry)
  })
  root.clear()
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries)
    if (!merged) throw new Error('Landmark geometry could not be batched')
    root.add(shadow(new Mesh(merged, material)))
    for (const geometry of geometries) geometry.dispose()
  }
  for (const geometry of originals) geometry.dispose()
  return root
}

export function disposeObject(root: Object3D): void {
  const geometries = new Set<BufferGeometry>()
  root.traverse((object) => {
    if (object instanceof Mesh) geometries.add(object.geometry)
    if (object instanceof InstancedMesh) object.dispose()
  })
  for (const geometry of geometries) geometry.dispose()
}

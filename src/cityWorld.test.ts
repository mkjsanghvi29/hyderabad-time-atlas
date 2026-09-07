import { afterAll, describe, expect, it } from 'vitest'
import { Color, InstancedMesh } from 'three'
import { CITY_DISTRICTS } from './city'
import { ERAS, LANDMARKS } from './data'
import { HUSSAIN_SAGAR, MUSI, project } from './geography'
import { buildLivingCity, CITY_GROUND_Y, type LivingCity } from './cityWorld'
import type { AtlasPalette } from './scene/palette'

const palette: AtlasPalette = {
  sky: new Color(.8, .8, .8), terrain: new Color(.7, .6, .5), terrainDark: new Color(.4, .3, .2),
  sandstone: new Color(.7, .6, .5), sandstoneLight: new Color(.8, .7, .6), stone: new Color(.6, .6, .6),
  granite: new Color(.3, .3, .3), water: new Color(.2, .4, .6), accent: new Color(.7, .2, .3),
  roof: new Color(.2, .2, .2), window: new Color(.8, .7, .4), road: new Color(.4, .4, .4),
  foliage: new Color(.3, .5, .3), night: new Color(.1, .1, .1),
}
const cities: LivingCity[] = []
function city(year: number, options?: Parameters<typeof buildLivingCity>[3]) {
  const era = ERAS.find((chapter) => chapter.year === year)
  if (!era) throw new Error(`Missing fixture chapter ${year}`)
  const result = buildLivingCity(era, palette, LANDMARKS, options)
  cities.push(result)
  return result
}
afterAll(() => cities.forEach((result) => result.dispose()))

describe('connected living city', () => {
  it('reproduces both the parcel layout and GPU transforms deterministically', () => {
    const a = city(1591), b = city(1591)
    expect(a.metadata).toEqual(b.metadata)
    const matrices = (value: LivingCity) => {
      const result: Float32Array[] = []
      value.root.traverse((object) => {
        if (object instanceof InstancedMesh) result.push(new Float32Array(object.instanceMatrix.array))
      })
      return result
    }
    expect(matrices(a)).toEqual(matrices(b))
    a.update(40)
    b.update(40)
    expect(matrices(a)).toEqual(matrices(b))
  })

  it('connects every contemporary district, with different western fabric in 1998 and 2025', () => {
    const earlier = city(1998), now = city(2025)
    expect(now.metadata.districts.map((district) => district.id)).toEqual(CITY_DISTRICTS.map((district) => district.id))
    expect(now.metadata.districts.every((district) => district.buildings > 0)).toBe(true)
    const western = new Set(['hitec', 'gachibowli', 'financial-district'])
    const before = earlier.metadata.buildings.filter((building) => western.has(building.district))
    const after = now.metadata.buildings.filter((building) => western.has(building.district))
    expect(after.length).toBeGreaterThan(before.length * 3)
    expect(before.every((building) => building.kind !== 'office' && building.kind !== 'apartment')).toBe(true)
    expect(after.some((building) => building.kind === 'office' && building.height > 2)).toBe(true)
    expect(earlier.metadata.buildings.some((building) => building.district === 'financial-district')).toBe(false)
    const reached = new Set(['golconda-town'])
    for (let pass = 0; pass < CITY_DISTRICTS.length; pass++) {
      for (const connection of now.metadata.connections) {
        if (reached.has(connection.from)) reached.add(connection.to)
        if (reached.has(connection.to)) reached.add(connection.from)
      }
    }
    expect(reached.size).toBe(CITY_DISTRICTS.length)
    for (const connection of now.metadata.connections) {
      const length = (points: readonly (readonly [number, number])[]) => points.slice(1).reduce((sum, point, index) =>
        sum + Math.hypot(point[0] - points[index][0], point[1] - points[index][1]), 0)
      const renderedLength = now.metadata.roadSegments
        .filter((segment) => segment.connection === `${connection.from}:${connection.to}`)
        .reduce((sum, segment) => sum + length([segment.a, segment.b]), 0)
      expect(renderedLength).toBeCloseTo(length(connection.points), 5)
    }
    expect(now.metadata.buildings.length).toBeGreaterThan(earlier.metadata.buildings.length)
    expect(now.metadata.drawCalls).toBeLessThan(40)
    expect(now.metadata.instances).toBeLessThan(350_000)
  })

  it.each([1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025])('keeps %i finite, nonempty, ground-aligned and geographically bounded', (year) => {
    const result = city(year)
    expect(result.metadata.buildings.length).toBeGreaterThan(10)
    expect(result.metadata.roadSegments.length).toBeGreaterThan(10)
    expect(result.roads.children.length).toBeGreaterThan(0)
    expect(result.activity.children.length).toBeGreaterThan(0)
    const [west, north] = project([78.24, 17.65])
    const [east, south] = project([78.69, 17.20])
    expect(result.metadata.buildings.every((building) =>
      [building.x, building.z, building.width, building.depth, building.height, building.angle].every(Number.isFinite)
      && building.x - building.radius > west && building.x + building.radius < east
      && building.z - building.radius > north && building.z + building.radius < south
      && building.height > 0 && building.height < 5,
    )).toBe(true)
    result.update(10_000)
    const nonfinite: string[] = []
    const belowGround: Array<{ mesh: string; minimumY: number }> = []
    result.root.traverse((object) => {
      if (!(object instanceof InstancedMesh)) return
      if (!Array.from(object.instanceMatrix.array).every(Number.isFinite)) nonfinite.push(object.name)
      const matrix = object.instanceMatrix.array
      if (object.parent === result.activity) return
      let minimumY = Infinity
      for (let i = 0; i < matrix.length; i += 16) {
        const bottom = matrix[i + 13] - Math.abs(matrix[i + 5]) / 2
        minimumY = Math.min(minimumY, bottom)
      }
      if (minimumY < CITY_GROUND_Y - .002) belowGround.push({ mesh: object.name, minimumY })
    })
    expect(nonfinite).toEqual([])
    expect(belowGround).toEqual([])
    if (year < 1908) {
      expect(result.metadata.activityCounts.vehicle).toBe(0)
      expect(result.metadata.activityCounts.bicycle).toBe(0)
      expect(result.metadata.buildings.every((building) => building.kind === 'courtyard' || building.kind === 'terrace')).toBe(true)
    }
  })

  it('reserves waterfronts and measured landmark plazas rather than putting houses through them', () => {
    const result = city(2025, { landmarkClearances: [{ id: 'golconda', x: project([78.4011, 17.3833])[0], z: project([78.4011, 17.3833])[1], radius: 16 }] })
    const lineDistance = (x: number, z: number, points: readonly (readonly [number, number])[]) => {
      let nearest = Infinity
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1]
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
        nearest = Math.min(nearest, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t))
      }
      return nearest
    }
    const riverPoints = MUSI.map(project), lakePoints = HUSSAIN_SAGAR.map(project)
    lakePoints.push(lakePoints[0])
    expect(result.metadata.buildings.every((building) =>
      result.metadata.clearances.every((site) => Math.hypot(building.x - site.x, building.z - site.z) > building.radius + site.radius)
      && lineDistance(building.x, building.z, riverPoints) > building.radius + 1.1
      && lineDistance(building.x, building.z, lakePoints) > building.radius + .65,
    )).toBe(true)
    expect(result.metadata.clearances.find((site) => site.id === 'golconda')?.radius).toBe(16)
  })

  it('supports a static scene and idempotent owned-resource cleanup', () => {
    const result = city(1591, { static: true })
    const mesh = result.activity.children.find((child) => child instanceof InstancedMesh)
    if (!(mesh instanceof InstancedMesh)) throw new Error('Expected instanced activity')
    const before = Array.from(mesh.instanceMatrix.array)
    result.update(500)
    expect(Array.from(mesh.instanceMatrix.array)).toEqual(before)
    expect(() => result.update(NaN)).toThrow(RangeError)
    result.setNight(true)
    result.dispose()
    result.dispose()
    expect(result.root.children).toHaveLength(0)
  })
})

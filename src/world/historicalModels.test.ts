import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three'
import type { MapPalette } from '../geographicStyle'
import { projectCity } from './geography'
import {
  buildHistoricalWorld, districtBuildings, historicalBounds, historicalPalette, landmarkRadius, onWater, projectWater,
} from './historicalModels'
import type { CityChapter, WorldCity, WorldModel } from './types'

const chapter: CityChapter = {
  year: 1600, label: '1600', title: 'A river city', description: '', life: '', changes: [], sources: [], stats: [],
  focus: [10, 10], spanKm: 8, density: .62,
}
const city: WorldCity = {
  id: 'london', name: 'Fixture city', country: '', continent: '', tagline: '', reconstructionNote: '',
  center: [10, 10], mapBounds: [9.95, 9.95, 10.05, 10.05], historicalBounds: [9.95, 9.95, 10.05, 10.05],
  chapters: [chapter], sources: [],
  districts: [
    { name: 'River bend', coordinates: [10, 10], radiusKm: 2.8, visibleFrom: 0 },
    { name: 'Later suburb', coordinates: [10.035, 10.03], radiusKm: 1.6, visibleFrom: 1850 },
  ],
  water: [
    { name: 'River', kind: 'river', widthKm: .28, points: [[9.96, 9.985], [10, 10], [10.04, 10.012]] },
    { name: 'Harbour', kind: 'area', points: [[10.008, 10.008], [10.023, 10.008], [10.023, 10.023], [10.008, 10.023]] },
  ],
  places: [
    { id: 'old-fort', name: 'Old fort', coordinates: [9.989, 10.009], model: 'fort', visibleFrom: 0, visibleUntil: 1800,
      dateLabel: '', description: '', caveat: '', sources: [] },
    { id: 'new-tower', name: 'New tower', coordinates: [9.987, 10.007], model: 'tower', visibleFrom: 1900,
      dateLabel: '', description: '', caveat: '', sources: [] },
  ],
}

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8')
const theme = (name: string) => {
  const value = css.match(new RegExp(`--cp-${name}:\\s*([^;]+);`))?.[1]
  if (!value) throw new Error(`Missing theme fixture ${name}`)
  return value
}
const source: MapPalette = {
  background: theme('bg'), surface: theme('surface'), soft: theme('surface-soft'),
  border: theme('border'), borderStrong: theme('border-strong'), text: theme('text'), muted: theme('text-muted'),
  accent: theme('accent'), link: theme('link'), success: theme('success'),
}
const palette = historicalPalette(source, theme('warning'))

describe('world historical district layout', () => {
  it('is deterministic and responds to chapter density and period heights', () => {
    const first = districtBuildings(city, chapter)
    expect(first.length).toBeGreaterThan(60)
    expect(districtBuildings(city, chapter)).toEqual(first)
    expect(districtBuildings(city, { ...chapter, density: .18 }).length).toBeLessThan(first.length)
    const modern = districtBuildings({ ...city, places: [] }, { ...chapter, year: 2000 })
    expect(Math.max(...modern.map((plot) => plot.height))).toBeGreaterThan(Math.max(...first.map((plot) => plot.height)))
    expect(modern.length).toBeLessThanOrEqual(2400)
  })

  it('keeps whole building footprints clear of rivers, polygons, landmarks and map edges', () => {
    const water = projectWater(city), bounds = historicalBounds(city)
    const landmark = city.places[0], [lx, lz] = projectCity(city, landmark.coordinates)
    for (const plot of districtBuildings(city, chapter)) {
      const radius = Math.hypot(plot.width, plot.depth) / 2
      expect(onWater(plot.x, plot.z, water, radius)).toBe(false)
      expect(plot.x - radius).toBeGreaterThan(bounds.minX)
      expect(plot.x + radius).toBeLessThan(bounds.maxX)
      expect(plot.z - radius).toBeGreaterThan(bounds.minZ)
      expect(plot.z + radius).toBeLessThan(bounds.maxZ)
      expect(Math.hypot(plot.x - lx, plot.z - lz)).toBeGreaterThan(landmarkRadius(landmark, chapter) + radius)
    }
  })

  it('uses the supplied city projection and geography, including river end buffers', () => {
    const waters = projectWater(city)
    const [x, z] = projectCity(city, [10.014, 10.014])
    expect(onWater(x, z, waters)).toBe(true)
    const start = waters[0].points[0]
    expect(onWater(start[0], start[1], waters, .2)).toBe(true)
    expect(onWater(-50, -50, waters)).toBe(false)
    const relocated = { ...city, id: 'tokyo' as const, center: [10.001, 10.001] as const }
    expect(districtBuildings(relocated, chapter)).not.toEqual(districtBuildings(city, chapter))
  })

  it('reserves a building budget for every district rather than filling only the first', () => {
    const spread = {
      ...city, places: [], water: [],
      districts: [
        { name: 'West', coordinates: [9.97, 10] as const, radiusKm: 1.8, visibleFrom: 0 },
        { name: 'East', coordinates: [10.03, 10] as const, radiusKm: 1.8, visibleFrom: 0 },
      ],
    }
    const buildings = districtBuildings(spread, { ...chapter, density: 1 })
    expect(buildings.filter((plot) => plot.x < 0).length).toBeGreaterThan(80)
    expect(buildings.filter((plot) => plot.x > 0).length).toBeGreaterThan(80)
  })
})

describe('historical landmark miniatures', () => {
  it('rebuilds only active landmarks, including exclusive visibleUntil', () => {
    const original = buildHistoricalWorld(city, chapter, palette)
    expect([...original.labels.keys()]).toEqual(['old-fort'])
    original.dispose()
    const between = buildHistoricalWorld(city, { ...chapter, year: 1800 }, palette)
    expect(between.labels.size).toBe(0)
    between.dispose()
    const later = buildHistoricalWorld(city, { ...chapter, year: 2000 }, palette)
    expect([...later.labels.keys()]).toEqual(['new-tower'])
    later.dispose()
  })

  it('reduces symbolic footprints in closely spaced landmark collections', () => {
    const close = {
      ...city,
      places: [
        { ...city.places[0], id: 'pyramid-a', model: 'pyramid' as const, coordinates: [10, 10] as const },
        { ...city.places[0], id: 'pyramid-b', model: 'pyramid' as const, coordinates: [10.003, 10] as const },
      ],
    }
    const radius = landmarkRadius(close.places[0], chapter, close)
    expect(radius).toBeLessThan(landmarkRadius(close.places[0], chapter))
    expect(radius * 2).toBeLessThan(Math.abs(projectCity(close, close.places[1].coordinates)[0]))
  })

  it('batches all model families below 150 draws with finite transforms and disposes resources', () => {
    const models: WorldModel[] = [
      'pyramid', 'temple', 'fort', 'cathedral', 'palace', 'pagoda', 'tower', 'bridge',
      'dome', 'port', 'opera', 'statue', 'district', 'park', 'hill',
    ]
    const fixture = {
      ...city,
      places: models.map((model, index) => ({
        ...city.places[0], id: model, model, coordinates: [9.97 + (index % 5) * .012, 9.975 + Math.floor(index / 5) * .016] as const,
      })),
    }
    const world = buildHistoricalWorld(fixture, chapter, palette)
    expect(world.labels.size).toBe(models.length)
    expect(world.group.children.length).toBeLessThan(150)
    const matrix = new Matrix4()
    let disposedGeometry = 0, disposedMaterial = 0
    const geometries = new Set(), materials = new Set()
    for (const child of world.group.children) {
      expect(child).toBeInstanceOf(Mesh)
      if (!(child instanceof Mesh)) continue
      geometries.add(child.geometry)
      materials.add(child.material)
      if (child instanceof InstancedMesh) for (let index = 0; index < child.count; index++) {
        child.getMatrixAt(index, matrix)
        expect(matrix.elements.every(Number.isFinite)).toBe(true)
        expect(new Vector3().setFromMatrixScale(matrix).length()).toBeGreaterThan(0)
      }
      child.geometry.addEventListener('dispose', () => { disposedGeometry++ })
      if (!Array.isArray(child.material)) child.material.addEventListener('dispose', () => { disposedMaterial++ })
    }
    world.setTheme(palette, 'night')
    world.setTheme(palette, 'day')
    world.dispose()
    expect(disposedGeometry).toBeGreaterThanOrEqual(geometries.size)
    expect(disposedMaterial).toBeGreaterThanOrEqual(materials.size)
    expect(world.group.children).toHaveLength(0)
  })
})

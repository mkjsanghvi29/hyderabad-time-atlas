import { describe, expect, it } from 'vitest'
import { SOURCES } from './data'
import { monumentAppearance } from './monumentHistory'
import { Box3, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { createLandmarkModel, disposeObject } from './scene/models'
import type { AtlasMaterials } from './scene/palette'

describe('monuments over time', () => {
  it('does not collapse the fort immediately after the conquest', () => {
    expect(monumentAppearance('golconda', 1518).fabric).toBe('early')
    expect(monumentAppearance('golconda', 1591).fabric).toBe('complete')
    expect(monumentAppearance('golconda', 1687).fabric).toBe('complete')
    expect(monumentAppearance('golconda', 1763).fabric).toBe('weathered')
    expect(monumentAppearance('golconda', 2025).fabric).toBe('ruin')
  })

  it('allows conservation rather than making decay universal', () => {
    expect(monumentAppearance('tombs', 1908).fabric).toBe('weathered')
    expect(monumentAppearance('tombs', 2025).fabric).toBe('conserved')
    expect(monumentAppearance('charminar', 2025).fabric).toBe('conserved')
    expect(monumentAppearance('cyber-towers', 2025).fabric).toBe('complete')
  })

  it('links interpretation notes to known sources', () => {
    for (const id of ['golconda', 'tombs', 'charminar']) {
      for (const year of [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025]) {
        for (const source of monumentAppearance(id, year).sources) {
          expect(SOURCES.some((entry) => entry.id === source)).toBe(true)
        }
      }
    }
  })

  it('changes the actual geometry, not only the field-note text', () => {
    const stone = new MeshStandardMaterial()
    const foliage = new MeshLambertMaterial()
    const materials: AtlasMaterials = {
      terrain: stone, terrainDark: stone, sandstone: stone, sandstoneLight: stone,
      stone, granite: stone, water: stone, accent: stone, roof: stone, window: stone,
      road: stone, foliage,
    }
    const intact = createLandmarkModel('fort', materials, 1591)
    const ruined = createLandmarkModel('fort', materials, 2025)
    const early = createLandmarkModel('charminar', materials, 1591)
    const clockEra = createLandmarkModel('charminar', materials, 2025)
    const vertices = (model: typeof intact) => {
      let count = 0
      model.traverse((part) => { if (part instanceof Mesh) count += part.geometry.getAttribute('position').count })
      return count
    }
    expect(vertices(intact)).not.toBe(vertices(ruined))
    expect(new Box3().setFromObject(intact).getSize(new Vector3()).y).toBeGreaterThan(new Box3().setFromObject(ruined).getSize(new Vector3()).y)
    expect(vertices(clockEra)).toBeGreaterThan(vertices(early))
    for (const model of [intact, ruined, early, clockEra]) disposeObject(model)
    stone.dispose()
    foliage.dispose()
  })
})

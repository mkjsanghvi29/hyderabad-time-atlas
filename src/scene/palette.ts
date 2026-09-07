import {
  Color,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Material,
  type Texture,
} from 'three'
import { makeSurface } from './surfaces'

export type AtlasPalette = {
  sky: Color
  terrain: Color
  terrainDark: Color
  sandstone: Color
  sandstoneLight: Color
  stone: Color
  granite: Color
  water: Color
  accent: Color
  roof: Color
  window: Color
  road: Color
  foliage: Color
  night: Color
}

export type AtlasMaterials = {
  terrain: MeshStandardMaterial
  terrainDark: MeshStandardMaterial
  sandstone: MeshStandardMaterial
  sandstoneLight: MeshStandardMaterial
  stone: MeshStandardMaterial
  granite: MeshStandardMaterial
  water: MeshStandardMaterial
  accent: MeshStandardMaterial
  roof: MeshStandardMaterial
  window: MeshStandardMaterial
  road: MeshStandardMaterial
  foliage: MeshLambertMaterial
}

function cssColor(styles: CSSStyleDeclaration, name: string): Color {
  return new Color(styles.getPropertyValue(name).trim())
}

function shade(color: Color, multiplier: number): Color {
  return color.clone().multiplyScalar(multiplier)
}

function blend(a: Color, b: Color, amount: number): Color {
  return a.clone().lerp(b, amount)
}

export function readPalette(element: HTMLElement): AtlasPalette {
  const styles = getComputedStyle(element)
  const background = cssColor(styles, '--cp-bg')
  const elevated = cssColor(styles, '--cp-bg-elevated')
  const surface = cssColor(styles, '--cp-surface')
  const text = cssColor(styles, '--cp-text')
  const muted = cssColor(styles, '--cp-text-muted')
  const border = cssColor(styles, '--cp-border-strong')
  const accent = cssColor(styles, '--cp-accent')
  const link = cssColor(styles, '--cp-link')
  const warning = cssColor(styles, '--cp-warning')
  const success = cssColor(styles, '--cp-success')

  return {
    sky: blend(background, elevated, 0.56),
    terrain: blend(background, warning, 0.21).lerp(muted, .18).lerp(success, .045),
    terrainDark: blend(background, text, 0.19),
    sandstone: blend(elevated, warning, 0.27),
    sandstoneLight: blend(surface, warning, 0.16),
    stone: blend(surface, muted, 0.28),
    granite: blend(border, text, 0.48),
    water: blend(link, background, 0.2),
    accent: blend(accent, warning, 0.08),
    roof: blend(text, accent, 0.17),
    window: blend(warning, surface, 0.24),
    road: blend(border, background, 0.25),
    foliage: blend(success, warning, 0.17).lerp(muted, .36).multiplyScalar(.68),
    night: shade(text, 0.22),
  }
}

function standard(color: Color, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

export function createMaterials(palette: AtlasPalette): AtlasMaterials {
  const materials: AtlasMaterials = {
    terrain: standard(palette.terrain, 0.94),
    terrainDark: standard(palette.terrainDark, 0.97),
    sandstone: standard(palette.sandstone, 0.78),
    sandstoneLight: standard(palette.sandstoneLight, 0.72),
    stone: standard(palette.stone, 0.86),
    granite: standard(palette.granite, 0.98),
    water: new MeshStandardMaterial({
      color: palette.water,
      roughness: 0.2,
      metalness: 0.18,
    }),
    accent: standard(palette.accent, 0.72),
    roof: standard(palette.roof, 0.82),
    window: new MeshStandardMaterial({
      color: palette.window,
      emissive: palette.window,
      emissiveIntensity: 0,
      roughness: 0.58,
    }),
    road: standard(palette.road, 0.96),
    foliage: new MeshLambertMaterial({ color: palette.foliage }),
  }
  const plaster = makeSurface('plaster'), stone = makeSurface('masonry')
  const ground = makeSurface('ground'), roof = makeSurface('roof')
  ground.repeat.set(160, 160)
  materials.terrain.map = ground
  for (const material of [materials.sandstone, materials.sandstoneLight]) {
    material.map = plaster
    material.bumpMap = plaster
    material.bumpScale = .006
  }
  for (const material of [materials.stone, materials.granite, materials.terrainDark]) {
    material.map = stone
    material.bumpMap = stone
    material.bumpScale = .012
  }
  materials.roof.map = roof
  return materials
}

export function setNightMaterials(materials: AtlasMaterials, night: boolean): void {
  materials.window.emissiveIntensity = night ? 1.45 : 0
  materials.water.emissive.copy(materials.water.color)
  materials.water.emissiveIntensity = night ? 0.08 : 0
  materials.window.needsUpdate = true
  materials.water.needsUpdate = true
}

export function disposeMaterials(materials: AtlasMaterials): void {
  const textures = new Set<Texture>()
  for (const material of Object.values(materials)) {
    if (material.map) textures.add(material.map)
  }
  for (const texture of textures) texture.dispose()
  for (const material of Object.values(materials) as Material[]) material.dispose()
}

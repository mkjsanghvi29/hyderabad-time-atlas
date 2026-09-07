import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from 'three'
import { seededRandom } from '../geography'

export type SurfaceKind = 'plaster' | 'masonry' | 'roof' | 'ground' | 'road' | 'cloth'

// Original, neutral surface detail; the material's theme-derived colour supplies all pigment.
export function makeSurface(kind: SurfaceKind): DataTexture {
  const size = 128
  const pixels = new Uint8Array(size * size * 4)
  const random = seededRandom(`hyderabad-surface:${kind}`)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = random()
    let value = .9 + grain * .1
    if (kind === 'plaster') value = .82 + grain * .15 + Math.sin(x * .19) * Math.sin(y * .23) * .025
    if (kind === 'masonry') {
      const row = Math.floor(y / 16)
      const mortar = y % 16 < 2 || (x + (row % 2) * 16) % 32 < 2
      value = mortar ? .54 + grain * .08 : .8 + grain * .18
    }
    if (kind === 'roof') value = x % 8 < 2 || y % 32 < 2 ? .62 : .84 + grain * .15
    if (kind === 'ground') value = .72 + grain * .2 + Math.sin(x * .07) * Math.cos(y * .11) * .07
    if (kind === 'road') value = .74 + grain * .22
    if (kind === 'cloth') value = (Math.floor(x / 16) % 2 ? .65 : .95) + grain * .035
    const offset = (y * size + x) * 4
    const shade = Math.round(Math.min(1, value) * 255)
    pixels.set([shade, shade, shade, 255], offset)
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.name = `original-${kind}-surface`
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

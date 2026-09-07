import { describe, expect, it } from 'vitest'
import { makeSurface } from './surfaces'

describe('original procedural surfaces', () => {
  it('generates reproducible surface detail without external image assets', () => {
    const wall = makeSurface('masonry'), again = makeSurface('masonry'), cloth = makeSurface('cloth')
    expect(wall.image.width).toBe(128)
    expect(wall.image.data).toEqual(again.image.data)
    expect(wall.image.data).not.toEqual(cloth.image.data)
    expect(new Set(wall.image.data).size).toBeGreaterThan(20)
    wall.dispose(); again.dispose(); cloth.dispose()
  })
})

import { statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AUDIO_TOUR_STOPS } from './audioTourData'
import { NARRATION_AUDIO } from './audioTourAssets'

describe('published documentary narration', () => {
  it('ships a separate, bounded audio clip for every stop', () => {
    expect(Object.keys(NARRATION_AUDIO).sort()).toEqual(AUDIO_TOUR_STOPS.map((stop) => stop.id).sort())
    let seconds = 0
    for (const stop of AUDIO_TOUR_STOPS) {
      const asset = NARRATION_AUDIO[stop.id]
      expect(asset.src, stop.id).toMatch(/^narration\/[a-z0-9-]+\.mp3$/)
      expect(asset.duration, stop.id).toBeGreaterThan(20)
      expect(asset.duration, stop.id).toBeLessThan(120)
      const file = new URL(`../public/${asset.src}`, import.meta.url)
      expect(statSync(file).size, stop.id).toBeGreaterThan(10_000)
      expect(statSync(file).size, stop.id).toBeLessThan(2_000_000)
      seconds += asset.duration
    }
    expect(seconds).toBeGreaterThan(9 * 60)
    expect(seconds).toBeLessThan(25 * 60)
  })
})

import { describe, expect, it } from 'vitest'
import { AUDIO_TOUR_STOPS } from './audioTourData'
import { districtsInEra } from './city'
import { ERAS, LANDMARKS, SOURCES } from './data'

const CHAPTER_YEARS = [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025]
const STOP_IDS = [
  '1518-older-stone',
  '1518-town-below-walls',
  '1591-new-crossroads',
  '1591-older-crossing',
  '1687-fort-and-conquest',
  '1687-absent-ruler',
  '1763-inherited-skyline',
  '1763-palace-in-the-making',
  '1908-crossroads-and-clocks',
  '1908-river-and-responsibility',
  '1948-riverfront-and-reckoning',
  '1948-learning-and-language',
  '1998-working-day-turns-west',
  '1998-new-statue-old-lake',
  '2025-many-centres',
  '2025-what-the-future-keeps',
]
const ATMOSPHERES = ['fort', 'bazaar', 'river', 'palace', 'campus', 'modern']

describe('the guided Hyderabad audio tour', () => {
  it('uses Qutub spelling in spoken narration for the intended pronunciation', () => {
    const scripts = AUDIO_TOUR_STOPS.map((stop) => stop.speechText ?? stop.narration)
    expect(scripts.join(' ')).toContain('Qutub Shahi')
    for (const script of scripts) expect(script).not.toMatch(/\bQutb\b/)
  })
  it('provides exactly two stops for each of the eight atlas eras', () => {
    expect(ERAS.map((era) => era.year)).toEqual(CHAPTER_YEARS)
    expect(AUDIO_TOUR_STOPS).toHaveLength(16)
    expect([...new Set(AUDIO_TOUR_STOPS.map((stop) => stop.year))]).toEqual(CHAPTER_YEARS)
    for (const year of CHAPTER_YEARS) {
      expect(AUDIO_TOUR_STOPS.filter((stop) => stop.year === year), String(year)).toHaveLength(2)
    }
  })

  it('keeps the route chronological and recording IDs stable and unique', () => {
    const years = AUDIO_TOUR_STOPS.map((stop) => stop.year)
    expect(years).toEqual(CHAPTER_YEARS.flatMap((year) => [year, year]))
    const ids = AUDIO_TOUR_STOPS.map((stop) => stop.id)
    expect(ids).toEqual(STOP_IDS)
    expect(new Set(ids).size).toBe(16)
    for (const stop of AUDIO_TOUR_STOPS) {
      expect(stop.id, stop.id).toMatch(new RegExp(`^${stop.year}-[a-z0-9]+(?:-[a-z0-9]+)*$`))
    }
  })

  it('only visits landmarks and districts available in the stop year', () => {
    for (const stop of AUDIO_TOUR_STOPS) {
      expect(['landmark', 'district'], stop.id).toContain(stop.target.kind)
      if (stop.target.kind === 'landmark') {
        const landmark = LANDMARKS.find((entry) => entry.id === stop.target.id)
        expect(landmark, stop.id).toBeDefined()
        expect(landmark?.visibleFrom, stop.id).toBeLessThanOrEqual(stop.year)
      } else {
        expect(
          districtsInEra(stop.year).some((district) => district.id === stop.target.id),
          stop.id,
        ).toBe(true)
      }
    }
  })

  it('keeps later monuments out of the early chapters', () => {
    const firstChapter = AUDIO_TOUR_STOPS.filter((stop) => stop.year === 1518)
    expect(firstChapter[0].target).toEqual({ kind: 'landmark', id: 'golconda' })
    expect(firstChapter[1].target.kind).toBe('district')
    expect(AUDIO_TOUR_STOPS.filter((stop) => stop.year === 1763).map((stop) => stop.target.id))
      .not.toContain('chowmahalla')
    const floodChapterTargets = AUDIO_TOUR_STOPS.filter((stop) => stop.year === 1908).map((stop) => stop.target.id)
    expect(floodChapterTargets).not.toContain('high-court')
    expect(floodChapterTargets).not.toContain('osmania')
    expect(AUDIO_TOUR_STOPS.filter((stop) => stop.year === 1998).some((stop) => /airport|rajiv|shamshabad/i.test(stop.target.id)))
      .toBe(false)
  })

  it('grounds every stop in known, nonduplicated source references', () => {
    for (const stop of AUDIO_TOUR_STOPS) {
      expect(stop.sources.length, stop.id).toBeGreaterThan(0)
      expect(new Set(stop.sources).size, stop.id).toBe(stop.sources.length)
      for (const id of stop.sources) {
        expect(SOURCES.some((source) => source.id === id), `${stop.id}: ${id}`).toBe(true)
      }
    }
  })

  it('provides descriptive headings and supported atmosphere cues', () => {
    for (const stop of AUDIO_TOUR_STOPS) {
      expect(stop.title.trim().split(/\s+/).length, stop.id).toBeGreaterThanOrEqual(3)
      expect(stop.title.length, stop.id).toBeLessThanOrEqual(70)
      expect(stop.subtitle.trim().split(/\s+/).length, stop.id).toBeGreaterThanOrEqual(4)
      expect(stop.subtitle.length, stop.id).toBeLessThanOrEqual(100)
      expect(ATMOSPHERES, stop.id).toContain(stop.atmosphere)
      expect(stop.title, stop.id).not.toMatch(/^(?:stop|chapter)\s*\d+$/i)
    }
    expect(new Set(AUDIO_TOUR_STOPS.map((stop) => stop.title)).size).toBe(16)
  })

  it('keeps each transcript within a short documentary segment', () => {
    let totalWords = 0
    for (const stop of AUDIO_TOUR_STOPS) {
      const words = stop.narration.trim().split(/\s+/).length
      totalWords += words
      expect(words, stop.id).toBeGreaterThanOrEqual(100)
      expect(words, stop.id).toBeLessThanOrEqual(155)
      expect(stop.narration, stop.id).not.toMatch(/\b(?:TODO|TBD|placeholder|lorem ipsum)\b/i)
      expect(stop.narration.trim().split(/\n\s*\n/).length, stop.id).toBeLessThanOrEqual(2)
      if (stop.speechText !== undefined) {
        const speechWords = stop.speechText.trim().split(/\s+/).length
        expect(speechWords, stop.id).toBeGreaterThanOrEqual(100)
        expect(speechWords, stop.id).toBeLessThanOrEqual(170)
      }
    }
    expect(totalWords).toBeGreaterThanOrEqual(1800)
    expect(totalWords).toBeLessThanOrEqual(2150)
  })

  it('finishes by connecting contemporary growth with living heritage', () => {
    const finalChapter = AUDIO_TOUR_STOPS.filter((stop) => stop.year === 2025)
    expect(finalChapter[0].target).toEqual({ kind: 'district', id: 'financial-district' })
    expect(finalChapter[1].target).toEqual({ kind: 'landmark', id: 'tombs' })
    expect(finalChapter[1].sources).toContain('conservation')
    expect(finalChapter[1].narration).toMatch(/western skyline/i)
    expect(finalChapter[1].narration).toMatch(/conservation/i)
  })
})

import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CityStories from './CityStories'
import { CITY_STORIES, cityStories, cityStoryLandmark, cityStorySources } from './cityStoryData'
import { ERAS, LANDMARKS, SOURCES } from './data'

const CHAPTER_YEARS = [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025]

describe('Hyderabad city stories', () => {
  it('covers all eight atlas chapters with exactly two stories each', () => {
    expect(ERAS.map((era) => era.year)).toEqual(CHAPTER_YEARS)
    expect([...new Set(CITY_STORIES.map((story) => story.year))]).toEqual(CHAPTER_YEARS)
    expect(CITY_STORIES).toHaveLength(16)
    for (const year of CHAPTER_YEARS) {
      const stories = cityStories(year)
      expect(stories).toHaveLength(2)
      expect(stories.every((story) => story.year === year)).toBe(true)
    }
  })

  it('uses sixteen distinct, nonempty story IDs', () => {
    const ids = CITY_STORIES.map((story) => story.id)
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(16)
  })

  it('keeps each story short enough for a compact card', () => {
    for (const story of CITY_STORIES) {
      expect(story.title.trim().length, story.id).toBeGreaterThan(0)
      expect(story.title.length, story.id).toBeLessThanOrEqual(70)
      const wordCount = story.body.trim().split(/\s+/).length
      expect(wordCount, story.id).toBeGreaterThanOrEqual(35)
      expect(wordCount, story.id).toBeLessThanOrEqual(65)
    }
  })

  it('links each story to named publishers with valid public HTTPS URLs', () => {
    for (const story of CITY_STORIES) {
      expect(story.sources.length, story.id).toBeGreaterThan(0)
      expect(new Set(story.sources).size, story.id).toBe(story.sources.length)
      const sources = cityStorySources(story)
      expect(sources).toHaveLength(story.sources.length)
      for (const source of sources) {
        expect(SOURCES).toContain(source)
        expect(source.publisher.trim().length).toBeGreaterThan(0)
        expect(source.title.trim().length).toBeGreaterThan(0)
        const url = new URL(source.url)
        expect(url.protocol).toBe('https:')
        expect(url.hostname).toContain('.')
        expect(url.username).toBe('')
        expect(url.password).toBe('')
      }
    }
  })

  it('only offers landmark targets already available in the story chapter', () => {
    for (const story of CITY_STORIES) {
      const landmark = cityStoryLandmark(story)
      if (story.landmarkId) {
        expect(landmark, story.id).toBeDefined()
        expect(landmark?.id).toBe(story.landmarkId)
        expect(LANDMARKS).toContain(landmark)
        expect(landmark?.visibleFrom, story.id).toBeLessThanOrEqual(story.year)
      } else {
        expect(landmark).toBeUndefined()
      }
    }
    expect(cityStories(1518).every((story) => story.landmarkId === 'golconda')).toBe(true)
    expect(cityStories(1763).some((story) => story.landmarkId === 'chowmahalla')).toBe(false)
    expect(cityStories(1908).some((story) => story.landmarkId === 'high-court')).toBe(false)
    expect(cityStories(1998).some((story) => /airport|rajiv/i.test(story.landmarkId ?? ''))).toBe(false)
  })

  it('rejects unsupported chapters and broken references rather than silently dropping them', () => {
    expect(() => cityStories(1600)).toThrow(RangeError)
    expect(() => cityStorySources({ ...CITY_STORIES[0], sources: ['missing-source'] })).toThrow(RangeError)
    expect(() => cityStoryLandmark({ ...CITY_STORIES[0], landmarkId: 'missing-landmark' })).toThrow(RangeError)
    expect(() => cityStoryLandmark({ ...CITY_STORIES[0], landmarkId: 'charminar' })).toThrow(RangeError)
  })

  it('renders closed native disclosures and source links without triggering a visit', () => {
    for (const year of CHAPTER_YEARS) {
      let visits = 0
      const html = renderToStaticMarkup(createElement(CityStories, {
        year,
        onVisit: () => { visits += 1 },
      }))
      expect(html.match(/<details(?:\s|>)/g)).toHaveLength(2)
      expect(html.match(/<summary(?:\s|>)/g)).toHaveLength(2)
      expect(html).not.toMatch(/<details\b[^>]*\bopen(?:[=\s>])/)
      expect(html).toContain(`Stories and interesting facts for ${year}`)
      expect(html).toContain('rel="noopener noreferrer"')
      const visitButtons = html.match(/<button\b/g) ?? []
      expect(visitButtons).toHaveLength(cityStories(year).filter((story) => story.landmarkId).length)
      expect(visits).toBe(0)
    }
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXPEDITIONS, goalsForVisit, loadExpeditions, saveExpeditions } from './expeditions'
import { CITY_DISTRICTS, districtEmphasis } from './city'
import { ERAS, LANDMARKS } from './data'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('educational expeditions', () => {
  it('has three valid, era-appropriate goals for all eight chapters', () => {
    expect(EXPEDITIONS.map((entry) => entry.year)).toEqual(ERAS.map((era) => era.year))
    expect(new Set(EXPEDITIONS.flatMap((entry) => entry.goals.map((goal) => goal.id))).size).toBe(24)
    for (const expedition of EXPEDITIONS) {
      expect(expedition.goals).toHaveLength(3)
      for (const goal of expedition.goals) {
        if (goal.kind === 'quiz') {
          expect(goal.options.some((option) => option.id === goal.answer)).toBe(true)
          expect(goal.explanation.length).toBeGreaterThan(40)
        } else if (goal.kind === 'landmark') {
          const place = LANDMARKS.find((entry) => entry.id === goal.target)!
          expect(place).toBeDefined()
          expect(place.visibleFrom).toBeLessThanOrEqual(expedition.year)
        } else {
          const district = CITY_DISTRICTS.find((entry) => entry.id === goal.target)!
          expect(district).toBeDefined()
          expect(districtEmphasis(district, expedition.year)).toBeGreaterThanOrEqual(.1)
        }
      }
    }
  })

  it('does not unlock another era from one landmark visit', () => {
    expect(goalsForVisit(1591, 'landmark', 'charminar')).toEqual(['1591:charminar'])
    expect(goalsForVisit(1518, 'landmark', 'charminar')).toEqual([])
    expect(goalsForVisit(2025, 'district', 'financial-district')).toEqual(['2025:financial-district'])
  })

  it('persists validated progress without inventing unknown achievements', () => {
    let value: string | null = null
    vi.stubGlobal('localStorage', { getItem: () => value, setItem: (_key: string, next: string) => { value = next } })
    expect(loadExpeditions().completed.size).toBe(0)
    expect(saveExpeditions(new Set(['1591:charminar', '1591:discovery']))).toBe('')
    expect([...loadExpeditions().completed]).toEqual(['1591:charminar', '1591:discovery'])
    value = '{"version":1,"completed":["invented-badge"]}'
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loaded = loadExpeditions()
    expect(loaded.completed.size).toBe(0)
    expect(loaded.warning).not.toBe('')
    expect(warning).toHaveBeenCalled()
  })

  it('keeps play available when browser storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadExpeditions().completed.size).toBe(0)
    expect(saveExpeditions(new Set(['1591:charminar']))).toContain('storage is unavailable')
  })
})

import { describe, expect, it } from 'vitest'
import { cityStatistics } from './cityStatistics'
import { ERAS, SOURCES } from './data'

describe('historical city statistics', () => {
  it('never presents a benchmark as a contemporary population or renderer count', () => {
    expect(cityStatistics(1908).population).toMatchObject({ value: 448466, referenceYear: 1901 })
    expect(cityStatistics(1948).population).toMatchObject({ value: 739159, referenceYear: 1941 })
    expect(cityStatistics(2025).population).toMatchObject({ value: 7674689, referenceYear: 2011 })
    for (const era of ERAS) {
      const stats = cityStatistics(era.year)
      if (stats.population) {
        expect(stats.population.referenceYear).not.toBe(era.year)
        expect(stats.population.boundary.length).toBeGreaterThan(30)
        expect(stats.population.caution.length).toBeGreaterThan(30)
        expect(SOURCES.some((source) => source.id === stats.population!.source)).toBe(true)
      }
      for (const id of stats.signature.sources) expect(SOURCES.some((source) => source.id === id)).toBe(true)
    }
  })

  it('keeps gaps explicit and calculates city age from the documented founding date', () => {
    expect(cityStatistics(1518).population).toBeNull()
    expect(cityStatistics(1998).population).toBeNull()
    expect(cityStatistics(1518).foundingOffset).toBe(-73)
    expect(cityStatistics(1591).foundingOffset).toBe(0)
    expect(cityStatistics(2025).foundingOffset).toBe(434)
    expect(() => cityStatistics(1500)).toThrow(RangeError)
  })
})

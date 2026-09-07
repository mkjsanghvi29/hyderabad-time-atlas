import { ERAS, LANDMARKS } from './data'
import { districtsInEra } from './city'

export type PopulationRecord = {
  value: number
  referenceYear: number
  label: string
  boundary: string
  caution: string
  source: string
}

const POPULATION: Partial<Record<number, PopulationRecord>> = {
  1908: {
    value: 448466, referenceYear: 1901, label: '1901 census benchmark',
    boundary: 'The census definition includes the City and Chadarghat municipalities, Secunderabad and Bolarum cantonments, and Residency Bazaars.',
    caution: 'Seven years before this chapter; not a measured 1908 population.',
    source: 'census-1901',
  },
  1948: {
    value: 739159, referenceYear: 1941, label: '1941 census benchmark',
    boundary: 'Hyderabad City (municipalities and cantonments), including Secunderabad, Trimulgherry, Bolarum and 75 suburban villages.',
    caution: 'Seven years before this chapter. Boundary expansion prevents a like-for-like growth comparison with 1901.',
    source: 'census-1941',
  },
  2025: {
    value: 7674689, referenceYear: 2011, label: '2011 provisional census benchmark',
    boundary: 'Hyderabad urban agglomeration, as reproduced by Census2011.co.in, an independent secondary website.',
    caution: 'This is not a 2025 population estimate or a final-census figure. It is not directly comparable with the historical city boundaries above.',
    source: 'population-2011',
  },
}

const SIGNATURES: Record<number, { value: string; label: string; note: string; sources: string[] }> = {
  1518: { value: 'Qutb Shahi', label: 'Political chapter', note: 'The dynasty begins at Golconda, which has older architectural layers.', sources: ['unesco'] },
  1591: { value: '4 avenues', label: 'Founding framework', note: 'UNESCO describes four cardinal avenues meeting at Charminar.', sources: ['unesco'] },
  1687: { value: 'Mughal rule', label: 'Political transition', note: 'The conquest ends Qutb Shahi sovereignty; buildings do not change overnight.', sources: ['unesco'] },
  1763: { value: '1763 / 1769', label: 'Capital-transfer dates', note: 'Sources differ. The chapter represents the mid-century transition.', sources: ['capital', 'history'] },
  1908: { value: '28 September', label: 'Musi flood date', note: 'The dated disaster is documented; an exact inundation footprint is not reconstructed.', sources: ['flood'] },
  1948: { value: '17 September', label: 'Integration into India', note: 'The High Court’s official history records Hyderabad State’s integration date.', sources: ['court'] },
  1998: { value: 'Cyber Towers', label: 'New western milestone', note: 'The opening is supported here by a secondary commercial directory, not an original inauguration record.', sources: ['hitec'] },
  2025: { value: 'Many centres', label: 'Urban structure', note: 'Historic cores and western development coexist; HMDA jurisdiction is not the built-up city.', sources: ['urban-morphology', 'hmda'] },
}

export function cityStatistics(year: number) {
  if (!ERAS.some((era) => era.year === year)) throw new RangeError(`Unknown atlas year: ${year}`)
  return {
    population: POPULATION[year] ?? null,
    signature: SIGNATURES[year],
    foundingOffset: year - 1591,
    modelledSites: LANDMARKS.filter((place) => place.visibleFrom <= year).length,
    modelledZones: districtsInEra(year).length,
  }
}

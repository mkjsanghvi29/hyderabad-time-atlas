export type MonumentFabric = 'early' | 'complete' | 'weathered' | 'ruin' | 'conserved'

export type MonumentAppearance = {
  fabric: MonumentFabric
  title: string
  detail: string
  sources: string[]
}

export function monumentAppearance(id: string, year: number): MonumentAppearance {
  if (id === 'golconda') {
    if (year === 1518) return {
      fabric: 'early', title: 'A fort still growing',
      detail: 'Earlier hilltop fortifications precede the Qutb Shahi capital. The smaller enclosure and fewer buildings distinguish this formative chapter; their exact 1518 arrangement is reconstructed, not surveyed.',
      sources: ['unesco'],
    }
    if (year <= 1687) return {
      fabric: 'complete', title: 'A working fortified city',
      detail: 'Roofed halls, inhabited compounds and defensive circuits evoke the fort at the height of Qutb Shahi rule. The 1687 chapter does not turn a change of sovereignty into instantaneous architectural destruction.',
      sources: ['unesco', 'history'],
    }
    if (year < 1908) return {
      fabric: 'weathered', title: 'An inherited stronghold',
      detail: 'After the Qutb Shahis, the fort survives in a changed political landscape. Wear is an illustrative transition; there is no measured record here dating each lost roof or damaged wall.',
      sources: ['history'],
    }
    return {
      fabric: 'ruin', title: 'Standing walls, open ruins',
      detail: 'The surviving landscape includes substantial ramparts and gateways alongside ruined palaces, pavilions and other structures. Open roofs, interrupted masonry and exposed courtyards evoke this distinction; missing stones are not archaeologically mapped.',
      sources: ['history', 'unesco'],
    }
  }
  if (id === 'tombs') {
    if (year <= 1591) return {
      fabric: 'early', title: 'A necropolis across generations',
      detail: 'The first royal tomb dates to around 1543. Fewer domed buildings represent an evolving complex rather than placing every later tomb into the founding era.',
      sources: ['unesco'],
    }
    if (year >= 2025) return {
      fabric: 'conserved', title: 'Conservation is another layer',
      detail: 'The Aga Khan Trust for Culture documents conservation of the Qutb Shahi royal tombs. Repaired surfaces and a cared-for landscape represent conservation, not a claim that every structure was restored to an identical condition.',
      sources: ['conservation', 'unesco'],
    }
    return {
      fabric: year >= 1908 ? 'weathered' : 'complete', title: 'The dynastic ensemble',
      detail: 'The complex accumulated across the 16th and 17th centuries. Later surface wear is interpretive, not evidence for the condition of each tomb in an exact year.',
      sources: ['unesco'],
    }
  }
  if (id === 'charminar') return {
    fabric: year >= 1908 ? 'conserved' : 'complete',
    title: year >= 1889 ? 'The clock-era monument' : 'Before the clocks',
    detail: year >= 1889
      ? 'Clock faces are a late-19th-century addition, conventionally dated to 1889. The inhabited, maintained landmark is not turned into a ruin simply because time passes.'
      : 'The four arches and minarets define the founding monument. The later clock faces are deliberately omitted from these earlier chapters.',
    sources: ['unesco', 'charminar'],
  }
  return {
    fabric: 'complete', title: 'A maintained landmark',
    detail: 'The model reflects the chapter’s broad architectural period. No structural decay is invented where a building-specific condition history has not been established.',
    sources: [],
  }
}

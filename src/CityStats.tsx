import { cityStatistics } from './cityStatistics'
import { SOURCES } from './data'

export default function CityStats({ year }: { year: number }) {
  const stats = cityStatistics(year)
  const source = SOURCES.find((entry) => entry.id === stats.population?.source)
  const population = stats.population
  return <section className="city-stats" aria-label={`City statistics for ${year}`}>
    <div className="stats-heading"><span className="eyebrow">CITY AT A GLANCE</span><span>{year}</span></div>
    <div className="stats-grid">
      <div><strong>{Math.abs(stats.foundingOffset)}<small> years</small></strong><span>{stats.foundingOffset < 0 ? 'before Hyderabad’s founding' : stats.foundingOffset === 0 ? 'the founding year' : 'since the 1591 founding'}</span></div>
      <div><strong className="stat-signature">{stats.signature.value}</strong><span>{stats.signature.label}</span></div>
    </div>
    <details className="population-stat">
      <summary><span>Population{population ? ` · ${population.referenceYear}` : ' record'}</span><strong>{population ? new Intl.NumberFormat('en-IN').format(population.value) : 'Not established'}</strong></summary>
      {population ? <>
        <p className="population-reference">{population.label} · NOT {year} population</p>
        <p>{population.boundary}</p><p>{population.caution}</p>
        {source && <a href={source.url} target="_blank" rel="noreferrer">Read the population source ↗</a>}
      </> : <p>No defensible population figure for this chapter was established in the sources consulted. A missing figure is not zero; the atlas does not invent one.</p>}
    </details>
    {population && <p className="population-year">Reference year: <b>{population.referenceYear}</b> · different from this chapter</p>}
    <details className="stats-method"><summary>Context &amp; atlas coverage</summary><p>{stats.signature.note}</p>
      <div className="stats-sources">{SOURCES.filter((entry) => stats.signature.sources.includes(entry.id)).map((entry) => <a key={entry.id} href={entry.url} target="_blank" rel="noreferrer">{entry.title} ↗</a>)}</div>
      <p>Atlas only: {stats.modelledSites} modelled landmarks and {stats.modelledZones} interpreted neighbourhood zones. These are not the city’s total monuments, neighbourhoods or population.</p>
      <p>The age above is calculated from the 1591 founding date, not Golconda’s older origins.</p>
    </details>
  </section>
}

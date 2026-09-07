import type { CityDistrict } from './city'
import CityStories from './CityStories'

export type EraLife = {
  year: number
  title: string
  vignette: string
  observations: Array<{ label: string; text: string }>
  uncertainty: string
  sources: string[]
}

export default function CityLifePanel({ story, districts, explored, onVisit, onLandmark, onSources }: {
  story: EraLife
  districts: CityDistrict[]
  explored: Set<string>
  onVisit: (id: string) => void
  onLandmark: (id: string) => void
  onSources: () => void
}) {
  const count = districts.filter((district) => explored.has(`${story.year}:${district.id}`)).length
  return (
    <div className="city-life-panel">
      <span className="eyebrow">NOT JUST MONUMENTS</span>
      <h1>{story.title}</h1>
      <CityStories year={story.year} onVisit={onLandmark} />
      <div className="life-vignette">
        <span className="eyebrow">A RECONSTRUCTED STREET SCENE</span>
        <p>{story.vignette}</p>
      </div>
      <div className="life-observations">
        {story.observations.map((observation) => <section key={observation.label}>
          <h3>{observation.label}</h3><p>{observation.text}</p>
        </section>)}
      </div>
      <details className="evidence-note"><summary>What is known, what is inferred</summary><p>{story.uncertainty}</p></details>
      <button className="text-button source-inline" onClick={onSources}>Explore the period references <span aria-hidden="true">↗</span></button>
      <div className="discovery-heading">
        <div><span className="eyebrow">EXPLORE THE CITY</span><h2>Leave the postcard.</h2></div>
        <span className="discovery-count" aria-label={`${count} of ${districts.length} neighbourhoods explored`}>{count}<small> / {districts.length}</small></span>
      </div>
      <p className="quiet-note">Travel to a neighbourhood, then explore its lanes in street view. These are reconstructed urban patterns, not surveyed streets. Modern place names are orientation labels.</p>
      <div className="district-list">
        {districts.map((district) => <button className="district-row" key={district.id} onClick={() => onVisit(district.id)}>
          <span className="district-symbol" aria-hidden="true">{explored.has(`${story.year}:${district.id}`) ? '✓' : '◇'}</span>
          <span><strong>{district.name}</strong><small>{district.activity}</small></span><span aria-hidden="true">→</span>
        </button>)}
      </div>
      <p className="quiet-note">Exploration progress lasts for this visit. The shading and density of the city are visual interpretation, not population measurements.</p>
    </div>
  )
}

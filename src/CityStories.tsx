import { cityStories, cityStoryLandmark, cityStorySources } from './cityStoryData'
import './CityStories.css'

export default function CityStories({ year, onVisit }: {
  year: number
  onVisit: (landmarkId: string) => void
}) {
  return <section className="city-stories" aria-label={`Stories and interesting facts for ${year}`}>
    <div className="city-stories-heading">
      <h2>Worth a closer look</h2>
      <span>{year}</span>
    </div>
    <p className="city-stories-hint">Two short stories. Open either to discover more.</p>
    <div className="city-stories-cards">
      {cityStories(year).map((story) => {
        const landmark = cityStoryLandmark(story)
        return <details className="city-story" key={story.id}>
          <summary>{story.title}</summary>
          <div className="city-story-content">
            <p className="city-story-body">{story.body}</p>
            {landmark && <button
              className="city-story-explore"
              type="button"
              onClick={() => onVisit(landmark.id)}
            >Explore {landmark.name}</button>}
            <p className="city-story-source-label">Read the sources</p>
            <ul className="city-story-sources" aria-label={`Sources for ${story.title}`}>
              {cityStorySources(story).map((source) => <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${source.publisher}: ${source.title} (opens in a new tab)`}
                >{source.publisher}</a>
              </li>)}
            </ul>
          </div>
        </details>
      })}
    </div>
  </section>
}

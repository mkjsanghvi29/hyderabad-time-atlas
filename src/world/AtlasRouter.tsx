import App from '../App'
import CityPicker, { cityLink } from './CityPicker'
import { WORLD_CITIES } from './registry'
import WorldAtlas from './WorldAtlas'

export default function AtlasRouter() {
  const id = new URLSearchParams(location.search).get('city') ?? 'hyderabad'
  if (id === 'hyderabad') return <App />
  const city = WORLD_CITIES.find((entry) => entry.id === id)
  if (city) return <WorldAtlas city={city} />
  return <main className="world-unknown-city"><h1>This city is not in the atlas yet.</h1><p>Choose one of the seven available cities.</p><CityPicker selected="hyderabad" /><a className="quiet-button" href={cityLink('hyderabad')}>Return to Hyderabad</a></main>
}

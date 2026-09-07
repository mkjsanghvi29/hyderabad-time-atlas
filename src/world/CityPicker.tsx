import type { CityId } from './types'
import './WorldAtlas.css'

export const CITY_OPTIONS: { id: CityId; name: string; region: string }[] = [
  { id: 'hyderabad', name: 'Hyderabad', region: 'Asia' },
  { id: 'london', name: 'London', region: 'Europe' },
  { id: 'cairo', name: 'Cairo & Giza', region: 'Africa' },
  { id: 'tokyo', name: 'Tokyo', region: 'Asia' },
  { id: 'new-york', name: 'New York', region: 'North America' },
  { id: 'rio', name: 'Rio de Janeiro', region: 'South America' },
  { id: 'sydney', name: 'Sydney', region: 'Oceania' },
]

export function cityLink(id: CityId, href = location.href) {
  const url = new URL(href)
  const theme = url.searchParams.get('scoutTheme')
  url.search = ''
  url.hash = ''
  url.searchParams.set('city', id)
  if (theme === 'light' || theme === 'dark') url.searchParams.set('scoutTheme', theme)
  return url.href
}

export default function CityPicker({ selected }: { selected: CityId }) {
  return <label className="city-picker">
    <span>EXPLORE THE WORLD</span>
    <select aria-label="Choose a city" value={selected} onChange={(event) => {
      const city = CITY_OPTIONS.find((entry) => entry.id === event.target.value)
      if (city) location.assign(cityLink(city.id))
    }}>
      {CITY_OPTIONS.map((city) => <option key={city.id} value={city.id}>{city.name} · {city.region}</option>)}
    </select>
  </label>
}

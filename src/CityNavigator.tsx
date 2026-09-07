import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { destinationsForYear, parseCoordinates, type Destination } from './navigation'
import { searchCityPlaces, type PlaceResult } from './placeSearch'
import type { Coordinates } from './types'
import './CityNavigator.css'

export default function CityNavigator({ year, map, onNavigate, onLandmark, geographic }: {
  year: number
  map: ReactNode
  onNavigate: (coordinates: Coordinates, label?: string, zoom?: number) => void
  onLandmark: (id: string) => void
  geographic: boolean
}) {
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<PlaceResult[] | null>(null)
  const request = useRef<AbortController | null>(null)
  const inputId = useId()
  const onlineSearch = geographic && year >= 2025
  const destinations = destinationsForYear(year)
  const matches = destinations.filter((entry) => `${entry.name} ${entry.kind}`.toLowerCase().includes(search.trim().toLowerCase()))

  useEffect(() => () => request.current?.abort(), [year, geographic])

  function choose(destination: Destination) {
    if (destination.landmarkId) onLandmark(destination.landmarkId)
    else onNavigate(destination.coordinates, destination.name, destination.kind === 'Airport' ? 14 : undefined)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    request.current?.abort()
    setError('')
    const coordinates = parseCoordinates(search)
    if (coordinates) { onNavigate(coordinates); return }
    if (!onlineSearch) {
      if (matches.length === 1) choose(matches[0])
      else setError('Choose a result below, or enter latitude, longitude (for example 17.2403, 78.4294).')
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setResults(null)
    try {
      const places = await searchCityPlaces(search, controller.signal)
      if (!controller.signal.aborted) setResults(places)
    } catch (failure) {
      if (!controller.signal.aborted) setError(`Could not search the map. ${failure instanceof Error ? failure.message : 'Please try again.'}`)
    } finally {
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }

  return <div className="city-navigator">
    <div className="navigator-directory">
      <span className="eyebrow">GO BEYOND THE LANDMARKS</span>
      <h2>The whole city is yours to explore.</h2>
      <p>Pan and zoom the map, then click any point to travel there. The pins are suggestions, not limits.</p>
      <form onSubmit={submit}>
        <label htmlFor={inputId}>Find a landmark, place or coordinates</label>
        <div className="navigator-search">
          <input id={inputId} value={search} maxLength={160} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" placeholder={onlineSearch ? 'Salar Jung Museum, Birla Mandir...' : 'Area, landmark, or 17.24, 78.43'} onChange={(event) => {
            request.current?.abort()
            request.current = null
            setSearch(event.target.value)
            setError('')
            setResults(null)
            setBusy(false)
          }} />
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Searching...' : 'Go'}</button>
        </div>
        {error && <p role="alert" className="navigator-error">{error}</p>}
      </form>
      {onlineSearch && <p className="navigator-search-note">Press Go to search current landmarks, streets, parks and other mapped places across Hyderabad. Only submitted text is sent to <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a>; no search-as-you-type requests.</p>}
      {year === 1998 && <p className="navigator-era-note">Flying in 1998? Use Begumpet. The airport at Shamshabad did not open until 2008.</p>}
      <div className="navigator-results" aria-busy={busy}>
        {busy && <p role="status">Searching the Hyderabad map...</p>}
        {onlineSearch && results !== null && <>
          <h3>Current map matches</h3>
          <p role="status">{results.length ? `${results.length} mapped results. Choose a place to travel there.` : 'No mapped matches in the Hyderabad area. Try a different spelling or nearby place, or choose a point on the map.'}</p>
          {results.map((result) => <div className="navigator-live-result" key={result.id}>
            <button className="navigator-result" aria-label={`Travel to ${result.name}: ${result.description}`} onClick={() => onNavigate(result.coordinates, result.name, result.zoom)}>
              <span><small>{result.kind}</small><strong>{result.name}</strong><span>{result.description}</span></span><span aria-hidden="true">→</span>
            </button>
            {result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer" aria-label={`OpenStreetMap record for ${result.name}`}>View map record ↗</a>}
          </div>)}
          <p className="navigator-search-note">Current records, not proof a place existed in a historical image. Search coverage varies. Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</p>
        </>}
        {matches.length > 0 && <h3>Atlas collection</h3>}
        {matches.map((destination) => <button key={destination.id} className="navigator-result" onClick={() => choose(destination)}>
          <span><small>{destination.kind}</small><strong>{destination.name}</strong><span>{destination.note}</span></span><span aria-hidden="true">→</span>
        </button>)}
        {!matches.length && results === null && !busy && <p>{onlineSearch ? 'No atlas-collection match. Press Go to search the wider city.' : 'No catalogue match. Select any map point or enter coordinates. Historical and offline searches stay on your device; current places are not projected into the past.'}</p>}
      </div>
      {!geographic && <p className="navigator-era-note">This offline reconstruction covers a smaller, illustrative area. It is not a complete street map.</p>}
    </div>
    <div className="navigator-map">{map}</div>
  </div>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import CityNavigator from '../CityNavigator'
import GeographicOverview from '../GeographicOverview'
import { validCoordinates } from '../navigation'
import type { AtlasSceneHandle, CameraMode, Coordinates, MapView, SceneStatus, TimeOfDay } from '../types'
import CityPicker, { cityLink } from './CityPicker'
import { insideBounds, placesInChapter, yearLabel } from './geography'
import { readWorldLocation } from './navigation'
import type { CitySceneProps, WorldCity } from './types'
import WorldHistoricalScene from './WorldHistoricalScene'
import WorldMap from './WorldMap'
import WorldMiniMap from './WorldMiniMap'
import './WorldAtlas.css'

export default function WorldAtlas({ city }: { city: WorldCity }) {
  const [initial] = useState(() => readWorldLocation(city, location.search, location.protocol))
  const [index, setIndex] = useState(initial.index)
  const [selectedId, setSelectedId] = useState(initial.selectedId)
  const [destination, setDestination] = useState(initial.destination)
  const [destinationZoom, setDestinationZoom] = useState(initial.zoom)
  const [destinationName, setDestinationName] = useState('Your chosen location')
  const [preferMap, setPreferMap] = useState(initial.preferMap)
  const [pin, setPin] = useState(false)
  const [status, setStatus] = useState<SceneStatus>('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(initial.notice)
  const [tab, setTab] = useState<'story' | 'life' | 'places'>('story')
  const [filter, setFilter] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [lighting, setLighting] = useState<TimeOfDay>('golden')
  const [labels, setLabels] = useState(true)
  const [view, setView] = useState<MapView | null>(null)
  const [reload, setReload] = useState(0)
  const [tourStep, setTourStep] = useState<number | null>(null)
  const scene = useRef<AtlasSceneHandle>(null)
  const sourcesDialog = useRef<HTMLDialogElement>(null)
  const mapDialog = useRef<HTMLDialogElement>(null)
  const timeline = useRef<HTMLDivElement>(null)
  const chapter = city.chapters[index]
  const places = useMemo(() => placesInChapter(city, chapter.year), [city, chapter.year])
  const selected = places.find((place) => place.id === selectedId) ?? null
  const modern = chapter.year === 2025
  const geographic = modern && preferMap
  const region = useMemo(() => ({ name: city.name, center: city.center, bounds: city.mapBounds }), [city])
  const directory = useMemo(() => ({
    region,
    destinations: places.map((place) => ({ id: place.id, name: place.name, kind: 'Landmark' as const, note: place.dateLabel, coordinates: place.coordinates, landmarkId: place.id })),
  }), [places, region])
  const relevantSources = new Set([...chapter.sources, ...chapter.stats.map((stat) => stat.source), ...(selected?.sources ?? [])])

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('city', city.id)
    url.searchParams.set('year', String(chapter.year))
    for (const key of ['place', 'lat', 'lon', 'zoom', 'layer', 'view']) url.searchParams.delete(key)
    if (selected) url.searchParams.set('place', selected.id)
    if (destination) {
      url.searchParams.set('lat', destination[1].toFixed(6))
      url.searchParams.set('lon', destination[0].toFixed(6))
      if (destinationZoom !== undefined) url.searchParams.set('zoom', String(destinationZoom))
    }
    if (!preferMap) url.searchParams.set('view', 'atlas')
    if (location.protocol !== 'file:') history.replaceState({}, '', url)
    document.title = `${city.name} ${yearLabel(chapter.year)} · Through Time`
  }, [city, chapter.year, selected, destination, destinationZoom, preferMap])
  useEffect(() => {
    if (sourcesOpen) sourcesDialog.current?.showModal()
    else sourcesDialog.current?.close()
  }, [sourcesOpen])
  useEffect(() => {
    if (mapOpen) mapDialog.current?.showModal()
    else mapDialog.current?.close()
  }, [mapOpen])
  useEffect(() => {
    timeline.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' })
  }, [index])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 8000)
    return () => clearTimeout(timer)
  }, [notice])

  function changeChapter(next: number) {
    if (next === index) return
    const nextChapter = city.chapters[next]
    if (!nextChapter) return
    const keep = pin && placesInChapter(city, nextChapter.year).some((place) => place.id === selectedId)
    if (!keep) { setSelectedId(null); setPin(false) }
    setIndex(next)
    setDestination(null)
    setFilter('')
    setTourStep(null)
    setView(null)
    setStatus('loading')
    setError('')
    setCameraMode('orbit')
  }
  function focusPlace(id: string, fromTour = false) {
    if (!places.some((place) => place.id === id)) { setNotice('That place is not available in this chapter.'); return }
    setSelectedId(id)
    setDestination(null)
    setMapOpen(false)
    setPanelOpen(false)
    if (!fromTour) setTourStep(null)
    scene.current?.focus(id)
  }
  function navigate(coordinates: Coordinates, label = 'Your chosen location', zoom?: number) {
    if (!validCoordinates(coordinates) || !insideBounds(coordinates, geographic ? city.mapBounds : city.historicalBounds)) {
      setNotice(geographic ? 'Choose a location inside this metropolitan viewing area, or use the city picker.' : 'That point is outside the historical diorama. Use the modern map for wider exploration.')
      return
    }
    setSelectedId(null)
    setPin(false)
    setTourStep(null)
    setDestination(coordinates)
    setDestinationZoom(zoom)
    setDestinationName(label)
    setMapOpen(false)
    setPanelOpen(false)
    scene.current?.locate(coordinates, zoom)
  }
  function tour(next: number) {
    if (!places[next]) { setTourStep(null); return }
    setTourStep(next)
    focusPlace(places[next].id, true)
  }
  function switchMap(value: boolean) {
    if (value && location.protocol === 'file:') { setNotice('Open the hosted site to use streaming geographic maps.'); return }
    setPreferMap(value)
    setDestination(null)
    setView(null)
    setStatus('loading')
    setError('')
  }
  async function copyView() {
    try {
      await navigator.clipboard.writeText(location.href)
      setNotice('Link copied with this city, chapter and destination.')
    } catch {
      setNotice('Clipboard unavailable. Copy the address-bar URL to share this view.')
    }
  }
  const sceneProps: CitySceneProps = {
    city, chapter, selectedId: selected?.id ?? null, destination, destinationZoom, cameraMode, timeOfDay: lighting,
    showLabels: labels, onSelect: focusPlace, onNavigate: navigate, onStatus: setStatus, onError: setError, onViewChange: setView,
  }
  const miniMap = (expanded = false) => geographic
    ? <GeographicOverview region={region} year={chapter.year} satellite={null} landmarks={places} selectedId={selectedId}
      destination={destination} view={view} onSelect={focusPlace} onNavigate={navigate} expanded={expanded} />
    : <WorldMiniMap city={city} year={chapter.year} selectedId={selectedId} destination={destination} onSelect={focusPlace} onNavigate={navigate} large={expanded} />

  return <div className={`atlas-app world-atlas${geographic ? ' geographic-mode' : ''}`} data-world-city={city.id}>
    <a href="#chapter-panel" className="skip-link">Skip to accessible historical guide</a>
    <header className="masthead">
      <a className="brand" href={cityLink(city.id)}><span className="world-brand-mark" aria-hidden="true">◎</span><span><strong>{city.name.toUpperCase()}</strong><small>THE TIME ATLAS</small></span></a>
      <CityPicker selected={city.id} />
      <div className="masthead-actions">
        <button className="quiet-button" onClick={() => setSourcesOpen(true)} aria-label="Research and sources">↗<span>Research &amp; sources</span></button>
        <button className="icon-button" onClick={copyView} aria-label="Copy link to this view">⤴</button>
      </div>
    </header>
    <main className="atlas-main">
      <div className="world-viewport" aria-label={`Interactive ${city.name} city scene`}>
        {geographic ? <WorldMap key={`${city.id}-${reload}`} ref={scene} {...sceneProps} /> : <WorldHistoricalScene key={`${city.id}-${reload}`} ref={scene} {...sceneProps} />}
      </div>
      {status === 'loading' && !error && <div className="scene-message" role="status"><span className="loading-orbit" />{geographic ? 'Loading current geographic data...' : 'Assembling the historical diorama...'}</div>}
      {error && <div className="world-scene-error" role="alert"><strong>{geographic ? 'Map unavailable' : '3D scene unavailable'}</strong><p>{error}</p>
        <button className="quiet-button" onClick={() => { setError(''); setStatus('loading'); setReload((value) => value + 1) }}>Retry</button>
        {geographic && <button className="quiet-button" onClick={() => switchMap(false)}>Use illustrated reconstruction</button>}
        <p>The chapter, evidence and place directory remain available.</p>
      </div>}
      <div className="map-caption"><span className="live-dot" />{geographic ? 'CURRENT GEOGRAPHY · NOT A FROZEN 2025 SURVEY' : 'HISTORICAL DIORAMA · INTERPRETIVE, NOT A SURVEY'}</div>
      <button className="mobile-story-button quiet-button" aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>{panelOpen ? 'Close chapter' : 'Read this chapter'}</button>
      <aside className={`chapter-panel${panelOpen ? ' mobile-open' : ''}`} id="chapter-panel" tabIndex={-1} aria-label={`${city.name} chapter guide`}>
        <div className="chapter-tabs">
          {(['story', 'life', 'places'] as const).map((item) => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item === 'story' ? 'The chapter' : item === 'life' ? 'City life' : `Places (${places.length})`}</button>)}
        </div>
        <div className="chapter-scroll">
          <div className="chapter-index"><span>{city.continent} / {city.country}</span><span>CHAPTER {String(index + 1).padStart(2, '0')} / {city.chapters.length}</span></div>
          <div className="year-display">{chapter.year < 0 ? Math.abs(chapter.year).toLocaleString('en-US') : chapter.year}<span>{chapter.year < 0 ? 'BCE' : 'CE'}</span></div>
          <h1>{chapter.title}</h1>
          {tab === 'story' && <>
            <p className="chapter-description">{chapter.description}</p>
            <section className="world-statistics" aria-label={`City statistics for ${yearLabel(chapter.year)}`}>
              <span className="eyebrow">THE CITY IN CONTEXT</span>
              {chapter.stats.map((stat) => <div className="world-stat" key={stat.label}>
                <span>{stat.label}</span><strong>{stat.value}</strong><p>{stat.scope}</p><small>{stat.asOf}</small>
                <a href={city.sources.find((source) => source.id === stat.source)?.url} target="_blank" rel="noreferrer">Source ↗</a>
              </div>)}
              <p className="quiet-note">Reference dates and boundaries differ. These are not a like-for-like population growth series.</p>
            </section>
            <span className="eyebrow">WHAT CHANGED</span>
            <ul className="changes-list">{chapter.changes.map((change, i) => <li key={change}><span>0{i + 1}</span><p>{change}</p></li>)}</ul>
            <button className="primary-button tour-start" onClick={() => tour(0)}>Explore this chapter <span>{places.length} stops →</span></button>
            <p className="quiet-note">Self-guided, at your pace. No audio in this city edition.</p>
          </>}
          {tab === 'life' && <section className="world-life">
            <span className="eyebrow">LIFE BEYOND THE MONUMENTS</span><p className="chapter-description">{chapter.life}</p>
            <div className="world-learning-prompt"><span className="eyebrow">LOOK CLOSER</span><p>Which places connect power, trade and everyday life in this chapter? Keep one place selected and move forward in time. What survives, and what disappears?</p></div>
            <p className="quiet-note">Historical synthesis, not an eyewitness quotation. Follow the chapter sources to explore further.</p>
          </section>}
          {tab === 'places' && <>
            <label className="search-label" htmlFor="world-place-filter">Find a place in {yearLabel(chapter.year)}</label>
            <input className="search-input" id="world-place-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search the historical collection" />
            <div className="places-list">{places.filter((place) => place.name.toLowerCase().includes(filter.toLowerCase())).map((place) =>
              <button key={place.id} className={`place-row${selectedId === place.id ? ' active' : ''}`} onClick={() => focusPlace(place.id)}><span className="place-dot">◇</span><span><strong>{place.name}</strong><small>{place.dateLabel}</small></span></button>)}
              {!places.some((place) => place.name.toLowerCase().includes(filter.toLowerCase())) && <p className="empty-note">No chapter landmark matches. Use the modern map to search the wider city.</p>}
            </div>
          </>}
          <button className="text-button source-inline" onClick={() => setSourcesOpen(true)}>Read the chapter sources ↗</button>
        </div>
        <footer className="chapter-foot"><span className="interpretive-dot" />Original miniatures. Documented history. Clear caveats.</footer>
      </aside>
      <div className="scene-toolbar">
        {modern && <button className="quiet-button world-layer-toggle" aria-pressed={geographic} onClick={() => switchMap(!geographic)}>{geographic ? 'Illustrated atlas' : 'Current real map'}</button>}
        <button className="quiet-button" aria-pressed={cameraMode === 'walk'} onClick={() => setCameraMode(cameraMode === 'walk' ? 'orbit' : 'walk')}>{cameraMode === 'walk' ? 'Aerial view' : 'Close-up'}</button>
      </div>
      {selected && <aside className="field-note-panel" aria-label={`${selected.name} field notes`}>
        <article className="landmark-card">
          <div className="card-topline"><span className="eyebrow">FIELD NOTE / {selected.model}</span><button className="icon-button" aria-label="Close field note" onClick={() => { setSelectedId(null); setPin(false); setTourStep(null) }}>×</button></div>
          <p className="landmark-date">{selected.dateLabel}</p><h2>{selected.name}</h2>
          <p className="field-copy">{selected.description}</p>
          <button className="quiet-button time-pin" aria-pressed={pin} onClick={() => setPin(!pin)}>{pin ? 'Following this place through time' : 'Keep this place as time changes'}</button>
          <details className="evidence-note"><summary>Reconstruction note</summary><p>{selected.caveat}</p><p>Geographic anchor; the miniature is symbolic and exaggerated for legibility, not an exact model of the building in every era.</p></details>
          <button className="text-button" onClick={() => setSourcesOpen(true)}>Read the source record ↗</button>
        </article>
      </aside>}
      {destination && !selected && <div className="world-destination"><span className="eyebrow">YOUR DESTINATION</span><strong>{destinationName}</strong><small>{destination[1].toFixed(5)}, {destination[0].toFixed(5)}</small><button className="text-button" onClick={() => setDestination(null)}>Clear destination</button></div>}
      <div className="map-tools">
        <div className="lighting-control">{(['day', 'golden', 'night'] as const).map((value) => <button key={value} aria-pressed={lighting === value} onClick={() => setLighting(value)}>{value === 'day' ? 'Daylight' : value === 'golden' ? 'Golden hour' : 'After dark'}</button>)}</div>
        <div className="navigation-row">
          <div className="camera-buttons">
            <button aria-label="Zoom in" disabled={status !== 'ready'} onClick={() => scene.current?.zoom('in')}>+</button>
            <button aria-label="Zoom out" disabled={status !== 'ready'} onClick={() => scene.current?.zoom('out')}>−</button>
            <button aria-label="Reset aerial view" onClick={() => { setCameraMode('orbit'); setSelectedId(null); setDestination(null); scene.current?.home() }}>⌂</button>
          </div>
          <div className="mini-map-card">
            <button className="world-expand-map" onClick={() => setMapOpen(true)} aria-label={`Expand city map of ${city.name}`}>EXPLORE THE WHOLE CITY ↗</button>
            {miniMap()}
            <span className="mini-caption">{geographic ? 'METROPOLITAN VIEW · CLICK ANY POINT' : 'ORIENTATION ONLY · NOT HISTORICAL SHORELINES'}</span>
          </div>
        </div>
      </div>
      <div className="world-scene-controls"><button className="quiet-button" aria-pressed={labels} onClick={() => setLabels(!labels)}>Labels {labels ? 'on' : 'off'}</button><span>Drag to orbit · scroll to zoom · WASD / arrows to move</span></div>
      {cameraMode === 'walk' && <div className="world-walk-controls">{(['left', 'forward', 'backward', 'right'] as const).map((direction) => <button className="icon-button" key={direction} aria-label={`Move ${direction}`} onClick={() => scene.current?.move(direction)}>{direction === 'left' ? '←' : direction === 'right' ? '→' : direction === 'forward' ? '↑' : '↓'}</button>)}</div>}
      {tourStep !== null && <div className="world-tour-bar" aria-label="Self-guided chapter tour"><span>{tourStep + 1} / {places.length} · {selected?.name}</span><button className="quiet-button" onClick={() => tour(tourStep + 1)}>{tourStep + 1 < places.length ? 'Next place →' : 'Finish chapter'}</button><button className="icon-button" aria-label="Close tour" onClick={() => setTourStep(null)}>×</button></div>}
    </main>
    <footer className="timeline">
      <div className="timeline-heading"><span className="eyebrow">{city.name} THROUGH TIME</span><span>{city.tagline}</span><div className="timeline-arrows"><button aria-label="Previous chapter" disabled={index === 0} onClick={() => changeChapter(index - 1)}>←</button><button aria-label="Next chapter" disabled={index === city.chapters.length - 1} onClick={() => changeChapter(index + 1)}>→</button></div></div>
      <div className="era-track" ref={timeline} style={{ gridTemplateColumns: `repeat(${city.chapters.length}, minmax(88px, 1fr))` }}>
        {city.chapters.map((era, i) => <button key={era.year} className={`era-stop${index === i ? ' active' : ''}`} aria-label={`${yearLabel(era.year)}: ${era.label}`} aria-pressed={index === i} onClick={() => changeChapter(i)}>
          <span className="era-track-line" /><span className="era-dot" /><strong>{yearLabel(era.year)}</strong><small>{era.label}</small>
        </button>)}
      </div>
    </footer>
    {notice && <div className="notification" role="status">{notice}</div>}
    <dialog className="research-dialog" ref={sourcesDialog} aria-labelledby="world-research-title" onClose={() => setSourcesOpen(false)}>
      <div className="research-header"><span className="eyebrow">A TIME MACHINE WITH FOOTNOTES</span><button className="icon-button" aria-label="Close sources" onClick={() => setSourcesOpen(false)}>×</button></div>
      <h2 id="world-research-title">{city.name}: the evidence behind the scene.</h2>
      <p>{city.reconstructionNote}</p>
      <p>Historical scenes contain symbolic miniatures and procedurally interpreted neighbourhoods, not surveyed historical buildings or streets. Water shapes are orientation guides, not reconstructed shorelines. Modern maps stream current OpenStreetMap / OpenFreeMap data and non-dated Mapterhorn terrain. Some heights use a disclosed 6 m fallback; none of this is a frozen 2025 survey.</p>
      <h3>This chapter and selected place</h3>
      <ul className="source-list">{city.sources.filter((source) => relevantSources.has(source.id)).map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span>↗</span></a><small>{source.publisher}</small></li>)}</ul>
      <details><summary>All {city.name} sources</summary><ul className="source-list">{city.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span>↗</span></a><small>{source.publisher}</small></li>)}</ul></details>
    </dialog>
    <dialog className="city-map-dialog" ref={mapDialog} aria-labelledby="world-map-title" onClose={() => setMapOpen(false)}>
      <div className="city-map-header"><div><span className="eyebrow">{city.name.toUpperCase()}</span><h2 id="world-map-title">Explore the whole city</h2></div><button className="icon-button" aria-label="Close city map" onClick={() => setMapOpen(false)}>×</button></div>
      {mapOpen && <CityNavigator key={`${city.id}-${chapter.year}-${geographic}`} year={chapter.year} city={directory} geographic={geographic} onNavigate={navigate} onLandmark={focusPlace} map={miniMap(true)} />}
    </dialog>
  </div>
}

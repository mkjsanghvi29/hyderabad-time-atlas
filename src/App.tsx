import { useEffect, useRef, useState } from 'react'
import AtlasScene from './AtlasScene'
import Minimap from './Minimap'
import { ERAS, LANDMARKS, SOURCES } from './data'
import { monumentAppearance } from './monumentHistory'
import CityLifePanel from './CityLifePanel'
import { CITY_LIFE } from './life'
import { CITY_DISTRICTS, districtsInEra } from './city'
import ExpeditionPanel from './ExpeditionPanel'
import CityStats from './CityStats'
import GeographicScene from './GeographicScene'
import GeographicOverview from './GeographicOverview'
import CityNavigator from './CityNavigator'
import { MAP_REFERENCES, SATELLITE_SCENES } from './mapEvidence'
import { cityViewsFromUrl, coordinatesFromUrl, insideReconstruction, validCoordinates, zoomFromUrl } from './navigation'
import type { GeographicLayer } from './mapTypes'
import { cityStatistics } from './cityStatistics'
import { EXPEDITIONS, goalsForVisit, loadExpeditions, saveExpeditions } from './expeditions'
import type { AtlasSceneHandle, CameraMode, Coordinates, Landmark, MapView, SceneStatus, TimeOfDay } from './types'

function initialEraIndex() {
  const year = Number(new URLSearchParams(location.search).get('year'))
  const index = ERAS.findIndex((era) => era.year === year)
  return index < 0 ? 1 : index
}

function Icon({ name }: { name: 'compass' | 'home' | 'layers' | 'book' | 'arrow' | 'walk' | 'orbit' | 'close' | 'play' }) {
  const paths = {
    compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM16 8l-3 5-5 3 3-5 5-3Z',
    home: 'm3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10',
    layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
    book: 'M12 5v16M12 5C8 2 3 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-1-1-6-2-10 1Z',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    walk: 'M13 6h.01M13 9l-3 5 4 3 1 5M10 14l-4 7M13 9l2 4 5 2M8 11l-3 4M13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    orbit: 'M20 4c4 4-3 14-10 16S1 17 4 11 16 0 20 4ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    close: 'm6 6 12 12M18 6 6 18',
    play: 'm8 4 12 8-12 8V4Z',
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export default function App() {
  const [eraIndex, setEraIndex] = useState(initialEraIndex)
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(location.search).get('place'))
  const [pinPlace, setPinPlace] = useState(false)
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('golden')
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [showLabels, setShowLabels] = useState(true)
  const [showCity, setShowCity] = useState(true)
  const [showRoads, setShowRoads] = useState(true)
  const [tab, setTab] = useState<'story' | 'life' | 'places' | 'challenges'>('story')
  const [search, setSearch] = useState('')
  const [layersOpen, setLayersOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [visited, setVisited] = useState<Set<string>>(() => new Set())
  const [exploredDistricts, setExploredDistricts] = useState<Set<string>>(() => new Set())
  const [activeDistrictId, setActiveDistrictId] = useState<string | null>(null)
  const [noteCollapsed, setNoteCollapsed] = useState(false)
  const [savedExpedition] = useState(loadExpeditions)
  const [completedGoals, setCompletedGoals] = useState(savedExpedition.completed)
  const [progressWarning, setProgressWarning] = useState(savedExpedition.warning)
  const [expeditionStarted, setExpeditionStarted] = useState(false)
  const [geographicViews, setGeographicViews] = useState(() => cityViewsFromUrl(location.search, location.protocol))
  const [geographicLayer, setGeographicLayer] = useState<GeographicLayer>(() => new URLSearchParams(location.search).get('layer') === 'satellite' ? 'satellite' : 'streets')
  const [destination, setDestination] = useState<Coordinates | null>(() => coordinatesFromUrl(location.search))
  const [destinationLabel, setDestinationLabel] = useState('Your chosen location')
  const [destinationZoom, setDestinationZoom] = useState(() => zoomFromUrl(location.search))
  const [mapView, setMapView] = useState<MapView | null>(null)
  const [cityMapOpen, setCityMapOpen] = useState(false)
  const [mapError, setMapError] = useState('')
  const [mapReload, setMapReload] = useState(0)
  const progressSignature = useRef([...savedExpedition.completed].sort().join(','))
  const scene = useRef<AtlasSceneHandle>(null)
  const sourcesDialog = useRef<HTMLDialogElement>(null)
  const cityMapDialog = useRef<HTMLDialogElement>(null)
  const era = ERAS[eraIndex]
  const modern = era.year >= 1998
  const preferGeographic = geographicViews.modern
  const geographic = modern && (era.year === 1998 ? geographicViews.historical : preferGeographic)
  const satellite = SATELLITE_SCENES[era.year] ?? null
  const activeLayer: GeographicLayer = era.year === 1998 ? 'satellite' : geographicLayer
  const satelliteMap = geographic && activeLayer === 'satellite'
  const life = CITY_LIFE[eraIndex]
  const expedition = EXPEDITIONS[eraIndex]
  const chapterDiscoveries = expedition.goals.filter((goal) => completedGoals.has(goal.id)).length
  const nextDiscovery = expedition.goals.find((goal) => !completedGoals.has(goal.id))
  const districts = districtsInEra(era.year)
  const activeDistrict = CITY_DISTRICTS.find((district) => district.id === activeDistrictId)
  const available = LANDMARKS.filter((item) => item.visibleFrom <= era.year)
  const selected = available.find((item) => item.id === selectedId) ?? null
  const visiblePlaces = available.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  const stats = cityStatistics(era.year)
  const currentSources = selected ? [...selected.sources, ...monumentAppearance(selected.id, era.year).sources] : tab === 'life' ? life.sources : [...era.sources, ...stats.signature.sources, ...(stats.population ? [stats.population.source] : [])]
  const tour = era.tour.filter((id) => available.some((item) => item.id === id))

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('year', String(era.year))
    if (selected) url.searchParams.set('place', selected.id)
    else url.searchParams.delete('place')
    if (destination && !selected) {
      url.searchParams.set('lon', destination[0].toFixed(6))
      url.searchParams.set('lat', destination[1].toFixed(6))
      if (destinationZoom !== undefined) url.searchParams.set('zoom', String(destinationZoom))
      else url.searchParams.delete('zoom')
    } else {
      url.searchParams.delete('lon')
      url.searchParams.delete('lat')
      url.searchParams.delete('zoom')
    }
    if (modern ? !geographic : !preferGeographic) url.searchParams.set('view', 'atlas')
    else url.searchParams.delete('view')
    if (modern && geographic && activeLayer === 'satellite') url.searchParams.set('layer', 'satellite')
    else url.searchParams.delete('layer')
    if (location.protocol !== 'file:') history.replaceState({}, '', url)
    document.title = `Hyderabad ${era.year} · Through Time`
  }, [era.year, selected, destination, destinationZoom, preferGeographic, modern, geographic, activeLayer])

  useEffect(() => {
    if (sourcesOpen) sourcesDialog.current?.showModal()
    else sourcesDialog.current?.close()
  }, [sourcesOpen])

  useEffect(() => {
    if (cityMapOpen && !cityMapDialog.current?.open) cityMapDialog.current?.showModal()
    else if (!cityMapOpen) cityMapDialog.current?.close()
  }, [cityMapOpen])

  useEffect(() => {
    if (sceneStatus !== 'ready' || !destination) return
    if (!geographic && !insideReconstruction(destination)) {
      setNotice('This link points beyond the illustrated area. Use the 2025 geographic map to reach it.')
      setDestination(null)
      return
    }
    scene.current?.locate(destination, destinationZoom)
  }, [sceneStatus, destination, destinationZoom, geographic])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 6500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    const signature = [...completedGoals].sort().join(',')
    if (signature === progressSignature.current) return
    progressSignature.current = signature
    setProgressWarning(saveExpeditions(completedGoals))
  }, [completedGoals])

  useEffect(() => {
    function escapeImmersive(event: KeyboardEvent) {
      if (event.key === 'Escape') setImmersive(false)
    }
    window.addEventListener('keydown', escapeImmersive)
    return () => window.removeEventListener('keydown', escapeImmersive)
  }, [])

  function changeEra(index: number) {
    setEraIndex(index)
    if (ERAS[index].year === 1998 && geographicViews.historical) setCameraMode('orbit')
    const keepPlace = pinPlace && selected && selected.visibleFrom <= ERAS[index].year
    if (!keepPlace) {
      setSelectedId(null)
      setPinPlace(false)
    }
    setTourIndex(null)
    setSearch('')
    setActiveDistrictId(null)
    setMapView(null)
    setMapError('')
    setDestination(null)
    setGeographicLayer('streets')
    setNotice(`Chapter ${index + 1} · ${ERAS[index].year} · ${ERAS[index].label}`)
  }

  function focusPlace(id: string, fromTour = false) {
    if (!fromTour) setTourIndex(null)
    setSelectedId(id)
    setDestination(null)
    setNoteCollapsed(false)
    setVisited((old) => new Set(old).add(`${era.year}:${id}`))
    completeGoals(goalsForVisit(era.year, 'landmark', id))
    scene.current?.focus(id)
    setMobilePanel(false)
    setCityMapOpen(false)
  }

  function recordDistrict(id: string) {
    setActiveDistrictId(id)
    setExploredDistricts((old) => old.has(`${era.year}:${id}`) ? old : new Set(old).add(`${era.year}:${id}`))
    completeGoals(goalsForVisit(era.year, 'district', id))
  }

  function completeGoals(ids: string[]) {
    setCompletedGoals((old) => ids.every((id) => old.has(id)) ? old : new Set([...old, ...ids]))
  }

  function openExpedition() {
    setExpeditionStarted(true)
    setTab('challenges')
    setMobilePanel(true)
  }

  function continueExpedition() {
    if (!nextDiscovery || nextDiscovery.kind === 'quiz') openExpedition()
    else if (nextDiscovery.kind === 'landmark') focusPlace(nextDiscovery.target)
    else visitDistrict(nextDiscovery.target)
  }

  function visitDistrict(id: string) {
    setSelectedId(null)
    setDestination(null)
    setPinPlace(false)
    setTourIndex(null)
    setCameraMode(satelliteMap ? 'orbit' : 'walk')
    recordDistrict(id)
    setMobilePanel(false)
    scene.current?.travel(id)
  }

  function navigateAnywhere(coordinates: Coordinates, label = 'Your chosen location', zoom?: number) {
    if (!validCoordinates(coordinates)) {
      setNotice('Enter a valid latitude and longitude.')
      return
    }
    if (!geographic && !insideReconstruction(coordinates)) {
      setNotice('This point is outside the illustrated reconstruction. Choose the 2025 geographic map to explore the wider city.')
      return
    }
    setSelectedId(null)
    setPinPlace(false)
    setTourIndex(null)
    setActiveDistrictId(null)
    setDestination(coordinates)
    setDestinationZoom(zoom)
    if (zoom !== undefined) setCameraMode('orbit')
    setDestinationLabel(label)
    setCityMapOpen(false)
    setMobilePanel(false)
    scene.current?.locate(coordinates, zoom)
  }

  function switchGeography(enabled: boolean) {
    setGeographicViews((current) => ({ ...current, [era.year === 1998 ? 'historical' : 'modern']: enabled }))
    if (enabled && activeLayer === 'satellite') setCameraMode('orbit')
    setMapError('')
    setMapView(null)
    setSceneStatus('loading')
    if (!enabled && destination && !insideReconstruction(destination)) {
      setDestination(null)
      setNotice('Returned to the smaller, illustrated reconstruction.')
    }

  }

  function chooseGeographicLayer(layer: GeographicLayer) {
    setGeographicLayer(layer)
    setMapError('')
    if (layer === 'satellite') setCameraMode('orbit')
  }

  function resetView(region = false) {
    setCameraMode('orbit')
    setSelectedId(null)
    setDestination(null)
    setPinPlace(false)
    setTourIndex(null)
    if (region) scene.current?.region()
    else scene.current?.home()
  }

  function overview(expanded = false) {
    return geographic ? <GeographicOverview key={`overview-${mapReload}`} year={era.year} landmarks={LANDMARKS} selectedId={selectedId}
      destination={destination} view={mapView} satellite={satellite} onSelect={focusPlace}
      onNavigate={navigateAnywhere} expanded={expanded} onError={setMapError} />
      : <Minimap large={expanded} landmarks={LANDMARKS} selectedId={selectedId} year={era.year}
        destination={destination} onSelect={focusPlace} onNavigate={navigateAnywhere} />
  }

  function tourStep(index: number) {
    if (!tour[index]) return
    setTourIndex(index)
    focusPlace(tour[index], true)
  }

  async function copyView() {
    if (location.protocol === 'file:') {
      setNotice('This is the offline edition. Share the HTML file, or use a hosted URL to link to a specific era.')
      return
    }
    try {
      await navigator.clipboard.writeText(location.href)
      setNotice('Link copied. It opens this era and landmark.')
    } catch {
      setNotice('Clipboard unavailable. Copy the URL from your address bar to share this era.')
    }
  }

  function landmarkCard(item: Landmark) {
    const appearance = monumentAppearance(item.id, era.year)
    return (
      <article className={`landmark-card ${noteCollapsed ? 'collapsed' : ''}`} aria-label={`${item.name} field notes`}>
        <div className="card-topline"><span className="eyebrow">{noteCollapsed ? item.name : `FIELD NOTE / ${item.category}`}</span><button className="icon-button collapse-note" aria-label={noteCollapsed ? 'Expand field note' : 'Minimize field note'} onClick={() => setNoteCollapsed(!noteCollapsed)}>{noteCollapsed ? '+' : '−'}</button><button className="icon-button" aria-label="Close field note" onClick={() => { setSelectedId(null); setPinPlace(false); setTourIndex(null) }}><Icon name="close" /></button></div>
        <div className="field-note-content" hidden={noteCollapsed}>
        <div className="landmark-glyph" aria-hidden="true"><ArchitecturalMark /></div>
        <p className="landmark-date">{item.dateLabel}</p>
        <h2>{item.name}</h2>
        <p className="landmark-subtitle">{item.subtitle}</p>
        <p className="field-copy">{item.description}</p>
        <div className="monument-time-note"><span className="eyebrow">THIS PLACE IN {era.year}</span><h3>{appearance.title}</h3><p>{appearance.detail}</p></div>
        <button className="quiet-button time-pin" aria-pressed={pinPlace} onClick={() => setPinPlace(!pinPlace)}>{pinPlace ? 'Following this place through time' : 'Keep this place as time changes'}</button>
        <div className="coordinates">{item.coordinates[1].toFixed(4)}° N &nbsp; {item.coordinates[0].toFixed(4)}° E</div>
        <details className="evidence-note"><summary>Reconstruction note</summary><p>{item.caveat}</p><p>{geographic ? 'The marker is an approximate geographic anchor. Mapped footprints are not a detailed architectural model; heights may be estimated.' : 'Map position is approximate. All 3D models are original interpretive miniatures, with exaggerated height and detail for legibility.'}</p></details>
        <button className="text-button" onClick={() => setSourcesOpen(true)}>Read the source record <Icon name="arrow" /></button>
        </div>
      </article>
    )
  }

  return (
    <div className={`atlas-app ${immersive ? 'immersive' : ''} ${geographic ? 'geographic-mode' : ''}`}>
      <a href="#chapter-panel" className="skip-link">Skip to accessible historical guide</a>
      <header className="masthead">
        <a className="brand" href={location.pathname} aria-label="Hyderabad Time Atlas home">
          <span className="brand-emblem"><ArchitecturalMark /></span>
          <span><strong>HYDERABAD</strong><small>THE TIME ATLAS</small></span>
        </a>
        <span className="masthead-description">One city. Five centuries. Countless stories.</span>
        <div className="masthead-actions">
          <span className="edition-tag">EXPLORER EDITION <b>01</b></span>
          <button className="quiet-button immersive-toggle" onClick={() => setImmersive(true)}><Icon name="compass" />Immersive view</button>
          <button className="quiet-button" onClick={() => setSourcesOpen(true)}><Icon name="book" /><span>Research &amp; sources</span></button>
          <button className="icon-button" title="Share this view" aria-label="Copy link to this view" onClick={copyView}><Icon name="arrow" /></button>
        </div>
      </header>

      <main className="atlas-main">
        {immersive && <button className="exit-immersive quiet-button" onClick={() => setImmersive(false)}><Icon name="close" />Return to the atlas<span>ESC</span></button>}
        <div className="world-viewport" aria-label="Interactive Hyderabad city scene">
          {geographic ? <GeographicScene key={`geographic-${mapReload}`} ref={scene} era={era} landmarks={LANDMARKS} selectedId={selected?.id ?? null}
            timeOfDay={timeOfDay} cameraMode={cameraMode} showCity={showCity} showLabels={showLabels}
            showRoads={showRoads} onSelect={focusPlace} onStatus={setSceneStatus} onDistrictChange={recordDistrict}
            onViewChange={setMapView} layer={activeLayer} satellite={satellite} destination={destination} destinationZoom={destinationZoom}
            onNavigate={navigateAnywhere} onError={setMapError} />
            : <AtlasScene ref={scene} era={era} landmarks={LANDMARKS} selectedId={selected?.id ?? null}
            timeOfDay={timeOfDay} cameraMode={cameraMode} showCity={showCity} showLabels={showLabels}
            showRoads={showRoads} onSelect={focusPlace} onStatus={setSceneStatus} onDistrictChange={recordDistrict} />}
          {sceneStatus === 'loading' && !mapError && <div className="scene-message" role="status"><span className="loading-orbit" />{geographic ? 'Loading geographic map data…' : 'Assembling the Deccan landscape…'}</div>}
          {sceneStatus === 'unavailable' && !geographic && <div className="scene-fallback"><span className="eyebrow">MAP MODE</span><h2>A different way to explore.</h2><p>3D rendering is unavailable in this browser. The timeline, landmark map, and source-linked history remain fully accessible.</p><Minimap large landmarks={LANDMARKS} year={era.year} selectedId={selectedId} onSelect={focusPlace} onNavigate={navigateAnywhere} /></div>}
          {geographic && mapError && <div className="map-error-panel" role="alert"><strong>Map data could not be loaded.</strong><p>{mapError}</p><button className="quiet-button" onClick={() => { setMapError(''); setMapReload((old) => old + 1) }}>Retry map</button><button className="quiet-button" onClick={() => switchGeography(false)}>Use illustrated reconstruction</button></div>}
        </div>

        <div className="map-caption"><span className="live-dot" />{geographic ? activeLayer === 'streets' ? 'LATEST MAPPED CITY · LIVE DATA' : `${satellite?.date ?? era.year} · SATELLITE RECORD` : sceneStatus === 'unavailable' ? '2D FIELD GUIDE' : 'INTERPRETIVE 3D ATLAS'}<span>{mapView ? `${mapView.center[1].toFixed(3)}° N / ${mapView.center[0].toFixed(3)}° E` : '17.4° N / 78.5° E'}</span></div>

        <button className="mobile-story-button quiet-button" onClick={() => setMobilePanel(!mobilePanel)} aria-expanded={mobilePanel}><Icon name="book" />{mobilePanel ? 'Close chapter' : `${era.year} · Read this chapter`}</button>
        <aside id="chapter-panel" className={`chapter-panel ${mobilePanel ? 'mobile-open' : ''}`} tabIndex={-1}>
          <div className="chapter-tabs" aria-label="Historical guide">
            <button aria-pressed={tab === 'story'} onClick={() => setTab('story')}>The chapter</button>
            <button aria-pressed={tab === 'life'} onClick={() => setTab('life')}>City life</button>
            <button aria-pressed={tab === 'places'} onClick={() => setTab('places')}>Explore places <span>{available.length}</span></button>
            <button aria-pressed={tab === 'challenges'} onClick={openExpedition}>Challenges <span>{chapterDiscoveries}/3</span></button>
          </div>
          <div className="chapter-scroll">
            <div className="chapter-index"><span>CHAPTER {String(eraIndex + 1).padStart(2, '0')} / 08</span><span>{era.chapter}</span></div>
            <div className="year-display">{era.year}<span>CE</span></div>
            {modern && <div className="geographic-options">
              <div className="geography-switch" aria-label="City rendering">
                <button className="quiet-button" aria-pressed={geographic} onClick={() => switchGeography(true)}>{era.year === 1998 ? '1998 satellite reference' : 'Geographic city'}</button>
                <button className="quiet-button" aria-pressed={!geographic} onClick={() => switchGeography(false)}>Illustrated atlas</button>
              </div>
              <p className="geography-note">{geographic ? activeLayer === 'streets' ? 'Latest mapped streets and building footprints, with terrain. Not every building is mapped; heights may be estimated. Navigate to any point, not only the pins.' : `${satellite?.date ?? era.year} satellite observation${satellite ? ` · ${satellite.resolution}` : ''}. ${era.year === 1998 ? 'No modern streets or later airport are projected into this historical image.' : 'A dated city-growth reference, not today’s street map.'}` : 'Original procedural reconstruction. Buildings and streets are illustrative, not a surveyed city map.'}</p>
              {satelliteMap && <p className="geography-note">Top-down city-growth reference only. Zoom is limited to avoid enlarging 30 m pixels into a false street view. Choose Illustrated atlas for 3D exploration.</p>}
              {geographic && activeLayer === 'satellite' && <p className="geography-note">{era.year === 1998 ? 'This June observation predates Cyber Towers’ November opening. Markers locate sites; they do not prove a finished building existed in the image.' : 'February 2025 imagery and June 1998 imagery are different seasons. Zooming in enlarges pixels; it cannot reveal finer buildings.'}</p>}
              <button className="quiet-button street-start" onClick={() => setCityMapOpen(true)}><Icon name="compass" />Search or choose any location</button>
            </div>}
            {tab === 'story' ? <>
              <h1>{era.title}</h1>
              <p className="chapter-description">{era.description}</p>
              <button className="expedition-entry" onClick={openExpedition}><span aria-hidden="true">◇</span><span><strong>{chapterDiscoveries === 3 ? 'Chapter badge earned' : 'Start an era expedition'}</strong><small>{chapterDiscoveries} of 3 discoveries · scout and learn</small></span><span aria-hidden="true">→</span></button>
              <button className="text-button source-inline" onClick={() => setTab('life')}>Stories and surprising details from this era <Icon name="arrow" /></button>
              <CityStats year={era.year} />
              <div className="chapter-rule" />
              <span className="eyebrow">THE CITY IS CHANGING</span>
              <ul className="changes-list">{era.changes.map((change, i) => <li key={change}><span>{String(i + 1).padStart(2, '0')}</span><p>{change}</p></li>)}</ul>
              <button className="primary-button tour-start" onClick={() => tourStep(0)} disabled={!tour.length}><Icon name="play" />Explore this chapter<span>{tour.length} stops</span></button>
              <button className="quiet-button street-start" onClick={() => visitDistrict(era.year < 1591 ? 'golconda-town' : 'old-city')}><Icon name="walk" />{satelliteMap ? 'View the neighbourhood on the map' : 'Walk the neighbourhood'}</button>
              <button className="text-button source-inline" onClick={() => setSourcesOpen(true)}>History, not guesswork <Icon name="arrow" /></button>
            </> : tab === 'life' ? <CityLifePanel story={life} districts={districts} explored={exploredDistricts} onVisit={visitDistrict} onLandmark={focusPlace} onSources={() => setSourcesOpen(true)} />
              : tab === 'challenges' ? <ExpeditionPanel expedition={expedition} completed={completedGoals} warning={progressWarning}
                onVisit={(kind, id) => kind === 'landmark' ? focusPlace(id) : visitDistrict(id)} onComplete={(id) => completeGoals([id])} /> : <>
              <h1>A city in detail.</h1>
              <label className="search-label" htmlFor="place-search">{geographic && era.year === 2025 ? 'Filter the atlas history collection' : `Find a place in ${era.year}`}</label>
              <input id="place-search" className="search-input" value={search} placeholder="Palaces, mosques, landmarks…" onChange={(event) => setSearch(event.target.value)} />
              <div className="places-list">
                {visiblePlaces.map((item) => <button className={selectedId === item.id ? 'place-row active' : 'place-row'} key={item.id} onClick={() => focusPlace(item.id)}>
                  <span className="place-dot">{visited.has(`${era.year}:${item.id}`) ? '✓' : '◇'}</span><span><strong>{item.name}</strong><small>{item.dateLabel}</small></span><Icon name="arrow" />
                </button>)}
                {!visiblePlaces.length && <p className="empty-note">{geographic && era.year === 2025 ? <>No atlas story matches. <button className="text-button" onClick={() => setCityMapOpen(true)}>Search the whole city instead →</button></> : 'No places match in this chapter. Try another era or search.'}</p>}
              </div>
              <p className="quiet-note">{LANDMARKS.length - available.length} later landmarks are intentionally absent.</p>
            </>}
          </div>
          <div className="chapter-foot"><span className="evidence-dot" />Sourced events. Interpretive city fabric.</div>
        </aside>

        <div className="scene-toolbar">
          <div className="tool-group" aria-label="Camera navigation">
            <button className={cameraMode === 'orbit' ? 'tool-button active' : 'tool-button'} aria-pressed={cameraMode === 'orbit'} onClick={() => setCameraMode('orbit')}><Icon name="orbit" />{satelliteMap ? 'Map view' : 'Orbit'}</button>
            <button className={cameraMode === 'walk' ? 'tool-button active' : 'tool-button'} aria-pressed={cameraMode === 'walk'} disabled={satelliteMap} title={satelliteMap ? '30 m satellite imagery is an overview, not a street-level view' : undefined} onClick={() => setCameraMode('walk')}><Icon name="walk" />{geographic ? 'Close-up' : 'Street view'}</button>
          </div>
          <button className="tool-button layers-toggle" aria-expanded={layersOpen} onClick={() => setLayersOpen(!layersOpen)}><Icon name="layers" />Layers</button>
          {layersOpen && <div className="layers-panel">
            <span className="eyebrow">DISPLAY LAYERS</span>
            <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />Landmark names</label>
            <label><input type="checkbox" checked={showCity} onChange={(e) => setShowCity(e.target.checked)} disabled={geographic && activeLayer === 'satellite'} />{geographic ? 'Mapped 3D buildings' : 'Interpretive city fabric'}</label>
            <label><input type="checkbox" checked={showRoads} onChange={(e) => setShowRoads(e.target.checked)} disabled={geographic && activeLayer === 'satellite'} />{geographic ? 'Mapped streets' : 'Schematic streets'}</label>
            {geographic && era.year === 2025 && satellite && <div className="geography-switch"><button className="quiet-button" aria-pressed={activeLayer === 'streets'} onClick={() => chooseGeographicLayer('streets')}>Latest street map</button><button className="quiet-button" aria-pressed={activeLayer === 'satellite'} onClick={() => chooseGeographicLayer('satellite')}>2025 satellite</button></div>}
            <p>{geographic ? activeLayer === 'satellite' ? 'Dated Landsat imagery at 30 m native resolution. Zooming does not add detail; street and building overlays are disabled.' : 'OpenStreetMap-derived cartography. Footprint coverage and building heights vary. Close-up is an oblique map, not street-level photography.' : 'No survey data or historical flood boundary is implied.'}</p>
          </div>}
        </div>

        {selected && <div className={`field-note-panel ${noteCollapsed ? 'is-collapsed' : ''}`}>{landmarkCard(selected)}</div>}
        {cameraMode === 'walk' && activeDistrict && !destination && <div className="district-hud"><span className="eyebrow">{era.year} · {geographic ? 'CITY CLOSE-UP' : 'ON THE STREET'}</span><strong>{activeDistrict.name}</strong><span>{geographic ? 'Geographic map · not street-level photography' : 'Reconstructed lanes · drag to look · WASD to move'}</span></div>}
        {destination && !selected && <div className="destination-hud"><span className="eyebrow">EXPLORE ANYWHERE</span><strong>{destinationLabel}</strong><small>{destination[1].toFixed(5)}° N, {destination[0].toFixed(5)}° E</small><button className="text-button" onClick={() => setCityMapOpen(true)}>Choose another location →</button></div>}
        {expeditionStarted && !selected && tourIndex === null && <div className="expedition-hud" aria-label="Expedition tracker">
          <div><span className="eyebrow">{era.year} EXPEDITION · {chapterDiscoveries}/3</span><button className="icon-button" aria-label="Hide expedition tracker" onClick={() => setExpeditionStarted(false)}>×</button></div>
          <button className="expedition-next" onClick={continueExpedition}><span>{nextDiscovery?.title ?? 'Chapter badge earned'}</span><span aria-hidden="true">→</span></button>
        </div>}
        <div className={`map-tools ${selected ? 'with-selection' : ''}`}>
          {(!geographic || activeLayer === 'streets') && <div className="lighting-control" aria-label="Scene lighting">
            {(['day', 'golden', 'night'] as TimeOfDay[]).map((light) => <button key={light} aria-pressed={timeOfDay === light} onClick={() => setTimeOfDay(light)}>{light === 'golden' ? 'Golden hour' : light === 'day' ? 'Daylight' : 'After dark'}</button>)}
          </div>}
          <div className="navigation-row">
            <div className="mini-map-card">{!cityMapOpen && overview()}<button className="quiet-button open-city-map" onClick={() => setCityMapOpen(true)}>Expand city map · go anywhere ↗</button><span className="mini-caption">{geographic ? era.year === 2025 ? 'LATEST STREET REFERENCE · CLICK ANY POINT' : 'DATED SATELLITE MAP · CLICK ANY POINT' : 'ILLUSTRATIVE MAP · CLICK ANY POINT TO TRAVEL'}</span></div>
            <div className="camera-buttons">
              <button aria-label="Reset aerial view" title="Reset aerial view" onClick={() => resetView()}><Icon name="home" /></button>
              <button aria-label="Show metropolitan overview" title="Show metropolitan overview" onClick={() => resetView(true)}><Icon name="compass" /></button>
              <button aria-label="Zoom in" disabled={satelliteMap && !!satellite && !!mapView && mapView.zoom >= Math.min(13, satellite.maxZoom) - .001} title={satelliteMap ? 'Zoom is limited by the satellite image resolution' : undefined} onClick={() => scene.current?.zoom('in')}>+</button>
              <button aria-label="Zoom out" onClick={() => scene.current?.zoom('out')}>−</button>
            </div>
          </div>
        </div>
        {cameraMode === 'walk' && <div className="walk-controls" aria-label="Street navigation">
          <button aria-label="Move forward" onClick={() => scene.current?.move('forward')}>↑</button>
          <button aria-label="Move left" onClick={() => scene.current?.move('left')}>←</button>
          <button aria-label="Move backward" onClick={() => scene.current?.move('backward')}>↓</button>
          <button aria-label="Move right" onClick={() => scene.current?.move('right')}>→</button>
        </div>}
        <div className="navigation-hint">{geographic ? 'DRAG TO PAN · RIGHT-DRAG TO TILT · SCROLL TO ZOOM · CLICK TO TRAVEL' : cameraMode === 'orbit' ? 'DRAG TO ORBIT · RIGHT-DRAG TO PAN · SCROLL TO ZOOM' : 'W A S D TO EXPLORE · DRAG TO LOOK · SHIFT TO MOVE FASTER'}<span>{geographic ? activeLayer === 'satellite' ? '30 m imagery · not street-level photography' : 'Latest mapped footprints are not a complete architectural survey' : cameraMode === 'walk' ? 'Free camera · no collision simulation' : 'Touch: drag and pinch'}</span></div>
        {tourIndex !== null && <div className="tour-bar" aria-label="Chapter tour">
          <div><span className="eyebrow">CHAPTER JOURNEY</span><strong>{tourIndex + 1} / {tour.length} · {selected?.name}</strong></div>
          <button className="icon-button" aria-label="Previous tour stop" disabled={tourIndex === 0} onClick={() => tourStep(tourIndex - 1)}>←</button>
          <button className="primary-button" onClick={() => tourIndex + 1 < tour.length ? tourStep(tourIndex + 1) : (setTourIndex(null), setNotice('Chapter explored. Choose another year to continue.'))}>{tourIndex + 1 < tour.length ? 'Next stop' : 'Finish journey'}<Icon name="arrow" /></button>
          <button className="icon-button" aria-label="Close tour" onClick={() => setTourIndex(null)}><Icon name="close" /></button>
        </div>}
      </main>

      <section className="timeline" aria-label="Historical timeline">
        <div className="timeline-heading"><span className="eyebrow">MOVE THROUGH TIME</span><span>1518 — 2025 <b>/</b> Eight windows into a changing city</span><div className="timeline-arrows"><button aria-label="Previous era" disabled={eraIndex === 0} onClick={() => changeEra(eraIndex - 1)}>←</button><button aria-label="Next era" disabled={eraIndex === ERAS.length - 1} onClick={() => changeEra(eraIndex + 1)}>→</button></div></div>
        <div className="era-track">{ERAS.map((item, index) => <button key={item.year} className={index === eraIndex ? 'era-stop active' : 'era-stop'} onClick={() => changeEra(index)} aria-pressed={eraIndex === index} aria-label={`${item.year}: ${item.label}`}><span className="era-track-line" /><span className="era-dot" /><strong>{item.year}</strong><small>{item.label}</small></button>)}</div>
      </section>

      <div className="notification" role="status">{notice && <><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></>}</div>

      <dialog ref={cityMapDialog} className="city-map-dialog" aria-label="Explore the whole city" onCancel={() => setCityMapOpen(false)} onClose={() => setCityMapOpen(false)}>
        <div className="city-map-dialog-header"><span className="eyebrow">{era.year} · YOUR CITY, NOT JUST A FEW PINS</span><button className="icon-button" aria-label="Close city map" onClick={() => setCityMapOpen(false)}><Icon name="close" /></button></div>
        {cityMapOpen && <CityNavigator key={era.year} year={era.year} geographic={geographic} map={overview(true)} onNavigate={navigateAnywhere} onLandmark={focusPlace} />}
      </dialog>

      <dialog ref={sourcesDialog} className="research-dialog" onCancel={() => setSourcesOpen(false)} onClose={() => setSourcesOpen(false)}>
        <div className="research-header"><span className="eyebrow">THE RECONSTRUCTION LEDGER</span><button className="icon-button" aria-label="Close research" onClick={() => setSourcesOpen(false)}><Icon name="close" /></button></div>
        <h2>A window into history.<br />Not a photograph of the past.</h2>
        <p>This atlas combines source-linked history with an original, procedural 3D interpretation. It is a navigable visual essay, not a surveyed digital twin or a claim of photorealistic reconstruction.</p>
        <h3>Geographic maps and imagery</h3>
        <ul className="source-list">{MAP_REFERENCES.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title}<span>↗</span></a><small>{reference.detail}</small></li>)}
          {satellite && <li><a href={satellite.sourceUrl} target="_blank" rel="noreferrer">Satellite observation: {satellite.date}<span>↗</span></a><small>{satellite.resolution}. One dated observation, not a complete historical building survey.</small></li>}
        </ul>
        <div className="evidence-grid">
          <div><span className="evidence-dot" /><h3>Source-linked</h3><p>Major events and chronology use government, heritage and scholarly sources. Secondary references are labelled; disputed dates remain visible in the field notes.</p></div>
          <div><span className="interpretive-dot" /><h3>Interpretive</h3><p>The illustrated atlas uses invented surrounding buildings, streets and terrain. The geographic mode uses attributed map data, but missing building heights can still be estimated.</p></div>
          <div><span className="unknown-dot" /><h3>Not reconstructed</h3><p>Exact historic shorelines, 1908 flood extent, interiors, vanished street-level detail, or present-day photogrammetry.</p></div>
        </div>
        <h3>For {selected?.name ?? `${era.year} · ${era.label}`}</h3>
        <ul className="source-list">{SOURCES.filter((source) => currentSources.includes(source.id)).map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span>↗</span></a><small>{source.publisher}</small></li>)}</ul>
        <details><summary>Browse the full bibliography ({SOURCES.length} sources)</summary><ul className="source-list">{SOURCES.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<span>↗</span></a><small>{source.publisher}</small></li>)}</ul></details>
        <p className="research-footnote">The offline illustrated atlas covers roughly 48 × 50 km and 25 interpreted neighbourhood zones. The streamed geographic map covers the wider city and is not limited to these zones or pins. Neither viewing envelope is an administrative boundary. Original monument miniatures are interpretation; live vector footprints and elevation have their own credited sources. Research assembled September 2026.</p>
      </dialog>
    </div>
  )
}

function ArchitecturalMark() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M13 53V17m38 36V17M9 18h8M47 18h8M9 53h46M17 53V29h30v24M25 53V42a7 7 0 0 1 14 0v11M21 29v-5h22v5M11 13l2-6 2 6M49 13l2-6 2 6M9 22h8m30 0h8M11 35h4m34 0h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M29 24v-6h6v6" stroke="currentColor" strokeWidth="2" /></svg>
}

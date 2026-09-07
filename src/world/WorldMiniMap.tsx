import type { Coordinates } from '../types'
import { placesInChapter, projectCity, unprojectCity } from './geography'
import type { WorldCity } from './types'

export default function WorldMiniMap({ city, year, selectedId, destination, onSelect, onNavigate, large = false }: {
  city: WorldCity
  year: number
  selectedId: string | null
  destination: Coordinates | null
  onSelect: (id: string) => void
  onNavigate: (coordinates: Coordinates) => void
  large?: boolean
}) {
  const [west, south, east, north] = city.historicalBounds
  const min = projectCity(city, [west, north]), max = projectCity(city, [east, south])
  const scale = Math.min(244 / (max[0] - min[0]), 164 / (max[1] - min[1]))
  const offsetX = (260 - (max[0] - min[0]) * scale) / 2, offsetY = (180 - (max[1] - min[1]) * scale) / 2
  const point = (coordinates: Coordinates) => {
    const [x, z] = projectCity(city, coordinates)
    return [offsetX + (x - min[0]) * scale, offsetY + (z - min[1]) * scale]
  }
  return <div className={`world-mini-map${large ? ' large' : ''}`}>
    <svg viewBox="0 0 260 180" aria-label={`${city.name} historical orientation map`} onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width * 260, y = (event.clientY - rect.top) / rect.height * 180
      onNavigate(unprojectCity(city, [(x - offsetX) / scale + min[0], (y - offsetY) / scale + min[1]]))
    }}>
      <path d="M8 45H252M8 90H252M8 135H252M65 8V172M130 8V172M195 8V172" className="world-map-grid" />
      {city.water.map((water) => <path key={water.name}
        d={`${water.points.map((coordinate, i) => `${i ? 'L' : 'M'}${point(coordinate).join(',')}`).join(' ')}${water.kind === 'area' ? 'Z' : ''}`}
        className={water.kind === 'area' ? 'world-map-water' : 'world-map-river'}
        style={water.kind === 'river' ? { strokeWidth: Math.max(1.5, (water.widthKm ?? .3) * 10 * scale) } : undefined} />)}
      {destination && <circle cx={point(destination)[0]} cy={point(destination)[1]} r="5" className="world-map-destination" />}
      <text x="244" y="16" className="world-map-north">N</text>
    </svg>
    {placesInChapter(city, year).map((place) => {
      const [x, y] = point(place.coordinates)
      return <button key={place.id} className={`map-point${selectedId === place.id ? ' selected' : ''}`}
        style={{ left: `${x / 260 * 100}%`, top: `${y / 180 * 100}%` }}
        title={place.name} aria-label={`Locate ${place.name}`} onClick={() => onSelect(place.id)} />
    })}
  </div>
}

import { HUSSAIN_SAGAR, MAP_BOUNDS, MUSI } from './geography'
import type { Coordinates, Landmark } from './types'
import { useMemo } from 'react'

function point([lon, lat]: Coordinates) {
  return [
    12 + ((lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 196,
    10 + ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 134,
  ]
}

export default function Minimap({ landmarks, selectedId, year, onSelect, large = false }: {
  landmarks: Landmark[]
  selectedId: string | null
  year: number
  onSelect: (id: string) => void
  large?: boolean
}) {
  const markers = useMemo(() => {
    const occupied: Array<{ x: number; y: number }> = []
    return landmarks.filter((item) => item.visibleFrom <= year).map((item) => {
      const [anchorX, anchorY] = point(item.coordinates)
      let x = anchorX, y = anchorY
      for (let attempt = 0; attempt < 240; attempt++) {
        const radius = Math.sqrt(attempt) * 5
        const angle = attempt * 2.39996
        x = Math.max(14, Math.min(205, anchorX + Math.cos(angle) * radius))
        y = Math.max(16, Math.min(132, anchorY + Math.sin(angle) * radius))
        if (occupied.every((previous) => Math.hypot(previous.x - x, previous.y - y) >= 21)) break
      }
      occupied.push({ x, y })
      return { item, x, y, anchorX, anchorY }
    })
  }, [landmarks, year])
  const scaleWidth = 196 * 5 / ((MAP_BOUNDS.east - MAP_BOUNDS.west) * 111.32 * Math.cos(17.4 * Math.PI / 180))
  return (
    <div className={large ? 'mini-map large-map' : 'mini-map'}>
      <svg viewBox="0 0 220 158" aria-label="Hyderabad orientation map; north at top" role="img">
        <path className="map-grid" d="M55 0V158M110 0V158M165 0V158M0 40H220M0 80H220M0 120H220" />
        <polyline className="map-river" points={MUSI.map((coords) => point(coords).join(',')).join(' ')} />
        {year >= 1563 && <polygon className="map-lake" points={HUSSAIN_SAGAR.map((coords) => point(coords).join(',')).join(' ')} />}
        {markers.map((marker) => <line key={marker.item.id} className="map-marker-leader" x1={marker.anchorX} y1={marker.anchorY} x2={marker.x} y2={marker.y} />)}
        <text x="198" y="17" className="map-north">N ↑</text>
        <text x="170" y="100" className="map-place-label">MUSI</text>
        <path className="map-scale" d={`M12 145h${scaleWidth}M12 142v6M${12 + scaleWidth} 142v6`} />
        <text x={18 + scaleWidth} y="148" className="map-place-label">≈ 5 km</text>
      </svg>
      {markers.map(({ item, x, y }) => {
        return <button
          key={item.id}
          style={{ left: `${x / 2.2}%`, top: `${y / 1.58}%` }}
          className={selectedId === item.id ? 'map-point selected' : 'map-point'}
          aria-label={`Locate ${item.name}`}
          title={item.name}
          onClick={() => onSelect(item.id)}
        />
      })}
    </div>
  )
}

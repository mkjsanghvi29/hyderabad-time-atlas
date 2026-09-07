import { HUSSAIN_SAGAR, MAP_BOUNDS, MUSI } from './geography'
import type { Coordinates, Landmark } from './types'
import { useEffect, useMemo, useState } from 'react'

function point([lon, lat]: Coordinates) {
  return [
    12 + ((lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 196,
    10 + ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 134,
  ]
}

export default function Minimap({ landmarks, selectedId, year, onSelect, onNavigate, destination, large = false }: {
  landmarks: Landmark[]
  selectedId: string | null
  year: number
  onSelect: (id: string) => void
  onNavigate?: (coordinates: Coordinates) => void
  destination?: Coordinates | null
  large?: boolean
}) {
  const [cursor, setCursor] = useState<Coordinates | null>(null)
  useEffect(() => { setCursor(null) }, [destination, year, selectedId])
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
  const target = cursor ?? destination
  const targetPoint = target ? point(target) : null
  return (
    <div className={large ? 'mini-map large-map' : 'mini-map'} tabIndex={onNavigate ? 0 : undefined}
      aria-label={onNavigate ? 'Select any location. Arrow keys move the crosshair; Enter travels there.' : undefined}
      onKeyDown={(event) => {
        if (!onNavigate || event.target !== event.currentTarget) return
        if (event.key === 'Enter' && target) { event.preventDefault(); onNavigate(target); return }
        const offsets: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }
        const offset = offsets[event.key]
        if (!offset) return
        event.preventDefault()
        const origin = target ?? [78.455, 17.4]
        setCursor([
          Math.max(MAP_BOUNDS.west, Math.min(MAP_BOUNDS.east, origin[0] + offset[0] * .01)),
          Math.max(MAP_BOUNDS.south, Math.min(MAP_BOUNDS.north, origin[1] + offset[1] * .01)),
        ])
      }}>
      <svg viewBox="0 0 220 158" aria-label="Hyderabad orientation map; north at top" role="img" onClick={(event) => {
        if (!onNavigate) return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * 220 - 12) / 196))
        const y = Math.max(0, Math.min(1, ((event.clientY - rect.top) / rect.height * 158 - 10) / 134))
        const coordinates: Coordinates = [MAP_BOUNDS.west + x * (MAP_BOUNDS.east - MAP_BOUNDS.west), MAP_BOUNDS.north - y * (MAP_BOUNDS.north - MAP_BOUNDS.south)]
        setCursor(coordinates)
        onNavigate(coordinates)
      }}>
        <path className="map-grid" d="M55 0V158M110 0V158M165 0V158M0 40H220M0 80H220M0 120H220" />
        <polyline className="map-river" points={MUSI.map((coords) => point(coords).join(',')).join(' ')} />
        {year >= 1563 && <polygon className="map-lake" points={HUSSAIN_SAGAR.map((coords) => point(coords).join(',')).join(' ')} />}
        {markers.map((marker) => <line key={marker.item.id} className="map-marker-leader" x1={marker.anchorX} y1={marker.anchorY} x2={marker.x} y2={marker.y} />)}
        {targetPoint && <circle className="map-travel-point" cx={targetPoint[0]} cy={targetPoint[1]} r="4" />}
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

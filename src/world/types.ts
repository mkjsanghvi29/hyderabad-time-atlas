import type { CameraMode, Coordinates, MapView, SceneStatus, Source, TimeOfDay } from '../types'

export type WorldCityId = 'london' | 'cairo' | 'tokyo' | 'new-york' | 'rio' | 'sydney'
export type CityId = 'hyderabad' | WorldCityId
export type Bounds = readonly [west: number, south: number, east: number, north: number]
export type CityMetric = {
  label: string
  value: string
  scope: string
  asOf: string
  source: string
}
export type CityChapter = {
  year: number
  label: string
  title: string
  description: string
  life: string
  changes: string[]
  sources: string[]
  stats: CityMetric[]
  focus: Coordinates
  spanKm: number
  density: number
}
export type WorldModel = 'pyramid' | 'temple' | 'fort' | 'cathedral' | 'palace'
  | 'pagoda' | 'tower' | 'bridge' | 'dome' | 'port' | 'opera' | 'statue' | 'district' | 'park' | 'hill'
export type CityPlace = {
  id: string
  name: string
  coordinates: Coordinates
  visibleFrom: number
  visibleUntil?: number
  model: WorldModel
  dateLabel: string
  description: string
  caveat: string
  sources: string[]
}
export type CityWater = {
  name: string
  kind: 'river' | 'area'
  points: Coordinates[]
  widthKm?: number
}
export type CityDistrict = {
  name: string
  coordinates: Coordinates
  radiusKm: number
  visibleFrom: number
}
export type WorldCity = {
  id: WorldCityId
  name: string
  country: string
  continent: string
  tagline: string
  center: Coordinates
  mapBounds: Bounds
  historicalBounds: Bounds
  reconstructionNote: string
  chapters: CityChapter[]
  places: CityPlace[]
  water: CityWater[]
  districts: CityDistrict[]
  sources: Source[]
}

export type CitySceneProps = {
  city: WorldCity
  chapter: CityChapter
  selectedId: string | null
  destination: Coordinates | null
  destinationZoom?: number
  cameraMode: CameraMode
  timeOfDay: TimeOfDay
  showLabels: boolean
  onSelect: (id: string) => void
  onNavigate: (coordinates: Coordinates) => void
  onStatus: (status: SceneStatus) => void
  onError: (message: string) => void
  onViewChange: (view: MapView) => void
}

export type Coordinates = readonly [longitude: number, latitude: number]
export type ModelKind =
  | 'fort' | 'tombs' | 'charminar' | 'mosque' | 'palace' | 'bridge'
  | 'residency' | 'court' | 'university' | 'cyber' | 'buddha' | 'clock'

export type Source = {
  id: string
  title: string
  publisher: string
  url: string
}

export type Landmark = {
  id: string
  name: string
  subtitle: string
  coordinates: Coordinates
  visibleFrom: number
  dateLabel: string
  model: ModelKind
  category: 'Fortification' | 'Sacred' | 'Civic' | 'Palace' | 'Infrastructure' | 'Technology'
  description: string
  caveat: string
  sources: string[]
}

export type Era = {
  year: number
  label: string
  chapter: string
  title: string
  description: string
  changes: string[]
  sources: string[]
  density: number
  districts: Array<'golconda' | 'old-city' | 'north-bank' | 'secunderabad' | 'west'>
  tour: string[]
}

export type TimeOfDay = 'golden' | 'day' | 'night'
export type CameraMode = 'orbit' | 'walk'
export type SceneStatus = 'loading' | 'ready' | 'unavailable'

export type AtlasSceneHandle = {
  focus: (landmarkId: string) => void
  travel: (districtId: string) => void
  home: () => void
  region: () => void
  zoom: (direction: 'in' | 'out') => void
  move: (direction: 'forward' | 'backward' | 'left' | 'right') => void
}

export type AtlasSceneProps = {
  era: Era
  landmarks: Landmark[]
  selectedId: string | null
  timeOfDay: TimeOfDay
  cameraMode: CameraMode
  showLabels: boolean
  showCity: boolean
  showRoads: boolean
  onSelect: (id: string) => void
  onStatus: (status: SceneStatus) => void
  onDistrictChange?: (districtId: string) => void
}

import { coordinatesFromUrl, zoomFromUrl } from '../navigation'
import { insideBounds, placesInChapter } from './geography'
import type { WorldCity } from './types'

export function readWorldLocation(city: WorldCity, search: string, protocol: string) {
  const params = new URLSearchParams(search)
  const requestedIndex = city.chapters.findIndex((chapter) => chapter.year === Number(params.get('year')))
  const index = requestedIndex >= 0 ? requestedIndex : 0
  const chapter = city.chapters[index]
  const selectedId = placesInChapter(city, chapter.year).find((place) => place.id === params.get('place'))?.id ?? null
  const mapped = chapter.year === 2025 && params.get('view') !== 'atlas' && protocol !== 'file:'
  const coordinates = coordinatesFromUrl(search)
  const destination = coordinates && insideBounds(coordinates, mapped ? city.mapBounds : city.historicalBounds) ? coordinates : null
  const notice = params.has('year') && requestedIndex < 0 ? 'That year is not a chapter in this city. Showing its first chapter.'
    : params.has('place') && !selectedId ? 'That landmark is not available in this city and chapter.'
      : (params.has('lat') || params.has('lon')) && !destination ? 'That location is invalid or outside this city view.'
        : ''
  return { index, selectedId, destination, zoom: zoomFromUrl(search), notice, preferMap: params.get('view') !== 'atlas' && protocol !== 'file:' }
}

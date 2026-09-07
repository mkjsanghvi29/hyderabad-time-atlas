import { ERAS, LANDMARKS, SOURCES } from './data'
import type { Landmark, Source } from './types'

export type CityStory = {
  id: string
  year: number
  title: string
  body: string
  sources: string[]
  landmarkId?: string
}

export const CITY_STORIES: CityStory[] = [
  {
    id: '1518-older-walls',
    year: 1518,
    title: 'The new dynasty inherits an old fort',
    body: 'The Qutb Shahi story starts here, but the masonry has a head start. UNESCO identifies fourteenth-century walls in Golconda\'s uppermost defensive circuit. The new rulers inherit an older fortified hill and expand it over time. Read the fort as layers, rather than imagining that its entire surviving silhouette sprang up in 1518.',
    sources: ['unesco'],
    landmarkId: 'golconda',
  },
  {
    id: '1518-persian-deccani-connections',
    year: 1518,
    title: 'A Persian founder, Deccani allies',
    body: 'The dynasty\'s founder came from Iran. Building a kingdom here, though, meant more than importing a court: Qutb Shahi power depended on alliances with Deccani Muslims and local Telugu-speaking Hindu elites. Golconda\'s beginnings are a story of connections across languages and communities, not an isolated fortress cut off from the wider world.',
    sources: ['unesco'],
    landmarkId: 'golconda',
  },
  {
    id: '1591-rooftop-mosque',
    year: 1591,
    title: 'A mosque above the crossroads',
    body: 'Charminar is more than a monument to walk around. A mosque occupies the western end of its upper floor, above the new capital\'s crossroads. Hyderabad District describes the roof-level prayer space; UNESCO explains the street-planning role below. Sacred space and urban navigation meet in a single building.',
    sources: ['charminar', 'unesco'],
    landmarkId: 'charminar',
  },
  {
    id: '1591-cosmic-crossroads',
    year: 1591,
    title: 'A small universe above the street',
    body: 'The new capital hides a small universe in its centre. UNESCO\'s Tentative List submission reads Charminar\'s four arches through a Persian image of the cosmos, alongside Indian traditions of a central ritual crossroads. A solar lotus adorns its ground-storey dome. The city\'s geometry is doing more than directing traffic.',
    sources: ['unesco'],
    landmarkId: 'charminar',
  },
  {
    id: '1687-absent-last-ruler',
    year: 1687,
    title: 'The ruler who will not join these tombs',
    body: 'Golconda\'s fall does not produce a final royal tomb here. The last ruler, Abul Hasan Tana Shah, was exiled to Aurangabad, according to the Aga Khan Development Network, and is absent from this burial landscape. The dynasty ends; its existing domes endure rather than becoming instant ruins.',
    sources: ['conservation', 'history'],
    landmarkId: 'tombs',
  },
  {
    id: '1687-cloth-and-diamonds',
    year: 1687,
    title: 'Not everything glittered: cloth mattered too',
    body: 'Golconda\'s famous diamonds can hide the rest of its trading life. UNESCO\'s account places the fortified city on a route from the port of Masulipatam and describes markets for textiles and printed cloth alongside gems. In the kingdom\'s final chapter, think of a connected commercial city, not simply a royal treasure chest.',
    sources: ['unesco'],
    landmarkId: 'golconda',
  },
  {
    id: '1763-three-dynasties-one-mosque',
    year: 1763,
    title: 'Three dynasties, one mosque',
    body: 'The returning Nizam\'s court finds a skyline older than its own palace project. Mecca Masjid, begun under the Qutb Shahis and finished under Mughal rule, is already complete. The court\'s move from Aurangabad is usually dated 1763; a Telangana government account says 1769. Neither date means the city was rebuilt overnight.',
    sources: ['mosque', 'history', 'capital'],
    landmarkId: 'mecca-masjid',
  },
  {
    id: '1763-palace-keeps-growing',
    year: 1763,
    title: 'The palace that kept growing',
    body: 'Imagine handing a building project from one reign to the next. Chowmahalla began in 1750, but Hyderabad District places its major completion in 1857-69. Its courtyards and palace ranges accumulated rather than arriving together. In this chapter, you are early in that story; the finished ensemble belongs to a later visit.',
    sources: ['chowmahalla'],
  },
  {
    id: '1908-charminar-clocks',
    year: 1908,
    title: 'Charminar learns to tell the time',
    body: 'The Charminar familiar to a 1908 passer-by has something its founder never saw: clock faces. Hyderabad District dates their addition to 1889. Unlike the competing legends about the monument\'s origins, this is a dated later alteration. The same landmark can belong to several moments in history without being rebuilt from scratch.',
    sources: ['charminar'],
    landmarkId: 'charminar',
  },
  {
    id: '1908-before-postcard-riverfront',
    year: 1908,
    title: 'Before the postcard riverfront',
    body: 'The domed High Court belongs to a later civic landscape, not the morning of the 1908 disaster. The Musi flood struck on 28 September; the court building followed in 1915-19, with inauguration in 1920. Today\'s familiar riverfront can mislead a time traveller. The atlas has no verified map of that flood\'s full reach.',
    sources: ['flood', 'court-building', 'court'],
  },
  {
    id: '1948-learning-in-urdu',
    year: 1948,
    title: 'Medicine and engineering, taught in Urdu',
    body: 'Before this transition, Osmania taught even medicine and engineering through Urdu, while requiring students to learn English. The university\'s own history places a move to English-medium teaching in the phase beginning in 1948. Changing the language of higher education is another part of Hyderabad\'s story, beyond flags, palaces and the political headlines.',
    sources: ['osmania'],
    landmarkId: 'osmania',
  },
  {
    id: '1948-residency-to-classrooms',
    year: 1948,
    title: 'An imperial address becomes a campus',
    body: 'In 1948, Osmania\'s Women\'s College moved to its present location, according to the university\'s history. That address is the former British Residency at Koti, documented by the World Monuments Fund. Classical columns once associated with a diplomatic residence acquire another chapter: women\'s higher education, not just another change of rulers.',
    sources: ['osmania', 'residency'],
    landmarkId: 'residency',
  },
  {
    id: '1998-computing-before-cyber-towers',
    year: 1998,
    title: 'Computers before Cyber Towers',
    body: 'Hyderabad\'s computing story did not start with a shiny office landmark. Osmania University established its Computer Centre in 1975, well before the 1998 Cyber Towers milestone. Visit the university, then head west: one story is about academic infrastructure, the other about a new technology district. Neither makes today\'s entire skyline a 1998 reality.',
    sources: ['osmania', 'hitec'],
    landmarkId: 'osmania',
  },
  {
    id: '1998-young-buddha-old-lake',
    year: 1998,
    title: 'A young Buddha on an old lake',
    body: 'The lake and its Buddha belong to very different chapters. Hussain Sagar dates to 1562-63, but the statue was installed in 1992, making it a recent arrival in this 1998 view. Seen together they are an easy time-travel trap: the modern icon should never be carried back into the lake\'s founding landscape.',
    sources: ['lake'],
    landmarkId: 'buddha',
  },
  {
    id: '2025-conservation-is-history',
    year: 2025,
    title: 'Old does not have to mean ruined',
    body: 'Not every fresh-looking surface belongs to a new building. The Aga Khan Trust for Culture documents conservation of the Qutb Shahi royal tombs, built with local granite and plaster. At this historic site, care and repair are part of the present-day story; age alone does not tell you whether a monument should look ruined.',
    sources: ['conservation'],
    landmarkId: 'tombs',
  },
  {
    id: '2025-charminar-faraway-cousin',
    year: 2025,
    title: 'Charminar\'s faraway cousin',
    body: 'Hyderabad\'s icon has an architectural echo in Bukhara, Uzbekistan. UNESCO\'s Tentative List submission connects Charminar with a later four-towered gateway there, built in 1807. Compare their jobs: one organizes city crossroads, the other marks an entrance. That is a global design story, not a claim that Hyderabad\'s monuments are World Heritage-inscribed.',
    sources: ['unesco'],
    landmarkId: 'charminar',
  },
]

export function cityStories(year: number): CityStory[] {
  if (!ERAS.some((era) => era.year === year)) {
    throw new RangeError(`No city stories chapter for ${year}`)
  }
  return CITY_STORIES.filter((story) => story.year === year)
}

export function cityStorySources(story: CityStory): Source[] {
  return story.sources.map((id) => {
    const source = SOURCES.find((entry) => entry.id === id)
    if (!source) throw new RangeError(`Unknown source "${id}" in city story "${story.id}"`)
    return source
  })
}

export function cityStoryLandmark(story: CityStory): Landmark | undefined {
  if (!story.landmarkId) return undefined
  const landmark = LANDMARKS.find((entry) => entry.id === story.landmarkId)
  if (!landmark || landmark.visibleFrom > story.year) {
    throw new RangeError(`Unavailable landmark "${story.landmarkId}" in city story "${story.id}"`)
  }
  return landmark
}

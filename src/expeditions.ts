import type { Era } from './types'

type ScoutGoal = { kind: 'landmark' | 'district'; id: string; title: string; target: string; hint: string }
type QuizGoal = {
  kind: 'quiz'; id: string; title: string; question: string
  options: Array<{ id: string; text: string }>
  answer: string; explanation: string; hint: string
}
export type ExpeditionGoal = ScoutGoal | QuizGoal
export type Expedition = { year: number; title: string; badge: string; goals: ExpeditionGoal[] }

function scout(year: number, kind: ScoutGoal['kind'], target: string, title: string, hint: string): ScoutGoal {
  return { id: `${year}:${target}`, kind, target, title, hint }
}
function quiz(year: number, question: string, options: string[], explanation: string, hint: string): QuizGoal {
  return { kind: 'quiz', id: `${year}:discovery`, title: 'Make a discovery', question, options: options.map((text, index) => ({ id: String(index), text })), answer: '0', explanation, hint }
}

export const EXPEDITIONS: Expedition[] = [
  { year: 1518, title: 'Scout the city before Hyderabad', badge: 'Fort-town scout', goals: [
    scout(1518, 'landmark', 'golconda', 'Survey Golconda Fort', 'Look for a working settlement around the fortified hill, not only its walls.'),
    scout(1518, 'district', 'golconda-town', 'Enter the fort-town streets', 'Use the street camera to see the interpreted domestic buildings.'),
    quiz(1518, 'Which familiar landmark does not belong in this chapter?', ['Charminar', 'Golconda Fort', 'The granite hill landscape'], 'Charminar belongs to Hyderabad’s founding in 1591. The earlier fort town had its own life before that new capital.', 'Look at the earliest date in Charminar’s field note.'),
  ] },
  { year: 1591, title: 'Find the new city’s heart', badge: 'Founding-city explorer', goals: [
    scout(1591, 'landmark', 'charminar', 'Find the founding crossroads', 'Notice the monument’s four-sided form and read the founding story.'),
    scout(1591, 'landmark', 'purana-pul', 'Find the older river crossing', 'The bridge predates the new city.'),
    quiz(1591, 'What organizes the founding city in the source record?', ['Four cardinal avenues around Charminar', 'Cyber Towers and an IT ring road', 'The present-day Metro network'], 'UNESCO describes Charminar at the intersection of four cardinal avenues. The surrounding secondary streets in the atlas are reconstruction.', 'A landmark can explain a city plan, not just decorate it.'),
  ] },
  { year: 1687, title: 'Read a city through political change', badge: 'Keeper of continuity', goals: [
    scout(1687, 'landmark', 'golconda', 'Revisit the fortified city', 'The conquest does not make every roof vanish overnight.'),
    scout(1687, 'landmark', 'tombs', 'Visit the dynastic landscape', 'Buildings can outlast the dynasty that commissioned them.'),
    quiz(1687, 'What is the status of Mecca Masjid in this chapter?', ['Construction is still unfinished', 'It has been complete for two centuries', 'It will only be started in the twentieth century'], 'Its completion is dated around 1693–94. The atlas withholds the finished model in 1687 rather than moving it backward in time.', 'Compare 1687 with the completion range in the source ledger.'),
  ] },
  { year: 1763, title: 'Explore an inherited capital', badge: 'Court-city interpreter', goals: [
    scout(1763, 'landmark', 'mecca-masjid', 'See the completed mosque', 'Compare its availability with the previous chapter.'),
    scout(1763, 'district', 'old-city', 'Walk the inherited neighbourhood', 'A new political chapter can reuse existing streets.'),
    quiz(1763, 'Why is the later complete Chowmahalla model withheld here?', ['The palace complex developed across generations', 'There was never a palace on the site', 'All of its buildings date to 2025'], 'The palace began in 1750, with major completion in 1857–69. An absent finished model does not mean that the earlier site was empty.', 'Read the difference between a starting date and an ensemble’s completion.'),
  ] },
  { year: 1908, title: 'Understand the river city', badge: 'Musi investigator', goals: [
    scout(1908, 'landmark', 'purana-pul', 'Trace a crossing of the Musi', 'Imagine the river as part of daily movement, not only a view.'),
    scout(1908, 'district', 'koti', 'Explore the north-bank city', 'Connect the old city to its growing institutional landscape.'),
    quiz(1908, 'Why does this atlas not draw an exact 1908 flood boundary?', ['No defensible inundation polygon was obtained', 'The flood did not happen', 'Every part of metropolitan Hyderabad flooded equally'], 'The disaster is documented, but its exact footprint was not established for this model. Honest history separates a sourced event from an invented map.', 'The reconstruction ledger distinguishes known events from missing spatial evidence.'),
  ] },
  { year: 1948, title: 'Discover the civic city', badge: 'Civic-city explorer', goals: [
    scout(1948, 'landmark', 'high-court', 'Visit the civic riverfront', 'The building belongs after the 1908 disaster, not during it.'),
    scout(1948, 'district', 'osmania-campus', 'Explore the university landscape', 'A university and its later campus buildings can have different dates.'),
    quiz(1948, 'Which happened first?', ['Osmania University’s foundation in 1917', 'The Arts College building in 1938–39', 'Both are the same event'], 'The university was founded in 1917; its Arts College building followed. The university’s own 1938 date and other accounts’ 1939 date remain visible.', 'Separate the institution from the building in its field note.'),
  ] },
  { year: 1998, title: 'Follow the western turn', badge: 'Cyberabad pathfinder', goals: [
    scout(1998, 'landmark', 'cyber-towers', 'Find the new western destination', 'Notice how sparse the surrounding western skyline is compared with 2025.'),
    scout(1998, 'district', 'old-city', 'Return to an older working city', 'A new centre does not erase the previous ones.'),
    quiz(1998, 'Which choice avoids projecting the future into this chapter?', ['Show an emerging IT district without the later Metro', 'Copy the complete 2025 skyline into 1998', 'Treat the old city as abandoned'], 'The western technology node was emerging. Later infrastructure and today’s complete skyline do not belong in a 1998 reconstruction.', 'Look for things that should be absent, not only things that have appeared.'),
  ] },
  { year: 2025, title: 'Find the past within the metropolis', badge: 'City-through-time scholar', goals: [
    scout(2025, 'landmark', 'tombs', 'Find a story of conservation', 'Time passing does not always mean increasing decay.'),
    scout(2025, 'district', 'financial-district', 'Explore a newer urban centre', 'Compare this western district with an older part of the city.'),
    quiz(2025, 'Why can the tombs look better cared for in a later era?', ['Conservation repairs and maintains historic fabric', 'Historic buildings naturally become newer', 'A change of government instantly rebuilds all monuments'], 'AKDN documents conservation of the Qutb Shahi tombs. Repair and continued use are part of history alongside weathering and loss.', 'Use the monument’s “This place in 2025” note.'),
  ] },
]

export function goalsForVisit(year: Era['year'], kind: ScoutGoal['kind'], target: string): string[] {
  return EXPEDITIONS.find((entry) => entry.year === year)?.goals
    .filter((goal) => goal.kind === kind && goal.target === target).map((goal) => goal.id) ?? []
}

const STORAGE_KEY = 'hyderabad-expeditions-v1'
const knownIds = new Set(EXPEDITIONS.flatMap((entry) => entry.goals.map((goal) => goal.id)))
export function loadExpeditions(): { completed: Set<string>; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: new Set(), warning: '' }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed || !('version' in parsed) || parsed.version !== 1
      || !('completed' in parsed) || !Array.isArray(parsed.completed)
      || !parsed.completed.every((id): id is string => typeof id === 'string' && knownIds.has(id))) {
      throw new Error('Unsupported expedition progress format')
    }
    return { completed: new Set(parsed.completed), warning: '' }
  } catch (error) {
    console.warn('Hyderabad atlas: saved expedition progress could not be loaded.', error)
    return { completed: new Set(), warning: 'Saved progress could not be loaded. You can still play in this visit.' }
  }
}
export function saveExpeditions(completed: ReadonlySet<string>): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: [...completed] }))
    return ''
  } catch (error) {
    console.warn('Hyderabad atlas: expedition progress could not be saved.', error)
    return 'Progress stays in this visit because browser storage is unavailable.'
  }
}

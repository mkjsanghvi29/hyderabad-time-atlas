import type { EraLife } from './CityLifePanel'

export const CITY_LIFE: EraLife[] = [
  {
    year: 1518, title: 'Before the crossroads.',
    vignette: 'You approach Golconda carrying supplies. The fortified hill gives the journey a destination. Beyond its inhabited approaches, rock and open land stretch toward a plain not yet organized around Charminar.',
    observations: [
      { label: 'A settlement, not an empty monument', text: 'The fort was a place of residential, military and courtly activity. The surrounding houses and paths here are a visual reconstruction of that relationship.' },
      { label: 'The city has not spread everywhere', text: 'Golconda is the main urban anchor. Later northern and western metropolitan districts remain predominantly open landscape.' },
      { label: 'Water before the familiar lake', text: 'Hussain Sagar has not yet been constructed. No household water network or precise historic shoreline is reconstructed.' },
    ],
    uncertainty: 'This imagined supply journey is not a recorded resident’s account. No contemporary domestic-building survey or street-level image was obtained. The fort’s broad functions are sourced; everyday geometry is interpretive.',
    sources: ['unesco', 'history'],
  },
  {
    year: 1591, title: 'Inside a city being made.',
    vignette: 'You turn toward the new crossroads at Charminar. Imagined workplaces and small domestic compounds give the approaches everyday activity, but the new city is visibly forming—not a mature metropolis appearing overnight.',
    observations: [
      { label: 'A new heart, an older landscape', text: 'The cardinal avenues around Charminar connect the new southern urban focus to a wider landscape that still includes Golconda and the older river crossing.' },
      { label: 'Look beyond the monumental facade', text: 'Courtyards, awnings and working doorways make the reconstructed lanes inhabitable. Their dimensions and materials are not a measured 1591 building inventory.' },
      { label: 'A river in everyday geography', text: 'The Musi and Purana Pul shape the journey. Their presence does not establish who had access to water or how it was distributed.' },
    ],
    uncertainty: 'The founding framework is sourced, but the street scene is an imagined vignette. Mature nineteenth-century bazaar density must not be read back into this founding chapter. Later paintings are not contemporary photographs.',
    sources: ['unesco', 'bridge', 'early-painting'],
  },
  {
    year: 1687, title: 'The streets endure.',
    vignette: 'You follow a familiar working route through the city as sovereignty changes. The streets remain places of movement and work; the end of a dynasty does not replace every house or collapse every fort wall in a single day.',
    observations: [
      { label: 'Continuity through political change', text: 'Golconda and the Charminar-centred city retain distinct but connected roles. Architecture carries layers of history rather than switching styles instantly.' },
      { label: 'Ceremony is not ordinary traffic', text: 'A catalogued illustration depicts an elephant-mounted ruler, but it was probably painted around 1700. It does not establish everyday transport proportions.' },
      { label: 'Still a city under construction', text: 'Mecca Masjid is not yet complete. The atlas distinguishes a monument’s construction history from its eventual finished silhouette.' },
    ],
    uncertainty: 'The vignette does not represent every experience of siege and conquest. Street activity and ordinary building forms are reconstructed. The manuscript image depicts elite ceremony, not a panoramic city record.',
    sources: ['unesco', 'mosque', 'early-painting', 'urban-morphology'],
  },
  {
    year: 1763, title: 'A court, and its city.',
    vignette: 'You carry a delivery toward the developing palace precinct. Working doorways, enclosed compounds and connecting lanes place the court within a functioning neighbourhood rather than alone on a display platform.',
    observations: [
      { label: 'An inherited city is reused', text: 'Court-related activity gives established streets renewed importance. This chapter emphasizes the old core rather than inventing a completed northern metropolis.' },
      { label: 'Palaces take generations', text: 'Chowmahalla began in 1750 and developed into the nineteenth century. A complete later ensemble would misrepresent this transitional moment.' },
      { label: 'Everyday work is an interpretation', text: 'Deliveries and service journeys make the scene understandable, but they are not evidence of named trades operating at particular addresses.' },
    ],
    uncertainty: 'The capital transfer is commonly dated 1763, while a Telangana government document gives 1769. The delivery journey and surrounding housing are reconstructed, not observations from an exact date.',
    sources: ['history', 'capital', 'chowmahalla', 'urban-morphology'],
  },
  {
    year: 1908, title: 'Across a river city.',
    vignette: 'On an imagined ordinary morning before the September flood, you cross from the old city toward the northern institutional quarter. The river is part of a daily route—not only scenery behind a monument.',
    observations: [
      { label: 'More than one urban centre', text: 'The southern core, north-bank institutions and Secunderabad broaden the city’s structure. Their connections do not imply that every intervening parcel was built up.' },
      { label: 'The flood changes the story', text: 'The September disaster becomes a turning point in water management and civic rebuilding. This view is not the city at peak inundation.' },
      { label: 'Later works belong later', text: 'The High Court building, Arts College and later flood-control landscape cannot be placed into an ordinary pre-flood scene.' },
    ],
    uncertainty: 'No verified flood polygon or block-by-block 1908 housing survey was obtained. Transport and street details are illustrative. A promising 1854 map catalogue lead could not be inspected and is not treated as a traced basemap.',
    sources: ['flood', 'residency', 'urban-morphology'],
  },
  {
    year: 1948, title: 'Beyond the palace city.',
    vignette: 'A journey takes you toward the civic riverfront; another continues to an educational district. Public institutions and their surrounding open spaces become everyday destinations within a much larger city.',
    observations: [
      { label: 'A dated visual reference', text: 'The Deccan Archive identifies a September 1948 view of Osmania General Hospital from Osmania Park, credited to Jack Birns. It supports that specific place relationship, not a citywide reconstruction.' },
      { label: 'Institutions reshape journeys', text: 'The High Court, Koti and Osmania University add destinations beyond the old ceremonial core. The atlas connects them with interpreted neighbourhood fabric.' },
      { label: 'Physical continuity, political upheaval', text: 'Integration into India marks a major transition. The city’s physical fabric did not change overnight, and this short vignette cannot capture the period’s differing human experiences.' },
    ],
    uncertainty: 'The archival caption was readable, not a full survey of traffic, housing or service access. The public-space journeys are imagined. No reuse rights for the photograph are assumed; it is linked, not bundled.',
    sources: ['archive-1948', 'court', 'osmania', 'residency', 'urban-morphology'],
  },
  {
    year: 1998, title: 'The commute turns west.',
    vignette: 'An office worker travels toward the emerging HITEC City district. Elsewhere, established shopping streets, institutions and neighbourhoods continue their day. Technology adds a new destination; it does not become everybody’s city at once.',
    observations: [
      { label: 'An emerging western node', text: 'Cyber Towers appears among a relatively sparse western landscape. The mature high-rise Financial District belongs to a later chapter.' },
      { label: 'Older centres remain active', text: 'The old city, lake surroundings and Secunderabad continue to matter. Westward growth adds to the urban network rather than erasing it.' },
      { label: 'Do not bring the future forward', text: 'The contemporary Metro and the airport opened in 2008 are not part of this scene. Vehicle proportions and individual roads remain reconstructed.' },
    ],
    uncertainty: 'The broad shift toward an east–west urban structure is supported by historical-geography research, but its abstract does not establish a 1998 building inventory. Cyber Towers’ opening is supported here by a secondary directory.',
    sources: ['hitec', 'lake', 'urban-morphology'],
  },
  {
    year: 2025, title: 'One city, many daily lives.',
    vignette: 'Your journey connects an older neighbourhood with a newer workplace district. Local streets, inherited institutions, apartment areas and large developments belong to the same metropolis, even when their daily rhythms differ.',
    observations: [
      { label: 'Several scales coexist', text: 'Low-rise lanes, industrial areas, open campuses and newer towers use different visual patterns. “Modern Hyderabad” is not one repeated glass building.' },
      { label: 'A connected metropolitan landscape', text: 'Explore north, east, south and west—not only HITEC City. The wide view is a schematic metropolitan envelope, not a complete building-by-building digital twin.' },
      { label: 'Visible growth is not universal prosperity', text: 'A skyline cannot establish equal access to housing, mobility, water or sanitation. The atlas does not infer household conditions from the appearance of development.' },
    ],
    uncertainty: 'The academic morphology source covers history through 2019, not a verified 2025 inventory. Contemporary district intensity and routes are interpretive. Administrative HMDA limits and the built-up city are different things.',
    sources: ['hmda', 'urban-morphology', 'unesco'],
  },
]

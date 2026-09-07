export type TourAtmosphere = 'fort' | 'bazaar' | 'river' | 'palace' | 'campus' | 'modern'

export type AudioTourStop = {
  id: string
  year: number
  title: string
  subtitle: string
  target: { kind: 'landmark' | 'district'; id: string }
  narration: string
  speechText?: string
  sources: string[]
  atmosphere: TourAtmosphere
}

export const AUDIO_TOUR_STOPS: AudioTourStop[] = [
  {
    id: '1518-older-stone',
    year: 1518,
    title: 'A kingdom on older stone',
    subtitle: 'Golconda before the founding of Hyderabad',
    target: { kind: 'landmark', id: 'golconda' },
    narration: `Before there is Hyderabad, there is this hill. It is fifteen eighteen, the beginning of Qutb Shahi rule. Look towards Golconda's upper walls. Parts of that defensive circuit reach back to the fourteenth century: even a new dynasty begins by inheriting something older.

The fort will grow through successive reigns, so its familiar outline belongs to many moments, not one building campaign. Within this fortified landscape, military, residential and courtly life belong together. Imagine approaching with a delivery, looking for an entrance rather than a view. To someone making that journey, the hill is a place of work as well as power. Our story begins in that difference. Now let us come down from the battlements and consider the city that keeps them alive.`,
    sources: ['unesco', 'history'],
    atmosphere: 'fort',
  },
  {
    id: '1518-town-below-walls',
    year: 1518,
    title: 'The lives below the battlements',
    subtitle: 'An imagined approach to the inhabited fort town',
    target: { kind: 'district', id: 'golconda-town' },
    narration: `Stay with that imagined delivery journey for a moment. A fortress needs more than walls: its residential and courtly life ties it to the country around it. The surrounding settlement matters, even when a monument draws our eyes upwards.

The dynasty's founder came from Iran, but power here was built through Deccani connections. Alliances with Deccani Muslims and local Telugu-speaking Hindu elites helped sustain the new kingdom. This is not a story of one culture arriving on an empty stage. People already here, and people arriving from elsewhere, shape what follows. Think of the fort town as a meeting place rather than an isolated citadel. We will carry that idea east, across the years, to a ruler who gives those connections a new urban centre.`,
    sources: ['unesco', 'history'],
    atmosphere: 'bazaar',
  },
  {
    id: '1591-new-crossroads',
    year: 1591,
    title: 'Four arches, a new beginning',
    subtitle: 'Charminar gives a new capital its centre',
    target: { kind: 'landmark', id: 'charminar' },
    narration: `Fifteen ninety-one. Our view opens around Charminar, at the heart of the city founded by Muhammad Quli Qutb Shah. Four monumental arches meet the directions of the new capital's principal avenues. This is architecture that helps people find their way, not simply something to admire from a distance.

Look above the crossroads, too. A mosque occupies the western end of the upper floor, bringing a place of prayer into the same structure that organizes movement below. Imagine choosing a direction here, with a new city still forming around you. The densely familiar old city of later centuries has not appeared overnight. Golconda remains to the west, part of the same wider landscape. To understand how the new centre connects with that older world, we turn towards the Musi.`,
    sources: ['unesco', 'charminar'],
    atmosphere: 'bazaar',
  },
  {
    id: '1591-older-crossing',
    year: 1591,
    title: 'The bridge was here first',
    subtitle: 'Purana Pul connects an older landscape to the new city',
    target: { kind: 'landmark', id: 'purana-pul' },
    narration: `Here is a small reversal of expectations: the new capital is younger than this crossing. Purana Pul spans the Musi, with its construction generally dated to fifteen seventy-eight under Ibrahim Quli Qutb Shah. The river landscape already had a connection before Charminar became its great landmark.

Imagine pausing on an approach, deciding which way your journey should continue. For a traveller, a bridge can matter more immediately than a palace. It makes the other bank reachable. This older crossing helps us read Hyderabad as a city growing through existing relationships, not starting from nothing. Golconda, the river and the new southern centre belong in one story. We follow that connected landscape into the next century, when its streets and monuments will outlast the kingdom that shaped them.`,
    sources: ['bridge', 'unesco', 'history'],
    atmosphere: 'river',
  },
  {
    id: '1687-fort-and-conquest',
    year: 1687,
    title: 'The walls outlast the kingdom',
    subtitle: 'Golconda at the end of Qutb Shahi sovereignty',
    target: { kind: 'landmark', id: 'golconda' },
    narration: `We return to Golconda in sixteen eighty-seven. After a Mughal siege, the fort falls to Aurangzeb, ending Qutb Shahi sovereignty. These are enormous changes in a short sentence. The survival of buildings must not be mistaken for an absence of suffering, or for an ordinary day in the lives around them.

The fort was also part of a commercial world. Routes linked it with the port of Masulipatam; textiles and printed cloth mattered alongside the diamonds for which Golconda became famous. Picture that wider network rather than a royal treasure chest alone. Conquest changes the political order, but it does not instantly replace every workshop or turn every wall into a ruin. Nearby, the royal burial landscape offers another way to understand what has ended, and what remains.`,
    sources: ['unesco', 'history'],
    atmosphere: 'fort',
  },
  {
    id: '1687-absent-ruler',
    year: 1687,
    title: 'An ending marked by absence',
    subtitle: 'The Qutb Shahi Tombs and the dynasty\'s last ruler',
    target: { kind: 'landmark', id: 'tombs' },
    narration: `Among these domes, an absence tells part of the story. The last Qutb Shahi ruler, Abul Hasan Tana Shah, was exiled to Aurangabad. He does not join this royal burial landscape beside Golconda.

The tombs had accumulated across generations. The earliest royal tomb belongs to Sultan Quli, who died in fifteen forty-three, long before the Mughal conquest that closes this dynasty's political story. Their raised platforms and domes make a family of buildings, not a complex completed in one moment. Pause at that contrast: political rule can end abruptly, while the places made to preserve memory remain. They ask later generations what should be remembered and cared for. We leave these royal memorials for the inhabited city, where another court will eventually take up an older urban inheritance.`,
    sources: ['unesco', 'conservation', 'history'],
    atmosphere: 'palace',
  },
  {
    id: '1763-inherited-skyline',
    year: 1763,
    title: 'A new court, an older skyline',
    subtitle: 'Mecca Masjid links successive periods of rule',
    target: { kind: 'landmark', id: 'mecca-masjid' },
    narration: `Beside Charminar, Mecca Masjid now stands complete. Begun under the Qutb Shahis and finished under Mughal rule, the mosque carries a history longer than any single reign. Its prayer hall and courtyard anchor a city that another dynasty will make its capital.

Our chapter is seventeen sixty-three, the commonly given year of the Asaf Jahi court's return from Aurangabad. A Telangana government account places the move six years later. Either way, the court returns to an inherited city, not a blank site. Imagine entering the surrounding streets with a delivery: established landmarks would still help you find your way, even as political priorities changed. New power settles among older places. Close by, a palace project is beginning a much longer process of becoming.`,
    sources: ['mosque', 'history', 'capital'],
    atmosphere: 'bazaar',
  },
  {
    id: '1763-palace-in-the-making',
    year: 1763,
    title: 'A palace takes generations',
    subtitle: 'The old-city neighbourhood around a developing court',
    target: { kind: 'district', id: 'old-city' },
    narration: `Let us stay in the old-city neighbourhood rather than leap ahead to a finished palace. Chowmahalla began in seventeen fifty, but its major completion belongs to the nineteenth century. The celebrated ensemble of courtyards and palace ranges is still a long story in the making.

Imagine a delivery moving towards the developing precinct. That simple journey brings the court back into contact with everyday work. Palaces need connections with the city beyond their gates; they are not self-contained worlds floating above it. We cannot place a particular worker at a particular doorway, but we can resist making the surrounding neighbourhood disappear. Hyderabad's next chapters will extend beyond this old core, towards northern institutions and wider urban connections. One enduring presence will remain between those journeys: the river.`,
    sources: ['chowmahalla', 'history', 'urban-morphology'],
    atmosphere: 'palace',
  },
  {
    id: '1908-crossroads-and-clocks',
    year: 1908,
    title: 'The crossroads learns to tell time',
    subtitle: 'A later addition changes the familiar Charminar',
    target: { kind: 'landmark', id: 'charminar' },
    narration: `Return to Charminar in nineteen oh eight and look for something its founder never saw: clock faces. They were added in eighteen eighty-nine, almost three centuries after the monument's founding. A building can acquire a new everyday purpose without losing its older identity.

Imagine a passer-by glancing upwards to judge the hour before continuing through the surrounding streets. That is our imagined moment, not a recorded person's appointment. Below the clocks, the crossroads still locates the historic core; beyond it, the city now reaches into northern institutional districts and towards Secunderabad. There is more than one centre of urban life. But this year will be remembered for something no clock could prevent. We leave the arches and return to the Musi, where September brings a devastating turning point.`,
    sources: ['charminar', 'unesco', 'urban-morphology', 'flood'],
    atmosphere: 'bazaar',
  },
  {
    id: '1908-river-and-responsibility',
    year: 1908,
    title: 'The river is not a backdrop',
    subtitle: 'The Musi flood changes the city\'s priorities',
    target: { kind: 'landmark', id: 'purana-pul' },
    narration: `At Purana Pul, hold two ideas together: the river as a familiar part of a journey, and the river as a force that can overturn daily life. On the twenty-eighth of September, nineteen oh eight, a catastrophic Musi flood struck Hyderabad.

The disaster became a turning point in the city's subsequent water management and civic rebuilding. Those later works are not yet the riverfront around us. Nor can this quiet view show the full reach of the flood or the experiences of households caught in it. What it can do is change our attention. A crossing is not only an architectural object; it belongs to a city whose safety depends on decisions about water. We move forward to a riverfront reshaped in the following decades.`,
    sources: ['bridge', 'flood', 'court-building'],
    atmosphere: 'river',
  },
  {
    id: '1948-riverfront-and-reckoning',
    year: 1948,
    title: 'A riverfront, a political rupture',
    subtitle: 'Public institutions amid integration into India',
    target: { kind: 'landmark', id: 'high-court' },
    narration: `The High Court now stands beside the Musi, part of the civic landscape that followed the flood era. Its building was inaugurated in nineteen twenty. By nineteen forty-eight, this riverfront holds institutions that were still in the future on our last visit.

September brings a different kind of rupture. Following the military operation known as Operation Polo, Hyderabad State is integrated into the Indian Union on the seventeenth. This was not simply a ceremonial handover. Military conflict and political upheaval carry hardship; the date of integration cannot speak for every family's experience. The buildings remain, while the political world around them changes. Alongside that difficult transition, another story concerns the city's institutions of learning. We turn towards Osmania, where language and education open a different window onto change.`,
    sources: ['court', 'court-building', 'flood'],
    atmosphere: 'river',
  },
  {
    id: '1948-learning-and-language',
    year: 1948,
    title: 'A city learns in new languages',
    subtitle: 'Osmania\'s campus and the changing language of education',
    target: { kind: 'landmark', id: 'osmania' },
    narration: `Here, the Arts College draws our attention into a more open institutional landscape. Osmania University was founded in nineteen seventeen. Its history includes a remarkable educational ambition: teaching even medicine and engineering through Urdu, while also requiring students to learn English.

The university places a move towards English-medium teaching in the phase beginning in nineteen forty-eight. Imagine a student approaching a classroom, thinking not about a skyline but about the language in which a difficult idea will become clear. That imagined question brings a major institutional change down to a human scale. A university helps shape a city through what people can learn and carry into their working lives. In our next chapter, knowledge and employment will draw our journey towards another part of Hyderabad: the west.`,
    sources: ['osmania'],
    atmosphere: 'campus',
  },
  {
    id: '1998-working-day-turns-west',
    year: 1998,
    title: 'The working day turns west',
    subtitle: 'Cyber Towers marks an emerging technology district',
    target: { kind: 'landmark', id: 'cyber-towers' },
    narration: `Nineteen ninety-eight. Cyber Towers gives the emerging technology district a recognizable address. Its opening is a milestone for a new centre of technology employment on the western side of the city. Around this new focus, do not imagine the mature skyline of later decades.

Picture an office worker making a journey towards a new workplace. The story is as much about changing destinations as changing architecture. Hyderabad's computing history is older than this building: Osmania established its Computer Centre in nineteen seventy-five. Academic infrastructure and a technology employment district are different parts of a longer story. Meanwhile, older shopping streets, institutions and neighbourhoods continue to matter. Let us return from the western promise to the lake, where another recent landmark sits within a much older landscape.`,
    sources: ['hitec', 'osmania', 'urban-morphology'],
    atmosphere: 'modern',
  },
  {
    id: '1998-new-statue-old-lake',
    year: 1998,
    title: 'A young landmark on an old lake',
    subtitle: 'The Buddha and Hussain Sagar keep different calendars',
    target: { kind: 'landmark', id: 'buddha' },
    narration: `The Buddha on Hussain Sagar is only a recent arrival in this chapter. Installed in nineteen ninety-two, the statue stands on a lake whose origins lie in the fifteen sixties. Their presence together can make them feel like a single timeless scene, but they belong to very different moments.

Imagine looking across the water after a journey through the city. The view offers a pause between districts, and a reminder that familiar places keep changing. A new symbol can settle into an older landscape without sharing its age. The lake links our sense of the historic city with its later northern expansion; the western technology district adds another direction. We now move towards the present, carrying that habit of looking for several histories within one view.`,
    sources: ['lake', 'urban-morphology'],
    atmosphere: 'river',
  },
  {
    id: '2025-many-centres',
    year: 2025,
    title: 'Many centres, one city',
    subtitle: 'The western skyline belongs to a wider metropolitan life',
    target: { kind: 'district', id: 'financial-district' },
    narration: `Twenty twenty-five. In the Financial District, the western skyline makes the distance from our first granite hill feel immense. The technology corridor is now one powerful centre within a much wider metropolitan landscape, not a replacement for everything that came before.

Imagine a journey between a newer workplace and an older neighbourhood. Campuses, industrial areas, residential districts and inherited shopping streets belong to the same city, though daily life differs across them. A tall building tells us little about whether everyone can reach work easily or find secure housing. Growth and shared opportunity are not the same thing. To finish, we will turn away from the newest skyline, but not away from the present. At the royal tombs, the modern city's work includes caring for what it has inherited.`,
    sources: ['hmda', 'urban-morphology', 'unesco'],
    atmosphere: 'modern',
  },
  {
    id: '2025-what-the-future-keeps',
    year: 2025,
    title: 'What the future chooses to keep',
    subtitle: 'Conservation connects the royal tombs to today’s city',
    target: { kind: 'landmark', id: 'tombs' },
    narration: `We end near the hill where we began. The Qutb Shahi Tombs are made with local granite and plaster, and their conservation is part of Hyderabad's present-day story. A repaired surface is not a failure to look old. It can be evidence that people have chosen to care.

These domes once marked a dynasty's memory. Now their future depends on work undertaken long after that dynasty disappeared. The same expanding city that builds new workplaces also inherits older responsibilities. That is the connection between the western skyline and this quiet royal landscape: neither has a future without human decisions. Across our journey, capitals, crossings, classrooms and working districts have changed the city. What endures is not a frozen past, but the possibility of carrying it thoughtfully into what comes next.`,
    sources: ['conservation', 'unesco'],
    atmosphere: 'palace',
  },
]

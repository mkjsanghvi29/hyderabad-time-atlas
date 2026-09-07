# Hyderabad Time Atlas: historical research and reconstruction record

## Scope and evidence

The app now distinguishes **illustrated reconstruction** from **geographic reference**.
The former retains the original procedural historical city. The 2025 chapter's geographic
mode uses the latest maps, as requested, rather than pretending that a live map is a frozen
2025 survey. It streams OpenStreetMap-derived roads, labels and mapped building footprints
through OpenFreeMap, with a Mapterhorn elevation reference. Buildings missing from the
source are not filled in with invented footprints. Height information may be estimated;
the scene is not photogrammetry, a complete architectural inventory, or street photography.

The illustrated atlas follows Hyderabad across eight chapters, 1518 to 2025. Its metropolitan envelope
is approximately 48 by 50 km, from 78.24 to 78.69 degrees east and 17.20 to 17.65 degrees north.
Twenty-five interpreted neighbourhood zones are joined by schematic streets and corridor
development. This is not a complete building inventory and must not be confused with the
much larger HMDA administrative planning jurisdiction.

In the illustrated mode, historical events and monument dates are researched; geometry is an original visual interpretation.
No cadastral maps, architectural surveys, measured terrain, historical aerial photographs or
building-footprint datasets are used for that procedural model. Heights are exaggerated for legibility. District
density expresses a narrative, not a population estimate. Coordinates are approximate anchors,
not evidence for a building's exact footprint, orientation, or boundary in a given year.
Ground outside the architectural models is intentionally flat so that the streets and buildings
share a reliable traversal surface. District names are modern orientation labels, not a claim
that the same named administrative units existed at every date.

The approximately 85-by-72-km default geographic overview is a **camera framing**, not a
municipal boundary. Geographic navigation is not restricted to the original 25 zones or
landmark pins: visitors can pan, zoom and click any coordinate, search current mapped
places by name, use the local destination catalogue, or enter latitude and longitude.
The local catalogue is not the limit of modern search. In the 2025 geographic view,
pressing Go sends the submitted name to Photon, restricted to the Hyderabad viewing
envelope; typing alone sends nothing. Coordinates are parsed on the device. Current
search results are not offered in historical chapters or the offline illustrated mode.
Selecting a mapped view sends normal tile requests to the credited providers.
There is no browser geolocation request or account.

### Geographic source and reuse record

- [OpenFreeMap](https://openfreemap.org/) provides the public vector-map service.
  Its [bright style](https://tiles.openfreemap.org/styles/bright) supplies the source
  schema for current cartography. Map styling does not make historical dates or building
  heights more certain.
- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright):
  map data is credited to OpenStreetMap contributors under the Open Database Licence.
  Provider attribution remains visible in both the main map and expanded overview.
- [Photon](https://github.com/komoot/photon) provides current OpenStreetMap-derived
  place search through its public demo endpoint, `https://photon.komoot.io/api/`.
  The [API documentation](https://github.com/komoot/photon/blob/master/docs/api-v1.md)
  defines the `bbox=west,south,east,north` restriction. Salar Jung Museum, Birla Mandir
  and Durgam Cheruvu queries returned matching GeoJSON points with public CORS access.
  Results preserve map-record links and address detail; they do not establish historical
  existence, an entrance location, or comprehensive business coverage. The demo permits
  reasonable use, may throttle or ban extensive use, and offers no availability guarantee.
  The app submits only on demand, spaces requests at least 1.1 seconds apart per loaded
  app, keeps a bounded in-memory cache and surfaces service errors. It does not persist
  search history. A high-traffic deployment should replace `PLACE_SEARCH_ENDPOINT` with
  a suitable hosted or self-managed Photon service; the public demo is not an SLA.
- [Mapterhorn](https://mapterhorn.com/) documents global terrain at approximately 30 m,
  drawn from open elevation datasets. The [public TileJSON](https://tiles.mapterhorn.com/tilejson.json)
  specifies Terrarium encoding and 512-pixel tiles. [Source attribution](https://mapterhorn.com/attribution)
  is preserved. Elevation is a reference surface, not a dated reconstruction of past ground levels.

Maps and elevation are streamed, not bulk-downloaded or included in the source repository.
They require an internet connection. The single-file edition defaults to the original
illustrated atlas, whose models, stories and challenges remain self-contained. Network
errors are surfaced with a retry and an explicitly labelled reconstruction option; a failed
historical layer must never silently turn into a modern map.

### Dated city observations

Both Landsat scenes were verified in Microsoft Planetary Computer's STAC item metadata;
sample RGB tiles at the central city, western corridor and airport site returned nonblank
256-pixel PNGs with public browser CORS access. No account or signed asset URL is embedded.

| Chapter | Acquisition | STAC item | Native RGB resolution |
|---|---|---|---|
| 1998 | 7 June 1998 | `LT05_L2SP_144048_19980607_02_T1` | 30 m, Landsat 5 bands 3/2/1 |
| 2025 | 17 February 2025 | `LC09_L2SP_144048_20250217_02_T1` | 30 m, Landsat 9 bands 4/3/2 |

The scenes report 0% scene-wide cloud cover. Their actual footprints cover central Hyderabad,
the western corridor and the airport region. Their rectangular bounds include corner areas
outside the rotated valid-data footprints. The raster source caps requests at zoom 13;
further zoom magnifies existing pixels, not new detail.

June and February are different seasons. Vegetation and colour differences cannot be
attributed only to urban growth. The June 1998 observation also predates Cyber Towers'
November opening: its marker locates the site, not a proven completed building in that image.
No contemporary roads, buildings or airport labels are overlaid on the 1998 satellite view.

Sources: [1998 item metadata](https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2/items/LT05_L2SP_144048_19980607_02_T1),
[2025 item metadata](https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2/items/LC09_L2SP_144048_20250217_02_T1)
and [collection record](https://planetarycomputer.microsoft.com/api/stac/v1/collections/landsat-c2-l2).
The collection's explicit USGS licence link is labelled **Public Domain**, although its
generic top-level STAC licence string says `proprietary`. USGS/NASA and Microsoft Planetary
Computer attribution is retained. Anonymous tile delivery was established, not an unlimited-use
hosting guarantee or service-level agreement.

Airport destinations use secondary [RGIA chronology](https://en.wikipedia.org/wiki/Rajiv_Gandhi_International_Airport)
and [Begumpet history](https://en.wikipedia.org/wiki/Begumpet_Airport). Commercial operations
moved to RGIA on 23 March 2008, so 1998's commercial-airport destination is Begumpet.
Coordinates are published airport reference points, not directions to a terminal entrance.

## Chronology and representation decisions

| Chapter | Historical basis | What the viewer should not infer |
|---|---|---|
| 1518: Golconda | Beginning of Qutb Shahi rule; the fort has older, including 14th-century, layers. | The completed surviving fortification circuit did not necessarily exist in 1518. Charminar, the royal tombs, Purana Pul and Hussain Sagar are not shown yet. |
| 1591: a new capital | Muhammad Quli Qutb Shah founded Hyderabad; Charminar marks the intersection of four cardinal avenues. | Secondary streets and founding-era houses are not a surveyed plan. Popular plague-related origin stories are not treated as settled fact. |
| 1687: empire shifts | Mughal conquest of Golconda ends Qutb Shahi sovereignty. | A change in sovereignty does not instantly replace the architecture. Mecca Masjid was still unfinished, so its complete model is withheld. |
| 1763: the Nizams | Return of the Asaf Jahi capital from Aurangabad, commonly dated 1763; a Telangana government document instead gives 1769. | The date disagreement is unresolved. This is a mid-century narrative chapter, not an exact single-year reconstruction. Chowmahalla began in 1750, but its later complete ensemble is not placed here. |
| 1908: the great flood | The catastrophic Musi flood of 28 September, and the subsequent turn toward flood control and civic rebuilding. | There is no verified inundation polygon. The scene is a chapter about the event, not a simulation or depiction of the city at flood peak. The later High Court and Arts College are absent. |
| 1948: integration into India | Hyderabad State's integration on 17 September following Operation Polo. The official High Court history records the integration date. | The urban fabric did not transform overnight. India was not yet a republic in 1948. This short atlas chapter is not a complete account of the conflict or its human consequences. |
| 1998: Cyberabad | Cyber Towers and the early HITEC City milestone. A secondary commercial directory records a November 1998 opening. | The opening has not been confirmed here against an original inauguration record. The mature western skyline, later Metro and 2008 airport must not be projected back into 1998. |
| 2025: many Hyderabads | A polycentric metropolitan narrative, with historic anchors and a stronger western technology corridor. | The scene is not a live map of 2025 buildings, a development census, or the complete HMDA jurisdiction. |

## Monument chronology caveats

- **Golconda and the Qutb Shahi Tombs:** UNESCO's Tentative List submission describes the
  successive capitals, 14th-century upper fortifications, architectural synthesis and earliest
  royal tomb of Sultan Quli, who died in 1543. This is a Tentative List entry, not a claim of
  inscription as a World Heritage Site. Tomb groups are phased and simplified.
- **Mecca Masjid:** Telangana Tourism gives 1614-1693. Other accounts give 1617 and 1694.
  The field note retains the range; a conservative 1694 gate avoids displaying the complete mosque in 1687.
- **Chowmahalla:** the district source gives a 1750 start and major completion during 1857-1869.
  The complete miniature is gated to 1869; its absence in 1763 does not imply an empty site.
- **Koti Residency:** approximately 1797-1805; compound boundaries and later campus additions
  are not reconstructed. The World Monuments Fund documents the site's heritage.
- **Falaknuma:** 1884-1893 construction chronology; palace history is distinguished from its
  much later use as a restored hotel.
- **High Court:** construction is conventionally dated 1915-1919 and inauguration to 1920.
  The court's official institutional history records establishment in 1919. Those are different
  milestones. The complete building is conservatively gated to 1920.
- **Osmania:** the university was founded in 1917. Its own history says the Arts College was
  inaugurated in 1938; other accounts use 1939. The discrepancy is disclosed, and the model is
  conservatively gated to 1939. The approximate coordinate listing is not an architectural survey.
- **Hussain Sagar and Buddha:** lake construction is given as 1562 by the district source,
  commonly 1563 elsewhere; the scene uses the later gate. The statue belongs to 1992, not the
  founding lake landscape. The hand-drawn outline is only an orientation guide.

## Principal references

The full clickable bibliography is also embedded in `src/data.ts` and the application's
**Research & sources** ledger. Links support historical claims, not the invented surrounding geometry.

1. [UNESCO: Qutb Shahi monuments, Tentative List 5573](https://whc.unesco.org/en/tentativelists/5573/)
2. [Deccan Heritage Foundation: Hyderabad and Golconda](https://www.deccan-heritage-foundation.org/heritage-sites/hyderabad/)
3. [Telangana Tourism: Mecca Masjid](https://tourism.telangana.gov.in/attractions/mecca-masjid)
4. [Hyderabad District: Chowmahalla Palace](https://hyderabad.telangana.gov.in/tourist-place/chowmahalla-palace/)
5. [Hyderabad District: Hussain Sagar Lake](https://hyderabad.telangana.gov.in/tourist-place/hussain-sagar-lake/)
6. [Osmania University: origin and history](https://www.osmania.ac.in/aboutus-originandhistory.php)
7. [World Monuments Fund: former British Residency](https://www.wmf.org/projects/veeranari-chakali-ilamma-womens-university)
8. [Telangana High Court: institutional history](https://tshc.gov.in/processMenuTypes?id=257)
9. [Cohen, B. B. (2011), "Modernising the Urban Environment: The Musi River Flood of 1908 in Hyderabad, India"](https://www.jstor.org/stable/41303522), *Environment and History* 17(3), 409-432. Full text may require institutional access; not every page was available during research.
10. [Telangana RTI background document containing the alternative 1769 date (PDF)](https://cmc.telangana.gov.in/Documents/09022026151924RTI_2026.pdf)
11. [CIRIL: Cyber Towers building details](https://officespace.ciril.in/Hyderabad/office-spaces/CyberTower/102). Secondary commercial listing; lower confidence than primary archival evidence.
12. [HMDA](https://www.hmda.gov.in/). Used for planning context, not a historic built-up-area claim.

Institutional sources also contain simplifications and occasional inconsistencies. Where a
conflict was found, the atlas keeps it visible rather than selecting a convenient date silently.

## Everyday life and connected-city references

Every everyday-life passage is marked **a reconstructed street scene**, not a documented
individual testimony or a universal resident experience. Workshop fronts, roof forms, trees,
road widths, building density and movement patterns are interpretive design choices.
No verified street-level domestic survey was obtained for the early chapters. The later
chapters are not a substitute for household, transport or infrastructure-access research.

- [Kevin B. Haynes, *The Urban Morphology of Hyderabad, India: A Historical Geographic Analysis*](https://scholarworks.wmich.edu/masters_theses/5155/).
  The accessible master's-thesis abstract discusses 1687-2019 and a change from a north-south
  toward an east-west urban pattern. It supports the connected-city narrative, not a particular
  district density. No underlying map was traced, and it does not verify a 2025 building inventory.
- [LACMA manuscript illustration](https://collections.lacma.org/object/224364).
  The manuscript is dated 1610-1611, with the illustration probably added around 1700.
  Its elephant-mounted ruler is evidence of elite representation, not ordinary transport
  proportions or a panoramic record of early Hyderabad.
- [The Deccan Archive Foundation, *Hyderabad in Color*](https://www.thedeccanarchive.com/projects-7).
  An accessible caption identifies Osmania General Hospital viewed from Osmania Park in
  September 1948, credited to Jack Birns. That supports a specific place relationship.
  The photograph is linked rather than reproduced; no reuse licence was assumed.
- [Aga Khan Development Network, cultural development in India](https://the.akdn/en/where-we-work/south-asia/india/cultural-development-india).
  Documents conservation of the Qutb Shahi royal tombs. The later model's repaired surfaces
  express conservation without claiming that all tombs reached one identical condition.

Golconda's changes distinguish roofed compounds from surviving walls and open ruins.
The exact damaged masonry and intermediate wear are not archaeologically mapped. In particular,
the 1687 conquest does not trigger instantaneous ruins. Charminar's later clock faces are
omitted from early models. Maintained monuments do not automatically deteriorate with age.

## City-statistics method

The fact cards distinguish the chapter year from a population record's reference year.
No interpolation is used to turn an older census into a chapter-year estimate. Missing
population data means no defensible figure was established in the sources used, not zero
population or proof that no relevant research exists.

| Chapter | Benchmark shown | Boundary and evidence |
|---|---|---|
| 1908 | 448,466 in 1901 | The original 1901 census report explicitly combines the City and Chadarghat municipalities, Secunderabad and Bolarum cantonments, and Residency Bazaars. |
| 1948 | 739,159 in 1941 | The original 1941 census tables identify Hyderabad City (M+C). Notes include the British-administered Secunderabad, Trimulgherry and Bolarum areas and 75 suburban villages, versus 46 in 1931. |
| 2025 | 7,674,689 in 2011 | A provisional urban-agglomeration benchmark republished by the independent Census2011.co.in website. This is secondary evidence, not an original government table, a final-census value, or a 2025 estimate. |

The two historical values and their boundary descriptions were read in the digitized
publications' OCR text, not inferred from search snippets:

- [1901 census report](https://archive.org/details/in.ernet.dli.2015.63122):
  [searchable OCR](https://archive.org/download/in.ernet.dli.2015.63122/2015.63122.Census-Of-India-1901-Volxxii-Hyderabad-Part-I-Report_djvu.txt).
  The passage beginning "Hyderabad City itself" gives the total and component table.
- [1941 census tables](https://archive.org/details/in.ernet.dli.2015.101551):
  [searchable OCR](https://archive.org/download/in.ernet.dli.2015.101551/2015.101551.Census-Of-India-1941-Vol-xxi-Heh-The-Nizams-Dominions-hyd-State_djvu.txt).
  Boundary notes 4 and 6 and the Hyderabad City (M+C) population row establish the scope.
- [2011 urban-agglomeration republication](https://www.census2011.co.in/census/metropolitan/342-hyderabad.html)
  and its linked [municipal-city page](https://www.census2011.co.in/census/city/392-hyderabad.html).
  The city page identifies its figures as provisional; later website forecasts are not used.

These changing boundaries cannot support a like-for-like population trend chart.
Hyderabad district, municipal city, urban agglomeration and HMDA jurisdiction are not
interchangeable. City age is arithmetic from the sourced 1591 founding date; Golconda is older.
Modelled landmarks and neighbourhood zones are separately labelled atlas coverage, not urban
demographic statistics. The NIUA *Handbook of Urban Statistics 2022* inspected during research
was state/UT-level and was not used as a Hyderabad population source.

## Learning expeditions and visual treatment

Each chapter has two scouting objectives and one question based on the documented chronology
or an explicit reconstruction limit. Explanations retain disputed dates and unknowns rather
than rewarding invented certainty. Hints and retries have no penalty. Eight badges and 24
objectives are stored in browser-local storage; no account, server ranking or personal tracking
is used. Storage errors are surfaced, and progress can still work within the current visit.

The original procedural surface maps depict neutral material variation; they are not scanned
historic plaster or measured weathering. Clustered vegetation, atmospheric sky, lighting,
market props and moving figures remain artistic interpretation. No commercial strategy-game
assets, audio or copied visual designs are bundled.

## Video reference and asset provenance

The supplied [video](https://www.youtube.com/watch?v=A4BUbpKdenc) is titled
**"GPT-6 Astra with Peter Gostev"**, published by OpenAI, with a duration of 2:39.
Its accessible description refers to a 3D London that moves through historical eras.
The transcript was unavailable during research. Specific controls, dates, source datasets,
rendering methods and asset provenance in that example were not independently established.
The atlas borrows the broad time-navigation idea, not any London assets or code.

All bundled architectural miniatures and surfaces are generated from original procedural code.
Geographic mode separately streams the credited map, elevation and Landsat sources above.
No Google imagery, commercial game assets or copied monument models are used.
Source texts are paraphrased and linked; not reproduced wholesale.

Photorealistic, defensible reconstruction would require licensed archival imagery and maps,
measured terrain and architectural scans, expert review, and an asset-production pipeline.
Those inputs are not replaced here by invented historical certainty or a claim of AAA graphics.

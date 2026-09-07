# Hyderabad Time Atlas

**What if your history lesson came with a time machine?**

Think **Age of Empires-style city exploration**, but the mission is to discover how
Hyderabad has looked and changed over the centuries: a stylized historical
reconstruction, not a combat game.

Walk through Hyderabad before Charminar existed. Watch a fortified capital become a city
of bazaars, palaces, universities and technology corridors. Then jump five centuries
forward and find what survived.

### [Step into the time machine →](https://mkjsanghvi29.github.io/hyderabad-time-atlas/)

Free to explore in your browser. No account, installation or API key. Geographic maps
stream public map data; the illustrated atlas also works offline.

[![Explore Charminar in the founding city of 1591](docs/images/charminar-1591.png)](https://mkjsanghvi29.github.io/hyderabad-time-atlas/?year=1591&place=charminar)

## Pick your adventure

- **Time traveller:** eight chapters, from Golconda in **1518** to metropolitan Hyderabad in **2025**.
- **City-growth spotter:** 1998 opens as an illustrated 3D city. Choose **1998 satellite reference** to compare real **1998 and 2025 Landsat observations**. These are zoom-limited, top-down overviews—not street photography.
- **Street explorer:** discover mapped streets, building footprints and terrain. Search Hyderabad's landmarks, parks, streets and other places by name—or choose **any point**. The handful of atlas pins are not the limits.
- **History detective:** tackle **24 mini-challenges**, follow field hints and collect **eight chapter badges**. Mistakes cost nothing; progress stays in your browser.
- **Pattern spotter:** keep a monument selected as time changes. Notice changing buildings, city milestones and source-linked population benchmarks.
- **Story collector:** open **City life** for period-specific stories and surprising details, with sources to follow when curiosity strikes.

## Less memorising. More discovering.

This is an experiment in making history something you **do**, not just something you read.
For classrooms, families and curious solo explorers, it could turn a lesson into a field
trip: navigate, notice a change, ask why, and follow the evidence.

**Try this five-minute history quest:**

1. Visit **1591** and scout Charminar and the older river crossing.
2. Select **Golconda Fort**, choose **Keep this place as time changes**, and jump to **2025**. Choose **Illustrated atlas** to compare the historical models. What changed?
3. Open **Challenges**. Earn a badge, then ask which parts of the scene are documented and which are reconstruction.

The teaching potential goes beyond dates: geography, urban change, heritage conservation
and learning to question a source. Teacher-designed quests and multilingual lesson trails
are possibilities for the future, not features already built.

> **A time machine with footnotes.** This is a stylized, source-linked interpretation, not
> photorealism or a surveyed digital twin. The modern map uses current geographic data;
> building coverage varies and some heights are estimated. The illustrated historical
> streets are reconstruction. Population records keep their actual census dates and
> boundaries. [Read the research behind the reconstruction.](RESEARCH.md)

<details>
<summary><strong>Run your own time machine</strong></summary>

Requires Node.js 22.12+ and npm.

```bash
git clone https://github.com/mkjsanghvi29/hyderabad-time-atlas.git
cd hyderabad-time-atlas
npm ci --legacy-peer-deps
npm run dev
```

The legacy peer flag works around an npm resolver issue with the build-plugin peers.

```bash
npm test
npm run build
```

Open **`dist/index.html`** for the illustrated offline edition. The historical models,
stories and challenges are embedded. Geographic maps, imagery, elevation and external
source links require internet access.

In the modern geographic view, type a place name and press **Go** to search beyond the
atlas collection. Submitted names go to Photon; typing and coordinate entry stay local.
Search uses current OpenStreetMap records, not a historical directory. Public map/search
services are best-effort; coverage varies and a large deployment should use its own provider.

Built with React, TypeScript, Three.js and MapLibre. Original historical miniatures;
credited OpenStreetMap/OpenFreeMap cartography and Mapterhorn terrain. No commercial
game assets. GitHub Actions publishes `main` to GitHub Pages automatically.

Browser journeys: `npx playwright install chromium`, then `npm run test:e2e`.
Include live map-provider journeys with `ATLAS_LIVE_MAPS=1 npm run test:e2e`.

</details>

# Hyderabad Time Atlas

**What if your history lesson came with a time machine?**

Walk through Hyderabad before Charminar existed. Watch a fortified capital become a city
of bazaars, palaces, universities and technology corridors. Then jump five centuries
forward and find what survived.

### [Step into the time machine →](https://mkjsanghvi29.github.io/hyderabad-time-atlas/)

Free to explore in your browser. No account, installation or API key.

[![Explore Charminar in the founding city of 1591](docs/images/charminar-1591.png)](https://mkjsanghvi29.github.io/hyderabad-time-atlas/?year=1591&place=charminar)

## Pick your adventure

- **Time traveller:** eight chapters, from Golconda in **1518** to metropolitan Hyderabad in **2025**.
- **Street explorer:** orbit above the city or walk through **25 interpreted neighbourhood zones**. Try golden hour, then after dark.
- **History detective:** tackle **24 mini-challenges**, follow field hints and collect **eight chapter badges**. Mistakes cost nothing; progress stays in your browser.
- **Pattern spotter:** keep a monument selected as time changes. Notice changing buildings, city milestones and source-linked population benchmarks.

## Less memorising. More discovering.

This is an experiment in making history something you **do**, not just something you read.
For classrooms, families and curious solo explorers, it could turn a lesson into a field
trip: navigate, notice a change, ask why, and follow the evidence.

**Try this five-minute history quest:**

1. Visit **1591** and scout Charminar and the older river crossing.
2. Select **Golconda Fort**, choose **Keep this place as time changes**, and jump to **2025**. What changed? What stayed?
3. Open **Challenges**. Earn a badge, then ask which parts of the scene are documented and which are reconstruction.

The teaching potential goes beyond dates: geography, urban change, heritage conservation
and learning to question a source. Teacher-designed quests and multilingual lesson trails
are possibilities for the future, not features already built.

> **A time machine with footnotes.** This is a stylized, source-linked interpretation, not
> photorealism or a surveyed digital twin. Streets and city density are illustrative;
> population records retain their actual census years and boundaries. Missing evidence
> stays missing. [Read the research behind the reconstruction.](RESEARCH.md)

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

Open **`dist/index.html`** for the standalone offline edition. Everything needed to
explore is embedded; only external source links need the internet.

Built with React, TypeScript and Three.js. Original procedural models and textures;
no commercial game assets or remote map tiles. GitHub Actions builds and publishes
`main` to GitHub Pages automatically.

Browser journeys: `npx playwright install chromium`, then `npm run test:e2e`.

</details>

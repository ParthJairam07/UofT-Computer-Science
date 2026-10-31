# UofTea

An open, self-study map of the UTSC Software Engineering curriculum — all 41 computer
science, mathematics and statistics courses, each with an ordered route built from free,
public material.

UofTea is an unofficial, independent project. It is not affiliated with or endorsed by
the University of Toronto. Course structure and resource recommendations come from
independent research; nothing here is an official equivalency.

## What it is

- **41 course routes** — prerequisites, a main route, an ordered topic→resource map,
  practice work, a suggested mastery task, and honest notes on access & limits.
- **A six-stage roadmap** — the recommended order of study from foundations to
  systems/compiler depth.
- **One map** — the whole curriculum as a dependency graph you can pan, zoom and trace.
- **⌘K search** — instant jump to any course, topic or resource.

## Stack

- [Astro](https://astro.build) — static site, ships almost no JS
- [Three.js](https://threejs.org) — ambient hero field
- [GSAP](https://gsap.com) + [Lenis](https://lenis.dev) — motion & scroll
- [d3-force](https://d3js.org) — course map layout (custom canvas renderer)
- [Pagefind](https://pagefind.app) — build-time full-text search
- Newsreader · Instrument Sans · IBM Plex Mono (self-hosted via Fontsource)

## Development

```bash
npm install
npm run dev        # parses content/learning-paths.md → src/data/*.json, then astro dev
npm run build      # parse → astro build → pagefind index
npm run preview    # serve the production build
```

`content/learning-paths.md` is the single source of truth. `scripts/parse-content.mjs`
turns it into structured JSON (sections, stages, dependency edges) at build time — edit
the markdown, rebuild, and the whole site reorganizes itself.

## Contributing

Ideas, corrections and route improvements welcome. The most valuable contributions:

- better or updated public resources for a course
- fixes to the curriculum mapping
- new self-study paths for other programs

## License

MIT — see [LICENSE](LICENSE). Content routes are research recommendations; linked
materials keep their own licences.

# Idle: Dynasty Builder

A browser-based idle/strategy game. Build a village, manage people and resources, explore the world, and grow a dynasty over generations.

## Run it

```bash
npm install           # if needed
npm run dev           # serves the repo at http://localhost:8000
```

Open the game at:
- http://localhost:8000/public/game.html

Build helpers:
```bash
npm run build:wiki    # compile docs/wiki into src/config/wikiData.js
npm run build         # build wiki + sync public/version.json and public/wikiData.js
```

## Where things live

- src/
  - systems/
    - core/ — event bus, game state, skills, stats integration
    - ui/ — modals, popups, message history
    - gameplay/ — village, battle, quests, world manager, throne, monarch
    - management/ — population, jobs, construction, tiles, inventory, effects, royal family, building effects
    - features/ — tutorial, achievements, unlocks, building tutorial
  - config/ — gameData.js (constants), wikiData.js (auto‑generated)
  - world/ — terrain config, renderer, pathfinding
  - utils/ — debug tools and error recovery
  - app.js — app wiring
  - main.js — entry
- public/ — html/css and build outputs (wikiData.js, version.json)
- debug/ — quick test pages and scripts (see below)
- scripts/ — build and utility scripts
- docs/ — design notes and guides

## Core ideas (short version)

- No freebies. New games start with 0 buildings and 0 capacity.
- All functionality comes from buildings you construct.
- Jobs only exist when buildings provide them.
- Construction is work‑point based; assign builders to make progress.
- Save/load uses localStorage; state should always validate on load.

If you’re unsure about a change, check `docs/PROJECT_RULES.md` first.

## Handy debug pages

- debug/test-new-game.html — sanity check a fresh game and reset behavior
- debug/test-deployment.html — verify version.json and wikiData.js load in different paths
- debug/debug-job-system.js — paste into console to diagnose job system setup

## Notes for development

- EventBus drives cross‑system communication.
- `src/config/wikiData.js` is generated from `docs/wiki/` (don’t edit by hand).
- `public/wikiData.js` and `public/version.json` are build outputs.
- The game loads scripts directly in `public/game.html` (no bundler).

## Roadmap (high level)

Near‑term
- Standardize ES module imports/exports.
- Tighten error handling and state validation.
- Improve debug/diagnostic output.
- Document system boundaries and dependencies.

Next
- Building specializations and multi‑building projects.
- Deeper population skills and morale.
- Expedition prep, equipment, and longer quest chains.
- Performance passes on eventing and rendering.

Later
- Bigger worlds with biomes and seasons.
- Tactical battle improvements and diplomacy.
- Tech/research progression and economy depth.
- TypeScript + automated tests.

## License

MIT

# Copilot Instructions — Idle: Dynasty Builder

## Architecture Overview

Browser-based idle/strategy game with **no bundler** — scripts load via `<script>` tags in [public/game.html](public/game.html) in strict dependency order. All systems expose themselves as `window.*` globals and discover each other defensively (`if (window.X)`). Cross-system communication uses `window.eventBus` (pub/sub).

### Legacy Dual-Data System (migration in progress)

The codebase has two parallel data systems for buildings. The legacy `GameData` object in `src/config/gameData.js` stores `buildingCosts`, `buildingProduction`, `constructionPoints`, `buildingInfo`, and `buildingCategories` as flat lookup tables. The newer reactive model layer (`BuildingRegistry`, `ResourceModel`, `DataModel`) stores the same data in `BUILDING_DATA` definitions loaded from `src/config/buildingData.js`.

**Why both still exist:** `ModelBridge` only intercepts 4 `gameState` methods (`canAfford`, `isBuildingUnlocked`, `getBuildingCosts`, `spendResources`). However, ~37 call sites across `village.js`, `jobManager.js`, `gameState.js`, and `economySystem.js` read `GameData.building*` properties **directly** — not through `gameState`. The helper methods `calculatePopulationCap()` and `calculateSeasonalStorageCap()` also internally read from `GameData.buildingProduction`. Until those call sites are converted, both systems must stay in sync.

**Migration goal:** Eliminate `GameData.buildingCosts`, `buildingProduction`, `constructionPoints`, `buildingInfo`, and `buildingCategories` by routing all reads through `BuildingRegistry.getDefinition()`. The heaviest file to convert is `village.js` (~25 legacy reads). New code should prefer `BuildingRegistry` when possible.

## Critical: Dual Registration for Buildings

Building data lives in **three places that must be updated together** (until migration completes):

1. **`src/config/buildingData.js`** (`BUILDING_DATA`) — costs, construction points, jobs, unlock conditions, category. The canonical source.
2. **`src/config/gameData.js`** — parallel definitions in `buildingCosts`, `buildingProduction`, `constructionPoints`, `buildingInfo`, and `buildingCategories`. Legacy code reads from here.
3. **`src/systems/features/unlockSystem.js`** — `registerUnlock()` calls in `initializeUnlockConditions()` with separate `conditions` array.

When adding or modifying a building, update all three. If unlock conditions differ between `buildingData.js` and `unlockSystem.js`, unlocks break silently. If a building should be available from game start, set `startsUnlocked: true` in `buildingData.js` AND add it to `this.unlockedContent` in the `UnlockSystem` constructor.

## Adding a New Job

Jobs are defined in **four parallel places** that must stay in sync:

1. **`src/config/jobData.js`** (`JOB_DATA`) — canonical definition: `name`, `icon`, `description`, `buildingType` (key into `BUILDING_DATA`, or `null` for global jobs like builder/gatherer), `production` (resource→amount/worker/day), `consumption`, optional `seasonalModifiers`, `requiredSkill`, `skillGained`, `bonuses`.
2. **`src/config/buildingData.js`** — the host building's `production.jobs` object: `{ jobKey: slotCount }`.
3. **`src/config/gameData.js`** — mirror the same slots in `GameData.buildingProduction[buildingKey].jobs` (this is what `JobManager` actually reads at runtime).
4. **`src/systems/management/jobManager.js`** — add a `this.jobEfficiency.set('jobKey', { ... })` line in `initializeJobEfficiency()` matching the production/consumption rates.

If the job produces/consumes a new resource, also define it in `src/config/resourceData.js`.

## Core Design Constraints (from `docs/PROJECT_RULES.md`)

- **Zero-base start:** New games begin with 0 buildings, 0 capacity, 5 villagers (1 royal + 4 basic). No auto-placed buildings, no free infrastructure.
- **Buildings drive everything:** Jobs, capacity, and storage only come from constructed buildings. No `Math.max(cap, 1)` fallbacks.
- **Work-point construction:** Buildings require builder assignment and daily work-point accumulation. No instant builds.
- **Player agency:** Never auto-place buildings or auto-assign jobs. All decisions are manual.

## Dev Workflow

```bash
npm run dev           # Serve at http://localhost:8000, open /public/game.html
npm run test:run      # Run vitest tests (jsdom environment)
npm run build:wiki    # Compile docs/wiki/ → src/config/wikiData.js (don't edit wikiData.js by hand)
```

## Script Load Order (game.html)

Order matters — each phase depends on the scripts above it.

| Phase | Scripts | Purpose |
|-------|---------|---------|
| **Config** | `gameData.js` → `buildingData.js` → `resourceData.js` → `jobData.js` + dynamic `wikiData.js` | Pure data, no dependencies |
| **Core/Model** | `eventBus.js` → `dataModel.js` → `buildingModel.js` → `resourceModel.js` → `jobModel.js` → `modelInit.js` → `modelBridge.js` | EventBus first, then reactive models, then bridge |
| **World data** | `worldData.js` | World config (5×5 map, terrain types, enemy spawn config) |
| **State** | `skillSystem.js` → `populationManager.js` → `gameState.js` → `effectsManager.js` → `errorRecovery.js` → `storageManager.js` | Core state and management |
| **UI** | `modalSystem.js` → `messageHistory.js` | Modal and notification infrastructure |
| **Features** | `achievements.js` → `unlockSystem.js` → `techTree.js` → `tutorial.js` | Achievement/unlock/tutorial systems |
| **Managers** | `royalFamily.js` → `buildingEffects.js` → `buildingTutorial.js` → `constructionManager.js` → `jobManager.js` → `tileManager.js` → `economySystem.js` → `legacySystem.js` | Game logic managers |
| **Gameplay** | `village.js` → `throne.js` → `battle.js` → `monarch.js` | View-specific gameplay |
| **UI glue** | `uiPopups.js` → `uiBindings.js` → `eventBusIntegrations.js` | UI wiring, event cross-connections |
| **World map** | `terrain.js` → `pathfinding.js` → `mapRenderer.js` → `worldManager.js` → `villageDefense.js` | Terrain helpers, renderer, then WorldManager (contains enemy system) |
| **Boot** | `app.js` → `main.js` | Game class + `DOMContentLoaded` → `initializeGame()` |

## Testing Conventions

Tests live in `tests/` using Vitest + jsdom. Two patterns:
- **Integration:** Import `GameStateTestable` from `src/systems/core/gameState.testable.js` — a Node-friendly shim without DOM/global dependencies. Use `localStorage.clear()` in `beforeEach`.
- **Unit:** Define pure logic inline and test in isolation.

`GameStateTestable` must be kept in sync with the real `GameState` — it mirrors save/migration semantics with stubbed managers.

## Key Patterns

- **EventBus events:** `dayEnded`, `building_placed`, `building:completed`, `achievement:earned`, `resources-updated`, `population-changed`, `game-initialized`, `stateRestored`. Systems subscribe in their constructors or in `eventBusIntegrations.js`.
- **Save system:** Versioned via `SAVE_SCHEMA_VERSION` in `gameState.js`. Migrations in `SAVE_MIGRATIONS` are forward-only (version N → N+1). Future-version saves load read-only. Always preserve unknown fields.
- **StorageManager guards:** `StorageManager.isHardResetInProgress()` blocks all reads/writes during reset. Check this flag before saving.
- **Defensive initialization:** Always guard with `if (window.systemName)` before using another system — load order isn't guaranteed for all combinations.

## Directory Structure

| Path | Purpose |
|------|---------|
| `src/systems/core/` | EventBus, GameState, reactive models (DataModel, BuildingModel), ModelBridge |
| `src/systems/gameplay/` | Village, battle, throne, monarch, world — view-specific game logic |
| `src/systems/management/` | Population, jobs, construction, economy, effects, tiles |
| `src/systems/features/` | Tutorial, achievements, unlock system |
| `src/systems/ui/` | Modal system, toast/popup notifications, UI bindings |
| `src/config/` | GameData constants, BuildingData definitions, JobData, ResourceData |
| `src/world/` | Map rendering, pathfinding, terrain, units |
| `debug/` | Browser-based test pages and diagnostic scripts (paste into console) |
| `docs/` | Design docs; `docs/wiki/` compiles to `wikiData.js` |
| `public/` | game.html (entry point), CSS, build outputs |

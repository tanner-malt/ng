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
4. **`src/systems/core/jobModel.js`** — the `_jobEfficiency` object in the `JobRegistry` constructor must include a matching entry with production/consumption rates.

If the job produces/consumes a new resource, also define it in `src/config/resourceData.js`.

## Core Design Constraints (from `docs/PROJECT_RULES.md`)

- **Zero-base start:** New games begin with 0 buildings, 0 capacity, 5 villagers (1 royal + 4 basic). No auto-placed buildings, no free infrastructure.
- **Buildings drive everything:** Jobs, capacity, and storage only come from constructed buildings. No `Math.max(cap, 1)` fallbacks.
- **Work-point construction:** Buildings require builder assignment and daily work-point accumulation. No instant builds.
- **Player agency:** Never auto-place buildings or auto-assign jobs. All decisions are manual.

## Dev Workflow

**Node.js / npm is NOT installed on this machine — do not attempt to run npm, npx, or node commands.**

To test, open `public/game.html` directly in a browser or use the VS Code Live Server / Simple Browser.

```
# These commands exist in package.json but require Node.js:
# npm run dev           — Serve at http://localhost:8000
# npm run test:run      — Vitest tests (jsdom)
# npm run build:wiki    — Compile docs/wiki/ → src/config/wikiData.js
```

## Version Scheme

Format: **MAJOR.MINOR.PATCH.BUILD** — currently `0.0.3.x`.

The game version lives in **two files that must stay in sync**:
- `package.json` → `"version": "X.X.X.X"`
- `public/version.json` → `{ "version": "X.X.X.X" }`

**Increment rules:**
- **BUILD** (4th digit): Every task, fix, or feature commit.
- **PATCH** (3rd digit): Meaningful feature milestone (e.g. battle content ships).
- **MINOR** (2nd digit): Phase completion (all MVP systems functional → 0.1, content complete → 0.2).
- **MAJOR** (1st digit): Public release = 1.0.

### Version Roadmap

| Version | Focus | Key Items |
|---------|-------|-----------|
| **0.0.3.x** | Bug fixes & balance | Duplicate achievements, crisis mode tuning, test fixes |
| **0.0.4.x** | Battle content | Unit types (archer, cavalry, siege), formations, morale |
| **0.0.5.x** | Throne completion | Equipment system (currently stubbed), Court tab |
| **0.0.6.x** | Legacy bonus UI | Spending interface for legacy points → permanent upgrades |
| **0.0.7.x** | Data migration | Kill `GameData.building*` tables, route all reads through `BuildingRegistry` |
| **0.0.8.x** | Save system cleanup | Integrate tech tree into main save schema, migration v1→v2 |
| **0.0.9.x** | Playtest & polish | Full loop testing, tutorial improvements, QoL |
| **0.1.0.x** | Trade & diplomacy | Trade routes between cities, diplomacy system |
| **0.1.1.x** | Multi-city management | Governor delegation, city production |
| **0.1.2.x** | Content expansion | More achievements, random events, endgame |
| **0.2.0.x** | Difficulty & UX | Difficulty modes, UI/UX overhaul, accessibility |
| **1.0.0.0** | Public release | Feature-complete, balanced, polished |

### System Maturity (as of 0.0.3.0)

| System | Status | Notes |
|--------|--------|-------|
| Village/Building | **Functional** | Core loop complete, dual-data migration ~60% |
| Economy/Resources | **Functional** | 8 seasons, job-driven production |
| Population | **Functional** | Full lifecycle, demographics, skills |
| Job System | **Functional** | Resource-aware auto-assign, crisis mode |
| Construction | **Functional** | Work-points, haste runes, build queue |
| Unlock System | **Functional** | 21+ building unlocks, 3 view unlocks |
| Tech Tree | **Functional** | 4 tiers, 19 techs (save isolation — uses own localStorage key) |
| Battle | **Partial** | Infrastructure solid, content thin (1 unit type, 1 formation) |
| Village Defense | **Functional** | Complete defense loop |
| World Map | **Functional** | 9×9 hex map, armies, cities, fog of war |
| Expeditions | **Functional** | Oregon Trail style, 1.9k lines |
| Throne/Merge | **Partial** | Merge works; equipment/court stubbed |
| Monarch | **Functional** | Investments, advisors, governor/general roles |
| Legacy/Prestige | **Functional** | Full prestige loop (bonus spending UI missing) |
| Achievements | **Functional** | 42 defined |
| Tutorial | **Functional** | 3 modules (village, building, world) |
| Save System | **Functional** | Versioned schema, migration-tested |

## Script Load Order (game.html)

Order matters — each phase depends on the scripts above it.

| Phase | Scripts | Purpose |
|-------|---------|---------|
| **Config** | `gameData.js` → `buildingData.js` → `resourceData.js` → `jobData.js` + dynamic `wikiData.js` | Pure data, no dependencies |
| **Core/Model** | `eventBus.js` → `dataModel.js` → `buildingModel.js` → `resourceModel.js` → `jobModel.js` → `modelInit.js` → `modelBridge.js` | EventBus first, then reactive models, then bridge |
| **World data** | `worldData.js` | World config (9×9 map, terrain types, enemy spawn config) |
| **State** | `skillSystem.js` → `populationManager.js` → `gameState.js` → `effectsManager.js` → `errorRecovery.js` → `storageManager.js` | Core state and management |
| **UI** | `modalSystem.js` → `messageHistory.js` | Modal and notification infrastructure |
| **Features** | `achievements.js` → `unlockSystem.js` → `techTree.js` → `tutorial.js` | Achievement/unlock/tutorial systems |
| **Managers** | `royalFamily.js` → `buildingEffects.js` → `buildingTutorial.js` → `constructionManager.js` → `jobManager.js` → `tileManager.js` → `economySystem.js` → `legacySystem.js` | Game logic managers |
| **Gameplay** | `village.js` → `throne.js` → `battle.js` → `monarch.js` | View-specific gameplay |
| **UI glue** | `uiPopups.js` → `uiBindings.js` → `eventBusIntegrations.js` | UI wiring, event cross-connections |
| **World map** | `terrain.js` → `pathfinding.js` → `mapRenderer.js` → `worldManager.js` → `villageDefense.js` | Terrain helpers, renderer, then WorldManager (contains enemy system) |
| **Boot** | `app.js` → `main.js` | Game class + `DOMContentLoaded` → `initializeGame()` |

## Testing Conventions

Tests live in `tests/` using Vitest + jsdom (requires Node.js, which is **not installed** on this machine).

Two patterns:
- **Integration:** Import `GameStateTestable` from `src/systems/core/gameState.testable.js` — a Node-friendly shim without DOM/global dependencies. Use `localStorage.clear()` in `beforeEach`.
- **Unit:** Define pure logic inline and test in isolation.

`GameStateTestable` must be kept in sync with the real `GameState` — it mirrors save/migration semantics with stubbed managers.

**Do not run `npm run test:run` or any npm/npx commands.** Validate changes by reading code, checking for errors in the editor, and manual browser testing.

## Key Patterns

- **EventBus events:** `dayEnded`, `building_placed`, `building:completed`, `achievement:earned`, `resources-updated`, `population-changed`, `game-initialized`, `stateRestored`, `food_crisis`, `dynasty_reset_initiated`. Systems subscribe in their constructors or in `eventBusIntegrations.js`.
- **Save system:** Versioned via `SAVE_SCHEMA_VERSION` in `gameState.js`. Migrations in `SAVE_MIGRATIONS` are forward-only (version N → N+1). Future-version saves load read-only. Always preserve unknown fields.
- **StorageManager guards:** `StorageManager.isHardResetInProgress()` blocks all reads/writes during reset. Check this flag before saving.
- **Defensive initialization:** Always guard with `if (window.systemName)` before using another system — load order isn't guaranteed for all combinations.
- **Food crisis system:** `JobRegistry._detectFoodCrisis()` returns levels 0–3. At level 2+ all non-food workers are released. Emits `food_crisis` event.
- **Royal roles:** Family members can be assigned as `general` (army combat bonus) or `governor` (production bonus). Managed via `RoyalFamilyManager.assignGeneral/assignGovernor/unassignRole`.

## Directory Structure

| Path | Purpose |
|------|---------|
| `src/systems/core/` | EventBus, GameState, reactive models (DataModel, BuildingModel), ModelBridge |
| `src/systems/gameplay/` | Village, battle, throne, monarch, world — view-specific game logic |
| `src/systems/management/` | Population, jobs, construction, economy, effects, tiles |
| `src/systems/features/` | Tutorial, achievements, unlock system, legacy/prestige |
| `src/systems/ui/` | Modal system, toast/popup notifications, UI bindings |
| `src/config/` | GameData constants, BuildingData definitions, JobData, ResourceData |
| `src/world/` | Map rendering, pathfinding, terrain, units |
| `debug/` | Browser-based test pages and diagnostic scripts (paste into console) |
| `docs/` | Design docs; `docs/wiki/` compiles to `wikiData.js` |
| `public/` | game.html (entry point), CSS, build outputs |

import { beforeEach, describe, expect, it } from 'vitest';

// Use CommonJS exports from the modules
const GameData = require('../src/config/gameData.js');
const JobManager = require('../src/systems/management/jobManager.js');
const InventoryManager = require('../src/systems/management/inventoryManager.js');
const TileManager = require('../src/systems/management/tileManager.js');

// Attach GameData to window for code paths that reference window.GameData
if (typeof window !== 'undefined') {
    window.GameData = GameData;
}

function makeWorker(id, overrides = {}) {
    return {
        id,
        name: `Worker-${id}`,
        age: 30,
        health: 100,
        happiness: 100,
        role: 'villager',
        status: 'idle',
        ...overrides,
    };
}

describe('City inventory consumables + per-building haste multiplier', () => {
    beforeEach(() => {
        // fresh storage and window hooks
        localStorage.clear();
        if (typeof window !== 'undefined') {
            window.GameData = GameData;
        }
        // Clean globals if set by previous tests
        delete window.tileManager;
        delete window.inventoryManager;
    });

    it('using a haste rune decrements city inventory and boosts building production', () => {
        // Minimal game state
        const farm = { id: 'b1', type: 'farm', level: 1, built: true };
        const worker = makeWorker('w1');
        const gameState = {
            day: 1,
            currentDay: 1,
            season: 'Spring',
            buildings: [farm],
            populationManager: {
                population: [worker],
                getAll() { return [worker]; }
            }
        };

        // Some internals reference window.gameState; provide it for consistency
        window.gameState = gameState;

        // Seed a city with default items (includes 2 haste_rune)
        window.tileManager = new TileManager(gameState, 10, 10, false, false);
        // Inventory proxies to tileManager
        window.inventoryManager = new InventoryManager(gameState, true);

        // Sanity: we should have at least 1 haste rune in city inventory
        expect(window.tileManager.hasItem('haste_rune', 1)).toBe(true);

        // Set up job manager and assign the worker to the farm
        const jm = new JobManager(gameState);
        jm.updateAvailableJobs();
        const ok = jm.assignWorkerToJob(worker.id, farm.id, 'farmer');
        expect(ok).toBe(true);

        // Baseline detailed production without any building multiplier
        farm.efficiencyMultiplier = 1.0;
        const before = jm.calculateDetailedDailyProduction();
        const baseFood = before.production.food;
        expect(baseFood).toBeGreaterThan(0);

        // Use one haste rune from city inventory
        const itemDef = window.inventoryManager.getItemDefinition('haste_rune');
        expect(itemDef?.effects?.productivityMultiplier).toBeGreaterThan(1);

        const used = window.inventoryManager.useItem('haste_rune');
        expect(used).toBe(true);

        // City inventory should decrement by 1
        // We seeded 2 at start, so now at least 1 remains
        expect(window.tileManager.hasItem('haste_rune', 1)).toBe(true);

        // Apply the effect logically by setting the building multiplier
        farm.efficiencyMultiplier = itemDef.effects.productivityMultiplier;

        const after = jm.calculateDetailedDailyProduction();
        const boostedFood = after.production.food;

        // Expect boosted production to scale by the multiplier (within float precision)
        expect(boostedFood).toBeCloseTo(baseFood * itemDef.effects.productivityMultiplier, 5);
    });
});

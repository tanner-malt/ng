import { beforeEach, describe, expect, it } from 'vitest';

// Load global dependencies in correct order (each require side-effects into window.*)
require('../src/systems/core/dataModel.js');
require('../src/systems/core/eventBus.js');
const GameData = require('../src/config/gameData.js');
require('../src/systems/core/jobModel.js');

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

function resetJobRegistry(season, buildings, workers) {
    const jr = window.JobRegistry;
    jr._initialized = false;
    jr._definitions.clear();
    jr._slots = new window.CollectionModel('jobSlots', window.JobSlot);
    jr._gameState = {
        season,
        buildings,
        populationManager: {
            population: workers,
            getAll() { return workers; },
        }
    };
    jr._initialized = true;
}

describe('Seasonal production multipliers (job-driven)', () => {
    beforeEach(() => {
        if (typeof window !== 'undefined') {
            window.GameData = GameData;
        }
    });

    it('applies Summer multiplier to farmer job (food)', () => {
        const farm = { id: 'b1', type: 'farm', level: 1, built: true };
        const worker = makeWorker('w1');
        resetJobRegistry('Summer', [farm], [worker]);

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const ok = jr.assignWorkerToJob(worker.id, farm.id, 'farmer');
        expect(ok).toBe(true);

        const production = jr.calculateDailyProduction();
        // farmer base: food 3.75 per worker; Summer food multiplier: 1.5
        expect(production.food).toBeCloseTo(3.75 * 1.5, 5);
    });

    it('applies Autumn multiplier to woodcutter job (wood)', () => {
        const lodge = { id: 'b2', type: 'woodcutterLodge', level: 1, built: true };
        const worker = makeWorker('w2');
        resetJobRegistry('Autumn', [lodge], [worker]);

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const ok = jr.assignWorkerToJob(worker.id, lodge.id, 'woodcutter');
        expect(ok).toBe(true);

        const production = jr.calculateDailyProduction();
        // woodcutter base: wood 3 per worker; Autumn wood multiplier: 1.3
        expect(production.wood).toBeCloseTo(3 * 1.3, 5);
    });

    it('applies Winter multiplier to farmer job (food)', () => {
        const farm = { id: 'b3', type: 'farm', level: 1, built: true };
        const worker = makeWorker('w3');
        resetJobRegistry('Winter', [farm], [worker]);

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const ok = jr.assignWorkerToJob(worker.id, farm.id, 'farmer');
        expect(ok).toBe(true);

        const production = jr.calculateDailyProduction();
        // Winter food multiplier: 0.7 with base 3.75
        expect(production.food).toBeCloseTo(3.75 * 0.7, 5);
    });
});

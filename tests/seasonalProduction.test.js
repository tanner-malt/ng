import { beforeEach, describe, expect, it } from 'vitest';

// Use CommonJS exports from the modules
const GameData = require('../src/config/gameData.js');
const JobManager = require('../src/systems/management/jobManager.js');

// Attach GameData to window for code paths that reference window.GameData
if (typeof window !== 'undefined') {
    window.GameData = GameData;
}

function makeWorker(id, overrides = {}) {
    return {
        id,
        name: `Worker-${id}`,
        age: 30, // 1.0 age factor
        health: 100, // 1.0 health factor
        happiness: 100, // 1.0 happiness factor
        role: 'villager',
        status: 'idle',
        ...overrides,
    };
}

function makeGameState(season, buildings, workers) {
    return {
        season,
        buildings,
        populationManager: {
            population: workers,
            getAll() { return workers; },
        }
    };
}

describe('Seasonal production multipliers (job-driven)', () => {
    beforeEach(() => {
        // Ensure GameData is attached before each test
        if (typeof window !== 'undefined') {
            window.GameData = GameData;
        }
    });

    it('applies Summer multiplier to farmer job (food)', () => {
        const farm = { id: 'b1', type: 'farm', level: 1, built: true };
        const worker = makeWorker('w1');
        const gs = makeGameState('Summer', [farm], [worker]);
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
        const ok = jm.assignWorkerToJob(worker.id, farm.id, 'farmer');
        expect(ok).toBe(true);

        const production = jm.calculateDailyProduction();
        // farmer base: food 3.5 per worker; Summer food multiplier: 1.5
        expect(production.food).toBeCloseTo(3.5 * 1.5, 5);
    });

    it('applies Autumn multiplier to woodcutter job (wood)', () => {
        const lodge = { id: 'b2', type: 'woodcutterLodge', level: 1, built: true };
        const worker = makeWorker('w2');
        const gs = makeGameState('Autumn', [lodge], [worker]);
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
        const ok = jm.assignWorkerToJob(worker.id, lodge.id, 'woodcutter');
        expect(ok).toBe(true);

        const production = jm.calculateDailyProduction();
        // woodcutter base: wood 3 per worker; Autumn wood multiplier: 1.3
        expect(production.wood).toBeCloseTo(3 * 1.3, 5);
    });

    it('applies Winter multiplier to farmer job (food)', () => {
        const farm = { id: 'b3', type: 'farm', level: 1, built: true };
        const worker = makeWorker('w3');
        const gs = makeGameState('Winter', [farm], [worker]);
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
        const ok = jm.assignWorkerToJob(worker.id, farm.id, 'farmer');
        expect(ok).toBe(true);

        const production = jm.calculateDailyProduction();
        // Winter food multiplier: 0.7 with base 3.5
        expect(production.food).toBeCloseTo(3.5 * 0.7, 5);
    });
});

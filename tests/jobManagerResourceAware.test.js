import { beforeEach, describe, expect, it } from 'vitest';

// Load global dependencies in correct order
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
        name: `W-${id}`,
        age: 30,
        health: 100,
        happiness: 100,
        role: 'villager',
        status: 'idle',
        skills: {},
        ...overrides,
    };
}

function resetJobRegistry({ season = 'Spring', resources = {}, buildings = [], workers = [], constructionActive = false } = {}) {
    const jr = window.JobRegistry;
    jr._initialized = false;
    jr._definitions.clear();
    jr._slots = new window.CollectionModel('jobSlots', window.JobSlot);
    const constructionSites = new Map();
    if (constructionActive) {
        constructionSites.set('site1', { pointsRemaining: 10 });
    }
    jr._gameState = {
        season,
        resources,
        buildings,
        populationManager: {
            population: workers,
            getAll() { return workers; },
        },
        constructionManager: { constructionSites }
    };
    jr._initialized = true;
}

describe('JobRegistry resource-aware auto-assign', () => {
    beforeEach(() => {
        if (typeof window !== 'undefined') {
            window.GameData = GameData;
        }
    });

    it('does not assign sawyers when wood is too low', () => {
        const mill = { id: 'lm1', type: 'lumberMill', level: 1, built: true };
        const worker = makeWorker('p2');
        resetJobRegistry({ buildings: [mill], workers: [worker], resources: { wood: 2 } });

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const assigned = jr.autoAssignWorkers();

        // No workers should be assigned as sawyers due to wood gating (<3 wood)
        let sawyerCount = 0;
        jr.jobAssignments.forEach((jobs) => { if (jobs.sawyer) sawyerCount += jobs.sawyer.length; });
        expect(sawyerCount).toBe(0);
    });

    it('prioritizes farmers when food is critically low', () => {
        const farm = { id: 'f1', type: 'farm', level: 1, built: true };
        const lodge = { id: 'w1', type: 'woodcutterLodge', level: 1, built: true };
        const worker = makeWorker('p3');
        const allWorkers = [worker];
        // Add 9 more idle workers so pop=10 for urgency calc
        for (let i = 0; i < 9; i++) allWorkers.push(makeWorker('extra' + i));
        // food=5, pop 10 => <1 day buffer -> high urgency
        resetJobRegistry({ buildings: [farm, lodge], workers: allWorkers, resources: { food: 5 } });

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const assigned = jr.autoAssignWorkers();
        expect(assigned).toBeGreaterThanOrEqual(1);

        // Verify at least one farmer
        let farmerAssigned = 0;
        jr.jobAssignments.forEach((jobs) => { if (jobs.farmer) farmerAssigned += jobs.farmer.length; });
        expect(farmerAssigned).toBeGreaterThanOrEqual(1);
    });

    it('chooses the best-fit worker by relevant skills for farmer', () => {
        const farm = { id: 'f2', type: 'farm', level: 1, built: true };
        const skilledFarmer = makeWorker('pf', { skills: { Agriculture: 1000 } });
        const skilledForester = makeWorker('pw', { skills: { Forestry: 1000 } });
        resetJobRegistry({ buildings: [farm], workers: [skilledFarmer, skilledForester], resources: { food: 0 } });

        const jr = window.JobRegistry;
        jr.updateAvailableSlots();
        const assigned = jr.autoAssignWorkers();
        expect(assigned).toBeGreaterThanOrEqual(1);

        // The agriculture-skilled worker should be assigned to farmer
        let farmerWorkerIds = [];
        jr.jobAssignments.forEach((jobs) => { if (jobs.farmer) farmerWorkerIds.push(...jobs.farmer); });
        expect(farmerWorkerIds).toContain('pf');
    });
});

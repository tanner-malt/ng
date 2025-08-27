import { beforeEach, describe, expect, it } from 'vitest';

const GameData = require('../src/config/gameData.js');
const JobManager = require('../src/systems/management/jobManager.js');

// Attach GameData to window for code paths that reference window.GameData
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

function makeGameState({ season = 'Spring', resources = {}, buildings = [], workers = [], constructionActive = false } = {}) {
    const constructionSites = new Map();
    if (constructionActive) {
        constructionSites.set('site1', { pointsRemaining: 10 });
    }
    return {
        season,
        resources,
        buildings,
        populationManager: {
            population: workers,
            getAll() { return workers; },
        },
        constructionManager: { constructionSites }
    };
}

describe('JobManager resource-aware auto-assign', () => {
    beforeEach(() => {
        if (typeof window !== 'undefined') {
            window.GameData = GameData;
        }
    });

    it('releases builders when no construction is active', () => {
        const b = { id: 'bh1', type: 'buildersHut', level: 1, built: true };
        const worker = makeWorker('p1', { status: 'working', jobAssignment: { buildingId: b.id, jobType: 'builder' } });
        const gs = makeGameState({ buildings: [b], workers: [worker], resources: {} });
        const jm = new JobManager(gs);

        // Seed a builder assignment
        jm.jobAssignments = new Map([[b.id, { builder: [worker.id] }]]);

        // Optimize should release builders due to no active construction
        jm.optimizeWorkerAssignments();

        expect(jm.countWorkersInJobType('builder')).toBe(0);
        expect(gs.populationManager.population[0].jobAssignment).toBe(null);
        expect(gs.populationManager.population[0].status).toBe('idle');
    });

    it('does not assign sawyers when wood is too low', () => {
        const mill = { id: 'lm1', type: 'lumberMill', level: 1, built: true };
        const worker = makeWorker('p2');
        const gs = makeGameState({ buildings: [mill], workers: [worker], resources: { wood: 2 } });
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
        const assigned = jm.autoAssignWorkers();

        // No workers should be assigned due to gating (<3 wood)
        expect(assigned).toBe(0);
        let sawyerCount = 0;
        jm.jobAssignments.forEach((jobs) => { if (jobs.sawyer) sawyerCount += jobs.sawyer.length; });
        expect(sawyerCount).toBe(0);
    });

    it('prioritizes farmers when food is critically low', () => {
        const farm = { id: 'f1', type: 'farm', level: 1, built: true };
        const lodge = { id: 'w1', type: 'woodcutterLodge', level: 1, built: true };
        const worker = makeWorker('p3');
        // Pop 10 => dailyFoodUse = 10; food=5 => <1 day buffer -> high urgency
        const gs = makeGameState({ buildings: [farm, lodge], workers: [worker], resources: { food: 5 } });
        // Add 9 more idle workers to reflect population size 10 (urgency uses population count)
        for (let i = 0; i < 9; i++) gs.populationManager.population.push(makeWorker('extra' + i));
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
    const assigned = jm.autoAssignWorkers();
    // At least one worker should be assigned under critical food shortage
    expect(assigned).toBeGreaterThanOrEqual(1);

        // Verify assignment went to farmer
    let farmerAssigned = 0;
    jm.jobAssignments.forEach((jobs) => { if (jobs.farmer) farmerAssigned += jobs.farmer.length; });
    expect(farmerAssigned).toBeGreaterThanOrEqual(1);
    });

    it('chooses the best-fit worker by relevant skills for farmer', () => {
        const farm = { id: 'f2', type: 'farm', level: 1, built: true };
        const skilledFarmer = makeWorker('pf', { skills: { Agriculture: 1000 } });
        const skilledForester = makeWorker('pw', { skills: { Forestry: 1000 } });
        const gs = makeGameState({ buildings: [farm], workers: [skilledFarmer, skilledForester], resources: { food: 0 } });
        // Add more people to set pop for urgency calc (not necessary but fine)
        const jm = new JobManager(gs);

        jm.updateAvailableJobs();
    const assigned = jm.autoAssignWorkers();
    // At least one worker should be assigned to farmer; building may have multiple slots
    expect(assigned).toBeGreaterThanOrEqual(1);

        // The agriculture-skilled worker should be assigned to farmer
        let farmerWorkerIds = [];
        jm.jobAssignments.forEach((jobs) => { if (jobs.farmer) farmerWorkerIds.push(...jobs.farmer); });
    expect(farmerWorkerIds).toContain('pf');
    });
});

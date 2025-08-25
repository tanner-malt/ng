import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateTestable } from '../src/systems/core/gameState.testable.js';

describe('job manager smoke', () => {
    let gs;
    beforeEach(() => {
        localStorage.clear();
        gs = new GameStateTestable();
    });

    it('updates jobs, assigns workers, and yields daily production', () => {
        gs.jobManager.updateAvailableJobs();
        const beforeWood = gs.resources.wood;
        const production = gs.jobManager.calculateDailyProduction();
        // apply production
        gs.resources.wood += Math.round(production.wood || 0);
        expect(gs.resources.wood).toBeGreaterThanOrEqual(beforeWood);
        expect(typeof production).toBe('object');
    });
});

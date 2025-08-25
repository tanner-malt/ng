import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateTestable } from '../src/systems/core/gameState.testable.js';

describe('build queue basics', () => {
    let gs;
    beforeEach(() => {
        localStorage.clear();
        gs = new GameStateTestable();
    });

    it('adds item to queue and creates a construction site building', () => {
        const id = gs.addToBuildQueue('house', 1, 2);
        expect(gs.buildQueue.length).toBe(1);
        const b = gs.buildings.find(x => x.id === id);
        expect(b).toBeTruthy();
        expect(b.level).toBe(0);
        expect(b.built).toBe(false);
    });

    it('processes queue and initializes construction site', () => {
        const id = gs.addToBuildQueue('house', 3, 4);
        gs.processBuildQueue();
        expect(gs.buildQueue.length).toBe(0);
        const b = gs.buildings.find(x => x.id === id);
        expect(b).toBeTruthy();
        expect(b.startedAt).toBeTypeOf('number');
    });
});

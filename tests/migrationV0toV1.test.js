import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateTestable } from '../src/systems/core/gameState.testable.js';

// Simulate a legacy v0 save and ensure it migrates to v1 cleanly.
describe('save migration v0 -> v1', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('migrates missing fields and sets schemaVersion to 1', () => {
        const legacyV0 = {
            // No schemaVersion or using 0 implies v0
            day: 7,
            // buildings may be missing, resources may be partial
            resources: { food: 10 },
        };
        localStorage.setItem('dynastyBuilder_save', JSON.stringify(legacyV0));

        const gs = new GameStateTestable();
        const ok = gs.load();
        expect(ok).toBe(true);

        // Post-migration expectations
        expect(gs.currentDay).toBe(7);
        expect(gs.resources).toMatchObject({ food: 10, wood: 50, stone: 25, metal: 0, production: 0 });
        // Buildings should be an array
        expect(Array.isArray(gs.buildings)).toBe(true);

        // Saving should write a v1 schema
        const saved = gs.save();
        expect(saved).toBe(true);
        const parsed = JSON.parse(localStorage.getItem('dynastyBuilder_save'));
        expect(parsed.schemaVersion).toBe(1);
    });
});

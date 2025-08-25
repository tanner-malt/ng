import { beforeEach, describe, expect, it, vi } from 'vitest';
// Defer require until after setup so globals are in place
let GameStateTestable;

describe('save migration read-only mode', () => {
    beforeEach(() => {
        localStorage.clear();
        // fresh import per test to ensure clean module state
        delete require.cache[require.resolve('../src/systems/core/gameState.testable.js')];
        ({ GameStateTestable } = require('../src/systems/core/gameState.testable.js'));
    });

    it('loads future-version save in read-only mode and prevents saving', () => {
        const futureSave = { schemaVersion: 99, day: 3, buildings: [] };
        localStorage.setItem('dynastyBuilder_save', JSON.stringify(futureSave));

        const gs = new GameStateTestable();
        const ok = gs.load();
        expect(ok).toBe(true);
        expect(gs.readOnlySave).toBe(true);

        const spy = vi.spyOn(localStorage, 'setItem');
        gs.save();
        // Should not attempt to write the main save key
        const calls = spy.mock.calls.filter(c => c[0] === 'dynastyBuilder_save');
        expect(calls.length).toBe(0);
    });
});

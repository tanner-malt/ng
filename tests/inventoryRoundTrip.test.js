import { beforeEach, describe, expect, it } from 'vitest';

// Provide window for modules that check it
if (!globalThis.window) globalThis.window = globalThis;

// Minimal stub with serialize/deserialize
class InventoryManager {
    constructor(gameState, skipDefaults = false) {
        this.gameState = gameState;
        this.items = skipDefaults ? { tent: 0 } : { tent: 5 };
    }
    serialize() { return { items: { ...this.items } }; }
    deserialize(data) { this.items = { ...data.items }; }
}
window.InventoryManager = InventoryManager;

let GameStateTestable;

describe('inventory serialize/deserialize round-trip', () => {
    beforeEach(() => {
        localStorage.clear();
        delete require.cache[require.resolve('../src/systems/core/gameState.testable.js')];
        ({ GameStateTestable } = require('../src/systems/core/gameState.testable.js'));
    });

    it('round-trips inventory data through GameState helpers', () => {
        const gs = new GameStateTestable();
        gs.ensureInventoryManager();
        gs.inventoryManager.items.tent = 3;

        const snap = gs.toSerializable();

        const gs2 = new GameStateTestable();
        gs2.ensureInventoryManager(true);
        gs2.inventoryManager.deserialize(snap.inventoryManagerData);

        expect(gs2.inventoryManager.items).toEqual({ tent: 3 });
    });
});

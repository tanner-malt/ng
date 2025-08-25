import { describe, expect, it } from 'vitest';
import { GameStateTestable } from '../src/systems/core/gameState.testable';

// Lock-in test: a fresh game starts with population 5 (1 royal + 4 villagers via PopulationManager)
describe('Starting population', () => {
    it('starts new games with population 5', () => {
        const gs = new GameStateTestable();
        expect(gs.population).toBe(5);
    });
});

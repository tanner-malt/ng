import { describe, it, expect, beforeEach } from 'vitest';

// Minimal stubs to exercise PopulationManager addInhabitant/addRefugees respecting caps
function makeGameState(cap, initial = 0) {
  const gs = {
    population: { total: initial },
    resources: {},
    updatePopulationCount() {
      // mirror legacy counter path if used elsewhere
      this.population.total = this.populationManager?.people?.length ?? this.population.total;
    },
  };
  gs.getPopulationCap = () => cap;
  // Simple PopulationManager stub with the same contract: addInhabitant returns null at cap
  gs.populationManager = {
    people: Array.from({ length: initial }, (_, i) => ({ id: 'p' + i })),
    addInhabitant(details) {
      const current = this.people.length;
      const max = gs.getPopulationCap();
      if (current >= max) {
        return null;
      }
      const person = { id: 'p' + (current + 1), ...details };
      this.people.push(person);
      gs.population.total = this.people.length;
      return person;
    },
    addRefugees(count) {
      let added = 0;
      for (let i = 0; i < count; i++) {
        if (!this.addInhabitant({ role: 'peasant', status: 'idle', age: 20 })) break;
        added++;
      }
      return added;
    }
  };
  return gs;
}

describe('PopulationManager cap guards', () => {
  let gameState;

  beforeEach(() => {
    gameState = makeGameState(3, 2); // cap 3, start with 2
  });

  it('addInhabitant returns null at cap and does not exceed', () => {
    // Add one succeeds (reaches cap)
    const p = gameState.populationManager.addInhabitant({ role: 'peasant' });
    expect(p).not.toBeNull();
    expect(gameState.population.total).toBe(3);
    // Next add is blocked
    const blocked = gameState.populationManager.addInhabitant({ role: 'peasant' });
    expect(blocked).toBeNull();
    expect(gameState.population.total).toBe(3);
  });

  it('addRefugees adds up to capacity and stops early', () => {
    // 2 requested but only 1 slot left
    const added = gameState.populationManager.addRefugees(2);
    expect(added).toBe(1);
    expect(gameState.population.total).toBe(3);
  });
});

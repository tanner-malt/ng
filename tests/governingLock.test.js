import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateTestable } from '../src/systems/core/gameState.testable.js';

describe('Governance gating and tooltips', () => {
  let gs;
  beforeEach(() => {
    // Fresh DOM container
    document.body.innerHTML = '<div id="app"></div>';

    // Minimal GameData mock
    global.window.GameData = {
      buildingCosts: {
        house: { wood: 10, stone: 5 },
      },
    };

    gs = new GameStateTestable();
    // Ensure house is unlocked (it now is by default)
    if (!gs.unlockedBuildings.includes('house')) gs.unlockedBuildings.push('house');

    // Create a build button element
    const btn = document.createElement('button');
    btn.setAttribute('data-building', 'house');
    document.body.appendChild(btn);
  });

  it('disables build buttons with a reason when governance is not allowed (not governing)', () => {
    // Simulate governance lock with reason
    global.window.villageManager = {
      getManagementStatus: () => ({ allowed: false, reason: 'not_governing', message: 'Village management locked: Monarch is not governing' }),
    };

    gs.updateBuildButtons();

    const btn = document.querySelector('[data-building="house"]');
    expect(btn.classList.contains('disabled')).toBe(true);
    expect(btn.classList.contains('locked')).toBe(true);
    expect(btn.title).toContain('Monarch is not governing');
  });

  it('shows granular missing resources when unaffordable and governance allows', () => {
    // Governance allowed
    global.window.villageManager = {
      getManagementStatus: () => ({ allowed: true, reason: 'ok' }),
    };
    // Not enough resources
    gs.resources.wood = 3;
    gs.resources.stone = 0;

    gs.updateBuildButtons();

    const btn = document.querySelector('[data-building="house"]');
    expect(btn.classList.contains('disabled')).toBe(true);
    expect(btn.title).toContain('Insufficient resources');
    expect(btn.title).toContain('wood: 3/10');
    expect(btn.title).toContain('stone: 0/5');
  });

  it('shows leader away reason when expedition leader is away (via management status)', () => {
    global.window.villageManager = {
      getManagementStatus: () => ({ allowed: false, reason: 'leader_away', message: 'Village management locked: Leader is away on expedition' }),
    };

    gs.updateBuildButtons();

    const btn = document.querySelector('[data-building="house"]');
    expect(btn.classList.contains('disabled')).toBe(true);
    expect(btn.title).toContain('Leader is away');
  });
});

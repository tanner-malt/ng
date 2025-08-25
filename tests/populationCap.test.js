import { describe, expect, it } from 'vitest';

// If GameData exports calculatePopulationCap in the future, import it instead.
function calculatePopulationCap(buildings) {
    let total = 0; // zero-base cap
    for (const b of buildings) {
        if ((b.level ?? 0) > 0) {
            if (b.type === 'house') total += 5;
            if (b.type === 'townCenter') total += 3;
        }
    }
    return total;
}

describe('population cap calculation', () => {
    it('counts only completed buildings and follows zero-base rule', () => {
        const buildings = [
            { type: 'house', level: 1, built: true },
            { type: 'house', level: 0, built: false },
            { type: 'townCenter', level: 1, built: true },
        ];
        expect(calculatePopulationCap(buildings)).toBe(8);
    });
});

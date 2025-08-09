export const TERRAIN_TYPES = {
  grass: { color: '#3a864f', symbol: '🌱', moveCost: 1 },
  forest: { color: '#2d5a27', symbol: '🌲', moveCost: 2 },
  hill: { color: '#7f6d3a', symbol: '⛰️', moveCost: 3 },
  village: { color: '#f39c12', symbol: '🏰', moveCost: 1 },
  water: { color: '#2e86de', symbol: '💧', moveCost: 99 },
  plains: { color: '#6ba84f', symbol: '🌾', moveCost: 1 },
  swamp: { color: '#3f5f46', symbol: '🪵', moveCost: 3 },
  mountain: { color: '#555555', symbol: '🏔️', moveCost: 4 },
  ruins: { color: '#7d4f6a', symbol: '🏚️', moveCost: 2 },
  desert: { color: '#cfae58', symbol: '🏜️', moveCost: 2 },
  ore: { color: '#7a6f9b', symbol: '⛏️', moveCost: 2 }
};

export function getTerrain(key) {
  return TERRAIN_TYPES[key] || TERRAIN_TYPES.grass;
}

export function randomTerrain() {
  const keys = Object.keys(TERRAIN_TYPES).filter(k => !['village','water','ore','ruins'].includes(k));
  return keys[Math.floor(Math.random()*keys.length)];
}

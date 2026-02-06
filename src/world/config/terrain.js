// Terrain configuration for world map grid
// Converted to classic global for browser compatibility

const TERRAIN_TYPES = {
  // Fertile/Safe terrains (inner zones)
  grass: { color: '#48bb78', symbol: '🌱', moveCost: 1, description: 'Lush grassland' },
  plains: { color: '#68d391', symbol: '🌾', moveCost: 1, description: 'Open plains' },
  village: { color: '#ecc94b', symbol: '🏰', moveCost: 1, description: 'Your capital' },
  
  // Mixed terrains (middle zones)
  forest: { color: '#276749', symbol: '🌲', moveCost: 2, description: 'Dense forest' },
  hill: { color: '#a0855b', symbol: '⛰️', moveCost: 2, description: 'Rolling hills' },
  water: { color: '#4299e1', symbol: '💧', moveCost: 99, description: 'Impassable water' },
  
  // Challenging terrains (outer zones)
  mountain: { color: '#718096', symbol: '🏔️', moveCost: 4, description: 'Treacherous mountains' },
  swamp: { color: '#4a5568', symbol: '🪵', moveCost: 3, description: 'Murky swampland' },
  desert: { color: '#d69e2e', symbol: '🏜️', moveCost: 2, description: 'Arid desert' },
  
  // Special terrains
  ruins: { color: '#805ad5', symbol: '🏚️', moveCost: 2, description: 'Ancient ruins' },
  ore: { color: '#9f7aea', symbol: '⛏️', moveCost: 2, description: 'Rich ore deposits' }
};

function getTerrain(key) {
  return TERRAIN_TYPES[key] || TERRAIN_TYPES.grass;
}

function randomTerrain() {
  const keys = Object.keys(TERRAIN_TYPES).filter(k => !['village','water','ore','ruins'].includes(k));
  return keys[Math.floor(Math.random()*keys.length)];
}

// Expose to global scope for browser use
if (typeof window !== 'undefined') {
  window.TERRAIN_TYPES = TERRAIN_TYPES;
  window.getTerrain = getTerrain;
  window.randomTerrain = randomTerrain;
}

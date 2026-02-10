// Terrain configuration — thin wrapper over WORLD_DATA.terrainTypes
// Provides getTerrain() / randomTerrain() helpers used by MapRenderer

const TERRAIN_TYPES = (() => {
  const src = (typeof window !== 'undefined' && window.WORLD_DATA)
    ? window.WORLD_DATA.terrainTypes : {};
  // Map to the { color, symbol, moveCost, description } shape MapRenderer expects
  const out = {};
  for (const [key, t] of Object.entries(src)) {
    out[key] = { color: t.color, symbol: t.icon, moveCost: t.moveCost, description: t.description };
  }
  return out;
})();

function getTerrain(key) {
  return TERRAIN_TYPES[key] || TERRAIN_TYPES.grass || { color: '#444', symbol: '?', moveCost: 1, description: 'Unknown' };
}

function randomTerrain() {
  const keys = Object.keys(TERRAIN_TYPES).filter(k => !['village'].includes(k));
  return keys[Math.floor(Math.random() * keys.length)];
}

if (typeof window !== 'undefined') {
  window.TERRAIN_TYPES = TERRAIN_TYPES;
  window.getTerrain = getTerrain;
  window.randomTerrain = randomTerrain;
}

/**
 * worldData.js - World Map Data Definitions
 * 
 * Unified data definitions for the world map system including:
 * - Terrain types with movement costs and resources
 * - Faction definitions for enemies
 * - Exploration and visibility rules
 * - Point of interest types
 */

const WORLD_DATA = {
    // =========================================
    // MAP CONFIGURATION
    // =========================================
    mapConfig: {
        width: 9,
        height: 9,
        capitalPosition: { row: 4, col: 4 },
        initialExplorationRadius: 1
    },

    // =========================================
    // TERRAIN TYPES
    // =========================================
    terrainTypes: {
        grass: {
            name: 'Grassland',
            icon: '🌱',
            color: '#48bb78',
            moveCost: 1,
            description: 'Lush grassland, easy to traverse',
            dangerLevel: 0
        },
        plains: {
            name: 'Plains',
            icon: '🌾',
            color: '#68d391',
            moveCost: 1,
            description: 'Open plains with good visibility',
            dangerLevel: 0
        },
        village: {
            name: 'Your Capital',
            icon: '🏰',
            color: '#ecc94b',
            moveCost: 1,
            description: 'Your home settlement',
            dangerLevel: 0,
            isCapital: true
        },
        forest: {
            name: 'Forest',
            icon: '🌲',
            color: '#276749',
            moveCost: 2,
            description: 'Dense forest, slower travel',
            dangerLevel: 1
        },
        hill: {
            name: 'Hills',
            icon: '⛰️',
            color: '#a0855b',
            moveCost: 2,
            description: 'Rolling hills with stone deposits',
            dangerLevel: 1,
            defensiveBonus: 0.05
        },
        mountain: {
            name: 'Mountains',
            icon: '🏔️',
            color: '#718096',
            moveCost: 4,
            description: 'Treacherous mountains, slow but defensible',
            dangerLevel: 2,
            defensiveBonus: 0.07
        },
        swamp: {
            name: 'Swamp',
            icon: '🪵',
            color: '#4a5568',
            moveCost: 3,
            description: 'Murky swampland, dangerous and slow',
            dangerLevel: 3
        },
        desert: {
            name: 'Desert',
            icon: '🏜️',
            color: '#d69e2e',
            moveCost: 2,
            description: 'Arid desert, drains supplies faster',
            dangerLevel: 2
        },
        ruins: {
            name: 'Ancient Ruins',
            icon: '🏚️',
            color: '#805ad5',
            moveCost: 2,
            description: 'Ancient ruins with hidden treasures',
            dangerLevel: 2
        }
    },

    // =========================================
    // ENEMY TYPES (time-scaled)
    // =========================================
    enemyTypes: {
        bandits:  { name: 'Bandits',  icon: '⚔️', color: '#e74c3c', minDay: 50,  maxDay: 999 },
        raiders:  { name: 'Raiders',  icon: '🏴', color: '#8e44ad', minDay: 100, maxDay: 999 },
        warlords: { name: 'Warlords', icon: '👹', color: '#2c3e50', minDay: 200, maxDay: 999 }
    },

    // =========================================
    // ENEMY SPAWN CONFIG
    // =========================================
    enemySpawnConfig: {
        startDay: 50,
        baseChance: 0.05,      // 5% on day 50
        chancePerDay: 0.002,    // +0.2% per day after 50
        groupSizeBase: 1,
        groupSizeGrowthDays: 75, // +1 unit per 75 days
        unitBaseHealth: 30,
        unitBaseAttack: 8,
        scalingPerDay: 0.01     // +1% per day after 50
    },

    // =========================================
    // VISIBILITY STATES
    // =========================================
    visibilityStates: {
        hidden: {
            name: 'Unexplored',
            canSee: false,
            canMove: false,
            fogOpacity: 1.0
        },
        scoutable: {
            name: 'Scoutable',
            canSee: true,
            canMove: false,
            fogOpacity: 0.5
        },
        explored: {
            name: 'Explored',
            canSee: true,
            canMove: true,
            fogOpacity: 0
        }
    }
};

// Export
window.WORLD_DATA = WORLD_DATA;

console.log('[WorldData] World data definitions loaded');

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
        width: 7,
        height: 7,
        capitalPosition: { row: 3, col: 3 },
        initialExplorationRadius: 1
    },

    // =========================================
    // TERRAIN TYPES
    // =========================================
    terrainTypes: {
        // Safe terrains (inner zones)
        grass: {
            name: 'Grassland',
            icon: '🌱',
            color: '#48bb78',
            moveCost: 1,
            description: 'Lush grassland, easy to traverse',
            resources: ['food'],
            dangerLevel: 0,
            canBuild: true
        },
        plains: {
            name: 'Plains',
            icon: '🌾',
            color: '#68d391',
            moveCost: 1,
            description: 'Open plains with good visibility',
            resources: ['food', 'gold'],
            dangerLevel: 0,
            canBuild: true
        },
        village: {
            name: 'Your Capital',
            icon: '🏰',
            color: '#ecc94b',
            moveCost: 1,
            description: 'Your home settlement',
            resources: [],
            dangerLevel: 0,
            canBuild: false,
            isCapital: true
        },

        // Mixed terrains (middle zones)
        forest: {
            name: 'Forest',
            icon: '🌲',
            color: '#276749',
            moveCost: 2,
            description: 'Dense forest, slower travel but good for hunting',
            resources: ['wood', 'food'],
            dangerLevel: 1,
            canBuild: false,
            providesAmbush: true
        },
        hill: {
            name: 'Hills',
            icon: '⛰️',
            color: '#a0855b',
            moveCost: 2,
            description: 'Rolling hills with stone deposits',
            resources: ['stone'],
            dangerLevel: 1,
            canBuild: true,
            defensiveBonus: 0.2
        },
        water: {
            name: 'Water',
            icon: '💧',
            color: '#4299e1',
            moveCost: 99,
            description: 'Impassable water - requires boats',
            resources: ['fish'],
            dangerLevel: 0,
            canBuild: false,
            impassable: true
        },

        // Challenging terrains (outer zones)
        mountain: {
            name: 'Mountains',
            icon: '🏔️',
            color: '#718096',
            moveCost: 4,
            description: 'Treacherous mountains, slow but defensible',
            resources: ['stone', 'metal'],
            dangerLevel: 2,
            canBuild: false,
            defensiveBonus: 0.4
        },
        swamp: {
            name: 'Swamp',
            icon: '🪵',
            color: '#4a5568',
            moveCost: 3,
            description: 'Murky swampland, dangerous and slow',
            resources: [],
            dangerLevel: 3,
            canBuild: false,
            eventChanceBonus: 0.1
        },
        desert: {
            name: 'Desert',
            icon: '🏜️',
            color: '#d69e2e',
            moveCost: 2,
            description: 'Arid desert, drains supplies faster',
            resources: ['gold'],
            dangerLevel: 2,
            canBuild: false,
            supplyDrain: 1.5
        },

        // Special terrains
        ruins: {
            name: 'Ancient Ruins',
            icon: '🏚️',
            color: '#805ad5',
            moveCost: 2,
            description: 'Ancient ruins with hidden treasures',
            resources: ['gold', 'artifacts'],
            dangerLevel: 2,
            canBuild: false,
            explorable: true
        },
        ore: {
            name: 'Ore Deposits',
            icon: '⛏️',
            color: '#9f7aea',
            moveCost: 2,
            description: 'Rich mineral deposits',
            resources: ['metal', 'stone'],
            dangerLevel: 1,
            canBuild: true
        }
    },

    // =========================================
    // ENEMY FACTIONS
    // =========================================
    factions: {
        bandits: {
            name: 'Bandits',
            icon: '🏴',
            color: '#e74c3c',
            aggression: 0.3,
            description: 'Roving outlaws seeking easy prey',
            preferredTerrain: ['forest', 'ruins'],
            baseStrength: { min: 3, max: 8 },
            loot: { gold: { min: 5, max: 20 } },
            spawnWeight: 3
        },
        goblins: {
            name: 'Goblins',
            icon: '👺',
            color: '#27ae60',
            aggression: 0.5,
            description: 'Cunning creatures lurking in caves',
            preferredTerrain: ['hill', 'mountain', 'forest'],
            baseStrength: { min: 5, max: 12 },
            loot: { gold: { min: 3, max: 15 }, metal: { min: 1, max: 5 } },
            spawnWeight: 2
        },
        orcs: {
            name: 'Orcs',
            icon: '👹',
            color: '#8e44ad',
            aggression: 0.7,
            description: 'Strong warriors who raid settlements',
            preferredTerrain: ['plains', 'hill'],
            baseStrength: { min: 8, max: 20 },
            loot: { gold: { min: 10, max: 30 }, weapons: { min: 1, max: 3 } },
            spawnWeight: 1
        },
        undead: {
            name: 'Undead',
            icon: '💀',
            color: '#2c3e50',
            aggression: 0.4,
            description: 'Restless spirits and skeletal warriors',
            preferredTerrain: ['swamp', 'ruins'],
            baseStrength: { min: 6, max: 15 },
            loot: { gold: { min: 0, max: 10 }, artifacts: { min: 0, max: 1 } },
            spawnWeight: 1
        }
    },

    // =========================================
    // UNIT TYPES
    // =========================================
    unitTypes: {
        // Player units
        army: {
            name: 'Army',
            icon: '⚔️',
            allegiance: 'player',
            defaultMode: 'travel',
            movementSpeed: 1,
            supplyConsumption: 1 // food per person per day
        },
        scoutParty: {
            name: 'Scout Party',
            icon: '🔭',
            allegiance: 'player',
            defaultMode: 'scout',
            movementSpeed: 2,
            supplyConsumption: 0.5,
            revealRadius: 2
        },
        tradeCaravan: {
            name: 'Trade Caravan',
            icon: '🛒',
            allegiance: 'player',
            defaultMode: 'trade',
            movementSpeed: 1,
            supplyConsumption: 0.5,
            cargoCapacity: 100
        },
        settlers: {
            name: 'Settlers',
            icon: '👨‍👩‍👧‍👦',
            allegiance: 'player',
            defaultMode: 'travel',
            movementSpeed: 0.5,
            supplyConsumption: 1.5
        },

        // Enemy units
        raiderBand: {
            name: 'Raider Band',
            icon: '🏴',
            allegiance: 'enemy',
            defaultMode: 'battle',
            movementSpeed: 1,
            zocRadius: 1
        },
        enemyArmy: {
            name: 'Enemy Army',
            icon: '⚔️',
            allegiance: 'enemy',
            defaultMode: 'battle',
            movementSpeed: 1,
            zocRadius: 1
        },
        monster: {
            name: 'Monster',
            icon: '👾',
            allegiance: 'enemy',
            defaultMode: 'idle',
            movementSpeed: 0,
            zocRadius: 0
        }
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
    },

    // =========================================
    // POINT OF INTEREST TYPES
    // =========================================
    poiTypes: {
        treasure: {
            name: 'Hidden Treasure',
            icon: '💎',
            discoveryChance: 0.1,
            oneTime: true,
            rewards: { gold: { min: 20, max: 100 } }
        },
        shrine: {
            name: 'Ancient Shrine',
            icon: '⛩️',
            discoveryChance: 0.05,
            oneTime: false,
            effects: { morale: 10, blessingDays: 3 }
        },
        camp: {
            name: 'Abandoned Camp',
            icon: '⛺',
            discoveryChance: 0.15,
            oneTime: true,
            rewards: { food: { min: 5, max: 20 } }
        },
        cave: {
            name: 'Mysterious Cave',
            icon: '🕳️',
            discoveryChance: 0.08,
            oneTime: true,
            canExplore: true,
            dangerLevel: 2
        }
    },

    // =========================================
    // TRAVEL EVENTS
    // =========================================
    travelEvents: {
        forage: {
            name: 'Forage',
            chance: 0.2,
            message: '🌿 {army} foraged supplies (+{amount} food)',
            type: 'positive',
            effect: 'addFood'
        },
        sickness: {
            name: 'Sickness',
            chance: 0.25,
            message: '🤒 Sickness in {army} (−5 morale)',
            type: 'negative',
            effect: 'reduceMorale',
            amount: 5
        },
        weather: {
            name: 'Bad Weather',
            chance: 0.2,
            message: '🌧️ Bad weather delays {army} for a day',
            type: 'neutral',
            effect: 'skipDay'
        },
        equipment: {
            name: 'Equipment Issues',
            chance: 0.15,
            message: '🪓 Equipment issues cost {army} {amount} food',
            type: 'negative',
            effect: 'loseFood'
        },
        ambush: {
            name: 'Ambush',
            chance: 0.15,
            requiresZOC: true,
            message: '⚠️ Ambush in hostile territory! {army} loses morale and time',
            type: 'negative',
            effect: 'ambush',
            moraleAmount: 8
        },
        discovery: {
            name: 'Discovery',
            chance: 0.05,
            message: '🔎 {army} discovered something nearby',
            type: 'positive',
            effect: 'revealTile'
        }
    }
};

// Export
window.WORLD_DATA = WORLD_DATA;

console.log('[WorldData] World data definitions loaded');

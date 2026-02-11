/**
 * buildingData.js - Unified Building Definitions
 * 
 * This file contains the complete definition for every building in the game.
 * All building data is consolidated here, including:
 * - Identity (name, icon, description, category)
 * - Costs (resources to build)
 * - Construction (work points required)
 * - Production (jobs, storage, bonuses when built)
 * - Unlock conditions (what's needed to unlock)
 * 
 * This is the SINGLE SOURCE OF TRUTH for building data.
 * The UI generates buttons directly from these definitions.
 */

const BUILDING_DATA = {
    // =========================================
    // ESSENTIAL BUILDINGS
    // =========================================
    townCenter: {
        name: 'Town Center',
        icon: '🏛️',
        description: 'The heart of your settlement. Enables tax collection from all working citizens',
        effects: '+200 storage • +2000💰 gold storage • Taxes: 1💰/citizen/day • +10% per level',
        category: 'essential',
        
        costs: { wood: 50 },
        constructionPoints: 10,
        
        production: {
            storage: { all: 200, gold: 2000 },
            jobs: { gatherer: 2 }
            // Tax collection handled by economySystem
        },
        
        unlockConditions: [],
        startsUnlocked: true
    },

    house: {
        name: 'House',
        icon: '🏠',
        description: 'Cozy homes for your growing population. More houses = more workers!',
        effects: '+9 housing capacity • 1 Gatherer job per house',
        category: 'essential',
        
        costs: { wood: 15 },
        constructionPoints: 5,
        
        production: {
            populationCapacity: 9,
            jobs: { gatherer: 1 }
        },
        
        unlockConditions: [
            { type: 'achievement', achievement: 'town_center_built' }
        ],
        autoUnlock: true
    },

    farm: {
        name: 'Farm',
        icon: '🌾',
        description: 'Grows crops to feed your people. Production varies by season!',
        effects: '2 Farmer jobs • +3.5🍖 food/farmer/day • Spring/Summer bonus, Winter penalty',
        category: 'essential',
        
        costs: { wood: 20 },
        constructionPoints: 7,
        
        production: {
            jobs: { farmer: 2 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'house', count: 1 }
        ],
        autoUnlock: true
    },

    buildersHut: {
        name: "Builder's Hut",
        icon: '🔨',
        description: 'Professional builders work faster and unlock complex construction',
        effects: '4 Builder jobs • 1 Foreman (speeds up construction)',
        category: 'essential',
        
        costs: { wood: 30, stone: 15 },
        constructionPoints: 15,
        
        production: {
            jobs: { builder: 4, foreman: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'house', count: 1 }
        ],
        autoUnlock: true
    },

    storehouse: {
        name: 'Storehouse',
        icon: '📦',
        description: 'Expands your storage capacity and provides gathering work',
        effects: '+300 storage (all resources) • 1 Gatherer job',
        category: 'essential',
        
        costs: { wood: 40, stone: 20 },
        constructionPoints: 10,
        
        production: {
            storage: { all: 300 },
            jobs: { gatherer: 1 }
        },
        
        unlockConditions: [],
        startsUnlocked: true
    },

    // =========================================
    // PRODUCTION BUILDINGS
    // =========================================
    huntersLodge: {
        name: "Hunter's Lodge",
        icon: '🦌',
        description: 'Hunters track and bring back game for food. Best in autumn and winter!',
        effects: '2 Hunter jobs • +2.5🍖 food/hunter/day • Autumn/Winter bonus, Spring penalty',
        category: 'production',

        costs: { wood: 30, stone: 15 },
        constructionPoints: 12,

        production: {
            jobs: { hunter: 2 }
        },

        unlockConditions: [
            { type: 'building_count', building: 'farm', count: 1 }
        ],
        autoUnlock: true
    },

    woodcutterLodge: {
        name: 'Woodcutter Lodge',
        icon: '🪚',
        description: 'Chop trees and haul lumber back to the village',
        effects: '3 Woodcutter jobs • +3🪵 wood/worker/day',
        category: 'production',
        
        costs: { wood: 20, stone: 40 },
        constructionPoints: 15,
        
        production: {
            jobs: { woodcutter: 3 }
        },
        
        unlockConditions: [
            { type: 'achievement', achievement: 'feeding_people' }
        ],
        autoUnlock: true
    },

    quarry: {
        name: 'Quarry',
        icon: '⛏️',
        description: 'Cut stone blocks from the rocky hillside',
        effects: '3 Rockcutter jobs • +3🪨 stone/worker/day',
        category: 'production',
        
        costs: { wood: 60, stone: 80 },
        constructionPoints: 60,
        
        production: {
            jobs: { rockcutter: 3 }
        },
        
        unlockConditions: [
            { type: 'achievement', achievement: 'prosperous_kingdom' },
            { type: 'building_count', building: 'house', count: 8 },
            { type: 'resource', resource: 'stone', amount: 50 }
        ],
        autoUnlock: true
    },

    lumberMill: {
        name: 'Lumber Mill',
        icon: '🪓',
        description: 'Process raw logs into refined planks for advanced construction',
        effects: '3 Sawyer jobs • Converts 2🪵→2📐 planks/worker/day',
        category: 'production',
        
        costs: { wood: 100, stone: 60, gold: 80, planks: 20 },
        constructionPoints: 55,
        
        production: {
            jobs: { sawyer: 3 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'woodcutterLodge', count: 2 },
            { type: 'resource', resource: 'wood', amount: 300 },
            { type: 'resource', resource: 'stone', amount: 100 },
            { type: 'resource', resource: 'population', amount: 75 }
        ],
        autoUnlock: true
    },

    mine: {
        name: 'Mine',
        icon: '⛏️',
        description: 'Dig deep for stone and precious metal ore',
        effects: '3 Miner jobs • +2🪨 stone + 1⛏️ metal/worker/day',
        category: 'production',
        
        costs: { wood: 60, stone: 40 },
        constructionPoints: 75,
        
        production: {
            jobs: { miner: 3 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'quarry', count: 1 }
        ],
        autoUnlock: true
    },

    // =========================================
    // CRAFT BUILDINGS
    // =========================================
    workshop: {
        name: 'Workshop',
        icon: '🔧',
        description: 'Engineers craft tools and machinery that boost village efficiency',
        effects: '3 Engineer jobs • +3⚙️ production/worker/day',
        category: 'craft',
        
        costs: { wood: 35, stone: 25, gold: 15 },
        constructionPoints: 50,
        
        production: {
            jobs: { engineer: 3 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'buildersHut', count: 1 }
        ],
        autoUnlock: true
    },

    blacksmith: {
        name: 'Blacksmith',
        icon: '⚒️',
        description: 'Forge metal into weapons and tools for your people',
        effects: '2 Blacksmith jobs • Uses 1⛏️ metal → +1⚔️ weapons + 2🔧 tools/day',
        category: 'craft',
        
        costs: { wood: 50, stone: 30, metal: 20 },
        constructionPoints: 55,
        
        production: {
            jobs: { blacksmith: 2 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'mine', count: 1 },
            { type: 'resource', resource: 'metal', amount: 10 }
        ],
        autoUnlock: true
    },

    market: {
        name: 'Market',
        icon: '🏪',
        description: 'Traders buy and sell goods, generating gold for your treasury',
        effects: '3 Trader jobs • +2💰 gold/trader/day',
        category: 'craft',
        
        costs: { wood: 80, stone: 40, planks: 20 },
        constructionPoints: 70,
        
        production: {
            jobs: { trader: 3 }
        },
        
        unlockConditions: [
            { type: 'achievement', achievement: 'wealthy_ruler' },
            { type: 'building_count', building: 'house', count: 6 },
            { type: 'resource', resource: 'population', amount: 25 }
        ],
        autoUnlock: true
    },

    // =========================================
    // MILITARY BUILDINGS
    // =========================================
    barracks: {
        name: 'Barracks',
        icon: '⚔️',
        description: 'Train soldiers to defend your lands and conquer new territory',
        effects: '1 Drill Instructor • Enables army recruitment • Unlocks World view',
        category: 'military',
        
        costs: { wood: 30, stone: 20 },
        constructionPoints: 20,
        
        production: {
            jobs: { drillInstructor: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'house', count: 2 },
            { type: 'resource', resource: 'population', amount: 6 }
        ],
        autoUnlock: true
    },

    fortifications: {
        name: 'Fortifications',
        icon: '🛡️',
        description: 'Walls and towers to protect your people from invaders',
        effects: 'Defense bonus in battles • Reduces raid damage',
        category: 'military',
        
        costs: { stone: 60, wood: 40, gold: 30, planks: 15 },
        constructionPoints: 65,
        
        production: {
            bonuses: { defense: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'barracks', count: 1 },
            { type: 'tech', tech: 'advanced_fortifications' }
        ],
        autoUnlock: true
    },

    militaryAcademy: {
        name: 'Military Academy',
        icon: '🎓',
        description: 'Train commanders and develop advanced military tactics',
        effects: '1 Military Theorist • Improves army effectiveness',
        category: 'military',
        
        costs: { wood: 80, stone: 50, gold: 40, planks: 25 },
        constructionPoints: 90,
        
        production: {
            jobs: { militaryTheorist: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'barracks', count: 2 },
            { type: 'tech', tech: 'tactics' }
        ],
        autoUnlock: true
    },

    castle: {
        name: 'Castle',
        icon: '🏰',
        description: 'The ultimate seat of power - a symbol of your dynasty\'s might',
        effects: '+1 Civil Leader • Major defense bonus • Prestige symbol',
        category: 'military',
        
        costs: { wood: 50, stone: 150, metal: 75, planks: 100 },
        constructionPoints: 150,
        
        production: {
            bonuses: { civilLeaders: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'barracks', count: 2 },
            { type: 'building_count', building: 'temple', count: 1 },
            { type: 'resource', resource: 'stone', amount: 200 },
            { type: 'resource', resource: 'population', amount: 50 }
        ],
        autoUnlock: false
    },

    // =========================================
    // ROYAL BUILDINGS
    // =========================================
    keep: {
        name: 'The Keep',
        icon: '🏰',
        description: 'A fortified residence for your royal family and their court',
        effects: 'Unlocks Throne View • +2 Royal Capacity • Dynasty management',
        category: 'royal',
        
        costs: { gold: 100, wood: 50, stone: 30, planks: 25 },
        constructionPoints: 80,
        
        production: {
            bonuses: { royalCapacity: 2 }
        },
        
        unlockConditions: [
            { type: 'achievement', achievement: 'become_king' }
        ],
        autoUnlock: true
    },

    monument: {
        name: 'Monument',
        icon: '🗿',
        description: 'A grand testament to your dynasty\'s glory and achievements',
        effects: '+10 village happiness • Boosts prestige',
        category: 'royal',
        
        costs: { stone: 75, gold: 50, wood: 25, planks: 20 },
        constructionPoints: 200,
        
        production: {
            bonuses: { happiness: 10 }
        },
        
        unlockConditions: [
            { type: 'tech', tech: 'stonecutting_mastery' }
        ],
        autoUnlock: true
    },

    // =========================================
    // KNOWLEDGE BUILDINGS
    // =========================================
    academy: {
        name: 'Academy',
        icon: '🎓',
        description: 'Scholars research new knowledge and train skilled workers',
        effects: '1 Scholar job • Accelerates tech research • Unlocks Tech Tree',
        category: 'knowledge',
        
        costs: { wood: 120, stone: 80, planks: 40 },
        constructionPoints: 100,
        
        production: {
            jobs: { scholar: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'temple', count: 1 },
            { type: 'achievement', achievement: 'master_builder' }
        ],
        autoUnlock: false
    },

    university: {
        name: 'University',
        icon: '🏛️',
        description: 'Advanced learning and scientific breakthroughs',
        effects: '1 Professor job • Unlocks advanced technologies',
        category: 'knowledge',
        
        costs: { wood: 200, stone: 100, gold: 50, metal: 30, planks: 120 },
        constructionPoints: 180,
        
        production: {
            jobs: { professor: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'academy', count: 1 },
            { type: 'resource', resource: 'gold', amount: 1000 }
        ],
        autoUnlock: false
    },

    // =========================================
    // ADVANCED BUILDINGS
    // =========================================
    magicalTower: {
        name: 'Magical Tower',
        icon: '🔮',
        description: 'Mysterious arts and arcane research (coming soon!)',
        effects: '1 Wizard job • Future magical abilities',
        category: 'advanced',
        
        costs: { gold: 200, stone: 100, wood: 75, metal: 50, planks: 80 },
        constructionPoints: 120,
        
        production: {
            jobs: { wizard: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'university', count: 1 },
            { type: 'resource', resource: 'gold', amount: 500 }
        ],
        autoUnlock: false
    },

    grandLibrary: {
        name: 'Grand Library',
        icon: '📚',
        description: 'A repository of all knowledge accumulated across generations',
        effects: '10 Scholar jobs • Preserves dynasty history • Research bonus',
        category: 'advanced',
        
        costs: { gold: 150, wood: 100, stone: 75, planks: 60 },
        constructionPoints: 110,
        
        production: {
            jobs: { scholar: 10 }
        },
        
        unlockConditions: [
            { type: 'tech', tech: 'architecture' }
        ],
        autoUnlock: true
    },

    temple: {
        name: 'Temple',
        icon: '⛪',
        description: 'A place of worship and spiritual guidance',
        effects: '+5 happiness • Enables religious ceremonies',
        category: 'royal',
        
        costs: { stone: 50, gold: 30, wood: 40 },
        constructionPoints: 60,
        
        production: {
            bonuses: { happiness: 5 },
            jobs: { priest: 1 }
        },
        
        unlockConditions: [
            { type: 'building_count', building: 'market', count: 1 },
            { type: 'resource', resource: 'population', amount: 25 },
            { type: 'resource', resource: 'gold', amount: 200 }
        ],
        autoUnlock: false
    }
};

/**
 * Building categories for UI organization
 */
const BUILDING_CATEGORIES = {
    starter: {
        name: 'Starter',
        description: 'Initial buildings provided at game start',
        order: 0
    },
    essential: {
        name: 'Essential',
        description: 'Basic buildings needed to start and grow your settlement',
        order: 1
    },
    production: {
        name: 'Production',
        description: 'Buildings that gather and process raw materials',
        order: 2
    },
    craft: {
        name: 'Craft & Trade',
        description: 'Buildings for crafting, trading, and equipment production',
        order: 3
    },
    military: {
        name: 'Military',
        description: 'Buildings for defense, training, and military operations',
        order: 4
    },
    royal: {
        name: 'Royal',
        description: 'Buildings related to dynasty management and prestige',
        order: 5
    },
    knowledge: {
        name: 'Knowledge',
        description: 'Buildings for research, culture, and learning',
        order: 6
    },
    advanced: {
        name: 'Advanced',
        description: 'Specialized late-game buildings with unique abilities',
        order: 7
    }
};

// Export
window.BUILDING_DATA = BUILDING_DATA;
window.BUILDING_CATEGORIES = BUILDING_CATEGORIES;

console.log('[BuildingData] Unified building data loaded');

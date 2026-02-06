/**
 * jobData.js - Job Definitions
 * 
 * This file contains the complete definition for every job type.
 * Jobs define what workers do at buildings and what they produce.
 * 
 * Each job includes:
 * - Identity (name, icon, description)
 * - Production (what resources produced per day per worker)
 * - Consumption (what resources consumed per day per worker)
 * - Requirements (skill, equipment, etc.)
 * - Seasonal modifiers (how seasons affect production)
 */

const JOB_DATA = {
    // =========================================
    // GATHERING JOBS
    // =========================================
    gatherer: {
        name: 'Gatherer',
        label: 'Gatherer',
        icon: '🧺',
        description: 'Collects resources from the surrounding area',
        buildingType: null, // Can work anywhere
        
        production: {
            food: 1,
            wood: 0.5
        },
        consumption: {},
        
        seasonalModifiers: {
            Spring: 1.2,
            Summer: 1.0,
            Autumn: 0.8,
            Winter: 0.5
        }
    },

    // =========================================
    // CONSTRUCTION JOBS
    // =========================================
    builder: {
        name: 'Builder',
        label: 'Builder',
        icon: '🔨',
        description: 'Constructs and repairs buildings',
        buildingType: null, // Works on construction projects
        
        production: {
            constructionPoints: 2
        },
        consumption: {},
        
        baseEfficiency: 1.0,
        requiredSkill: 'construction'
    },

    foreman: {
        name: 'Foreman',
        label: 'Foreman',
        icon: '👷',
        description: 'Supervises construction and speeds up building',
        buildingType: 'buildersHut',
        
        production: {
            constructionPoints: 1 // Direct work
        },
        consumption: {},
        
        // Provides bonus to all other builders
        bonuses: {
            constructionSpeed: 0.25 // +25% to all builder output
        },
        requiredSkill: 'construction'
    },

    // =========================================
    // FOOD PRODUCTION JOBS
    // =========================================
    farmer: {
        name: 'Farmer',
        label: 'Farmer',
        icon: '🌾',
        description: 'Grows crops and produces food',
        buildingType: 'farm',
        
        production: {
            food: 3.5
        },
        consumption: {},
        
        seasonalModifiers: {
            Spring: 1.2,
            Sprummer: 1.35,
            Summer: 1.5,
            Sumtumn: 1.25,
            Autumn: 1.0,
            Autinter: 0.9,
            Winter: 0.7,
            Winting: 0.8
        },
        
        requiredSkill: 'farming',
        skillGained: 'farming'
    },

    // =========================================
    // RESOURCE PRODUCTION JOBS
    // =========================================
    woodcutter: {
        name: 'Woodcutter',
        label: 'Woodcutter',
        icon: '🪓',
        description: 'Chops trees for wood',
        buildingType: 'woodcutterLodge',
        
        production: {
            wood: 3
        },
        consumption: {},
        
        seasonalModifiers: {
            Spring: 1.0,
            Summer: 0.8,
            Autumn: 1.3,
            Winter: 1.5
        },
        
        requiredSkill: 'woodworking',
        skillGained: 'woodworking'
    },

    sawyer: {
        name: 'Sawyer',
        label: 'Sawyer',
        icon: '🪚',
        description: 'Processes wood into planks',
        buildingType: 'lumberMill',
        
        production: {
            planks: 2
        },
        consumption: {
            wood: 2
        },
        
        requiredSkill: 'woodworking',
        skillGained: 'woodworking'
    },

    rockcutter: {
        name: 'Rockcutter',
        label: 'Rockcutter',
        icon: '⛏️',
        description: 'Cuts and processes stone',
        buildingType: 'quarry',
        
        production: {
            stone: 3
        },
        consumption: {},
        
        seasonalModifiers: {
            Summer: 1.2,
            Winter: 0.8
        },
        
        requiredSkill: 'mining',
        skillGained: 'mining'
    },

    miner: {
        name: 'Miner',
        label: 'Miner',
        icon: '⛏️',
        description: 'Extracts stone and metal ore from the ground',
        buildingType: 'mine',
        
        production: {
            stone: 2,
            metal: 1
        },
        consumption: {},
        
        requiredSkill: 'mining',
        skillGained: 'mining'
    },

    // =========================================
    // CRAFTING JOBS
    // =========================================
    engineer: {
        name: 'Engineer',
        label: 'Engineer',
        icon: '🔧',
        description: 'Produces tools and machinery',
        buildingType: 'workshop',
        
        production: {
            production: 3,
            tools: 1
        },
        consumption: {
            metal: 0.5
        },
        
        requiredSkill: 'engineering',
        skillGained: 'engineering'
    },

    blacksmith: {
        name: 'Blacksmith',
        label: 'Blacksmith',
        icon: '⚒️',
        description: 'Forges metal into weapons and armor',
        buildingType: 'blacksmith',
        
        production: {
            weapons: 1,
            tools: 2
        },
        consumption: {
            metal: 1
        },
        
        requiredSkill: 'smithing',
        skillGained: 'smithing'
    },

    // =========================================
    // TRADE JOBS
    // =========================================
    trader: {
        name: 'Trader',
        label: 'Trader',
        icon: '💰',
        description: 'Conducts trade and generates gold',
        buildingType: 'market',
        
        production: {
            gold: 2
        },
        consumption: {},
        
        requiredSkill: 'trading',
        skillGained: 'trading'
    },

    // =========================================
    // KNOWLEDGE JOBS
    // =========================================
    scholar: {
        name: 'Scholar',
        label: 'Scholar',
        icon: '📚',
        description: 'Researches technology and generates knowledge',
        buildingType: 'academy',
        
        production: {
            research: 1
        },
        consumption: {},
        
        requiredSkill: 'scholarship',
        skillGained: 'scholarship'
    },

    professor: {
        name: 'Professor',
        label: 'Professor',
        icon: '🎓',
        description: 'Conducts advanced research',
        buildingType: 'university',
        
        production: {
            research: 3
        },
        consumption: {},
        
        requiredSkill: 'scholarship',
        skillGained: 'scholarship'
    },

    // =========================================
    // MILITARY JOBS
    // =========================================
    drillInstructor: {
        name: 'Drill Instructor',
        label: 'Drill Instructor',
        icon: '🎖️',
        description: 'Trains soldiers and improves army quality',
        buildingType: 'barracks',
        
        production: {
            training: 1
        },
        consumption: {
            gold: 0.5
        },
        
        requiredSkill: 'combat',
        skillGained: 'teaching'
    },

    militaryTheorist: {
        name: 'Military Theorist',
        label: 'Military Theorist',
        icon: '📜',
        description: 'Develops military strategies and tactics',
        buildingType: 'militaryAcademy',
        
        production: {
            tactics: 1
        },
        consumption: {},
        
        requiredSkill: 'strategy',
        skillGained: 'strategy'
    },

    // =========================================
    // SPECIAL JOBS
    // =========================================
    wizard: {
        name: 'Wizard',
        label: 'Wizard',
        icon: '🧙',
        description: 'Studies arcane arts and magic',
        buildingType: 'magicalTower',
        
        production: {
            mana: 1
        },
        consumption: {},
        
        requiredSkill: 'magic',
        skillGained: 'magic'
    },

    priest: {
        name: 'Priest',
        label: 'Priest',
        icon: '⛪',
        description: 'Provides spiritual guidance and ceremonies',
        buildingType: 'temple',
        
        production: {
            faith: 1
        },
        consumption: {},
        
        bonuses: {
            happiness: 0.5
        },
        
        requiredSkill: 'religion',
        skillGained: 'religion'
    },

    // =========================================
    // GENERIC JOBS
    // =========================================
    peasant: {
        name: 'Peasant',
        label: 'Peasant',
        icon: '👤',
        description: 'Unassigned worker who can be given any job',
        buildingType: null,
        
        production: {},
        consumption: {}
    }
};

// Export
window.JOB_DATA = JOB_DATA;

console.log('[JobData] Job definitions loaded');

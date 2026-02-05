// ===== GAME DATA =====
// Centralized game configuration and data
// All costs, production rates, building stats, etc. are defined here

const GameData = {
    // Global constants
    TILE_SIZE: 50, // Canonical pixels per tile for grid rendering/placement
    startingPopulationCount: 5, // Canonical starting population (1 royal + 4 villagers)

    // Resource icons for UI display
    resourceIcons: {
        food: '🌾',
        wood: '🌲',
        stone: '🪨',
        metal: '⛏️',
        planks: '🪵',
        production: '⚙️',
        gold: '💰',
        population: '👥'
    },

    // Building costs - what resources are required to build each building
    buildingCosts: {
        // Starter Buildings
        tent: {}, // Placed from inventory; no construction cost
        foundersWagon: {}, // Free to place from inventory

        // Essential Buildings
        townCenter: { wood: 50 },
        house: { wood: 25 },
        farm: { wood: 20 },
        buildersHut: { wood: 30, stone: 15 }, // Professional building for builders
        storehouse: { wood: 40, stone: 20 },

        // Production Buildings  
        woodcutterLodge: { wood: 20, stone: 40, gold: 0 }, // Gold cost removed
        quarry: { wood: 60, stone: 80, gold: 0 }, // Gold cost removed
        lumberMill: { wood: 100, stone: 60, gold: 80, planks: 20 }, // Industrial facility
        mine: { wood: 60, stone: 40 },

        // Basic Craft Buildings
        workshop: { wood: 35, stone: 25, gold: 15 },
        blacksmith: { wood: 50, stone: 30, metal: 20 },

        // Trade & Culture Buildings
        market: { wood: 80, stone: 40, planks: 20 },
        academy: { wood: 120, stone: 80, planks: 40 },

        // Royal Buildings
        keep: { gold: 100, wood: 50, stone: 30, planks: 25 },
        monument: { stone: 75, gold: 50, wood: 25, planks: 20 },

        // Military Buildings
        barracks: { wood: 30, stone: 20 }, // Accessible early game - unlocks World view
        fortifications: { stone: 60, wood: 40, gold: 30, planks: 15 },
        militaryAcademy: { wood: 80, stone: 50, gold: 40, planks: 25 },
        castle: { wood: 50, stone: 150, metal: 75, planks: 100 },

        // Advanced Buildings (Planks-heavy)
        magicalTower: { gold: 200, stone: 100, wood: 75, metal: 50, planks: 80 },
        grandLibrary: { gold: 150, wood: 100, stone: 75, planks: 60 },
        university: { wood: 200, stone: 100, gold: 50, metal: 30, planks: 120 }
    },

    // Building production - capabilities per building (no direct resource outputs)
    buildingProduction: {
        // Starter Buildings
        tent: {
            populationCapacity: 4, // Provides housing for 4 people (reduced from 5)
            jobs: {
                builder: 2, // Provides 2 builder jobs
                gatherer: 2 // Provides 2 gatherer jobs
            }
        },

        // Essential Buildings
        foundersWagon: {
            populationCapacity: 3, // Provides housing for 3 people
            // Storage contribution for all resources
            storage: { all: 100 },
            jobs: {
                gatherer: 3, // Provides 3 gatherer jobs
                builder: 4  // Provides 4 builder jobs for construction
            }
        },
        townCenter: {
            // Storage contribution for all resources
            storage: { all: 200 },
            jobs: {
                gatherer: 2 // Provides 2 gatherer jobs
            }
        },
        house: {
            populationCapacity: 6 // Each house provides capacity for 6 population; 0 jobs
        },
        farm: {
            jobs: {
                farmer: 2 // Provides 2 farmer jobs
            }
        },
        buildersHut: {
            jobs: {
                builder: 4, // Provides 4 builder jobs (more efficient than tents)
                foreman: 1 // Provides 1 foreman job for construction management
            }
        },
        storehouse: {
            // Central storage building with basic logistics
            storage: { all: 300 },
            jobs: { gatherer: 1 }
        },

        // Production Buildings
        woodcutterLodge: {
            jobs: {
                woodcutter: 3 // 3 woodcutters only
            }
        },
        quarry: {
            jobs: {
                rockcutter: 3 // 3 rockcutters (cutting rocks only)
            }
        },
        lumberMill: {
            jobs: {
                sawyer: 3 // 3 sawyers
            }
        },
        mine: {
            jobs: {
                miner: 3 // 3 miners
            }
        },
        workshop: {
            // No passive bonus; engineers only
            jobs: {
                engineer: 3
            }
        },
        blacksmith: {
            jobs: {
                blacksmith: 2
            }
        },

        // Trade & Culture Buildings
        market: {
            // No storage; traders only
            jobs: {
                trader: 3
            }
        },
        academy: {
            // No bonus for now
            jobs: {
                scholar: 1
            }
        },
        university: {
            // No bonus for now
            jobs: {
                professor: 1
            }
        },

        // Royal Buildings
        keep: {
            // Unlocks Throne View
            royalCapacity: 2 // +2 to Royal Population
        },
        monument: {
            happiness: 10 // +10 happiness
        },

        // Military Buildings
        barracks: {
            // Allows forming an army
            jobs: {
                drillInstructor: 1
            }
        },
        fortifications: {
            defense: 1 // Bonus to defending during battles
        },
        militaryAcademy: {
            jobs: {
                militaryTheorist: 1
            }
        },
        castle: {
            civilLeaders: 1 // +1 to civil leaders
        },

        // Advanced Buildings
        magicalTower: {
            // Future key structure for magic systems
            jobs: {
                wizard: 1
            }
        },
        grandLibrary: {
            jobs: {
                scholar: 10
            }
        }
    },

    // Construction point requirements - how many work points each building requires
    constructionPoints: {
        // Starter Buildings
        tent: 15, // Quick to build

        // Essential Buildings
        townCenter: 10,
        house: 5,
        farm: 7,
        storehouse: 10,

        // Production Buildings
        woodcutterLodge: 45,
        quarry: 60,
        lumberMill: 55,
        mine: 75,
        workshop: 50,
        blacksmith: 55,

        // Trade & Culture Buildings  
        market: 70,
        academy: 100,
        university: 180,

        // Royal Buildings
        keep: 80,
        monument: 200, // Multi-generational construction

        // Military Buildings
        barracks: 20, // Quick to build - important for unlocking World view
        fortifications: 65,
        militaryAcademy: 90,
        castle: 150,

        // Advanced Buildings
        magicalTower: 120,
        grandLibrary: 110,

        // Special Buildings
        buildersHut: 15, // Quick to build - helps scale up construction
        foundersWagon: 0 // Pre-built
    },

    // Building metadata - icons, names, descriptions
    buildingInfo: {
        // Starter Buildings
        tent: {
            icon: '⛺',
            name: 'Tent',
            description: 'Temporary shelter providing basic housing and worker assignments',
            effects: 'Provides housing for 4 people • 2 Builder jobs • 2 Gatherer jobs'
        },

        // Essential Buildings
        foundersWagon: {
            icon: '🚛',
            name: 'Founder Wagon',
            description: 'Mobile command center and storage facility for new settlements',
            effects: 'Provides housing for 3 people • Storage capacity • 3 Gatherer jobs • 4 Builder jobs'
        },
        townCenter: {
            icon: '🏛️',
            name: 'Town Center',
            description: 'Central building that serves as the heart of your settlement',
            effects: '2 Gatherer jobs • Settlement coordination'
        },
        house: {
            icon: '🏠',
            name: 'House',
            description: 'Comfortable housing for families and workers',
            effects: 'Provides housing for 6 people'
        },
        farm: {
            icon: '🌾',
            name: 'Farm',
            description: 'Agricultural facility for growing crops and livestock',
            effects: '2 Farmer jobs • Food via workers (seasonal multipliers apply)'
        },
        buildersHut: {
            icon: '🔨',
            name: 'Builder\'s Hut',
            description: 'Professional construction facility with skilled workers',
            effects: '4 Builder jobs • 1 Foreman job • Enhanced construction efficiency'
        },
        storehouse: {
            icon: '📦',
            name: 'Storehouse',
            description: 'Central storage building increasing resource caps and basic logistics',
            effects: '1 Gatherer job • +300 storage to all resources'
        },

        // Production Buildings
        woodcutterLodge: {
            icon: '🪚',
            name: 'Woodcutter Lodge',
            description: 'Traditional wood processing facility for established settlements',
            effects: '3 Woodcutter jobs • Wood via workers'
        },
        quarry: {
            icon: '⛏️',
            name: 'Quarry',
            description: 'Large-scale stone extraction operation for major construction projects',
            effects: '3 Rockcutter jobs • Stone via workers'
        },
        lumberMill: {
            icon: '🪓',
            name: 'Lumber Mill',
            description: 'Advanced industrial facility processing raw lumber into refined construction materials',
            effects: '3 Sawyer jobs • Converts wood to planks via workers'
        },
        mine: {
            icon: '⛏️',
            name: 'Mine',
            description: 'Deep excavation site for stone and metal extraction',
            effects: '3 Miner jobs • Extracts stone/metal via workers'
        },
        workshop: {
            icon: '🔧',
            name: 'Workshop',
            description: 'Engineering facility for construction and machinery',
            effects: '3 Engineer jobs'
        },
        blacksmith: {
            icon: '⚒️',
            name: 'Blacksmith',
            description: 'Metalworking facility for tools and weapons',
            effects: '2 Blacksmith jobs • Crafts tools/weapons via workers'
        },

        // Trade & Culture Buildings
        market: {
            icon: '🏪',
            name: 'Market',
            description: 'Trading hub for commerce and gold generation',
            effects: '3 Trader jobs • Generates gold via workers'
        },
        academy: {
            icon: '🎓',
            name: 'Academy',
            description: 'Educational institution for research and learning',
            effects: '1 Scholar job'
        },
        university: {
            icon: '🏛️',
            name: 'University',
            description: 'Advanced center of learning and innovation',
            effects: '1 Professor job'
        },

        // Royal Buildings
        keep: {
            icon: '🏰',
            name: 'The Keep',
            description: 'Unlocks Throne View and houses members of the royal family',
            effects: 'Unlocks Throne View • +2 Royal Capacity'
        },
        monument: {
            icon: '🗿',
            name: 'Monument',
            description: 'Grand structure celebrating your dynasty\'s achievements',
            effects: '+10 happiness'
        },

        // Military Buildings
        barracks: {
            icon: '⚔️',
            name: 'Barracks',
            description: 'Military training facility for soldiers and defense',
            effects: '1 Drill Instructor job • Allows forming an army'
        },
        fortifications: {
            icon: '🛡️',
            name: 'Fortifications',
            description: 'Defensive structures protecting your settlement',
            effects: 'Bonus to defending during battles'
        },
        militaryAcademy: {
            icon: '🎓',
            name: 'Military Academy',
            description: 'Elite training facility for commanders and heirs',
            effects: '1 Military Theorist job'
        },
        castle: {
            icon: '🏰',
            name: 'Castle',
            description: 'Ultimate fortress and seat of power',
            effects: '+1 Civil Leader'
        },

        // Advanced Buildings
        magicalTower: {
            icon: '🔮',
            name: 'Magical Tower',
            description: 'Mystical research facility for supernatural abilities',
            effects: '1 Wizard job • Key structure (future)'
        },
        grandLibrary: {
            icon: '📚',
            name: 'Grand Library',
            description: 'Repository of knowledge preserving civilization\'s wisdom',
            effects: '10 Scholar jobs'
        }
    },


    // Building categories for organized UI display
    buildingCategories: {
        essential: ['townCenter', 'house', 'farm', 'storehouse'],
        production: ['woodcutterLodge', 'quarry', 'lumberMill', 'mine'],
        craft: ['workshop', 'blacksmith', 'market'],
        military: ['barracks', 'fortifications', 'militaryAcademy', 'castle'],
        royal: ['keep', 'monument'],
        knowledge: ['academy', 'university'],
        advanced: ['magicalTower', 'grandLibrary']
    },

    // Category descriptions for tooltips/help
    categoryDescriptions: {
        essential: 'Basic buildings needed to start and grow your settlement',
        production: 'Buildings that gather and process raw materials',
        craft: 'Buildings for crafting, trading, and equipment production',
        military: 'Buildings for defense, training, and military operations',
        royal: 'Buildings related to dynasty management and prestige',
        knowledge: 'Buildings for research, culture, and learning',
        advanced: 'Specialized late-game buildings with unique abilities'
    },

    // Starting resources for new games - minimal start with just one tent
    // Note: Starting population is handled by PopulationManager (1 royal + 4 villagers = 5)
    startingResources: {
        food: 10, // Small food supply to survive first few days
        wood: 25, // Enough wood for early construction
        stone: 5, // Minimal stone for basic needs
        metal: 0,  // Metal will be given through tutorial achievement
        planks: 0, // Planks produced by lumber mill from wood
        production: 0,
        gold: 0
    },

    // Resource caps (base storage capacity)
    resourceCaps: {
        food: 50,    // Base limit of 50 for each resource
        wood: 50,
        stone: 50,
        metal: 50,
        planks: 50,
        weapons: 50,
        tools: 50,
        production: 50,
        gold: 100    // Slightly higher base for gold
    },


    // Season multipliers for resource production - 8 seasonal periods (200 days total)
    seasonMultipliers: {
        // Major Seasons (30 days each)
        'Spring': { food: 1.2, wood: 1.0, stone: 1.0 },
        'Summer': { food: 1.5, wood: 0.8, stone: 1.2 },
        'Autumn': { food: 1.0, wood: 1.3, stone: 1.0 },
        'Winter': { food: 0.7, wood: 1.5, stone: 0.8 },

        // Transitional Seasons (10 days each)
        'Sprummer': { food: 1.35, wood: 0.9, stone: 1.1 }, // Spring → Summer transition
        'Sumtumn': { food: 1.25, wood: 1.15, stone: 1.0 }, // Summer → Autumn transition
        'Autinter': { food: 0.9, wood: 1.2, stone: 0.95 }, // Autumn → Winter transition
        'Winting': { food: 0.8, wood: 1.25, stone: 0.9 }   // Winter → Spring transition
    },

    // Season durations in days
    seasonDurations: {
        // Major Seasons (30 days each)
        'Spring': 30,
        'Summer': 30,
        'Autumn': 30,
        'Winter': 30,

        // Transitional Seasons (10 days each)
        'Sprummer': 10,
        'Sumtumn': 10,
        'Autinter': 10,
        'Winting': 10
    },

    // Season progression order
    seasonProgression: [
        'Spring', 'Sprummer', 'Summer', 'Sumtumn',
        'Autumn', 'Autinter', 'Winter', 'Winting'
    ],

    // Helper functions to format and display data
    formatCost: function (buildingType) {
        const cost = this.buildingCosts[buildingType];
        if (!cost) return '';

        const costParts = [];
        Object.keys(cost).forEach(resource => {
            const icon = this.resourceIcons[resource] || resource;
            costParts.push(`${icon} ${cost[resource]}`);
        });
        return `(${costParts.join(' ')})`;
    },

    formatBuildingButton: function (buildingType) {
        const info = this.buildingInfo[buildingType];
        const cost = this.formatCost(buildingType);
        const points = this.constructionPoints[buildingType];

        if (!info) return buildingType;

        return `${info.icon} ${info.name} ${cost} - ${points} work points`;
    },

    getBuildingIcon: function (buildingType) {
        return this.buildingInfo[buildingType]?.icon || '🏗️';
    },

    getBuildingName: function (buildingType) {
        return this.buildingInfo[buildingType]?.name || buildingType;
    },

    getBuildingDescription: function (buildingType) {
        return this.buildingInfo[buildingType]?.description || 'A building';
    },

    // Get buildings by category
    getBuildingsByCategory: function (category) {
        return this.buildingCategories[category] || [];
    },

    // Get category for a building type
    getBuildingCategory: function (buildingType) {
        for (const [category, buildings] of Object.entries(this.buildingCategories)) {
            if (buildings.includes(buildingType)) {
                return category;
            }
        }
        return null;
    },

    // Calculate population cap based on number of houses
    calculatePopulationCap: function (buildings) {
        let totalCap = 0;
        buildings.forEach(building => {
            // Only count completed buildings (level >= 1 and built)
            if (building.level < 1 || !building.built) {
                return; // Skip buildings under construction
            }

            // Check if building provides population capacity
            const buildingData = this.buildingProduction[building.type];
            if (buildingData && buildingData.populationCapacity) {
                totalCap += buildingData.populationCapacity;
            }
            // Legacy support for specific building types
            else if (building.type === 'house') {
                totalCap += this.buildingProduction.house.populationCapacity || 5;
            }
            // Town centers also provide some population capacity
            else if (building.type === 'townCenter') {
                totalCap += 3; // Base capacity from town center
            }
        });
        return totalCap; // Base case is 0, only buildings/tech provide capacity
    },

    // Calculate storage capacity for a resource (data-driven, season-invariant)
    calculateSeasonalStorageCap: function (resource, season, buildings) {
        const baseCap = this.resourceCaps[resource] || 999;
        // Storage is NOT affected by seasons; seasonal modifiers apply to production only
        const seasonalMod = 1.0;

        let buildingBonus = 0;
        buildings.forEach(building => {
            if (building.level < 1 || !building.built) return;
            const def = this.buildingProduction[building.type];
            const storage = def && def.storage;
            if (!storage) return;
            if (typeof storage.all === 'number') {
                buildingBonus += storage.all;
            }
            if (typeof storage[resource] === 'number') {
                buildingBonus += storage[resource];
            }
        });

        return Math.floor((baseCap + buildingBonus) * seasonalMod);
    },

    // ===== POPULATION SYSTEM =====
    // ===== POPULATION SYSTEM DEFAULTS =====
    // Age is stored in days. Age brackets:
    //   - Children: 0–15 days (cannot work)
    //   - Working Age: 16–190 days (can work, be assigned jobs)
    //   - Elder: 191–197 days (can mentor, provide village bonuses)
    //   - Death: Probability-based starting at 180 days, increasing gradually
    // Population capacity: 6 people per house
    // Skills: Permanent once learned, with 5 levels (novice/apprentice/journeyman/expert/master)
    // Training modes: training (+100% XP, -50% productivity), resources (normal), balanced (auto-optimize)
    // Mentorship: Expert/Master villagers provide +50% XP to nearby learners
    // Age-based learning: Younger villagers (16-30) learn skills 25% faster than older ones

    // Default population templates for new games
    startingPopulation: [],

    // Role definitions (where they work, what they do)
    populationRoles: {
        farmer: {
            label: 'Farmer',
            buildingType: 'farm',
            description: 'Produces food at farms.'
        },
        woodcutter: {
            label: 'Woodcutter',
            buildingType: 'woodcutterLodge',
            description: 'Produces wood at woodcutter lodges.'
        },
        sawyer: {
            label: 'Sawyer',
            buildingType: 'lumberMill',
            description: 'Processes wood into planks at lumber mills.'
        },
        rockcutter: {
            label: 'Rockcutter',
            buildingType: 'quarry',
            description: 'Cuts and moves rock at the quarry.'
        },
        miner: {
            label: 'Miner',
            buildingType: 'mine',
            description: 'Extracts stone and metal from mines.'
        },
        engineer: {
            label: 'Engineer',
            buildingType: 'workshop',
            description: 'Builds and maintains machinery at workshops.'
        },
        blacksmith: {
            label: 'Blacksmith',
            buildingType: 'blacksmith',
            description: 'Forges metal tools and weapons.'
        },
        trader: {
            label: 'Trader',
            buildingType: 'market',
            description: 'Generates gold at markets.'
        },
        scholar: {
            label: 'Scholar',
            buildingType: 'academy',
            description: 'Researches new technologies at academies.'
        },
        professor: {
            label: 'Professor',
            buildingType: 'university',
            description: 'Conducts advanced research at universities.'
        },
        drillInstructor: {
            label: 'Drill Instructor',
            buildingType: 'barracks',
            description: 'Trains recruits and organizes drills.'
        },
        militaryTheorist: {
            label: 'Military Theorist',
            buildingType: 'militaryAcademy',
            description: 'Develops strategies and doctrine.'
        },
        wizard: {
            label: 'Wizard',
            buildingType: 'magicalTower',
            description: 'Studies magic at the magical tower.'
        },
        peasant: {
            label: 'Peasant',
            buildingType: null,
            description: 'Unassigned, can be given any job.'
        }
    },

    // Status types for population
    populationStatuses: ['idle', 'working', 'traveling', 'sick', 'dead'],

    // Demographic options (for extensibility)
    populationGenders: ['male', 'female'],

    // Utility: get default role for a building type
    getDefaultRoleForBuilding: function (buildingType) {
        for (const [role, def] of Object.entries(this.populationRoles)) {
            if (def.buildingType === buildingType) return role;
        }
        return 'peasant';
    }

    /**
     * Generate a new population member from a list of names and random gender.
     * @param {string[]} names - List of possible names.
     * @param {object} [options] - Optional overrides (age, role, etc.)
     * @returns {object} New population member object.
     */
    , generatePopulationMember: function (names, options = {}) {
        // Only 'male' or 'female' genders
        const gender = Math.random() < 0.5 ? 'male' : 'female';
        const name = names[Math.floor(Math.random() * names.length)];
        // Default to young adult (28–45 days)
        const age = options.age !== undefined ? options.age : 10 + Math.floor(Math.random() * 6);
        const role = options.role || 'peasant';
        const status = options.status || 'idle';
        const buildingId = options.buildingId || null;
        const skills = options.skills || [];
        return {
            id: options.id || Date.now() + Math.floor(Math.random() * 10000),
            name,
            role,
            age,
            gender,
            status,
            buildingId,
            skills
        };
    }
};

// Normalize derived fields after definition (browser-safe)
(function ensureGameDataNormalization() {
    try {
        if (GameData && GameData.buildingProduction) {
            Object.keys(GameData.buildingProduction).forEach(type => {
                const def = GameData.buildingProduction[type];
                if (def && typeof def === 'object' && !def.storage) {
                    def.storage = {};
                }
            });
        }
    } catch (e) {
        console.error('[GameData] Normalization failed:', e);
    }
})();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameData;
} else if (typeof window !== 'undefined') {
    window.GameData = GameData;
}

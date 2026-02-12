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
        // Essential Buildings
        townCenter: { wood: 50 },
        house: { wood: 15 },
        farm: { wood: 20 },
        buildersHut: { wood: 30, stone: 15 }, // Professional building for builders
        storehouse: { wood: 40, stone: 20 },

        // Production Buildings  
        woodcutterLodge: { wood: 25, stone: 5 },
        huntersLodge: { wood: 30, stone: 15 },
        quarry: { wood: 60, stone: 20 },
        lumberMill: { wood: 100, stone: 60, gold: 200 }, // Industrial facility
        mine: { wood: 60, stone: 40 },

        // Basic Craft Buildings
        workshop: { wood: 35, stone: 25, gold: 40 },
        blacksmith: { wood: 50, stone: 30, metal: 20 },

        // Trade & Culture Buildings
        market: { wood: 80, stone: 40, planks: 20 },
        academy: { wood: 120, stone: 80, planks: 40 },

        // Royal Buildings
        keep: { gold: 250, wood: 50, stone: 30, planks: 25 },
        monument: { stone: 75, gold: 120, wood: 25, planks: 20 },

        // Military Buildings
        barracks: { wood: 30, stone: 20 }, // Accessible early game - unlocks World view
        fortifications: { stone: 60, wood: 40, gold: 80, planks: 15 },
        militaryAcademy: { wood: 80, stone: 50, gold: 100, planks: 25 },
        castle: { wood: 50, stone: 150, metal: 75, planks: 100 },

        // Advanced Buildings (Planks-heavy)
        magicalTower: { gold: 500, stone: 100, wood: 75, metal: 50, planks: 80 },
        grandLibrary: { gold: 350, wood: 100, stone: 75, planks: 60 },
        university: { wood: 200, stone: 100, gold: 150, metal: 30, planks: 120 },
        temple: { stone: 50, gold: 80, wood: 40 },

        // Storage & Livestock
        silo: { wood: 40, stone: 30 },
        pasture: { wood: 35, stone: 10 }
    },

    // Building production - capabilities per building (no direct resource outputs)
    buildingProduction: {
        // Essential Buildings
        townCenter: {
            // Storage contribution for all resources
            storage: { all: 200, gold: 2000 },
            jobs: { gatherer: 2 }
            // Tax collection is handled by economySystem based on population
        },
        house: {
            populationCapacity: 8,
            jobs: { gatherer: 1 }
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
        huntersLodge: {
            jobs: {
                hunter: 2 // 2 hunters
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
        },
        temple: {
            jobs: {
                priest: 1
            }
        },

        // Storage & Livestock
        silo: {
            storage: { food: 500 }
        },
        pasture: {
            jobs: {
                herder: 1
            }
        }
    },

    // Construction point requirements - how many work points each building requires
    constructionPoints: {
        // Essential Buildings
        townCenter: 10,
        house: 5,
        farm: 7,
        storehouse: 10,

        // Production Buildings
        woodcutterLodge: 15,
        huntersLodge: 12,
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
        temple: 60,

        // Special Buildings
        buildersHut: 15, // Quick to build - helps scale up construction

        // Storage & Livestock
        silo: 25,
        pasture: 20
    },

    // Building metadata - icons, names, descriptions
    buildingInfo: {
        // Essential Buildings
        townCenter: {
            icon: '🏛️',
            name: 'Town Center',
            description: 'The heart of your settlement. Enables tax collection from all working citizens',
            effects: '+200 storage • Taxes: 1💰/citizen/day • +10% per level'
        },
        house: {
            icon: '🏠',
            name: 'House',
            description: 'Cozy homes for your growing population. More houses = more workers!',
            effects: '+9 housing capacity per house'
        },
        farm: {
            icon: '🌾',
            name: 'Farm',
            description: 'Grows crops to feed your people. Production varies by season!',
            effects: '2 Farmer jobs • +5🍖 food/farmer/day • Spring/Summer bonus, Winter penalty'
        },
        buildersHut: {
            icon: '🔨',
            name: "Builder's Hut",
            description: 'Professional builders work faster and unlock complex construction',
            effects: '4 Builder jobs • 1 Foreman (speeds up construction)'
        },
        storehouse: {
            icon: '📦',
            name: 'Storehouse',
            description: 'Expands your storage capacity and provides gathering work',
            effects: '+300 storage (all resources) • 1 Gatherer job'
        },

        // Production Buildings
        woodcutterLodge: {
            icon: '🪚',
            name: 'Woodcutter Lodge',
            description: 'Chop trees and haul lumber back to the village',
            effects: '3 Woodcutter jobs • +3🪵 wood/worker/day'
        },
        huntersLodge: {
            icon: '🦌',
            name: "Hunter's Lodge",
            description: 'Hunters track and bring back game for food',
            effects: '2 Hunter jobs • +3.5🍖 food/hunter/day • Autumn/Winter bonus'
        },
        quarry: {
            icon: '⛏️',
            name: 'Quarry',
            description: 'Cut stone blocks from the rocky hillside',
            effects: '3 Rockcutter jobs • +3🪨 stone/worker/day'
        },
        lumberMill: {
            icon: '🪓',
            name: 'Lumber Mill',
            description: 'Process raw logs into refined planks for advanced construction',
            effects: '3 Sawyer jobs • Converts 2🪵→2📐 planks/worker/day'
        },
        mine: {
            icon: '⛏️',
            name: 'Mine',
            description: 'Dig deep for stone and precious metal ore',
            effects: '3 Miner jobs • +2🪨 stone + 1⛏️ metal/worker/day'
        },
        workshop: {
            icon: '🔧',
            name: 'Workshop',
            description: 'Engineers craft tools and machinery that boost village efficiency',
            effects: '3 Engineer jobs • +3⚙️ production/worker/day'
        },
        blacksmith: {
            icon: '⚒️',
            name: 'Blacksmith',
            description: 'Forge metal into weapons and tools for your people',
            effects: '2 Blacksmith jobs • Uses 1⛏️ metal → +1⚔️ weapons + 2🔧 tools/day'
        },

        // Trade & Culture Buildings
        market: {
            icon: '🏪',
            name: 'Market',
            description: 'Traders buy and sell goods, generating gold for your treasury',
            effects: '3 Trader jobs • +2💰 gold/trader/day'
        },
        academy: {
            icon: '🎓',
            name: 'Academy',
            description: 'Scholars research new knowledge and train skilled workers',
            effects: '1 Scholar job • Accelerates tech research'
        },
        university: {
            icon: '🏛️',
            name: 'University',
            description: 'Advanced learning and scientific breakthroughs',
            effects: '1 Professor job • Unlocks advanced technologies'
        },

        // Royal Buildings
        keep: {
            icon: '🏰',
            name: 'The Keep',
            description: 'A fortified residence for your royal family and their court',
            effects: 'Unlocks Throne View • +2 Royal Capacity • Dynasty management'
        },
        monument: {
            icon: '🗿',
            name: 'Monument',
            description: 'A grand testament to your dynasty\'s glory and achievements',
            effects: '+10 village happiness • Boosts prestige'
        },

        // Military Buildings
        barracks: {
            icon: '⚔️',
            name: 'Barracks',
            description: 'Train soldiers to defend your lands and conquer new territory',
            effects: '1 Drill Instructor • Enables army recruitment • Guards consume gold upkeep'
        },
        fortifications: {
            icon: '🛡️',
            name: 'Fortifications',
            description: 'Walls and towers to protect your people from invaders',
            effects: 'Defense bonus in battles • Reduces raid damage'
        },
        militaryAcademy: {
            icon: '🎓',
            name: 'Military Academy',
            description: 'Train commanders and develop advanced military tactics',
            effects: '1 Military Theorist • Improves army effectiveness'
        },
        castle: {
            icon: '🏰',
            name: 'Castle',
            description: 'The ultimate seat of power - a symbol of your dynasty\'s might',
            effects: '+1 Civil Leader • Major defense bonus • Prestige symbol'
        },

        // Advanced Buildings
        magicalTower: {
            icon: '🔮',
            name: 'Magical Tower',
            description: 'Mysterious arts and arcane research (coming soon!)',
            effects: '1 Wizard job • Future magical abilities'
        },
        grandLibrary: {
            icon: '📚',
            name: 'Grand Library',
            description: 'A repository of all knowledge accumulated across generations',
            effects: '10 Scholar jobs • Preserves dynasty history • Research bonus'
        },
        temple: {
            icon: '⛪',
            name: 'Temple',
            description: 'A place of worship and spiritual guidance',
            effects: '1 Priest job • +5 happiness • Religious ceremonies'
        },

        // Storage & Livestock
        silo: {
            icon: '🏗️',
            name: 'Silo',
            description: 'A large food storage facility to stockpile reserves',
            effects: '+500 food storage capacity'
        },
        pasture: {
            icon: '🐄',
            name: 'Pasture',
            description: 'Grazing land for livestock that provides a steady food supply',
            effects: '1 Herder job • +3🍖 food/day • Autumn bonus'
        }
    },


    // Building categories for organized UI display
    buildingCategories: {
        essential: ['townCenter', 'house', 'farm', 'buildersHut', 'storehouse', 'silo'],
        production: ['huntersLodge', 'woodcutterLodge', 'quarry', 'pasture'],
        intermediate: ['lumberMill', 'mine', 'workshop', 'blacksmith'],
        craft: ['workshop', 'blacksmith', 'market'],
        military: ['barracks', 'fortifications', 'militaryAcademy', 'castle'],
        royal: ['keep', 'monument'],
        knowledge: ['academy', 'university'],
        advanced: ['magicalTower', 'grandLibrary', 'temple']
    },

    // Category descriptions for tooltips/help
    categoryDescriptions: {
        essential: 'Basic buildings needed to start and grow your settlement',
        production: 'Buildings that gather and process raw materials',
        intermediate: 'Processing buildings that refine raw materials into advanced goods',
        craft: 'Buildings for crafting, trading, and equipment production',
        military: 'Buildings for defense, training, and military operations',
        royal: 'Buildings related to dynasty management and prestige',
        knowledge: 'Buildings for research, culture, and learning',
        advanced: 'Specialized late-game buildings with unique abilities'
    },

    // Starting resources for new games - minimal start
    // Note: Starting population is handled by PopulationManager (1 royal + 4 villagers = 5)
    startingResources: {
        food: 100, // Food supply to survive first season
        wood: 100, // Enough wood for early construction
        stone: 10, // Stone for basic needs
        metal: 0,  // Metal will be given through tutorial achievement
        planks: 0, // Planks produced by lumber mill from wood
        production: 0,
        gold: 0
    },

    // Resource caps (base storage capacity)
    resourceCaps: {
        food: 100,   // Base limit of 100 for food
        wood: 100,
        stone: 50,
        metal: 50,
        planks: 50,
        weapons: 50,
        tools: 50,
        production: 50,
        gold: Infinity    // Gold is uncapped
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
                const moPeopleBonus = window.gameState?.investments?.moPeople || 0;
                const baseCap = buildingData.populationCapacity + moPeopleBonus;
                const levelMult = 1 + ((building.level || 1) - 1) * 0.15;
                totalCap += Math.floor(baseCap * levelMult);
            }
            // Legacy support for specific building types
            else if (building.type === 'house') {
                const levelMult = 1 + ((building.level || 1) - 1) * 0.15;
                totalCap += Math.floor((this.buildingProduction.house.populationCapacity || 5) * levelMult);
            }
            // Town centers also provide some population capacity
            else if (building.type === 'townCenter') {
                totalCap += 3; // Base capacity from town center
            }
        });

        // Apply tech building capacity bonus
        const buildingCapBonus = window.gameState?.techBonuses?.buildingCapacity || 0;
        if (buildingCapBonus) totalCap = Math.floor(totalCap * (1 + buildingCapBonus));

        return totalCap; // Base case is 0, only buildings/tech provide capacity
    },

    // Calculate storage capacity for a resource (data-driven, season-invariant)
    calculateSeasonalStorageCap: function (resource, season, buildings) {
        // Gold is uncapped — no storage limit
        if (resource === 'gold') return Infinity;

        const baseCap = this.resourceCaps[resource] || 999;
        // Storage is NOT affected by seasons; seasonal modifiers apply to production only
        const seasonalMod = 1.0;

        let buildingBonus = 0;
        buildings.forEach(building => {
            if (building.level < 1 || !building.built) return;
            const def = this.buildingProduction[building.type];
            const storage = def && def.storage;
            if (!storage) return;
            const levelMult = 1 + ((building.level || 1) - 1) * 0.1;
            if (typeof storage.all === 'number') {
                buildingBonus += Math.floor(storage.all * levelMult);
            }
            if (typeof storage[resource] === 'number') {
                buildingBonus += Math.floor(storage[resource] * levelMult);
            }
        });

        // Apply tech storage capacity bonus
        const storageBonus = window.gameState?.techBonuses?.storageCapacity || 0;
        const techMult = storageBonus ? (1 + storageBonus) : 1;

        return Math.floor((baseCap + buildingBonus) * seasonalMod * techMult);
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
        hunter: {
            label: 'Hunter',
            buildingType: 'huntersLodge',
            description: 'Hunts game for food, strong in autumn and winter.'
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

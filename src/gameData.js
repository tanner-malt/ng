// ===== GAME DATA =====
// Centralized game configuration and data
// All costs, production rates, building stats, etc. are defined here

const GameData = {
    // Resource icons for UI display
    resourceIcons: {
        food: '🌾',
        wood: '🌲',
        stone: 'S',
        metal: 'M',
        planks: '🪵',
        production: '⚙️',
        gold: '💰',
        population: '👥'
    },

    // Building costs - what resources are required to build each building
    buildingCosts: {
        // Starter Buildings
        tent: { wood: 5 }, // Very cheap starter building
        foundersWagon: {}, // Free to place from inventory

        // Essential Buildings
        townCenter: { wood: 50 },
        house: { wood: 25 },
        farm: { wood: 20 },
        buildersHut: { wood: 30, stone: 15 }, // Professional building for builders

        // Production Buildings  
        woodcutterLodge: { wood: 20, stone: 40, gold: 50 }, // Reduced wood cost
        quarry: { wood: 60, stone: 80, gold: 40 }, // Also more expensive
        lumberMill: { wood: 100, stone: 60, gold: 80, planks: 20 }, // Industrial facility
        mine: { wood: 60, stone: 40 },

        // Basic Craft Buildings
        workshop: { wood: 35, stone: 25, gold: 15 },
        blacksmith: { wood: 50, stone: 30, metal: 20 },

        // Trade & Culture Buildings
        market: { wood: 80, stone: 40, planks: 20 },
        temple: { wood: 100, stone: 60, planks: 30 },
        academy: { wood: 120, stone: 80, planks: 40 },

        // Royal Buildings
        keep: { gold: 100, wood: 50, stone: 30, planks: 25 },
        monument: { stone: 75, gold: 50, wood: 25, planks: 20 },

        // Military Buildings
        barracks: { wood: 40, stone: 30, gold: 20 }, // Removed planks requirement
        fortifications: { stone: 60, wood: 40, gold: 30, planks: 15 },
        militaryAcademy: { wood: 80, stone: 50, gold: 40, planks: 25 },
        castle: { wood: 50, stone: 150, metal: 75, planks: 100 },

        // Advanced Buildings (Planks-heavy)
        magicalTower: { gold: 200, stone: 100, wood: 75, metal: 50, planks: 80 },
        grandLibrary: { gold: 150, wood: 100, stone: 75, planks: 60 },
        university: { wood: 200, stone: 100, gold: 50, metal: 30, planks: 120 }
    },

    // Building production - what resources buildings generate per day/cycle
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
            jobs: {
                gatherer: 2, // Provides 2 gatherer jobs
                crafter: 1 // Provides 1 crafter job
            }
        },
        townCenter: {
            jobs: {
                gatherer: 3, // Provides 3 gatherer jobs
                crafter: 2 // Provides 2 crafter jobs
            }
        },
        house: {
            populationCapacity: 6, // Each house provides capacity for 6 population
            jobs: {
                crafter: 1 // Houses provide basic crafting jobs
            }
        },
        farm: {
            food: 10, // Legacy resource production (to be phased out)
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

        // Production Buildings
        woodcutterLodge: {
            wood: 5, // Basic wood production from woodcutter lodge
            jobs: {
                woodcutter: 2, // Basic wood cutting jobs
                sawyer: 1 // Basic wood processing job
            }
        },
        quarry: {
            stone: 6, // Legacy resource production (to be phased out)
            jobs: {
                miner: 2, // Provides 2 miner jobs
                stonecutter: 1 // Provides 1 stonecutter job
            }
        },
        lumberMill: {
            wood: 2, // Some basic wood production
            planks: 8, // Primary focus: refined planks production
            jobs: {
                lumber_worker: 3, // Advanced lumber processing specialists
                woodcutter: 1 // Some basic cutting still needed
            }
        },
        mine: {
            stone: 8,
            metal: 3 // Also produces metal
        },
        workshop: {
            efficiency: 1.1, // 10% boost to nearby production
            tools: 2 // Produces tools/equipment
        },
        blacksmith: {
            metal: 4,
            weapons: 2
        },

        // Trade & Culture Buildings
        market: {
            gold: 5,
            trade: 3
        },
        temple: {
            influence: 3,
            happiness: 4
        },
        academy: {
            research: 2,
            efficiency: 1.15 // 15% boost to all production
        },
        university: {
            research: 8,
            efficiency: 1.5 // 50% boost to all production
        },

        // Royal Buildings
        keep: {
            dynastyBonus: 1.1, // 10% bonus to dynasty-related activities
            royalCapacity: 3 // Can house 3 royal family members
        },
        monument: {
            prestige: 5, // Cultural/legacy points
            happiness: 2 // Population happiness bonus
        },

        // Military Buildings
        barracks: {
            soldiers: 1,
            defense: 2,
            skillTraining: 'military' // Provides military skill training
        },
        fortifications: {
            defense: 5,
            territoryControl: 1 // Expands controlled territory
        },
        militaryAcademy: {
            commanderTraining: 2, // Trains commanders and heirs
            tacticalBonus: 1.15 // 15% bonus to military effectiveness
        },
        castle: {
            defense: 10,
            soldiers: 2,
            influence: 15
        },

        // Advanced Buildings
        magicalTower: {
            magicResearch: 3, // Magical ability development
            dynastyMagic: 1.2 // 20% bonus to magical bloodline abilities
        },
        grandLibrary: {
            research: 5, // Technology research points
            knowledgePreservation: 1.3 // 30% bonus to knowledge retention across dynasties
        }
    },

    // Construction point requirements - how many work points each building requires
    constructionPoints: {
        // Starter Buildings
        tent: 15, // Quick to build

        // Essential Buildings
        townCenter: 50,
        house: 25,
        farm: 35,

        // Production Buildings
        woodcutterLodge: 45,
        quarry: 60,
        lumberMill: 55,
        mine: 75,
        workshop: 50,
        blacksmith: 55,

        // Trade & Culture Buildings  
        market: 70,
        temple: 85,
        academy: 100,
        university: 180,

        // Royal Buildings
        keep: 80,
        monument: 200, // Multi-generational construction

        // Military Buildings
        barracks: 45,
        fortifications: 65,
        militaryAcademy: 90,
        castle: 150,

        // Advanced Buildings
        magicalTower: 120,
        grandLibrary: 110,

        // Special Buildings
        buildersHut: 40,
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
            effects: 'Provides housing for 3 people • Storage capacity • 2 Gatherer jobs • 1 Crafter job'
        },
        townCenter: {
            icon: '🏛️',
            name: 'Town Center',
            description: 'Central building that serves as the heart of your settlement',
            effects: '3 Gatherer jobs • 2 Crafter jobs • Settlement coordination'
        },
        house: {
            icon: '🏠',
            name: 'House',
            description: 'Comfortable housing for families and workers',
            effects: 'Provides housing for 6 people • 1 Crafter job'
        },
        farm: {
            icon: '🌾',
            name: 'Farm',
            description: 'Agricultural facility for growing crops and livestock',
            effects: 'Produces +10 food daily • 2 Farmer jobs'
        },
        buildersHut: {
            icon: '🔨',
            name: 'Builder\'s Hut',
            description: 'Professional construction facility with skilled workers',
            effects: '4 Builder jobs • 1 Foreman job • Enhanced construction efficiency'
        },

        // Production Buildings
        woodcutterLodge: {
            icon: '🪚',
            name: 'Woodcutter Lodge',
            description: 'Traditional wood processing facility for established settlements',
            effects: 'Produces +5 wood daily • 2 Woodcutter jobs • 1 Sawyer job • Enables advanced construction'
        },
        quarry: {
            icon: '⛏️',
            name: 'Quarry',
            description: 'Large-scale stone extraction operation for major construction projects',
            effects: 'Produces +6 stone daily • 2 Miner jobs • 1 Stonecutter job • Enables monumental architecture'
        },
        lumberMill: {
            icon: '🪓',
            name: 'Lumber Mill',
            description: 'Advanced industrial facility processing raw lumber into refined construction materials',
            effects: 'Produces +2 wood and +8 planks daily • 3 Lumber Worker jobs • 1 Woodcutter job • +25% construction speed nearby'
        },
        mine: {
            icon: '⛏️',
            name: 'Mine',
            description: 'Deep excavation site for stone and metal extraction',
            effects: 'Produces +8 stone and +3 metal daily • Valuable resource extraction'
        },
        workshop: {
            icon: '🔧',
            name: 'Workshop',
            description: 'General crafting facility with production bonuses',
            effects: '+10% production efficiency bonus • Produces +2 tools daily'
        },
        blacksmith: {
            icon: '⚒️',
            name: 'Blacksmith',
            description: 'Metalworking facility for tools and weapons',
            effects: 'Produces +4 metal and +2 weapons daily • Enhanced production efficiency'
        },

        // Trade & Culture Buildings
        market: {
            icon: '🏪',
            name: 'Market',
            description: 'Trading hub for commerce and gold generation',
            effects: 'Generates +5 gold and +3 trade value daily • Improves trade efficiency'
        },
        temple: {
            icon: '⛪',
            name: 'Temple',
            description: 'Spiritual center providing guidance and happiness',
            effects: 'Generates +3 influence and +4 happiness • Population morale boost'
        },
        academy: {
            icon: '🎓',
            name: 'Academy',
            description: 'Educational institution for research and learning',
            effects: '+2 research daily • +15% production efficiency bonus • Knowledge advancement'
        },
        university: {
            icon: '🏛️',
            name: 'University',
            description: 'Advanced center of learning and innovation',
            effects: '+8 research daily • +50% production efficiency bonus • Major knowledge boost'
        },

        // Royal Buildings
        keep: {
            icon: '🏰',
            name: 'The Keep',
            description: 'Royal stronghold for dynasty management and succession',
            effects: '+10% dynasty bonus • Houses 3 royal family members • Royal authority'
        },
        monument: {
            icon: '🗿',
            name: 'Monument',
            description: 'Grand structure celebrating your dynasty\'s achievements',
            effects: '+5 prestige and +2 happiness • Multi-generational legacy bonuses'
        },

        // Military Buildings
        barracks: {
            icon: '⚔️',
            name: 'Barracks',
            description: 'Military training facility for soldiers and defense',
            effects: 'Trains +1 soldier • +2 defense • Military skill training • Unit recruitment'
        },
        fortifications: {
            icon: '🛡️',
            name: 'Fortifications',
            description: 'Defensive structures protecting your settlement',
            effects: '+5 defense • +1 territory control • Expands controlled area'
        },
        militaryAcademy: {
            icon: '🎓',
            name: 'Military Academy',
            description: 'Elite training facility for commanders and heirs',
            effects: 'Trains 2 commanders • +15% military effectiveness • Advanced tactical training'
        },
        castle: {
            icon: '🏰',
            name: 'Castle',
            description: 'Ultimate fortress and seat of power',
            effects: '+10 defense • +2 soldiers • +15 influence • Ultimate defensive structure'
        },

        // Advanced Buildings
        magicalTower: {
            icon: '🔮',
            name: 'Magical Tower',
            description: 'Mystical research facility for supernatural abilities',
            effects: '+3 magic research • +20% dynasty magic bonus • Supernatural enhancement'
        },
        grandLibrary: {
            icon: '📚',
            name: 'Grand Library',
            description: 'Repository of knowledge preserving civilization\'s wisdom',
            effects: '+30% knowledge preservation • Technological research • Dynasty knowledge bonus'
        }
    },

    // Building categories for organized UI display
    buildingCategories: {
        essential: ['townCenter', 'house', 'farm'],
        production: ['woodcutterLodge', 'quarry', 'lumberMill', 'mine'],
        craft: ['workshop', 'blacksmith', 'market'],
        military: ['barracks', 'fortifications', 'militaryAcademy', 'castle'],
        royal: ['keep', 'monument'],
        knowledge: ['temple', 'academy', 'university'],
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
    startingResources: {
        food: 10, // Small food supply to survive first few days
        wood: 20, // Enough wood for early construction
        stone: 5, // Minimal stone for basic needs
        metal: 0,  // Metal will be given through tutorial achievement
        planks: 0, // Planks produced by lumber mill from wood
        production: 0,
        gold: 0,
        population: 1  // Start with 1 population (the player)
    },

    // Resource caps (base storage capacity)
    resourceCaps: {
        food: 50,    // Base limit of 50 for each resource
        wood: 50,
        stone: 50,
        metal: 50,
        planks: 50,
        production: 50,
        gold: 100    // Slightly higher base for gold
    },

    // Storage capacity modifiers by season (for strategic planning)
    seasonalStorageModifiers: {
        // Major Seasons - stable storage
        'Spring': { food: 1.0, wood: 1.0, stone: 1.0 },
        'Summer': { food: 1.2, wood: 0.9, stone: 1.1 }, // More food storage needed
        'Autumn': { food: 1.1, wood: 1.2, stone: 1.0 }, // Wood harvest season
        'Winter': { food: 0.9, wood: 1.0, stone: 0.9 }, // Harsh conditions reduce storage

        // Transitional Seasons - storage challenges
        'Sprummer': { food: 1.1, wood: 0.95, stone: 1.0 },
        'Sumtumn': { food: 1.0, wood: 1.1, stone: 1.0 },
        'Autinter': { food: 0.95, wood: 1.0, stone: 0.95 },
        'Winting': { food: 0.9, wood: 1.0, stone: 0.9 }
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

    // Calculate seasonal storage capacity for a resource
    calculateSeasonalStorageCap: function (resource, season, buildings) {
        const baseCap = this.resourceCaps[resource] || 999;
        const seasonalMod = this.seasonalStorageModifiers[season]?.[resource] || 1.0;

        // Add storage building bonuses (future enhancement)
        let buildingBonus = 0;
        buildings.forEach(building => {
            // Granaries, warehouses, etc. could add storage here
            if (building.type === 'market' && building.level > 0) {
                buildingBonus += 200; // Markets provide general storage
            }
            if (building.type === 'foundersWagon' && building.level > 0) {
                buildingBonus += 100; // Founders wagon provides 100 storage for each resource
            }
            if (building.type === 'townCenter' && building.level > 0) {
                buildingBonus += 200; // Town center provides 200 additional storage
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
        lumberjack: {
            label: 'Lumberjack',
            buildingType: 'lumberMill',
            description: 'Processes wood into planks at lumber mills.'
        },
        quarryWorker: {
            label: 'Quarry Worker',
            buildingType: 'quarry',
            description: 'Extracts stone at quarries.'
        },
        miner: {
            label: 'Miner',
            buildingType: 'mine',
            description: 'Extracts stone and metal from mines.'
        },
        craftsman: {
            label: 'Craftsman',
            buildingType: 'workshop',
            description: 'Creates tools and equipment at workshops.'
        },
        blacksmith: {
            label: 'Blacksmith',
            buildingType: 'blacksmith',
            description: 'Forges metal tools and weapons.'
        },
        marketTrader: {
            label: 'Market Trader',
            buildingType: 'market',
            description: 'Generates gold at markets.'
        },
        priest: {
            label: 'Priest',
            buildingType: 'temple',
            description: 'Provides influence and happiness at temples.'
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
        soldier: {
            label: 'Soldier',
            buildingType: 'barracks',
            description: 'Trains and defends at barracks.'
        },
        guard: {
            label: 'Guard',
            buildingType: 'fortifications',
            description: 'Defends from fortifications.'
        },
        officer: {
            label: 'Officer',
            buildingType: 'militaryAcademy',
            description: 'Trains advanced military tactics.'
        },
        noble: {
            label: 'Noble',
            buildingType: 'keep',
            description: 'Manages royal affairs at the keep.'
        },
        wizard: {
            label: 'Wizard',
            buildingType: 'magicalTower',
            description: 'Studies magic at the magical tower.'
        },
        librarian: {
            label: 'Librarian',
            buildingType: 'grandLibrary',
            description: 'Preserves knowledge at the grand library.'
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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameData;
} else if (typeof window !== 'undefined') {
    window.GameData = GameData;
}

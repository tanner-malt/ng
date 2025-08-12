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
        
        // Essential Buildings
        townCenter: { wood: 50 },
        house: { wood: 25 },
        farm: { wood: 20 },
        buildersHut: { wood: 30, stone: 15 }, // Professional building for builders
        
        // Production Buildings  
        sawmill: { wood: 40, stone: 20 },
        quarry: { wood: 40, stone: 60 },
        lumberMill: { wood: 50, stone: 30 },
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
        barracks: { wood: 40, stone: 30, gold: 20 },
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
            populationCapacity: 5, // Provides housing for 5 people
            jobs: {
                builder: 2 // Provides 2 builder jobs
            }
        },
        
        // Essential Buildings
        townCenter: { 
            population: 2, 
        },
        house: { 
            populationCapacity: 5, // Each house provides capacity for 5 population
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
        sawmill: { 
            wood: 8, // Legacy resource production (to be phased out)
            jobs: {
                woodcutter: 3, // Provides 3 woodcutter jobs
                sawyer: 1 // Provides 1 sawyer job
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
            wood: 4, // Lower wood production but makes planks
            planks: 6 // Converts wood to planks
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

    // Construction times - how many days/hours it takes to build each building
    constructionTimes: {
        // Starter Buildings
        tent: 1, // Quick to build
        
        // Essential Buildings
        townCenter: 3,
        house: 1,
        farm: 2,
        
        // Production Buildings
        sawmill: 3,
        quarry: 4,
        lumberMill: 4,
        mine: 5,
        workshop: 4,
        blacksmith: 4,
        
        // Trade & Culture Buildings  
        market: 5,
        temple: 6,
        academy: 7,
        university: 12,
        
        // Royal Buildings
        keep: 5,
        monument: 10, // Multi-generational construction
        
        // Military Buildings
        barracks: 3,
        fortifications: 4,
        militaryAcademy: 6,
        castle: 10,
        
        // Advanced Buildings
        magicalTower: 8,
        grandLibrary: 7
    },

    // Building metadata - icons, names, descriptions
    buildingInfo: {
        // Starter Buildings
        tent: {
            icon: '⛺',
            name: 'Tent',
            description: 'Temporary shelter that provides basic housing and builder jobs'
        },
        
        // Essential Buildings
        townCenter: {
            icon: '🏛️',
            name: 'Town Center',
            description: 'Central building that boosts all production and provides population'
        },
        house: {
            icon: '🏠',
            name: 'House',
            description: 'Basic housing for your citizens'
        },
        farm: {
            icon: '🌾',
            name: 'Farm',
            description: 'Produces food for your settlement'
        },
        buildersHut: {
            icon: '🔨',
            name: 'Builders Hut',
            description: 'Professional building facility that provides efficient construction workers'
        },
        
        // Production Buildings
        sawmill: {
            icon: '🪚',
            name: 'Sawmill',
            description: 'Processes wood from nearby forests'
        },
        quarry: {
            icon: '⛏️',
            name: 'Quarry',
            description: 'Extracts stone from rocky terrain'
        },
        lumberMill: {
            icon: '🪓',
            name: 'Lumber Mill',
            description: 'Processes wood into planks for advanced construction'
        },
        mine: {
            icon: '⛏️',
            name: 'Mine',
            description: 'Extracts stone, ore, and precious materials'
        },
        workshop: {
            icon: '🔧',
            name: 'Workshop',
            description: 'General crafting and equipment production'
        },
        blacksmith: {
            icon: '⚒️',
            name: 'Blacksmith',
            description: 'Produces metal tools and weapons, boosts production efficiency'
        },
        
        // Trade & Culture Buildings
        market: {
            icon: '🏪',
            name: 'Market',
            description: 'Generates gold and improves trade efficiency'
        },
        temple: {
            icon: '⛪',
            name: 'Temple',
            description: 'Provides spiritual guidance and increases happiness'
        },
        academy: {
            icon: '�',
            name: 'Academy',
            description: 'Researches new technologies and boosts efficiency'
        },
        university: {
            icon: '�',
            name: 'University',
            description: 'Advanced research center with massive efficiency bonuses'
        },
        
        // Royal Buildings
        keep: {
            icon: '🏰',
            name: 'The Keep',
            description: 'Royal building for dynasty management and succession planning'
        },
        monument: {
            icon: '🗿',
            name: 'Monument',
            description: 'Multi-generational construction project providing legacy bonuses'
        },
        
        // Military Buildings
        barracks: {
            icon: '⚔️',
            name: 'Barracks',
            description: 'Trains basic military skills and unit recruitment'
        },
        fortifications: {
            icon: '🛡️',
            name: 'Fortifications',
            description: 'Defensive structures and military positioning'
        },
        militaryAcademy: {
            icon: '🎓',
            name: 'Military Academy',
            description: 'Advanced military skill training for commanders and heirs'
        },
        castle: {
            icon: '🏰',
            name: 'Castle',
            description: 'Ultimate defensive structure and seat of power'
        },
        
        // Advanced Buildings
        magicalTower: {
            icon: '🔮',
            name: 'Magical Tower',
            description: 'Supernatural research and magical ability enhancement'
        },
        grandLibrary: {
            icon: '�️',
            name: 'Grand Library',
            description: 'Knowledge preservation and technological research'
        }
    },

    // Building categories for organized UI display
    buildingCategories: {
        essential: ['townCenter', 'house', 'farm'],
        production: ['sawmill', 'quarry', 'lumberMill', 'mine'],
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

    // Starting resources for new games
    startingResources: {
        food: 0,
        wood: 50,
        stone: 0,
        metal: 0,  // Metal will be given through tutorial achievement
        planks: 0, // Planks produced by lumber mill from wood
        production: 0,
        gold: 0,
        population: 1  // Start with 1 population (the player)
    },

    // Resource caps (base storage capacity)
    resourceCaps: {
        food: 999,
        wood: 999,
        stone: 999,
        metal: 999,
        planks: 999,
        production: 999,
        gold: 9999
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
    formatCost: function(buildingType) {
        const cost = this.buildingCosts[buildingType];
        if (!cost) return '';
        
        const costParts = [];
        Object.keys(cost).forEach(resource => {
            const icon = this.resourceIcons[resource] || resource;
            costParts.push(`${icon} ${cost[resource]}`);
        });
        return `(${costParts.join(' ')})`;
    },

    formatBuildingButton: function(buildingType) {
        const info = this.buildingInfo[buildingType];
        const cost = this.formatCost(buildingType);
        const time = this.constructionTimes[buildingType];
        
        if (!info) return buildingType;
        
        return `${info.icon} ${info.name} ${cost} - ${time} day${time > 1 ? 's' : ''}`;
    },

    getBuildingIcon: function(buildingType) {
        return this.buildingInfo[buildingType]?.icon || '🏗️';
    },

    getBuildingName: function(buildingType) {
        return this.buildingInfo[buildingType]?.name || buildingType;
    },

    getBuildingDescription: function(buildingType) {
        return this.buildingInfo[buildingType]?.description || 'A building';
    },

    // Get buildings by category
    getBuildingsByCategory: function(category) {
        return this.buildingCategories[category] || [];
    },

    // Get category for a building type
    getBuildingCategory: function(buildingType) {
        for (const [category, buildings] of Object.entries(this.buildingCategories)) {
            if (buildings.includes(buildingType)) {
                return category;
            }
        }
        return null;
    },

    // Calculate population cap based on number of houses
    calculatePopulationCap: function(buildings) {
        let totalCap = 0;
        buildings.forEach(building => {
            if (building.type === 'house') {
                totalCap += this.buildingProduction.house.populationCapacity || 5;
            }
            // Town centers also provide some population capacity
            if (building.type === 'townCenter') {
                totalCap += 3; // Base capacity from town center
            }
        });
        return Math.max(totalCap, 1); // Minimum cap of 1 for starting population
    },

    // Calculate seasonal storage capacity for a resource
    calculateSeasonalStorageCap: function(resource, season, buildings) {
        const baseCap = this.resourceCaps[resource] || 999;
        const seasonalMod = this.seasonalStorageModifiers[season]?.[resource] || 1.0;
        
        // Add storage building bonuses (future enhancement)
        let buildingBonus = 0;
        buildings.forEach(building => {
            // Granaries, warehouses, etc. could add storage here
            if (building.type === 'market' && building.level > 0) {
                buildingBonus += 200; // Markets provide general storage
            }
        });
        
        return Math.floor((baseCap + buildingBonus) * seasonalMod);
    },

    // ===== POPULATION SYSTEM =====
    // ===== POPULATION SYSTEM DEFAULTS =====
    // Age is stored in days. Age brackets (tripled):
    //   - Children: 0–27 days
    //   - Young Adult: 28–45 days (can start working)
    //   - Adult: 46–75 days (can be a soldier, breeding population)
    //   - Middle Age: 76–150 days (breeding population)
    //   - Elder: 151–197 days
    //   - Death: 198+ days
    // Population growth: Offspring can be born if there are at least one male and one female in the Adult or Middle-Aged brackets (46–150 days).
    // Base birth rate: 1 child per eligible couple per year (365 days). 1% chance for twins per birth.
    // Growth bonuses: +50% if food is abundant, -50% if food is scarce, 0 if sick or traveling.
    // Default roles: farmer, woodcutter, hunter, peasant. Children and elders are unassigned (peasant) by default.
    // Status: 'idle' for babies/children/elders, 'working' for assigned young adults/adults, else 'idle'.
    // Gender: 50% male, 50% female for new births (randomized), 1–2% nonbinary optional.
    // Skills: Children [], Young Adults/Adults 1–2 skills by role, Elders retain skills, may mentor.
    // Only young adults and adults can be assigned to buildings. Only adults (46–75) can be soldiers.

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
            buildingType: 'sawmill',
            description: 'Produces wood at sawmills.'
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
    getDefaultRoleForBuilding: function(buildingType) {
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
    ,generatePopulationMember: function(names, options = {}) {
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

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
        production: '⚙️',
        gold: '💰',
        population: '👥'
    },

    // Building costs - what resources are required to build each building
    buildingCosts: {
        townCenter: { wood: 50 },
        house: { wood: 25 },
        farm: { wood: 40, stone: 5 },
        barracks: { wood: 75, stone: 50, metal: 10 },
        workshop: { wood: 60, stone: 40, metal: 15 },
        woodcutter: { wood: 30, stone: 5, metal: 1 },
        sawmill: { wood: 80, stone: 30 },
        quarry: { wood: 40, stone: 60 },
        market: { wood: 100, stone: 50, metal: 25 },
        blacksmith: { wood: 80, stone: 40, metal: 30 },
        temple: { wood: 120, stone: 80, metal: 40 },
        academy: { wood: 150, stone: 100, metal: 50 },
        castle: { wood: 200, stone: 150, metal: 75 },
        university: { wood: 300, stone: 200, metal: 100 }
    },

    // Building production - what resources buildings generate per day/cycle
    buildingProduction: {
        townCenter: { 
            efficiency: 1.2, // 20% boost to all production
            population: 2, 
        },
        house: { 
            population: 1, 
            populationCapacity: 5 // Each house provides capacity for 5 population
        },
        farm: { 
            food: 10 
        },
        barracks: { 
            soldiers: 1, 
            defense: 2 
        },
        workshop: { 
            efficiency: 1.1, // 10% boost to production
            production: 3 
        },
        sawmill: {
            wood: 15,
            production: 1  // Sawmill produces basic production materials
        },
        quarry: {
            stone: 12,
            metal: 2,
            production: 1  // Quarry produces basic production materials
        },
        market: {
            gold: 8,
            efficiency: 1.15 // 15% boost to resource trading
        },
        blacksmith: {
            metal: 6,
            production: 4, // Blacksmith produces advanced production materials
            efficiency: 1.2 // 20% boost to all production
        },
        temple: {
            influence: 10,
            population: 1,
            happiness: 5
        },
        academy: {
            research: 3,
            efficiency: 1.25 // 25% boost to all production
        },
        castle: {
            defense: 10,
            soldiers: 2,
            influence: 15
        },
        university: {
            research: 8,
            efficiency: 1.5 // 50% boost to all production
        }
    },

    // Construction times - how many days/hours it takes to build each building
    constructionTimes: {
        townCenter: 3,
        house: 1,
        farm: 2,
        barracks: 3,
        workshop: 4,
        sawmill: 3,
        quarry: 4,
        market: 5,
        blacksmith: 4,
        temple: 6,
        academy: 7,
        castle: 10,
        university: 12
    },

    // Building metadata - icons, names, descriptions
    buildingInfo: {
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
        barracks: {
            icon: '⚔️',
            name: 'Barracks',
            description: 'Trains soldiers and provides defense'
        },
        workshop: {
            icon: '🔧',
            name: 'Workshop',
            description: 'Improves production efficiency'
        },
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
        market: {
            icon: '🏪',
            name: 'Market',
            description: 'Generates gold and improves trade efficiency'
        },
        blacksmith: {
            icon: '⚒️',
            name: 'Blacksmith',
            description: 'Produces metal tools and weapons, boosts production efficiency'
        },
        temple: {
            icon: '⛪',
            name: 'Temple',
            description: 'Provides spiritual guidance and increases happiness'
        },
        academy: {
            icon: '📚',
            name: 'Academy',
            description: 'Researches new technologies and boosts efficiency'
        },
        castle: {
            icon: '🏰',
            name: 'Castle',
            description: 'Ultimate defensive structure and seat of power'
        },
        university: {
            icon: '🎓',
            name: 'University',
            description: 'Advanced research center with massive efficiency bonuses'
        }
    },

    // Starting resources for new games
    startingResources: {
        food: 0,
        wood: 50,
        stone: 0,
        metal: 0,  // Metal will be given through tutorial achievement
        production: 0,
        gold: 0,
        population: 1  // Start with 1 population (the player)
    },

    // Resource caps (population cap is calculated dynamically based on houses)
    resourceCaps: {
        food: 999,
        wood: 999,
        stone: 999,
        metal: 999,
        production: 999,
        gold: 9999
    },

    // Season multipliers for resource production
    seasonMultipliers: {
        'Spring': { food: 1.2, wood: 1.0, stone: 1.0 },
        'Summer': { food: 1.5, wood: 0.8, stone: 1.2 },
        'Autumn': { food: 1.0, wood: 1.3, stone: 1.0 },
        'Winter': { food: 0.7, wood: 1.5, stone: 0.8 }
    },

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
        quarryWorker: {
            label: 'Quarry Worker',
            buildingType: 'quarry',
            description: 'Extracts stone at quarries.'
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
        soldier: {
            label: 'Soldier',
            buildingType: 'barracks',
            description: 'Trains and defends at barracks.'
        },
        blacksmith: {
            label: 'Blacksmith',
            buildingType: 'workshop',
            description: 'Improves production at workshops.'
        },
        noble: {
            label: 'Noble',
            buildingType: 'townCenter',
            description: 'Manages the town center.'
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

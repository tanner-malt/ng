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
            production: 2 
        },
        sawmill: {
            wood: 15
        },
        quarry: {
            stone: 12
        },
        market: {
            gold: 8,
            efficiency: 1.15 // 15% boost to resource trading
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
        metal: 0,
        gold: 0,
        population: 0
    },

    // Resource caps (population cap is calculated dynamically based on houses)
    resourceCaps: {
        food: 999,
        wood: 999,
        stone: 999,
        metal: 999,
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
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameData;
} else if (typeof window !== 'undefined') {
    window.GameData = GameData;
}

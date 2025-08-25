/**
 * Stats Integration System
 * Handles updating population statistics display using PopulationManager calculations
 */

class StatsIntegration {
    constructor() {
        this.isInitialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for game events to update stats
        if (window.eventBus) {
            window.eventBus.on('day-ended', () => this.updatePopulationStats());
            window.eventBus.on('population-changed', () => this.updatePopulationStats());
            window.eventBus.on('population_gained', () => this.updatePopulationStats());
            window.eventBus.on('population_died', () => this.updatePopulationStats());
        }

        console.log('[StatsIntegration] Event listeners setup for population stats');
    }

    initialize() {
        this.isInitialized = true;
        this.updatePopulationStats();
        console.log('[StatsIntegration] Initialized with population stats focus');
    }

    updatePopulationStats() {
        if (!window.gameState || !window.gameState.populationManager) {
            console.log('[StatsIntegration] PopulationManager not available');
            return;
        }

        const populationManager = window.gameState.populationManager;
        const currentPopulation = populationManager.getAll();
        
        // If population manager is empty but gameState has population count, initialize some villagers
        if (currentPopulation.length === 0 && window.gameState.population > 0) {
            console.log('[StatsIntegration] Population manager empty but gameState has population, generating villagers...');
            populationManager.generateDistributedPopulation(window.gameState.population, true);
            const newPopulation = populationManager.getAll();
            console.log('[StatsIntegration] Generated', newPopulation.length, 'villagers to match gameState');
        }
        
        const finalPopulation = populationManager.getAll();
        console.log('[StatsIntegration] Updating population stats for', finalPopulation.length, 'villagers');

        // Update current population count
        this.updateCurrentPopulation(finalPopulation.length);
        
        // Update population capacity
        this.updatePopulationCapacity();
        
        // Calculate and update growth rate (expected births per week)
        this.updateGrowthRate(populationManager);
        
        // Calculate and update death rate (expected deaths per week)
        this.updateDeathRate(populationManager);
        
        // Calculate and update net change
        this.updateNetChange();
    }

    updateCurrentPopulation(count) {
        const currentPopEl = document.getElementById('manager-population');
        if (currentPopEl) {
            currentPopEl.textContent = count;
        }
    }

    updatePopulationCapacity() {
        const capacityEl = document.getElementById('manager-population-cap');
        if (capacityEl) {
            const capacity = window.gameState.getPopulationCap ? 
                window.gameState.getPopulationCap() : 
                (window.gameState.populationCap || 0);
            capacityEl.textContent = capacity;
        }
    }

    updateGrowthRate(populationManager) {
        const growthEl = document.getElementById('population-growth-rate');
        if (!growthEl) return;

        // Calculate expected weekly births using PopulationManager
        const foodAbundant = window.gameState.resources.food > 500;
        const foodScarce = window.gameState.resources.food < 100;
        
        let weeklyBirths = 0;
        for (let day = 0; day < 7; day++) {
            const dailyGrowth = populationManager.calculateDailyGrowth({
                foodAbundant,
                foodScarce
            });
            weeklyBirths += dailyGrowth.births;
        }

        growthEl.textContent = `+${weeklyBirths}`;
        growthEl.setAttribute('data-weekly-births', weeklyBirths);
        
        console.log('[StatsIntegration] Weekly growth rate:', weeklyBirths);
    }

    updateDeathRate(populationManager) {
        const deathEl = document.getElementById('population-death-rate');
        if (!deathEl) return;

        // Calculate expected deaths for the next 7 days
        const deathData = populationManager.calculateExpectedDeaths('daily');
        let weeklyDeaths = 0;
        
        // Estimate weekly deaths based on age distribution
        if (deathData.ageGroups) {
            // Imminent deaths (197+ days) will definitely die this week
            weeklyDeaths += deathData.ageGroups.imminent.count;
            
            // Very high risk (190-196 days) - 80% chance to die this week
            weeklyDeaths += Math.ceil(deathData.ageGroups.veryHigh.count * 0.8);
            
            // High risk (180-189 days) - 30% chance to die this week
            weeklyDeaths += Math.ceil(deathData.ageGroups.high.count * 0.3);
        }

        deathEl.textContent = weeklyDeaths;
        deathEl.setAttribute('data-weekly-deaths', weeklyDeaths);
        
        console.log('[StatsIntegration] Weekly death rate:', weeklyDeaths);
    }

    updateNetChange() {
        const netEl = document.getElementById('population-net-change');
        if (!netEl) return;

        const growthEl = document.getElementById('population-growth-rate');
        const deathEl = document.getElementById('population-death-rate');
        
        const weeklyBirths = parseInt(growthEl?.getAttribute('data-weekly-births') || '0');
        const weeklyDeaths = parseInt(deathEl?.getAttribute('data-weekly-deaths') || '0');
        
        const netChange = weeklyBirths - weeklyDeaths;
        
        if (netChange > 0) {
            netEl.textContent = `+${netChange}`;
            netEl.style.color = '#4CAF50'; // Green for growth
        } else if (netChange < 0) {
            netEl.textContent = `${netChange}`;
            netEl.style.color = '#f44336'; // Red for decline
        } else {
            netEl.textContent = '0';
            netEl.style.color = '#e0e0e0'; // Neutral
        }
        
        console.log('[StatsIntegration] Net weekly change:', netChange);
    }

    destroy() {
        this.isInitialized = false;
        console.log('[StatsIntegration] Destroyed');
    }
}

// Initialize stats integration when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for game to initialize
    setTimeout(() => {
        if (window.gameState) {
            window.statsIntegration = new StatsIntegration();
            window.statsIntegration.initialize();
        }
    }, 1000);
});

// Make sure to initialize if game loads later
window.addEventListener('load', function() {
    setTimeout(() => {
        if (window.gameState && !window.statsIntegration) {
            window.statsIntegration = new StatsIntegration();
            window.statsIntegration.initialize();
        }
    }, 2000);
});

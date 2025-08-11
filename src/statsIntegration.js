/**
 * Stats Integration System
 * Handles updating the new 2-panel UI with game statistics
 */

class StatsIntegration {
    constructor() {
        this.updateInterval = null;
        this.isInitialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for game events to update stats
        if (window.eventBus) {
            window.eventBus.on('day-ended', () => this.updateAllStats());
            window.eventBus.on('resources-updated', () => this.updateResourceStats());
            window.eventBus.on('population-changed', () => this.updatePopulationStats());
            window.eventBus.on('building-built', () => this.updateBuildingStats());
        }

        // Setup periodic updates
        this.updateInterval = setInterval(() => {
            if (window.gameState && this.isInitialized) {
                this.updateAllStats();
            }
        }, 5000); // Update every 5 seconds
    }

    initialize() {
        this.isInitialized = true;
        this.updateAllStats();
    }

    updateAllStats() {
        this.updateQuickStats();
        this.updatePopulationStats();
        this.updateResourceStats();
    }

    updateQuickStats() {
        if (!window.gameState || !window.gameState.stats) return;

        const stats = window.gameState.stats;
        
        // Update total days in modal
        const totalDaysEl = document.getElementById('modal-stat-total-days');
        if (totalDaysEl) {
            totalDaysEl.textContent = stats.totalDaysElapsed || 1;
        }

        // Update peak population in modal
        const peakPopEl = document.getElementById('modal-stat-peak-population');
        if (peakPopEl) {
            peakPopEl.textContent = stats.peakPopulation || 1;
        }

        // Update buildings built in modal
        const buildingsEl = document.getElementById('modal-stat-buildings-built');
        if (buildingsEl) {
            buildingsEl.textContent = stats.buildingsBuilt || 0;
        }

        // Calculate and update seasons passed in modal
        const seasonsEl = document.getElementById('modal-stat-seasons-passed');
        if (seasonsEl) {
            const seasonsPassed = Math.floor((stats.totalDaysElapsed || 1) / 28);
            seasonsEl.textContent = seasonsPassed;
        }

        // Update total resources generated in modal
        const resourcesGenEl = document.getElementById('modal-stat-resources-generated');
        if (resourcesGenEl) {
            resourcesGenEl.textContent = stats.totalResourcesGenerated || 0;
        }

        // Update total resources spent in modal
        const resourcesSpentEl = document.getElementById('modal-stat-resources-spent');
        if (resourcesSpentEl) {
            resourcesSpentEl.textContent = stats.totalResourcesSpent || 0;
        }
    }

    updatePopulationStats() {
        if (!window.gameState) return;

        // Current population
        const currentPopEl = document.getElementById('manager-population');
        if (currentPopEl && window.gameState.population) {
            currentPopEl.textContent = window.gameState.population.length;
        }

        // Population capacity
        const capacityEl = document.getElementById('manager-population-cap');
        if (capacityEl && window.gameState.populationCap) {
            capacityEl.textContent = window.gameState.populationCap;
        }

        // Growth rate (simplified calculation)
        const growthEl = document.getElementById('population-growth-rate');
        if (growthEl && window.gameState.population) {
            const currentPop = window.gameState.population.length;
            const growthRate = Math.max(1, Math.floor(currentPop * 0.1)); // 10% growth rate
            growthEl.textContent = `+${growthRate}`;
        }

        // Death rate (simplified calculation)
        const deathEl = document.getElementById('population-death-rate');
        if (deathEl && window.gameState.population) {
            const currentPop = window.gameState.population.length;
            const deathRate = Math.floor(currentPop * 0.05); // 5% death rate
            deathEl.textContent = deathRate;
        }

        // Net change
        const netEl = document.getElementById('population-net-change');
        if (netEl && window.gameState.population) {
            const currentPop = window.gameState.population.length;
            const growth = Math.max(1, Math.floor(currentPop * 0.1));
            const deaths = Math.floor(currentPop * 0.05);
            const net = growth - deaths;
            netEl.textContent = net >= 0 ? `+${net}` : `${net}`;
        }
    }

    updateResourceStats() {
        if (!window.gameState || !window.gameState.resources) return;

        const resources = window.gameState.resources;
        
        // Update production display (simplified for now)
        this.updateResourceDisplay('food', resources.food || 0);
        this.updateResourceDisplay('wood', resources.wood || 0);
        this.updateResourceDisplay('stone', resources.stone || 0);
        this.updateResourceDisplay('metal', resources.metal || 0);
        this.updateResourceDisplay('production', resources.production || 0);
    }

    updateResourceDisplay(resourceType, currentAmount) {
        // Daily production (placeholder - would need actual production calculation)
        const productionEl = document.getElementById(`daily-${resourceType}-production`);
        if (productionEl) {
            productionEl.textContent = this.calculateDailyProduction(resourceType);
        }

        // Daily consumption (placeholder - would need actual consumption calculation)
        const consumptionEl = document.getElementById(`daily-${resourceType}-consumption`);
        if (consumptionEl) {
            consumptionEl.textContent = this.calculateDailyConsumption(resourceType);
        }

        // Net daily change
        const netEl = document.getElementById(`daily-${resourceType}-net`);
        if (netEl) {
            const production = this.calculateDailyProduction(resourceType);
            const consumption = this.calculateDailyConsumption(resourceType);
            const net = production - consumption;
            netEl.textContent = net >= 0 ? `+${net}` : `${net}`;
            
            // Color coding
            if (net > 0) {
                netEl.style.color = '#4CAF50';
            } else if (net < 0) {
                netEl.style.color = '#f44336';
            } else {
                netEl.style.color = '#e0e0e0';
            }
        }
    }

    calculateDailyProduction(resourceType) {
        // Simplified production calculation
        // In a real implementation, this would check buildings and their production rates
        if (!window.gameState || !window.gameState.population) return 0;
        
        const popCount = window.gameState.population.length;
        
        switch (resourceType) {
            case 'food':
                return Math.floor(popCount * 0.8); // Each person produces 0.8 food
            case 'wood':
                return Math.floor(popCount * 0.3); // Each person produces 0.3 wood
            case 'stone':
                return Math.floor(popCount * 0.2); // Each person produces 0.2 stone
            case 'metal':
                return Math.floor(popCount * 0.1); // Each person produces 0.1 metal
            case 'production':
                return Math.floor(popCount * 0.5); // Each person produces 0.5 production
            default:
                return 0;
        }
    }

    calculateDailyConsumption(resourceType) {
        // Simplified consumption calculation
        if (!window.gameState || !window.gameState.population) return 0;
        
        const popCount = window.gameState.population.length;
        
        switch (resourceType) {
            case 'food':
                return Math.floor(popCount * 0.6); // Each person consumes 0.6 food
            case 'wood':
                return Math.floor(popCount * 0.1); // Each person consumes 0.1 wood
            case 'stone':
                return 0; // Stone is not consumed daily
            case 'metal':
                return 0; // Metal is not consumed daily
            case 'production':
                return Math.floor(popCount * 0.2); // Each person consumes 0.2 production
            default:
                return 0;
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.isInitialized = false;
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

// Global game state management
class GameState {
    constructor() {
        this.resources = {
            food: 100,
            wood: 50,
            stone: 25,
            metal: 10
        };
        
        this.population = 10;
        this.gold = 1000;
        this.wave = 1;
        this.season = 'Spring';
        
        // Time progression
        this.currentDay = 1;
        this.daysInSeason = 30;
        this.seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
        this.currentSeasonIndex = 0;
        
        this.buildings = [];
        
        this.army = [
            { id: 'soldier1', type: 'soldier', health: 100, attack: 15, experience: 0 },
            { id: 'archer1', type: 'archer', health: 80, attack: 20, experience: 0 }
        ];
        
        this.buildingCosts = {
            house: { wood: 10 },
            farm: { wood: 15, stone: 5 },
            townCenter: { wood: 50, stone: 25 },
            barracks: { wood: 30, stone: 20, metal: 10 }
        };
        
        this.buildingProduction = {
            house: { population: 5 },
            farm: { food: 10 },
            townCenter: { efficiency: 1.2 },
            barracks: { soldiers: 1 }
        };
        
        this.selectedBuilding = null;
        this.buildMode = null;
        this.battleInProgress = false;
        this.automationLevel = 'manual'; // manual, semi-auto, full-auto
        
        // Prestige/Monarch investments
        this.investments = {
            productionBoost: 0,
            automationLevel: 0,
            armyScouts: false,
            eliteGenerals: false,
            parallelVillages: false,
            prestigeAutomation: false
        };
        
        // Throne room merge items
        this.mergeItems = [];
        this.activeBonuses = [];
        
        // Game loop and time management
        this.lastUpdate = Date.now();
        this.seasonTimer = 0;
        this.seasonDuration = 60000; // 60 seconds per season
        
        // Expedition time flow
        this.expeditionTimeFlow = false;
        this.expeditionStartTime = null;
        this.accumulatedTime = 0;
        this.buildingQueue = []; // Buildings under construction
        this.populationGrowthTimer = 0;
        
        // Auto-play and progress tracking
        this.autoPlayActive = false;
        this.autoPlayInterval = null;
        this.autoPlaySpeed = 20000; // 20 seconds per day
        this.scoutReportDay = 5; // First important event on day 5
        this.scoutReportShown = false; // Flag to prevent spam
        this.scoutReportReady = false; // Flag to track if report is ready
    }
    
    canAfford(buildingType) {
        if (!buildingType) {
            console.error('[GameState] canAfford() called with invalid buildingType:', buildingType);
            return false;
        }
        
        const cost = this.buildingCosts[buildingType];
        if (!cost) {
            console.error('[GameState] No cost defined for building type:', buildingType);
            return false;
        }
        
        return Object.keys(cost).every(resource => 
            this.resources[resource] >= cost[resource]
        );
    }
    
    canAffordGold(amount) {
        return this.gold >= amount;
    }
    
    spend(buildingType) {
        if (!buildingType) {
            console.error('[GameState] spend() called with invalid buildingType:', buildingType);
            return false;
        }
        
        const cost = this.buildingCosts[buildingType];
        if (!cost) {
            console.error('[GameState] No cost defined for building type:', buildingType);
            return false;
        }
        
        Object.keys(cost).forEach(resource => {
            const amount = cost[resource];
            this.resources[resource] -= amount;
            
            // Show mini toast for resource spent
            if (window.showResourceChange) {
                setTimeout(() => window.showResourceChange(resource, -amount), Math.random() * 200);
            }
        });
        this.updateUI();
        this.updateBuildButtons();
        return true;
    }
    
    spendGold(amount) {
        this.gold = Math.max(0, this.gold - amount);
        this.updateUI();
        this.updateInvestmentButtons();
    }
    
    addBuilding(building) {
        this.buildings.push(building);
        this.updateUI();
    }
    
    generateResources() {
        const productionMultiplier = 1 + (this.investments.productionBoost * 0.1);
        const seasonMultiplier = this.getSeasonMultiplier();
        
        let totalGenerated = { food: 0, wood: 0, stone: 0 };
        
        this.buildings.forEach((building, index) => {
            const production = this.buildingProduction[building.type];
            if (production) {
                Object.keys(production).forEach(resource => {
                    if (this.resources[resource] !== undefined) {
                        const amount = production[resource] * productionMultiplier * seasonMultiplier[resource] * building.level;
                        const roundedAmount = Math.floor(amount);
                        this.resources[resource] += roundedAmount;
                        totalGenerated[resource] += roundedAmount;
                        
                        // Show mini toast for individual building production (occasionally)
                        if (roundedAmount > 0 && Math.random() < 0.1 && window.showResourceChange) {
                            setTimeout(() => {
                                window.showResourceChange(resource, roundedAmount);
                            }, index * 50); // Stagger toasts by 50ms per building
                        }
                    } else if (resource === 'population') {
                        const popGrowth = production[resource] * building.level;
                        this.population += popGrowth;
                        
                        // Show mini toast for population growth
                        if (popGrowth > 0 && Math.random() < 0.15 && window.showResourceChange) {
                            setTimeout(() => {
                                window.showResourceChange('population', popGrowth);
                            }, (index + this.buildings.length) * 50);
                        }
                    }
                });
            }
        });
        
        // Show toast for significant resource generation (only occasionally to avoid spam)
        const totalResourcesGenerated = totalGenerated.food + totalGenerated.wood + totalGenerated.stone;
        if (totalResourcesGenerated >= 20 && Math.random() < 0.3) { // 30% chance when generating 20+ resources
            const resourceSummary = [];
            if (totalGenerated.food > 0) resourceSummary.push(`${totalGenerated.food} food`);
            if (totalGenerated.wood > 0) resourceSummary.push(`${totalGenerated.wood} wood`);
            if (totalGenerated.stone > 0) resourceSummary.push(`${totalGenerated.stone} stone`);
            
            if (resourceSummary.length > 0 && window.showToast) {
                window.showToast(`Village produced: ${resourceSummary.join(', ')}`, {
                    icon: '🏭',
                    type: 'success',
                    timeout: 2000
                });
            }
        }
        
        // Cap resources and show mini toasts when caps are hit
        const resourceCaps = {
            food: { max: 999, current: this.resources.food },
            wood: { max: 999, current: this.resources.wood },
            stone: { max: 999, current: this.resources.stone },
            population: { max: 100, current: this.population }
        };
        
        Object.keys(resourceCaps).forEach(resource => {
            const cap = resourceCaps[resource];
            if (cap.current > cap.max) {
                // Show mini toast when hitting resource cap (occasionally)
                if (Math.random() < 0.2 && window.showMiniToast) {
                    window.showMiniToast('⚠️', `${resource} maxed`);
                }
            }
        });
        
        this.resources.food = Math.min(this.resources.food, 999);
        this.resources.wood = Math.min(this.resources.wood, 999);
        this.resources.stone = Math.min(this.resources.stone, 999);
        this.population = Math.min(this.population, 100);
    }
    
    getSeasonMultiplier() {
        const multipliers = {
            'Spring': { food: 1.2, wood: 1.0, stone: 1.0 },
            'Summer': { food: 1.5, wood: 0.8, stone: 1.2 },
            'Autumn': { food: 1.0, wood: 1.3, stone: 1.0 },
            'Winter': { food: 0.7, wood: 1.5, stone: 0.8 }
        };
        return multipliers[this.season] || { food: 1.0, wood: 1.0, stone: 1.0 };
    }
    
    updateSeason() {
        const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
        const currentIndex = seasons.indexOf(this.season);
        const newSeason = seasons[(currentIndex + 1) % seasons.length];
        this.season = newSeason;
        
        // Show mini toast for season change
        if (window.showMiniToast) {
            const seasonIcons = {
                'Spring': '🌸',
                'Summer': '☀️', 
                'Autumn': '🍂',
                'Winter': '❄️'
            };
            window.showMiniToast(seasonIcons[newSeason] || '🗓️', newSeason);
        }
        
        // Notify players of season change via regular toast for important gameplay info
        if (window.showToast) {
            const multipliers = this.getSeasonMultiplier();
            const effects = [];
            Object.keys(multipliers).forEach(resource => {
                const mult = multipliers[resource];
                if (mult > 1.0) effects.push(`+${Math.round((mult - 1) * 100)}% ${resource}`);
                else if (mult < 1.0) effects.push(`${Math.round((mult - 1) * 100)}% ${resource}`);
            });
            
            if (effects.length > 0) {
                window.showToast(`${newSeason} has arrived! ${effects.join(', ')}`, {
                    icon: seasonIcons[newSeason] || '🗓️',
                    type: 'info',
                    timeout: 4000
                });
            }
        }
    }

    // Expedition time flow management
    startExpeditionTimeFlow() {
        this.expeditionTimeFlow = true;
        this.expeditionStartTime = Date.now();
        console.log('[GameState] Expedition time flow started');
    }

    stopExpeditionTimeFlow() {
        if (this.expeditionTimeFlow) {
            const expeditionDuration = Date.now() - this.expeditionStartTime;
            this.processExpeditionTime(expeditionDuration);
            this.expeditionTimeFlow = false;
            this.expeditionStartTime = null;
            console.log('[GameState] Expedition time flow stopped, processed', expeditionDuration, 'ms');
        }
    }

    processExpeditionTime(duration) {
        // Convert real time to game time (1 real minute = 1 game hour for now)
        const gameHours = Math.floor(duration / (1000 * 60)); // 1 minute real = 1 hour game
        
        console.log('[GameState] Processing', gameHours, 'game hours of expedition time');
        
        // Process building construction
        this.processBuildingConstruction(gameHours);
        
        // Process resource generation for the entire expedition duration
        this.processExpeditionResourceGeneration(gameHours);
        
        // Process population growth
        this.processPopulationGrowth(gameHours);
        
        // Process seasonal changes
        this.processSeasonalChanges(gameHours);
        
        this.updateUI();
    }

    processBuildingConstruction(hours) {
        if (this.buildingQueue.length === 0) return;
        
        this.buildingQueue = this.buildingQueue.filter(buildingProject => {
            buildingProject.hoursRemaining -= hours;
            
            if (buildingProject.hoursRemaining <= 0) {
                // Building completed!
                this.buildings.push({
                    id: buildingProject.id,
                    type: buildingProject.type,
                    x: buildingProject.x,
                    y: buildingProject.y,
                    level: 1
                });
                
                console.log(`[GameState] Building completed: ${buildingProject.type}`);
                
                // Show mini toast for building completion
                if (window.showBuildingComplete) {
                    window.showBuildingComplete(buildingProject.type);
                }
                
                // Use the village manager's notification system
                if (window.villageManager) {
                    const buildingName = buildingProject.type.charAt(0).toUpperCase() + buildingProject.type.slice(1);
                    window.villageManager.showNotification(
                        'Construction Complete!',
                        `${buildingName} is now operational and producing resources`,
                        'construction',
                        3500
                    );
                    
                    // Trigger building completion animation
                    setTimeout(() => {
                        window.villageManager.renderBuildingSites();
                        window.villageManager.renderBuildings();
                        window.villageManager.showBuildingCompletionEffect(buildingProject.x, buildingProject.y);
                    }, 100);
                } else if (window.showNotification) {
                    window.showNotification(
                        `🏗️ Construction Complete: ${buildingProject.type} is now operational!`,
                        { timeout: 5000, icon: '✅' }
                    );
                }
                
                return false; // Remove from queue
            }
            return true; // Keep in queue
        });
    }

    processExpeditionResourceGeneration(hours) {
        // Generate resources for each hour of expedition time
        for (let hour = 0; hour < hours; hour++) {
            this.generateResources();
        }
        
        if (hours > 0) {
            window.showNotification(
                `🏭 Village produced resources during your ${hours}-hour absence!`,
                { timeout: 4000, icon: '📈' }
            );
        }
    }

    processPopulationGrowth(hours) {
        // Population grows slowly over time
        const growthRate = 0.1; // 0.1 population per hour with good conditions
        const populationIncrease = Math.floor(hours * growthRate);
        
        if (populationIncrease > 0) {
            this.population = Math.min(this.population + populationIncrease, 100);
            
            // Show mini toast for population growth
            if (window.showResourceChange) {
                window.showResourceChange('population', populationIncrease);
            }
            
            window.showNotification(
                `👥 Population grew by ${populationIncrease} while you were away!`,
                { timeout: 4000, icon: '👶' }
            );
        }
    }

    processSeasonalChanges(hours) {
        // Check if seasons should change during expedition
        const hoursPerSeason = 24 * 30; // 30 days per season in game time
        const seasonChanges = Math.floor(hours / hoursPerSeason);
        
        for (let i = 0; i < seasonChanges; i++) {
            this.updateSeason();
        }
        
        if (seasonChanges > 0) {
            window.showNotification(
                `🍂 Season changed to ${this.season} during your expedition!`,
                { timeout: 4000, icon: '🌍' }
            );
        }
    }

    // Queue a building for construction (takes time during expeditions)
    queueBuilding(buildingType, x, y) {
        const buildingId = `${buildingType}_${Date.now()}`;
        const constructionHours = this.getBuildingConstructionTime(buildingType);
        
        const buildingProject = {
            id: buildingId,
            type: buildingType,
            x: x,
            y: y,
            hoursRemaining: constructionHours,
            startTime: Date.now()
        };
        
        this.buildingQueue.push(buildingProject);
        
        // Use toast notification for construction - brief, informational, doesn't interrupt gameplay
        const buildingName = buildingType.charAt(0).toUpperCase() + buildingType.slice(1);
        if (window.showToast) {
            window.showToast(`${buildingName} construction queued! Click "End Day" to progress.`, {
                icon: '🏗️',
                type: 'building',
                timeout: 4000
            });
        } else {
            // Fallback for legacy compatibility
            window.showNotification(
                `🏗️ ${buildingType} construction queued! Will complete in ${constructionHours} hours of expedition time.`,
                { timeout: 5000, icon: '📋' }
            );
        }
        
        return buildingId;
    }

    getBuildingConstructionTime(buildingType) {
        const constructionTimes = {
            house: 6,         // 6 hours
            farm: 8,          // 8 hours  
            townCenter: 72,   // 72 hours (3 days)
            barracks: 16      // 16 hours
        };
        return constructionTimes[buildingType] || 12;
    }
    
    updateBuildButtons() {
        document.querySelectorAll('.build-btn').forEach(btn => {
            const buildingType = btn.dataset.building;
            if (buildingType) {
                btn.disabled = !this.canAfford(buildingType);
            }
        });
    }
    
    updateInvestmentButtons() {
        document.querySelectorAll('.investment-btn').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            if (cost) {
                btn.disabled = !this.canAffordGold(cost);
            }
        });
    }
    
    logBattleEvent(message) {
        // ...
    }
    
    update() {
        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;
        
        // Update season
        this.seasonTimer += deltaTime;
        if (this.seasonTimer >= this.seasonDuration) {
            this.seasonTimer = 0;
            this.updateSeason();
        }
        
        // IMPORTANT: Only generate resources during expeditions now!
        // Resources are generated during expedition time flow instead of continuously
        // This makes village optimization much more meaningful
        
        // Still update UI regularly to show current state
        if (Math.floor(now / 1000) !== Math.floor((now - deltaTime) / 1000)) {
            this.updateUI();
        }
    }
    
    updateUI() {
        const elements = {
            'food-count': this.resources.food,
            'wood-count': this.resources.wood,
            'stone-count': this.resources.stone,
            'metal-count': this.resources.metal,
            'population-count': this.population,
            'gold-count': this.gold,
            'wave-count': this.wave,
            'season-display': this.season,
            'building-count': this.buildings.length
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
        
        // Update army display
        this.updateArmyDisplay();
        
        // Update supply routes status
        const supplyElement = document.getElementById('supply-routes');
        if (supplyElement) {
            supplyElement.textContent = this.buildings.length > 2 ? 'Active' : 'Limited';
        }
        
        // Update scout progress
        this.updateScoutProgress();
    }
    
    updateArmyDisplay() {
        const armyContainer = document.getElementById('army-units');
        if (armyContainer) {
            armyContainer.innerHTML = '';
            this.army.forEach(unit => {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'army-unit';
                unitDiv.innerHTML = `
                    <div class="unit-icon">${this.getUnitIcon(unit.type)}</div>
                    <div class="unit-stats">
                        <div>${unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}</div>
                        <div>HP: ${unit.health} | ATK: ${unit.attack}</div>
                    </div>
                `;
                armyContainer.appendChild(unitDiv);
            });
        }
    }
    
    getUnitIcon(type) {
        const icons = {
            soldier: '⚔️',
            archer: '🏹',
            cavalry: '🐎'
        };
        return icons[type] || '👤';
    }
    
    save() {
        const saveData = {
            resources: this.resources,
            population: this.population,
            gold: this.gold,
            wave: this.wave,
            season: this.season,
            buildings: this.buildings,
            army: this.army,
            investments: this.investments,
            mergeItems: this.mergeItems,
            activeBonuses: this.activeBonuses,
            automationLevel: this.automationLevel
        };
        
        localStorage.setItem('idleDynastyBuilder', JSON.stringify(saveData));
        // ...
    }
    
    load() {
        const saveData = localStorage.getItem('idleDynastyBuilder');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                if (!this.validateSaveData(data)) {
                    throw new Error('Invalid or corrupted save data.');
                }
                Object.keys(data).forEach(key => {
                    if (this[key] !== undefined) {
                        this[key] = data[key];
                    }
                });
                // ...
                return true;
            } catch (error) {
                // ...
                return false;
            }
        }
        return false;
    }

    validateSaveData(data) {
        // Basic structure check
        if (typeof data !== 'object' || data === null) return false;
        // Required top-level fields
        const requiredFields = [
            'resources', 'population', 'gold', 'wave', 'season',
            'buildings', 'army', 'investments', 'mergeItems', 'activeBonuses'
        ];
        for (const field of requiredFields) {
            if (!(field in data)) return false;
        }
        // Check types
        if (typeof data.resources !== 'object' || typeof data.population !== 'number') return false;
        if (!Array.isArray(data.buildings) || !Array.isArray(data.army)) return false;
        if (typeof data.gold !== 'number' || typeof data.wave !== 'number') return false;
        if (typeof data.season !== 'string') return false;
        if (typeof data.investments !== 'object') return false;
        if (!Array.isArray(data.mergeItems) || !Array.isArray(data.activeBonuses)) return false;
        // Optionally, add more detailed checks here
        return true;
    }

    // Time progression system
    endDay() {
        console.log(`[GameState] Ending day ${this.currentDay}...`);
        
        // Advance day counter
        this.currentDay++;
        
        // Process building construction (8 hours per day)
        this.processBuildingConstruction(8);
        
        // Process daily resource generation
        this.processDailyResources();
        
        // Update scout progress
        this.updateScoutProgress();
        
        // Trigger tutorial event for day ending
        if (window.eventBus) {
            window.eventBus.emit('day_ended', { day: this.currentDay });
        }
        
        // Refresh building sites display
        if (window.villageManager) {
            window.villageManager.renderBuildingSites();
            window.villageManager.renderBuildings();
            console.log('[GameState] Building displays refreshed after day progression');
        }
        
        // Check for season change
        if (this.currentDay > this.daysInSeason) {
            this.advanceSeason();
            this.currentDay = 1;
        }
        
        // Update UI and refresh building sites
        this.updateUI();
        this.updateDayCounter();
        
        // Update village view if it exists
        if (window.villageManager) {
            window.villageManager.renderBuildings();
            window.villageManager.renderBuildingSites();
        }
        
        // Show scout report with what happened
        this.showScoutReport();
        
        console.log(`[GameState] Day ${this.currentDay} of ${this.season} begins`);
    }

    processDailyResources() {
        // Calculate daily resource generation from buildings
        let foodGenerated = 0;
        let woodGenerated = 0;
        let stoneGenerated = 0;
        
        this.buildings.forEach(building => {
            switch (building.type) {
                case 'farm':
                    foodGenerated += 10;
                    break;
                case 'townCenter':
                    // Town center boosts all production by 20%
                    foodGenerated = Math.floor(foodGenerated * 1.2);
                    woodGenerated += 5;
                    stoneGenerated += 3;
                    break;
            }
        });
        
        // Base resource generation - set to 0 (no base income)
        const baseFood = 0;
        const baseWood = 0;
        const baseStone = 0;
        
        // Apply resources
        const totalFood = foodGenerated + baseFood;
        const totalWood = woodGenerated + baseWood; 
        const totalStone = stoneGenerated + baseStone;
        
        this.resources.food += totalFood;
        this.resources.wood += totalWood;
        this.resources.stone += totalStone;
        
        // Show mini toasts for resource gains (only if positive)
        if (window.showResourceChange) {
            if (totalFood > 0) {
                setTimeout(() => window.showResourceChange('food', totalFood), 100);
            }
            if (totalWood > 0) {
                setTimeout(() => window.showResourceChange('wood', totalWood), 200);
            }
            if (totalStone > 0) {
                setTimeout(() => window.showResourceChange('stone', totalStone), 300);
            }
        }
        
        // Store for scout report
        this.lastDayProduction = {
            food: totalFood,
            wood: totalWood,
            stone: totalStone
        };
    }

    advanceSeason() {
        this.currentSeasonIndex = (this.currentSeasonIndex + 1) % this.seasons.length;
        this.season = this.seasons[this.currentSeasonIndex];
        
        console.log(`[GameState] Season changed to ${this.season}`);
        
        // Seasonal effects could be added here
        // e.g., Winter reduces food production, Spring boosts growth, etc.
    }

    updateDayCounter() {
        const dayElement = document.getElementById('current-day');
        if (dayElement) {
            dayElement.textContent = this.currentDay;
        }
    }

    showScoutReport() {
        const scoutStatus = document.getElementById('scout-status');
        if (scoutStatus && this.lastDayProduction) {
            const prod = this.lastDayProduction;
            scoutStatus.textContent = `Generated: +${prod.food} food, +${prod.wood} wood, +${prod.stone} stone`;
            
            // Reset status after a few seconds
            setTimeout(() => {
                scoutStatus.textContent = 'Scouts ready to report';
            }, 3000);
        }
    }

    resetToDefaults() {
        // Reset all properties to their initial state
        this.resources = {
            food: 100,
            wood: 50,
            stone: 25,
            metal: 10
        };
        
        this.population = 10;
        this.gold = 1000;
        this.wave = 1;
        this.season = 'Spring';
        
        // Time progression
        this.currentDay = 1;
        this.daysInSeason = 30;
        this.currentSeasonIndex = 0;
        
        this.buildings = [];
        
        this.army = [
            { id: 'soldier1', type: 'soldier', health: 100, attack: 15, experience: 0 },
            { id: 'archer1', type: 'archer', health: 80, attack: 20, experience: 0 }
        ];
        
        this.selectedBuilding = null;
        this.buildMode = null;
        this.battleInProgress = false;
        this.automationLevel = 'manual';
        
        // Prestige/Monarch investments
        this.investments = {
            productionBoost: 0,
            automationLevel: 0,
            armyScouts: false,
            eliteGenerals: false,
            parallelVillages: false,
            prestigeAutomation: false
        };
        
        // Throne room merge items
        this.mergeItems = [];
        this.activeBonuses = [];
        
        // Game loop and time management
        this.lastUpdate = Date.now();
        this.seasonTimer = 0;
        this.seasonDuration = 60000;
        
        // Expedition time flow
        this.expeditionTimeFlow = false;
        this.expeditionStartTime = null;
        this.accumulatedTime = 0;
        this.buildingQueue = [];
        this.populationGrowthTimer = 0;
        
        // Stop auto-play if active
        this.stopAutoPlay();
        
        // Reset scout report flags
        this.scoutReportShown = false;
        this.scoutReportReady = false;
        
        console.log('[GameState] Game state reset to defaults');
    }

    // Auto-play functionality
    toggleAutoPlay() {
        if (this.autoPlayActive) {
            this.stopAutoPlay();
        } else {
            this.startAutoPlay();
        }
    }

    startAutoPlay() {
        if (this.autoPlayActive) return;
        
        this.autoPlayActive = true;
        this.autoPlayInterval = setInterval(() => {
            this.endDay();
        }, this.autoPlaySpeed);
        
        console.log(`[GameState] Auto-play started - advancing every ${this.autoPlaySpeed/1000} seconds`);
        this.updateAutoPlayUI();
    }

    stopAutoPlay() {
        if (!this.autoPlayActive) return;
        
        this.autoPlayActive = false;
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        
        console.log('[GameState] Auto-play stopped');
        this.updateAutoPlayUI();
    }

    updateAutoPlayUI() {
        const autoPlayBtn = document.getElementById('auto-play-btn');
        const autoPlayIcon = document.getElementById('auto-play-icon');
        const autoPlayText = document.getElementById('auto-play-text');
        
        if (autoPlayBtn && autoPlayIcon && autoPlayText) {
            if (this.autoPlayActive) {
                autoPlayBtn.classList.add('active');
                autoPlayIcon.textContent = '⏸️';
                autoPlayText.textContent = 'Pause';
                autoPlayBtn.title = 'Pause auto-advance';
            } else {
                autoPlayBtn.classList.remove('active');
                autoPlayIcon.textContent = '▶️';
                autoPlayText.textContent = 'Play';
                autoPlayBtn.title = 'Auto-advance days (20s interval)';
            }
        }
    }

    // Scout progress tracking
    updateScoutProgress() {
        const progressFill = document.getElementById('scout-progress-fill');
        const progressText = document.getElementById('scout-progress-text');
        const scoutStatus = document.getElementById('scout-status');
        
        if (progressFill && progressText && scoutStatus) {
            const progress = Math.min((this.currentDay / this.scoutReportDay) * 100, 100);
            progressFill.style.width = `${progress}%`;
            
            if (this.currentDay < this.scoutReportDay) {
                progressText.textContent = `Day ${this.currentDay} of ${this.scoutReportDay}`;
                scoutStatus.textContent = 'Scouts gathering intelligence...';
                scoutStatus.style.color = '#f8f9fa';
                this.scoutReportReady = false;
            } else if (this.currentDay === this.scoutReportDay) {
                progressText.textContent = 'Report Ready!';
                scoutStatus.textContent = '⚠️ Scouts ready to report - Critical intelligence available!';
                scoutStatus.style.color = '#f1c40f';
                this.scoutReportReady = true;
                
                // Pause auto-play when intelligence is ready
                if (this.autoPlayActive) {
                    this.stopAutoPlay();
                    console.log('[GameState] Auto-play paused - Scout report ready');
                }
                
                // Show notification only once
                if (!this.scoutReportShown && window.showToast) {
                    this.scoutReportShown = true;
                    window.showToast('🚨 Scout Report Available! Game paused for your decision.', {
                        icon: '🔍',
                        type: 'warning',
                        timeout: 5000
                    });
                }
            } else {
                progressText.textContent = 'Awaiting Orders';
                scoutStatus.textContent = '📋 Strategic intelligence ready - Awaiting your command!';
                scoutStatus.style.color = '#2ecc71';
                this.scoutReportReady = true;
            }
        }
    }
}

// Initialize global game state
const gameState = new GameState();

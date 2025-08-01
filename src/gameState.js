// Global game state management
class GameState {
    constructor() {
        this.resources = {
            food: 100,
            wood: 50,
            stone: 25
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
            barracks: { wood: 30, stone: 20 }
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
            this.resources[resource] -= cost[resource];
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
        
        this.buildings.forEach(building => {
            const production = this.buildingProduction[building.type];
            if (production) {
                Object.keys(production).forEach(resource => {
                    if (this.resources[resource] !== undefined) {
                        const amount = production[resource] * productionMultiplier * seasonMultiplier * building.level;
                        this.resources[resource] += Math.floor(amount);
                    } else if (resource === 'population') {
                        this.population += production[resource] * building.level;
                    }
                });
            }
        });
        
        // Cap resources
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
        this.season = seasons[(currentIndex + 1) % seasons.length];
        
        // Notify players of season change
        // ...
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
        
        // Use modal system for construction notifications
        if (window.modalSystem) {
            console.log('[GameState] Using modal system for construction notification');
            window.modalSystem.showConstructionQueuedModal(buildingType, constructionHours);
        } else {
            console.log('[GameState] Modal system not available, using notification fallback');
            // Fallback to notification if modal system isn't available
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
            townCenter: 24,   // 24 hours (1 day)
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
        
        // Base resource generation (representing villagers working)
        const baseFood = Math.floor(this.population * 0.5);
        const baseWood = Math.floor(this.population * 0.3);
        const baseStone = Math.floor(this.population * 0.2);
        
        // Apply resources
        this.resources.food += foodGenerated + baseFood;
        this.resources.wood += woodGenerated + baseWood;
        this.resources.stone += stoneGenerated + baseStone;
        
        // Store for scout report
        this.lastDayProduction = {
            food: foodGenerated + baseFood,
            wood: woodGenerated + baseWood,
            stone: stoneGenerated + baseStone
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
}

// Initialize global game state
const gameState = new GameState();

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
        
        this.buildings = [
            { id: 'house1', type: 'house', x: 100, y: 100, level: 1 },
            { id: 'farm1', type: 'farm', x: 200, y: 150, level: 1 }
        ];
        
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
        
        // Game loop
        this.lastUpdate = Date.now();
        this.seasonTimer = 0;
        this.seasonDuration = 60000; // 60 seconds per season
    }
    
    canAfford(buildingType) {
        const cost = this.buildingCosts[buildingType];
        return Object.keys(cost).every(resource => 
            this.resources[resource] >= cost[resource]
        );
    }
    
    canAffordGold(amount) {
        return this.gold >= amount;
    }
    
    spend(buildingType) {
        const cost = this.buildingCosts[buildingType];
        Object.keys(cost).forEach(resource => {
            this.resources[resource] -= cost[resource];
        });
        this.updateUI();
        this.updateBuildButtons();
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
        this.logBattleEvent(`🌱 Season changed to ${this.season}! Resource production affected.`);
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
        const battleLog = document.getElementById('battle-log');
        if (battleLog) {
            const logEntry = document.createElement('div');
            logEntry.className = 'battle-log-entry';
            logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            battleLog.appendChild(logEntry);
            battleLog.scrollTop = battleLog.scrollHeight;
            
            // Keep only last 10 entries
            while (battleLog.children.length > 10) {
                battleLog.removeChild(battleLog.firstChild);
            }
        }
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
        
        // Generate resources every 5 seconds
        if (Math.floor(now / 5000) !== Math.floor((now - deltaTime) / 5000)) {
            this.generateResources();
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
        
        localStorage.setItem('villageDefenseIdleo', JSON.stringify(saveData));
        console.log('Game saved!');
    }
    
    load() {
        const saveData = localStorage.getItem('villageDefenseIdleo');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                Object.keys(data).forEach(key => {
                    if (this[key] !== undefined) {
                        this[key] = data[key];
                    }
                });
                console.log('Game loaded!');
                return true;
            } catch (error) {
                console.error('Failed to load save data:', error);
                return false;
            }
        }
        return false;
    }
}

// Initialize global game state
const gameState = new GameState();

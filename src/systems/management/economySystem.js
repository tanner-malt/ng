// Economy System - Trading and Military Upkeep
class EconomySystem {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Trade prices (base values, modified by tech and market buildings)
        this.basePrices = {
            food: 1,      // 1 gold per food
            wood: 2,      // 2 gold per wood
            stone: 3,     // 3 gold per stone
            metal: 5,     // 5 gold per metal
            planks: 4     // 4 gold per plank
        };
        
        // Military upkeep costs per unit per day
        this.upkeepCosts = {
            militia: 1,
            archer: 2,
            soldier: 3,
            veteran: 4,
            knight: 6,
            elite: 8,
            guard: 2  // Village guards
        };
        
        // Trading state
        this.tradingEnabled = false;
        this.lastTradeDay = 0;
        this.tradeCooldown = 1; // Days between trades
        
        // Merchant visits
        this.merchantPresent = false;
        this.merchantInventory = {};
        this.merchantTimer = 0;
    }
    
    init() {
        // Check if trading is enabled via tech
        this.tradingEnabled = this.gameState.tradingEnabled || false;
        console.log('[Economy] Initialized, trading:', this.tradingEnabled ? 'enabled' : 'disabled');
    }
    
    // Process daily upkeep costs
    processDaily() {
        this.processMilitaryUpkeep();
        this.processMarketIncome();
        this.processMerchantVisit();
    }
    
    // Calculate and deduct military upkeep
    processMilitaryUpkeep() {
        let totalUpkeep = 0;
        
        // Count units in armies
        const armies = window.worldManager?.parties?.expeditions || [];
        armies.forEach(army => {
            const units = army.units || [];
            units.forEach(unit => {
                const type = unit.type || 'militia';
                totalUpkeep += this.upkeepCosts[type] || 1;
            });
        });
        
        // Count village guards
        const guards = this.countVillageGuards();
        totalUpkeep += guards * (this.upkeepCosts.guard || 2);
        
        // Apply logistics tech bonus
        const logisticsBonus = this.gameState.techBonuses?.armyUpkeep || 0;
        totalUpkeep = Math.floor(totalUpkeep * (1 + logisticsBonus)); // logisticsBonus is negative for reduction
        
        // Deduct from gold
        if (totalUpkeep > 0 && this.gameState.resources) {
            const gold = this.gameState.resources.gold || 0;
            
            if (gold >= totalUpkeep) {
                this.gameState.resources.gold -= totalUpkeep;
            } else {
                // Not enough gold - morale penalty
                this.gameState.resources.gold = 0;
                window.eventBus?.emit('upkeepUnpaid', { amount: totalUpkeep - gold });
                window.showToast?.(`⚠️ Cannot afford military upkeep! Units losing morale.`, { type: 'warning' });
            }
        }
    }
    
    // Count guards in barracks and fortifications
    countVillageGuards() {
        let count = 0;
        const buildings = this.gameState.buildings || [];
        
        buildings.forEach(building => {
            if (building.type === 'barracks' || building.type === 'fortifications') {
                // Count workers as guards
                count += (building.workers?.length || 0);
            }
        });
        
        return count;
    }
    
    // Generate income from markets
    processMarketIncome() {
        const buildings = this.gameState.buildings || [];
        let marketIncome = 0;
        
        buildings.forEach(building => {
            if (building.type === 'market') {
                const traders = building.workers?.length || 0;
                // Each trader generates 2-5 gold per day
                const baseIncome = traders * 3;
                
                // Apply market tech bonus
                const marketBonus = this.gameState.techBonuses?.marketGold || 0;
                marketIncome += Math.floor(baseIncome * (1 + marketBonus));
            }
        });
        
        if (marketIncome > 0 && this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + marketIncome;
        }
    }
    
    // Random merchant visits
    processMerchantVisit() {
        if (!this.tradingEnabled) return;
        
        // 5% chance of merchant visit each day
        if (!this.merchantPresent && Math.random() < 0.05) {
            this.spawnMerchant();
        }
        
        // Merchant leaves after 3 days
        if (this.merchantPresent) {
            this.merchantTimer--;
            if (this.merchantTimer <= 0) {
                this.dismissMerchant();
            }
        }
    }
    
    // Spawn a traveling merchant
    spawnMerchant() {
        this.merchantPresent = true;
        this.merchantTimer = 3; // 3 days
        
        // Generate random inventory
        this.merchantInventory = {
            food: { quantity: 50 + Math.floor(Math.random() * 100), priceModifier: 0.8 + Math.random() * 0.4 },
            wood: { quantity: 30 + Math.floor(Math.random() * 50), priceModifier: 0.8 + Math.random() * 0.4 },
            stone: { quantity: 20 + Math.floor(Math.random() * 40), priceModifier: 0.8 + Math.random() * 0.4 },
            metal: { quantity: 10 + Math.floor(Math.random() * 20), priceModifier: 0.9 + Math.random() * 0.3 }
        };
        
        console.log('[Economy] Merchant arrived!');
        window.showToast?.(`🧳 A traveling merchant has arrived!`, { type: 'info' });
        window.eventBus?.emit('merchantArrived', { inventory: this.merchantInventory });
    }
    
    dismissMerchant() {
        this.merchantPresent = false;
        this.merchantInventory = {};
        console.log('[Economy] Merchant departed');
        window.showToast?.(`🧳 The merchant has departed.`, { type: 'info' });
    }
    
    // Buy resource from merchant
    buyFromMerchant(resourceType, quantity) {
        if (!this.merchantPresent) {
            window.showToast?.(`❌ No merchant available`, { type: 'error' });
            return false;
        }
        
        const item = this.merchantInventory[resourceType];
        if (!item || item.quantity < quantity) {
            window.showToast?.(`❌ Merchant doesn't have enough ${resourceType}`, { type: 'error' });
            return false;
        }
        
        const price = Math.ceil(this.basePrices[resourceType] * item.priceModifier * quantity);
        const gold = this.gameState.resources?.gold || 0;
        
        if (gold < price) {
            window.showToast?.(`❌ Not enough gold (need ${price})`, { type: 'error' });
            return false;
        }
        
        // Execute trade
        this.gameState.resources.gold -= price;
        this.gameState.resources[resourceType] = (this.gameState.resources[resourceType] || 0) + quantity;
        item.quantity -= quantity;
        
        window.showToast?.(`✅ Bought ${quantity} ${resourceType} for ${price} gold`, { type: 'success' });
        return true;
    }
    
    // Sell resource to merchant
    sellToMerchant(resourceType, quantity) {
        if (!this.merchantPresent) {
            window.showToast?.(`❌ No merchant available`, { type: 'error' });
            return false;
        }
        
        const available = this.gameState.resources?.[resourceType] || 0;
        if (available < quantity) {
            window.showToast?.(`❌ Not enough ${resourceType}`, { type: 'error' });
            return false;
        }
        
        // Sell at 60% of base price
        const price = Math.floor(this.basePrices[resourceType] * 0.6 * quantity);
        
        // Execute trade
        this.gameState.resources[resourceType] -= quantity;
        this.gameState.resources.gold = (this.gameState.resources.gold || 0) + price;
        
        window.showToast?.(`✅ Sold ${quantity} ${resourceType} for ${price} gold`, { type: 'success' });
        return true;
    }
    
    // Get current buy price for resource
    getBuyPrice(resourceType, quantity = 1) {
        if (!this.merchantPresent) return null;
        
        const item = this.merchantInventory[resourceType];
        if (!item) return null;
        
        return Math.ceil(this.basePrices[resourceType] * item.priceModifier * quantity);
    }
    
    // Get current sell price for resource
    getSellPrice(resourceType, quantity = 1) {
        return Math.floor(this.basePrices[resourceType] * 0.6 * quantity);
    }
    
    // Get daily upkeep summary
    getUpkeepSummary() {
        let totalUpkeep = 0;
        const breakdown = {};
        
        // Army units
        const armies = window.worldManager?.parties?.expeditions || [];
        armies.forEach(army => {
            const units = army.units || [];
            units.forEach(unit => {
                const type = unit.type || 'militia';
                const cost = this.upkeepCosts[type] || 1;
                totalUpkeep += cost;
                breakdown[type] = (breakdown[type] || 0) + cost;
            });
        });
        
        // Guards
        const guards = this.countVillageGuards();
        if (guards > 0) {
            const guardCost = guards * (this.upkeepCosts.guard || 2);
            totalUpkeep += guardCost;
            breakdown.guards = guardCost;
        }
        
        // Apply tech bonus
        const logisticsBonus = this.gameState.techBonuses?.armyUpkeep || 0;
        totalUpkeep = Math.floor(totalUpkeep * (1 + logisticsBonus));
        
        return {
            total: totalUpkeep,
            breakdown,
            canAfford: (this.gameState.resources?.gold || 0) >= totalUpkeep
        };
    }
    
    // Enable trading (called when Trade Routes tech is researched)
    enableTrading() {
        this.tradingEnabled = true;
        this.gameState.tradingEnabled = true;
        console.log('[Economy] Trading enabled via technology');
    }
}

// Export to window
window.EconomySystem = EconomySystem;

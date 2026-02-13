// UnitManager.js - Manages all units on the world map
// Handles creation, movement, interactions, and rendering coordination

class UnitManager {
    constructor(worldManager, gameState) {
        this.worldManager = worldManager;
        this.gameState = gameState;
        
        // All units indexed by ID
        this.units = new Map();
        
        // Quick lookup by allegiance
        this.unitsByAllegiance = {
            [UnitAllegiance.PLAYER]: new Set(),
            [UnitAllegiance.ALLY]: new Set(),
            [UnitAllegiance.NEUTRAL]: new Set(),
            [UnitAllegiance.ENEMY]: new Set()
        };
        
        // Spatial index: 'row,col' -> Set of unit IDs
        this.unitsByPosition = new Map();
        
        // ID counter for stable IDs
        this.idCounter = 0;
    }
    
    /**
     * Initialize the unit manager
     */
    init() {
        console.log('[UnitManager] Initializing...');
        this.loadState();
        console.log(`[UnitManager] Initialized with ${this.units.size} units`);
    }
    
    /**
     * Generate a unique unit ID
     */
    generateId(prefix = 'unit') {
        this.idCounter++;
        return `${prefix}_${this.idCounter}_${Date.now().toString(36)}`;
    }
    
    /**
     * Create a new unit
     */
    createUnit(config) {
        // Ensure unique ID
        if (!config.id) {
            config.id = this.generateId(config.type || 'unit');
        }
        
        // Set creation day
        config.createdDay = this.gameState?.day || 1;
        config.lastActionDay = config.createdDay;
        
        const unit = new Unit(config);
        this.registerUnit(unit);
        
        console.log(`[UnitManager] Created unit: ${unit.name} (${unit.allegiance}) at (${unit.row}, ${unit.col})`);
        return unit;
    }
    
    /**
     * Register a unit in all indexes
     */
    registerUnit(unit) {
        this.units.set(unit.id, unit);
        this.unitsByAllegiance[unit.allegiance]?.add(unit.id);
        this.addToPositionIndex(unit);
    }
    
    /**
     * Remove a unit from all indexes
     */
    unregisterUnit(unit) {
        this.units.delete(unit.id);
        this.unitsByAllegiance[unit.allegiance]?.delete(unit.id);
        this.removeFromPositionIndex(unit);
    }
    
    /**
     * Add unit to spatial index
     */
    addToPositionIndex(unit) {
        const key = `${unit.row},${unit.col}`;
        if (!this.unitsByPosition.has(key)) {
            this.unitsByPosition.set(key, new Set());
        }
        this.unitsByPosition.get(key).add(unit.id);
    }
    
    /**
     * Remove unit from spatial index
     */
    removeFromPositionIndex(unit) {
        const key = `${unit.row},${unit.col}`;
        this.unitsByPosition.get(key)?.delete(unit.id);
    }
    
    /**
     * Update unit position in spatial index
     */
    updateUnitPosition(unit, oldRow, oldCol) {
        const oldKey = `${oldRow},${oldCol}`;
        this.unitsByPosition.get(oldKey)?.delete(unit.id);
        this.addToPositionIndex(unit);
    }
    
    /**
     * Get unit by ID
     */
    getUnit(id) {
        return this.units.get(id);
    }
    
    /**
     * Get all units
     */
    getAllUnits() {
        return Array.from(this.units.values());
    }
    
    /**
     * Get units by allegiance
     */
    getUnitsByAllegiance(allegiance) {
        const ids = this.unitsByAllegiance[allegiance];
        if (!ids) return [];
        return Array.from(ids).map(id => this.units.get(id)).filter(Boolean);
    }
    
    /**
     * Get player units
     */
    getPlayerUnits() {
        return this.getUnitsByAllegiance(UnitAllegiance.PLAYER);
    }
    
    /**
     * Get enemy units
     */
    getEnemyUnits() {
        return this.getUnitsByAllegiance(UnitAllegiance.ENEMY);
    }
    
    /**
     * Get units at a specific position
     */
    getUnitsAt(row, col) {
        const key = `${row},${col}`;
        const ids = this.unitsByPosition.get(key);
        if (!ids) return [];
        return Array.from(ids).map(id => this.units.get(id)).filter(Boolean);
    }
    
    /**
     * Get visible units for rendering
     */
    getVisibleUnits() {
        const visible = [];
        const discoveredTiles = this.worldManager?.discoveredTiles;
        
        for (const unit of this.units.values()) {
            if (unit.destroyed || !unit.isVisible) continue;
            
            // Player units are always visible
            if (unit.allegiance === UnitAllegiance.PLAYER) {
                visible.push(unit);
                continue;
            }
            
            // Other units only visible if in discovered tiles
            const key = `${unit.row},${unit.col}`;
            if (discoveredTiles?.has(key)) {
                visible.push(unit);
            }
        }
        
        return visible;
    }
    
    /**
     * Create a player army unit
     */
    createPlayerArmy(config) {
        return this.createUnit({
            type: UnitType.ARMY,
            allegiance: UnitAllegiance.PLAYER,
            icon: '⚔️',
            ...config
        });
    }
    
    /**
     * Create a player scout party
     */
    createScoutParty(config) {
        return this.createUnit({
            type: UnitType.SCOUT_PARTY,
            allegiance: UnitAllegiance.PLAYER,
            mode: UnitMode.SCOUT,
            icon: '🔭',
            movementSpeed: 2, // Scouts move faster
            ...config
        });
    }
    
    /**
     * Create a player trade caravan
     */
    createTradeCaravan(config) {
        return this.createUnit({
            type: UnitType.TRADE_CARAVAN,
            allegiance: UnitAllegiance.PLAYER,
            mode: UnitMode.TRADE,
            icon: '🛒',
            movementSpeed: 1,
            ...config
        });
    }
    
    /**
     * Create an enemy raider band
     */
    createRaiderBand(config) {
        return this.createUnit({
            type: UnitType.RAIDER_BAND,
            allegiance: UnitAllegiance.ENEMY,
            mode: UnitMode.BATTLE,
            icon: '🏴',
            color: '#e74c3c',
            ...config
        });
    }
    
    /**
     * Create a neutral merchant
     */
    createWanderingMerchant(config) {
        return this.createUnit({
            type: UnitType.WANDERING_MERCHANT,
            allegiance: UnitAllegiance.NEUTRAL,
            mode: UnitMode.TRADE,
            icon: '🧳',
            color: '#f39c12',
            ...config
        });
    }

    /**
     * Create a city unit (stationary, high defense, represents a settlement)
     * @param {object} config - { row, col, name, data: { level, governor, founded, isCapital } }
     */
    createCityUnit(config) {
        return this.createUnit({
            type: UnitType.CITY,
            allegiance: UnitAllegiance.PLAYER,
            mode: UnitMode.IDLE,
            movementSpeed: 0,      // Cities don't move
            icon: '🏰',
            color: '#f1c40f',
            combat: {
                attack: 0,
                defense: 50,
                morale: 100
            },
            ...config
        });
    }
    
    /**
     * Destroy a unit
     */
    destroyUnit(unitId) {
        const unit = this.units.get(unitId);
        if (!unit) return false;
        
        unit.destroyed = true;
        this.unregisterUnit(unit);
        
        console.log(`[UnitManager] Destroyed unit: ${unit.name}`);
        window.eventBus?.emit('unit_destroyed', { unit });
        
        return true;
    }
    
    /**
     * Move unit to a new position
     */
    moveUnit(unitId, newRow, newCol) {
        const unit = this.units.get(unitId);
        if (!unit) return false;
        
        const oldRow = unit.row;
        const oldCol = unit.col;
        
        unit.row = newRow;
        unit.col = newCol;
        
        this.updateUnitPosition(unit, oldRow, oldCol);
        
        console.log(`[UnitManager] Moved ${unit.name} from (${oldRow}, ${oldCol}) to (${newRow}, ${newCol})`);
        window.eventBus?.emit('unit_moved', { unit, from: { row: oldRow, col: oldCol }, to: { row: newRow, col: newCol } });
        
        return true;
    }
    
    /**
     * Start unit traveling along a path
     */
    startUnitTravel(unitId, path, destination) {
        const unit = this.units.get(unitId);
        if (!unit) return false;
        
        const success = unit.startTravel(path, destination);
        if (success) {
            window.eventBus?.emit('unit_travel_started', { unit, path, destination });
        }
        return success;
    }
    
    /**
     * Process daily updates for all units
     */
    processDaily() {
        const currentDay = this.gameState?.day || 1;
        
        for (const unit of this.units.values()) {
            if (unit.destroyed) continue;
            
            // Process travel
            if (unit.mode === UnitMode.TRAVEL) {
                const oldRow = unit.row;
                const oldCol = unit.col;
                const stillTraveling = unit.processDailyTravel();
                
                if (unit.row !== oldRow || unit.col !== oldCol) {
                    this.updateUnitPosition(unit, oldRow, oldCol);
                    
                    // Scout mode reveals tiles
                    if (unit.type === UnitType.SCOUT_PARTY || unit.mode === UnitMode.SCOUT) {
                        this.worldManager?.revealHex?.(unit.row, unit.col);
                    }
                }
                
                if (!stillTraveling) {
                    window.eventBus?.emit('unit_arrived', { unit });
                }
            }
            
            // Consume supplies
            if (unit.allegiance === UnitAllegiance.PLAYER && unit.members.length > 0) {
                const hasFood = unit.consumeDailySupplies();
                if (!hasFood) {
                    window.showToast?.(`⚠️ ${unit.name} is starving!`, { type: 'warning' });
                }
            }
            
            unit.lastActionDay = currentDay;
        }
        
        // Check for encounters
        this.checkEncounters();
        
        // Save state
        this.saveState();
    }
    
    /**
     * Check for unit encounters at same position
     */
    checkEncounters() {
        for (const [posKey, unitIds] of this.unitsByPosition) {
            if (unitIds.size < 2) continue;
            
            const unitsAtPos = Array.from(unitIds).map(id => this.units.get(id)).filter(Boolean);
            
            // Check for hostile encounters
            const playerUnits = unitsAtPos.filter(u => u.allegiance === UnitAllegiance.PLAYER);
            const enemyUnits = unitsAtPos.filter(u => u.allegiance === UnitAllegiance.ENEMY);
            
            if (playerUnits.length > 0 && enemyUnits.length > 0) {
                console.log(`[UnitManager] Hostile encounter at ${posKey}`);
                window.eventBus?.emit('unit_encounter', {
                    position: posKey,
                    playerUnits,
                    enemyUnits,
                    type: 'hostile'
                });
            }
            
            // Check for trade opportunities
            const neutralUnits = unitsAtPos.filter(u => u.allegiance === UnitAllegiance.NEUTRAL);
            if (playerUnits.length > 0 && neutralUnits.length > 0) {
                const tradeable = neutralUnits.filter(u => 
                    u.type === UnitType.WANDERING_MERCHANT || u.mode === UnitMode.TRADE
                );
                if (tradeable.length > 0) {
                    window.eventBus?.emit('unit_encounter', {
                        position: posKey,
                        playerUnits,
                        neutralUnits: tradeable,
                        type: 'trade'
                    });
                }
            }
        }
    }
    
    /**
     * Get units by mode
     */
    getUnitsByMode(mode) {
        return this.getAllUnits().filter(u => u.mode === mode && !u.destroyed);
    }
    
    /**
     * Get all scouting units
     */
    getScoutingUnits() {
        return this.getUnitsByMode(UnitMode.SCOUT);
    }
    
    /**
     * Get all trading units
     */
    getTradingUnits() {
        return this.getUnitsByMode(UnitMode.TRADE);
    }
    
    /**
     * Get all traveling units
     */
    getTravelingUnits() {
        return this.getUnitsByMode(UnitMode.TRAVEL);
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            const state = {
                idCounter: this.idCounter,
                units: Array.from(this.units.values()).map(u => u.toJSON())
            };
            localStorage.setItem('unitManagerState', JSON.stringify(state));
        } catch (e) {
            console.error('[UnitManager] Error saving state:', e);
        }
    }
    
    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('unitManagerState');
            if (saved) {
                const state = JSON.parse(saved);
                this.idCounter = state.idCounter || 0;
                
                // Rebuild units from saved data
                if (state.units && Array.isArray(state.units)) {
                    state.units.forEach(unitData => {
                        const unit = Unit.fromJSON(unitData);
                        if (!unit.destroyed) {
                            this.registerUnit(unit);
                        }
                    });
                }
                console.log(`[UnitManager] Loaded ${this.units.size} units from storage`);
            }
        } catch (e) {
            console.error('[UnitManager] Error loading state:', e);
        }
    }
    
    /**
     * Clear all units (for reset)
     */
    clearAll() {
        this.units.clear();
        Object.values(this.unitsByAllegiance).forEach(set => set.clear());
        this.unitsByPosition.clear();
        this.idCounter = 0;
        localStorage.removeItem('unitManagerState');
        console.log('[UnitManager] Cleared all units');
    }
    
    /**
     * Get summary for UI display
     */
    getSummary() {
        const playerUnits = this.getPlayerUnits();
        const enemyUnits = this.getEnemyUnits();
        
        return {
            total: this.units.size,
            player: playerUnits.length,
            ally: this.getUnitsByAllegiance(UnitAllegiance.ALLY).length,
            neutral: this.getUnitsByAllegiance(UnitAllegiance.NEUTRAL).length,
            enemy: enemyUnits.length,
            traveling: this.getTravelingUnits().length,
            scouting: this.getScoutingUnits().length,
            trading: this.getTradingUnits().length
        };
    }
}

// Export to window
window.UnitManager = UnitManager;

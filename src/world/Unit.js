// Unit.js - Core unit data type for world map entities
// Units can be player-controlled, allied, neutral, or enemy
// Units have modes: scout, trade, battle, travel

/**
 * Unit allegiances
 */
const UnitAllegiance = {
    PLAYER: 'player',     // Player-controlled units
    ALLY: 'ally',         // Friendly NPCs, trade caravans you've befriended
    NEUTRAL: 'neutral',   // Merchants, travelers, wildlife
    ENEMY: 'enemy'        // Hostile forces, raiders
};

/**
 * Unit modes - what the unit is currently doing
 */
const UnitMode = {
    IDLE: 'idle',         // Stationary, not moving
    SCOUT: 'scout',       // Exploring, reveals fog of war
    TRADE: 'trade',       // Trading mission, carries goods
    BATTLE: 'battle',     // In combat or seeking combat
    TRAVEL: 'travel'      // Moving to destination
};

/**
 * Unit types for display and behavior
 */
const UnitType = {
    // Player units
    ARMY: 'army',
    SCOUT_PARTY: 'scout_party',
    TRADE_CARAVAN: 'trade_caravan',
    SETTLERS: 'settlers',
    
    // Allied units
    ALLIED_ARMY: 'allied_army',
    MERCHANT_CARAVAN: 'merchant_caravan',
    
    // Neutral units
    WANDERING_MERCHANT: 'wandering_merchant',
    TRAVELERS: 'travelers',
    WILDLIFE: 'wildlife',
    
    // Enemy units
    RAIDER_BAND: 'raider_band',
    ENEMY_ARMY: 'enemy_army',
    MONSTER: 'monster'
};

/**
 * Unit class - represents any entity that can exist on the world map
 */
class Unit {
    constructor(config = {}) {
        // Core identity
        this.id = config.id || `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = config.name || 'Unknown Unit';
        this.type = config.type || UnitType.ARMY;
        
        // Allegiance and mode
        this.allegiance = config.allegiance || UnitAllegiance.NEUTRAL;
        this.mode = config.mode || UnitMode.IDLE;
        
        // Position on map
        this.row = config.row ?? 0;
        this.col = config.col ?? 0;
        
        // Movement
        this.movementSpeed = config.movementSpeed ?? 1; // Tiles per day
        this.movementPoints = config.movementPoints ?? this.movementSpeed;
        this.travelPlan = null; // { path: [{row,col}], index: number, destination: {row,col} }
        
        // Composition - who's in the unit
        this.members = config.members || []; // Array of person references or soldier data
        this.strength = config.strength ?? this.members.length;
        
        // Resources the unit carries
        this.supplies = {
            food: config.supplies?.food ?? 0,
            gold: config.supplies?.gold ?? 0,
            goods: config.supplies?.goods ?? 0, // For trade caravans
            ...config.supplies
        };
        
        // Combat stats
        this.combat = {
            attack: config.combat?.attack ?? 5,
            defense: config.combat?.defense ?? 3,
            morale: config.combat?.morale ?? 100,
            ...config.combat
        };
        
        // Visual representation
        this.icon = config.icon || this.getDefaultIcon();
        this.color = config.color || this.getDefaultColor();
        
        // State tracking
        this.createdDay = config.createdDay ?? 1;
        this.lastActionDay = config.lastActionDay ?? 1;
        this.isVisible = config.isVisible ?? true;
        this.destroyed = config.destroyed ?? false;
        
        // Origin tracking
        this.origin = config.origin || null; // { row, col } - where unit came from
        this.homeBase = config.homeBase || null; // For return trips
        
        // Custom data for specific unit types
        this.data = config.data || {};
    }
    
    /**
     * Get default icon based on type and allegiance
     */
    getDefaultIcon() {
        const icons = {
            // Player units
            [UnitType.ARMY]: '⚔️',
            [UnitType.SCOUT_PARTY]: '🔭',
            [UnitType.TRADE_CARAVAN]: '🛒',
            [UnitType.SETTLERS]: '👨‍👩‍👧‍👦',
            
            // Allied units
            [UnitType.ALLIED_ARMY]: '🤝',
            [UnitType.MERCHANT_CARAVAN]: '🐪',
            
            // Neutral units
            [UnitType.WANDERING_MERCHANT]: '🧳',
            [UnitType.TRAVELERS]: '🚶',
            [UnitType.WILDLIFE]: '🦌',
            
            // Enemy units
            [UnitType.RAIDER_BAND]: '🏴',
            [UnitType.ENEMY_ARMY]: '☠️',
            [UnitType.MONSTER]: '👹'
        };
        return icons[this.type] || '❓';
    }
    
    /**
     * Get default color based on allegiance
     */
    getDefaultColor() {
        const colors = {
            [UnitAllegiance.PLAYER]: '#3498db',    // Blue
            [UnitAllegiance.ALLY]: '#2ecc71',      // Green
            [UnitAllegiance.NEUTRAL]: '#f39c12',   // Orange
            [UnitAllegiance.ENEMY]: '#e74c3c'      // Red
        };
        return colors[this.allegiance] || '#95a5a6';
    }
    
    /**
     * Get mode icon for display
     */
    getModeIcon() {
        const icons = {
            [UnitMode.IDLE]: '💤',
            [UnitMode.SCOUT]: '👁️',
            [UnitMode.TRADE]: '💰',
            [UnitMode.BATTLE]: '⚔️',
            [UnitMode.TRAVEL]: '🚶'
        };
        return icons[this.mode] || '';
    }
    
    /**
     * Set unit mode
     */
    setMode(mode) {
        if (Object.values(UnitMode).includes(mode)) {
            this.mode = mode;
            console.log(`[Unit] ${this.name} mode changed to ${mode}`);
            return true;
        }
        console.warn(`[Unit] Invalid mode: ${mode}`);
        return false;
    }
    
    /**
     * Start travel to destination
     */
    startTravel(path, destination) {
        if (!path || path.length === 0) {
            console.warn(`[Unit] ${this.name} cannot travel - no path provided`);
            return false;
        }
        
        this.travelPlan = {
            path: path,
            index: 0,
            destination: destination || path[path.length - 1]
        };
        this.mode = UnitMode.TRAVEL;
        console.log(`[Unit] ${this.name} started travel to (${this.travelPlan.destination.row}, ${this.travelPlan.destination.col})`);
        return true;
    }
    
    /**
     * Process one day of travel
     * Returns: true if still traveling, false if arrived or stopped
     */
    processDailyTravel() {
        if (this.mode !== UnitMode.TRAVEL || !this.travelPlan) {
            return false;
        }
        
        const plan = this.travelPlan;
        if (plan.index >= plan.path.length - 1) {
            // Arrived at destination
            this.mode = UnitMode.IDLE;
            this.travelPlan = null;
            console.log(`[Unit] ${this.name} arrived at destination`);
            return false;
        }
        
        // Move along path based on movement speed
        let movesRemaining = this.movementSpeed;
        while (movesRemaining > 0 && plan.index < plan.path.length - 1) {
            plan.index++;
            const nextPos = plan.path[plan.index];
            this.row = nextPos.row;
            this.col = nextPos.col;
            movesRemaining--;
        }
        
        // Check if arrived
        if (plan.index >= plan.path.length - 1) {
            this.mode = UnitMode.IDLE;
            this.travelPlan = null;
            console.log(`[Unit] ${this.name} arrived at destination`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Consume daily supplies
     * Returns: true if has enough food, false if starving
     */
    consumeDailySupplies() {
        const dailyConsumption = Math.max(1, Math.ceil(this.members.length / 5));
        
        if (this.supplies.food >= dailyConsumption) {
            this.supplies.food -= dailyConsumption;
            return true;
        } else {
            // Starving - lose morale
            this.combat.morale = Math.max(0, this.combat.morale - 10);
            this.supplies.food = 0;
            return false;
        }
    }
    
    /**
     * Check if unit is hostile to another unit
     */
    isHostileTo(otherUnit) {
        if (this.allegiance === UnitAllegiance.ENEMY) {
            return otherUnit.allegiance === UnitAllegiance.PLAYER || 
                   otherUnit.allegiance === UnitAllegiance.ALLY;
        }
        if (this.allegiance === UnitAllegiance.PLAYER || this.allegiance === UnitAllegiance.ALLY) {
            return otherUnit.allegiance === UnitAllegiance.ENEMY;
        }
        return false;
    }
    
    /**
     * Check if unit can interact peacefully with another
     */
    canTradeWith(otherUnit) {
        // Enemies can't trade
        if (this.isHostileTo(otherUnit)) return false;
        
        // At least one must be in trade mode or be a merchant type
        const tradingTypes = [UnitType.TRADE_CARAVAN, UnitType.MERCHANT_CARAVAN, UnitType.WANDERING_MERCHANT];
        const canTrade = tradingTypes.includes(this.type) || 
                        tradingTypes.includes(otherUnit.type) ||
                        this.mode === UnitMode.TRADE ||
                        otherUnit.mode === UnitMode.TRADE;
        
        return canTrade;
    }
    
    /**
     * Get display info for UI
     */
    getDisplayInfo() {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            color: this.color,
            allegiance: this.allegiance,
            mode: this.mode,
            modeIcon: this.getModeIcon(),
            position: { row: this.row, col: this.col },
            strength: this.strength,
            morale: this.combat.morale,
            supplies: { ...this.supplies },
            isMoving: this.mode === UnitMode.TRAVEL && this.travelPlan !== null
        };
    }
    
    /**
     * Serialize for saving
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            allegiance: this.allegiance,
            mode: this.mode,
            row: this.row,
            col: this.col,
            movementSpeed: this.movementSpeed,
            movementPoints: this.movementPoints,
            travelPlan: this.travelPlan,
            members: this.members,
            strength: this.strength,
            supplies: this.supplies,
            combat: this.combat,
            icon: this.icon,
            color: this.color,
            createdDay: this.createdDay,
            lastActionDay: this.lastActionDay,
            isVisible: this.isVisible,
            destroyed: this.destroyed,
            origin: this.origin,
            homeBase: this.homeBase,
            data: this.data
        };
    }
    
    /**
     * Create Unit from saved data
     */
    static fromJSON(json) {
        return new Unit(json);
    }
}

// Export to window for global access
window.Unit = Unit;
window.UnitAllegiance = UnitAllegiance;
window.UnitMode = UnitMode;
window.UnitType = UnitType;

/**
 * worldModel.js - World Map Data Models
 * 
 * Reactive data models for the world map system:
 * - TileModel: Individual hex tile with terrain, visibility, POIs
 * - ArmyModel: Player expedition/army with members, supplies, movement
 * - EnemyModel: Enemy unit on the map
 * - WorldRegistry: Central manager for all world entities
 */

// =========================================
// TILE MODEL
// =========================================

/**
 * TileModel - Represents a single hex tile on the world map
 */
class TileModel extends DataModel {
    static SCHEMA = {
        terrain: { default: 'grass' },
        visibility: { default: 'hidden' }, // 'hidden' | 'scoutable' | 'explored'
        displayX: { default: 0 },
        displayY: { default: 0 },
        poi: { default: null }, // Point of Interest on this tile
        hasEnemy: { default: false },
        enemyId: { default: null },
        isCapital: { default: false },
        zone: { default: 'safe' }, // 'safe' | 'frontier' | 'wilderness' | 'dangerous'
        resourceYield: { default: {} }
    };

    constructor(row, col, data = {}) {
        const id = `tile_${row}_${col}`;
        super('tile', id, TileModel.SCHEMA, data);
        
        this._row = row;
        this._col = col;

        // Computed properties
        this.defineComputed('terrainData', () => {
            const terrain = this.get('terrain');
            return window.WORLD_DATA?.terrainTypes?.[terrain] || 
                   window.TERRAIN_TYPES?.[terrain] || 
                   { name: terrain, moveCost: 1, color: '#888' };
        });

        this.defineComputed('isExplored', () => {
            return this.get('visibility') === 'explored';
        });

        this.defineComputed('isScoutable', () => {
            return this.get('visibility') === 'scoutable';
        });

        this.defineComputed('isHidden', () => {
            return this.get('visibility') === 'hidden';
        });

        this.defineComputed('moveCost', () => {
            return this.get('terrainData').moveCost || 1;
        });

        this.defineComputed('isPassable', () => {
            const data = this.get('terrainData');
            return !data.impassable && data.moveCost < 99;
        });

        this.defineComputed('icon', () => {
            return this.get('terrainData').icon || '❓';
        });

        this.defineComputed('color', () => {
            return this.get('terrainData').color || '#888888';
        });
    }

    get row() { return this._row; }
    get col() { return this._col; }

    /**
     * Reveal this tile (set to explored)
     */
    explore() {
        if (this.get('visibility') !== 'explored') {
            this.set('visibility', 'explored');
            
            if (window.eventBus) {
                window.eventBus.emit('tile:explored', { 
                    tile: this, 
                    row: this._row, 
                    col: this._col 
                });
            }
            return true;
        }
        return false;
    }

    /**
     * Make this tile scoutable (visible but not accessible)
     */
    makeScoutable() {
        if (this.get('visibility') === 'hidden') {
            this.set('visibility', 'scoutable');
            return true;
        }
        return false;
    }

    /**
     * Set an enemy on this tile
     * @param {string} enemyId - Enemy ID
     */
    setEnemy(enemyId) {
        this.batch(() => {
            this.set('hasEnemy', !!enemyId);
            this.set('enemyId', enemyId);
        });
    }

    /**
     * Clear enemy from this tile
     */
    clearEnemy() {
        this.batch(() => {
            this.set('hasEnemy', false);
            this.set('enemyId', null);
        });
    }

    /**
     * Set a point of interest on this tile
     * @param {object} poi - POI data
     */
    setPOI(poi) {
        this.set('poi', poi);
        if (window.eventBus) {
            window.eventBus.emit('tile:poi:added', { tile: this, poi });
        }
    }
}


// =========================================
// ARMY MODEL
// =========================================

/**
 * ArmyModel - Represents a player expedition/army
 */
class ArmyModel extends DataModel {
    static SCHEMA = {
        name: { default: 'Unnamed Army' },
        type: { default: 'army' }, // 'army' | 'scout_party' | 'trade_caravan' | 'settlers'
        row: { default: 0 },
        col: { default: 0 },
        
        // Composition
        members: { default: [] },
        strength: { default: 0 },
        
        // Supplies
        food: { default: 0 },
        gold: { default: 0 },
        goods: { default: 0 },
        
        // Status
        morale: { default: 100 },
        mode: { default: 'idle' }, // 'idle' | 'travel' | 'battle' | 'scout'
        
        // Movement
        movementPoints: { default: 1 },
        travelPlan: { default: null }, // { path: [], index: 0, destination: {} }
        
        // Combat
        attack: { default: 5 },
        defense: { default: 3 },
        
        // Metadata
        createdDay: { default: 1 },
        icon: { default: '⚔️' },
        color: { default: '#3182ce' }
    };

    constructor(id, data = {}) {
        super('army', id, ArmyModel.SCHEMA, data);

        // Computed properties
        this.defineComputed('memberCount', () => {
            return this.get('members').length;
        });

        this.defineComputed('foodDaysRemaining', () => {
            const food = this.get('food');
            const members = this.get('memberCount');
            return members > 0 ? Math.floor(food / members) : 0;
        });

        this.defineComputed('isStarving', () => {
            return this.get('foodDaysRemaining') <= 0;
        });

        this.defineComputed('isTraveling', () => {
            const plan = this.get('travelPlan');
            return plan && plan.path && plan.index < plan.path.length - 1;
        });

        this.defineComputed('position', () => {
            return { row: this.get('row'), col: this.get('col') };
        });

        this.defineComputed('combatPower', () => {
            let power = this.get('strength') || this.get('memberCount');
            power += this.get('attack');
            
            // Morale modifier
            const morale = this.get('morale');
            if (morale < 50) power *= 0.7;
            else if (morale < 30) power *= 0.5;
            
            // Starvation penalty
            if (this.get('isStarving')) power *= 0.5;
            
            return Math.floor(power);
        });
    }

    /**
     * Move army to a new position
     * @param {number} row - Target row
     * @param {number} col - Target col
     */
    moveTo(row, col) {
        const oldRow = this.get('row');
        const oldCol = this.get('col');
        
        this.batch(() => {
            this.set('row', row);
            this.set('col', col);
        });

        if (window.eventBus) {
            window.eventBus.emit('army:moved', {
                army: this,
                from: { row: oldRow, col: oldCol },
                to: { row, col }
            });
        }
    }

    /**
     * Set travel plan for the army
     * @param {object[]} path - Array of {row, col} positions
     * @param {object} destination - Final destination {row, col}
     */
    setTravelPlan(path, destination) {
        this.batch(() => {
            this.set('travelPlan', {
                path,
                index: 0,
                destination
            });
            this.set('mode', 'travel');
        });

        if (window.eventBus) {
            window.eventBus.emit('army:travel:started', { army: this, destination });
        }
    }

    /**
     * Advance one step on travel path
     * @returns {boolean} True if moved, false if at destination
     */
    advanceTravel() {
        const plan = this.get('travelPlan');
        if (!plan || !plan.path) return false;

        const nextIndex = plan.index + 1;
        if (nextIndex >= plan.path.length) {
            // Arrived at destination
            this.batch(() => {
                this.set('travelPlan', null);
                this.set('mode', 'idle');
            });

            if (window.eventBus) {
                window.eventBus.emit('army:travel:completed', { army: this });
            }
            return false;
        }

        const nextPos = plan.path[nextIndex];
        this.moveTo(nextPos.row, nextPos.col);
        
        plan.index = nextIndex;
        this.set('travelPlan', { ...plan });

        return true;
    }

    /**
     * Consume daily supplies
     */
    consumeSupplies() {
        const members = this.get('memberCount');
        const food = this.get('food');
        const consumption = members; // 1 food per member per day

        const newFood = Math.max(0, food - consumption);
        this.set('food', newFood);

        if (newFood === 0 && food > 0) {
            // Just ran out
            this.set('morale', Math.max(0, this.get('morale') - 10));
            if (window.eventBus) {
                window.eventBus.emit('army:starving', { army: this });
            }
        }

        return consumption;
    }

    /**
     * Add supplies to the army
     * @param {string} type - 'food' | 'gold' | 'goods'
     * @param {number} amount - Amount to add
     */
    addSupplies(type, amount) {
        const current = this.get(type) || 0;
        this.set(type, current + amount);
    }

    /**
     * Change morale
     * @param {number} delta - Amount to change (positive or negative)
     */
    changeMorale(delta) {
        const current = this.get('morale');
        const newMorale = Math.max(0, Math.min(100, current + delta));
        this.set('morale', newMorale);
    }

    /**
     * Add a member to the army
     * @param {object} member - Member data
     */
    addMember(member) {
        const members = [...this.get('members'), member];
        this.set('members', members);
        this.set('strength', this.get('strength') + (member.strength || 1));
    }

    /**
     * Remove a member from the army
     * @param {string} memberId - Member ID
     */
    removeMember(memberId) {
        const members = this.get('members').filter(m => m.id !== memberId);
        const removed = this.get('members').find(m => m.id === memberId);
        
        this.set('members', members);
        if (removed) {
            this.set('strength', Math.max(0, this.get('strength') - (removed.strength || 1)));
        }
    }

    /**
     * Check if army is at a specific position
     */
    isAtPosition(row, col) {
        return this.get('row') === row && this.get('col') === col;
    }
}


// =========================================
// ENEMY MODEL
// =========================================

/**
 * EnemyModel - Represents an enemy unit on the world map
 */
class EnemyModel extends DataModel {
    static SCHEMA = {
        faction: { default: 'bandits' },
        name: { default: 'Unknown Enemy' },
        row: { default: 0 },
        col: { default: 0 },
        strength: { default: 5 },
        aggression: { default: 0.3 },
        loot: { default: {} },
        defeated: { default: false },
        spawnDay: { default: 1 }
    };

    constructor(id, data = {}) {
        super('enemy', id, EnemyModel.SCHEMA, data);

        // Computed properties
        this.defineComputed('factionData', () => {
            const faction = this.get('faction');
            return window.WORLD_DATA?.factions?.[faction] || { 
                name: faction, 
                icon: '❓', 
                color: '#888' 
            };
        });

        this.defineComputed('icon', () => {
            return this.get('factionData').icon || '👹';
        });

        this.defineComputed('color', () => {
            return this.get('factionData').color || '#e74c3c';
        });

        this.defineComputed('position', () => {
            return { row: this.get('row'), col: this.get('col') };
        });

        this.defineComputed('isActive', () => {
            return !this.get('defeated');
        });
    }

    /**
     * Move enemy to new position
     */
    moveTo(row, col) {
        this.batch(() => {
            this.set('row', row);
            this.set('col', col);
        });

        if (window.eventBus) {
            window.eventBus.emit('enemy:moved', { enemy: this, row, col });
        }
    }

    /**
     * Mark enemy as defeated
     */
    defeat() {
        this.set('defeated', true);
        
        if (window.eventBus) {
            window.eventBus.emit('enemy:defeated', { 
                enemy: this, 
                loot: this.get('loot') 
            });
        }
    }

    /**
     * Check if this enemy creates ZOC at position
     */
    createsZOCAt(row, col) {
        const myRow = this.get('row');
        const myCol = this.get('col');
        const dist = Math.abs(myRow - row) + Math.abs(myCol - col);
        return dist <= 1; // Adjacent tiles
    }
}


// =========================================
// WORLD REGISTRY
// =========================================

/**
 * WorldRegistry - Central manager for all world map entities
 */
class WorldRegistry {
    constructor() {
        this._tiles = new Map(); // 'row,col' -> TileModel
        this._armies = new CollectionModel('armies', ArmyModel);
        this._enemies = new CollectionModel('enemies', EnemyModel);
        this._initialized = false;

        console.log('[WorldRegistry] Created');
    }

    /**
     * Initialize the world map
     * @param {object} config - Map configuration
     */
    initialize(config = {}) {
        if (this._initialized) {
            console.warn('[WorldRegistry] Already initialized');
            return;
        }

        const mapConfig = config.mapConfig || window.WORLD_DATA?.mapConfig || {
            width: 7,
            height: 7,
            capitalPosition: { row: 3, col: 3 }
        };

        console.log('[WorldRegistry] Initializing world map...');

        // Create tile grid
        this._createTileGrid(mapConfig);

        // Set up event subscriptions
        this._setupEventListeners();

        this._initialized = true;
        console.log(`[WorldRegistry] Initialized with ${this._tiles.size} tiles`);

        if (window.eventBus) {
            window.eventBus.emit('world:initialized');
        }
    }

    /**
     * Create the tile grid
     * @private
     */
    _createTileGrid(config) {
        const { width, height, capitalPosition } = config;

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const isCapital = row === capitalPosition.row && col === capitalPosition.col;
                const isAdjacent = Math.abs(row - capitalPosition.row) + 
                                   Math.abs(col - capitalPosition.col) === 1;

                const tile = new TileModel(row, col, {
                    terrain: isCapital ? 'village' : 'grass', // Will be overwritten by terrain gen
                    visibility: isCapital ? 'explored' : (isAdjacent ? 'scoutable' : 'hidden'),
                    displayX: col - capitalPosition.col,
                    displayY: row - capitalPosition.row,
                    isCapital
                });

                this._tiles.set(`${row},${col}`, tile);
            }
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        if (!window.eventBus) return;

        // When day ends, process army movement and consumption
        window.eventBus.on('dayEnded', () => {
            this._processDailyArmyUpdates();
        });

        // When tile is explored, make adjacent tiles scoutable
        window.eventBus.on('tile:explored', (data) => {
            this._revealAdjacentTiles(data.row, data.col);
        });
    }

    /**
     * Process daily updates for all armies
     * @private
     */
    _processDailyArmyUpdates() {
        for (const army of this._armies.all()) {
            // Consume supplies
            army.consumeSupplies();

            // Advance travel if traveling
            if (army.get('isTraveling')) {
                army.advanceTravel();
            }
        }
    }

    /**
     * Make tiles adjacent to explored tile scoutable
     * @private
     */
    _revealAdjacentTiles(row, col) {
        const adjacentOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        for (const [dr, dc] of adjacentOffsets) {
            const tile = this.getTile(row + dr, col + dc);
            if (tile) {
                tile.makeScoutable();
            }
        }
    }

    // =========================================
    // TILE METHODS
    // =========================================

    /**
     * Get a tile by position
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {TileModel|undefined}
     */
    getTile(row, col) {
        return this._tiles.get(`${row},${col}`);
    }

    /**
     * Get all tiles
     * @returns {TileModel[]}
     */
    getAllTiles() {
        return Array.from(this._tiles.values());
    }

    /**
     * Get explored tiles
     * @returns {TileModel[]}
     */
    getExploredTiles() {
        return this.getAllTiles().filter(t => t.get('isExplored'));
    }

    /**
     * Get scoutable tiles
     * @returns {TileModel[]}
     */
    getScoutableTiles() {
        return this.getAllTiles().filter(t => t.get('isScoutable'));
    }

    /**
     * Set terrain for a tile
     * @param {number} row - Row
     * @param {number} col - Column
     * @param {string} terrain - Terrain type
     */
    setTerrain(row, col, terrain) {
        const tile = this.getTile(row, col);
        if (tile) {
            tile.set('terrain', terrain);
        }
    }

    /**
     * Explore a tile
     * @param {number} row - Row
     * @param {number} col - Column
     */
    exploreTile(row, col) {
        const tile = this.getTile(row, col);
        if (tile) {
            return tile.explore();
        }
        return false;
    }

    // =========================================
    // ARMY METHODS
    // =========================================

    /**
     * Create a new army
     * @param {object} data - Army data
     * @returns {ArmyModel}
     */
    createArmy(data) {
        const id = data.id || `army_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const army = new ArmyModel(id, { ...data, id });
        this._armies.add(army);

        if (window.eventBus) {
            window.eventBus.emit('army:created', { army });
        }

        return army;
    }

    /**
     * Get an army by ID
     * @param {string} id - Army ID
     * @returns {ArmyModel|undefined}
     */
    getArmy(id) {
        return this._armies.get(id);
    }

    /**
     * Get all armies
     * @returns {ArmyModel[]}
     */
    getAllArmies() {
        return this._armies.all();
    }

    /**
     * Get armies at a specific position
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {ArmyModel[]}
     */
    getArmiesAtPosition(row, col) {
        return this._armies.filter(a => a.isAtPosition(row, col));
    }

    /**
     * Remove an army
     * @param {string} id - Army ID
     */
    disbandArmy(id) {
        const army = this._armies.get(id);
        if (army) {
            this._armies.remove(id);
            
            if (window.eventBus) {
                window.eventBus.emit('army:disbanded', { army });
            }
        }
    }

    // =========================================
    // ENEMY METHODS
    // =========================================

    /**
     * Spawn an enemy
     * @param {object} data - Enemy data
     * @returns {EnemyModel}
     */
    spawnEnemy(data) {
        const id = data.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const enemy = new EnemyModel(id, { ...data, id });
        this._enemies.add(enemy);

        // Update tile
        const tile = this.getTile(data.row, data.col);
        if (tile) {
            tile.setEnemy(id);
        }

        if (window.eventBus) {
            window.eventBus.emit('enemy:spawned', { enemy });
        }

        return enemy;
    }

    /**
     * Get an enemy by ID
     * @param {string} id - Enemy ID
     * @returns {EnemyModel|undefined}
     */
    getEnemy(id) {
        return this._enemies.get(id);
    }

    /**
     * Get all enemies
     * @returns {EnemyModel[]}
     */
    getAllEnemies() {
        return this._enemies.all();
    }

    /**
     * Get active (not defeated) enemies
     * @returns {EnemyModel[]}
     */
    getActiveEnemies() {
        return this._enemies.filter(e => e.get('isActive'));
    }

    /**
     * Get enemies at position
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {EnemyModel[]}
     */
    getEnemiesAtPosition(row, col) {
        return this._enemies.filter(e => 
            e.get('row') === row && e.get('col') === col && e.get('isActive')
        );
    }

    /**
     * Check if position is in enemy Zone of Control
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {boolean}
     */
    isInEnemyZOC(row, col) {
        for (const enemy of this.getActiveEnemies()) {
            if (enemy.createsZOCAt(row, col)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remove an enemy
     * @param {string} id - Enemy ID
     */
    removeEnemy(id) {
        const enemy = this._enemies.get(id);
        if (enemy) {
            // Clear from tile
            const tile = this.getTile(enemy.get('row'), enemy.get('col'));
            if (tile) {
                tile.clearEnemy();
            }

            this._enemies.remove(id);
        }
    }

    // =========================================
    // SERIALIZATION
    // =========================================

    /**
     * Serialize for saving
     * @returns {object}
     */
    toJSON() {
        const tiles = {};
        for (const [key, tile] of this._tiles) {
            tiles[key] = tile.toJSON();
        }

        return {
            tiles,
            armies: this._armies.toJSON(),
            enemies: this._enemies.toJSON()
        };
    }

    /**
     * Load from saved data
     * @param {object} data - Saved data
     */
    fromJSON(data) {
        // Load tile states
        if (data.tiles) {
            for (const [key, tileData] of Object.entries(data.tiles)) {
                const tile = this._tiles.get(key);
                if (tile) {
                    tile.setMany(tileData, true);
                }
            }
        }

        // Load armies
        if (data.armies) {
            for (const armyData of data.armies) {
                this.createArmy(armyData);
            }
        }

        // Load enemies
        if (data.enemies) {
            for (const enemyData of data.enemies) {
                this.spawnEnemy(enemyData);
            }
        }
    }
}

// Create global registry
window.WorldRegistry = new WorldRegistry();

// Export classes
window.TileModel = TileModel;
window.ArmyModel = ArmyModel;
window.EnemyModel = EnemyModel;

console.log('[WorldModel] World model system loaded');

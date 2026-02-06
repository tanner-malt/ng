/**
 * worldBridge.js - Bridge between World Models and Legacy WorldManager
 * 
 * Provides integration layer that:
 * 1. Syncs WorldRegistry data with WorldManager.hexMap
 * 2. Patches WorldManager methods to emit model events
 * 3. Updates MapRenderer when model changes
 * 4. Maintains backward compatibility with existing code
 */

class WorldBridge {
    constructor() {
        this._initialized = false;
        this._syncPaused = false;
        this._patchedMethods = [];
        
        console.log('[WorldBridge] Created');
    }

    /**
     * Initialize the bridge after WorldManager and WorldRegistry exist
     */
    init() {
        if (this._initialized) {
            console.warn('[WorldBridge] Already initialized');
            return;
        }

        // Wait for both WorldManager and WorldRegistry
        if (!window.worldManager || !window.WorldRegistry) {
            console.log('[WorldBridge] Waiting for WorldManager and WorldRegistry...');
            setTimeout(() => this.init(), 100);
            return;
        }

        console.log('[WorldBridge] Initializing bridge...');

        // Initialize WorldRegistry if not already
        if (!window.WorldRegistry._initialized) {
            window.WorldRegistry.initialize({
                mapConfig: {
                    width: window.worldManager.mapWidth || 7,
                    height: window.worldManager.mapHeight || 7,
                    capitalPosition: window.worldManager.playerVillageHex || { row: 3, col: 3 }
                }
            });
        }

        // Sync initial state from WorldManager to models
        this._syncFromWorldManager();

        // Patch WorldManager methods to update models
        this._patchWorldManager();

        // Set up event listeners for model changes -> WorldManager updates
        this._setupModelListeners();

        // Set up event listeners for WorldManager events -> model updates
        this._setupWorldManagerListeners();

        this._initialized = true;
        console.log('[WorldBridge] Bridge initialized');

        if (window.eventBus) {
            window.eventBus.emit('worldBridge:initialized');
        }
    }

    /**
     * Sync current WorldManager state to models
     * @private
     */
    _syncFromWorldManager() {
        const wm = window.worldManager;
        if (!wm) return;

        console.log('[WorldBridge] Syncing from WorldManager...');

        // Sync hex map data to TileModels
        if (wm.hexMap) {
            for (let row = 0; row < wm.mapHeight; row++) {
                for (let col = 0; col < wm.mapWidth; col++) {
                    const hexData = wm.hexMap[row]?.[col];
                    if (hexData) {
                        this._syncTileFromHex(row, col, hexData);
                    }
                }
            }
        }

        // Sync expeditions to ArmyModels
        if (wm.parties?.expeditions) {
            for (const expData of wm.parties.expeditions) {
                this._syncArmyFromExpedition(expData);
            }
        }

        // Sync enemy units to EnemyModels
        if (wm.enemyUnits) {
            for (const [id, enemyData] of wm.enemyUnits) {
                this._syncEnemyFromUnit(id, enemyData);
            }
        }

        console.log(`[WorldBridge] Synced ${window.WorldRegistry.getAllTiles().length} tiles, ` +
                    `${window.WorldRegistry.getAllArmies().length} armies, ` +
                    `${window.WorldRegistry.getAllEnemies().length} enemies`);
    }

    /**
     * Sync a single tile from hex data
     * @private
     */
    _syncTileFromHex(row, col, hexData) {
        const tile = window.WorldRegistry.getTile(row, col);
        if (!tile) return;

        // Convert legacy visibility to new format
        let visibility = hexData.visibility;
        if (!visibility) {
            if (hexData.discovered) visibility = 'explored';
            else if (hexData.scoutable) visibility = 'scoutable';
            else visibility = 'hidden';
        }

        tile.batch(() => {
            tile.set('terrain', hexData.terrain || 'grass');
            tile.set('visibility', visibility);
            tile.set('isCapital', hexData.isPlayerVillage || false);
            tile.set('hasEnemy', hexData.hasEnemy || false);
            tile.set('enemyId', hexData.enemyId || null);
            if (hexData.displayX !== undefined) tile.set('displayX', hexData.displayX);
            if (hexData.displayY !== undefined) tile.set('displayY', hexData.displayY);
        }, true); // Silent update to avoid event loops
    }

    /**
     * Sync an army from expedition data
     * @private
     */
    _syncArmyFromExpedition(expData) {
        let army = window.WorldRegistry.getArmy(expData.id);
        
        if (!army) {
            // Create new army model
            army = window.WorldRegistry.createArmy({
                id: expData.id,
                name: expData.name,
                type: expData.type || 'army',
                row: expData.row,
                col: expData.col,
                members: expData.members || [],
                strength: expData.strength || expData.members?.length || 0,
                food: expData.supplies?.food || 0,
                gold: expData.supplies?.gold || 0,
                goods: expData.supplies?.goods || 0,
                morale: expData.morale ?? 100,
                mode: expData.mode || 'idle',
                travelPlan: expData.travelPlan || null,
                icon: expData.icon || '⚔️',
                color: expData.color || '#3182ce'
            });
        } else {
            // Update existing model
            army.batch(() => {
                army.set('row', expData.row);
                army.set('col', expData.col);
                army.set('members', expData.members || []);
                army.set('strength', expData.strength || expData.members?.length || 0);
                army.set('food', expData.supplies?.food || 0);
                army.set('morale', expData.morale ?? 100);
                army.set('mode', expData.mode || 'idle');
                army.set('travelPlan', expData.travelPlan || null);
            }, true);
        }
    }

    /**
     * Sync an enemy from enemy unit data
     * @private
     */
    _syncEnemyFromUnit(id, unitData) {
        let enemy = window.WorldRegistry.getEnemy(id);
        
        if (!enemy) {
            enemy = window.WorldRegistry.spawnEnemy({
                id: id,
                name: unitData.name || 'Unknown Enemy',
                faction: unitData.faction || unitData.type || 'bandits',
                row: unitData.row,
                col: unitData.col,
                strength: unitData.strength || 5,
                aggression: unitData.aggression || 0.3,
                loot: unitData.loot || {},
                defeated: unitData.defeated || false
            });
        } else {
            enemy.batch(() => {
                enemy.set('row', unitData.row);
                enemy.set('col', unitData.col);
                enemy.set('strength', unitData.strength || 5);
                enemy.set('defeated', unitData.defeated || false);
            }, true);
        }
    }

    /**
     * Patch WorldManager methods to update models
     * @private
     */
    _patchWorldManager() {
        const wm = window.worldManager;
        if (!wm) return;

        console.log('[WorldBridge] Patching WorldManager methods...');

        // Patch revealHex
        this._patchMethod(wm, 'revealHex', (original) => {
            return function(row, col) {
                const result = original.call(this, row, col);
                
                // Update model
                const tile = window.WorldRegistry?.getTile(row, col);
                if (tile) {
                    tile.explore();
                }
                
                return result;
            };
        });

        // Patch createArmy if it exists
        if (typeof wm.createArmy === 'function') {
            this._patchMethod(wm, 'createArmy', (original) => {
                return function(...args) {
                    const result = original.call(this, ...args);
                    
                    // The result is typically the created army data
                    if (result && result.id) {
                        window.WorldBridge?._syncArmyFromExpedition(result);
                    }
                    
                    return result;
                };
            });
        }

        // Patch spawnEnemy if it exists
        if (typeof wm.spawnEnemy === 'function') {
            this._patchMethod(wm, 'spawnEnemy', (original) => {
                return function(...args) {
                    const result = original.call(this, ...args);
                    
                    // Sync to model
                    if (result) {
                        const id = result.id || result;
                        const enemyData = this.enemyUnits?.get(id);
                        if (enemyData) {
                            window.WorldBridge?._syncEnemyFromUnit(id, enemyData);
                        }
                    }
                    
                    return result;
                };
            });
        }

        // Patch moveArmy if it exists
        if (typeof wm.moveArmy === 'function') {
            this._patchMethod(wm, 'moveArmy', (original) => {
                return function(armyId, targetRow, targetCol) {
                    const result = original.call(this, armyId, targetRow, targetCol);
                    
                    // Update model
                    const army = window.WorldRegistry?.getArmy(armyId);
                    if (army) {
                        army.moveTo(targetRow, targetCol);
                    }
                    
                    return result;
                };
            });
        }

        // Patch loadWorldSaveData to sync models after loading saved state
        if (typeof wm.loadWorldSaveData === 'function') {
            this._patchMethod(wm, 'loadWorldSaveData', (original) => {
                const bridge = this;
                return function(data) {
                    const result = original.call(this, data);
                    
                    // Resync models from loaded WorldManager state
                    console.log('[WorldBridge] Save data loaded, resyncing models...');
                    bridge.resync();
                    
                    if (window.eventBus) {
                        window.eventBus.emit('world:loaded');
                    }
                    
                    return result;
                };
            });
        }

        console.log(`[WorldBridge] Patched ${this._patchedMethods.length} methods`);
    }

    /**
     * Helper to patch a method and track it
     * @private
     */
    _patchMethod(obj, methodName, patchFn) {
        if (!obj || typeof obj[methodName] !== 'function') return;

        const original = obj[methodName].bind(obj);
        obj[methodName] = patchFn(original);
        this._patchedMethods.push({ obj, methodName, original });
    }

    /**
     * Set up listeners for model changes
     * @private
     */
    _setupModelListeners() {
        if (!window.eventBus) return;

        // When a tile is explored via model, update WorldManager
        window.eventBus.on('tile:explored', (data) => {
            if (this._syncPaused) return;
            
            const wm = window.worldManager;
            if (!wm || !wm.hexMap) return;

            const { row, col } = data;
            const hexData = wm.hexMap[row]?.[col];
            if (hexData) {
                hexData.visibility = 'explored';
                hexData.discovered = true;
                
                // Update renderer
                wm.mapRenderer?.updateTile(row, col);
            }
        });

        // When an army moves via model
        window.eventBus.on('army:moved', (data) => {
            if (this._syncPaused) return;
            
            const wm = window.worldManager;
            if (!wm) return;

            // Find the expedition and update it
            const exp = wm.parties?.expeditions?.find(e => e.id === data.army.id);
            if (exp) {
                exp.row = data.to.row;
                exp.col = data.to.col;
            }
            
            // Refresh entity layer
            wm.mapRenderer?.refreshEntityLayer?.();
        });

        // When an enemy is defeated via model
        window.eventBus.on('enemy:defeated', (data) => {
            if (this._syncPaused) return;
            
            const wm = window.worldManager;
            if (!wm) return;

            const enemyData = wm.enemyUnits?.get(data.enemy.id);
            if (enemyData) {
                enemyData.defeated = true;
            }
        });

        console.log('[WorldBridge] Model listeners set up');
    }

    /**
     * Set up listeners for WorldManager events
     * @private
     */
    _setupWorldManagerListeners() {
        if (!window.eventBus) return;

        // Listen for hex reveals from WorldManager
        window.eventBus.on('hex:revealed', (data) => {
            if (this._syncPaused) return;
            
            const tile = window.WorldRegistry?.getTile(data.row, data.col);
            if (tile) {
                tile.batch(() => {
                    tile.set('visibility', 'explored');
                    if (data.terrain) tile.set('terrain', data.terrain);
                }, true);
            }
        });

        // Listen for army creation
        window.eventBus.on('army:created', (data) => {
            if (this._syncPaused) return;
            
            // Only sync if not from our own model
            if (!data.fromModel) {
                this._syncArmyFromExpedition(data.army || data);
            }
        });

        // Listen for game initialized - resync after load is complete
        window.eventBus.on('game-initialized', () => {
            console.log('[WorldBridge] Game initialized, performing final sync...');
            this.resync();
        });

        // Listen for state restored (debug tools snapshot restore)
        window.eventBus.on('stateRestored', () => {
            console.log('[WorldBridge] State restored, resyncing models...');
            this.resync();
        });

        // Listen for system restart (error recovery)
        window.eventBus.on('systemRestart', () => {
            console.log('[WorldBridge] System restarted, resyncing models...');
            setTimeout(() => this.resync(), 500);
        });

        console.log('[WorldBridge] WorldManager listeners set up');
    }

    /**
     * Pause sync (use during batch operations)
     */
    pauseSync() {
        this._syncPaused = true;
    }

    /**
     * Resume sync
     */
    resumeSync() {
        this._syncPaused = false;
    }

    /**
     * Force full resync from WorldManager to models
     */
    resync() {
        this._syncPaused = true;
        this._syncFromWorldManager();
        this._syncPaused = false;
        
        console.log('[WorldBridge] Resync complete');
    }

    /**
     * Get the model for a tile at position
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {TileModel}
     */
    getTile(row, col) {
        return window.WorldRegistry?.getTile(row, col);
    }

    /**
     * Get terrain data for a tile (legacy compatibility)
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {object}
     */
    getTerrainAt(row, col) {
        const tile = this.getTile(row, col);
        if (tile) {
            return tile.get('terrainData');
        }
        // Fallback to legacy
        const wm = window.worldManager;
        const terrain = wm?.hexMap?.[row]?.[col]?.terrain;
        return window.getTerrain?.(terrain) || { name: 'Unknown', color: '#888' };
    }

    /**
     * Check if a tile is explored
     * @param {number} row - Row
     * @param {number} col - Column
     * @returns {boolean}
     */
    isExplored(row, col) {
        const tile = this.getTile(row, col);
        return tile ? tile.get('isExplored') : false;
    }

    /**
     * Explore a tile (updates both model and WorldManager)
     * @param {number} row - Row
     * @param {number} col - Column
     */
    exploreTile(row, col) {
        // Update model first
        const tile = window.WorldRegistry?.getTile(row, col);
        if (tile) {
            tile.explore();
        }
        
        // Also call WorldManager
        window.worldManager?.revealHex?.(row, col);
    }

    /**
     * Get all armies
     * @returns {ArmyModel[]}
     */
    getArmies() {
        return window.WorldRegistry?.getAllArmies() || [];
    }

    /**
     * Get all enemies
     * @returns {EnemyModel[]}
     */
    getEnemies() {
        return window.WorldRegistry?.getAllEnemies() || [];
    }
}

// Create global instance
window.WorldBridge = new WorldBridge();

// Auto-initialize when DOM is ready and dependencies exist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.WorldBridge?.init(), 500);
    });
} else {
    setTimeout(() => window.WorldBridge?.init(), 500);
}

console.log('[WorldBridge] World bridge system loaded');

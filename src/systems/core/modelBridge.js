/**
 * modelBridge.js - Bridge between New Model System and Legacy Systems
 * 
 * This file provides integration between the new reactive data model system
 * and existing game systems (gameState, unlockSystem, village.js, etc.)
 * 
 * It enables:
 * - Syncing new model data to/from legacy gameState
 * - Providing compatible API methods for existing code
 * - Gradual migration without breaking existing functionality
 */

class ModelBridge {
    constructor() {
        this._initialized = false;
        this._syncInterval = null;
        
        console.log('[ModelBridge] Created');
    }

    /**
     * Initialize the bridge after models and gameState are ready
     */
    initialize() {
        if (this._initialized) {
            console.warn('[ModelBridge] Already initialized');
            return;
        }

        console.log('[ModelBridge] Initializing bridge...');

        // Patch gameState with model-aware methods
        this.patchGameState();

        // Patch unlock system to use BuildingRegistry
        this.patchUnlockSystem();

        // Set up sync between models and gameState
        this.setupSync();

        this._initialized = true;
        console.log('[ModelBridge] Bridge initialized');
    }

    /**
     * Patch gameState to use model system where possible
     */
    patchGameState() {
        const gameState = window.gameState;
        if (!gameState) {
            console.warn('[ModelBridge] gameState not found, deferring patch');
            // Try again later
            setTimeout(() => this.patchGameState(), 500);
            return;
        }

        // Store original methods for fallback
        const originalCanAfford = gameState.canAfford?.bind(gameState);
        const originalGetResources = gameState.getResources?.bind(gameState);

        /**
         * Enhanced canAfford that uses BuildingRegistry definitions
         */
        gameState.canAfford = function(buildingType) {
            // Try new model system first
            const definition = window.BuildingRegistry?.getDefinition(buildingType);
            if (definition) {
                const resources = gameState.resources || {};
                return definition.canAfford(resources);
            }
            
            // Fallback to original
            if (originalCanAfford) {
                return originalCanAfford(buildingType);
            }
            
            // Manual fallback
            const costs = window.GameData?.buildingCosts?.[buildingType] || {};
            for (const [resource, amount] of Object.entries(costs)) {
                if ((gameState.resources[resource] || 0) < amount) {
                    return false;
                }
            }
            return true;
        };

        /**
         * Enhanced isBuildingUnlocked that checks UnlockSystem first (authoritative),
         * then BuildingRegistry, then legacy fallbacks.
         */
        const originalIsBuildingUnlocked = gameState.isBuildingUnlocked?.bind(gameState);
        
        gameState.isBuildingUnlocked = function(buildingType) {
            // UnlockSystem is the authoritative source for runtime unlock state
            if (window.unlockSystem) {
                return window.unlockSystem.isUnlocked(buildingType);
            }
            
            // Try new model system
            const definition = window.BuildingRegistry?.getDefinition(buildingType);
            if (definition) {
                return definition.get('isUnlocked') || definition.get('startsUnlocked');
            }
            
            // Fallback to original
            if (originalIsBuildingUnlocked) {
                return originalIsBuildingUnlocked(buildingType);
            }
            
            // Fallback to unlockedBuildings array
            return gameState.unlockedBuildings?.includes(buildingType) ?? false;
        };

        /**
         * Get building costs from the model
         */
        gameState.getBuildingCosts = function(buildingType) {
            const definition = window.BuildingRegistry?.getDefinition(buildingType);
            if (definition) {
                return definition.get('costs') || {};
            }
            return window.GameData?.buildingCosts?.[buildingType] || {};
        };

        /**
         * Spend resources using model if available
         */
        const originalSpendResources = gameState.spendResources?.bind(gameState);
        
        gameState.spendResources = function(costs) {
            // Use new resource manager if available
            if (window.resourceManager && typeof window.resourceManager.spend === 'function') {
                const success = window.resourceManager.spend(costs);
                if (success) {
                    // Sync back to gameState.resources
                    ModelBridge.syncResourcesToGameState();
                }
                return success;
            }
            
            // Fallback to original
            if (originalSpendResources) {
                return originalSpendResources(costs);
            }
            
            // Manual fallback
            for (const [resource, amount] of Object.entries(costs)) {
                if ((gameState.resources[resource] || 0) < amount) {
                    return false;
                }
            }
            for (const [resource, amount] of Object.entries(costs)) {
                gameState.resources[resource] = (gameState.resources[resource] || 0) - amount;
            }
            return true;
        };

        console.log('[ModelBridge] gameState patched');
    }

    /**
     * Patch unlock system to sync with BuildingRegistry
     */
    patchUnlockSystem() {
        const unlockSystem = window.unlockSystem;
        if (!unlockSystem) {
            console.warn('[ModelBridge] unlockSystem not found, deferring patch');
            setTimeout(() => this.patchUnlockSystem(), 500);
            return;
        }

        // When unlock system checks unlocks, also update BuildingRegistry
        const originalCheckAllUnlocks = unlockSystem.checkAllUnlocks?.bind(unlockSystem);
        
        if (originalCheckAllUnlocks) {
            unlockSystem.checkAllUnlocks = function() {
                const result = originalCheckAllUnlocks();
                
                // Sync unlock states to BuildingRegistry
                if (window.BuildingRegistry) {
                    window.BuildingRegistry.updateUnlockStates(window.gameState);
                }
                
                return result;
            };
        }

        // Sync initial unlock states
        this.syncUnlockStates();

        console.log('[ModelBridge] unlockSystem patched');
    }

    /**
     * Sync unlock states between unlockSystem and BuildingRegistry
     */
    syncUnlockStates() {
        const unlockSystem = window.unlockSystem;
        const buildingRegistry = window.BuildingRegistry;
        
        if (!unlockSystem || !buildingRegistry) return;

        // Get already unlocked content from unlockSystem
        const unlockedContent = unlockSystem.unlockedContent;
        if (!unlockedContent) return;

        // Update BuildingRegistry with current unlock states
        for (const definition of buildingRegistry.getAllDefinitions()) {
            const id = definition.id;
            const isUnlockedInLegacy = unlockedContent.has(id) || 
                                       (window.gameState?.unlockedBuildings?.includes(id));
            
            if (isUnlockedInLegacy) {
                definition.set('isUnlocked', true, true); // silent update
            }
        }

        console.log('[ModelBridge] Unlock states synced');
    }

    /**
     * Setup synchronization between models and gameState
     */
    setupSync() {
        // Sync resources from gameState to resourceManager when gameState changes
        if (window.eventBus) {
            window.eventBus.on('resourcesChanged', () => {
                this.syncResourcesFromGameState();
            });

            window.eventBus.on('dayEnded', () => {
                this.syncResourcesFromGameState();
                this.syncUnlockStates();
            });

            window.eventBus.on('buildingPlaced', (data) => {
                // Sync to BuildingRegistry when a building is placed via legacy system
                if (data.building && window.BuildingRegistry) {
                    const instance = window.BuildingRegistry.createInstance(
                        data.building.type,
                        {
                            id: data.building.id,
                            x: data.building.x,
                            y: data.building.y,
                            level: data.building.level || 0,
                            built: data.building.built || false,
                            constructionProgress: data.building.constructionProgress || 0
                        }
                    );
                    console.log('[ModelBridge] Synced building to registry:', data.building.type);
                }
            });
        }

        // Initial sync
        this.syncResourcesFromGameState();
        
        console.log('[ModelBridge] Sync setup complete');
    }

    /**
     * Sync resources from gameState to resourceManager
     */
    syncResourcesFromGameState() {
        const gameState = window.gameState;
        const resourceManager = window.resourceManager;
        
        if (!gameState || !resourceManager) return;

        const resources = gameState.resources || {};
        for (const [id, amount] of Object.entries(resources)) {
            const resource = resourceManager.get(id);
            if (resource) {
                resource.set('amount', amount, true); // silent to avoid loops
            }
        }
    }

    /**
     * Sync resources from resourceManager to gameState
     * (Static method for use from patched gameState methods)
     */
    static syncResourcesToGameState() {
        const gameState = window.gameState;
        const resourceManager = window.resourceManager;
        
        if (!gameState || !resourceManager) return;

        for (const resource of resourceManager.all()) {
            gameState.resources[resource.id] = resource.get('amount');
        }
    }

    /**
     * Sync buildings from gameState to BuildingRegistry
     */
    syncBuildingsFromGameState() {
        const gameState = window.gameState;
        const buildingRegistry = window.BuildingRegistry;
        
        if (!gameState || !buildingRegistry) return;

        const buildings = gameState.buildings || [];
        for (const building of buildings) {
            if (!buildingRegistry.getInstancesCollection().has(building.id)) {
                buildingRegistry.createInstance(building.type, {
                    id: building.id,
                    x: building.x,
                    y: building.y,
                    level: building.level,
                    built: building.built,
                    constructionProgress: building.constructionProgress
                });
            }
        }
    }

    /**
     * Get building definition in legacy format
     * For compatibility with existing code
     */
    getLegacyBuildingData(buildingType) {
        const definition = window.BuildingRegistry?.getDefinition(buildingType);
        if (!definition) {
            return null;
        }

        return {
            costs: definition.get('costs'),
            production: definition.get('production'),
            constructionPoints: definition.get('constructionPoints'),
            info: {
                icon: definition.get('icon'),
                name: definition.get('name'),
                description: definition.get('description'),
                effects: definition.get('effects')
            }
        };
    }
}

// Create singleton
window.ModelBridge = new ModelBridge();

// Initialize when models are ready
if (window.eventBus) {
    window.eventBus.on('models:initialized', () => {
        // Small delay to ensure gameState is also ready
        setTimeout(() => {
            window.ModelBridge.initialize();
        }, 200);
    });

    // Resync models after game load
    window.eventBus.on('game-initialized', () => {
        console.log('[ModelBridge] Game initialized, syncing from save data...');
        setTimeout(() => {
            window.ModelBridge.syncResourcesFromGameState();
            window.ModelBridge.syncBuildingsFromGameState();
            window.ModelBridge.syncUnlockStates();
        }, 100);
    });

    // Resync after state restore (debug tools)
    window.eventBus.on('stateRestored', () => {
        console.log('[ModelBridge] State restored, resyncing...');
        window.ModelBridge.syncResourcesFromGameState();
        window.ModelBridge.syncBuildingsFromGameState();
        window.ModelBridge.syncUnlockStates();
    });

    // Resync after system restart (error recovery)
    window.eventBus.on('systemRestart', () => {
        console.log('[ModelBridge] System restarted, resyncing...');
        setTimeout(() => {
            window.ModelBridge.syncResourcesFromGameState();
            window.ModelBridge.syncBuildingsFromGameState();
            window.ModelBridge.syncUnlockStates();
        }, 500);
    });
}

console.log('[ModelBridge] Bridge system loaded');

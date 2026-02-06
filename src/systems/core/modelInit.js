/**
 * modelInit.js - Data Model System Initialization
 * 
 * Initializes all data models and registries with the game data.
 * This file should be loaded after the data files and model classes,
 * but before the game systems that use them.
 * 
 * Load order:
 * 1. eventBus.js
 * 2. dataModel.js (DataModel, CollectionModel)
 * 3. buildingModel.js, resourceModel.js, jobModel.js
 * 4. buildingData.js, resourceData.js, jobData.js
 * 5. modelInit.js (this file)
 * 6. Game systems
 */

class ModelInitializer {
    constructor() {
        this._initialized = false;
        console.log('[ModelInit] Initializer created');
    }

    /**
     * Initialize all models with game data
     */
    initialize() {
        if (this._initialized) {
            console.warn('[ModelInit] Already initialized');
            return;
        }

        console.log('[ModelInit] Starting model initialization...');

        // Initialize buildings
        this.initializeBuildings();

        // Initialize resources  
        this.initializeResources();

        // Initialize jobs
        this.initializeJobs();

        // Set up event subscriptions
        this.setupEventListeners();

        this._initialized = true;
        console.log('[ModelInit] Model initialization complete');

        // Emit event for systems that depend on models
        if (window.eventBus) {
            window.eventBus.emit('models:initialized');
        }
    }

    /**
     * Initialize building registry with building data
     */
    initializeBuildings() {
        const buildingData = window.BUILDING_DATA;
        if (!buildingData) {
            console.warn('[ModelInit] BUILDING_DATA not found, skipping building init');
            return;
        }

        if (!window.BuildingRegistry) {
            console.warn('[ModelInit] BuildingRegistry not found, skipping building init');
            return;
        }

        // Register each building definition
        window.BuildingRegistry.initialize(buildingData);

        console.log('[ModelInit] Buildings initialized');
    }

    /**
     * Initialize resource manager with resource data
     */
    initializeResources() {
        const resourceData = window.RESOURCE_DATA;
        if (!resourceData) {
            console.warn('[ModelInit] RESOURCE_DATA not found, skipping resource init');
            return;
        }

        // Create resource manager if not exists
        if (!window.resourceManager) {
            window.resourceManager = new window.ResourceManager_Model();
        }

        // Register each resource
        window.resourceManager.initialize(resourceData);

        console.log('[ModelInit] Resources initialized');
    }

    /**
     * Initialize job registry with job data
     */
    initializeJobs() {
        const jobData = window.JOB_DATA;
        if (!jobData) {
            console.warn('[ModelInit] JOB_DATA not found, skipping job init');
            return;
        }

        if (!window.JobRegistry) {
            console.warn('[ModelInit] JobRegistry not found, skipping job init');
            return;
        }

        // Register each job definition
        window.JobRegistry.initialize(jobData);

        console.log('[ModelInit] Jobs initialized');
    }

    /**
     * Set up cross-model event listeners
     */
    setupEventListeners() {
        if (!window.eventBus) return;

        // When a building is completed, update resource capacities
        window.eventBus.on('building:completed', (data) => {
            console.log('[ModelInit] Building completed, updating capacities');
            this.updateResourceCapacities();
        });

        // When resources change, check building affordability
        window.eventBus.on('resources:changed', () => {
            // Emit event for UI to update affordability indicators
            window.eventBus.emit('ui:update:affordability');
        });

        // When a building is unlocked, notify UI
        window.eventBus.on('building:unlocked', (data) => {
            console.log(`[ModelInit] Building unlocked: ${data.buildingId}`);
            if (window.showToast) {
                const def = data.definition;
                window.showToast(`🔓 New building unlocked: ${def.get('name')}!`, { type: 'success' });
            }
        });

        console.log('[ModelInit] Event listeners established');
    }

    /**
     * Update resource capacities from buildings
     */
    updateResourceCapacities() {
        if (!window.resourceManager || !window.BuildingRegistry) return;

        const buildings = window.BuildingRegistry.getCompletedInstances();
        
        // Convert to format expected by resourceManager
        const buildingData = buildings.map(b => ({
            type: b.get('type'),
            built: b.get('built')
        }));

        window.resourceManager.updateCapacitiesFromBuildings(buildingData);
    }

    /**
     * Load saved game state into models
     * @param {object} saveData - Saved game data
     */
    loadFromSave(saveData) {
        console.log('[ModelInit] Loading from save data...');

        // Load resources
        if (saveData.resources && window.resourceManager) {
            window.resourceManager.fromJSON(saveData.resources);
        }

        // Load building instances
        if (saveData.buildings && window.BuildingRegistry) {
            window.BuildingRegistry.fromJSON({ instances: saveData.buildings });
        }

        // Load job slots
        if (saveData.jobs && window.JobRegistry) {
            window.JobRegistry.fromJSON(saveData.jobs);
        }

        // Update unlock states
        if (window.BuildingRegistry && window.gameState) {
            window.BuildingRegistry.updateUnlockStates(window.gameState);
        }

        console.log('[ModelInit] Save data loaded into models');
    }

    /**
     * Export model data for saving
     * @returns {object} Save data
     */
    toSaveData() {
        return {
            resources: window.resourceManager?.toJSON() || {},
            buildings: window.BuildingRegistry?.toJSON()?.instances || [],
            jobs: window.JobRegistry?.toJSON() || {}
        };
    }
}

// Create global initializer
window.ModelInitializer = new ModelInitializer();

// Auto-initialize when DOM is ready (if data is available)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Delay to ensure all scripts are loaded
        setTimeout(() => {
            if (window.BUILDING_DATA && window.RESOURCE_DATA) {
                window.ModelInitializer.initialize();
            }
        }, 100);
    });
} else {
    // DOM already ready, initialize after a short delay
    setTimeout(() => {
        if (window.BUILDING_DATA && window.RESOURCE_DATA) {
            window.ModelInitializer.initialize();
        }
    }, 100);
}

console.log('[ModelInit] Model initializer loaded');

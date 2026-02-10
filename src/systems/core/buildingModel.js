/**
 * buildingModel.js - Unified Building Data Model
 * 
 * Buildings are the core constructable entities in the game.
 * This model unifies all building data into a single schema:
 * - Identity (id, name, icon, description)
 * - Costs (resources required to build)
 * - Production (what the building provides when operational)
 * - Unlock conditions (what's required to unlock this building)
 * - Construction (work points required)
 * - Category (for UI organization)
 * 
 * Usage:
 *   const house = BuildingRegistry.getDefinition('house');
 *   house.get('isUnlocked'); // computed from conditions
 *   house.get('canAfford');  // computed from current resources
 */

/**
 * BuildingDefinition - Defines a building type (static data)
 * This represents the TEMPLATE for a building, not a placed instance
 */
class BuildingDefinition extends DataModel {
    static SCHEMA = {
        // Identity
        name: { default: 'Unknown Building' },
        icon: { default: '🏗️' },
        description: { default: 'A building' },
        effects: { default: '' },
        category: { default: 'essential' },

        // Costs to build
        costs: { default: {} },

        // Construction requirements
        constructionPoints: { default: 10 },

        // What the building provides when built
        production: {
            default: {
                populationCapacity: 0,
                storage: {},
                jobs: {},
                bonuses: {}
            }
        },

        // Unlock conditions
        unlockConditions: { default: [] },
        autoUnlock: { default: true },
        startsUnlocked: { default: false },

        // State (computed at runtime)
        isUnlocked: { default: false },

        // Grid placement
        gridWidth: { default: 1 },
        gridHeight: { default: 1 }
    };

    constructor(id, data = {}) {
        super('buildingDef', id, BuildingDefinition.SCHEMA, data);

        // Define computed properties
        this.defineComputed('displayName', () => {
            return this.get('name') || this.id;
        });

        this.defineComputed('costText', () => {
            const costs = this.get('costs') || {};
            return Object.entries(costs)
                .map(([resource, amount]) => `${amount} ${resource}`)
                .join(', ') || 'Free';
        });

        this.defineComputed('jobCount', () => {
            const production = this.get('production') || {};
            const jobs = production.jobs || {};
            return Object.values(jobs).reduce((sum, count) => sum + count, 0);
        });
    }

    /**
     * Check if player can afford this building
     * @param {object} resources - Current resource amounts
     * @returns {boolean}
     */
    canAfford(resources) {
        const costs = this.get('costs') || {};
        for (const [resource, amount] of Object.entries(costs)) {
            if ((resources[resource] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if unlock conditions are met
     * @param {object} gameState - Current game state for condition checking
     * @returns {boolean}
     */
    checkUnlockConditions(gameState) {
        if (this.get('startsUnlocked')) return true;
        if (this.get('isUnlocked')) return true;

        const conditions = this.get('unlockConditions') || [];
        if (conditions.length === 0) return this.get('startsUnlocked');

        for (const condition of conditions) {
            if (!this._checkCondition(condition, gameState)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check a single unlock condition
     * @private
     */
    _checkCondition(condition, gameState) {
        switch (condition.type) {
            case 'achievement':
                return window.achievementSystem?.isUnlocked?.(condition.achievement) ||
                       gameState.achievements?.isUnlocked?.(condition.achievement) ||
                       gameState.earnedAchievements?.includes(condition.achievement);

            case 'building_count':
                const buildings = gameState.buildings || [];
                const count = buildings.filter(b => 
                    b.type === condition.building && b.built
                ).length;
                return count >= (condition.count || 1);

            case 'resource':
                const resources = gameState.resources || {};
                const amount = condition.resource === 'population' 
                    ? (gameState.population || 0)
                    : (resources[condition.resource] || 0);
                return amount >= (condition.amount || 0);

            case 'tech':
                const researchedTechs = gameState.researchedTechs || [];
                return researchedTechs.includes(condition.tech);

            case 'day':
                return (gameState.day || gameState.currentDay || 1) >= condition.day;

            default:
                console.warn(`[BuildingDefinition] Unknown condition type: ${condition.type}`);
                return true;
        }
    }

    /**
     * Get requirements text for locked building
     * @returns {string}
     */
    getRequirementsText() {
        const conditions = this.get('unlockConditions') || [];
        if (conditions.length === 0) return 'Available from start';

        const requirements = conditions.map(cond => {
            switch (cond.type) {
                case 'achievement':
                    return `Achievement: ${cond.achievement}`;
                case 'building_count':
                    return `Build ${cond.count || 1}x ${cond.building}`;
                case 'resource':
                    return `${cond.amount} ${cond.resource}`;
                case 'tech':
                    return `Research: ${cond.tech}`;
                case 'day':
                    return `Day ${cond.day}`;
                default:
                    return `Unknown requirement`;
            }
        });

        return `Requires: ${requirements.join(', ')}`;
    }
}


/**
 * BuildingInstance - A placed building in the game world
 * This represents an actual building on the grid
 */
class BuildingInstance extends DataModel {
    static SCHEMA = {
        type: { default: 'unknown' },
        x: { default: 0 },
        y: { default: 0 },
        level: { default: 0 },
        built: { default: false },
        constructionProgress: { default: 0 },
        workers: { default: [] }
    };

    constructor(id, data = {}) {
        super('building', id, BuildingInstance.SCHEMA, data);

        // Define computed properties
        this.defineComputed('isComplete', () => {
            return this.get('built') && this.get('level') >= 1;
        });

        this.defineComputed('definition', () => {
            return window.BuildingRegistry?.getDefinition(this.get('type'));
        });

        this.defineComputed('constructionPointsRequired', () => {
            const def = this.get('definition');
            return def ? def.get('constructionPoints') : 10;
        });

        this.defineComputed('constructionPercent', () => {
            const required = this.get('constructionPointsRequired');
            const progress = this.get('constructionProgress');
            return required > 0 ? Math.floor((progress / required) * 100) : 100;
        });
    }

    /**
     * Add construction progress
     * @param {number} points - Work points to add
     * @returns {boolean} True if building completed
     */
    addConstructionProgress(points) {
        const currentProgress = this.get('constructionProgress');
        const required = this.get('constructionPointsRequired');
        const newProgress = currentProgress + points;

        this.set('constructionProgress', Math.min(newProgress, required));

        if (newProgress >= required && !this.get('built')) {
            this.set('built', true);
            this.set('level', 1);
            
            if (window.eventBus) {
                window.eventBus.emit('building:completed', { building: this });
            }
            return true;
        }
        return false;
    }

    /**
     * Assign a worker to this building
     * @param {string} workerId - Worker ID
     */
    assignWorker(workerId) {
        const workers = [...this.get('workers')];
        if (!workers.includes(workerId)) {
            workers.push(workerId);
            this.set('workers', workers);
        }
    }

    /**
     * Remove a worker from this building
     * @param {string} workerId - Worker ID
     */
    removeWorker(workerId) {
        const workers = this.get('workers').filter(id => id !== workerId);
        this.set('workers', workers);
    }

    /**
     * Get available job slots from definition
     * @returns {object} Job types and counts
     */
    getAvailableJobs() {
        const def = this.get('definition');
        if (!def || !this.get('built')) return {};
        
        const production = def.get('production') || {};
        return production.jobs || {};
    }
}


/**
 * BuildingRegistry - Manages all building definitions and instances
 * Central point for building data access
 */
class BuildingRegistry {
    constructor() {
        this._definitions = new Map();
        this._instances = new CollectionModel('buildings', BuildingInstance);
        this._initialized = false;

        console.log('[BuildingRegistry] Created');
    }

    /**
     * Initialize registry with building definitions
     * @param {object} buildingData - Building data from GameData or config
     */
    initialize(buildingData) {
        if (this._initialized) {
            console.warn('[BuildingRegistry] Already initialized');
            return;
        }

        console.log('[BuildingRegistry] Initializing with building data...');

        // Register each building definition
        for (const [id, data] of Object.entries(buildingData)) {
            this.registerDefinition(id, data);
        }

        this._initialized = true;
        console.log(`[BuildingRegistry] Initialized with ${this._definitions.size} building definitions`);

        // Subscribe to game events
        if (window.eventBus) {
            window.eventBus.on('day-ended', () => this.updateUnlockStates());
            window.eventBus.on('building:completed', () => this.updateUnlockStates());
            window.eventBus.on('achievement:earned', () => this.updateUnlockStates());
        }
    }

    /**
     * Register a building definition
     * @param {string} id - Building type ID
     * @param {object} data - Building data
     */
    registerDefinition(id, data) {
        const definition = new BuildingDefinition(id, {
            ...data,
            id
        });
        this._definitions.set(id, definition);
        return definition;
    }

    /**
     * Get a building definition by ID
     * @param {string} id - Building type ID
     * @returns {BuildingDefinition}
     */
    getDefinition(id) {
        return this._definitions.get(id);
    }

    /**
     * Get all building definitions
     * @returns {BuildingDefinition[]}
     */
    getAllDefinitions() {
        return Array.from(this._definitions.values());
    }

    /**
     * Get definitions by category
     * @param {string} category - Category name
     * @returns {BuildingDefinition[]}
     */
    getDefinitionsByCategory(category) {
        return this.getAllDefinitions().filter(def => def.get('category') === category);
    }

    /**
     * Get unlocked building definitions
     * @returns {BuildingDefinition[]}
     */
    getUnlockedDefinitions() {
        return this.getAllDefinitions().filter(def => def.get('isUnlocked'));
    }

    /**
     * Create a building instance
     * @param {string} type - Building type ID
     * @param {object} data - Instance data (x, y, etc.)
     * @returns {BuildingInstance}
     */
    createInstance(type, data = {}) {
        const definition = this.getDefinition(type);
        if (!definition) {
            console.error(`[BuildingRegistry] Unknown building type: ${type}`);
            return null;
        }

        const id = data.id || `${type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const instance = new BuildingInstance(id, {
            ...data,
            type,
            id
        });

        this._instances.add(instance);
        return instance;
    }

    /**
     * Get all placed building instances
     * @returns {BuildingInstance[]}
     */
    getInstances() {
        return this._instances.all();
    }

    /**
     * Get instances of a specific type
     * @param {string} type - Building type
     * @returns {BuildingInstance[]}
     */
    getInstancesByType(type) {
        return this._instances.filter(b => b.get('type') === type);
    }

    /**
     * Get completed instances
     * @returns {BuildingInstance[]}
     */
    getCompletedInstances() {
        return this._instances.filter(b => b.get('built'));
    }

    /**
     * Update unlock states for all buildings
     * @param {object} gameState - Current game state
     */
    updateUnlockStates(gameState = null) {
        const state = gameState || window.gameState;
        if (!state) return;

        for (const definition of this._definitions.values()) {
            const wasUnlocked = definition.get('isUnlocked');
            const isNowUnlocked = definition.checkUnlockConditions(state);
            
            if (isNowUnlocked !== wasUnlocked) {
                definition.set('isUnlocked', isNowUnlocked);
                
                if (isNowUnlocked) {
                    console.log(`[BuildingRegistry] Building unlocked: ${definition.id}`);
                    if (window.eventBus) {
                        window.eventBus.emit('building:unlocked', { 
                            buildingId: definition.id,
                            definition 
                        });
                    }
                }
            }
        }
    }

    /**
     * Get the building instances collection for subscribing to changes
     * @returns {CollectionModel}
     */
    getInstancesCollection() {
        return this._instances;
    }

    /**
     * Serialize all instances for saving
     * @returns {object[]}
     */
    toJSON() {
        return {
            instances: this._instances.toJSON()
        };
    }

    /**
     * Load instances from saved data
     * @param {object} data - Saved data
     */
    fromJSON(data) {
        if (data.instances) {
            for (const instanceData of data.instances) {
                this.createInstance(instanceData.type, instanceData);
            }
        }
    }
}

// Create global registry
window.BuildingRegistry = new BuildingRegistry();
window.BuildingDefinition = BuildingDefinition;
window.BuildingInstance = BuildingInstance;

console.log('[BuildingModel] Building model system loaded');

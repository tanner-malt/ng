/**
 * resourceModel.js - Reactive Resource Management
 * 
 * Resources are the core economy elements of the game.
 * This model provides:
 * - Current amount tracking with change events
 * - Storage capacity management
 * - Rate of change (production/consumption per day)
 * - Icon and display formatting
 * 
 * Usage:
 *   ResourceManager.get('wood').add(10);
 *   eventBus.on('resource:wood:changed', ({ amount, delta }) => updateUI());
 */

/**
 * ResourceModel - Individual resource with reactive properties
 */
class ResourceModel extends DataModel {
    static SCHEMA = {
        amount: { default: 0, validate: v => typeof v === 'number' },
        capacity: { default: 50 },
        baseCapacity: { default: 50 },
        icon: { default: '📦' },
        displayName: { default: 'Resource' },
        category: { default: 'basic' }, // basic, crafted, currency
        productionRate: { default: 0 },
        consumptionRate: { default: 0 }
    };

    constructor(id, data = {}) {
        super('resource', id, ResourceModel.SCHEMA, data);

        // Define computed properties
        this.defineComputed('netRate', () => {
            return this.get('productionRate') - this.get('consumptionRate');
        });

        this.defineComputed('percentFull', () => {
            const capacity = this.get('capacity');
            return capacity > 0 ? Math.floor((this.get('amount') / capacity) * 100) : 0;
        });

        this.defineComputed('isFull', () => {
            return this.get('amount') >= this.get('capacity');
        });

        this.defineComputed('isEmpty', () => {
            return this.get('amount') <= 0;
        });

        this.defineComputed('displayAmount', () => {
            const amount = this.get('amount');
            return amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : Math.floor(amount);
        });
    }

    /**
     * Add to this resource (capped at capacity)
     * @param {number} delta - Amount to add
     * @returns {number} Actual amount added
     */
    add(delta) {
        const current = this.get('amount');
        const capacity = this.get('capacity');
        const newAmount = Math.min(current + delta, capacity);
        const actualDelta = newAmount - current;
        
        if (actualDelta !== 0) {
            this.set('amount', newAmount);
            this._emitResourceChange(actualDelta);
        }
        
        return actualDelta;
    }

    /**
     * Remove from this resource (can't go below 0)
     * @param {number} delta - Amount to remove
     * @returns {number} Actual amount removed
     */
    remove(delta) {
        const current = this.get('amount');
        const newAmount = Math.max(current - delta, 0);
        const actualDelta = current - newAmount;
        
        if (actualDelta !== 0) {
            this.set('amount', newAmount);
            this._emitResourceChange(-actualDelta);
        }
        
        return actualDelta;
    }

    /**
     * Check if we have at least a certain amount
     * @param {number} required - Required amount
     * @returns {boolean}
     */
    hasAtLeast(required) {
        return this.get('amount') >= required;
    }

    /**
     * Set the capacity (from buildings, bonuses, etc.)
     * @param {number} capacity - New capacity
     */
    setCapacity(capacity) {
        this.set('capacity', capacity);
        
        // Clamp amount if it exceeds new capacity
        const amount = this.get('amount');
        if (amount > capacity) {
            this.set('amount', capacity);
        }
    }

    /**
     * Update production/consumption rates
     * @param {number} production - Production per day
     * @param {number} consumption - Consumption per day
     */
    setRates(production, consumption) {
        this.batch(() => {
            this.set('productionRate', production);
            this.set('consumptionRate', consumption);
        });
    }

    /**
     * Emit specific resource change event
     * @private
     */
    _emitResourceChange(delta) {
        if (window.eventBus) {
            window.eventBus.emit(`resource:${this.id}:changed`, {
                resource: this.id,
                amount: this.get('amount'),
                capacity: this.get('capacity'),
                delta
            });
            
            window.eventBus.emit('resources:changed', {
                resource: this.id,
                amount: this.get('amount'),
                delta
            });
        }
    }
}


/**
 * ResourceManager - Manages all game resources with reactive updates
 */
class ResourceManager_Model {
    constructor() {
        this._resources = new Map();
        this._initialized = false;

        console.log('[ResourceManager] Created');
    }

    /**
     * Initialize with resource definitions
     * @param {object} resourceData - Resource configuration
     */
    initialize(resourceData) {
        if (this._initialized) {
            console.warn('[ResourceManager] Already initialized');
            return;
        }

        console.log('[ResourceManager] Initializing resources...');

        for (const [id, data] of Object.entries(resourceData)) {
            this.registerResource(id, data);
        }

        this._initialized = true;
        console.log(`[ResourceManager] Initialized with ${this._resources.size} resources`);

        // Subscribe to day end for production/consumption
        if (window.eventBus) {
            window.eventBus.on('day-ended', () => this.processDailyRates());
        }
    }

    /**
     * Register a new resource
     * @param {string} id - Resource ID
     * @param {object} data - Resource configuration
     * @returns {ResourceModel}
     */
    registerResource(id, data) {
        const resource = new ResourceModel(id, {
            ...data,
            id
        });
        this._resources.set(id, resource);
        return resource;
    }

    /**
     * Get a resource by ID
     * @param {string} id - Resource ID
     * @returns {ResourceModel}
     */
    get(id) {
        return this._resources.get(id);
    }

    /**
     * Get all resources
     * @returns {ResourceModel[]}
     */
    all() {
        return Array.from(this._resources.values());
    }

    /**
     * Get current amount of a resource
     * @param {string} id - Resource ID
     * @returns {number}
     */
    getAmount(id) {
        const resource = this._resources.get(id);
        return resource ? resource.get('amount') : 0;
    }

    /**
     * Add to a resource
     * @param {string} id - Resource ID
     * @param {number} amount - Amount to add
     * @returns {number} Actual amount added
     */
    add(id, amount) {
        const resource = this._resources.get(id);
        return resource ? resource.add(amount) : 0;
    }

    /**
     * Remove from a resource
     * @param {string} id - Resource ID
     * @param {number} amount - Amount to remove
     * @returns {number} Actual amount removed
     */
    remove(id, amount) {
        const resource = this._resources.get(id);
        return resource ? resource.remove(amount) : 0;
    }

    /**
     * Check if we can afford a set of costs
     * @param {object} costs - { resourceId: amount, ... }
     * @returns {boolean}
     */
    canAfford(costs) {
        for (const [resourceId, amount] of Object.entries(costs)) {
            const resource = this._resources.get(resourceId);
            if (!resource || !resource.hasAtLeast(amount)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Spend resources (atomic - all or nothing)
     * @param {object} costs - { resourceId: amount, ... }
     * @returns {boolean} True if successful
     */
    spend(costs) {
        if (!this.canAfford(costs)) {
            return false;
        }

        for (const [resourceId, amount] of Object.entries(costs)) {
            this.remove(resourceId, amount);
        }

        if (window.eventBus) {
            window.eventBus.emit('resources:spent', { costs });
        }

        return true;
    }

    /**
     * Add multiple resources at once
     * @param {object} amounts - { resourceId: amount, ... }
     */
    addMultiple(amounts) {
        for (const [resourceId, amount] of Object.entries(amounts)) {
            this.add(resourceId, amount);
        }
    }

    /**
     * Process daily production and consumption rates
     */
    processDailyRates() {
        console.log('[ResourceManager] Processing daily rates...');
        
        for (const resource of this._resources.values()) {
            const netRate = resource.get('netRate');
            if (netRate !== 0) {
                if (netRate > 0) {
                    resource.add(netRate);
                } else {
                    resource.remove(Math.abs(netRate));
                }
            }
        }
    }

    /**
     * Update storage capacities from buildings
     * @param {object[]} buildings - Built buildings
     */
    updateCapacitiesFromBuildings(buildings) {
        // Reset to base capacities
        for (const resource of this._resources.values()) {
            resource.set('capacity', resource.get('baseCapacity'));
        }

        // Add building storage bonuses
        for (const building of buildings) {
            if (!building.built) continue;
            
            const def = window.BuildingRegistry?.getDefinition(building.type);
            if (!def) continue;

            const production = def.get('production') || {};
            const storage = production.storage || {};

            if (storage.all) {
                // Bonus to all resources
                for (const resource of this._resources.values()) {
                    const current = resource.get('capacity');
                    resource.set('capacity', current + storage.all);
                }
            }

            // Specific resource bonuses
            for (const [resourceId, bonus] of Object.entries(storage)) {
                if (resourceId === 'all') continue;
                const resource = this._resources.get(resourceId);
                if (resource) {
                    const current = resource.get('capacity');
                    resource.set('capacity', current + bonus);
                }
            }
        }

        console.log('[ResourceManager] Updated capacities from buildings');
    }

    /**
     * Get all resources as plain object
     * @returns {object}
     */
    toJSON() {
        const result = {};
        for (const [id, resource] of this._resources) {
            result[id] = {
                amount: resource.get('amount'),
                capacity: resource.get('capacity')
            };
        }
        return result;
    }

    /**
     * Load resource amounts from saved data
     * @param {object} data - Saved data
     */
    fromJSON(data) {
        for (const [id, saved] of Object.entries(data)) {
            const resource = this._resources.get(id);
            if (resource) {
                resource.set('amount', saved.amount || 0, true);
                if (saved.capacity) {
                    resource.set('capacity', saved.capacity, true);
                }
            }
        }
    }
}

// Export
window.ResourceModel = ResourceModel;
window.ResourceManager_Model = ResourceManager_Model;

console.log('[ResourceModel] Resource model system loaded');

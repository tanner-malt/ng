/**
 * dataModel.js - Reactive Data Model System
 * 
 * Provides a base class for all game data models that automatically
 * emit events when properties change, enabling reactive UI updates.
 * 
 * Architecture:
 * - DataModel: Base class with property change tracking
 * - CollectionModel: Extends DataModel for arrays/maps of items
 * - All models emit events via the global eventBus
 * 
 * Usage:
 *   const building = new BuildingModel({ id: 'house', name: 'House', ... });
 *   eventBus.on('model:building:house:changed', (changes) => updateUI(changes));
 *   building.set('level', 2); // Auto-emits change event
 */

class DataModel {
    /**
     * @param {string} modelType - Type identifier (e.g., 'building', 'resource')
     * @param {string} id - Unique identifier for this model instance
     * @param {object} schema - Schema definition with default values and validators
     * @param {object} initialData - Initial property values
     */
    constructor(modelType, id, schema = {}, initialData = {}) {
        this._modelType = modelType;
        this._id = id;
        this._schema = schema;
        this._data = {};
        this._computed = {};
        this._listeners = new Map();
        this._batchedChanges = null;
        this._isBatching = false;

        // Initialize properties from schema defaults
        for (const [key, config] of Object.entries(schema)) {
            const defaultValue = config.default !== undefined ? config.default : null;
            this._data[key] = initialData[key] !== undefined ? initialData[key] : defaultValue;
        }

        // Set any additional data not in schema
        for (const [key, value] of Object.entries(initialData)) {
            if (!(key in this._data)) {
                this._data[key] = value;
            }
        }

        console.log(`[DataModel] Created ${modelType}:${id}`);
    }

    get id() { return this._id; }
    get modelType() { return this._modelType; }

    /**
     * Get a property value
     * @param {string} key - Property name
     * @returns {*} Property value
     */
    get(key) {
        // Check computed properties first
        if (this._computed[key]) {
            return this._computed[key].call(this);
        }
        return this._data[key];
    }

    /**
     * Set a property value and emit change event
     * @param {string} key - Property name
     * @param {*} value - New value
     * @param {boolean} silent - If true, don't emit events
     * @returns {boolean} True if value changed
     */
    set(key, value, silent = false) {
        const oldValue = this._data[key];
        
        // Validate if schema has validator
        if (this._schema[key]?.validate) {
            if (!this._schema[key].validate(value)) {
                console.warn(`[DataModel] Validation failed for ${this._modelType}:${this._id}.${key}:`, value);
                return false;
            }
        }

        // Check if value actually changed
        if (oldValue === value) return false;

        this._data[key] = value;

        if (!silent) {
            const change = { key, oldValue, newValue: value };
            
            if (this._isBatching) {
                this._batchedChanges.push(change);
            } else {
                this._emitChange([change]);
            }
        }

        return true;
    }

    /**
     * Set multiple properties at once
     * @param {object} values - Key-value pairs to set
     * @param {boolean} silent - If true, don't emit events
     */
    setMany(values, silent = false) {
        this.batch(() => {
            for (const [key, value] of Object.entries(values)) {
                this.set(key, value, silent);
            }
        });
    }

    /**
     * Batch multiple changes into a single event
     * @param {Function} fn - Function containing changes
     */
    batch(fn) {
        this._isBatching = true;
        this._batchedChanges = [];
        
        try {
            fn();
        } finally {
            this._isBatching = false;
            if (this._batchedChanges.length > 0) {
                this._emitChange(this._batchedChanges);
            }
            this._batchedChanges = null;
        }
    }

    /**
     * Define a computed property
     * @param {string} key - Property name
     * @param {Function} computeFn - Function that computes the value
     */
    defineComputed(key, computeFn) {
        this._computed[key] = computeFn;
    }

    /**
     * Subscribe to changes on this model
     * @param {Function} callback - Called with (changes, model)
     * @returns {Function} Unsubscribe function
     */
    onChange(callback) {
        const id = Symbol();
        this._listeners.set(id, callback);
        return () => this._listeners.delete(id);
    }

    /**
     * Get all data as a plain object
     * @returns {object} Plain object with all properties
     */
    toJSON() {
        const result = { id: this._id, modelType: this._modelType };
        for (const key of Object.keys(this._data)) {
            result[key] = this._data[key];
        }
        for (const key of Object.keys(this._computed)) {
            result[key] = this.get(key);
        }
        return result;
    }

    /**
     * Emit change event to all listeners and global eventBus
     * @private
     */
    _emitChange(changes) {
        // Notify local listeners
        for (const callback of this._listeners.values()) {
            try {
                callback(changes, this);
            } catch (e) {
                console.error(`[DataModel] Listener error for ${this._modelType}:${this._id}:`, e);
            }
        }

        // Emit to global eventBus
        if (window.eventBus) {
            // Specific event for this model instance
            window.eventBus.emit(`model:${this._modelType}:${this._id}:changed`, {
                model: this,
                changes
            });

            // General event for this model type
            window.eventBus.emit(`model:${this._modelType}:changed`, {
                model: this,
                changes
            });
        }
    }
}


/**
 * CollectionModel - Manages a collection of DataModel instances
 * Emits events when items are added, removed, or modified
 */
class CollectionModel {
    /**
     * @param {string} collectionType - Type identifier (e.g., 'buildings', 'resources')
     * @param {Function} ModelClass - The DataModel subclass for items
     */
    constructor(collectionType, ModelClass = DataModel) {
        this._collectionType = collectionType;
        this._ModelClass = ModelClass;
        this._items = new Map();
        this._listeners = new Map();

        console.log(`[CollectionModel] Created collection: ${collectionType}`);
    }

    get size() { return this._items.size; }
    get type() { return this._collectionType; }

    /**
     * Add an item to the collection
     * @param {DataModel|object} item - Item to add (or data to create model from)
     * @returns {DataModel} The added model
     */
    add(item) {
        let model = item;
        
        if (!(item instanceof DataModel)) {
            // Create model from plain object
            model = new this._ModelClass(item);
        }

        const id = model.id;
        
        if (this._items.has(id)) {
            console.warn(`[CollectionModel] Item ${id} already exists in ${this._collectionType}`);
            return this._items.get(id);
        }

        this._items.set(id, model);

        // Subscribe to item changes
        model.onChange((changes) => {
            this._emitEvent('item:changed', { item: model, changes });
        });

        this._emitEvent('item:added', { item: model });
        
        return model;
    }

    /**
     * Remove an item from the collection
     * @param {string} id - Item ID to remove
     * @returns {boolean} True if item was removed
     */
    remove(id) {
        const item = this._items.get(id);
        if (!item) return false;

        this._items.delete(id);
        this._emitEvent('item:removed', { item });
        
        return true;
    }

    /**
     * Get an item by ID
     * @param {string} id - Item ID
     * @returns {DataModel|undefined}
     */
    get(id) {
        return this._items.get(id);
    }

    /**
     * Check if an item exists
     * @param {string} id - Item ID
     * @returns {boolean}
     */
    has(id) {
        return this._items.has(id);
    }

    /**
     * Get all items as an array
     * @returns {DataModel[]}
     */
    all() {
        return Array.from(this._items.values());
    }

    /**
     * Filter items by predicate
     * @param {Function} predicate - Filter function
     * @returns {DataModel[]}
     */
    filter(predicate) {
        return this.all().filter(predicate);
    }

    /**
     * Find first item matching predicate
     * @param {Function} predicate - Search function
     * @returns {DataModel|undefined}
     */
    find(predicate) {
        return this.all().find(predicate);
    }

    /**
     * Iterate over all items
     * @param {Function} callback - Called with (item, id)
     */
    forEach(callback) {
        this._items.forEach((item, id) => callback(item, id));
    }

    /**
     * Map items to new array
     * @param {Function} mapper - Map function
     * @returns {Array}
     */
    map(mapper) {
        return this.all().map(mapper);
    }

    /**
     * Subscribe to collection events
     * @param {Function} callback - Called with (eventType, data)
     * @returns {Function} Unsubscribe function
     */
    onChange(callback) {
        const id = Symbol();
        this._listeners.set(id, callback);
        return () => this._listeners.delete(id);
    }

    /**
     * Get all items as plain objects
     * @returns {object[]}
     */
    toJSON() {
        return this.all().map(item => item.toJSON());
    }

    /**
     * Emit event to listeners and eventBus
     * @private
     */
    _emitEvent(eventType, data) {
        // Notify local listeners
        for (const callback of this._listeners.values()) {
            try {
                callback(eventType, data);
            } catch (e) {
                console.error(`[CollectionModel] Listener error:`, e);
            }
        }

        // Emit to global eventBus
        if (window.eventBus) {
            window.eventBus.emit(`collection:${this._collectionType}:${eventType}`, data);
        }
    }
}


/**
 * Registry - Singleton pattern for managing all game models
 * Provides centralized access to all model collections
 */
class ModelRegistry {
    constructor() {
        this._collections = new Map();
        this._models = new Map();
        console.log('[ModelRegistry] Initialized');
    }

    /**
     * Register a collection
     * @param {string} name - Collection name
     * @param {CollectionModel} collection - The collection
     */
    registerCollection(name, collection) {
        this._collections.set(name, collection);
    }

    /**
     * Get a collection by name
     * @param {string} name - Collection name
     * @returns {CollectionModel}
     */
    getCollection(name) {
        return this._collections.get(name);
    }

    /**
     * Register a singleton model
     * @param {string} name - Model name
     * @param {DataModel} model - The model
     */
    registerModel(name, model) {
        this._models.set(name, model);
    }

    /**
     * Get a singleton model by name
     * @param {string} name - Model name
     * @returns {DataModel}
     */
    getModel(name) {
        return this._models.get(name);
    }

    /**
     * Get all collections as serializable object
     * @returns {object}
     */
    toJSON() {
        const result = { collections: {}, models: {} };
        
        this._collections.forEach((collection, name) => {
            result.collections[name] = collection.toJSON();
        });
        
        this._models.forEach((model, name) => {
            result.models[name] = model.toJSON();
        });
        
        return result;
    }
}

// Create global registry
window.ModelRegistry = new ModelRegistry();

// Export classes
window.DataModel = DataModel;
window.CollectionModel = CollectionModel;

console.log('[DataModel] Reactive data model system loaded');

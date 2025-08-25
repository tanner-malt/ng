// Minimal Node-friendly harness for testing persistence + migrations without browser/DOM dependencies.
// This mirrors the key save/migration semantics of GameState.

const SAVE_KEY = 'dynastyBuilder_save';
const SAVE_SCHEMA_VERSION = 1;

const SAVE_MIGRATIONS = {
    0: (data) => {
        data.resources = data.resources || { food: 0, wood: 0, stone: 0, metal: 0, production: 0 };
        data.buildings = Array.isArray(data.buildings) ? data.buildings : [];
        if (data.day != null && data.currentDay == null) data.currentDay = data.day;
        data.schemaVersion = 1;
        return data;
    },
};

function migrateSaveData(data) {
    let v = Number.isInteger(data.schemaVersion) ? data.schemaVersion : 0;
    if (v > SAVE_SCHEMA_VERSION) {
        data.__futureVersion = true;
        return data;
    }
    while (v < SAVE_SCHEMA_VERSION) {
        const step = SAVE_MIGRATIONS[v];
        if (typeof step !== 'function') { v++; continue; }
        data = step({ ...data });
        v = Number.isInteger(data.schemaVersion) ? data.schemaVersion : v + 1;
    }
    return data;
}

let STARTING_POPULATION = 5;
try {
    // Attempt to load GameData constants in Node environment
    // Relative path from this file: src/systems/core -> src/config/gameData.js
    const GameData = require('../../config/gameData.js');
    if (GameData && typeof GameData.startingPopulationCount === 'number') {
        STARTING_POPULATION = GameData.startingPopulationCount;
    }
} catch (_) { /* optional */ }

class GameStateTestable {
    constructor() {
        this.day = 1;
        this.currentDay = 1;
        this.season = 'Spring';
        this.gold = 100;
        this.resources = { food: 100, wood: 50, stone: 25, metal: 0, production: 0 };
        this.buildings = [];
        this.unlockedBuildings = ['tent', 'townCenter'];

        this.population = STARTING_POPULATION;

        this.inventoryManager = null;

        // Minimal build queue for tests
        this.buildQueue = [];
        this.constructionManager = {
            initializeConstructionSite: () => ({ pointsRemaining: 10 }),
            processDailyConstruction: () => { },
            autoAssignWorkers: () => { },
            constructionSites: new Map(),
        };

        // Minimal job manager stub
        this.jobManager = {
            updateAvailableJobs: () => { },
            getAllAvailableJobs: () => [],
            getAvailableWorkers: () => [{ id: 'w1', name: 'Test Worker' }],
            autoAssignWorkers: () => { },
            jobAssignments: new Map(),
            calculateDailyProduction: () => ({ wood: 1, food: 0, stone: 0, metal: 0 }),
            serialize: () => ({})
        };

        this.schemaVersion = SAVE_SCHEMA_VERSION;
        this.readOnlySave = false;
    }

    ensureInventoryManager(skipDefaults = false) {
        if (this.inventoryManager) return this.inventoryManager;
        if (typeof window !== 'undefined' && window.InventoryManager) {
            this.inventoryManager = new window.InventoryManager(this, skipDefaults);
            return this.inventoryManager;
        }
        // Fallback inline stub for tests if none provided
        this.inventoryManager = {
            items: skipDefaults ? { tent: 0, hasteRune: 0 } : { tent: 5, hasteRune: 2 },
            serialize() { return { items: { ...this.items } }; },
            deserialize(d) { this.items = { ...d.items }; },
        };
        return this.inventoryManager;
    }

    toSerializable() {
        return {
            schemaVersion: SAVE_SCHEMA_VERSION,
            savedAt: Date.now(),
            day: this.day,
            currentDay: this.currentDay,
            season: this.season,
            gold: this.gold,
            resources: this.resources,
            buildings: this.buildings,
            buildQueue: this.buildQueue,
            population: this.population,
            unlockedBuildings: this.unlockedBuildings,
            inventoryManagerData: this.inventoryManager ? this.inventoryManager.serialize() : null,
        };
    }

    save() {
        if (this.readOnlySave) return false;
        const serialized = JSON.stringify(this.toSerializable());
        localStorage.setItem(SAVE_KEY, serialized);
        try { localStorage.setItem('idleDynastyBuilder', serialized); } catch (_) { }
        return true;
    }

    load() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        let data = JSON.parse(raw);
        data = migrateSaveData(data);
        this.readOnlySave = !!data.__futureVersion;

        this.day = data.day ?? this.day;
        this.currentDay = data.currentDay ?? data.day ?? this.currentDay;
        this.season = data.season ?? this.season;
        this.gold = data.gold ?? this.gold;
        this.resources = { ...this.resources, ...(data.resources || {}) };
        this.buildings = Array.isArray(data.buildings) ? data.buildings : this.buildings;
        this.buildQueue = Array.isArray(data.buildQueue) ? data.buildQueue : this.buildQueue;
        this.population = data.population ?? this.population;
        if (Array.isArray(data.unlockedBuildings)) this.unlockedBuildings = data.unlockedBuildings;

        if (data.inventoryManagerData) {
            this.ensureInventoryManager(true);
            this.inventoryManager.deserialize(data.inventoryManagerData);
        }
        return true;
    }

    // Build queue helpers for tests
    addToBuildQueue(type, x = 0, y = 0) {
        const id = Date.now() + Math.random();
        this.buildQueue.push({ id, type, x, y, priority: 'normal' });
        this.buildings.push({ id, type, level: 0, built: false, x, y });
        return id;
    }

    processBuildQueue() {
        // Minimal: start construction for the first queued item
        if (!this.buildQueue.length) return;
        const item = this.buildQueue.shift();
        const b = this.buildings.find(bb => bb.id === item.id);
        if (b) { b.level = 0; b.built = false; b.startedAt = Date.now(); }
        // call construction manager hooks
        this.constructionManager.initializeConstructionSite(b);
    }
}

module.exports = { GameStateTestable, migrateSaveData, SAVE_SCHEMA_VERSION };

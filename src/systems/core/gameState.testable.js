// Minimal Node-friendly harness for testing persistence + migrations without browser/DOM dependencies.
// This mirrors the key save/migration semantics of GameState.

const SAVE_KEY = 'dynastyBuilder_save';
const SAVE_SCHEMA_VERSION = 1;

const SAVE_MIGRATIONS = {
    0: (data) => {
        data.resources = data.resources || { food: 0, wood: 0, stone: 0, metal: 0, planks: 0, weapons: 0, tools: 0, production: 0 };
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
        this.resources = { food: 100, wood: 50, stone: 25, metal: 0, planks: 0, weapons: 0, tools: 0, production: 0 };
        this.buildings = [];
        this.unlockedBuildings = ['foundersWagon', 'townCenter', 'house'];

        this.population = STARTING_POPULATION;

        // inventoryManager removed - inventory system deprecated

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

    // Minimal helpers to mirror core GameState behavior
    getBuildingCost(buildingType) {
        return (globalThis.window?.GameData?.buildingCosts?.[buildingType]) || {};
    }
    canAffordBuilding(buildingType) {
        const cost = this.getBuildingCost(buildingType);
        if (cost.gold && this.gold < cost.gold) return false;
        for (const [res, amt] of Object.entries(cost)) {
            if (res === 'gold') continue;
            if (this.resources[res] == null || this.resources[res] < amt) return false;
        }
        return true;
    }
    isBuildingUnlocked(type) {
        return this.unlockedBuildings.includes(type);
    }

    // Mirror of updateBuildButtons governance/affordance logic (DOM-based)
    updateBuildButtons() {
        try {
            const buttons = document.querySelectorAll('[data-building], .build-btn');
            let managementAllowed = true;
            let mgmtStatus = { allowed: true };
            try {
                if (globalThis.window?.villageManager?.getManagementStatus) {
                    mgmtStatus = globalThis.window.villageManager.getManagementStatus();
                    managementAllowed = !!mgmtStatus.allowed;
                } else {
                    managementAllowed = globalThis.window?.villageManager?.isManagementAllowed ? globalThis.window.villageManager.isManagementAllowed() : true;
                }
            } catch (_) { managementAllowed = true; }
            if (!buttons.length) return;
            buttons.forEach(btn => {
                const type = btn.dataset.building;
                if (!type) return;
                if (!managementAllowed) {
                    try { if (typeof btn.disabled !== 'undefined') btn.disabled = true; } catch (_) { }
                    btn.classList.add('disabled');
                    btn.classList.add('locked');
                    btn.title = mgmtStatus.message || (mgmtStatus.reason === 'leader_away'
                        ? 'Village management locked: Leader is away on expedition'
                        : (mgmtStatus.reason === 'not_governing'
                            ? 'Village management locked: Monarch is not governing'
                            : 'Village management locked'));
                    return;
                }

                const unlocked = this.isBuildingUnlocked(type);
                const affordable = unlocked && this.canAffordBuilding(type);
                try { if (typeof btn.disabled !== 'undefined') btn.disabled = !affordable; } catch (_) { }
                btn.classList.toggle('locked', !unlocked);
                btn.classList.toggle('disabled', !affordable);
                if (!unlocked) {
                    btn.title = 'Locked';
                } else if (!affordable) {
                    try {
                        const cost = this.getBuildingCost(type) || {};
                        const missing = Object.entries(cost)
                            .filter(([res, amt]) => (res === 'gold' ? this.gold < amt : ((this.resources[res] ?? 0) < amt)))
                            .map(([res, amt]) => {
                                const have = res === 'gold' ? this.gold : (this.resources[res] ?? 0);
                                return `${res}: ${have}/${amt}`;
                            })
                            .join(', ');
                        btn.title = missing ? `Insufficient resources (${missing})` : 'Insufficient resources';
                    } catch (_) { btn.title = 'Insufficient resources'; }
                } else {
                    btn.title = '';
                }
            });
        } catch (_) { /* ignore in tests */ }
    }

    // Inventory system removed
    ensureInventoryManager(skipDefaults = false) {
        return null;
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

        // Inventory system removed
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

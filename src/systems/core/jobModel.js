/**
 * jobModel.js - Unified Job System (replaces both jobModel.js and jobManager.js)
 * 
 * Single source of truth for job definitions, slot management, worker assignment AI,
 * production calculation, and serialization. Exposes as window.JobRegistry singleton.
 *
 * Key design decisions:
 *  - Gatherers come from buildings only (Town Center: 2, Storehouse: 1 each). No global pool.
 *  - Builders have 4 global slots (always available) PLUS slots from Builder's Huts.
 *  - Unemployed citizens sit idle with no production (still consume food).
 *  - All building-based jobs score higher than gatherer by default.
 */

// ─── JobDefinition ──────────────────────────────────────────────────────────

class JobDefinition extends DataModel {
    static SCHEMA = {
        name: { default: 'Unknown Job' },
        label: { default: 'Worker' },
        icon: { default: '👷' },
        description: { default: 'A job' },
        buildingType: { default: null },
        production: { default: {} },
        consumption: { default: {} },
        requiredSkill: { default: null },
        skillGained: { default: null },
        baseEfficiency: { default: 1.0 },
        seasonalModifiers: { default: {} }
    };

    constructor(id, data = {}) {
        super('jobDef', id, JobDefinition.SCHEMA, data);
        this.defineComputed('productionText', () => {
            const prod = this.get('production') || {};
            return Object.entries(prod)
                .map(([r, a]) => `${a} ${r}/day`).join(', ') || 'None';
        });
    }

    calculateProduction(worker = {}, season = 'Spring') {
        const baseProd = this.get('production') || {};
        const seasonMods = this.get('seasonalModifiers') || {};
        const eff = this.get('baseEfficiency');
        const result = {};
        for (const [resource, amount] of Object.entries(baseProd)) {
            let v = amount * eff;
            if (seasonMods[season]) v *= seasonMods[season];
            else if (window.GameData?.seasonMultipliers?.[season]?.[resource])
                v *= window.GameData.seasonMultipliers[season][resource];
            const skill = this.get('requiredSkill');
            if (skill && worker.skills) {
                const s = worker.skills.find(sk => sk.type === skill);
                if (s) v *= (1 + s.level * 0.1);
            }
            result[resource] = v;
        }
        return result;
    }

    calculateConsumption(worker = {}) {
        const base = this.get('consumption') || {};
        return { ...base };
    }
}

// ─── JobSlot ────────────────────────────────────────────────────────────────

class JobSlot extends DataModel {
    static SCHEMA = {
        buildingId: { default: null },
        jobType: { default: null },
        workerId: { default: null },
        slotIndex: { default: 0 }
    };

    constructor(id, data = {}) {
        super('jobSlot', id, JobSlot.SCHEMA, data);
        this.defineComputed('isOccupied', () => this.get('workerId') !== null);
        this.defineComputed('jobDefinition', () => window.JobRegistry?.get(this.get('jobType')));
    }

    assign(workerId) {
        if (this.get('isOccupied')) return false;
        this.set('workerId', workerId);
        window.eventBus?.emit('job:assigned', {
            slot: this, workerId,
            jobType: this.get('jobType'),
            buildingId: this.get('buildingId')
        });
        return true;
    }

    unassign() {
        const wid = this.get('workerId');
        if (!wid) return null;
        this.set('workerId', null);
        window.eventBus?.emit('job:unassigned', {
            slot: this, workerId: wid,
            jobType: this.get('jobType'),
            buildingId: this.get('buildingId')
        });
        return wid;
    }
}

// ─── JobRegistry (singleton — the unified job system) ───────────────────────

class JobRegistry {
    constructor() {
        this._definitions = new Map();
        this._slots = new CollectionModel('jobSlots', JobSlot);
        this._initialized = false;
        this._gameState = null;
        this.debugMode = false;

        // Terrain → building type → resource → multiplier
        // Applied on top of base production for buildings placed on matching terrain
        this.TERRAIN_BONUSES = {
            fertile: {
                farm:          { food: 0.30 },
                huntersLodge:  { food: 0.15 }
            },
            hills: {
                quarry:        { stone: 0.30 },
                mine:          { stone: 0.25, metal: 0.25 },
                _default:      { stone: 0.10 }
            }
        };

        // Hard-coded efficiency rates per job type (mirrors old jobEfficiency Map)
        this._jobEfficiency = {
            farmer:           { food: 3.75 },
            hunter:           { food: 2.5 },
            woodcutter:       { wood: 3 },
            builder:          { construction: 1 },
            gatherer:         {},            // RNG in calculateDailyProduction
            sawyer:           { planks: 2, wood: -2 },
            foreman:          {},            // boost applied in ConstructionManager
            miner:            { stone: 2, metal: 1 },
            rockcutter:       { stone: 3 },
            engineer:         { production: 3, tools: 1, metal: -0.5 },
            trader:           {},            // gold via economySystem
            blacksmith:       { weapons: 1, tools: 2, metal: -1 },
            drillInstructor:  {},
            militaryTheorist: {},
            professor:        {},
            scholar:          {},
            wizard:           {},
            priest:           {}
        };

        // Skill mapping for worker-to-job fit
        this._skillMapping = {
            farmer: ['Agriculture'],
            hunter: ['Hunting', 'Agriculture'],
            builder: ['Carpentry', 'Masonry', 'Engineering'],
            gatherer: ['Hunting', 'Forestry', 'Agriculture'],
            woodcutter: ['Forestry'],
            sawyer: ['Forestry', 'Carpentry'],
            foreman: ['Carpentry', 'Masonry', 'Engineering'],
            miner: ['Mining'],
            rockcutter: ['Masonry'],
            engineer: ['Engineering'],
            trader: ['Trade'],
            blacksmith: ['Blacksmithing'],
            drillInstructor: ['Military'],
            militaryTheorist: ['Military Theory'],
            scholar: ['Research'],
            professor: ['Research'],
            wizard: ['Arcana']
        };

        console.log('[JobRegistry] Created');
    }

    // ── debug helper ──
    debugLog(...args) { if (this.debugMode) console.log('[JobRegistry]', ...args); }

    // ── Accessor used by callers who reference gameState.jobManager ──
    get gameState() { return this._gameState || window.gameState; }
    set gameState(gs) { this._gameState = gs; }

    // ═══════════════════════════════════════════════════════════════════════
    //  INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    initialize(jobData) {
        if (this._initialized) return;
        for (const [id, data] of Object.entries(jobData)) this.registerJob(id, data);
        this._initialized = true;
        console.log(`[JobRegistry] Initialized with ${this._definitions.size} job types`);

        // Building completed → create slots
        window.eventBus?.on('building:completed', (data) => {
            if (data?.building) this.createSlotsForBuilding(data.building);
        });
    }

    registerJob(id, data) {
        const job = new JobDefinition(id, { ...data, id });
        this._definitions.set(id, job);
        return job;
    }

    /** Get a JobDefinition by id */
    get(id) { return this._definitions.get(id); }
    /** Get all JobDefinitions */
    all() { return Array.from(this._definitions.values()); }

    // ═══════════════════════════════════════════════════════════════════════
    //  SLOT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Rebuild all slots from current gameState buildings + global builder slots.
     * Call once per day (or on demand) to stay in sync with constructed buildings.
     */
    updateAvailableSlots() {
        const gs = this.gameState;
        if (!gs) return;

        // Track which building IDs already have slots so we don't double-create
        const existingBuildingIds = new Set();
        for (const slot of this._slots.all()) {
            existingBuildingIds.add(slot.get('buildingId'));
        }

        // Ensure global builder slots exist (exactly 4)
        if (!existingBuildingIds.has('global')) {
            for (let i = 0; i < 4; i++) {
                const id = `global_builder_${i}`;
                if (!this._slots.has(id)) {
                    this._slots.add(new JobSlot(id, { id, buildingId: 'global', jobType: 'builder', slotIndex: i }));
                }
            }
        }

        // Remove slots for demolished / non-existent buildings
        const activeBuildingIds = new Set((gs.buildings || []).filter(b => b.built && b.level > 0).map(b => b.id));
        activeBuildingIds.add('global');
        const toRemove = [];
        for (const slot of this._slots.all()) {
            if (!activeBuildingIds.has(slot.get('buildingId'))) {
                // Unassign worker first
                const wid = slot.get('workerId');
                if (wid) {
                    const w = this.getWorkerById(wid);
                    if (w) { w.jobAssignment = null; w.status = 'idle'; }
                    slot.set('workerId', null);
                }
                toRemove.push(slot.id);
            }
        }
        toRemove.forEach(id => this._slots.remove(id));

        // Create slots for buildings that lack them
        const buildings = gs.buildings || [];
        buildings.forEach(building => {
            if (!building.built || !(building.level > 0)) return;
            if (existingBuildingIds.has(building.id)) return; // already have slots

            const production = window.GameData?.buildingProduction?.[building.type];
            if (!production || !production.jobs) return;

            let idx = 0;
            Object.entries(production.jobs).forEach(([jobType, baseSlots]) => {
                const slots = this._computeJobSlots(baseSlots, building);
                for (let i = 0; i < slots; i++) {
                    const slotId = `${building.id}_${jobType}_${idx}`;
                    if (!this._slots.has(slotId)) {
                        this._slots.add(new JobSlot(slotId, { id: slotId, buildingId: building.id, jobType, slotIndex: idx }));
                    }
                    idx++;
                }
            });
        });

        // Scale existing building slots if level changed (simplified: compare count)
        buildings.forEach(building => {
            if (!building.built || !(building.level > 0)) return;
            const production = window.GameData?.buildingProduction?.[building.type];
            if (!production || !production.jobs) return;

            Object.entries(production.jobs).forEach(([jobType, baseSlots]) => {
                const desired = this._computeJobSlots(baseSlots, building);
                const current = this._slots.filter(s => s.get('buildingId') === building.id && s.get('jobType') === jobType);
                // Add missing slots
                if (current.length < desired) {
                    for (let i = current.length; i < desired; i++) {
                        const slotId = `${building.id}_${jobType}_${i}_lvl${building.level}`;
                        if (!this._slots.has(slotId)) {
                            this._slots.add(new JobSlot(slotId, { id: slotId, buildingId: building.id, jobType, slotIndex: i }));
                        }
                    }
                }
            });
        });
    }

    /** Linear slot scaling by building level */
    _computeJobSlots(baseSlots, building) {
        const level = Math.max(1, building?.level || 1);
        return Math.max(0, Math.floor(baseSlots * level));
    }

    createSlotsForBuilding(building) {
        const bid = building.id || building._id;
        const btype = building.type || building.get?.('type');
        const production = window.GameData?.buildingProduction?.[btype];
        if (!production || !production.jobs) return;

        let idx = 0;
        Object.entries(production.jobs).forEach(([jobType, count]) => {
            const level = Math.max(1, building.level || 1);
            const slots = Math.floor(count * level);
            for (let i = 0; i < slots; i++) {
                const slotId = `${bid}_${jobType}_${idx}`;
                if (!this._slots.has(slotId)) {
                    this._slots.add(new JobSlot(slotId, { id: slotId, buildingId: bid, jobType, slotIndex: idx }));
                }
                idx++;
            }
        });
    }

    // ── Slot queries ──

    getSlotsForBuilding(buildingId) { return this._slots.filter(s => s.get('buildingId') === buildingId); }
    getVacantSlotsForBuilding(buildingId) { return this.getSlotsForBuilding(buildingId).filter(s => !s.get('isOccupied')); }
    getAllVacantSlots() { return this._slots.filter(s => !s.get('isOccupied')); }
    getSlotsByJobType(jobType) { return this._slots.filter(s => s.get('jobType') === jobType); }
    findSlotByWorker(workerId) { return this._slots.find(s => s.get('workerId') === workerId); }

    // ═══════════════════════════════════════════════════════════════════════
    //  COMPATIBILITY SHIMS (so callers reading .jobAssignments / .availableJobs still work)
    // ═══════════════════════════════════════════════════════════════════════

    /** Computed Map<buildingId, { jobType: [workerIds] }> — mirrors old jobManager.jobAssignments */
    get jobAssignments() {
        const map = new Map();
        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const bid = slot.get('buildingId');
            const jt = slot.get('jobType');
            if (!map.has(bid)) map.set(bid, {});
            const obj = map.get(bid);
            if (!obj[jt]) obj[jt] = [];
            obj[jt].push(wid);
        }
        return map;
    }

    /** Computed Map<buildingId, { jobType: maxSlots }> — mirrors old jobManager.availableJobs */
    get availableJobs() {
        const map = new Map();
        for (const slot of this._slots.all()) {
            const bid = slot.get('buildingId');
            const jt = slot.get('jobType');
            if (!map.has(bid)) map.set(bid, {});
            const obj = map.get(bid);
            obj[jt] = (obj[jt] || 0) + 1;
        }
        return map;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  WORKER ASSIGNMENT CRUD
    // ═══════════════════════════════════════════════════════════════════════

    assignWorkerToJob(workerId, buildingId, jobType) {
        if (!workerId || buildingId == null || !jobType) return false;

        // Find a vacant slot at this building for this job type
        const slot = this._slots.find(s =>
            s.get('buildingId') === buildingId &&
            s.get('jobType') === jobType &&
            !s.get('isOccupied')
        );
        if (!slot) return false;

        const worker = this.getWorkerById(workerId);
        if (!worker) return false;
        if (worker.jobAssignment) return false; // already assigned

        slot.assign(workerId);
        worker.jobAssignment = { buildingId, jobType, assignedDay: this.gameState?.currentDay || 0 };
        worker.status = 'working';
        this.debugLog(`Assigned ${worker.name} → ${jobType} at ${buildingId}`);
        return true;
    }

    removeWorkerFromJob(workerId) {
        const slot = this.findSlotByWorker(workerId);
        if (!slot) return false;
        slot.unassign();
        const worker = this.getWorkerById(workerId);
        if (worker) { worker.jobAssignment = null; worker.status = 'idle'; }
        return true;
    }

    /**
     * Assign worker to a preferred job type (finds first vacant of that type)
     * or any vacant slot. Returns the slot or null.
     */
    assignWorker(workerId, preferredJobType = null) {
        if (preferredJobType) {
            const slot = this._slots.find(s => s.get('jobType') === preferredJobType && !s.get('isOccupied'));
            if (slot) {
                const worker = this.getWorkerById(workerId);
                if (worker && !worker.jobAssignment) {
                    slot.assign(workerId);
                    worker.jobAssignment = { buildingId: slot.get('buildingId'), jobType: preferredJobType, assignedDay: this.gameState?.currentDay || 0 };
                    worker.status = 'working';
                    return slot;
                }
            }
        }
        // fall through: any vacant
        const vacant = this.getAllVacantSlots();
        if (vacant.length > 0) {
            const slot = vacant[0];
            const worker = this.getWorkerById(workerId);
            if (worker && !worker.jobAssignment) {
                slot.assign(workerId);
                worker.jobAssignment = { buildingId: slot.get('buildingId'), jobType: slot.get('jobType'), assignedDay: this.gameState?.currentDay || 0 };
                worker.status = 'working';
                return slot;
            }
        }
        return null;
    }

    unassignWorker(workerId) { return this.removeWorkerFromJob(workerId); }

    getWorkersInJob(buildingId, jobType) {
        const slots = this._slots.filter(s =>
            s.get('buildingId') === buildingId &&
            s.get('jobType') === jobType &&
            s.get('isOccupied')
        );
        return slots.map(s => this.getWorkerById(s.get('workerId'))).filter(Boolean);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  WORKER UTILITIES
    // ═══════════════════════════════════════════════════════════════════════

    getWorkerById(workerId) {
        const gs = this.gameState;
        if (gs?.populationManager?.population) return gs.populationManager.population.find(p => p.id === workerId);
        if (gs?.population && Array.isArray(gs.population)) return gs.population.find(p => p.id === workerId);
        return null;
    }

    getAvailableWorkers() {
        const gs = this.gameState;
        const allWorkers = gs?.populationManager?.population || gs?.population || [];
        return allWorkers.filter(w => {
            if (!w) return false;
            if (w.age < 16 || w.age > 120) return false;
            if ((w.health || 100) < 30) return false;
            if (w.jobAssignment) return false;
            // Exclude governing monarch
            try {
                const m = gs?.royalFamily?.currentMonarch;
                if (m && m.isGoverning && w.id === m.id) return false;
            } catch (_) {}
            if (w.role === 'player' || w.role === 'monarch' || w.role === 'royal') return false;
            if (w.status === 'drafted' || w.status === 'away' || w.status === 'traveling') return false;
            return true;
        }).map(w => ({
            id: w.id, name: w.name, age: w.age, role: w.role,
            skills: w.skills || {}, health: w.health || 100,
            happiness: w.happiness || 75, experience: w.experience || {},
            jobAssignment: null, status: w.status || 'idle'
        }));
    }

    calculateWorkerEfficiency(worker, jobType) {
        const age = worker.age || 25;
        let ageFactor = 1.0;
        if (age < 18) ageFactor = 0.7;
        else if (age < 25) ageFactor = 0.9;
        else if (age <= 45) ageFactor = 1.0;
        else if (age <= 60) ageFactor = 0.95;
        else ageFactor = 0.8;

        const healthFactor = Math.max(0.5, (worker.health || 100) / 100);
        const happinessFactor = Math.max(0.7, (worker.happiness || 75) / 100);

        let skillXP = 0;
        try {
            const relevant = this.getRelevantSkillsForJob(jobType) || [];
            relevant.forEach(name => {
                const xp = (worker.experience && worker.experience[name]) || (worker.skills && worker.skills[name]) || 0;
                if (xp > skillXP) skillXP = xp;
            });
        } catch (_) {}
        const skillFactor = 1.0 + Math.min(0.5, (skillXP / 1000) * 0.5);

        return Math.max(0.1, ageFactor * healthFactor * happinessFactor * skillFactor);
    }

    pickBestWorkerIndexForJob(workers, jobType) {
        if (!workers || workers.length === 0) return -1;
        let best = -1, bestScore = -Infinity;
        for (let i = 0; i < workers.length; i++) {
            const eff = this.calculateWorkerEfficiency(workers[i], jobType);
            if (eff > bestScore) { bestScore = eff; best = i; }
        }
        return best;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  AUTO-ASSIGNMENT AI
    // ═══════════════════════════════════════════════════════════════════════

    autoAssignWorkers() {
        this.debugLog('Auto-assigning workers with resource-aware optimization...');
        this.optimizeWorkerAssignments();

        const availableWorkers = this.getAvailableWorkers();
        const availableJobs = this.getAllAvailableJobs();

        if (availableWorkers.length === 0 || availableJobs.length === 0) return 0;

        const gs = this.gameState;
        const resources = gs?.resources || {};
        const needs = this.computeResourceNeeds();
        const hasActiveConstruction = !!(gs?.constructionManager?.constructionSites?.size > 0);

        const pop = gs?.populationManager ? gs.populationManager.getAll().length : (gs?.population?.length || 0);
        const minFarmers = Math.max(0, Math.ceil(pop / 8));
        const currentFarmers = this.countWorkersInJobType('farmer');
        const desiredBuilders = this.computeDesiredBuilders(7);
        const currentBuilders = this.countWorkersInJobType('builder');
        const desiredForemen = desiredBuilders > 0 ? Math.max(1, Math.floor(desiredBuilders / 4)) : 0;
        const currentForemen = this.countWorkersInJobType('foreman');

        const woodCap = (typeof window.GameData?.calculateSeasonalStorageCap === 'function')
            ? window.GameData.calculateSeasonalStorageCap('wood', gs?.season, gs?.buildings)
            : (window.GameData?.resourceCaps?.wood || 50);
        const woodPct = woodCap > 0 ? ((resources.wood || 0) / woodCap) : 0;

        const scoredJobs = availableJobs.map(job => {
            let score = 0;

            // ── Scoring: every building job >= +5 floor, gatherer = +1 (lowest) ──

            if (job.jobType === 'farmer') {
                score += 5 + needs.foodUrgency * 10;
                if (currentFarmers < minFarmers) score += 15;
            }
            else if (job.jobType === 'hunter') {
                score += 5 + needs.foodUrgency * 8;
            }
            else if (job.jobType === 'gatherer') {
                // Gatherer is the fallback — lowest score of any real job
                score += 1 + needs.basicUrgency * 2;
            }
            else if (job.jobType === 'woodcutter') {
                score += 5 + needs.woodUrgency * 6;
            }
            else if (job.jobType === 'rockcutter' || job.jobType === 'miner') {
                score += 5 + needs.stoneUrgency * 4;
            }
            else if (job.jobType === 'sawyer') {
                score += 5;
                if (woodPct >= 0.4) score += 6;
                score += ((resources.wood || 0) >= 5 ? 2 : 0);
                score += needs.planksUrgency * 3;
                if ((resources.wood || 0) < 3) score -= 15;
            }
            else if (job.jobType === 'blacksmith') {
                score += 5 + needs.weaponsUrgency * 2 + needs.toolsUrgency * 2;
                if ((resources.metal || 0) < 2) score -= 10;
            }
            else if (job.jobType === 'trader') {
                score += 5 + needs.goldUrgency * 1.5;
            }
            else if (job.jobType === 'engineer') {
                score += 5 + needs.productionUrgency * 1;
            }
            else if (job.jobType === 'builder') {
                if (hasActiveConstruction) score += 8;
                else score -= 10;
            }
            else if (job.jobType === 'foreman') {
                score += hasActiveConstruction ? 6 : -20;
            }
            // Military/academic: soft penalty instead of hard block
            else if (['drillInstructor', 'militaryTheorist', 'professor', 'scholar', 'wizard', 'priest'].includes(job.jobType)) {
                score -= 5;
            }

            // Soft caps for builder/foreman
            if (job.jobType === 'builder' && desiredBuilders > 0 && currentBuilders >= desiredBuilders) score -= 30;
            if (job.jobType === 'foreman' && currentForemen >= desiredForemen) score -= 30;

            return { ...job, score };
        });

        scoredJobs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.jobType === 'builder' && b.jobType !== 'builder') return -1;
            if (b.jobType === 'builder' && a.jobType !== 'builder') return 1;
            return 0;
        });

        let assignedCount = 0;
        for (const job of scoredJobs) {
            if (availableWorkers.length === 0) break;
            if (job.jobType === 'sawyer' && (resources.wood || 0) < 3) continue;
            if (job.jobType === 'builder' && desiredBuilders > 0 && this.countWorkersInJobType('builder') >= desiredBuilders) continue;
            if (job.jobType === 'foreman' && desiredForemen > 0 && this.countWorkersInJobType('foreman') >= desiredForemen) continue;

            let slotsToFill = Math.min(job.availableSlots, availableWorkers.length);
            for (let i = 0; i < slotsToFill; i++) {
                if (availableWorkers.length === 0) break;
                const bestIdx = this.pickBestWorkerIndexForJob(availableWorkers, job.jobType);
                const [chosen] = bestIdx >= 0 ? availableWorkers.splice(bestIdx, 1) : [availableWorkers.shift()];
                if (chosen && this.assignWorkerToJob(chosen.id, job.buildingId, job.jobType)) {
                    assignedCount++;
                }
            }
        }
        if (assignedCount > 0) this.debugLog(`Auto-assigned ${assignedCount} workers`);
        return assignedCount;
    }

    optimizeWorkerAssignments() {
        const gs = this.gameState;
        const res = gs?.resources || {};
        const needs = this.computeResourceNeeds();
        const hasActiveConstruction = !!(gs?.constructionManager?.constructionSites?.size > 0);

        // Release all builders/foremen when idle
        if (!hasActiveConstruction) {
            this.releaseWorkersFromJobType('builder', Infinity);
            this.releaseWorkersFromJobType('foreman', Infinity);
        } else {
            const desired = this.computeDesiredBuilders(7);
            const current = this.countWorkersInJobType('builder');
            const needed = Math.max(0, desired - current);
            if (needed > 0) this.releaseWorkersFromJobType('gatherer', needed);
        }

        if ((res.wood || 0) < 3) this.releaseWorkersFromJobType('sawyer', Infinity);

        if (needs.foodUrgency > 1.0) {
            ['trader', 'rockcutter', 'miner', 'blacksmith', 'engineer'].forEach(j =>
                this.releaseWorkersFromJobType(j, Math.ceil(needs.foodUrgency))
            );
        }
    }

    releaseWorkersFromJobType(jobType, maxToRelease = Infinity) {
        let released = 0;
        const slots = this.getSlotsByJobType(jobType).filter(s => s.get('isOccupied'));
        for (const slot of slots) {
            if (released >= maxToRelease) break;
            const wid = slot.get('workerId');
            slot.unassign();
            const worker = this.getWorkerById(wid);
            if (worker) { worker.jobAssignment = null; worker.status = 'idle'; }
            released++;
        }
        if (released > 0) this.debugLog(`Released ${released} ${jobType} workers`);
        return released;
    }

    maximizeBuilderAssignments() {
        this.updateAvailableSlots();
        let missing = this.getMissingSlotsForJobType('builder');
        if (missing <= 0) return 0;

        const releaseOrder = [
            'trader', 'engineer', 'blacksmith', 'wizard', 'professor', 'scholar',
            'drillInstructor', 'militaryTheorist', 'sawyer', 'gatherer', 'miner',
            'rockcutter', 'woodcutter', 'farmer'
        ];
        for (const jt of releaseOrder) {
            if (missing <= 0) break;
            missing -= this.releaseWorkersFromJobType(jt, missing);
        }
        return this.fillAllBuilders();
    }

    fillAllBuilders() {
        this.updateAvailableSlots();
        const vacantBuilder = this.getSlotsByJobType('builder').filter(s => !s.get('isOccupied'));
        if (vacantBuilder.length === 0) return 0;

        const available = this.getAvailableWorkers();
        let assigned = 0;
        for (const slot of vacantBuilder) {
            if (available.length === 0) break;
            const bestIdx = this.pickBestWorkerIndexForJob(available, 'builder');
            const [chosen] = bestIdx >= 0 ? available.splice(bestIdx, 1) : [available.shift()];
            if (chosen) {
                slot.assign(chosen.id);
                const worker = this.getWorkerById(chosen.id);
                if (worker) {
                    worker.jobAssignment = { buildingId: slot.get('buildingId'), jobType: 'builder', assignedDay: this.gameState?.currentDay || 0 };
                    worker.status = 'working';
                }
                assigned++;
            }
        }
        return assigned;
    }

    computeDesiredBuilders(targetDays = 7) {
        const cm = this.gameState?.constructionManager;
        if (!cm?.constructionSites?.size) return 0;
        let target = null;
        for (const [, site] of cm.constructionSites) { if (site.pointsRemaining > 0) { target = site; break; } }
        if (!target || target.pointsRemaining <= 0) return 0;
        const desired = Math.max(1, Math.ceil(target.pointsRemaining / targetDays));
        return Math.min(desired, this.getTotalJobCapacityByType('builder'));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  RESOURCE NEEDS HEURISTIC
    // ═══════════════════════════════════════════════════════════════════════

    computeResourceNeeds() {
        const gs = this.gameState;
        const res = gs?.resources || {};
        const caps = window.GameData?.resourceCaps || {};
        const pop = gs?.populationManager ? gs.populationManager.getAll().length : (gs?.population?.length || 0);
        const dailyFoodUse = pop;
        const food = res.food || 0;

        const foodDays = dailyFoodUse > 0 ? food / dailyFoodUse : Infinity;
        const foodUrgency = Math.max(0, 3 - foodDays);

        const woodUrgency = this._capUrgency(res.wood || 0, caps.wood || 50);
        const stoneUrgency = this._capUrgency(res.stone || 0, caps.stone || 50);
        const basicUrgency = Math.max(woodUrgency, stoneUrgency) * 0.5 + foodUrgency * 0.5;
        const metalUrgency = this._capUrgency(res.metal || 0, caps.metal || 50);
        const planksUrgency = this._capUrgency(res.planks || 0, caps.planks || 50) * 0.6 + woodUrgency * 0.4;
        const weaponsUrgency = this._capUrgency(res.weapons || 0, caps.weapons || 50) * 0.6 + metalUrgency * 0.4;
        const toolsUrgency = this._capUrgency(res.tools || 0, caps.tools || 50) * 0.5;
        const goldUrgency = this._capUrgency(res.gold || 0, caps.gold || 100) * 0.3;
        const productionUrgency = 0.1;

        return { foodUrgency, woodUrgency, stoneUrgency, basicUrgency, planksUrgency, metalUrgency, weaponsUrgency, toolsUrgency, goldUrgency, productionUrgency };
    }

    _capUrgency(current, cap) { return cap <= 0 ? 0 : Math.max(0, 1 - current / cap); }

    // ═══════════════════════════════════════════════════════════════════════
    //  PRODUCTION CALCULATION
    // ═══════════════════════════════════════════════════════════════════════

    // Maps jobType → tech bonus key for production multipliers
    static TECH_BONUS_MAP = {
        farmer: 'farmProduction',
        rockcutter: 'quarryProduction',
        woodcutter: 'woodcutterProduction',
        sawyer: 'lumberMillProduction',
        miner: 'mineProduction',
        blacksmith: 'blacksmithEfficiency'
    };

    _getTechMultiplier(jobType) {
        const key = JobRegistry.TECH_BONUS_MAP[jobType];
        if (!key) return 1;
        const bonus = this.gameState?.techBonuses?.[key] || 0;
        return 1 + bonus;
    }

    /**
     * Get terrain-based production multiplier for a specific resource at a building.
     * Returns 1 + bonus (e.g. 1.30 for a 30% bonus).
     */
    _getTerrainMultiplier(buildingId, resourceType) {
        const building = (this.gameState?.buildings || []).find(b => b.id === buildingId);
        if (!building?.terrain) return 1;
        const terrainEntry = this.TERRAIN_BONUSES[building.terrain];
        if (!terrainEntry) return 1;
        const buildingBonus = terrainEntry[building.type] || terrainEntry._default;
        if (!buildingBonus) return 1;
        return 1 + (buildingBonus[resourceType] || 0);
    }

    /**
     * Get seasonal multiplier for a job type.
     * Uses per-job seasonal modifiers from JOB_DATA if available,
     * otherwise falls back to the global GameData.seasonMultipliers for the resource.
     */
    _getSeasonalMultiplier(jobType, resourceType) {
        const season = this.gameState?.season || 'Spring';
        // Check for job-specific seasonal modifiers first
        const jobDef = window.JOB_DATA?.[jobType];
        if (jobDef?.seasonalModifiers?.[season] !== undefined) {
            return jobDef.seasonalModifiers[season];
        }
        // Fall back to global resource-based seasonal multipliers
        try {
            const mults = window.GameData?.seasonMultipliers?.[season];
            if (mults?.[resourceType]) return mults[resourceType];
        } catch (_) {}
        return 1.0;
    }

    calculateDailyProduction() {
        const production = { food: 0, wood: 0, stone: 0, metal: 0, planks: 0, weapons: 0, tools: 0, gold: 0, production: 0 };

        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const jobType = slot.get('jobType');
            const worker = this.getWorkerById(wid);
            if (!worker) continue;

            const workerEff = this.calculateWorkerEfficiency(worker, jobType);
            const efficiency = this._jobEfficiency[jobType] || {};
            const bid = slot.get('buildingId');

            if (jobType === 'gatherer') {
                // RNG: pick one of food/wood/stone
                const choice = ['food', 'wood', 'stone'][Math.floor(Math.random() * 3)];
                const seasonMult = this._getSeasonalMultiplier(jobType, choice);
                production[choice] += 1 * workerEff * seasonMult;
            } else {
                const techMult = this._getTechMultiplier(jobType);
                Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                    if (!(resourceType in production)) return;
                    const seasonMult = baseAmount > 0 ? this._getSeasonalMultiplier(jobType, resourceType) : 1.0;
                    // Apply tech bonus only to positive production (not consumption)
                    const mult = baseAmount > 0 ? techMult : 1;
                    const terrainMult = baseAmount > 0 ? this._getTerrainMultiplier(bid, resourceType) : 1;
                    production[resourceType] += baseAmount * workerEff * seasonMult * mult * terrainMult;
                });
            }
        }
        return production;
    }

    calculateDetailedDailyProduction() {
        this.cleanupInvalidAssignments();

        const production = { food: 0, wood: 0, stone: 0, metal: 0, planks: 0, weapons: 0, tools: 0, gold: 0, production: 0 };
        const sources = {};
        const workerCounts = { food: 0, wood: 0, stone: 0, metal: 0, planks: 0, weapons: 0, tools: 0, gold: 0, production: 0 };
        const breakdown = {};
        Object.keys(production).forEach(r => { breakdown[r] = { income: [], expense: [] }; sources[r] = []; });

        // Aggregate by jobType
        const jobAgg = {};

        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const jobType = slot.get('jobType');
            const bid = slot.get('buildingId');
            const worker = this.getWorkerById(wid);
            if (!worker) continue;

            const workerEff = this.calculateWorkerEfficiency(worker, jobType);
            const efficiency = this._jobEfficiency[jobType] || {};

            // Building-level efficiency multiplier
            let buildingMult = 1.0;
            try {
                const building = (this.gameState?.buildings || []).find(b => b.id === bid);
                if (building) {
                    if (typeof building.efficiencyMultiplier === 'number') buildingMult = building.efficiencyMultiplier;
                    else if (window.effectsManager?.getBuildingEfficiencyMultiplier) buildingMult = window.effectsManager.getBuildingEfficiencyMultiplier(building.type, building.id);
                }
            } catch (_) {}

            if (!jobAgg[jobType]) jobAgg[jobType] = { workers: 0, resources: {} };
            jobAgg[jobType].workers++;

            const techMult = this._getTechMultiplier(jobType);
            Object.entries(efficiency).forEach(([rt, base]) => {
                if (!(rt in production)) return;
                const seasonMult = base > 0 ? this._getSeasonalMultiplier(jobType, rt) : 1.0;
                // Apply tech bonus only to positive production (not consumption)
                const mult = base > 0 ? techMult : 1;
                const terrainMult = base > 0 ? this._getTerrainMultiplier(bid, rt) : 1;
                const gen = base * workerEff * seasonMult * buildingMult * mult * terrainMult;
                production[rt] += gen;
                if (gen > 0) workerCounts[rt]++;
                jobAgg[jobType].resources[rt] = (jobAgg[jobType].resources[rt] || 0) + gen;
            });
        }

        // Build breakdown lines
        const fmt = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Job';
        Object.entries(jobAgg).forEach(([jt, data]) => {
            const label = `${fmt(jt)} (${data.workers} worker${data.workers === 1 ? '' : 's'})`;
            Object.entries(data.resources).forEach(([rt, total]) => {
                if (!total || !breakdown[rt]) return;
                const line = { label, workers: data.workers, amount: Number(total.toFixed(2)) };
                if (total >= 0) breakdown[rt].income.push(line);
                else breakdown[rt].expense.push(line);
            });
        });

        // Population upkeep
        try {
            const pop = this.gameState?.population ?? (this.gameState?.populationManager?.population?.length || 0);
            if (pop > 0) breakdown.food.expense.push({ label: 'Population Upkeep', workers: pop, amount: -pop });
        } catch (_) {}

        return { production, sources, workerCounts, breakdown };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  BUILDING WORKER SYNC
    // ═══════════════════════════════════════════════════════════════════════

    syncBuildingWorkers() {
        const buildings = this.gameState?.buildings;
        if (!buildings) return;
        buildings.forEach(b => { b.workers = []; });

        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const bid = slot.get('buildingId');
            if (bid === 'global') continue;
            const building = buildings.find(b => b.id === bid);
            if (building) building.workers.push(wid);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  STATS & SUMMARIES
    // ═══════════════════════════════════════════════════════════════════════

    getTotalJobCapacity() {
        return this._slots.all().length;
    }

    getTotalJobCapacityByType(jobType) {
        return this.getSlotsByJobType(jobType).length;
    }

    getMissingSlotsForJobType(jobType) {
        return Math.max(0, this.getTotalJobCapacityByType(jobType) - this.countWorkersInJobType(jobType));
    }

    countWorkersInJobType(jobType) {
        return this.getSlotsByJobType(jobType).filter(s => s.get('isOccupied')).length;
    }

    getTotalAssignedWorkers() {
        return this._slots.filter(s => s.get('isOccupied')).length;
    }

    getAllAvailableJobs() {
        const avail = this.availableJobs; // computed Map
        const jobs = [];
        avail.forEach((jobTypes, buildingId) => {
            const gs = this.gameState;
            let building = null;
            if (buildingId !== 'global') building = gs?.buildings?.find(b => b.id === buildingId);

            Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                const currentWorkers = this.getWorkersInJob(buildingId, jobType).length;
                const availableSlots = maxWorkers - currentWorkers;
                if (availableSlots <= 0) return;
                jobs.push({
                    buildingId,
                    buildingType: building ? building.type : 'village',
                    buildingIcon: building ? (window.GameData?.buildingInfo?.[building.type]?.icon || '🏢') : '🏘️',
                    jobType,
                    availableSlots,
                    maxWorkers,
                    currentWorkers,
                    position: building ? { x: building.x, y: building.y } : { x: 0, y: 0 },
                    isGlobal: buildingId === 'global'
                });
            });
        });
        return jobs.sort((a, b) => {
            if (a.jobType === 'builder' && b.jobType !== 'builder') return -1;
            if (b.jobType === 'builder' && a.jobType !== 'builder') return 1;
            return (a.buildingType || '').localeCompare(b.buildingType || '');
        });
    }

    getJobSummary() {
        const summary = { totalJobs: 0, totalWorkers: 0, jobTypes: {}, buildings: {} };
        const avail = this.availableJobs;

        avail.forEach((jobTypes, buildingId) => {
            const gs = this.gameState;
            const building = buildingId !== 'global' ? gs?.buildings?.find(b => b.id === buildingId) : null;

            summary.buildings[buildingId] = {
                type: building ? building.type : 'village',
                position: building ? { x: building.x, y: building.y } : { x: 0, y: 0 },
                jobs: {}
            };

            Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                const current = this.getWorkersInJob(buildingId, jobType).length;
                summary.totalJobs += maxWorkers;
                summary.totalWorkers += current;
                if (!summary.jobTypes[jobType]) summary.jobTypes[jobType] = { available: 0, filled: 0 };
                summary.jobTypes[jobType].available += maxWorkers;
                summary.jobTypes[jobType].filled += current;
                summary.buildings[buildingId].jobs[jobType] = { current, max: maxWorkers };
            });
        });
        return summary;
    }

    getWorkerStats() {
        const gs = this.gameState;
        const allPop = gs?.populationManager?.population || gs?.population || [];
        const eligible = allPop.filter(p => {
            if (!p) return false;
            if ((p.age || 0) < 16 || (p.age || 0) > 120) return false;
            if ((p.health || 100) < 30) return false;
            if (p.role === 'player' || p.role === 'monarch' || p.role === 'royal') return false;
            try { const m = gs?.royalFamily?.currentMonarch; if (m?.isGoverning && p.id === m.id) return false; } catch (_) {}
            if (p.status === 'drafted' || p.status === 'away' || p.status === 'traveling') return false;
            return true;
        });
        const assigned = this.getTotalAssignedWorkers();
        const total = eligible.length;
        return { total, assigned: Math.min(assigned, total), idle: Math.max(0, total - assigned) };
    }

    getJobDistributionStats() {
        const stats = { jobCounts: {}, experienceLevels: {}, totalWorkers: 0 };
        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const jt = slot.get('jobType');
            if (!stats.jobCounts[jt]) {
                stats.jobCounts[jt] = 0;
                stats.experienceLevels[jt] = { novice: 0, apprentice: 0, journeyman: 0, expert: 0, master: 0 };
            }
            const worker = this.getWorkerById(wid);
            if (!worker) continue;
            stats.jobCounts[jt]++;
            stats.totalWorkers++;
            let maxXP = 0;
            (this.getRelevantSkillsForJob(jt) || []).forEach(sn => {
                const xp = worker.experience?.[sn] || 0;
                if (xp > maxXP) maxXP = xp;
            });
            stats.experienceLevels[jt][this.getSkillLevelFromXP(maxXP)]++;
        }
        return stats;
    }

    getRelevantSkillsForJob(jobType) { return this._skillMapping[jobType] || []; }

    getSkillLevelFromXP(xp) {
        if (xp >= 1001) return 'master';
        if (xp >= 601) return 'expert';
        if (xp >= 301) return 'journeyman';
        if (xp >= 101) return 'apprentice';
        return 'novice';
    }

    getEmploymentStats() {
        const all = this._slots.all();
        const occ = all.filter(s => s.get('isOccupied'));
        return { totalSlots: all.length, filledSlots: occ.length, vacantSlots: all.length - occ.length,
            employmentRate: all.length > 0 ? Math.round(occ.length / all.length * 100) : 0 };
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  CLEANUP / MISC
    // ═══════════════════════════════════════════════════════════════════════

    cleanupInvalidAssignments() {
        const gs = this.gameState;
        if (!gs) return;
        const validIds = new Set((gs.buildings || []).map(b => b.id));
        validIds.add('global');
        const toRemove = [];
        for (const slot of this._slots.all()) {
            if (!validIds.has(slot.get('buildingId'))) {
                const wid = slot.get('workerId');
                if (wid) { const w = this.getWorkerById(wid); if (w) { w.jobAssignment = null; w.status = 'idle'; } }
                toRemove.push(slot.id);
            }
        }
        toRemove.forEach(id => this._slots.remove(id));
    }

    onBuildingCompleted(buildingId) {
        this.autoAssignWorkers();
        if (typeof village !== 'undefined' && village?.updateWorkerAssignments) village.updateWorkerAssignments();
    }

    releaseExcessWorkers() { /* no-op compat shim */ }

    /** @deprecated compat shim — called as updateAvailableJobs() by legacy callers */
    updateAvailableJobs() { this.updateAvailableSlots(); }

    // ═══════════════════════════════════════════════════════════════════════
    //  SERIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    serialize() {
        // Output same shape as old JobManager for backward compat
        return {
            jobAssignments: Object.fromEntries(this.jobAssignments),
            availableJobs: Object.fromEntries(this.availableJobs)
        };
    }

    deserialize(data) {
        if (!data) return;
        console.log('[JobRegistry] Deserializing from save data');

        // If old-format save (jobAssignments Map), rebuild slots from it
        if (data.jobAssignments) {
            // Clear existing occupant data so we can restore
            for (const slot of this._slots.all()) { slot.set('workerId', null); }

            // Ensure we have the right slots by rescanning buildings
            this.updateAvailableSlots();

            // Now restore assignments
            const assignments = data.jobAssignments;
            Object.entries(assignments).forEach(([buildingId, jobTypes]) => {
                Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                    if (!Array.isArray(workerIds)) return;
                    workerIds.forEach(workerId => {
                        // Find a vacant slot at this building for this jobType
                        const slot = this._slots.find(s =>
                            s.get('buildingId') === buildingId &&
                            s.get('jobType') === jobType &&
                            !s.get('isOccupied')
                        );
                        if (slot) slot.set('workerId', workerId);
                    });
                });
            });
        }

        this.syncPopulationJobAssignments();
    }

    syncPopulationJobAssignments() {
        const gs = this.gameState;
        if (!gs?.populationManager) return;
        const allPeople = gs.populationManager.getAll();

        // Clear all existing
        allPeople.forEach(p => { if (p.jobAssignment) delete p.jobAssignment; });

        // Restore from slots
        let restored = 0;
        for (const slot of this._slots.all()) {
            const wid = slot.get('workerId');
            if (!wid) continue;
            const person = allPeople.find(p => p.id === wid);
            if (person) {
                person.jobAssignment = { buildingId: slot.get('buildingId'), jobType: slot.get('jobType'), assignedAt: Date.now() };
                restored++;
            } else {
                // Worker no longer exists — clear slot
                slot.set('workerId', null);
            }
        }
        this.debugLog(`Restored ${restored} worker job assignments from save`);
    }

    toJSON() { return this.serialize(); }
    fromJSON(data) { this.deserialize(data); }

    // ── Debug ──

    debugJobSystem() {
        console.log('=== JOB SYSTEM DEBUG ===');
        console.log('Available jobs:', Object.fromEntries(this.availableJobs));
        console.log('Assignments:', Object.fromEntries(this.jobAssignments));
        const production = this.calculateDailyProduction();
        console.log('Production:', production);
        console.log('========================');
        return { availableJobs: Object.fromEntries(this.availableJobs), jobAssignments: Object.fromEntries(this.jobAssignments), production };
    }

    /** Alias used by old reactive callers */
    calculateTotalProduction(season) { return this.calculateDailyProduction(); }
    calculateTotalConsumption() {
        const totals = {};
        for (const slot of this._slots.all()) {
            if (!slot.get('isOccupied')) continue;
            const jd = slot.get('jobDefinition');
            if (!jd) continue;
            const worker = this.getWorkerById(slot.get('workerId')) || {};
            const cons = jd.calculateConsumption(worker);
            for (const [r, a] of Object.entries(cons)) totals[r] = (totals[r] || 0) + a;
        }
        return totals;
    }
}

// ── Export ──
window.JobDefinition = JobDefinition;
window.JobSlot = JobSlot;
window.JobRegistry = new JobRegistry();

console.log('[JobModel] Unified job system loaded');

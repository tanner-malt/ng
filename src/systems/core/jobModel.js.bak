/**
 * jobModel.js - Job System Data Model
 * 
 * Jobs connect workers to buildings and determine resource production.
 * This model provides:
 * - Job definitions (what each job produces/consumes)
 * - Job slots (available positions per building)
 * - Worker assignments with events
 * 
 * Usage:
 *   const job = JobRegistry.get('farmer');
 *   job.get('production'); // { food: 3.5 }
 */

/**
 * JobDefinition - Defines a job type
 */
class JobDefinition extends DataModel {
    static SCHEMA = {
        name: { default: 'Unknown Job' },
        label: { default: 'Worker' },
        icon: { default: '👷' },
        description: { default: 'A job' },
        buildingType: { default: null }, // Which building this job is at
        
        // What this job produces per day per worker
        production: { default: {} },
        
        // What this job consumes per day per worker
        consumption: { default: {} },
        
        // Skill required for this job
        requiredSkill: { default: null },
        
        // Skill gained while working this job
        skillGained: { default: null },
        
        // Base efficiency (can be modified by skills, equipment)
        baseEfficiency: { default: 1.0 },
        
        // Seasonal modifiers (which seasons affect this job)
        seasonalModifiers: { default: {} }
    };

    constructor(id, data = {}) {
        super('jobDef', id, JobDefinition.SCHEMA, data);

        // Computed: formatted production text
        this.defineComputed('productionText', () => {
            const prod = this.get('production') || {};
            return Object.entries(prod)
                .map(([resource, amount]) => `${amount} ${resource}/day`)
                .join(', ') || 'None';
        });
    }

    /**
     * Calculate actual production for a worker
     * @param {object} worker - Worker data
     * @param {string} season - Current season
     * @returns {object} Resource production amounts
     */
    calculateProduction(worker = {}, season = 'Spring') {
        const baseProduction = this.get('production') || {};
        const seasonMods = this.get('seasonalModifiers') || {};
        const efficiency = this.get('baseEfficiency');

        const result = {};
        for (const [resource, amount] of Object.entries(baseProduction)) {
            let finalAmount = amount * efficiency;
            
            // Apply seasonal modifier if applicable
            if (seasonMods[season]) {
                finalAmount *= seasonMods[season];
            } else if (window.GameData?.seasonMultipliers?.[season]?.[resource]) {
                finalAmount *= window.GameData.seasonMultipliers[season][resource];
            }

            // Apply worker skill bonus if available
            const skillRequired = this.get('requiredSkill');
            if (skillRequired && worker.skills) {
                const skill = worker.skills.find(s => s.type === skillRequired);
                if (skill) {
                    // 10% bonus per skill level
                    finalAmount *= (1 + (skill.level * 0.1));
                }
            }

            result[resource] = finalAmount;
        }

        return result;
    }

    /**
     * Calculate consumption for a worker
     * @param {object} worker - Worker data
     * @returns {object} Resource consumption amounts
     */
    calculateConsumption(worker = {}) {
        const baseConsumption = this.get('consumption') || {};
        const result = {};
        
        for (const [resource, amount] of Object.entries(baseConsumption)) {
            result[resource] = amount;
        }
        
        return result;
    }
}


/**
 * JobSlot - An available job position at a building
 */
class JobSlot extends DataModel {
    static SCHEMA = {
        buildingId: { default: null },
        jobType: { default: null },
        workerId: { default: null },
        slotIndex: { default: 0 }
    };

    constructor(id, data = {}) {
        super('jobSlot', id, JobSlot.SCHEMA, data);

        this.defineComputed('isOccupied', () => {
            return this.get('workerId') !== null;
        });

        this.defineComputed('jobDefinition', () => {
            return window.JobRegistry?.get(this.get('jobType'));
        });
    }

    /**
     * Assign a worker to this slot
     * @param {string} workerId - Worker ID
     * @returns {boolean} True if assignment successful
     */
    assign(workerId) {
        if (this.get('isOccupied')) {
            console.warn('[JobSlot] Slot already occupied');
            return false;
        }

        this.set('workerId', workerId);
        
        if (window.eventBus) {
            window.eventBus.emit('job:assigned', {
                slot: this,
                workerId,
                jobType: this.get('jobType'),
                buildingId: this.get('buildingId')
            });
        }

        return true;
    }

    /**
     * Remove worker from this slot
     * @returns {string|null} Removed worker ID
     */
    unassign() {
        const workerId = this.get('workerId');
        if (!workerId) return null;

        this.set('workerId', null);

        if (window.eventBus) {
            window.eventBus.emit('job:unassigned', {
                slot: this,
                workerId,
                jobType: this.get('jobType'),
                buildingId: this.get('buildingId')
            });
        }

        return workerId;
    }
}


/**
 * JobRegistry - Manages job definitions and allocations
 */
class JobRegistry {
    constructor() {
        this._definitions = new Map();
        this._slots = new CollectionModel('jobSlots', JobSlot);
        this._initialized = false;

        console.log('[JobRegistry] Created');
    }

    /**
     * Initialize with job definitions
     * @param {object} jobData - Job configuration from GameData
     */
    initialize(jobData) {
        if (this._initialized) {
            console.warn('[JobRegistry] Already initialized');
            return;
        }

        console.log('[JobRegistry] Initializing jobs...');

        for (const [id, data] of Object.entries(jobData)) {
            this.registerJob(id, data);
        }

        this._initialized = true;
        console.log(`[JobRegistry] Initialized with ${this._definitions.size} job types`);

        // Subscribe to building events
        if (window.eventBus) {
            window.eventBus.on('building:completed', (data) => {
                this.createSlotsForBuilding(data.building);
            });
        }
    }

    /**
     * Register a job definition
     * @param {string} id - Job type ID
     * @param {object} data - Job configuration
     * @returns {JobDefinition}
     */
    registerJob(id, data) {
        const job = new JobDefinition(id, { ...data, id });
        this._definitions.set(id, job);
        return job;
    }

    /**
     * Get a job definition
     * @param {string} id - Job type ID
     * @returns {JobDefinition}
     */
    get(id) {
        return this._definitions.get(id);
    }

    /**
     * Get all job definitions
     * @returns {JobDefinition[]}
     */
    all() {
        return Array.from(this._definitions.values());
    }

    /**
     * Create job slots for a building based on its definition
     * @param {object} building - Building instance or data
     */
    createSlotsForBuilding(building) {
        const buildingId = building.id || building._id;
        const buildingType = building.type || building.get?.('type');
        
        // Get job configuration from building definition
        const buildingDef = window.BuildingRegistry?.getDefinition(buildingType);
        if (!buildingDef) {
            console.warn(`[JobRegistry] No definition for building type: ${buildingType}`);
            return;
        }

        const production = buildingDef.get('production') || {};
        const jobs = production.jobs || {};

        let slotIndex = 0;
        for (const [jobType, count] of Object.entries(jobs)) {
            for (let i = 0; i < count; i++) {
                const slotId = `${buildingId}_${jobType}_${slotIndex}`;
                const slot = new JobSlot(slotId, {
                    id: slotId,
                    buildingId,
                    jobType,
                    slotIndex
                });
                this._slots.add(slot);
                slotIndex++;
            }
        }

        console.log(`[JobRegistry] Created ${slotIndex} job slots for ${buildingType}`);
    }

    /**
     * Get all job slots for a building
     * @param {string} buildingId - Building ID
     * @returns {JobSlot[]}
     */
    getSlotsForBuilding(buildingId) {
        return this._slots.filter(slot => slot.get('buildingId') === buildingId);
    }

    /**
     * Get vacant slots for a building
     * @param {string} buildingId - Building ID
     * @returns {JobSlot[]}
     */
    getVacantSlotsForBuilding(buildingId) {
        return this.getSlotsForBuilding(buildingId)
            .filter(slot => !slot.get('isOccupied'));
    }

    /**
     * Get all vacant slots
     * @returns {JobSlot[]}
     */
    getAllVacantSlots() {
        return this._slots.filter(slot => !slot.get('isOccupied'));
    }

    /**
     * Get slots for a specific job type
     * @param {string} jobType - Job type ID
     * @returns {JobSlot[]}
     */
    getSlotsByJobType(jobType) {
        return this._slots.filter(slot => slot.get('jobType') === jobType);
    }

    /**
     * Find slot with a specific worker
     * @param {string} workerId - Worker ID
     * @returns {JobSlot|undefined}
     */
    findSlotByWorker(workerId) {
        return this._slots.find(slot => slot.get('workerId') === workerId);
    }

    /**
     * Assign worker to best available slot
     * @param {string} workerId - Worker ID
     * @param {string} preferredJobType - Preferred job type (optional)
     * @returns {JobSlot|null} Assigned slot or null
     */
    assignWorker(workerId, preferredJobType = null) {
        // First try preferred job type
        if (preferredJobType) {
            const preferredSlots = this.getSlotsByJobType(preferredJobType)
                .filter(slot => !slot.get('isOccupied'));
            if (preferredSlots.length > 0) {
                preferredSlots[0].assign(workerId);
                return preferredSlots[0];
            }
        }

        // Otherwise find any vacant slot
        const vacantSlots = this.getAllVacantSlots();
        if (vacantSlots.length > 0) {
            vacantSlots[0].assign(workerId);
            return vacantSlots[0];
        }

        return null;
    }

    /**
     * Unassign a worker from their current job
     * @param {string} workerId - Worker ID
     * @returns {boolean} True if worker was unassigned
     */
    unassignWorker(workerId) {
        const slot = this.findSlotByWorker(workerId);
        if (slot) {
            slot.unassign();
            return true;
        }
        return false;
    }

    /**
     * Calculate total production across all workers
     * @param {string} season - Current season
     * @returns {object} Resource totals
     */
    calculateTotalProduction(season = 'Spring') {
        const totals = {};

        for (const slot of this._slots.all()) {
            if (!slot.get('isOccupied')) continue;

            const jobDef = slot.get('jobDefinition');
            if (!jobDef) continue;

            // Get worker data if available
            const workerId = slot.get('workerId');
            const worker = window.gameState?.populationManager?.getPersonById?.(workerId) || {};

            const production = jobDef.calculateProduction(worker, season);
            for (const [resource, amount] of Object.entries(production)) {
                totals[resource] = (totals[resource] || 0) + amount;
            }
        }

        return totals;
    }

    /**
     * Calculate total consumption across all workers
     * @returns {object} Resource totals
     */
    calculateTotalConsumption() {
        const totals = {};

        for (const slot of this._slots.all()) {
            if (!slot.get('isOccupied')) continue;

            const jobDef = slot.get('jobDefinition');
            if (!jobDef) continue;

            const workerId = slot.get('workerId');
            const worker = window.gameState?.populationManager?.getPersonById?.(workerId) || {};

            const consumption = jobDef.calculateConsumption(worker);
            for (const [resource, amount] of Object.entries(consumption)) {
                totals[resource] = (totals[resource] || 0) + amount;
            }
        }

        return totals;
    }

    /**
     * Get employment statistics
     * @returns {object} Employment info
     */
    getEmploymentStats() {
        const allSlots = this._slots.all();
        const occupied = allSlots.filter(s => s.get('isOccupied'));
        
        return {
            totalSlots: allSlots.length,
            filledSlots: occupied.length,
            vacantSlots: allSlots.length - occupied.length,
            employmentRate: allSlots.length > 0 
                ? Math.round((occupied.length / allSlots.length) * 100) 
                : 0
        };
    }

    /**
     * Serialize for save
     * @returns {object}
     */
    toJSON() {
        return {
            slots: this._slots.toJSON()
        };
    }

    /**
     * Load from saved data
     * @param {object} data - Saved data
     */
    fromJSON(data) {
        if (data.slots) {
            for (const slotData of data.slots) {
                const slot = new JobSlot(slotData.id, slotData);
                this._slots.add(slot);
            }
        }
    }
}

// Export
window.JobDefinition = JobDefinition;
window.JobSlot = JobSlot;
window.JobRegistry = new JobRegistry();

console.log('[JobModel] Job model system loaded');

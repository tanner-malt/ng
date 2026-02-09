// Job-Based Resource Production System
// Manages worker assignments to buildings and calculates resource production based on jobs

class JobManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.jobAssignments = new Map(); // buildingId -> { jobType -> [workerIds] }
        this.availableJobs = new Map(); // buildingId -> { jobType -> maxWorkers }
        this.jobEfficiency = new Map(); // Define base efficiency for each job type
        
        // Debug mode - set to true for verbose logging
        this.debugMode = false;

        this.initializeJobEfficiency();
    }
    
    // Helper for debug logging
    debugLog(...args) {
        if (this.debugMode) {
            console.log('[JobManager]', ...args);
        }
    }

    initializeJobEfficiency() {
        // Base efficiency rates for different job types
        // Each worker in these jobs produces these amounts per day
        // Farmers baseline food per day
        this.jobEfficiency.set('farmer', { food: 3.75 }); // From farms (was 3.5)
        this.jobEfficiency.set('woodcutter', { wood: 3 }); // From woodcutter lodges
        this.jobEfficiency.set('builder', { construction: 1 }); // From builder huts
        // Gatherers now produce a random basic resource each day (food OR wood OR stone)
        // We leave efficiency blank and handle via RNG in calculateDailyProduction
        this.jobEfficiency.set('gatherer', {}); // From storehouses
        // Sawyer produces planks from wood
        this.jobEfficiency.set('sawyer', { planks: 2, wood: -2 }); // From lumber mills - plank production
        // Foreman no longer contributes direct construction points; boosts builders instead
        this.jobEfficiency.set('foreman', {}); // Boost applied in ConstructionManager
        this.jobEfficiency.set('miner', { stone: 2, metal: 1 }); // From mines
        this.jobEfficiency.set('rockcutter', { stone: 3 }); // From quarries
        // Engineers now produce more production
        this.jobEfficiency.set('engineer', { production: 3 }); // From workshops
        this.jobEfficiency.set('trader', { gold: 2 }); // From markets
        // Blacksmith produces weapons and tools from metal
        this.jobEfficiency.set('blacksmith', { weapons: 1, tools: 2, metal: -1 });
        // Removed production from military/academic support roles
        this.jobEfficiency.set('drillInstructor', {}); // Organizational value (no direct resource)
        this.jobEfficiency.set('militaryTheorist', {}); // Planning value (no direct resource)
        this.jobEfficiency.set('professor', {}); // Research value (no direct resource)
        this.jobEfficiency.set('scholar', {}); // Research value (no direct resource)
        this.jobEfficiency.set('wizard', { production: 0 }); // Placeholder until magic systems
    }

    // Update available jobs based on current buildings
    updateAvailableJobs() {
        this.availableJobs.clear();

        const totalBuildings = this.gameState.buildings.length;
        let completedBuildings = 0;
        let buildingsWithJobs = 0;

        // Always provide baseline builder slots (global job - no building required)
        // This ensures players can always start construction
        const globalBuilderSlots = 4; // 4 builders available by default
        const globalGathererSlots = 2; // 2 gatherers for basic resource collection
        this.availableJobs.set('global', { 
            builder: globalBuilderSlots,
            gatherer: globalGathererSlots
        });

        this.gameState.buildings.forEach(building => {
            if (building.level > 0 && building.built) {
                completedBuildings++;
                const production = GameData.buildingProduction[building.type];
                if (production && production.jobs) {
                    // Scale job slots by building level (default: linear; hook for future strategies)
                    const scaled = {};
                    Object.entries(production.jobs).forEach(([jobType, baseSlots]) => {
                        const slots = this.computeJobSlots(baseSlots || 0, building);
                        if (slots > 0) scaled[jobType] = slots;
                    });
                    this.availableJobs.set(building.id, scaled);
                    buildingsWithJobs++;
                }
            }
        });

        this.debugLog(`Buildings: ${totalBuildings} total, ${completedBuildings} completed, ${buildingsWithJobs} provide jobs`);
        this.debugLog(`Updated available jobs: ${this.availableJobs.size} buildings with jobs (includes global)`);
    }

    // Get all available job positions
    getAllAvailableJobs() {
        const jobs = [];

        this.availableJobs.forEach((jobTypes, buildingId) => {
            // Handle global jobs (no building required)
            if (buildingId === 'global') {
                Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                    const currentWorkers = this.getWorkersInJob(buildingId, jobType).length;
                    const availableSlots = maxWorkers - currentWorkers;

                    if (availableSlots > 0) {
                        jobs.push({
                            buildingId: 'global',
                            buildingType: 'village',
                            buildingIcon: '🏘️',
                            jobType,
                            availableSlots,
                            maxWorkers,
                            currentWorkers,
                            position: { x: 0, y: 0 },
                            isGlobal: true
                        });
                    }
                });
                return;
            }

            const building = this.gameState.buildings.find(b => b.id === buildingId);
            if (!building) return;

            Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                const currentWorkers = this.getWorkersInJob(buildingId, jobType).length;
                const availableSlots = maxWorkers - currentWorkers;

                if (availableSlots > 0) {
                    jobs.push({
                        buildingId,
                        buildingType: building.type,
                        buildingIcon: GameData.buildingInfo[building.type]?.icon || '🏢',
                        jobType,
                        availableSlots,
                        maxWorkers,
                        currentWorkers,
                        position: { x: building.x, y: building.y }
                    });
                }
            });
        });

        return jobs.sort((a, b) => {
            // Priority order: builder jobs first, then production jobs
            if (a.jobType === 'builder' && b.jobType !== 'builder') return -1;
            if (b.jobType === 'builder' && a.jobType !== 'builder') return 1;
            return a.buildingType.localeCompare(b.buildingType);
        });
    }

    // Helper to compute job slots per building with configurable scaling
    computeJobSlots(baseSlots, building) {
        const level = Math.max(1, building?.level || 1);
        // Default strategy is linear scaling: baseSlots * level
        let strategy = 'linear';
        try {
            strategy = window.GameData?.jobSlotScalingStrategy || 'linear';
        } catch (_) { /* ignore */ }

        switch (strategy) {
            case 'linear':
            default: {
                return Math.max(0, Math.floor(baseSlots * level));
            }
            // Future strategies (kept in mind):
            // case 'quadratic': return Math.max(0, Math.floor(baseSlots * level * level));
            // case 'custom': if (typeof window.GameData?.computeJobSlots === 'function') return Math.max(0, Math.floor(window.GameData.computeJobSlots(baseSlots, level, building)));
        }
    }

    // Assign worker to a specific job
    // Cleanup method to remove invalid building assignments
    cleanupInvalidAssignments() {
        const invalidKeys = [];
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            if (buildingId === undefined || buildingId === null) {
                invalidKeys.push(buildingId);
            } else if (buildingId === 'global') {
                // Global jobs are always valid - skip
                return;
            } else {
                // Check if building still exists
                const building = window.gameState?.buildings.find(b => b.id === buildingId);
                if (!building) {
                    invalidKeys.push(buildingId);
                }
            }
        });

        invalidKeys.forEach(key => {
            this.debugLog(`Removing invalid building assignment for ID: ${key}`);
            this.jobAssignments.delete(key);
        });

        if (invalidKeys.length > 0) {
            this.debugLog(`Cleaned up ${invalidKeys.length} invalid building assignments`);
        }
    }

    assignWorkerToJob(workerId, buildingId, jobType) {
        // Validate parameters
        if (buildingId === undefined || buildingId === null) {
            console.error(`[JobManager] Cannot assign worker - buildingId is ${buildingId}`);
            return false;
        }

        if (!workerId || !jobType) {
            console.error(`[JobManager] Cannot assign worker - missing workerId (${workerId}) or jobType (${jobType})`);
            return false;
        }

        this.debugLog(`Attempting to assign worker ${workerId} to building ${buildingId} for job: ${jobType}`);

        // Check if job slot is available
        const availableJobs = this.availableJobs.get(buildingId);
        if (!availableJobs || !availableJobs[jobType]) {
            console.warn(`[JobManager] Job type ${jobType} not available at building ${buildingId}`);
            return false;
        }

        const currentWorkers = this.getWorkersInJob(buildingId, jobType);
        if (currentWorkers.length >= availableJobs[jobType]) {
            return false; // No slots available
        }

        // Get worker from population
        const worker = this.getWorkerById(workerId);
        if (!worker) {
            console.warn(`[JobManager] Worker ${workerId} not found`);
            return false;
        }

        // Check if worker is already assigned to a BUILDING job (not population role)
        if (worker.jobAssignment) {
            console.warn(`[JobManager] Worker ${worker.name} is already assigned to building job: ${worker.jobAssignment.jobType}`);
            return false;
        }

        // Assign worker to building job
        if (!this.jobAssignments.has(buildingId)) {
            this.jobAssignments.set(buildingId, {});
        }

        const buildingJobs = this.jobAssignments.get(buildingId);
        if (!buildingJobs[jobType]) {
            buildingJobs[jobType] = [];
        }

        buildingJobs[jobType].push(workerId);

        // Update worker status - this is BUILDING job assignment, separate from population role
        worker.jobAssignment = {
            buildingId,
            jobType,
            assignedDay: this.gameState.currentDay || 0
        };
        worker.status = 'working'; // Working in building job

        this.debugLog(`Assigned ${worker.name} to building job: ${jobType} at ${buildingId}`);
        return true;
    }

    // Remove worker from job
    removeWorkerFromJob(workerId) {
        const worker = this.getWorkerById(workerId);
        if (!worker || !worker.jobAssignment) {
            return false;
        }

        const { buildingId, jobType } = worker.jobAssignment;
        const buildingJobs = this.jobAssignments.get(buildingId);

        if (buildingJobs && buildingJobs[jobType]) {
            const index = buildingJobs[jobType].indexOf(workerId);
            if (index !== -1) {
                buildingJobs[jobType].splice(index, 1);
            }
        }

        // Clear worker assignment
        worker.jobAssignment = null;
        worker.status = 'idle';

        this.debugLog(`Removed ${worker.name} from ${jobType} job`);
        return true;
    }

    // Get workers assigned to a specific job
    getWorkersInJob(buildingId, jobType) {
        const buildingJobs = this.jobAssignments.get(buildingId);
        if (!buildingJobs || !buildingJobs[jobType]) {
            return [];
        }

        return buildingJobs[jobType].map(workerId => this.getWorkerById(workerId)).filter(Boolean);
    }

    // Calculate daily resource production from all job assignments
    calculateDailyProduction() {
        this.debugLog('calculateDailyProduction() called');

        const production = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            weapons: 0,
            tools: 0,
            production: 0
        };

        this.debugLog(`Job assignments: ${this.jobAssignments.size} buildings`);

        this.jobAssignments.forEach((jobTypes, buildingId) => {
            this.debugLog(`Building ${buildingId} has jobs:`, Object.keys(jobTypes));

            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                this.debugLog(`Processing ${jobType}: ${workerIds.length} workers`);

                const efficiency = this.jobEfficiency.get(jobType) || {};

                this.debugLog(`Job ${jobType} efficiency:`, efficiency);

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (!worker) {
                        this.debugLog(`⚠️ Worker ${workerId} not found`);
                        return;
                    }

                    // Calculate worker efficiency based on skills and conditions
                    const workerEfficiency = this.calculateWorkerEfficiency(worker, jobType);
                    this.debugLog(`Worker ${worker.name} efficiency: ${workerEfficiency.toFixed(2)}`);

                    if (jobType === 'gatherer') {
                        // RNG pick: food, wood, or stone (equal chance)
                        const choice = this.randomChoice(['food', 'wood', 'stone']);
                        let seasonMult = 1.0;
                        try {
                            const season = this.gameState?.season || 'Spring';
                            const mults = window.GameData?.seasonMultipliers?.[season];
                            if (mults && typeof mults[choice] === 'number') {
                                seasonMult = mults[choice];
                            }
                        } catch (_) { }
                        const amount = 1 * workerEfficiency * seasonMult;
                        production[choice] += amount;
                        this.debugLog(`${worker.name} (gatherer) produced ${amount.toFixed(2)} ${choice}`);
                    } else {
                        // Add production for each resource type this job produces
                        Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                            if (production.hasOwnProperty(resourceType)) {
                                // Apply seasonal production multiplier for applicable resources
                                let seasonMult = 1.0;
                                if (baseAmount > 0) {
                                    try {
                                        const season = this.gameState?.season || 'Spring';
                                        const mults = window.GameData?.seasonMultipliers?.[season];
                                        if (mults && typeof mults[resourceType] === 'number') {
                                            seasonMult = mults[resourceType];
                                        }
                                    } catch (_) { }
                                }

                                const resourceGenerated = baseAmount * workerEfficiency * seasonMult;
                                production[resourceType] += resourceGenerated;
                                this.debugLog(`${worker.name} (${jobType}) produced ${resourceGenerated.toFixed(2)} ${resourceType}`);
                            }
                        });
                    }

                    // Jobs are purely functional - no skill progression
                });
            });
        });

        this.debugLog('Total daily production:', production);
        return production;
    }

    // Simple RNG helper for gatherers and other probabilistic jobs
    randomChoice(arr) {
        const idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    }

    // Calculate detailed daily production with per-source income/expense breakdown
    calculateDetailedDailyProduction() {
        this.debugLog('calculateDetailedDailyProduction() called');

        // Clean up any invalid assignments first
        this.cleanupInvalidAssignments();

        const production = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            weapons: 0,
            tools: 0,
            production: 0
        };

        const sources = {
            food: [],
            wood: [],
            stone: [],
            metal: [],
            planks: [],
            weapons: [],
            tools: [],
            production: []
        };

        // New structured breakdown: for each resource, track income and expense lines
        const breakdown = {
            food: { income: [], expense: [] },
            wood: { income: [], expense: [] },
            stone: { income: [], expense: [] },
            metal: { income: [], expense: [] },
            planks: { income: [], expense: [] },
            weapons: { income: [], expense: [] },
            tools: { income: [], expense: [] },
            production: { income: [], expense: [] }
        };

        // Aggregate production/consumption by job type across all buildings
        // Structure: { [jobType]: { workers: totalWorkers, resources: { food|wood|...: totalAmount } } }
        const jobAggregates = {};

        // Track worker counts for each resource type
        const workerCounts = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            weapons: 0,
            tools: 0,
            production: 0
        };

        this.debugLog(`Job assignments: ${this.jobAssignments.size} buildings`);

        this.jobAssignments.forEach((jobTypes, buildingId) => {
            // Check for undefined buildingId
            if (buildingId === undefined || buildingId === null) {
                console.error(`[JobManager] Found undefined/null buildingId in job assignments. JobTypes:`, jobTypes);
                return; // Skip this entry
            }

            const building = window.gameState?.buildings.find(b => b.id === buildingId);
            this.debugLog(`Building lookup for ID ${buildingId}:`, building);

            let buildingName;
            if (building) {
                // Try to get building name from GameData, with fallbacks
                if (window.GameData && window.GameData.getBuildingName) {
                    buildingName = window.GameData.getBuildingName(building.type);
                } else if (window.GameData && window.GameData.buildingInfo && window.GameData.buildingInfo[building.type]) {
                    buildingName = window.GameData.buildingInfo[building.type].name;
                } else {
                    // Fallback to capitalize building type
                    buildingName = building.type.charAt(0).toUpperCase() + building.type.slice(1);
                }
                this.debugLog(`Building type: ${building.type}, resolved name: ${buildingName}`);
            } else {
                buildingName = `Building ${buildingId}`;
                this.debugLog(`Building not found for ID ${buildingId}, using fallback name`);
            }

            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                const efficiency = this.jobEfficiency.get(jobType);
                if (!efficiency) return;

                let jobTotal = { food: 0, wood: 0, stone: 0, metal: 0, weapons: 0, tools: 0, production: 0 };

                // Building-level efficiency multiplier (effects, haste rune, weather, etc.)
                let buildingMult = 1.0;
                try {
                    const b = building;
                    if (b) {
                        // Prefer the cached multiplier set by EffectsManager; fallback to on-demand calculation
                        if (typeof b.efficiencyMultiplier === 'number') {
                            buildingMult = b.efficiencyMultiplier;
                        } else if (window.effectsManager && typeof window.effectsManager.getBuildingEfficiencyMultiplier === 'function') {
                            buildingMult = window.effectsManager.getBuildingEfficiencyMultiplier(b.type, b.id);
                        }
                    }
                } catch (_) { /* safe fallback to 1.0 */ }

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (!worker) return;

                    const workerEfficiency = this.calculateWorkerEfficiency(worker, jobType);

                    Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                        if (production.hasOwnProperty(resourceType)) {
                            // Apply seasonal multipliers consistently with calculateDailyProduction()
                            let seasonMult = 1.0;
                            try {
                                const season = this.gameState?.season || 'Spring';
                                const mults = window.GameData?.seasonMultipliers?.[season];
                                if (mults && typeof mults[resourceType] === 'number') {
                                    seasonMult = mults[resourceType];
                                }
                            } catch (_) { }

                            // Include building-level multiplier last so it scales all prior factors
                            const resourceGenerated = baseAmount * workerEfficiency * seasonMult * buildingMult;
                            production[resourceType] += resourceGenerated;
                            jobTotal[resourceType] += resourceGenerated;
                            // Count workers contributing to each resource type (only for positive generation)
                            if (resourceGenerated > 0) {
                                workerCounts[resourceType]++;
                            }
                        }
                    });
                });

                // Accumulate totals by job type across all buildings
                if (!jobAggregates[jobType]) {
                    jobAggregates[jobType] = { workers: 0, resources: { food: 0, wood: 0, stone: 0, metal: 0, weapons: 0, tools: 0, production: 0 } };
                }
                jobAggregates[jobType].workers += Array.isArray(workerIds) ? workerIds.length : 0;
                Object.entries(jobTotal).forEach(([resourceType, amount]) => {
                    if (resourceType in jobAggregates[jobType].resources) {
                        jobAggregates[jobType].resources[resourceType] += amount;
                    }
                });
            });
        });

        // Helper to format job type for labels
        const formatJobLabel = (jobType) => jobType ? (jobType.charAt(0).toUpperCase() + jobType.slice(1)) : 'Job';

        // Fill breakdown with one line per job type per resource, city-wide
        Object.entries(jobAggregates).forEach(([jobType, data]) => {
            const labelBase = `${formatJobLabel(jobType)} (${data.workers} worker${data.workers === 1 ? '' : 's'})`;
            Object.entries(data.resources).forEach(([resourceType, total]) => {
                if (!total || !breakdown[resourceType]) return;
                const line = { label: labelBase, workers: data.workers, amount: Number(total.toFixed(2)) };
                if (total >= 0) breakdown[resourceType].income.push(line);
                else breakdown[resourceType].expense.push(line);
            });
        });

        // Add population upkeep as food expenditure (1 per person per day)
        try {
            const pop = this.gameState?.population ?? (this.gameState?.populationManager?.population?.length || 0);
            if (pop > 0) {
                breakdown.food.expense.push({ label: 'Population Upkeep', workers: pop, amount: -pop });
            }
        } catch (_) { }

        this.debugLog('Total daily production with breakdown:', { production, sources, workerCounts });
        return { production, sources, workerCounts, breakdown };
    }

    calculateWorkerEfficiency(worker, jobType) {
        let efficiency = 1.0; // Base efficiency

        // Age factor
        const age = worker.age || 25;
        let ageFactor = 1.0;
        if (age < 18) ageFactor = 0.7;
        else if (age < 25) ageFactor = 0.9;
        else if (age <= 45) ageFactor = 1.0;
        else if (age <= 60) ageFactor = 0.95;
        else ageFactor = 0.8;

        // Health and happiness factors
        const healthFactor = Math.max(0.5, (worker.health || 100) / 100);
        const happinessFactor = Math.max(0.7, (worker.happiness || 75) / 100);

        // Job-relevant skill factor (use max relevant XP across skills)
        let skillXP = 0;
        try {
            const relevant = this.getRelevantSkillsForJob(jobType) || [];
            relevant.forEach(skillName => {
                const xp = (worker.experience && worker.experience[skillName]) || (worker.skills && worker.skills[skillName]) || 0;
                if (xp > skillXP) skillXP = xp;
            });
        } catch (_) { }
        // Map XP [0..1000+] to multiplier [1.0 .. 1.5] with diminishing return cap
        const skillFactor = 1.0 + Math.min(0.5, (skillXP / 1000) * 0.5);

        return Math.max(0.1, efficiency * ageFactor * healthFactor * happinessFactor * skillFactor);
    }

    getWorkerById(workerId) {
        if (this.gameState.populationManager?.population) {
            return this.gameState.populationManager.population.find(p => p.id === workerId);
        }

        if (this.gameState.population) {
            return this.gameState.population.find(p => p.id === workerId);
        }

        return null;
    }

    // Get available workers for job assignment
    getAvailableWorkers() {
        this.debugLog('Getting available workers...');
        const allWorkers = [];

        if (this.gameState.populationManager?.population && Array.isArray(this.gameState.populationManager.population)) {
            allWorkers.push(...this.gameState.populationManager.population);
        } else if (this.gameState.population && Array.isArray(this.gameState.population)) {
            allWorkers.push(...this.gameState.population);
        }

        this.debugLog(`Total population: ${allWorkers.length}`);

        // Filter for workers available for building jobs
        // Note: worker.role (farmer, guard, etc.) is just background flavor
        // worker.jobAssignment is for actual building jobs
        const availableWorkers = allWorkers.filter(worker => {
            const isOldEnough = worker.age >= 16;
            const isYoungEnough = worker.age <= 120; // Dynasty game - people can work until very old
            const isHealthy = (worker.health || 100) >= 30; // Lowered health requirement
            const hasNoBuildingJob = !worker.jobAssignment; // No building job assignment
            // Exclude the governing monarch from normal jobs
            const isGoverningLeader = (() => {
                try {
                    const monarch = this.gameState?.royalFamily?.currentMonarch;
                    if (!monarch) return false;
                    return monarch.isGoverning === true && worker.id === monarch.id;
                } catch (_) { return false; }
            })();

            // Exclude explicit leadership background roles from normal jobs
            const isLeadershipRole = (worker.role === 'player' || worker.role === 'monarch' || worker.role === 'royal');

            // Exclude drafted soldiers and expedition/away travelers from auto-assign
            const isDrafted = worker.status === 'drafted';
            const isAway = worker.status === 'away' || worker.status === 'traveling' || worker.onExpedition === true;

            const available = isOldEnough && isYoungEnough && isHealthy && hasNoBuildingJob && !isGoverningLeader && !isLeadershipRole && !isDrafted && !isAway;

            if (!available) {
                this.debugLog(`${worker.name} unavailable: age=${worker.age}, health=${worker.health}, hasJob=${!!worker.jobAssignment}`);
            }

            return available;
        }).map(worker => ({
            id: worker.id,
            name: worker.name,
            age: worker.age,
            role: worker.role, // Background role (farmer, guard, etc.) - just flavor
            skills: worker.skills || {},
            health: worker.health || 100,
            happiness: worker.happiness || 75,
            jobAssignment: worker.jobAssignment || null, // Building job assignment
            status: worker.status || 'idle'
        }));

        this.debugLog(`Available workers: ${availableWorkers.length}`);

        return availableWorkers;
    }

    // Auto-assign workers to available jobs with optimization
    autoAssignWorkers() {
        this.debugLog('Auto-assigning workers with resource-aware optimization...');

        // First, redistribute workers if we have better job opportunities
        this.optimizeWorkerAssignments();

        const availableWorkers = this.getAvailableWorkers();
        const availableJobs = this.getAllAvailableJobs();

        this.debugLog(`After optimization: ${availableWorkers.length} available workers, ${availableJobs.length} available jobs`);

        if (availableWorkers.length === 0 || availableJobs.length === 0) {
            return 0;
        }

        // Build a scoring heuristic per job based on current needs
        const gs = this.gameState;
        const resources = gs.resources || {};
        const needs = this.computeResourceNeeds();
        const hasActiveConstruction = !!(gs.constructionManager && gs.constructionManager.constructionSites && gs.constructionManager.constructionSites.size > 0);

        // Create scored job list
        // Farmer staffing floor: ensure a minimal number of farmers based on population
        const pop = gs.populationManager ? gs.populationManager.getAll().length : (gs.population || 0);
        const minFarmers = Math.max(0, Math.ceil(pop / 8)); // ~12.5% of pop as floor
        const currentFarmers = this.countWorkersInJobType('farmer');

        // Desired builders estimate based on active site's remaining points
        const desiredBuilders = this.computeDesiredBuilders(7); // target complete in ~7 days
        const currentBuilders = this.countWorkersInJobType('builder');
        const desiredForemen = desiredBuilders > 0 ? Math.max(1, Math.floor(desiredBuilders / 4)) : 0;
        const currentForemen = this.countWorkersInJobType('foreman');

        const woodCap = (typeof window.GameData?.calculateSeasonalStorageCap === 'function')
            ? window.GameData.calculateSeasonalStorageCap('wood', gs.season, gs.buildings)
            : (window.GameData?.resourceCaps?.wood || 50);
        const woodPct = woodCap > 0 ? ((resources.wood || 0) / woodCap) : 0;

        const scoredJobs = availableJobs.map(job => {
            let score = 0;
            // Avoid starving: prioritize food production if food low vs. upkeep
            if (job.jobType === 'farmer') score += needs.foodUrgency * 10;
            if (job.jobType === 'gatherer') score += needs.basicUrgency * 3; // light help

            // Wood and stone based on caps and deficits
            if (job.jobType === 'woodcutter') score += needs.woodUrgency * 6;
            if (job.jobType === 'rockcutter' || job.jobType === 'miner') score += needs.stoneUrgency * 4;

            // Planks pipeline only if we have wood buffer
            if (job.jobType === 'sawyer') {
                const wood = resources.wood || 0;
                // Prefer sawyers when wood % of cap is healthy OR near cap to convert
                if (woodPct >= 0.4) score += 6;
                score += (wood >= 5 ? 2 : 0);
                score += needs.planksUrgency * 3;
                if (wood < 3) score -= 15;
            }

            // Blacksmith produces weapons and tools
            if (job.jobType === 'blacksmith') {
                const metal = resources.metal || 0;
                score += needs.weaponsUrgency * 2;
                score += needs.toolsUrgency * 2;
                if (metal < 2) score -= 10;
            }

            // Gold if useful later (keep small weight)
            if (job.jobType === 'trader') score += needs.goldUrgency * 1.5;

            // Production (engineer) minor
            if (job.jobType === 'engineer') {
                score += needs.productionUrgency * 1; // small weight
            }

            // Builders: prioritize when construction active, but always keep some available
            // so player can START building (chicken-and-egg problem)
            if (job.jobType === 'builder') {
                if (hasActiveConstruction) {
                    score += 8; // High priority when building
                } else if (currentBuilders < 2) {
                    score += 3; // Always have at least 2 builders ready
                } else {
                    score -= 5; // Lower priority for excess builders when idle
                }
            }
            if (job.jobType === 'foreman') score += hasActiveConstruction ? 6 : -20;

            // Encourage meeting floors/desired counts
            if (job.jobType === 'farmer' && currentFarmers < minFarmers) score += 15;
            if (job.jobType === 'builder' && currentBuilders >= desiredBuilders && desiredBuilders > 0) score -= 30;
            if (job.jobType === 'foreman' && currentForemen >= desiredForemen) score -= 30;

            // Military/academic none for now
            if (job.jobType === 'drillInstructor' || job.jobType === 'militaryTheorist' || job.jobType === 'professor' || job.jobType === 'scholar' || job.jobType === 'wizard') {
                score -= 50;
            }

            return { ...job, score };
        });

        // Sort by score desc, then keep builder-first tie-breaker
        scoredJobs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.jobType === 'builder' && b.jobType !== 'builder') return -1;
            if (b.jobType === 'builder' && a.jobType !== 'builder') return 1;
            return 0;
        });

        let assignedCount = 0;
        let workerIndex = 0;

        for (const job of scoredJobs) {
            // Resource gating: skip sawyer if insufficient wood to consume
            if (job.jobType === 'sawyer' && (resources.wood || 0) < 3) continue;
            // Respect desired caps for builders/foremen
            if (job.jobType === 'builder' && this.countWorkersInJobType('builder') >= desiredBuilders) continue;
            if (job.jobType === 'foreman' && this.countWorkersInJobType('foreman') >= desiredForemen) continue;

            let slotsToFill = Math.min(job.availableSlots, availableWorkers.length - workerIndex);
            for (let i = 0; i < slotsToFill; i++) {
                if (availableWorkers.length === 0) break;
                // Pick best-fit worker for this job based on efficiency/skills
                const bestIndex = this.pickBestWorkerIndexForJob(availableWorkers, job.jobType);
                const [chosen] = bestIndex >= 0 ? availableWorkers.splice(bestIndex, 1) : [availableWorkers.shift()];
                if (chosen && this.assignWorkerToJob(chosen.id, job.buildingId, job.jobType)) {
                    assignedCount++;
                }
            }
            if (workerIndex >= availableWorkers.length) break;
        }

        if (assignedCount > 0) {
            this.debugLog(`Auto-assigned ${assignedCount} workers to jobs (resource-aware)`);
        }

        return assignedCount;
    }

    // Estimate desired builders to complete the priority site within targetDays
    computeDesiredBuilders(targetDays = 7) {
        const cm = this.gameState.constructionManager;
        if (!cm || !cm.constructionSites || cm.constructionSites.size === 0) return 0;
        // Take the first active site (matching processing focus)
        let targetSite = null;
        for (const [, site] of cm.constructionSites) { if (site.pointsRemaining > 0) { targetSite = site; break; } }
        if (!targetSite) return 0;
        const points = Math.max(0, targetSite.pointsRemaining || 0);
        if (points === 0) return 0;
        // Assume ~1 point per builder per day baseline
        const desired = Math.max(1, Math.ceil(points / targetDays));
        // Cap by available builder slots
        const totalBuilderSlots = this.getTotalJobCapacityByType('builder');
        return Math.min(desired, totalBuilderSlots);
    }

    getTotalJobCapacityByType(jobType) {
        let total = 0;
        this.availableJobs.forEach(jobTypes => { if (jobTypes[jobType]) total += jobTypes[jobType]; });
        return total;
    }

    // How many slots remain unfilled for a given job type
    getMissingSlotsForJobType(jobType) {
        const capacity = this.getTotalJobCapacityByType(jobType);
        const current = this.countWorkersInJobType(jobType);
        return Math.max(0, capacity - current);
    }

    countWorkersInJobType(jobType) {
        let count = 0;
        this.jobAssignments.forEach(jobTypes => { if (Array.isArray(jobTypes[jobType])) count += jobTypes[jobType].length; });
        return count;
    }

    // Choose the available worker with the best fit for a given job type
    pickBestWorkerIndexForJob(availableWorkers, jobType) {
        if (!availableWorkers || availableWorkers.length === 0) return -1;
        let best = -1;
        let bestScore = -Infinity;
        for (let i = 0; i < availableWorkers.length; i++) {
            const worker = availableWorkers[i];
            // Build a temporary person-like object for efficiency calc
            const person = {
                id: worker.id,
                name: worker.name,
                age: worker.age,
                health: worker.health,
                happiness: worker.happiness,
                experience: worker.experience,
                skills: worker.skills
            };
            const eff = this.calculateWorkerEfficiency(person, jobType);
            // Small bias: prefer younger/healthier slightly via eff already
            if (eff > bestScore) { bestScore = eff; best = i; }
        }
        return best;
    }

    // Compute urgency for key resources based on current reserves, caps, and upkeep
    computeResourceNeeds() {
        const gs = this.gameState;
        const res = gs.resources || {};
        const caps = window.GameData?.resourceCaps || {};
        const pop = gs.populationManager ? gs.populationManager.getAll().length : (gs.population || 0);
        const dailyFoodUse = pop; // 1 food per pop per day

        const food = res.food || 0;
        const wood = res.wood || 0;
        const stone = res.stone || 0;
        const metal = res.metal || 0;
        const planks = res.planks || 0;
        const weapons = res.weapons || 0;
        const tools = res.tools || 0;
        const gold = res.gold || 0;

        // Urgency scales: 0-1+ higher means more urgent
        const foodDays = dailyFoodUse > 0 ? food / dailyFoodUse : Infinity;
        const foodUrgency = Math.max(0, 3 - foodDays); // >2 days buffer = low, <1 day = high

        const woodUrgency = this.capUrgency(wood, caps.wood || 50);
        const stoneUrgency = this.capUrgency(stone, caps.stone || 50);
        const basicUrgency = Math.max(woodUrgency, stoneUrgency) * 0.5 + foodUrgency * 0.5;

        const planksUrgency = this.capUrgency(planks, caps.planks || 50) * 0.6 + woodUrgency * 0.4; // want planks when wood healthy
        const metalUrgency = this.capUrgency(metal, caps.metal || 50);
        const weaponsUrgency = this.capUrgency(weapons, caps.weapons || 50) * 0.6 + metalUrgency * 0.4; // want weapons when metal healthy
        const toolsUrgency = this.capUrgency(tools, caps.tools || 50) * 0.5; // tools improve production
        const goldUrgency = this.capUrgency(gold, caps.gold || 100) * 0.3; // low weight for now
        const productionUrgency = 0.1; // placeholder until crafting implemented

        return { foodUrgency, woodUrgency, stoneUrgency, basicUrgency, planksUrgency, metalUrgency, weaponsUrgency, toolsUrgency, goldUrgency, productionUrgency };
    }

    capUrgency(current, cap) {
        if (cap <= 0) return 0;
        const ratio = current / cap; // 0..1
        // More urgent when far from cap
        return Math.max(0, 1 - ratio);
    }

    // Optimize worker assignments when new jobs become available
    optimizeWorkerAssignments() {
        this.debugLog('Optimizing worker assignments (resource-aware)...');

        const totalJobSlots = this.getTotalJobCapacity();
        const assignedWorkers = this.getTotalAssignedWorkers();
        this.debugLog(`Total job slots: ${totalJobSlots}, Currently assigned: ${assignedWorkers}`);

        const needs = this.computeResourceNeeds();
        const gs = this.gameState;
        const res = gs.resources || {};
        const hasActiveConstruction = !!(gs.constructionManager && gs.constructionManager.constructionSites && gs.constructionManager.constructionSites.size > 0);

        // 1) Release builders/foremen when no construction is active
        if (!hasActiveConstruction) {
            this.releaseWorkersFromJobType('builder', Infinity);
            this.releaseWorkersFromJobType('foreman', Infinity);
        }

        // 2) If wood is scarce, release sawyers (they consume wood)
        if ((res.wood || 0) < 3) {
            this.releaseWorkersFromJobType('sawyer', Infinity);
        }

        // 3) If food urgency is high, free workers from lower priority jobs
        if (needs.foodUrgency > 1.0) {
            ['trader', 'rockcutter', 'miner', 'blacksmith', 'engineer'].forEach(j => this.releaseWorkersFromJobType(j, Math.ceil(needs.foodUrgency)));
        }
    }

    // Remove up to N workers across all buildings for a given job type
    releaseWorkersFromJobType(jobType, maxToRelease = Infinity) {
        let released = 0;
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            if (released >= maxToRelease) return;
            const workerIds = jobTypes[jobType];
            if (Array.isArray(workerIds) && workerIds.length > 0) {
                // Release from the end to minimize churn
                const toRelease = Math.min(workerIds.length, maxToRelease - released);
                for (let i = 0; i < toRelease; i++) {
                    const workerId = workerIds.pop();
                    const worker = this.getWorkerById(workerId);
                    if (worker) {
                        worker.jobAssignment = null;
                        worker.status = 'idle';
                    }
                    released++;
                }
                if (Array.isArray(jobTypes[jobType]) && jobTypes[jobType].length === 0) {
                    delete jobTypes[jobType];
                }
            }
        });
        if (released > 0) {
            this.debugLog(`Released ${released} ${jobType} workers for reassignment`);
        }
        return released;
    }
    // Specifically fill all available builder slots using any free workers
    fillAllBuilders() {
        // Ensure available jobs are up to date
        this.updateAvailableJobs();

        let assignments = 0;
        let missing = this.getMissingSlotsForJobType('builder');
        if (missing <= 0) return 0;

        // Gather builder jobs across buildings
        const builderJobs = this.getAllAvailableJobs().filter(j => j.jobType === 'builder');
        if (builderJobs.length === 0) return 0;

        // Available workers after any releases
        const availableWorkers = this.getAvailableWorkers();
        if (availableWorkers.length === 0) return 0;

        // Greedy assign to builder jobs until we run out of workers or slots
        for (const job of builderJobs) {
            // Recompute current remaining slots for this building
            const currentWorkers = this.getWorkersInJob(job.buildingId, 'builder').length;
            const slots = Math.max(0, job.maxWorkers - currentWorkers);
            if (slots === 0) continue;

            for (let i = 0; i < slots; i++) {
                if (availableWorkers.length === 0) break;
                const bestIdx = this.pickBestWorkerIndexForJob(availableWorkers, 'builder');
                const [chosen] = bestIdx >= 0 ? availableWorkers.splice(bestIdx, 1) : [availableWorkers.shift()];
                if (chosen && this.assignWorkerToJob(chosen.id, job.buildingId, 'builder')) {
                    assignments++;
                    missing--;
                    if (missing <= 0) break;
                }
            }
            if (missing <= 0 || availableWorkers.length === 0) break;
        }

        if (assignments > 0) {
            this.debugLog(`Filled ${assignments} builder slot(s) (fillAllBuilders)`);
        }

        return assignments;
    }

    // Reassign from lower-priority jobs and maximize builder staffing across the city
    maximizeBuilderAssignments() {
        this.updateAvailableJobs();

        let missing = this.getMissingSlotsForJobType('builder');
        if (missing <= 0) return 0;

        // Release order: lowest priority first; keep farmers last to avoid starvation
        const releaseOrder = [
            'trader', 'engineer', 'blacksmith', 'wizard', 'professor', 'scholar',
            'drillInstructor', 'militaryTheorist', 'sawyer', 'gatherer', 'miner', 'rockcutter', 'woodcutter', 'farmer'
        ];

        for (const jt of releaseOrder) {
            if (missing <= 0) break;
            const released = this.releaseWorkersFromJobType(jt, missing);
            missing -= released;
        }

        // Now fill all builder slots we can
        const assigned = this.fillAllBuilders();
        return assigned;
    }

    // Get total job capacity across all buildings
    getTotalJobCapacity() {
        let totalSlots = 0;

        this.availableJobs.forEach((jobTypes, buildingId) => {
            const building = this.gameState.buildings.find(b => b.id === buildingId);
            if (!building) return;

            Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                totalSlots += maxWorkers;
            });
        });

        return totalSlots;
    }

    // Release workers from overstaffed or low-priority positions
    releaseExcessWorkers() {
        // No excess worker release logic currently needed
    }

    // Get total number of workers currently assigned to jobs
    getTotalAssignedWorkers() {
        let total = 0;
        this.jobAssignments.forEach((jobTypes) => {
            Object.values(jobTypes).forEach(workerIds => {
                total += workerIds.length;
            });
        });
        return total;
    }

    // Auto-assign workers to available jobs (legacy method name for compatibility)
    autoAssignWorkers_old() {
        const availableWorkers = this.getAvailableWorkers();
        const availableJobs = this.getAllAvailableJobs();

        if (availableWorkers.length === 0 || availableJobs.length === 0) {
            return 0;
        }

        let assignedCount = 0;

        // Prioritize builder jobs first
        const prioritizedJobs = [...availableJobs].sort((a, b) => {
            if (a.jobType === 'builder' && b.jobType !== 'builder') return -1;
            if (b.jobType === 'builder' && a.jobType !== 'builder') return 1;
            return 0;
        });

        let workerIndex = 0;
        for (const job of prioritizedJobs) {
            let slotsToFill = Math.min(job.availableSlots, availableWorkers.length - workerIndex);

            for (let i = 0; i < slotsToFill; i++) {
                if (workerIndex >= availableWorkers.length) break;

                if (this.assignWorkerToJob(availableWorkers[workerIndex].id, job.buildingId, job.jobType)) {
                    assignedCount++;
                }
                workerIndex++;
            }
        }

        if (assignedCount > 0) {
            this.debugLog(`Auto-assigned ${assignedCount} workers to jobs`);
        }

        return assignedCount;
    }

    // Get summary of all job assignments
    getJobSummary() {
        const summary = {
            totalJobs: 0,
            totalWorkers: 0,
            jobTypes: {},
            buildings: {}
        };

        this.availableJobs.forEach((jobTypes, buildingId) => {
            const building = this.gameState.buildings.find(b => b.id === buildingId);
            if (!building) return;

            summary.buildings[buildingId] = {
                type: building.type,
                position: { x: building.x, y: building.y },
                jobs: {}
            };

            Object.entries(jobTypes).forEach(([jobType, maxWorkers]) => {
                const currentWorkers = this.getWorkersInJob(buildingId, jobType).length;

                summary.totalJobs += maxWorkers;
                summary.totalWorkers += currentWorkers;

                if (!summary.jobTypes[jobType]) {
                    summary.jobTypes[jobType] = { available: 0, filled: 0 };
                }
                summary.jobTypes[jobType].available += maxWorkers;
                summary.jobTypes[jobType].filled += currentWorkers;

                summary.buildings[buildingId].jobs[jobType] = {
                    current: currentWorkers,
                    max: maxWorkers
                };
            });
        });

        return summary;
    }

    // Get worker assignment stats for UI display
    getWorkerStats() {
        // Get total eligible workers (not children, not royalty with governing duties)
        const allPop = this.gameState.populationManager?.population || this.gameState.population || [];
        const eligibleWorkers = allPop.filter(p => {
            if (!p) return false;
            if (p.isChild) return false;
            if (p.role === 'child') return false;
            // Exclude royalty that are governing
            if (p.role === 'monarch' || p.role === 'heir') return false;
            return true;
        });
        
        // Count assigned workers
        let assignedCount = 0;
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            Object.values(jobTypes).forEach(workerIds => {
                assignedCount += workerIds.length;
            });
        });
        
        const total = eligibleWorkers.length;
        const assigned = Math.min(assignedCount, total);
        const idle = Math.max(0, total - assigned);
        
        return { total, assigned, idle };
    }

    // Debug function for browser console
    debugJobSystem() {
        console.log('=== JOB SYSTEM DEBUG ===');
        console.log('Available jobs by building:');
        this.availableJobs.forEach((jobs, buildingId) => {
            console.log(`  Building ${buildingId}:`, jobs);
        });

        console.log('Current job assignments:');
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            console.log(`  Building ${buildingId}:`);
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                console.log(`    ${jobType}: ${workerIds.length} workers -`, workerIds);
            });
        });

        console.log('Worker statuses:');
        const workers = this.getAvailableWorkers();
        const allPop = this.gameState.populationManager?.population || this.gameState.population || [];
        allPop.forEach(worker => {
            console.log(`  ${worker.name}: role=${worker.role}, status=${worker.status}, jobAssignment=${worker.jobAssignment ? worker.jobAssignment.jobType : 'none'}`);
        });

        const production = this.calculateDailyProduction();
        console.log('Current daily production:', production);
        console.log('========================');

        return {
            availableJobs: Object.fromEntries(this.availableJobs),
            jobAssignments: Object.fromEntries(this.jobAssignments),
            production
        };
    }

    // Call this when new buildings complete to optimize worker distribution
    onBuildingCompleted(buildingId) {
        this.debugLog(`Building ${buildingId} completed, optimizing worker assignments...`);

        // First auto-assign any available workers to new jobs
        const newAssignments = this.autoAssignWorkers();

        if (newAssignments > 0) {
            this.debugLog(`Assigned ${newAssignments} workers to jobs from newly completed building`);
        }

        // Update UI to reflect changes
        if (typeof village !== 'undefined' && village.updateWorkerAssignments) {
            village.updateWorkerAssignments();
        }
    }

    // Get job distribution statistics for visualization
    getJobDistributionStats() {
        const stats = {
            jobCounts: {},
            experienceLevels: {},
            totalWorkers: 0
        };

        // Count workers by job type and experience level
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                if (!stats.jobCounts[jobType]) {
                    stats.jobCounts[jobType] = 0;
                    stats.experienceLevels[jobType] = {
                        novice: 0,
                        apprentice: 0,
                        journeyman: 0,
                        expert: 0,
                        master: 0
                    };
                }

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (worker) {
                        stats.jobCounts[jobType]++;
                        stats.totalWorkers++;

                        // Get experience level for job-relevant skills
                        let maxSkillLevel = 'novice';
                        let maxXP = 0;

                        // Check job-relevant skills
                        const relevantSkills = this.getRelevantSkillsForJob(jobType);
                        relevantSkills.forEach(skillName => {
                            const xp = worker.experience?.[skillName] || 0;
                            if (xp > maxXP) {
                                maxXP = xp;
                                maxSkillLevel = this.getSkillLevelFromXP(xp);
                            }
                        });

                        stats.experienceLevels[jobType][maxSkillLevel]++;
                    }
                });
            });
        });

        return stats;
    }

    // Helper method to get relevant skills for a job type
    getRelevantSkillsForJob(jobType) {
        const skillMapping = {
            farmer: ['Agriculture'],
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
        return skillMapping[jobType] || [];
    }

    // Helper method to convert XP to skill level
    getSkillLevelFromXP(xp) {
        if (xp >= 1001) return 'master';
        if (xp >= 601) return 'expert';
        if (xp >= 301) return 'journeyman';
        if (xp >= 101) return 'apprentice';
        return 'novice';
    }

    // Serialize job manager data for save
    serialize() {
        return {
            jobAssignments: Object.fromEntries(this.jobAssignments),
            availableJobs: Object.fromEntries(this.availableJobs)
        };
    }

    // Deserialize job manager data from save
    deserialize(data) {
        if (!data) return;

        console.log('[JobManager] Deserializing job assignments from save data');

        // Restore job assignments
        if (data.jobAssignments) {
            this.jobAssignments = new Map(Object.entries(data.jobAssignments));
            this.debugLog(`Restored ${this.jobAssignments.size} building job assignments`);
        }

        // Restore available jobs
        if (data.availableJobs) {
            this.availableJobs = new Map(Object.entries(data.availableJobs));
            this.debugLog(`Restored ${this.availableJobs.size} building job definitions`);
        }

        // Update population job assignments in PopulationManager
        this.syncPopulationJobAssignments();
    }

    // Sync job assignments with PopulationManager after loading
    syncPopulationJobAssignments() {
        if (!this.gameState.populationManager) return;

        console.log('[JobManager] Syncing job assignments with PopulationManager after load');

        // Clear all existing job assignments in population
        const allPeople = this.gameState.populationManager.getAll();
        allPeople.forEach(person => {
            if (person.jobAssignment) {
                delete person.jobAssignment;
            }
        });

        // Restore job assignments from our saved data
        let restoredAssignments = 0;
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                workerIds.forEach(workerId => {
                    const worker = allPeople.find(p => p.id === workerId);
                    if (worker) {
                        worker.jobAssignment = {
                            buildingId: buildingId,
                            jobType: jobType,
                            assignedAt: Date.now()
                        };
                        restoredAssignments++;
                    } else {
                        console.warn(`[JobManager] Worker ${workerId} not found during job assignment restoration`);
                    }
                });
            });
        });

        this.debugLog(`Restored ${restoredAssignments} individual worker job assignments`);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobManager;
}

// Make available globally for debugging and game initialization
if (typeof window !== 'undefined') {
    window.JobManager = JobManager;
}

// Job-Based Resource Production System
// Manages worker assignments to buildings and calculates resource production based on jobs

class JobManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.jobAssignments = new Map(); // buildingId -> { jobType -> [workerIds] }
        this.availableJobs = new Map(); // buildingId -> { jobType -> maxWorkers }
        this.jobEfficiency = new Map(); // Define base efficiency for each job type
        
        this.initializeJobEfficiency();
    }

    initializeJobEfficiency() {
        // Base efficiency rates for different job types
        // Each worker in these jobs produces these amounts per day
        this.jobEfficiency.set('farmer', { food: 5 }); // From farms
        this.jobEfficiency.set('woodcutter', { wood: 3 }); // From woodcutter lodges - basic wood cutting
        this.jobEfficiency.set('builder', { construction: 1 }); // From tents, builder huts
        this.jobEfficiency.set('gatherer', { food: 1, wood: 1, stone: 1, production: 0.5 }); // From tents, founders wagon, town center
        this.jobEfficiency.set('crafter', { production: 1 }); // From founders wagon, town center, houses
        this.jobEfficiency.set('sawyer', { wood: 2, planks: 1 }); // From woodcutter lodges - basic wood processing
        this.jobEfficiency.set('lumber_worker', { wood: 1, planks: 4 }); // From lumber mills - advanced processing
        this.jobEfficiency.set('foreman', { construction: 2 }); // From builder huts - supervises construction
        
        // Removed legacy job types that don't exist in buildings:
        // miner, stonecutter - no buildings provide these jobs
    }

    // Update available jobs based on current buildings
    updateAvailableJobs() {
        this.availableJobs.clear();
        
        const totalBuildings = this.gameState.buildings.length;
        let completedBuildings = 0;
        let buildingsWithJobs = 0;
        
        this.gameState.buildings.forEach(building => {
            if (building.level > 0 && building.built) {
                completedBuildings++;
                const production = GameData.buildingProduction[building.type];
                if (production && production.jobs) {
                    this.availableJobs.set(building.id, { ...production.jobs });
                    buildingsWithJobs++;
                }
            }
        });

        console.log(`[JobManager] Buildings: ${totalBuildings} total, ${completedBuildings} completed, ${buildingsWithJobs} provide jobs`);
        console.log(`[JobManager] Updated available jobs: ${this.availableJobs.size} buildings with jobs`);
    }

    // Get all available job positions
    getAllAvailableJobs() {
        const jobs = [];
        
        this.availableJobs.forEach((jobTypes, buildingId) => {
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

    // Assign worker to a specific job
    assignWorkerToJob(workerId, buildingId, jobType) {
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

        console.log(`[JobManager] Assigned ${worker.name} (population role: ${worker.role}) to building job: ${jobType} at ${buildingId}`);
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

        console.log(`[JobManager] Removed ${worker.name} from ${jobType} job`);
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
        console.log('[JobManager] calculateDailyProduction() called');
        
        const production = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            production: 0
        };

        console.log(`[JobManager] Job assignments: ${this.jobAssignments.size} buildings`);
        
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            console.log(`[JobManager] Building ${buildingId} has jobs:`, Object.keys(jobTypes));
            
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                console.log(`[JobManager] Processing ${jobType}: ${workerIds.length} workers`);
                
                const efficiency = this.jobEfficiency.get(jobType);
                if (!efficiency) {
                    console.log(`[JobManager] ⚠️ No efficiency defined for job type: ${jobType}`);
                    return;
                }
                
                console.log(`[JobManager] Job ${jobType} efficiency:`, efficiency);

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (!worker) {
                        console.log(`[JobManager] ⚠️ Worker ${workerId} not found`);
                        return;
                    }

                    // Calculate worker efficiency based on skills and conditions
                    const workerEfficiency = this.calculateWorkerEfficiency(worker, jobType);
                    console.log(`[JobManager] Worker ${worker.name} efficiency: ${workerEfficiency.toFixed(2)}`);
                    
                    // Add production for each resource type this job produces
                    Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                        if (production.hasOwnProperty(resourceType)) {
                            const resourceGenerated = baseAmount * workerEfficiency;
                            production[resourceType] += resourceGenerated;
                            console.log(`[JobManager] ${worker.name} (${jobType}) produced ${resourceGenerated.toFixed(2)} ${resourceType}`);
                        }
                    });

                    // Jobs are purely functional - no skill progression
                });
            });
        });

        console.log('[JobManager] Total daily production:', production);
        return production;
    }

    // Calculate detailed daily production with sources breakdown
    calculateDetailedDailyProduction() {
        console.log('[JobManager] calculateDetailedDailyProduction() called');
        
        const production = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            production: 0
        };

        const sources = {
            food: [],
            wood: [],
            stone: [],
            metal: [],
            planks: [],
            production: []
        };

        // Track worker counts for each resource type
        const workerCounts = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            production: 0
        };

        console.log(`[JobManager] Job assignments: ${this.jobAssignments.size} buildings`);
        
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            const building = window.gameState?.buildings.find(b => b.id === buildingId);
            console.log(`[JobManager] Building lookup for ID ${buildingId}:`, building);
            
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
                console.log(`[JobManager] Building type: ${building.type}, resolved name: ${buildingName}`);
            } else {
                buildingName = `Building ${buildingId}`;
                console.log(`[JobManager] Building not found for ID ${buildingId}, using fallback name`);
            }
            
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                const efficiency = this.jobEfficiency.get(jobType);
                if (!efficiency) return;

                let jobTotal = { food: 0, wood: 0, stone: 0, metal: 0, planks: 0, production: 0 };

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (!worker) return;

                    const workerEfficiency = this.calculateWorkerEfficiency(worker, jobType);
                    
                    Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                        if (production.hasOwnProperty(resourceType)) {
                            const resourceGenerated = baseAmount * workerEfficiency;
                            production[resourceType] += resourceGenerated;
                            jobTotal[resourceType] += resourceGenerated;
                            // Count workers contributing to each resource type
                            if (resourceGenerated > 0) {
                                workerCounts[resourceType]++;
                            }
                        }
                    });
                });

                // Add sources for each resource this job type produces
                Object.entries(jobTotal).forEach(([resourceType, amount]) => {
                    if (amount > 0) {
                        sources[resourceType].push(`${buildingName} (${workerIds.length} ${jobType}): +${amount.toFixed(1)}`);
                    }
                });
            });
        });

        console.log('[JobManager] Total daily production with sources and worker counts:', { production, sources, workerCounts });
        return { production, sources, workerCounts };
    }

    calculateWorkerEfficiency(worker, jobType) {
        let efficiency = 1.0; // Base efficiency

        // Jobs are purely functional with no skill progression
        // Efficiency is based only on worker attributes and conditions
        
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

        return Math.max(0.1, efficiency * ageFactor * healthFactor * happinessFactor);
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
        console.log('[JobManager] Getting available workers...');
        const allWorkers = [];
        
        if (this.gameState.populationManager?.population && Array.isArray(this.gameState.populationManager.population)) {
            allWorkers.push(...this.gameState.populationManager.population);
        } else if (this.gameState.population && Array.isArray(this.gameState.population)) {
            allWorkers.push(...this.gameState.population);
        }

        console.log(`[JobManager] Total population: ${allWorkers.length}`);
        
        // Filter for workers available for building jobs
        // Note: worker.role (farmer, guard, etc.) is just background flavor
        // worker.jobAssignment is for actual building jobs
        const availableWorkers = allWorkers.filter(worker => {
            const isOldEnough = worker.age >= 16;
            const isYoungEnough = worker.age <= 120; // Dynasty game - people can work until very old
            const isHealthy = (worker.health || 100) >= 30; // Lowered health requirement
            const hasNoBuildingJob = !worker.jobAssignment; // No building job assignment
            
            const available = isOldEnough && isYoungEnough && isHealthy && hasNoBuildingJob;
            
            if (!available) {
                console.log(`[JobManager] ${worker.name} unavailable: age=${worker.age}, health=${worker.health}, hasJob=${!!worker.jobAssignment}, jobAssignment:`, worker.jobAssignment);
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
        
        console.log(`[JobManager] Available workers: ${availableWorkers.length}`);
        availableWorkers.forEach(w => {
            console.log(`[JobManager] - ${w.name} (background role: ${w.role}) age ${w.age}, no building job`);
        });

        return availableWorkers;
    }

    // Auto-assign workers to available jobs with optimization
    autoAssignWorkers() {
        console.log('[JobManager] Auto-assigning workers with optimization...');
        
        // First, redistribute workers if we have better job opportunities
        this.optimizeWorkerAssignments();
        
        const availableWorkers = this.getAvailableWorkers();
        const availableJobs = this.getAllAvailableJobs();
        
        console.log(`[JobManager] After optimization: ${availableWorkers.length} available workers, ${availableJobs.length} available jobs`);
        
        if (availableWorkers.length === 0 || availableJobs.length === 0) {
            return 0;
        }

        let assignedCount = 0;
        
        // Prioritize builder jobs first (they're always important for construction)
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
            console.log(`[JobManager] Auto-assigned ${assignedCount} workers to jobs`);
        }

        return assignedCount;
    }

    // Optimize worker assignments when new jobs become available
    optimizeWorkerAssignments() {
        console.log('[JobManager] Optimizing worker assignments...');
        
        const allJobs = this.getAllAvailableJobs();
        const totalJobSlots = this.getTotalJobCapacity();
        const assignedWorkers = this.getTotalAssignedWorkers();
        
        console.log(`[JobManager] Total job slots: ${totalJobSlots}, Currently assigned: ${assignedWorkers}`);
        
        // If we have more job slots than assigned workers, we might want to redistribute
        if (totalJobSlots > assignedWorkers) {
            console.log('[JobManager] New job opportunities detected, checking for redistribution...');
            
            // Check if we can release some workers from overstaffed jobs
            this.releaseExcessWorkers();
        }
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
        let releasedCount = 0;
        
        this.jobAssignments.forEach((jobTypes, buildingId) => {
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                // Houses provide crafter jobs, but if we have many crafter jobs and few gatherer jobs,
                // we might want to balance better
                if (jobType === 'crafter' && workerIds.length > 1) {
                    // Keep only 1 crafter per house for now, release others
                    const workersToRelease = workerIds.slice(1);
                    workersToRelease.forEach(workerId => {
                        if (this.removeWorkerFromJob(workerId)) {
                            releasedCount++;
                            console.log(`[JobManager] Released excess crafter worker ${workerId} from building ${buildingId}`);
                        }
                    });
                }
            });
        });
        
        if (releasedCount > 0) {
            console.log(`[JobManager] Released ${releasedCount} workers for reassignment`);
        }
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
            console.log(`[JobManager] Auto-assigned ${assignedCount} workers to jobs`);
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
        console.log(`[JobManager] Building ${buildingId} completed, optimizing worker assignments...`);
        
        // First auto-assign any available workers to new jobs
        const newAssignments = this.autoAssignWorkers();
        
        if (newAssignments > 0) {
            console.log(`[JobManager] Assigned ${newAssignments} workers to jobs from newly completed building`);
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
            crafter: ['Carpentry', 'Blacksmithing'],
            sawyer: ['Forestry', 'Carpentry'],
            foreman: ['Carpentry', 'Masonry', 'Engineering']
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
            console.log(`[JobManager] Restored ${this.jobAssignments.size} building job assignments`);
        }
        
        // Restore available jobs
        if (data.availableJobs) {
            this.availableJobs = new Map(Object.entries(data.availableJobs));
            console.log(`[JobManager] Restored ${this.availableJobs.size} building job definitions`);
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

        console.log(`[JobManager] Restored ${restoredAssignments} individual worker job assignments`);
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

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
        // Base resource production per worker per day by job type
        this.jobEfficiency.set('farmer', { food: 5 }); // Farmers produce 5 food per day
        this.jobEfficiency.set('woodcutter', { wood: 4 }); // Woodcutters produce 4 wood per day
        this.jobEfficiency.set('sawyer', { wood: 6, planks: 2 }); // Sawyers process wood into planks
        this.jobEfficiency.set('miner', { stone: 3 }); // Miners produce 3 stone per day
        this.jobEfficiency.set('stonecutter', { stone: 5 }); // Stonecutters produce 5 stone per day
        this.jobEfficiency.set('builder', { construction: 1 }); // Builders contribute to construction
        this.jobEfficiency.set('crafter', { production: 1 }); // Crafters provide general production bonus
    }

    // Update available jobs based on current buildings
    updateAvailableJobs() {
        this.availableJobs.clear();
        
        this.gameState.buildings.forEach(building => {
            if (building.level > 0 && building.built) {
                const production = GameData.buildingProduction[building.type];
                if (production && production.jobs) {
                    this.availableJobs.set(building.id, { ...production.jobs });
                }
            }
        });

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
            console.warn(`[JobManager] No available slots for ${jobType} at building ${buildingId}`);
            return false;
        }

        // Get worker from population
        const worker = this.getWorkerById(workerId);
        if (!worker) {
            console.warn(`[JobManager] Worker ${workerId} not found`);
            return false;
        }

        // Check if worker is already assigned to another job
        if (worker.jobAssignment) {
            console.warn(`[JobManager] Worker ${worker.name} is already assigned to ${worker.jobAssignment.jobType}`);
            return false;
        }

        // Assign worker to job
        if (!this.jobAssignments.has(buildingId)) {
            this.jobAssignments.set(buildingId, {});
        }

        const buildingJobs = this.jobAssignments.get(buildingId);
        if (!buildingJobs[jobType]) {
            buildingJobs[jobType] = [];
        }

        buildingJobs[jobType].push(workerId);

        // Update worker status
        worker.jobAssignment = {
            buildingId,
            jobType,
            assignedDay: this.gameState.currentDay || 0
        };
        worker.status = 'working';

        console.log(`[JobManager] Assigned ${worker.name} to ${jobType} job at ${buildingId}`);
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
        const production = {
            food: 0,
            wood: 0,
            stone: 0,
            metal: 0,
            planks: 0,
            production: 0
        };

        this.jobAssignments.forEach((jobTypes, buildingId) => {
            Object.entries(jobTypes).forEach(([jobType, workerIds]) => {
                const efficiency = this.jobEfficiency.get(jobType);
                if (!efficiency) return;

                workerIds.forEach(workerId => {
                    const worker = this.getWorkerById(workerId);
                    if (!worker) return;

                    // Calculate worker efficiency based on skills and conditions
                    const workerEfficiency = this.calculateWorkerEfficiency(worker, jobType);
                    
                    // Add production for each resource type this job produces
                    Object.entries(efficiency).forEach(([resourceType, baseAmount]) => {
                        if (production.hasOwnProperty(resourceType)) {
                            production[resourceType] += baseAmount * workerEfficiency;
                        }
                    });

                    // Jobs are purely functional - no skill progression
                });
            });
        });

        return production;
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
        const allWorkers = [];
        
        if (this.gameState.populationManager?.population && Array.isArray(this.gameState.populationManager.population)) {
            allWorkers.push(...this.gameState.populationManager.population);
        } else if (this.gameState.population && Array.isArray(this.gameState.population)) {
            allWorkers.push(...this.gameState.population);
        }

        return allWorkers.filter(worker => 
            worker.status === 'idle' && 
            worker.age >= 16 && 
            worker.age <= 70 && 
            (worker.health || 100) >= 50
        ).map(worker => ({
            id: worker.id,
            name: worker.name,
            age: worker.age,
            skills: worker.skills || {},
            health: worker.health || 100,
            happiness: worker.happiness || 75,
            jobAssignment: worker.jobAssignment || null
        }));
    }

    // Auto-assign workers to available jobs
    autoAssignWorkers() {
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
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobManager;
}

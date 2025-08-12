// Wiki-Documented Construction System Manager
// Implements skill-based, seasonal, and technology-enhanced construction system
// Following the specifications from buildings.md, mechanics.md, and GAME_BALANCE.md

class ConstructionManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.constructionSites = new Map(); // Track active construction sites
        this.assignedWorkers = new Map(); // Track workers assigned to construction
        this.seasonalEffects = this.initializeSeasonalEffects();
        this.technologyBonuses = new Map(); // Technology research effects
        
        // Initialize with current season
        this.updateSeasonalEffects();
    }

    initializeSeasonalEffects() {
        return {
            // Major Seasons (30 days each)
            spring: { food: 1.2, wood: 1.0, stone: 1.0, construction: 1.1 }, // +10% construction (good weather)
            summer: { food: 1.5, wood: 0.8, stone: 1.2, construction: 1.2 }, // +20% construction (optimal conditions)
            autumn: { food: 1.0, wood: 1.3, stone: 1.0, construction: 1.0 }, // Normal construction
            winter: { food: 0.7, wood: 1.5, stone: 0.8, construction: 0.8 }, // -20% construction (harsh conditions)
            
            // Transitional Seasons (10 days each)
            sprummer: { food: 1.35, wood: 0.9, stone: 1.1, construction: 1.15 },
            sumtumn: { food: 1.25, wood: 1.15, stone: 1.0, construction: 1.1 },
            autinter: { food: 0.9, wood: 1.2, stone: 0.95, construction: 0.9 },
            winting: { food: 0.8, wood: 1.25, stone: 0.9, construction: 0.85 }
        };
    }

    // Update seasonal effects based on current game state
    updateSeasonalEffects() {
        const currentSeason = this.getCurrentSeason();
        this.currentSeasonalEffects = this.seasonalEffects[currentSeason] || this.seasonalEffects.spring;
    }

    getCurrentSeason() {
        // Get current day from gameState (assuming 200-day year cycle)
        const dayOfYear = (this.gameState.currentDay || 0) % 200;
        
        if (dayOfYear < 30) return 'spring';
        else if (dayOfYear < 40) return 'sprummer'; // 30-39
        else if (dayOfYear < 70) return 'summer'; // 40-69
        else if (dayOfYear < 80) return 'sumtumn'; // 70-79
        else if (dayOfYear < 110) return 'autumn'; // 80-109
        else if (dayOfYear < 120) return 'autinter'; // 110-119
        else if (dayOfYear < 150) return 'winter'; // 120-149
        else if (dayOfYear < 160) return 'winting'; // 150-159
        else return 'spring'; // 160-199 (extended spring)
    }

    // Initialize construction site with wiki-documented system
    initializeConstructionSite(building) {
        const buildingData = GameData?.buildingCosts?.[building.type];
        if (!buildingData) {
            console.error('[Construction] No building data found for:', building.type);
            return null;
        }

        const baseBuildTime = GameData?.constructionTimes?.[building.type] || 2;
        const buildingLevel = building.level || 1;
        
        // Calculate actual construction time using wiki formula:
        // BuildingTime(days) = BaseBuildTime × (1 + (BuildingLevel × 0.3)) × (1 - (ConstructionTech × 0.05))
        const levelMultiplier = 1 + ((buildingLevel - 1) * 0.3);
        const techBonus = this.technologyBonuses.get('construction') || 0;
        const techMultiplier = 1 - (techBonus * 0.05);
        
        const calculatedBuildTime = Math.ceil(baseBuildTime * levelMultiplier * techMultiplier);

        const constructionSite = {
            buildingId: building.id,
            buildingType: building.type,
            buildingLevel: buildingLevel,
            position: { x: building.x, y: building.y },
            
            // Time-based progress system
            totalBuildTime: calculatedBuildTime,
            remainingTime: calculatedBuildTime,
            dailyProgress: 0,
            
            // Worker assignment system
            assignedWorkers: [],
            maxWorkers: this.getMaxWorkersForBuilding(building.type),
            
            // Efficiency modifiers
            skillEfficiency: 1.0,
            seasonalEfficiency: 1.0,
            technologyEfficiency: 1.0,
            teamworkBonus: 1.0,
            
            // Construction materials and quality
            materialQuality: 1.0,
            constructionQuality: 1.0,
            
            // Status tracking
            startedDay: this.gameState.currentDay || 0,
            estimatedCompletion: calculatedBuildTime,
            status: 'active'
        };

        this.constructionSites.set(building.id, constructionSite);
        console.log(`[Construction] Initialized ${building.type} (Level ${buildingLevel}) - ${calculatedBuildTime} days required`);
        
        return constructionSite;
    }

    getMaxWorkersForBuilding(buildingType) {
        // Determine max workers based on building complexity
        const workerLimits = {
            // Small buildings
            house: 2,
            farm: 2,
            
            // Medium buildings
            sawmill: 3,
            quarry: 4,
            workshop: 3,
            blacksmith: 3,
            barracks: 4,
            
            // Large buildings
            townCenter: 5,
            market: 4,
            temple: 5,
            academy: 5,
            
            // Massive projects
            keep: 6,
            castle: 8,
            monument: 10,
            magicalTower: 6,
            grandLibrary: 7
        };
        
        return workerLimits[buildingType] || 3;
    }

    // Assign skilled worker to construction site
    assignWorker(buildingId, workerId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) {
            console.warn('[Construction] Construction site not found');
            return false;
        }

        if (site.assignedWorkers.length >= site.maxWorkers) {
            console.warn('[Construction] Construction site at maximum worker capacity');
            return false;
        }

        // Get worker from population
        const worker = this.getWorkerById(workerId);
        if (!worker) {
            console.warn('[Construction] Worker not found');
            return false;
        }

        // Check if worker is already assigned to this site
        if (site.assignedWorkers.some(w => w.id === workerId)) {
            console.warn('[Construction] Worker already assigned to this site');
            return false;
        }

        // Calculate worker efficiency based on relevant skills
        const workerEfficiency = this.calculateWorkerEfficiency(worker, site.buildingType);
        
        // Create worker assignment
        const assignment = {
            id: workerId,
            name: worker.name,
            skills: this.getRelevantSkills(worker, site.buildingType),
            efficiency: workerEfficiency,
            assignedDay: this.gameState.currentDay || 0,
            experience: worker.experience || 0
        };

        site.assignedWorkers.push(assignment);
        
        // Update worker status
        worker.status = 'construction';
        worker.assignedBuildingId = buildingId;

        // Recalculate site efficiency
        this.recalculateSiteEfficiency(site);

        console.log(`[Construction] Assigned ${worker.name} to ${site.buildingType} construction (${workerEfficiency.toFixed(2)}x efficiency)`);
        return true;
    }

    getWorkerById(workerId) {
        // Check if PopulationManager exists and has population data
        if (this.gameState.populationManager?.population) {
            return this.gameState.populationManager.population.find(p => p.id === workerId);
        }
        
        // Fallback to gameState population if available
        if (this.gameState.population) {
            return this.gameState.population.find(p => p.id === workerId);
        }
        
        return null;
    }

    calculateWorkerEfficiency(worker, buildingType) {
        let efficiency = 1.0; // Base efficiency

        // Get relevant skills for this building type
        const relevantSkills = this.getRelevantSkills(worker, buildingType);
        
        // Calculate average skill bonus
        let skillBonus = 0;
        let skillCount = 0;
        
        Object.values(relevantSkills).forEach(skillLevel => {
            if (skillLevel > 0) {
                // Wiki skill efficiency: Novice (1x), Apprentice (1.2x), Journeyman (1.5x), Expert (2x), Grandmaster (3x)
                if (skillLevel >= 1000) skillBonus += 3.0; // Grandmaster
                else if (skillLevel >= 600) skillBonus += 2.0; // Expert
                else if (skillLevel >= 300) skillBonus += 1.5; // Journeyman
                else if (skillLevel >= 100) skillBonus += 1.2; // Apprentice
                else skillBonus += 1.0; // Novice
                
                skillCount++;
            }
        });
        
        if (skillCount > 0) {
            efficiency = skillBonus / skillCount;
        }

        // Age factor (peak efficiency 25-45 years)
        const age = worker.age || 25;
        let ageFactor = 1.0;
        if (age < 18) ageFactor = 0.7; // Young workers
        else if (age < 25) ageFactor = 0.9; // Learning workers
        else if (age <= 45) ageFactor = 1.0; // Peak workers
        else if (age <= 60) ageFactor = 0.95; // Experienced workers
        else ageFactor = 0.8; // Elder workers

        // Health and happiness factors
        const healthFactor = Math.max(0.5, (worker.health || 100) / 100);
        const happinessFactor = Math.max(0.7, (worker.happiness || 75) / 100);

        efficiency *= ageFactor * healthFactor * happinessFactor;

        return Math.max(0.1, efficiency); // Minimum 10% efficiency
    }

    getRelevantSkills(worker, buildingType) {
        const skills = worker.skills || {};
        
        // Determine which skills are relevant for each building type
        const skillMappings = {
            // Wood-heavy buildings
            house: ['Carpentry', 'Forestry'],
            farm: ['Agriculture', 'Carpentry'],
            sawmill: ['Forestry', 'Carpentry', 'Engineering'],
            lumberMill: ['Forestry', 'Carpentry'],
            
            // Stone-heavy buildings
            townCenter: ['Masonry', 'Engineering', 'Administration'],
            quarry: ['Quarrying', 'Mining', 'Engineering'],
            
            // Mixed construction
            workshop: ['Carpentry', 'Masonry', 'Engineering'],
            blacksmith: ['Blacksmithing', 'Engineering', 'Masonry'],
            market: ['Carpentry', 'Masonry', 'Trade'],
            
            // Military buildings
            barracks: ['Masonry', 'Carpentry', 'Military Engineering'],
            fortifications: ['Masonry', 'Military Engineering', 'Engineering'],
            castle: ['Masonry', 'Engineering', 'Military Engineering'],
            
            // Advanced buildings
            temple: ['Masonry', 'Carpentry', 'Scholarship'],
            academy: ['Masonry', 'Carpentry', 'Scholarship', 'Engineering'],
            magicalTower: ['Masonry', 'Magic', 'Engineering', 'Scholarship'],
            
            // Royal buildings
            keep: ['Masonry', 'Carpentry', 'Engineering', 'Administration'],
            monument: ['Masonry', 'Engineering', 'Scholarship']
        };

        const relevantSkillNames = skillMappings[buildingType] || ['Carpentry', 'Masonry'];
        const relevantSkills = {};
        
        relevantSkillNames.forEach(skillName => {
            relevantSkills[skillName] = skills[skillName] || 0;
        });

        return relevantSkills;
    }

    recalculateSiteEfficiency(site) {
        // Calculate average worker efficiency
        if (site.assignedWorkers.length === 0) {
            site.skillEfficiency = 1.0;
            site.teamworkBonus = 1.0;
        } else {
            // Average skill efficiency
            const totalEfficiency = site.assignedWorkers.reduce((sum, worker) => sum + worker.efficiency, 0);
            site.skillEfficiency = totalEfficiency / site.assignedWorkers.length;
            
            // Teamwork bonus based on worker count
            const workerCount = site.assignedWorkers.length;
            if (workerCount === 1) site.teamworkBonus = 1.0;
            else if (workerCount === 2) site.teamworkBonus = 1.1; // +10% for pair work
            else if (workerCount === 3) site.teamworkBonus = 1.2; // +20% for small team
            else if (workerCount <= 5) site.teamworkBonus = 1.3; // +30% for optimal team
            else site.teamworkBonus = 1.3 + (workerCount - 5) * 0.02; // Diminishing returns
        }

        // Update seasonal efficiency
        this.updateSeasonalEffects();
        site.seasonalEfficiency = this.currentSeasonalEffects?.construction || 1.0;
        
        // Technology efficiency (from research)
        site.technologyEfficiency = 1 + (this.technologyBonuses.get('construction') || 0) * 0.05;

        // Recalculate estimated completion
        this.updateEstimatedCompletion(site);
    }

    updateEstimatedCompletion(site) {
        if (site.assignedWorkers.length === 0) {
            site.estimatedCompletion = site.remainingTime;
            site.dailyProgress = 0;
            return;
        }

        // Calculate daily progress rate
        const baseProgress = 1.0; // 1 day of progress per day base
        const totalEfficiency = site.skillEfficiency * site.teamworkBonus * site.seasonalEfficiency * site.technologyEfficiency;
        
        site.dailyProgress = baseProgress * totalEfficiency;
        site.estimatedCompletion = Math.ceil(site.remainingTime / site.dailyProgress);
    }

    // Remove worker from construction site
    removeWorker(buildingId, workerId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return false;

        const workerIndex = site.assignedWorkers.findIndex(w => w.id === workerId);
        if (workerIndex === -1) return false;

        // Remove worker
        site.assignedWorkers.splice(workerIndex, 1);
        
        // Update worker status
        const worker = this.getWorkerById(workerId);
        if (worker) {
            worker.status = 'idle';
            worker.assignedBuildingId = null;
        }

        // Recalculate site efficiency
        this.recalculateSiteEfficiency(site);

        console.log(`[Construction] Removed worker from ${site.buildingType} construction`);
        return true;
    }

    // Set technology bonus for construction efficiency
    setTechnologyBonus(technologyName, level) {
        this.technologyBonuses.set(technologyName, level);
        
        // Update all active construction sites with new technology efficiency
        this.constructionSites.forEach(site => {
            this.recalculateSiteEfficiency(site);
        });
        
        console.log(`[Construction] Technology ${technologyName} set to level ${level}`);
    }

    // Process daily construction progress (wiki-documented system)
    processDailyConstruction() {
        this.constructionSites.forEach((site, buildingId) => {
            // Skip if no workers assigned
            if (site.assignedWorkers.length === 0) {
                site.dailyProgress = 0;
                return;
            }

            // Calculate actual daily progress
            const progressMade = Math.min(site.dailyProgress, site.remainingTime);
            site.remainingTime -= progressMade;
            
            // Award experience to workers
            site.assignedWorkers.forEach(workerAssignment => {
                const worker = this.getWorkerById(workerAssignment.id);
                if (worker) {
                    // Award experience based on relevant skills
                    const relevantSkills = this.getRelevantSkills(worker, site.buildingType);
                    Object.keys(relevantSkills).forEach(skillName => {
                        worker.skills = worker.skills || {};
                        const currentLevel = worker.skills[skillName] || 0;
                        
                        // Experience gain: 1-3 XP per day based on task difficulty and aptitude
                        const baseXP = 1 + Math.random() * 2;
                        const difficultyMultiplier = this.getBuildingDifficulty(site.buildingType);
                        const xpGained = Math.round(baseXP * difficultyMultiplier);
                        
                        worker.skills[skillName] = currentLevel + xpGained;
                        
                        // Skill level progression check
                        const newSkillLevel = this.getSkillLevel(worker.skills[skillName]);
                        const oldSkillLevel = this.getSkillLevel(currentLevel);
                        
                        if (newSkillLevel > oldSkillLevel) {
                            console.log(`[Construction] ${worker.name} advanced to ${this.getSkillLevelName(newSkillLevel)} in ${skillName}!`);
                            
                            // Show notification if available
                            if (window.showNotification) {
                                window.showNotification(
                                    `📈 Skill Advancement!`,
                                    `${worker.name} is now ${this.getSkillLevelName(newSkillLevel)} in ${skillName}`,
                                    { timeout: 3000, icon: '🔨' }
                                );
                            }
                        }
                    });
                    
                    // Award general construction experience
                    worker.experience = worker.experience || {};
                    worker.experience.construction = (worker.experience.construction || 0) + 0.1;
                }
            });

            // Check if construction is complete
            if (site.remainingTime <= 0) {
                this.completeConstruction(buildingId);
            } else {
                // Update estimated completion
                this.updateEstimatedCompletion(site);
            }
        });
    }

    getBuildingDifficulty(buildingType) {
        // Difficulty multipliers for experience gain
        const difficulties = {
            // Simple buildings
            house: 1.0,
            farm: 1.0,
            
            // Medium complexity
            sawmill: 1.2,
            workshop: 1.3,
            quarry: 1.4,
            blacksmith: 1.4,
            
            // Complex buildings
            townCenter: 1.5,
            barracks: 1.5,
            market: 1.6,
            temple: 1.7,
            academy: 1.8,
            
            // Advanced buildings
            keep: 2.0,
            castle: 2.5,
            magicalTower: 2.2,
            monument: 2.8
        };
        
        return difficulties[buildingType] || 1.0;
    }

    getSkillLevel(xp) {
        if (xp >= 1001) return 5; // Grandmaster
        if (xp >= 601) return 4;  // Expert
        if (xp >= 301) return 3;  // Journeyman
        if (xp >= 101) return 2;  // Apprentice
        return 1; // Novice
    }

    getSkillLevelName(level) {
        const names = ['', 'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Grandmaster'];
        return names[level] || 'Novice';
    }

    // Complete construction of a building
    completeConstruction(buildingId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return;

        // Find the building in gameState
        const building = this.gameState.buildings.find(b => b.id === buildingId);
        if (!building) return;

        // Complete the building
        building.level = site.buildingLevel;
        building.built = true;
        building.constructionProgress = undefined;
        building.constructionDaysRemaining = undefined;
        delete building.startedAt;
        
        // Release workers and award completion experience
        site.assignedWorkers.forEach(workerAssignment => {
            const worker = this.getWorkerById(workerAssignment.id);
            if (worker) {
                worker.status = 'idle';
                worker.assignedBuildingId = null;
                
                // Award substantial completion experience
                worker.experience = worker.experience || {};
                worker.experience.construction = (worker.experience.construction || 0) + 1;
                
                // Award skill bonuses based on building complexity
                const skillBonus = this.getBuildingDifficulty(site.buildingType);
                const relevantSkills = this.getRelevantSkills(worker, site.buildingType);
                
                Object.keys(relevantSkills).forEach(skillName => {
                    worker.skills = worker.skills || {};
                    worker.skills[skillName] = (worker.skills[skillName] || 0) + Math.round(skillBonus * 10);
                });
            }
        });

        // Remove construction site
        this.constructionSites.delete(buildingId);
        
        console.log(`[Construction] Completed construction of ${site.buildingType} (Level ${site.buildingLevel})`);
        
        // Trigger building effects if available
        if (window.villageManager?.buildingEffectsManager) {
            window.villageManager.buildingEffectsManager.applyBuildingEffects(
                building.type, 
                `${building.x},${building.y}`
            );
        }

        // Show completion notification
        if (window.showNotification) {
            window.showNotification(
                `🏗️ Construction Complete!`,
                `${site.buildingType} (Level ${site.buildingLevel}) is now operational`,
                { timeout: 5000, icon: '✅' }
            );
        }

        // Trigger any completion events
        if (window.eventBus) {
            window.eventBus.emit('buildingCompleted', {
                buildingType: site.buildingType,
                buildingLevel: site.buildingLevel,
                position: site.position,
                constructionTime: site.totalBuildTime,
                workersInvolved: site.assignedWorkers.length
            });
        }
    }

    // Get construction progress for display
    getConstructionProgress(buildingId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return null;

        const progress = Math.max(0, 1 - (site.remainingTime / site.totalBuildTime));

        return {
            buildingType: site.buildingType,
            buildingLevel: site.buildingLevel,
            progress: progress,
            progressPercent: Math.round(progress * 100),
            totalBuildTime: site.totalBuildTime,
            remainingTime: site.remainingTime,
            assignedWorkers: site.assignedWorkers.length,
            maxWorkers: site.maxWorkers,
            dailyProgress: site.dailyProgress,
            estimatedCompletion: site.estimatedCompletion,
            
            // Efficiency breakdown
            skillEfficiency: site.skillEfficiency,
            seasonalEfficiency: site.seasonalEfficiency,
            technologyEfficiency: site.technologyEfficiency,
            teamworkBonus: site.teamworkBonus,
            
            // Status
            status: site.status,
            currentSeason: this.getCurrentSeason()
        };
    }

    // Get all active construction sites
    getAllConstructionSites() {
        const sites = {};
        this.constructionSites.forEach((site, buildingId) => {
            sites[buildingId] = this.getConstructionProgress(buildingId);
        });
        return sites;
    }

    // Get available workers for construction assignment
    getAvailableWorkers() {
        const allWorkers = [];
        
        // Get workers from PopulationManager if available
        if (this.gameState.populationManager?.population && Array.isArray(this.gameState.populationManager.population)) {
            allWorkers.push(...this.gameState.populationManager.population);
        } else if (this.gameState.population && Array.isArray(this.gameState.population)) {
            allWorkers.push(...this.gameState.population);
        }

        return allWorkers.filter(worker => 
            worker.status === 'idle' && 
            worker.age >= 16 && 
            worker.age <= 70 && // Working age
            (worker.health || 100) >= 50 // Minimum health for construction work
        ).map(worker => ({
            id: worker.id,
            name: worker.name,
            age: worker.age,
            skills: worker.skills || {},
            efficiency: 0, // Will be calculated when assigned
            health: worker.health || 100,
            happiness: worker.happiness || 75
        }));
    }

    // Auto-assign workers to construction sites that need them
    autoAssignWorkers() {
        const availableWorkers = this.getAvailableWorkers();
        if (availableWorkers.length === 0) return 0;

        let assignedCount = 0;
        
        // Get construction sites that need workers (prioritize by urgency)
        const sitesNeedingWorkers = Array.from(this.constructionSites.values())
            .filter(site => site.assignedWorkers.length < site.maxWorkers)
            .sort((a, b) => {
                // Prioritize by: fewer workers first, then by building importance
                const workerDiff = a.assignedWorkers.length - b.assignedWorkers.length;
                if (workerDiff !== 0) return workerDiff;
                
                // Building priority (important buildings first)
                const priorities = {
                    townCenter: 1, keep: 2, castle: 3,
                    house: 4, farm: 5,
                    barracks: 6, workshop: 7, blacksmith: 8,
                    academy: 9, temple: 10, monument: 11
                };
                
                const aPriority = priorities[a.buildingType] || 99;
                const bPriority = priorities[b.buildingType] || 99;
                return aPriority - bPriority;
            });

        // Assign workers to sites
        let workerIndex = 0;
        for (const site of sitesNeedingWorkers) {
            // Try to assign up to optimal team size (3 workers per site)
            while (site.assignedWorkers.length < Math.min(3, site.maxWorkers) && workerIndex < availableWorkers.length) {
                if (this.assignWorker(site.buildingId, availableWorkers[workerIndex].id)) {
                    assignedCount++;
                }
                workerIndex++;
            }
            
            if (workerIndex >= availableWorkers.length) break;
        }

        if (assignedCount > 0) {
            console.log(`[Construction] Auto-assigned ${assignedCount} workers to construction sites`);
        }
        
        return assignedCount;
    }

    // Debug method to get system status
    getSystemStatus() {
        return {
            activeSites: this.constructionSites.size,
            currentSeason: this.getCurrentSeason(),
            seasonalEffects: this.currentSeasonalEffects,
            technologyBonuses: Object.fromEntries(this.technologyBonuses),
            totalAssignedWorkers: Array.from(this.constructionSites.values())
                .reduce((sum, site) => sum + site.assignedWorkers.length, 0)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConstructionManager;
}

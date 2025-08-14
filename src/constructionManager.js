// Wiki-Documented Work-Point Construction System Manager
// Implements skill-based, builder job integration, and work-point accumulation system
// Each builder contributes +1 point per day toward building completion
// Following the specifications from buildings.md, mechanics.md, and GAME_BALANCE.md

class ConstructionManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.constructionSites = new Map(); // Track active construction sites
        this.seasonalEffects = this.initializeSeasonalEffects();
        this.technologyBonuses = new Map(); // Technology research effects
        
        // Initialize with current season
        this.updateSeasonalEffects();
    }

    initializeSeasonalEffects() {
        return {
            // Major Seasons (30 days each)
            spring: { food: 1.2, wood: 1.0, stone: 1.0, construction: 1.1 }, // +10% construction progress
            summer: { food: 1.5, wood: 0.8, stone: 1.2, construction: 1.2 }, // +20% construction progress
            autumn: { food: 1.0, wood: 1.3, stone: 1.0, construction: 1.0 }, // Normal construction
            winter: { food: 0.7, wood: 1.5, stone: 0.8, construction: 0.8 }, // -20% construction progress
            
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

    // Initialize construction site with work-point system
    initializeConstructionSite(building) {
        const buildingData = GameData?.buildingCosts?.[building.type];
        if (!buildingData) {
            console.error('[Construction] No building data found for:', building.type);
            return null;
        }

        const basePointRequirement = GameData?.constructionPoints?.[building.type] || 25;
        const buildingLevel = building.level || 1;
        
        // Calculate actual construction points using work-point formula:
        // BuildingPoints = BasePoints × (1 + (BuildingLevel × 0.3)) × (1 - (ConstructionTech × 0.05))
        const levelMultiplier = 1 + ((buildingLevel - 1) * 0.3);
        const techBonus = this.technologyBonuses.get('construction') || 0;
        const techMultiplier = 1 - (techBonus * 0.05);
        
        const calculatedPointRequirement = Math.ceil(basePointRequirement * levelMultiplier * techMultiplier);

        const constructionSite = {
            buildingId: building.id,
            buildingType: building.type,
            buildingLevel: buildingLevel,
            position: { x: building.x, y: building.y },
            
            // Work-point progress system
            totalPoints: calculatedPointRequirement,
            currentPoints: 0,
            pointsRemaining: calculatedPointRequirement,
            
            // Builder integration
            assignedBuilders: [], // Track builder job assignments from JobManager
            dailyProgress: 0,
            
            // Efficiency modifiers for point generation
            skillEfficiency: 1.0,
            seasonalEfficiency: 1.0,
            technologyEfficiency: 1.0,
            teamworkBonus: 1.0,
            
            // Construction materials and quality
            materialQuality: 1.0,
            constructionQuality: 1.0,
            
            // Status tracking
            startedDay: this.gameState.currentDay || 0,
            estimatedCompletion: 0,
            status: 'active'
        };

        this.constructionSites.set(building.id, constructionSite);
        console.log(`[Construction] Initialized ${building.type} (Level ${buildingLevel}) - ${calculatedPointRequirement} points required`);
        
        return constructionSite;
    }

    // Get builders working on this construction site via JobManager
    getBuildersForSite(buildingId) {
        if (!this.gameState.jobManager) {
            console.warn('[Construction] JobManager not available');
            return [];
        }

        // Find all buildings that provide builder jobs and check if their builders are assigned to this site
        const builders = [];
        
        // Get all available jobs from job manager
        this.gameState.jobManager.jobAssignments.forEach((jobTypes, assignmentBuildingId) => {
            if (jobTypes.builder) {
                jobTypes.builder.forEach(workerId => {
                    const worker = this.gameState.jobManager.getWorkerById(workerId);
                    if (worker && worker.jobAssignment) {
                        // Check if this builder is working on our construction site
                        // For now, we'll assume builders work on the nearest/priority construction site
                        builders.push({
                            id: workerId,
                            name: worker.name,
                            efficiency: this.calculateBuilderEfficiency(worker),
                            assignedBuildingId: assignmentBuildingId
                        });
                    }
                });
            }
        });

        return builders;
    }

    calculateBuilderEfficiency(worker) {
        let efficiency = 1.0; // Base +1 point per builder per day

        // Skills that affect building (from original system but simplified)
        const skills = worker.skills || {};
        const relevantSkills = ['Carpentry', 'Masonry', 'Engineering'];
        
        let skillBonus = 0;
        let skillCount = 0;
        
        relevantSkills.forEach(skillName => {
            const skillLevel = skills[skillName] || 0;
            if (skillLevel > 0) {
                // Simplified skill bonus: small multipliers for work-point system
                if (skillLevel >= 1000) skillBonus += 0.5; // Grandmaster: +0.5 points
                else if (skillLevel >= 600) skillBonus += 0.3; // Expert: +0.3 points
                else if (skillLevel >= 300) skillBonus += 0.2; // Journeyman: +0.2 points
                else if (skillLevel >= 100) skillBonus += 0.1; // Apprentice: +0.1 points
                else skillBonus += 0.05; // Novice: +0.05 points
                
                skillCount++;
            }
        });
        
        if (skillCount > 0) {
            efficiency += skillBonus / skillCount; // Average skill bonus
        }

        // Age factor (reduced impact for work-point system)
        const age = worker.age || 25;
        let ageFactor = 1.0;
        if (age < 18) ageFactor = 0.8; // Young workers
        else if (age < 25) ageFactor = 0.95; // Learning workers
        else if (age <= 45) ageFactor = 1.0; // Peak workers
        else if (age <= 60) ageFactor = 0.98; // Experienced workers
        else ageFactor = 0.9; // Elder workers

        // Health and happiness factors (reduced impact)
        const healthFactor = Math.max(0.8, (worker.health || 100) / 100);
        const happinessFactor = Math.max(0.9, (worker.happiness || 75) / 100);

        efficiency *= ageFactor * healthFactor * happinessFactor;

        return Math.max(0.5, efficiency); // Minimum 0.5 points per builder
    }

    // Recalculate site efficiency and estimated completion
    recalculateSiteEfficiency(site) {
        // Get builders working on this site via JobManager
        const builders = this.getBuildersForSite(site.buildingId);
        site.assignedBuilders = builders;
        
        if (builders.length === 0) {
            site.skillEfficiency = 1.0;
            site.teamworkBonus = 1.0;
            site.dailyProgress = 0;
        } else {
            // Calculate total daily points from all builders
            const totalPoints = builders.reduce((sum, builder) => sum + builder.efficiency, 0);
            site.skillEfficiency = totalPoints / builders.length; // Average efficiency per builder
            
            // Teamwork bonus for multiple builders
            const builderCount = builders.length;
            if (builderCount === 1) site.teamworkBonus = 1.0;
            else if (builderCount === 2) site.teamworkBonus = 1.05; // +5% for pair work
            else if (builderCount === 3) site.teamworkBonus = 1.1; // +10% for small team
            else if (builderCount <= 5) site.teamworkBonus = 1.15; // +15% for optimal team
            else site.teamworkBonus = 1.15 + (builderCount - 5) * 0.01; // Diminishing returns
            
            site.dailyProgress = totalPoints;
        }

        // Update seasonal efficiency
        this.updateSeasonalEffects();
        site.seasonalEfficiency = this.currentSeasonalEffects?.construction || 1.0;
        
        // Technology efficiency (from research)
        site.technologyEfficiency = 1 + (this.technologyBonuses.get('construction') || 0) * 0.02; // Reduced for work-point system

        // Calculate final daily progress with all modifiers
        const finalMultiplier = site.teamworkBonus * site.seasonalEfficiency * site.technologyEfficiency;
        site.dailyProgress = Math.max(0, site.dailyProgress * finalMultiplier);

        // Update estimated completion
        this.updateEstimatedCompletion(site);
    }

    updateEstimatedCompletion(site) {
        if (site.dailyProgress <= 0) {
            site.estimatedCompletion = Infinity; // No builders assigned
            return;
        }

        site.estimatedCompletion = Math.ceil(site.pointsRemaining / site.dailyProgress);
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

    // Process daily construction progress (work-point system) - FOCUS ON ONE BUILDING AT A TIME
    processDailyConstruction() {
        console.log(`[Construction] Processing daily construction - ${this.constructionSites.size} active sites`);
        
        // Find the highest priority construction site (first in queue)
        let prioritySite = null;
        let priorityBuildingId = null;
        
        for (const [buildingId, site] of this.constructionSites) {
            if (site.pointsRemaining > 0) {
                prioritySite = site;
                priorityBuildingId = buildingId;
                console.log(`[Construction] Priority construction: ${site.buildingType} (${site.currentPoints}/${site.totalPoints} points)`);
                break; // Take the first available construction site
            }
        }
        
        // If we have a priority site, focus all builders on it
        if (prioritySite) {
            // Recalculate efficiency and builders for this site
            this.recalculateSiteEfficiency(prioritySite);
            
            // Skip if no builders assigned
            if (prioritySite.assignedBuilders.length === 0) {
                prioritySite.dailyProgress = 0;
                console.log(`[Construction] ${prioritySite.buildingType}: No builders assigned`);
                return;
            }

            // Calculate points gained this day
            const pointsGained = Math.min(prioritySite.dailyProgress, prioritySite.pointsRemaining);
            prioritySite.currentPoints += pointsGained;
            prioritySite.pointsRemaining -= pointsGained;
            
            console.log(`[Construction] ${prioritySite.buildingType}: +${pointsGained.toFixed(1)} points (${prioritySite.currentPoints}/${prioritySite.totalPoints})`);
            
            // Award experience to builders
            prioritySite.assignedBuilders.forEach(builderInfo => {
                const worker = this.gameState.jobManager?.getWorkerById(builderInfo.id);
                if (worker) {
                    // Award experience based on construction complexity
                    const relevantSkills = this.getRelevantSkills(worker, site.buildingType);
                    Object.keys(relevantSkills).forEach(skillName => {
                        worker.skills = worker.skills || {};
                        const currentLevel = worker.skills[skillName] || 0;
                        
                        // Experience gain: 1-2 XP per day based on task difficulty
                        const baseXP = 1 + Math.random();
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
            if (prioritySite.pointsRemaining <= 0) {
                this.completeConstruction(priorityBuildingId);
            } else {
                // Update estimated completion
                this.updateEstimatedCompletion(prioritySite);
            }
        } else {
            console.log(`[Construction] No active construction sites requiring work`);
        }
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
            tent: ['Carpentry'],
            
            // Stone-heavy buildings
            townCenter: ['Masonry', 'Engineering', 'Administration'],
            quarry: ['Quarrying', 'Mining', 'Engineering'],
            
            // Mixed construction
            workshop: ['Carpentry', 'Masonry', 'Engineering'],
            blacksmith: ['Blacksmithing', 'Engineering', 'Masonry'],
            market: ['Carpentry', 'Masonry', 'Trade'],
            buildersHut: ['Carpentry', 'Masonry', 'Engineering'],
            
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
        building.constructionPointsRemaining = undefined;
        delete building.startedAt;
        
        // Award completion experience to builders (via JobManager)
        site.assignedBuilders.forEach(builderInfo => {
            const worker = this.gameState.jobManager?.getWorkerById(builderInfo.id);
            if (worker) {
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
        
        console.log(`[Construction] Completed construction of ${site.buildingType} (Level ${site.buildingLevel}) with ${site.totalPoints} work points`);
        
        // Trigger building effects if available
        if (window.villageManager?.buildingEffectsManager) {
            window.villageManager.buildingEffectsManager.applyBuildingEffects(
                building.type, 
                `${building.x},${building.y}`
            );
        }

        // Re-render buildings to update visual appearance
        if (window.villageManager?.renderBuildings) {
            console.log(`[Construction] Re-rendering buildings after completion of ${site.buildingType}`);
            window.villageManager.renderBuildings();
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
                totalPoints: site.totalPoints,
                buildersInvolved: site.assignedBuilders.length
            });
        }

        // Optimize worker assignments for the newly completed building
        if (this.gameState.jobManager) {
            console.log(`[Construction] Triggering worker optimization for completed ${site.buildingType}`);
            this.gameState.jobManager.onBuildingCompleted(buildingId);
        }
    }

    // Get construction progress for display (work-point system)
    getConstructionProgress(buildingId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return null;

        const progress = Math.max(0, site.currentPoints / site.totalPoints);

        return {
            buildingType: site.buildingType,
            buildingLevel: site.buildingLevel,
            progress: progress,
            progressPercent: Math.round(progress * 100),
            totalPoints: site.totalPoints,
            currentPoints: site.currentPoints,
            pointsRemaining: site.pointsRemaining,
            assignedBuilders: site.assignedBuilders.length,
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

    // Get available workers for construction assignment (now handled by JobManager)
    getAvailableWorkers() {
        // Construction workers are now managed through the JobManager
        // This method is deprecated but kept for compatibility
        console.warn('[Construction] Worker assignment is now handled through JobManager');
        
        if (this.gameState.jobManager) {
            return this.gameState.jobManager.getAvailableWorkers();
        }
        
        return [];
    }

    // Auto-assign builders is now handled by JobManager
    autoAssignWorkers() {
        console.warn('[Construction] Auto-assignment is now handled through JobManager');
        
        if (this.gameState.jobManager) {
            return this.gameState.jobManager.autoAssignWorkers();
        }
        
        return 0;
    }

    // Debug method to get system status
    getSystemStatus() {
        return {
            activeSites: this.constructionSites.size,
            currentSeason: this.getCurrentSeason(),
            seasonalEffects: this.currentSeasonalEffects,
            technologyBonuses: Object.fromEntries(this.technologyBonuses),
            totalAssignedBuilders: Array.from(this.constructionSites.values())
                .reduce((sum, site) => sum + site.assignedBuilders.length, 0),
            totalProgressPerDay: Array.from(this.constructionSites.values())
                .reduce((sum, site) => sum + site.dailyProgress, 0)
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConstructionManager;
}

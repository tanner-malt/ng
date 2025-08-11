// Construction System Manager
// Handles completeness-based building construction with builder assistance and magical acceleration

class ConstructionManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.constructionSites = new Map(); // Track active construction sites
        this.builderEfficiency = new Map(); // Track builders assigned to sites
        this.magicalAcceleration = new Map(); // Track magical effects on construction
    }

    // Initialize construction site with completeness system
    initializeConstructionSite(building) {
        const buildingData = window.gameData?.buildingCosts?.[building.type];
        if (!buildingData) {
            console.error('[Construction] No building data found for:', building.type);
            return;
        }

        const constructionSite = {
            buildingId: building.id,
            buildingType: building.type,
            position: { x: building.x, y: building.y },
            completeness: 0.0, // 0.0 to 1.0 (0% to 100%)
            baseWorkRequired: this.calculateBaseWorkRequired(building.type),
            workCompleted: 0,
            assignedBuilders: [],
            activeEffects: {
                runesOfHaste: 0, // Magical acceleration multiplier
                masterBuilder: false, // Expert builder bonus
                teamwork: 1.0, // Multiple builder efficiency
                weatherBonus: 1.0 // Environmental factors
            },
            dailyProgress: 0,
            estimatedCompletion: 0
        };

        this.constructionSites.set(building.id, constructionSite);
        console.log(`[Construction] Initialized site for ${building.type} requiring ${constructionSite.baseWorkRequired} work units`);
        
        return constructionSite;
    }

    // Calculate base work required based on building complexity
    calculateBaseWorkRequired(buildingType) {
        const baseWork = {
            // Basic buildings
            house: 100,
            farm: 120,
            townCenter: 200,
            
            // Royal buildings (complex)
            keep: 500,
            monument: 800,
            
            // Military buildings
            barracks: 300,
            fortifications: 600,
            militaryAcademy: 450,
            
            // Production buildings
            workshop: 250,
            mine: 400,
            lumberMill: 300,
            
            // Advanced buildings (very complex)
            magicalTower: 1000,
            grandLibrary: 750
        };

        return baseWork[buildingType] || 150; // Default for unknown buildings
    }

    // Assign builder to construction site
    assignBuilder(buildingId, builderId) {
        const site = this.constructionSites.get(buildingId);
        const builder = this.gameState.populationManager?.population.find(p => p.id === builderId);
        
        if (!site || !builder) {
            console.warn('[Construction] Cannot assign builder - site or builder not found');
            return false;
        }

        // Check if builder is already assigned
        if (site.assignedBuilders.some(b => b.id === builderId)) {
            console.warn('[Construction] Builder already assigned to this site');
            return false;
        }

        // Assign builder
        site.assignedBuilders.push({
            id: builderId,
            name: builder.name,
            skill: builder.skills?.Building || 1,
            efficiency: this.calculateBuilderEfficiency(builder),
            joinedDay: this.gameState.currentDay
        });

        // Update builder status
        builder.status = 'building';
        builder.buildingId = buildingId;

        // Recalculate teamwork bonus
        this.updateTeamworkBonus(site);

        console.log(`[Construction] Assigned ${builder.name} to ${site.buildingType} construction`);
        return true;
    }

    // Calculate individual builder efficiency
    calculateBuilderEfficiency(builder) {
        let efficiency = 1.0;
        
        // Base skill bonus
        const buildingSkill = builder.skills?.Building || 1;
        efficiency += (buildingSkill - 1) * 0.1; // +10% per skill level above 1
        
        // Experience bonus
        if (builder.experience?.construction) {
            efficiency += builder.experience.construction * 0.05; // +5% per construction project completed
        }
        
        // Trait bonuses
        if (builder.traits?.includes('strong')) {
            efficiency += 0.15; // +15% for strong trait
        }
        if (builder.traits?.includes('crafting_expert')) {
            efficiency += 0.20; // +20% for crafting expertise
        }
        
        // Health and happiness factors
        const healthFactor = (builder.health || 100) / 100;
        const happinessFactor = (builder.happiness || 75) / 100;
        efficiency *= healthFactor * happinessFactor;
        
        return Math.max(0.1, efficiency); // Minimum 10% efficiency
    }

    // Update teamwork bonus based on number of builders
    updateTeamworkBonus(site) {
        const builderCount = site.assignedBuilders.length;
        
        if (builderCount <= 1) {
            site.activeEffects.teamwork = 1.0;
        } else if (builderCount === 2) {
            site.activeEffects.teamwork = 1.3; // +30% for pair work
        } else if (builderCount === 3) {
            site.activeEffects.teamwork = 1.5; // +50% for small team
        } else if (builderCount <= 5) {
            site.activeEffects.teamwork = 1.7; // +70% for optimal team
        } else {
            // Diminishing returns for large teams
            site.activeEffects.teamwork = 1.7 + (builderCount - 5) * 0.05;
        }
    }

    // Remove builder from construction site
    removeBuilder(buildingId, builderId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return false;

        const builderIndex = site.assignedBuilders.findIndex(b => b.id === builderId);
        if (builderIndex === -1) return false;

        // Remove builder
        site.assignedBuilders.splice(builderIndex, 1);
        
        // Update builder status
        const builder = this.gameState.populationManager?.population.find(p => p.id === builderId);
        if (builder) {
            builder.status = 'idle';
            builder.buildingId = null;
        }

        // Recalculate teamwork bonus
        this.updateTeamworkBonus(site);

        console.log(`[Construction] Removed builder from ${site.buildingType} construction`);
        return true;
    }

    // Apply Runes of Haste for magical acceleration
    applyRunesOfHaste(buildingId, runeLevel = 1) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return false;

        // Check if player has runes in inventory
        if (!this.gameState.inventory?.hasItem('runes_of_haste', runeLevel)) {
            console.warn('[Construction] No Runes of Haste available');
            return false;
        }

        // Consume rune
        this.gameState.inventory.removeItem('runes_of_haste', 1);
        
        // Apply magical acceleration
        const accelerationBonus = runeLevel * 0.5; // 50% per rune level
        site.activeEffects.runesOfHaste += accelerationBonus;
        
        // Magical effects decay over time
        setTimeout(() => {
            site.activeEffects.runesOfHaste = Math.max(0, site.activeEffects.runesOfHaste - accelerationBonus);
        }, 7 * 24 * 60 * 60 * 1000); // 7 days

        console.log(`[Construction] Applied Runes of Haste (Level ${runeLevel}) to ${site.buildingType}`);
        
        if (window.showNotification) {
            window.showNotification(
                `✨ Runes of Haste Applied!`,
                `Construction speed increased by ${Math.round(accelerationBonus * 100)}% for 7 days`,
                { timeout: 4000, icon: '🔮' }
            );
        }
        
        return true;
    }

    // Process daily construction progress
    processDailyConstruction() {
        this.constructionSites.forEach((site, buildingId) => {
            const dailyWork = this.calculateDailyWork(site);
            site.workCompleted += dailyWork;
            site.dailyProgress = dailyWork;
            
            // Update completeness
            const previousCompleteness = site.completeness;
            site.completeness = Math.min(1.0, site.workCompleted / site.baseWorkRequired);
            
            // Update estimated completion
            if (dailyWork > 0) {
                const remainingWork = site.baseWorkRequired - site.workCompleted;
                site.estimatedCompletion = Math.ceil(remainingWork / dailyWork);
            }
            
            // Check if construction is complete
            if (site.completeness >= 1.0 && previousCompleteness < 1.0) {
                this.completeConstruction(buildingId);
            }
            
            // Award experience to builders
            site.assignedBuilders.forEach(builder => {
                const villager = this.gameState.populationManager?.population.find(p => p.id === builder.id);
                if (villager) {
                    villager.experience = villager.experience || {};
                    villager.experience.construction = (villager.experience.construction || 0) + 0.1;
                    
                    // Skill growth chance
                    if (Math.random() < 0.05) { // 5% chance daily
                        villager.skills = villager.skills || {};
                        villager.skills.Building = (villager.skills.Building || 1) + 1;
                        console.log(`[Construction] ${villager.name} gained Building skill!`);
                    }
                }
            });
        });
    }

    // Calculate daily work output for a construction site
    calculateDailyWork(site) {
        let totalWork = 0;
        
        // Calculate work from each builder
        site.assignedBuilders.forEach(builder => {
            totalWork += builder.efficiency * 10; // Base 10 work units per builder per day
        });
        
        // Apply teamwork bonus
        totalWork *= site.activeEffects.teamwork;
        
        // Apply magical acceleration
        totalWork *= (1 + site.activeEffects.runesOfHaste);
        
        // Apply weather bonus
        totalWork *= site.activeEffects.weatherBonus;
        
        // Master builder bonus
        if (site.activeEffects.masterBuilder) {
            totalWork *= 1.25; // +25% for master builder
        }
        
        return Math.round(totalWork);
    }

    // Complete construction of a building
    completeConstruction(buildingId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return;

        // Find the building in gameState
        const building = this.gameState.buildings.find(b => b.id === buildingId);
        if (!building) return;

        // Complete the building
        building.level = 1;
        delete building.constructionDaysRemaining;
        
        // Release builders
        site.assignedBuilders.forEach(builder => {
            const villager = this.gameState.populationManager?.population.find(p => p.id === builder.id);
            if (villager) {
                villager.status = 'idle';
                villager.buildingId = null;
                
                // Award completion experience
                villager.experience = villager.experience || {};
                villager.experience.construction = (villager.experience.construction || 0) + 1;
            }
        });

        // Remove construction site
        this.constructionSites.delete(buildingId);
        
        console.log(`[Construction] Completed construction of ${site.buildingType}`);
        
        // Apply building effects
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
                `${site.buildingType} is now operational`,
                { timeout: 5000, icon: '✅' }
            );
        }
    }

    // Get construction progress for display
    getConstructionProgress(buildingId) {
        const site = this.constructionSites.get(buildingId);
        if (!site) return null;

        return {
            completeness: site.completeness,
            workCompleted: site.workCompleted,
            baseWorkRequired: site.baseWorkRequired,
            assignedBuilders: site.assignedBuilders.length,
            dailyProgress: site.dailyProgress,
            estimatedCompletion: site.estimatedCompletion,
            activeEffects: { ...site.activeEffects }
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

    // Auto-assign available builders to construction sites
    autoAssignBuilders() {
        // Get available builders
        const availableBuilders = this.gameState.populationManager?.population.filter(p => 
            p.role === 'builder' && 
            p.status === 'idle' && 
            p.age >= 28 && 
            p.age <= 180
        ) || [];

        if (availableBuilders.length === 0) return;

        // Get construction sites that need builders
        const sitesNeedingBuilders = Array.from(this.constructionSites.values())
            .filter(site => site.assignedBuilders.length < 5) // Max 5 builders per site
            .sort((a, b) => a.assignedBuilders.length - b.assignedBuilders.length); // Prioritize sites with fewer builders

        // Assign builders to sites
        let builderIndex = 0;
        for (const site of sitesNeedingBuilders) {
            while (site.assignedBuilders.length < 3 && builderIndex < availableBuilders.length) { // Target 3 builders per site
                this.assignBuilder(site.buildingId, availableBuilders[builderIndex].id);
                builderIndex++;
            }
            
            if (builderIndex >= availableBuilders.length) break;
        }

        if (builderIndex > 0) {
            console.log(`[Construction] Auto-assigned ${builderIndex} builders to construction sites`);
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConstructionManager;
}

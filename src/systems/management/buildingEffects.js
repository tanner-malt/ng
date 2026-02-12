// Building Effects System
// Handles special building bonuses, upgrades, and interactions

class BuildingEffectsManager {
    constructor(gameState, villageManager) {
        this.gameState = gameState;
        this.villageManager = villageManager;
        this.activeBonuses = new Map(); // Track active building bonuses
        this.buildingLevels = new Map(); // Track building upgrade levels
        this.specializations = new Map(); // Track building specializations
    }

    // Apply building effects when constructed
    applyBuildingEffects(buildingType, position) {
        console.log(`[BuildingEffects] Applying effects for ${buildingType} at ${position}`);
        
        switch(buildingType) {
            case 'keep':
                this.applyKeepEffects(position);
                break;
            case 'monument':
                this.applyMonumentEffects(position);
                break;
            case 'barracks':
                this.applyBarracksEffects(position);
                break;
            case 'fortifications':
                this.applyFortificationEffects(position);
                break;
            case 'militaryAcademy':
                this.applyMilitaryAcademyEffects(position);
                break;
            case 'workshop':
                this.applyWorkshopEffects(position);
                break;
            case 'mine':
                this.applyMineEffects(position);
                break;
            case 'lumberMill':
                this.applyLumberMillEffects(position);
                break;
            case 'magicalTower':
                this.applyMagicalTowerEffects(position);
                break;
            case 'grandLibrary':
                this.applyGrandLibraryEffects(position);
                break;
        }
        
        // Update village stats after building construction
        this.updateVillageStats();
    }

    // Keep effects - Royal family management and dynasty bonuses
    applyKeepEffects(position) {
        const bonus = {
            type: 'keep',
            position: position,
            effects: {
                royalCapacity: 5, // Can house 5 royal family members
                dynastyBonus: 0.1, // 10% bonus to all production
                successionStability: 0.2, // 20% reduced chance of succession crisis
                diplomacyBonus: 15 // +15 to diplomatic relations
            }
        };
        
        this.activeBonuses.set(`keep_${position}`, bonus);
        
        // Initialize royal family if not exists
        if (!this.gameState.royalFamily) {
            this.gameState.royalFamily = new RoyalFamilyManager(this.gameState);
            this.gameState.royalFamily.initializeRoyalFamily();
        }
        
        console.log('[BuildingEffects] Keep constructed - royal family management enabled');
    }

    // Monument effects - Legacy points and cultural bonuses
    applyMonumentEffects(position) {
        const bonus = {
            type: 'monument',
            position: position,
            effects: {
                legacyGeneration: 2, // Generates 2 legacy points per day
                culturalInfluence: 25, // +25 cultural influence
                touristAttraction: 0.05, // 5% chance to attract visitors with gold
                morale: 15 // +15 village morale
            }
        };
        
        this.activeBonuses.set(`monument_${position}`, bonus);
        
        // Initialize legacy points if not exists
        if (!this.gameState.legacyPoints) {
            this.gameState.legacyPoints = 0;
        }
        
        console.log('[BuildingEffects] Monument constructed - legacy generation enabled');
    }

    // Barracks effects - Military training and unit production
    applyBarracksEffects(position) {
        const bonus = {
            type: 'barracks',
            position: position,
            effects: {
                militaryTraining: 20, // +20% military skill training speed
                unitCapacity: 10, // Can train 10 additional units
                recruitmentSpeed: 0.3, // 30% faster unit recruitment
                unitMorale: 10 // +10 morale for trained units
            }
        };
        
        this.activeBonuses.set(`barracks_${position}`, bonus);
        console.log('[BuildingEffects] Barracks constructed - military training enhanced');
    }

    // Fortifications effects - Defense and security
    applyFortificationEffects(position) {
        const bonus = {
            type: 'fortifications',
            position: position,
            effects: {
                villageDefense: 50, // +50 village defense rating
                wallStrength: 100, // Wall HP and durability
                siegeResistance: 0.25, // 25% reduced siege damage
                guardEfficiency: 0.2 // 20% more effective guards
            }
        };
        
        this.activeBonuses.set(`fortifications_${position}`, bonus);
        console.log('[BuildingEffects] Fortifications constructed - village defense improved');
    }

    // Military Academy effects - Advanced training and commanders
    applyMilitaryAcademyEffects(position) {
        const bonus = {
            type: 'militaryAcademy',
            position: position,
            effects: {
                commanderTraining: true, // Enables commander training
                advancedTactics: 0.15, // 15% bonus to battle tactics
                eliteUnitAccess: true, // Unlocks elite unit types
                strategicPlanning: 20 // +20 to strategic planning abilities
            }
        };
        
        this.activeBonuses.set(`militaryAcademy_${position}`, bonus);
        console.log('[BuildingEffects] Military Academy constructed - advanced military training enabled');
    }

    // Workshop effects - Production and tool manufacturing
    applyWorkshopEffects(position) {
        const bonus = {
            type: 'workshop',
            position: position,
            effects: {
                productionSpeed: 0.25, // 25% faster production
                toolQuality: 15, // +15% tool durability and effectiveness
                engineerSkillGain: 0.3, // 30% faster engineer skill growth
                specializedProduction: true // Can produce specialized items
            }
        };
        
        this.activeBonuses.set(`workshop_${position}`, bonus);
        console.log('[BuildingEffects] Workshop constructed - production capabilities enhanced');
    }

    // Mine effects - Resource extraction and geology
    applyMineEffects(position) {
        const bonus = {
            type: 'mine',
            position: position,
            effects: {
                miningYield: 0.4, // 40% bonus to ore/stone extraction
                rareOreChance: 0.1, // 10% chance to find rare ores
                geologicalSurvey: true, // Reveals nearby resource deposits
                miningSkillGain: 0.25 // 25% faster mining skill growth
            }
        };
        
        this.activeBonuses.set(`mine_${position}`, bonus);
        console.log('[BuildingEffects] Mine constructed - resource extraction improved');
    }

    // Lumber Mill effects - Advanced wood processing and construction efficiency
    applyLumberMillEffects(position) {
        const bonus = {
            type: 'lumberMill',
            position: position,
            effects: {
                woodProcessing: 0.50, // 50% bonus to wood processing efficiency
                lumberQuality: 30, // +30% lumber quality for construction
                constructionSpeed: 0.25, // 25% faster construction with refined materials
                forestryManagement: true, // Sustainable logging practices
                woodcuttingSkillGain: 0.35, // 35% faster woodcutting skill growth
                enablesAdvancedBuildings: true, // Unlocks buildings requiring refined lumber
                planksProduction: 0.40 // 40% bonus to planks production in radius
            }
        };
        
        this.activeBonuses.set(`lumberMill_${position}`, bonus);
        console.log('[BuildingEffects] Lumber Mill constructed - advanced wood processing and construction efficiency enabled');
        
        // Apply construction speed bonus to nearby buildings under construction
        this.applyConstructionSpeedBonus(position, 0.25);
    }

    // Magical Tower effects - Magic research and arcane studies
    applyMagicalTowerEffects(position) {
        const bonus = {
            type: 'magicalTower',
            position: position,
            effects: {
                magicalResearch: true, // Enables magical research

                arcaneKnowledge: 25, // +25 arcane knowledge points
                spellcastingBonus: 0.2, // 20% more effective spells
                magicalDefense: 30 // +30 magical defense for village
            }
        };
        
        this.activeBonuses.set(`magicalTower_${position}`, bonus);
        
        // Initialize magical research if not exists
        if (!this.gameState.magicalResearch) {
            this.gameState.magicalResearch = {
                points: 0,
                discoveries: [],
                activeSpells: []
            };
        }
        
        console.log('[BuildingEffects] Magical Tower constructed - arcane studies enabled');
    }

    // Grand Library effects - Knowledge and research
    applyGrandLibraryEffects(position) {
        const bonus = {
            type: 'grandLibrary',
            position: position,
            effects: {
                researchSpeed: 0.5, // 50% faster research

                knowledgePreservation: true, // Preserves knowledge through resets
                scholarTraining: 20, // +20% scholar skill training
                technologyUnlocks: true // Unlocks advanced technologies
            }
        };
        
        this.activeBonuses.set(`grandLibrary_${position}`, bonus);
        
        // Initialize research system if not exists
        if (!this.gameState.research) {
            this.gameState.research = {
                points: 0,
                completed: [],
                active: null
            };
        }
        
        console.log('[BuildingEffects] Grand Library constructed - research capabilities enhanced');
    }

    // Remove building effects when demolished
    removeBuildingEffects(buildingType, position) {
        const bonusKey = `${buildingType}_${position}`;
        this.activeBonuses.delete(bonusKey);
        this.buildingLevels.delete(bonusKey);
        this.specializations.delete(bonusKey);
        
        console.log(`[BuildingEffects] Removed effects for ${buildingType} at ${position}`);
        this.updateVillageStats();
    }

    // Upgrade building to next level
    upgradeBuildingLevel(buildingType, position) {
        const bonusKey = `${buildingType}_${position}`;
        const currentLevel = this.buildingLevels.get(bonusKey) || 1;
        const newLevel = currentLevel + 1;
        
        this.buildingLevels.set(bonusKey, newLevel);
        
        // Apply level bonus (10% improvement per level)
        const bonus = this.activeBonuses.get(bonusKey);
        if (bonus) {
            const levelMultiplier = 1 + (newLevel - 1) * 0.1;
            
            // Apply multiplier to all numeric effects
            Object.keys(bonus.effects).forEach(effect => {
                if (typeof bonus.effects[effect] === 'number') {
                    bonus.effects[effect] *= levelMultiplier;
                }
            });
            
            console.log(`[BuildingEffects] ${buildingType} upgraded to level ${newLevel}`);
        }
        
        this.updateVillageStats();
        return newLevel;
    }

    // Add specialization to building at levels 5, 10, 15
    addBuildingSpecialization(buildingType, position, specialization) {
        const bonusKey = `${buildingType}_${position}`;
        const level = this.buildingLevels.get(bonusKey) || 1;
        
        if (level < 5) {
            console.warn('[BuildingEffects] Building must be level 5+ for specializations');
            return false;
        }
        
        this.specializations.set(bonusKey, specialization);
        
        // Apply specialization effects
        this.applySpecializationEffects(buildingType, position, specialization);
        
        console.log(`[BuildingEffects] ${buildingType} specialized as ${specialization}`);
        return true;
    }

    // Apply specialization-specific effects
    applySpecializationEffects(buildingType, position, specialization) {
        const bonusKey = `${buildingType}_${position}`;
        const bonus = this.activeBonuses.get(bonusKey);
        
        if (!bonus) return;
        
        // Add specialization effects based on building type and specialization
        switch(`${buildingType}_${specialization}`) {
            case 'barracks_elite':
                bonus.effects.eliteUnitTraining = true;
                bonus.effects.unitMorale += 20;
                break;
            case 'workshop_masterwork':
                bonus.effects.masterworkChance = 0.15;
                bonus.effects.productionSpeed += 0.25;
                break;
            case 'mine_deep':
                bonus.effects.deepMining = true;
                bonus.effects.rareOreChance += 0.15;
                break;
            // Add more specializations as needed
        }
    }

    // Update village statistics based on active building bonuses
    updateVillageStats() {
        if (!this.villageManager) return;
        
        let totalDefense = 0;
        let totalProduction = 1.0;
        let totalMorale = 0;
        
        this.activeBonuses.forEach(bonus => {
            if (bonus.effects.villageDefense) {
                totalDefense += bonus.effects.villageDefense;
            }
            if (bonus.effects.dynastyBonus) {
                totalProduction += bonus.effects.dynastyBonus;
            }
            if (bonus.effects.morale) {
                totalMorale += bonus.effects.morale;
            }
        });
        
        // Apply bonuses to village
        if (this.gameState.village) {
            this.gameState.village.defenseRating = totalDefense;
            this.gameState.village.productionMultiplier = totalProduction;
            this.gameState.village.morale = Math.min(100, totalMorale);
        }
        
        console.log(`[BuildingEffects] Village stats updated - Defense: ${totalDefense}, Production: ${totalProduction}x, Morale: ${totalMorale}`);
    }

    // Get all active building bonuses
    getActiveBonuses() {
        const bonuses = {};
        this.activeBonuses.forEach((bonus, key) => {
            bonuses[key] = {
                type: bonus.type,
                position: bonus.position,
                effects: bonus.effects,
                level: this.buildingLevels.get(key) || 1,
                specialization: this.specializations.get(key) || null
            };
        });
        return bonuses;
    }

    // Check if building can be upgraded
    canUpgradeBuilding(buildingType, position) {
        const bonusKey = `${buildingType}_${position}`;
        const currentLevel = this.buildingLevels.get(bonusKey) || 1;
        
        // Max level is 3
        return currentLevel < 3;
    }

    // Get building upgrade cost
    getBuildingUpgradeCost(buildingType, position) {
        const bonusKey = `${buildingType}_${position}`;
        const currentLevel = this.buildingLevels.get(bonusKey) || 1;
        const nextLevel = currentLevel + 1;
        
        // Base cost from gameData, increased by level
        const baseCost = window.gameData?.buildingCosts?.[buildingType] || {};
        const upgradeCost = {};
        
        Object.keys(baseCost).forEach(resource => {
            upgradeCost[resource] = Math.floor(baseCost[resource] * nextLevel * 0.5);
        });
        
        return upgradeCost;
    }

    // Daily processing for building effects
    processDailyEffects() {
        this.activeBonuses.forEach((bonus, key) => {
            // Legacy point generation from monuments
            if (bonus.type === 'monument' && bonus.effects.legacyGeneration) {
                this.gameState.legacyPoints = (this.gameState.legacyPoints || 0) + bonus.effects.legacyGeneration;
            }
            
            // Magical research from towers
            if (bonus.type === 'magicalTower' && bonus.effects.arcaneKnowledge) {
                if (this.gameState.magicalResearch) {
                    this.gameState.magicalResearch.points += bonus.effects.arcaneKnowledge;
                }
            }
            
            // Research from libraries
            if (bonus.type === 'grandLibrary' && bonus.effects.researchSpeed) {
                if (this.gameState.research && this.gameState.research.active) {
                    this.gameState.research.points += Math.floor(10 * bonus.effects.researchSpeed);
                }
            }
        });
    }

    // Apply construction speed bonus to buildings in construction near lumber mills
    applyConstructionSpeedBonus(position, speedBonus) {
        if (!this.gameState.constructionManager) return;
        
        // Parse position coordinates
        const [x, y] = position.split(',').map(Number);
        const radius = 3; // Buildings within 3 tiles get the bonus
        
        // Find buildings under construction within radius
        this.gameState.buildings.forEach(building => {
            if (!building.built && building.constructionProgress !== undefined) {
                const distance = Math.sqrt(
                    Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2)
                );
                
                if (distance <= radius) {
                    // Apply construction speed bonus
                    const currentBonus = building.constructionSpeedBonus || 0;
                    building.constructionSpeedBonus = Math.max(currentBonus, speedBonus);
                    console.log(`[BuildingEffects] Applied ${speedBonus * 100}% construction speed bonus to ${building.type} at ${building.x},${building.y}`);
                }
            }
        });
    }

    // Get total construction speed bonus for a building position
    getConstructionSpeedBonus(x, y) {
        let totalBonus = 0;
        
        this.activeBonuses.forEach(bonus => {
            if (bonus.effects.constructionSpeed) {
                const [bx, by] = bonus.position.split(',').map(Number);
                const distance = Math.sqrt(Math.pow(x - bx, 2) + Math.pow(y - by, 2));
                
                if (distance <= 3) { // 3 tile radius
                    totalBonus += bonus.effects.constructionSpeed;
                }
            }
        });
        
        return Math.min(totalBonus, 0.75); // Cap at 75% bonus
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildingEffectsManager;
}

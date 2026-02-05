// Tech Tree System - Research and Technology Progression
class TechTree {
    constructor(gameState) {
        this.gameState = gameState;
        this.researchPoints = 0;
        this.researchedTechs = new Set();
        this.currentResearch = null;
        this.researchProgress = 0;
        
        // Tech definitions organized by tier
        this.techs = {
            // Tier 1: Primitive Era (no requirements)
            stoneTools: {
                id: 'stoneTools',
                name: 'Stone Tools',
                tier: 1,
                cost: 50,
                requires: [],
                effects: { quarryProduction: 0.10 },
                description: '+10% quarry production'
            },
            basicFarming: {
                id: 'basicFarming',
                name: 'Basic Farming',
                tier: 1,
                cost: 50,
                requires: [],
                effects: { farmProduction: 0.10 },
                description: '+10% farm production'
            },
            woodworking: {
                id: 'woodworking',
                name: 'Woodworking',
                tier: 1,
                cost: 50,
                requires: [],
                effects: { woodcutterProduction: 0.10 },
                description: '+10% woodcutter production'
            },

            // Tier 2: Settlement Era (Academy required)
            masonry: {
                id: 'masonry',
                name: 'Masonry',
                tier: 2,
                cost: 100,
                requires: ['stoneTools'],
                requiresBuilding: 'academy',
                effects: { constructionSpeed: 0.15, unlockBuilding: 'fortifications' },
                description: '+15% construction speed, unlock Fortifications'
            },
            animalHusbandry: {
                id: 'animalHusbandry',
                name: 'Animal Husbandry',
                tier: 2,
                cost: 100,
                requires: ['basicFarming'],
                requiresBuilding: 'academy',
                effects: { farmProduction: 0.20, birthRate: 0.10 },
                description: '+20% farm food, +10% birth rate'
            },
            carpentry: {
                id: 'carpentry',
                name: 'Carpentry',
                tier: 2,
                cost: 100,
                requires: ['woodworking'],
                requiresBuilding: 'academy',
                effects: { lumberMillProduction: 0.20, unlockBuilding: 'castle' },
                description: '+20% lumber mill output, unlock Castle'
            },
            bronzeWorking: {
                id: 'bronzeWorking',
                name: 'Bronze Working',
                tier: 2,
                cost: 150,
                requires: ['stoneTools'],
                requiresBuilding: 'academy',
                effects: { mineProduction: 0.15, blacksmithEfficiency: 0.10 },
                description: '+15% mine output, +10% blacksmith efficiency'
            },
            basicGovernance: {
                id: 'basicGovernance',
                name: 'Basic Governance',
                tier: 2,
                cost: 100,
                requires: [],
                requiresBuilding: 'academy',
                effects: { governingCapacity: 1 },
                description: '+1 max governing capacity'
            },

            // Tier 3: Kingdom Era (University required)
            ironWorking: {
                id: 'ironWorking',
                name: 'Iron Working',
                tier: 3,
                cost: 200,
                requires: ['bronzeWorking'],
                requiresBuilding: 'university',
                effects: { blacksmithEfficiency: 0.25, unitStrength: 0.10 },
                description: '+25% blacksmith efficiency, +10% unit strength'
            },
            advancedConstruction: {
                id: 'advancedConstruction',
                name: 'Advanced Construction',
                tier: 3,
                cost: 200,
                requires: ['masonry', 'carpentry'],
                requiresBuilding: 'university',
                effects: { constructionSpeed: 0.30, unlockBuilding: 'monument' },
                description: '+30% construction speed, unlock Monument'
            },
            medicine: {
                id: 'medicine',
                name: 'Medicine',
                tier: 3,
                cost: 200,
                requires: ['animalHusbandry'],
                requiresBuilding: 'university',
                effects: { lifespan: 0.20, deathChance: -0.30 },
                description: '+20% lifespan, -30% death chance'
            },
            militaryTactics: {
                id: 'militaryTactics',
                name: 'Military Tactics',
                tier: 3,
                cost: 200,
                requires: ['ironWorking'],
                requiresBuilding: 'university',
                effects: { battleDamage: 0.15, unlockBuilding: 'militaryAcademy' },
                description: '+15% battle damage, unlock Military Academy'
            },
            tradeRoutes: {
                id: 'tradeRoutes',
                name: 'Trade Routes',
                tier: 3,
                cost: 200,
                requires: ['basicGovernance'],
                requiresBuilding: 'university',
                effects: { marketGold: 0.25, tradingEnabled: true },
                description: '+25% market gold, enable trading'
            },
            siegeEngineering: {
                id: 'siegeEngineering',
                name: 'Siege Engineering',
                tier: 3,
                cost: 250,
                requires: ['advancedConstruction'],
                requiresBuilding: 'university',
                effects: { siegeDamage: 0.30 },
                description: '+30% damage vs enemy bases'
            },

            // Tier 4: Empire Era
            steelForging: {
                id: 'steelForging',
                name: 'Steel Forging',
                tier: 4,
                cost: 400,
                requires: ['ironWorking'],
                requiresBuilding: 'university',
                effects: { weaponQuality: 0.40, armorQuality: 0.40 },
                description: '+40% weapon/armor quality'
            },
            diplomacy: {
                id: 'diplomacy',
                name: 'Diplomacy',
                tier: 4,
                cost: 400,
                requires: ['tradeRoutes'],
                requiresBuilding: 'university',
                effects: { marriageChance: 0.30, kingdomDiscovery: 0.20 },
                description: 'Easier marriage alliances, discover more kingdoms'
            },
            architecture: {
                id: 'architecture',
                name: 'Architecture',
                tier: 4,
                cost: 400,
                requires: ['advancedConstruction'],
                requiresBuilding: 'university',
                effects: { unlockBuilding: 'grandLibrary', buildingCapacity: 0.20 },
                description: 'Unlock Grand Library, +20% building capacity'
            },
            advancedMedicine: {
                id: 'advancedMedicine',
                name: 'Advanced Medicine',
                tier: 4,
                cost: 400,
                requires: ['medicine'],
                requiresBuilding: 'university',
                effects: { plagueResistance: 0.50, healingRate: 0.30 },
                description: '+50% plague resistance, +30% healing'
            },
            logistics: {
                id: 'logistics',
                name: 'Logistics',
                tier: 4,
                cost: 400,
                requires: ['militaryTactics'],
                requiresBuilding: 'university',
                effects: { armyUpkeep: -0.20, expeditionSupplies: 0.25 },
                description: '-20% army upkeep, supplies last 25% longer'
            }
        };
    }

    init() {
        // Load saved research state
        this.loadState();
        console.log('[TechTree] Initialized with', this.researchedTechs.size, 'researched techs');
    }

    // Generate research points from scholars
    generateResearchPoints() {
        let rpGained = 0;
        const buildings = this.gameState.buildings || [];
        
        // Academy: 1 RP per scholar per day
        const academies = buildings.filter(b => b.type === 'academy' && b.workers?.length > 0);
        academies.forEach(academy => {
            const scholars = academy.workers?.length || 0;
            rpGained += scholars * 1;
        });
        
        // University: 3 RP per professor per day
        const universities = buildings.filter(b => b.type === 'university' && b.workers?.length > 0);
        universities.forEach(uni => {
            const professors = uni.workers?.length || 0;
            rpGained += professors * 3;
        });
        
        this.researchPoints += rpGained;
        
        // Progress current research if any
        if (this.currentResearch && rpGained > 0) {
            this.progressResearch(rpGained);
        }
        
        return rpGained;
    }

    // Check if a tech can be researched
    canResearch(techId) {
        const tech = this.techs[techId];
        if (!tech) return { allowed: false, reason: 'Tech not found' };
        if (this.researchedTechs.has(techId)) return { allowed: false, reason: 'Already researched' };
        
        // Check prerequisites
        for (const reqId of tech.requires) {
            if (!this.researchedTechs.has(reqId)) {
                const reqTech = this.techs[reqId];
                return { allowed: false, reason: `Requires: ${reqTech?.name || reqId}` };
            }
        }
        
        // Check building requirement
        if (tech.requiresBuilding) {
            const hasBuilding = (this.gameState.buildings || []).some(b => b.type === tech.requiresBuilding);
            if (!hasBuilding) {
                return { allowed: false, reason: `Requires: ${tech.requiresBuilding}` };
            }
        }
        
        return { allowed: true };
    }

    // Start researching a tech
    startResearch(techId) {
        const canStart = this.canResearch(techId);
        if (!canStart.allowed) {
            console.log('[TechTree] Cannot research:', canStart.reason);
            return false;
        }
        
        this.currentResearch = techId;
        this.researchProgress = 0;
        console.log('[TechTree] Started researching:', this.techs[techId].name);
        window.eventBus?.emit('researchStarted', { techId });
        return true;
    }

    // Progress current research
    progressResearch(rpAmount) {
        if (!this.currentResearch) return;
        
        const tech = this.techs[this.currentResearch];
        this.researchProgress += rpAmount;
        
        if (this.researchProgress >= tech.cost) {
            this.completeResearch(this.currentResearch);
        }
    }

    // Complete research and apply effects
    completeResearch(techId) {
        const tech = this.techs[techId];
        if (!tech) return;
        
        this.researchedTechs.add(techId);
        this.researchPoints -= tech.cost;
        this.currentResearch = null;
        this.researchProgress = 0;
        
        // Apply effects
        this.applyTechEffects(tech);
        
        console.log('[TechTree] Research complete:', tech.name);
        window.eventBus?.emit('researchComplete', { techId, tech });
        window.showToast?.(`🔬 Research Complete: ${tech.name}`, { type: 'success' });
        
        this.saveState();
    }

    // Apply tech effects to game state
    applyTechEffects(tech) {
        const effects = tech.effects;
        
        // Building unlocks
        if (effects.unlockBuilding) {
            if (!this.gameState.unlockedBuildings.includes(effects.unlockBuilding)) {
                this.gameState.unlockedBuildings.push(effects.unlockBuilding);
                console.log('[TechTree] Unlocked building:', effects.unlockBuilding);
            }
        }
        
        // Production bonuses - stored in gameState.techBonuses
        if (!this.gameState.techBonuses) {
            this.gameState.techBonuses = {};
        }
        
        // Accumulate bonuses
        Object.keys(effects).forEach(key => {
            if (key === 'unlockBuilding' || key === 'tradingEnabled') return;
            
            const current = this.gameState.techBonuses[key] || 0;
            this.gameState.techBonuses[key] = current + effects[key];
        });
        
        // Special flags
        if (effects.tradingEnabled) {
            this.gameState.tradingEnabled = true;
        }
        
        // Update construction manager if construction speed bonus
        if (effects.constructionSpeed && window.constructionManager) {
            const totalBonus = this.gameState.techBonuses.constructionSpeed || 0;
            window.constructionManager.setTechnologyBonus('construction', totalBonus * 100);
        }
    }

    // Get all available techs for UI
    getAvailableTechs() {
        const available = [];
        Object.values(this.techs).forEach(tech => {
            const canRes = this.canResearch(tech.id);
            if (canRes.allowed) {
                available.push(tech);
            }
        });
        return available;
    }

    // Get research progress percentage
    getResearchProgress() {
        if (!this.currentResearch) return 0;
        const tech = this.techs[this.currentResearch];
        return Math.min(100, (this.researchProgress / tech.cost) * 100);
    }

    // Get tech by tier for UI display
    getTechsByTier() {
        const byTier = { 1: [], 2: [], 3: [], 4: [] };
        Object.values(this.techs).forEach(tech => {
            byTier[tech.tier].push({
                ...tech,
                researched: this.researchedTechs.has(tech.id),
                available: this.canResearch(tech.id).allowed,
                reason: this.canResearch(tech.id).reason
            });
        });
        return byTier;
    }

    // Save state to localStorage
    saveState() {
        const state = {
            researchPoints: this.researchPoints,
            researchedTechs: Array.from(this.researchedTechs),
            currentResearch: this.currentResearch,
            researchProgress: this.researchProgress
        };
        localStorage.setItem('techTreeState', JSON.stringify(state));
    }

    // Load state from localStorage
    loadState() {
        try {
            const saved = localStorage.getItem('techTreeState');
            if (saved) {
                const state = JSON.parse(saved);
                this.researchPoints = state.researchPoints || 0;
                this.researchedTechs = new Set(state.researchedTechs || []);
                this.currentResearch = state.currentResearch || null;
                this.researchProgress = state.researchProgress || 0;
                
                // Re-apply all researched tech effects
                this.researchedTechs.forEach(techId => {
                    const tech = this.techs[techId];
                    if (tech) this.applyTechEffects(tech);
                });
            }
        } catch (e) {
            console.error('[TechTree] Error loading state:', e);
        }
    }

    // Get total tech bonus for a specific effect
    getTechBonus(effectName) {
        return this.gameState.techBonuses?.[effectName] || 0;
    }

    // Check if a specific tech is researched
    hasResearched(techId) {
        return this.researchedTechs.has(techId);
    }
}

// Export to window
window.TechTree = TechTree;

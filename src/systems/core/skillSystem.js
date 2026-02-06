// skillSystem.js - Comprehensive skill development and training system
// Implements the skill categories and progression system from the wiki

console.log('[SkillSystem] Script starting to load...');

class SkillSystem {
    constructor() {
        console.log('[SkillSystem] Constructor called');
        this.skillCategories = this.initializeSkillCategories();
        this.skillLevels = this.initializeSkillLevels();
        this.trainingPrograms = this.initializeTrainingPrograms();
        console.log('[SkillSystem] Constructor completed');
    }

    /**
     * Initialize all skill categories with their individual skills
     */
    initializeSkillCategories() {
        return {
            resourceProduction: {
                name: '🌾 Resource Production',
                skills: {
                    forestry: { name: 'Forestry', icon: '🌲', description: 'Sustainable logging, wood quality assessment, and forest management' },
                    agriculture: { name: 'Agriculture', icon: '🌾', description: 'Crop rotation, soil management, and seasonal farming optimization' },
                    mining: { name: 'Mining', icon: '⛏️', description: 'Ore extraction, tunnel engineering, and geological surveying' },
                    quarrying: { name: 'Quarrying', icon: '🪨', description: 'Stone cutting, marble extraction, and construction material preparation' },
                    fishing: { name: 'Fishing', icon: '🎣', description: 'River and lake fishing, food preservation, and aquatic resource management' },
                    hunting: { name: 'Hunting', icon: '🏹', description: 'Game tracking, meat preservation, and wilderness survival' }
                }
            },
            craftingManufacturing: {
                name: '🔨 Crafting & Manufacturing',
                skills: {
                    blacksmithing: { name: 'Blacksmithing', icon: '⚒️', description: 'Weapon forging, tool creation, and metalworking techniques' },
                    carpentry: { name: 'Carpentry', icon: '🪚', description: 'Building construction, furniture crafting, and wooden tool creation' },
                    masonry: { name: 'Masonry', icon: '🧱', description: 'Stone building, fortification construction, and architectural stonework' },
                    textiles: { name: 'Textiles', icon: '🧵', description: 'Clothing production, fabric weaving, and material processing' },
                    pottery: { name: 'Pottery', icon: '🏺', description: 'Ceramic creation, storage vessel production, and artistic crafts' },
                    engineering: { name: 'Engineering', icon: '⚙️', description: 'Siege equipment, mechanical devices, and infrastructure design' }
                }
            },
            militaryCombat: {
                name: '⚔️ Military & Combat',
                skills: {
                    archery: { name: 'Archery', icon: '🏹', description: 'Bow mastery, tactical positioning, and ranged combat precision' },
                    meleeCombat: { name: 'Melee Combat', icon: '⚔️', description: 'Sword, axe, and spear fighting techniques' },
                    cavalry: { name: 'Cavalry', icon: '🐎', description: 'Mounted warfare, horse training, and mobile combat tactics' },
                    heavyCombat: { name: 'Heavy Combat', icon: '🏰', description: 'Large-scale battle tactics, fortification assault, and defensive operations' },
                    fortification: { name: 'Fortification', icon: '🛡️', description: 'Defensive structure design and garrison management' },
                    scouting: { name: 'Scouting', icon: '👁️', description: 'Reconnaissance, stealth movement, and intelligence gathering' },
                    militaryEngineering: { name: 'Military Engineering', icon: '🔧', description: 'Battlefield preparation, trap setting, and tactical construction' }
                }
            },
            leadershipGovernance: {
                name: '👑 Leadership & Governance',
                skills: {
                    administration: { name: 'Administration', icon: '📋', description: 'Bureaucratic management, record keeping, and organizational efficiency' },
                    diplomacy: { name: 'Diplomacy', icon: '🤝', description: 'Negotiation, alliance building, and international relations' },
                    trade: { name: 'Trade', icon: '💰', description: 'Economic negotiation, market analysis, and commercial strategy' },
                    lawEnforcement: { name: 'Law Enforcement', icon: '⚖️', description: 'Justice administration, crime prevention, and civil order' },
                    logistics: { name: 'Logistics', icon: '📦', description: 'Supply chain management, resource distribution, and expedition planning' },
                    inspiration: { name: 'Inspiration', icon: '✨', description: 'Morale boosting, public speaking, and loyalty cultivation' },
                    strategy: { name: 'Strategy', icon: '🧠', description: 'Long-term planning, risk assessment, and tactical decision-making' }
                }
            },
            knowledgeMystical: {
                name: '📚 Knowledge & Mystical',
                skills: {
                    scholarship: { name: 'Scholarship', icon: '📖', description: 'Reading, writing, historical knowledge, and academic research' },
                    medicine: { name: 'Medicine', icon: '💊', description: 'Healing, disease treatment, and healthcare management' },
                    alchemy: { name: 'Alchemy', icon: '⚗️', description: 'Potion brewing, chemical knowledge, and experimental sciences' },
                    magic: { name: 'Magic', icon: '🔮', description: 'Supernatural abilities, spell casting, and mystical research (genetic requirement)' },
                    beastHandling: { name: 'Beast Handling', icon: '🐺', description: 'Animal training, livestock management, and creature communication' }
                }
            },
            commonCitizen: {
                name: '🏪 Common Citizen',
                skills: {
                    trading: { name: 'Trading', icon: '🛒', description: 'Merchant activities, haggling, local commerce, and market operations' }
                }
            }
        };
    }

    /**
     * Initialize skill level definitions
     */
    initializeSkillLevels() {
        return {
            novice: { 
                name: 'Novice', 
                minXP: 0, 
                maxXP: 100, 
                efficiency: 1.0, 
                description: 'Basic competency with standard efficiency',
                icon: '🔰'
            },
            apprentice: { 
                name: 'Apprentice', 
                minXP: 101, 
                maxXP: 300, 
                efficiency: 1.25, 
                description: 'Improved performance with 25% efficiency bonus',
                icon: '🥉'
            },
            journeyman: { 
                name: 'Journeyman', 
                minXP: 301, 
                maxXP: 600, 
                efficiency: 1.5, 
                description: 'Advanced skills with 50% efficiency bonus',
                icon: '🥈'
            },
            expert: { 
                name: 'Expert', 
                minXP: 601, 
                maxXP: 1000, 
                efficiency: 1.75, 
                description: 'Master craftsmanship with 75% efficiency bonus',
                icon: '🥇'
            },
            grandmaster: { 
                name: 'Grandmaster', 
                minXP: 1001, 
                maxXP: 9999, 
                efficiency: 2.0, 
                description: 'Legendary abilities with 100% efficiency bonus + special abilities',
                icon: '💎'
            }
        };
    }

    /**
     * Initialize training program definitions
     */
    initializeTrainingPrograms() {
        return {
            apprenticeship: {
                name: 'Apprenticeship Program',
                duration: 180, // 6 months in days
                cost: { food: 50, gold: 20 },
                description: 'Basic skill development for new workers',
                skillBonus: 50,
                requirements: { age: { min: 16, max: 60 } }
            },
            journeyman: {
                name: 'Journeyman Education',
                duration: 365, // 1 year in days
                cost: { food: 100, gold: 50, wood: 25 },
                description: 'Intermediate specialization requiring experienced mentors',
                skillBonus: 100,
                requirements: { 
                    age: { min: 20, max: 55 },
                    mentorRequired: true,
                    minSkillLevel: 'apprentice'
                }
            },
            masterCertification: {
                name: 'Master Certification',
                duration: 730, // 2 years in days
                cost: { food: 200, gold: 150, wood: 50, stone: 30 },
                description: 'Advanced expertise requiring significant resource investment',
                skillBonus: 200,
                requirements: { 
                    age: { min: 25, max: 50 },
                    mentorRequired: true,
                    minSkillLevel: 'journeyman'
                }
            },
            crossTraining: {
                name: 'Cross-Training',
                duration: 90, // 3 months in days
                cost: { food: 30, gold: 15 },
                description: 'Multi-skill development for versatile workers',
                skillBonus: 25,
                requirements: { age: { min: 18, max: 65 } }
            },
            royalTutoring: {
                name: 'Royal Tutoring',
                duration: 180, // 6 months in days
                cost: { food: 150, gold: 100, wood: 30 },
                description: 'Accelerated learning available to exceptional citizens',
                skillBonus: 150,
                requirements: { 
                    age: { min: 16, max: 45 },
                    exceptional: true
                }
            }
        };
    }

    /**
     * Get all skills for a specific category
     */
    getSkillsInCategory(categoryKey) {
        const category = this.skillCategories[categoryKey];
        return category ? category.skills : {};
    }

    /**
     * Get skill level for given XP
     */
    getSkillLevel(xp) {
        for (const [levelKey, level] of Object.entries(this.skillLevels)) {
            if (xp >= level.minXP && xp <= level.maxXP) {
                return { key: levelKey, ...level };
            }
        }
        // If XP exceeds grandmaster max, still return grandmaster
        return { key: 'grandmaster', ...this.skillLevels.grandmaster };
    }

    /**
     * Calculate XP gain for a villager performing work
     */
    calculateXPGain(villager, workType, conditions = {}) {
        let baseXP = Math.floor(Math.random() * 3) + 1; // 1-3 base XP
        
        // Mentorship bonus
        if (conditions.hasMentor) {
            baseXP += 2;
        }
        
        // Innovation bonus (rare)
        if (Math.random() < 0.05) { // 5% chance
            baseXP += 3;
            conditions.innovation = true;
        }
        
        // Crisis performance bonus
        if (conditions.crisis) {
            baseXP += Math.floor(Math.random() * 3) + 1;
        }
        
        // Teaching bonus (if villager is teaching)
        if (conditions.teaching) {
            baseXP += 1;
        }
        
        return { xp: baseXP, conditions };
    }

    /**
     * Add skill to a villager
     */
    addSkillToVillager(villager, skillCategory, skillName, initialXP = 0) {
        if (!villager.skills) {
            villager.skills = {};
        }
        
        const skillKey = `${skillCategory}.${skillName}`;
        villager.skills[skillKey] = {
            category: skillCategory,
            name: skillName,
            xp: initialXP,
            level: this.getSkillLevel(initialXP),
            lastUsed: new Date()
        };
        
        return villager.skills[skillKey];
    }

    /**
     * Update skill XP for a villager
     */
    updateSkillXP(villager, skillCategory, skillName, xpGain) {
        const skillKey = `${skillCategory}.${skillName}`;
        
        if (!villager.skills || !villager.skills[skillKey]) {
            // Create skill if it doesn't exist
            this.addSkillToVillager(villager, skillCategory, skillName, 0);
        }
        
        const skill = villager.skills[skillKey];
        const oldLevel = skill.level.key;
        
        skill.xp += xpGain;
        skill.level = this.getSkillLevel(skill.xp);
        skill.lastUsed = new Date();
        
        // Check for level up
        const leveledUp = oldLevel !== skill.level.key;
        
        return {
            skill,
            xpGain,
            leveledUp,
            oldLevel,
            newLevel: skill.level.key
        };
    }

    /**
     * Get all skills for a villager, organized by category
     */
    getVillagerSkills(villager) {
        if (!villager.skills) return {};
        
        const organizedSkills = {};
        
        for (const [skillKey, skill] of Object.entries(villager.skills)) {
            const category = skill.category;
            if (!organizedSkills[category]) {
                organizedSkills[category] = [];
            }
            organizedSkills[category].push({
                key: skillKey,
                ...skill
            });
        }
        
        return organizedSkills;
    }

    /**
     * Get efficiency bonus for a villager in a specific skill
     */
    getSkillEfficiency(villager, skillCategory, skillName) {
        const skillKey = `${skillCategory}.${skillName}`;
        
        if (!villager.skills || !villager.skills[skillKey]) {
            return 1.0; // No skill = base efficiency
        }
        
        const skill = villager.skills[skillKey];
        return skill.level.efficiency;
    }

    /**
     * Check if villager meets requirements for training program
     */
    canEnrollInTraining(villager, programKey) {
        const program = this.trainingPrograms[programKey];
        if (!program) return { canEnroll: false, reason: 'Program not found' };
        
        const req = program.requirements;
        
        // Age check
        if (req.age) {
            if (villager.age < req.age.min || villager.age > req.age.max) {
                return { canEnroll: false, reason: `Age must be between ${req.age.min}-${req.age.max} days` };
            }
        }
        
        // Mentor requirement check
        if (req.mentorRequired) {
            // This would need to be checked against available mentors in the population
            // For now, we'll assume it's available
        }
        
        // Skill level requirement
        if (req.minSkillLevel) {
            // Check if villager has any skills at the required level
            if (!villager.skills) {
                return { canEnroll: false, reason: `Requires at least ${req.minSkillLevel} level in any skill` };
            }
            
            const hasRequiredLevel = Object.values(villager.skills).some(skill => {
                const levelOrder = ['novice', 'apprentice', 'journeyman', 'expert', 'grandmaster'];
                const currentIndex = levelOrder.indexOf(skill.level.key);
                const requiredIndex = levelOrder.indexOf(req.minSkillLevel);
                return currentIndex >= requiredIndex;
            });
            
            if (!hasRequiredLevel) {
                return { canEnroll: false, reason: `Requires at least ${req.minSkillLevel} level in any skill` };
            }
        }
        
        return { canEnroll: true };
    }

    /**
     * Start training program for a villager
     */
    startTraining(villager, programKey, skillCategory, skillName) {
        const enrollment = this.canEnrollInTraining(villager, programKey);
        if (!enrollment.canEnroll) {
            return { success: false, reason: enrollment.reason };
        }
        
        const program = this.trainingPrograms[programKey];
        
        // Set training status
        villager.training = {
            program: programKey,
            skillCategory,
            skillName,
            startDate: new Date(),
            endDate: new Date(Date.now() + program.duration * 24 * 60 * 60 * 1000),
            progress: 0
        };
        
        villager.status = 'training';
        
        return { success: true, program, endDate: villager.training.endDate };
    }

    /**
     * Process daily training progress for all villagers
     */
    processDailyTraining(population) {
        const completedTraining = [];
        
        population.forEach(villager => {
            if (villager.status === 'training' && villager.training) {
                const training = villager.training;
                const program = this.trainingPrograms[training.program];
                
                // Increase progress
                training.progress += 1;
                
                // Check if training is complete
                if (training.progress >= program.duration) {
                    // Complete training
                    const skillResult = this.updateSkillXP(
                        villager, 
                        training.skillCategory, 
                        training.skillName, 
                        program.skillBonus
                    );
                    
                    completedTraining.push({
                        villager,
                        program: training.program,
                        skill: skillResult.skill,
                        leveledUp: skillResult.leveledUp
                    });
                    
                    // Remove training status
                    delete villager.training;
                    villager.status = 'idle';
                }
            }
        });
        
        return completedTraining;
    }

    /**
     * Get specialized roles that villagers can advance to
     */
    getSpecializedRoles() {
        return {
            military: {
                eliteGuard: {
                    name: 'Elite Guard',
                    description: 'Personal protection, urban combat, and VIP security',
                    requirements: {
                        skills: {
                            meleeCombat: 'expert',
                            fortification: 'journeyman'
                        }
                    },
                    bonuses: { defense: 2.0, loyalty: 1.5 }
                },
                combatEngineer: {
                    name: 'Combat Engineer',
                    description: 'Specialized in battlefield preparation and tactical construction',
                    requirements: {
                        skills: {
                            militaryEngineering: 'expert',
                            engineering: 'journeyman'
                        }
                    },
                    bonuses: { battlePrep: 2.0, construction: 1.5 }
                }
            },
            administrative: {
                royalAdvisor: {
                    name: 'Royal Advisor',
                    description: 'High-level strategy, policy development, and diplomatic counsel',
                    requirements: {
                        skills: {
                            strategy: 'expert',
                            diplomacy: 'journeyman',
                            administration: 'journeyman'
                        }
                    },
                    bonuses: { influence: 3.0, efficiency: 1.25 }
                },
                tradeMaster: {
                    name: 'Trade Master',
                    description: 'Economic development, market expansion, and commercial empire building',
                    requirements: {
                        skills: {
                            trade: 'expert',
                            administration: 'journeyman'
                        }
                    },
                    bonuses: { gold: 2.0, trade: 1.5 }
                }
            },
            knowledge: {
                courtScholar: {
                    name: 'Court Scholar',
                    description: 'Advanced research, historical analysis, and technological development',
                    requirements: {
                        skills: {
                            scholarship: 'expert',
                            administration: 'apprentice'
                        }
                    },
                    bonuses: { research: 2.5, knowledge: 1.5 }
                },
                masterHealer: {
                    name: 'Master Healer',
                    description: 'Advanced medicine, epidemic management, and royal family healthcare',
                    requirements: {
                        skills: {
                            medicine: 'expert',
                            alchemy: 'journeyman'
                        }
                    },
                    bonuses: { health: 2.0, happiness: 1.3 }
                }
            }
        };
    }

    /**
     * Check if villager qualifies for specialized role
     */
    canPromoteToSpecializedRole(villager, roleCategory, roleName) {
        const roles = this.getSpecializedRoles();
        const role = roles[roleCategory]?.[roleName];
        if (!role) return { canPromote: false, reason: 'Role not found' };
        
        // Check skill requirements
        for (const [skillKey, requiredLevel] of Object.entries(role.requirements.skills)) {
            const [category, name] = skillKey.includes('.') ? skillKey.split('.') : ['knowledgeMystical', skillKey];
            const villagerSkillKey = `${category}.${name}`;
            
            if (!villager.skills || !villager.skills[villagerSkillKey]) {
                return { canPromote: false, reason: `Missing required skill: ${name}` };
            }
            
            const skillLevel = villager.skills[villagerSkillKey].level.key;
            const levelOrder = ['novice', 'apprentice', 'journeyman', 'expert', 'grandmaster'];
            const currentIndex = levelOrder.indexOf(skillLevel);
            const requiredIndex = levelOrder.indexOf(requiredLevel);
            
            if (currentIndex < requiredIndex) {
                return { 
                    canPromote: false, 
                    reason: `${name} skill must be at least ${requiredLevel} level (currently ${skillLevel})` 
                };
            }
        }
        
        return { canPromote: true, role };
    }

    toJSON() {
        return {
            skillCategories: this.skillCategories,
            skillLevels: this.skillLevels,
            trainingPrograms: this.trainingPrograms
        };
    }
}

console.log('[SkillSystem] Class definition completed');

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    console.log('[SkillSystem] Exporting for Node.js');
    module.exports = SkillSystem;
} else if (typeof window !== 'undefined') {
    console.log('[SkillSystem] Exporting to window object');
    window.SkillSystem = SkillSystem;
    console.log('[SkillSystem] window.SkillSystem set to:', window.SkillSystem);
    
    // Signal that SkillSystem is ready
    window.skillSystemReady = true;
    
    // Trigger event if event bus is available
    if (window.eventBus && typeof window.eventBus.emit === 'function') {
        window.eventBus.emit('skillSystemReady');
    }
}

// Add the method to the SkillSystem class
SkillSystem.prototype.generateImmigrantSkills = function(type) {
    const skills = {};
    
    switch (type) {
        case 'experienced':
            // Skilled worker - one profession well-developed
            const profession = ['agriculture', 'forestry', 'mining'][Math.floor(Math.random() * 3)];
            skills.resourceProduction = {};
            skills.resourceProduction[profession] = 200 + Math.floor(Math.random() * 200); // Apprentice to Journeyman
            
            // Some common skills
            skills.commonCitizen = {
                basicLabor: 100 + Math.floor(Math.random() * 100)
            };
            break;
            
        case 'master':
            // Craftsman - advanced crafting skills
            skills.crafting = {
                construction: 400 + Math.floor(Math.random() * 300), // Journeyman to Expert
                toolmaking: 200 + Math.floor(Math.random() * 200)
            };
            skills.commonCitizen = {
                basicLabor: 200 + Math.floor(Math.random() * 100)
            };
            break;
            
        case 'trader':
            // Merchant - leadership and knowledge skills
            skills.leadership = {
                administration: 250 + Math.floor(Math.random() * 200),
                diplomacy: 150 + Math.floor(Math.random() * 150)
            };
            skills.knowledge = {
                mathematics: 200 + Math.floor(Math.random() * 200),
                economics: 300 + Math.floor(Math.random() * 200)
            };
            break;
            
        case 'military':
            // Soldier - combat and tactical skills
            skills.military = {
                combat: 300 + Math.floor(Math.random() * 300), // Journeyman to Expert
                tactics: 150 + Math.floor(Math.random() * 200)
            };
            skills.commonCitizen = {
                basicLabor: 100 + Math.floor(Math.random() * 100)
            };
            break;
            
        default:
            // Basic immigrant - minimal skills
            skills.commonCitizen = {
                basicLabor: 50 + Math.floor(Math.random() * 100)
            };
            break;
    }
    
    return skills;
};

console.log('[SkillSystem] Class definition completed');

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    console.log('[SkillSystem] Exporting for Node.js');
    module.exports = SkillSystem;
} else if (typeof window !== 'undefined') {
    console.log('[SkillSystem] Exporting to window object');
    window.SkillSystem = SkillSystem;
    
    // Mark system as ready
    window.skillSystemReady = true;
    
    // Trigger event if event bus is available
    if (window.eventBus && typeof window.eventBus.emit === 'function') {
        window.eventBus.emit('skillSystemReady');
    }
} else {
    console.error('[SkillSystem] Unknown environment - cannot export');
}

console.log('[SkillSystem] Script fully loaded and exported');

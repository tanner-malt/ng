// populationManager.js - Enhanced Population Management with Skills and Job Optimization
// Manages population details, roles, assignments, and skill progression

console.log('[PopulationManager] Script starting to load...');

class PopulationManager {
    constructor(initialPopulation = []) {
        console.log('[PopulationManager] Constructor called with:', initialPopulation);
        // Each inhabitant: { id, name, role, age, status, location, skills, experience, ... }
        this.population = initialPopulation;
        this.nextId = initialPopulation.length > 0 ? Math.max(...initialPopulation.map(p => p.id)) + 1 : 1;

        // Skill system constants
        this.skillLevels = {
            novice: { min: 0, max: 100, title: 'Novice', efficiency: 1.0 },
            apprentice: { min: 101, max: 300, title: 'Apprentice', efficiency: 1.25 },
            journeyman: { min: 301, max: 600, title: 'Journeyman', efficiency: 1.5 },
            expert: { min: 601, max: 1000, title: 'Expert', efficiency: 1.75 },
            master: { min: 1001, max: Infinity, title: 'Master', efficiency: 2.0 }
        };

        // Job to skill mapping - ONLY for actual job types that exist in buildings
        this.jobSkillMapping = {
            farmer: ['Agriculture'],
            builder: ['Carpentry', 'Masonry', 'Engineering'],
            gatherer: ['Hunting', 'Forestry', 'Agriculture'],
            woodcutter: ['Forestry'],
            sawyer: ['Forestry', 'Carpentry'], // From woodcutter lodges
            foreman: ['Carpentry', 'Masonry', 'Engineering', 'Administration'], // From builder huts
            // Legacy roles that don't have jobs but exist for flavor/battle system
            guard: ['Melee Combat', 'Archery'], // Used in battle system
            merchant: ['Trade', 'Administration'] // Used for trading
        };

        // Training preferences - global setting
        this.trainingMode = 'balanced'; // 'training', 'resources', 'balanced'

        console.log('[PopulationManager] Constructor completed, nextId:', this.nextId);
    }

    /**
     * Process daily population changes - aging, births, and deaths
     * This is the main method called by GameState.processPopulationGrowth()
     * @param {object} gameState - Current game state for resource checks
     */
    simulateDay(gameState) {
        console.log(`[PopulationManager] simulateDay() - Starting day ${gameState?.day || 'unknown'} with ${this.population.length} villagers`);

        // 1. Process aging and deaths first
        const agingResult = this.processAging();

        // 2. Calculate and process births
        const foodAbundant = (gameState?.resources?.food || 0) > 500;
        const foodScarce = (gameState?.resources?.food || 0) < 50;

        const birthResult = this.calculateDailyGrowth({
            foodAbundant: foodAbundant,
            foodScarce: foodScarce
        });


        // 3. Actually add new births to population, enforcing cap
        let birthsAdded = 0;
        if (birthResult.births > 0) {
            const cap = (typeof gameState.getPopulationCap === 'function') ? gameState.getPopulationCap() : 9999;
            const current = this.population.length;
            const allowedBirths = Math.max(0, Math.min(birthResult.births, cap - current));
            for (let i = 0; i < allowedBirths; i++) {
                const newborn = {
                    name: this.generateRandomName() + ' the Younger',
                    age: 0, // Start as newborn
                    gender: Math.random() < 0.5 ? 'male' : 'female',
                    role: 'child',
                    status: 'child',
                    health: 100,
                    happiness: 80,
                    productivity: 0.1, // Children have minimal productivity
                    skills: [],
                    experience: {},
                    traits: this.generateRandomTraits('child')
                };
                this.addInhabitant(newborn);
                birthsAdded++;
                
                // Track birth in game stats
                if (window.gameState?.stats) {
                    window.gameState.stats.totalBirths = (window.gameState.stats.totalBirths || 0) + 1;
                }
                
                console.log(`[PopulationManager] Birth: ${newborn.name} (${newborn.gender})`);
            }
            if (allowedBirths < birthResult.births) {
                console.log(`[PopulationManager] Births blocked by population cap. Allowed: ${allowedBirths}, Attempted: ${birthResult.births}`);
                if (window.eventBus) {
                    window.eventBus.emit('population_birth_blocked', {
                        blocked: birthResult.births - allowedBirths,
                        cap,
                        current
                    });
                }
            }
            // Emit birth event
            if (window.eventBus) {
                window.eventBus.emit('population_birth', {
                    births: birthsAdded,
                    twins: birthResult.twins,
                    totalPopulation: this.population.length
                });
            }
        }

        // 4. Process daily skill progression
        this.processDailySkillProgression();

        // 5. Log daily summary
        const summary = {
            startingPopulation: this.population.length + agingResult.deaths - birthResult.births,
            births: birthResult.births,
            deaths: agingResult.deaths,
            finalPopulation: this.population.length,
            netChange: birthResult.births - agingResult.deaths,
            averageAge: this.population.length > 0 ?
                Math.round(this.population.reduce((sum, v) => sum + v.age, 0) / this.population.length) : 0
        };

        if (summary.births > 0 || summary.deaths > 0) {
            console.log(`[PopulationManager] Daily Summary:`, summary);
        }

        return summary;
    }

    /**
     * Process aging and death for the population
     * @returns {object} - { deaths: number, diedVillagers: array }
     */
    processAging() {
        let deaths = 0;
        const diedVillagers = [];
        const beforeCount = this.population.length;

        // Age all villagers by 1 day and check for death probability
        this.population.forEach(villager => {
            if (typeof villager.age === 'number') {
                villager.age += 1;

                // Probability-based death system starting at 180 days
                const deathChance = this.calculateDeathProbability(villager.age);
                if (Math.random() < deathChance) {
                    diedVillagers.push({
                        name: villager.name,
                        role: villager.role,
                        deathChance: (deathChance * 100).toFixed(1) + '%'
                    });
                    deaths++;
                }
            }
        });

        // Remove deceased villagers
        if (deaths > 0) {
            const deceasedIds = diedVillagers.map(v =>
                this.population.find(p => p.name === v.name && p.age === v.age)?.id
            ).filter(id => id);

            // Preserve knowledge before removing villagers (if monarch upgrade is available)
            deceasedIds.forEach(id => {
                const deceased = this.population.find(p => p.id === id);
                if (deceased) this.preserveKnowledgeOnDeath(deceased);
            });

            this.population = this.population.filter(villager =>
                !deceasedIds.includes(villager.id)
            );
            
            // Track deaths in game stats
            if (window.gameState?.stats) {
                window.gameState.stats.totalDeaths = (window.gameState.stats.totalDeaths || 0) + deaths;
            }
            
            console.log(`[PopulationManager] ${deaths} villagers died. Population: ${beforeCount} -> ${this.population.length}`);
        }

        return { deaths, diedVillagers };
    }

    /**
     * Calculate death probability based on age
     * Death probability starts at 180 days and increases gradually
     */
    calculateDeathProbability(age) {
        if (age < 180) return 0; // No death before 180 days

        // Gradual increase from 180 to 220 days
        // At 180: ~0.1% chance, At 200: ~2% chance, At 220: ~50% chance
        if (age <= 200) {
            const t = (age - 180) / 20; // 0..1
            return 0.001 + t * (0.02 - 0.001);
        }
        if (age <= 220) {
            const t = (age - 200) / 20; // 0..1
            return 0.02 + t * (0.5 - 0.02);
        }
        // Beyond 220, approach 100% with a soft cap
        return Math.min(0.99, 0.5 + (age - 220) * 0.01);
    }

    /**
     * Calculate expected deaths for the population
     * @param {string} timeframe - 'daily' or 'monthly'
     * @returns {object} - { expectedDeaths, imminentDeaths, ageGroups }
     */
    calculateExpectedDeaths(timeframe = 'daily') {
        const daysToDeath = 198; // Death age
        const multiplier = timeframe === 'monthly' ? 30 : 1;

        // Group villagers by age proximity to death
        const ageGroups = {
            imminent: { name: 'Imminent (197+ days)', count: 0, villagers: [] }, // 1 day or less
            veryHigh: { name: 'Very High Risk (190-196 days)', count: 0, villagers: [] }, // 2-8 days
            high: { name: 'High Risk (180-189 days)', count: 0, villagers: [] }, // 9-18 days
            moderate: { name: 'Moderate Risk (170-179 days)', count: 0, villagers: [] }, // 19-28 days
            low: { name: 'Low Risk (160-169 days)', count: 0, villagers: [] } // 29-38 days
        };

        this.population.forEach(villager => {
            if (villager.age >= 197) {
                ageGroups.imminent.villagers.push(villager);
                ageGroups.imminent.count++;
            } else if (villager.age >= 190) {
                ageGroups.veryHigh.villagers.push(villager);
                ageGroups.veryHigh.count++;
            } else if (villager.age >= 180) {
                ageGroups.high.villagers.push(villager);
                ageGroups.high.count++;
            } else if (villager.age >= 170) {
                ageGroups.moderate.villagers.push(villager);
                ageGroups.moderate.count++;
            } else if (villager.age >= 160) {
                ageGroups.low.villagers.push(villager);
                ageGroups.low.count++;
            }
        });

        // Calculate expected deaths based on timeframe
        let expectedDeaths = 0;
        let imminentDeaths = ageGroups.imminent.count;

        if (timeframe === 'daily') {
            // Daily: count those who will die in the next day
            expectedDeaths = ageGroups.imminent.count;
        } else if (timeframe === 'monthly') {
            // Monthly: estimate deaths over 30 days
            expectedDeaths = ageGroups.imminent.count +
                Math.ceil(ageGroups.veryHigh.count * 0.9) + // 90% of very high risk
                Math.ceil(ageGroups.high.count * 0.6) + // 60% of high risk
                Math.ceil(ageGroups.moderate.count * 0.3) + // 30% of moderate risk
                Math.ceil(ageGroups.low.count * 0.1); // 10% of low risk
        }

        return {
            expectedDeaths,
            imminentDeaths,
            ageGroups,
            timeframe,
            totalAtRisk: Object.values(ageGroups).reduce((sum, group) => sum + group.count, 0)
        };
    }

    /**
     * Calculate daily population growth based on eligible couples and food status.
     * - Each eligible couple (working age 16–190 days) tries for a child every day
     * - Base chance: 1/120 per couple per day (so ~1 per 17 weeks per couple, before modifiers)
     * - Modifiers: +50% if food abundant, -50% if food scarce, 0 if sick/traveling
     * - 1% chance for twins per birth (no pregnancy system - births are immediate)
     * @param {object} options - { foodAbundant: bool, foodScarce: bool }
     * @returns {object} { births, twins, bonus, eligibleCouples }
     */
    calculateDailyGrowth(options = {}) {
        // Find eligible working-age adults by gender
        const breedingAge = this.population.filter(p => p.age >= 16 && p.age <= 190 && p.status !== 'sick' && p.status !== 'traveling');
        const males = breedingAge.filter(p => p.gender === 'male');
        const females = breedingAge.filter(p => p.gender === 'female');
        const eligibleCouples = Math.min(males.length, females.length);
        if (eligibleCouples === 0) return { births: 0, twins: 0, bonus: 0, eligibleCouples: 0 };

    // Base: Each couple has a 2.25/100 chance per day (~2.25% daily chance)
    let baseChance = 2.25 / 100;
        let bonus = 0;
        if (options.foodAbundant) bonus += 0.75; // Increased food bonus
        if (options.foodScarce) bonus -= 0.5;
        // Clamp bonus to [-0.5, 0.75]
        bonus = Math.max(-0.5, Math.min(0.75, bonus));
        let finalChance = baseChance * (1 + bonus);
        finalChance = Math.max(0, finalChance); // No negative chance

        let births = 0;
        let twins = 0;
        for (let i = 0; i < eligibleCouples; i++) {
            if (Math.random() < finalChance) {
                births++;
                if (Math.random() < 0.015) twins++; // Slightly increased twin chance
            }
        }
        births += twins; // Each twin birth adds one more child

        return { births, twins, bonus, eligibleCouples };
    }

    addInhabitant(details, options = {}) {
        const { ignoreCap = false } = options || {};
        // Enforce population cap if available
        if (!ignoreCap && typeof window !== 'undefined' && window.gameState && typeof window.gameState.getPopulationCap === 'function') {
            const cap = window.gameState.getPopulationCap();
            const current = this.population.length;
            if (current >= cap) {
                console.log(`[PopulationManager] Blocked addition of inhabitant: population cap reached (${current}/${cap})`);
                if (window.eventBus) {
                    window.eventBus.emit('population_add_blocked', { cap, current, details });
                }
                return null;
            }
        }
        // If age is not specified, default to 0 (newborn)
        const age = details.age !== undefined ? details.age : 0;
        // Determine if this villager is a child (not eligible to work)
        const isChild = age <= 15;
        const canWork = !isChild;

        // Initialize experience and skills
        const experience = details.experience || {};
        const skills = details.skills || [];

        // If no skills provided but role is specified, add appropriate skills
        if (skills.length === 0 && details.role && this.jobSkillMapping[details.role]) {
            this.jobSkillMapping[details.role].forEach(skill => {
                if (!experience[skill]) {
                    experience[skill] = Math.floor(Math.random() * 50); // Random starting XP
                }
            });
        }

        const inhabitant = {
            id: this.nextId++,
            name: details.name || `Inhabitant ${this.nextId}`,
            role: details.role || 'peasant',
            age: age,
            status: details.status || 'idle',
            location: details.location || 'village',
            skills: skills,
            experience: experience,
            gender: details.gender || (Math.random() < 0.5 ? 'male' : 'female'),
            isChild,
            canWork,
            happiness: details.happiness || 70,
            productivity: details.productivity || 0.8,
            health: details.health || 100, // Initialize health to 100%
            traits: details.traits || [],
            ...details
        };
        this.population.push(inhabitant);

        // Track peak population
        if (window.gameState?.stats) {
            const currentPop = this.population.length;
            if (currentPop > (window.gameState.stats.peakPopulation || 0)) {
                window.gameState.stats.peakPopulation = currentPop;
            }
        }

        console.log(`[PopulationManager] Added inhabitant: ${inhabitant.name} (age ${inhabitant.age}, role: ${inhabitant.role}), Total population: ${this.population.length}`);

        // Update gameState population count immediately if available
        if (window.gameState && typeof window.gameState.updatePopulationCount === 'function') {
            window.gameState.updatePopulationCount();
        }

        // Emit population change event
        if (window.eventBus) {
            window.eventBus.emit('population-changed', {
                type: 'villager-added',
                villager: inhabitant,
                totalPopulation: this.population.length
            });
        }

        // Trigger job optimization after adding new population
        this.optimizeJobAssignments();

        return inhabitant;
    }

    removeInhabitant(id) {
        const idx = this.population.findIndex(p => p.id === id);
        if (idx !== -1) {
            const removed = this.population.splice(idx, 1)[0];

            console.log(`[PopulationManager] Removed inhabitant: ${removed.name} (ID: ${removed.id}), Total population: ${this.population.length}`);

            // Update gameState population count immediately if available
            if (window.gameState && typeof window.gameState.updatePopulationCount === 'function') {
                window.gameState.updatePopulationCount();
            }

            // Emit population change event
            if (window.eventBus) {
                window.eventBus.emit('population-changed', {
                    type: 'villager-removed',
                    villager: removed,
                    totalPopulation: this.population.length
                });
            }

            return removed;
        }
        return null;
    }

    getInhabitant(id) {
        return this.population.find(p => p.id === id) || null;
    }

    getAll() {
        return this.population;
    }

    getByRole(role) {
        return this.population.filter(p => p.role === role);
    }

    assignRole(id, newRole) {
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.role = newRole;
            return true;
        }
        return false;
    }

    updateStatus(id, status) {
        const villager = this.getInhabitant(id);
        if (villager) {
            villager.status = status;
            console.log(`[PopulationManager] Updated status for ${villager.name}: ${status}`);

            // Trigger job optimization when status changes
            this.optimizeJobAssignments();
            return true;
        }
        return false;
    }

    // ===== SKILL AND EXPERIENCE SYSTEM =====

    /**
     * Get skill level information for a villager
     * @param {object} villager - The villager object
     * @param {string} skillName - Name of the skill
     * @returns {object} - { level, title, efficiency, xp }
     */
    getSkillLevel(villager, skillName) {
        const xp = villager.experience[skillName] || 0;
        for (const [levelKey, levelData] of Object.entries(this.skillLevels)) {
            if (xp >= levelData.min && xp <= levelData.max) {
                return {
                    level: levelKey,
                    title: levelData.title,
                    efficiency: levelData.efficiency,
                    xp: xp
                };
            }
        }
        return this.skillLevels.novice;
    }

    /**
     * Get best skill for a villager based on experience
     * @param {object} villager - The villager object
     * @returns {object} - { skillName, level, title, efficiency, xp }
     */
    getBestSkill(villager) {
        let bestSkill = null;
        let bestXp = -1;

        for (const [skillName, xp] of Object.entries(villager.experience || {})) {
            if (xp > bestXp) {
                bestXp = xp;
                bestSkill = skillName;
            }
        }

        if (bestSkill) {
            const skillLevel = this.getSkillLevel(villager, bestSkill);
            return {
                skillName: bestSkill,
                ...skillLevel
            };
        }

        return {
            skillName: 'None',
            level: 'novice',
            title: 'Novice',
            efficiency: 1.0,
            xp: 0
        };
    }

    /**
     * Award experience to a villager in a specific skill
     * @param {number} villagerId - ID of the villager
     * @param {string} skillName - Name of the skill
     * @param {number} xpAmount - Amount of XP to award
     * @returns {object|null} - Level up information if leveled up
     */
    awardExperience(villagerId, skillName, xpAmount) {
        const villager = this.getInhabitant(villagerId);
        if (!villager) return null;

        // Initialize experience if not present
        if (!villager.experience) villager.experience = {};
        if (!villager.experience[skillName]) villager.experience[skillName] = 0;

        // Age-based learning: younger villagers (16-30) learn 25% faster
        let learningMultiplier = 1.0;
        if (villager.age >= 16 && villager.age <= 30) {
            learningMultiplier = 1.25;
        }

        // Apply training mode multipliers
        if (this.trainingMode === 'training') {
            learningMultiplier *= 2.0; // Double XP in training mode
        }

        // Check for mentorship bonus (nearby expert/master villagers)
        const mentorshipBonus = this.getMentorshipBonus(villager, skillName);
        learningMultiplier *= mentorshipBonus;

        // Apply village-wide elder wisdom bonus
        const elderBonuses = this.getElderBonuses();
        learningMultiplier *= (1 + elderBonuses.wisdomBonus);

        const finalXpAmount = Math.round(xpAmount * learningMultiplier);

        const oldLevel = this.getSkillLevel(villager, skillName);
        villager.experience[skillName] += finalXpAmount;
        const newLevel = this.getSkillLevel(villager, skillName);

        // Check if leveled up
        if (oldLevel.level !== newLevel.level) {
            console.log(`[PopulationManager] ${villager.name} leveled up in ${skillName}: ${oldLevel.title} -> ${newLevel.title}`);

            // Emit level up event
            if (window.eventBus) {
                window.eventBus.emit('villager-level-up', {
                    villager: villager,
                    skill: skillName,
                    oldLevel: oldLevel,
                    newLevel: newLevel
                });
            }

            return {
                villager: villager,
                skill: skillName,
                oldLevel: oldLevel,
                newLevel: newLevel
            };
        }

        return null;
    }

    /**
     * Calculate mentorship bonus based on skill level difference
     * Expert/Master villagers provide XP bonus to nearby learners
     */
    getMentorshipBonus(villager, skillName) {
        // Find villagers with expert/master level in the same skill
        const mentors = this.population.filter(mentor => {
            if (mentor.id === villager.id) return false; // Can't mentor yourself

            const mentorSkillLevel = this.getSkillLevel(mentor, skillName);
            return mentorSkillLevel.level === 'expert' || mentorSkillLevel.level === 'master';
        });

        if (mentors.length === 0) return 1.0; // No bonus without mentors

        // Calculate bonus based on skill level difference
        const villagerSkillLevel = this.getSkillLevel(villager, skillName);
        const villagerNumericLevel = villagerSkillLevel.numericLevel || 1;

        let bestBonus = 1.0;
        mentors.forEach(mentor => {
            const mentorSkillLevel = this.getSkillLevel(mentor, skillName);
            const levelDifference = mentorSkillLevel.numericLevel - villagerNumericLevel;

            // Bonus increases with skill level difference: +10% per level difference, max +50%
            const bonus = 1.0 + Math.min(levelDifference * 0.1, 0.5);
            if (bonus > bestBonus) bestBonus = bonus;
        });

        return bestBonus;
    }

    /**
     * Process daily skill progression for all working villagers
     * Awards XP based on job performance and mentorship
     */
    processDailySkillProgression() {
        if (typeof window !== 'undefined' && window.gameState && !window.gameState.jobManager) return;
        if (typeof window === 'undefined') return; // Skip in Node.js environment

        const workplaceGroups = this.getWorkplaceGroups();

        // Process each workplace
        for (const [buildingId, workers] of Object.entries(workplaceGroups)) {
            if (workers.length === 0) continue;

            // Find the most experienced worker (mentor)
            let mentor = null;
            let mentorTopSkillXp = -1;

            workers.forEach(worker => {
                const bestSkill = this.getBestSkill(worker);
                if (bestSkill.xp > mentorTopSkillXp) {
                    mentorTopSkillXp = bestSkill.xp;
                    mentor = worker;
                }
            });

            // Award XP to all workers
            workers.forEach(worker => {
                const jobSkills = this.jobSkillMapping[worker.role] || ['General'];

                jobSkills.forEach(skillName => {
                    let baseXp = 1;
                    let mentorshipBonus = 0;

                    // Mentorship bonus if working with more experienced person
                    if (mentor && mentor.id !== worker.id) {
                        const workerLevel = this.getSkillLevel(worker, skillName);
                        const mentorLevel = this.getSkillLevel(mentor, skillName);

                        if (mentorLevel.xp > workerLevel.xp) {
                            mentorshipBonus = 1; // +1 XP bonus for learning from mentor
                        }
                    }

                    // Award XP
                    this.awardExperience(worker.id, skillName, baseXp + mentorshipBonus);
                });

                // Mentor also gains teaching XP (smaller amount)
                if (mentor && mentor.id === worker.id && workers.length > 1) {
                    const teachingSkills = this.jobSkillMapping[mentor.role] || ['General'];
                    teachingSkills.forEach(skillName => {
                        this.awardExperience(mentor.id, skillName, 0.5);
                    });
                }
            });
        }
    }

    /**
     * Get villagers grouped by their workplace/building
     * @returns {object} - { buildingId: [workers...] }
     */
    getWorkplaceGroups() {
        const groups = {};

        this.population.forEach(villager => {
            if (villager.status === 'working' && villager.buildingId) {
                if (!groups[villager.buildingId]) {
                    groups[villager.buildingId] = [];
                }
                groups[villager.buildingId].push(villager);
            }
        });

        return groups;
    }

    // ===== JOB OPTIMIZATION SYSTEM =====

    /**
     * Calculate job effectiveness score for a villager in a specific job
     * @param {object} villager - The villager object
     * @param {string} jobType - Type of job (farmer, builder, etc.)
     * @returns {number} - Effectiveness score (higher is better)
     */
    calculateJobEffectiveness(villager, jobType) {
        if (villager.age <= 15 || villager.age > 190) return 0; // Can't work
        if (villager.status === 'drafted' || villager.status === 'sick') return 0;

        const requiredSkills = this.jobSkillMapping[jobType] || [];
        let skillScore = 1.0; // Base efficiency

        if (requiredSkills.length > 0) {
            // Calculate average skill level for this job
            let totalEfficiency = 0;
            let skillCount = 0;

            requiredSkills.forEach(skillName => {
                const skillLevel = this.getSkillLevel(villager, skillName);
                totalEfficiency += skillLevel.efficiency;
                skillCount++;
            });

            if (skillCount > 0) {
                skillScore = totalEfficiency / skillCount;
            }
        }

        // Age factor (peak efficiency 25-120 days)
        let ageFactor = 1.0;
        if (villager.age < 25) {
            ageFactor = 0.7 + (villager.age / 25) * 0.3; // 70-100%
        } else if (villager.age > 120) {
            ageFactor = Math.max(0.5, 1.0 - ((villager.age - 120) / 70) * 0.5); // 100-50%
        }

        // Happiness factor
        const happinessFactor = Math.max(0.5, (villager.happiness || 70) / 100);

        return skillScore * ageFactor * happinessFactor;
    }

    /**
     * Optimize job assignments for all available workers
     * Prioritizes experienced workers for best jobs and training opportunities
     */
    optimizeJobAssignments() {
        if (typeof window !== 'undefined' && window.gameState && !window.gameState.jobManager) return;
        if (typeof window === 'undefined') return; // Skip in Node.js environment

        // Get available jobs from job manager
        window.gameState.jobManager.updateAvailableJobs();
        const availableJobs = window.gameState.jobManager.getAllAvailableJobs();

        if (availableJobs.length === 0) return;

        // Get available workers (working age, not drafted, not already optimally assigned)
        const availableWorkers = this.population.filter(villager =>
            villager.age >= 16 && villager.age <= 190 &&
            villager.status !== 'drafted' &&
            villager.status !== 'sick'
        );

        // Clear current assignments for re-optimization
        availableWorkers.forEach(worker => {
            if (worker.status === 'working') {
                worker.status = 'idle';
                worker.buildingId = null;
                worker.role = 'peasant';
            }
        });

        // Create job-worker effectiveness matrix
        const assignments = [];

        availableJobs.forEach(job => {
            const jobType = job.buildingType || job.jobType;

            availableWorkers.forEach(worker => {
                const effectiveness = this.calculateJobEffectiveness(worker, jobType);
                if (effectiveness > 0) {
                    assignments.push({
                        worker: worker,
                        job: job,
                        jobType: jobType,
                        effectiveness: effectiveness,
                        trainingValue: this.calculateTrainingValue(worker, jobType)
                    });
                }
            });
        });

        // Sort assignments by optimization strategy
        if (this.trainingMode === 'training') {
            // Prioritize training opportunities, then balance workload
            assignments.sort((a, b) => {
                const trainingDiff = b.trainingValue - a.trainingValue;
                if (Math.abs(trainingDiff) > 0.1) return trainingDiff;
                // Secondary sort: balance workload (prefer less occupied jobs)
                const workloadA = (a.job.currentWorkers || 0) / a.job.maxWorkers;
                const workloadB = (b.job.currentWorkers || 0) / b.job.maxWorkers;
                return workloadA - workloadB;
            });
        } else if (this.trainingMode === 'resources') {
            // Prioritize maximum efficiency, then balance workload
            assignments.sort((a, b) => {
                const effDiff = b.effectiveness - a.effectiveness;
                if (Math.abs(effDiff) > 0.1) return effDiff;
                // Secondary sort: balance workload
                const workloadA = (a.job.currentWorkers || 0) / a.job.maxWorkers;
                const workloadB = (b.job.currentWorkers || 0) / b.job.maxWorkers;
                return workloadA - workloadB;
            });
        } else {
            // Balanced approach: consider efficiency, training, AND workload distribution
            assignments.sort((a, b) => {
                const scoreA = (a.effectiveness * 0.5) + (a.trainingValue * 0.2);
                const scoreB = (b.effectiveness * 0.5) + (b.trainingValue * 0.2);

                // Add workload balancing factor (prefer less busy jobs)
                const workloadA = (a.job.currentWorkers || 0) / a.job.maxWorkers;
                const workloadB = (b.job.currentWorkers || 0) / b.job.maxWorkers;
                const workloadScoreA = scoreA + ((1 - workloadA) * 0.3);
                const workloadScoreB = scoreB + ((1 - workloadB) * 0.3);

                return workloadScoreB - workloadScoreA;
            });
        }

        // Assign jobs starting with best matches
        const usedWorkers = new Set();
        const usedJobs = new Set();
        let assignedCount = 0;

        assignments.forEach(assignment => {
            if (usedWorkers.has(assignment.worker.id) || usedJobs.has(assignment.job.id)) {
                return; // Worker or job already assigned
            }

            // Check if job still has capacity
            if (assignment.job.currentWorkers >= assignment.job.maxWorkers) {
                return;
            }

            // Assign worker to job
            assignment.worker.status = 'working';
            assignment.worker.role = assignment.jobType;
            assignment.worker.buildingId = assignment.job.buildingId;

            // Update job capacity
            assignment.job.currentWorkers = (assignment.job.currentWorkers || 0) + 1;

            usedWorkers.add(assignment.worker.id);
            if (assignment.job.currentWorkers >= assignment.job.maxWorkers) {
                usedJobs.add(assignment.job.id);
            }

            assignedCount++;
        });

        console.log(`[PopulationManager] Optimized job assignments: ${assignedCount} workers assigned to jobs`);

        // Update job manager with new assignments
        if (window.gameState.jobManager.refreshAssignments) {
            window.gameState.jobManager.refreshAssignments();
        }
    }

    /**
     * Calculate training value for a worker in a specific job
     * Higher values indicate better learning opportunities
     * @param {object} villager - The villager object
     * @param {string} jobType - Type of job
     * @returns {number} - Training value score
     */
    calculateTrainingValue(villager, jobType) {
        const requiredSkills = this.jobSkillMapping[jobType] || [];
        if (requiredSkills.length === 0) return 0;

        let trainingPotential = 0;

        requiredSkills.forEach(skillName => {
            const currentLevel = this.getSkillLevel(villager, skillName);

            // Higher training value for lower current skill (room for improvement)
            if (currentLevel.level === 'novice') trainingPotential += 3;
            else if (currentLevel.level === 'apprentice') trainingPotential += 2;
            else if (currentLevel.level === 'journeyman') trainingPotential += 1;
            // Experts and masters have low training value (already skilled)
        });

        return trainingPotential;
    }

    /**
     * Set training mode preference
     * @param {string} mode - 'training', 'resources', or 'balanced'
     */
    setTrainingMode(mode) {
        if (['training', 'resources', 'balanced'].includes(mode)) {
            this.trainingMode = mode;
            console.log(`[PopulationManager] Training mode set to: ${mode}`);

            // Re-optimize with new strategy
            this.optimizeJobAssignments();
        }
    }

    /**
     * Get village-wide bonuses from elder roles
     */
    getElderBonuses() {
        const elders = this.population.filter(p => p.age >= 191 && p.age <= 197);
        const bonuses = {
            wisdomBonus: 0,      // XP bonus for all villagers
            productivityBonus: 0,  // Productivity bonus
            happinessBonus: 0     // Happiness bonus
        };

        elders.forEach(elder => {
            const bestSkill = this.getBestSkill(elder);

            // Elders with master-level skills provide village bonuses
            if (bestSkill.level === 'master') {
                bonuses.wisdomBonus += 0.05;      // +5% XP gain
                bonuses.productivityBonus += 0.03; // +3% productivity
                bonuses.happinessBonus += 0.02;   // +2% happiness
            } else if (bestSkill.level === 'expert') {
                bonuses.wisdomBonus += 0.03;      // +3% XP gain
                bonuses.productivityBonus += 0.02; // +2% productivity
                bonuses.happinessBonus += 0.01;   // +1% happiness
            }
        });

        // Cap bonuses at reasonable levels
        bonuses.wisdomBonus = Math.min(bonuses.wisdomBonus, 0.25);      // Max 25%
        bonuses.productivityBonus = Math.min(bonuses.productivityBonus, 0.15); // Max 15%
        bonuses.happinessBonus = Math.min(bonuses.happinessBonus, 0.10);    // Max 10%

        return bonuses;
    }

    /**
     * Knowledge preservation system (monarch upgrade feature)
     * When enabled, preserves some knowledge when skilled villagers die
     */
    preserveKnowledgeOnDeath(deceasedVillager) {
        // This feature requires monarch upgrade "Royal Archives" or similar
        if (typeof window === 'undefined' || !window.gameState.monarchUpgrades) return;
        if (!window.gameState.monarchUpgrades.hasUpgrade('knowledgePreservation')) return;

        const skills = deceasedVillager.skills || {};
        const experience = deceasedVillager.experience || {};

        // Preserve 25% of experience in village knowledge bank
        Object.keys(experience).forEach(skillName => {
            const preservedXp = Math.floor(experience[skillName] * 0.25);
            if (preservedXp > 0) {
                // Add to village knowledge bank (to be distributed to apprentices)
                if (!window.gameState.villageKnowledge) window.gameState.villageKnowledge = {};
                window.gameState.villageKnowledge[skillName] =
                    (window.gameState.villageKnowledge[skillName] || 0) + preservedXp;

                console.log(`[PopulationManager] Preserved ${preservedXp} XP in ${skillName} from ${deceasedVillager.name}`);
            }
        });
    }

    /**
     * Distribute preserved knowledge to apprentices (daily process)
     */
    distributePreservedKnowledge() {
        if (typeof window === 'undefined' || !window.gameState.villageKnowledge) return;
        if (!window.gameState.monarchUpgrades?.hasUpgrade('knowledgePreservation')) return;

        const knowledgeBank = window.gameState.villageKnowledge;

        Object.keys(knowledgeBank).forEach(skillName => {
            const availableXp = knowledgeBank[skillName];
            if (availableXp <= 0) return;

            // Find apprentices in this skill (novice/apprentice level)
            const apprentices = this.population.filter(villager => {
                const skillLevel = this.getSkillLevel(villager, skillName);
                return skillLevel.level === 'novice' || skillLevel.level === 'apprentice';
            });

            if (apprentices.length > 0) {
                // Distribute XP among apprentices
                const xpPerApprentice = Math.floor(availableXp / apprentices.length);
                if (xpPerApprentice > 0) {
                    apprentices.forEach(apprentice => {
                        this.awardExperience(apprentice.id, skillName, xpPerApprentice);
                    });

                    // Reduce knowledge bank
                    knowledgeBank[skillName] -= (xpPerApprentice * apprentices.length);
                    console.log(`[PopulationManager] Distributed preserved ${skillName} knowledge to ${apprentices.length} apprentices`);
                }
            }
        });
    }

    moveInhabitant(id, newLocation) {
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.location = newLocation;
            // Also set buildingId for production tracking
            inhabitant.buildingId = newLocation;
            return true;
        }
        return false;
    }

    // Utility: get population count by location or status
    countBy(filterFn) {
        return this.population.filter(filterFn).length;
    }

    /**
     * Generate a mass population with good age distribution focused on young adults
     * @param {number} count - Number of people to generate
     * @returns {array} Array of generated inhabitants
     */
    generateMassPopulation(count) {
        const generated = [];
        const names = [
            'Aiden', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella',
            'Lucas', 'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'Logan', 'Harper', 'Owen', 'Evelyn',
            'Benjamin', 'Abigail', 'Theodore', 'Emily', 'Henry', 'Elizabeth', 'Alexander', 'Sofia', 'Sebastian', 'Madison',
            'Jack', 'Scarlett', 'Owen', 'Victoria', 'Luke', 'Aria', 'Wyatt', 'Grace', 'Grayson', 'Chloe'
        ];

        for (let i = 0; i < count; i++) {
            // Age distribution with focus on working age (16-190)
            let age;
            const ageRoll = Math.random();
            if (ageRoll < 0.6) {
                // 60% chance: Working age (16-190) - main productive population
                age = 16 + Math.floor(Math.random() * 175);
            } else if (ageRoll < 0.8) {
                // 20% chance: Young workers (16-60)
                age = 16 + Math.floor(Math.random() * 45);
            } else if (ageRoll < 0.9) {
                // 10% chance: Children (3-15)
                age = 3 + Math.floor(Math.random() * 13);
            } else {
                // 10% chance: Elderly (180-195)
                age = 180 + Math.floor(Math.random() * 16);
            }

            // Ensure roughly even gender split
            const gender = (i % 2 === 0) ? 'male' : 'female';

            // Random name
            const name = names[Math.floor(Math.random() * names.length)] + ' ' + (Math.floor(Math.random() * 999) + 1);

            // Role based on age
            let role = 'peasant';
            if (age <= 15) {
                role = 'child';
            } else if (Math.random() < 0.3) {
                // 30% chance for specialized roles for working age adults
                const specialRoles = ['farmer', 'builder', 'gatherer', 'woodcutter'];
                role = specialRoles[Math.floor(Math.random() * specialRoles.length)];
            }

        const inhabitant = this.addInhabitant({
                name: name,
                age: age,
                gender: gender,
                role: role,
                status: 'idle',
                location: 'village',
                skills: this.getSkillsForRole(role)
            });

            if (inhabitant) {
                generated.push(inhabitant);
            } else {
                // Cap reached; stop generating more
                console.log('[PopulationManager] Population cap reached during mass generation; stopping early');
                break;
            }
        }

        console.log(`[PopulationManager] Generated ${count} inhabitants. Age distribution:`, {
            children: generated.filter(p => p.age <= 15).length,
            workingAge: generated.filter(p => p.age >= 16 && p.age <= 190).length,
            elderly: generated.filter(p => p.age >= 191).length,
            males: generated.filter(p => p.gender === 'male').length,
            females: generated.filter(p => p.gender === 'female').length
        });

        return generated;
    }

    /**
     * Add refugees (generic adults/children mix) up to population cap
     * @param {number} count
     * @returns {number} number actually added
     */
    addRefugees(count) {
        let added = 0;
        for (let i = 0; i < count; i++) {
            // Favor working-age adults with a chance of a child
            const isChild = Math.random() < 0.25;
            const age = isChild ? (5 + Math.floor(Math.random() * 11)) : (18 + Math.floor(Math.random() * 40));
            const role = isChild ? 'child' : 'peasant';
            const status = isChild ? 'child' : 'idle';
            const villager = this.addInhabitant({
                name: `${isChild ? 'Refugee Child' : 'Refugee Adult'} ${Math.floor(Math.random() * 1000)}`,
                age,
                role,
                status,
                gender: Math.random() < 0.5 ? 'male' : 'female'
            });
            if (!villager) break; // Cap reached
            added++;
        }
        if (added > 0 && window.eventBus) {
            window.eventBus.emit('population_gained', { amount: added, source: 'refugees' });
        }
        return added;
    }

    /**
     * Add deserters back to population as idle adults, up to cap
     * @param {number} count
     * @returns {number} number actually added
     */
    addDeserters(count) {
        let added = 0;
        for (let i = 0; i < count; i++) {
            const villager = this.addInhabitant({
                name: `Deserter ${Math.floor(Math.random() * 1000)}`,
                age: 20 + Math.floor(Math.random() * 25),
                role: 'peasant',
                status: 'idle',
                gender: Math.random() < 0.5 ? 'male' : 'female'
            });
            if (!villager) break;
            added++;
        }
        if (added > 0 && window.eventBus) {
            window.eventBus.emit('population_gained', { amount: added, source: 'deserters' });
        }
        return added;
    }

    /**
     * Adjust morale/happiness across village (simple implementation)
     */
    increaseMorale(delta) {
        this.population.forEach(v => {
            v.happiness = Math.max(0, Math.min(100, (v.happiness || 70) + delta));
        });
    }

    /**
     * Generate a well-distributed population with proper age brackets and skills
     * @param {number} targetSize - Target population size
     * @param {boolean} focusOnAdults - Whether to focus on working-age adults
     */
    generateDistributedPopulation(targetSize = 10, focusOnAdults = true) {
        console.log(`[PopulationManager] Generating distributed population of ${targetSize} villagers...`);

        // Clear existing population
        this.population = [];
        this.nextId = 1;

        // Age distribution weights (focused on adults as requested)
        const ageDistribution = focusOnAdults ? {
            children: 0.15,     // 15% children (0-27)
            youngAdults: 0.35,  // 35% young adults (28-60)
            adults: 0.35,       // 35% prime adults (61-120)
            middleAged: 0.10,   // 10% middle-aged (121-180)
            elderly: 0.05       // 5% elderly (181+)
        } : {
            children: 0.25,
            youngAdults: 0.25,
            adults: 0.25,
            middleAged: 0.15,
            elderly: 0.10
        };

        const roles = ['farmer', 'builder', 'gatherer', 'woodcutter', 'worker'];
        const skills = ['farming', 'building', 'combat', 'leadership', 'scholarship'];

        for (let i = 0; i < targetSize; i++) {
            const rand = Math.random();
            let age, ageGroup;

            // Determine age based on distribution
            if (rand < ageDistribution.children) {
                age = Math.floor(Math.random() * 28); // 0-27
                ageGroup = 'child';
            } else if (rand < ageDistribution.children + ageDistribution.youngAdults) {
                age = 28 + Math.floor(Math.random() * 33); // 28-60
                ageGroup = 'young adult';
            } else if (rand < ageDistribution.children + ageDistribution.youngAdults + ageDistribution.adults) {
                age = 61 + Math.floor(Math.random() * 60); // 61-120
                ageGroup = 'adult';
            } else if (rand < ageDistribution.children + ageDistribution.youngAdults + ageDistribution.adults + ageDistribution.middleAged) {
                age = 121 + Math.floor(Math.random() * 60); // 121-180
                ageGroup = 'middle-aged';
            } else {
                age = 181 + Math.floor(Math.random() * 50); // 181-230
                ageGroup = 'elderly';
            }

            // Generate proper skills for adults using roles
            let villagerSkills = [];
            let role = 'child';

            if (age > 27) {
                role = roles[Math.floor(Math.random() * roles.length)];
                villagerSkills = this.getSkillsForRole(role);
            }

            // Create villager with appropriate traits
            const villager = {
                age: age,
                name: this.generateRandomName(),
                role: role,
                status: age > 27 ? 'idle' : 'child',
                skills: villagerSkills,
                gender: Math.random() < 0.5 ? 'male' : 'female',
                happiness: 60 + Math.floor(Math.random() * 30), // 60-90 happiness
                productivity: age > 27 ? (0.7 + Math.random() * 0.6) : 0.1, // 0.7-1.3 for adults
                traits: this.generateRandomTraits(ageGroup)
            };

            this.addInhabitant(villager);
        }

        console.log(`[PopulationManager] Generated ${this.population.length} villagers`);
        this.logAgeDistribution();

        return this.population;
    }

    /**
     * Generate specific starting population for dynasty games
     * Creates royal family member + 4 basic villagers (no pre-assigned jobs)
     */
    generateStartingDynastyPopulation() {
        console.log('[PopulationManager] Generating starting dynasty population...');

        // Clear existing population
        this.population = [];
        this.nextId = 1;

        // 1. Create the royal family member (the player character)
        const royalMember = {
            age: 30 + Math.floor(Math.random() * 20), // 30-50 years old
            name: this.generateRandomName() + ' the First',
            role: 'royal',
            status: 'ruling',
            skills: ['leadership', 'combat', 'scholarship'],
            gender: Math.random() < 0.5 ? 'male' : 'female',
            happiness: 80,
            productivity: 1.2,
            traits: ['noble', 'charismatic', 'educated']
        };
    this.addInhabitant(royalMember, { ignoreCap: true });

        // 2. Add basic villagers (jobs will be assigned from buildings later)
        const startingCount = (typeof window !== 'undefined' && window.GameData && window.GameData.startingPopulationCount) ? window.GameData.startingPopulationCount : 5;
        const additionalVillagers = Math.max(0, startingCount - 1);
        for (let i = 0; i < additionalVillagers; i++) {
            const villager = {
                age: 20 + Math.floor(Math.random() * 25), // 20-45 years old
                name: this.generateRandomName(),
                role: 'villager', // Basic villager role, jobs come from buildings
                status: 'idle',
                skills: this.getSkillsForRole('villager'),
                gender: Math.random() < 0.5 ? 'male' : 'female',
                happiness: 60 + Math.floor(Math.random() * 20),
                productivity: 0.8 + Math.random() * 0.4,
                traits: this.generateRandomTraits('adult')
            };
            this.addInhabitant(villager, { ignoreCap: true });
        }

        console.log('[PopulationManager] Generated starting dynasty population:');
        this.population.forEach(p => {
            console.log(`  - ${p.name}: ${p.role} (age ${p.age})`);
        });

        return this.population;
    }

    /**
     * Get appropriate skills for a given role with proper XP values
     */
    getSkillsForRole(role) {
        // Use SkillSystem to generate proper skill structures with XP values
        if (typeof window !== 'undefined' && window.SkillSystem && window.skillSystemReady) {
            const skillSystem = new window.SkillSystem();

            // Map role to SkillSystem types
            const roleToSkillType = {
                'farmer': 'experienced',       // Experienced in agriculture
                'builder': 'master',           // Craftsman with construction skills
                'guard': 'military',           // Military skills
                'worker': 'default',           // Basic skills
                'scholar': 'trader',           // Knowledge/leadership skills
                'trader': 'trader',            // Trading/leadership skills
                'royal': 'master'              // High-level skills
            };

            const skillType = roleToSkillType[role] || 'default';
            const generatedSkills = skillSystem.generateImmigrantSkills(skillType);

            console.log(`[PopulationManager] Generated skills for ${role}:`, generatedSkills);
            return generatedSkills;
        }

        // Fallback to simple skill arrays if SkillSystem not available
        const roleSkills = {
            'farmer': ['farming'],
            'builder': ['building'],
            'guard': ['combat'],
            'worker': ['building'],
            'villager': ['farming'], // Basic villager skills
            'scholar': ['scholarship'],
            'trader': ['leadership'],
            'royal': ['leadership', 'combat', 'scholarship']
        };
        return roleSkills[role] || ['farming'];
    }

    /**
     * Generate population with preferred professions
     * @param {number} count - Number of people to generate  
     * @param {string[]} preferredProfessions - Array of preferred roles
     * @returns {array} Array of generated inhabitants
     */
    generatePopulationWithPreferences(count, preferredProfessions = []) {
        const generated = [];
        console.log(`[PopulationManager] Generating ${count} people with preferred professions:`, preferredProfessions);

        for (let i = 0; i < count; i++) {
            // Determine role - prefer specified professions for first few
            let role = 'worker'; // default
            if (i < preferredProfessions.length) {
                role = preferredProfessions[i];
            } else {
                // Random role for extras
                const allRoles = ['farmer', 'builder', 'gatherer', 'woodcutter', 'worker'];
                role = allRoles[Math.floor(Math.random() * allRoles.length)];
            }

            // Generate age (focus on working adults)
            const age = 20 + Math.floor(Math.random() * 40); // 20-60 years old

            const villager = {
                age: age,
                name: this.generateRandomName(),
                role: role,
                status: 'idle',
                skills: this.getSkillsForRole(role),
                gender: Math.random() < 0.5 ? 'male' : 'female',
                happiness: 60 + Math.floor(Math.random() * 30),
                productivity: 0.7 + Math.random() * 0.6,
                traits: this.generateRandomTraits('adult')
            };

            const inhabitant = this.addInhabitant(villager);
            generated.push(inhabitant);
        }

        console.log(`[PopulationManager] Generated ${count} inhabitants with roles:`,
            generated.map(p => p.role));
        return generated;
    }

    /**
     * Generate a random name
     */
    generateRandomName() {
        const firstNames = ['Aldric', 'Berta', 'Cedric', 'Dana', 'Erik', 'Freya', 'Gareth', 'Hilda', 'Ivan', 'Jora', 'Kael', 'Luna', 'Magnus', 'Nora', 'Osric', 'Petra'];
        return firstNames[Math.floor(Math.random() * firstNames.length)];
    }

    /**
     * Generate random traits based on age group
     */
    generateRandomTraits(ageGroup) {
        const traits = ['hardworking', 'cheerful', 'wise', 'brave', 'social', 'innovative'];
        const numTraits = Math.random() < 0.5 ? 1 : 0; // 50% chance for a trait
        if (numTraits === 0) return [];
        return [traits[Math.floor(Math.random() * traits.length)]];
    }

    /**
     * Log current population age distribution for debugging
     */
    logAgeDistribution() {
        const distribution = {
            children: 0,
            youngAdults: 0,
            adults: 0,
            middleAged: 0,
            elderly: 0
        };

        this.population.forEach(villager => {
            if (villager.age <= 27) distribution.children++;
            else if (villager.age <= 60) distribution.youngAdults++;
            else if (villager.age <= 120) distribution.adults++;
            else if (villager.age <= 180) distribution.middleAged++;
            else distribution.elderly++;
        });

        console.log('[PopulationManager] Age Distribution:', distribution);
    }

    /**
     * Trigger a refugee arrival event. Shows a modal prompting the player to accept refugees.
     * @param {number} count - Number of refugees (1-3)
     * @param {object} options - { isTutorial: bool } if triggered from tutorial step
     */
    triggerRefugeeEvent(count = null, options = {}) {
        const { isTutorial = false } = options;

        // Determine refugee count (1-3)
        if (count === null) {
            count = Math.floor(Math.random() * 3) + 1;
        }
        count = Math.max(1, Math.min(3, count));

        // Check current population vs cap
        const cap = window.gameState?.getPopulationCap?.() || 0;
        const current = this.population.length;
        const available = Math.max(0, cap - current);

        // Clamp to available capacity
        const actualCount = Math.min(count, available);

        if (actualCount <= 0 && !isTutorial) {
            console.log('[PopulationManager] Refugee event skipped — no housing capacity');
            return;
        }

        const refugeeWord = actualCount === 1 ? 'refugee' : 'refugees';
        const arrivalCount = actualCount > 0 ? actualCount : count;
        const noRoom = actualCount <= 0;

        let storyHtml;
        if (noRoom) {
            storyHtml = `
                <div class="story-panel">
                    <p>Weary travelers approach your settlement seeking shelter, but you have <strong>no housing available</strong>.</p>
                    <p>Build more <span class="highlight">Houses</span> to welcome future refugees.</p>
                </div>`;
        } else {
            storyHtml = `
                <div class="story-panel">
                    <p>${arrivalCount} weary ${refugeeWord} ${actualCount === 1 ? 'has' : 'have'} arrived at your gates, seeking shelter from the dangers of the wilderness.</p>
                    <p>They are willing to work and contribute to your settlement.</p>
                    ${isTutorial ? '<p><em>Accepting refugees is a great way to grow your population quickly!</em></p>' : ''}
                </div>`;
        }

        const modalContent = storyHtml;

        if (window.showModal) {
            const buttons = noRoom
                ? `<button class="modal-btn btn-primary" data-action="dismiss">Understood</button>`
                : `<button class="modal-btn btn-primary" data-action="accept">Welcome ${arrivalCount} ${refugeeWord}</button>
                   <button class="modal-btn btn-secondary" data-action="decline">Turn them away</button>`;

            window.modalSystem.showModal({
                title: `🏕️ Refugees Arrive!`,
                content: modalContent + `<div class="modal-actions" style="margin-top: 1rem; display:flex; gap:0.5rem; justify-content:center;">${buttons}</div>`,
                modalType: 'refugee-event',
                closable: false,
                showCloseButton: false
            }).then(() => {
                // Modal closed without action — treat as decline
                if (!this._refugeeHandled) {
                    console.log('[PopulationManager] Refugee modal closed without action');
                }
                this._refugeeHandled = false;
            });

            // Attach button handlers after a tick (modal needs to render)
            setTimeout(() => {
                this._refugeeHandled = false;
                const acceptBtn = document.querySelector('[data-action="accept"]');
                const declineBtn = document.querySelector('[data-action="decline"]');
                const dismissBtn = document.querySelector('[data-action="dismiss"]');

                if (acceptBtn) {
                    acceptBtn.addEventListener('click', () => {
                        this._refugeeHandled = true;
                        this._acceptRefugees(actualCount);
                        window.modalSystem.closeTopModal();
                    });
                }
                if (declineBtn) {
                    declineBtn.addEventListener('click', () => {
                        this._refugeeHandled = true;
                        this._declineRefugees();
                        window.modalSystem.closeTopModal();
                    });
                }
                if (dismissBtn) {
                    dismissBtn.addEventListener('click', () => {
                        this._refugeeHandled = true;
                        window.modalSystem.closeTopModal();
                    });
                }
            }, 100);
        } else {
            // Fallback: auto-accept if no modal system
            if (actualCount > 0) {
                this._acceptRefugees(actualCount);
            }
        }
    }

    /**
     * Accept refugees — add them to the population
     * @param {number} count
     */
    _acceptRefugees(count) {
        const added = [];
        for (let i = 0; i < count; i++) {
            const age = 18 + Math.floor(Math.random() * 22); // Age 18-39
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const name = this.generateRandomName();
            const refugee = this.addInhabitant({
                name: name,
                age: age,
                gender: gender,
                role: 'peasant',
                status: 'idle',
                traits: ['refugee']
            });
            if (refugee) added.push(refugee);
        }

        const actualAdded = added.length;
        if (actualAdded > 0) {
            const word = actualAdded === 1 ? 'refugee has' : 'refugees have';
            window.showToast?.(`${actualAdded} ${word} joined your settlement!`, {
                icon: '🏕️', type: 'success', timeout: 4000
            });

            window.eventBus?.emit?.('refugees_accepted', { count: actualAdded, refugees: added });
            window.eventBus?.emit?.('population_gained', { amount: actualAdded });
        }

        console.log(`[PopulationManager] Accepted ${actualAdded} refugees`);
        return added;
    }

    /**
     * Decline refugees
     */
    _declineRefugees() {
        window.showToast?.('The refugees move on...', {
            icon: '🚶', type: 'info', timeout: 3000
        });
        window.eventBus?.emit?.('refugees_declined');
        console.log('[PopulationManager] Refugees declined');
    }

    /**
     * Debug function to manually test aging system
     */
    debugAging() {
        console.log('[PopulationManager] Debug: Testing aging system...');
        console.log('Current population ages:', this.population.map(v => ({ name: v.name, age: v.age })));

        // Test aging process
        const result = this.processAging();
        console.log('Aging result:', result);

        console.log('Population after aging:', this.population.map(v => ({ name: v.name, age: v.age })));
        return result;
    }

    /**
     * Debug function to manually test birth system
     */
    debugBirths(options = {}) {
        console.log('[PopulationManager] Debug: Testing birth system...');

        const eligibleMales = this.population.filter(p => p.age >= 16 && p.age <= 190 && p.gender === 'male').length;
        const eligibleFemales = this.population.filter(p => p.age >= 16 && p.age <= 190 && p.gender === 'female').length;

        console.log(`Eligible for reproduction: ${eligibleMales} males, ${eligibleFemales} females`);

        const birthResult = this.calculateDailyGrowth(options);
        console.log('Birth calculation result:', birthResult);

        return birthResult;
    }

    /**
     * Debug function to set realistic ages for testing
     */
    debugSetAges() {
        console.log('[PopulationManager] Debug: Setting realistic ages...');

        this.population.forEach((villager, index) => {
            if (villager.age > 250 || villager.age < 0) {
                // Set to random working age
                villager.age = Math.floor(Math.random() * 100) + 20; // 20-120 days
                console.log(`Reset ${villager.name} age to ${villager.age}`);
            }
        });

        console.log('Current ages after reset:', this.population.map(v => ({ name: v.name, age: v.age })));
    }

    toJSON() {
        return this.population;
    }

    /**
     * Get detailed population statistics for the population view modal
     */
    getDetailedStatistics() {
        if (this.population.length === 0) {
            return {
                total: 0,
                demographics: { averageAge: 0, workingAge: 0, employed: 0 },
                happiness: { average: 0, distribution: {}, total: 0 },
                productivity: { average: 0 },
                ageGroups: {},
                jobGroups: {},
                skills: { available: false, overview: {}, topSkilled: [] }
            };
        }

        // Calculate granular age groups for richer UI bars
        // Keep a separate working-age count for analytics without rendering an aggregate bar
        const workingAgeCount = this.population.filter(p => p.age >= 16 && p.age <= 190).length;

        const ageGroupData = {
            infants: {
                name: '🍼 Infants',
                age: '0-3 days',
                count: this.population.filter(p => p.age >= 0 && p.age <= 3).length
            },
            children: {
                name: '👶 Children',
                age: '4-15 days',
                count: this.population.filter(p => p.age >= 4 && p.age <= 15).length
            },
            youngAdults: {
                name: '🧑 Young Adults',
                age: '16-40 days',
                count: this.population.filter(p => p.age >= 16 && p.age <= 40).length
            },
            adults: {
                name: '🧑‍🌾 Adults',
                age: '41-90 days',
                count: this.population.filter(p => p.age >= 41 && p.age <= 90).length
            },
            middleAged: {
                name: '🧔 Middle-Aged',
                age: '91-150 days',
                count: this.population.filter(p => p.age >= 91 && p.age <= 150).length
            },
            seniors: {
                name: '👵 Seniors',
                age: '151-190 days',
                count: this.population.filter(p => p.age >= 151 && p.age <= 190).length
            },
            elderly: {
                name: '👴 Elderly',
                age: '191+ days',
                count: this.population.filter(p => p.age >= 191).length
            }
        };

        // Calculate job groups with proper structure for UI
        const roleDistribution = {};
        this.population.forEach(person => {
            const role = person.role || 'unemployed';
            roleDistribution[role] = (roleDistribution[role] || 0) + 1;
        });

        const jobGroupData = {};
        Object.entries(roleDistribution).forEach(([role, count]) => {
            const roleNames = {
                'farmer': '🌾 Farmers',
                'builder': '🏗️ Builders',
                'guard': '⚔️ Guards',
                'merchant': '💰 Merchants',
                'woodcutter': '🪓 Woodcutters',
                'miner': '⛏️ Miners',
                'stonecutter': '🪨 Stonecutters',
                'sawyer': '🪚 Sawyers',
                'gatherer': '🧺 Gatherers',
                'worker': '👷 Workers',
                'child': '👶 Children',
                'elder': '👴 Elders',
                'player': '👑 Monarch',
                'unemployed': '🆔 Unemployed',
                'peasant': '🆔 Unemployed'
            };

            jobGroupData[role] = {
                name: roleNames[role] || `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
                count: count,
                percentage: Math.round((count / this.population.length) * 100)
            };
        });

        // Calculate skill statistics
        const skillOverview = {};
        const allSkills = new Set();
        let totalSkillLevels = 0;
        let skilledVillagers = 0;

        this.population.forEach(villager => {
            if (villager.experience) {
                let hasSkills = false;
                Object.entries(villager.experience).forEach(([skillName, xp]) => {
                    if (xp > 0) {
                        allSkills.add(skillName);
                        hasSkills = true;

                        if (!skillOverview[skillName]) {
                            skillOverview[skillName] = {
                                total: 0,
                                novice: 0,
                                apprentice: 0,
                                journeyman: 0,
                                expert: 0,
                                master: 0
                            };
                        }

                        const skillLevel = this.getSkillLevel(villager, skillName);
                        skillOverview[skillName].total++;
                        skillOverview[skillName][skillLevel.level]++;
                        totalSkillLevels++;
                    }
                });
                if (hasSkills) skilledVillagers++;
            }
        });

        // Find top skilled villagers
        const topSkilled = this.population
            .map(villager => {
                const bestSkill = this.getBestSkill(villager);
                return {
                    name: villager.name,
                    age: villager.age,
                    role: villager.role,
                    bestSkill: bestSkill.skillName,
                    skillLevel: bestSkill.title,
                    xp: bestSkill.xp,
                    efficiency: bestSkill.efficiency
                };
            })
            .filter(v => v.xp > 0)
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);

        // Calculate happiness statistics
        const happinessValues = this.population.map(v => (v.happiness ?? 70));
        const happinessTotal = happinessValues.reduce((sum, h) => sum + h, 0);
        const averageHappiness = Math.round(happinessTotal / this.population.length);

        // Map happiness distribution to UI-expected buckets
        // veryUnhappy: 0-19, unhappy: 20-39, neutral: 40-59, happy: 60-79, veryHappy: 80-100
        const happinessDistribution = {
            veryUnhappy: happinessValues.filter(h => h < 20).length,
            unhappy: happinessValues.filter(h => h >= 20 && h < 40).length,
            neutral: happinessValues.filter(h => h >= 40 && h < 60).length,
            happy: happinessValues.filter(h => h >= 60 && h < 80).length,
            veryHappy: happinessValues.filter(h => h >= 80).length
        };

        // Calculate productivity statistics
        const totalProductivity = this.population.reduce((sum, v) => sum + (v.productivity || 0.8), 0);
        const averageProductivity = (totalProductivity / this.population.length).toFixed(2);

        return {
            total: this.population.length,
            demographics: {
                averageAge: Math.round(this.population.reduce((sum, v) => sum + v.age, 0) / this.population.length),
                workingAge: workingAgeCount,
                employed: this.population.filter(v => v.status === 'working').length,
                maleCount: this.population.filter(v => v.gender === 'male').length,
                femaleCount: this.population.filter(v => v.gender === 'female').length
            },
            happiness: {
                average: averageHappiness,
                distribution: happinessDistribution,
                // UI expects total to be the number of villagers when computing distribution percentages
                total: this.population.length
            },
            productivity: {
                average: averageProductivity
            },
            ageGroups: ageGroupData,
            jobGroups: jobGroupData,
            skills: {
                available: totalSkillLevels > 0,
                totalSkills: totalSkillLevels,
                averageSkillsPerVillager: totalSkillLevels / this.population.length,
                skilledVillagers: skilledVillagers,
                skillTypes: Array.from(allSkills).length,
                overview: skillOverview,
                topSkilled: topSkilled
            },
            training: {
                mode: this.trainingMode,
                mentors: this.population.filter(p => {
                    const bestSkill = this.getBestSkill(p);
                    return bestSkill.level === 'expert' || bestSkill.level === 'master';
                }).length,
                total: workingAgeCount
            },
            genderDistribution: {
                male: this.population.filter(p => p.gender === 'male').length,
                female: this.population.filter(p => p.gender === 'female').length
            },
            workforceAnalysis: {
                employed: this.population.filter(v => v.status === 'working').length,
                unemployed: this.population.filter(v => v.status === 'idle').length,
                drafted: this.population.filter(v => v.status === 'drafted').length,
                children: ageGroupData.children.count,
                elderly: ageGroupData.elderly.count
            }
        };
    }

    /**
     * Get all population members for display
     */
    getAllMembers() {
        return this.population.map(person => ({
            id: person.id,
            name: person.name,
            age: person.age,
            role: person.role,
            status: person.status,
            gender: person.gender,
            happiness: person.happiness || 50,
            productivity: person.productivity || 1.0,
            skills: person.skills || [],
            traits: person.traits || [],
            location: person.location || 'village'
        }));
    }

    /**
     * Initialize health for existing population members that don't have it
     */
    initializeHealth() {
        let updated = 0;
        this.population.forEach(villager => {
            if (villager.health === undefined || villager.health === null) {
                // Base health on age - younger villagers tend to be healthier
                let baseHealth = 100;
                if (villager.age > 60) {
                    baseHealth = Math.max(70, 100 - (villager.age - 60) * 0.5);
                } else if (villager.age < 16) {
                    baseHealth = Math.max(80, 90 + Math.random() * 10);
                }
                villager.health = Math.round(baseHealth);
                updated++;
            }
        });

        if (updated > 0) {
            console.log(`[PopulationManager] Initialized health for ${updated} existing villagers`);
        }
    }

    /**
     * Fix legacy roles that don't match current job system
     */
    fixLegacyRoles() {
        const validJobRoles = ['farmer', 'builder', 'gatherer', 'woodcutter', 'sawyer', 'foreman'];
        const roleMapping = {
            'guard': 'worker', // Guards become general workers
            'trader': 'worker', // Traders become general workers  
            'merchant': 'worker', // Merchants become general workers
            'scholar': 'worker', // Scholars become general workers
            'miner': 'worker', // Miners become general workers (no miner jobs exist)
            'stonecutter': 'worker' // Stonecutters become general workers (no stonecutter jobs exist)
        };

        let fixed = 0;
        this.population.forEach(villager => {
            if (roleMapping[villager.role]) {
                console.log(`[PopulationManager] Converting ${villager.name} from ${villager.role} to ${roleMapping[villager.role]}`);
                villager.role = roleMapping[villager.role];
                fixed++;
            }
        });

        if (fixed > 0) {
            console.log(`[PopulationManager] Fixed ${fixed} legacy roles to match current job system`);
        }
    }

    /**
     * Clear invalid job assignments from legacy save data
     */
    clearInvalidJobAssignments() {
        let cleared = 0;
        this.population.forEach(villager => {
            // Clear job assignments - these should be managed by JobManager, not stored in population
            if (villager.jobAssignment) {
                console.log(`[PopulationManager] Clearing job assignment for ${villager.name}:`, villager.jobAssignment);
                delete villager.jobAssignment;
                cleared++;
            }
            // Also clear any legacy job-related properties that shouldn't exist
            if (villager.hasJob !== undefined) {
                delete villager.hasJob;
            }
            if (villager.workLocation !== undefined) {
                delete villager.workLocation;
            }
        });

        if (cleared > 0) {
            console.log(`[PopulationManager] Cleared ${cleared} invalid job assignments from population data`);
        }
    }

    /**
     * Reset ages to reasonable values for dynasty games (one-time fix)
     */
    resetAgesForDynastyGame() {
        let reset = 0;
        this.population.forEach(villager => {
            // If age is over reasonable working limit, reset to a working age
            if (villager.age > 120) {
                // Reset to a random working age between 25-80
                villager.age = Math.floor(Math.random() * 55) + 25;
                reset++;
            }
        });

        if (reset > 0) {
            console.log(`[PopulationManager] Reset ${reset} villager ages to reasonable values for dynasty gameplay`);
        }
    }

    /**
     * Generate new young workers to replenish aging population
     */
    generateNewWorkers(count = 5) {
        const newWorkers = [];
        const roles = ['farmer', 'gatherer', 'builder'];

        for (let i = 0; i < count; i++) {
            const newWorker = {
                id: this.nextId++,
                name: this.generateName(),
                age: Math.floor(Math.random() * 15) + 18, // Age 18-32
                role: roles[Math.floor(Math.random() * roles.length)],
                health: Math.floor(Math.random() * 20) + 80, // Health 80-100
                happiness: Math.floor(Math.random() * 30) + 70, // Happiness 70-100
                status: 'idle',
                location: 'village',
                skills: this.generateStartingSkills(),
                experience: {},
                socialConnections: [],
                preferences: this.generatePreferences()
            };

            this.population.push(newWorker);
            newWorkers.push(newWorker);
        }

        console.log(`[PopulationManager] Generated ${count} new workers (ages 18-32)`);
        return newWorkers;
    }

    /**
     * Check population demographics and generate workers if needed
     */
    maintainWorkforce() {
        const workingAge = this.population.filter(p => p.age >= 16 && p.age <= 80).length;
        const totalPopulation = this.population.length;

        // If less than 30% of population is working age, generate new workers
        if (workingAge < totalPopulation * 0.3 || workingAge < 5) {
            const needed = Math.max(5, Math.ceil(totalPopulation * 0.3) - workingAge);
            console.log(`[PopulationManager] Workforce maintenance: ${workingAge}/${totalPopulation} working age, generating ${needed} new workers`);
            return this.generateNewWorkers(needed);
        }

        return [];
    }
}

console.log('[PopulationManager] Class definition completed');

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    console.log('[PopulationManager] Exporting for Node.js');
    module.exports = PopulationManager;
} else if (typeof window !== 'undefined') {
    console.log('[PopulationManager] Exporting to window object');
    window.PopulationManager = PopulationManager;
    console.log('[PopulationManager] window.PopulationManager set to:', window.PopulationManager);

    // Signal that PopulationManager is ready
    window.populationManagerReady = true;

    // Add debug functions to global scope
    window.debugPopulation = function () {
        if (window.gameState?.populationManager) {
            const pm = window.gameState.populationManager;
            console.log('=== POPULATION DEBUG ===');
            console.log('Total population:', pm.getAll().length);
            console.log('Population ages:', pm.getAll().map(v => ({ name: v.name, age: v.age, gender: v.gender })));
            console.log('Demographics:', pm.getPopulationGroups());
            return pm;
        } else {
            console.log('PopulationManager not available');
            return null;
        }
    };

    window.testPopulationAging = function () {
        if (window.gameState?.populationManager) {
            return window.gameState.populationManager.debugAging();
        }
        console.log('PopulationManager not available');
    };

    window.testPopulationBirths = function (options = {}) {
        if (window.gameState?.populationManager) {
            return window.gameState.populationManager.debugBirths(options);
        }
        console.log('PopulationManager not available');
    };

    window.fixPopulationAges = function () {
        if (window.gameState?.populationManager) {
            return window.gameState.populationManager.debugSetAges();
        }
        console.log('PopulationManager not available');
    };

    window.forceEndDay = function () {
        if (window.gameState?.endDay) {
            console.log('Forcing end of day...');
            window.gameState.endDay();
            console.log('Day ended. New day:', window.gameState.day);
        }
        console.log('GameState.endDay not available');
    };

    // Trigger event if event bus is available
    if (window.eventBus && typeof window.eventBus.emit === 'function') {
        window.eventBus.emit('populationManagerReady');
    }
} else {
    console.error('[PopulationManager] Unknown environment - cannot export');
}

console.log('[PopulationManager] Script fully loaded and exported');

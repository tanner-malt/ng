// populationManager.js - Manages population details, roles, and assignments
// Used by both VillageManager and WorldManager

console.log('[PopulationManager] Script starting to load...');

class PopulationManager {
    constructor(initialPopulation = []) {
        console.log('[PopulationManager] Constructor called with:', initialPopulation);
        // Each inhabitant: { id, name, role, age, status, location, skills, ... }
        this.population = initialPopulation;
        this.nextId = initialPopulation.length > 0 ? Math.max(...initialPopulation.map(p => p.id)) + 1 : 1;
        console.log('[PopulationManager] Constructor completed, nextId:', this.nextId);
    }

    /**
     * Process aging and death for the population
     * @returns {object} - { deaths: number, diedVillagers: array }
     */
    processAging() {
        let deaths = 0;
        const diedVillagers = [];
        const beforeCount = this.population.length;
        
        // Age all villagers by 1 day and check for death
        this.population.forEach(villager => {
            if (typeof villager.age === 'number') {
                villager.age += 1;
                
                // Death at age 198 (tripled from 66)
                if (villager.age >= 198) {
                    diedVillagers.push({
                        name: villager.name,
                        role: villager.role,
                        age: villager.age
                    });
                    deaths++;
                }
            }
        });
        
        // Remove deceased villagers
        if (deaths > 0) {
            this.population = this.population.filter(villager => villager.age < 198);
            console.log(`[PopulationManager] ${deaths} villagers died of old age. Population: ${beforeCount} -> ${this.population.length}`);
        }
        
        return { deaths, diedVillagers };
    }

    /**
     * Get population organized into groups (Stellaris-style)
     * @returns {object} - organized population data
     */
    getPopulationGroups() {
        const groups = {
            children: { name: '👶 Children', age: '0-27 days', count: 0, villagers: [] },
            youngAdults: { name: '💪 Young Adults', age: '28-45 days', count: 0, villagers: [] },
            adults: { name: '🧑‍💼 Adults', age: '46-75 days', count: 0, villagers: [] },
            middleAged: { name: '👨‍🦳 Middle-Aged', age: '76-150 days', count: 0, villagers: [] },
            elderly: { name: '👴 Elderly', age: '151-197 days', count: 0, villagers: [] }
        };
        
        const jobGroups = {
            unemployed: { name: '🏠 Unemployed', description: 'Available workers', count: 0, villagers: [] },
            farmers: { name: '🧑‍🌾 Farmers', description: 'Food production', count: 0, villagers: [] },
            woodcutters: { name: '🪓 Woodcutters', description: 'Wood production', count: 0, villagers: [] },
            miners: { name: '⛏️ Miners', description: 'Stone/metal production', count: 0, villagers: [] },
            builders: { name: '🔨 Builders', description: 'Construction work', count: 0, villagers: [] },
            guards: { name: '⚔️ Guards', description: 'Defense and security', count: 0, villagers: [] },
            merchants: { name: '💼 Merchants', description: 'Trade and commerce', count: 0, villagers: [] },
            drafted: { name: '🪖 Military', description: 'Serving in armies', count: 0, villagers: [] },
            other: { name: '👤 Other', description: 'Miscellaneous roles', count: 0, villagers: [] }
        };
        
        // Categorize population
        this.population.forEach(villager => {
            // Age groups
            if (villager.age <= 27) {
                groups.children.villagers.push(villager);
                groups.children.count++;
            } else if (villager.age <= 45) {
                groups.youngAdults.villagers.push(villager);
                groups.youngAdults.count++;
            } else if (villager.age <= 75) {
                groups.adults.villagers.push(villager);
                groups.adults.count++;
            } else if (villager.age <= 150) {
                groups.middleAged.villagers.push(villager);
                groups.middleAged.count++;
            } else {
                groups.elderly.villagers.push(villager);
                groups.elderly.count++;
            }
            
            // Job groups
            if (villager.status === 'drafted') {
                jobGroups.drafted.villagers.push(villager);
                jobGroups.drafted.count++;
            } else if (villager.status === 'idle' || !villager.role || villager.role === 'peasant') {
                jobGroups.unemployed.villagers.push(villager);
                jobGroups.unemployed.count++;
            } else {
                const role = villager.role.toLowerCase();
                if (role === 'farmer') {
                    jobGroups.farmers.villagers.push(villager);
                    jobGroups.farmers.count++;
                } else if (role === 'woodcutter') {
                    jobGroups.woodcutters.villagers.push(villager);
                    jobGroups.woodcutters.count++;
                } else if (role === 'miner') {
                    jobGroups.miners.villagers.push(villager);
                    jobGroups.miners.count++;
                } else if (role === 'builder') {
                    jobGroups.builders.villagers.push(villager);
                    jobGroups.builders.count++;
                } else if (role === 'guard') {
                    jobGroups.guards.villagers.push(villager);
                    jobGroups.guards.count++;
                } else if (role === 'merchant') {
                    jobGroups.merchants.villagers.push(villager);
                    jobGroups.merchants.count++;
                } else {
                    jobGroups.other.villagers.push(villager);
                    jobGroups.other.count++;
                }
            }
        });
        
        return {
            total: this.population.length,
            ageGroups: groups,
            jobGroups: jobGroups,
            demographics: {
                averageAge: this.population.length > 0 ? 
                    Math.round(this.population.reduce((sum, v) => sum + v.age, 0) / this.population.length) : 0,
                maleCount: this.population.filter(v => v.gender === 'male').length,
                femaleCount: this.population.filter(v => v.gender === 'female').length,
                workingAge: this.population.filter(v => v.age >= 28 && v.age <= 180).length,
                employed: this.population.filter(v => v.status === 'working').length,
                unemployed: this.population.filter(v => v.status === 'idle').length
            }
        };
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
     * - Each eligible couple (adults and middle-aged 46–150 days) tries for a child every day
     * - Base chance: 1/7 per couple per day (so +1 per week per couple, before modifiers)
     * - Modifiers: +50% if food abundant, -50% if food scarce, 0 if sick/traveling
     * - 1% chance for twins per birth
     * @param {object} options - { foodAbundant: bool, foodScarce: bool }
     * @returns {object} { births, twins, bonus, eligibleCouples }
     */
    calculateDailyGrowth(options = {}) {
        // Find eligible adults and middle-aged by gender
        const breedingAge = this.population.filter(p => p.age >= 46 && p.age <= 150 && p.status !== 'sick' && p.status !== 'traveling');
        const males = breedingAge.filter(p => p.gender === 'male');
        const females = breedingAge.filter(p => p.gender === 'female');
        const eligibleCouples = Math.min(males.length, females.length);
        if (eligibleCouples === 0) return { births: 0, twins: 0, bonus: 0, eligibleCouples: 0 };

        // Base: Each couple has a 1/7 chance per day
        let baseChance = 1 / 7;
        let bonus = 0;
        if (options.foodAbundant) bonus += 0.5;
        if (options.foodScarce) bonus -= 0.5;
        // Clamp bonus to [-0.5, 0.5]
        bonus = Math.max(-0.5, Math.min(0.5, bonus));
        let finalChance = baseChance * (1 + bonus);
        finalChance = Math.max(0, finalChance); // No negative chance

        let births = 0;
        let twins = 0;
        for (let i = 0; i < eligibleCouples; i++) {
            if (Math.random() < finalChance) {
                births++;
                if (Math.random() < 0.01) twins++;
            }
        }
        births += twins; // Each twin birth adds one more child

        return { births, twins, bonus, eligibleCouples };
    }

    addInhabitant(details) {
        // If age is not specified, default to 0 (newborn)
        const age = details.age !== undefined ? details.age : 0;
        // Determine if this villager is a child (not eligible to work)
        const isChild = age <= 27;
        const canWork = !isChild;
        const inhabitant = {
            id: this.nextId++,
            name: details.name || `Inhabitant ${this.nextId}`,
            role: details.role || 'peasant',
            age: age,
            status: details.status || 'idle',
            location: details.location || 'village',
            skills: details.skills || [],
            gender: details.gender || (Math.random() < 0.5 ? 'male' : 'female'),
            isChild,
            canWork,
            ...details
        };
        this.population.push(inhabitant);
        
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
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.status = status;
            return true;
        }
        return false;
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
            // Age distribution with focus on breeding age (46-150)
            let age;
            const ageRoll = Math.random();
            if (ageRoll < 0.5) {
                // 50% chance: Adults and middle-aged (46-150) - prime breeding age
                age = 46 + Math.floor(Math.random() * 105);
            } else if (ageRoll < 0.7) {
                // 20% chance: Young adults (28-45)
                age = 28 + Math.floor(Math.random() * 18);
            } else if (ageRoll < 0.85) {
                // 15% chance: Children (3-27)
                age = 3 + Math.floor(Math.random() * 25);
            } else {
                // 15% chance: Elderly (151-190)
                age = 151 + Math.floor(Math.random() * 40);
            }
            
            // Ensure roughly even gender split
            const gender = (i % 2 === 0) ? 'male' : 'female';
            
            // Random name
            const name = names[Math.floor(Math.random() * names.length)] + ' ' + (Math.floor(Math.random() * 999) + 1);
            
            // Role based on age
            let role = 'peasant';
            if (age <= 27) {
                role = 'child';
            } else if (Math.random() < 0.2) {
                // 20% chance for specialized roles for adults
                const specialRoles = ['farmer', 'builder', 'guard', 'scout', 'crafter'];
                role = specialRoles[Math.floor(Math.random() * specialRoles.length)];
            }
            
            const inhabitant = this.addInhabitant({
                name: name,
                age: age,
                gender: gender,
                role: role,
                status: 'idle',
                location: 'village',
                skills: []
            });
            
            generated.push(inhabitant);
        }
        
        console.log(`[PopulationManager] Generated ${count} inhabitants. Age distribution:`, {
            children: generated.filter(p => p.age <= 27).length,
            youngAdults: generated.filter(p => p.age >= 28 && p.age <= 45).length,
            adults: generated.filter(p => p.age >= 46 && p.age <= 75).length,
            middleAged: generated.filter(p => p.age >= 76 && p.age <= 150).length,
            elderly: generated.filter(p => p.age >= 151).length,
            males: generated.filter(p => p.gender === 'male').length,
            females: generated.filter(p => p.gender === 'female').length
        });
        
        return generated;
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
        
        const roles = ['farmer', 'crafter', 'builder', 'guard', 'trader', 'scholar', 'worker'];
        const skills = ['farming', 'crafting', 'building', 'combat', 'leadership', 'scholarship'];
        
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
            
            // Generate randomized skills for adults
            let villagerSkills = [];
            if (age > 27) {
                const numSkills = 1 + Math.floor(Math.random() * 3); // 1-3 skills
                const selectedSkills = [...skills].sort(() => 0.5 - Math.random()).slice(0, numSkills);
                villagerSkills = selectedSkills;
            }
            
            // Create villager with appropriate traits
            const villager = {
                age: age,
                name: this.generateRandomName(),
                role: age > 27 ? roles[Math.floor(Math.random() * roles.length)] : 'child',
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
                skills: { available: false }
            };
        }

        // Calculate age groups with proper structure for UI
        const ageGroupData = {
            children: { name: '👶 Children', age: '0-27 days', count: this.population.filter(p => p.age <= 27).length },
            youngAdults: { name: '💪 Young Adults', age: '28-60 days', count: this.population.filter(p => p.age >= 28 && p.age <= 60).length },
            adults: { name: '👨 Adults', age: '61-120 days', count: this.population.filter(p => p.age >= 61 && p.age <= 120).length },
            middleAged: { name: '👨‍💼 Middle-Aged', age: '121-180 days', count: this.population.filter(p => p.age >= 121 && p.age <= 180).length },
            elderly: { name: '👴 Elderly', age: '181+ days', count: this.population.filter(p => p.age >= 181).length }
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
                'crafter': '🔨 Crafters', 
                'builder': '🏗️ Builders',
                'guard': '⚔️ Guards',
                'trader': '💰 Traders',
                'scholar': '📚 Scholars',
                'worker': '👷 Workers',
                'child': '👶 Children',
                'elder': '👴 Elders',
                'player': '👑 Monarch',
                'unemployed': '🆔 Unemployed'
            };
            
            jobGroupData[role] = {
                name: roleNames[role] || `❓ ${role}`,
                count: count,
                description: `Workers in ${role} role`
            };
        });

        // Calculate happiness distribution
        const happinessDistribution = {};
        const happinessTotal = this.population.length;
        this.population.forEach(person => {
            const happiness = person.happiness || 50;
            let level;
            if (happiness >= 90) level = 'veryHappy';
            else if (happiness >= 75) level = 'happy';
            else if (happiness >= 50) level = 'neutral';
            else if (happiness >= 25) level = 'unhappy';
            else level = 'veryUnhappy';
            
            happinessDistribution[level] = (happinessDistribution[level] || 0) + 1;
        });

        // Calculate skills data
        let totalSkills = 0;
        let skillLevelCounts = {};
        this.population.forEach(person => {
            if (person.skills) {
                if (Array.isArray(person.skills)) {
                    totalSkills += person.skills.length;
                } else if (typeof person.skills === 'object') {
                    Object.values(person.skills).forEach(level => {
                        totalSkills++;
                        const levelKey = `Level ${level || 1}`;
                        skillLevelCounts[levelKey] = (skillLevelCounts[levelKey] || 0) + 1;
                    });
                }
            }
        });

        // Calculate averages
        const averageAge = this.population.reduce((sum, p) => sum + (p.age || 0), 0) / this.population.length;
        const averageHappiness = this.population.reduce((sum, p) => sum + (p.happiness || 50), 0) / this.population.length;
        const averageProductivity = this.population.reduce((sum, p) => sum + (p.productivity || 1.0), 0) / this.population.length;
        
        const workingAge = ageGroupData.youngAdults.count + ageGroupData.adults.count + ageGroupData.middleAged.count;
        const employed = this.population.filter(p => p.role && p.role !== 'unemployed' && p.role !== 'child').length;

        // Return structure that matches what the UI expects
        return {
            total: this.population.length,
            demographics: {
                averageAge: Math.round(averageAge),
                workingAge: workingAge,
                employed: employed,
                children: ageGroupData.children.count,
                elderly: ageGroupData.elderly.count,
                averageHappiness: Math.round(averageHappiness),
                totalSkills: totalSkills
            },
            happiness: {
                average: averageHappiness,
                distribution: happinessDistribution,
                total: happinessTotal
            },
            productivity: {
                average: averageProductivity
            },
            ageGroups: ageGroupData,
            jobGroups: jobGroupData,
            skills: {
                available: totalSkills > 0,
                totalSkills: totalSkills,
                averageSkillsPerVillager: totalSkills / this.population.length,
                levelCounts: skillLevelCounts
            },
            training: {
                mentors: this.population.filter(p => p.role === 'elder' || p.role === 'scholar').length,
                total: this.population.filter(p => p.age >= 28).length // Adults who can train
            },
            genderDistribution: {
                male: this.population.filter(p => p.gender === 'male').length,
                female: this.population.filter(p => p.gender === 'female').length
            },
            roleDistribution: roleDistribution,
            statusDistribution: {}
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
    
    // Trigger event if event bus is available
    if (window.eventBus && typeof window.eventBus.emit === 'function') {
        window.eventBus.emit('populationManagerReady');
    }
} else {
    console.error('[PopulationManager] Unknown environment - cannot export');
}

console.log('[PopulationManager] Script fully loaded and exported');

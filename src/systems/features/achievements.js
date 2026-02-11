/**
 * achievements.js - Achievement System
 * 
 * Manages player achievements, progress tracking, and rewards.
 * Integrates with tutorial system and message history.
 */

// Import PopulationManager and GameData
// Assumes PopulationManager is available globally or via window.PopulationManager
// and GameData is available as window.GameData

class AchievementSystem {
    constructor() {
        this.achievements = {};
        this.unlockedAchievements = [];
        this.stats = {
            buildings_built: 0,
            battles_won: 0,
            houses_built: 0,
            farms_built: 0,
            barracks_built: 0,
            towncenters_built: 0
        };
        this.isCheckingRequirements = false; // Prevent recursive checking
        this.loadFromStorage();
        this.initializeAchievements();

        // After initializing, verify the unlocked achievements array is consistent
        this.verifyUnlockedAchievements();

        console.log('[Achievements] Achievement system initialized');
    }

    // Verify that the unlocked achievements array matches the actual achievement states
    verifyUnlockedAchievements() {
        const actualUnlocked = [];
        Object.values(this.achievements).forEach(achievement => {
            if (achievement.unlocked) {
                actualUnlocked.push(achievement.id);
            }
        });

        // Update the unlocked array to match reality
        this.unlockedAchievements = actualUnlocked;

        console.log('[Achievements] Verified unlocked achievements:', this.unlockedAchievements.length);
    }

    initializeAchievements() {
        // Tutorial progression achievements
        this.defineAchievement('dynasty_founder', {
            title: 'Dynasty Founder',
            description: 'Named your noble dynasty',
            icon: '👑',
            type: 'tutorial',
            reward: { gold: 150 }
        });

        this.defineAchievement('town_center_built', {
            title: 'Administrative Center',
            description: 'Built your first Town Center',
            icon: '🏛️',
            type: 'building',
            reward: { gold: 700 }
        });

        this.defineAchievement('sheltering_citizens', {
            title: 'Sheltering Citizens',
            description: 'Built 3 Houses',
            icon: '🏠',
            type: 'building',
            requirement: { houses_built: 3 }, // Requires 3 houses built
            reward: { birthRate: 0.03, gold: 100 }
        });

        this.defineAchievement('feeding_people', {
            title: 'Feeding the People',
            description: 'Built your first Farm',
            icon: '🌾',
            type: 'building',
            reward: { gold: 100 }
        });

        this.defineAchievement('military_establishment', {
            title: 'Military Establishment',
            description: 'Built your first Barracks',
            icon: '⚔️',
            type: 'building',
            reward: { gold: 250 }
        });

        this.defineAchievement('tutorial_complete', {
            title: 'Royal Education Complete',
            description: 'Completed the tutorial and unlocked Battle Mode',
            icon: '🎓',
            type: 'tutorial',
            reward: { gold: 500, influence: 25, prestige: 50 }
        });

        // Building achievements
        this.defineAchievement('first_farm', {
            title: 'Green Thumb',
            description: 'Built your first farm',
            icon: '🌾',
            type: 'building',
            reward: { gold: 200 }
        });

        // Building mastery achievements
        this.defineAchievement('master_builder', {
            title: 'Master Builder',
            description: 'Built 10 buildings total',
            icon: '🏗️',
            type: 'building',
            requirement: { buildings_built: 10 },
            reward: { constructionSpeed: 0.05 }
        });

        this.defineAchievement('build_and_they_will_come', {
            title: 'Build and They Will Come',
            description: 'Built your first Builders Hut',
            icon: '🔨',
            type: 'building',
            reward: { gold: 100, prestige: 25 },
            unlocks: ['keep'] // Unlocks the keep building
        });

        // Resource achievements with multiple conditions
        this.defineAchievement('wealthy_ruler', {
            title: 'Wealthy Ruler',
            description: 'Accumulated 1000 gold',
            icon: '💰',
            type: 'resource',
            requirement: { gold: 1000 },
            reward: { prestige: 25 }
        });

        this.defineAchievement('prosperous_kingdom', {
            title: 'Prosperous Kingdom',
            description: 'Have 500 gold, 200 food, and 50 population',
            icon: '🏰',
            type: 'resource',
            requirement: {
                gold: 500,
                food: 200,
                population: 50
            },
            reward: { prestige: 50, influence: 25 }
        });

        this.defineAchievement('population_boom', {
            title: 'Population Boom',
            description: 'Reached 100 population',
            icon: '👥',
            type: 'resource',
            requirement: { population: 100 },
            reward: { influence: 50 }
        });

        this.defineAchievement('thriving_dynasty', {
            title: 'Thriving Dynasty',
            description: 'Reached 50 population',
            icon: '🏘️',
            type: 'resource',
            requirement: { population: 50 },
            reward: { birthRate: 0.03, gold: 500 }
        });

        this.defineAchievement('migration_wave', {
            title: 'Migration Wave',
            description: 'Your dynasty attracts settlers from afar',
            icon: '🚶‍♂️🚶‍♀️',
            type: 'special',
            requirement: { population: 25 },
            reward: { birthRate: 0.05, gold: 1000 }
        });

        // Additional population achievements
        this.defineAchievement('growing_settlement', {
            title: 'Growing Settlement',
            description: 'Reached 10 population - your dynasty takes root',
            icon: '🏡',
            type: 'population',
            requirement: { population: 10 },
            reward: { gold: 350 }
        });

        this.defineAchievement('great_city', {
            title: 'Great City',
            description: 'Reached 200 population - a true urban center',
            icon: '🏙️',
            type: 'population',
            requirement: { population: 200 },
            reward: { gold: 1000, influence: 100 }
        });

        this.defineAchievement('metropolis', {
            title: 'Metropolis',
            description: 'Reached 500 population - a massive dynastic center',
            icon: '🌆',
            type: 'population',
            requirement: { population: 500 },
            reward: { gold: 5000, influence: 500, prestige: 200 }
        });

        this.defineAchievement('welcoming_refuge', {
            title: 'Welcoming Refuge',
            description: 'Welcomed 10 immigrants to your dynasty',
            icon: '🤝',
            type: 'immigration',
            requirement: { total_immigrants: 10 },
            reward: { birthRate: 0.02, happiness: 15 }
        });

        this.defineAchievement('immigration_hub', {
            title: 'Immigration Hub',
            description: 'Welcomed 50 immigrants - your dynasty is renowned',
            icon: '🌍',
            type: 'immigration',
            requirement: { total_immigrants: 50 },
            reward: { birthRate: 0.04, gold: 800 }
        });

        this.defineAchievement('baby_boom', {
            title: 'Baby Boom',
            description: 'Celebrated 25 births in your dynasty',
            icon: '👶',
            type: 'births',
            requirement: { total_births: 25 },
            reward: { gold: 600, happiness: 15 }
        });

        this.defineAchievement('generational_legacy', {
            title: 'Generational Legacy',
            description: 'Celebrated 100 births - multiple generations thrive',
            icon: '👨‍👩‍👧‍👦',
            type: 'births',
            requirement: { total_births: 100 },
            reward: { gold: 1500, influence: 100, prestige: 100 }
        });

        this.defineAchievement('content_populace', {
            title: 'Content Populace',
            description: 'Maintained 85% average happiness with 20+ population',
            icon: '😊',
            type: 'happiness',
            requirement: { avg_happiness: 85, min_population: 20 },
            reward: { happiness: 20, gold: 300 }
        });

        this.defineAchievement('utopian_society', {
            title: 'Utopian Society',
            description: 'Achieved 95% average happiness with 50+ population',
            icon: '🌟',
            type: 'happiness',
            requirement: { avg_happiness: 95, min_population: 50 },
            reward: { happiness: 30, gold: 1000, influence: 200, prestige: 150 }
        });

        this.defineAchievement('dynasty_pinnacle', {
            title: 'Dynasty Pinnacle',
            description: 'Reached a peak population of 1000 - legendary status',
            icon: '👑',
            type: 'peak_population',
            requirement: { peak_population: 1000 },
            reward: { gold: 10000, influence: 1000, prestige: 500 }
        });

        // Combat achievements
        this.defineAchievement('warrior_king', {
            title: 'Warrior King',
            description: 'Won 10 battles',
            icon: '🗡️',
            type: 'combat',
            requirement: { battles_won: 10 },
            reward: { military_exp: 200, prestige: 100 }
        });

        // Special achievements
        this.defineAchievement('renaissance_ruler', {
            title: 'Renaissance Ruler',
            description: 'Built at least one of every building type',
            icon: '🏰',
            type: 'special',
            reward: { prestige: 200, influence: 100 }
        });

        // Exploration achievement
        this.defineAchievement('first_exploration', {
            title: 'First Explorer',
            description: 'Explored a tile in the world view',
            icon: '🗺️',
            type: 'exploration',
            reward: { gold: 75, influence: 10 }
        });

        // Throne room achievements
        this.defineAchievement('divine_merger', {
            title: 'Divine Merger',
            description: 'Created a Divine Altar in the Throne Room',
            icon: '⛩️',
            type: 'special',
            reward: { prestige: 100, influence: 50 }
        });

        // Monarch view achievements
        this.defineAchievement('royal_investor', {
            title: 'Royal Investor',
            description: 'Made your first prestige investment',
            icon: '💎',
            type: 'special',
            reward: { prestige: 25, gold: 200 }
        });

        // Monarch unlock — first ruler dies
        this.defineAchievement('not_an_end', {
            title: 'Not an End, New Beginning',
            description: 'A dynasty has ended — but the legacy endures.',
            icon: '⚰️',
            type: 'special',
            reward: { gold: 250 }
        });

        // View unlock achievements
        this.defineAchievement('become_king', {
            title: 'Become King',
            description: 'Ascended to the throne and established royal authority',
            icon: '👑',
            type: 'special',
            reward: { prestige: 100, influence: 75, gold: 1000 }
        });

        this.defineAchievement('all_things_end', {
            title: 'All Things End',
            description: 'Achieved the ultimate milestone and unlocked the throne\'s full power',
            icon: '🏰',
            type: 'special',
            reward: { prestige: 500, influence: 200, gold: 5000 }
        });

        // High-priority achievements from wiki analysis
        this.defineAchievement('master_builder', {
            title: 'Master Builder',
            description: 'Build 10 different types of buildings',
            icon: '🏗️',
            type: 'building',
            requirement: { building_types_built: 10 },
            reward: { constructionSpeed: 0.05 }
        });

        this.defineAchievement('population_boom', {
            title: 'Population Boom',
            description: 'Reach 100 total population',
            icon: '👥',
            type: 'population',
            requirement: { total_population: 100 },
            reward: { gold: 500 }
        });

        this.defineAchievement('royal_bloodline', {
            title: 'Royal Bloodline',
            description: 'Have 5 royal family members alive simultaneously',
            icon: '👑',
            type: 'dynasty',
            requirement: { royal_family_count: 5 },
            reward: { prestige: 200, influence: 100 }
        });

        this.defineAchievement('elite_army', {
            title: 'Elite Army',
            description: 'Have all 7 unit types available in your forces',
            icon: '⚔️',
            type: 'combat',
            requirement: { unit_types_available: 7 },
            reward: { gold: 5750 }
        });

        this.defineAchievement('seasonal_master', {
            title: 'Seasonal Master',
            description: 'Successfully navigate through all 8 seasonal periods',
            icon: '🌸',
            type: 'survival',
            requirement: { seasons_survived: 8 },
            reward: { gold: 5000 }
        });

        this.defineAchievement('master_craftsman', {
            title: 'Master Craftsman',
            description: 'Have a villager reach Grandmaster skill level',
            icon: '🔨',
            type: 'population',
            requirement: { grandmaster_villagers: 1 },
            reward: { gold: 800, prestige: 150 }
        });

        this.defineAchievement('multi_generational', {
            title: 'Multi-Generational',
            description: 'Rule for 3+ consecutive generations',
            icon: '⏳',
            type: 'dynasty',
            requirement: { generations_ruled: 3 },
            reward: { prestige: 300, influence: 150 }
        });

        this.defineAchievement('map_explorer', {
            title: 'Map Explorer',
            description: 'Reveal 50% of the world map through exploration',
            icon: '🗺️',
            type: 'exploration',
            requirement: { map_revealed_percent: 50 },
            reward: { gold: 600, influence: 100 }
        });

        this.defineAchievement('balanced_economy', {
            title: 'Balanced Economy',
            description: 'Have 1,000+ of all basic resources simultaneously',
            icon: '💰',
            type: 'economic',
            requirement: { balanced_resources: true },
            reward: { gold: 1000, prestige: 100 }
        });

        console.log('[Achievements] Initialized', Object.keys(this.achievements).length, 'achievements');
    }

    // Trigger achievement for dynasty naming (called on dynasty succession, not initial naming)
    triggerDynastyNamed(dynastyName) {
        // Only unlock if this is a succession (dynasty already existed before)
        // Initial naming during tutorial should NOT trigger this
        console.log('[Achievements] triggerDynastyNamed called - checking if succession');
    }

    // Trigger achievement for actual dynasty succession (monarch death + heir takes over)
    triggerDynastySuccession() {
        this.unlock('dynasty_founder');
        console.log('[Achievements] Dynasty founder unlocked via succession');
    }

    // Trigger tracking for building placement (stats are NOT updated here - only on completion)
    triggerBuildingPlaced(buildingType) {
        // Note: Stats used for achievements are now tracked on building COMPLETION, not placement
        // This method is kept for tracking/logging purposes only
        console.log(`[Achievements] Building placed: ${buildingType} (awaiting construction completion)`);
    }

    // Trigger achievement for building completion (level 1+)
    triggerBuildingCompleted(buildingType) {
        // Track stats on completion (not placement)
        this.stats.buildings_built++;
        switch (buildingType) {
            case 'house':
                this.stats.houses_built++;
                break;
            case 'farm':
                this.stats.farms_built++;
                break;
            case 'barracks':
                this.stats.barracks_built++;
                break;
            case 'townCenter':
                this.stats.towncenters_built++;
                break;
        }

        const achievementMap = {
            'townCenter': 'town_center_built',
            'farm': 'feeding_people',
            'barracks': 'military_establishment',
            'buildersHut': 'build_and_they_will_come'
        };

        const achievementId = achievementMap[buildingType];
        if (achievementId) {
            this.unlock(achievementId);
        }

        // Check master builder achievement
        if (this.stats.buildings_built >= 10 && !this.isUnlocked('master_builder')) {
            this.unlock('master_builder');
        }

        // Check houses requirements for house-related achievements
        if (this.stats.houses_built >= 3 && !this.isUnlocked('sheltering_citizens')) {
            this.unlock('sheltering_citizens');
        }

        // Emit event for building completed
        if (window.eventBus) {
            window.eventBus.emit('building_completed', { buildingType });
        }

        console.log(`[Achievements] Building completed: ${buildingType}`);
        this.saveToStorage();
    }

    // Trigger achievement for tutorial completion
    triggerTutorialComplete() {
        this.unlock('tutorial_complete');
    }

    // Trigger achievement for exploring a tile
    triggerTileExplored() {
        this.unlock('first_exploration');
    }

    // Trigger achievement for creating Divine Altar in throne room
    triggerDivineAltar() {
        this.unlock('divine_merger');
    }

    // Trigger achievement for making first prestige investment
    triggerFirstInvestment() {
        this.unlock('royal_investor');
    }

    // Trigger achievement for becoming king (unlock Monarch view)
    triggerBecomeKing() {
        this.unlock('become_king');
    }

    // Trigger achievement for first ruler death (unlock Monarch view)
    triggerNotAnEnd() {
        this.unlock('not_an_end');
    }

    // Trigger achievement for ultimate milestone (unlock Throne view)
    triggerAllThingsEnd() {
        this.unlock('all_things_end');
    }

    // Trigger population milestone achievements
    triggerPopulationBoom() {
        if (this.isUnlocked('population_boom')) return;
        this.unlock('population_boom');
    }

    // Trigger building achievement
    triggerMasterBuilder() {
        if (this.isUnlocked('master_builder')) return;
        this.unlock('master_builder');
    }

    // Trigger dynasty achievements
    triggerRoyalBloodline() {
        if (this.isUnlocked('royal_bloodline')) return;
        this.unlock('royal_bloodline');
    }

    triggerMultiGenerational() {
        if (this.isUnlocked('multi_generational')) return;
        this.unlock('multi_generational');
    }

    // Trigger military achievement
    triggerEliteArmy() {
        if (this.isUnlocked('elite_army')) return;
        this.unlock('elite_army');
    }

    // Trigger survival achievement
    triggerSeasonalMaster() {
        if (this.isUnlocked('seasonal_master')) return;
        this.unlock('seasonal_master');
    }

    // Trigger skill achievement
    triggerMasterCraftsman() {
        if (this.isUnlocked('master_craftsman')) return;
        this.unlock('master_craftsman');
    }

    // Trigger exploration achievement
    triggerMapExplorer() {
        if (this.isUnlocked('map_explorer')) return;
        this.unlock('map_explorer');
    }

    // Trigger economic achievement
    triggerBalancedEconomy() {
        if (this.isUnlocked('balanced_economy')) return;
        this.unlock('balanced_economy');
    }

    // Check if an achievement is unlocked
    isUnlocked(achievementId) {
        const achievement = this.achievements[achievementId];
        return achievement ? achievement.unlocked : false;
    }

    defineAchievement(id, config) {
        // Check if this achievement already exists (from loaded save data)
        const existing = this.achievements[id];

        this.achievements[id] = {
            id: id,
            title: config.title,
            description: config.description,
            icon: config.icon || '🏆',
            type: config.type || 'general',
            requirement: config.requirement || null,
            reward: config.reward || {},
            // Preserve existing unlock status if it exists, otherwise use config or default to false
            unlocked: existing ? existing.unlocked : (config.unlocked || false),
            unlockedAt: existing ? existing.unlockedAt : (config.unlockedAt || null)
        };
    }

    unlock(achievementId, silent = false) {
        const achievement = this.achievements[achievementId];
        if (!achievement) {
            console.warn('[Achievements] Unknown achievement:', achievementId);
            return false;
        }

        if (achievement.unlocked) {
            console.log('[Achievements] Already unlocked:', achievementId);
            return false; // Already unlocked
        }

        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.unlockedAchievements.push(achievementId);

        console.log('[Achievements] Unlocking:', achievement.title);

        // Apply rewards
        if (achievement.reward && window.gameState) {
            this.applyRewards(achievement.reward);
        }

        // Add to message history
        if (window.messageHistory && !silent) {
            window.messageHistory.addAchievementMessage(
                `Achievement Unlocked: ${achievement.title}`,
                `${achievement.icon} ${achievement.description}<br><br>` +
                `<strong>Rewards:</strong> ${this.formatRewards(achievement.reward)}`
            );
        }

        // Show modal notification
        if (!silent) {
            this.showAchievementModal(achievement);
        }

        // Handle building unlocks
        if (achievement.unlocks && achievement.unlocks.length > 0) {
            achievement.unlocks.forEach(buildingType => {
                if (window.gameState && window.gameState.unlockBuilding) {
                    window.gameState.unlockBuilding(buildingType);
                    console.log(`[Achievements] Unlocked building: ${buildingType}`);
                }
            });
        }

        // Trigger unlock system check (delayed to avoid recursive calls)
        // Force bypass throttle so achievement-gated unlocks (e.g. world_view) evaluate immediately
        if (window.unlockSystem) {
            setTimeout(() => {
                window.unlockSystem.checkAllUnlocks(true);
            }, 100);
        }

        // Emit achievement:earned so BuildingRegistry can update unlock states
        if (window.eventBus) {
            window.eventBus.emit('achievement:earned', { achievementId, achievement });
        }

        this.saveToStorage();
        return true;
    }

    applyRewards(rewards) {
        if (!window.gameState) return;
        let populationGained = 0;

        // Temporarily disable requirement checking while applying rewards
        const wasChecking = this.isCheckingRequirements;
        this.isCheckingRequirements = true;

        // Handle population reward with PopulationManager
        Object.entries(rewards).forEach(([resource, amount]) => {
            if (resource === 'birthRate' && amount > 0) {
                // Accumulate birth rate bonus in gameState.achievementBonuses
                if (!window.gameState.achievementBonuses) window.gameState.achievementBonuses = {};
                window.gameState.achievementBonuses.birthRate = (window.gameState.achievementBonuses.birthRate || 0) + amount;
                console.log(`[Achievements] Birth rate bonus +${(amount * 100).toFixed(1)}% (total: ${(window.gameState.achievementBonuses.birthRate * 100).toFixed(1)}%)`);
            } else if (resource === 'constructionSpeed' && amount > 0) {
                // Accumulate construction speed bonus
                if (!window.gameState.achievementBonuses) window.gameState.achievementBonuses = {};
                window.gameState.achievementBonuses.constructionSpeed = (window.gameState.achievementBonuses.constructionSpeed || 0) + amount;
                console.log(`[Achievements] Construction speed bonus +${(amount * 100).toFixed(1)}% (total: ${(window.gameState.achievementBonuses.constructionSpeed * 100).toFixed(1)}%)`);
            } else if (resource === 'population' && amount > 0) {
                // Use generateMassPopulation for proper distribution
                if (window.gameState?.populationManager?.generateMassPopulation) {
                    const before = window.gameState.populationManager.getAll().length;
                    const generated = window.gameState.populationManager.generateMassPopulation(amount);
                    const added = Math.max(0, (window.gameState.populationManager.getAll().length - before));
                    if (generated && added) {
                        populationGained += added;
                        console.log(`[Achievements] Generated ${added} new villagers as achievement reward`);
                    } else {
                        console.warn(`[Achievements] generateMassPopulation failed, incrementing population counter`);
                        window.gameState.population = (window.gameState.population || 0) + amount;
                        populationGained += amount;
                    }
                } else {
                    console.warn(`[Achievements] PopulationManager.generateMassPopulation not available, incrementing population counter`);
                    window.gameState.population = (window.gameState.population || 0) + amount;
                    populationGained += amount;
                }
            } else if (resource === 'refugee_families' && amount > 0) {
                // Handle refugee families: 2 adults + 2 children per family
                if (window.gameState?.populationManager) {
                    let actuallyAddedPeople = 0;
                    for (let i = 0; i < amount; i++) {
                        // Add 2 adults per family (working age)
                        const adult1 = window.gameState.populationManager.addInhabitant({
                            name: `Refugee Adult ${Math.floor(Math.random() * 1000)}`,
                            age: 20 + Math.floor(Math.random() * 25), // Age 20-45
                            role: 'peasant',
                            status: 'idle',
                            gender: Math.random() < 0.5 ? 'male' : 'female'
                        });
                        if (!adult1) break; // Cap reached
                        actuallyAddedPeople += 1;
                        const adult2 = window.gameState.populationManager.addInhabitant({
                            name: `Refugee Adult ${Math.floor(Math.random() * 1000)}`,
                            age: 20 + Math.floor(Math.random() * 25), // Age 20-45
                            role: 'peasant',
                            status: 'idle',
                            gender: Math.random() < 0.5 ? 'male' : 'female'
                        });
                        if (!adult2) break;
                        actuallyAddedPeople += 1;
                        // Add 2 children per family
                        const child1 = window.gameState.populationManager.addInhabitant({
                            name: `Refugee Child ${Math.floor(Math.random() * 1000)}`,
                            age: 5 + Math.floor(Math.random() * 10), // Age 5-15
                            role: 'child',
                            status: 'idle',
                            gender: Math.random() < 0.5 ? 'male' : 'female'
                        });
                        if (!child1) break;
                        actuallyAddedPeople += 1;
                        const child2 = window.gameState.populationManager.addInhabitant({
                            name: `Refugee Child ${Math.floor(Math.random() * 1000)}`,
                            age: 5 + Math.floor(Math.random() * 10), // Age 5-15
                            role: 'child',
                            status: 'idle',
                            gender: Math.random() < 0.5 ? 'male' : 'female'
                        });
                        if (!child2) break;
                        actuallyAddedPeople += 1;
                        populationGained += 4;
                    }
                    console.log(`[Achievements] Added ${amount} refugee families (${amount * 4} total people) as achievement reward`);
                    // Partial acceptance notice
                    const plannedPeople = amount * 4;
                    if (actuallyAddedPeople < plannedPeople && window.showToast) {
                        window.showToast(`🏠 Housing full: accepted ${actuallyAddedPeople}/${plannedPeople} refugees`, { type: 'warning' });
                    }
                } else {
                    console.warn(`[Achievements] PopulationManager not available for refugee families`);
                }
            } else if (window.gameState.resources && window.gameState.resources.hasOwnProperty(resource)) {
                // Apply rewards without reducing existing amounts; block overflow beyond cap
                const before = window.gameState.resources[resource];
                const attemptedGain = amount;
                let cap = GameData?.resourceCaps?.[resource];
                if (typeof window.GameData?.calculateSeasonalStorageCap === 'function') {
                    try { cap = window.GameData.calculateSeasonalStorageCap(resource, window.gameState.season, window.gameState.buildings); } catch (_) { /* ignore */ }
                }
                if (typeof attemptedGain === 'number' && attemptedGain > 0 && typeof cap === 'number') {
                    const effectiveGain = Math.max(0, Math.min(attemptedGain, Math.max(0, cap - before)));
                    window.gameState.resources[resource] = before + effectiveGain;
                    if (effectiveGain < attemptedGain) {
                        console.log(`[Achievements] Reward for ${resource} blocked at cap ${cap}. Wasted: ${attemptedGain - effectiveGain}`);
                    }
                } else if (typeof attemptedGain === 'number') {
                    // No cap defined or non-positive gain; apply directly
                    window.gameState.resources[resource] = before + attemptedGain;
                }
            } else if (window.gameState.hasOwnProperty(resource)) {
                window.gameState[resource] += amount;
            } else if (resource === 'military_exp') {
                window.gameState.militaryExperience = (window.gameState.militaryExperience || 0) + amount;
            }
        });

        // Restore checking state
        this.isCheckingRequirements = wasChecking;

        // Emit events for population gains, but avoid immediate requirement checking
        if (populationGained > 0) {
            // Show notification for population gains
            if (window.showToast) {
                window.showToast(`🎉 ${populationGained} new villagers joined your dynasty!`, { type: 'success' });
            }

            // Emit event for other systems, but delay it to avoid immediate recursive checking
            if (window.eventBus) {
                setTimeout(() => {
                    window.eventBus.emit('population_gained', { amount: populationGained, source: 'achievement' });
                }, 200);
            }
        }

        // Trigger UI update
        if (window.eventBus) {
            window.eventBus.emit('resources-updated');
        }
    }

    // Stub: Call this when population is drafted (implement actual logic where drafting occurs)
    emitPopulationDrafted(amount = 1, data = {}) {
        if (window.eventBus) {
            window.eventBus.emit('population_drafted', { amount, ...data });
        }
    }

    // Stub: Call this when population dies (implement actual logic where deaths occur)
    emitPopulationDied(amount = 1, data = {}) {
        if (window.eventBus) {
            window.eventBus.emit('population_died', { amount, ...data });
        }
    }

    formatRewards(rewards) {
        if (!rewards || Object.keys(rewards).length === 0) {
            return 'None';
        }

        const rewardStrings = Object.entries(rewards).map(([resource, amount]) => {
            const icons = {
                gold: '💰',
                food: '🌾',
                stone: '🪨',
                wood: '🌲',
                influence: '👑',
                prestige: '⭐',
                military_exp: '⚔️',
                population: '👤',
                birthRate: '👶',
                constructionSpeed: '🔨',
                happiness: '😊'
            };
            const icon = icons[resource] || '📊';
            // Format percentage-based bonuses nicely
            if (resource === 'birthRate') {
                return `${icon} +${(amount * 100).toFixed(0)}% Birth Rate`;
            }
            if (resource === 'constructionSpeed') {
                return `${icon} +${(amount * 100).toFixed(0)}% Construction Speed`;
            }
            const name = resource.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${icon} ${amount} ${name}`;
        });

        return rewardStrings.join(', ');
    }

    showAchievementModal(achievement) {
        const content = `
            <div class="achievement-toast-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <h3>Achievement Unlocked!</h3>
                    <div class="achievement-title">${achievement.title}</div>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-rewards">
                        <strong>Rewards:</strong> ${this.formatRewards(achievement.reward)}
                    </div>
                </div>
                <button class="achievement-ok-btn" onclick="window.modalSystem?.closeTopModal() || (document.querySelector('.modal-overlay') && (document.querySelector('.modal-overlay').style.display = 'none'))">
                    OK
                </button>
            </div>
        `;

        // Show modal with toast-like style positioned in center
        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: '',
                content: content,
                width: '400px',
                className: 'achievement-toast-modal',
                closable: true,
                showCloseButton: true,
                modalType: 'achievement-notification'
            });
        } else if (window.showModal) {
            window.showModal('', content, {
                icon: '🏆',
                closable: true,
                confirmText: 'OK',
                style: {
                    background: '#232946',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                    width: '320px',
                    maxWidth: '90vw'
                },
                clickOutsideToClose: true
            });
        }

        // Attach close button handler after modal is rendered
        setTimeout(() => {
            const btn = document.getElementById('ach-modal-close-btn');
            if (btn) btn.onclick = () => {
                if (window.modalSystem) window.modalSystem.closeTopModal();
            };
        }, 50);
    }

    checkRequirements() {
        if (!window.gameState || this.isCheckingRequirements) return;

        // Don't check requirements if we're still initializing the game
        if (!window.gameState.buildings || window.gameState.buildings.length === 0) {
            console.log('[Achievements] Skipping requirement check - game still initializing');
            return;
        }

        this.isCheckingRequirements = true;

        Object.values(this.achievements).forEach(achievement => {
            if (!achievement.unlocked && achievement.requirement) {
                let meetsRequirement = true;

                Object.entries(achievement.requirement).forEach(([resource, required]) => {
                    let current = 0;
                    switch (resource) {
                        case 'gold':
                        case 'food':
                        case 'stone':
                        case 'wood':
                        case 'metal':
                            current = (window.gameState.resources && window.gameState.resources[resource]) || 0;
                            break;
                        case 'population':
                            current = window.gameState.population || 0;
                            break;
                        case 'battles_won':
                            current = window.gameState.battlesWon || 0;
                            break;
                        case 'influence':
                            current = window.gameState.influence || 0;
                            break;
                        case 'prestige':
                            current = window.gameState.prestige || 0;
                            break;
                        case 'buildings_built':
                        case 'houses_built':
                        case 'farms_built':
                        case 'barracks_built':
                        case 'towncenters_built':
                            current = this.stats[resource] || 0;
                            break;
                        case 'building_types_built':
                            // Count unique building types built
                            if (window.gameState.buildings) {
                                const uniqueTypes = new Set(window.gameState.buildings.map(b => b.type));
                                current = uniqueTypes.size;
                            }
                            break;
                        case 'total_population':
                            // Use populationManager if available, otherwise fallback to gameState
                            if (window.gameState.populationManager) {
                                current = window.gameState.populationManager.getAll().length;
                            } else {
                                current = window.gameState.population || 0;
                            }
                            break;
                        case 'royal_family_count':
                            // Placeholder - would need royal family system implementation
                            current = window.gameState.royalFamilyCount || 0;
                            break;
                        case 'unit_types_available':
                            // Placeholder - would check available unit types from military system
                            current = window.gameState.unitTypesAvailable || 0;
                            break;
                        case 'seasons_survived':
                            // Based on total seasons passed (8 seasons per year)
                            current = window.gameState.stats.totalSeasonsPassed || 0;
                            break;
                        case 'grandmaster_villagers':
                            // Placeholder - would check villager skill levels
                            current = window.gameState.grandmasterVillagers || 0;
                            break;
                        case 'generations_ruled':
                            current = window.gameState.generationsRuled || 1;
                            break;
                        case 'map_revealed_percent':
                            current = window.gameState.mapRevealedPercent || 0;
                            break;
                        case 'balanced_resources':
                            // Check if all basic resources are >= 1000
                            if (window.gameState.resources) {
                                const resources = window.gameState.resources;
                                current = (resources.gold >= 1000 && resources.food >= 1000 &&
                                    resources.wood >= 1000 && resources.stone >= 1000) ? 1 : 0;
                                // For balanced_resources, required should be true (1)
                                required = 1;
                            }
                            break;
                        default:
                            // Try to get from gameState directly if not found above
                            current = window.gameState[resource] || 0;
                            break;
                    }

                    if (current < required) {
                        meetsRequirement = false;
                    }
                });

                if (meetsRequirement) {
                    this.unlock(achievement.id);
                }
            }
        });

        // Check for "All Things End" ultimate achievement
        this.checkUltimateAchievement();
        
        // Check for "Become King" if not already unlocked
        // This provides alternative paths beyond just tutorial completion
        this.checkBecomeKingAchievement();

        this.isCheckingRequirements = false;
    }
    
    // Check if player qualifies for "Become King" achievement
    checkBecomeKingAchievement() {
        if (this.isUnlocked('become_king')) return;
        
        const gs = window.gameState;
        if (!gs) return;
        
        // Alternative conditions for becoming king:
        // 1. Population 30+, Day 20+, built 5+ buildings
        const pop = gs.populationManager?.getAll()?.length || gs.population || 0;
        const day = gs.day || 0;
        const buildings = gs.buildings?.length || 0;
        
        if (pop >= 30 && day >= 20 && buildings >= 5) {
            console.log('[Achievements] Become King conditions met via gameplay progression');
            this.triggerBecomeKing();
        }
        
        // 2. Or has military_establishment + thriving_dynasty
        if (this.isUnlocked('military_establishment') && this.isUnlocked('thriving_dynasty')) {
            console.log('[Achievements] Become King conditions met via military + population');
            this.triggerBecomeKing();
        }
    }

    // Check if player qualifies for the ultimate achievement
    checkUltimateAchievement() {
        if (this.isUnlocked('all_things_end')) return;

        // Check if player has reached multiple significant milestones
        const majorAchievements = [
            'population_boom',     // 100 population
            'prosperous_kingdom',  // 500 gold, 200 food, 50 population
            'warrior_king',        // 10 battles won
            'master_builder',      // 10 buildings built
            'wealthy_ruler'        // 1000 gold
        ];

        const unlockedMajorAchievements = majorAchievements.filter(id => this.isUnlocked(id));

        // Trigger "All Things End" if player has 4+ major achievements and become_king
        if (unlockedMajorAchievements.length >= 4 && this.isUnlocked('become_king')) {
            console.log('[Achievements] Ultimate achievement conditions met:', unlockedMajorAchievements);
            this.triggerAllThingsEnd();
        }
    }

    getProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !achievement.requirement || !window.gameState) {
            return { progress: 0, total: 1, percentage: 0 };
        }

        let totalProgress = 0;
        let totalRequired = 0;

        Object.entries(achievement.requirement).forEach(([resource, required]) => {
            let current = 0;
            switch (resource) {
                case 'gold':
                case 'food':
                case 'stone':
                case 'wood':
                case 'metal':
                    current = (window.gameState.resources && window.gameState.resources[resource]) || 0;
                    break;
                case 'population':
                    current = window.gameState.population || 0;
                    break;
                case 'battles_won':
                    current = window.gameState.battlesWon || 0;
                    break;
                case 'influence':
                    current = window.gameState.influence || 0;
                    break;
                case 'prestige':
                    current = window.gameState.prestige || 0;
                    break;
                case 'buildings_built':
                case 'houses_built':
                case 'farms_built':
                case 'barracks_built':
                case 'towncenters_built':
                    current = this.stats[resource] || 0;
                    break;
                default:
                    // Try to get from gameState directly if not found above
                    current = window.gameState[resource] || 0;
                    break;
            }

            totalProgress += Math.min(current, required);
            totalRequired += required;
        });

        const percentage = totalRequired > 0 ? Math.floor((totalProgress / totalRequired) * 100) : 100;
        return { progress: totalProgress, total: totalRequired, percentage };
    }

    showAchievements() {
        const unlockedCount = this.unlockedAchievements.length;
        const totalCount = Object.keys(this.achievements).length;

        let content = `
            <div style="margin-bottom: 20px; text-align: center;">
                <h3 style="color: #f39c12;">🏆 Achievements (${unlockedCount}/${totalCount})</h3>
                <div style="background: rgba(52, 152, 219, 0.2); padding: 10px; border-radius: 5px;">
                    Progress: ${Math.floor((unlockedCount / totalCount) * 100)}%
                </div>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
        `;

        // Group achievements by type
        const types = ['tutorial', 'building', 'resource', 'combat', 'special'];
        types.forEach(type => {
            const typeAchievements = Object.values(this.achievements).filter(a => a.type === type);
            if (typeAchievements.length === 0) return;

            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            content += `<h4 style="color: #3498db; margin: 20px 0 10px 0; border-bottom: 1px solid rgba(52, 152, 219, 0.3); padding-bottom: 5px;">${typeName}</h4>`;

            typeAchievements.forEach(achievement => {
                content += this.formatAchievementDisplay(achievement);
            });
        });

        content += '</div>';

        window.showModal('Achievements', content, {
            icon: '🏆',
            closable: true,
            confirmText: 'Close'
        });
    }

    formatAchievementDisplay(achievement) {
        const isUnlocked = achievement.unlocked;
        const opacity = isUnlocked ? '1' : '0.5';
        const icon = isUnlocked ? achievement.icon : '🔒';
        // Always show real title and description, even if locked
        const title = achievement.title;
        const description = achievement.description;

        let progressBar = '';
        if (!isUnlocked && achievement.requirement) {
            const progress = this.getProgress(achievement.id);
            progressBar = `
                <div style="margin-top: 8px;">
                    <div style="background: rgba(52, 73, 94, 0.5); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: #3498db; height: 100%; width: ${progress.percentage}%; transition: width 0.3s;"></div>
                    </div>
                    <small style="color: #95a5a6;">${progress.percentage}% complete</small>
                </div>
            `;
        }

        return `
            <div style="margin-bottom: 15px; padding: 15px; background: rgba(52, 73, 94, 0.3); 
                        border-radius: 8px; opacity: ${opacity};">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 24px;">${icon}</div>
                    <div style="flex: 1;">
                        <h5 style="margin: 0; color: ${isUnlocked ? '#f39c12' : '#95a5a6'};">${title}</h5>
                        <p style="margin: 5px 0 0 0; color: #ecf0f1; font-size: 14px;">${description}</p>
                        ${isUnlocked ? `<small style="color: #27ae60;">Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}</small>` : ''}
                        ${progressBar}
                    </div>
                </div>
            </div>
        `;
    }

    // Get achievements sorted: incomplete (closest first), then completed (by date)
    getSortedAchievements() {
        const achievementsArr = Object.values(this.achievements);
        const incomplete = achievementsArr.filter(a => !a.unlocked && a.requirement);
        const completed = achievementsArr.filter(a => a.unlocked);
        // Sort incomplete by percent complete, descending
        incomplete.sort((a, b) => {
            const progA = this.getProgress(a.id).percentage;
            const progB = this.getProgress(b.id).percentage;
            return progB - progA;
        });
        // Sort completed by unlock date ascending
        completed.sort((a, b) => a.unlockedAt - b.unlockedAt);
        return [...incomplete, ...completed];
    }

    // Render a compact row for the achievements popup
    renderAchievementRow(achievement) {
        const isUnlocked = achievement.unlocked;
        const icon = isUnlocked ? achievement.icon : '🔒';
        // Always show real title and description, even if locked
        const title = achievement.title;
        const description = achievement.description;
        let progressBar = '';
        let date = '';
        if (!isUnlocked && achievement.requirement) {
            const progress = this.getProgress(achievement.id);
            progressBar = `<div style="background: #222; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 4px;">
                <div style="background: #3498db; height: 100%; width: ${progress.percentage}%; transition: width 0.3s;"></div>
            </div>
            <small style='color:#aaa;'>${progress.percentage}% complete</small>`;
        }
        if (isUnlocked && achievement.unlockedAt) {
            date = `<small style='color:#27ae60;'>Unlocked: ${new Date(achievement.unlockedAt).toLocaleDateString()}</small>`;
        }
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;opacity:${isUnlocked ? 1 : 0.6};">
            <div style="font-size:22px;">${icon}</div>
            <div style="flex:1;">
                <div style="font-weight:bold;color:${isUnlocked ? '#f39c12' : '#95a5a6'};">${title}</div>
                <div style="font-size:12px;color:#bbb;">${description}</div>
                ${progressBar}
                ${date}
            </div>
        </div>`;
    }

    saveToStorage() {
        try {
            const saveData = {
                achievements: this.achievements,
                unlockedAchievements: this.unlockedAchievements,
                stats: this.stats
            };
            localStorage.setItem('achievements', JSON.stringify(saveData));
            console.log('[Achievements] Saved to storage:', {
                achievementsCount: Object.keys(this.achievements).length,
                unlockedCount: this.unlockedAchievements.length,
                stats: this.stats
            });
        } catch (error) {
            console.warn('[Achievements] Could not save to localStorage:', error);
        }
    }

    loadFromStorage() {
        // Don't load during hard reset
        if (window.StorageManager?.isHardResetInProgress()) {
            console.log('[Achievements] Skipping load - hard reset in progress');
            this.achievements = {};
            this.unlockedAchievements = [];
            this.stats = {
                buildings_built: 0,
                battles_won: 0,
                houses_built: 0,
                farms_built: 0,
                barracks_built: 0,
                towncenters_built: 0
            };
            return;
        }
        
        try {
            const saved = localStorage.getItem('achievements');
            if (saved) {
                const data = JSON.parse(saved);
                this.achievements = data.achievements || {};
                this.unlockedAchievements = data.unlockedAchievements || [];
                this.stats = data.stats || {
                    buildings_built: 0,
                    battles_won: 0,
                    houses_built: 0,
                    farms_built: 0,
                    barracks_built: 0,
                    towncenters_built: 0
                };

                // Convert unlockedAt strings back to Date objects
                Object.values(this.achievements).forEach(achievement => {
                    if (achievement.unlockedAt && typeof achievement.unlockedAt === 'string') {
                        achievement.unlockedAt = new Date(achievement.unlockedAt);
                    }
                });

                console.log('[Achievements] Loaded from storage:', {
                    achievementsCount: Object.keys(this.achievements).length,
                    unlockedCount: this.unlockedAchievements.length,
                    stats: this.stats
                });
            } else {
                console.log('[Achievements] No saved data found, starting fresh');
            }
        } catch (error) {
            console.warn('[Achievements] Could not load from localStorage:', error);
            this.achievements = {};
            this.unlockedAchievements = [];
        }
    }

    // Start periodic checking for requirement-based achievements
    startPeriodicCheck() {
        setInterval(() => {
            this.checkRequirements();
        }, 5000); // Check every 5 seconds
    }

    // Debug function to see current achievement states
    debugAchievements() {
        console.log('=== ACHIEVEMENT DEBUG ===');
        console.log('Total achievements:', Object.keys(this.achievements).length);
        console.log('Unlocked count:', this.unlockedAchievements.length);
        console.log('Currently checking:', this.isCheckingRequirements);
        console.log('Unlocked array contents:', this.unlockedAchievements);

        Object.values(this.achievements).forEach(achievement => {
            if (achievement.unlocked) {
                console.log(`✅ ${achievement.id}: ${achievement.title} (unlocked at ${achievement.unlockedAt})`);
            } else {
                console.log(`❌ ${achievement.id}: ${achievement.title} (locked)`);
                if (achievement.requirement) {
                    const progress = this.getProgress(achievement.id);
                    console.log(`   Progress: ${progress.percentage}%`);
                }
            }
        });
    }
}


// Create global instance
if (!window.achievementSystem) {
    window.achievementSystem = new AchievementSystem();
    console.log('[Achievements] Achievement system ready');

    // Add debug function globally
    window.debugAchievements = () => {
        if (window.achievementSystem) {
            window.achievementSystem.debugAchievements();
        } else {
            console.log('Achievement system not available');
        }
    };

    // Add fix function globally
    window.fixAchievements = () => {
        if (window.achievementSystem) {
            window.achievementSystem.fixAchievementData();
        } else {
            console.log('Achievement system not available');
        }
    };

    // Add building stats sync function
    window.syncAchievementStats = () => {
        if (window.achievementSystem && window.gameState && window.gameState.buildings) {
            const stats = window.achievementSystem.stats;

            // Count only COMPLETED buildings (level > 0) from gameState
            const completedBuildings = window.gameState.buildings.filter(b => b.level > 0);
            stats.buildings_built = completedBuildings.length;
            stats.houses_built = completedBuildings.filter(b => b.type === 'house').length;
            stats.farms_built = completedBuildings.filter(b => b.type === 'farm').length;
            stats.barracks_built = completedBuildings.filter(b => b.type === 'barracks').length;
            stats.towncenters_built = completedBuildings.filter(b => b.type === 'townCenter').length;

            console.log('[Achievements] Stats synced (completed buildings only):', stats);
            window.achievementSystem.saveToStorage();
            return stats;
        } else {
            console.log('Achievement system or game state not available');
        }
    };

    console.log('[Achievements] Debug commands available: debugAchievements(), fixAchievements(), syncAchievementStats()');
} else {
    console.log('[Achievements] Achievement system already exists');
}
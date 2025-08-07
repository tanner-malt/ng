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
            hidden: false,
            reward: { prestige: 10 },
            unlocked: true, // Start unlocked for testing
            unlockedAt: new Date()
        });

        this.defineAchievement('first_settlement', {
            title: 'Settlement Founder',
            description: 'Built your first Town Center',
            icon: '🏛️',
            type: 'building',
            hidden: false,
            reward: { wood: 75, stone: 500}
        });

        this.defineAchievement('sheltering_citizens', {
            title: 'Sheltering Citizens',
            description: 'Built 3 Houses',
            icon: '🏠',
            type: 'building',
            hidden: false,
            requirement: { houses_built: 3 }, // Requires 3 houses built
            reward: { population: 10, wood: 500 }
        });

        this.defineAchievement('feeding_people', {
            title: 'Feeding the People',
            description: 'Built your first Farm',
            icon: '🌾',
            type: 'building',
            hidden: false,
            reward: { food: 50 }
        });

        this.defineAchievement('military_establishment', {
            title: 'Military Establishment',
            description: 'Built your first Barracks',
            icon: '⚔️',
            type: 'building',
            hidden: false,
            reward: { soldiers: 1 }
        });

        this.defineAchievement('tutorial_complete', {
            title: 'Royal Education Complete',
            description: 'Completed the tutorial and unlocked Battle Mode',
            icon: '🎓',
            type: 'tutorial',
            hidden: false,
            reward: { gold: 500, influence: 25, prestige: 50 }
        });

        // Building achievements
        this.defineAchievement('first_farm', {
            title: 'Green Thumb',
            description: 'Built your first farm',
            icon: '🌾',
            type: 'building',
            hidden: false,
            reward: { food: 100 }
        });

        // Building mastery achievements
        this.defineAchievement('master_builder', {
            title: 'Master Builder',
            description: 'Built 10 buildings total',
            icon: '🏗️',
            type: 'building',
            hidden: false,
            requirement: { buildings_built: 10 },
            reward: { gold: 200, prestige: 50 }
        });

        // Resource achievements with multiple conditions
        this.defineAchievement('wealthy_ruler', {
            title: 'Wealthy Ruler',
            description: 'Accumulated 1000 gold',
            icon: '💰',
            type: 'resource',
            hidden: false,
            requirement: { gold: 1000 },
            reward: { prestige: 25 }
        });

        this.defineAchievement('prosperous_kingdom', {
            title: 'Prosperous Kingdom',
            description: 'Have 500 gold, 200 food, and 50 population',
            icon: '🏰',
            type: 'resource',
            hidden: false,
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
            hidden: false,
            requirement: { population: 100 },
            reward: { influence: 50 }
        });

        this.defineAchievement('thriving_dynasty', {
            title: 'Thriving Dynasty',
            description: 'Reached 50 population',
            icon: '🏘️',
            type: 'resource',
            hidden: false,
            requirement: { population: 50 },
            reward: { population: 15, gold: 300 }
        });

        this.defineAchievement('migration_wave', {
            title: 'Migration Wave',
            description: 'Your dynasty attracts settlers from afar',
            icon: '🚶‍♂️🚶‍♀️',
            type: 'special',
            hidden: false,
            requirement: { population: 25 },
            reward: { population: 25, food: 200 }
        });

        // Combat achievements
        this.defineAchievement('warrior_king', {
            title: 'Warrior King',
            description: 'Won 10 battles',
            icon: '🗡️',
            type: 'combat',
            hidden: false,
            requirement: { battles_won: 10 },
            reward: { military_exp: 200, prestige: 100 }
        });

        // Special achievements
        this.defineAchievement('renaissance_ruler', {
            title: 'Renaissance Ruler',
            description: 'Built at least one of every building type',
            icon: '🏰',
            type: 'special',
            hidden: false,
            reward: { prestige: 200, influence: 100 }
        });

        // Exploration achievement
        this.defineAchievement('first_exploration', {
            title: 'First Explorer',
            description: 'Explored a tile in the world view',
            icon: '🗺️',
            type: 'exploration',
            hidden: false,
            reward: { metal: 15, influence: 10 }
        });

        console.log('[Achievements] Initialized', Object.keys(this.achievements).length, 'achievements');
    }

    // Trigger achievement for dynasty naming
    triggerDynastyNamed(dynastyName) {
        this.unlock('dynasty_founder');
    }

    // Trigger achievement for building placement
    triggerBuildingPlaced(buildingType) {
        // Track total buildings built
        this.stats.buildings_built++;

        // Track specific building types
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
            'townCenter': 'first_settlement',
            'farm': 'feeding_people',
            'barracks': 'military_establishment'
        };

        const achievementId = achievementMap[buildingType];
        if (achievementId) {
            this.unlock(achievementId);
        }

        // Check master builder achievement
        if (this.stats.buildings_built >= 10 && !this.isUnlocked('master_builder')) {
            this.unlock('master_builder');
        }

        // Check houses requirement for sheltering_citizens
        if (this.stats.houses_built >= 3 && !this.isUnlocked('sheltering_citizens')) {
            this.unlock('sheltering_citizens');
        }

        // Emit event for building completed
        if (window.eventBus) {
            window.eventBus.emit('building_completed', { buildingType });
        }

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
            hidden: false, // Always visible
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

        // Trigger unlock system check (delayed to avoid recursive calls)
        if (window.unlockSystem) {
            setTimeout(() => {
                window.unlockSystem.checkAllUnlocks();
            }, 100);
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
            if (resource === 'population' && amount > 0) {
                // Use the new generateMassPopulation method for better distribution
                if (window.gameState.generateMassPopulation) {
                    const generated = window.gameState.generateMassPopulation(amount);
                    if (generated && generated.length) {
                        populationGained += generated.length;
                        console.log(`[Achievements] Generated ${generated.length} new villagers as achievement reward`);
                    } else {
                        console.warn(`[Achievements] generateMassPopulation returned no results for ${amount} villagers`);
                    }
                } else if (window.gameState.populationManager && window.GameData && typeof window.GameData.generatePopulationMember === 'function') {
                    // Fallback to old method if new one isn't available
                    const names = window.GameData && window.GameData.populationNames ? window.GameData.populationNames : ["Alex", "Sam", "Jamie", "Taylor", "Jordan", "Morgan", "Casey", "Riley", "Drew", "Cameron"];
                    for (let i = 0; i < amount; i++) {
                        const pop = window.GameData.generatePopulationMember(names);
                        window.gameState.populationManager.addInhabitant(pop);
                    }
                    // Update population count if tracked separately
                    if (typeof window.gameState.population === 'number') {
                        window.gameState.population += amount;
                    } else {
                        window.gameState.population = window.gameState.populationManager.getAll().length;
                    }
                    populationGained += amount;
                } else {
                    // Last resort: just increment population number
                    window.gameState.population = (window.gameState.population || 0) + amount;
                    populationGained += amount;
                }
            } else if (window.gameState.resources && window.gameState.resources.hasOwnProperty(resource)) {
                window.gameState.resources[resource] += amount;
                // Cap resource if defined in GameData
                if (GameData.resourceCaps && GameData.resourceCaps[resource]) {
                    window.gameState.resources[resource] = Math.min(window.gameState.resources[resource], GameData.resourceCaps[resource]);
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
            if (window.showNotification) {
                window.showNotification(`🎉 ${populationGained} new villagers joined your dynasty!`, 'success');
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
                military_exp: '⚔️'
            };
            const icon = icons[resource] || '📊';
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
                if (window.closeModal) window.closeModal();
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
                            current = window.gameState.resources[resource] || 0;
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
        
        this.isCheckingRequirements = false;
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
                    current = window.gameState.resources[resource] || 0;
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
        const title = isUnlocked ? achievement.title : '???';
        const description = isUnlocked ? achievement.description : 'Achievement locked';
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
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;opacity:${isUnlocked?1:0.6};">
            <div style="font-size:22px;">${icon}</div>
            <div style="flex:1;">
                <div style="font-weight:bold;color:${isUnlocked?'#f39c12':'#95a5a6'};">${title}</div>
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

    // Fix achievement data corruption
    fixAchievementData() {
        console.log('[Achievements] Fixing data corruption...');
        
        // Clear corrupted unlocked array
        this.unlockedAchievements = [];
        
        // Rebuild unlocked array from achievement objects
        Object.values(this.achievements).forEach(achievement => {
            if (achievement.unlocked) {
                this.unlockedAchievements.push(achievement.id);
            }
        });
        
        // Force check all requirements and unlock eligible achievements
        this.forceCheckAllRequirements();
        
        this.saveToStorage();
        console.log('[Achievements] Data corruption fixed');
    }
    
    // Force check all requirements ignoring flags
    forceCheckAllRequirements() {
        console.log('[Achievements] Force checking all achievement requirements...');
        
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
                            current = window.gameState.resources[resource] || 0;
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
                    }

                    if (current < required) {
                        meetsRequirement = false;
                    }
                });

                if (meetsRequirement) {
                    console.log(`[Achievements] Force unlocking eligible: ${achievement.id}`);
                    this.unlock(achievement.id);
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
            
            // Count buildings from gameState
            stats.buildings_built = window.gameState.buildings.length;
            stats.houses_built = window.gameState.buildings.filter(b => b.type === 'house').length;
            stats.farms_built = window.gameState.buildings.filter(b => b.type === 'farm').length;
            stats.barracks_built = window.gameState.buildings.filter(b => b.type === 'barracks').length;
            stats.towncenters_built = window.gameState.buildings.filter(b => b.type === 'townCenter').length;
            
            console.log('[Achievements] Stats synced:', stats);
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
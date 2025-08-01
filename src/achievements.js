/**
 * achievements.js - Achievement System
 * 
 * Manages player achievements, progress tracking, and rewards.
 * Integrates with tutorial system and message history.
 */

class AchievementSystem {
    constructor() {
        this.achievements = {};
        this.unlockedAchievements = [];
        this.loadFromStorage();
        this.initializeAchievements();
        console.log('[Achievements] Achievement system initialized');
    }

    initializeAchievements() {
        // Tutorial-related achievements
        this.defineAchievement('first_dynasty', {
            title: 'Dynasty Founder',
            description: 'Named your first dynasty',
            icon: '👑',
            type: 'tutorial',
            hidden: false,
            reward: { prestige: 10 }
        });

        this.defineAchievement('town_center_built', {
            title: 'Center of Power',
            description: 'Built your first Town Center',
            icon: '🏛️',
            type: 'building',
            hidden: false,
            reward: { gold: 100, influence: 5 }
        });

        this.defineAchievement('first_battle', {
            title: 'First Blood',
            description: 'Won your first battle',
            icon: '⚔️',
            type: 'combat',
            hidden: false,
            reward: { military_exp: 50 }
        });

        this.defineAchievement('tutorial_complete', {
            title: 'Royal Education',
            description: 'Completed the royal tutorial',
            icon: '🎓',
            type: 'tutorial',
            hidden: false,
            reward: { gold: 500, influence: 25, prestige: 50 }
        });

        // Building achievements
        this.defineAchievement('first_house', {
            title: 'Home Builder',
            description: 'Built your first house',
            icon: '🏠',
            type: 'building',
            hidden: false,
            reward: { gold: 50 }
        });

        this.defineAchievement('first_farm', {
            title: 'Green Thumb',
            description: 'Built your first farm',
            icon: '🌾',
            type: 'building',
            hidden: false,
            reward: { food: 100 }
        });

        // Resource achievements
        this.defineAchievement('wealthy_ruler', {
            title: 'Wealthy Ruler',
            description: 'Accumulated 1000 gold',
            icon: '💰',
            type: 'resource',
            hidden: false,
            requirement: { gold: 1000 },
            reward: { prestige: 25 }
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

        console.log('[Achievements] Initialized', Object.keys(this.achievements).length, 'achievements');
    }

    defineAchievement(id, config) {
        this.achievements[id] = {
            id: id,
            title: config.title,
            description: config.description,
            icon: config.icon || '🏆',
            type: config.type || 'general',
            hidden: config.hidden || false,
            requirement: config.requirement || null,
            reward: config.reward || {},
            unlocked: false,
            unlockedAt: null
        };
    }

    unlock(achievementId, silent = false) {
        const achievement = this.achievements[achievementId];
        if (!achievement) {
            console.warn('[Achievements] Unknown achievement:', achievementId);
            return false;
        }

        if (achievement.unlocked) {
            return false; // Already unlocked
        }

        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.unlockedAchievements.push(achievementId);

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

        this.saveToStorage();
        console.log('[Achievements] Unlocked:', achievement.title);
        return true;
    }

    applyRewards(rewards) {
        if (!window.gameState) return;

        Object.entries(rewards).forEach(([resource, amount]) => {
            switch (resource) {
                case 'gold':
                    window.gameState.resources.gold += amount;
                    break;
                case 'food':
                    window.gameState.resources.food += amount;
                    break;
                case 'stone':
                    window.gameState.resources.stone += amount;
                    break;
                case 'wood':
                    window.gameState.resources.wood += amount;
                    break;
                case 'influence':
                    window.gameState.influence += amount;
                    break;
                case 'prestige':
                    window.gameState.prestige += amount;
                    break;
                case 'military_exp':
                    window.gameState.militaryExperience = (window.gameState.militaryExperience || 0) + amount;
                    break;
            }
        });

        // Trigger UI update
        if (window.eventBus) {
            window.eventBus.emit('resources-updated');
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
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; margin-bottom: 15px;">${achievement.icon}</div>
                <h2 style="color: #f39c12; margin: 0 0 10px 0;">Achievement Unlocked!</h2>
                <h3 style="color: #ecf0f1; margin: 0 0 15px 0;">${achievement.title}</h3>
                <p style="color: #95a5a6; font-style: italic; margin-bottom: 20px;">${achievement.description}</p>
                <div style="background: rgba(46, 204, 113, 0.2); padding: 15px; border-radius: 8px; border: 2px solid #2ecc71;">
                    <strong style="color: #2ecc71;">Rewards:</strong><br>
                    ${this.formatRewards(achievement.reward)}
                </div>
            </div>
        `;

        window.showModal('🏆 Achievement', content, {
            icon: '🏆',
            closable: true,
            confirmText: 'Awesome!',
            style: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
        });
    }

    checkRequirements() {
        if (!window.gameState) return;

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
        const title = isUnlocked ? achievement.title : '???';
        const description = isUnlocked ? achievement.description : 'Achievement locked';

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

    saveToStorage() {
        try {
            const saveData = {
                achievements: this.achievements,
                unlockedAchievements: this.unlockedAchievements
            };
            localStorage.setItem('achievements', JSON.stringify(saveData));
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
                
                // Convert unlockedAt strings back to Date objects
                Object.values(this.achievements).forEach(achievement => {
                    if (achievement.unlockedAt && typeof achievement.unlockedAt === 'string') {
                        achievement.unlockedAt = new Date(achievement.unlockedAt);
                    }
                });
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
}

// Create global instance
window.AchievementSystem = AchievementSystem;
console.log('[Achievements] Achievement system ready');

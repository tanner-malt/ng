/**
 * unlockSystem.js - Achievement-Based Unlock System
 * 
 * Uses achievements as the primary way to unlock new content including:
 * - Buildings
 * - Views/Screens  
 * - Features
 * - Advanced mechanics
 */

class UnlockSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.unlockedContent = new Set();
        this.unlockConditions = new Map();
        this.unlockCallbacks = new Map();
        
        // Start with basic content unlocked
        // Tent, town center, founder's wagon, and village view available at start
        this.unlockedContent.add('tent');
        this.unlockedContent.add('townCenter'); // Town center unlocked from start
        this.unlockedContent.add('foundersWagon'); // Founder's wagon unlocked from start
        this.unlockedContent.add('village_view'); // Village view always available
        
        this.initializeUnlockConditions();
        this.loadFromStorage();
        
        console.log('[UnlockSystem] Achievement-based unlock system initialized');
    }

    initializeUnlockConditions() {
        // Building Unlocks - Achievement Based Progression
        this.registerUnlock('house', {
            type: 'building',
            name: 'House',
            description: 'Basic housing for your citizens',
            conditions: [
                { type: 'achievement', achievement: 'town_center_built' }
            ],
            autoUnlock: true
        });

        this.registerUnlock('farm', {
            type: 'building',
            name: 'Farm',
            description: 'Produces food for your settlement',
            conditions: [
                { type: 'achievement', achievement: 'sheltering_citizens' }
            ],
            autoUnlock: true
        });

        // Founder's Wagon is unlocked by default - no registration needed

        // Town Center is unlocked by default - no registration needed

        this.registerUnlock('buildersHut', {
            type: 'building',
            name: 'Builder\'s Hut',
            description: 'Professional construction facility for advanced buildings',
            conditions: [
                { type: 'building_count', building: 'townCenter', count: 1 },
                { type: 'resource', resource: 'population', amount: 12 }
            ],
            autoUnlock: true
        });

        this.registerUnlock('woodcutterLodge', {
            type: 'building',
            name: 'Woodcutter Lodge',
            description: 'Advanced wood processing facility for larger settlements',
            conditions: [
                { type: 'achievement', achievement: 'feeding_people' } // Need to build first farm
            ],
            autoUnlock: true
        });

        this.registerUnlock('quarry', {
            type: 'building',
            name: 'Quarry',
            description: 'Stone extraction site for advanced construction',
            conditions: [
                { type: 'achievement', achievement: 'prosperous_kingdom' }, // Need 500 gold, 200 food, 50 pop
                { type: 'building_count', building: 'house', count: 8 }, // Need large settlement
                { type: 'resource', resource: 'stone', amount: 50 } // Need stone stockpile from gathering
            ],
            autoUnlock: true
        });

        this.registerUnlock('lumberMill', {
            type: 'building',
            name: 'Lumber Mill',
            description: 'Industrial lumber processing facility for refined planks',
            conditions: [
                { type: 'building_count', building: 'woodcutterLodge', count: 2 }, // Need multiple woodcutter lodges first
                { type: 'resource', resource: 'wood', amount: 300 }, // Need substantial wood reserves
                { type: 'resource', resource: 'stone', amount: 100 }, // Need stone for construction
                { type: 'resource', resource: 'population', amount: 75 } // Need large workforce
            ],
            autoUnlock: true
        });

        this.registerUnlock('market', {
            type: 'building',
            name: 'Market',
            description: 'Trade center for economic growth',
            conditions: [
                { type: 'achievement', achievement: 'wealthy_ruler' }, // Need 1000 gold
                { type: 'building_count', building: 'house', count: 6 }, // Need established settlement
                { type: 'resource', resource: 'population', amount: 25 } // Need trading population
            ],
            autoUnlock: true
        });

        this.registerUnlock('barracks', {
            type: 'building',
            name: 'Barracks',
            description: 'Military training facility requiring refined materials',
            conditions: [
                { type: 'building_count', building: 'woodcutterLodge', count: 1 }, // Need woodcutter lodge for refined lumber
                { type: 'resource', resource: 'population', amount: 10 }, // Need recruits (reduced from 30)
                { type: 'resource', resource: 'gold', amount: 200 } // Need funding for military
            ],
            autoUnlock: true
        });

        this.registerUnlock('temple', {
            type: 'building',
            name: 'Temple',
            description: 'Increases happiness and unlocks special abilities',
            conditions: [
                { type: 'building_count', building: 'market', count: 1 },
                { type: 'resource', resource: 'population', amount: 25 },
                { type: 'resource', resource: 'gold', amount: 200 }
            ],
            autoUnlock: false
        });

        this.registerUnlock('academy', {
            type: 'building',
            name: 'Academy',
            description: 'Research new technologies',
            conditions: [
                { type: 'building_count', building: 'temple', count: 1 },
                { type: 'achievement', achievement: 'master_builder' }
            ],
            autoUnlock: false
        });

        // View Unlocks - Achievement Based
        this.registerUnlock('village_view', {
            type: 'view',
            name: 'Village',
            description: 'Your main settlement view - always available',
            conditions: [], // No conditions - always unlocked
            autoUnlock: true
        });

        this.registerUnlock('world_view', {
            type: 'view',
            name: 'World Map',
            description: 'Explore the surrounding lands',
            conditions: [
                { type: 'achievement', achievement: 'military_establishment' }
            ],
            autoUnlock: true,
            callback: () => this.unlockView('world')
        });

        this.registerUnlock('monarch_view', {
            type: 'view',
            name: 'Monarch Screen',
            description: 'Manage your royal affairs and dynasty legacy',
            conditions: [
                { type: 'achievement', achievement: 'become_king' }
            ],
            autoUnlock: true,
            callback: () => this.unlockView('monarch')
        });

        this.registerUnlock('throne_view', {
            type: 'view',
            name: 'Throne Room',
            description: 'Access the throne\'s full power and royal family management',
            conditions: [
                { type: 'achievement', achievement: 'all_things_end' }
            ],
            autoUnlock: true,
            callback: () => this.unlockView('throne')
        });

        // Feature Unlocks - Achievement Gated
        this.registerUnlock('expeditions', {
            type: 'feature',
            name: 'Expeditions',
            description: 'Send forces to explore and conquer',
            conditions: [
                { type: 'achievement', achievement: 'military_establishment' },
                { type: 'building_count', building: 'barracks', count: 1 }
            ],
            autoUnlock: true
        });

        this.registerUnlock('advanced_construction', {
            type: 'feature',
            name: 'Advanced Construction',
            description: 'Build multiple structures simultaneously',
            conditions: [
                { type: 'achievement', achievement: 'master_builder' }
            ],
            autoUnlock: true
        });

        this.registerUnlock('trade_routes', {
            type: 'feature',
            name: 'Trade Routes',
            description: 'Establish trade with other settlements',
            conditions: [
                { type: 'building_count', building: 'market', count: 2 },
                { type: 'resource', resource: 'gold', amount: 500 }
            ],
            autoUnlock: true
        });

        this.registerUnlock('diplomacy', {
            type: 'feature',
            name: 'Diplomacy',
            description: 'Negotiate with other rulers',
            conditions: [
                { type: 'achievement', achievement: 'dynasty_founder' },
                { type: 'building_count', building: 'temple', count: 1 }
            ],
            autoUnlock: true
        });

        // Special Building Unlocks
        this.registerUnlock('castle', {
            type: 'building',
            name: 'Castle',
            description: 'Ultimate defensive structure and seat of power',
            conditions: [
                { type: 'building_count', building: 'barracks', count: 2 },
                { type: 'building_count', building: 'temple', count: 1 },
                { type: 'resource', resource: 'stone', amount: 200 },
                { type: 'resource', resource: 'population', amount: 50 }
            ],
            autoUnlock: false
        });

        this.registerUnlock('university', {
            type: 'building',
            name: 'University',
            description: 'Advanced research and knowledge center',
            conditions: [
                { type: 'building_count', building: 'academy', count: 1 },
                { type: 'resource', resource: 'gold', amount: 1000 }
            ],
            autoUnlock: false
        });
    }

    registerUnlock(unlockId, config) {
        this.unlockConditions.set(unlockId, config);
        
        if (config.callback) {
            this.unlockCallbacks.set(unlockId, config.callback);
        }
        
        console.log(`[UnlockSystem] Registered unlock: ${unlockId}`);
    }

    checkUnlockConditions(unlockId) {
        const config = this.unlockConditions.get(unlockId);
        if (!config) return false;

        // If already unlocked, return true
        if (this.isUnlocked(unlockId)) return true;

        // Check all conditions
        return config.conditions.every(condition => {
            switch (condition.type) {
                case 'achievement':
                    const hasAchievement = window.achievementSystem && 
                                         typeof window.achievementSystem.isUnlocked === 'function' &&
                                         window.achievementSystem.isUnlocked(condition.achievement);
                    // console.log(`[UnlockSystem] Checking achievement ${condition.achievement}: ${hasAchievement}`);
                    return hasAchievement;

                case 'building_count':
                    const buildingCount = this.gameState.buildings.filter(
                        b => b.type === condition.building && b.level >= 1 && b.built
                    ).length;
                    const hasEnoughBuildings = buildingCount >= condition.count;
                    console.log(`[UnlockSystem] Checking building count ${condition.building}: ${buildingCount}/${condition.count} = ${hasEnoughBuildings}`);
                    return hasEnoughBuildings;

                case 'resource':
                    const hasEnoughResource = this.gameState[condition.resource] >= condition.amount;
                    console.log(`[UnlockSystem] Checking resource ${condition.resource}: ${this.gameState[condition.resource]}/${condition.amount} = ${hasEnoughResource}`);
                    return hasEnoughResource;

                case 'tutorial_step':
                    return window.tutorialManager && 
                           window.tutorialManager.isStepCompleted(condition.step);

                case 'day':
                    return this.gameState.day >= condition.day;

                case 'custom':
                    return condition.check ? condition.check() : false;

                default:
                    console.warn(`[UnlockSystem] Unknown condition type: ${condition.type}`);
                    return false;
            }
        });
    }

    checkAllUnlocks() {
        let newUnlocks = [];

        try {
            this.unlockConditions.forEach((config, unlockId) => {
                if (config.autoUnlock && !this.isUnlocked(unlockId)) {
                    if (this.checkUnlockConditions(unlockId)) {
                        this.unlock(unlockId);
                        newUnlocks.push(unlockId);
                    }
                }
            });

            if (newUnlocks.length > 0) {
                console.log('[UnlockSystem] New unlocks:', newUnlocks);
            }
        } catch (error) {
            console.error('[UnlockSystem] Error checking unlocks:', error);
            return [];
        }

        return newUnlocks;
    }

    unlock(unlockId, silent = false) {
        if (this.isUnlocked(unlockId)) return false;

        const config = this.unlockConditions.get(unlockId);
        if (!config) {
            console.warn(`[UnlockSystem] Unknown unlock ID: ${unlockId}`);
            return false;
        }

        // Add to unlocked content
        this.unlockedContent.add(unlockId);
        
        // Execute callback if provided
        const callback = this.unlockCallbacks.get(unlockId);
        if (callback) {
            try {
                callback();
            } catch (error) {
                console.error(`[UnlockSystem] Error executing unlock callback for ${unlockId}:`, error);
            }
        }

        // Save to storage
        this.saveToStorage();

        // Notify player
        if (!silent) {
            this.notifyUnlock(config);
        }

        // Emit event
        if (window.eventBus) {
            window.eventBus.emit('content_unlocked', {
                unlockId,
                type: config.type,
                name: config.name
            });
        }

        // Update UI if it's a building unlock
        if (config.type === 'building') {
            this.updateBuildingButtons();
        }

        console.log(`[UnlockSystem] Unlocked: ${unlockId} (${config.name})`);
        return true;
    }

    isUnlocked(unlockId) {
        return this.unlockedContent.has(unlockId);
    }

    isBuildingUnlocked(buildingType) {
        return this.isUnlocked(buildingType);
    }

    isViewUnlocked(viewName) {
        return this.isUnlocked(`${viewName}_view`);
    }

    isFeatureUnlocked(featureName) {
        return this.isUnlocked(featureName);
    }

    getUnlockedBuildings() {
        const buildings = [];
        this.unlockConditions.forEach((config, unlockId) => {
            if (config.type === 'building' && this.isUnlocked(unlockId)) {
                buildings.push(unlockId);
            }
        });
        return buildings;
    }

    getNextUnlocks() {
        const next = [];
        this.unlockConditions.forEach((config, unlockId) => {
            if (!this.isUnlocked(unlockId)) {
                const progress = this.getUnlockProgress(unlockId);
                next.push({
                    id: unlockId,
                    ...config,
                    progress: progress,
                    requirements: this.getUnlockRequirements(unlockId)
                });
            }
        });
        return next.sort((a, b) => b.progress - a.progress);
    }

    getUnlockProgress(unlockId) {
        const config = this.unlockConditions.get(unlockId);
        if (!config) return 0;

        const completedConditions = config.conditions.filter(condition => {
            switch (condition.type) {
                case 'achievement':
                    return window.achievementSystem && 
                           typeof window.achievementSystem.isUnlocked === 'function' &&
                           window.achievementSystem.isUnlocked(condition.achievement);
                case 'building_count':
                    const buildingCount = this.gameState.buildings.filter(
                        b => b.type === condition.building
                    ).length;
                    return buildingCount >= condition.count;
                case 'resource':
                    return this.gameState[condition.resource] >= condition.amount;
                default:
                    return false;
            }
        });

        return completedConditions.length / config.conditions.length;
    }

    getUnlockRequirements(unlockId) {
        const config = this.unlockConditions.get(unlockId);
        if (!config) return [];

        return config.conditions.map(condition => {
            switch (condition.type) {
                case 'achievement':
                    const hasAchievement = window.achievementSystem && 
                                         typeof window.achievementSystem.isUnlocked === 'function' &&
                                         window.achievementSystem.isUnlocked(condition.achievement);
                    const achievementConfig = window.achievementSystem ? 
                                            window.achievementSystem.achievements[condition.achievement] : null;
                    return {
                        type: 'achievement',
                        description: achievementConfig ? achievementConfig.title : condition.achievement,
                        completed: hasAchievement,
                        icon: achievementConfig ? achievementConfig.icon : '🏆'
                    };
                case 'building_count':
                    const buildingCount = this.gameState.buildings.filter(
                        b => b.type === condition.building
                    ).length;
                    return {
                        type: 'building',
                        description: `${condition.count} ${condition.building}(s)`,
                        completed: buildingCount >= condition.count,
                        progress: `${buildingCount}/${condition.count}`,
                        icon: this.getBuildingIcon(condition.building)
                    };
                case 'resource':
                    const hasEnoughResource = this.gameState[condition.resource] >= condition.amount;
                    return {
                        type: 'resource',
                        description: `${condition.amount} ${condition.resource}`,
                        completed: hasEnoughResource,
                        progress: `${this.gameState[condition.resource]}/${condition.amount}`,
                        icon: this.getResourceIcon(condition.resource)
                    };
                default:
                    return {
                        type: condition.type,
                        description: 'Unknown requirement',
                        completed: false,
                        icon: '❓'
                    };
            }
        });
    }

    getUnlockRequirementsText(unlockId) {
        const config = this.unlockConditions.get(unlockId);
        if (!config || this.isUnlocked(unlockId)) {
            return '';
        }

        const requirements = this.getUnlockRequirements(unlockId);
        const requirementTexts = requirements.map(req => {
            const status = req.completed ? '✅' : '❌';
            let description = req.description;
            
            // Improve building name formatting
            if (req.type === 'building') {
                // Extract building type and count from description like "1 woodcutter lodge(s)"
                const match = description.match(/(\d+)\s+(\w+)\(s\)/);
                if (match) {
                    const count = match[1];
                    const buildingType = match[2];
                    const properName = window.GameData ? 
                        window.GameData.getBuildingName(buildingType) : 
                        buildingType.charAt(0).toUpperCase() + buildingType.slice(1);
                    description = `${count} ${properName}${count > 1 ? 's' : ''}`;
                }
            }
            
            // Improve resource name formatting
            if (req.type === 'resource') {
                description = description.replace(/(\d+)\s+(\w+)/, (match, amount, resource) => {
                    const properResource = resource === 'population' ? 'Population' :
                                         resource === 'wood' ? 'Wood' :
                                         resource === 'stone' ? 'Stone' :
                                         resource === 'food' ? 'Food' :
                                         resource === 'gold' ? 'Gold' :
                                         resource === 'metal' ? 'Metal' :
                                         resource.charAt(0).toUpperCase() + resource.slice(1);
                    return `${amount} ${properResource}`;
                });
            }
            
            let text = `${status} ${description}`;
            
            if (req.progress && !req.completed) {
                text += ` (${req.progress})`;
            }
            
            return text;
        });

        // Use | separator instead of newlines for better HTML tooltip display
        return `Locked - Requirements: ${requirementTexts.join(' | ')}`;
    }

    getBuildingIcon(buildingType) {
        const icons = {
            foundersWagon: '🚛',
            townCenter: '🏛️',
            house: '🏠',
            farm: '🌾',
            woodcutterLodge: '🪚',
            quarry: '⛏️',
            market: '🏪',
            barracks: '⚔️',
            temple: '⛪',
            academy: '📚',
            castle: '🏰',
            university: '🎓'
        };
        return icons[buildingType] || '🏗️';
    }

    getResourceIcon(resource) {
        const icons = {
            population: '👥',
            food: '🌾',
            wood: '🪵',
            stone: '🪨',
            gold: '💰',
            metal: '⚒️'
        };
        return icons[resource] || '📦';
    }

    unlockView(viewName) {
        const navBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (navBtn) {
            navBtn.classList.remove('locked');
            navBtn.style.opacity = '1';
            navBtn.style.pointerEvents = 'auto';
            console.log(`[UnlockSystem] View unlocked: ${viewName}`);
        }
        
        // Call the game's unlockView method if available
        if (window.game && window.game.unlockView) {
            window.game.unlockView(viewName);
        }
    }

    updateBuildingButtons() {
        // Update building button visibility and state
        document.querySelectorAll('.build-btn').forEach(btn => {
            const buildingType = btn.dataset.building;
            if (buildingType) {
                if (this.isBuildingUnlocked(buildingType)) {
                    btn.classList.remove('locked');
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                    btn.title = `Build ${buildingType}`;
                } else {
                    btn.classList.add('locked');
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                    btn.title = `${buildingType} - Locked`;
                }
            }
        });
    }

    notifyUnlock(config) {
        const title = `🎉 ${config.name} Unlocked!`;
        const message = config.description;

        // Add to message history
        if (window.messageHistory) {
            window.messageHistory.addMessage({
                type: 'unlock',
                title: title,
                message: message,
                timestamp: new Date()
            });
        }

        // Show toast notification if available
        if (window.showToast) {
            window.showToast(title, message, 'success', 5000);
        } else {
            console.log(`[UnlockSystem] ${title} - ${message}`);
        }
    }

    saveToStorage() {
        try {
            const saveData = {
                unlockedContent: Array.from(this.unlockedContent)
            };
            localStorage.setItem('unlockSystem', JSON.stringify(saveData));
        } catch (error) {
            console.error('[UnlockSystem] Error saving to storage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saveData = localStorage.getItem('unlockSystem');
            if (saveData) {
                const parsed = JSON.parse(saveData);
                this.unlockedContent = new Set(parsed.unlockedContent || ['tent', 'village_view']);
            }
        } catch (error) {
            console.warn('[UnlockSystem] Error loading from storage:', error);
            this.unlockedContent = new Set(['tent', 'village_view']);
        }
    }

    // Manual unlock methods for special cases
    forceUnlock(unlockId) {
        return this.unlock(unlockId, false);
    }

    resetUnlocks() {
        this.unlockedContent = new Set(['tent', 'village_view']);
        this.saveToStorage();
        this.updateBuildingButtons();
        console.log('[UnlockSystem] All unlocks reset (except tent and village_view)');
    }

    // Debug methods
    listAllUnlocks() {
        console.log('[UnlockSystem] All registered unlocks:');
        this.unlockConditions.forEach((config, unlockId) => {
            const status = this.isUnlocked(unlockId) ? '✅' : '❌';
            const progress = this.getUnlockProgress(unlockId);
            console.log(`${status} ${unlockId}: ${config.name} (${(progress * 100).toFixed(1)}% progress)`);
        });
    }

    unlockAll() {
        this.unlockConditions.forEach((config, unlockId) => {
            this.unlock(unlockId, true);
        });
        this.updateBuildingButtons();
        console.log('[UnlockSystem] All content unlocked');
    }

    // Console commands for testing
    static setupDebugCommands() {
        if (window.unlockSystem) {
            window.unlockAll = () => window.unlockSystem.unlockAll();
            window.listUnlocks = () => window.unlockSystem.listAllUnlocks();
            window.resetUnlocks = () => window.unlockSystem.resetUnlocks();
            window.showUnlockProgress = () => window.unlockSystem.showUnlockProgress();
            console.log('[UnlockSystem] Debug commands available: unlockAll(), listUnlocks(), resetUnlocks(), showUnlockProgress()');
        }
    }

    // Show unlock progress modal
    showUnlockProgress() {
        const nextUnlocks = this.getNextUnlocks().slice(0, 5); // Show top 5
        
        let contentHTML = `
            <div style="margin-bottom: 15px;">
                <h4 style="color: #3498db; margin: 0 0 10px 0;">🔓 Coming Up Next</h4>
                <p style="color: #bdc3c7; font-size: 12px; margin: 0;">Complete achievements to unlock new content!</p>
            </div>
        `;

        nextUnlocks.forEach(unlock => {
            const progressPercent = (unlock.progress * 100).toFixed(1);
            contentHTML += `
                <div style="margin-bottom: 12px; padding: 8px; background: rgba(52, 152, 219, 0.1); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: bold; color: #3498db;">${this.getBuildingIcon(unlock.id)} ${unlock.name}</span>
                        <span style="font-size: 10px; color: #95a5a6;">${progressPercent}%</span>
                    </div>
                    <div style="font-size: 11px; color: #ecf0f1; margin-bottom: 6px;">${unlock.description}</div>
                    <div style="font-size: 10px;">
            `;
            
            unlock.requirements.forEach(req => {
                const checkmark = req.completed ? '✅' : '❌';
                contentHTML += `
                    <div style="margin-bottom: 2px; color: ${req.completed ? '#2ecc71' : '#e74c3c'};">
                        ${checkmark} ${req.icon} ${req.description}
                        ${req.progress ? ` (${req.progress})` : ''}
                    </div>
                `;
            });
            
            contentHTML += `</div></div>`;
        });

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: 'Unlock Progress',
                content: contentHTML,
                width: '400px',
                className: 'unlock-progress-modal'
            });
        }
    }
}

// Integration with existing systems
document.addEventListener('DOMContentLoaded', () => {
    // Wait for gameState to be available
    const initUnlockSystem = () => {
        if (window.gameState && window.achievementSystem && 
            typeof window.achievementSystem.isUnlocked === 'function') {
            window.unlockSystem = new UnlockSystem(window.gameState);
            
            // Check for unlocks periodically, but with error handling
            const unlockCheckInterval = setInterval(() => {
                try {
                    if (window.unlockSystem && window.achievementSystem && 
                        typeof window.achievementSystem.isUnlocked === 'function') {
                        window.unlockSystem.checkAllUnlocks();
                    } else {
                        console.warn('[UnlockSystem] Achievement system not ready, clearing interval');
                        clearInterval(unlockCheckInterval);
                    }
                } catch (error) {
                    console.error('[UnlockSystem] Error in periodic check:', error);
                    clearInterval(unlockCheckInterval);
                }
            }, 3000); // Increased interval to 3 seconds
            
            // Setup debug commands
            UnlockSystem.setupDebugCommands();
            
            console.log('[UnlockSystem] System ready and monitoring for unlocks');
        } else {
            setTimeout(initUnlockSystem, 200); // Increased delay
        }
    };
    
    // Wait a bit longer before starting
    setTimeout(initUnlockSystem, 500);
});

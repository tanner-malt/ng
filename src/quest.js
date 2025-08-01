// Quest/Expedition system with Oregon Trail-style travel
class QuestManager {
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;
        this.currentExpedition = null;
        this.expeditionState = 'none'; // none, traveling_out, battling, traveling_back
        this.expeditionStartTime = null;
        this.travelEvents = [];
        this.availableLocations = this.initializeLocations();
    }

    initializeLocations() {
        return [
            {
                id: 'goblin_outpost',
                name: 'Goblin Outpost',
                description: 'A small raiding camp nearby',
                travelDays: 2,
                difficulty: 'easy',
                estimatedBattleMinutes: 3,
                rewards: {
                    gold: { min: 50, max: 100 },
                    wood: { min: 20, max: 40 },
                    food: { min: 10, max: 25 }
                },
                unlocked: true
            },
            {
                id: 'bandit_stronghold',
                name: 'Bandit Stronghold',
                description: 'A fortified camp controlling trade routes',
                travelDays: 4,
                difficulty: 'medium',
                estimatedBattleMinutes: 8,
                rewards: {
                    gold: { min: 150, max: 300 },
                    wood: { min: 40, max: 80 },
                    stone: { min: 20, max: 40 }
                },
                unlocked: false,
                unlockRequirement: 'defeat_goblin_outpost'
            },
            {
                id: 'dragon_lair',
                name: "Dragon's Lair",
                description: 'Ancient cave filled with treasure and danger',
                travelDays: 7,
                difficulty: 'extreme',
                estimatedBattleMinutes: 15,
                rewards: {
                    gold: { min: 500, max: 1000 },
                    wood: { min: 100, max: 200 },
                    stone: { min: 80, max: 150 },
                    special: 'dragon_scales'
                },
                unlocked: false,
                unlockRequirement: 'defeat_bandit_stronghold'
            }
        ];
    }

    init() {
        // Quest manager is now modal-based, no need for view-specific setup
        try {
            this.checkExpeditionProgress();
        } catch (err) {
            console.warn('[QuestManager] Error during initialization:', err);
        }
    }

    startExpedition(locationId) {
        const location = this.availableLocations.find(l => l.id === locationId);
        if (!location || this.currentExpedition) return;

        // Check if army is available (not already on expedition)
        if (this.expeditionState !== 'none') {
            window.showNotification('Army is already on an expedition!', { timeout: 3000, icon: '⚠️' });
            return;
        }

        // Start the expedition
        this.currentExpedition = {
            location: location,
            startTime: Date.now(),
            phase: 'traveling_out',
            travelProgress: 0,
            supplies: this.calculateInitialSupplies(),
            events: [],
            armyMorale: 100
        };

        this.expeditionState = 'traveling_out';
        this.expeditionStartTime = Date.now();

        // Start village time progression
        this.gameState.startExpeditionTimeFlow();

        window.showNotification(
            `🚶 Army departs for ${location.name}! Travel time: ${location.travelDays} days each way.`,
            { timeout: 5000, icon: '🗺️' }
        );

        // Switch to travel view automatically
        // Note: Now using modal system instead of switching views
        if (window.modalSystem) {
            window.modalSystem.showQuestMenu(this);
        }
        this.startTravelEvents();
    }

    renderTravelView() {
        const questView = document.getElementById('quest-view');
        if (!questView || !this.currentExpedition) return;

        const totalTravelTime = this.currentExpedition.location.travelDays * 24 * 60 * 1000; // Convert days to ms
        const elapsed = Date.now() - this.expeditionStartTime;
        const progress = Math.min(elapsed / totalTravelTime, 1);

        questView.innerHTML = `
            <div class="travel-screen">
                <h2>🚶 Traveling to ${this.currentExpedition.location.name}</h2>
                
                <div class="travel-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress * 100}%"></div>
                    </div>
                    <p>Progress: ${Math.floor(progress * 100)}% - ${Math.floor((1 - progress) * this.currentExpedition.location.travelDays)} days remaining</p>
                </div>

                <div class="army-status">
                    <h3>Army Status</h3>
                    <div class="status-grid">
                        <div>🥖 Supplies: ${this.currentExpedition.supplies.food}</div>
                        <div>💊 Medicine: ${this.currentExpedition.supplies.medicine}</div>
                        <div>😊 Morale: ${this.currentExpedition.armyMorale}%</div>
                        <div>👥 Army Size: ${this.gameState.army.length}</div>
                    </div>
                </div>

                <div class="travel-events">
                    <h3>Journey Log</h3>
                    <div class="event-log" id="travel-event-log">
                        ${this.currentExpedition.events.map(event => 
                            `<div class="travel-event ${event.type}">
                                <span class="event-time">${event.time}</span>
                                <span class="event-text">${event.text}</span>
                            </div>`
                        ).join('')}
                    </div>
                </div>

                <div class="travel-actions">
                    <button id="rest-army-btn">🏕️ Rest Army (Restore Morale)</button>
                    <button id="force-march-btn">⚡ Force March (Faster Travel)</button>
                    <button id="hunt-for-food-btn">🏹 Hunt for Food</button>
                </div>
            </div>
        `;

        this.setupTravelActions();
    }

    setupTravelActions() {
        const restBtn = document.getElementById('rest-army-btn');
        const marchBtn = document.getElementById('force-march-btn');
        const huntBtn = document.getElementById('hunt-for-food-btn');

        if (restBtn) {
            restBtn.addEventListener('click', () => this.restArmy());
        }
        if (marchBtn) {
            marchBtn.addEventListener('click', () => this.forceMarch());
        }
        if (huntBtn) {
            huntBtn.addEventListener('click', () => this.huntForFood());
        }
    }

    startTravelEvents() {
        // Generate random travel events
        const eventInterval = setInterval(() => {
            if (this.expeditionState !== 'traveling_out' && this.expeditionState !== 'traveling_back') {
                clearInterval(eventInterval);
                return;
            }

            if (Math.random() < 0.3) { // 30% chance of event each interval
                this.generateTravelEvent();
            }

            this.updateTravelProgress();
        }, 10000); // Check every 10 seconds for events
    }

    generateTravelEvent() {
        const events = [
            {
                type: 'neutral',
                text: 'The army makes good progress along the winding path.',
                effect: null
            },
            {
                type: 'positive',
                text: 'Scouts discover a shortcut through the forest!',
                effect: () => this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) + 0.1
            },
            {
                type: 'negative',
                text: 'Heavy rain slows the march. Morale decreases.',
                effect: () => {
                    this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 10);
                    this.currentExpedition.supplies.food = Math.max(0, this.currentExpedition.supplies.food - 2);
                }
            },
            {
                type: 'challenge',
                text: 'A river blocks the path. Do you build a raft or find a ford?',
                effect: () => this.presentTravelChoice('river_crossing')
            },
            {
                type: 'positive',
                text: 'Friendly merchants share supplies with your army!',
                effect: () => {
                    this.currentExpedition.supplies.food += 5;
                    this.currentExpedition.supplies.medicine += 2;
                }
            },
            {
                type: 'negative',
                text: 'A soldier falls ill. Medicine supplies are used.',
                effect: () => {
                    this.currentExpedition.supplies.medicine = Math.max(0, this.currentExpedition.supplies.medicine - 3);
                    if (this.currentExpedition.supplies.medicine === 0) {
                        this.currentExpedition.armyMorale -= 15;
                    }
                }
            }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        const eventTime = new Date().toLocaleTimeString();
        
        this.currentExpedition.events.push({
            ...event,
            time: eventTime
        });

        if (event.effect) {
            event.effect();
        }

        // Refresh travel view to show new event
        if (this.game.currentView === 'quest') {
            this.renderTravelView();
        }

        // Show notification
        window.showNotification(event.text, { 
            timeout: 4000, 
            icon: event.type === 'positive' ? '✅' : event.type === 'negative' ? '⚠️' : '📰'
        });
    }

    calculateInitialSupplies() {
        const armySize = this.gameState.army.length;
        const travelDays = this.currentExpedition.location.travelDays * 2; // Round trip
        
        return {
            food: Math.max(20, armySize * travelDays * 2),
            medicine: Math.max(10, Math.floor(armySize / 2)),
            ammunition: armySize * 10
        };
    }

    restArmy() {
        if (this.currentExpedition.supplies.food >= 5) {
            this.currentExpedition.supplies.food -= 5;
            this.currentExpedition.armyMorale = Math.min(100, this.currentExpedition.armyMorale + 20);
            
            this.currentExpedition.events.push({
                type: 'positive',
                text: 'Army rests and shares a meal. Morale improves!',
                time: new Date().toLocaleTimeString()
            });
            
            this.renderTravelView();
            window.showNotification('Army morale improved!', { timeout: 3000, icon: '😊' });
        } else {
            window.showNotification('Not enough food supplies to rest!', { timeout: 3000, icon: '⚠️' });
        }
    }

    forceMarch() {
        this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 15);
        this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) + 0.15;
        
        this.currentExpedition.events.push({
            type: 'negative',
            text: 'Forced march increases pace but exhausts the troops.',
            time: new Date().toLocaleTimeString()
        });
        
        this.renderTravelView();
        window.showNotification('March pace increased!', { timeout: 3000, icon: '⚡' });
    }

    huntForFood() {
        const huntSuccess = Math.random() < 0.6; // 60% success rate
        
        if (huntSuccess) {
            const foodGained = 3 + Math.floor(Math.random() * 5);
            this.currentExpedition.supplies.food += foodGained;
            
            this.currentExpedition.events.push({
                type: 'positive',
                text: `Successful hunt! Gained ${foodGained} food supplies.`,
                time: new Date().toLocaleTimeString()
            });
            
            window.showNotification(`Hunt successful! +${foodGained} food`, { timeout: 3000, icon: '🏹' });
        } else {
            this.currentExpedition.events.push({
                type: 'neutral',
                text: 'Hunt was unsuccessful. No game found in this area.',
                time: new Date().toLocaleTimeString()
            });
            
            window.showNotification('Hunt failed - no game found', { timeout: 3000, icon: '🚫' });
        }
        
        this.renderTravelView();
    }

    updateTravelProgress() {
        if (!this.currentExpedition) return;

        const totalTravelTime = this.currentExpedition.location.travelDays * 24 * 60 * 1000; // ms
        const travelBonus = this.currentExpedition.travelBonus || 0;
        const adjustedTravelTime = totalTravelTime * (1 - travelBonus);
        
        const elapsed = Date.now() - this.expeditionStartTime;
        
        if (this.expeditionState === 'traveling_out' && elapsed >= adjustedTravelTime) {
            this.arriveAtBattleLocation();
        } else if (this.expeditionState === 'traveling_back' && elapsed >= adjustedTravelTime * 2) {
            this.completeExpedition();
        }
    }

    arriveAtBattleLocation() {
        this.expeditionState = 'battling';
        
        window.showNotification(
            `⚔️ Army arrives at ${this.currentExpedition.location.name}! Battle begins!`,
            { timeout: 5000, icon: '🏰' }
        );

        // Switch to battle view and start the battle
        this.game.switchView('battle');
        this.game.battleManager.startExpeditionBattle(this.currentExpedition.location);
    }

    startReturnJourney(defeated = false) {
        this.expeditionState = 'traveling_back';
        this.expeditionStartTime = Date.now(); // Reset timer for return journey
        
        if (defeated) {
            window.showNotification(
                `🏠 Army retreats from ${this.currentExpedition.location.name}, returning home with what they can carry...`,
                { timeout: 5000, icon: '💀' }
            );
        } else {
            window.showNotification(
                `🏠 Army begins the journey home from ${this.currentExpedition.location.name}`,
                { timeout: 4000, icon: '🚶' }
            );
        }

        // Switch back to quest view for return journey
        // Note: Now using modal system instead of switching views
        if (window.modalSystem) {
            window.modalSystem.showQuestMenu(this);
        }
    }

    renderReturnTravelView() {
        // Similar to renderTravelView but for return journey
        const questView = document.getElementById('quest-view');
        if (!questView) return;

        questView.innerHTML = `
            <div class="travel-screen return-journey">
                <h2>🏠 Returning from ${this.currentExpedition.location.name}</h2>
                <p>The army carries their hard-won spoils back to the village...</p>
                
                <div class="return-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 50%"></div>
                    </div>
                    <p>Return Journey: ${this.currentExpedition.location.travelDays} days</p>
                </div>

                <div class="spoils-preview">
                    <h3>📦 Spoils of War</h3>
                    <p>Your army returns victorious with valuable resources!</p>
                </div>
            </div>
        `;
    }

    completeExpedition() {
        if (!this.currentExpedition) return;

        const location = this.currentExpedition.location;
        const rewards = this.calculateExpeditionRewards(location);
        
        // Apply rewards to game state
        Object.keys(rewards).forEach(resource => {
            if (this.gameState.resources[resource] !== undefined) {
                this.gameState.resources[resource] += rewards[resource];
            } else if (resource === 'gold') {
                this.gameState.gold += rewards[resource];
            }
        });

        // Stop expedition time flow
        this.gameState.stopExpeditionTimeFlow();

        // Show completion notification
        window.showNotification(
            `🎉 Expedition Complete! Army returns with valuable spoils!`,
            { timeout: 6000, icon: '🏆' }
        );

        // Reset expedition state
        this.currentExpedition = null;
        this.expeditionState = 'none';
        this.expeditionStartTime = null;

        // Return to village view
        this.game.switchView('village');
        
        // Show rewards summary
        this.showExpeditionSummary(location, rewards);
    }

    calculateExpeditionRewards(location) {
        const rewards = {};
        
        Object.keys(location.rewards).forEach(resource => {
            if (resource === 'special') return; // Handle special rewards separately
            
            const min = location.rewards[resource].min;
            const max = location.rewards[resource].max;
            rewards[resource] = min + Math.floor(Math.random() * (max - min + 1));
        });

        return rewards;
    }

    showExpeditionSummary(location, rewards) {
        const summaryHTML = `
            <div class="expedition-summary">
                <h3>🏆 Expedition to ${location.name} Complete!</h3>
                <div class="rewards-earned">
                    <h4>Rewards Earned:</h4>
                    ${Object.keys(rewards).map(resource => 
                        `<div>+${rewards[resource]} ${resource}</div>`
                    ).join('')}
                </div>
            </div>
        `;
        
        // Could show this in a modal or notification
        window.showNotification(summaryHTML, { timeout: 8000, icon: '🎁' });
    }

    checkExpeditionProgress() {
        // Called regularly to update expedition state
        if (this.currentExpedition) {
            this.updateTravelProgress();
        }
    }

    calculateExpeditionProgress() {
        if (!this.currentExpedition) return 0;
        
        const totalTravelTime = this.currentExpedition.location.travelDays * 24 * 60 * 1000; // ms
        const travelBonus = this.currentExpedition.travelBonus || 0;
        const adjustedTravelTime = totalTravelTime * (1 - travelBonus);
        
        const elapsed = Date.now() - this.expeditionStartTime;
        
        if (this.expeditionState === 'traveling_out') {
            return Math.min((elapsed / adjustedTravelTime) * 50, 50); // 0-50% for outbound travel
        } else if (this.expeditionState === 'battling') {
            return 50; // 50% during battle
        } else if (this.expeditionState === 'traveling_back') {
            const returnProgress = Math.min((elapsed / adjustedTravelTime) * 50, 50);
            return 50 + returnProgress; // 50-100% for return travel
        }
        
        return 0;
    }
}

// Make available globally
window.QuestManager = QuestManager;

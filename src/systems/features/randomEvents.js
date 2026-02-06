/**
 * randomEvents.js - Random Events System
 * 
 * Adds variety to the game loop with random daily events.
 * Events can be positive, negative, or neutral with choices.
 */

class RandomEventSystem {
    constructor(gameState) {
        this.gameState = gameState;
        // Stellaris-style: Rare, impactful events that pause the game
        this.eventChance = 0.05; // 5% chance per day (reduced from 15%)
        this.lastEventDay = 0;
        this.minDaysBetweenEvents = 7; // Minimum 7 days between events (was 3)
        this.eventHistory = [];
        this.pendingEvent = null; // Event waiting for player decision
        
        console.log('[RandomEvents] Stellaris-style event system initialized');
    }

    /**
     * Check and possibly trigger a random event at end of day.
     * Called from gameState.endDay()
     */
    checkForEvent() {
        // Don't trigger events during tutorial
        if (localStorage.getItem('tutorialComplete') !== 'true') {
            console.log('[RandomEvents] Tutorial not complete, skipping events');
            return null;
        }
        
        // Don't trigger events in early game (first 5 days)
        if (this.gameState.day < 5) return null;
        
        // Enforce minimum gap between events
        if (this.gameState.day - this.lastEventDay < this.minDaysBetweenEvents) return null;
        
        // Roll for event
        if (Math.random() > this.eventChance) return null;
        
        // Pick and trigger an event
        const event = this.selectEvent();
        if (event) {
            this.triggerEvent(event);
            this.lastEventDay = this.gameState.day;
        }
        
        return event;
    }

    /**
     * Select an appropriate event based on current game state.
     */
    selectEvent() {
        const events = this.getAvailableEvents();
        if (events.length === 0) return null;
        
        // Weight events by their probability
        const totalWeight = events.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;
        
        for (const event of events) {
            roll -= (event.weight || 1);
            if (roll <= 0) return event;
        }
        
        return events[0];
    }

    /**
     * Get all events that are valid for the current game state.
     */
    getAvailableEvents() {
        const pop = this.gameState.populationManager?.getAll()?.length || this.gameState.population || 0;
        const day = this.gameState.day;
        const season = this.gameState.season;
        const food = this.gameState.resources?.food || 0;
        const gold = this.gameState.gold || 0;
        const buildings = this.gameState.buildings || [];
        
        const hasMarket = buildings.some(b => b.type === 'market');
        const hasFarm = buildings.some(b => b.type === 'farm');
        const hasBarracks = buildings.some(b => b.type === 'barracks');
        
        const events = [];
        
        // === POSITIVE EVENTS ===
        
        // Wandering Merchant (needs gold, market preferred)
        if (gold >= 20) {
            events.push({
                id: 'wandering_merchant',
                title: '🏪 Wandering Merchant',
                description: 'A traveling merchant has arrived with rare goods!',
                weight: hasMarket ? 2 : 1,
                choices: [
                    { 
                        text: 'Buy supplies (20💰 → 50🍖 + 30🪵)',
                        cost: { gold: 20 },
                        reward: { food: 50, wood: 30 },
                        message: 'The merchant is pleased with the trade!'
                    },
                    {
                        text: 'Buy tools (30💰 → 10🔧)',
                        cost: { gold: 30 },
                        reward: { tools: 10 },
                        message: 'Quality tools will help your workers!'
                    },
                    {
                        text: 'Send them away',
                        message: 'The merchant moves on to the next village.'
                    }
                ]
            });
        }
        
        // Refugee Family (needs housing capacity)
        const popCap = this.gameState.getPopulationCap?.() || 10;
        if (pop < popCap - 2 && pop >= 5) {
            events.push({
                id: 'refugee_family',
                title: 'Refugee Family',
                description: 'A family fleeing hardship seeks shelter in your village.',
                weight: 1.5,
                choices: [
                    {
                        text: 'Welcome them',
                        reward: { population: 3 },
                        message: 'The family is grateful for your kindness! (+3 population)'
                    },
                    {
                        text: 'Offer supplies and directions',
                        cost: { food: 20 },
                        message: 'They thank you and continue their journey.'
                    },
                    {
                        text: 'Turn them away',
                        message: 'The family moves on sadly.'
                    }
                ]
            });
        }
        
        // Bountiful Harvest (spring/summer, has farm)
        if ((season === 'Spring' || season === 'Summer') && hasFarm) {
            events.push({
                id: 'bountiful_harvest',
                title: '🌾 Bountiful Harvest!',
                description: 'Your farmers report an exceptional yield this season!',
                weight: 1,
                autoReward: { food: Math.floor(30 + pop * 2) },
                message: 'The village celebrates the abundance!'
            });
        }
        
        // Skilled Craftsman (mid-game)
        if (day >= 20 && pop >= 8) {
            events.push({
                id: 'skilled_craftsman',
                title: '🔨 Skilled Craftsman',
                description: 'A master craftsman offers to teach your workers.',
                weight: 0.8,
                choices: [
                    {
                        text: 'Pay for training (50💰)',
                        cost: { gold: 50 },
                        reward: { production: 25, tools: 5 },
                        message: 'Your workers learned valuable techniques!'
                    },
                    {
                        text: 'Decline politely',
                        message: 'The craftsman wishes you well and departs.'
                    }
                ]
            });
        }
        
        // === NEGATIVE EVENTS ===
        
        // Harsh Weather (winter)
        if (season === 'Winter' && food >= 20) {
            events.push({
                id: 'harsh_winter',
                title: '❄️ Harsh Winter Storm',
                description: 'A severe blizzard threatens your food stores!',
                weight: 1.2,
                choices: [
                    {
                        text: 'Ration food carefully (-20🍖)',
                        cost: { food: 20 },
                        message: 'Your villagers endure the cold together.'
                    },
                    {
                        text: 'Use wood for extra heating (-15🪵, -10🍖)',
                        cost: { wood: 15, food: 10 },
                        message: 'The extra fires keep everyone warm.'
                    }
                ]
            });
        }
        
        // Bandit Scouts (mid-game, has resources)
        if (day >= 15 && (food >= 50 || gold >= 30)) {
            events.push({
                id: 'bandit_scouts',
                title: '⚔️ Bandit Scouts',
                description: 'Bandits have been spotted near your village!',
                weight: hasBarracks ? 0.5 : 1,
                choices: [
                    {
                        text: 'Pay them off (25💰)',
                        cost: { gold: 25 },
                        message: 'The bandits take the gold and leave... for now.'
                    },
                    {
                        text: 'Let villagers hide (lose some resources)',
                        cost: { food: Math.floor(food * 0.15), wood: Math.floor((this.gameState.resources?.wood || 0) * 0.1) },
                        message: 'The bandits steal what they can find and leave.'
                    },
                    ...(hasBarracks ? [{
                        text: 'Send guards to chase them off!',
                        reward: { gold: 15 },
                        message: 'Your soldiers drive them away and recover some loot!'
                    }] : [])
                ]
            });
        }
        
        // Sick Villager (has population)
        if (pop >= 6) {
            events.push({
                id: 'sick_villager',
                title: '🤒 Illness Outbreak',
                description: 'A villager has fallen ill and needs care.',
                weight: 0.8,
                choices: [
                    {
                        text: 'Provide care and rest (-10🍖)',
                        cost: { food: 10 },
                        message: 'With rest and good food, the villager recovers fully.'
                    },
                    {
                        text: 'Let them recover naturally',
                        message: 'The villager slowly recovers but others may have caught it...',
                        chance: { success: 0.7, fail: { population: -1 } }
                    }
                ]
            });
        }
        
        // === NEUTRAL EVENTS ===
        
        // Traveling Performer
        if (pop >= 10) {
            events.push({
                id: 'performer',
                title: '🎭 Traveling Performer',
                description: 'A bard offers to entertain your village for the evening.',
                weight: 0.7,
                choices: [
                    {
                        text: 'Host a feast! (-30🍖, +happiness)',
                        cost: { food: 30 },
                        reward: { happiness: 10 },
                        message: 'The villagers enjoy a wonderful evening of stories and song!'
                    },
                    {
                        text: 'Listen to their tales',
                        message: 'The performer shares news from distant lands before moving on.'
                    }
                ]
            });
        }
        
        // Ancient Ruins Discovery (later game)
        if (day >= 30 && Math.random() < 0.3) {
            events.push({
                id: 'ancient_ruins',
                title: '🏛️ Ancient Ruins Discovered',
                description: 'Scouts found ruins from an ancient civilization!',
                weight: 0.5,
                choices: [
                    {
                        text: 'Excavate carefully (takes time)',
                        reward: { stone: 40, gold: 20 },
                        message: 'Your workers recover valuable materials!'
                    },
                    {
                        text: 'Salvage quickly for building materials',
                        reward: { stone: 60, wood: 20 },
                        message: 'The stone will be useful for construction.'
                    },
                    {
                        text: 'Leave it undisturbed',
                        message: 'Some things are better left alone.'
                    }
                ]
            });
        }
        
        return events;
    }

    /**
     * Trigger an event and show the modal.
     * Pauses the game until player makes a decision (Stellaris-style).
     */
    triggerEvent(event) {
        console.log(`[RandomEvents] Triggering event: ${event.id}`);
        this.eventHistory.push({ id: event.id, day: this.gameState.day });
        this.pendingEvent = event;
        
        // Pause autoplay while event is active (Stellaris-style)
        if (this.gameState.autoPlayActive) {
            this.wasAutoPlaying = true;
            this.gameState.stopAutoPlay();
            console.log('[RandomEvents] Paused autoplay for event decision');
        } else {
            this.wasAutoPlaying = false;
        }
        
        // Auto-reward events (no choice needed)
        if (event.autoReward) {
            this.applyReward(event.autoReward);
            this.showEventNotification(event.title, event.message || event.description);
            this.pendingEvent = null;
            // Resume autoplay if it was active
            if (this.wasAutoPlaying) {
                setTimeout(() => this.gameState.startAutoPlay(), 500);
            }
            return;
        }
        
        // Events with choices - show modal (game stays paused)
        this.showEventModal(event);
    }

    /**
     * Show a simple notification for auto-events.
     */
    showEventNotification(title, message) {
        if (window.modalSystem?.showNotification) {
            window.modalSystem.showNotification(`${title}: ${message}`, { duration: 5000 });
        }
        console.log(`[RandomEvents] ${title}: ${message}`);
    }

    /**
     * Show an event modal with choices (Stellaris-style).
     * Game is paused until player decides.
     */
    showEventModal(event) {
        if (!window.modalSystem?.showModal) {
            console.warn('[RandomEvents] Modal system not available');
            return;
        }
        
        // Get event icon based on type/id
        const eventIcon = this.getEventIcon(event);
        
        let content = `<div class="random-event-modal stellaris-style">
            <div class="event-banner" style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:linear-gradient(135deg,#2c3e50,#34495e);border-radius:8px;border-left:4px solid #f39c12;">
                <span style="font-size:48px;">${eventIcon}</span>
                <div>
                    <div style="font-size:0.8em;color:#f39c12;text-transform:uppercase;letter-spacing:1px;">Event</div>
                    <div style="font-size:1.1em;color:#ecf0f1;">${event.title}</div>
                </div>
            </div>
            <div class="event-description" style="color:#bdc3c7;line-height:1.6;margin-bottom:20px;padding:0 4px;">${event.description}</div>
            <div class="event-choices" style="display:flex;flex-direction:column;gap:10px;">`;
        
        event.choices.forEach((choice, index) => {
            let costText = '';
            if (choice.cost) {
                const costs = Object.entries(choice.cost)
                    .map(([res, amt]) => `${amt} ${this.getResourceIcon(res)}`)
                    .join(', ');
                costText = `<span class="choice-cost">(${costs})</span>`;
            }
            
            let rewardText = '';
            if (choice.reward) {
                const rewards = Object.entries(choice.reward)
                    .filter(([, amt]) => amt > 0)
                    .map(([res, amt]) => `+${amt} ${this.getResourceIcon(res)}`)
                    .join(', ');
                if (rewards) rewardText = `<span class="choice-reward">${rewards}</span>`;
            }
            
            content += `
                <button class="event-choice-btn" data-choice="${index}" style="display:flex;flex-direction:column;align-items:flex-start;padding:12px 16px;background:#34495e;border:1px solid #4a6278;border-radius:8px;cursor:pointer;transition:all 0.2s;text-align:left;">
                    <span class="choice-text" style="color:#ecf0f1;font-weight:500;">${choice.text}</span>
                    <div style="display:flex;gap:12px;margin-top:6px;">
                        ${costText}
                        ${rewardText}
                    </div>
                </button>`;
        });
        
        content += `</div>
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid #4a6278;text-align:center;">
                <span style="color:#7f8c8d;font-size:0.85em;">⏸️ Game paused - Make your decision</span>
            </div>
        </div>`;
        
        window.modalSystem.showModal({
            title: `📜 ${event.title}`,
            content: content,
            customClass: 'random-event-modal-container stellaris-event',
            maxWidth: '500px',
            showCloseButton: false
        });
        
        // Attach click handlers after modal renders
        setTimeout(() => {
            document.querySelectorAll('.event-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const choiceIndex = parseInt(btn.dataset.choice);
                    this.handleChoice(event, event.choices[choiceIndex]);
                });
                // Hover effects
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = '#3d566e';
                    btn.style.borderColor = '#f39c12';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = '#34495e';
                    btn.style.borderColor = '#4a6278';
                });
            });
        }, 50);
    }

    /**
     * Get an icon for the event based on its type.
     */
    getEventIcon(event) {
        const iconMap = {
            refugee_family: '👨‍👩‍👧',
            wandering_merchant: '🛒',
            bumper_harvest: '🌾',
            skilled_visitor: '🎓',
            cold_snap: '❄️',
            bandit_raid: '⚔️',
            plague_rumor: '🦠',
            festival: '🎉',
            drought: '☀️',
            flood: '🌊'
        };
        return iconMap[event.id] || '📜';
    }

    /**
     * Handle a player's choice and resume game.
     */
    handleChoice(event, choice) {
        // Check if player can afford the cost
        if (choice.cost) {
            for (const [resource, amount] of Object.entries(choice.cost)) {
                if (resource === 'gold') {
                    if ((this.gameState.gold || 0) < amount) {
                        this.showEventNotification('Cannot Afford', 'You don\'t have enough resources!');
                        return;
                    }
                } else if ((this.gameState.resources?.[resource] || 0) < amount) {
                    this.showEventNotification('Cannot Afford', 'You don\'t have enough resources!');
                    return;
                }
            }
            // Deduct costs
            this.applyCost(choice.cost);
        }
        
        // Apply rewards
        if (choice.reward) {
            this.applyReward(choice.reward);
        }
        
        // Handle chance-based outcomes
        if (choice.chance) {
            if (Math.random() > choice.chance.success && choice.chance.fail) {
                this.applyReward(choice.chance.fail);
                this.showEventNotification(event.title, 'Things didn\'t go as planned...');
            }
        }
        
        // Close modal
        if (window.modalSystem?.closeModal) {
            window.modalSystem.closeModal();
        }
        
        // Clear pending event
        this.pendingEvent = null;
        
        // Resume autoplay if it was active before the event
        if (this.wasAutoPlaying) {
            console.log('[RandomEvents] Resuming autoplay after event decision');
            setTimeout(() => {
                if (this.gameState.startAutoPlay && !this.gameState.autoPlayActive) {
                    this.gameState.startAutoPlay();
                }
            }, 300);
        }
        
        // Show result message
        if (choice.message) {
            setTimeout(() => {
                this.showEventNotification(event.title, choice.message);
            }, 100);
        }
        
        // Update UI
        if (this.gameState.updateUI) {
            this.gameState.updateUI();
        }
    }

    /**
     * Apply a cost to the game state.
     */
    applyCost(cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            if (resource === 'gold') {
                this.gameState.gold = Math.max(0, (this.gameState.gold || 0) - amount);
            } else if (this.gameState.resources) {
                this.gameState.resources[resource] = Math.max(0, (this.gameState.resources[resource] || 0) - amount);
            }
        }
    }

    /**
     * Apply a reward to the game state (with storage cap enforcement).
     */
    applyReward(reward) {
        for (const [resource, amount] of Object.entries(reward)) {
            if (resource === 'gold') {
                // Cap gold at storage limit
                const currentGold = this.gameState.gold || 0;
                let goldCap = 999999;
                if (typeof window.GameData?.calculateSeasonalStorageCap === 'function') {
                    try { goldCap = window.GameData.calculateSeasonalStorageCap('gold', this.gameState.season, this.gameState.buildings); } catch(_) {}
                }
                const newGold = Math.min(currentGold + amount, goldCap);
                this.gameState.gold = newGold;
                if (newGold < currentGold + amount) {
                    console.log(`[RandomEvents] Gold capped at storage limit ${goldCap}`);
                }
            } else if (resource === 'population') {
                // Add refugees via population manager
                if (this.gameState.populationManager && amount > 0) {
                    for (let i = 0; i < amount; i++) {
                        const age = 20 + Math.floor(Math.random() * 30); // Working age refugee
                        this.gameState.populationManager.addInhabitant({
                            age: age,
                            role: 'peasant',
                            status: 'idle',
                            name: this.generateRefugeeName()
                        });
                    }
                }
            } else if (resource === 'happiness') {
                // TODO: Apply happiness bonus when happiness system exists
                console.log(`[RandomEvents] Happiness bonus: +${amount}`);
            } else if (this.gameState.resources) {
                // Cap at storage limit
                const current = this.gameState.resources[resource] || 0;
                let cap = 999999;
                if (typeof window.GameData?.calculateSeasonalStorageCap === 'function') {
                    try { cap = window.GameData.calculateSeasonalStorageCap(resource, this.gameState.season, this.gameState.buildings); } catch(_) {}
                }
                const newAmount = Math.min(current + amount, cap);
                this.gameState.resources[resource] = newAmount;
                if (newAmount < current + amount) {
                    console.log(`[RandomEvents] ${resource} capped at storage limit ${cap}`);
                }
            }
        }
    }

    generateRefugeeName() {
        const names = ['Ada', 'Bruno', 'Clara', 'Dmitri', 'Elena', 'Franz', 'Greta', 'Hans', 
                       'Ingrid', 'Josef', 'Katya', 'Leon', 'Marta', 'Nikolai', 'Olga', 'Pavel'];
        return names[Math.floor(Math.random() * names.length)];
    }

    getResourceIcon(resource) {
        const icons = {
            food: '🍖', wood: '🪵', stone: '🪨', gold: '💰', metal: '⛏️',
            planks: '📐', tools: '🔧', weapons: '⚔️', production: '⚙️',
            population: '👥', happiness: '😊'
        };
        return icons[resource] || resource;
    }
}

// Export to window
window.RandomEventSystem = RandomEventSystem;

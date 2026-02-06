// Enhanced Expedition system with Oregon Trail-style travel
class QuestManager {
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;
        this.currentExpedition = null;
        this.expeditionState = 'none'; // none, planning, traveling_out, battling, traveling_back
        this.expeditionStartTime = null;
        this.travelEvents = [];
        this.availableLocations = this.initializeLocations();
        this.expeditionTypes = ['military', 'scouting', 'trade', 'diplomatic'];
        this.pursuitChance = 0; // Chance of being pursued during retreat
        this.outposts = []; // Player established outposts
        this.knownLocations = new Set(); // Discovered but not yet explored locations

        // Initialize royal family expedition tracking
        this.royalExpeditionHistory = new Map(); // Track which royals have led expeditions
    }

    initializeLocations() {
        return [
            // Starting locations (close and easy)
            {
                id: 'goblin_outpost',
                name: 'Goblin Outpost',
                description: 'A small raiding camp controlling a forest crossroads',
                travelDays: 2,
                difficulty: 'easy',
                estimatedBattleMinutes: 3,
                type: 'military',
                terrain: 'forest',
                position: { row: 3, col: 4 },
                rewards: {
                    gold: { min: 50, max: 100 },
                    wood: { min: 20, max: 40 },
                    food: { min: 10, max: 25 }
                },
                unlocked: true,
                discovered: true,
                specialFeatures: ['timber_resources', 'strategic_crossroads']
            },
            {
                id: 'abandoned_farmstead',
                name: 'Abandoned Farmstead',
                description: 'An old farming settlement overrun by wildlife',
                travelDays: 1,
                difficulty: 'easy',
                estimatedBattleMinutes: 2,
                type: 'exploration',
                terrain: 'plains',
                position: { row: 2, col: 3 },
                rewards: {
                    food: { min: 30, max: 60 },
                    wood: { min: 15, max: 30 },
                    population: { min: 1, max: 3 } // Refugees who might join
                },
                unlocked: true,
                discovered: true,
                specialFeatures: ['fertile_land', 'potential_settlement_site']
            },

            // Medium difficulty locations
            {
                id: 'bandit_stronghold',
                name: 'Bandit Stronghold',
                description: 'A fortified camp controlling vital trade routes',
                travelDays: 4,
                difficulty: 'medium',
                estimatedBattleMinutes: 8,
                type: 'military',
                terrain: 'hills',
                position: { row: 5, col: 6 },
                rewards: {
                    gold: { min: 150, max: 300 },
                    wood: { min: 40, max: 80 },
                    stone: { min: 20, max: 40 },
                    special: 'trade_route_control'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'defeat_goblin_outpost',
                specialFeatures: ['stone_quarry', 'trade_route_access', 'defensive_position']
            },
            {
                id: 'ancient_ruins',
                name: 'Ancient Ruins',
                description: 'Mysterious stone structures hiding forgotten knowledge',
                travelDays: 3,
                difficulty: 'medium',
                estimatedBattleMinutes: 5,
                type: 'exploration',
                terrain: 'ruins',
                position: { row: 4, col: 7 },
                rewards: {
                    gold: { min: 100, max: 200 },
                    stone: { min: 50, max: 100 },
                    special: 'ancient_knowledge'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'explore_3_locations',
                specialFeatures: ['magical_artifacts', 'historical_significance', 'research_potential']
            },
            {
                id: 'ore_mines',
                name: 'Abandoned Ore Mines',
                description: 'Rich mineral deposits guarded by dangerous creatures',
                travelDays: 5,
                difficulty: 'medium',
                estimatedBattleMinutes: 6,
                type: 'resource',
                terrain: 'mountains',
                position: { row: 6, col: 5 },
                rewards: {
                    gold: { min: 200, max: 400 },
                    stone: { min: 60, max: 120 },
                    special: 'metal_resources'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'build_3_buildings',
                specialFeatures: ['rich_ore_veins', 'mining_equipment', 'potential_outpost_site']
            },

            // Hard difficulty locations
            {
                id: 'orc_fortress',
                name: 'Orc Fortress',
                description: 'A massive fortification housing a war tribe',
                travelDays: 6,
                difficulty: 'hard',
                estimatedBattleMinutes: 12,
                type: 'military',
                terrain: 'mountains',
                position: { row: 7, col: 8 },
                rewards: {
                    gold: { min: 300, max: 600 },
                    stone: { min: 80, max: 160 },
                    wood: { min: 60, max: 120 },
                    special: 'fortress_blueprints'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'defeat_bandit_stronghold',
                specialFeatures: ['military_engineering', 'strategic_position', 'war_machines']
            },
            {
                id: 'enchanted_grove',
                name: 'Enchanted Grove',
                description: 'A magical forest protected by ancient guardians',
                travelDays: 4,
                difficulty: 'hard',
                estimatedBattleMinutes: 10,
                type: 'diplomatic',
                terrain: 'enchanted_forest',
                position: { row: 3, col: 8 },
                rewards: {
                    food: { min: 100, max: 200 },
                    wood: { min: 150, max: 300 },
                    special: 'nature_magic'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'population_50',
                specialFeatures: ['magical_properties', 'renewable_resources', 'diplomatic_opportunity']
            },

            // Extreme difficulty locations
            {
                id: 'dragon_lair',
                name: "Dragon's Lair",
                description: 'Ancient cave filled with treasure and guarded by a mighty dragon',
                travelDays: 8,
                difficulty: 'extreme',
                estimatedBattleMinutes: 20,
                type: 'legendary',
                terrain: 'volcanic',
                position: { row: 9, col: 9 },
                rewards: {
                    gold: { min: 1000, max: 2000 },
                    wood: { min: 200, max: 400 },
                    stone: { min: 150, max: 300 },
                    special: 'dragon_scales'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'defeat_orc_fortress',
                specialFeatures: ['legendary_treasure', 'dragon_magic', 'ultimate_challenge']
            },
            {
                id: 'lost_city',
                name: 'Lost City of Valdris',
                description: 'A forgotten civilization holding secrets of the ancient world',
                travelDays: 10,
                difficulty: 'extreme',
                estimatedBattleMinutes: 25,
                type: 'exploration',
                terrain: 'desert',
                position: { row: 8, col: 2 },
                rewards: {
                    gold: { min: 800, max: 1500 },
                    stone: { min: 200, max: 400 },
                    population: { min: 10, max: 20 },
                    special: 'ancient_technology'
                },
                unlocked: false,
                discovered: false,
                unlockRequirement: 'complete_5_expeditions',
                specialFeatures: ['lost_knowledge', 'advanced_technology', 'settlement_potential']
            }
        ];
    }

    init() {
        // Enhanced expedition system initialization
        try {
            this.checkExpeditionProgress();
            this.updateLocationAvailability();
            this.initializeExpeditionUnlocks();
        } catch (err) {
            console.warn('[QuestManager] Error during initialization:', err);
        }
    }

    // Check if expeditions are unlocked (requires Military Establishment achievement)
    areExpeditionsUnlocked() {
        if (!this.gameState.achievements) return false;
        return this.gameState.achievements.isUnlocked('military_establishment') &&
            this.gameState.buildings.some(b => b.type === 'barracks');
    }

    // Get available royal family members for expedition leadership
    getAvailableRoyalLeaders() {
        if (!this.gameState.populationManager) return [];

        const royals = [];

        // Add monarch if available
        if (this.gameState.monarch && !this.gameState.monarch.onExpedition) {
            royals.push({
                id: 'monarch',
                name: this.gameState.monarch.name,
                type: 'monarch',
                leadership: this.gameState.monarch.stats?.leadership || 70,
                experience: this.gameState.monarch.expeditionExperience || 0,
                available: true
            });
        }

        // Add heirs if available
        if (this.gameState.populationManager.royalFamily) {
            this.gameState.populationManager.royalFamily.forEach(heir => {
                if (heir.age >= 16 && !heir.onExpedition && heir.status !== 'dead') {
                    royals.push({
                        id: heir.id,
                        name: heir.name,
                        type: 'heir',
                        leadership: heir.stats?.leadership || 50,
                        experience: heir.expeditionExperience || 0,
                        available: true
                    });
                }
            });
        }

        return royals;
    }

    // Enhanced expedition planning with royal leadership and supply requirements
    planExpedition(locationId) {
        if (!this.areExpeditionsUnlocked()) {
            window.showNotification(
                'Expeditions require a Barracks and the Military Establishment achievement!',
                { timeout: 4000, icon: '⚠️' }
            );
            return false;
        }

        const location = this.availableLocations.find(l => l.id === locationId);
        if (!location || !location.unlocked) {
            window.showNotification('Location not available for expedition!', { timeout: 3000, icon: '⚠️' });
            return false;
        }

        const availableRoyals = this.getAvailableRoyalLeaders();
        if (availableRoyals.length === 0) {
            window.showNotification(
                'No royal family members available to lead the expedition!',
                { timeout: 4000, icon: '👑' }
            );
            return false;
        }

        // Show expedition planning modal
        this.showExpeditionPlanningModal(location, availableRoyals);
        return true;
    }

    // Show detailed expedition planning interface
    showExpeditionPlanningModal(location, availableRoyals) {
        const requiredSupplies = this.calculateRequiredSupplies(location);
        const availableSupplies = this.getAvailableSupplies();
        const armySize = this.gameState.army?.length || 0;

        const planningHTML = `
            <div class="expedition-planning">
                <h3>🗺️ Expedition to ${location.name}</h3>
                <p class="location-description">${location.description}</p>
                
                <div class="expedition-details">
                    <div class="detail-section">
                        <h4>📍 Location Details</h4>
                        <div class="detail-grid">
                            <div>🚶 Travel Time: ${location.travelDays} days each way</div>
                            <div>⚔️ Difficulty: ${location.difficulty}</div>
                            <div>🌍 Terrain: ${location.terrain}</div>
                            <div>🎯 Type: ${location.type}</div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>👑 Select Expedition Leader</h4>
                        <div class="royal-selection">
                            ${availableRoyals.map(royal => `
                                <div class="royal-option">
                                    <input type="radio" name="expedition-leader" value="${royal.id}" id="leader-${royal.id}">
                                    <label for="leader-${royal.id}">
                                        <div class="royal-info">
                                            <span class="royal-name">${royal.name}</span>
                                            <span class="royal-type">(${royal.type})</span>
                                            <div class="royal-stats">
                                                <span>👥 Leadership: ${royal.leadership}</span>
                                                <span>🏆 Experience: ${royal.experience}</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>⚔️ Army Composition</h4>
                        <div class="army-info">
                            <p>Available Army Size: ${armySize} soldiers</p>
                            <p>Recommended for ${location.difficulty} difficulty: ${this.getRecommendedArmySize(location.difficulty)} soldiers</p>
                            ${armySize < this.getRecommendedArmySize(location.difficulty) ?
                '<p class="warning">⚠️ Army size below recommended - high risk of failure!</p>' :
                '<p class="success">✅ Army size adequate for mission</p>'
            }
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>📦 Supply Requirements</h4>
                        <div class="supply-grid">
                            ${Object.keys(requiredSupplies).map(supply => `
                                <div class="supply-item ${availableSupplies[supply] >= requiredSupplies[supply] ? 'sufficient' : 'insufficient'}">
                                    <span class="supply-icon">${this.getSupplyIcon(supply)}</span>
                                    <span class="supply-name">${supply}</span>
                                    <span class="supply-amounts">
                                        ${availableSupplies[supply]}/${requiredSupplies[supply]}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>🎁 Potential Rewards</h4>
                        <div class="rewards-preview">
                            ${Object.keys(location.rewards).map(resource => {
                if (resource === 'special') return `<div>✨ Special: ${location.rewards[resource]}</div>`;
                return `<div>${this.getSupplyIcon(resource)} ${resource}: ${location.rewards[resource].min}-${location.rewards[resource].max}</div>`;
            }).join('')}
                        </div>
                    </div>
                </div>

                <div class="expedition-actions">
                    <button id="confirm-expedition-btn" class="action-btn primary" 
                            ${this.canStartExpedition(location, availableSupplies, requiredSupplies) ? '' : 'disabled'}>
                        🚀 Launch Expedition
                    </button>
                    <button id="cancel-expedition-btn" class="action-btn secondary">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        `;

        if (window.modalSystem) {
            const modalId = window.modalSystem.showModal({
                title: 'Plan Expedition',
                content: planningHTML,
                width: '700px',
                height: '600px'
            });

            // Setup event handlers
            document.getElementById('confirm-expedition-btn').addEventListener('click', () => {
                const selectedLeader = document.querySelector('input[name="expedition-leader"]:checked');
                if (selectedLeader) {
                    this.startExpedition(location.id, selectedLeader.value);
                    window.modalSystem.closeModal(modalId);
                } else {
                    window.showNotification('Please select an expedition leader!', { timeout: 3000, icon: '⚠️' });
                }
            });

            document.getElementById('cancel-expedition-btn').addEventListener('click', () => {
                window.modalSystem.closeModal(modalId);
            });
        }
    }

    // Calculate required supplies based on location and army size
    calculateRequiredSupplies(location) {
        const armySize = Math.max(this.gameState.army?.length || 0, 5); // Minimum 5 for expedition
        const totalDays = location.travelDays * 2 + 2; // Round trip + buffer

        return {
            food: armySize * totalDays * 2,
            medicine: Math.max(10, Math.floor(armySize / 3)),
            equipment: armySize * 2,
            gold: Math.max(50, armySize * 10) // Emergency funds
        };
    }

    // Get available supplies from inventory and resources
    getAvailableSupplies() {
        return {
            food: this.gameState.resources.food || 0,
            medicine: this.gameState.inventory?.getMedicineCount() || 0,
            equipment: this.gameState.inventory?.getEquipmentCount() || 0,
            gold: this.gameState.gold || 0
        };
    }

    // Check if expedition can be started with current resources
    canStartExpedition(location, availableSupplies, requiredSupplies) {
        return Object.keys(requiredSupplies).every(supply =>
            availableSupplies[supply] >= requiredSupplies[supply]
        ) && (this.gameState.army?.length || 0) >= this.getRecommendedArmySize(location.difficulty) / 2;
    }

    // Get recommended army size for difficulty
    getRecommendedArmySize(difficulty) {
        const sizes = {
            'easy': 5,
            'medium': 10,
            'hard': 15,
            'extreme': 25
        };
        return sizes[difficulty] || 10;
    }

    // Get icon for supply type
    getSupplyIcon(supply) {
        const icons = {
            food: '🥖',
            medicine: '💊',
            equipment: '⚔️',
            gold: '🪙',
            wood: '🪵',
            stone: '🪨',
            population: '👥'
        };
        return icons[supply] || '📦';
    }

    startExpedition(locationId, leaderId = null) {
        const location = this.availableLocations.find(l => l.id === locationId);
        if (!location || this.currentExpedition) return;

        // Check if expeditions are unlocked
        if (!this.areExpeditionsUnlocked()) {
            window.showNotification(
                'Expeditions require a Barracks and the Military Establishment achievement!',
                { timeout: 4000, icon: '⚠️' }
            );
            return;
        }

        // Check if army is available (not already on expedition)
        if (this.expeditionState !== 'none') {
            window.showNotification('Army is already on an expedition!', { timeout: 3000, icon: '⚠️' });
            return;
        }

        // Get expedition leader
        let expeditionLeader = null;
        if (leaderId) {
            const availableRoyals = this.getAvailableRoyalLeaders();
            expeditionLeader = availableRoyals.find(r => r.id === leaderId);
            if (!expeditionLeader) {
                window.showNotification('Selected royal leader is not available!', { timeout: 3000, icon: '👑' });
                return;
            }
        }

        // Calculate and consume supplies
        const requiredSupplies = this.calculateRequiredSupplies(location);
        const availableSupplies = this.getAvailableSupplies();

        // Check if we have enough supplies
        if (!this.canStartExpedition(location, availableSupplies, requiredSupplies)) {
            window.showNotification('Insufficient supplies for expedition!', { timeout: 3000, icon: '📦' });
            return;
        }

        // Consume supplies
        this.consumeExpeditionSupplies(requiredSupplies);

        // Mark royal leader as on expedition
        if (expeditionLeader) {
            this.markRoyalOnExpedition(expeditionLeader.id, true);
        }

        // Create enhanced expedition object
        this.currentExpedition = {
            location: location,
            leader: expeditionLeader,
            startTime: Date.now(),
            phase: 'traveling_out',
            travelProgress: 0,
            supplies: this.calculateInitialSupplies(location),
            events: [],
            armyMorale: 100,
            loyaltyBonus: expeditionLeader ? this.calculateLeadershipBonus(expeditionLeader) : 0,
            weather: this.generateWeather(),
            terrainChallenges: this.generateTerrainChallenges(location.terrain),
            pursuitRisk: 0,
            daysOnRoad: 0,
            inventoryItems: this.getExpeditionInventory(), // Items brought from home
            discoveredLocations: [], // New locations found during travel
            casualties: 0,
            desertions: 0
        };

        this.expeditionState = 'traveling_out';
        this.expeditionStartTime = Date.now();

        // Notify systems of expedition start
        try { window.eventBus && window.eventBus.emit('expedition_started', { location, leader: expeditionLeader }); } catch (_) { }

        // Start village time progression
        this.gameState.startExpeditionTimeFlow();

        // Update statistics
        this.updateExpeditionStats();

        window.showNotification(
            `🚶 ${expeditionLeader ? expeditionLeader.name : 'Army'} departs for ${location.name}! Travel time: ${location.travelDays} days each way.`,
            { timeout: 5000, icon: '🗺️' }
        );

        // Switch to expedition view
        if (window.modalSystem) {
            window.modalSystem.showQuestMenu(this);
        }
        this.startTravelEvents();
    }

    // Consume supplies for expedition
    consumeExpeditionSupplies(requiredSupplies) {
        // Consume food from resources
        this.gameState.resources.food = Math.max(0, this.gameState.resources.food - requiredSupplies.food);

        // Consume gold
        this.gameState.gold = Math.max(0, this.gameState.gold - requiredSupplies.gold);

        // Consume medicine and equipment from inventory if available
        if (this.gameState.inventory) {
            this.gameState.inventory.consumeMedicine(requiredSupplies.medicine);
            this.gameState.inventory.consumeEquipment(requiredSupplies.equipment);
        }
    }

    // Mark royal family member as on expedition
    markRoyalOnExpedition(royalId, onExpedition) {
        if (royalId === 'monarch' && this.gameState.monarch) {
            this.gameState.monarch.onExpedition = onExpedition;
        } else if (this.gameState.populationManager?.royalFamily) {
            const heir = this.gameState.populationManager.royalFamily.find(h => h.id === royalId);
            if (heir) {
                heir.onExpedition = onExpedition;
            }
        }
    }

    // Calculate leadership bonus from expedition leader
    calculateLeadershipBonus(leader) {
        const baseBonus = leader.leadership / 100; // 0.5 - 1.0 multiplier
        const experienceBonus = Math.min(leader.experience * 0.01, 0.2); // Up to 20% bonus from experience
        return baseBonus + experienceBonus;
    }

    // Generate weather conditions for expedition
    generateWeather() {
        const weatherTypes = [
            { type: 'clear', name: 'Clear Skies', modifier: 1.0, description: 'Perfect traveling weather' },
            { type: 'cloudy', name: 'Overcast', modifier: 0.95, description: 'Cloudy but manageable' },
            { type: 'rainy', name: 'Rain', modifier: 0.8, description: 'Muddy roads slow progress' },
            { type: 'stormy', name: 'Thunderstorm', modifier: 0.6, description: 'Dangerous storms delay travel' },
            { type: 'fog', name: 'Heavy Fog', modifier: 0.7, description: 'Poor visibility hampers navigation' },
            { type: 'hot', name: 'Extreme Heat', modifier: 0.85, description: 'Scorching heat drains energy' },
            { type: 'cold', name: 'Bitter Cold', modifier: 0.75, description: 'Freezing temperatures slow march' }
        ];

        return weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    }

    // Generate terrain-specific challenges
    generateTerrainChallenges(terrain) {
        const challenges = {
            'forest': ['Dense undergrowth blocks paths', 'Wild animals threaten the expedition', 'Easy to become lost among the trees'],
            'plains': ['Open ground offers no shelter', 'River crossings slow progress', 'Bandits could spot the army from afar'],
            'hills': ['Steep climbs exhaust the troops', 'Loose rocks cause injuries', 'Higher ground reveals enemy positions'],
            'mountains': ['Treacherous cliff paths', 'Altitude affects breathing', 'Rockslides block routes'],
            'desert': ['Sandstorms disorient travelers', 'Water sources are scarce', 'Extreme temperatures sap strength'],
            'swamp': ['Boggy ground slows movement', 'Disease-carrying insects swarm', 'Quicksand traps unwary soldiers'],
            'ruins': ['Ancient traps still function', 'Unstable structures threaten collapse', 'Mystical energies cause unease'],
            'enchanted_forest': ['Magic disrupts navigation', 'Illusions lead astray', 'Supernatural guardians watch'],
            'volcanic': ['Toxic gases poison the air', 'Lava flows block passages', 'Unstable ground shifts underfoot']
        };

        return challenges[terrain] || ['Unknown terrain presents unexpected challenges'];
    }

    // Get items brought on expedition from inventory
    getExpeditionInventory() {
        if (!this.gameState.inventory) return [];

        const expeditionItems = [];

        // Add special items that help with expeditions
        const items = this.gameState.inventory.getAllItems();
        items.forEach(item => {
            if (item.type === 'expedition' || item.expeditionBonus) {
                expeditionItems.push({
                    ...item,
                    brought: true
                });
            }
        });

        return expeditionItems;
    }

    // Update expedition statistics
    updateExpeditionStats() {
        if (!this.gameState.stats) {
            this.gameState.stats = {};
        }

        this.gameState.stats.totalExpeditionsSent = (this.gameState.stats.totalExpeditionsSent || 0) + 1;
        this.gameState.stats.currentExpeditionDay = 0;
    }

    // Initialize expedition unlock system
    initializeExpeditionUnlocks() {
        this.updateLocationAvailability();
    }

    // Update which locations are available based on achievements and progress
    updateLocationAvailability() {
        this.availableLocations.forEach(location => {
            if (location.unlocked) return; // Already unlocked

            // Check unlock requirements
            if (location.unlockRequirement) {
                const requirement = location.unlockRequirement;

                if (requirement === 'defeat_goblin_outpost') {
                    location.unlocked = this.hasCompletedLocation('goblin_outpost');
                } else if (requirement === 'defeat_bandit_stronghold') {
                    location.unlocked = this.hasCompletedLocation('bandit_stronghold');
                } else if (requirement === 'defeat_orc_fortress') {
                    location.unlocked = this.hasCompletedLocation('orc_fortress');
                } else if (requirement === 'explore_3_locations') {
                    location.unlocked = this.getCompletedLocationsCount() >= 3;
                } else if (requirement === 'build_3_buildings') {
                    location.unlocked = (this.gameState.buildings?.length || 0) >= 3;
                } else if (requirement === 'population_50') {
                    location.unlocked = (this.gameState.population?.total || this.gameState.population || 0) >= 50;
                } else if (requirement === 'complete_5_expeditions') {
                    location.unlocked = (this.gameState.stats?.totalExpeditionsSent || 0) >= 5;
                }
            } else {
                // No requirement means it's available
                location.unlocked = true;
            }
        });
    }

    // Helper: check if a specific location has been completed
    hasCompletedLocation(locationId) {
        return (this.gameState.completedExpeditions || []).includes(locationId);
    }

    // Helper: count how many locations have been completed
    getCompletedLocationsCount() {
        return (this.gameState.completedExpeditions || []).length;
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
        const location = this.currentExpedition.location;
        const weather = this.currentExpedition.weather;
        const terrain = location.terrain;
        const morale = this.currentExpedition.armyMorale;
        const isReturnJourney = this.expeditionState === 'traveling_back';

        // Different event pools based on context
        const baseEvents = [
            {
                type: 'neutral',
                text: `The ${isReturnJourney ? 'weary' : 'determined'} army makes steady progress through the ${terrain}.`,
                effect: null
            },
            {
                type: 'neutral',
                text: `${this.currentExpedition.leader?.name || 'The commander'} keeps the troops organized and moving forward.`,
                effect: null
            }
        ];

        const positiveEvents = [
            {
                type: 'positive',
                text: 'Scouts discover a shortcut through the terrain!',
                effect: () => {
                    this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) + 0.15;
                    this.currentExpedition.armyMorale = Math.min(100, this.currentExpedition.armyMorale + 5);
                }
            },
            {
                type: 'positive',
                text: 'The army discovers an abandoned cache of supplies!',
                effect: () => {
                    this.currentExpedition.supplies.food += 8 + Math.floor(Math.random() * 5);
                    this.currentExpedition.supplies.medicine += 2 + Math.floor(Math.random() * 3);
                    this.currentExpedition.armyMorale = Math.min(100, this.currentExpedition.armyMorale + 10);
                }
            },
            {
                type: 'positive',
                text: 'Friendly merchants share news and supplies with the expedition!',
                effect: () => {
                    this.currentExpedition.supplies.food += 5;
                    this.currentExpedition.supplies.medicine += 2;
                    this.currentExpedition.armyMorale = Math.min(100, this.currentExpedition.armyMorale + 8);
                    // Chance to discover new location
                    if (Math.random() < 0.3) {
                        this.discoverNewLocation();
                    }
                }
            },
            {
                type: 'positive',
                text: `${this.currentExpedition.leader?.name || 'The commander'} inspires the troops with a rousing speech!`,
                effect: () => {
                    const leadershipBonus = this.currentExpedition.loyaltyBonus || 0;
                    this.currentExpedition.armyMorale = Math.min(100, this.currentExpedition.armyMorale + 15 + (leadershipBonus * 10));
                }
            }
        ];

        const negativeEvents = [
            {
                type: 'negative',
                text: `Heavy ${weather.name.toLowerCase()} slows the march and dampens spirits.`,
                effect: () => {
                    this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 8);
                    this.currentExpedition.supplies.food = Math.max(0, this.currentExpedition.supplies.food - 3);
                    this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) - 0.05;
                }
            },
            {
                type: 'negative',
                text: 'Several soldiers fall ill during the march.',
                effect: () => {
                    const medicineUsed = Math.min(4, this.currentExpedition.supplies.medicine);
                    this.currentExpedition.supplies.medicine = Math.max(0, this.currentExpedition.supplies.medicine - medicineUsed);

                    if (medicineUsed < 2) {
                        this.currentExpedition.armyMorale -= 20;
                        this.currentExpedition.casualties += 1;
                        this.currentExpedition.events.push({
                            type: 'negative',
                            text: 'Without sufficient medicine, one soldier succumbs to illness.',
                            time: new Date().toLocaleTimeString()
                        });
                    } else {
                        this.currentExpedition.armyMorale -= 10;
                    }
                }
            },
            {
                type: 'negative',
                text: 'Equipment breaks and supplies are damaged during difficult terrain.',
                effect: () => {
                    this.currentExpedition.supplies.food = Math.max(0, this.currentExpedition.supplies.food - 5);
                    this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 12);
                }
            }
        ];

        const challengeEvents = [
            {
                type: 'challenge',
                text: `A ${terrain === 'forest' ? 'raging river' : terrain === 'mountains' ? 'deep ravine' : 'difficult obstacle'} blocks the path.`,
                effect: () => this.presentTravelChoice('obstacle_crossing', terrain)
            },
            {
                type: 'challenge',
                text: 'Local wildlife poses a threat to the expedition.',
                effect: () => this.presentTravelChoice('wildlife_encounter', terrain)
            },
            {
                type: 'challenge',
                text: 'Suspicious figures are spotted following the expedition.',
                effect: () => {
                    this.currentExpedition.pursuitRisk += 0.2;
                    this.presentTravelChoice('pursuit_detected', terrain);
                }
            }
        ];

        const expeditionSpecificEvents = [];

        // Add terrain-specific events
        if (terrain === 'forest') {
            expeditionSpecificEvents.push({
                type: 'negative',
                text: 'The army becomes lost among the dense trees.',
                effect: () => {
                    this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) - 0.1;
                    this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 15);
                }
            });
        } else if (terrain === 'desert') {
            expeditionSpecificEvents.push({
                type: 'negative',
                text: 'A sandstorm forces the expedition to take shelter.',
                effect: () => {
                    this.currentExpedition.supplies.food -= 4;
                    this.currentExpedition.armyMorale -= 10;
                    this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) - 0.08;
                }
            });
        } else if (terrain === 'mountains') {
            expeditionSpecificEvents.push({
                type: 'negative',
                text: 'A rockslide injures several expedition members.',
                effect: () => {
                    this.currentExpedition.casualties += Math.floor(Math.random() * 2) + 1;
                    this.currentExpedition.supplies.medicine = Math.max(0, this.currentExpedition.supplies.medicine - 3);
                    this.currentExpedition.armyMorale -= 18;
                }
            });
        }

        // Add low morale specific events
        if (morale < 30) {
            expeditionSpecificEvents.push({
                type: 'negative',
                text: 'Several soldiers attempt to desert during the night!',
                effect: () => {
                    const desertions = Math.floor(Math.random() * 3) + 1;
                    this.currentExpedition.desertions += desertions;
                    this.currentExpedition.armyMorale = Math.max(0, this.currentExpedition.armyMorale - 10);

                    this.currentExpedition.events.push({
                        type: 'negative',
                        text: `${desertions} soldiers have abandoned the expedition.`,
                        time: new Date().toLocaleTimeString()
                    });
                }
            });
        }

        // Return journey specific events
        if (isReturnJourney) {
            expeditionSpecificEvents.push({
                type: 'challenge',
                text: 'Enemy forces from the conquered location are pursuing the expedition!',
                effect: () => {
                    this.currentExpedition.pursuitRisk += 0.4;
                    this.presentTravelChoice('enemy_pursuit', terrain);
                }
            });
        }

        // Combine all possible events
        let eventPool = [...baseEvents];

        // Add positive events more frequently if morale is high
        if (morale > 60) {
            eventPool.push(...positiveEvents);
        }

        // Add negative events more frequently if morale is low
        if (morale < 50) {
            eventPool.push(...negativeEvents);
        }

        // Always include some challenges and expedition-specific events
        eventPool.push(...challengeEvents.slice(0, 2));
        eventPool.push(...expeditionSpecificEvents);

        const event = eventPool[Math.floor(Math.random() * eventPool.length)];
        const eventTime = new Date().toLocaleTimeString();

        this.currentExpedition.events.push({
            ...event,
            time: eventTime
        });

        if (event.effect) {
            event.effect();
        }

        // Check for critical morale loss
        if (this.currentExpedition.armyMorale <= 0) {
            this.handleExpeditionCollapse();
            return;
        }

        // Refresh travel view to show new event
        if (this.game.currentView === 'quest') {
            this.renderTravelView();
        }

        // Show notification with appropriate urgency
        const urgency = event.type === 'challenge' ? 'high' : 'normal';
        const iconMap = {
            'positive': '✅',
            'negative': '⚠️',
            'challenge': '🚨',
            'neutral': '📰'
        };

        window.showNotification(event.text, {
            timeout: urgency === 'high' ? 6000 : 4000,
            icon: iconMap[event.type]
        });
    }

    // Handle expedition collapse due to low morale
    handleExpeditionCollapse() {
        const location = this.currentExpedition.location;

        this.currentExpedition.events.push({
            type: 'negative',
            text: 'Army morale has collapsed! The expedition dissolves in chaos...',
            time: new Date().toLocaleTimeString()
        });

        window.showNotification(
            `💀 Expedition to ${location.name} has failed catastrophically! Survivors struggle to return home.`,
            { timeout: 8000, icon: '💀' }
        );

        // Force immediate return with heavy losses
        this.startReturnJourney(true);
        this.currentExpedition.pursuitRisk = 0.8; // High chance of being hunted
    }

    // Present player with tactical choices during travel
    presentTravelChoice(choiceType, terrain) {
        const choices = this.getTravelChoices(choiceType, terrain);

        if (window.modalSystem) {
            const choiceHTML = `
                <div class="travel-choice">
                    <h4>⚡ Critical Decision Required</h4>
                    <p class="choice-description">${choices.description}</p>
                    <div class="choice-options">
                        ${choices.options.map((option, index) => `
                            <button class="choice-btn" data-choice="${index}">
                                <div class="choice-title">${option.title}</div>
                                <div class="choice-desc">${option.description}</div>
                                <div class="choice-risk">Risk: ${option.risk}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            const modalId = window.modalSystem.showModal({
                title: 'Expedition Decision',
                content: choiceHTML,
                width: '500px',
                height: '400px'
            });

            // Setup choice handlers
            document.querySelectorAll('.choice-btn').forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    this.handleTravelChoice(choiceType, index);
                    window.modalSystem.closeModal(modalId);
                });
            });
        }
    }

    // Get travel choice options based on situation
    getTravelChoices(choiceType, terrain) {
        const choices = {
            'obstacle_crossing': {
                description: 'A natural barrier blocks the expedition\'s path. How should the army proceed?',
                options: [
                    {
                        title: 'Find a Way Around',
                        description: 'Take extra time to find a safer route',
                        risk: 'Low',
                        effects: { time: -0.1, morale: -5, safety: 0.9 }
                    },
                    {
                        title: 'Build Bridge/Crossing',
                        description: 'Use engineering to overcome the obstacle',
                        risk: 'Medium',
                        effects: { time: -0.05, morale: 5, supplies: -3, safety: 0.8 }
                    },
                    {
                        title: 'Force Direct Crossing',
                        description: 'Push through despite the danger',
                        risk: 'High',
                        effects: { time: 0.05, morale: -10, casualties: 0.1, safety: 0.6 }
                    }
                ]
            },
            'wildlife_encounter': {
                description: 'Dangerous wildlife threatens the expedition. What action should be taken?',
                options: [
                    {
                        title: 'Avoid Confrontation',
                        description: 'Take a detour to avoid the creatures',
                        risk: 'Low',
                        effects: { time: -0.08, morale: -3, safety: 0.95 }
                    },
                    {
                        title: 'Drive Them Off',
                        description: 'Use noise and intimidation to scare them away',
                        risk: 'Medium',
                        effects: { morale: 2, safety: 0.8 }
                    },
                    {
                        title: 'Hunt for Food',
                        description: 'Attack the wildlife for meat and supplies',
                        risk: 'High',
                        effects: { morale: 10, food: 8, casualties: 0.05, safety: 0.7 }
                    }
                ]
            },
            'pursuit_detected': {
                description: 'Unknown figures are following the expedition. How should the army respond?',
                options: [
                    {
                        title: 'Increase March Speed',
                        description: 'Try to outpace the pursuers',
                        risk: 'Medium',
                        effects: { time: 0.1, morale: -8, pursuit: -0.2 }
                    },
                    {
                        title: 'Set Up Ambush',
                        description: 'Turn the tables on the followers',
                        risk: 'High',
                        effects: { morale: 15, pursuit: -0.5, casualties: 0.1 }
                    },
                    {
                        title: 'Diplomatic Contact',
                        description: 'Attempt to negotiate with the pursuers',
                        risk: 'Very High',
                        effects: { morale: -5, pursuit: 0.3, diplomacy: true }
                    }
                ]
            },
            'enemy_pursuit': {
                description: 'Enemy forces are actively hunting the expedition! Immediate action required!',
                options: [
                    {
                        title: 'Forced March',
                        description: 'Push the army to its limits to escape',
                        risk: 'High',
                        effects: { time: 0.2, morale: -15, pursuit: -0.3, supplies: -5 }
                    },
                    {
                        title: 'Stand and Fight',
                        description: 'Turn and face the pursuers in battle',
                        risk: 'Very High',
                        effects: { battle: true, pursuit: -0.8, casualties: 0.2 }
                    },
                    {
                        title: 'Abandon Supplies',
                        description: 'Drop heavy loot to move faster',
                        risk: 'Medium',
                        effects: { time: 0.15, pursuit: -0.4, loot: -0.5 }
                    }
                ]
            }
        };

        return choices[choiceType] || choices['obstacle_crossing'];
    }

    // Handle player's choice in travel decisions
    handleTravelChoice(choiceType, choiceIndex) {
        const choices = this.getTravelChoices(choiceType);
        const selectedChoice = choices.options[choiceIndex];
        const effects = selectedChoice.effects;

        // Apply effects
        if (effects.time) {
            this.currentExpedition.travelBonus = (this.currentExpedition.travelBonus || 0) + effects.time;
        }
        if (effects.morale) {
            this.currentExpedition.armyMorale = Math.max(0, Math.min(100, this.currentExpedition.armyMorale + effects.morale));
        }
        if (effects.supplies || effects.food) {
            this.currentExpedition.supplies.food = Math.max(0, this.currentExpedition.supplies.food + (effects.food || -effects.supplies || 0));
        }
        if (effects.pursuit) {
            this.currentExpedition.pursuitRisk = Math.max(0, this.currentExpedition.pursuitRisk + effects.pursuit);
        }
        if (effects.casualties) {
            this.currentExpedition.casualties += Math.floor(effects.casualties * (this.gameState.army?.length || 10));
        }

        // Special effects
        if (effects.battle) {
            this.triggerPursuitBattle();
        }
        if (effects.loot) {
            this.currentExpedition.lootModifier = (this.currentExpedition.lootModifier || 1.0) + effects.loot;
        }

        // Log the choice
        this.currentExpedition.events.push({
            type: 'choice',
            text: `Decision made: ${selectedChoice.title} - ${selectedChoice.description}`,
            time: new Date().toLocaleTimeString()
        });

        window.showNotification(
            `Choice: ${selectedChoice.title}`,
            { timeout: 3000, icon: '⚡' }
        );
    }

    // Trigger a pursuit battle during travel
    triggerPursuitBattle() {
        // This would integrate with the battle system
        this.currentExpedition.events.push({
            type: 'negative',
            text: 'Expedition engages pursuing enemies in battle!',
            time: new Date().toLocaleTimeString()
        });

        // Simplified battle resolution for now
        const battleOutcome = Math.random() < (0.6 + this.currentExpedition.loyaltyBonus * 0.2);

        if (battleOutcome) {
            this.currentExpedition.armyMorale += 20;
            this.currentExpedition.pursuitRisk = 0;
            this.currentExpedition.events.push({
                type: 'positive',
                text: 'Victory! The pursuers have been defeated.',
                time: new Date().toLocaleTimeString()
            });
        } else {
            this.currentExpedition.armyMorale -= 25;
            this.currentExpedition.casualties += 2;
            this.currentExpedition.events.push({
                type: 'negative',
                text: 'The battle goes poorly. Expedition suffers losses.',
                time: new Date().toLocaleTimeString()
            });
        }
    }

    // Discover new locations during travel
    discoverNewLocation() {
        const newLocationNames = [
            'Hidden Valley', 'Ancient Watchtower', 'Mysterious Cave', 'Abandoned Mine',
            'Forgotten Temple', 'Natural Hot Springs', 'Secret Grove', 'Old Battlefield'
        ];

        const discoveredName = newLocationNames[Math.floor(Math.random() * newLocationNames.length)];

        this.currentExpedition.discoveredLocations.push({
            name: discoveredName,
            discovered: true,
            requiresExploration: true
        });

        this.currentExpedition.events.push({
            type: 'positive',
            text: `Scouts have discovered ${discoveredName}! This location can be explored in future expeditions.`,
            time: new Date().toLocaleTimeString()
        });
    }

    calculateInitialSupplies(location) {
        const armySize = Math.max(this.gameState.army?.length || 0, 5);
        const totalDays = (location?.travelDays || 2) * 2 + 2; // Round trip + buffer

        return {
            food: Math.max(20, armySize * totalDays * 1.5),
            medicine: Math.max(10, Math.floor(armySize / 2)),
            equipment: armySize * 2,
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

        // Notify systems return journey has started
        try { window.eventBus && window.eventBus.emit('expedition_return_started', { location: this.currentExpedition?.location }); } catch (_) { }

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
        const leader = this.currentExpedition.leader;
        const isSuccessful = this.currentExpedition.armyMorale > 20 && this.currentExpedition.casualties < (this.gameState.army?.length || 10) * 0.8;

        let rewards = {};
        let expeditionResult = 'failure';

        if (isSuccessful) {
            rewards = this.calculateExpeditionRewards(location);
            expeditionResult = 'success';

            // Apply rewards to game state with enhancements (no retroactive trimming at cap)
            Object.keys(rewards).forEach(resource => {
                if (this.gameState.resources[resource] !== undefined) {
                    const before = this.gameState.resources[resource];
                    const attempted = rewards[resource];
                    let cap = GameData?.resourceCaps?.[resource];
                    if (typeof window.GameData?.calculateSeasonalStorageCap === 'function') {
                        try { cap = window.GameData.calculateSeasonalStorageCap(resource, this.gameState.season, this.gameState.buildings); } catch (_) { }
                    }
                    if (typeof attempted === 'number' && attempted > 0 && typeof cap === 'number') {
                        const effective = Math.max(0, Math.min(attempted, Math.max(0, cap - before)));
                        this.gameState.resources[resource] = before + effective;
                    } else if (typeof attempted === 'number') {
                        this.gameState.resources[resource] = before + attempted;
                    }
                } else if (resource === 'gold') {
                    const beforeGold = this.gameState.gold || 0;
                    const attempted = rewards[resource];
                    const cap = GameData?.resourceCaps?.gold;
                    if (typeof attempted === 'number' && attempted > 0 && typeof cap === 'number') {
                        const effective = Math.max(0, Math.min(attempted, Math.max(0, cap - beforeGold)));
                        this.gameState.gold = beforeGold + effective;
                    } else if (typeof attempted === 'number') {
                        this.gameState.gold = beforeGold + attempted;
                    }
                } else if (resource === 'population') {
                    // Add refugees/rescued people to population via PopulationManager respecting caps
                    if (this.gameState.populationManager?.addRefugees) {
                        const planned = rewards[resource] || 0;
                        const beforePop = this.gameState.population?.total ?? (this.gameState.population || 0);
                        this.gameState.populationManager.addRefugees(planned);
                        const afterPop = this.gameState.population?.total ?? (this.gameState.population || 0);
                        const added = Math.max(0, afterPop - beforePop);
                        // Sync legacy counter
                        this.gameState.updatePopulationCount?.();
                        if (added < planned && window.showNotification) {
                            window.showNotification(`🏠 Housing full: accepted ${added}/${planned} refugees`, { timeout: 4000, icon: '⚠️' });
                        }
                    } else {
                        this.gameState.population = (this.gameState.population || 0) + rewards[resource];
                    }
                }
            });

            // Mark location as completed
            if (!this.gameState.completedExpeditions) {
                this.gameState.completedExpeditions = [];
            }
            if (!this.gameState.completedExpeditions.includes(location.id)) {
                this.gameState.completedExpeditions.push(location.id);
            }

            // Update expedition statistics
            this.gameState.stats.successfulExpeditions = (this.gameState.stats.successfulExpeditions || 0) + 1;

            // Check for achievements
            if (this.gameState.achievements) {
                this.gameState.achievements.triggerExpeditionMaster();
            }
        } else {
            // Failed expedition - reduced or no rewards
            rewards = this.calculateFailureRewards(location);
            expeditionResult = 'failure';

            // Apply minimal rewards if any
            Object.keys(rewards).forEach(resource => {
                if (this.gameState.resources[resource] !== undefined) {
                    this.gameState.resources[resource] += rewards[resource];
                } else if (resource === 'gold') {
                    this.gameState.gold += rewards[resource];
                }
            });

            this.gameState.stats.failedExpeditions = (this.gameState.stats.failedExpeditions || 0) + 1;
        }

        // Apply expedition consequences
        this.applyExpeditionConsequences(expeditionResult);

        // Update royal leader experience and status
        if (leader) {
            this.updateRoyalLeaderExperience(leader, expeditionResult);
            this.markRoyalOnExpedition(leader.id, false);
        }

        // Apply army casualties
        this.applyArmyCasualties();

        // Update location availability for future expeditions
        this.updateLocationAvailability();

        // Add discovered locations to available locations
        this.addDiscoveredLocations();

        // Stop expedition time flow
        this.gameState.stopExpeditionTimeFlow();

        // Show completion notification and summary
        const resultIcon = isSuccessful ? '🎉' : '💀';
        const resultText = isSuccessful ? 'successful' : 'failed';

        window.showNotification(
            `${resultIcon} Expedition to ${location.name} ${resultText}! ${leader ? leader.name : 'Army'} returns ${isSuccessful ? 'victorious' : 'defeated'}.`,
            { timeout: 6000, icon: resultIcon }
        );

        // Reset expedition state
        this.currentExpedition = null;
        this.expeditionState = 'none';
        this.expeditionStartTime = null;

        // Notify systems expedition completed
        try { window.eventBus && window.eventBus.emit('expedition_completed', { location, leader, result: expeditionResult }); } catch (_) { }

        // Return to village view
        this.game.switchView('village');

        // Show detailed results summary
        this.showExpeditionSummary(location, rewards, expeditionResult);
    }

    // Calculate reduced rewards for failed expeditions
    calculateFailureRewards(location) {
        const baseRewards = this.calculateExpeditionRewards(location);
        const failureRewards = {};

        // Reduce rewards by 70-90% for failures
        Object.keys(baseRewards).forEach(resource => {
            if (resource === 'special') return; // No special rewards for failures

            const reductionFactor = 0.1 + Math.random() * 0.2; // 10-30% of original
            failureRewards[resource] = Math.floor(baseRewards[resource] * reductionFactor);
        });

        return failureRewards;
    }

    // Apply consequences of expedition outcome
    applyExpeditionConsequences(result) {
        const location = this.currentExpedition.location;
        const leader = this.currentExpedition.leader;

        if (result === 'success') {
            // Positive consequences
            this.gameState.populationManager?.increaseMorale(10);

            // Reputation boost
            this.gameState.reputation = (this.gameState.reputation || 50) + 5;

            // Special location benefits
            if (location.specialFeatures) {
                this.applySpecialLocationBenefits(location.specialFeatures);
            }

        } else {
            // Negative consequences
            this.gameState.populationManager?.increaseMorale(-15);

            // Reputation loss
            this.gameState.reputation = Math.max(0, (this.gameState.reputation || 50) - 10);

            // Economic impact from lost resources
            this.gameState.gold = Math.max(0, this.gameState.gold - Math.floor(this.gameState.gold * 0.1));

            // Leader injury risk
            if (leader && Math.random() < 0.3) {
                this.injureRoyalLeader(leader);
            }
        }
    }

    // Apply special benefits from conquered locations
    applySpecialLocationBenefits(features) {
        features.forEach(feature => {
            switch (feature) {
                case 'trade_route_control':
                    this.gameState.tradeRouteBonus = (this.gameState.tradeRouteBonus || 1.0) + 0.2;
                    break;
                case 'timber_resources':
                    this.gameState.woodProductionBonus = (this.gameState.woodProductionBonus || 1.0) + 0.15;
                    break;
                case 'stone_quarry':
                    this.gameState.stoneProductionBonus = (this.gameState.stoneProductionBonus || 1.0) + 0.15;
                    break;
                case 'fertile_land':
                    this.gameState.foodProductionBonus = (this.gameState.foodProductionBonus || 1.0) + 0.1;
                    break;
                case 'strategic_position':
                    this.gameState.defenseBonus = (this.gameState.defenseBonus || 1.0) + 0.1;
                    break;
            }
        });
    }

    // Update royal leader experience and handle injuries
    updateRoyalLeaderExperience(leader, result) {
        const experienceGain = result === 'success' ?
            (10 + Math.floor(Math.random() * 10)) :
            (2 + Math.floor(Math.random() * 5));

        if (leader.id === 'monarch' && this.gameState.monarch) {
            this.gameState.monarch.expeditionExperience = (this.gameState.monarch.expeditionExperience || 0) + experienceGain;

            // Level up leadership if enough experience
            if (this.gameState.monarch.expeditionExperience >= 50) {
                this.gameState.monarch.stats = this.gameState.monarch.stats || {};
                this.gameState.monarch.stats.leadership = Math.min(100, (this.gameState.monarch.stats.leadership || 70) + 5);
                this.gameState.monarch.expeditionExperience = 0;

                window.showNotification(
                    `👑 ${this.gameState.monarch.name}'s leadership has improved through expedition experience!`,
                    { timeout: 4000, icon: '📈' }
                );
            }
        } else if (this.gameState.populationManager?.royalFamily) {
            const heir = this.gameState.populationManager.royalFamily.find(h => h.id === leader.id);
            if (heir) {
                heir.expeditionExperience = (heir.expeditionExperience || 0) + experienceGain;

                if (heir.expeditionExperience >= 30) {
                    heir.stats = heir.stats || {};
                    heir.stats.leadership = Math.min(100, (heir.stats.leadership || 50) + 3);
                    heir.expeditionExperience = 0;

                    window.showNotification(
                        `👑 ${heir.name}'s leadership has improved through expedition experience!`,
                        { timeout: 4000, icon: '📈' }
                    );
                }
            }
        }

        // Track expedition history
        if (!this.royalExpeditionHistory.has(leader.id)) {
            this.royalExpeditionHistory.set(leader.id, []);
        }
        this.royalExpeditionHistory.get(leader.id).push({
            location: this.currentExpedition.location.name,
            result: result,
            date: new Date().toISOString(),
            casualties: this.currentExpedition.casualties,
            morale: this.currentExpedition.armyMorale
        });
    }

    // Handle royal leader injury
    injureRoyalLeader(leader) {
        const injuryTypes = [
            'wounded in combat',
            'injured during retreat',
            'fell ill during expedition',
            'suffered from exhaustion'
        ];

        const injury = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];

        if (leader.id === 'monarch' && this.gameState.monarch) {
            this.gameState.monarch.injured = true;
            this.gameState.monarch.injuryDescription = injury;
            this.gameState.monarch.recoveryTime = 30; // 30 days to recover
        } else if (this.gameState.populationManager?.royalFamily) {
            const heir = this.gameState.populationManager.royalFamily.find(h => h.id === leader.id);
            if (heir) {
                heir.injured = true;
                heir.injuryDescription = injury;
                heir.recoveryTime = 20; // 20 days to recover
            }
        }

        window.showNotification(
            `⚕️ ${leader.name} was ${injury} and requires time to recover.`,
            { timeout: 5000, icon: '🏥' }
        );
    }

    // Apply army casualties to game state
    applyArmyCasualties() {
        const totalCasualties = this.currentExpedition.casualties + this.currentExpedition.desertions;

        if (totalCasualties > 0 && this.gameState.army) {
            // Remove casualties from army
            const survivingArmy = Math.max(0, this.gameState.army.length - totalCasualties);
            this.gameState.army = this.gameState.army.slice(0, survivingArmy);

            // Add deserters back to general population (they abandon military service)
            if (this.currentExpedition.desertions > 0 && this.gameState.populationManager) {
                this.gameState.populationManager.addDeserters(this.currentExpedition.desertions);
            }

            window.showNotification(
                `⚰️ Expedition losses: ${this.currentExpedition.casualties} casualties, ${this.currentExpedition.desertions} desertions`,
                { timeout: 4000, icon: '💀' }
            );
        }
    }

    // Add newly discovered locations to the available locations list
    addDiscoveredLocations() {
        if (this.currentExpedition.discoveredLocations.length > 0) {
            // For now, just log the discoveries
            // In a full implementation, these would become new expedition targets
            this.currentExpedition.discoveredLocations.forEach(discovery => {
                console.log(`[QuestManager] Discovered new location: ${discovery.name}`);

                // Could add to a "discovered but unexplored" list for future implementation
                if (!this.knownLocations.has(discovery.name)) {
                    this.knownLocations.add(discovery.name);
                }
            });
        }
    }

    // Enhanced expedition summary with detailed results
    showExpeditionSummary(location, rewards, result) {
        const leader = this.currentExpedition.leader;
        const casualties = this.currentExpedition.casualties;
        const desertions = this.currentExpedition.desertions;
        const discoveries = this.currentExpedition.discoveredLocations;

        const summaryHTML = `
            <div class="expedition-summary ${result}">
                <h3>${result === 'success' ? '🏆' : '💀'} Expedition to ${location.name} Complete!</h3>
                
                <div class="expedition-outcome">
                    <h4>📊 Expedition Results</h4>
                    <div class="outcome-details">
                        <div class="outcome-item">
                            <span class="outcome-label">Result:</span>
                            <span class="outcome-value ${result}">${result === 'success' ? 'Victory' : 'Defeat'}</span>
                        </div>
                        <div class="outcome-item">
                            <span class="outcome-label">Leader:</span>
                            <span class="outcome-value">${leader ? leader.name : 'Unknown'}</span>
                        </div>
                        <div class="outcome-item">
                            <span class="outcome-label">Final Morale:</span>
                            <span class="outcome-value">${this.currentExpedition.armyMorale}%</span>
                        </div>
                    </div>
                </div>

                ${Object.keys(rewards).length > 0 ? `
                    <div class="expedition-rewards">
                        <h4>🎁 Rewards Gained:</h4>
                        <div class="rewards-list">
                            ${Object.keys(rewards).map(resource =>
            `<div class="reward-item">
                                    <span class="reward-icon">${this.getSupplyIcon(resource)}</span>
                                    <span class="reward-amount">+${rewards[resource]}</span>
                                    <span class="reward-name">${resource}</span>
                                </div>`
        ).join('')}
                        </div>
                    </div>
                ` : ''}

                ${(casualties > 0 || desertions > 0) ? `
                    <div class="expedition-losses">
                        <h4>💀 Expedition Losses:</h4>
                        <div class="losses-list">
                            ${casualties > 0 ? `<div class="loss-item">⚰️ ${casualties} casualties</div>` : ''}
                            ${desertions > 0 ? `<div class="loss-item">🏃 ${desertions} desertions</div>` : ''}
                        </div>
                    </div>
                ` : ''}

                ${discoveries.length > 0 ? `
                    <div class="expedition-discoveries">
                        <h4>🗺️ New Discoveries:</h4>
                        <div class="discoveries-list">
                            ${discoveries.map(discovery =>
            `<div class="discovery-item">📍 ${discovery.name}</div>`
        ).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="expedition-events-summary">
                    <h4>📰 Key Events:</h4>
                    <div class="events-summary">
                        ${this.currentExpedition.events.slice(-5).map(event =>
            `<div class="event-summary ${event.type}">
                                <span class="event-time">${event.time}</span>
                                <span class="event-text">${event.text}</span>
                            </div>`
        ).join('')}
                    </div>
                </div>
            </div>
        `;

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: 'Expedition Complete',
                content: summaryHTML,
                width: '600px',
                height: '500px'
            });
        } else {
            // Fallback to notification
            window.showNotification(summaryHTML, { timeout: 12000, icon: result === 'success' ? '🎁' : '💀' });
        }
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

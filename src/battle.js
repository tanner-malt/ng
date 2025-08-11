// Battle system with AI personalities and automation
class BattleManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.battleField = null;
        this.enemies = [];
        this.battleTimer = null;
        this.battlePhase = 'preparation'; // preparation, fighting, victory, defeat
        this.currentBattle = null;
        this.battleQueue = [];
        this.dailyBattles = [];
        this.battleSpeed = 1; // 1x, 2x, 4x speed
        this.isWatching = false;
        
        // AI Commander personalities
        this.commanders = [
            {
                name: 'General Marcus',
                personality: 'aggressive',
                strategy: 'frontal_assault',
                experience: 0,
                description: 'Leads direct attacks, high damage but risky'
            },
            {
                name: 'Commander Elena',
                personality: 'defensive',
                strategy: 'shield_wall',
                experience: 0,
                description: 'Focuses on protection and counter-attacks'
            },
            {
                name: 'Captain Reyn',
                personality: 'cunning',
                strategy: 'flanking',
                experience: 0,
                description: 'Uses terrain and tactics to outmaneuver enemies'
            }
        ];

        this.activeCommander = this.commanders[0];
        this.weatherCondition = 'clear';
        this.terrainType = 'plains';
        
        // Load commander experience from localStorage
        this.loadCommanderData();
    }

    init() {
        this.setupBattleModal();
        // Remove daily battle generation - battles occur when armies meet
    }
    
    setupBattleModal() {
        // Setup battle modal controls
        const watchBattleBtn = document.getElementById('watch-battle-btn');
        const autoResolveBtn = document.getElementById('auto-resolve-btn');
        const pauseBattleBtn = document.getElementById('pause-battle-btn');
        const closeBattleModal = document.getElementById('close-battle-modal');
        
        // Speed controls
        const speed1x = document.getElementById('speed-1x');
        const speed2x = document.getElementById('speed-2x');
        const speed4x = document.getElementById('speed-4x');
        
        if (watchBattleBtn) {
            watchBattleBtn.addEventListener('click', () => this.watchBattle());
        }
        if (autoResolveBtn) {
            autoResolveBtn.addEventListener('click', () => this.autoResolveBattle());
        }
        if (pauseBattleBtn) {
            pauseBattleBtn.addEventListener('click', () => this.pauseBattle());
        }
        if (closeBattleModal) {
            closeBattleModal.addEventListener('click', () => this.closeBattleModal());
        }
        
        // Speed controls
        if (speed1x) speed1x.addEventListener('click', () => this.setBattleSpeed(1));
        if (speed2x) speed2x.addEventListener('click', () => this.setBattleSpeed(2));
        if (speed4x) speed4x.addEventListener('click', () => this.setBattleSpeed(4));
    }
    
    // Called when two armies encounter each other
    createBattleFromEncounter(playerArmy, enemyArmy, location, terrain, weather) {
        const battle = {
            id: `encounter_${Date.now()}`,
            location: location || 'Unknown Territory',
            playerArmy: playerArmy,
            enemyArmy: enemyArmy,
            terrain: terrain || 'plains',
            weather: weather || 'clear',
            resolved: false,
            result: null,
            type: 'encounter' // Mark as encounter-based battle
        };
        
        this.currentBattle = battle;
        this.activeBattles = this.activeBattles || [];
        this.activeBattles.push(battle);
        
        console.log(`Battle created at ${location}: Player Army vs ${enemyArmy.name}`);
        return battle;
    }
    
    // Called when enemy armies are encountered during expeditions or world exploration
    triggerArmyEncounter(encounterData) {
        const battle = this.createBattleFromEncounter(
            encounterData.playerArmy,
            encounterData.enemyArmy,
            encounterData.location,
            encounterData.terrain,
            encounterData.weather
        );
        
        this.showBattleModal(battle);
        return battle;
    }
    
    // Called from world view when a battle is triggered
    triggerBattle(battleData = null) {
        if (battleData) {
            this.currentBattle = battleData;
            this.showBattleModal(battleData);
        } else {
            console.log('No battle data provided for trigger');
        }
    }
    
    showBattleModal(battle) {
        const modal = document.getElementById('battle-modal');
        const locationSpan = document.getElementById('battle-location');
        const weatherDisplay = document.getElementById('weather-display');
        const terrainDisplay = document.getElementById('terrain-display');
        
        if (modal) {
            modal.style.display = 'flex';
        }
        
        if (locationSpan) {
            locationSpan.textContent = battle.location;
        }
        
        if (weatherDisplay) {
            weatherDisplay.textContent = this.getWeatherIcon(battle.weather) + ' ' + 
                                       battle.weather.charAt(0).toUpperCase() + battle.weather.slice(1);
        }
        
        if (terrainDisplay) {
            terrainDisplay.textContent = this.getTerrainIcon(battle.terrain) + ' ' + 
                                       battle.terrain.charAt(0).toUpperCase() + battle.terrain.slice(1);
        }
        
        // Setup battle field
        this.setupBattleField(battle);
    }
    
    getWeatherIcon(weather) {
        const icons = {
            clear: '☀️',
            rain: '🌧️',
            fog: '🌫️',
            storm: '⛈️',
            snow: '❄️',
            wind: '💨'
        };
        return icons[weather] || '🌤️';
    }
    
    getTerrainIcon(terrain) {
        const icons = {
            plains: '🌾',
            forest: '🌲',
            hills: '⛰️',
            swamp: '🌿',
            desert: '🏜️',
            mountains: '🏔️'
        };
        return icons[terrain] || '🌾';
    }
    
    setupBattleField(battle) {
        // Use the armies from the encounter
        this.gameState.army = battle.playerArmy || this.generatePlayerArmy();
        this.generateEnemyArmy(battle.enemyArmy);
        this.updateArmyDisplay();
        this.logBattleEvent(`Battle at ${battle.location} - ${battle.enemyArmy?.name || 'Enemy forces'} encountered!`);
    }
    
    watchBattle() {
        this.isWatching = true;
        this.startBattleAnimation();
        
        // Hide options, show pause button
        document.getElementById('watch-battle-btn').style.display = 'none';
        document.getElementById('auto-resolve-btn').style.display = 'none';
        document.getElementById('pause-battle-btn').style.display = 'inline-block';
    }
    
    autoResolveBattle() {
        this.resolveBattleInstantly();
    }
    
    pauseBattle() {
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        // Show resume options
        document.getElementById('watch-battle-btn').style.display = 'inline-block';
        document.getElementById('watch-battle-btn').textContent = '▶️ Resume';
        document.getElementById('pause-battle-btn').style.display = 'none';
    }
    
    setBattleSpeed(speed) {
        this.battleSpeed = speed;
        
        // Update active speed button
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`speed-${speed}x`).classList.add('active');
        
        // Restart battle timer with new speed if watching
        if (this.isWatching && this.battleTimer) {
            clearInterval(this.battleTimer);
            this.startBattleAnimation();
        }
    }
    
    closeBattleModal() {
        const modal = document.getElementById('battle-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset battle state
        this.isWatching = false;
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
    }
    
    startBattleAnimation() {
        const interval = 1000 / this.battleSpeed; // Base interval adjusted by speed
        
        this.battleTimer = setInterval(() => {
            this.processBattleTurn();
        }, interval);
    }
    
    processBattleTurn() {
        // Simple battle simulation
        if (!this.currentBattle || this.currentBattle.resolved) {
            this.endBattle();
            return;
        }
        
        // Simulate battle turn
        const playerPower = this.calculatePlayerPower();
        const enemyPower = this.calculateEnemyPower();
        
        // Apply damage based on power difference
        if (playerPower > enemyPower) {
            this.logBattleEvent('⚔️ Your forces advance!');
            this.currentBattle.enemyForce.hp = (this.currentBattle.enemyForce.hp || 100) - 10;
        } else {
            this.logBattleEvent('🛡️ Enemy forces push back!');
            // Player takes damage (could affect units)
        }
        
        // Check for battle end
        if ((this.currentBattle.enemyForce.hp || 100) <= 0) {
            this.victory();
        } else if (playerPower <= 0) {
            this.defeat();
        }
    }
    
    victory() {
        this.currentBattle.resolved = true;
        this.currentBattle.result = 'victory';
        this.logBattleEvent('🎉 Victory! The battle is won!');
        this.endBattle();
    }
    
    defeat() {
        this.currentBattle.resolved = true;
        this.currentBattle.result = 'defeat';
        this.logBattleEvent('💔 Defeat... The enemy has won this battle.');
        this.endBattle();
    }
    
    endBattle() {
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        // Reset UI
        document.getElementById('watch-battle-btn').style.display = 'inline-block';
        document.getElementById('watch-battle-btn').textContent = '👁️ Watch Battle';
        document.getElementById('auto-resolve-btn').style.display = 'inline-block';
        document.getElementById('pause-battle-btn').style.display = 'none';
        
        this.isWatching = false;
    }
    
    resolveBattleInstantly() {
        if (!this.currentBattle) return;
        
        const playerPower = this.calculatePlayerPower();
        const enemyPower = this.calculateEnemyPower();
        
        if (playerPower > enemyPower) {
            this.victory();
        } else {
            this.defeat();
        }
    }
    
    calculatePlayerPower() {
        const army = this.gameState.army || [];
        let totalPower = 0;
        
        army.forEach(unit => {
            const unitStats = this.getUnitStats(unit.type);
            totalPower += (unitStats.health + unitStats.attack + unitStats.defense) * unit.count;
        });
        
        // Commander bonus
        const commanderBonus = this.activeCommander.experience * 0.1;
        totalPower *= (1 + commanderBonus);
        
        // Weather and terrain modifiers
        totalPower *= this.getEnvironmentModifier();
        
        return totalPower;
    }
    
    calculateEnemyPower() {
        if (!this.currentBattle || !this.currentBattle.enemyForce) return 0;
        
        const basepower = this.currentBattle.enemyForce.difficulty * 100;
        const sizeMultiplier = {
            'small': 0.8,
            'medium': 1.0,
            'large': 1.5
        };
        
        return basepower * (sizeMultiplier[this.currentBattle.enemyForce.size] || 1.0);
    }
    
    getEnvironmentModifier() {
        let modifier = 1.0;
        
        // Weather effects
        switch (this.currentBattle?.weather || 'clear') {
            case 'rain':
                modifier *= 0.9; // Reduced effectiveness
                break;
            case 'fog':
                modifier *= 0.85; // Visibility issues
                break;
            case 'storm':
                modifier *= 0.8; // Major penalties
                break;
            case 'snow':
                modifier *= 0.9; // Cold penalties
                break;
        }
        
        // Terrain effects - simplified
        switch (this.currentBattle?.terrain || 'plains') {
            case 'forest':
                modifier *= 1.1; // Defensive advantage
                break;
            case 'hills':
                modifier *= 1.15; // High ground
                break;
            case 'swamp':
                modifier *= 0.85; // Movement penalties
                break;
        }
        
        return modifier;
    }
    
    generatePlayerArmy() {
        // Generate army based on villager population and barracks
        const army = [];
        const villagers = this.gameState.villagers || [];
        
        villagers.forEach(villager => {
            const unitType = this.getUnitTypeFromVillager(villager);
            const existingUnit = army.find(u => u.type === unitType);
            
            if (existingUnit) {
                existingUnit.count++;
            } else {
                army.push({
                    type: unitType,
                    count: 1,
                    stats: this.getUnitStats(unitType)
                });
            }
        });
        
        this.gameState.army = army;
    }
    
    generateEnemyArmy(enemyArmyData) {
        // Generate enemy units based on the encounter data
        this.enemies = [];
        
        if (!enemyArmyData) {
            console.warn('No enemy army data provided');
            return;
        }
        
        const unitCount = {
            'small': 3,
            'medium': 5,
            'large': 8,
            'huge': 12
        }[enemyArmyData.size] || 5;
        
        const basePower = enemyArmyData.basePower || 100;
        const unitPower = basePower / unitCount;
        
        for (let i = 0; i < unitCount; i++) {
            this.enemies.push({
                id: `enemy_${i}`,
                type: enemyArmyData.unitType || 'enemy',
                health: Math.floor(unitPower * 0.6),
                maxHealth: Math.floor(unitPower * 0.6),
                attack: Math.floor(unitPower * 0.4)
            });
        }
        
        console.log(`Generated ${unitCount} enemy units for ${enemyArmyData.name}`);
    }
    
    getUnitTypeFromVillager(villager) {
        // Map villager profession to unit type
        const professionToUnit = {
            'Guard': 'veteran_soldier',
            'Blacksmith': 'heavy_infantry',
            'Woodcutter': 'archer',
            'Builder': 'engineer',
            'Merchant': 'scout',
            'Miner': 'sapper'
        };
        
        return professionToUnit[villager.profession] || 'militia';
    }
    
    getUnitStats(unitType) {
        const stats = {
            militia: { health: 80, attack: 12, defense: 8 },
            archer: { health: 70, attack: 18, defense: 6 },
            veteran_soldier: { health: 100, attack: 20, defense: 15 },
            heavy_infantry: { health: 120, attack: 16, defense: 20 },
            engineer: { health: 90, attack: 10, defense: 12 },
            scout: { health: 75, attack: 14, defense: 8 },
            sapper: { health: 85, attack: 15, defense: 10 }
        };
        
        return stats[unitType] || stats.militia;
    }
    
    updateArmyDisplay() {
        const playerArmyDiv = document.getElementById('player-army-units');
        const enemyArmyDiv = document.getElementById('enemy-army-units');
        
        if (playerArmyDiv) {
            playerArmyDiv.innerHTML = '';
            (this.gameState.army || []).forEach(unit => {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'army-unit';
                unitDiv.innerHTML = `
                    <div class="unit-icon">${this.gameState.getUnitIcon(unit.type)}</div>
                    <div class="unit-info">
                        <div class="unit-type">${unit.type.replace('_', ' ')}</div>
                        <div class="unit-count">x${unit.count}</div>
                    </div>
                `;
                playerArmyDiv.appendChild(unitDiv);
            });
        }
        
        if (enemyArmyDiv) {
            enemyArmyDiv.innerHTML = '';
            const enemyDiv = document.createElement('div');
            enemyDiv.className = 'army-unit';
            enemyDiv.innerHTML = `
                <div class="unit-icon">👹</div>
                <div class="unit-info">
                    <div class="unit-type">${this.currentBattle?.enemyForce?.name || 'Enemy'}</div>
                    <div class="unit-count">${this.currentBattle?.enemyForce?.size || 'Unknown'} force</div>
                </div>
            `;
            enemyArmyDiv.appendChild(enemyDiv);
        }
    }
    
    logBattleEvent(message) {
        const battleLog = document.getElementById('battle-log');
        if (battleLog) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            battleLog.appendChild(logEntry);
            battleLog.scrollTop = battleLog.scrollHeight;
        }
        
        // Also log to game state if available
        if (this.gameState.logBattleEvent) {
            this.gameState.logBattleEvent(message);
        }
    }
    
    // Method to be called from world view to check for active battles/encounters
    getActiveBattles() {
        return this.activeBattles || [];
    }
    
    // Method to get battle summary for world view display
    getBattleSummary(battle) {
        return {
            location: battle.location,
            enemy: battle.enemyArmy?.name || 'Unknown Enemy',
            difficulty: this.calculateBattleDifficulty(battle),
            weather: battle.weather,
            terrain: battle.terrain,
            type: battle.type || 'encounter'
        };
    }
    
    // Calculate battle difficulty based on army comparison
    calculateBattleDifficulty(battle) {
        const playerPower = this.calculatePlayerPowerFromArmy(battle.playerArmy);
        const enemyPower = this.calculateEnemyPowerFromArmy(battle.enemyArmy);
        
        const ratio = enemyPower / Math.max(playerPower, 1);
        
        if (ratio < 0.7) return 1; // Easy
        if (ratio < 1.2) return 2; // Medium  
        if (ratio < 2.0) return 3; // Hard
        return 4; // Very Hard
    }
    
    calculatePlayerPowerFromArmy(army) {
        if (!army || !Array.isArray(army)) return 100; // Default power
        
        let totalPower = 0;
        army.forEach(unit => {
            const unitStats = this.getUnitStats(unit.type);
            totalPower += (unitStats.health + unitStats.attack + unitStats.defense) * (unit.count || 1);
        });
        
        return totalPower || 100;
    }
    
    calculateEnemyPowerFromArmy(enemyArmy) {
        if (!enemyArmy) return 100;
        
        const basePower = enemyArmy.basePower || 100;
        const sizeMultiplier = {
            'small': 0.8,
            'medium': 1.0,
            'large': 1.5,
            'huge': 2.0
        };
        
        return basePower * (sizeMultiplier[enemyArmy.size] || 1.0);
    }
    
    // Generate enemy army (can be called for world map encounters or defensive battles)
    generateEnemies(enemyData = null) {
        // If specific enemy data provided (from world map), use that
        if (enemyData && enemyData.army) {
            this.enemies = enemyData.army.map(unit => ({
                ...unit,
                x: Math.random() * 150 + 350, // Position on battlefield
                y: Math.random() * 200 + 100
            }));
            this.gameState.logBattleEvent(`⚔️ Encountering ${enemyData.name || 'Enemy Force'}: ${this.enemies.length} enemies!`);
            return;
        }

        // Default defensive battle generation (simplified from waves)
        const baseEnemyCount = 3 + Math.floor(Math.random() * 5);
        const difficultyMultiplier = 1 + (this.gameState.defeatedArmies || 0) * 0.2;
        
        this.enemies = [];
        for (let i = 0; i < baseEnemyCount; i++) {
            const enemyTypes = ['goblin', 'orc', 'skeleton', 'troll', 'bandit'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            this.enemies.push({
                id: `enemy_${i}`,
                type: type,
                health: Math.floor((50 + Math.random() * 50) * difficultyMultiplier),
                maxHealth: Math.floor((50 + Math.random() * 50) * difficultyMultiplier),
                attack: Math.floor((10 + Math.random() * 15) * difficultyMultiplier),
                x: Math.random() * 400 + 450, // Right side of battlefield
                y: Math.random() * 300 + 50,
                ai: this.generateEnemyAI(type)
            });
        }
        
        this.gameState.logBattleEvent(`🚨 ${baseEnemyCount} enemies approaching your territory!`);
    }
    
    generateEnemyAI(type) {
        const aiTypes = {
            goblin: { aggression: 0.8, intelligence: 0.3, speed: 0.9 },
            orc: { aggression: 0.9, intelligence: 0.5, speed: 0.6 },
            skeleton: { aggression: 0.6, intelligence: 0.7, speed: 0.7 },
            troll: { aggression: 0.7, intelligence: 0.4, speed: 0.3 }
        };
        
        return aiTypes[type] || { aggression: 0.5, intelligence: 0.5, speed: 0.5 };
    }
    
    updateWeatherAndTerrain() {
        const weathers = ['clear', 'rain', 'fog', 'storm', 'snow'];
        const terrains = ['plains', 'forest', 'hills', 'swamp', 'desert'];
        
        this.weatherCondition = weathers[Math.floor(Math.random() * weathers.length)];
        this.terrainType = terrains[Math.floor(Math.random() * terrains.length)];
        
        this.gameState.logBattleEvent(`🌤️ Weather: ${this.weatherCondition}, Terrain: ${this.terrainType}`);
    }
    
    startBattle() {
        this.gameState.battleInProgress = true;
        this.battlePhase = 'fighting';
        
        // Select commander based on conditions and AI learning
        this.selectOptimalCommander();
        
        this.gameState.logBattleEvent(`⚔️ Battle begins! ${this.activeCommander.name} takes command with ${this.activeCommander.strategy} strategy`);
        
        // Show toast for battle start - it's informational but not critical
        if (window.showToast) {
            window.showToast(`Battle started! ${this.activeCommander.name} commanding`, {
                icon: '⚔️',
                type: 'info',
                timeout: 2500
            });
        }
        
        // Update UI
        const startButton = document.getElementById('start-battle-btn');
        if (startButton) {
            startButton.textContent = 'Stop Battle';
            startButton.style.background = '#e74c3c';
        }

        // Start battle timer
        this.battleTimer = setInterval(() => {
            this.updateBattle();
        }, 1000);
    }

    // New method for expedition battles
    startExpeditionBattle(location) {
        // Generate enemies based on location difficulty
        this.generateExpeditionEnemies(location);
        this.updateWeatherAndTerrain();
        this.renderBattleField();
        
        // Start the battle automatically
        this.startBattle();
        
        // Set expedition battle flag
        this.isExpeditionBattle = true;
        this.expeditionLocation = location;
        
        window.showNotification(
            `⚔️ Expedition battle at ${location.name} begins!`,
            { timeout: 4000, icon: '🏰' }
        );
    }

    generateExpeditionEnemies(location) {
        const difficultyMultipliers = {
            'easy': 1.0,
            'medium': 1.5,
            'hard': 2.0,
            'extreme': 3.0
        };
        
        const multiplier = difficultyMultipliers[location.difficulty] || 1.0;
        const enemyCount = Math.floor((2 + Math.random() * 4) * multiplier);
        
        this.enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            let enemyTypes = ['goblin', 'orc', 'skeleton'];
            
            // Add stronger enemies for harder locations
            if (location.difficulty === 'medium' || location.difficulty === 'hard') {
                enemyTypes.push('troll', 'ogre');
            }
            if (location.difficulty === 'extreme') {
                enemyTypes.push('dragon', 'lich');
            }
            
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            this.enemies.push({
                id: `enemy_${i}`,
                type: type,
                health: Math.floor((30 + Math.random() * 40) * multiplier),
                maxHealth: Math.floor((30 + Math.random() * 40) * multiplier),
                attack: Math.floor((8 + Math.random() * 12) * multiplier),
                x: Math.random() * 400 + 450,
                y: Math.random() * 300 + 50,
                ai: this.generateEnemyAI(type)
            });
        }
    }
    
    selectOptimalCommander() {
        // AI learning system - commanders remember what worked
        let bestCommander = this.commanders[0];
        let bestScore = 0;
        
        this.commanders.forEach(commander => {
            let score = commander.experience;
            
            // Personality bonuses based on conditions
            if (this.weatherCondition === 'storm' && commander.personality === 'defensive') {
                score += 10;
            } else if (this.terrainType === 'forest' && commander.personality === 'cunning') {
                score += 10;
            } else if (this.enemies.length > 5 && commander.personality === 'aggressive') {
                score += 10;
            }
            
            // Random factor
            score += Math.random() * 5;
            
            if (score > bestScore) {
                bestScore = score;
                bestCommander = commander;
            }
        });
        
        this.activeCommander = bestCommander;
    }

    // Create units from villager population with skill-based specialization
    recruitUnitsFromPopulation() {
        if (!this.gameState.populationManager) {
            console.warn('[Battle] No population manager available for recruitment');
            return;
        }

        // Get available villagers for military service (adults only, not already drafted)
        const availableVillagers = this.gameState.populationManager.population.filter(villager => {
            return villager.age >= 46 && villager.age <= 75 && // Adults only for military
                   villager.status !== 'drafted' && 
                   villager.canWork;
        });

        if (availableVillagers.length === 0) {
            console.log('[Battle] No available villagers for recruitment');
            return;
        }

        // Create units based on villager skills and characteristics
        const newUnits = availableVillagers.slice(0, 10).map(villager => {
            const unitType = this.determineUnitTypeFromVillager(villager);
            const unitStats = this.calculateUnitStats(villager, unitType);
            
            // Mark villager as drafted
            this.gameState.populationManager.updateStatus(villager.id, 'drafted');
            
            return {
                id: `unit_${villager.id}`,
                villagerId: villager.id,
                name: villager.name,
                type: unitType,
                health: unitStats.health,
                maxHealth: unitStats.health,
                attack: unitStats.attack,
                defense: unitStats.defense,
                speed: unitStats.speed,
                morale: unitStats.morale,
                experience: 0,
                skills: villager.skills || [],
                x: Math.random() * 150 + 50,
                y: Math.random() * 200 + 100,
                originalVillager: {
                    role: villager.role,
                    age: villager.age,
                    happiness: villager.happiness || 75
                }
            };
        });

        // Replace the simple army with skill-based units
        this.gameState.army = newUnits;
        
        // Emit drafting event for achievements
        if (window.achievementSystem) {
            window.achievementSystem.emitPopulationDrafted(newUnits.length, { 
                source: 'recruitment',
                unitTypes: newUnits.map(u => u.type)
            });
        }

        console.log(`[Battle] Recruited ${newUnits.length} units from population:`, 
                   newUnits.map(u => `${u.name} (${u.type})`));
    }

    // Determine unit type based on villager skills and characteristics
    determineUnitTypeFromVillager(villager) {
        const skills = villager.skills || [];
        const role = villager.role;

        // Skill-based unit assignment priority
        if (skills.includes('Fighting') || role === 'guard') {
            return 'veteran_soldier';
        } else if (skills.includes('Crafting') || role === 'blacksmith') {
            return 'heavy_infantry';
        } else if (skills.includes('Woodcutting') || skills.includes('Farming')) {
            return 'archer';
        } else if (skills.includes('Building') || role === 'builder') {
            return 'engineer';
        } else if (skills.includes('Trading') || role === 'merchant') {
            return 'scout';
        } else if (skills.includes('Mining') || role === 'miner') {
            return 'sapper';
        } else {
            return 'militia'; // Default for peasants
        }
    }

    // Calculate unit stats based on villager attributes and unit type
    calculateUnitStats(villager, unitType) {
        const baseStats = this.getBaseUnitStats(unitType);
        
        // Age affects stats (prime fighting age 46-55)
        const ageFactor = villager.age <= 55 ? 1.0 : Math.max(0.7, 1.0 - (villager.age - 55) * 0.02);
        
        // Happiness affects morale
        const happinessFactor = (villager.happiness || 75) / 100;
        
        // Skills provide bonuses
        const skillBonus = this.calculateSkillBonus(villager.skills || [], unitType);
        
        return {
            health: Math.floor(baseStats.health * ageFactor * (1 + skillBonus.health)),
            attack: Math.floor(baseStats.attack * ageFactor * (1 + skillBonus.attack)),
            defense: Math.floor(baseStats.defense * ageFactor * (1 + skillBonus.defense)),
            speed: Math.floor(baseStats.speed * ageFactor * (1 + skillBonus.speed)),
            morale: Math.floor(baseStats.morale * happinessFactor * (1 + skillBonus.morale))
        };
    }

    // Base stats for each unit type (as per wiki specifications)
    getBaseUnitStats(unitType) {
        const stats = {
            militia: { health: 80, attack: 12, defense: 8, speed: 10, morale: 60 },
            archer: { health: 70, attack: 18, defense: 6, speed: 12, morale: 65 },
            veteran_soldier: { health: 100, attack: 20, defense: 15, speed: 8, morale: 85 },
            heavy_infantry: { health: 120, attack: 16, defense: 20, speed: 6, morale: 75 },
            engineer: { health: 90, attack: 10, defense: 12, speed: 8, morale: 70 },
            scout: { health: 75, attack: 14, defense: 8, speed: 16, morale: 80 },
            sapper: { health: 85, attack: 15, defense: 10, speed: 9, morale: 70 }
        };
        
        return stats[unitType] || stats.militia;
    }

    // Calculate skill bonuses for unit stats
    calculateSkillBonus(skills, unitType) {
        let bonus = { health: 0, attack: 0, defense: 0, speed: 0, morale: 0 };
        
        skills.forEach(skill => {
            switch (skill) {
                case 'Fighting':
                    bonus.attack += 0.15;
                    bonus.defense += 0.1;
                    bonus.morale += 0.1;
                    break;
                case 'Crafting':
                    bonus.defense += 0.1;
                    bonus.health += 0.05;
                    break;
                case 'Farming':
                    bonus.health += 0.1;
                    bonus.morale += 0.05;
                    break;
                case 'Building':
                    bonus.defense += 0.15;
                    break;
                case 'Trading':
                    bonus.speed += 0.1;
                    bonus.morale += 0.1;
                    break;
                case 'Mining':
                    bonus.health += 0.1;
                    bonus.attack += 0.05;
                    break;
                case 'Woodcutting':
                    if (unitType === 'archer') {
                        bonus.attack += 0.2; // Archery bonus
                    }
                    bonus.speed += 0.05;
                    break;
            }
        });
        
        return bonus;
    }

    // Load commander experience from localStorage
    loadCommanderData() {
        try {
            const saved = localStorage.getItem('commanderData');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Update commander experience while preserving other properties
                this.commanders.forEach(commander => {
                    const savedCommander = data.find(c => c.name === commander.name);
                    if (savedCommander) {
                        commander.experience = savedCommander.experience || 0;
                    }
                });
                
                console.log('[Battle] Loaded commander experience data');
            }
        } catch (error) {
            console.warn('[Battle] Could not load commander data:', error);
        }
    }

    // Save commander experience to localStorage
    saveCommanderData() {
        try {
            const commanderData = this.commanders.map(commander => ({
                name: commander.name,
                experience: commander.experience
            }));
            
            localStorage.setItem('commanderData', JSON.stringify(commanderData));
            console.log('[Battle] Saved commander experience data');
        } catch (error) {
            console.warn('[Battle] Could not save commander data:', error);
        }
    }
    
    updateBattle() {
        if (this.battlePhase !== 'fighting') return;
        
        // Simulate battle round
        this.executeCommanderStrategy();
        this.updateFormations();
        this.processEnemyActions();
        this.checkBattleEnd();
        this.renderBattleField();
    }
    
    executeCommanderStrategy() {
        const strategy = this.activeCommander.strategy;
        const weatherMultiplier = this.getWeatherMultiplier();
        const terrainMultiplier = this.getTerrainMultiplier();
        
        let effectiveness = 1.0;
        
        switch (strategy) {
            case 'frontal_assault':
                effectiveness = 1.2 * weatherMultiplier * terrainMultiplier;
                this.gameState.logBattleEvent(`${this.activeCommander.name} orders a frontal assault!`);
                break;
            case 'shield_wall':
                effectiveness = 0.8 * weatherMultiplier * terrainMultiplier;
                this.gameState.logBattleEvent(`${this.activeCommander.name} forms a defensive shield wall!`);
                break;
            case 'flanking':
                effectiveness = 1.1 * weatherMultiplier * terrainMultiplier;
                this.gameState.logBattleEvent(`${this.activeCommander.name} attempts a flanking maneuver!`);
                break;
        }
        
        // Apply strategy to army
        this.gameState.army.forEach(unit => {
            if (unit.health > 0) {
                const damage = Math.floor(unit.attack * effectiveness * (0.8 + Math.random() * 0.4));
                this.dealDamageToEnemies(damage);
            }
        });
    }
    
    getWeatherMultiplier() {
        const multipliers = {
            clear: 1.0,
            rain: 0.9,
            fog: 0.8,
            storm: 0.7,
            snow: 0.85
        };
        return multipliers[this.weatherCondition] || 1.0;
    }
    
    getTerrainMultiplier() {
        const multipliers = {
            plains: 1.0,
            forest: 0.9,
            hills: 1.1,
            swamp: 0.8,
            desert: 0.95
        };
        return multipliers[this.terrainType] || 1.0;
    }
    
    updateFormations() {
        // Simulate natural formation dynamics
        if (Math.random() > 0.7) {
            const formations = ['line', 'wedge', 'circle', 'scattered'];
            const formation = formations[Math.floor(Math.random() * formations.length)];
            this.gameState.logBattleEvent(`🛡️ Army naturally forms ${formation} formation`);
        }
    }
    
    dealDamageToEnemies(totalDamage) {
        const aliveEnemies = this.enemies.filter(enemy => enemy.health > 0);
        if (aliveEnemies.length === 0) return;
        
        // Distribute damage among enemies
        const damagePerEnemy = Math.floor(totalDamage / aliveEnemies.length);
        
        aliveEnemies.forEach(enemy => {
            const actualDamage = Math.floor(damagePerEnemy * (0.8 + Math.random() * 0.4));
            enemy.health = Math.max(0, enemy.health - actualDamage);
            
            if (enemy.health === 0) {
                this.gameState.logBattleEvent(`💀 Defeated ${enemy.type}!`);
            }
        });
    }
    
    processEnemyActions() {
        const aliveEnemies = this.enemies.filter(enemy => enemy.health > 0);
        
        aliveEnemies.forEach(enemy => {
            // Enemy AI decision making
            const action = this.getEnemyAction(enemy);
            
            if (action === 'attack') {
                const damage = Math.floor(enemy.attack * (0.8 + Math.random() * 0.4));
                this.dealDamageToArmy(damage);
            }
        });
    }
    
    getEnemyAction(enemy) {
        const ai = enemy.ai;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        // Simple AI decision tree
        if (healthPercent < 0.3 && ai.intelligence > 0.6) {
            return 'retreat'; // Smart enemies retreat when low on health
        } else if (ai.aggression > 0.7) {
            return 'attack';
        } else if (Math.random() < ai.speed) {
            return 'attack';
        }
        
        return 'defend';
    }
    
    dealDamageToArmy(totalDamage) {
        const aliveUnits = this.gameState.army.filter(unit => unit.health > 0);
        if (aliveUnits.length === 0) return;
        
        // Commander defensive bonuses
        let defensiveMultiplier = 1.0;
        if (this.activeCommander.personality === 'defensive') {
            defensiveMultiplier = 0.8;
        }
        
        const adjustedDamage = Math.floor(totalDamage * defensiveMultiplier);
        const damagePerUnit = Math.floor(adjustedDamage / aliveUnits.length);
        
        aliveUnits.forEach(unit => {
            const actualDamage = Math.floor(damagePerUnit * (0.8 + Math.random() * 0.4));
            unit.health = Math.max(0, unit.health - actualDamage);
            
            if (unit.health === 0) {
                this.gameState.logBattleEvent(`💔 Lost ${unit.type}!`);
            }
        });
    }
    
    checkBattleEnd() {
        const aliveEnemies = this.enemies.filter(enemy => enemy.health > 0).length;
        const aliveUnits = this.gameState.army.filter(unit => unit.health > 0).length;
        
        if (aliveEnemies === 0) {
            this.endBattle('victory');
        } else if (aliveUnits === 0) {
            this.endBattle('defeat');
        }
    }
    
    endBattle(result) {
        this.gameState.battleInProgress = false;
        this.battlePhase = result;
        
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        // Update commander experience
        if (result === 'victory') {
            this.activeCommander.experience += 10;
            this.saveCommanderData(); // Save experience progression
            
            // Handle expedition battle completion differently
            if (this.isExpeditionBattle && this.expeditionLocation) {
                this.gameState.logBattleEvent(`🎉 Victory at ${this.expeditionLocation.name}! Beginning return journey...`);
                
                // Heal surviving units
                this.gameState.army.forEach(unit => {
                    if (unit.health > 0) {
                        unit.health = Math.min(100, unit.health + 20);
                        unit.experience = (unit.experience || 0) + 5;
                    }
                });
                
                // Start return journey via quest manager
                setTimeout(() => {
                    if (window.game && window.game.questManager) {
                        window.game.questManager.startReturnJourney();
                    }
                }, 2000);
                
                // Clear expedition flags
                this.isExpeditionBattle = false;
                this.expeditionLocation = null;
                
            } else {
                // Regular battle completion
                this.gameState.defeatedArmies = (this.gameState.defeatedArmies || 0) + 1;
                const goldReward = Math.floor(50 * (1 + this.gameState.defeatedArmies * 0.1));
                this.gameState.gold += goldReward;
                this.gameState.logBattleEvent(`🎉 Victory! Enemy army defeated!`);
                
                // Show important battle victory modal
                if (window.showModal) {
                    window.showModal(
                        '🎉 Victory!',
                        `<p><strong>Enemy army defeated!</strong></p>
                        <p>💰 Gold earned: ${goldReward}</p>
                        <p>⚔️ Commander ${this.activeCommander.name} gained experience</p>
                        <p>🏥 Surviving units healed</p>
                        <p>🗺️ Territory secured for expansion</p>`,
                        { type: 'success', icon: '🏆' }
                    );
                }
                
                // Heal surviving units
                this.gameState.army.forEach(unit => {
                    if (unit.health > 0) {
                        unit.health = Math.min(100, unit.health + 20);
                        unit.experience = (unit.experience || 0) + 5;
                    }
                });
                
                // Return to world map or village view
                setTimeout(() => {
                    // Allow for next battles or world map encounters
                    this.isActive = false;
                    console.log('[Battle] Victory - returning to exploration mode');
                }, 2000);
            }
            
        } else {
            this.activeCommander.experience += 2; // Small experience for trying
            this.saveCommanderData(); // Save experience even for defeats
            
            if (this.isExpeditionBattle) {
                this.gameState.logBattleEvent(`💀 Defeat at ${this.expeditionLocation.name}! Army retreats...`);
                
                // For expedition defeats, still start return journey but with reduced rewards
                setTimeout(() => {
                    if (window.game && window.game.questManager) {
                        window.game.questManager.startReturnJourney(true); // true = defeated
                    }
                }, 2000);
                
                this.isExpeditionBattle = false;
                this.expeditionLocation = null;
                
            } else {
                this.gameState.logBattleEvent(`💀 Defeat! Retreating to monarch view...`);
                
                // Show important defeat modal 
                if (window.showModal) {
                    window.showModal(
                        '💀 Defeat!',
                        `<p><strong>Your army has been defeated!</strong></p>
                        <p>⚰️ Army has fallen but will be restored</p>
                        <p>🏰 Retreat to the Monarch view to spend gold on improvements</p>
                        <p>💡 Invest in better commanders, equipment, or village upgrades</p>
                        <p><em>This is how you grow stronger for the next attempt!</em></p>`,
                        { type: 'warning', icon: '⚔️' }
                    ).then(() => {
                        // Switch to monarch view after user acknowledges
                        if (window.game) {
                            window.game.switchView('monarch');
                        }
                    });
                }
                
                // Reset army
                this.gameState.army = [
                    { id: 'soldier1', type: 'soldier', health: 100, attack: 15, experience: 0 },
                    { id: 'archer1', type: 'archer', health: 80, attack: 20, experience: 0 }
                ];
                
                // Trigger monarch view transition after short delay (fallback if modal not shown)
                setTimeout(() => {
                    if (window.game) {
                        window.game.switchView('monarch');
                    }
                }, 3000);
            }
        }
        
        // Update UI
        const startButton = document.getElementById('start-battle-btn');
        if (startButton) {
            startButton.textContent = result === 'victory' ? 'Start Next Battle' : 'Start Battle';
            startButton.style.background = result === 'victory' ? '#27ae60' : '#3498db';
        }
        
        this.gameState.updateUI();
    }
    
    stopBattle() {
        if (this.battleTimer) {
            clearInterval(this.battleTimer);
            this.battleTimer = null;
        }
        
        this.gameState.battleInProgress = false;
        this.battlePhase = 'preparation';
        
        const startButton = document.getElementById('start-battle-btn');
        if (startButton) {
            startButton.textContent = 'Start Battle';
            startButton.style.background = '#3498db';
        }
        
        this.gameState.logBattleEvent('⏸️ Battle stopped by player');
    }
    
    renderBattleField() {
        if (!this.battleField) {
            console.warn('[Battle] Cannot render battle field - element not found');
            return;
        }
        
        // Clear battlefield
        const existingUnits = this.battleField.querySelectorAll('.battle-unit, .battle-enemy');
        existingUnits.forEach(unit => unit.remove());
        
        // Render army units (left side)
        this.gameState.army.forEach((unit, index) => {
            if (unit.health > 0) {
                const unitEl = document.createElement('div');
                unitEl.className = 'battle-unit';
                unitEl.style.position = 'absolute';
                unitEl.style.left = (50 + index * 40) + 'px';
                unitEl.style.top = (100 + index * 50) + 'px';
                unitEl.style.width = '30px';
                unitEl.style.height = '30px';
                unitEl.style.background = unit.health > 50 ? '#27ae60' : '#e74c3c';
                unitEl.style.borderRadius = '50%';
                unitEl.style.display = 'flex';
                unitEl.style.alignItems = 'center';
                unitEl.style.justifyContent = 'center';
                unitEl.style.color = 'white';
                unitEl.style.fontSize = '16px';
                unitEl.textContent = this.gameState.getUnitIcon(unit.type);
                unitEl.title = `${unit.type} - HP: ${unit.health}`;
                
                this.battleField.appendChild(unitEl);
            }
        });
        
        // Render enemies (right side)
        this.enemies.forEach((enemy, index) => {
            if (enemy.health > 0) {
                const enemyEl = document.createElement('div');
                enemyEl.className = 'battle-enemy';
                enemyEl.style.position = 'absolute';
                enemyEl.style.left = enemy.x + 'px';
                enemyEl.style.top = enemy.y + 'px';
                enemyEl.style.width = '30px';
                enemyEl.style.height = '30px';
                enemyEl.style.background = enemy.health > enemy.maxHealth * 0.5 ? '#8b4513' : '#e74c3c';
                enemyEl.style.borderRadius = '50%';
                enemyEl.style.display = 'flex';
                enemyEl.style.alignItems = 'center';
                enemyEl.style.justifyContent = 'center';
                enemyEl.style.color = 'white';
                enemyEl.style.fontSize = '16px';
                enemyEl.textContent = this.getEnemyIcon(enemy.type);
                enemyEl.title = `${enemy.type} - HP: ${enemy.health}`;
                
                this.battleField.appendChild(enemyEl);
            }
        });
    }
    
    getEnemyIcon(type) {
        const icons = {
            goblin: '👹',
            orc: '👺',
            skeleton: '💀',
            troll: '👹'
        };
        return icons[type] || '👾';
    }
}

// Make BattleManager globally available
window.BattleManager = BattleManager;

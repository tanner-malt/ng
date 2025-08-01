// Battle system with AI personalities and automation
class BattleManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.battleField = null;
        this.enemies = [];
        this.battleTimer = null;
        this.battlePhase = 'preparation'; // preparation, fighting, victory, defeat
        
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
    }
    
    init() {
        this.battleField = document.getElementById('battle-field');
        if (!this.battleField) {
            console.warn('[Battle] battle-field element not found, skipping battle initialization');
            return;
        }
        this.setupBattleControls();
        this.generateEnemies();
        this.updateWeatherAndTerrain();
        this.renderBattleField();
    }
    
    setupBattleControls() {
        const startButton = document.getElementById('start-battle-btn');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (!this.gameState.battleInProgress) {
                    this.startBattle();
                } else {
                    this.stopBattle();
                }
            });
        }
    }
    
    generateEnemies() {
        const waveMultiplier = 1 + (this.gameState.wave - 1) * 0.3;
        const enemyCount = Math.floor(3 + this.gameState.wave * 1.5);
        
        this.enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const enemyTypes = ['goblin', 'orc', 'skeleton', 'troll'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            this.enemies.push({
                id: `enemy_${i}`,
                type: type,
                health: Math.floor((50 + Math.random() * 50) * waveMultiplier),
                maxHealth: Math.floor((50 + Math.random() * 50) * waveMultiplier),
                attack: Math.floor((10 + Math.random() * 15) * waveMultiplier),
                x: Math.random() * 400 + 450, // Right side of battlefield
                y: Math.random() * 300 + 50,
                ai: this.generateEnemyAI(type)
            });
        }
        
        this.gameState.logBattleEvent(`🚨 Wave ${this.gameState.wave}: ${enemyCount} enemies approaching!`);
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
                this.gameState.wave++;
                this.gameState.gold += Math.floor(50 * (1 + this.gameState.wave * 0.2));
                this.gameState.logBattleEvent(`🎉 Victory! Advancing to wave ${this.gameState.wave}`);
                
                // Heal surviving units
                this.gameState.army.forEach(unit => {
                    if (unit.health > 0) {
                        unit.health = Math.min(100, unit.health + 20);
                        unit.experience = (unit.experience || 0) + 5;
                    }
                });
                
                // Generate new enemies for next wave
                setTimeout(() => {
                    this.generateEnemies();
                    this.updateWeatherAndTerrain();
                }, 2000);
            }
            
        } else {
            this.activeCommander.experience += 2; // Small experience for trying
            
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
                
                // Reset army
                this.gameState.army = [
                    { id: 'soldier1', type: 'soldier', health: 100, attack: 15, experience: 0 },
                    { id: 'archer1', type: 'archer', health: 80, attack: 20, experience: 0 }
                ];
                
                // Trigger monarch view transition after short delay
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

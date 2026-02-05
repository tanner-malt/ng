// Enemy Spawn System - Lairs, Outposts, and Escalating Threats
class EnemySpawnSystem {
    constructor(gameState, worldManager) {
        this.gameState = gameState;
        this.worldManager = worldManager;
        
        // Enemy lairs at map edges
        this.lairs = [];
        this.enemyOutposts = [];
        this.enemyArmies = [];
        
        // Wave system - threat level increases over time
        this.threatLevel = 1;
        this.lastSpawnDay = 0;
        this.spawnCooldown = 10; // Days between spawns
        
        // Lair definitions
        this.lairTypes = {
            goblinDen: {
                name: 'Goblin Den',
                icon: '🕳️',
                baseStrength: 5,
                growthRate: 0.5, // Units per day
                maxUnits: 20,
                unitTypes: ['goblin_scout', 'goblin_warrior'],
                color: '#4a5'
            },
            banditCamp: {
                name: 'Bandit Camp',
                icon: '⚔️',
                baseStrength: 8,
                growthRate: 0.3,
                maxUnits: 15,
                unitTypes: ['bandit', 'bandit_archer'],
                color: '#a54'
            },
            undeadCrypt: {
                name: 'Undead Crypt',
                icon: '💀',
                baseStrength: 10,
                growthRate: 0.2,
                maxUnits: 30,
                unitTypes: ['skeleton', 'zombie', 'wraith'],
                color: '#666'
            },
            orcStronghold: {
                name: 'Orc Stronghold',
                icon: '🏰',
                baseStrength: 15,
                growthRate: 0.4,
                maxUnits: 25,
                unitTypes: ['orc_grunt', 'orc_berserker', 'orc_shaman'],
                color: '#5a4'
            },
            dragonLair: {
                name: 'Dragon Lair',
                icon: '🐉',
                baseStrength: 50,
                growthRate: 0.1,
                maxUnits: 5,
                unitTypes: ['drake', 'wyvern', 'dragon'],
                color: '#a22'
            }
        };
        
        // Unit stats for enemy types
        this.unitStats = {
            goblin_scout: { hp: 15, attack: 3, defense: 1, speed: 3 },
            goblin_warrior: { hp: 25, attack: 5, defense: 2, speed: 2 },
            bandit: { hp: 30, attack: 6, defense: 3, speed: 2 },
            bandit_archer: { hp: 20, attack: 8, defense: 1, speed: 2 },
            skeleton: { hp: 20, attack: 4, defense: 4, speed: 1 },
            zombie: { hp: 40, attack: 3, defense: 2, speed: 1 },
            wraith: { hp: 25, attack: 7, defense: 0, speed: 3 },
            orc_grunt: { hp: 50, attack: 8, defense: 5, speed: 1 },
            orc_berserker: { hp: 40, attack: 12, defense: 2, speed: 2 },
            orc_shaman: { hp: 30, attack: 6, defense: 3, speed: 1, magic: true },
            drake: { hp: 80, attack: 15, defense: 8, speed: 2 },
            wyvern: { hp: 60, attack: 12, defense: 5, speed: 4 },
            dragon: { hp: 200, attack: 30, defense: 15, speed: 2, fire: true }
        };
    }
    
    init() {
        this.loadState();
        
        // Spawn initial lairs at map edges if none exist
        if (this.lairs.length === 0) {
            this.spawnInitialLairs();
        }
        
        console.log('[EnemySpawn] Initialized with', this.lairs.length, 'lairs');
    }
    
    // Spawn lairs at map edges during initialization
    spawnInitialLairs() {
        const mapWidth = this.worldManager.mapWidth;
        const mapHeight = this.worldManager.mapHeight;
        const edgeTiles = this.getEdgeTiles();
        
        // Spawn 2-3 initial lairs at random edge positions
        const numLairs = 2 + Math.floor(Math.random() * 2);
        const shuffled = edgeTiles.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < numLairs && i < shuffled.length; i++) {
            const pos = shuffled[i];
            const lairType = this.selectLairTypeForWave(1);
            this.createLair(pos.row, pos.col, lairType);
        }
    }
    
    // Get all edge tile positions
    getEdgeTiles() {
        const tiles = [];
        const w = this.worldManager.mapWidth;
        const h = this.worldManager.mapHeight;
        
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                // Edge if on border
                if (row === 0 || row === h - 1 || col === 0 || col === w - 1) {
                    // Don't spawn on water or player village
                    const terrain = this.worldManager.hexMap?.[row]?.[col]?.terrain;
                    if (terrain !== 'water' && 
                        !(row === this.worldManager.playerVillageHex.row && 
                          col === this.worldManager.playerVillageHex.col)) {
                        tiles.push({ row, col });
                    }
                }
            }
        }
        return tiles;
    }
    
    // Select appropriate lair type based on wave/threat level
    selectLairTypeForWave(wave) {
        const types = Object.keys(this.lairTypes);
        
        if (wave <= 2) {
            return 'goblinDen';
        } else if (wave <= 4) {
            return Math.random() < 0.7 ? 'banditCamp' : 'goblinDen';
        } else if (wave <= 6) {
            const roll = Math.random();
            if (roll < 0.4) return 'banditCamp';
            if (roll < 0.7) return 'undeadCrypt';
            return 'orcStronghold';
        } else if (wave <= 10) {
            const roll = Math.random();
            if (roll < 0.3) return 'undeadCrypt';
            if (roll < 0.7) return 'orcStronghold';
            return 'dragonLair';
        } else {
            // Late game - mostly strong lairs
            return Math.random() < 0.6 ? 'orcStronghold' : 'dragonLair';
        }
    }
    
    // Create a new lair at position
    createLair(row, col, lairTypeKey) {
        const lairType = this.lairTypes[lairTypeKey];
        if (!lairType) return null;
        
        const lair = {
            id: `lair_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: lairTypeKey,
            name: lairType.name,
            icon: lairType.icon,
            row,
            col,
            currentUnits: lairType.baseStrength,
            maxUnits: lairType.maxUnits,
            growthRate: lairType.growthRate,
            destroyed: false,
            createdDay: this.gameState.day || 1,
            lastGrowthDay: this.gameState.day || 1,
            unitTypes: lairType.unitTypes,
            threatContribution: lairType.baseStrength
        };
        
        this.lairs.push(lair);
        
        // Mark the hex as having a lair
        if (this.worldManager.hexMap?.[row]?.[col]) {
            this.worldManager.hexMap[row][col].lair = lair.id;
            this.worldManager.hexMap[row][col].lairData = lair;
        }
        
        console.log(`[EnemySpawn] Created ${lair.name} at (${row}, ${col})`);
        return lair;
    }
    
    // Process daily growth and spawning
    processDaily() {
        const currentDay = this.gameState.day || 1;
        
        // Grow existing lairs
        this.lairs.forEach(lair => {
            if (lair.destroyed) return;
            
            // Daily growth
            const daysSinceGrowth = currentDay - lair.lastGrowthDay;
            if (daysSinceGrowth >= 1) {
                const growth = lair.growthRate * daysSinceGrowth * (1 + this.threatLevel * 0.1);
                lair.currentUnits = Math.min(lair.maxUnits, lair.currentUnits + growth);
                lair.lastGrowthDay = currentDay;
            }
            
            // Check if lair should spawn an army
            if (lair.currentUnits >= lair.maxUnits * 0.5 && 
                currentDay - this.lastSpawnDay >= this.spawnCooldown) {
                this.spawnArmyFromLair(lair);
            }
        });
        
        // Move existing enemy armies
        this.moveEnemyArmies();
        
        // Potentially spawn new lairs as game progresses
        if (this.shouldSpawnNewLair(currentDay)) {
            this.spawnNewLair();
        }
        
        // Update threat level based on game day
        this.updateThreatLevel(currentDay);
        
        this.saveState();
    }
    
    // Spawn an army from a lair to attack player
    spawnArmyFromLair(lair) {
        const unitsToSend = Math.floor(lair.currentUnits * 0.4); // Send 40% of units
        if (unitsToSend < 3) return; // Need at least 3 units
        
        lair.currentUnits -= unitsToSend;
        
        // Create enemy army
        const army = {
            id: `enemy_army_${Date.now()}`,
            name: `${lair.name} Raiders`,
            fromLair: lair.id,
            row: lair.row,
            col: lair.col,
            targetRow: this.worldManager.playerVillageHex.row,
            targetCol: this.worldManager.playerVillageHex.col,
            units: this.generateUnitsFromLair(lair, unitsToSend),
            totalStrength: unitsToSend,
            movementSpeed: 1, // 1 tile per day
            hostile: true,
            createdDay: this.gameState.day
        };
        
        this.enemyArmies.push(army);
        
        // Register with world manager's enemy tracking
        if (this.worldManager.enemyUnits) {
            this.worldManager.enemyUnits.set(army.id, { row: army.row, col: army.col });
        }
        
        this.lastSpawnDay = this.gameState.day;
        
        console.log(`[EnemySpawn] Army spawned from ${lair.name}: ${unitsToSend} units`);
        window.showToast?.(`⚠️ ${army.name} spotted near ${lair.name}!`, { type: 'warning' });
        
        return army;
    }
    
    // Generate unit composition for army
    generateUnitsFromLair(lair, count) {
        const units = [];
        const unitTypes = lair.unitTypes || ['goblin_scout'];
        
        for (let i = 0; i < count; i++) {
            const typeKey = unitTypes[Math.floor(Math.random() * unitTypes.length)];
            const stats = this.unitStats[typeKey] || { hp: 20, attack: 5, defense: 2, speed: 2 };
            
            units.push({
                type: typeKey,
                hp: stats.hp,
                maxHp: stats.hp,
                attack: stats.attack,
                defense: stats.defense,
                speed: stats.speed,
                alive: true
            });
        }
        
        return units;
    }
    
    // Move enemy armies toward player village
    moveEnemyArmies() {
        const playerPos = this.worldManager.playerVillageHex;
        
        this.enemyArmies.forEach(army => {
            if (!army.hostile) return;
            
            // Simple pathfinding toward player village
            const dx = playerPos.col - army.col;
            const dy = playerPos.row - army.row;
            
            // Move one tile toward target
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                const moveX = dx !== 0 ? Math.sign(dx) : 0;
                const moveY = dy !== 0 ? Math.sign(dy) : 0;
                
                // Prefer cardinal directions
                if (Math.abs(dx) > Math.abs(dy)) {
                    army.col += moveX;
                } else if (Math.abs(dy) > Math.abs(dx)) {
                    army.row += moveY;
                } else {
                    // Equal distance, pick randomly
                    if (Math.random() < 0.5) {
                        army.col += moveX;
                    } else {
                        army.row += moveY;
                    }
                }
                
                // Update world manager tracking
                if (this.worldManager.enemyUnits) {
                    this.worldManager.enemyUnits.set(army.id, { row: army.row, col: army.col });
                }
            }
            
            // Check if army reached village (handled by village defense system)
            if (army.row === playerPos.row && army.col === playerPos.col) {
                window.eventBus?.emit('enemyAtVillage', { army });
            }
        });
    }
    
    // Check if should spawn new lair
    shouldSpawnNewLair(currentDay) {
        const activeLairs = this.lairs.filter(l => !l.destroyed).length;
        const maxLairs = 2 + Math.floor(this.threatLevel / 2); // More lairs at higher threat
        
        // Spawn new lair every 30 days if below max
        if (activeLairs < maxLairs && currentDay % 30 === 0) {
            return true;
        }
        
        return false;
    }
    
    // Spawn a new lair at map edge
    spawnNewLair() {
        const edgeTiles = this.getEdgeTiles();
        
        // Filter out tiles that already have lairs
        const available = edgeTiles.filter(pos => {
            return !this.lairs.some(l => l.row === pos.row && l.col === pos.col && !l.destroyed);
        });
        
        if (available.length === 0) return;
        
        const pos = available[Math.floor(Math.random() * available.length)];
        const lairType = this.selectLairTypeForWave(this.threatLevel);
        
        const lair = this.createLair(pos.row, pos.col, lairType);
        if (lair) {
            window.showToast?.(`🕳️ A new ${lair.name} has appeared at the edge of the map!`, { type: 'warning' });
        }
    }
    
    // Update global threat level based on game progress
    updateThreatLevel(currentDay) {
        // Threat increases every 100 days
        const newThreat = 1 + Math.floor(currentDay / 100);
        
        if (newThreat > this.threatLevel) {
            this.threatLevel = newThreat;
            console.log(`[EnemySpawn] Threat level increased to ${this.threatLevel}`);
            window.showToast?.(`⚠️ The enemy grows stronger... Threat Level ${this.threatLevel}`, { type: 'warning' });
        }
    }
    
    // Destroy a lair when defeated
    destroyLair(lairId) {
        const lair = this.lairs.find(l => l.id === lairId);
        if (!lair) return;
        
        lair.destroyed = true;
        
        // Clear hex marker
        if (this.worldManager.hexMap?.[lair.row]?.[lair.col]) {
            this.worldManager.hexMap[lair.row][lair.col].lair = null;
            this.worldManager.hexMap[lair.row][lair.col].lairData = null;
        }
        
        console.log(`[EnemySpawn] Destroyed ${lair.name} at (${lair.row}, ${lair.col})`);
        window.showToast?.(`🎉 ${lair.name} has been destroyed!`, { type: 'success' });
        
        // Rewards
        const goldReward = lair.threatContribution * 10;
        if (this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
            window.showToast?.(`💰 Gained ${goldReward} gold from ${lair.name}`, { type: 'success' });
        }
        
        this.saveState();
    }
    
    // Remove defeated army
    removeArmy(armyId) {
        const idx = this.enemyArmies.findIndex(a => a.id === armyId);
        if (idx !== -1) {
            this.enemyArmies.splice(idx, 1);
        }
        
        if (this.worldManager.enemyUnits) {
            this.worldManager.enemyUnits.delete(armyId);
        }
    }
    
    // Get all visible enemies for UI
    getVisibleEnemies() {
        const visible = [];
        
        // Lairs in discovered tiles
        this.lairs.forEach(lair => {
            if (lair.destroyed) return;
            const key = `${lair.row},${lair.col}`;
            if (this.worldManager.discoveredTiles?.has(key)) {
                visible.push({
                    type: 'lair',
                    ...lair
                });
            }
        });
        
        // Armies in discovered tiles
        this.enemyArmies.forEach(army => {
            const key = `${army.row},${army.col}`;
            if (this.worldManager.discoveredTiles?.has(key)) {
                visible.push({
                    type: 'army',
                    ...army
                });
            }
        });
        
        return visible;
    }
    
    // Get lair at position
    getLairAt(row, col) {
        return this.lairs.find(l => l.row === row && l.col === col && !l.destroyed);
    }
    
    // Get enemy army at position
    getArmyAt(row, col) {
        return this.enemyArmies.find(a => a.row === row && a.col === col);
    }
    
    // Save state
    saveState() {
        const state = {
            lairs: this.lairs,
            enemyArmies: this.enemyArmies,
            threatLevel: this.threatLevel,
            lastSpawnDay: this.lastSpawnDay
        };
        localStorage.setItem('enemySpawnState', JSON.stringify(state));
    }
    
    // Load state
    loadState() {
        try {
            const saved = localStorage.getItem('enemySpawnState');
            if (saved) {
                const state = JSON.parse(saved);
                this.lairs = state.lairs || [];
                this.enemyArmies = state.enemyArmies || [];
                this.threatLevel = state.threatLevel || 1;
                this.lastSpawnDay = state.lastSpawnDay || 0;
                
                // Re-register lairs on map
                this.lairs.forEach(lair => {
                    if (!lair.destroyed && this.worldManager.hexMap?.[lair.row]?.[lair.col]) {
                        this.worldManager.hexMap[lair.row][lair.col].lair = lair.id;
                        this.worldManager.hexMap[lair.row][lair.col].lairData = lair;
                    }
                });
                
                // Re-register armies
                this.enemyArmies.forEach(army => {
                    if (this.worldManager.enemyUnits) {
                        this.worldManager.enemyUnits.set(army.id, { row: army.row, col: army.col });
                    }
                });
            }
        } catch (e) {
            console.error('[EnemySpawn] Error loading state:', e);
        }
    }
}

// Export to window
window.EnemySpawnSystem = EnemySpawnSystem;

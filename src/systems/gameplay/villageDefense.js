// Village Defense System - Guards, Fortifications, and Enemy Attacks
class VillageDefenseSystem {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Defense stats
        this.baseDefense = 10;
        this.wallStrength = 0;
        this.guardCount = 0;
        this.currentDefenseRating = 0;
        
        // Attack state
        this.underAttack = false;
        this.currentAttacker = null;
        this.defenseTimer = null;
        
        // Defense history
        this.defenseBattles = [];
    }
    
    init() {
        this.calculateDefenseRating();
        
        // Listen for enemy arrival
        window.eventBus?.on('enemyAtVillage', (data) => {
            this.handleEnemyArrival(data.army);
        });
        
        console.log('[VillageDefense] Initialized with defense rating:', this.currentDefenseRating);
    }
    
    // Calculate total defense rating
    calculateDefenseRating() {
        let defense = this.baseDefense;
        const buildings = this.gameState.buildings || [];
        
        this.guardCount = 0;
        this.wallStrength = 0;
        
        buildings.forEach(building => {
            switch (building.type) {
                case 'fortifications':
                    // +50 base defense per fortification
                    defense += 50;
                    this.wallStrength += 100;
                    
                    // Guards in fortifications
                    const fortGuards = building.workers?.length || 0;
                    this.guardCount += fortGuards;
                    defense += fortGuards * 10; // Each guard adds 10 defense
                    break;
                    
                case 'barracks':
                    // Guards/soldiers in barracks
                    const barracksGuards = building.workers?.length || 0;
                    this.guardCount += barracksGuards;
                    defense += barracksGuards * 8;
                    break;
                    
                case 'castle':
                    // Castles provide significant defense
                    defense += 100;
                    this.wallStrength += 200;
                    break;
                    
                case 'militaryAcademy':
                    // +20% defense bonus from tactics training
                    defense *= 1.2;
                    break;
            }
        });
        
        // Garrisoned armies contribute to defense with 100% bonus (2x)
        const garrisonedArmies = (this.gameState.armies || []).filter(a => a.status === 'garrisoned');
        garrisonedArmies.forEach(army => {
            const armyStrength = (army.units || []).reduce((s, u) => s + (u.attack || 10), 0);
            defense += armyStrength * 2; // 100% city defense bonus
        });
        
        // Apply tech bonuses
        const guardEfficiency = this.gameState.techBonuses?.guardEfficiency || 0;
        defense *= (1 + guardEfficiency);
        
        // Apply fortification tactics tech bonus
        const fortBonus = this.gameState.techBonuses?.fortificationDamage || 0;
        if (fortBonus && this.wallStrength > 0) {
            defense *= (1 + fortBonus);
        }
        
        this.currentDefenseRating = Math.floor(defense);
        return this.currentDefenseRating;
    }
    
    // Handle enemy army arrival at village
    handleEnemyArrival(army) {
        if (!army) return;
        
        console.log(`[VillageDefense] Enemy army attacking! ${army.name}`);
        
        this.underAttack = true;
        this.currentAttacker = army;
        
        // Recalculate defense
        this.calculateDefenseRating();
        
        // Start defense battle
        this.startDefenseBattle(army);
    }
    
    // Start a defense battle
    startDefenseBattle(army) {
        window.showToast?.(`⚔️ ${army.name} is attacking your village!`, { type: 'error' });
        
        // Calculate army strength
        const enemyStrength = this.calculateArmyStrength(army);
        const defenderStrength = this.currentDefenseRating;
        
        // Create battle record
        const battle = {
            id: `defense_${Date.now()}`,
            attackerId: army.id,
            attackerName: army.name,
            enemyStrength,
            defenderStrength,
            startDay: this.gameState.day,
            resolved: false,
            result: null
        };
        
        this.defenseBattles.push(battle);
        
        // Resolve battle (simplified)
        this.resolveBattle(battle, army);
    }
    
    // Calculate enemy army strength
    calculateArmyStrength(army) {
        let strength = 0;
        
        (army.units || []).forEach(unit => {
            if (unit.alive) {
                strength += (unit.attack || 5) + (unit.hp || 20) / 10;
            }
        });
        
        return Math.floor(strength);
    }
    
    // Resolve a defense battle using the BattleViewer for animated combat
    resolveBattle(battle, army) {
        // Build defender units from garrisoned armies + guards
        const defenderUnits = [];

        // Add garrisoned army units
        const garrisonedArmies = (this.gameState.armies || []).filter(a => a.status === 'garrisoned');
        garrisonedArmies.forEach(ga => {
            (ga.units || []).forEach(u => {
                defenderUnits.push({
                    id: u.id || `guard_${Math.random().toString(36).substr(2,6)}`,
                    name: u.name || 'Soldier',
                    health: u.health || 100,
                    maxHealth: u.maxHealth || 100,
                    attack: u.attack || 10,
                    defense: u.defense || 5,
                    alive: true
                });
            });
        });

        // Add virtual guard units based on defense rating (minimum 3 defenders)
        const defenseBoost = Math.floor(this.currentDefenseRating / 15);
        const virtualGuards = Math.max(3, defenseBoost) - defenderUnits.length;
        for (let i = 0; i < Math.max(0, virtualGuards); i++) {
            defenderUnits.push({
                id: `militia_${i}`,
                name: 'Militia',
                health: 60,
                maxHealth: 60,
                attack: 6 + Math.floor(this.currentDefenseRating / 30),
                defense: 4 + Math.floor(this.wallStrength / 50),
                alive: true
            });
        }

        // Prepare enemy units
        const enemyUnits = (army.units || []).filter(u => u.alive !== false).map(u => ({
            id: u.id || `enemy_${Math.random().toString(36).substr(2,6)}`,
            name: u.name || 'Raider',
            health: u.hp || 30,
            maxHealth: u.maxHp || 30,
            attack: u.attack || 5,
            defense: u.defense || 3,
            alive: true
        }));

        // If no enemy units, generate some based on enemy strength
        if (enemyUnits.length === 0) {
            const count = Math.max(3, Math.ceil(battle.enemyStrength / 10));
            for (let i = 0; i < count; i++) {
                enemyUnits.push({
                    id: `raider_${i}`,
                    name: 'Raider',
                    health: 30,
                    maxHealth: 30,
                    attack: 5 + Math.floor(battle.enemyStrength / count / 3),
                    defense: 3,
                    alive: true
                });
            }
        }

        // Try to use BattleViewer for animated combat
        if (window.BattleViewer) {
            const playerArmy = {
                name: 'Village Defense',
                units: defenderUnits
            };
            const enemyArmy = {
                name: army.name || 'Raiders',
                units: enemyUnits
            };

            const viewer = new window.BattleViewer((result) => {
                // Process battle outcome
                if (result?.victory) {
                    this.handleDefenseSuccess(battle, army);
                    // Update garrisoned army casualties
                    garrisonedArmies.forEach(ga => {
                        const surviving = result.playerSurvivors || 0;
                        const initialCount = ga.units?.length || 0;
                        const lossRatio = initialCount > 0 ? Math.max(0, 1 - surviving / initialCount) : 0;
                        if (ga.units) {
                            ga.units = ga.units.filter(() => Math.random() > lossRatio * 0.5);
                        }
                    });
                } else {
                    this.handleDefenseFailure(battle, army);
                }

                battle.resolved = true;
                this.underAttack = false;
                this.currentAttacker = null;

                // Remove attacking army
                if (window.worldManager) {
                    window.worldManager.removeEnemy?.(army.id);
                }
            });

            viewer.startBattle(playerArmy, enemyArmy, 'plains');
        } else {
            // Fallback: original dice-roll resolution
            const defenderAdvantage = 1.2;
            const adjustedDefense = battle.defenderStrength * defenderAdvantage;
            const totalStrength = battle.enemyStrength + adjustedDefense;
            const defenseChance = adjustedDefense / totalStrength;
            const roll = Math.random();

            if (roll < defenseChance) {
                this.handleDefenseSuccess(battle, army);
            } else {
                this.handleDefenseFailure(battle, army);
            }

            battle.resolved = true;
            this.underAttack = false;
            this.currentAttacker = null;

            if (this.gameState.enemySpawnSystem) {
                this.gameState.enemySpawnSystem.removeArmy(army.id);
            }
        }
    }
    
    // Handle successful defense
    handleDefenseSuccess(battle, army) {
        battle.result = 'victory';
        
        // Calculate casualties
        const guardsLost = Math.floor(this.guardCount * (battle.enemyStrength / (battle.defenderStrength * 2)));
        const wallDamage = Math.floor(this.wallStrength * 0.1);
        
        console.log(`[VillageDefense] Victory! Lost ${guardsLost} guards, ${wallDamage} wall damage`);
        
        // Apply casualties
        this.applyCasualties(guardsLost);
        this.wallStrength = Math.max(0, this.wallStrength - wallDamage);
        
        // Rewards
        const goldReward = Math.floor(army.totalStrength * 5);
        if (this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
        }
        
        window.showToast?.(`🎉 Defense successful! Earned ${goldReward} gold!`, { type: 'success' });
        
        if (guardsLost > 0) {
            window.showToast?.(`😢 Lost ${guardsLost} brave defenders.`, { type: 'warning' });
        }
        
        window.eventBus?.emit('defenseVictory', { battle, army });
    }
    
    // Handle failed defense — village is destroyed, dynasty ends
    handleDefenseFailure(battle, army) {
        battle.result = 'defeat';
        
        console.log(`[VillageDefense] Defeat! Village overrun by ${army.name}`);
        
        window.eventBus?.emit('defenseDefeat', { battle, army });
        
        // Village is destroyed — trigger dynasty end
        const dynastyName = localStorage.getItem('dynastyName') || this.gameState?.dynastyName || 'Unknown';
        
        if (window.legacySystem) {
            window.legacySystem.performEndDynasty(this.gameState, dynastyName, 'village_destroyed');
        } else {
            // Fallback: show modal then reload
            if (window.modalSystem?.showModal) {
                window.modalSystem.showModal({
                    title: '🗡️ Village Destroyed!',
                    content: `<div style="text-align:center;padding:20px;">
                        <div style="font-size:64px;margin-bottom:16px;">🔥</div>
                        <p>Your village has been overrun by <strong>${army.name}</strong>.</p>
                        <p>The dynasty has fallen...</p>
                        <button id="destruction-restart" style="margin-top:16px;padding:12px 24px;background:#c0392b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1em;font-weight:bold;">Start Over</button>
                    </div>`,
                    closable: false,
                    showCloseButton: false
                });
                setTimeout(() => {
                    document.getElementById('destruction-restart')?.addEventListener('click', () => {
                        localStorage.clear();
                        location.reload();
                    });
                }, 50);
            } else {
                setTimeout(() => location.reload(), 2000);
            }
        }
    }
    
    // Apply guard casualties
    applyCasualties(count) {
        if (count <= 0) return;
        
        const buildings = this.gameState.buildings || [];
        let remaining = count;
        
        // Remove workers from barracks/fortifications
        buildings.forEach(building => {
            if (remaining <= 0) return;
            
            if (building.type === 'barracks' || building.type === 'fortifications') {
                const workers = building.workers || [];
                while (remaining > 0 && workers.length > 0) {
                    const worker = workers.pop();
                    remaining--;
                    
                    // Remove dead defender from population
                    if (this.gameState.populationManager) {
                        this.gameState.populationManager.removeInhabitant(worker.id || worker);
                    }
                }
            }
        });
    }
    
    // Get defense summary for UI
    getDefenseSummary() {
        this.calculateDefenseRating();
        
        return {
            defenseRating: this.currentDefenseRating,
            guardCount: this.guardCount,
            wallStrength: this.wallStrength,
            underAttack: this.underAttack,
            attacker: this.currentAttacker?.name || null,
            recentBattles: this.defenseBattles.slice(-5) // Last 5 battles
        };
    }
    
    // Check if village can defend against a specific army
    canDefendAgainst(army) {
        const enemyStrength = this.calculateArmyStrength(army);
        const defenseRating = this.calculateDefenseRating();
        
        // 1.5x defense is comfortable, 1x is risky, <1x is dangerous
        const ratio = defenseRating / enemyStrength;
        
        if (ratio >= 1.5) return { status: 'safe', message: 'Village is well defended' };
        if (ratio >= 1.0) return { status: 'risky', message: 'Defense is adequate but risky' };
        if (ratio >= 0.5) return { status: 'danger', message: 'Village defenses are weak!' };
        return { status: 'critical', message: 'Village will likely fall!' };
    }
    
    // Upgrade wall strength (called when fortifications are built)
    upgradeWalls(amount) {
        this.wallStrength += amount;
        console.log(`[VillageDefense] Walls upgraded, new strength: ${this.wallStrength}`);
    }
    
    // Process daily defense checks
    processDaily() {
        // Slowly repair walls
        if (this.wallStrength < this.getMaxWallStrength()) {
            const repairAmount = Math.min(5, this.getMaxWallStrength() - this.wallStrength);
            this.wallStrength += repairAmount;
        }
        
        // Recalculate defense
        this.calculateDefenseRating();
    }
    
    // Get maximum wall strength based on buildings
    getMaxWallStrength() {
        let max = 0;
        const buildings = this.gameState.buildings || [];
        
        buildings.forEach(building => {
            if (building.type === 'fortifications') max += 100;
            if (building.type === 'castle') max += 200;
        });
        
        return max;
    }
}

// Export to window
window.VillageDefenseSystem = VillageDefenseSystem;

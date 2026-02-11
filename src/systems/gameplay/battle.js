/**
 * battle.js - Consolidated Battle System
 * Includes: StrategicCombat, BattleViewer, and BattleManager
 */

// ============================================
// STRATEGIC COMBAT - Combat calculations
// ============================================

class StrategicCombat {
    constructor(gameState) {
        this.gameState = gameState;
        
        this.unitTypes = {
            infantry: {
                category: 'infantry',
                name: 'Infantry',
                icon: '⚔️',
                stats: { hp: 30, attack: 5, defense: 3, speed: 2 },
                cost: { food: 20, gold: 10 },
                isHuman: true,
                description: 'Standard infantry soldiers'
            }
        };
        
        this.formations = {
            line: {
                name: 'Battle Line',
                icon: '═',
                description: 'Standard formation, balanced stats',
                modifiers: { attack: 1.0, defense: 1.0, speed: 1.0 }
            }
        };
        
        this.terrainModifiers = {
            plains: { infantry: { attack: 1.0, defense: 1.0 } },
            forest: { infantry: { attack: 1.1, defense: 1.2 } },
            hills: { infantry: { attack: 1.0, defense: 1.05 } },
            mountains: { infantry: { attack: 1.1, defense: 1.07 } },
            swamp: { infantry: { attack: 0.8, defense: 0.9 } },
            desert: { infantry: { attack: 0.9, defense: 0.8 } }
        };
        
        console.log('[StrategicCombat] System initialized');
    }
    
    calculateTerrainModifier(terrain, stat) {
        const terrainMods = this.terrainModifiers[terrain];
        if (!terrainMods) return 1.0;
        const infantryMods = terrainMods.infantry;
        if (!infantryMods) return 1.0;
        return infantryMods[stat] || 1.0;
    }
    
    simulateCombatRound(attackingArmy, defendingArmy, terrain = 'plains') {
        const results = { attackerCasualties: 0, defenderCasualties: 0, events: [] };
        
        const attackingUnits = (attackingArmy.units || []).filter(u => u.alive);
        const defendingUnits = (defendingArmy.units || []).filter(u => u.alive);
        
        if (attackingUnits.length === 0 || defendingUnits.length === 0) return results;
        
        attackingUnits.forEach(attacker => {
            const aliveDefenders = defendingUnits.filter(u => u.alive);
            if (aliveDefenders.length === 0) return;
            
            const target = aliveDefenders[Math.floor(Math.random() * aliveDefenders.length)];
            const terrainMod = this.calculateTerrainModifier(terrain, 'attack');
            const legacyMod = this.gameState?.legacyCombatMultiplier || 1.0;
            
            // Tech bonuses for player armies
            const techStrength = 1 + (this.gameState?.techBonuses?.unitStrength || 0);
            const techWeapon = 1 + (this.gameState?.techBonuses?.weaponQuality || 0);
            const techBattleDmg = 1 + (this.gameState?.techBonuses?.battleDamage || 0);
            
            const attackPower = (attacker.attack || 5) * terrainMod * legacyMod * techStrength * techWeapon;
            const defensePower = (target.defense || 3);
            const damage = Math.max(1, Math.round((attackPower - defensePower * 0.5 + Math.random() * 3) * techBattleDmg));
            
            target.hp -= damage;
            if (target.hp <= 0) {
                target.alive = false;
                results.defenderCasualties++;
            }
        });
        
        const survivingDefenders = defendingUnits.filter(u => u.alive);
        survivingDefenders.forEach(defender => {
            const aliveAttackers = attackingUnits.filter(u => u.alive);
            if (aliveAttackers.length === 0) return;
            
            const target = aliveAttackers[Math.floor(Math.random() * aliveAttackers.length)];
            const terrainMod = this.calculateTerrainModifier(terrain, 'attack');
            const attackPower = (defender.attack || 5) * terrainMod;
            // Player's armor tech bonus reduces damage taken
            const techArmor = 1 + (this.gameState?.techBonuses?.armorQuality || 0);
            const defensePower = (target.defense || 3) * techArmor;
            const damage = Math.max(1, Math.round(attackPower - defensePower * 0.5 + Math.random() * 3));
            
            target.hp -= damage;
            if (target.hp <= 0) {
                target.alive = false;
                results.attackerCasualties++;
            }
        });
        
        return results;
    }
    
    assessThreat(enemyArmy, playerArmy) {
        const analysis = {
            threatLevel: 'low', threatScore: 0, advantages: [], disadvantages: [], recommendation: ''
        };
        
        const enemyUnits = enemyArmy.units || [];
        const playerUnits = playerArmy.units || [];
        
        const enemyStrength = enemyUnits.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 3), 0);
        const playerStrength = playerUnits.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 3), 0);
        
        analysis.threatScore = Math.round((enemyStrength / Math.max(1, playerStrength)) * 100);
        
        if (analysis.threatScore < 50) {
            analysis.threatLevel = 'low';
            analysis.recommendation = '✓ Favorable odds. Attack with confidence.';
        } else if (analysis.threatScore < 80) {
            analysis.threatLevel = 'moderate';
            analysis.recommendation = '🗡️ Winnable battle with good tactics.';
        } else if (analysis.threatScore < 120) {
            analysis.threatLevel = 'high';
            analysis.recommendation = '⚔️ Even fight. Prepare carefully.';
        } else {
            analysis.threatLevel = 'extreme';
            analysis.recommendation = '⚠️ Dangerous! Consider retreating or reinforcing.';
        }
        
        if (playerUnits.length > enemyUnits.length) {
            analysis.advantages.push(`Numerical advantage: ${playerUnits.length} vs ${enemyUnits.length}`);
        } else if (enemyUnits.length > playerUnits.length) {
            analysis.disadvantages.push(`Outnumbered: ${playerUnits.length} vs ${enemyUnits.length}`);
        }
        
        return analysis;
    }
    
    getThreatIcon(threatLevel) {
        switch(threatLevel) {
            case 'low': return '🟢';
            case 'moderate': return '🟡';
            case 'high': return '🟠';
            case 'extreme': return '🔴';
            default: return '⚪';
        }
    }
}

// ============================================
// BATTLE VIEWER - Animated battle visualization
// ============================================

class BattleViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isAnimating = false;
        this.animationId = null;
        this.playerUnits = [];
        this.enemyUnits = [];
        this.deadUnits = [];
        this.unitRadius = 8;
        this.unitSpeed = 1.5;
        this.battlePhase = 'approaching';
        this.result = null;
        this.onBattleComplete = null;
        console.log('[BattleViewer] Initialized');
    }
    
    showBattle(playerArmy, enemyArmy, terrain = 'plains', onComplete = null) {
        this.onBattleComplete = onComplete;
        this.battlePhase = 'approaching';
        this.result = null;
        this.deadUnits = [];
        this.initializeUnits(playerArmy, enemyArmy);
        this.createBattleModal(playerArmy, enemyArmy, terrain);
        this.startAnimation();
    }
    
    initializeUnits(playerArmy, enemyArmy) {
        const playerUnitList = playerArmy.units || [];
        const enemyUnitList = enemyArmy.units || [];
        this.playerUnits = [];
        this.enemyUnits = [];
        
        const canvasWidth = 700, canvasHeight = 400, marginX = 80, startY = 60, spacing = 25;
        const maxPerRow = Math.floor((canvasHeight - 100) / spacing);
        
        playerUnitList.filter(u => u.alive !== false).forEach((unit, i) => {
            const row = i % maxPerRow, col = Math.floor(i / maxPerRow);
            this.playerUnits.push({
                ...unit, x: marginX + col * 30, y: startY + row * spacing,
                targetX: canvasWidth / 2 - 50, vx: 0, vy: 0, alive: true,
                hp: unit.hp || 30, maxHp: unit.maxHp || 30, attack: unit.attack || 5,
                defense: unit.defense || 3, color: '#3498db', fighting: false
            });
        });
        
        enemyUnitList.filter(u => u.alive !== false).forEach((unit, i) => {
            const row = i % maxPerRow, col = Math.floor(i / maxPerRow);
            this.enemyUnits.push({
                ...unit, x: canvasWidth - marginX - col * 30, y: startY + row * spacing,
                targetX: canvasWidth / 2 + 50, vx: 0, vy: 0, alive: true,
                hp: unit.hp || 30, maxHp: unit.maxHp || 30, attack: unit.attack || 5,
                defense: unit.defense || 3, color: '#e74c3c', fighting: false
            });
        });
    }
    
    createBattleModal(playerArmy, enemyArmy, terrain) {
        const existing = document.getElementById('battle-viewer-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'battle-viewer-modal';
        modal.innerHTML = `
            <div class="battle-viewer-overlay">
                <div class="battle-viewer-container">
                    <div class="battle-header">
                        <div class="army-info player-info">
                            <span class="army-icon">⚔️</span>
                            <span class="army-name">Your Army</span>
                            <span class="army-count" id="player-count">${this.playerUnits.length} soldiers</span>
                        </div>
                        <div class="battle-status"><span id="battle-phase">Armies Approaching...</span></div>
                        <div class="army-info enemy-info">
                            <span class="army-icon">☠️</span>
                            <span class="army-name">${enemyArmy.name || 'Raiders'}</span>
                            <span class="army-count" id="enemy-count">${this.enemyUnits.length} soldiers</span>
                        </div>
                    </div>
                    <canvas id="battle-canvas" width="700" height="400"></canvas>
                    <div class="battle-controls">
                        <button id="battle-speed-1x" class="speed-btn active">1x</button>
                        <button id="battle-speed-2x" class="speed-btn">2x</button>
                        <button id="battle-speed-4x" class="speed-btn">4x</button>
                        <button id="battle-skip" class="skip-btn">Skip to End</button>
                    </div>
                    <div id="battle-result" class="battle-result" style="display:none;">
                        <h3 id="result-title">Battle Complete</h3>
                        <p id="result-details"></p>
                        <button id="close-battle" class="close-btn">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        if (!document.getElementById('battle-viewer-styles')) {
            const style = document.createElement('style');
            style.id = 'battle-viewer-styles';
            style.textContent = `
                .battle-viewer-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; }
                .battle-viewer-container { background: #1a1a2e; border-radius: 12px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 2px solid #333; }
                .battle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: #2a2a4a; border-radius: 8px; }
                .army-info { display: flex; flex-direction: column; align-items: center; min-width: 120px; }
                .army-icon { font-size: 24px; } .army-name { font-weight: bold; color: #ecf0f1; } .army-count { font-size: 14px; color: #95a5a6; }
                .player-info .army-count { color: #3498db; } .enemy-info .army-count { color: #e74c3c; }
                .battle-status { font-size: 18px; font-weight: bold; color: #f39c12; text-transform: uppercase; }
                #battle-canvas { background: linear-gradient(180deg, #87CEEB 0%, #87CEEB 20%, #228B22 20%, #228B22 100%); border-radius: 8px; border: 2px solid #333; display: block; }
                .battle-controls { display: flex; justify-content: center; gap: 10px; margin-top: 15px; }
                .speed-btn, .skip-btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
                .speed-btn { background: #34495e; color: #ecf0f1; } .speed-btn.active { background: #3498db; color: white; } .speed-btn:hover { background: #4a6785; }
                .skip-btn { background: #e74c3c; color: white; } .skip-btn:hover { background: #c0392b; }
                .battle-result { text-align: center; padding: 20px; margin-top: 15px; background: #2a2a4a; border-radius: 8px; }
                .battle-result h3 { color: #f39c12; margin-bottom: 10px; } .battle-result p { color: #bdc3c7; }
                .close-btn { margin-top: 15px; padding: 10px 30px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; } .close-btn:hover { background: #2ecc71; }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupControls();
    }
    
    setupControls() {
        document.getElementById('battle-speed-1x')?.addEventListener('click', () => this.setSpeed(1));
        document.getElementById('battle-speed-2x')?.addEventListener('click', () => this.setSpeed(2));
        document.getElementById('battle-speed-4x')?.addEventListener('click', () => this.setSpeed(4));
        document.getElementById('battle-skip')?.addEventListener('click', () => this.skipToEnd());
        document.getElementById('close-battle')?.addEventListener('click', () => this.closeBattle());
    }
    
    setSpeed(speed) {
        this.unitSpeed = 1.5 * speed;
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`battle-speed-${speed}x`)?.classList.add('active');
    }
    
    skipToEnd() {
        this.isAnimating = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.resolveBattleInstant();
    }
    
    resolveBattleInstant() {
        let playerStrength = this.playerUnits.filter(u => u.alive).reduce((sum, u) => sum + u.attack + u.defense, 0);
        let enemyStrength = this.enemyUnits.filter(u => u.alive).reduce((sum, u) => sum + u.attack + u.defense, 0);
        
        while (playerStrength > 0 && enemyStrength > 0) {
            const playerDamage = playerStrength * 0.2, enemyDamage = enemyStrength * 0.2;
            playerStrength -= enemyDamage;
            enemyStrength -= playerDamage;
            
            const playerLossRatio = Math.min(1, enemyDamage / Math.max(1, this.playerUnits.filter(u => u.alive).length * 8));
            const enemyLossRatio = Math.min(1, playerDamage / Math.max(1, this.enemyUnits.filter(u => u.alive).length * 8));
            
            this.playerUnits.filter(u => u.alive).forEach(u => { if (Math.random() < playerLossRatio * 0.3) u.alive = false; });
            this.enemyUnits.filter(u => u.alive).forEach(u => { if (Math.random() < enemyLossRatio * 0.3) u.alive = false; });
        }
        this.finishBattle();
    }
    
    startAnimation() { this.isAnimating = true; this.animate(); }
    
    animate() {
        if (!this.isAnimating) return;
        this.update();
        this.render();
        
        const playerAlive = this.playerUnits.filter(u => u.alive).length;
        const enemyAlive = this.enemyUnits.filter(u => u.alive).length;
        if (playerAlive === 0 || enemyAlive === 0) { this.finishBattle(); return; }
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    update() {
        const allPlayerAlive = this.playerUnits.filter(u => u.alive);
        const allEnemyAlive = this.enemyUnits.filter(u => u.alive);
        
        document.getElementById('player-count').textContent = `${allPlayerAlive.length} soldiers`;
        document.getElementById('enemy-count').textContent = `${allEnemyAlive.length} soldiers`;
        
        if (this.battlePhase === 'approaching') {
            let anyApproaching = false;
            [...allPlayerAlive, ...allEnemyAlive].forEach(unit => {
                const dx = unit.targetX - unit.x;
                if (Math.abs(dx) > 5) { unit.x += Math.sign(dx) * this.unitSpeed; anyApproaching = true; }
            });
            if (!anyApproaching) {
                this.battlePhase = 'fighting';
                document.getElementById('battle-phase').textContent = '⚔️ BATTLE!';
            }
        }
        
        if (this.battlePhase === 'fighting') {
            allPlayerAlive.forEach(unit => {
                if (allEnemyAlive.length === 0) return;
                const target = this.findNearestEnemy(unit, allEnemyAlive);
                if (!target) return;
                const dx = target.x - unit.x, dy = target.y - unit.y, dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > this.unitRadius * 2.5) { unit.x += (dx / dist) * this.unitSpeed; unit.y += (dy / dist) * this.unitSpeed * 0.5; }
                else if (Math.random() < 0.1) this.attackUnit(unit, target);
            });
            
            allEnemyAlive.forEach(unit => {
                if (allPlayerAlive.length === 0) return;
                const target = this.findNearestEnemy(unit, allPlayerAlive);
                if (!target) return;
                const dx = target.x - unit.x, dy = target.y - unit.y, dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > this.unitRadius * 2.5) { unit.x += (dx / dist) * this.unitSpeed; unit.y += (dy / dist) * this.unitSpeed * 0.5; }
                else if (Math.random() < 0.1) this.attackUnit(unit, target);
            });
        }
    }
    
    findNearestEnemy(unit, enemies) {
        let nearest = null, nearestDist = Infinity;
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dx = enemy.x - unit.x, dy = enemy.y - unit.y, dist = dx*dx + dy*dy;
            if (dist < nearestDist) { nearestDist = dist; nearest = enemy; }
        });
        return nearest;
    }
    
    attackUnit(attacker, target) {
        if (!target.alive) return;
        const damage = Math.max(1, attacker.attack - target.defense * 0.5 + Math.random() * 3);
        target.hp -= damage;
        if (target.hp <= 0) { target.alive = false; this.deadUnits.push({ ...target, deathTime: Date.now() }); }
    }
    
    render() {
        const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
        
        const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.2);
        skyGradient.addColorStop(0, '#87CEEB'); skyGradient.addColorStop(1, '#5DADE2');
        ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, w, h * 0.2);
        
        const grassGradient = ctx.createLinearGradient(0, h * 0.2, 0, h);
        grassGradient.addColorStop(0, '#2ECC71'); grassGradient.addColorStop(0.5, '#27AE60'); grassGradient.addColorStop(1, '#1E8449');
        ctx.fillStyle = grassGradient; ctx.fillRect(0, h * 0.2, w, h * 0.8);
        
        this.deadUnits.forEach(unit => {
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.arc(unit.x, unit.y, this.unitRadius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        });
        
        this.playerUnits.filter(u => u.alive).forEach(unit => this.drawUnit(unit));
        this.enemyUnits.filter(u => u.alive).forEach(unit => this.drawUnit(unit));
    }
    
    drawUnit(unit) {
        const ctx = this.ctx, r = this.unitRadius;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(unit.x, unit.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = unit.color;
        ctx.beginPath(); ctx.arc(unit.x, unit.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = unit.color === '#3498db' ? '#2980b9' : '#c0392b'; ctx.lineWidth = 2; ctx.stroke();
        
        const hpPercent = unit.hp / unit.maxHp, barWidth = r * 2, barHeight = 3, barX = unit.x - r, barY = unit.y - r - 6;
        ctx.fillStyle = '#333'; ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }
    
    finishBattle() {
        this.isAnimating = false; this.battlePhase = 'finished';
        const playerAlive = this.playerUnits.filter(u => u.alive).length;
        const enemyAlive = this.enemyUnits.filter(u => u.alive).length;
        const victory = playerAlive > 0 && enemyAlive === 0;
        
        this.result = {
            victory, playerSurvivors: playerAlive, playerLosses: this.playerUnits.length - playerAlive,
            enemySurvivors: enemyAlive, enemyLosses: this.enemyUnits.length - enemyAlive
        };
        
        document.getElementById('battle-phase').textContent = victory ? '🏆 VICTORY!' : '💀 DEFEAT';
        document.getElementById('result-title').textContent = victory ? '🏆 Victory!' : '💀 Defeat';
        document.getElementById('result-details').innerHTML = `
            <strong>Your Army:</strong> ${playerAlive} survived, ${this.result.playerLosses} lost<br>
            <strong>Enemy Army:</strong> ${enemyAlive} survived, ${this.result.enemyLosses} lost
        `;
        document.getElementById('battle-result').style.display = 'block';
        this.render();
    }
    
    closeBattle() {
        this.isAnimating = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        document.getElementById('battle-viewer-modal')?.remove();
        if (this.onBattleComplete) this.onBattleComplete(this.result);
    }
}

// ============================================
// BATTLE MANAGER - Main battle orchestration
// ============================================

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
    
    // Called when enemy armies are encountered during world exploration
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
        // Use the new animated battle viewer if available
        if (window.battleViewer && this.currentBattle) {
            // Prepare armies for the viewer
            const playerArmy = this.prepareArmyForViewer(this.gameState.army, 'player');
            const enemyArmy = this.prepareArmyForViewer(this.enemyArmy, 'enemy');
            
            // Close the old modal
            this.closeBattleModal();
            
            // Show animated battle
            window.battleViewer.showBattle(playerArmy, enemyArmy, this.currentBattle.terrain || 'plains', (result) => {
                // Handle battle result
                this.handleBattleViewerResult(result);
            });
            return;
        }
        
        // Fallback to old system
        this.isWatching = true;
        this.startBattleAnimation();
        
        // Hide options, show pause button
        document.getElementById('watch-battle-btn').style.display = 'none';
        document.getElementById('auto-resolve-btn').style.display = 'none';
        document.getElementById('pause-battle-btn').style.display = 'inline-block';
    }
    
    /**
     * Prepare army data for the battle viewer.
     */
    prepareArmyForViewer(army, side) {
        const units = [];
        
        if (Array.isArray(army)) {
            // If army is a list like [{type: 'infantry', count: 5}]
            army.forEach(unit => {
                for (let i = 0; i < (unit.count || 1); i++) {
                    units.push({
                        type: unit.type || 'infantry',
                        hp: 30,
                        maxHp: 30,
                        attack: unit.attack || 5,
                        defense: unit.defense || 3,
                        alive: true
                    });
                }
            });
        } else if (army && army.units) {
            // If army has a units property
            army.units.forEach(unit => {
                units.push({
                    type: unit.type || 'infantry',
                    hp: unit.hp || 30,
                    maxHp: unit.maxHp || 30,
                    attack: unit.attack || 5,
                    defense: unit.defense || 3,
                    alive: unit.alive !== false
                });
            });
        }
        
        // Ensure at least some units
        if (units.length === 0) {
            for (let i = 0; i < 5; i++) {
                units.push({
                    type: 'infantry',
                    hp: 30,
                    maxHp: 30,
                    attack: 5,
                    defense: 3,
                    alive: true
                });
            }
        }
        
        return {
            name: army?.name || (side === 'player' ? 'Your Army' : 'Raiders'),
            units: units
        };
    }
    
    /**
     * Handle the result from the battle viewer.
     */
    handleBattleViewerResult(result) {
        if (!result) return;
        
        if (result.victory) {
            this.logBattleEvent('🏆 Victory! Your army has defeated the enemy.');
            this.handleVictory();
        } else {
            this.logBattleEvent('💀 Defeat! Your army has been routed.');
            this.handleDefeat();
        }
        
        // Update army with survivors
        if (this.gameState.army && Array.isArray(this.gameState.army)) {
            const survivorRatio = result.playerSurvivors / (result.playerSurvivors + result.playerLosses);
            this.gameState.army.forEach(unit => {
                unit.count = Math.floor(unit.count * survivorRatio);
            });
            this.gameState.army = this.gameState.army.filter(u => u.count > 0);
        }
        
        // Clear current battle
        if (this.currentBattle?.id) {
            const battleManager = this.gameState.battleManager;
            if (battleManager) {
                battleManager.removeBattle(this.currentBattle.id);
            }
        }
        this.currentBattle = null;
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
        
        // Use strategic combat system if available for detailed simulation
        if (window.strategicCombat && this.currentBattle.playerArmy && this.currentBattle.enemyArmy) {
            const terrain = this.currentBattle.terrain || 'plains';
            const playerArmy = this.currentBattle.playerArmy;
            const enemyArmy = this.currentBattle.enemyArmy;
            
            // Simulate combat rounds until one side is defeated
            let rounds = 0;
            const maxRounds = 20;
            
            while (rounds < maxRounds) {
                const playerAlive = (playerArmy.units || []).filter(u => u.alive).length;
                const enemyAlive = (enemyArmy.units || []).filter(u => u.alive).length;
                
                if (playerAlive === 0) {
                    this.defeat();
                    return;
                }
                if (enemyAlive === 0) {
                    this.victory();
                    return;
                }
                
                window.strategicCombat.simulateCombatRound(playerArmy, enemyArmy, terrain);
                rounds++;
            }
            
            // If timeout, check who has more alive
            const playerAlive = (playerArmy.units || []).filter(u => u.alive).length;
            const enemyAlive = (enemyArmy.units || []).filter(u => u.alive).length;
            
            if (playerAlive > enemyAlive) {
                this.victory();
            } else {
                this.defeat();
            }
            return;
        }
        
        // Fallback: original power calculation
        const playerPower = this.calculatePlayerPower();
        const enemyPower = this.calculateEnemyPower();
        
        if (playerPower > enemyPower) {
            this.victory();
        } else {
            this.defeat();
        }
    }
    
    /**
     * Get threat assessment for current battle target.
     */
    getThreatAssessment() {
        if (!this.currentBattle || !window.strategicCombat) return null;
        
        const playerArmy = this.currentBattle.playerArmy || { units: this.gameState.army || [] };
        const enemyArmy = this.currentBattle.enemyArmy || { units: [] };
        
        return window.strategicCombat.assessThreat(enemyArmy, playerArmy);
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
        } else if (skills.includes('Blacksmithing') || role === 'blacksmith') {
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
                case 'Blacksmithing':
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
            
        } else {
            this.activeCommander.experience += 2; // Small experience for trying
            this.saveCommanderData(); // Save experience even for defeats
            
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

// Make all battle classes globally available
window.StrategicCombat = StrategicCombat;
window.BattleViewer = BattleViewer;
window.BattleManager = BattleManager;

// Create instances used by battle.js
window.battleViewer = new BattleViewer();

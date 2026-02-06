/**
 * battleViewer.js - Animated Battle Visualization
 * 
 * Shows a movie-like battle view with animated circles representing
 * infantry units on a green battlefield terrain.
 */

class BattleViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isAnimating = false;
        this.animationId = null;
        
        // Battle state
        this.playerUnits = [];
        this.enemyUnits = [];
        this.deadUnits = [];
        
        // Animation settings
        this.unitRadius = 8;
        this.unitSpeed = 1.5;
        this.battlePhase = 'approaching'; // approaching, fighting, finished
        
        // Battle results
        this.result = null;
        this.onBattleComplete = null;
        
        console.log('[BattleViewer] Initialized');
    }
    
    /**
     * Show the battle viewer modal with animated battle.
     */
    showBattle(playerArmy, enemyArmy, terrain = 'plains', onComplete = null) {
        this.onBattleComplete = onComplete;
        this.battlePhase = 'approaching';
        this.result = null;
        this.deadUnits = [];
        
        // Create units from armies
        this.initializeUnits(playerArmy, enemyArmy);
        
        // Create modal with canvas
        this.createBattleModal(playerArmy, enemyArmy, terrain);
        
        // Start animation
        this.startAnimation();
    }
    
    /**
     * Initialize unit positions for animation.
     */
    initializeUnits(playerArmy, enemyArmy) {
        const playerUnitList = playerArmy.units || [];
        const enemyUnitList = enemyArmy.units || [];
        
        // Reset arrays
        this.playerUnits = [];
        this.enemyUnits = [];
        
        // Position player units on left side
        const canvasWidth = 700;
        const canvasHeight = 400;
        const marginX = 80;
        const startY = 60;
        const spacing = 25;
        const maxPerRow = Math.floor((canvasHeight - 100) / spacing);
        
        playerUnitList.filter(u => u.alive !== false).forEach((unit, i) => {
            const row = i % maxPerRow;
            const col = Math.floor(i / maxPerRow);
            
            this.playerUnits.push({
                ...unit,
                x: marginX + col * 30,
                y: startY + row * spacing,
                targetX: canvasWidth / 2 - 50,
                vx: 0,
                vy: 0,
                alive: true,
                hp: unit.hp || 30,
                maxHp: unit.maxHp || 30,
                attack: unit.attack || 5,
                defense: unit.defense || 3,
                color: '#3498db', // Blue for player
                fighting: false
            });
        });
        
        // Position enemy units on right side
        enemyUnitList.filter(u => u.alive !== false).forEach((unit, i) => {
            const row = i % maxPerRow;
            const col = Math.floor(i / maxPerRow);
            
            this.enemyUnits.push({
                ...unit,
                x: canvasWidth - marginX - col * 30,
                y: startY + row * spacing,
                targetX: canvasWidth / 2 + 50,
                vx: 0,
                vy: 0,
                alive: true,
                hp: unit.hp || 30,
                maxHp: unit.maxHp || 30,
                attack: unit.attack || 5,
                defense: unit.defense || 3,
                color: '#e74c3c', // Red for enemy
                fighting: false
            });
        });
    }
    
    /**
     * Create the battle modal with canvas.
     */
    createBattleModal(playerArmy, enemyArmy, terrain) {
        // Remove existing modal if any
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
                        <div class="battle-status">
                            <span id="battle-phase">Armies Approaching...</span>
                        </div>
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
        
        // Add styles
        const style = document.createElement('style');
        style.id = 'battle-viewer-styles';
        style.textContent = `
            .battle-viewer-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .battle-viewer-container {
                background: #1a1a2e;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                border: 2px solid #333;
            }
            .battle-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background: #2a2a4a;
                border-radius: 8px;
            }
            .army-info {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 120px;
            }
            .army-icon { font-size: 24px; }
            .army-name { font-weight: bold; color: #ecf0f1; }
            .army-count { font-size: 14px; color: #95a5a6; }
            .player-info .army-count { color: #3498db; }
            .enemy-info .army-count { color: #e74c3c; }
            .battle-status {
                font-size: 18px;
                font-weight: bold;
                color: #f39c12;
                text-transform: uppercase;
            }
            #battle-canvas {
                background: linear-gradient(180deg, #87CEEB 0%, #87CEEB 20%, #228B22 20%, #228B22 100%);
                border-radius: 8px;
                border: 2px solid #333;
                display: block;
            }
            .battle-controls {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin-top: 15px;
            }
            .speed-btn, .skip-btn {
                padding: 8px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
            }
            .speed-btn {
                background: #34495e;
                color: #ecf0f1;
            }
            .speed-btn.active {
                background: #3498db;
                color: white;
            }
            .speed-btn:hover { background: #4a6785; }
            .skip-btn {
                background: #e74c3c;
                color: white;
            }
            .skip-btn:hover { background: #c0392b; }
            .battle-result {
                text-align: center;
                padding: 20px;
                margin-top: 15px;
                background: #2a2a4a;
                border-radius: 8px;
            }
            .battle-result h3 { color: #f39c12; margin-bottom: 10px; }
            .battle-result p { color: #bdc3c7; }
            .close-btn {
                margin-top: 15px;
                padding: 10px 30px;
                background: #27ae60;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            }
            .close-btn:hover { background: #2ecc71; }
        `;
        
        if (!document.getElementById('battle-viewer-styles')) {
            document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        
        // Get canvas context
        this.canvas = document.getElementById('battle-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Setup controls
        this.setupControls();
    }
    
    /**
     * Setup control button handlers.
     */
    setupControls() {
        document.getElementById('battle-speed-1x')?.addEventListener('click', () => this.setSpeed(1));
        document.getElementById('battle-speed-2x')?.addEventListener('click', () => this.setSpeed(2));
        document.getElementById('battle-speed-4x')?.addEventListener('click', () => this.setSpeed(4));
        document.getElementById('battle-skip')?.addEventListener('click', () => this.skipToEnd());
        document.getElementById('close-battle')?.addEventListener('click', () => this.closeBattle());
    }
    
    /**
     * Set animation speed.
     */
    setSpeed(speed) {
        this.unitSpeed = 1.5 * speed;
        
        // Update button states
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`battle-speed-${speed}x`)?.classList.add('active');
    }
    
    /**
     * Skip to end of battle.
     */
    skipToEnd() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Instant resolution
        this.resolveBattleInstant();
    }
    
    /**
     * Resolve battle instantly using combat logic.
     */
    resolveBattleInstant() {
        // Simple resolution: compare total strength
        let playerStrength = this.playerUnits.filter(u => u.alive).reduce((sum, u) => sum + u.attack + u.defense, 0);
        let enemyStrength = this.enemyUnits.filter(u => u.alive).reduce((sum, u) => sum + u.attack + u.defense, 0);
        
        // Simulate rounds until one side is eliminated
        while (playerStrength > 0 && enemyStrength > 0) {
            // Simple attrition
            const playerDamage = playerStrength * 0.2;
            const enemyDamage = enemyStrength * 0.2;
            
            playerStrength -= enemyDamage;
            enemyStrength -= playerDamage;
            
            // Kill units proportionally
            const playerLossRatio = Math.min(1, enemyDamage / Math.max(1, this.playerUnits.filter(u => u.alive).length * 8));
            const enemyLossRatio = Math.min(1, playerDamage / Math.max(1, this.enemyUnits.filter(u => u.alive).length * 8));
            
            this.playerUnits.filter(u => u.alive).forEach(u => {
                if (Math.random() < playerLossRatio * 0.3) u.alive = false;
            });
            this.enemyUnits.filter(u => u.alive).forEach(u => {
                if (Math.random() < enemyLossRatio * 0.3) u.alive = false;
            });
        }
        
        this.finishBattle();
    }
    
    /**
     * Start the animation loop.
     */
    startAnimation() {
        this.isAnimating = true;
        this.animate();
    }
    
    /**
     * Main animation loop.
     */
    animate() {
        if (!this.isAnimating) return;
        
        this.update();
        this.render();
        
        // Check for battle end
        const playerAlive = this.playerUnits.filter(u => u.alive).length;
        const enemyAlive = this.enemyUnits.filter(u => u.alive).length;
        
        if (playerAlive === 0 || enemyAlive === 0) {
            this.finishBattle();
            return;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Update unit positions and combat.
     */
    update() {
        const allPlayerAlive = this.playerUnits.filter(u => u.alive);
        const allEnemyAlive = this.enemyUnits.filter(u => u.alive);
        
        // Update player unit counts
        document.getElementById('player-count').textContent = `${allPlayerAlive.length} soldiers`;
        document.getElementById('enemy-count').textContent = `${allEnemyAlive.length} soldiers`;
        
        // Approaching phase - move toward center
        if (this.battlePhase === 'approaching') {
            let anyApproaching = false;
            
            [...allPlayerAlive, ...allEnemyAlive].forEach(unit => {
                const dx = unit.targetX - unit.x;
                if (Math.abs(dx) > 5) {
                    unit.x += Math.sign(dx) * this.unitSpeed;
                    anyApproaching = true;
                }
            });
            
            // Check if armies have met
            if (!anyApproaching) {
                this.battlePhase = 'fighting';
                document.getElementById('battle-phase').textContent = '⚔️ BATTLE!';
            }
        }
        
        // Fighting phase - combat
        if (this.battlePhase === 'fighting') {
            // Each unit attacks a random enemy
            allPlayerAlive.forEach(unit => {
                if (allEnemyAlive.length === 0) return;
                
                // Find nearby enemy
                const target = this.findNearestEnemy(unit, allEnemyAlive);
                if (!target) return;
                
                // Move toward target
                const dx = target.x - unit.x;
                const dy = target.y - unit.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > this.unitRadius * 2.5) {
                    unit.x += (dx / dist) * this.unitSpeed;
                    unit.y += (dy / dist) * this.unitSpeed * 0.5;
                } else if (Math.random() < 0.1) {
                    // Attack!
                    this.attackUnit(unit, target);
                }
            });
            
            allEnemyAlive.forEach(unit => {
                if (allPlayerAlive.length === 0) return;
                
                const target = this.findNearestEnemy(unit, allPlayerAlive);
                if (!target) return;
                
                const dx = target.x - unit.x;
                const dy = target.y - unit.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > this.unitRadius * 2.5) {
                    unit.x += (dx / dist) * this.unitSpeed;
                    unit.y += (dy / dist) * this.unitSpeed * 0.5;
                } else if (Math.random() < 0.1) {
                    this.attackUnit(unit, target);
                }
            });
        }
    }
    
    /**
     * Find nearest enemy unit.
     */
    findNearestEnemy(unit, enemies) {
        let nearest = null;
        let nearestDist = Infinity;
        
        enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dx = enemy.x - unit.x;
            const dy = enemy.y - unit.y;
            const dist = dx*dx + dy*dy;
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    /**
     * Attack a unit.
     */
    attackUnit(attacker, target) {
        if (!target.alive) return;
        
        const damage = Math.max(1, attacker.attack - target.defense * 0.5 + Math.random() * 3);
        target.hp -= damage;
        
        if (target.hp <= 0) {
            target.alive = false;
            this.deadUnits.push({ ...target, deathTime: Date.now() });
        }
    }
    
    /**
     * Render the battlefield.
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear with gradient background (sky + grass)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.2);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#5DADE2');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, w, h * 0.2);
        
        // Grass field
        const grassGradient = ctx.createLinearGradient(0, h * 0.2, 0, h);
        grassGradient.addColorStop(0, '#2ECC71');
        grassGradient.addColorStop(0.5, '#27AE60');
        grassGradient.addColorStop(1, '#1E8449');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, h * 0.2, w, h * 0.8);
        
        // Draw some grass details
        ctx.strokeStyle = 'rgba(30, 132, 73, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * w;
            const y = h * 0.25 + Math.random() * h * 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y - 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 3, y - 8);
            ctx.stroke();
        }
        
        // Draw dead units (faded)
        this.deadUnits.forEach(unit => {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, this.unitRadius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });
        
        // Draw alive units
        this.playerUnits.filter(u => u.alive).forEach(unit => this.drawUnit(unit));
        this.enemyUnits.filter(u => u.alive).forEach(unit => this.drawUnit(unit));
    }
    
    /**
     * Draw a single unit.
     */
    drawUnit(unit) {
        const ctx = this.ctx;
        const r = this.unitRadius;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(unit.x, unit.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = unit.color;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = unit.color === '#3498db' ? '#2980b9' : '#c0392b';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Health indicator (small bar above unit)
        const hpPercent = unit.hp / unit.maxHp;
        const barWidth = r * 2;
        const barHeight = 3;
        const barX = unit.x - r;
        const barY = unit.y - r - 6;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }
    
    /**
     * Finish the battle and show results.
     */
    finishBattle() {
        this.isAnimating = false;
        this.battlePhase = 'finished';
        
        const playerAlive = this.playerUnits.filter(u => u.alive).length;
        const enemyAlive = this.enemyUnits.filter(u => u.alive).length;
        const playerLosses = this.playerUnits.length - playerAlive;
        const enemyLosses = this.enemyUnits.length - enemyAlive;
        
        const victory = playerAlive > 0 && enemyAlive === 0;
        
        this.result = {
            victory,
            playerSurvivors: playerAlive,
            playerLosses,
            enemySurvivors: enemyAlive,
            enemyLosses
        };
        
        // Update UI
        document.getElementById('battle-phase').textContent = victory ? '🏆 VICTORY!' : '💀 DEFEAT';
        document.getElementById('result-title').textContent = victory ? '🏆 Victory!' : '💀 Defeat';
        document.getElementById('result-details').innerHTML = `
            <strong>Your Army:</strong> ${playerAlive} survived, ${playerLosses} lost<br>
            <strong>Enemy Army:</strong> ${enemyAlive} survived, ${enemyLosses} lost
        `;
        document.getElementById('battle-result').style.display = 'block';
        
        // Final render
        this.render();
    }
    
    /**
     * Close the battle viewer.
     */
    closeBattle() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const modal = document.getElementById('battle-viewer-modal');
        if (modal) modal.remove();
        
        // Call completion callback
        if (this.onBattleComplete) {
            this.onBattleComplete(this.result);
        }
    }
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.BattleViewer = BattleViewer;
    window.battleViewer = new BattleViewer();
    console.log('[BattleViewer] Battle viewer ready');
}

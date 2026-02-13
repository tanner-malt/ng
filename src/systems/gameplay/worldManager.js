/**
 * WorldManager — World Map System (rewrite)
 *
 * Manages the 9×9 world grid: terrain generation, fog-of-war, exploration,
 * army drafting/movement/combat, enemy spawning & advancing, and the UI
 * (3-column layout with map + info panel + action panel).
 *
 * Single source of truth for:
 *   - hexMap[][]      (terrain, visibility)
 *   - enemies[]       (spawned enemy groups, advancing toward village)
 *   - gameState.armies[] (player armies — core army data)
 *
 * Population bridge:
 *   Draft:   populationManager.updateStatus(id, 'drafted')
 *   Disband: populationManager.updateStatus(id, originalStatus)
 */

class WorldManager {
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;

        // Map dimensions from config
        const cfg = window.WORLD_DATA?.mapConfig || { width: 9, height: 9, capitalPosition: { row: 4, col: 4 } };
        this.mapWidth = cfg.width;
        this.mapHeight = cfg.height;
        this.capitalRow = cfg.capitalPosition.row;
        this.capitalCol = cfg.capitalPosition.col;

        // Grid data: hexMap[row][col] = { terrain, visibility, isPlayerVillage }
        this.hexMap = [];

        // Enemy groups advancing toward the village
        this.enemies = [];

        // UnitManager — entity system for cities and future army migration
        this.unitManager = null;
        this.cityUnitId = null;   // ID of the capital city unit

        // Active multi-day battles (resolved partially each day)
        this.activeBattles = [];

        // UI state
        this.selectedHex = null;
        this.pendingPath = null;
        this.selectedArmyId = null; // Currently selected player army
        this.moveMode = false;      // true when waiting for click-to-move destination
        this.initialized = false;
        this.renderer = null;

        // Subscribe to day-end (canonical event name is 'day-ended')
        window.eventBus?.on('day-ended', () => this.onDayEnded());

        console.log('[WorldManager] Constructed — grid', this.mapWidth, 'x', this.mapHeight);
    }

    // ===================================================================
    // INITIALIZATION (called on first view switch; idempotent)
    // ===================================================================

    init() {
        if (this.initialized) {
            // Just refresh the renderer when switching back to world view
            this.refreshUI();
            return;
        }

        console.log('[WorldManager] First init — building map');

        // Build hexMap (or restore from save)
        if (!this.restoreFromSave()) {
            this.generateMap();
        }

        // Bootstrap UnitManager
        this.initUnitManager();

        // Build DOM
        this.setupWorldUI();

        // Create MapRenderer on the hex-overlay container
        this.renderer = new (window.MapRenderer || MapRenderer)(this);
        this.renderer.init();

        this.initialized = true;
        this.refreshUI();
        console.log('[WorldManager] Init complete');
    }

    // ===================================================================
    // TERRAIN GENERATION
    // ===================================================================

    generateMap() {
        // Use simplex noise for natural terrain distribution
        const seed = Date.now() % 100000;
        const noise = window.SimplexNoise ? new window.SimplexNoise(seed) : null;
        const moistureNoise = window.SimplexNoise ? new window.SimplexNoise(seed + 1000) : null;

        this.hexMap = [];
        for (let r = 0; r < this.mapHeight; r++) {
            this.hexMap[r] = [];
            for (let c = 0; c < this.mapWidth; c++) {
                const dist = Math.abs(r - this.capitalRow) + Math.abs(c - this.capitalCol);
                const isCapital = (r === this.capitalRow && c === this.capitalCol);

                this.hexMap[r][c] = {
                    terrain: isCapital ? 'village' : this.pickTerrain(r, c, dist, noise, moistureNoise),
                    visibility: isCapital ? 'explored' : 'hidden',
                    isPlayerVillage: isCapital
                };
            }
        }

        // Reveal tiles adjacent to capital (+ army scout bonus + legacy scout bonus)
        const baseRadius = window.WORLD_DATA?.mapConfig?.initialExplorationRadius || 1;
        const scoutBonus = window.gameState?.investments?.armyScouts || 0;
        const legacyScoutBonus = window.legacySystem?.legacy?.bonuses?.startingScout || 0;
        this.revealAround(this.capitalRow, this.capitalCol, baseRadius + scoutBonus + legacyScoutBonus);

        console.log('[WorldManager] Map generated with', noise ? 'simplex noise' : 'fallback random');
    }

    /**
     * Initialize the UnitManager and ensure a capital city unit exists.
     * Called once during init(), after hexMap is ready.
     */
    initUnitManager() {
        if (window.UnitManager) {
            this.unitManager = new UnitManager();
            this.unitManager.gameState = this.gameState;
            this.unitManager.worldManager = this;
            this.unitManager.init();  // loads saved units from localStorage
            window.unitManager = this.unitManager;

            // Ensure capital city unit exists (may already be loaded from save)
            this.ensureCityUnit();

            // Listen for city unit destruction → dynasty end
            window.eventBus?.on('unit_destroyed', (data) => {
                if (data?.unit?.type === 'city' && data.unit.data?.isCapital) {
                    console.log('[WorldManager] Capital city unit destroyed — triggering dynasty end');
                    const dynastyName = localStorage.getItem('dynastyName') || this.gameState?.dynastyName || 'Unknown';
                    if (window.legacySystem) {
                        window.legacySystem.performEndDynasty(this.gameState, dynastyName, 'village_destroyed');
                    }
                }
            });

            console.log('[WorldManager] UnitManager bootstrapped, city unit:', this.cityUnitId);
        } else {
            console.warn('[WorldManager] UnitManager not available — Unit.js / UnitManager.js may not be loaded');
        }
    }

    /**
     * Ensure the capital city has a corresponding Unit entity.
     * If one already exists (from save), re-link it. Otherwise create it.
     */
    ensureCityUnit() {
        if (!this.unitManager) return;

        // Check if a capital city unit already exists (loaded from save)
        const existingCity = this.unitManager.getAllUnits().find(
            u => u.type === 'city' && u.data?.isCapital && !u.destroyed
        );

        if (existingCity) {
            this.cityUnitId = existingCity.id;
            return;
        }

        // Create the capital city unit
        const dynastyName = this.gameState?.dynastyName || localStorage.getItem('dynastyName') || 'Kingdom';
        const cityUnit = this.unitManager.createCityUnit({
            row: this.capitalRow,
            col: this.capitalCol,
            name: dynastyName + ' Capital',
            data: {
                isCapital: true,
                level: 1,
                governor: null,
                founded: this.gameState?.day || 1
            }
        });
        this.cityUnitId = cityUnit.id;
    }

    /**
     * Pick terrain using simplex noise for elevation + moisture.
     * Falls back to zone-weighted random if SimplexNoise is unavailable.
     */
    pickTerrain(row, col, dist, noise, moistureNoise) {
        if (!noise) {
            // Fallback: original zone-weighted random
            return this._pickTerrainFallback(dist);
        }

        // Sample noise at map scale (0.4 gives good feature size for 9×9)
        const scale = 0.4;
        const elevation = noise.fbm(col * scale, row * scale, 3);         // -1 to 1
        const moisture = moistureNoise.fbm(col * scale, row * scale, 3);  // -1 to 1

        // Normalize to 0–1
        const e = (elevation + 1) / 2; // 0 = low, 1 = high
        const m = (moisture + 1) / 2;  // 0 = dry, 1 = wet

        // Distance influence: farther tiles skew toward extreme terrain
        const distFactor = Math.min(dist / 4, 1); // 0 at capital, 1 at edges

        // Terrain selection based on elevation + moisture biome chart
        if (e > 0.7 + distFactor * 0.1) {
            return 'mountain';
        } else if (e > 0.55) {
            return 'hill';
        } else if (e < 0.2 && m > 0.6) {
            return 'swamp';
        } else if (e < 0.3 && m < 0.3) {
            return 'desert';
        } else if (m > 0.55) {
            return 'forest';
        } else if (m > 0.35 || dist <= 1) {
            return 'grass';
        } else {
            // Higher chance of ruins at extreme distance
            if (distFactor > 0.7 && Math.random() < 0.15) return 'ruins';
            return 'plains';
        }
    }

    /** Fallback terrain picker when SimplexNoise isn't loaded */
    _pickTerrainFallback(dist) {
        const pool = {
            inner: ['grass', 'plains', 'grass', 'plains', 'forest', 'hill'],
            mid:   ['grass', 'plains', 'forest', 'forest', 'hill', 'hill', 'desert', 'swamp'],
            outer: ['forest', 'hill', 'mountain', 'swamp', 'desert', 'ruins', 'forest', 'hill', 'mountain']
        };
        let choices;
        if (dist <= 1) {
            choices = pool.inner;
        } else if (dist <= 2) {
            choices = [...pool.inner, ...pool.mid];
        } else if (dist <= 3) {
            choices = pool.mid;
        } else {
            choices = [...pool.mid.slice(0, 3), ...pool.outer];
        }
        return choices[Math.floor(Math.random() * choices.length)];
    }

    // ===================================================================
    // FOG OF WAR — 3-STATE (hidden / scoutable / explored)
    // ===================================================================

    revealAround(row, col, radius) {
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (!this.inBounds(r, c)) continue;

                const hex = this.hexMap[r][c];
                // Use Chebyshev distance so diagonals count as distance 1
                if (Math.max(Math.abs(dr), Math.abs(dc)) <= radius) {
                    hex.visibility = 'explored';
                }
            }
        }
        // Mark tiles adjacent to explored tiles as scoutable (fog fringe)
        this.updateScoutableFringe();
    }

    updateScoutableFringe() {
        // Any hidden tile adjacent to an explored tile becomes scoutable
        for (let r = 0; r < this.mapHeight; r++) {
            for (let c = 0; c < this.mapWidth; c++) {
                if (this.hexMap[r][c].visibility !== 'hidden') continue;
                const neighbors = this.getNeighbors(r, c);
                if (neighbors.some(n => this.hexMap[n.row][n.col].visibility === 'explored')) {
                    this.hexMap[r][c].visibility = 'scoutable';
                }
            }
        }
    }

    exploreTile(row, col) {
        const hex = this.hexMap[row]?.[col];
        if (!hex || hex.visibility === 'explored') return;
        hex.visibility = 'explored';
        // Reveal neighbors as scoutable
        this.revealAround(row, col, 1);
        window.eventBus?.emit('tile_explored', { row, col, terrain: hex.terrain });
    }

    // ===================================================================
    // RUINS EXPLORATION — Relic Discovery + Gold
    // ===================================================================

    exploreRuins(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army || army.status !== 'idle') return;

        const row = army.position.y;
        const col = army.position.x;
        const hex = this.hexMap[row]?.[col];
        if (!hex || hex.terrain !== 'ruins') {
            window.showToast?.('No ruins to explore here.', { type: 'warning' });
            return;
        }

        // Mark ruins as explored (change terrain to plains so they can't be re-explored)
        hex.terrain = 'plains';

        // Gold reward: 50-200 gold
        const goldReward = 50 + Math.floor(Math.random() * 151);
        if (this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
            this.gameState.gold = this.gameState.resources.gold;
        }

        // Supply bonus: army finds some provisions
        const foodFound = 10 + Math.floor(Math.random() * 21);
        if (army.supplies) {
            army.supplies.food = (army.supplies.food || 0) + foodFound;
        }

        // Roll for relic discovery
        let relicFound = null;
        if (window.game?.monarchManager?.rollRelicFromRuins) {
            relicFound = window.game.monarchManager.rollRelicFromRuins();
        }

        // Build result message
        let msg = `🏚️ ${army.name} explored ancient ruins! Found ${goldReward} gold and ${foodFound} food.`;
        if (relicFound) {
            msg = `🏚️ ${army.name} explored ancient ruins! Found ${goldReward} gold, ${foodFound} food, and discovered ${relicFound.icon} ${relicFound.name}!`;
        }
        window.showToast?.(msg, { type: relicFound ? 'legendary' : 'success' });

        window.eventBus?.emit('ruins_explored', { armyId, row, col, goldReward, relicFound });
        window.eventBus?.emit('resources-updated');
        this.refreshUI();
        this.gameState.save?.();
    }

    // ===================================================================
    // SELECTION & INFO PANEL
    // ===================================================================

    selectHex(row, col) {
        // If in move mode, treat this click as the destination for the selected army
        if (this.moveMode && this.selectedArmyId) {
            const hex = this.hexMap[row]?.[col];
            if (hex && hex.visibility !== 'hidden') {
                // Patrol mode — confirm patrol waypoint instead of normal move
                if (this.patrolPending) {
                    this.confirmPatrol(row, col);
                    return;
                }
                this.moveArmy(this.selectedArmyId, row, col);
                this.moveMode = false;
                // Keep army selected, update panels
                this.selectedHex = { row, col };
                this.refreshUI();
                return;
            } else {
                window.showToast?.('Cannot move to an unexplored tile.', { type: 'warning' });
                return;
            }
        }

        // Check if there's a player army on the clicked tile — auto-select the army
        const armiesHere = this.getPlayerArmiesAt(row, col);
        if (armiesHere.length > 0) {
            this.selectedArmyId = armiesHere[0].id;
        } else {
            // Clicking elsewhere deselects the army
            this.selectedArmyId = null;
        }

        this.selectedHex = { row, col };
        this.updateInfoPanel();
        this.updateActionPanel();
        this.renderer?.fullTileStyleRefresh();
        this.renderer?.updateEntities();
    }

    /** Select an army by ID (called from army marker click) */
    selectArmy(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;
        this.selectedArmyId = armyId;
        this.moveMode = false;
        this.selectedHex = { row: army.position.y, col: army.position.x };
        this.updateInfoPanel();
        this.updateActionPanel();
        this.renderer?.fullTileStyleRefresh();
        this.renderer?.updateEntities();
    }

    /** Enter move mode for the selected army */
    enterMoveMode() {
        if (!this.selectedArmyId) return;
        const army = this.gameState.getArmy?.(this.selectedArmyId);
        if (!army || army.status === 'traveling') {
            window.showToast?.('This army is already traveling.', { type: 'warning' });
            return;
        }
        this.moveMode = true;
        this.updateActionPanel();
        window.showToast?.('Click a tile to move the army there.', { type: 'info', timeout: 3000 });
    }

    /** Cancel move mode */
    cancelMoveMode() {
        this.moveMode = false;
        this.updateActionPanel();
    }

    formatCoords(r, c) {
        const dr = r - this.capitalRow;
        const dc = c - this.capitalCol;
        const ns = dr < 0 ? `${Math.abs(dr)}N` : dr > 0 ? `${dr}S` : '';
        const ew = dc < 0 ? `${Math.abs(dc)}W` : dc > 0 ? `${dc}E` : '';
        return ns + ew || 'Capital';
    }

    updateInfoPanel() {
        const panel = document.getElementById('hex-info');
        if (!panel) return;

        if (!this.selectedHex) {
            panel.innerHTML = '<p class="info-placeholder">Select a tile to view details</p>';
            return;
        }

        const { row, col } = this.selectedHex;
        const hex = this.hexMap[row]?.[col];
        if (!hex) return;

        const terrain = window.getTerrain?.(hex.terrain) || { symbol: '?', description: 'Unknown' };
        const terrainDef = window.WORLD_DATA?.terrainTypes?.[hex.terrain] || {};
        const coords = this.formatCoords(row, col);

        let html = `<h3>${terrain.symbol} ${terrainDef.name || hex.terrain}</h3>`;
        html += `<p class="hex-coords">${coords}</p>`;

        if (hex.visibility === 'hidden') {
            html += `<p>Unexplored territory</p>`;
        } else if (hex.visibility === 'scoutable') {
            html += `<p>Fog of war — armies auto-explore as they move through adjacent tiles.</p>`;
        } else {
            html += `<p>${terrainDef.description || ''}</p>`;
            html += `<p>Move cost: ${terrainDef.moveCost || 1}</p>`;
            if (terrainDef.defensiveBonus) {
                html += `<p>Defense bonus: +${Math.round(terrainDef.defensiveBonus * 100)}%</p>`;
            }
            // Enemy zone of control warning
            const zocEnemy = this.getEnemyZoneOfControl(row, col);
            if (zocEnemy) {
                html += `<p style="color:#c0392b;font-weight:bold;">⚠️ Enemy Zone of Control (+2 move cost)</p>`;
            }
            // City info
            if (hex.city) {
                html += `<hr><h4>🏛️ ${hex.city.name}</h4>`;
                html += `<p>Level ${hex.city.level || 1} · Founded day ${hex.city.founded || '?'}</p>`;
            }
        }

        // Show enemies at this tile (only if visible to player)
        const visibleEnemies = this.getVisibleEnemiesAt(row, col);
        if (visibleEnemies.length > 0) {
            html += `<hr><h4>⚠️ Enemies</h4>`;
            visibleEnemies.forEach(e => {
                html += `<p>${this.getEnemyTypeInfo(e).icon} ${e.name} — ${e.units.length} units</p>`;
            });
        }

        // Show player armies at this tile
        const armiesHere = this.getPlayerArmiesAt(row, col);
        if (armiesHere.length > 0) {
            html += `<hr><h4>⚔️ Your Armies</h4>`;
            armiesHere.forEach(a => {
                html += `<p>${a.name} — ${a.units.length} units (${a.status})</p>`;
            });
        }

        panel.innerHTML = html;
    }

    updateActionPanel() {
        const panel = document.getElementById('world-actions');
        if (!panel) return;

        let html = '';

        // ── Selected army command panel ──
        const selectedArmy = this.selectedArmyId ? this.gameState.getArmy?.(this.selectedArmyId) : null;
        if (selectedArmy) {
            const statusIcon = selectedArmy.status === 'traveling' ? '🚶' : selectedArmy.status === 'fighting' ? '⚔️' : selectedArmy.status === 'garrisoned' ? '🏰' : selectedArmy.status === 'city' ? '🏛️' : '🏕️';
            const statusLabel = selectedArmy.status === 'traveling' ? 'Traveling' : selectedArmy.status === 'fighting' ? 'In Combat' : selectedArmy.status === 'garrisoned' ? 'Garrisoned' : selectedArmy.status === 'city' ? 'City Garrison' : 'Idle';

            html += `<div class="selected-army-panel">`;
            html += `<h4>${statusIcon} ${selectedArmy.name}</h4>`;
            html += `<p style="opacity:0.8;font-size:0.85em;margin:4px 0;">${selectedArmy.units?.length || 0} soldiers — ${statusLabel}</p>`;

            // General assigned?
            const general = this.gameState.royalFamily?.getGeneralForArmy?.(selectedArmy.id);
            if (general) {
                const mil = general.skills?.military || 0;
                const bonus = Math.min(mil * 10, 100);
                html += `<p style="color:#c9a84c;font-size:0.8em;margin:2px 0;">👑 General ${general.name} (+${bonus}% attack)</p>`;
            }
            
            // Army stats summary
            const totalAttack = (selectedArmy.units || []).reduce((s, u) => s + (u.attack || 10), 0);
            const totalDefense = (selectedArmy.units || []).reduce((s, u) => s + (u.defense || 5), 0);
            const avgHealth = (selectedArmy.units || []).length > 0 ? Math.round((selectedArmy.units || []).reduce((s, u) => s + (u.health || 100), 0) / selectedArmy.units.length) : 0;
            const armyMorale = selectedArmy.morale ?? 100;
            const moraleColor = armyMorale > 70 ? '#27ae60' : armyMorale > 40 ? '#f39c12' : '#c0392b';
            const armyCohesion = selectedArmy.cohesion ?? 50;
            const cohesionColor = armyCohesion > 70 ? '#3498db' : armyCohesion > 40 ? '#9b59b6' : '#7f8c8d';
            html += `<div style="display:flex;gap:8px;margin:6px 0;font-size:0.8em;opacity:0.85;">`;
            html += `<span>⚔️ ${totalAttack}</span>`;
            html += `<span>🛡️ ${totalDefense}</span>`;
            html += `<span>❤️ ${avgHealth}%</span>`;
            html += `<span style="color:${moraleColor};">🔥 ${armyMorale}%</span>`;
            html += `<span style="color:${cohesionColor};" title="Cohesion — improves while resting, affects combat">🤝 ${armyCohesion}%</span>`;
            html += `</div>`;

            // Supply bar with visual indicator
            if (selectedArmy.supplies) {
                const food = selectedArmy.supplies.food || 0;
                const maxFood = this.getArmyMaxSupply(selectedArmy);
                const pct = Math.min(100, Math.round((food / Math.max(maxFood, 1)) * 100));
                const barColor = pct > 50 ? '#27ae60' : pct > 20 ? '#f39c12' : '#c0392b';
                html += `<div style="margin:4px 0;">`;
                html += `<div style="display:flex;justify-content:space-between;font-size:0.8em;opacity:0.8;"><span>🍖 Supplies</span><span>${food} food</span></div>`;
                html += `<div style="height:6px;background:#2a1f14;border-radius:3px;margin-top:2px;overflow:hidden;">`;
                html += `<div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.3s;"></div>`;
                html += `</div>`;
                const daysLeft = food > 0 ? Math.floor(food / Math.max(selectedArmy.units?.length || 1, 1)) : 0;
                html += `<div style="font-size:0.7em;opacity:0.6;margin-top:1px;">~${daysLeft} days remaining</div>`;
                html += `</div>`;
            }

            // Individual soldier stat cards
            if (selectedArmy.units && selectedArmy.units.length > 0) {
                html += `<div style="max-height:150px;overflow-y:auto;margin:6px 0;border:1px solid #5a4230;border-radius:4px;">`;
                selectedArmy.units.forEach(u => {
                    const hpPct = Math.round(((u.health || 100) / (u.maxHealth || 100)) * 100);
                    const hpColor = hpPct > 60 ? '#27ae60' : hpPct > 30 ? '#f39c12' : '#c0392b';
                    html += `<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-bottom:1px solid #3a2a1a;font-size:0.75em;">`;
                    html += `<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name || 'Soldier'}</span>`;
                    html += `<span style="color:${hpColor};">❤${hpPct}%</span>`;
                    html += `<span>⚔${u.attack || 10}</span>`;
                    html += `<span>🛡${u.defense || 5}</span>`;
                    html += `</div>`;
                });
                html += `</div>`;
            }

            html += `<div class="army-commands" style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">`;

            if (this.moveMode) {
                html += `<p style="color:#c9a84c;font-size:0.85em;text-align:center;">📍 Click a tile to move</p>`;
                html += `<button class="world-btn" onclick="window.worldManager.cancelMoveMode()">✖ Cancel Move</button>`;
            } else if (selectedArmy.status === 'garrisoned') {
                const maxSupply = this.getArmyMaxSupply(selectedArmy);
                const curSupply = selectedArmy.supplies?.food ?? 0;
                const supplyPct = Math.round((curSupply / Math.max(maxSupply, 1)) * 100);
                html += `<p style="color:#27ae60;font-size:0.8em;text-align:center;margin:2px 0;">🔄 Resupplying daily (${supplyPct}% supplied)</p>`;
                // Resupply slider
                html += `<div style="margin:6px 0;font-size:0.8em;">`;
                html += `<label>🍖 Supply to carry: <span id="resupply-val">${curSupply}</span>/${maxSupply}</label>`;
                html += `<input type="range" min="0" max="${maxSupply}" value="${curSupply}" style="width:100%;" oninput="document.getElementById('resupply-val').textContent=this.value" id="resupply-slider">`;
                html += `<button class="world-btn" onclick="window.worldManager.resupplyArmy('${selectedArmy.id}', parseInt(document.getElementById('resupply-slider').value))" style="margin-top:2px;">📦 Set Supplies</button>`;
                html += `</div>`;
                // Auto-resupply toggle
                const garAutoOn = selectedArmy.autoResupply;
                html += `<button class="world-btn" onclick="window.worldManager.toggleAutoResupply('${selectedArmy.id}')" style="${garAutoOn ? 'background:linear-gradient(135deg,#1a4a2a,#2a6a3a);border-color:#4a8a4a;' : ''}">${garAutoOn ? '✅' : '⬜'} Auto-Resupply</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.deployArmy('${selectedArmy.id}')">🚶 Deploy</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.disbandArmy('${selectedArmy.id}')" style="opacity:0.8;">❌ Disband</button>`;
            } else if (selectedArmy.status === 'idle') {
                html += `<button class="world-btn" onclick="window.worldManager.enterMoveMode()">🚶 Move</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.returnArmy('${selectedArmy.id}')">🏠 Return Home</button>`;
                // Patrol
                if (selectedArmy.patrol) {
                    html += `<button class="world-btn" onclick="window.worldManager.cancelPatrol('${selectedArmy.id}')" style="background:linear-gradient(135deg,#6a3a1a,#8a5a2a);border-color:#c9a84c;">🔁 Stop Patrol</button>`;
                } else {
                    html += `<button class="world-btn" onclick="window.worldManager.enterPatrolMode('${selectedArmy.id}')">🔁 Patrol</button>`;
                }
                // Auto-resupply toggle
                const autoOn = selectedArmy.autoResupply;
                html += `<button class="world-btn" onclick="window.worldManager.toggleAutoResupply('${selectedArmy.id}')" style="${autoOn ? 'background:linear-gradient(135deg,#1a4a2a,#2a6a3a);border-color:#4a8a4a;' : ''}">${autoOn ? '✅' : '⬜'} Auto-Resupply</button>`;
                // Manual resupply (only at capital)
                if (this.isArmyAtCapital(selectedArmy)) {
                    const maxS = this.getArmyMaxSupply(selectedArmy);
                    const curS = selectedArmy.supplies?.food ?? 0;
                    html += `<div style="margin:6px 0;font-size:0.8em;">`;
                    html += `<label>🍖 Resupply: <span id="resupply-val">${curS}</span>/${maxS}</label>`;
                    html += `<input type="range" min="0" max="${maxS}" value="${curS}" style="width:100%;" oninput="document.getElementById('resupply-val').textContent=this.value" id="resupply-slider">`;
                    html += `<button class="world-btn" onclick="window.worldManager.resupplyArmy('${selectedArmy.id}', parseInt(document.getElementById('resupply-slider').value))" style="margin-top:2px;">📦 Resupply</button>`;
                    html += `</div>`;
                }
                // Explore Ruins — only when army is on a ruins tile
                const armyPosForRuins = selectedArmy.position;
                const tileTerrainForRuins = this.hexMap[armyPosForRuins.y]?.[armyPosForRuins.x]?.terrain;
                if (tileTerrainForRuins === 'ruins') {
                    html += `<button class="world-btn" onclick="window.worldManager.exploreRuins('${selectedArmy.id}')" style="background:linear-gradient(135deg,#4a2a6a,#6a3a8a);border-color:#8a5aaa;">🏚️ Explore Ruins</button>`;
                }
                // Establish city — only on explored non-capital tiles without existing city
                const armyPos = selectedArmy.position;
                const isOnCapital = armyPos.y === this.capitalRow && armyPos.x === this.capitalCol;
                const tileHasCity = this.hexMap[armyPos.y]?.[armyPos.x]?.city;
                if (!isOnCapital && !tileHasCity) {
                    html += `<button class="world-btn" onclick="window.worldManager.establishCity('${selectedArmy.id}')" style="background:linear-gradient(135deg,#2a4a2a,#3a6a3a);border-color:#4a8a4a;">🏛️ Establish City</button>`;
                }
                html += `<button class="world-btn" onclick="window.worldManager.disbandArmy('${selectedArmy.id}')" style="opacity:0.8;">❌ Disband</button>`;
            } else if (selectedArmy.status === 'traveling') {
                if (selectedArmy.patrol) {
                    html += `<p style="color:#c9a84c;font-size:0.8em;text-align:center;">🔁 Patrolling</p>`;
                    html += `<button class="world-btn" onclick="window.worldManager.cancelPatrol('${selectedArmy.id}')" style="background:linear-gradient(135deg,#6a3a1a,#8a5a2a);border-color:#c9a84c;">🔁 Stop Patrol</button>`;
                } else if (selectedArmy._autoResupplyReturn) {
                    html += `<p style="color:#f39c12;font-size:0.8em;text-align:center;">📦 Returning for resupply...</p>`;
                } else {
                    html += `<p style="opacity:0.7;font-size:0.8em;text-align:center;">Army is on the move...</p>`;
                }
                html += `<button class="world-btn" onclick="window.worldManager.returnArmy('${selectedArmy.id}')">🏠 Recall</button>`;
            }

            html += `</div>`;
            html += `<hr style="border-color:#5a4230;margin:8px 0;">`;
            html += `<button class="world-btn-sm" style="width:100%;opacity:0.6;" onclick="window.worldManager.deselectArmy()">Deselect Unit</button>`;
            html += `</div>`;
        }

        // ── Draft army button (only when selected tile is the capital) ──
        const isCapitalSelected = this.selectedHex &&
            this.selectedHex.row === this.capitalRow &&
            this.selectedHex.col === this.capitalCol;
        const canDraft = isCapitalSelected && this.getAvailableForDraft().length >= 1;
        if (isCapitalSelected) {
            html += `<button class="world-btn" onclick="window.worldManager.showDraftModal()" 
                        ${canDraft ? '' : 'disabled'}>
                        ⚔️ Draft Army</button>`;
        }

        // ── Context-sensitive tile buttons ──
        if (this.selectedHex && !selectedArmy) {
            const { row, col } = this.selectedHex;
            const hex = this.hexMap[row]?.[col];

            // Scout button for scoutable tiles
            if (hex?.visibility === 'scoutable') {
                const armies = this.gameState.getAllArmies?.() || [];
                const armiesOnAdj = armies.filter(a => {
                    const dist = Math.abs(a.position.y - row) + Math.abs(a.position.x - col);
                    return dist <= 1 && a.status === 'idle';
                });
                if (armiesOnAdj.length > 0) {
                    html += `<button class="world-btn" onclick="window.worldManager.scoutTile(${row}, ${col})">
                                🔭 Scout This Tile</button>`;
                }
            }
        }

        // ── Army list (only if no army is selected) ──
        if (!selectedArmy) {
            const armies = this.gameState.getAllArmies?.() || [];
            if (armies.length > 0) {
                html += `<hr><h4 style="margin:4px 0;">Active Armies</h4>`;
                armies.forEach(a => {
                    const statusIcon = a.status === 'traveling' ? '🚶' : a.status === 'fighting' ? '⚔️' : a.status === 'garrisoned' ? '🏰' : a.status === 'city' ? '🏛️' : '🏕️';
                    const statusLabel = a.status === 'traveling' ? 'Moving' : a.status === 'fighting' ? 'Combat' : a.status === 'garrisoned' ? 'Garrisoned' : a.status === 'city' ? 'City garrison' : 'Idle';
                    const totalAttack = (a.units || []).reduce((s, u) => s + (u.attack || 10), 0);
                    const totalDefense = (a.units || []).reduce((s, u) => s + (u.defense || 5), 0);
                    const foodLeft = a.supplies?.food ?? 0;
                    const morale = a.morale ?? 100;
                    const coords = this.formatCoords(a.position?.y ?? 0, a.position?.x ?? 0);
                    // General info
                    const general = this.gameState.royalFamily?.getGeneralForArmy?.(a.id);
                    const genLabel = general ? `<span style="color:#c9a84c;font-size:0.75em;">👑 ${general.name}</span>` : '';

                    html += `<div class="army-list-item" style="cursor:pointer;padding:8px 10px;border:1px solid #5a4230;border-radius:6px;margin:4px 0;background:linear-gradient(135deg,rgba(42,31,20,0.5),rgba(60,45,30,0.4));transition:all 0.2s;" onmouseenter="this.style.borderColor='#c9a84c';this.style.background='linear-gradient(135deg,rgba(60,45,30,0.7),rgba(80,60,35,0.5))';" onmouseleave="this.style.borderColor='#5a4230';this.style.background='linear-gradient(135deg,rgba(42,31,20,0.5),rgba(60,45,30,0.4))';" onclick="window.worldManager.selectArmy('${a.id}')">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="font-size:0.9em;">${statusIcon} ${a.name}</strong>
                            <span style="font-size:0.7em;opacity:0.7;">${coords}</span>
                        </div>
                        <div style="display:flex;gap:8px;font-size:0.8em;margin-top:4px;">
                            <span>👥 ${a.units?.length || 0}</span>
                            <span>⚔️ ${totalAttack}</span>
                            <span>🛡️ ${totalDefense}</span>
                            <span>🍖 ${foodLeft}</span>
                            <span>🔥 ${morale}%</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">
                            <span style="font-size:0.7em;padding:1px 6px;border-radius:3px;background:rgba(90,66,48,0.5);color:#c9a84c;">${statusLabel}</span>
                            ${genLabel}
                        </div>
                    </div>`;
                });
            }

            // ── Cities list ──
            const cities = this.getCities?.() || [];
            if (cities.length > 0) {
                html += `<hr><h4 style="margin:4px 0;">Cities</h4>`;
                cities.forEach(city => {
                    const coords = this.formatCoords(city.row, city.col);
                    html += `<div class="city-list-item" style="padding:4px 6px;border:1px solid #2a6a2a;border-radius:4px;margin:3px 0;background:rgba(42,106,42,0.15);cursor:pointer;" onclick="window.worldManager.selectHex(${city.row}, ${city.col})">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>🏛️ ${city.name}</strong>
                            <span style="font-size:0.75em;opacity:0.7;">${coords}</span>
                        </div>
                        <div style="font-size:0.7em;opacity:0.6;">Level ${city.level || 1} · Founded day ${city.founded || '?'}</div>
                    </div>`;
                });
            }
        }

        panel.innerHTML = html;
    }

    deselectArmy() {
        this.selectedArmyId = null;
        this.moveMode = false;
        this.updateActionPanel();
        this.renderer?.updateEntities();
    }

    // ===================================================================
    // ARMY DRAFTING — POPULATION INTERACTION
    // ===================================================================

    getAvailableForDraft() {
        if (!this.gameState.populationManager) return [];
        return this.gameState.populationManager.getAll().filter(v =>
            v.age >= 16 &&
            v.status !== 'drafted' &&
            v.status !== 'sick' &&
            v.canWork !== false
        );
    }

    showDraftModal() {
        const available = this.getAvailableForDraft();
        if (available.length < 1) {
            window.showToast?.('No villagers available for drafting.', { type: 'warning' });
            return;
        }

        // Army size cap: 5 base, 10 with a free general
        const hasGeneralAvailable = this._hasFreeGeneral();
        const maxArmySize = hasGeneralAvailable ? 10 : 5;
        const currentArmyCount = (this.gameState.armies?.length || 0);
        const foodAvailable = Math.floor(this.gameState.resources?.food || 0);

        // Predict unit types and stats for each villager
        const battleMgr = window.battleManager || window.game?.battleManager;
        const enriched = available.map(v => {
            let unitType = 'militia';
            let stats = { attack: 10, defense: 5, health: 80 };
            if (battleMgr) {
                unitType = battleMgr.determineUnitTypeFromVillager?.(v) || 'militia';
                stats = battleMgr.calculateUnitStats?.(v, unitType) || stats;
            }
            // Humanize skill keys: "resourceProduction.agriculture" → "agriculture"
            const rawSkills = v.skills || {};
            const topSkills = (Array.isArray(rawSkills) ? rawSkills : Object.keys(rawSkills))
                .map(s => {
                    // Take the part after the last dot, then capitalize first letter
                    const short = s.includes('.') ? s.split('.').pop() : s;
                    return short.replace(/([A-Z])/g, ' $1').trim().replace(/^./, c => c.toUpperCase());
                })
                .slice(0, 2);
            return { ...v, unitType, stats, topSkills };
        });

        // Sort: guards/fighters first, then by attack desc
        enriched.sort((a, b) => (b.stats.attack + b.stats.defense) - (a.stats.attack + a.stats.defense));

        const unitTypeLabels = {
            militia: '🗡️ Militia',
            archer: '🏹 Archer',
            veteran_soldier: '⚔️ Veteran',
            heavy_infantry: '🛡️ Heavy',
            engineer: '🔧 Engineer',
            scout: '🏃 Scout',
            sapper: '💣 Sapper'
        };

        let html = `
        <div class="draft-modal-container">
            <div class="draft-info-bar">
                <div class="draft-info-item">
                    <span class="draft-info-label">Available</span>
                    <span class="draft-info-value">${available.length}</span>
                </div>
                <div class="draft-info-item">
                    <span class="draft-info-label">Max Size</span>
                    <span class="draft-info-value">${maxArmySize}</span>
                </div>
                <div class="draft-info-item">
                    <span class="draft-info-label">Armies</span>
                    <span class="draft-info-value">${currentArmyCount}</span>
                </div>
                <div class="draft-info-item">
                    <span class="draft-info-label">Food</span>
                    <span class="draft-info-value">🌾 ${foodAvailable}</span>
                </div>
            </div>
            ${!hasGeneralAvailable ? '<div class="draft-hint">💡 Assign a royal as General to raise the army cap from 5 → 10</div>' : ''}
            <div class="draft-controls">
                <label class="draft-army-name-label">Army Name:
                    <input type="text" id="draft-army-name" class="draft-name-input" value="Army ${currentArmyCount + 1}" />
                </label>
                <div class="draft-select-btns">
                    <button class="btn-secondary btn-sm" onclick="document.querySelectorAll('.draft-table input[type=checkbox]').forEach((cb,i) => {if(i<${maxArmySize}) cb.checked=true}); window.worldManager._updateDraftSummary(${maxArmySize})">Select ${maxArmySize}</button>
                    <button class="btn-secondary btn-sm" onclick="document.querySelectorAll('.draft-table input[type=checkbox]').forEach(cb => cb.checked=false); window.worldManager._updateDraftSummary(${maxArmySize})">Clear All</button>
                </div>
            </div>
            <div class="draft-table-wrapper">
                <table class="draft-table">
                    <thead>
                        <tr>
                            <th style="width:30px;"></th>
                            <th>Name</th>
                            <th>Age</th>
                            <th>Role</th>
                            <th>Skills</th>
                            <th>Unit Type</th>
                            <th>⚔️</th>
                            <th>🛡️</th>
                            <th>❤️</th>
                        </tr>
                    </thead>
                    <tbody>`;

        enriched.forEach((v, i) => {
            const checked = i < Math.min(3, maxArmySize) ? 'checked' : '';
            const skillBadges = v.topSkills.map(s => `<span class="draft-skill-badge">${s}</span>`).join('');
            const typeLabel = unitTypeLabels[v.unitType] || '🗡️ Militia';

            html += `<tr class="draft-row" onclick="const cb=this.querySelector('input');cb.checked=!cb.checked;window.worldManager._updateDraftSummary(${maxArmySize})">
                <td><input type="checkbox" value="${v.id}" ${checked} data-max="${maxArmySize}" onclick="event.stopPropagation();window.worldManager._updateDraftSummary(${maxArmySize})"></td>
                <td class="draft-name">${v.name || 'Villager'}</td>
                <td>${v.age}</td>
                <td>${v.role || 'idle'}</td>
                <td>${skillBadges || '<span style="color:#666;">—</span>'}</td>
                <td class="draft-unit-type">${typeLabel}</td>
                <td class="draft-stat-atk">${v.stats.attack}</td>
                <td class="draft-stat-def">${v.stats.defense}</td>
                <td class="draft-stat-hp">${v.stats.health}</td>
            </tr>`;
        });

        html += `</tbody></table></div>
            <div class="draft-summary" id="draft-summary">
                <span id="draft-selected-count">0</span> / ${maxArmySize} selected
                · ~<span id="draft-supply-cost">0</span> 🌾 supplies
            </div>`;

        // Commander selection section
        const rf = this.gameState.royalFamily;
        const royals = rf?.royalFamily || [];
        const eligibleCommanders = royals.filter(m => m.age >= 16 && m.status !== 'dead');
        if (eligibleCommanders.length > 0) {
            html += `<div class="draft-commander-section">
                <div class="draft-commander-label">👑 Assign Commander</div>
                <div class="draft-commander-list">
                    <label class="draft-commander-option">
                        <input type="radio" name="draft-commander" value="" checked>
                        <span class="commander-card">
                            <span class="commander-icon">—</span>
                            <span class="commander-details">
                                <span class="commander-name">No Commander</span>
                                <span class="commander-role">Army capped at 5 soldiers</span>
                            </span>
                        </span>
                    </label>`;
            eligibleCommanders.forEach(m => {
                const isMonarch = m.status === 'monarch';
                const icon = isMonarch ? '👑' : m.role === 'general' ? '⚔️' : m.role === 'governor' ? '🏛️' : m.status === 'heir' ? '🏰' : '👤';
                const currentRole = m.role ? `Currently: ${m.role}` : (isMonarch ? 'Monarch' : m.status === 'heir' ? 'Heir' : 'Available');
                const alreadyAssigned = m.role === 'general' && m.assignedTo;
                const note = alreadyAssigned ? ' (will reassign)' : '';
                html += `<label class="draft-commander-option">
                        <input type="radio" name="draft-commander" value="${m.id}" onchange="window.worldManager._onCommanderSelected(${maxArmySize})">
                        <span class="commander-card">
                            <span class="commander-icon">${icon}</span>
                            <span class="commander-details">
                                <span class="commander-name">${m.name}${note}</span>
                                <span class="commander-role">${currentRole} · Age ${m.age}</span>
                            </span>
                        </span>
                    </label>`;
            });
            html += `</div></div>`;
        }

        html += `<div class="draft-actions">
                <button class="btn-primary" onclick="window.worldManager.confirmDraft()">⚔️ Confirm Draft</button>
                <button class="btn-secondary" onclick="window.modalSystem?.closeTopModal()">Cancel</button>
            </div>
        </div>`;

        window.modalSystem?.showModal({ title: '⚔️ Draft Army', content: html, width: '650px' });

        // Initial summary update
        setTimeout(() => this._updateDraftSummary(maxArmySize), 50);
    }

    /** Update the draft modal summary footer */
    _updateDraftSummary(maxArmySize) {
        const checkboxes = document.querySelectorAll('.draft-table input[type=checkbox]');
        let selected = 0;
        checkboxes.forEach(cb => {
            if (cb.checked) selected++;
        });
        // Enforce max
        if (selected > maxArmySize) {
            // Uncheck excess
            let count = 0;
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    count++;
                    if (count > maxArmySize) cb.checked = false;
                }
            });
            selected = maxArmySize;
        }
        const countEl = document.getElementById('draft-selected-count');
        const costEl = document.getElementById('draft-supply-cost');
        if (countEl) countEl.textContent = selected;
        if (costEl) costEl.textContent = selected * 5;
    }

    /** Called when commander radio changes — update max army size */
    _onCommanderSelected(baseMax) {
        const selectedRadio = document.querySelector('input[name="draft-commander"]:checked');
        const hasCommander = selectedRadio && selectedRadio.value !== '';
        const newMax = hasCommander ? 10 : 5;
        // Update summary display
        const summaryEl = document.getElementById('draft-summary');
        if (summaryEl) {
            const countEl = document.getElementById('draft-selected-count');
            const current = countEl ? parseInt(countEl.textContent) || 0 : 0;
            summaryEl.innerHTML = `<span id="draft-selected-count">${current}</span> / ${newMax} selected · ~<span id="draft-supply-cost">${current * 5}</span> 🌾 supplies`;
        }
        this._updateDraftSummary(newMax);
    }

    confirmDraft() {
        // Fix: query .draft-table (not .draft-list)
        const checkboxes = document.querySelectorAll('.draft-table input[type=checkbox]:checked');
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const armyName = document.getElementById('draft-army-name')?.value || 'Army';

        if (ids.length < 1) {
            window.showToast?.('Select at least 1 villager.', { type: 'warning' });
            return;
        }

        // Check if a commander was selected
        const selectedCommander = document.querySelector('input[name="draft-commander"]:checked');
        const commanderId = selectedCommander?.value || '';
        const hasCommander = commanderId !== '';

        // Enforce army size cap
        const maxArmySize = hasCommander ? 10 : 5;
        if (ids.length > maxArmySize) {
            window.showToast?.(`Army size limited to ${maxArmySize} soldiers.` + (!hasCommander ? ' Select a commander to raise the cap.' : ''), { type: 'warning' });
            return;
        }

        const battleMgr = window.battleManager || window.game?.battleManager;
        const units = [];
        ids.forEach(id => {
            const villager = this.gameState.populationManager.getInhabitant(id);
            if (!villager || villager.status === 'drafted') return;

            const originalRole = villager.role;
            const originalStatus = villager.status;

            // Determine unit type and stats from BattleManager
            let unitType = 'militia';
            let stats = { health: 80, attack: 12, defense: 8 };
            if (battleMgr) {
                unitType = battleMgr.determineUnitTypeFromVillager?.(villager) || 'militia';
                stats = battleMgr.calculateUnitStats?.(villager, unitType) || stats;
            }

            // Mark drafted in population
            this.gameState.populationManager.updateStatus(villager.id, 'drafted');

            units.push({
                id: `unit_${villager.id}`,
                villagerId: villager.id,
                name: villager.name || 'Soldier',
                type: unitType,
                originalRole,
                originalStatus,
                alive: true,
                health: stats.health || 80,
                maxHealth: stats.health || 80,
                attack: stats.attack || 12,
                defense: stats.defense || 8,
                speed: stats.speed || 10,
                morale: stats.morale || 60
            });
        });

        if (units.length === 0) return;

        // Create army in gameState (canonical source)
        const army = this.gameState.createArmy(armyName, units, {
            x: this.capitalCol,
            y: this.capitalRow
        });

        // Assign commander if selected
        if (hasCommander && this.gameState.royalFamily) {
            this.gameState.royalFamily.assignGeneral(commanderId, army.id);
            const commander = this.gameState.royalFamily.findRoyalById(commanderId);
            if (commander) {
                army.commanderName = commander.name;
                army.commanderId = commanderId;
            }
        }

        // Store drafted villager data on the army for restoration on disband
        army.draftedVillagers = units.map(u => ({
            id: u.villagerId,
            name: u.name,
            originalRole: u.originalRole,
            originalStatus: u.originalStatus
        }));
        const wagonsBonus = window.monarchManager?.getSupplyWagonsBonus?.() || 0;
        const carryPerSoldier = 2 + wagonsBonus;
        army.supplies = { food: Math.min(units.length * carryPerSoldier, this.gameState.resources?.food || 0) };
        army.cohesion = 50; // New armies start at 50% cohesion — improves while idle
        army.autoResupply = false;
        army.patrol = null;

        // Deduct food for supplies
        if (this.gameState.resources) {
            this.gameState.resources.food = Math.max(0, this.gameState.resources.food - army.supplies.food);
        }

        // Update population count (exclude drafted)
        this.gameState.population = this.gameState.populationManager.getAll()
            .filter(v => v.status !== 'drafted').length;

        window.modalSystem?.closeTopModal();
        const cmdMsg = army.commanderName ? ` Commander: ${army.commanderName}.` : '';
        window.showToast?.(`${armyName} formed with ${units.length} soldiers!${cmdMsg}`, { type: 'success' });
        window.eventBus?.emit('army_drafted', { army });

        this.refreshUI();
        this.gameState.save?.();
    }

    // ===================================================================
    // ARMY MOVEMENT
    // ===================================================================

    showMoveArmyModal() {
        if (!this.selectedHex) return;
        const armies = (this.gameState.getAllArmies?.() || []).filter(a => a.status === 'idle');
        if (armies.length === 0) return;

        const { row, col } = this.selectedHex;
        let html = `<h2>🚶 Move Army</h2>`;
        html += `<p>Select army to move to ${this.formatCoords(row, col)}:</p>`;

        armies.forEach(a => {
            html += `<button class="world-btn" style="margin:4px 0;width:100%;"
                        onclick="window.worldManager.moveArmy('${a.id}', ${row}, ${col})">
                        ${a.name} (${a.units.length} units)
                    </button>`;
        });
        html += `<div class="modal-buttons" style="margin-top:12px;">
            <button class="btn-secondary" onclick="window.modalSystem?.closeTopModal()">Cancel</button>
        </div>`;

        window.modalSystem?.showModal({ title: '🚶 Move Army', content: html });
    }

    moveArmy(armyId, targetRow, targetCol) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;

        const fromRow = army.position.y;
        const fromCol = army.position.x;

        // Use A* pathfinding
        const pathfind = window.findPath || window.pathfinding?.findPath;
        let path;
        if (pathfind) {
            path = pathfind(
                this.hexMap,
                { row: fromRow, col: fromCol },
                { row: targetRow, col: targetCol }
            );
        }

        if (!path || path.length < 2) {
            // Fallback: direct move (will take multiple days for > 1 distance)
            path = this.buildSimplePath(fromRow, fromCol, targetRow, targetCol);
        }

        army.travelPlan = {
            path: path,
            index: 0
        };
        army.status = 'traveling';

        window.modalSystem?.closeTopModal();
        window.showToast?.(`${army.name} is moving to ${this.formatCoords(targetRow, targetCol)}`, { type: 'info' });
        this.refreshUI();
    }

    buildSimplePath(fromRow, fromCol, toRow, toCol) {
        // Step-by-step path — one tile at a time (no diagonals)
        const path = [{ row: fromRow, col: fromCol }];
        let r = fromRow, c = fromCol;
        while (r !== toRow || c !== toCol) {
            // Move one axis per step, prefer the axis with larger distance
            const dr = toRow - r;
            const dc = toCol - c;
            if (Math.abs(dr) >= Math.abs(dc) && dr !== 0) {
                r += dr > 0 ? 1 : -1;
            } else if (dc !== 0) {
                c += dc > 0 ? 1 : -1;
            }
            path.push({ row: r, col: c });
        }
        return path;
    }

    returnArmy(armyId) {
        this.moveArmy(armyId, this.capitalRow, this.capitalCol);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RESUPPLY — manual & automatic
    // ═══════════════════════════════════════════════════════════════════

    /** Max food an army can carry: (2 + supplyWagons bonus) food per soldier */
    getArmyMaxSupply(army) {
        const wagonsBonus = window.monarchManager?.getSupplyWagonsBonus?.() || 0;
        return (army.units?.length || 1) * (2 + wagonsBonus);
    }

    /** Is this army sitting on the capital tile (regardless of status)? */
    isArmyAtCapital(army) {
        return army.position?.y === this.capitalRow && army.position?.x === this.capitalCol;
    }

    /**
     * Resupply an army from village food stores.
     * @param {string} armyId
     * @param {number} [amount] — how much food to take. Defaults to fill to max.
     */
    resupplyArmy(armyId, amount) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;
        if (!this.isArmyAtCapital(army) && army.status !== 'garrisoned') {
            window.showToast?.('Army must be at the capital to resupply.', { type: 'warning' });
            return;
        }
        if (!army.supplies) army.supplies = { food: 0 };
        const max = this.getArmyMaxSupply(army);
        const needed = max - army.supplies.food;
        if (needed <= 0) { window.showToast?.('Already fully supplied.', { type: 'info' }); return; }
        const available = this.gameState.resources?.food ?? 0;
        const transfer = Math.min(amount ?? needed, needed, available);
        if (transfer <= 0) { window.showToast?.('Not enough village food to resupply.', { type: 'warning' }); return; }
        army.supplies.food += transfer;
        this.gameState.resources.food -= transfer;
        window.eventBus?.emit('resources-updated');
        window.showToast?.(`${army.name} resupplied with ${transfer} food.`, { type: 'success' });
        this.refreshUI();
    }

    /** Toggle auto-resupply on an army */
    toggleAutoResupply(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;
        army.autoResupply = !army.autoResupply;
        window.showToast?.(`Auto-resupply ${army.autoResupply ? 'enabled' : 'disabled'} for ${army.name}.`, { type: 'info' });
        this.refreshUI();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PATROL — oscillate between two tiles
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start patrol between the army's current position and a target tile.
     * Enters move-mode so the player clicks the second waypoint.
     */
    enterPatrolMode(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army || army.status !== 'idle') return;
        this.patrolPending = armyId;
        this.moveMode = true;
        window.showToast?.('Click a tile to set the patrol destination.', { type: 'info' });
        this.refreshUI();
    }

    /** Called when a tile is clicked while patrolPending is set */
    confirmPatrol(targetRow, targetCol) {
        const armyId = this.patrolPending;
        this.patrolPending = null;
        this.moveMode = false;
        const army = this.gameState.getArmy?.(armyId);
        if (!army) { this.refreshUI(); return; }
        army.patrol = {
            pointA: { row: army.position.y, col: army.position.x },
            pointB: { row: targetRow, col: targetCol },
            goingToB: true
        };
        this.moveArmy(armyId, targetRow, targetCol);
        window.showToast?.(`${army.name} now patrolling.`, { type: 'success' });
    }

    /** Stop patrol for an army */
    cancelPatrol(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;
        army.patrol = null;
        window.showToast?.(`${army.name} patrol canceled.`, { type: 'info' });
        this.refreshUI();
    }

    /** Silently resupply army from village food (used at capital) */
    _performAutoResupply(army) {
        if (!army.supplies) army.supplies = { food: 0 };
        const max = this.getArmyMaxSupply(army);
        const needed = max - army.supplies.food;
        if (needed <= 0) return;
        const available = this.gameState.resources?.food ?? 0;
        const transfer = Math.min(needed, Math.floor(available * 0.3), available);
        if (transfer > 0) {
            army.supplies.food += transfer;
            this.gameState.resources.food -= transfer;
            window.eventBus?.emit('resources-updated');
        }
        // Recover morale while at capital
        if ((army.morale || 100) < 100) {
            army.morale = Math.min(100, (army.morale || 100) + 5);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DAILY ARMY PROCESSING
    // ═══════════════════════════════════════════════════════════════════

    processArmyMovement() {
        const armies = this.gameState.getAllArmies?.() || [];
        armies.forEach(army => {
            // Garrisoned armies are fed by the city (resupplyGarrisonedArmies)
            if (army.status === 'garrisoned') return;

            // Process travel movement for traveling armies
            if (army.status === 'traveling' && army.travelPlan) {
                const plan = army.travelPlan;
                plan.index++;

                // Tech travel speed bonus: extra steps per day
                const travelBonus = window.gameState?.techBonuses?.travelSpeed || 0;
                let extraSteps = Math.floor(travelBonus);

                // Forced March investment: chance for +1 extra step
                const marchChance = window.monarchManager?.getForcedMarchChance?.() || 0;
                if (marchChance > 0 && Math.random() < marchChance) {
                    extraSteps++;
                }
                for (let s = 0; s < extraSteps && plan.index < plan.path.length - 1; s++) {
                    plan.index++;
                    const midStep = plan.path[plan.index];
                    army.position = { x: midStep.col, y: midStep.row };
                    this.exploreTile(midStep.row, midStep.col);
                }

                if (plan.index >= plan.path.length) {
                    // Arrived at destination
                    const dest = plan.path[plan.path.length - 1];
                    army.position = { x: dest.col, y: dest.row };
                    army.status = 'idle';
                    army.travelPlan = null;

                    // If arrived at capital
                    if (dest.row === this.capitalRow && dest.col === this.capitalCol) {
                        // Auto-resupply return: resupply and resume patrol
                        if (army._autoResupplyReturn) {
                            army._autoResupplyReturn = false;
                            this._performAutoResupply(army);
                            if (army.patrol) {
                                army.patrol.goingToB = true;
                                this.moveArmy(army.id, army.patrol.pointB.row, army.patrol.pointB.col);
                            }
                            window.showToast?.(`${army.name} auto-resupplied at capital.`, { type: 'success' });
                            return;
                        }
                        army.status = 'garrisoned';
                        window.showToast?.(`${army.name} garrisoned at the capital! 🏰`, { type: 'success' });
                        this.refreshUI();
                        return;
                    }

                    // Explore the tile we arrived at
                    this.exploreTile(dest.row, dest.col);

                    // Patrol: if arrived at waypoint, turn around
                    if (army.patrol) {
                        if (army.patrol.goingToB) {
                            army.patrol.goingToB = false;
                            this.moveArmy(army.id, army.patrol.pointA.row, army.patrol.pointA.col);
                        } else {
                            army.patrol.goingToB = true;
                            this.moveArmy(army.id, army.patrol.pointB.row, army.patrol.pointB.col);
                        }
                        return;
                    }

                    window.showToast?.(`${army.name} arrived at ${this.formatCoords(dest.row, dest.col)}`, { type: 'info' });
                } else {
                    // Move one step
                    const step = plan.path[plan.index];
                    army.position = { x: step.col, y: step.row };

                    // Explore tiles as army moves through
                    this.exploreTile(step.row, step.col);
                }
            }

            // Armies on the capital tile get free resupply (never starve at home)
            if (this.isArmyAtCapital(army)) {
                this._performAutoResupply(army);
                return;   // skip starvation check
            }

            // All non-garrisoned armies consume their own supplies daily
            if (army.supplies) {
                const soldierCount = army.units?.length || 1;
                const supplyLinesReduction = window.monarchManager?.getSupplyLinesReduction?.() || 0;
                const dailyConsumption = Math.max(1, Math.floor(soldierCount * (1 - supplyLinesReduction)));
                army.supplies.food -= dailyConsumption;
                if (army.supplies.food <= 0) {
                    army.supplies.food = 0;
                    // Starvation: lose morale
                    army.morale = Math.max(0, (army.morale || 100) - 10);
                    if (army.morale <= 0) {
                        window.showToast?.(`${army.name} disbanded from starvation!`, { type: 'error' });
                        this.performDisband(army.id);
                        return;
                    }
                }
            }

            // Auto-resupply: if enabled and food is running low, head home
            if (army.autoResupply && army.status !== 'traveling' && !army._autoResupplyReturn) {
                const food = army.supplies?.food || 0;
                const soldiers = army.units?.length || 1;
                const daysLeft = food / soldiers;
                const distToCapital = Math.abs(army.position.y - this.capitalRow) + Math.abs(army.position.x - this.capitalCol);
                if (daysLeft <= distToCapital + 1) {
                    army._autoResupplyReturn = true;
                    this.moveArmy(army.id, this.capitalRow, this.capitalCol);
                    window.showToast?.(`${army.name} returning home for resupply.`, { type: 'warning' });
                }
            }
        });
    }

    // ===================================================================
    // ARMY DISBANDING — POPULATION RESTORATION
    // ===================================================================

    deployArmy(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army || army.status !== 'garrisoned') return;

        army.status = 'idle';
        window.showToast?.(`${army.name} deployed and ready for orders.`, { type: 'info' });
        this.refreshUI();
    }

    disbandArmy(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;

        window.modalSystem?.showModal({
            title: `Disband ${army.name}?`,
            content: `
                <p>Soldiers will return to village life.</p>
                <div class="modal-buttons">
                    <button class="btn-primary" onclick="window.worldManager.performDisband('${armyId}')">Confirm</button>
                    <button class="btn-secondary" onclick="window.modalSystem?.closeTopModal()">Cancel</button>
                </div>
            `
        });
    }

    performDisband(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army) return;

        // Restore villagers
        if (this.gameState.populationManager && army.draftedVillagers) {
            army.draftedVillagers.forEach(dv => {
                const villager = this.gameState.populationManager.getInhabitant(dv.id);
                if (!villager) return;

                const restoredStatus = dv.originalStatus || 'idle';
                this.gameState.populationManager.updateStatus(villager.id, restoredStatus);

                if (dv.originalRole) {
                    this.gameState.populationManager.assignRole?.(villager.id, dv.originalRole);
                }
                villager.location = 'village';
            });

            // Re-optimize jobs
            this.gameState.populationManager.optimizeJobAssignments?.();
        }

        // Remove army from gameState
        const idx = this.gameState.armies.findIndex(a => a.id === armyId);
        if (idx !== -1) this.gameState.armies.splice(idx, 1);

        // Recount population
        this.gameState.population = this.gameState.populationManager
            ? this.gameState.populationManager.getAll().filter(v => v.status !== 'drafted').length
            : this.gameState.population;

        window.modalSystem?.closeTopModal();
        window.showToast?.(`Army has been disbanded.`, { type: 'info' });
        window.eventBus?.emit('army_disbanded', { armyId });

        this.refreshUI();
        this.gameState.save?.();
    }

    // ===================================================================
    // SCOUTING
    // ===================================================================

    scoutTile(row, col) {
        const hex = this.hexMap[row]?.[col];
        if (!hex || hex.visibility !== 'scoutable') return;

        // Require an army on an adjacent explored tile
        const armies = this.gameState.getAllArmies?.() || [];
        const nearbyArmy = armies.find(a => {
            const dist = Math.abs(a.position.y - row) + Math.abs(a.position.x - col);
            return dist <= 1 && a.status === 'idle';
        });

        if (!nearbyArmy) {
            window.showToast?.('Need an army on an adjacent tile to scout.', { type: 'warning' });
            return;
        }

        this.exploreTile(row, col);
        window.showToast?.(`Scouted ${this.formatCoords(row, col)} — ${hex.terrain}!`, { type: 'success' });
        this.refreshUI();
    }

    // ===================================================================
    // EXPEDITION — ESTABLISH CITIES
    // ===================================================================

    /**
     * Establish a city on the tile where an idle army is stationed.
     * Army transitions to status 'city' (garrisoned at city).
     * City gets a governor slot and generates passive gold income.
     */
    establishCity(armyId) {
        const army = this.gameState.getArmy?.(armyId);
        if (!army || army.status !== 'idle') return;

        const row = army.position.y;
        const col = army.position.x;
        if (row === this.capitalRow && col === this.capitalCol) {
            window.showToast?.('Cannot establish a city on the capital.', { type: 'warning' });
            return;
        }

        const hex = this.hexMap[row]?.[col];
        if (!hex || hex.visibility !== 'explored') return;
        if (hex.city) {
            window.showToast?.('A city already exists here.', { type: 'warning' });
            return;
        }

        const coords = this.formatCoords(row, col);
        const cityName = `City ${coords}`;

        // Mark tile as city
        hex.city = {
            name: cityName,
            founded: this.gameState.day || 0,
            governor: null, // can be assigned from Royal Family
            level: 1
        };

        // Army becomes city garrison
        army.status = 'city';

        // Create a city unit entity for the established city
        if (this.unitManager) {
            this.unitManager.createCityUnit({
                row, col,
                name: cityName,
                data: {
                    isCapital: false,
                    level: 1,
                    governor: null,
                    founded: this.gameState.day || 0
                }
            });
        }

        window.showToast?.(`🏛️ ${cityName} established at ${coords}!`, { type: 'success' });
        window.eventBus?.emit?.('city_established', { row, col, name: cityName, armyId });

        this.refreshUI();
        this.gameState.save?.();
    }

    /** Get all established cities */
    getCities() {
        const cities = [];
        for (let r = 0; r < this.mapHeight; r++) {
            for (let c = 0; c < this.mapWidth; c++) {
                if (this.hexMap[r]?.[c]?.city) {
                    cities.push({ row: r, col: c, ...this.hexMap[r][c].city });
                }
            }
        }
        return cities;
    }

    /** Process daily income from cities (1 gold per city per day) */
    processCityIncome() {
        const cities = this.getCities();
        if (cities.length === 0) return;

        let income = 0;
        cities.forEach(city => {
            income += (city.level || 1);
        });

        if (income > 0 && this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + income;
        }
    }

    // ===================================================================
    // ENEMY SYSTEM — SPAWNING & ADVANCING
    // ===================================================================

    processEnemies() {
        const day = this.gameState.day || 0;
        const cfg = window.WORLD_DATA?.enemySpawnConfig;
        if (!cfg || day < cfg.startDay) return;

        // --- Spawn check ---
        const daysSinceStart = day - cfg.startDay;
        const spawnChance = cfg.baseChance + daysSinceStart * cfg.chancePerDay;

        if (Math.random() < spawnChance) {
            this.spawnEnemyGroup(day, cfg);
        }

        // --- Advance existing enemies ---
        this.advanceEnemies();

        // --- Check for combat (army vs enemy on same tile) ---
        this.checkCombatEncounters();
    }

    spawnEnemyGroup(day, cfg) {
        const daysSinceStart = day - cfg.startDay;

        // Pick random edge tile from map border
        const edgeTiles = [];
        for (let r = 0; r < this.mapHeight; r++) {
            for (let c = 0; c < this.mapWidth; c++) {
                if (r === 0 || r === this.mapHeight - 1 || c === 0 || c === this.mapWidth - 1) {
                    edgeTiles.push({ row: r, col: c });
                }
            }
        }
        const spawnTile = edgeTiles[Math.floor(Math.random() * edgeTiles.length)];

        // Determine enemy type by day thresholds
        const types = window.WORLD_DATA?.enemyTypes || {};
        const eligible = Object.entries(types).filter(([, t]) => day >= t.minDay && day <= t.maxDay);
        const [typeKey, typeData] = eligible.length > 0
            ? eligible[Math.floor(Math.random() * eligible.length)]
            : ['bandits', { name: 'Bandits', icon: '⚔️', color: '#e74c3c' }];

        // Scale units and stats
        const groupSize = cfg.groupSizeBase + Math.floor(daysSinceStart / cfg.groupSizeGrowthDays);
        const timeMultiplier = 1 + daysSinceStart * cfg.scalingPerDay;

        const units = [];
        for (let i = 0; i < groupSize; i++) {
            units.push({
                health: Math.round(cfg.unitBaseHealth * timeMultiplier),
                maxHealth: Math.round(cfg.unitBaseHealth * timeMultiplier),
                attack: Math.round(cfg.unitBaseAttack * timeMultiplier)
            });
        }

        const enemy = {
            id: `enemy_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
            type: typeKey,
            name: `${typeData.name} (Day ${day})`,
            position: { row: spawnTile.row, col: spawnTile.col },
            units,
            spawnDay: day,
            status: 'advancing'
        };

        this.enemies.push(enemy);
        console.log(`[WorldManager] Enemy spawned: ${enemy.name} at (${spawnTile.row},${spawnTile.col}) — ${groupSize} units`);
    }

    advanceEnemies() {
        const pathfind = window.findPath || window.pathfinding?.findPath;
        const armies = this.gameState.getAllArmies?.() || [];

        // Build a set of tiles occupied by player armies for blocking checks
        const playerOccupied = new Set();
        armies.forEach(a => {
            playerOccupied.add(`${a.position.y},${a.position.x}`);
        });

        this.enemies.forEach(enemy => {
            if (enemy.status !== 'advancing') return;

            // Check if enemy is ALREADY on the same tile as a player army (combat)
            const currentKey = `${enemy.position.row},${enemy.position.col}`;
            const blockingArmy = armies.find(a =>
                a.position.y === enemy.position.row &&
                a.position.x === enemy.position.col
            );
            if (blockingArmy) {
                // Pull reinforcements from adjacent idle armies before combat
                this._pullReinforcements(blockingArmy);
                // Fight the blocking army instead of moving
                this.resolveCombat(blockingArmy, enemy);
                return; // Don't move this turn — fighting uses the day
            }

            // Calculate next step toward capital
            const from = enemy.position;
            let nextRow = from.row;
            let nextCol = from.col;

            if (pathfind && this.hexMap.length > 0) {
                const path = pathfind(
                    this.hexMap,
                    { row: from.row, col: from.col },
                    { row: this.capitalRow, col: this.capitalCol }
                );
                if (path && path.length >= 2) {
                    nextRow = path[1].row;
                    nextCol = path[1].col;
                }
            } else {
                // Simple step toward capital
                if (from.row < this.capitalRow) nextRow++;
                else if (from.row > this.capitalRow) nextRow--;
                if (from.col < this.capitalCol) nextCol++;
                else if (from.col > this.capitalCol) nextCol--;
            }

            // Check if next tile is blocked by a player army
            const nextKey = `${nextRow},${nextCol}`;
            if (playerOccupied.has(nextKey)) {
                // Blocked — don't move, combat will happen next day when
                // enemy steps onto that tile, or we can initiate it now
                const blocker = armies.find(a =>
                    a.position.y === nextRow && a.position.x === nextCol
                );
                if (blocker) {
                    // Move onto the tile and fight
                    enemy.position = { row: nextRow, col: nextCol };
                    // Pull reinforcements from adjacent idle armies before combat
                    this._pullReinforcements(blocker);
                    this.resolveCombat(blocker, enemy);
                    return;
                }
            }

            enemy.position = { row: nextRow, col: nextCol };

            // If reached village tile, trigger defense
            if (nextRow === this.capitalRow && nextCol === this.capitalCol) {
                enemy.status = 'attacking';
                this.triggerVillageDefense(enemy);
            }
        });

        // Remove defeated enemies
        this.enemies = this.enemies.filter(e => e.status !== 'defeated');
    }

    triggerVillageDefense(enemy) {
        console.log(`[WorldManager] Enemy ${enemy.name} reached the village!`);

        // Build army data for villageDefense
        const attackerArmy = {
            id: enemy.id,
            name: enemy.name,
            units: enemy.units,
            strength: enemy.units.reduce((s, u) => s + u.attack, 0),
            type: enemy.type
        };

        // Emit event for VillageDefenseSystem
        window.eventBus?.emit('enemyAtVillage', { army: attackerArmy });

        // Mark defeated (VillageDefenseSystem handles the outcome)
        enemy.status = 'defeated';

        window.showToast?.(`⚠️ ${enemy.name} is attacking your village!`, { type: 'error' });
    }

    checkCombatEncounters() {
        const armies = this.gameState.getAllArmies?.() || [];

        this.enemies.forEach(enemy => {
            if (enemy.status !== 'advancing') return;

            // Check if any player army is on the same tile
            const armyOnTile = armies.find(a =>
                a.position.y === enemy.position.row &&
                a.position.x === enemy.position.col
            );

            if (armyOnTile) {
                // Reinforcements: merge in adjacent friendly armies
                this._pullReinforcements(armyOnTile);
                this.resolveCombat(armyOnTile, enemy);
            }
        });
    }

    /**
     * Pull reinforcements from adjacent tiles into the primary army before combat.
     * Nearby idle armies within 1 hex are merged automatically.
     */
    _pullReinforcements(primaryArmy) {
        const armies = this.gameState.getAllArmies?.() || [];
        const px = primaryArmy.position.x;
        const py = primaryArmy.position.y;

        armies.forEach(ally => {
            if (ally.id === primaryArmy.id) return;
            if (ally.status !== 'idle') return;
            const dx = Math.abs(ally.position.x - px);
            const dy = Math.abs(ally.position.y - py);
            if (dx <= 1 && dy <= 1 && (dx + dy) > 0) {
                // Merge ally units into primary army
                const reinforceCount = (ally.units || []).length;
                if (reinforceCount === 0) return;

                (ally.units || []).forEach(u => primaryArmy.units.push(u));
                if (ally.draftedVillagers) {
                    if (!primaryArmy.draftedVillagers) primaryArmy.draftedVillagers = [];
                    ally.draftedVillagers.forEach(dv => primaryArmy.draftedVillagers.push(dv));
                }
                // Average cohesion
                const c1 = primaryArmy.cohesion ?? 50;
                const c2 = ally.cohesion ?? 50;
                const n1 = primaryArmy.units.length - reinforceCount;
                primaryArmy.cohesion = Math.round((c1 * n1 + c2 * reinforceCount) / primaryArmy.units.length);

                // Disband the ally army (units now in primary)
                ally.units = [];
                ally.draftedVillagers = [];
                this.performDisband(ally.id);

                window.showToast?.(`🤝 ${reinforceCount} reinforcements from ${ally.name} joined ${primaryArmy.name}!`, { type: 'success' });
            }
        });
    }

    resolveCombat(army, enemy) {
        console.log(`[WorldManager] Combat: ${army.name} vs ${enemy.name}`);

        let armyStrength = (army.units || []).reduce((s, u) => s + (u.attack || 10), 0);
        const enemyStrength = enemy.units.reduce((s, u) => s + u.attack, 0);

        // Apply General bonus (+10% per military skill, cap +100%)
        const generalMult = this.gameState.royalFamily?.getGeneralAttackMultiplier?.(army.id) || 1.0;
        armyStrength *= generalMult;

        // Apply Combat Training investment bonus
        const combatTrainingMult = window.monarchManager?.getCombatTrainingMultiplier?.() || 1.0;
        armyStrength *= combatTrainingMult;

        // Apply legacy combat bonus
        const legacyCombatMult = this.gameState.legacyCombatMultiplier || 1.0;
        armyStrength *= legacyCombatMult;

        // Apply cohesion multiplier (0.5 at 0% cohesion, 1.0 at 100%)
        const cohesion = army.cohesion ?? 50;
        const cohesionMult = 0.5 + (cohesion / 200); // ranges 0.5 to 1.0
        armyStrength *= cohesionMult;

        // General gains military experience from combat
        if (generalMult > 1.0) {
            const gen = this.gameState.royalFamily?.getGeneralForArmy?.(army.id);
            if (gen?.experience) {
                gen.experience.military = (gen.experience.military || 0) + 1;
            }
        }

        // Determine terrain for this battle
        const battleTerrain = this.hexMap[enemy.position.row]?.[enemy.position.col]?.terrain || 'plains';

        // Show BattleViewer if available (animated combat) — skip during autoplay and non-world views
        const autoPlayActive = this.gameState.autoPlayActive || window.gameState?.autoPlayActive;
        const isWorldView = window.game?.currentView === 'world';
        if (!autoPlayActive && isWorldView && window.battleViewer && typeof window.battleViewer.showBattle === 'function') {
            const playerArmy = {
                name: army.name,
                units: (army.units || []).map(u => ({
                    ...u,
                    alive: true,
                    side: 'player'
                }))
            };
            const enemyArmy = {
                name: enemy.name,
                units: enemy.units.map(u => ({
                    ...u,
                    alive: true,
                    side: 'enemy'
                }))
            };
            window.battleViewer.showBattle(playerArmy, enemyArmy, battleTerrain, (result) => {
                // After animation completes, apply the actual combat result
                this._applyCombatResult(army, enemy, armyStrength, enemyStrength, result);
            });
            return; // Combat result applied in callback
        }

        // Fallback: instant resolve without viewer
        this._applyCombatResult(army, enemy, armyStrength, enemyStrength, null);
    }

    /** Internal: apply combat outcome after viewer animation or instant */
    _applyCombatResult(army, enemy, armyStrength, enemyStrength, viewerResult) {
        // Handle retreat — the battle viewer already killed rearguard units
        if (viewerResult && viewerResult.retreat) {
            // Sync unit alive state from viewer back to army
            this._syncBattleCasualties(army, viewerResult);
            // Move army back toward capital (1 tile)
            this._retreatArmy(army);
            // Enemy stays alive but loses no additional units
            window.showToast?.(`🏳️ ${army.name} retreated! ${viewerResult.playerLosses} soldiers lost covering retreat.`, { type: 'warning' });

            window.eventBus?.emit('combat_resolved', { army: army.id, enemy: enemy.id, retreat: true });
            if (army.cohesion !== undefined) army.cohesion = Math.max(0, army.cohesion - 20);
            this.refreshUI();
            return;
        }

        // Viewer-resolved victory or defeat — use the viewer's actual casualties
        if (viewerResult && !viewerResult.retreat) {
            this._syncBattleCasualties(army, viewerResult);

            if (viewerResult.victory) {
                // Player wins via viewer
                enemy.status = 'defeated';
                const goldReward = 2 + Math.floor(Math.random() * 8) * (enemy.units?.length || 1);
                if (this.gameState.resources) {
                    this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
                }
                window.showToast?.(`⚔️ ${army.name} defeated ${enemy.name}! +${goldReward} gold. Lost ${viewerResult.playerLosses || 0} soldiers.`, { type: 'success' });
            } else {
                // Player loses via viewer
                const enemyCasualties = Math.floor((enemy.units?.length || 0) * 0.2);
                if (enemy.units) enemy.units.splice(0, enemyCasualties);
                window.showToast?.(`💀 ${army.name} was defeated by ${enemy.name}! Lost ${viewerResult.playerLosses || 0} soldiers.`, { type: 'error' });
            }

            if (army.units.length === 0) {
                this.performDisband(army.id);
            }

            window.eventBus?.emit('combat_resolved', { army: army.id, enemy: enemy.id, victory: viewerResult.victory });
            if (army.cohesion !== undefined) army.cohesion = Math.max(0, army.cohesion - 20);
            this.refreshUI();
            return;
        }

        // Multi-day battle: if combined unit count > 10 and no viewer result,
        // defer to daily processing instead of instant resolution
        const totalUnits = (army.units?.length || 0) + (enemy.units?.length || 0);
        if (totalUnits > 10 && !viewerResult) {
            army.status = 'fighting';
            this.activeBattles.push({
                armyId: army.id,
                enemyId: enemy.id,
                day: 0,
                originalEnemyCount: enemy.units.length
            });
            window.showToast?.(`⚔️ ${army.name} engaged ${enemy.name} in a prolonged battle!`, { type: 'warning' });
            if (army.cohesion !== undefined) army.cohesion = Math.max(0, army.cohesion - 10);
            this.refreshUI();
            return;
        }

        // Simple auto-resolve: compare total strength with some randomness
        // Unit defense contributes to damage reduction
        const avgPlayerDefense = army.units.length > 0
            ? army.units.reduce((s, u) => s + (u.defense || 5), 0) / army.units.length
            : 5;
        const avgEnemyDefense = enemy.units.length > 0
            ? enemy.units.reduce((s, u) => s + (u.defense || 5), 0) / enemy.units.length
            : 5;

        const armyRoll = armyStrength * (0.8 + Math.random() * 0.4);
        const enemyRoll = enemyStrength * (0.8 + Math.random() * 0.4);

        if (armyRoll >= enemyRoll) {
            // Player wins — unit defense and veteran training reduce casualties
            const vetReduction = window.monarchManager?.getVeteranTrainingReduction?.() || 0;
            const defenseReduction = Math.min(0.15, avgPlayerDefense / 200);
            const baseCasualtyRate = 0.3;
            const effectiveRate = Math.max(0.05, baseCasualtyRate - vetReduction - defenseReduction);
            const casualties = Math.floor(Math.random() * Math.ceil(army.units.length * effectiveRate));
            for (let i = 0; i < casualties && army.units.length > 0; i++) {
                const deadIdx = Math.floor(Math.random() * army.units.length);
                const dead = army.units.splice(deadIdx, 1)[0];
                // Remove from drafted villagers too
                if (army.draftedVillagers) {
                    const dvIdx = army.draftedVillagers.findIndex(dv => dv.id === dead.villagerId);
                    if (dvIdx !== -1) army.draftedVillagers.splice(dvIdx, 1);
                }
                // Kill the villager in population
                if (dead.villagerId && this.gameState.populationManager) {
                    this.gameState.populationManager.removeInhabitant?.(dead.villagerId);
                }
            }

            enemy.status = 'defeated';
            const goldReward = 2 + Math.floor(Math.random() * 8) * enemy.units.length;
            if (this.gameState.resources) {
                this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
            }

            window.showToast?.(`⚔️ ${army.name} defeated ${enemy.name}! +${goldReward} gold. Lost ${casualties} soldiers.`, { type: 'success' });

            // If army wiped out, disband
            if (army.units.length === 0) {
                this.performDisband(army.id);
            }
        } else {
            // Enemy wins — unit defense still reduces casualties somewhat
            const vetReductionLoss = window.monarchManager?.getVeteranTrainingReduction?.() || 0;
            const defenseReduction = Math.min(0.10, avgPlayerDefense / 250);
            const casualties = Math.ceil(army.units.length * Math.max(0.15, 0.5 - vetReductionLoss - defenseReduction));
            for (let i = 0; i < casualties && army.units.length > 0; i++) {
                const deadIdx = Math.floor(Math.random() * army.units.length);
                const dead = army.units.splice(deadIdx, 1)[0];
                if (army.draftedVillagers) {
                    const dvIdx = army.draftedVillagers.findIndex(dv => dv.id === dead.villagerId);
                    if (dvIdx !== -1) army.draftedVillagers.splice(dvIdx, 1);
                }
                if (dead.villagerId && this.gameState.populationManager) {
                    this.gameState.populationManager.removeInhabitant?.(dead.villagerId);
                }
            }

            // Enemy loses some units too
            const enemyCasualties = Math.floor(enemy.units.length * 0.2);
            enemy.units.splice(0, enemyCasualties);

            window.showToast?.(`💀 ${army.name} was defeated by ${enemy.name}! Lost ${casualties} soldiers.`, { type: 'error' });

            if (army.units.length === 0) {
                this.performDisband(army.id);
            }
        }

        window.eventBus?.emit('combat_resolved', { army: army.id, enemy: enemy.id });

        // Combat reduces cohesion
        if (army.cohesion !== undefined) {
            army.cohesion = Math.max(0, army.cohesion - 20);
        }

        this.refreshUI();
    }

    /**
     * Sync battle viewer casualties back to the actual army.
     * Removes dead units from army.units and army.draftedVillagers,
     * and kills them in population.
     */
    _syncBattleCasualties(army, viewerResult) {
        // viewerResult.playerLosses tells us how many died, but we need exact IDs.
        // The battle viewer marks units alive=false. Since we mapped units 1:1,
        // we count from the end to remove the right number of casualties.
        const casualties = viewerResult.playerLosses || 0;
        for (let i = 0; i < casualties && army.units.length > 0; i++) {
            const deadIdx = Math.floor(Math.random() * army.units.length);
            const dead = army.units.splice(deadIdx, 1)[0];
            if (army.draftedVillagers) {
                const dvIdx = army.draftedVillagers.findIndex(dv => dv.id === dead.villagerId);
                if (dvIdx !== -1) army.draftedVillagers.splice(dvIdx, 1);
            }
            if (dead.villagerId && this.gameState.populationManager) {
                this.gameState.populationManager.removeInhabitant?.(dead.villagerId);
            }
        }
        if (army.units.length === 0) {
            this.performDisband(army.id);
        }
    }

    /**
     * Move army one tile toward capital after retreat.
     */
    _retreatArmy(army) {
        if (!army || army.units.length === 0) return;
        const dx = this.capitalCol - army.position.x;
        const dy = this.capitalRow - army.position.y;
        // Move one step toward capital
        if (Math.abs(dx) >= Math.abs(dy)) {
            army.position.x += Math.sign(dx);
        } else {
            army.position.y += Math.sign(dy);
        }
        army.status = 'idle';
    }

    // ===================================================================
    // ENEMY VISIBILITY — fog of war for enemies
    // ===================================================================

    /**
     * Enemies are only visible if a player army is on the same or adjacent tile,
     * OR the enemy has reached the village tile itself.
     */
    isEnemyVisible(enemy) {
        const armies = this.gameState.getAllArmies?.() || [];
        const scoutBonus = this.gameState?.investments?.armyScouts || 0;
        // Always visible if on the village tile
        if (enemy.position.row === this.capitalRow && enemy.position.col === this.capitalCol) {
            return true;
        }
        // Visible if a player army is within sight range (1 + scout bonus)
        return armies.some(a => {
            const dist = Math.abs(a.position.y - enemy.position.row) + Math.abs(a.position.x - enemy.position.col);
            return dist <= 1 + scoutBonus;
        });
    }

    getVisibleEnemiesAt(row, col) {
        return this.enemies.filter(e =>
            e.position.row === row &&
            e.position.col === col &&
            e.status === 'advancing' &&
            this.isEnemyVisible(e)
        );
    }

    getEnemyTypeInfo(enemy) {
        const types = window.WORLD_DATA?.enemyTypes || {};
        return types[enemy.type] || { name: enemy.type, icon: '⚔️', color: '#e74c3c' };
    }

    // ===================================================================
    // DAILY PROCESSING
    // ===================================================================

    onDayEnded() {
        // Note: processEnemies() is called from gameState.processEnemySpawns()
        // during endDay(), BEFORE this event fires. No need to call it again here.

        // Everything below requires full map initialization (hexMap, renderer, etc.)
        if (!this.initialized) return;

        this.processArmyMovement();
        this.resupplyGarrisonedArmies();
        this.updateArmyCohesion();
        this.processActiveBattles();
        this.processCityIncome();

        // Process UnitManager daily (travel, supplies, encounters)
        if (this.unitManager) {
            this.unitManager.processDaily();
        }

        this.refreshUI();
        this.saveWorldData();
    }

    /**
     * Resupply armies that are garrisoned at the capital.
     * Each day, garrisoned armies consume food from village stores
     * and refill their supply pool up to max capacity.
     */
    resupplyGarrisonedArmies() {
        const armies = this.gameState.getAllArmies?.() || [];
        armies.forEach(army => {
            if (army.status !== 'garrisoned') return;
            if (!army.supplies) army.supplies = { food: 0 };

            const unitCount = army.units?.length || 1;
            const maxSupply = this.getArmyMaxSupply(army);  // 2 food per soldier
            const currentFood = army.supplies.food;

            if (currentFood >= maxSupply) return; // Already full

            const needed = maxSupply - currentFood;
            const available = this.gameState.resources?.food ?? 0;
            const transfer = Math.min(needed, Math.floor(available * 0.1), available); // Take up to 10% of village food

            if (transfer > 0) {
                army.supplies.food += transfer;
                this.gameState.resources.food -= transfer;
                window.eventBus?.emit('resources-updated');
            }

            // Also heal wounded units while garrisoned
            (army.units || []).forEach(u => {
                if ((u.health || 100) < (u.maxHealth || 100)) {
                    u.health = Math.min((u.maxHealth || 100), (u.health || 100) + 5);
                }
            });

            // Restore morale while garrisoned
            if ((army.morale || 100) < 100) {
                army.morale = Math.min(100, (army.morale || 100) + 5);
            }

            // Drill instructor training buff: if a drill instructor is assigned,
            // garrisoned army units slowly gain attack/defense
            const hasDrillInstructor = this.hasDrillInstructorAssigned();
            if (hasDrillInstructor) {
                (army.units || []).forEach(u => {
                    // +0.5 attack and +0.25 defense per day with instructor
                    u.attack = Math.min((u.attack || 10) + 0.5, 30);  // cap at 30
                    u.defense = Math.min((u.defense || 5) + 0.25, 20); // cap at 20
                });
            }
        });
    }

    /**
     * Check if a drill instructor is currently assigned to any barracks.
     */
    hasDrillInstructorAssigned() {
        if (!window.jobRegistry) return false;
        const slots = window.jobRegistry._slots?.all?.() || [];
        for (const slot of slots) {
            if (slot.get('jobType') === 'drillInstructor' && slot.get('workerId')) {
                return true;
            }
        }
        return false;
    }

    // ===================================================================
    // ARMY COHESION — daily tick
    // ===================================================================

    /**
     * Update cohesion for all armies each day.
     * Garrisoned/idle: +5/day. Traveling: -2/day.
     * Cohesion affects combat effectiveness (multiplier 0.5–1.0).
     */
    updateArmyCohesion() {
        const armies = this.gameState.getAllArmies?.() || [];
        armies.forEach(army => {
            if (army.cohesion === undefined) army.cohesion = 50;
            if (army.status === 'garrisoned' || army.status === 'idle') {
                army.cohesion = Math.min(100, army.cohesion + 5);
            } else if (army.status === 'traveling') {
                army.cohesion = Math.max(0, army.cohesion - 2);
            }
            // Fighting armies lose cohesion more slowly (handled in combat)
        });
    }

    /**
     * Process multi-day battles. Large engagements (>10 combined units)
     * resolve partially each day instead of instantly.
     */
    processActiveBattles() {
        if (!this.activeBattles || this.activeBattles.length === 0) return;

        const resolved = [];
        this.activeBattles.forEach((battle, idx) => {
            const army = this.gameState.getArmy?.(battle.armyId);
            const enemy = this.enemies.find(e => e.id === battle.enemyId);

            if (!army || !enemy || army.units.length === 0) {
                resolved.push(idx);
                return;
            }
            if (enemy.status === 'defeated') {
                resolved.push(idx);
                if (army.status === 'fighting') army.status = 'idle';
                return;
            }

            // Pull reinforcements from adjacent idle armies each day of battle
            this._pullReinforcements(army);

            // Each day of battle: losses scale with opposing attack vs own defense
            const avgArmyDef = army.units.length > 0
                ? army.units.reduce((s, u) => s + (u.defense || 5), 0) / army.units.length : 5;
            const avgEnemyDef = enemy.units.length > 0
                ? enemy.units.reduce((s, u) => s + (u.defense || 5), 0) / enemy.units.length : 5;
            const armyLossRate = Math.max(0.08, 0.15 - avgArmyDef / 300);
            const enemyLossRate = Math.max(0.08, 0.15 - avgEnemyDef / 300);
            const armyLosses = Math.max(1, Math.ceil(army.units.length * armyLossRate));
            const enemyLosses = Math.max(1, Math.ceil(enemy.units.length * enemyLossRate));

            // Apply army casualties
            for (let i = 0; i < armyLosses && army.units.length > 0; i++) {
                const deadIdx = Math.floor(Math.random() * army.units.length);
                const dead = army.units.splice(deadIdx, 1)[0];
                if (army.draftedVillagers) {
                    const dvIdx = army.draftedVillagers.findIndex(dv => dv.id === dead.villagerId);
                    if (dvIdx !== -1) army.draftedVillagers.splice(dvIdx, 1);
                }
                if (dead.villagerId && this.gameState.populationManager) {
                    this.gameState.populationManager.removeInhabitant?.(dead.villagerId);
                }
            }

            // Apply enemy casualties
            for (let i = 0; i < enemyLosses && enemy.units.length > 0; i++) {
                enemy.units.splice(Math.floor(Math.random() * enemy.units.length), 1);
            }

            battle.day++;

            // Check if battle is over
            if (enemy.units.length === 0) {
                enemy.status = 'defeated';
                const goldReward = 2 + Math.floor(Math.random() * 5) * battle.originalEnemyCount;
                if (this.gameState.resources) {
                    this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
                }
                army.status = 'idle';
                window.showToast?.(`⚔️ ${army.name} won a ${battle.day}-day battle vs ${enemy.name}! +${goldReward} gold.`, { type: 'success' });
                resolved.push(idx);
            } else if (army.units.length === 0) {
                army.status = 'idle';
                window.showToast?.(`💀 ${army.name} was destroyed after ${battle.day} days of battle vs ${enemy.name}!`, { type: 'error' });
                this.performDisband(army.id);
                resolved.push(idx);
            } else {
                // Battle continues — show daily status
                window.showToast?.(`⚔️ Day ${battle.day} of battle: ${army.name} (${army.units.length}) vs ${enemy.name} (${enemy.units.length})`, { type: 'info' });
            }
        });

        // Remove resolved battles (reverse order to preserve indices)
        resolved.sort((a, b) => b - a).forEach(idx => this.activeBattles.splice(idx, 1));
    }

    /**
     * Check if there is a royal family member assigned as general
     * who is not yet assigned to an existing army.
     */
    _hasFreeGeneral() {
        const rf = this.gameState.royalFamily;
        if (!rf) return false;
        const generals = (rf.royalFamily || []).filter(m => m.role === 'general');
        if (generals.length === 0) return false;
        // Check if any general is not yet assigned to an army
        const armies = this.gameState.getAllArmies?.() || [];
        const assignedGeneralIds = new Set();
        armies.forEach(a => {
            const gen = rf.getGeneralForArmy?.(a.id);
            if (gen) assignedGeneralIds.add(gen.id);
        });
        return generals.some(g => !assignedGeneralIds.has(g.id));
    }

    // ===================================================================
    // SAVE / LOAD
    // ===================================================================

    saveWorldData() {
        // World data is now saved through gameState.toSerializable()
        // Trigger a gameState save which calls getWorldSaveData()
        this.gameState.save?.();
    }

    getWorldSaveData() {
        return {
            hexMap: this.hexMap,
            enemies: this.enemies
        };
    }

    loadWorldSaveData(data) {
        if (data && data.hexMap && data.hexMap.length === this.mapHeight) {
            this.hexMap = data.hexMap;
            this.enemies = data.enemies || [];
            console.log('[WorldManager] Restored from gameState save data');
            if (this.initialized) {
                this.refreshUI();
            }
        }
    }

    restoreFromSave() {
        // Try gameState save data first (new system)
        // gameState.load() calls loadWorldSaveData() asynchronously,
        // but on first init the data may already be loaded.
        if (this.hexMap && this.hexMap.length === this.mapHeight && this.hexMap[0]?.length > 0) {
            // Already populated by loadWorldSaveData
            return true;
        }
        // Fallback: try legacy standalone localStorage key
        try {
            const raw = localStorage.getItem('worldMapData');
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.hexMap && data.hexMap.length === this.mapHeight) {
                this.hexMap = data.hexMap;
                this.enemies = data.enemies || [];
                // Migrate: remove standalone key now that gameState handles saves
                localStorage.removeItem('worldMapData');
                console.log('[WorldManager] Migrated from standalone save to gameState');
                return true;
            }
        } catch (e) {
            console.warn('[WorldManager] Legacy restore failed:', e);
        }
        return false;
    }

    // ===================================================================
    // HELPERS
    // ===================================================================

    inBounds(r, c) {
        return r >= 0 && r < this.mapHeight && c >= 0 && c < this.mapWidth;
    }

    getNeighbors(r, c) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        return dirs
            .map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
            .filter(n => this.inBounds(n.row, n.col));
    }

    getPlayerArmiesAt(row, col) {
        return (this.gameState.getAllArmies?.() || []).filter(a =>
            a.position.y === row && a.position.x === col
        );
    }

    /**
     * Check if a tile is in an enemy's zone of control (adjacent to an enemy).
     * Returns the threatening enemy or null.
     */
    getEnemyZoneOfControl(row, col) {
        return this.enemies.find(e => {
            if (e.status !== 'advancing') return false;
            const dist = Math.abs(e.position.row - row) + Math.abs(e.position.col - col);
            return dist <= 1;
        }) || null;
    }

    /**
     * Get effective move cost for a tile, including enemy zone of control penalty.
     * ZoC adds +2 to move cost (slows armies passing near enemies).
     */
    getEffectiveMoveCost(row, col) {
        const hex = this.hexMap[row]?.[col];
        if (!hex) return 999;
        const terrainData = window.WORLD_DATA?.terrainTypes?.[hex.terrain] || {};
        let cost = terrainData.moveCost || 1;
        if (this.getEnemyZoneOfControl(row, col)) {
            cost += 2; // ZoC penalty
        }
        return cost;
    }

    // ===================================================================
    // UI SETUP — 3-COLUMN LAYOUT
    // ===================================================================

    setupWorldUI() {
        const container = document.getElementById('world-view');
        if (!container) return;

        // Preserve battle-modal DOM node (not just HTML) to keep event listeners
        const battleModal = document.getElementById('battle-modal');
        if (battleModal && battleModal.parentNode) {
            battleModal.parentNode.removeChild(battleModal);
        }

        container.innerHTML = `
            <div class="world-layout">
                <div class="world-sidebar world-sidebar-left" id="hex-info">
                    <p class="info-placeholder">Select a tile to view details</p>
                </div>
                <div class="world-map-area">
                    <div id="hex-overlay" class="hex-overlay"></div>
                </div>
                <div class="world-sidebar world-sidebar-right" id="world-actions">
                </div>
            </div>
        `;

        // Re-attach the original battle-modal node (preserves event listeners)
        if (battleModal) {
            container.appendChild(battleModal);
        }

        console.log('[WorldManager] UI built');
    }

    show() {
        this.init();
        // Trigger world tutorial on first visit
        if (window.worldTutorial) {
            window.worldTutorial.checkAndShow();
        }
    }

    refreshUI() {
        if (!this.initialized) return;

        // Mark tiles that have player units for rendering
        // and auto-explore tiles adjacent to player armies
        const armies = this.gameState.getAllArmies?.() || [];
        for (let r = 0; r < this.mapHeight; r++) {
            for (let c = 0; c < this.mapWidth; c++) {
                this.hexMap[r][c].hasPlayerUnit = this.getPlayerArmiesAt(r, c).length > 0;
            }
        }

        // Explore tiles around each player army position (including adjacent + scout bonus)
        const armyScoutBonus = window.gameState?.investments?.armyScouts || 0;
        for (const army of armies) {
            if (army.position) {
                const ar = army.position.y;
                const ac = army.position.x;
                if (this.inBounds(ar, ac)) {
                    // Always reveal around army, even if army tile is already explored
                    this.hexMap[ar][ac].visibility = 'explored';
                    this.revealAround(ar, ac, 1 + armyScoutBonus);
                }
            }
        }

        this.renderer?.fullTileStyleRefresh();
        this.renderer?.updateEntities();
        this.updateInfoPanel();
        this.updateActionPanel();
    }
}

// Expose globally
window.WorldManager = WorldManager;
console.log('[WorldManager] Class loaded');

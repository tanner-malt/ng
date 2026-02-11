/**
 * WorldManager — World Map System (rewrite)
 *
 * Manages the 5×5 world grid: terrain generation, fog-of-war, exploration,
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
        const cfg = window.WORLD_DATA?.mapConfig || { width: 5, height: 5, capitalPosition: { row: 2, col: 2 } };
        this.mapWidth = cfg.width;
        this.mapHeight = cfg.height;
        this.capitalRow = cfg.capitalPosition.row;
        this.capitalCol = cfg.capitalPosition.col;

        // Grid data: hexMap[row][col] = { terrain, visibility, isPlayerVillage }
        this.hexMap = [];

        // Enemy groups advancing toward the village
        this.enemies = [];

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
        const terrainPool = this.buildTerrainPool();

        this.hexMap = [];
        for (let r = 0; r < this.mapHeight; r++) {
            this.hexMap[r] = [];
            for (let c = 0; c < this.mapWidth; c++) {
                const dist = Math.abs(r - this.capitalRow) + Math.abs(c - this.capitalCol);
                const isCapital = (r === this.capitalRow && c === this.capitalCol);

                this.hexMap[r][c] = {
                    terrain: isCapital ? 'village' : this.pickTerrain(dist, terrainPool),
                    visibility: isCapital ? 'explored' : 'hidden',
                    isPlayerVillage: isCapital
                };
            }
        }

        // Reveal tiles adjacent to capital
        const radius = window.WORLD_DATA?.mapConfig?.initialExplorationRadius || 1;
        this.revealAround(this.capitalRow, this.capitalCol, radius);

        console.log('[WorldManager] Map generated');
    }

    buildTerrainPool() {
        // Zone-weighted pools based on distance from capital
        return {
            inner: ['grass', 'plains', 'grass', 'plains', 'forest', 'hill'],
            outer: ['forest', 'hill', 'mountain', 'swamp', 'desert', 'ruins', 'forest', 'hill']
        };
    }

    pickTerrain(dist, pool) {
        // dist 1 = inner, dist 2+ = mix, dist 3+ = mostly outer
        let choices;
        if (dist <= 1) {
            choices = pool.inner;
        } else if (dist <= 2) {
            choices = [...pool.inner, ...pool.outer];
        } else {
            choices = pool.outer;
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
    // SELECTION & INFO PANEL
    // ===================================================================

    selectHex(row, col) {
        // If in move mode, treat this click as the destination for the selected army
        if (this.moveMode && this.selectedArmyId) {
            const hex = this.hexMap[row]?.[col];
            if (hex && hex.visibility !== 'hidden') {
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
            const statusIcon = selectedArmy.status === 'traveling' ? '🚶' : selectedArmy.status === 'fighting' ? '⚔️' : selectedArmy.status === 'garrisoned' ? '🏰' : '🏕️';
            const statusLabel = selectedArmy.status === 'traveling' ? 'Traveling' : selectedArmy.status === 'fighting' ? 'In Combat' : selectedArmy.status === 'garrisoned' ? 'Garrisoned' : 'Idle';

            html += `<div class="selected-army-panel">`;
            html += `<h4>${statusIcon} ${selectedArmy.name}</h4>`;
            html += `<p style="opacity:0.8;font-size:0.85em;margin:4px 0;">${selectedArmy.units?.length || 0} soldiers — ${statusLabel}</p>`;
            
            // Army stats summary
            const totalAttack = (selectedArmy.units || []).reduce((s, u) => s + (u.attack || 10), 0);
            const totalDefense = (selectedArmy.units || []).reduce((s, u) => s + (u.defense || 5), 0);
            const avgHealth = (selectedArmy.units || []).length > 0 ? Math.round((selectedArmy.units || []).reduce((s, u) => s + (u.health || 100), 0) / selectedArmy.units.length) : 0;
            html += `<div style="display:flex;gap:8px;margin:6px 0;font-size:0.8em;opacity:0.85;">`;
            html += `<span>⚔️ ${totalAttack}</span>`;
            html += `<span>🛡️ ${totalDefense}</span>`;
            html += `<span>❤️ ${avgHealth}%</span>`;
            html += `</div>`;

            if (selectedArmy.supplies) {
                html += `<p style="opacity:0.7;font-size:0.8em;margin:2px 0;">🍖 Supplies: ${selectedArmy.supplies.food || 0}</p>`;
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
                html += `<button class="world-btn" onclick="window.worldManager.deployArmy('${selectedArmy.id}')">🚶 Deploy</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.disbandArmy('${selectedArmy.id}')" style="opacity:0.8;">❌ Disband</button>`;
            } else if (selectedArmy.status === 'idle') {
                html += `<button class="world-btn" onclick="window.worldManager.enterMoveMode()">🚶 Move</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.returnArmy('${selectedArmy.id}')">🏠 Return Home</button>`;
                html += `<button class="world-btn" onclick="window.worldManager.disbandArmy('${selectedArmy.id}')" style="opacity:0.8;">❌ Disband</button>`;
            } else if (selectedArmy.status === 'traveling') {
                html += `<p style="opacity:0.7;font-size:0.8em;text-align:center;">Army is on the move...</p>`;
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
                html += `<hr><h4>Active Armies</h4>`;
                armies.forEach(a => {
                    const statusIcon = a.status === 'traveling' ? '🚶' : a.status === 'fighting' ? '⚔️' : '🏕️';
                    html += `<div class="army-list-item" style="cursor:pointer;" onclick="window.worldManager.selectArmy('${a.id}')">
                        <span>${statusIcon} ${a.name} (${a.units.length})</span>
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

        let html = `<h2>⚔️ Draft Army</h2>`;
        html += `<p>Select villagers to draft (${available.length} available):</p>`;
        html += `<div class="draft-list" style="max-height:300px;overflow-y:auto;">`;

        available.slice(0, 12).forEach((v, i) => {
            const checked = i < 3 ? 'checked' : '';
            html += `<label class="draft-option">
                <input type="checkbox" value="${v.id}" ${checked}>
                ${v.name || 'Villager'} (age ${v.age}, ${v.role || 'idle'})
            </label><br>`;
        });
        html += `</div>`;
        html += `<div style="margin-top:12px;">
            <label>Army name: <input type="text" id="draft-army-name" value="Army ${(this.gameState.armies?.length || 0) + 1}" /></label>
        </div>`;
        html += `<div class="modal-buttons" style="margin-top:12px;">
            <button class="btn-primary" onclick="window.worldManager.confirmDraft()">Confirm Draft</button>
            <button class="btn-secondary" onclick="window.modalSystem?.closeTopModal()">Cancel</button>
        </div>`;

        window.modalSystem?.showModal({ title: '⚔️ Draft Army', content: html });
    }

    confirmDraft() {
        const checkboxes = document.querySelectorAll('.draft-list input[type=checkbox]:checked');
        const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const armyName = document.getElementById('draft-army-name')?.value || 'Army';

        if (ids.length < 1) {
            window.showToast?.('Select at least 1 villager.', { type: 'warning' });
            return;
        }

        const units = [];
        ids.forEach(id => {
            const villager = this.gameState.populationManager.getInhabitant(id);
            if (!villager || villager.status === 'drafted') return;

            const originalRole = villager.role;
            const originalStatus = villager.status;

            // Mark drafted in population
            this.gameState.populationManager.updateStatus(villager.id, 'drafted');

            units.push({
                id: `unit_${villager.id}`,
                villagerId: villager.id,
                name: villager.name || 'Soldier',
                originalRole,
                originalStatus,
                health: 80 + Math.floor(Math.random() * 20),
                maxHealth: 100,
                attack: 10 + Math.floor(villager.age / 10),
                defense: 5 + Math.floor(villager.age / 15)
            });
        });

        if (units.length === 0) return;

        // Create army in gameState (canonical source)
        const army = this.gameState.createArmy(armyName, units, {
            x: this.capitalCol,
            y: this.capitalRow
        });

        // Store drafted villager data on the army for restoration on disband
        army.draftedVillagers = units.map(u => ({
            id: u.villagerId,
            name: u.name,
            originalRole: u.originalRole,
            originalStatus: u.originalStatus
        }));
        army.supplies = { food: Math.min(units.length * 5, this.gameState.resources?.food || 0) };

        // Deduct food for supplies
        if (this.gameState.resources) {
            this.gameState.resources.food = Math.max(0, this.gameState.resources.food - army.supplies.food);
        }

        // Update population count (exclude drafted)
        this.gameState.population = this.gameState.populationManager.getAll()
            .filter(v => v.status !== 'drafted').length;

        window.modalSystem?.closeTopModal();
        window.showToast?.(`${armyName} formed with ${units.length} soldiers!`, { type: 'success' });
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

    processArmyMovement() {
        const armies = this.gameState.getAllArmies?.() || [];
        armies.forEach(army => {
            if (army.status !== 'traveling' || !army.travelPlan) return;

            const plan = army.travelPlan;
            plan.index++;

            // Tech travel speed bonus: extra steps per day
            const travelBonus = window.gameState?.techBonuses?.travelSpeed || 0;
            const extraSteps = Math.floor(travelBonus);
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

                // If arrived at capital, garrison the army
                if (dest.row === this.capitalRow && dest.col === this.capitalCol) {
                    army.status = 'garrisoned';
                    window.showToast?.(`${army.name} garrisoned at the capital! 🏰`, { type: 'success' });
                    this.refreshUI();
                    return;
                }

                // Explore the tile we arrived at
                this.exploreTile(dest.row, dest.col);

                window.showToast?.(`${army.name} arrived at ${this.formatCoords(dest.row, dest.col)}`, { type: 'info' });
            } else {
                // Move one step
                const step = plan.path[plan.index];
                army.position = { x: step.col, y: step.row };

                // Explore tiles as army moves through
                this.exploreTile(step.row, step.col);
            }

            // Consume supplies
            if (army.supplies) {
                army.supplies.food -= (army.units?.length || 1);
                if (army.supplies.food <= 0) {
                    army.supplies.food = 0;
                    // Starvation: lose morale
                    army.morale = Math.max(0, (army.morale || 100) - 10);
                    if (army.morale <= 0) {
                        window.showToast?.(`${army.name} disbanded from starvation!`, { type: 'error' });
                        this.performDisband(army.id);
                    }
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

        // Pick random edge tile (16 edge tiles on 5×5)
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
                // Fight the blocking army instead of moving
                this.resolveCombat(blockingArmy, enemy);
                return; // Don't move this turn — fighting uses the day
            }

            // Calculate next step toward capital
            const from = enemy.position;
            let nextRow = from.row;
            let nextCol = from.col;

            if (pathfind) {
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
                this.resolveCombat(armyOnTile, enemy);
            }
        });
    }

    resolveCombat(army, enemy) {
        console.log(`[WorldManager] Combat: ${army.name} vs ${enemy.name}`);

        const armyStrength = (army.units || []).reduce((s, u) => s + (u.attack || 10), 0);
        const enemyStrength = enemy.units.reduce((s, u) => s + u.attack, 0);

        // Simple auto-resolve: compare total strength with some randomness
        const armyRoll = armyStrength * (0.8 + Math.random() * 0.4);
        const enemyRoll = enemyStrength * (0.8 + Math.random() * 0.4);

        if (armyRoll >= enemyRoll) {
            // Player wins
            const casualties = Math.floor(Math.random() * Math.ceil(army.units.length * 0.3));
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
            const goldReward = 5 + Math.floor(Math.random() * 15) * enemy.units.length;
            if (this.gameState.resources) {
                this.gameState.resources.gold = (this.gameState.resources.gold || 0) + goldReward;
            }

            window.showToast?.(`⚔️ ${army.name} defeated ${enemy.name}! +${goldReward} gold. Lost ${casualties} soldiers.`, { type: 'success' });

            // If army wiped out, disband
            if (army.units.length === 0) {
                this.performDisband(army.id);
            }
        } else {
            // Enemy wins — army takes heavy casualties
            const casualties = Math.ceil(army.units.length * 0.5);
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
        this.refreshUI();
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
        // Always visible if on the village tile
        if (enemy.position.row === this.capitalRow && enemy.position.col === this.capitalCol) {
            return true;
        }
        // Visible if a player army is on the same or adjacent tile
        return armies.some(a => {
            const dist = Math.abs(a.position.y - enemy.position.row) + Math.abs(a.position.x - enemy.position.col);
            return dist <= 1;
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
        if (!this.initialized) return;

        this.processArmyMovement();
        this.processEnemies();
        this.refreshUI();
        this.saveWorldData();
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

        // Explore tiles around each player army position (including adjacent)
        for (const army of armies) {
            if (army.position) {
                const ar = army.position.y;
                const ac = army.position.x;
                if (this.inBounds(ar, ac)) {
                    // Always reveal around army, even if army tile is already explored
                    this.hexMap[ar][ac].visibility = 'explored';
                    this.revealAround(ar, ac, 1);
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

// World map management with hexagonal grid system
class WorldManager {
    // Utility to brighten a hex color (hex string or named)
    _brightenColor(color, amount) {
        amount = amount === undefined ? 0.2 : amount;
        let c = color;
        if (c[0] === '#') {
            // Convert hex to RGB
            let num = parseInt(c.slice(1), 16);
            let r = (num >> 16) & 0xff;
            let g = (num >> 8) & 0xff;
            let b = num & 0xff;
            r = Math.min(255, Math.floor(r + (255 - r) * amount));
            g = Math.min(255, Math.floor(g + (255 - g) * amount));
            b = Math.min(255, Math.floor(b + (255 - b) * amount));
            return `rgb(${r},${g},${b})`;
        }
        // fallback: just return color
        return color;
    }
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;
        this.worldGrid = null;
        this.hexSize = 30; // Slightly smaller hexes for a much bigger map
        this.mapWidth = 21; // Even more hexes horizontally
        this.mapHeight = 15; // Even more hexes vertically
        this.selectedHex = null;
        this.playerVillageHex = null;
        
        // Hex map data structure
        this.hexMap = [];
        this.initializeHexMap();
        
        // Parties and expedition management
        this.parties = {
            expeditions: [],
            quests: [],
            battles: []
        };
        
        // Tutorial tutorial state
        this.tutorialMode = true;
    }
    
    init() {
        try {
            this.worldGrid = document.getElementById('world-view');
            if (!this.worldGrid) {
                console.error('[World] world-view element not found');
                return;
            }
            
            console.log('[World] Initializing hexagonal world map...');
            this.setupWorldUI();
            this.generateTerrain();
            this.placeTutorialElements();
            // Reveal all hexes
            for (let row = 0; row < this.mapHeight; row++) {
                for (let col = 0; col < this.mapWidth; col++) {
                    this.hexMap[row][col].discovered = true;
                }
            }
            this.renderHexMap();
            this.setupHexInteraction();
            
            console.log('[World] World map initialization complete');
        } catch (err) {
            console.error('[World] Error during world initialization:', err);
        }
    }
    
    initializeHexMap() {
        // Create empty hex map
        for (let row = 0; row < this.mapHeight; row++) {
            this.hexMap[row] = [];
            for (let col = 0; col < this.mapWidth; col++) {
                this.hexMap[row][col] = {
                    row,
                    col,
                    terrain: 'grass',
                    discovered: false,
                    units: [],
                    resources: null,
                    buildings: [],
                    weather: 'clear',
                    elevation: 0
                };
            }
        }
    }
    
    setupWorldUI() {
        // Create world map container structure
        const dynastyName = (typeof this.gameState.getDynastyName === 'function')
            ? this.gameState.getDynastyName()
            : (this.game?.tutorialManager?.getDynastyName?.() || 'Noble');
        this.worldGrid.innerHTML = `
            <div class="world-container">
                <div class="world-header">
                    <h2>🌍 World Map</h2>
                    <div class="world-info">
                        <span>Dynasty: <span id="world-dynasty">House ${dynastyName}</span></span>
                        <span>Day: <span id="world-day">${this.gameState.currentDay}</span></span>
                        <span>Season: <span id="world-season">${this.gameState.season}</span></span>
                    </div>
                </div>
                <div class="world-main" style="display: flex; flex-direction: row; gap: 1.5rem;">
                    <div class="hex-info-panel" id="hex-info-panel" style="min-width:220px;max-width:320px;">
                        <h4>📍 Select a Hex</h4>
                        <p>Click on any hex to view its details and available actions.</p>
                    </div>
                    <div class="world-map-container" style="flex:1;min-width:0;max-width:100vw;background:#22303a;border-radius:16px;border:2px solid #2de0c6;box-shadow:0 2px 16px #0002;position:relative;display:flex;align-items:center;justify-content:center;">
                        <canvas id="hex-canvas" width="1200" height="900" style="display:block;margin:0 auto;border-radius:12px;"></canvas>
                        <div class="hex-overlay" id="hex-overlay" style="pointer-events:none;position:absolute;top:0;left:0;width:1200px;height:900px;"></div>
                    </div>
                    <div class="world-sidebar">
                        <div class="parties-management">
                            <h3>📋 Parties Management</h3>
                            <div class="party-tabs">
                                <button class="party-tab active" data-tab="expeditions">⚔️ Expeditions</button>
                                <button class="party-tab" data-tab="quests">📜 Quests (Locked)</button>
                                <button class="party-tab" data-tab="battles">⚔️ Battles</button>
                            </div>
                            <div class="party-content">
                                <div id="expeditions-tab" class="party-panel active">
                                    <div class="expedition-list" id="expedition-list">
                                        <p style="color: #bdc3c7; font-style: italic;">No expeditions active. Draft an army to begin exploring.</p>
                                    </div>
                                </div>
                                <div id="quests-tab" class="party-panel">
                                    <p style="color: #7f8c8d; font-style: italic;">Quest system will be unlocked as your dynasty grows in power and influence.</p>
                                </div>
                                <div id="battles-tab" class="party-panel">
                                    <p style="color: #bdc3c7; font-style: italic;">No active battles. Engage hostile forces to begin combat.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup party tab switching
        this.setupPartyTabs();
    }
    
    setupPartyTabs() {
        const tabs = document.querySelectorAll('.party-tab');
        const panels = document.querySelectorAll('.party-panel');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs and panels
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));
                
                // Add active to clicked tab and corresponding panel
                tab.classList.add('active');
                const targetPanel = document.getElementById(`${tab.dataset.tab}-tab`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
                
                // Disable quests tab for now
                if (tab.dataset.tab === 'quests') {
                    window.showToast('🔒 Quest system not yet implemented', {
                        icon: '📜',
                        type: 'info',
                        timeout: 2000
                    });
                }
            });
        });
    }
    
    generateTerrain() {
        // Generate varied terrain for the hexagonal map
        const terrainTypes = [
            { type: 'grass', weight: 40, symbol: '🌱', color: '#4a7c59' },
            { type: 'forest', weight: 25, symbol: '🌲', color: '#2d5a27' },
            { type: 'hills', weight: 20, symbol: '⛰️', color: '#8b7355' },
            { type: 'water', weight: 10, symbol: '💧', color: '#4a90e2' },
            { type: 'fertile', weight: 5, symbol: '🌾', color: '#6b8e23' }
        ];
        
        for (let row = 0; row < this.mapHeight; row++) {
            for (let col = 0; col < this.mapWidth; col++) {
                const hex = this.hexMap[row][col];
                
                // Use weighted random selection for terrain
                const totalWeight = terrainTypes.reduce((sum, t) => sum + t.weight, 0);
                let random = Math.random() * totalWeight;
                
                for (const terrain of terrainTypes) {
                    random -= terrain.weight;
                    if (random <= 0) {
                        hex.terrain = terrain.type;
                        hex.symbol = terrain.symbol;
                        hex.color = terrain.color;
                        break;
                    }
                }
                
                // Add elevation variation
                hex.elevation = Math.floor(Math.random() * 3);
                
                // Add weather effects
                const weatherTypes = ['clear', 'cloudy', 'rain', 'fog'];
                hex.weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
            }
        }
    }
    
    placeTutorialElements() {
        // Place player village at center
        const centerRow = Math.floor(this.mapHeight / 2);
        const centerCol = Math.floor(this.mapWidth / 2);
        
        const villageHex = this.hexMap[centerRow][centerCol];
        villageHex.terrain = 'village';
        villageHex.symbol = '🏰';
        villageHex.color = '#f39c12';
        villageHex.buildings = ['Town Center', 'Houses', 'Farms'];
        villageHex.discovered = true;
        villageHex.isPlayerVillage = true;
        this.playerVillageHex = { row: centerRow, col: centerCol };
        
        // Place Belon War Party 2 tiles away
        const belonRow = centerRow - 2;
        const belonCol = centerCol + 1;
        
        if (belonRow >= 0 && belonCol < this.mapWidth) {
            const belonHex = this.hexMap[belonRow][belonCol];
            belonHex.units = [{
                type: 'enemy',
                name: 'Belon War Party',
                strength: 15,
                description: 'A hostile raiding party threatening nearby settlements'
            }];
            belonHex.symbol = '💀';
            belonHex.color = '#e74c3c';
            belonHex.discovered = true; // Make visible for tutorial
        }
        
        console.log('[World] Tutorial elements placed - Village at', centerRow, centerCol, 'Belon at', belonRow, belonCol);
    }
    
    renderHexMap() {
        const canvas = document.getElementById('hex-canvas');
        const overlay = document.getElementById('hex-overlay');
        if (!canvas || !overlay) {
            console.error('[World] Canvas or overlay not found');
            return;
        }
        const ctx = canvas.getContext('2d');
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Clear overlay
        overlay.innerHTML = '';
        // Calculate hex layout
        const hexWidth = Math.sqrt(3) * this.hexSize;
        const hexHeight = this.hexSize * 2;
        const horizSpacing = hexWidth;
        const vertSpacing = hexHeight * 0.75;
        // For overlay alignment, get canvas position relative to parent
        const canvasRect = canvas.getBoundingClientRect();
        const parentRect = canvas.parentElement.getBoundingClientRect();
        const offsetX = canvasRect.left - parentRect.left;
        const offsetY = canvasRect.top - parentRect.top;
        for (let row = 0; row < this.mapHeight; row++) {
            for (let col = 0; col < this.mapWidth; col++) {
                const hex = this.hexMap[row][col];
                // Flat-topped: x depends on col, y depends on row, with offset for odd columns
                const x = col * horizSpacing + this.hexSize + ((row % 2) * (horizSpacing / 2));
                const y = row * vertSpacing + this.hexSize;
                if (hex.discovered || this.isAdjacentToDiscovered(row, col)) {
                    this.drawHex(ctx, x, y, hex, row, col);
                    this.createHexOverlay(overlay, x + offsetX, y + offsetY, row, col, hex);
                }
            }
        }
    }
    
    drawHex(ctx, x, y, hex, row, col) {
        // Highlight selected hex by making it bigger and brighter
        let highlight = false;
        let drawSize = this.hexSize;
        if (this.selectedHex && this.selectedHex.row === row && this.selectedHex.col === col) {
            highlight = true;
            drawSize = this.hexSize * 1.18; // Slightly bigger
        }
        // Draw hexagon shape
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 6 + (Math.PI / 3) * i;
            const hexX = x + drawSize * Math.cos(angle);
            const hexY = y + drawSize * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(hexX, hexY);
            } else {
                ctx.lineTo(hexX, hexY);
            }
        }
        ctx.closePath();
        // Fill with terrain color, brighter if selected
        if (highlight) {
            ctx.fillStyle = this._brightenColor(hex.color || '#888', 0.35);
        } else {
            ctx.fillStyle = hex.discovered ? hex.color : '#555';
        }
        ctx.fill();
        // Add border
        ctx.strokeStyle = hex.isPlayerVillage ? '#f1c40f' : (highlight ? '#fff' : '#333');
        ctx.lineWidth = highlight ? 4 : (hex.isPlayerVillage ? 3 : 1);
        ctx.stroke();
        ctx.restore();
        // Add terrain symbol if discovered
        if (hex.discovered) {
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = highlight ? '#222' : '#000';
            ctx.fillText(hex.symbol, x, y);
        }
        // Add elevation indicator
        if (hex.elevation > 0 && hex.discovered) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText('⬆'.repeat(hex.elevation), x, y + 15);
        }
    }

    // Utility to brighten a hex color (hex string or named)
    _brightenColor(color, amount) {
        amount = amount === undefined ? 0.2 : amount;
        let c = color;
        if (c[0] === '#') {
            // Convert hex to RGB
            let num = parseInt(c.slice(1), 16);
            let r = (num >> 16) & 0xff;
            let g = (num >> 8) & 0xff;
            let b = num & 0xff;
            r = Math.min(255, Math.floor(r + (255 - r) * amount));
            g = Math.min(255, Math.floor(g + (255 - g) * amount));
            b = Math.min(255, Math.floor(b + (255 - b) * amount));
            return `rgb(${r},${g},${b})`;
        }
        // fallback: just return color
        return color;
    }
    
    createHexOverlay(overlay, x, y, row, col, hex) {
        const hexDiv = document.createElement('div');
        hexDiv.className = 'hex-overlay-item';
        hexDiv.style.position = 'absolute';
        hexDiv.style.left = (x - this.hexSize * 1.18) + 'px';
        hexDiv.style.top = (y - this.hexSize * 1.18) + 'px';
        hexDiv.style.width = (this.hexSize * 2 * 1.18) + 'px';
        hexDiv.style.height = (this.hexSize * 2 * 1.18) + 'px';
        hexDiv.style.cursor = 'pointer';
        // Remove border-radius, use clip-path for hexagon
        hexDiv.style.clipPath = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
        hexDiv.dataset.row = row;
        hexDiv.dataset.col = col;
        // Add hover effect
        hexDiv.addEventListener('mouseenter', () => {
            hexDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
        });
        hexDiv.addEventListener('mouseleave', () => {
            hexDiv.style.backgroundColor = 'transparent';
        });
        overlay.appendChild(hexDiv);
    }
    
    isAdjacentToDiscovered(row, col) {
        // Check if hex is adjacent to any discovered hex
        const neighbors = this.getHexNeighbors(row, col);
        return neighbors.some(neighbor => {
            const [nRow, nCol] = neighbor;
            return this.hexMap[nRow] && this.hexMap[nRow][nCol] && this.hexMap[nRow][nCol].discovered;
        });
    }
    
    getHexNeighbors(row, col) {
        // Get coordinates of neighboring hexes in a hexagonal grid
        const neighbors = [];
        const isEvenRow = row % 2 === 0;
        
        const neighborOffsets = isEvenRow ? [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ] : [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ];
        
        neighborOffsets.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            
            if (newRow >= 0 && newRow < this.mapHeight && newCol >= 0 && newCol < this.mapWidth) {
                neighbors.push([newRow, newCol]);
            }
        });
        
        return neighbors;
    }
    
    setupHexInteraction() {
        const overlay = document.getElementById('hex-overlay');
        if (!overlay) return;
        
        overlay.addEventListener('click', (event) => {
            const hexItem = event.target.closest('.hex-overlay-item');
            if (!hexItem) return;
            
            const row = parseInt(hexItem.dataset.row);
            const col = parseInt(hexItem.dataset.col);
            
            this.selectHex(row, col);
        });
    }
    
    selectHex(row, col) {
        const hex = this.hexMap[row][col];
        if (!hex) return;
        
        this.selectedHex = { row, col };
        this.updateHexInfoPanel(hex, row, col);
        
        // Highlight selected hex
        this.renderHexMap(); // Re-render to update selection
        
        console.log('[World] Selected hex:', row, col, hex);
    }
    
    updateHexInfoPanel(hex, row, col) {
        const panel = document.getElementById('hex-info-panel');
        if (!panel) return;
        
        let content = `
            <h4>📍 Hex (${row}, ${col})</h4>
            <div class="hex-details">
                <p><strong>Terrain:</strong> ${hex.symbol} ${hex.terrain}</p>
                <p><strong>Weather:</strong> ${this.getWeatherIcon(hex.weather)} ${hex.weather}</p>
                <p><strong>Elevation:</strong> ${'⬆'.repeat(hex.elevation) || 'Sea level'}</p>
        `;
        
        if (hex.isPlayerVillage) {
            content += `
                <div class="village-actions">
                    <h5>🏰 Your Village</h5>
                    <button class="action-btn" onclick="worldManager.enterVillage()">
                        🏠 Enter Village
                    </button>
                    <button class="action-btn" onclick="worldManager.draftArmy()">
                        ⚔️ Draft Army
                    </button>
                </div>
            `;
        } else if (hex.units && hex.units.length > 0) {
            content += `
                <div class="hex-units">
                    <h5>👥 Units Present</h5>
            `;
            hex.units.forEach(unit => {
                content += `
                    <div class="unit-info">
                        <p><strong>${unit.name}</strong></p>
                        <p>Strength: ${unit.strength}</p>
                        <p>${unit.description}</p>
                    </div>
                `;
            });
            content += `</div>`;
        }
        
        if (hex.discovered) {
            content += `
                <div class="hex-actions">
                    <button class="action-btn secondary" onclick="worldManager.exploreHex(${row}, ${col})">
                        🔍 Explore Further
                    </button>
                </div>
            `;
        }
        
        content += `</div>`;
        panel.innerHTML = content;
    }
    
    getWeatherIcon(weather) {
        const icons = {
            clear: '☀️',
            cloudy: '☁️',
            rain: '🌧️',
            fog: '🌫️'
        };
        return icons[weather] || '🌤️';
    }
    
    enterVillage() {
        // Switch back to village view
        this.game.switchView('village');
        window.showToast('🏰 Entering your village...', {
            icon: '🏠',
            type: 'info',
            timeout: 2000
        });
    }
    
    draftArmy() {
        // Tutorial army drafting
        this.showArmyDraftingModal();
    }
    
    showArmyDraftingModal() {
        const dynastyName = this.game?.tutorialManager?.getDynastyName?.() || 'Noble';
        
        const draftingContent = `
            <div class="army-drafting">
                <h3>⚔️ Draft Army</h3>
                <p>Select inhabitants to form your first expedition army. You'll need supplies and brave souls willing to venture beyond the village walls.</p>
                
                <div class="inhabitant-selection">
                    <h4>👥 Available Inhabitants (Population: ${this.gameState.population})</h4>
                    
                    <div class="draft-options">
                        <div class="draft-role">
                            <h5>👑 Ruler (Required)</h5>
                            <label>
                                <input type="radio" name="ruler" value="yourself" checked>
                                <span>Yourself (Heir of House ${dynastyName})</span>
                            </label>
                            <p style="font-size: 0.9em; color: #bdc3c7;">As ruler, you command the expedition but cannot manage the village while away.</p>
                        </div>
                        
                        <div class="draft-role">
                            <h5>👥 Companions (Select 2)</h5>
                            <label>
                                <input type="checkbox" name="companion" value="peasant1" checked>
                                <span>Willem the Farmer (Hardy and reliable)</span>
                            </label>
                            <label>
                                <input type="checkbox" name="companion" value="peasant2" checked>
                                <span>Sarah the Woodcutter (Strong and resourceful)</span>
                            </label>
                            <label>
                                <input type="checkbox" name="companion" value="peasant3">
                                <span>Old Marcus the Hunter (Experienced tracker)</span>
                            </label>
                            <p style="font-size: 0.9em; color: #bdc3c7;">Selected inhabitants will leave the village, reducing local workforce.</p>
                        </div>
                    </div>
                </div>
                
                <div class="draft-warning">
                    <p><strong>⚠️ Important:</strong> While you are away on expedition, you cannot give commands to your village. Consider unlocking governors or generals in the future to manage affairs in your absence.</p>
                </div>
            </div>
        `;
        
        window.showModal(
            'Army Drafting',
            draftingContent,
            {
                icon: '⚔️',
                type: 'info',
                showCancel: true,
                confirmText: 'Form 1st Army',
                cancelText: 'Cancel'
            }
        ).then((confirmed) => {
            if (confirmed) {
                this.createFirstArmy();
            }
        });
    }
    
    createFirstArmy() {
        // Create the first army and add to expeditions
        const army = {
            id: '1st-army',
            name: '1st Army',
            members: [
                { name: 'Yourself', role: 'Ruler', type: 'ruler' },
                { name: 'Willem', role: 'Companion', type: 'peasant' },
                { name: 'Sarah', role: 'Companion', type: 'peasant' }
            ],
            morale: 100,
            supplies: {
                food: 0,
                water: 0,
                equipment: 'basic'
            },
            location: this.playerVillageHex,
            status: 'ready'
        };
        
        this.parties.expeditions.push(army);
        this.updateExpeditionsList();
        
        window.showToast('⚔️ 1st Army formed! Manage logistics before departure.', {
            icon: '🎉',
            type: 'success',
            timeout: 4000
        });
        
        // Show tutorial about logistics
        setTimeout(() => {
            this.showLogisticsTutorial();
        }, 2000);
    }
    
    updateExpeditionsList() {
        const list = document.getElementById('expedition-list');
        if (!list) return;
        
        if (this.parties.expeditions.length === 0) {
            list.innerHTML = '<p style="color: #bdc3c7; font-style: italic;">No expeditions active. Draft an army to begin exploring.</p>';
            return;
        }
        
        let content = '';
        this.parties.expeditions.forEach(army => {
            content += `
                <div class="expedition-item">
                    <h4>⚔️ ${army.name}</h4>
                    <p><strong>Members:</strong> ${army.members.length} (${army.members.map(m => m.name).join(', ')})</p>
                    <p><strong>Morale:</strong> ${army.morale}%</p>
                    <p><strong>Status:</strong> ${army.status}</p>
                    
                    <div class="expedition-actions">
                        <button class="action-btn small" onclick="worldManager.manageLogistics('${army.id}')">
                            📦 Manage Logistics
                        </button>
                        <button class="action-btn small secondary" onclick="worldManager.renameArmy('${army.id}')">
                            ✏️ Rename
                        </button>
                        <button class="action-btn small" onclick="worldManager.viewComposition('${army.id}')">
                            👥 View Composition
                        </button>
                        <button class="action-btn small primary" onclick="worldManager.travel('${army.id}')">
                            🚶 Travel
                        </button>
                    </div>
                </div>
            `;
        });
        
        list.innerHTML = content;
    }
    
    manageLogistics(armyId) {
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) return;
        
        const logisticsContent = `
            <div class="logistics-management">
                <h3>📦 Logistics Management - ${army.name}</h3>
                <p>Manage supplies and equipment for your expedition. Proper preparation is crucial for survival in the wilderness.</p>
                
                <div class="supply-grid">
                    <div class="supply-item">
                        <h4>🍞 Food</h4>
                        <p>Current: ${army.supplies.food} days</p>
                        <p style="color: #e74c3c;">⚠️ Insufficient! Armies need food to maintain morale and strength.</p>
                        <button class="action-btn small" onclick="worldManager.addSupply('${armyId}', 'food', 7)">
                            Add 7 Days Food (-21 food)
                        </button>
                    </div>
                    
                    <div class="supply-item">
                        <h4>💧 Water</h4>
                        <p>Current: ${army.supplies.water} days</p>
                        <p style="color: #3498db;">ℹ️ Optional - Can be found along the way</p>
                    </div>
                    
                    <div class="supply-item">
                        <h4>⚔️ Equipment</h4>
                        <p>Current: ${army.supplies.equipment}</p>
                        <p style="color: #f39c12;">Basic equipment suitable for scouting missions</p>
                    </div>
                </div>
                
                <div class="logistics-tutorial">
                    <h4>💡 Tutorial: Expedition Logistics</h4>
                    <ul style="text-align: left; padding-left: 20px;">
                        <li><strong>Food:</strong> Essential for maintaining army morale and preventing starvation</li>
                        <li><strong>Travel Speed:</strong> Base speed is 7 days per hex tile</li>
                        <li><strong>Events:</strong> Random encounters can affect supplies and progress</li>
                        <li><strong>Planning:</strong> Consider round-trip supplies for safe return</li>
                    </ul>
                </div>
            </div>
        `;
        
        window.showModal(
            `Logistics - ${army.name}`,
            logisticsContent,
            {
                icon: '📦',
                type: 'info',
                confirmText: 'Done'
            }
        );
    }
    
    addSupply(armyId, supplyType, amount) {
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) return;
        
        const costs = {
            // Use GameData for supply costs if available
            food: GameData.supplyCosts && GameData.supplyCosts.food ? GameData.supplyCosts.food : { amount: 3, resource: 'food' } // 3 food per day of supplies
        };
        
        const cost = costs[supplyType];
        if (!cost) return;
        
        const totalCost = cost.amount * amount;
        
        if (this.gameState.resources[cost.resource] >= totalCost) {
            this.gameState.resources[cost.resource] -= totalCost;
            army.supplies[supplyType] += amount;
            this.gameState.updateUI();
            
            window.showToast(`📦 Added ${amount} days of ${supplyType} to ${army.name}`, {
                icon: '✅',
                type: 'success',
                timeout: 3000
            });
            
            // Re-open the logistics modal with updated info
            setTimeout(() => this.manageLogistics(armyId), 500);
        } else {
            window.showToast(`❌ Insufficient ${cost.resource}! Need ${totalCost} ${cost.resource}.`, {
                icon: '⚠️',
                type: 'error',
                timeout: 3000
            });
        }
    }
    
    showLogisticsTutorial() {
        const tutorialContent = `
            <div class="tutorial-panel">
                <h3>📚 Tutorial: Expedition Logistics</h3>
                <p>Your army has been formed, but they need supplies before venturing into the wilderness!</p>
                
                <div class="tutorial-steps">
                    <div class="tutorial-step">
                        <h4>🍞 Food is Essential</h4>
                        <p>Armies consume food during travel. Without adequate supplies, morale will drop and your expedition may fail.</p>
                    </div>
                    
                    <div class="tutorial-step">
                        <h4>📦 Click "Manage Logistics"</h4>
                        <p>Use this button to equip your army with the supplies they need for the journey ahead.</p>
                    </div>
                    
                    <div class="tutorial-step">
                        <h4>🚶 Travel When Ready</h4>
                        <p>Once supplied, use the "Travel" button to begin your expedition to the Belon War Party.</p>
                    </div>
                </div>
                
                <p><em>Remember: While you're away, your village operates on its own. Plan accordingly!</em></p>
            </div>
        `;
        
        window.showModal(
            'Expedition Tutorial',
            tutorialContent,
            {
                icon: '📚',
                type: 'info',
                confirmText: 'Understood'
            }
        );
    }
    
    travel(armyId) {
        // Start travel mechanics - this will be enhanced in later phases
        window.showToast('🚶 Travel system coming in next tutorial phase!', {
            icon: '🗺️',
            type: 'info',
            timeout: 3000
        });
    }
    
    renameArmy(armyId) {
        // Army renaming functionality
        window.showToast('✏️ Army renaming coming soon!', {
            icon: '📝',
            type: 'info',
            timeout: 2000
        });
    }
    
    viewComposition(armyId) {
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) return;
        
        let compositionContent = `
            <div class="army-composition">
                <h3>👥 ${army.name} Composition</h3>
                <div class="member-list">
        `;
        
        army.members.forEach(member => {
            compositionContent += `
                <div class="member-item">
                    <h4>${member.name}</h4>
                    <p>Role: ${member.role}</p>
                    <p>Type: ${member.type}</p>
                </div>
            `;
        });
        
        compositionContent += `
                </div>
                <div class="army-stats">
                    <p><strong>Total Members:</strong> ${army.members.length}</p>
                    <p><strong>Morale:</strong> ${army.morale}%</p>
                    <p><strong>Food Supplies:</strong> ${army.supplies.food} days</p>
                </div>
            </div>
        `;
        
        window.showModal(
            `${army.name} Details`,
            compositionContent,
            {
                icon: '👥',
                type: 'info',
                confirmText: 'Close'
            }
        );
    }
    
    exploreHex(row, col) {
        // Basic exploration mechanic
        window.showToast('🔍 Detailed exploration coming soon!', {
            icon: '🗺️',
            type: 'info',
            timeout: 2000
        });
    }
}
// Inject hex-overlay-item CSS for true hexagon clickable area
if (!document.getElementById('hex-overlay-item-style')) {
    const style = document.createElement('style');
    style.id = 'hex-overlay-item-style';
    style.innerHTML = `
    .hex-overlay-item {
        pointer-events: auto !important;
        background: transparent;
        transition: background 0.15s;
        clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    }
    .hex-overlay-item:hover {
        background: rgba(255,255,255,0.18);
    }
    `;
    document.head.appendChild(style);
}

// Make WorldManager globally available
window.WorldManager = WorldManager;

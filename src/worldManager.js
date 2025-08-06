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
        this.hexSize = 25; // Better size for visibility and fit
        
        // Set global reference immediately in constructor
        window.worldManager = this;
        this.mapWidth = 3; // 3 columns for compact grid
        this.mapHeight = 3; // 3 rows for compact grid (but hexagonal offset will reduce visible tiles)
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
        
        // Set global reference for onclick handlers
        if (typeof window !== 'undefined') {
            window.worldManager = this;
            console.log('[World] WorldManager instance set globally');
        }
    }
    
    init() {
        try {
            // Set global reference immediately
            window.worldManager = this;
            console.log('[World] WorldManager instance set globally');
            
            this.worldGrid = document.getElementById('world-view');
            if (!this.worldGrid) {
                console.error('[World] world-view element not found');
                return;
            }
            
            console.log('[World] Initializing hexagonal world map...');
            this.setupWorldUI();
            this.generateTerrain();
            this.placeTutorialElements();
            // Reveal all tiles in the 3x3 grid
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
        // Create simple 3x3 square grid with 9 tiles
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
                    <div class="hex-info-panel" id="hex-info-panel" style="min-width:280px;max-width:280px;width:280px;flex:0 0 280px;background:#2c3e50;border-radius:12px;padding:1rem;border:1px solid #34495e;">
                        <h4>📍 Select a Hex</h4>
                        <p>Click on any hex to view its details and available actions.</p>
                    </div>
                    <div class="world-map-container" style="flex:1;min-width:0;background:#22303a;border-radius:16px;border:2px solid #2de0c6;box-shadow:0 2px 16px #0002;position:relative;display:flex;align-items:center;justify-content:center;height:600px;">
                        <div class="hex-overlay" id="hex-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;border-radius:12px;pointer-events:auto;"></div>
                    </div>
                    <div class="world-sidebar" style="min-width:300px;max-width:300px;width:300px;flex:0 0 300px;">
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
        // Generate uniform forest terrain for testing square grid display
        for (let row = 0; row < this.mapHeight; row++) {
            for (let col = 0; col < this.mapWidth; col++) {
                const hex = this.hexMap[row][col];
                
                // Set all terrain to forest for consistent display
                hex.terrain = 'forest';
                hex.symbol = '🌲';
                hex.color = '#2d5a27';
                
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
        
        console.log('[World] Tutorial elements placed - Village at', centerRow, centerCol);
    }
    
    renderHexMap() {
        const container = document.getElementById('hex-overlay');
        if (!container) {
            console.error('[World] hex-overlay container not found');
            return;
        }
        
        // Clear existing hexes
        container.innerHTML = '';
        
        // Ensure container fills its parent properly
        const mapContainer = container.parentElement;
        if (mapContainer) {
            // Remove any fixed dimensions - let flexbox handle it
            container.style.width = '100%';
            container.style.height = '100%';
            // DEBUG: Add temporary border to see container bounds
            container.style.border = '2px dashed yellow';
            mapContainer.style.border = '2px solid lime';
        }
        
        console.log('[World] Starting hex map render...', {
            containerFound: !!container,
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight
        });
        
        // Wait for next frame to ensure container is sized
        requestAnimationFrame(() => {
            this.createSquareGrid(container);
        });
        
        // Add resize handler for viewport changes
        if (!this.resizeHandler) {
            this.resizeHandler = () => {
                // Debounce resize events
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.renderHexMap();
                }, 250);
            };
            window.addEventListener('resize', this.resizeHandler);
        }
    }
    
    createSquareGrid(container) {
        // Wait for container to be properly sized
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.log('[World] Container not ready, retrying...');
            setTimeout(() => this.createSquareGrid(container), 100);
            return;
        }
        
        // Create simple square grid (3x3)
        const baseTileSize = 60; // Base tile size
        
        // Square tile dimensions
        const tileWidth = baseTileSize;
        const tileHeight = baseTileSize;
        
        // Square grid spacing calculations  
        const horizSpacing = tileWidth + 5; // Horizontal spacing between tile centers
        const vertSpacing = tileHeight + 5; // Vertical spacing between rows
        
        // Calculate required grid dimensions for square grid
        const requiredWidth = (this.mapWidth - 1) * horizSpacing + tileWidth;
        const requiredHeight = (this.mapHeight - 1) * vertSpacing + tileHeight;
        
        // Use actual container dimensions
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculate scale to fit the grid perfectly in container
        const scaleX = (containerWidth - 40) / requiredWidth; // 40px padding
        const scaleY = (containerHeight - 40) / requiredHeight; // 40px padding
        const scale = Math.min(scaleX, scaleY, 1); // Never scale up
        
        // Apply scaling
        const tileSize = baseTileSize * scale;
        const scaledHorizSpacing = horizSpacing * scale;
        const scaledVertSpacing = vertSpacing * scale;
        const gridWidth = requiredWidth * scale;
        const gridHeight = requiredHeight * scale;
        
        // Center the grid
        const startX = (containerWidth - gridWidth) / 2;
        const startY = (containerHeight - gridHeight) / 2;
        
        console.log('[World] Creating square grid:', {
            containerWidth, containerHeight,
            requiredWidth, requiredHeight,
            scale, tileSize,
            gridWidth, gridHeight,
            startX, startY
        });
        
        // Create tiles as DOM elements
        for (let row = 0; row < this.mapHeight; row++) {
            for (let col = 0; col < this.mapWidth; col++) {
                const hex = this.hexMap[row][col];
                
                // Skip undiscovered tiles
                if (!hex.discovered && !this.isAdjacentToDiscovered(row, col)) continue;
                
                // Simple square grid positioning
                const x = startX + col * scaledHorizSpacing;
                const y = startY + row * scaledVertSpacing;
                
                this.createSquareButton(container, x, y, hex, row, col, tileSize);
            }
        }
        
        console.log('[World] Square grid creation complete - buttons added:', container.children.length);
    }
    
    createSquareButton(container, x, y, hex, row, col, size) {
        const squareButton = document.createElement('button');
        squareButton.className = 'tile-button';
        
        // Position the square tile button
        squareButton.style.position = 'absolute';
        squareButton.style.left = x + 'px';
        squareButton.style.top = y + 'px';
        squareButton.style.width = size + 'px';
        squareButton.style.height = size + 'px';
        
        // Create square shape with CSS
        squareButton.style.background = hex.discovered ? hex.color : '#555';
        squareButton.style.borderRadius = '8px'; // Rounded corners
        squareButton.style.border = '2px solid rgba(255,255,255,0.3)';
        squareButton.style.cursor = 'pointer';
        squareButton.style.transition = 'all 0.2s ease';
        squareButton.style.display = 'flex';
        squareButton.style.alignItems = 'center';
        squareButton.style.justifyContent = 'center';
        squareButton.style.fontSize = Math.max(12, size * 0.4) + 'px';
        squareButton.style.outline = 'none';
        squareButton.style.padding = '0';
        squareButton.style.margin = '0';
        squareButton.style.boxSizing = 'border-box';
        squareButton.style.zIndex = '1';
        
        // Add special styling for player village
        if (hex.isPlayerVillage) {
            squareButton.style.border = '3px solid #f1c40f';
            squareButton.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.5)';
        }
        
        // Add terrain symbol
        if (hex.discovered) {
            squareButton.textContent = hex.symbol;
            squareButton.style.color = '#fff';
            squareButton.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            squareButton.style.fontWeight = 'bold';
        }
        
        // Store tile coordinates
        squareButton.dataset.row = row;
        squareButton.dataset.col = col;
        
        // Add selection state
        if (this.selectedHex && this.selectedHex.row === row && this.selectedHex.col === col) {
            squareButton.classList.add('selected');
            squareButton.style.transform = 'scale(1.1)';
            squareButton.style.background = this._brightenColor(hex.color || '#888', 0.4);
            squareButton.style.border = hex.isPlayerVillage 
                ? '3px solid #f1c40f' 
                : '3px solid #fff';
            squareButton.style.boxShadow = '0 0 15px rgba(255,255,255,0.8)';
            squareButton.style.zIndex = '10';
        }
        
        // Add hover effects
        squareButton.addEventListener('mouseenter', () => {
            if (!squareButton.classList.contains('selected')) {
                squareButton.style.transform = 'scale(1.05)';
                squareButton.style.background = this._brightenColor(hex.color || '#888', 0.2);
                squareButton.style.boxShadow = hex.isPlayerVillage 
                    ? '0 0 12px rgba(241, 196, 15, 0.6)'
                    : '0 0 8px rgba(255,255,255,0.3)';
                squareButton.style.zIndex = '5';
            }
        });
        
        squareButton.addEventListener('mouseleave', () => {
            if (!squareButton.classList.contains('selected')) {
                squareButton.style.transform = 'scale(1)';
                squareButton.style.background = hex.discovered ? hex.color : '#555';
                squareButton.style.boxShadow = hex.isPlayerVillage 
                    ? '0 0 10px rgba(241, 196, 15, 0.5)'
                    : 'none';
                squareButton.style.zIndex = '1';
            }
        });
        
        // Add click handler
        squareButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.selectHex(row, col);
        });
        
        // Add focus styles for accessibility
        squareButton.addEventListener('focus', () => {
            if (!squareButton.classList.contains('selected')) {
                squareButton.style.boxShadow = '0 0 8px rgba(52, 152, 219, 0.6)';
            }
        });
        
        squareButton.addEventListener('blur', () => {
            if (!squareButton.classList.contains('selected')) {
                squareButton.style.boxShadow = hex.isPlayerVillage 
                    ? '0 0 10px rgba(241, 196, 15, 0.5)'
                    : 'none';
            }
        });
        
        container.appendChild(squareButton);
    }
    
    
    selectHex(row, col) {
        const hex = this.hexMap[row][col];
        if (!hex) return;
        
        // Clear previous selection
        const previousSelected = document.querySelector('.tile-button.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
            previousSelected.style.transform = 'scale(1)';
            previousSelected.style.zIndex = '1';
            
            // Reset background and border to original state
            const prevRow = parseInt(previousSelected.dataset.row);
            const prevCol = parseInt(previousSelected.dataset.col);
            const prevHex = this.hexMap[prevRow][prevCol];
            previousSelected.style.background = prevHex.discovered ? prevHex.color : '#555';
            previousSelected.style.border = prevHex.isPlayerVillage 
                ? '3px solid #f1c40f'
                : '2px solid rgba(255,255,255,0.3)';
            previousSelected.style.boxShadow = prevHex.isPlayerVillage 
                ? '0 0 10px rgba(241, 196, 15, 0.5)'
                : 'none';
        }
        
        this.selectedHex = { row, col };
        this.updateHexInfoPanel(hex, row, col);
        
        // Highlight the new selection
        const newSelected = document.querySelector(`button[data-row="${row}"][data-col="${col}"]`);
        if (newSelected) {
            newSelected.classList.add('selected');
            newSelected.style.transform = 'scale(1.1)';
            newSelected.style.background = this._brightenColor(hex.color || '#888', 0.4);
            newSelected.style.border = hex.isPlayerVillage 
                ? '3px solid #f1c40f' 
                : '3px solid #fff';
            newSelected.style.boxShadow = '0 0 15px rgba(255,255,255,0.8)';
            newSelected.style.zIndex = '10';
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
        // Interactions are now handled directly by individual hex elements
        // No need for complex coordinate conversion!
        console.log('[World] Hex interactions set up via individual CSS elements');
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
                    <button class="action-btn" id="enter-village-btn">
                        🏠 Enter Village
                    </button>
                    <button class="action-btn" id="draft-army-btn">
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

        // Attach event listeners for village actions (avoid inline onclick)
        if (hex.isPlayerVillage) {
            const enterBtn = panel.querySelector('#enter-village-btn');
            if (enterBtn) enterBtn.addEventListener('click', () => this.enterVillage());
            const draftBtn = panel.querySelector('#draft-army-btn');
            if (draftBtn) draftBtn.addEventListener('click', () => this.draftArmy());
        }
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
        // Switch back to village view - try multiple methods since the codebase has different systems
        console.log('[World] Attempting to switch to village view...');
        
        let switchSuccessful = false;
        
        // Method 1: Try global switchView function (from game.html)
        if (typeof window.switchView === 'function') {
            console.log('[World] Using global switchView function');
            window.switchView('village');
            switchSuccessful = true;
        }
        // Method 2: Try this.game.switchView if this.game is actually a Game instance
        else if (this.game && typeof this.game.switchView === 'function') {
            console.log('[World] Using this.game.switchView');
            this.game.switchView('village');
            switchSuccessful = true;
        }
        // Method 3: Try window.game.switchView if there's a global game instance
        else if (window.game && typeof window.game.switchView === 'function') {
            console.log('[World] Using window.game.switchView');
            window.game.switchView('village');
            switchSuccessful = true;
        }
        // Method 4: Manual view switching (DOM manipulation)
        else {
            console.log('[World] Using manual DOM view switching');
            // Hide all game views
            document.querySelectorAll('.game-view').forEach(el => el.classList.remove('active'));
            // Show village view
            const villageView = document.getElementById('village-view');
            if (villageView) {
                villageView.classList.add('active');
                switchSuccessful = true;
                console.log('[World] Manually switched to village view');
            }
            
            // Update nav buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.view === 'village') {
                    btn.classList.add('active');
                }
            });
        }
        
        if (switchSuccessful) {
            if (window.showToast) {
                window.showToast('🏰 Returning to your village...', {
                    icon: '🏠',
                    type: 'info',
                    timeout: 2000
                });
            }
            console.log('[World] Successfully switched to village view');
        } else {
            console.error('[World] Failed to switch to village view. Available methods:', {
                globalSwitchView: typeof window.switchView,
                thisGameSwitchView: typeof this.game?.switchView,
                windowGameSwitchView: typeof window.game?.switchView,
                gameObject: this.game
            });
        }
    }
    
    draftArmy() {
        // Start army drafting process
        console.log('[World] Starting army drafting process...');
        console.log('[World] draftArmy() called on:', this);
        console.log('[World] window.worldManager:', window.worldManager);
        console.log('[World] Global reference check - this === window.worldManager:', this === window.worldManager);
        this.showArmyDraftingModal();
    }
    
    showArmyDraftingModal() {
        const dynastyName = (typeof this.gameState.getDynastyName === 'function')
            ? this.gameState.getDynastyName()
            : (this.game?.tutorialManager?.getDynastyName?.() || 'Noble');

        const draftingContent = `
            <div class="army-drafting" style="padding: 20px;">
                <h3>⚔️ Draft Army</h3>
                <p>Select inhabitants to form your expedition army. You'll need supplies and brave souls willing to venture beyond the village walls.</p>
                <div class="inhabitant-selection">
                    <h4>👥 Available Inhabitants (Population: ${this.gameState.population || 25})</h4>
                    <div class="draft-options" style="margin: 15px 0;">
                        <div class="draft-role" style="margin-bottom: 20px; padding: 15px; border: 1px solid #3498db; border-radius: 8px;">
                            <h5>👑 Commander (Required)</h5>
                            <label style="display: block; margin: 5px 0;">
                                <input type="radio" name="ruler" value="yourself" checked style="margin-right: 8px;">
                                <span>Yourself (Heir of House ${dynastyName})</span>
                            </label>
                            <p style="font-size: 0.9em; color: #bdc3c7; margin: 5px 0 0 0;">As commander, you lead the expedition but cannot manage the village while away.</p>
                        </div>
                        <div class="draft-role" style="margin-bottom: 20px; padding: 15px; border: 1px solid #2ecc71; border-radius: 8px;">
                            <h5>👥 Companions (Select up to 3)</h5>
                            <label style="display: block; margin: 5px 0;">
                                <input type="checkbox" name="companion" value="peasant1" checked style="margin-right: 8px;">
                                <span>Willem the Farmer (Hardy and reliable)</span>
                            </label>
                            <label style="display: block; margin: 5px 0;">
                                <input type="checkbox" name="companion" value="peasant2" checked style="margin-right: 8px;">
                                <span>Sarah the Woodcutter (Strong and resourceful)</span>
                            </label>
                            <label style="display: block; margin: 5px 0;">
                                <input type="checkbox" name="companion" value="peasant3" style="margin-right: 8px;">
                                <span>Old Marcus the Hunter (Experienced tracker)</span>
                            </label>
                            <p style="font-size: 0.9em; color: #bdc3c7; margin: 5px 0 0 0;">Selected inhabitants will leave the village, reducing local workforce.</p>
                        </div>
                    </div>
                </div>
                <div class="draft-warning" style="padding: 10px; background-color: rgba(230, 126, 34, 0.2); border-radius: 5px; margin-top: 15px;">
                    <p><strong>⚠️ Important:</strong> While your army is deployed, village operations will continue automatically but you cannot give direct commands.</p>
                </div>
            </div>
        `;

        // Use the modalSystem
        if (window.modalSystem) {
            console.log('[World] Using modalSystem');
            window.modalSystem.showModal({
                title: 'Army Drafting',
                content: draftingContent,
                width: '500px',
                className: 'army-drafting-modal',
                modalType: 'army-drafting'
            }).then(() => {
                // Add confirm/cancel buttons manually or use showConfirmation
                window.modalSystem.showConfirmation(
                    'Form this army with the current population?',
                    {
                        title: 'Confirm Army Formation',
                        confirmText: 'Form Army',
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            this.createArmy();
                        }
                    }
                );
            });
        }
        // Fallback to showModal if available
        else if (window.showModal) {
            console.log('[World] Using window.showModal fallback');
            window.showModal('Army Drafting', draftingContent);
        } else {
            console.error('[World] No modal system available');
            // Final fallback - simple alert with instructions
            alert('Army Drafting: Click on the village tile again and check the expeditions panel to see if an army was created.');
            // Create the army anyway
            this.createArmy();
        }
    }
    
    createArmy() {
        // Get selected companions from the modal
        const selectedCompanions = [];
        const companionInputs = document.querySelectorAll('input[name="companion"]:checked');
        
        companionInputs.forEach(input => {
            const companionNames = {
                'peasant1': 'Willem the Farmer',
                'peasant2': 'Sarah the Woodcutter', 
                'peasant3': 'Old Marcus the Hunter'
            };
            selectedCompanions.push({
                name: companionNames[input.value] || input.value,
                role: 'Companion',
                type: 'peasant'
            });
        });
        
        // Create unique army ID
        const armyId = `army-${Date.now()}`;
        const armyNumber = this.parties.expeditions.length + 1;
        
        // Create the army
        const army = {
            id: armyId,
            name: `${armyNumber}${this.getOrdinalSuffix(armyNumber)} Army`,
            members: [
                { name: 'Yourself', role: 'Commander', type: 'ruler' },
                ...selectedCompanions
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
        
        // Reduce village population by number of drafted members
        if (this.gameState && this.gameState.population) {
            this.gameState.population -= army.members.length;
            this.gameState.updateUI?.();
        }
        
        window.showToast(`⚔️ ${army.name} formed! ${army.members.length} members ready for deployment.`, {
            icon: '🎉',
            type: 'success',
            timeout: 4000
        });
        
        // Show logistics tutorial after a brief delay
        setTimeout(() => {
            this.showLogisticsTutorial();
        }, 2000);
    }
    
    getOrdinalSuffix(num) {
        const lastDigit = num % 10;
        const lastTwoDigits = num % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return 'th';
        }
        
        switch (lastDigit) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
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
        if (!army) {
            console.error('[World] Army not found:', armyId);
            return;
        }
        
        // Get current resources from gameState
        const currentFood = this.gameState.food || this.gameState.resources?.food || 0;
        
        const logisticsContent = `
            <div class="logistics-management" style="padding: 20px;">
                <h3>📦 Logistics Management - ${army.name}</h3>
                <p>Manage supplies and equipment for your expedition. Proper preparation is crucial for survival in the wilderness.</p>
                
                <div class="current-resources" style="margin: 15px 0; padding: 10px; background-color: rgba(52, 152, 219, 0.2); border-radius: 5px;">
                    <h4>Available Resources</h4>
                    <p>🍞 Food: ${currentFood}</p>
                </div>
                
                <div class="supply-grid" style="margin: 20px 0;">
                    <div class="supply-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e74c3c; border-radius: 8px;">
                        <h4>🍞 Food Supplies</h4>
                        <p>Current: ${army.supplies.food} days worth</p>
                        <p style="color: ${army.supplies.food > 0 ? '#27ae60' : '#e74c3c'};">
                            ${army.supplies.food > 0 ? '✅ Army has food supplies' : '⚠️ Insufficient! Armies need food to maintain morale and strength.'}
                        </p>
                        <button class="action-btn" onclick="worldManager.addSupply('${armyId}', 'food', 7)" 
                                style="margin-top: 10px; padding: 8px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;"
                                ${currentFood < 21 ? 'disabled' : ''}>
                            Add 7 Days Food (-21 food) ${currentFood < 21 ? '(Not enough food)' : ''}
                        </button>
                    </div>
                    
                    <div class="supply-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #3498db; border-radius: 8px;">
                        <h4>💧 Water</h4>
                        <p>Current: ${army.supplies.water} days worth</p>
                        <p style="color: #3498db;">ℹ️ Optional - Can be found along the way</p>
                    </div>
                    
                    <div class="supply-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #f39c12; border-radius: 8px;">
                        <h4>⚔️ Equipment</h4>
                        <p>Current: ${army.supplies.equipment}</p>
                        <p style="color: #f39c12;">Basic equipment suitable for scouting missions</p>
                    </div>
                </div>
                
                <div class="logistics-tutorial" style="padding: 15px; background-color: rgba(241, 196, 15, 0.2); border-radius: 5px;">
                    <h4>💡 Tutorial: Expedition Logistics</h4>
                    <ul style="text-align: left; padding-left: 20px; margin: 10px 0;">
                        <li><strong>Food:</strong> Essential for maintaining army morale and preventing starvation</li>
                        <li><strong>Travel Speed:</strong> Base speed is 7 days per hex tile</li>
                        <li><strong>Events:</strong> Random encounters can affect supplies and progress</li>
                        <li><strong>Planning:</strong> Consider round-trip supplies for safe return</li>
                    </ul>
                </div>
            </div>
        `;
        
        if (window.showModal) {
            window.showModal(
                `Logistics - ${army.name}`,
                logisticsContent,
                {
                    icon: '📦',
                    type: 'info',
                    confirmText: 'Done'
                }
            );
        } else {
            console.error('[World] Modal system not available');
        }
    }
    
    addSupply(armyId, supplyType, amount) {
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) {
            console.error('[World] Army not found for supply addition:', armyId);
            return;
        }
        
        const costs = {
            food: { amount: 3, resource: 'food' } // 3 food per day of supplies
        };
        
        const cost = costs[supplyType];
        if (!cost) {
            console.error('[World] Unknown supply type:', supplyType);
            return;
        }
        
        const totalCost = cost.amount * amount;
        console.log('[World] Adding supply:', { armyId, supplyType, amount, totalCost });
        
        // Check available resources - try multiple possible locations
        let currentResources = 0;
        let resourceUpdateMethod = null;
        
        // Try gameState.food first (most common)
        if (typeof this.gameState.food === 'number') {
            currentResources = this.gameState.food;
            resourceUpdateMethod = () => { this.gameState.food -= totalCost; };
        }
        // Try gameState.resources.food
        else if (this.gameState.resources && typeof this.gameState.resources.food === 'number') {
            currentResources = this.gameState.resources.food;
            resourceUpdateMethod = () => { this.gameState.resources.food -= totalCost; };
        }
        // Try direct resource access
        else if (this.gameState[cost.resource] !== undefined) {
            currentResources = this.gameState[cost.resource];
            resourceUpdateMethod = () => { this.gameState[cost.resource] -= totalCost; };
        }
        else {
            console.error('[World] Could not find food resources in gameState. Available properties:', Object.keys(this.gameState));
            if (window.showToast) {
                window.showToast('❌ Error accessing food resources. Check console for details.', {
                    icon: '⚠️',
                    type: 'error',
                    timeout: 4000
                });
            }
            return;
        }
        
        console.log('[World] Current resources:', currentResources, 'Required:', totalCost);
        
        if (currentResources >= totalCost) {
            // Deduct resources
            resourceUpdateMethod();
            
            // Add supplies to army
            army.supplies[supplyType] += amount;
            
            // Update UI if available
            if (typeof this.gameState.updateUI === 'function') {
                this.gameState.updateUI();
                console.log('[World] GameState UI updated');
            } else {
                console.log('[World] GameState updateUI not available');
            }
            
            if (window.showToast) {
                window.showToast(`📦 Added ${amount} days of ${supplyType} to ${army.name}`, {
                    icon: '✅',
                    type: 'success',
                    timeout: 3000
                });
            }
            
            // Re-open the logistics modal with updated info after a brief delay
            setTimeout(() => this.manageLogistics(armyId), 1000);
        } else {
            if (window.showToast) {
                window.showToast(`❌ Insufficient ${cost.resource}! Need ${totalCost}, have ${currentResources}.`, {
                    icon: '⚠️',
                    type: 'error',
                    timeout: 4000
                });
            }
        }
    }
    
    showLogisticsTutorial() {
        const tutorialContent = `
            <div class="tutorial-panel" style="padding: 20px;">
                <h3>📚 Tutorial: Expedition Logistics</h3>
                <p>Your army has been formed, but they need supplies before venturing into the wilderness!</p>
                
                <div class="tutorial-steps">
                    <div class="tutorial-step" style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #e74c3c;">
                        <h4>🍞 Food is Essential</h4>
                        <p>Armies consume food during travel and combat. Without adequate supplies, morale will drop and your expedition may fail.</p>
                    </div>
                    
                    <div class="tutorial-step" style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #3498db;">
                        <h4>📦 Click "Manage Logistics"</h4>
                        <p>Use this button to equip your army with the supplies they need for the journey ahead.</p>
                    </div>
                    
                    <div class="tutorial-step" style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #2ecc71;">
                        <h4>🚶 Travel When Ready</h4>
                        <p>Once supplied, use the "Travel" button to begin moving your army across the world map.</p>
                    </div>
                </div>
                
                <p style="font-style: italic; color: #95a5a6;"><em>Remember: While your army is deployed, those members are not available for village work!</em></p>
            </div>
        `;
        
        if (window.showModal) {
            window.showModal(
                'Expedition Tutorial',
                tutorialContent,
                {
                    icon: '📚',
                    type: 'info',
                    confirmText: 'Understood'
                }
            );
        } else {
            console.error('[World] Modal system not available for tutorial');
        }
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
// Inject hex-button CSS for flat-top hexagon styling
if (!document.getElementById('hex-button-style')) {
    const style = document.createElement('style');
    style.id = 'hex-button-style';
    style.innerHTML = `
    .hex-button {
        pointer-events: auto !important;
        transition: all 0.2s ease;
        transform-origin: center center;
    }
    .hex-button:hover {
        z-index: 5 !important;
    }
    .hex-button.selected {
        z-index: 10 !important;
    }
    `;
    document.head.appendChild(style);
}

// Make WorldManager globally available
window.WorldManager = WorldManager;

// Also expose worldManager instance globally when created
if (typeof window !== 'undefined') {
    // This will be set when worldManager is instantiated
    window.worldManager = null;
}

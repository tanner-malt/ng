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
        this.selectedArmy = null;
        
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
            
            // Add safe world manager call function
            window.safeWorldManagerCall = (methodName, ...args) => {
                try {
                    console.log(`[World] safeWorldManagerCall: ${methodName}`, args);
                    console.log(`[World] window.worldManager exists:`, !!window.worldManager);
                    console.log(`[World] method exists:`, !!window.worldManager?.[methodName]);
                    
                    if (window.worldManager && typeof window.worldManager[methodName] === 'function') {
                        console.log(`[World] Safely calling ${methodName} with args:`, args);
                        return window.worldManager[methodName](...args);
                    } else {
                        console.error(`[World] WorldManager method ${methodName} not available`, {
                            worldManagerExists: !!window.worldManager,
                            methodExists: !!window.worldManager?.[methodName],
                            methodType: typeof window.worldManager?.[methodName]
                        });
                        window.showToast(`⚠️ Feature temporarily unavailable: ${methodName}`, { type: 'warning' });
                        return false;
                    }
                } catch (error) {
                    console.error(`[World] Error calling ${methodName}:`, error);
                    window.showToast(`❌ Error: ${error.message}`, { type: 'error' });
                    return false;
                }
            };
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
                    discovered: row === 1 && col === 1, // Center hex (player village) starts discovered
                    fogOfWar: !(row === 1 && col === 1), // All hexes except center start with fog of war
                    units: [],
                    resources: null,
                    buildings: [],
                    weather: 'clear',
                    elevation: 0
                };
            }
        }
        
        // Initialize expeditions array
        this.expeditions = [];
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

    // Method to refresh army positions without full re-render
    refreshArmyPositions() {
        const container = document.getElementById('hex-overlay');
        if (!container) return;
        
        // Re-render the entire map to update army positions
        this.renderHexMap();
    }

    // Method to update army displays and info panels
    updateArmyDisplays() {
        // Refresh the map to show updated army positions
        this.refreshArmyPositions();
        
        // Update the info panel if a hex is currently selected
        if (this.selectedHex) {
            const hex = this.hexMap[this.selectedHex.row][this.selectedHex.col];
            this.updateHexInfoPanel(hex, this.selectedHex.row, this.selectedHex.col);
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
                
                // Always show tiles, but with different styling for fog of war
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
        
        // Create square shape with CSS - apply fog of war styling
        if (hex.fogOfWar) {
            // Fog of war tiles
            squareButton.style.background = 'linear-gradient(45deg, #2c3e50, #34495e)';
            squareButton.style.borderRadius = '8px';
            squareButton.style.border = '2px solid #7f8c8d';
            squareButton.style.opacity = '0.6';
            squareButton.textContent = '🌫️';
            squareButton.style.color = '#95a5a6';
        } else {
            // Discovered tiles
            squareButton.style.background = hex.color || '#4a90a4';
            squareButton.style.borderRadius = '8px';
            squareButton.style.border = '2px solid rgba(255,255,255,0.3)';
            squareButton.style.opacity = '1';
        }
        
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
        
        // Check if there's an army at this position
        const armyAtPosition = this.gameState.getArmyAt({ x: col, y: row });
        
        // Check if there are scouts stationed at this position
        const scoutsAtPosition = this.expeditions.find(exp => 
            exp.status === 'stationed' && 
            exp.targetHex.row === row && 
            exp.targetHex.col === col
        );
        
        // Add terrain symbol or unit indicators
        if (hex.fogOfWar) {
            // Don't show details for fog of war tiles - just show fog icon
            squareButton.textContent = '🌫️';
            squareButton.style.color = '#95a5a6';
        } else if (armyAtPosition && scoutsAtPosition) {
            // Show both army and scouts
            squareButton.innerHTML = `<div style="position: relative;">
                <div style="position: absolute; top: -2px; left: -2px; background: #e74c3c; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 9px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚔</div>
                <div style="position: absolute; top: -2px; right: -2px; background: #3498db; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 9px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👁</div>
                <span style="color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-weight: bold;">${hex.symbol || '🌱'}</span>
            </div>`;
        } else if (armyAtPosition) {
            // Show army with different styling
            squareButton.innerHTML = `<div style="position: relative;">
                <div style="position: absolute; top: -2px; left: -2px; background: #e74c3c; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚔</div>
                <span style="color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-weight: bold;">${hex.symbol || '🌱'}</span>
            </div>`;
        } else if (scoutsAtPosition) {
            // Show scouts stationed here
            squareButton.innerHTML = `<div style="position: relative;">
                <div style="position: absolute; top: -2px; right: -2px; background: #3498db; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">👁</div>
                <span style="color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-weight: bold;">${hex.symbol || '🌱'}</span>
            </div>`;
        } else {
            squareButton.textContent = hex.symbol || '🌱';
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
            
            // Different border for army selection vs hex selection
            if (this.selectedArmy) {
                squareButton.style.border = '3px solid #e74c3c'; // Red for army
                squareButton.style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.8)';
            } else {
                squareButton.style.border = hex.isPlayerVillage 
                    ? '3px solid #f1c40f' 
                    : '3px solid #fff';
                squareButton.style.boxShadow = '0 0 15px rgba(255,255,255,0.8)';
            }
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
        
        // Check if we're trying to move an army
        if (this.selectedArmy && this.selectedArmy.position.x !== col && this.selectedArmy.position.y !== row) {
            // Attempt to move the selected army to this hex
            const success = this.gameState.moveArmy(this.selectedArmy.id, { x: col, y: row });
            if (success) {
                this.selectedArmy = null; // Clear army selection after successful move
                this.updateArmyDisplays();
                return;
            }
        }
        
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
        
        // Check if there's an army at this location
        const armyAtLocation = this.gameState.getArmyAt({ x: col, y: row });
        if (armyAtLocation) {
            this.selectedArmy = armyAtLocation;
            if (window.showToast) {
                window.showToast(`⚔️ Army "${armyAtLocation.name}" selected. Click another tile to move.`, {
                    icon: '👆',
                    type: 'info',
                    timeout: 3000
                });
            }
        } else {
            this.selectedArmy = null;
        }
        
        // Highlight the new selection
        const newSelected = document.querySelector(`button[data-row="${row}"][data-col="${col}"]`);
        if (newSelected) {
            newSelected.classList.add('selected');
            newSelected.style.transform = 'scale(1.1)';
            newSelected.style.background = this._brightenColor(hex.color || '#888', 0.4);
            newSelected.style.border = hex.isPlayerVillage 
                ? '3px solid #f1c40f' 
                : armyAtLocation ? '3px solid #ff6b6b' : '3px solid #fff';
            newSelected.style.boxShadow = armyAtLocation 
                ? '0 0 15px rgba(255,107,107,0.8)'
                : '0 0 15px rgba(255,255,255,0.8)';
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
        
        // Check for armies at this position
        const armyAtPosition = this.gameState.getArmyAt({ x: col, y: row });
        
        // Check for scouts at this position
        const scoutsAtPosition = this.expeditions.find(exp => 
            exp.status === 'stationed' && 
            exp.targetHex.row === row && 
            exp.targetHex.col === col
        );
        
        let content = `
            <h4>📍 Hex (${row}, ${col})</h4>
            <div class="hex-details">
                <p><strong>Terrain:</strong> ${hex.symbol} ${hex.terrain}</p>
                <p><strong>Weather:</strong> ${this.getWeatherIcon(hex.weather)} ${hex.weather}</p>
                <p><strong>Elevation:</strong> ${'⬆'.repeat(hex.elevation) || 'Sea level'}</p>
        `;

        // Show army information if present
        if (armyAtPosition) {
            const foodUpkeep = armyAtPosition.units.length * 2; // 2 food per unit per day
            content += `
                <div class="army-info" style="border: 2px solid #e74c3c; border-radius: 8px; padding: 10px; margin: 10px 0; background: rgba(231, 76, 60, 0.1);">
                    <h5>⚔️ Army: ${armyAtPosition.name}</h5>
                    <p><strong>Units:</strong> ${armyAtPosition.units.length}</p>
                    <p><strong>Food Upkeep:</strong> ${foodUpkeep}/day</p>
                    ${armyAtPosition.isMoving ? 
                        `<p><strong>Status:</strong> 🚶 Moving to (${armyAtPosition.movementTarget.x}, ${armyAtPosition.movementTarget.y})</p>
                         <p><strong>Progress:</strong> ${Math.round(armyAtPosition.movementProgress * 100)}%</p>` :
                        `<p><strong>Status:</strong> 🛡️ Stationed</p>`
                    }
                    ${this.selectedArmy && this.selectedArmy.id === armyAtPosition.id ? 
                        `<p style="color: #e74c3c; font-weight: bold;">📍 SELECTED - Click another tile to move</p>` : 
                        ''
                    }
                </div>
            `;
        }
        
        // Show scout information if present
        if (scoutsAtPosition) {
            content += `
                <div class="scout-info" style="border: 2px solid #3498db; border-radius: 8px; padding: 10px; margin: 10px 0; background: rgba(52, 152, 219, 0.1);">
                    <h5>👁️ Scouts Stationed</h5>
                    <p><strong>Scouts:</strong> ${scoutsAtPosition.scouts.map(s => s.name).join(', ')}</p>
                    <p><strong>Count:</strong> ${scoutsAtPosition.scouts.length} scout${scoutsAtPosition.scouts.length !== 1 ? 's' : ''}</p>
                    <p><strong>Status:</strong> 🔍 Gathering intelligence</p>
                    <button class="action-btn secondary" onclick="window.worldManager.orderScoutsHome('${scoutsAtPosition.id}')" style="margin-top: 8px;">
                        🏠 Order Return Home
                    </button>
                </div>
            `;
        }
        
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
                    <button class="action-btn secondary" onclick="window.safeWorldManagerCall?.('exploreHex', ${row}, ${col}) || (window.worldManager && window.worldManager.exploreHex?.(${row}, ${col}))">
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

        // Get available villagers for drafting
        let availableVillagers = [];
        let totalPopulation = this.gameState.population || 0;
        
        if (this.gameState.populationManager) {
            const allVillagers = this.gameState.populationManager.getAll();
            availableVillagers = allVillagers.filter(villager => 
                villager.age >= 16 && // Only adults
                villager.status !== 'drafted' && 
                villager.status !== 'sick' &&
                villager.canWork // Only those able to work
            );
            totalPopulation = allVillagers.filter(v => v.status !== 'drafted').length;
        }

        // Generate companion options from actual villagers
        let companionOptions = '';
        if (availableVillagers.length > 0) {
            // Take up to 10 available villagers for selection
            const selectableVillagers = availableVillagers.slice(0, 10);
            
            selectableVillagers.forEach((villager, index) => {
                const roleDescription = this.getVillagerDescription(villager);
                const isPreSelected = index < 3; // Pre-select first 3
                
                companionOptions += `
                    <label style="display: block; margin: 5px 0;">
                        <input type="checkbox" name="companion" value="${villager.id}" ${isPreSelected ? 'checked' : ''} style="margin-right: 8px;">
                        <span>${villager.name} (${roleDescription})</span>
                    </label>
                `;
            });
        } else {
            companionOptions = '<p style="color: #e74c3c;">⚠️ No eligible villagers available for drafting. You need adults (16+) who are not sick or already drafted.</p>';
        }

        const draftingContent = `
            <div class="army-drafting" style="padding: 20px;">
                <h3>⚔️ Draft Army</h3>
                <p>Select inhabitants to form your expedition army. You'll need supplies and brave souls willing to venture beyond the village walls.</p>
                <div class="inhabitant-selection">
                    <h4>👥 Available Inhabitants (Population: ${totalPopulation})</h4>
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
                            <h5>👥 Companions (Select up to ${Math.min(availableVillagers.length, 10)})</h5>
                            ${companionOptions}
                            <p style="font-size: 0.9em; color: #bdc3c7; margin: 5px 0 0 0;">Selected inhabitants will leave the village, reducing local workforce.</p>
                        </div>
                    </div>
                </div>
                <div class="draft-warning" style="padding: 10px; background-color: rgba(230, 126, 34, 0.2); border-radius: 5px; margin-top: 15px;">
                    <p><strong>⚠️ Important:</strong> While your army is deployed, village operations will continue automatically but you cannot give direct commands.</p>
                </div>
                <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <button id="cancel-draft-btn" class="btn btn-secondary" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                    <button id="confirm-draft-btn" class="btn btn-primary" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        ⚔️ Form Army
                    </button>
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
                // Add event listeners to the buttons after modal is shown
                const confirmBtn = document.getElementById('confirm-draft-btn');
                const cancelBtn = document.getElementById('cancel-draft-btn');
                
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', () => {
                        this.createArmy();
                        window.modalSystem.closeTopModal();
                    });
                }
                
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        window.modalSystem.closeTopModal();
                    });
                }
            });
        }
        // Fallback to showModal if available
        else if (window.showModal) {
            console.log('[World] Using window.showModal fallback');
            window.showModal('Army Drafting', draftingContent, {
                icon: '⚔️',
                confirmText: 'Form Army',
                cancelText: 'Cancel',
                onConfirm: () => {
                    this.createArmy();
                }
            });
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
        
        // Store villager IDs for actual drafting
        const selectedVillagerIds = [];
        companionInputs.forEach(input => {
            selectedVillagerIds.push(input.value);
        });
        
        // Create unique army ID
        const armyId = `army-${Date.now()}`;
        const armyNumber = this.parties.expeditions.length + 1;
        const armyName = `${armyNumber}${this.getOrdinalSuffix(armyNumber)} Army`;
        
        // Create army units array for the new system
        const armyUnits = [
            { id: 'commander', name: 'Yourself', role: 'Commander', type: 'ruler', health: 100, attack: 20, experience: 0 }
        ];
        
        // Draft villagers from the population manager
        if (this.gameState.populationManager && selectedVillagerIds.length > 0) {
            selectedVillagerIds.forEach(villagerId => {
                const villager = this.gameState.populationManager.getInhabitant(parseInt(villagerId));
                if (villager && villager.status !== 'drafted') {
                    // Mark villager as drafted
                    this.gameState.populationManager.updateStatus(villager.id, 'drafted');
                    
                    // Add to army units
                    armyUnits.push({
                        id: `unit_${villager.id}`,
                        name: villager.name,
                        role: 'Soldier',
                        type: 'villager',
                        villagerId: villager.id,
                        health: 80,
                        attack: 10 + Math.floor(villager.age / 10), // Age affects combat ability
                        experience: 0,
                        age: villager.age
                    });
                }
            });
            
            // Update population count to reflect drafted villagers
            this.gameState.population = this.gameState.populationManager.getAll()
                .filter(v => v.status !== 'drafted').length;
                
            console.log(`[WorldManager] Drafted ${armyUnits.length - 1} villagers for army. Remaining population: ${this.gameState.population}`);
        }
        
        // Create army using new system (starts at village location)
        const newArmy = this.gameState.createArmy(armyName, armyUnits, this.playerVillageHex);
        
        // Legacy expedition tracking (for UI compatibility)
        const legacyArmy = {
            id: armyId,
            name: armyName,
            members: armyUnits.map(unit => ({
                name: unit.name,
                role: unit.role,
                type: unit.type,
                villagerId: unit.villagerId,
                age: unit.age
            })),
            morale: 100,
            supplies: {
                food: 0,
                water: 0,
                equipment: 'basic'
            },
            location: this.playerVillageHex,
            status: 'ready',
            draftedVillagers: armyUnits.filter(u => u.type === 'villager').map(u => ({
                id: u.villagerId,
                name: u.name,
                originalRole: 'Companion',
                age: u.age
            })),
            armyId: newArmy.id // Link to new army system
        };
        
        this.parties.expeditions.push(legacyArmy);
        this.updateExpeditionsList();
        
        // Update UI
        if (this.gameState.updateResourceDisplay) {
            this.gameState.updateResourceDisplay();
        } else if (this.gameState.updateUI) {
            this.gameState.updateUI();
        }
        
        // Show army created notification
        if (window.showToast) {
            window.showToast(`⚔️ Army "${armyName}" has been formed with ${armyUnits.length} members at village!`, {
                icon: '🏗️',
                type: 'success',
                timeout: 5000
            });
        }
        
        // Emit population drafted event for achievements
        if (window.eventBus) {
            window.eventBus.emit('population_drafted', { amount: armyUnits.length - 1 }); // -1 for commander
        }
        
        // Achievement system notification
        if (window.achievementSystem) {
            window.achievementSystem.emitPopulationDrafted(armyUnits.length - 1, { armyId: armyId });
        }
        
        // Update army displays to show the new army on the map
        this.updateArmyDisplays();
        
        // Show logistics tutorial after a brief delay
        setTimeout(() => {
            this.showLogisticsTutorial();
        }, 2000);
    }
    
    getVillagerDescription(villager) {
        const age = villager.age;
        const role = villager.role || 'peasant';
        
        // Age categories
        let ageDesc = '';
        if (age < 20) ageDesc = 'Young';
        else if (age < 30) ageDesc = 'Adult';
        else if (age < 40) ageDesc = 'Experienced';
        else ageDesc = 'Veteran';
        
        // Role descriptions
        const roleDescs = {
            'peasant': 'Hardy worker',
            'farmer': 'Experienced with crops',
            'builder': 'Skilled in construction',
            'guard': 'Trained in combat',
            'scout': 'Quick and observant',
            'crafter': 'Skilled artisan'
        };
        
        const roleDesc = roleDescs[role] || 'Willing worker';
        
        return `${ageDesc} ${roleDesc}, age ${age}`;
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
        // Ensure global reference is maintained when updating UI
        window.worldManager = this;
        
        const list = document.getElementById('expedition-list');
        if (!list) return;
        
        // Check for both armies and scout expeditions
        const hasArmies = this.parties.expeditions.length > 0;
        const hasScoutTrips = this.expeditions && this.expeditions.length > 0;
        
        if (!hasArmies && !hasScoutTrips) {
            list.innerHTML = '<p style="color: #bdc3c7; font-style: italic;">No expeditions active. Draft an army or send scouts to begin exploring.</p>';
            return;
        }
        
        let content = '';
        
        // Display army expeditions
        if (hasArmies) {
            content += '<h4 style="color: #e74c3c; margin-bottom: 10px;">⚔️ Army Expeditions</h4>';
            this.parties.expeditions.forEach(army => {
                content += `
                    <div class="expedition-item army-expedition">
                        <h4>⚔️ ${army.name}</h4>
                        <p><strong>Members:</strong> ${army.members.length} (${army.members.map(m => m.name).join(', ')})</p>
                        <p><strong>Morale:</strong> ${army.morale}%</p>
                        <p><strong>Status:</strong> ${army.status}</p>
                        
                        <div class="expedition-actions">
                            <button class="action-btn small" onclick="window.safeWorldManagerCall?.('manageLogistics', '${army.id}') || (window.worldManager && window.worldManager.manageLogistics?.('${army.id}'))">
                                📦 Manage Logistics
                            </button>
                            <button class="action-btn small secondary" onclick="window.safeWorldManagerCall?.('renameArmy', '${army.id}') || (window.worldManager && window.worldManager.renameArmy?.('${army.id}'))">
                                ✏️ Rename
                            </button>
                            <button class="action-btn small" onclick="window.safeWorldManagerCall?.('viewComposition', '${army.id}') || (window.worldManager && window.worldManager.viewComposition?.('${army.id}'))">
                                👥 View Composition
                            </button>
                            <button class="action-btn small primary" onclick="window.safeWorldManagerCall?.('travel', '${army.id}') || (window.worldManager && window.worldManager.travel?.('${army.id}'))">
                                🚶 Travel
                            </button>
                            <button class="action-btn small danger" onclick="window.safeWorldManagerCall?.('disbandArmy', '${army.id}') || (window.worldManager && window.worldManager.disbandArmy?.('${army.id}'))">
                                ❌ Disband
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        // Display scout expeditions
        if (hasScoutTrips) {
            if (hasArmies) {
                content += '<hr style="margin: 15px 0; border: 1px solid #34495e;">';
            }
            content += '<h4 style="color: #3498db; margin-bottom: 10px;">🔍 Scout Expeditions</h4>';
            
            this.expeditions.forEach(expedition => {
                const daysPassed = window.gameState.currentDay - expedition.startDay;
                let currentStatus = '';
                let actionButton = '';
                
                if (expedition.returningHome) {
                    const returnDistance = Math.abs(expedition.currentHex.row - this.playerVillageHex.row) + 
                                         Math.abs(expedition.currentHex.col - this.playerVillageHex.col);
                    const returnProgress = Math.max(0, expedition.travelDistance - expedition.daysRemaining);
                    const returnDaysLeft = Math.max(0, expedition.daysRemaining);
                    
                    currentStatus = `🏠 Returning home (${returnDaysLeft} day${returnDaysLeft !== 1 ? 's' : ''} remaining)`;
                    
                    if (returnDaysLeft === 0) {
                        actionButton = `<button class="action-btn small primary" onclick="window.worldManager.completeExpedition('${expedition.id}')" style="margin-top: 8px;">
                            ✅ Scouts Returned
                        </button>`;
                    }
                } else if (expedition.status === 'traveling') {
                    const travelProgress = Math.min(expedition.travelDistance, daysPassed);
                    const daysLeft = Math.max(0, expedition.travelDistance - daysPassed);
                    
                    if (daysLeft === 0) {
                        currentStatus = '� Arrived at destination - Scouting area';
                        actionButton = `<button class="action-btn small secondary" onclick="window.worldManager.orderScoutsHome('${expedition.id}')" style="margin-top: 8px;">
                            🏠 Order Return Home
                        </button>`;
                        // Update expedition status to stationed
                        expedition.status = 'stationed';
                        expedition.isStationed = true;
                        // Reveal the hex now that scouts have arrived
                        this.revealHex(expedition.targetHex.row, expedition.targetHex.col);
                        this.revealSurroundingHexes(expedition.targetHex.row, expedition.targetHex.col);
                    } else {
                        currentStatus = `🚶 Traveling to destination (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)`;
                    }
                } else if (expedition.status === 'stationed') {
                    currentStatus = '🔍 Stationed at destination - Gathering intelligence';
                    actionButton = `<button class="action-btn small secondary" onclick="window.worldManager.orderScoutsHome('${expedition.id}')" style="margin-top: 8px;">
                        🏠 Order Return Home
                    </button>`;
                }
                
                const totalProgress = expedition.returningHome ? 
                    (expedition.isStationed ? 50 + ((expedition.travelDistance - expedition.daysRemaining) / expedition.travelDistance) * 50 : 0) :
                    (Math.min(daysPassed, expedition.travelDistance) / expedition.travelDistance) * 100;
                
                content += `
                    <div class="expedition-item scout-expedition ${expedition.isStationed && !expedition.returningHome ? 'stationed' : ''}">
                        <div class="expedition-header">
                            <h5>🎯 Scout Mission to (${expedition.targetHex.row}, ${expedition.targetHex.col})</h5>
                            <span class="expedition-scouts">${expedition.scouts.length} scouts</span>
                        </div>
                        <div class="expedition-details">
                            <p><strong>Scouts:</strong> ${expedition.scouts.map(s => s.name).join(', ')}</p>
                            <p><strong>Distance:</strong> ${expedition.travelDistance} hex${expedition.travelDistance !== 1 ? 'es' : ''}</p>
                            <p><strong>Status:</strong> ${currentStatus}</p>
                        </div>
                        <div class="expedition-progress">
                            <div class="progress-bar" style="background: #34495e; border-radius: 4px; height: 8px; margin: 8px 0;">
                                <div class="progress-fill" style="width: ${totalProgress}%; background: ${expedition.isStationed ? '#f39c12' : '#3498db'}; height: 100%; border-radius: 4px; transition: width 0.3s;"></div>
                            </div>
                            <span class="progress-text" style="font-size: 0.8em; color: #bdc3c7;">${Math.floor(totalProgress)}% journey complete</span>
                        </div>
                        ${actionButton}
                    </div>
                `;
            });
        }
        
        list.innerHTML = content;
    }
    
    disbandArmy(armyId) {
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) {
            console.error('[WorldManager] Army not found:', armyId);
            return;
        }
        
        // Confirm disbanding
        if (window.modalSystem) {
            console.log('[World] Showing confirmation modal for army disbanding');
            window.modalSystem.showConfirmation(
                `Are you sure you want to disband ${army.name}? All members will return to the village.`,
                {
                    title: 'Disband Army',
                    confirmText: 'Disband',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        console.log('[World] Confirmation onConfirm callback triggered');
                        this.performDisbandArmy(armyId);
                    },
                    onCancel: () => {
                        console.log('[World] Confirmation onCancel callback triggered');
                    }
                }
            ).then((result) => {
                console.log('[World] Confirmation dialog result:', result);
            }).catch((error) => {
                console.error('[World] Confirmation dialog error:', error);
                // Fallback to browser confirm
                if (confirm(`Disband ${army.name}? All members will return to the village.`)) {
                    this.performDisbandArmy(armyId);
                }
            });
        } else if (confirm(`Disband ${army.name}? All members will return to the village.`)) {
            this.performDisbandArmy(armyId);
        }
    }
    
    performDisbandArmy(armyId) {
        const armyIndex = this.parties.expeditions.findIndex(a => a.id === armyId);
        if (armyIndex === -1) return;
        
        const army = this.parties.expeditions[armyIndex];
        
        // Return drafted villagers to the population
        if (this.gameState.populationManager && army.draftedVillagers) {
            army.draftedVillagers.forEach(draftedVillager => {
                const villager = this.gameState.populationManager.getInhabitant(draftedVillager.id);
                if (villager) {
                    // Restore original status
                    this.gameState.populationManager.updateStatus(villager.id, 'idle');
                    // Restore original role if it was changed
                    if (draftedVillager.originalRole && villager.role !== draftedVillager.originalRole) {
                        this.gameState.populationManager.assignRole(villager.id, draftedVillager.originalRole);
                    }
                }
            });
            
            // Update population count
            this.gameState.population = this.gameState.populationManager.getAll()
                .filter(v => v.status !== 'drafted').length;
        } else {
            // Fallback: simple population addition
            const returningMembers = army.members.length - 1; // -1 for commander (yourself)
            if (this.gameState && typeof this.gameState.population === 'number') {
                this.gameState.population += returningMembers;
            }
        }
        
        // Remove army from expeditions
        this.parties.expeditions.splice(armyIndex, 1);
        
        // Update UI
        this.updateExpeditionsList();
        if (this.gameState.updateResourceDisplay) {
            this.gameState.updateResourceDisplay();
        } else if (this.gameState.updateUI) {
            this.gameState.updateUI();
        }
        
        // Emit population returned event
        if (window.eventBus) {
            window.eventBus.emit('population_returned', { 
                amount: army.draftedVillagers ? army.draftedVillagers.length : army.members.length - 1,
                armyName: army.name
            });
        }
        
        window.showToast(`🏠 ${army.name} disbanded! Members have returned to the village.`, {
            icon: '✅',
            type: 'success',
            timeout: 3000
        });
    }
    
    manageLogistics(armyId) {
        console.log('[World] manageLogistics called with armyId:', armyId);
        console.log('[World] this.parties.expeditions:', this.parties.expeditions);
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) {
            console.error('[World] Army not found:', armyId, 'Available armies:', this.parties.expeditions.map(a => a.id));
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
                        <button class="action-btn" onclick="window.safeWorldManagerCall?.('addSupply', '${armyId}', 'food', 7) || (window.worldManager && window.worldManager.addSupply?.('${armyId}', 'food', 7))" 
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
    
    updateLogisticsModal(armyId) {
        console.log('[World] Updating logistics modal for armyId:', armyId);
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) {
            console.error('[World] Army not found for modal update:', armyId);
            return;
        }
        
        // Try to find and update the existing modal
        const modalTitle = `Logistics - ${army.name}`;
        const existingModal = Array.from(document.querySelectorAll('.modal')).find(modal => {
            const titleElement = modal.querySelector('.modal-title, h3');
            return titleElement && titleElement.textContent.includes(`Logistics - ${army.name}`);
        });
        
        if (existingModal) {
            console.log('[World] Found existing logistics modal, updating content...');
            
            // Get current resources from gameState
            const currentFood = this.gameState.food || this.gameState.resources?.food || 0;
            
            // Generate updated content
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
                            <button class="action-btn" onclick="window.safeWorldManagerCall?.('addSupply', '${armyId}', 'food', 7) || (window.worldManager && window.worldManager.addSupply?.('${armyId}', 'food', 7))" 
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
            
            // Update the modal body content
            const modalBody = existingModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = logisticsContent;
                console.log('[World] Logistics modal content updated successfully');
            } else {
                console.warn('[World] Could not find modal body to update');
            }
        } else {
            console.log('[World] No existing logistics modal found, reopening...');
            // Fallback: re-open the modal
            setTimeout(() => this.manageLogistics(armyId), 300);
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
            
            // Try to update the existing modal content in place
            this.updateLogisticsModal(armyId);
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
        console.log('[World] travel called with armyId:', armyId);
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
        console.log('[World] viewComposition called with armyId:', armyId);
        const army = this.parties.expeditions.find(a => a.id === armyId);
        if (!army) {
            console.error('[World] Army not found for viewComposition:', armyId, 'Available armies:', this.parties.expeditions.map(a => a.id));
            return;
        }
        
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
        // Prevent multiple modals from being created
        if (document.querySelector('.scout-modal-overlay')) {
            console.log('[WorldManager] Scout modal already open, ignoring duplicate request');
            return;
        }
        
        // Trigger exploration achievement
        if (window.gameState && window.gameState.achievements) {
            window.gameState.achievements.triggerTileExplored();
        }
        
        // Start scout selection process
        this.showScoutSelectionModal(row, col);
    }

    showScoutSelectionModal(targetRow, targetCol) {
        // Check if a scout modal is already open
        if (document.querySelector('.scout-modal-overlay')) {
            console.log('[WorldManager] Scout modal already open, ignoring request');
            return;
        }
        
        // Get available villagers for scouting (working age, not already working)
        const availableScouts = [];
        if (window.gameState && window.gameState.populationManager) {
            const population = window.gameState.populationManager.getAll();
            population.forEach(villager => {
                const isRightAge = villager.age >= 16 && villager.age <= 65;
                const isAvailable = villager.status !== 'working' && villager.status !== 'scouting';
                if (isRightAge && isAvailable) {
                    availableScouts.push(villager);
                }
            });
        }

        if (availableScouts.length === 0) {
            window.showToast('❌ No available scouts! Need unemployed villagers aged 16-65.', {
                icon: '�',
                type: 'error',
                timeout: 3000
            });
            return;
        }

        // Create scout selection modal
        const modal = document.createElement('div');
        modal.className = 'scout-modal-overlay';
        modal.innerHTML = `
            <div class="scout-modal">
                <div class="scout-modal-header">
                    <h3>�🔍 Select Scouts for Expedition</h3>
                    <p>Choose up to 3 villagers to scout hex (${targetRow}, ${targetCol})</p>
                </div>
                <div class="scout-selection">
                    <div class="scout-list">
                        ${availableScouts.map(scout => `
                            <div class="scout-option" data-scout-id="${scout.id}">
                                <input type="checkbox" id="scout-${scout.id}" class="scout-checkbox">
                                <label for="scout-${scout.id}" class="scout-label">
                                    <span class="scout-name">${scout.name}</span>
                                    <span class="scout-details">Age: ${scout.age}, ${scout.gender}</span>
                                    <span class="scout-role">${scout.role || 'villager'}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="scout-modal-actions">
                    <button class="scout-btn cancel" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    <button class="scout-btn confirm" onclick="this.disabled=true; window.worldManager.confirmScoutExpedition(${targetRow}, ${targetCol})">Send Scouts</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners for checkbox limitation (max 3)
        const checkboxes = modal.querySelectorAll('.scout-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checked = modal.querySelectorAll('.scout-checkbox:checked');
                if (checked.length > 3) {
                    checkbox.checked = false;
                    window.showToast('⚠️ Maximum 3 scouts per expedition!', {
                        icon: '👥',
                        type: 'warning',
                        timeout: 2000
                    });
                }
            });
        });
    }

    confirmScoutExpedition(targetRow, targetCol) {
        const modal = document.querySelector('.scout-modal-overlay');
        if (!modal) {
            console.error('[WorldManager] Scout modal not found');
            return;
        }
        
        // Disable the confirm button to prevent double-clicking
        const confirmButton = modal.querySelector('.scout-btn.confirm');
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Sending...';
        }
        
        const selectedScouts = [];
        const checkedBoxes = modal.querySelectorAll('.scout-checkbox:checked');
        
        if (checkedBoxes.length === 0) {
            window.showToast('❌ Please select at least one scout!', {
                icon: '👥',
                type: 'error',
                timeout: 2000
            });
            return;
        }

        // Get scout data
        checkedBoxes.forEach(checkbox => {
            const scoutId = parseInt(checkbox.id.replace('scout-', '')); // Convert to number
            const scout = window.gameState.populationManager.getAll().find(v => v.id === scoutId);
            if (scout) {
                selectedScouts.push(scout);
            } else {
                console.warn('[WorldManager] Could not find scout with ID:', scoutId);
            }
        });

        if (selectedScouts.length === 0) {
            window.showToast('❌ No valid scouts found!', {
                icon: '👥',
                type: 'error',
                timeout: 2000
            });
            // Re-enable the button
            if (confirmButton) {
                confirmButton.disabled = false;
                confirmButton.textContent = 'Send Scouts';
            }
            return;
        }

        // Check if any selected scouts are already on expeditions
        const busyScouts = selectedScouts.filter(scout => scout.status === 'scouting');
        if (busyScouts.length > 0) {
            window.showToast(`❌ Some scouts are already on expeditions: ${busyScouts.map(s => s.name).join(', ')}`, {
                icon: '👥',
                type: 'error',
                timeout: 3000
            });
            // Re-enable the button
            if (confirmButton) {
                confirmButton.disabled = false;
                confirmButton.textContent = 'Send Scouts';
            }
            return;
        }

        // Calculate travel distance (Manhattan distance for simplicity)
        const playerPos = this.playerVillageHex;
        const distance = Math.abs(targetRow - playerPos.row) + Math.abs(targetCol - playerPos.col);
        
        // Create expedition (allowing multiple expeditions to the same location for stationing)
        const expedition = {
            id: `expedition_${Date.now()}`,
            scouts: selectedScouts,
            targetHex: { row: targetRow, col: targetCol },
            currentHex: { row: playerPos.row, col: playerPos.col },
            status: 'traveling',
            progress: 0,
            travelDistance: distance,
            daysRemaining: distance,
            startDay: window.gameState.currentDay,
            isStationed: false, // Will be true when scouts reach destination and stay there
            returningHome: false
        };

        // Initialize expeditions array if it doesn't exist
        if (!this.expeditions) {
            this.expeditions = [];
        }
        this.expeditions.push(expedition);

        // Mark scouts as busy
        selectedScouts.forEach(scout => {
            // Double-check scout isn't already on an expedition
            if (scout.status === 'scouting') {
                console.warn('[WorldManager] Scout', scout.name, 'already on expedition, skipping');
                return;
            }
            scout.status = 'scouting';
            scout.expeditionId = expedition.id;
        });

        // Remove modal FIRST to prevent double-clicking
        modal.remove();

        // Show confirmation
        window.showToast(`🔍 ${selectedScouts.length} scouts sent to explore hex (${targetRow}, ${targetCol})! ${distance} day${distance > 1 ? 's' : ''} travel time.`, {
            icon: '🗺️',
            type: 'success',
            timeout: 4000
        });

        // Update expedition display
        this.updateExpeditionsList(); // Use main expeditions list instead of separate display
    }

    orderScoutsHome(expeditionId) {
        const expedition = this.expeditions.find(e => e.id === expeditionId);
        if (!expedition) {
            console.error('[WorldManager] Expedition not found:', expeditionId);
            return;
        }

        if (expedition.returningHome) {
            window.showToast('⚠️ Scouts are already returning home!', {
                icon: '🏠',
                type: 'warning',
                timeout: 2000
            });
            return;
        }

        // Calculate return distance
        const returnDistance = Math.abs(expedition.targetHex.row - this.playerVillageHex.row) + 
                              Math.abs(expedition.targetHex.col - this.playerVillageHex.col);

        // Update expedition status
        expedition.returningHome = true;
        expedition.status = 'returning';
        expedition.daysRemaining = returnDistance;
        expedition.returnStartDay = window.gameState.currentDay;

        window.showToast(`🏠 Ordered ${expedition.scouts.length} scouts to return home. ${returnDistance} day${returnDistance !== 1 ? 's' : ''} travel time.`, {
            icon: '📋',
            type: 'success',
            timeout: 3000
        });

        // Update expedition display
        this.updateExpeditionsList();
    }

    completeExpedition(expeditionId) {
        const expedition = this.expeditions.find(e => e.id === expeditionId);
        if (!expedition) return;

        // Return scouts to available status
        expedition.scouts.forEach(scout => {
            scout.status = 'idle';
            delete scout.expeditionId;
        });

        // Remove expedition
        this.expeditions = this.expeditions.filter(e => e.id !== expeditionId);

        // Show results
        if (expedition.returningHome) {
            window.showToast(`� ${expedition.scouts.length} scouts have returned home safely!`, {
                icon: '✅',
                type: 'success',
                timeout: 4000
            });
        } else {
            // This shouldn't normally happen, but handle legacy cases
            const { row, col } = expedition.targetHex;
            
            // Reveal the target hex and surrounding hexes (fog of war)
            this.revealHex(row, col);
            this.revealSurroundingHexes(row, col);

            window.showToast(`�🎉 Expedition complete! Discovered hex (${row}, ${col}) and surrounding area.`, {
                icon: '🗺️',
                type: 'success',
                timeout: 4000
            });
        }

        // Update displays
        this.updateExpeditionsList(); // Use main expeditions list
        this.renderHexMap();
    }

    revealHex(row, col) {
        if (this.hexMap[row] && this.hexMap[row][col]) {
            this.hexMap[row][col].discovered = true;
            this.hexMap[row][col].fogOfWar = false;
        }
    }

    revealSurroundingHexes(centerRow, centerCol) {
        // Reveal adjacent hexes (6 directions in hex grid)
        const directions = [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, 0], [1, 1]
        ];

        directions.forEach(([dRow, dCol]) => {
            const newRow = centerRow + dRow;
            const newCol = centerCol + dCol;
            if (newRow >= 0 && newRow < this.mapHeight && newCol >= 0 && newCol < this.mapWidth) {
                this.revealHex(newRow, newCol);
            }
        });
    }

    updateExpeditions() {
        // Called each day to update expedition progress
        if (!this.expeditions || this.expeditions.length === 0) return;

        this.expeditions.forEach(expedition => {
            if (expedition.returningHome) {
                // Update return journey progress
                expedition.daysRemaining = Math.max(0, expedition.daysRemaining - 1);
                
                if (expedition.daysRemaining === 0) {
                    // Scouts have returned home - they'll be processed by completeExpedition
                    expedition.status = 'complete';
                }
            } else if (expedition.status === 'traveling') {
                // Update travel progress
                const daysPassed = window.gameState.currentDay - expedition.startDay;
                
                if (daysPassed >= expedition.travelDistance) {
                    // Scouts have arrived at destination
                    expedition.status = 'stationed';
                    expedition.isStationed = true;
                    
                    // Reveal the target hex and surrounding area
                    this.revealHex(expedition.targetHex.row, expedition.targetHex.col);
                    this.revealSurroundingHexes(expedition.targetHex.row, expedition.targetHex.col);
                    
                    // Show arrival notification
                    window.showToast(`🔍 Scouts have arrived at hex (${expedition.targetHex.row}, ${expedition.targetHex.col}) and are scouting the area!`, {
                        icon: '🗺️',
                        type: 'success',
                        timeout: 4000
                    });
                }
            }
        });

        // Update expedition display in the expeditions list
        this.updateExpeditionsList();
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

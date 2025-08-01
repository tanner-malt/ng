// Village management system
class VillageManager {
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;
        this.villageGrid = null;
        this.gridSize = 50; // Size of each grid cell
        this.supplyChains = []; // For carriages/runners visualization
        // Tutorial tracking
        this.tutorialBuildings = new Set();
        
        // Terrain system
        this.terrain = [];
        this.terrainWidth = 16; // Number of terrain tiles horizontally
        this.terrainHeight = 10; // Number of terrain tiles vertically
        this.terrainTypes = {
            grass: { symbol: '🌱', buildable: true, modifier: 'none', color: '#4a7c59' },
            forest: { symbol: '🌲', buildable: false, modifier: 'wood_bonus', color: '#2d5a27' },
            hills: { symbol: '⛰️', buildable: true, modifier: 'stone_bonus', color: '#8b7355' },
            water: { symbol: '💧', buildable: false, modifier: 'none', color: '#4a90e2' },
            fertile: { symbol: '🌾', buildable: true, modifier: 'food_bonus', color: '#6b8e23' },
            rocky: { symbol: '🗻', buildable: false, modifier: 'none', color: '#696969' }
        };
    }
    
    init() {
        try {
            this.villageGrid = document.getElementById('village-grid');
            if (!this.villageGrid) {
                console.error('[Village] village-grid element not found');
                return;
            }
            
            console.log('[Village] Generating realistic terrain...');
            this.generateTerrain();
            this.renderTerrain();
            
            console.log('[Village] Setting up building buttons...');
            this.setupBuildingButtons();
            console.log('[Village] Rendering buildings...');
            this.renderBuildings();
            console.log('[Village] Rendering building sites...');
            this.renderBuildingSites();
            console.log('[Village] Setting up grid click...');
            this.setupGridClick();
            console.log('[Village] Setting up end day button...');
            this.setupEndDayButton();
            this.gameState.updateBuildButtons();
            this.initSupplyChains();
            console.log('[Village] Village initialization complete');
        } catch (error) {
            console.error('[Village] Error during initialization:', error);
        }
    }
    
    setupBuildingButtons() {
        document.querySelectorAll('.building-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const buildingType = btn.dataset.building;
                console.log(`[Village] Building button clicked: ${buildingType}`);
                if (this.gameState.canAfford(buildingType)) {
                    this.enterBuildMode(buildingType);
                } else {
                    console.log(`[Village] Cannot afford ${buildingType}`);
                    this.showMessage('Insufficient Resources', `You need more resources to build a ${buildingType}.`);
                }
            });
        });
    }
    
    setupEndDayButton() {
        const endDayBtn = document.getElementById('end-day-btn');
        if (endDayBtn) {
            endDayBtn.addEventListener('click', () => {
                this.gameState.endDay();
                
                // Visual feedback
                endDayBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    endDayBtn.style.transform = '';
                }, 150);
            });
        }
    }
    
    enterBuildMode(buildingType) {
        console.log(`[Village] Entering build mode for: ${buildingType}`);
        
        // Clear any existing build mode
        this.exitBuildMode();
        
        this.gameState.buildMode = buildingType;
        this.villageGrid.classList.add('build-mode');
        this.villageGrid.style.cursor = 'crosshair';
        
        console.log(`[Village] Build mode active, cursor should be crosshair`);
        
        // Highlight the selected button
        const selectedBtn = document.querySelector(`[data-building="${buildingType}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
            console.log(`[Village] Button highlighted for ${buildingType}`);
        } else {
            console.warn(`[Village] Could not find button for ${buildingType}`);
        }
        
        // Show ghost building preview on hover
        this.setupBuildPreview();
    }
    
    exitBuildMode() {
        this.gameState.buildMode = null;
        this.villageGrid.classList.remove('build-mode');
        this.villageGrid.style.cursor = 'default';
        
        // Remove selection from all buttons
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Remove ghost preview
        const ghostBuilding = this.villageGrid.querySelector('.ghost-building');
        if (ghostBuilding) {
            ghostBuilding.remove();
        }
    }
    
    setupBuildPreview() {
        let ghostBuilding = null;
        
        const mouseMoveHandler = (e) => {
            if (!this.gameState.buildMode) return;
            
            const rect = this.villageGrid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.gridSize) * this.gridSize;
            const y = Math.floor((e.clientY - rect.top) / this.gridSize) * this.gridSize;
            
            // Remove existing ghost
            if (ghostBuilding) {
                ghostBuilding.remove();
            }
            
            // Create new ghost building
            if (this.isPositionFree(x, y)) {
                ghostBuilding = document.createElement('div');
                ghostBuilding.className = `building ghost-building ${this.gameState.buildMode}`;
                ghostBuilding.style.left = x + 'px';
                ghostBuilding.style.top = y + 'px';
                ghostBuilding.style.opacity = '0.5';
                ghostBuilding.textContent = this.getBuildingSymbol(this.gameState.buildMode);
                this.villageGrid.appendChild(ghostBuilding);
            }
        };
        
        const mouseLeaveHandler = () => {
            if (ghostBuilding) {
                ghostBuilding.remove();
                ghostBuilding = null;
            }
        };
        
        this.villageGrid.addEventListener('mousemove', mouseMoveHandler);
        this.villageGrid.addEventListener('mouseleave', mouseLeaveHandler);
        
        // Clean up listeners when exiting build mode
        const originalExitBuildMode = this.exitBuildMode.bind(this);
        this.exitBuildMode = () => {
            this.villageGrid.removeEventListener('mousemove', mouseMoveHandler);
            this.villageGrid.removeEventListener('mouseleave', mouseLeaveHandler);
            originalExitBuildMode();
        };
    }
    
    setupGridClick() {
        this.villageGrid.addEventListener('click', (e) => {
            if (!this.gameState.buildMode) return;
            
            const rect = this.villageGrid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.gridSize) * this.gridSize;
            const y = Math.floor((e.clientY - rect.top) / this.gridSize) * this.gridSize;
            
            // Check if position is free and within bounds
            if (this.isPositionFree(x, y) && this.isWithinBounds(x, y)) {
                // Temporarily disable terrain check for debugging
                // if (!this.isTerrainBuildable(x, y)) {
                //     console.log('[Village] Cannot build on this terrain type');
                //     if (window.modalSystem) {
                //         const terrainType = this.getTerrainAt(x, y);
                //         const terrainInfo = this.terrainTypes[terrainType];
                //         window.modalSystem.showMessage(
                //             'Cannot Build Here',
                //             `Cannot build on ${terrainType} terrain ${terrainInfo.symbol}. Look for buildable terrain like grass 🌱, hills ⛰️, or fertile land 🌾.`
                //         );
                //     }
                //     return;
                // }
                
                // Verify we have a valid buildMode before proceeding
                if (!this.gameState.buildMode) {
                    console.error('[Village] Cannot place building: buildMode is invalid');
                    this.exitBuildMode();
                    return;
                }
                
                this.placeBuilding(this.gameState.buildMode, x, y);
                const spendSuccess = this.gameState.spend(this.gameState.buildMode);
                
                if (spendSuccess) {
                    this.exitBuildMode();
                    // Start supply chain if applicable
                    this.updateSupplyChains();
                } else {
                    console.error('[Village] Failed to spend resources for building');
                    // Maybe remove the building that was placed if spending failed
                }
            }
        });
    }
    
    isPositionFree(x, y) {
        return !this.gameState.buildings.some(building => 
            building.x === x && building.y === y
        );
    }
    
    isWithinBounds(x, y) {
        const rect = this.villageGrid.getBoundingClientRect();
        return x >= 0 && y >= 0 && x < rect.width - this.gridSize && y < rect.height - this.gridSize;
    }
    
    placeBuilding(type, x, y) {
        // Check if we can afford the building
        if (!this.gameState.canAfford(type)) {
            this.showMessage('Insufficient Resources', 'You don\'t have enough resources to build this structure.');
            return;
        }
        
        // Spend resources first
        const spendSuccess = this.gameState.spend(type);
        if (!spendSuccess) {
            console.error('[Village] Failed to spend resources for building');
            this.showMessage('Construction Failed', 'Unable to spend resources for construction.');
            return;
        }
        
        // Queue building for construction
        const buildingId = this.gameState.queueBuilding(type, x, y);
        
        // Show construction confirmation modal
        this.showConstructionModal(type, x, y);
        
        // Render building sites to show construction progress
        this.renderBuildingSites();
        
        // Milestone-based unlocking (for tutorial)
        if (this.game && this.game.tutorialActive && this.game.unlockView) {
            if (type === 'townCenter') {
                this.game.unlockView('battle');
            }
            if (type === 'farm') {
                this.game.unlockView('monarch');
            }
            if (type === 'house') {
                this.game.unlockView('throne');
            }
        }
        
        this.exitBuildMode();
    }
    
    startBuildingProduction(buildingId) {
        setTimeout(() => {
            const buildingEl = this.villageGrid.querySelector(`[data-building-id="${buildingId}"]`);
            if (buildingEl) {
                buildingEl.classList.add('producing');
            }
        }, 1000);
    }
    
    showConstructionModal(type, x, y) {
        const modal = document.getElementById('construction-modal');
        const message = document.getElementById('construction-message');
        const resourceList = document.getElementById('resource-spent-list');
        const timeText = document.getElementById('construction-time-text');
        
        if (!modal) return;
        
        // Update modal content
        const buildingName = type.charAt(0).toUpperCase() + type.slice(1);
        message.textContent = `${buildingName} construction site has been established!`;
        
        // Show resources spent
        const cost = this.gameState.buildingCosts[type];
        resourceList.innerHTML = '';
        Object.entries(cost).forEach(([resource, amount]) => {
            const resourceItem = document.createElement('div');
            resourceItem.className = 'resource-item';
            resourceItem.textContent = `-${amount} ${resource}`;
            resourceList.appendChild(resourceItem);
        });
        
        // Show construction time
        const constructionTime = this.gameState.getBuildingConstructionTime(type);
        timeText.textContent = `Construction will complete in ${constructionTime} hours during expeditions`;
        
        // Show modal
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // Auto-close after 4 seconds
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }, 4000);
    }
    
    renderBuildingSites() {
        // Clear existing building sites
        this.villageGrid.querySelectorAll('.building-site').forEach(el => el.remove());
        
        // Render building sites for queued buildings
        this.gameState.buildingQueue.forEach(buildingProject => {
            const siteEl = document.createElement('div');
            siteEl.className = 'building-site';
            siteEl.style.left = buildingProject.x + 'px';
            siteEl.style.top = buildingProject.y + 'px';
            siteEl.dataset.buildingId = buildingProject.id;
            siteEl.dataset.buildingType = buildingProject.type;
            
            // Calculate progress percentage
            const totalTime = this.gameState.getBuildingConstructionTime(buildingProject.type);
            const remaining = buildingProject.hoursRemaining;
            const progress = Math.max(0, ((totalTime - remaining) / totalTime) * 100);
            
            // Create progress ring
            const progressRing = document.createElement('div');
            progressRing.className = 'progress-ring';
            progressRing.style.setProperty('--progress', `${progress}%`);
            
            const progressInner = document.createElement('div');
            progressInner.className = 'progress-inner';
            
            // Show different icons based on progress
            if (progress < 25) {
                progressInner.textContent = '🏗️'; // Early construction
            } else if (progress < 50) {
                progressInner.textContent = '🔨'; // Mid construction
            } else if (progress < 75) {
                progressInner.textContent = '⚒️'; // Late construction
            } else {
                progressInner.textContent = '🎯'; // Nearly complete
            }
            
            progressRing.appendChild(progressInner);
            siteEl.appendChild(progressRing);
            
            // Add hover tooltip
            siteEl.title = `${buildingProject.type} - ${progress.toFixed(1)}% complete`;
            
            // Add click handler to show construction progress
            siteEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showConstructionProgress(buildingProject);
            });
            
            this.villageGrid.appendChild(siteEl);
        });
        
        console.log(`[Village] Rendered ${this.gameState.buildingQueue.length} building sites`);
    }
    
    showConstructionProgress(buildingProject) {
        const buildingName = buildingProject.type.charAt(0).toUpperCase() + buildingProject.type.slice(1);
        const remaining = Math.ceil(buildingProject.hoursRemaining);
        const totalTime = this.gameState.getBuildingConstructionTime(buildingProject.type);
        const progress = Math.max(0, ((totalTime - remaining) / totalTime) * 100);
        
        this.showMessage(
            `🏗️ ${buildingName} Construction`,
            `Progress: ${progress.toFixed(1)}%\n\nTime Remaining: ${remaining} hours\n\nConstruction advances during expeditions and when ending days.`
        );
    }
    
    showMessage(title, message) {
        // Simple modal message system
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="white-space: pre-line;">${message}</p>
                </div>
            </div>
        `;
        
        // Add close handler
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }
    
    showNotification(title, message, type = 'success', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification-modal ${type}`;
        
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            construction: '🏗️'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${iconMap[type] || iconMap.success}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 400);
        }, duration);
    }
    
    showBuildingCompletionEffect(x, y) {
        // Create completion effect at building location
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.left = (x + 24) + 'px'; // Center on building
        effect.style.top = (y + 24) + 'px';
        effect.style.width = '4px';
        effect.style.height = '4px';
        effect.style.backgroundColor = '#f1c40f';
        effect.style.borderRadius = '50%';
        effect.style.zIndex = '100';
        effect.style.pointerEvents = 'none';
        effect.style.transform = 'scale(0)';
        effect.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        effect.style.boxShadow = '0 0 20px #f1c40f';
        
        this.villageGrid.appendChild(effect);
        
        // Trigger expansion animation
        setTimeout(() => {
            effect.style.transform = 'scale(15)';
            effect.style.opacity = '0';
        }, 50);
        
        // Clean up
        setTimeout(() => {
            if (effect.parentNode) {
                this.villageGrid.removeChild(effect);
            }
        }, 700);
    }
    
    renderBuildings() {
        // Clear existing buildings (but not building sites)
        this.villageGrid.querySelectorAll('.building:not(.building-site)').forEach(el => el.remove());
        
        // Render all completed buildings
        this.gameState.buildings.forEach(building => {
            const buildingEl = document.createElement('div');
            buildingEl.className = `building ${building.type}`;
            buildingEl.style.left = building.x + 'px';
            buildingEl.style.top = building.y + 'px';
            buildingEl.style.width = '48px';
            buildingEl.style.height = '48px';
            buildingEl.style.display = 'flex';
            buildingEl.style.alignItems = 'center';
            buildingEl.style.justifyContent = 'center';
            buildingEl.style.fontSize = '28px';
            buildingEl.style.backgroundColor = 'rgba(46, 204, 113, 0.3)';
            buildingEl.style.border = '2px solid #2ecc71';
            buildingEl.style.borderRadius = '8px';
            buildingEl.style.cursor = 'pointer';
            buildingEl.style.transition = 'all 0.3s ease';
            buildingEl.style.position = 'absolute';
            buildingEl.style.zIndex = '10';
            
            buildingEl.textContent = this.getBuildingSymbol(building.type);
            buildingEl.title = `${building.type} (Level ${building.level}) - Click for info`;
            buildingEl.dataset.buildingId = building.id;
            
            // Add hover effect
            buildingEl.addEventListener('mouseenter', () => {
                buildingEl.style.transform = 'scale(1.1)';
                buildingEl.style.backgroundColor = 'rgba(46, 204, 113, 0.5)';
            });
            
            buildingEl.addEventListener('mouseleave', () => {
                buildingEl.style.transform = 'scale(1)';
                buildingEl.style.backgroundColor = 'rgba(46, 204, 113, 0.3)';
            });
            
            // Add click handler for building info/upgrade
            buildingEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showBuildingInfo(building);
            });
            
            this.villageGrid.appendChild(buildingEl);
        });
        
        console.log(`[Village] Rendered ${this.gameState.buildings.length} completed buildings`);
    }
    
    showBuildingInfo(building) {
        if (this.gameState.buildMode) return; // Don't show info in build mode
        
        // Simple building info display
        const production = this.gameState.buildingProduction[building.type];
        let productionText = 'No production';
        
        if (production) {
            productionText = Object.keys(production).map(resource => 
                `+${production[resource]} ${resource}/5s`
            ).join(', ');
        }
        
        alert(`${building.type.toUpperCase()} (Level ${building.level})\n\nProduction: ${productionText}\n\nUpgrade feature coming soon!`);
    }
    
    getBuildingSymbol(type) {
        const symbols = {
            house: '🏠',
            farm: '🌾',
            townCenter: '🏛️',
            barracks: '⚔️'
        };
        return symbols[type] || '?';
    }
    
    initSupplyChains() {
        // Initialize supply chain visualization
        this.updateSupplyChains();
        
        // Update supply chains periodically
        setInterval(() => {
            this.updateSupplyChains();
            this.animateSupplyMovement();
        }, 3000);
    }
    
    updateSupplyChains() {
        // Clear existing supply routes
        this.villageGrid.querySelectorAll('.supply-route, .carriage').forEach(el => el.remove());
        
        // Find town center
        const townCenter = this.gameState.buildings.find(b => b.type === 'townCenter');
        if (!townCenter) return;
        
        // Create supply routes from production buildings to town center
        this.gameState.buildings.forEach(building => {
            if (building.type === 'farm' || building.type === 'barracks') {
                this.createSupplyRoute(building, townCenter);
            }
        });
    }
    
    createSupplyRoute(fromBuilding, toBuilding) {
        // Calculate route path
        const startX = fromBuilding.x + 22; // Center of building
        const startY = fromBuilding.y + 22;
        const endX = toBuilding.x + 22;
        const endY = toBuilding.y + 22;
        
        // Create route line
        const route = document.createElement('div');
        route.className = 'supply-route';
        route.style.position = 'absolute';
        route.style.left = Math.min(startX, endX) + 'px';
        route.style.top = Math.min(startY, endY) + 'px';
        route.style.width = Math.abs(endX - startX) + 'px';
        route.style.height = Math.abs(endY - startY) + 'px';
        route.style.border = '2px dashed rgba(255, 255, 255, 0.3)';
        route.style.pointerEvents = 'none';
        
        this.villageGrid.appendChild(route);
        
        // Create moving carriage
        this.createCarriage(startX, startY, endX, endY, fromBuilding.type);
    }
    
    createCarriage(startX, startY, endX, endY, sourceType) {
        const carriage = document.createElement('div');
        carriage.className = 'carriage';
        carriage.style.position = 'absolute';
        carriage.style.left = startX + 'px';
        carriage.style.top = startY + 'px';
        carriage.style.width = '20px';
        carriage.style.height = '20px';
        carriage.style.background = '#f39c12';
        carriage.style.borderRadius = '50%';
        carriage.style.transition = 'all 2s linear';
        carriage.style.zIndex = '10';
        carriage.textContent = sourceType === 'farm' ? '🚛' : '⚔️';
        carriage.style.fontSize = '12px';
        carriage.style.display = 'flex';
        carriage.style.alignItems = 'center';
        carriage.style.justifyContent = 'center';
        
        this.villageGrid.appendChild(carriage);
        
        // Animate movement
        setTimeout(() => {
            carriage.style.left = endX + 'px';
            carriage.style.top = endY + 'px';
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            if (carriage.parentNode) {
                carriage.remove();
            }
        }, 2500);
    }
    
    animateSupplyMovement() {
        // This will be called periodically to show ongoing supply movement
        const townCenter = this.gameState.buildings.find(b => b.type === 'townCenter');
        if (!townCenter) return;
        
        // Animate supply movement from production buildings
        this.gameState.buildings.forEach(building => {
            if ((building.type === 'farm' || building.type === 'barracks') && Math.random() > 0.5) {
                const startX = building.x + 22;
                const startY = building.y + 22;
                const endX = townCenter.x + 22;
                const endY = townCenter.y + 22;
                
                this.createCarriage(startX, startY, endX, endY, building.type);
            }
        });
    }
    
    // Automation features based on prestige level
    getAutomationLevel() {
        return this.gameState.automationLevel;
    }
    
    autoAssignCitizens() {
        // This would automatically assign villagers to optimal jobs
        // Implementation depends on automation level from prestige
        if (this.getAutomationLevel() !== 'manual') {
            // Auto-assign logic here
            // ...
        }
    }

    // Terrain Generation System - Realistic Layout
    generateTerrain() {
        try {
            console.log('[Village] Starting realistic terrain generation...');
            this.terrain = [];
            
            // Create a realistic terrain layout
            for (let y = 0; y < this.terrainHeight; y++) {
                this.terrain[y] = [];
                for (let x = 0; x < this.terrainWidth; x++) {
                    this.terrain[y][x] = this.generateRealisticTerrain(x, y);
                }
            }
            
            console.log('[Village] Realistic terrain generation complete');
        } catch (error) {
            console.error('[Village] Error generating terrain:', error);
            // Fallback to all grass terrain
            this.terrain = [];
            for (let y = 0; y < this.terrainHeight; y++) {
                this.terrain[y] = [];
                for (let x = 0; x < this.terrainWidth; x++) {
                    this.terrain[y][x] = 'grass';
                }
            }
        }
    }
    
    generateRealisticTerrain(x, y) {
        // Create a realistic village layout:
        // - River running through the middle
        // - Forest on edges for wood
        // - Hills in corners for stone
        // - Fertile areas near river
        // - Central grassland for building
        
        const centerX = this.terrainWidth / 2;
        const centerY = this.terrainHeight / 2;
        
        // River running diagonally through the map
        if (Math.abs((x - y) - (centerX - centerY)) <= 1.5) {
            return 'water';
        }
        
        // Forest on left and right edges
        if (x <= 1 || x >= this.terrainWidth - 2) {
            return 'forest';
        }
        
        // Hills in corners for stone resources
        if ((x <= 2 && y <= 2) || (x >= this.terrainWidth - 3 && y >= this.terrainHeight - 3) ||
            (x <= 2 && y >= this.terrainHeight - 3) || (x >= this.terrainWidth - 3 && y <= 2)) {
            return 'hills';
        }
        
        // Fertile land near the river (within 2 tiles)
        const distanceToRiver = Math.abs((x - y) - (centerX - centerY));
        if (distanceToRiver >= 2 && distanceToRiver <= 3) {
            return 'fertile';
        }
        
        // Rocky outcrops in specific spots for challenge
        if ((x === 5 && y === 3) || (x === 10 && y === 6) || (x === 12 && y === 2)) {
            return 'rocky';
        }
        
        // Default to grass for building areas
        return 'grass';
    }
    
    renderTerrain() {
        // Clear existing terrain
        this.villageGrid.querySelectorAll('.terrain-tile').forEach(el => el.remove());
        
        // Render terrain tiles
        for (let y = 0; y < this.terrainHeight; y++) {
            for (let x = 0; x < this.terrainWidth; x++) {
                const terrainType = this.terrain[y][x];
                const terrainInfo = this.terrainTypes[terrainType];
                
                const terrainEl = document.createElement('div');
                terrainEl.className = `terrain-tile ${terrainType}`;
                terrainEl.style.left = (x * this.gridSize) + 'px';
                terrainEl.style.top = (y * this.gridSize) + 'px';
                terrainEl.style.width = this.gridSize + 'px';
                terrainEl.style.height = this.gridSize + 'px';
                terrainEl.style.backgroundColor = terrainInfo.color;
                terrainEl.style.position = 'absolute';
                terrainEl.style.border = '1px solid rgba(255,255,255,0.1)';
                terrainEl.style.boxSizing = 'border-box';
                terrainEl.style.display = 'flex';
                terrainEl.style.alignItems = 'center';
                terrainEl.style.justifyContent = 'center';
                terrainEl.style.fontSize = '14px';
                terrainEl.style.zIndex = '1';
                terrainEl.textContent = terrainInfo.symbol;
                terrainEl.title = `${terrainType} - ${terrainInfo.buildable ? 'Buildable' : 'Non-buildable'}`;
                
                // Add terrain data for gameplay
                terrainEl.dataset.terrainType = terrainType;
                terrainEl.dataset.x = x;
                terrainEl.dataset.y = y;
                
                this.villageGrid.appendChild(terrainEl);
            }
        }
    }
    
    getTerrainAt(x, y) {
        const tileX = Math.floor(x / this.gridSize);
        const tileY = Math.floor(y / this.gridSize);
        
        if (tileX >= 0 && tileX < this.terrainWidth && tileY >= 0 && tileY < this.terrainHeight) {
            return this.terrain[tileY][tileX];
        }
        return null;
    }
    
    isTerrainBuildable(x, y) {
        const terrainType = this.getTerrainAt(x, y);
        return terrainType ? this.terrainTypes[terrainType].buildable : false;
    }
    
    getTerrainModifier(x, y) {
        const terrainType = this.getTerrainAt(x, y);
        return terrainType ? this.terrainTypes[terrainType].modifier : 'none';
    }
}

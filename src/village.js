
// Village management system
class VillageManager {
    // Duplicate constructor removed

    // Returns the number of worker slots for a building (equal to its level)
    getWorkerSlotsForBuilding(building) {
        return building.level || 0;
    }

    // Returns the population assigned to a building
    getAssignedWorkers(building) {
        if (!this.gameState.populationManager) return [];
        return this.gameState.populationManager.population.filter(p => p.buildingId === building.id && p.status === 'working');
    }

    // Returns eligible population for a building type (young adults/adults, correct role)
    getEligibleWorkers(building) {
        if (!this.gameState.populationManager) return [];
        const role = window.GameData.getDefaultRoleForBuilding(building.type);
        return this.gameState.populationManager.population.filter(p => {
            // Only young adults/adults, not already assigned
            return (p.age >= 10 && p.age <= 30) && p.status !== 'working' && (p.role === role || p.role === 'peasant');
        });
    }

    // Assigns workers to all buildings up to their slot limit
    autoAssignCitizens() {
        if (!this.gameState.populationManager) return;
        // For each building that can have workers
        this.gameState.buildings.forEach(building => {
            const role = window.GameData.getDefaultRoleForBuilding(building.type);
            if (!role || role === 'peasant') return; // skip non-work buildings
            const slots = this.getWorkerSlotsForBuilding(building);
            let assigned = this.getAssignedWorkers(building);
            if (assigned.length >= slots) return; // already full
            const needed = slots - assigned.length;
            const eligible = this.getEligibleWorkers(building).slice(0, needed);
            eligible.forEach(worker => {
                this.gameState.populationManager.assignRole(worker.id, role);
                this.gameState.populationManager.updateStatus(worker.id, 'working');
                this.gameState.populationManager.moveInhabitant(worker.id, building.id);
            });
        });
    }
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
            this.generateBuildingButtons();
            this.setupBuildingButtons();
            console.log('[Village] Rendering buildings...');
            this.renderBuildings();
            console.log('[Village] Rendering building sites...');
            this.renderBuildingSites();
            console.log('[Village] Setting up grid click...');
            this.setupGridClick();
            console.log('[Village] Setting up grid dragging...');
            this.setupGridDragging();
            console.log('[Village] Setting up end day button...');
            this.setupEndDayButton();
            this.gameState.updateBuildButtons();
            this.initSupplyChains();
            console.log('[Village] Setting up production planner...');
            this.initProductionPlanner();
            console.log('[Village] Setting up population view button...');
            this.setupPopulationViewButton();
            console.log('[Village] Village initialization complete');
        } catch (error) {
            console.error('[Village] Error during initialization:', error);
        }
    }
    
    // Generate building buttons dynamically from GameData
    generateBuildingButtons() {
        const buildingList = document.getElementById('building-list');
        if (!buildingList) {
            console.error('[Village] building-list element not found');
            return;
        }

        // Clear existing buttons
        buildingList.innerHTML = '';

        // Get all building types from gameState instead of hardcoding
        const buildingTypes = this.gameState.getAllBuildingTypes();
        
        buildingTypes.forEach(buildingType => {
            if (GameData.buildingInfo[buildingType]) {
                const button = document.createElement('button');
                button.id = `build-${buildingType}`;
                button.className = 'build-btn';
                button.dataset.building = buildingType;
                button.textContent = GameData.formatBuildingButton(buildingType);
                buildingList.appendChild(button);
            }
        });

        console.log('[Village] Generated', buildingTypes.length, 'building buttons from gameState');
    }
    
    setupBuildingButtons() {
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const buildingType = btn.dataset.building;
                console.log(`[Village] Building button clicked: ${buildingType}`);
                // Check both affordability and unlock status
                if (!this.gameState.isBuildingUnlocked(buildingType)) {
                    console.log(`[Village] Building ${buildingType} is locked`);
                    this.showMessage('Building Locked', `Complete prerequisite buildings to unlock ${buildingType}.`);
                    return;
                }
                if (this.gameState.canAfford(buildingType)) {
                    this.enterBuildMode(buildingType);
                } else {
                    console.log(`[Village] Cannot afford ${buildingType}`);
                    this.showMessage('Insufficient Resources', `You need more resources to build a ${buildingType}.`);
                }
            });

            // On hover, update button state based on current resources and unlocks
            btn.addEventListener('mouseenter', () => {
                const buildingType = btn.dataset.building;
                if (!buildingType) return;
                const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
                const canAfford = this.gameState.canAfford(buildingType);
                btn.disabled = !isUnlocked || !canAfford;
                if (!isUnlocked) {
                    btn.classList.add('locked');
                    btn.style.opacity = '0.5';
                    btn.title = `Locked: Complete prerequisites to unlock ${buildingType}`;
                } else {
                    btn.classList.remove('locked');
                    btn.style.opacity = '1';
                    if (!canAfford) {
                        btn.title = `Insufficient resources for ${buildingType}`;
                    } else {
                        btn.title = `Build ${buildingType}`;
                    }
                }
            });
        });
    }

    // Update available buildings based on unlock status
    updateAvailableBuildings() {
        console.log('[Village] Updating available buildings based on unlocks');
        
        document.querySelectorAll('.build-btn').forEach(btn => {
            const buildingType = btn.dataset.building;
            if (buildingType) {
                const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
                const canAfford = this.gameState.canAfford(buildingType);
                
                // Update button state
                btn.disabled = !isUnlocked || !canAfford;
                
                // Visual feedback for unlock status
                if (!isUnlocked) {
                    btn.classList.add('locked');
                    btn.style.opacity = '0.5';
                    btn.title = `Locked: Complete prerequisites to unlock ${buildingType}`;
                } else {
                    btn.classList.remove('locked');
                    btn.style.opacity = '1';
                    
                    if (!canAfford) {
                        btn.title = `Insufficient resources for ${buildingType}`;
                    } else {
                        btn.title = `Build ${buildingType}`;
                    }
                }
            }
        });
        
        // Also update any building selection UI if it exists
        this.updateBuildingSelectionUI();
    }

    // Update building selection UI elements
    updateBuildingSelectionUI() {
        // Update any building selection menus or panels
        const buildingPanel = document.getElementById('building-panel');
        if (buildingPanel) {
            // Refresh the building panel content if it exists
            const availableBuildings = this.getAvailableBuildings();
            // Update panel display based on available buildings
        }
    }

    // Get list of currently available (unlocked) buildings
    getAvailableBuildings() {
        return this.gameState.getAvailableBuildingTypes();
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
        console.log('[Village] Exiting build mode...');
        
        this.gameState.buildMode = null;
        this.villageGrid.classList.remove('build-mode');
        
        // Remove any inline cursor styles and let CSS take over
        this.villageGrid.style.removeProperty('cursor');
        
        // Also reset body cursor to ensure no ghost cursor
        document.body.style.cursor = 'default';
        
        // Remove selection from all buttons
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Remove ghost preview
        const ghostBuildings = this.villageGrid.querySelectorAll('.ghost-building');
        ghostBuildings.forEach(ghost => ghost.remove());
        
        console.log('[Village] Build mode exited, cursor reset to default');
        console.log('[Village] Build mode class removed:', !this.villageGrid.classList.contains('build-mode'));
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
            // Don't allow building placement if we just finished dragging
            if (this.villageGrid.classList.contains('dragging')) {
                return;
            }
            
            if (!this.gameState.buildMode) return;
            
            const rect = this.villageGrid.getBoundingClientRect();
            // Adjust coordinates for the current view offset if it exists
            const offsetX = this.viewOffsetX || 0;
            const offsetY = this.viewOffsetY || 0;
            const x = Math.floor((e.clientX - rect.left - offsetX) / this.gridSize) * this.gridSize;
            const y = Math.floor((e.clientY - rect.top - offsetY) / this.gridSize) * this.gridSize;
            
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
                
                // Check if we can afford the building before proceeding
                if (!this.gameState.canAfford(this.gameState.buildMode)) {
                    console.log('[Village] Cannot afford building');
                    this.showMessage('Insufficient Resources', 'You don\'t have enough resources to build this structure.');
                    return;
                }
                
                // Place the building (this handles spending resources internally)
                this.placeBuilding(this.gameState.buildMode, x, y);
                this.exitBuildMode();
                
                // Start supply chain if applicable
                this.updateSupplyChains();
            }
        });
        
        // Add right-click to exit build mode
        this.villageGrid.addEventListener('contextmenu', (e) => {
            if (this.gameState.buildMode) {
                e.preventDefault(); // Prevent context menu
                console.log('[Village] Right-click detected, exiting build mode');
                this.exitBuildMode();
            }
        });
    }
    
    setupGridDragging() {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let viewOffsetX = 0;
        let viewOffsetY = 0;
        
        // Create a container for all grid content that can be moved
        const gridContent = document.createElement('div');
        gridContent.className = 'village-grid-content';
        gridContent.style.position = 'absolute';
        gridContent.style.width = '200%'; // Make content area larger than viewport
        gridContent.style.height = '200%';
        gridContent.style.top = '0';
        gridContent.style.left = '0';
        gridContent.style.transition = 'none';
        
        // Move all existing grid children into the content container
        while (this.villageGrid.firstChild) {
            gridContent.appendChild(this.villageGrid.firstChild);
        }
        this.villageGrid.appendChild(gridContent);
        
        // Store reference to content container and offset for building placement
        this.villageGridContent = gridContent;
        this.viewOffsetX = 0;
        this.viewOffsetY = 0;
        
        this.villageGrid.addEventListener('mousedown', (e) => {
            // Start dragging on left mouse button
            if (e.button !== 0) return;
            
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            this.villageGrid.classList.add('dragging');
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            viewOffsetX += deltaX;
            viewOffsetY += deltaY;
            
            // Apply bounds to prevent panning too far
            const maxOffset = 400;
            viewOffsetX = Math.max(-maxOffset, Math.min(maxOffset, viewOffsetX));
            viewOffsetY = Math.max(-maxOffset, Math.min(maxOffset, viewOffsetY));
            
            // Update the stored offsets
            this.viewOffsetX = viewOffsetX;
            this.viewOffsetY = viewOffsetY;
            
            this.villageGridContent.style.transform = `translate(${viewOffsetX}px, ${viewOffsetY}px)`;
            
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
        });
        
        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                this.villageGrid.classList.remove('dragging');
            }
        });
        
        // Reset view on double-click
        this.villageGrid.addEventListener('dblclick', (e) => {
            if (!this.gameState.buildMode) {
                viewOffsetX = 0;
                viewOffsetY = 0;
                this.viewOffsetX = 0;
                this.viewOffsetY = 0;
                this.villageGridContent.style.transform = 'translate(0px, 0px)';
                e.preventDefault();
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
        console.log('[Village] placeBuilding called with:', { type, x, y });
        
        // Check if we can afford the building
        if (!this.gameState.canAfford(type)) {
            console.log('[Village] Cannot afford building:', type);
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
        console.log('[Village] Building queued with ID:', buildingId);
        
        // Trigger tutorial event for building placement
        if (window.eventBus) {
            const eventData = { type: type, x: x, y: y, id: buildingId };
            console.log('[Village] Emitting building_placed event with data:', eventData);
            window.eventBus.emit('building_placed', eventData);
            console.log('[Village] building_placed event emitted successfully');
        } else {
            console.error('[Village] EventBus not available for building_placed event');
        }

        // Trigger building achievement
        if (window.achievementSystem) {
            window.achievementSystem.triggerBuildingPlaced(type);
        }

        // Check for new unlocks after building placement
        if (window.unlockSystem) {
            setTimeout(() => {
                window.unlockSystem.checkAllUnlocks();
            }, 100);
        }
        
        // Toast notification is now handled by gameState.queueBuilding()
        // No need for duplicate notifications here
        
        // Re-render buildings to show construction site immediately (level 0 building)
        this.renderBuildings();
        
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
        
        // Show resources spent (from GameData)
        const cost = GameData.buildingCosts[type];
        resourceList.innerHTML = '';
        Object.entries(cost).forEach(([resource, amount]) => {
            const resourceItem = document.createElement('div');
            resourceItem.className = 'resource-item';
            resourceItem.textContent = `-${amount} ${resource}`;
            resourceList.appendChild(resourceItem);
        });

        // Show construction time (from GameData)
        const constructionTime = GameData.constructionTimes[type] || 2;
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
        const container = this.getGridContainer();
        // Clear existing building sites - no longer needed since level 0 buildings
        // are now rendered directly as regular buildings with construction icons
        container.querySelectorAll('.building-site').forEach(el => el.remove());
        
        // Count level 0 buildings for debugging
        const constructionSites = this.gameState.buildings.filter(b => b.level === 0).length;
        console.log(`[Village] ${constructionSites} buildings under construction (level 0)`);
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
        const container = this.getGridContainer();
        // Clear existing buildings (but not building sites)
        container.querySelectorAll('.building:not(.building-site)').forEach(el => el.remove());
        
        console.log('[Village] Rendering buildings - count:', this.gameState.buildings.length);
        
        // Render all completed buildings
        this.gameState.buildings.forEach(building => {
            console.log('[Village] Rendering building:', building.type, 'at', building.x, building.y);
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
            
            buildingEl.textContent = this.getBuildingSymbol(building.type, building.level);
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
            
            container.appendChild(buildingEl);
        });
        
        console.log(`[Village] Rendered ${this.gameState.buildings.length} completed buildings`);
    }
    
    showBuildingInfo(building) {
        if (this.gameState.buildMode) return; // Don't show info in build mode
        
        // Get building details from GameData
        const production = GameData.buildingProduction[building.type];
        const buildingCost = GameData.buildingCosts[building.type];
        const isUnderConstruction = building.level === 0;
        
        let contentHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="font-size: 24px; margin-bottom: 5px;">${this.getBuildingSymbol(building.type, building.level)}</div>
                <div style="font-weight: bold; color: #3498db;">${building.type.toUpperCase()}</div>
                <div style="color: #bdc3c7; font-size: 12px;">Level ${building.level}</div>
            </div>
        `;

        if (isUnderConstruction) {
            const daysLeft = Math.max(0, GameData.buildingCosts[building.type].time - building.constructionProgress);
            contentHTML += `
                <div style="background: rgba(241, 196, 15, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #f1c40f;">
                    <div style="color: #f1c40f; font-weight: bold; font-size: 12px;">🏗️ UNDER CONSTRUCTION</div>
                    <div style="color: #ecf0f1; font-size: 11px;">Progress: ${building.constructionProgress}/${GameData.buildingCosts[building.type].time} days</div>
                    <div style="color: #ecf0f1; font-size: 11px;">${daysLeft} days remaining</div>
                </div>
            `;
        }

        // Production info
        if (production) {
            contentHTML += `<div style="margin-bottom: 10px;">
                <div style="color: #2ecc71; font-weight: bold; font-size: 12px; margin-bottom: 4px;">📊 PRODUCTION:</div>
            `;
            Object.keys(production).forEach(resource => {
                const amount = production[resource] * building.level;
                const resourceIcon = {
                    food: '🌾',
                    wood: '🪵', 
                    stone: '🪨',
                    population: '👥',
                    efficiency: '⚡',
                    soldiers: '⚔️'
                }[resource] || '📦';
                
                contentHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="color: #ecf0f1; font-size: 11px;">${resourceIcon} ${resource}</span>
                        <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">+${amount}</span>
                    </div>
                `;
            });
            contentHTML += `</div>`;
        }

        // Building cost (for reference)
        if (buildingCost) {
            contentHTML += `<div style="margin-bottom: 10px;">
                <div style="color: #e67e22; font-weight: bold; font-size: 12px; margin-bottom: 4px;">💰 COST:</div>
            `;
            Object.keys(buildingCost).forEach(resource => {
                const amount = buildingCost[resource];
                const resourceIcon = {
                    food: '🌾',
                    wood: '🪵', 
                    stone: '🪨',
                    metal: '⚒️',
                    gold: '💰'
                }[resource] || '📦';
                
                contentHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="color: #ecf0f1; font-size: 11px;">${resourceIcon} ${resource}</span>
                        <span style="color: #e67e22; font-size: 11px;">${amount}</span>
                    </div>
                `;
            });
            contentHTML += `</div>`;
        }

        // Upgrade info (coming soon)
        contentHTML += `
            <div style="background: rgba(52, 152, 219, 0.2); padding: 6px; border-radius: 4px; text-align: center; border: 1px solid #3498db;">
                <div style="color: #3498db; font-size: 11px;">🔧 Upgrade feature coming soon!</div>
            </div>
        `;

        // Get the building element for positioning
        const buildingElements = document.querySelectorAll(`[data-building-id="${building.id}"]`);
        const targetElement = buildingElements.length > 0 ? buildingElements[0] : null;

        // Show mini modal
        if (window.modalSystem && window.modalSystem.showMiniModal) {
            window.modalSystem.showMiniModal({
                title: `${building.type} Info`,
                content: contentHTML,
                width: '280px',
                targetElement: targetElement,
                className: 'building-info-modal',
                closable: true
            });
        } else {
            // Fallback to alert if modal system not available
            let productionText = 'No production';
            if (production) {
                productionText = Object.keys(production).map(resource => 
                    `+${production[resource] * building.level} ${resource}`
                ).join(', ');
            }
            alert(`${building.type.toUpperCase()} (Level ${building.level})\n\nProduction: ${productionText}\n\nUpgrade feature coming soon!`);
        }
    }
    
    getBuildingSymbol(type, level = 1) {
        // Level 0 buildings show construction site icon
        if (level === 0) {
            return '🏗️';
        }
        
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
    
    // Helper method to get the correct container for rendering
    getGridContainer() {
        return this.villageGridContent || this.villageGrid;
    }
    
    renderTerrain() {
        const container = this.getGridContainer();
        // Clear existing terrain
        container.querySelectorAll('.terrain-tile').forEach(el => el.remove());
        
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
                
                container.appendChild(terrainEl);
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

    // Production Planner functionality
    initProductionPlanner() {
        this.setupProductionGoals();
        this.updateProductionEfficiency();
    }

    setupProductionGoals() {
        const goalInputs = document.querySelectorAll('.goal-input');
        goalInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateProductionEfficiency();
            });
        });
    }

    updateProductionEfficiency() {
        const currentProduction = this.gameState.calculateDailyProduction();
        
        // Get goal values
        const foodGoal = parseInt(document.getElementById('food-goal')?.value || 0);
        const woodGoal = parseInt(document.getElementById('wood-goal')?.value || 0);
        const stoneGoal = parseInt(document.getElementById('stone-goal')?.value || 0);
        
        // Calculate efficiency
        const foodEfficiency = foodGoal > 0 ? Math.min(100, Math.round((currentProduction.food / foodGoal) * 100)) : 100;
        const woodEfficiency = woodGoal > 0 ? Math.min(100, Math.round((currentProduction.wood / woodGoal) * 100)) : 100;
        const stoneEfficiency = stoneGoal > 0 ? Math.min(100, Math.round((currentProduction.stone / stoneGoal) * 100)) : 100;
        
        // Update efficiency bars and text
        const foodBar = document.getElementById('food-efficiency-bar');
        const woodBar = document.getElementById('wood-efficiency-bar');
        const stoneBar = document.getElementById('stone-efficiency-bar');
        
        const foodText = document.getElementById('food-efficiency-text');
        const woodText = document.getElementById('wood-efficiency-text');
        const stoneText = document.getElementById('stone-efficiency-text');
        
        if (foodBar) {
            foodBar.style.width = `${foodEfficiency}%`;
            foodBar.className = `efficiency-bar ${this.getEfficiencyClass(foodEfficiency)}`;
        }
        if (woodBar) {
            woodBar.style.width = `${woodEfficiency}%`;
            woodBar.className = `efficiency-bar ${this.getEfficiencyClass(woodEfficiency)}`;
        }
        if (stoneBar) {
            stoneBar.style.width = `${stoneEfficiency}%`;
            stoneBar.className = `efficiency-bar ${this.getEfficiencyClass(stoneEfficiency)}`;
        }
        
        if (foodText) foodText.textContent = `${foodEfficiency}%`;
        if (woodText) woodText.textContent = `${woodEfficiency}%`;
        if (stoneText) stoneText.textContent = `${stoneEfficiency}%`;
    }

    getEfficiencyClass(efficiency) {
        if (efficiency >= 100) return 'excellent';
        if (efficiency >= 80) return 'good';
        if (efficiency >= 60) return 'fair';
        if (efficiency >= 40) return 'poor';
        return 'critical';
    }

    // Resource display update method (called by eventBusIntegrations)
    updateResourceDisplay() {
        // This method is called when resources are updated
        // The actual resource display is handled by updateResourcePanel() in game.html
        // But we can update village-specific displays here if needed
        
        // Update production displays in the village manager
        // this.updateProductionDisplay(); // Removed because method does not exist
        
        // Update efficiency displays
        // this.updateEfficiencyDisplay(); // Removed because method does not exist
        
        // Update population displays
        if (this.gameState) {
            const populationEl = document.getElementById('manager-population');
            const populationCapEl = document.getElementById('manager-population-cap');
            
            if (populationEl) {
                populationEl.textContent = this.gameState.population || 0;
            }
            if (populationCapEl) {
                const cap = window.GameData?.calculatePopulationCap ? 
                    window.GameData.calculatePopulationCap(this.gameState.buildings) : 
                    (this.gameState.populationCap || 0);
                populationCapEl.textContent = cap;
            }
        }
        
        console.log('[Village] Resource display updated');
    }

    // Population View System
    setupPopulationViewButton() {
        const populationBtn = document.getElementById('population-view-btn');
        if (populationBtn) {
            populationBtn.addEventListener('click', () => {
                this.showPopulationView();
            });
            console.log('[Village] Population view button set up');
        } else {
            console.error('[Village] population-view-btn element not found');
        }
    }

    initializePopulationManager() {
        // Initialize population manager if it doesn't exist
        if (!this.gameState.populationManager && window.PopulationManager) {
            this.gameState.populationManager = new window.PopulationManager();
            console.log('[Village] PopulationManager initialized');
            
            // Generate initial population based on current population count
            this.generateInitialPopulation();
        }
    }

    generateInitialPopulation() {
        if (!this.gameState.populationManager || !window.GameData) return;
        
        const currentPop = this.gameState.population || 0;
        const existingPop = this.gameState.populationManager.getAll().length;
        
        // Generate villagers to match current population count
        for (let i = existingPop; i < currentPop; i++) {
            const villager = this.generateRandomVillager();
            this.gameState.populationManager.addInhabitant(villager);
        }
        
        console.log(`[Village] Generated ${currentPop - existingPop} villagers`);
    }

    generateRandomVillager() {
        const names = [
            'Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
            'Iris', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Peter',
            'Quinn', 'Ruby', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
            'Yara', 'Zoe', 'Aiden', 'Bella', 'Caleb', 'Diana', 'Ethan', 'Fiona'
        ];
        
        const roles = ['peasant', 'farmer', 'woodcutter', 'miner', 'builder', 'guard', 'merchant'];
        const statuses = ['idle', 'working', 'resting'];
        
        const name = names[Math.floor(Math.random() * names.length)];
        const role = roles[Math.floor(Math.random() * roles.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const age = Math.floor(Math.random() * 50) + 15; // Age 15-65
        
        // Assign building locations for working villagers
        let buildingId = null;
        if (status === 'working' && this.gameState.buildings.length > 0) {
            const randomBuilding = this.gameState.buildings[Math.floor(Math.random() * this.gameState.buildings.length)];
            buildingId = randomBuilding.id;
        }
        
        return {
            name: name,
            role: role,
            age: age,
            status: status,
            location: status === 'working' ? buildingId : 'village',
            buildingId: buildingId,
            happiness: Math.floor(Math.random() * 41) + 60, // 60-100
            health: Math.floor(Math.random() * 21) + 80, // 80-100
            skills: this.generateRandomSkills(),
            joinedDay: Math.max(1, this.gameState.currentDay - Math.floor(Math.random() * 30))
        };
    }
    
    generateRandomSkills() {
        const allSkills = ['Farming', 'Woodcutting', 'Mining', 'Building', 'Trading', 'Crafting', 'Fighting'];
        const numSkills = Math.floor(Math.random() * 3) + 1; // 1-3 skills
        const skills = [];
        
        for (let i = 0; i < numSkills; i++) {
            const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
            if (!skills.includes(skill)) {
                skills.push(skill);
            }
        }
        
        return skills;
    }

    showPopulationView() {
        // Initialize population manager if needed
        this.initializePopulationManager();
        
        if (!this.gameState.populationManager) {
            console.error('[Village] PopulationManager not available');
            if (window.modalSystem) {
                window.modalSystem.showMessage('Population Unavailable', 'Population management system is not initialized.');
            }
            return;
        }
        
        const populationData = this.gameState.populationManager.getPopulationGroups();
        
        // Generate enhanced content HTML with modern design
        let contentHTML = `
            <div class="population-overview">
                <div class="overview-header">
                    <h3><span class="header-icon">👥</span> Population Management</h3>
                    <div class="overview-subtitle">Manage your village demographics and workforce</div>
                </div>
                
                <div class="population-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏘️</div>
                        <div class="stat-content">
                            <div class="stat-value">${populationData.total}</div>
                            <div class="stat-label">Total Population</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-content">
                            <div class="stat-value">${populationData.demographics.averageAge}</div>
                            <div class="stat-label">Average Age (days)</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💪</div>
                        <div class="stat-content">
                            <div class="stat-value">${populationData.demographics.workingAge}</div>
                            <div class="stat-label">Working Age</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💼</div>
                        <div class="stat-content">
                            <div class="stat-value">${populationData.demographics.employed}</div>
                            <div class="stat-label">Employed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🍞</div>
                        <div class="stat-content">
                            <div class="stat-value">${populationData.total}</div>
                            <div class="stat-label">Daily Food Need</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚖️</div>
                        <div class="stat-content">
                            <div class="stat-value">${Math.round((populationData.demographics.maleCount / (populationData.demographics.maleCount + populationData.demographics.femaleCount) * 100) || 0)}% / ${Math.round((populationData.demographics.femaleCount / (populationData.demographics.maleCount + populationData.demographics.femaleCount) * 100) || 0)}%</div>
                            <div class="stat-label">Male / Female</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="population-sections">
                <div class="population-section">
                    <div class="section-header">
                        <h4><span class="section-icon">📊</span> Age Demographics</h4>
                        <div class="section-subtitle">Population distribution by age groups</div>
                    </div>
                    <div class="groups-container">
        `;
        
        // Enhanced age groups
        Object.entries(populationData.ageGroups).forEach(([key, group]) => {
            if (group.count > 0) {
                const percentage = Math.round((group.count / populationData.total * 100));
                contentHTML += `
                    <div class="population-group modern-group">
                        <div class="group-header">
                            <div class="group-left">
                                <span class="group-icon">${group.name.split(' ')[0]}</span>
                                <div class="group-info">
                                    <div class="group-name">${group.name}</div>
                                    <div class="group-description">${group.age}</div>
                                </div>
                            </div>
                            <div class="group-stats">
                                <div class="group-count">${group.count}</div>
                                <div class="group-percentage">${percentage}%</div>
                            </div>
                        </div>
                        <div class="group-progress">
                            <div class="progress-bg">
                                <div class="progress-fill age-${key}" style="width: ${percentage}%"></div>
                                <div class="progress-label">${group.count} villagers</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        contentHTML += `
                    </div>
                </div>
                
                <div class="population-section">
                    <div class="section-header">
                        <h4><span class="section-icon">💼</span> Employment Overview</h4>
                        <div class="section-subtitle">Workforce allocation and job distribution</div>
                    </div>
                    <div class="groups-container">
        `;
        
        // Enhanced job groups
        Object.entries(populationData.jobGroups).forEach(([key, group]) => {
            if (group.count > 0) {
                const percentage = Math.round((group.count / populationData.total * 100));
                contentHTML += `
                    <div class="population-group modern-group">
                        <div class="group-header">
                            <div class="group-left">
                                <span class="group-icon">${group.name.split(' ')[0]}</span>
                                <div class="group-info">
                                    <div class="group-name">${group.name}</div>
                                    <div class="group-description">${group.description}</div>
                                </div>
                            </div>
                            <div class="group-stats">
                                <div class="group-count">${group.count}</div>
                                <div class="group-percentage">${percentage}%</div>
                            </div>
                        </div>
                        <div class="group-progress">
                            <div class="progress-bg">
                                <div class="progress-fill job-${key}" style="width: ${percentage}%"></div>
                                <div class="progress-label">${group.count} workers</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        contentHTML += `
                    </div>
                </div>
            </div>
            
            <div class="population-actions">
                <button class="action-btn primary" onclick="document.getElementById('village-manager').villageManager.showDetailedPopulationView();">
                    <span class="btn-icon">📋</span>
                    <span class="btn-text">View Individual Villagers</span>
                </button>
                <button class="action-btn secondary" onclick="window.modalSystem.closeModal();">
                    <span class="btn-icon">📊</span>
                    <span class="btn-text">Close Overview</span>
                </button>
            </div>
        `;
        
        if (populationData.total === 0) {
            contentHTML = `
                <div class="no-villagers">
                    <div class="no-villagers-content">
                        <div class="no-villagers-icon">🏘️</div>
                        <h3>No Population Yet</h3>
                        <p>Your village is waiting for its first inhabitants! Build houses to attract people and provide food to sustain them.</p>
                        <div class="empty-state-tips">
                            <div class="tip">
                                <span class="tip-icon">🏠</span>
                                <span class="tip-text">Build houses to increase population capacity</span>
                            </div>
                            <div class="tip">
                                <span class="tip-icon">🌾</span>
                                <span class="tip-text">Farms provide food for population growth</span>
                            </div>
                            <div class="tip">
                                <span class="tip-icon">👥</span>
                                <span class="tip-text">Population grows naturally with adequate resources</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        window.showModal('Population Overview', contentHTML, {
            maxWidth: '800px',
            customClass: 'population-modal modern-modal'
        });
    }

    showDetailedPopulationView() {
        // Initialize population manager if needed
        this.initializePopulationManager();
        
        if (!this.gameState.populationManager) {
            console.error('[Village] PopulationManager not available');
            if (window.modalSystem) {
                window.modalSystem.showMessage('Population Unavailable', 'Population management system is not initialized.');
            }
            return;
        }
        
        const villagers = this.gameState.populationManager.getAll();
        
        // Generate content HTML for individual villagers (original detailed view)
        let contentHTML = `
            <div class="population-overview">
                <h3>👥 Individual Villagers</h3>
                <div class="population-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Villagers:</span>
                        <span class="stat-value">${villagers.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Working:</span>
                        <span class="stat-value">${villagers.filter(v => v.status === 'working').length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Idle:</span>
                        <span class="stat-value">${villagers.filter(v => v.status === 'idle').length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Average Age:</span>
                        <span class="stat-value">${Math.round(villagers.reduce((sum, v) => sum + v.age, 0) / villagers.length) || 0}</span>
                    </div>
                </div>
            </div>
            
            <div class="villagers-list">
                <h4>🏘️ Villager Details</h4>
                <div class="villagers-grid">
        `;
        
        villagers.forEach(villager => {
            const statusIcon = {
                'working': '🔨',
                'idle': '😴', 
                'resting': '💤'
            }[villager.status] || '❓';

            let roleIcon, roleLabel;
            if (villager.role === 'player') {
                roleIcon = '👑';
                roleLabel = 'Ruler';
            } else {
                roleIcon = {
                    'peasant': '🧑‍🌾',
                    'farmer': '👨‍🌾',
                    'woodcutter': '🪓',
                    'miner': '⛏️',
                    'builder': '🔨',
                    'guard': '⚔️',
                    'merchant': '💼'
                }[villager.role] || '👤';
                roleLabel = villager.role.charAt(0).toUpperCase() + villager.role.slice(1);
            }

            const buildingName = villager.buildingId ? 
                this.gameState.buildings.find(b => b.id === villager.buildingId)?.type || 'Unknown Building' : 
                'Village Square';

            contentHTML += `
                <div class="villager-card${villager.role === 'player' ? ' ruler-card' : ''}">
                    <div class="villager-header">
                        <span class="villager-icon">${roleIcon}</span>
                        <div class="villager-info">
                            <div class="villager-name">${villager.name}</div>
                            <div class="villager-role">${roleLabel}</div>
                        </div>
                        <span class="villager-status">${statusIcon}</span>
                    </div>
                    <div class="villager-details">
                        <div class="detail-row">
                            <span class="detail-label">Age:</span>
                            <span class="detail-value">${villager.age} days</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value">${villager.status}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span class="detail-value">${buildingName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Happiness:</span>
                            <span class="detail-value">${villager.happiness || 75}%</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Health:</span>
                            <span class="detail-value">${villager.health || 85}%</span>
                        </div>
                        ${villager.skills && villager.skills.length > 0 ? `
                        <div class="detail-row">
                            <span class="detail-label">Skills:</span>
                            <span class="detail-value">${villager.skills.join(', ')}</span>
                        </div>` : ''}
                        <div class="detail-row">
                            <span class="detail-label">Joined:</span>
                            <span class="detail-value">Day ${villager.joinedDay || 1}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (villagers.length === 0) {
            contentHTML += `
                <div class="no-villagers">
                    <div class="no-villagers-icon">👻</div>
                    <div class="no-villagers-text">No villagers yet! Build houses to attract more people to your village.</div>
                </div>
            `;
        }
        
        contentHTML += `
                </div>
            </div>
        `;
        
        // Show the modal
        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: '👥 Village Population',
                content: contentHTML,
                width: '800px',
                className: 'population-modal'
            });
        } else {
            console.error('[Village] modalSystem not available');
        }
    }
}

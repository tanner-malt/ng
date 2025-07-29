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
    }
    
    init() {
        this.villageGrid = document.getElementById('village-grid');
        this.setupBuildingButtons();
        this.renderBuildings();
        this.setupGridClick();
        this.gameState.updateBuildButtons();
        this.initSupplyChains();
    }
    
    setupBuildingButtons() {
        document.querySelectorAll('.build-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const buildingType = btn.dataset.building;
                if (this.gameState.canAfford(buildingType)) {
                    this.enterBuildMode(buildingType);
                }
            });
        });
    }
    
    enterBuildMode(buildingType) {
        // Clear any existing build mode
        this.exitBuildMode();
        
        this.gameState.buildMode = buildingType;
        this.villageGrid.classList.add('build-mode');
        this.villageGrid.style.cursor = 'crosshair';
        
        // Highlight the selected button
        document.querySelector(`[data-building="${buildingType}"]`).classList.add('selected');
        
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
                this.placeBuilding(this.gameState.buildMode, x, y);
                this.gameState.spend(this.gameState.buildMode);
                this.exitBuildMode();
                
                // Start supply chain if applicable
                this.updateSupplyChains();
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
        const building = {
            id: `${type}_${Date.now()}`,
            type: type,
            x: x,
            y: y,
            level: 1,
            producing: false
        };
        this.gameState.addBuilding(building);
        this.renderBuildings();
        // Log building placement
        // ...
        // Start production animation
        this.startBuildingProduction(building.id);

        // Milestone-based unlocking
        if (this.game && this.game.tutorialActive) {
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
    }
    
    startBuildingProduction(buildingId) {
        setTimeout(() => {
            const buildingEl = this.villageGrid.querySelector(`[data-building-id="${buildingId}"]`);
            if (buildingEl) {
                buildingEl.classList.add('producing');
            }
        }, 1000);
    }
    
    renderBuildings() {
        // Clear existing buildings
        this.villageGrid.querySelectorAll('.building:not(.ghost-building)').forEach(el => el.remove());
        
        // Render all buildings
        this.gameState.buildings.forEach(building => {
            const buildingEl = document.createElement('div');
            buildingEl.className = `building ${building.type}`;
            buildingEl.style.left = building.x + 'px';
            buildingEl.style.top = building.y + 'px';
            buildingEl.textContent = this.getBuildingSymbol(building.type);
            buildingEl.title = `${building.type} (Level ${building.level}) - Click to upgrade`;
            buildingEl.dataset.buildingId = building.id;
            
            // Add click handler for building info/upgrade
            buildingEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showBuildingInfo(building);
            });
            
            this.villageGrid.appendChild(buildingEl);
        });
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
}

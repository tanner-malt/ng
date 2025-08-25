
// Village management system
class VillageManager {
    // Duplicate constructor removed

    // Returns the number of worker slots for a building (equal to its level)
    getWorkerSlotsForBuilding(building) {
        // Ensure building has a level (default to 1 if missing)
        if (!building.level && building.built) {
            building.level = 1;
            console.log(`[Village] Fixed missing level for built ${building.type}, set to 1`);
        }
        return building.level || 0;
    }

    // Returns the population assigned to a building
    getAssignedWorkers(building) {
        if (!this.gameState.populationManager) return [];
        return this.gameState.populationManager.population.filter(p => p.buildingId === building.id && p.status === 'working');
    }

    // Returns eligible population for a building type (young adults/adults, correct role)
    getEligibleWorkers(building) {
        if (!this.gameState.populationManager) {
            console.log('[Village] No population manager for eligible workers');
            return [];
        }

        const role = window.GameData.getDefaultRoleForBuilding(building.type);
        console.log(`[Village] Looking for eligible workers for ${building.type} (role: ${role})`);

        const allPop = this.gameState.populationManager.population || [];
        console.log(`[Village] Total population: ${allPop.length}`);

        const eligible = allPop.filter(p => {
            // Only working age adults (28+), not already assigned
            const ageOk = (p.age >= 28 && p.age <= 180); // Expanded age range for all working adults
            const statusOk = p.status !== 'working';
            const roleOk = (p.role === role || p.role === 'peasant');

            return ageOk && statusOk && roleOk;
        });

        console.log(`[Village] Found ${eligible.length} eligible workers (${allPop.filter(p => p.age >= 28 && p.age <= 180).length} working age, ${allPop.filter(p => p.status !== 'working').length} not working)`);

        if (eligible.length === 0) {
            // Detailed breakdown when no workers found
            const workingAge = allPop.filter(p => p.age >= 28 && p.age <= 180);
            const notWorking = allPop.filter(p => p.status !== 'working');
            const rightRole = allPop.filter(p => p.role === role || p.role === 'peasant');
            console.log(`[Village] No eligible workers: ${workingAge.length} working age, ${notWorking.length} not working, ${rightRole.length} right role`);
        }

        return eligible;
    }

    // Assigns workers to all buildings up to their slot limit
    autoAssignCitizens() {
        console.log('[Village] Starting auto-assign citizens...');

        // Enhanced error checking
        if (!this.gameState) {
            console.error('[Village] No gameState available!');
            return;
        }

        // Ensure PopulationManager is available
        if (!this.gameState.populationManager && this.gameState.ensurePopulationManager) {
            console.log('[Village] Attempting to initialize PopulationManager...');
            this.gameState.ensurePopulationManager();
        }

        if (!this.gameState.populationManager) {
            console.error('[Village] No population manager available!');
            return;
        }

        if (!window.GameData) {
            console.error('[Village] GameData not available!');
            return;
        }

        // Check if there are any active construction projects
        const buildingsUnderConstruction = this.gameState.buildings.filter(b =>
            b.level === 0 || (b.built === false && b.construction && b.construction.inProgress)
        );

        console.log(`[Village] Buildings under construction: ${buildingsUnderConstruction.length}`);

        // If no construction is happening, reassign builders to other roles
        if (buildingsUnderConstruction.length === 0) {
            this.reassignIdleBuilders();
        }

        const totalPop = this.gameState.populationManager.population.length;
        const workingAgePop = this.gameState.populationManager.population.filter(p => p.age >= 16 && p.age <= 190).length;
        const currentlyWorking = this.gameState.populationManager.population.filter(p => p.status === 'working').length;

        console.log(`[Village] Population: ${totalPop} total, ${workingAgePop} working age, ${currentlyWorking} currently working`);
        console.log('[Village] Total buildings:', this.gameState.buildings.length);

        let totalAssignments = 0;

        // For each building that can have workers
        this.gameState.buildings.forEach(building => {
            try {
                const role = window.GameData.getDefaultRoleForBuilding(building.type);
                console.log(`[Village] Building ${building.type} (ID: ${building.id}) -> role: ${role}`);

                if (!role || role === 'peasant') {
                    console.log(`[Village] Skipping ${building.type} - no specific role needed (role: ${role})`);
                    return; // skip non-work buildings
                }

                const slots = this.getWorkerSlotsForBuilding(building);
                let assigned = this.getAssignedWorkers(building);
                console.log(`[Village] ${building.type} has ${assigned.length}/${slots} workers assigned`);

                if (assigned.length >= slots) {
                    console.log(`[Village] ${building.type} is already full`);
                    return; // already full
                }

                const needed = slots - assigned.length;
                const eligible = this.getEligibleWorkers(building);
                console.log(`[Village] Found ${eligible.length} eligible workers for ${building.type}, need ${needed}`);

                const toAssign = eligible.slice(0, needed);
                console.log(`[Village] Assigning ${toAssign.length} workers to ${building.type}`);

                toAssign.forEach(worker => {
                    console.log(`[Village] Assigning ${worker.name} (age: ${worker.age}, role: ${worker.role}) to ${building.type} as ${role}`);

                    // Update worker properties
                    this.gameState.populationManager.assignRole(worker.id, role);
                    this.gameState.populationManager.updateStatus(worker.id, 'working');
                    this.gameState.populationManager.moveInhabitant(worker.id, building.id);

                    // Also set buildingId directly to ensure production counting works
                    worker.buildingId = building.id;
                    totalAssignments++;

                    console.log(`[Village] ✅ ${worker.name} now working at ${building.type} (buildingId: ${worker.buildingId}, status: ${worker.status})`);
                });
            } catch (error) {
                console.error(`[Village] Error processing building ${building.type}:`, error);
            }
        });

        console.log(`[Village] Auto-assign citizens completed. Total new assignments: ${totalAssignments}`);

        // Summary report
        const finalWorkingCount = this.gameState.populationManager.population.filter(p => p.status === 'working').length;
        console.log(`[Village] Employment Summary: ${finalWorkingCount}/${workingAgePop} working age citizens employed`);
    }

    // Manual employment check - can be called on game load or manually
    runEmploymentCheck() {
        console.log('[Village] Running manual employment check...');

        // First, ensure population manager exists and has initial population
        if (!this.gameState.populationManager) {
            console.error('[Village] PopulationManager not available for employment check');
            return;
        }

        // Show current employment status
        const population = this.gameState.populationManager.population;
        const workingAge = population.filter(p => p.age >= 28 && p.age <= 180);
        const currentlyWorking = population.filter(p => p.status === 'working');
        const unemployed = workingAge.filter(p => p.status !== 'working');

        console.log(`[Village] Current Employment Status:`);
        console.log(`[Village] - Total Population: ${population.length}`);
        console.log(`[Village] - Working Age (28-180): ${workingAge.length}`);
        console.log(`[Village] - Currently Employed: ${currentlyWorking.length}`);
        console.log(`[Village] - Unemployed Working Age: ${unemployed.length}`);

        // Show buildings that need workers
        const buildings = this.gameState.buildings.filter(b => b.level > 0);
        console.log(`[Village] Buildings Available for Work: ${buildings.length}`);

        buildings.forEach(building => {
            const role = window.GameData.getDefaultRoleForBuilding(building.type);
            const slots = this.getWorkerSlotsForBuilding(building);
            const assigned = this.getAssignedWorkers(building);

            if (role && role !== 'peasant') {
                console.log(`[Village] - ${building.type}: ${assigned.length}/${slots} workers (needs ${role})`);
            }
        });

        // Then run auto-assignment
        this.autoAssignCitizens();

        console.log('[Village] Manual employment check completed');
    }
    constructor(gameState, game) {
        this.gameState = gameState;
        this.game = game;
        this.villageGrid = null;
        this.gridSize = 50; // Size of each grid cell
        this.supplyChains = []; // For carriages/runners visualization
        // Tutorial tracking
        this.tutorialBuildings = new Set();

        // Building effects system
        this.buildingEffectsManager = null; // Will be initialized after DOM loads
        this.buildingTutorial = null; // Will be initialized after DOM loads

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

            // Initialize building effects manager
            console.log('[Village] Initializing building effects manager...');
            if (typeof BuildingEffectsManager !== 'undefined') {
                this.buildingEffectsManager = new BuildingEffectsManager(this.gameState, this);
                console.log('[Village] Building effects manager initialized');
            } else {
                console.warn('[Village] BuildingEffectsManager not available');
            }

            // Initialize building tutorial
            console.log('[Village] Initializing building tutorial...');
            if (typeof BuildingTutorial !== 'undefined') {
                this.buildingTutorial = new BuildingTutorial(this.gameState, this);
                console.log('[Village] Building tutorial initialized');
            } else {
                console.warn('[Village] BuildingTutorial not available');
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
            // End day button now handled in navigation - see game.html
            // this.setupEndDayButton();
            this.gameState.updateBuildButtons();
            this.initSupplyChains();
            console.log('[Village] Setting up production planner...');
            this.initProductionPlanner();
            console.log('[Village] Setting up population view button...');
            this.setupPopulationViewButton();
            console.log('[Village] Setting up jobs management button...');
            this.setupJobsButton();
            console.log('[Village] Setting up effects management button...');
            this.setupEffectsButton();

            // Set up event listeners for building completion
            this.setupEventListeners();

            console.log('[Village] Village initialization complete');
        } catch (error) {
            console.error('[Village] Error during initialization:', error);
        }
    }

    // Setup event listeners for village management
    setupEventListeners() {
        if (window.eventBus) {
            // Listen for building completion to auto-assign workers
            window.eventBus.on('buildingCompleted', (data) => {
                console.log('[Village] Building completed, auto-assigning workers:', data);

                // Find the completed building
                const building = this.gameState.buildings.find(b =>
                    b.type === data.buildingType &&
                    b.x === data.position?.x &&
                    b.y === data.position?.y &&
                    b.built === true
                );

                if (building) {
                    this.autoAssignWorkersToBuilding(building);

                    // Show notification about completion with workers
                    const requiredWorkers = this.getBuildingWorkerRequirement(building.type);
                    if (requiredWorkers > 0 && window.modalSystem) {
                        window.modalSystem.showNotification(
                            `${building.type} completed! Workers assigned automatically.`,
                            { type: 'success', duration: 4000 }
                        );
                    }
                }
            });

            console.log('[Village] Event listeners setup complete');
        }
    }

    // Generate building buttons dynamically organized by category
    generateBuildingButtons() {
        console.log('[Village] Generating organized building buttons');

        // Clear all category containers and track which have buildings
        const categories = ['essential', 'production', 'craft', 'military', 'royal', 'knowledge', 'advanced'];
        categories.forEach(category => {
            const container = document.getElementById(`${category}-buildings`);
            if (container) {
                container.innerHTML = '';
            } else {
                console.warn(`[Village] Category container ${category}-buildings not found`);
            }
        });

        // Get all available building types
        const availableBuildingTypes = this.gameState.getAllBuildingTypes();
        console.log('[Village] Available building types:', availableBuildingTypes);

        // Organize buildings by category
        Object.keys(GameData.buildingCategories).forEach(categoryKey => {
            const categoryBuildings = GameData.buildingCategories[categoryKey];
            const container = document.getElementById(`${categoryKey}-buildings`);

            if (!container) {
                console.warn(`[Village] No container found for category: ${categoryKey}`);
                return;
            }

            let buildingsAddedToCategory = 0;

            categoryBuildings.forEach(buildingType => {
                // Only create button if building is defined in GameData and available
                if (GameData.buildingInfo[buildingType] && availableBuildingTypes.includes(buildingType)) {
                    const buildingRow = document.createElement('div');
                    buildingRow.className = 'building-row';
                    buildingRow.dataset.building = buildingType;

                    // Set appropriate tooltip based on unlock status
                    const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
                    if (!isUnlocked) {
                        const requirementsText = window.unlockSystem ?
                            window.unlockSystem.getUnlockRequirementsText(buildingType) :
                            `Locked: Complete prerequisites to unlock ${buildingType}`;
                        buildingRow.title = requirementsText;
                        buildingRow.classList.add('locked');
                        console.log(`[Village] Created locked row for ${buildingType}:`, requirementsText);
                    } else {
                        buildingRow.title = `Click to place ${GameData.getBuildingName(buildingType)}`;
                    }

                    // Building name column
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'building-name';
                    nameDiv.innerHTML = `
                        <span>${GameData.getBuildingIcon(buildingType)}</span>
                        <span>${GameData.getBuildingName(buildingType)}</span>
                    `;

                    // Resources column
                    const resourcesDiv = document.createElement('div');
                    resourcesDiv.className = 'building-resources';
                    const cost = GameData.buildingCosts[buildingType] || {};
                    const costText = Object.entries(cost)
                        .map(([resource, amount]) => `${amount} ${resource}`)
                        .join(', ') || 'None';
                    resourcesDiv.textContent = costText;

                    // Work points column
                    const workPointsDiv = document.createElement('div');
                    workPointsDiv.className = 'building-work-points';
                    const workPoints = GameData.constructionPoints[buildingType] || 0;
                    workPointsDiv.textContent = workPoints > 0 ? `${workPoints} WP` : 'Instant';

                    buildingRow.appendChild(nameDiv);
                    buildingRow.appendChild(resourcesDiv);
                    buildingRow.appendChild(workPointsDiv);

                    container.appendChild(buildingRow);
                    buildingsAddedToCategory++;
                    console.log(`[Village] Added ${buildingType} to ${categoryKey} category`);
                } else {
                    console.log(`[Village] Skipping ${buildingType} - not available or missing info`);
                }
            });

            // Hide category if no buildings were added
            const categoryElement = container.closest('.building-category');
            if (categoryElement) {
                if (buildingsAddedToCategory === 0) {
                    categoryElement.style.display = 'none';
                    console.log(`[Village] Hiding empty category: ${categoryKey}`);
                } else {
                    categoryElement.style.display = 'block';

                    // Add category description as subtitle
                    const categoryHeader = categoryElement.querySelector('h4');
                    if (categoryHeader && GameData.categoryDescriptions[categoryKey]) {
                        categoryHeader.title = GameData.categoryDescriptions[categoryKey];
                    }
                }
            }
        });

        console.log('[Village] Finished generating organized building buttons');
    }

    setupBuildingButtons() {
        document.querySelectorAll('.building-row').forEach(row => {
            row.addEventListener('click', () => {
                if (row.classList.contains('locked')) {
                    return; // Don't do anything for locked buildings
                }

                const buildingType = row.dataset.building;
                console.log(`[Village] Building row clicked: ${buildingType}`);
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

            // On hover, update row state based on current resources and unlocks
            row.addEventListener('mouseenter', () => {
                const buildingType = row.dataset.building;
                if (!buildingType) return;
                const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
                const canAfford = this.gameState.canAfford(buildingType);

                if (!isUnlocked) {
                    row.classList.add('locked');
                    // Show specific unlock requirements instead of generic message
                    const requirementsText = window.unlockSystem ?
                        window.unlockSystem.getUnlockRequirementsText(buildingType) :
                        `Locked: Complete prerequisites to unlock ${buildingType}`;
                    row.title = requirementsText;
                    console.log(`[Village] Setting tooltip for ${buildingType}:`, requirementsText);
                } else {
                    row.classList.remove('locked');
                    if (!canAfford) {
                        row.title = `Insufficient resources for ${buildingType}`;
                    } else {
                        row.title = `Build ${buildingType}`;
                    }
                }
            });
        });
    }

    // Update available buildings based on unlock status
    updateAvailableBuildings() {
        console.log('[Village] Updating available buildings based on unlocks');

        // Regenerate building buttons to handle new unlocks
        this.generateBuildingButtons();
        this.setupBuildingButtons();

        // Update button states for affordability
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
                    const requirementsText = window.unlockSystem ?
                        window.unlockSystem.getUnlockRequirementsText(buildingType) :
                        `Locked: Complete prerequisites to unlock ${buildingType}`;
                    btn.title = requirementsText;
                    console.log(`[Village] Setting tooltip (hover) for ${buildingType}:`, requirementsText);
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

    // Update building button states based on current resources and unlocks
    updateBuildingButtonStates() {
        document.querySelectorAll('.building-row').forEach(row => {
            const buildingType = row.dataset.building;
            if (!buildingType) return;

            const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
            const canAfford = this.gameState.canAfford(buildingType);

            if (!isUnlocked) {
                row.classList.add('locked');
                const requirementsText = window.unlockSystem ?
                    window.unlockSystem.getUnlockRequirementsText(buildingType) :
                    `Locked: Complete prerequisites to unlock ${buildingType}`;
                row.title = requirementsText;
                console.log(`[Village] Setting tooltip (row states) for ${buildingType}:`, requirementsText);
            } else {
                row.classList.remove('locked');
                if (!canAfford) {
                    row.title = `Insufficient resources for ${buildingType}`;
                } else {
                    row.title = `Build ${buildingType}`;
                }
            }
        });
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

        // Show helpful instruction about shift-click (but not during tutorial to avoid confusion)
        if (!this.gameState.tutorialActive && window.showToast) {
            const buildingName = GameData.getBuildingName(buildingType);
            window.showToast(`💡 Click to place ${buildingName}. Hold Shift+Click to place multiple!`, {
                icon: '🏗️',
                type: 'info',
                timeout: 4000
            });
        }

        // Show ghost building preview on hover
        this.setupBuildPreview();
    }

    // Setup ghost preview for inventory building items
    setupInventoryBuildPreview(itemId) {
        // Get item definition to determine building appearance
        const itemDef = window.inventoryManager?.getItemDefinition(itemId);
        if (!itemDef) return;

        // Create ghost building element
        const ghost = document.createElement('div');
        ghost.className = 'ghost-building';
        ghost.style.position = 'absolute';
        ghost.style.width = this.gridSize + 'px';
        ghost.style.height = this.gridSize + 'px';
        ghost.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
        ghost.style.border = '2px dashed #4CAF50';
        ghost.style.borderRadius = '4px';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '1000';
        ghost.style.display = 'none';
        ghost.innerHTML = `<div style="text-align: center; line-height: ${this.gridSize - 4}px; font-size: 20px;">${itemDef.icon || '🏕️'}</div>`;

        // Add to grid
        this.villageGrid.appendChild(ghost);
        this.ghostBuilding = ghost;

        // Setup mouse move listener for ghost
        this.ghostMoveHandler = (e) => {
            if (!this.buildMode || !this.buildMode.active) return;

            const rect = this.villageGrid.getBoundingClientRect();
            // Account for view offset (panning/scrolling)
            const offsetX = this.viewOffsetX || 0;
            const offsetY = this.viewOffsetY || 0;
            const x = Math.floor((e.clientX - rect.left - offsetX) / this.gridSize) * this.gridSize;
            const y = Math.floor((e.clientY - rect.top - offsetY) / this.gridSize) * this.gridSize;

            // Check if position is valid
            const tileX = Math.floor(x / this.gridSize);
            const tileY = Math.floor(y / this.gridSize);
            const isValid = this.isValidBuildingPosition(tileX, tileY);

            // Update ghost appearance
            ghost.style.left = x + 'px';
            ghost.style.top = y + 'px';
            ghost.style.display = 'block';
            ghost.style.backgroundColor = isValid ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
            ghost.style.borderColor = isValid ? '#4CAF50' : '#f44336';
        };

        this.villageGrid.addEventListener('mousemove', this.ghostMoveHandler);

        // Hide ghost when mouse leaves grid
        this.ghostLeaveHandler = () => {
            if (this.ghostBuilding) {
                this.ghostBuilding.style.display = 'none';
            }
        };

        this.villageGrid.addEventListener('mouseleave', this.ghostLeaveHandler);
    }

    // Validate if position is good for building placement
    isValidBuildingPosition(x, y) {
        // Check bounds
        if (!this.isWithinBounds(x, y)) return false;

        // Check if tile is empty (if tileManager exists)
        if (window.tileManager) {
            const tile = window.tileManager.getTileAt(x, y);
            return tile && !tile.building;
        }

        // Basic bounds check if no tile manager
        return true;
    }

    // Remove ghost preview
    removeGhostPreview() {
        if (this.ghostBuilding) {
            this.ghostBuilding.remove();
            this.ghostBuilding = null;
        }

        if (this.ghostMoveHandler) {
            this.villageGrid.removeEventListener('mousemove', this.ghostMoveHandler);
            this.ghostMoveHandler = null;
        }

        if (this.ghostLeaveHandler) {
            this.villageGrid.removeEventListener('mouseleave', this.ghostLeaveHandler);
            this.ghostLeaveHandler = null;
        }
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
            // Adjust coordinates for the current view offset
            const offsetX = this.viewOffsetX || 0;
            const offsetY = this.viewOffsetY || 0;
            const x = Math.floor((e.clientX - rect.left - offsetX) / this.gridSize) * this.gridSize;
            const y = Math.floor((e.clientY - rect.top - offsetY) / this.gridSize) * this.gridSize;

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
                // Add ghost building to the grid content instead of grid itself
                this.villageGridContent.appendChild(ghostBuilding);
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

                // Store the building type before placing (since placeBuilding might modify state)
                const currentBuildingType = this.gameState.buildMode;

                // Place the building (this handles spending resources internally)
                this.placeBuilding(currentBuildingType, x, y);

                // Check if shift was held during click for multi-build mode
                const shiftHeld = e.shiftKey;

                // Determine whether to stay in build mode:
                // 1. If shift was held AND we can afford another building -> stay in build mode
                // 2. If tutorial is active -> always exit (to avoid confusion)
                // 3. Otherwise -> exit build mode (normal single-building behavior)
                const canAffordAnother = this.gameState.canAfford(currentBuildingType);
                const shouldStayInBuildMode = !this.gameState.tutorialActive && shiftHeld && canAffordAnother;

                if (shouldStayInBuildMode) {
                    console.log(`[Village] Shift held and can afford ${currentBuildingType}, staying in build mode`);

                    // Update building button states since resources have changed
                    this.updateBuildingButtonStates();

                    // Show helpful toast notification
                    if (window.showToast) {
                        const buildingName = GameData.getBuildingName(currentBuildingType);
                        window.showToast(`Hold Shift and click to place another ${buildingName}! Press Escape to exit.`, {
                            icon: '🏗️',
                            type: 'info',
                            timeout: 3000
                        });
                    }
                } else {
                    // Exit build mode
                    let exitReason = 'Normal placement complete';
                    if (this.gameState.tutorialActive) {
                        exitReason = 'Tutorial active, exiting build mode after placement';
                    } else if (!canAffordAnother) {
                        exitReason = `Cannot afford another ${currentBuildingType}`;
                    } else if (!shiftHeld) {
                        exitReason = 'Shift not held, single building placement';
                    }

                    console.log(`[Village] ${exitReason}, exiting build mode`);
                    this.exitBuildMode();

                    // Update building button states since resources have changed
                    this.updateBuildingButtonStates();
                }

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
        // Check both the buildings array AND the tile manager for conflicts

        // First check if any building exists at these pixel coordinates
        const buildingExists = this.gameState.buildings.some(building =>
            building.x === x && building.y === y
        );

        if (buildingExists) return false;

        // Also check tile manager if available (convert pixel coordinates to tile coordinates)
        if (window.tileManager) {
            const tileX = Math.floor(x / this.gridSize);
            const tileY = Math.floor(y / this.gridSize);
            const tile = window.tileManager.getTileAt(tileX, tileY);
            if (tile && tile.building) return false;
        }

        return true;
    }

    isWithinBounds(x, y) {
        // Allow building in a large area since we have a 200% content area
        // Use grid coordinates instead of pixel coordinates for bounds
        const maxX = 1600; // Allow building up to 1600px x coordinate
        const maxY = 1200; // Allow building up to 1200px y coordinate
        return x >= 0 && y >= 0 && x < maxX && y < maxY;
    }

    placeBuilding(type, x, y) {
        console.log('[Village] placeBuilding called with:', { type, x, y });

        // Check if we can afford the building
        if (!this.gameState.canAfford(type)) {
            console.log('[Village] Cannot afford building:', type);
            this.showMessage('Insufficient Resources', 'You don\'t have enough resources to build this structure.');
            return false;
        }

        // Spend resources first
        const spendSuccess = this.gameState.spend(type);
        if (!spendSuccess) {
            console.error('[Village] Failed to spend resources for building');
            this.showMessage('Construction Failed', 'Unable to spend resources for construction.');
            return false;
        }

        // Add to build queue instead of immediate construction
        const buildingId = this.gameState.addToBuildQueue(type, x, y);
        console.log('[Village] Building added to queue with ID:', buildingId);

        // Trigger tutorial event for building placement
        if (window.eventBus) {
            const eventData = { type: type, x: x, y: y, id: buildingId, queued: true };
            console.log('[Village] Emitting building_queued event with data:', eventData);
            window.eventBus.emit('building_queued', eventData);
        }

        // Trigger building achievement
        if (window.achievementSystem) {
            window.achievementSystem.triggerBuildingPlaced(type);
        }

        // Immediately start construction and auto-assign builders
        if (this.gameState.jobManager) {
            console.log('[Village] Starting construction immediately and auto-assigning builders...');

            // Start construction immediately instead of waiting for end of day
            const queueItem = this.gameState.buildQueue.find(item => item.type === type);
            if (queueItem) {
                this.gameState.startConstructionFromQueue(queueItem);
                // Remove from queue since construction has started
                this.gameState.buildQueue = this.gameState.buildQueue.filter(item => item.id !== queueItem.id);
            }

            // Auto-assign workers to construction jobs
            const assignedWorkers = this.gameState.jobManager.autoAssignWorkers();
            if (assignedWorkers > 0) {
                console.log(`[Village] Assigned ${assignedWorkers} workers to construction jobs`);
            }
        }

        // Check for new unlocks after building placement
        if (window.unlockSystem) {
            setTimeout(() => {
                window.unlockSystem.checkAllUnlocks();
            }, 100);
        }

        // Show queue notification
        if (window.modalSystem) {
            window.modalSystem.showNotification(
                `${type} added to build queue. Construction will begin at end of day.`,
                { type: 'info', duration: 4000 }
            );
        }

        // Re-render to show build queue marker
        this.renderBuildings();

        // Save game state
        this.gameState?.save();

        return true;
    }

    // Place inventory building immediately (no construction queue)
    placeInventoryBuilding(type, x, y) {
        console.log('[Village] placeInventoryBuilding called with:', { type, x, y });

        // Check if tile is valid first
        if (window.tileManager) {
            const tile = window.tileManager.getTileAt(x, y);
            if (!tile) {
                console.error('[Village] Invalid tile coordinates for placement');
                return false;
            }
            if (tile.building) {
                console.error('[Village] Tile already occupied');
                return false;
            }
        }

        // Also check for pixel coordinate conflicts with other buildings
        const pixelX = x * this.gridSize;
        const pixelY = y * this.gridSize;
        const buildingAtPosition = this.gameState.buildings.find(building =>
            building.x === pixelX && building.y === pixelY
        );
        if (buildingAtPosition) {
            console.error('[Village] Position already occupied by building:', buildingAtPosition.type);
            return false;
        }

        // Create building with full functionality immediately
        const id = Date.now() + Math.random();
        const building = {
            id,
            type,
            level: 1, // Inventory buildings start at level 1
            built: true, // Already built
            x: pixelX, // Convert tile coordinates to pixel coordinates
            y: pixelY, // Convert tile coordinates to pixel coordinates
            startedAt: Date.now(),
            source: 'inventory' // Mark as inventory-placed
        };

        // Place in tile manager first (this will handle tile assignment)
        if (window.tileManager) {
            // Get the tile and manually assign the building to avoid duplication
            const tile = window.tileManager.getTileAt(x, y);
            tile.building = building;
            console.log('[TileManager] Placed', type, 'at', x, y);
        }

        // Add to buildings list (only once, here)
        this.gameState.buildings.push(building);

        // Auto-assign workers if population manager is available
        this.autoAssignWorkersToBuilding(building);

        // Apply building effects immediately
        if (window.villageManager?.buildingEffectsManager) {
            window.villageManager.buildingEffectsManager.applyBuildingEffects(
                building.type,
                `${building.x},${building.y}`
            );
        }

        // Trigger events
        if (window.eventBus) {
            window.eventBus.emit('building_placed', { type, x, y, id, immediate: true });
            window.eventBus.emit('building_completed', {
                buildingType: type,
                buildingLevel: 1,
                position: { x, y },
                immediate: true
            });
        }

        // Trigger achievements
        if (window.achievementSystem) {
            window.achievementSystem.triggerBuildingPlaced(type);
        }

        // Auto-assign workers to new building jobs immediately
        if (this.gameState.jobManager) {
            console.log('[Village] Auto-assigning workers after inventory building placement...');
            const assignedWorkers = this.gameState.jobManager.autoAssignWorkers();
            if (assignedWorkers > 0) {
                console.log(`[Village] Assigned ${assignedWorkers} workers to building jobs`);
            }
        }

        // Check for unlocks
        if (window.unlockSystem) {
            setTimeout(() => {
                window.unlockSystem.checkAllUnlocks();
            }, 100);
        }

        // Save game state
        this.gameState?.save();

        console.log('[Village] Inventory building placed immediately with ID:', id);
        return true;
    }

    // Auto-assign workers to a newly placed building
    autoAssignWorkersToBuilding(building) {
        if (!window.populationManager) return;

        // Get building requirements
        const requiredWorkers = this.getBuildingWorkerRequirement(building.type);
        if (requiredWorkers <= 0) return;

        // Find available workers
        const population = window.populationManager.getPopulation();
        const availableWorkers = population.filter(person =>
            person.job === 'idle' || person.job === 'unemployed'
        );

        // Assign workers up to requirement
        const workersToAssign = Math.min(requiredWorkers, availableWorkers.length);
        for (let i = 0; i < workersToAssign; i++) {
            const worker = availableWorkers[i];
            if (window.jobManager) {
                window.jobManager.assignWorkerToBuilding(worker.id, building.id, building.type);
            }
        }

        if (workersToAssign > 0) {
            console.log(`[Village] Auto-assigned ${workersToAssign} workers to ${building.type}`);

            // Show notification about worker assignment
            if (window.modalSystem) {
                window.modalSystem.showNotification(
                    `${workersToAssign} workers automatically assigned to ${building.type}`,
                    { type: 'info', duration: 3000 }
                );
            }
        }
    }

    // Get worker requirement for building type
    getBuildingWorkerRequirement(buildingType) {
        const workerRequirements = {
            tent: 2,
            farm: 1,
            woodcutterLodge: 2,
            quarry: 2,
            workshop: 2,
            blacksmith: 1,
            barracks: 3,
            house: 0, // No workers needed
            townCenter: 5, // Town center should have workers for gatherer jobs
            foundersWagon: 3 // Founders wagon has gatherer and crafter jobs
        };

        return workerRequirements[buildingType] || 1;
    }

    // Show construction priority modal
    showConstructionPriorityModal(buildingId) {
        // Find the building
        const building = this.gameState.buildings.find(b => b.id === buildingId);
        if (!building) return;

        // Check if it's in build queue or construction site
        const queueItem = this.gameState.buildQueue.find(item => item.id === buildingId);

        // Get construction site from ConstructionManager
        let constructionSite = null;
        if (this.gameState.constructionManager && this.gameState.constructionManager.constructionSites) {
            constructionSite = this.gameState.constructionManager.constructionSites.get(buildingId);
        }

        let currentPriority = 'normal';
        let status = 'Unknown';
        let progressInfo = '';

        if (queueItem) {
            currentPriority = queueItem.priority;
            status = 'Queued for Construction';
            const position = this.gameState.buildQueue.findIndex(item => item.id === buildingId) + 1;
            progressInfo = `Queue Position: #${position}`;
        } else if (constructionSite) {
            status = 'Under Construction';
            const progress = ((constructionSite.currentPoints || 0) / (constructionSite.totalPoints || 1) * 100).toFixed(1);
            const pointsRemaining = (constructionSite.totalPoints || 0) - (constructionSite.currentPoints || 0);
            const dailyProgress = constructionSite.dailyProgress || 4.5;
            const estimatedDays = dailyProgress > 0 ? Math.ceil(pointsRemaining / dailyProgress) : 'calculating...';
            progressInfo = `Progress: ${progress}% (${estimatedDays} days remaining)`;
        } else if (building.level === 0) {
            status = 'Construction Site';
            progressInfo = 'Waiting for builders to be assigned';
        } else {
            status = 'Completed';
            progressInfo = `Building is operational at Level ${building.level}`;
        }

        const modalContent = `
            <div class="construction-priority-modal">
                <h2>🏗️ Construction Management</h2>
                <div class="building-info">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="font-size: 36px; margin-bottom: 5px;">${this.getBuildingSymbol(building.type, building.level)}</div>
                        <div style="font-weight: bold; color: #3498db; font-size: 18px;">${building.type}</div>
                        <div style="color: #95a5a6; font-size: 14px;">Level ${building.level} → ${building.level + 1}</div>
                    </div>
                    
                    <div class="status-panel" style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="color: #3498db; font-weight: bold; margin-bottom: 5px;">📋 Status: ${status}</div>
                        <div style="color: #ecf0f1; font-size: 14px;">${progressInfo}</div>
                    </div>
                    
                    ${this.getConstructionDetails(buildingId, constructionSite)}
                    
                    ${queueItem ? `
                    <div class="priority-section">
                        <h3 style="color: #e74c3c; margin-bottom: 10px;">🔥 Construction Priority</h3>
                        <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 15px;">
                            Higher priority buildings will be constructed first when the day ends.
                        </p>
                        
                        <div class="priority-buttons" style="display: flex; gap: 8px; margin-bottom: 15px;">
                            <button class="priority-btn ${currentPriority === 'high' ? 'active' : ''}" 
                                    onclick="window.villageManager.setBuildingPriority('${buildingId}', 'high')" 
                                    style="flex: 1; padding: 8px; border: 2px solid #e74c3c; background: ${currentPriority === 'high' ? '#e74c3c' : 'transparent'}; color: ${currentPriority === 'high' ? 'white' : '#e74c3c'}; border-radius: 4px; cursor: pointer;">
                                🔥 High Priority
                            </button>
                            <button class="priority-btn ${currentPriority === 'normal' ? 'active' : ''}" 
                                    onclick="window.villageManager.setBuildingPriority('${buildingId}', 'normal')" 
                                    style="flex: 1; padding: 8px; border: 2px solid #f39c12; background: ${currentPriority === 'normal' ? '#f39c12' : 'transparent'}; color: ${currentPriority === 'normal' ? 'white' : '#f39c12'}; border-radius: 4px; cursor: pointer;">
                                ⚡ Normal
                            </button>
                            <button class="priority-btn ${currentPriority === 'low' ? 'active' : ''}" 
                                    onclick="window.villageManager.setBuildingPriority('${buildingId}', 'low')" 
                                    style="flex: 1; padding: 8px; border: 2px solid #95a5a6; background: ${currentPriority === 'low' ? '#95a5a6' : 'transparent'}; color: ${currentPriority === 'low' ? 'white' : '#95a5a6'}; border-radius: 4px; cursor: pointer;">
                                🐌 Low Priority
                            </button>
                        </div>
                        
                        <div class="queue-info" style="background: rgba(241, 196, 15, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #f1c40f;">
                            <div style="color: #f1c40f; font-weight: bold; font-size: 12px;">💡 Build Queue Info</div>
                            <div style="color: #ecf0f1; font-size: 11px; margin-top: 4px;">
                                Construction begins at the end of each day. Builders work on high priority items first.
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${constructionSite ? `
                    <div class="next-level-benefits">
                        <h3 style="color: #3498db; margin-bottom: 10px;">🔮 Next Level Benefits</h3>
                        <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 6px;">
                            ${this.getNextLevelBenefits(building.type, building.level + 1)}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="window.modalSystem.closeModal()" 
                            style="padding: 10px 20px; background: #34495e; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: 'Construction Management',
                content: modalContent,
                className: 'construction-priority-modal'
            });
        }
    }

    // Get construction details including worker assignments and jobs available
    getConstructionDetails(buildingId, constructionSite) {
        if (!constructionSite) {
            return `
                <div style="background: rgba(149, 165, 166, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #95a5a6; margin-bottom: 8px;">⚙️ Construction Details</h4>
                    <div style="color: #bdc3c7; font-size: 14px;">No active construction site found</div>
                </div>
            `;
        }

        // Get assigned workers from ConstructionManager
        let assignedWorkers = [];
        let availableJobs = 0;

        if (constructionSite) {
            // For construction sites, get builders assigned to this specific construction
            assignedWorkers = constructionSite.assignedBuilders || [];

            // For construction, available jobs = max builders that can work on this type
            // This could be based on building type, but for now use a default
            availableJobs = 4; // Most buildings can have up to 4 builders working on them
        } else if (window.gameState?.jobManager) {
            // For completed buildings, get regular job assignments
            try {
                assignedWorkers = window.gameState.jobManager.getWorkersInJob(buildingId, 'builder') || [];
                const buildingJobs = window.gameState.jobManager.availableJobs.get(buildingId);
                availableJobs = buildingJobs?.builder || 0;
            } catch (e) {
                console.warn('[Village] Error getting construction workers:', e);
            }
        }

        const efficiency = Math.round(constructionSite.skillEfficiency * 100);
        const dailyProgress = constructionSite.dailyProgress || 0;

        return `
            <div style="background: rgba(46, 204, 113, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="color: #27ae60; margin-bottom: 12px;">⚙️ Construction Details</h4>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                        <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 5px;">Workers Assigned</div>
                        <div style="color: ${assignedWorkers.length > 0 ? '#27ae60' : '#e74c3c'}; font-size: 16px;">
                            ${assignedWorkers.length}/${availableJobs || 'N/A'}
                        </div>
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                        <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 5px;">Efficiency</div>
                        <div style="color: #f39c12; font-size: 16px;">${efficiency}%</div>
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                        <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 5px;">Daily Progress</div>
                        <div style="color: #3498db; font-size: 16px;">${dailyProgress.toFixed(1)} pts</div>
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                        <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 5px;">Points Remaining</div>
                        <div style="color: #9b59b6; font-size: 16px;">${Math.round((constructionSite.totalPoints - constructionSite.currentPoints) || constructionSite.totalPoints)}/${Math.round(constructionSite.totalPoints)}</div>
                    </div>
                </div>
                
                ${assignedWorkers.length > 0 ? `
                    <div style="margin-bottom: 10px;">
                        <div style="color: #ecf0f1; font-weight: bold; margin-bottom: 8px;">👷 Assigned Builders:</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${assignedWorkers.map(workerInfo => {
            // Handle both construction builder objects and regular worker IDs
            if (typeof workerInfo === 'object' && workerInfo.name) {
                // Construction builder object format
                return `
                                        <span style="background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                            ${workerInfo.name} (Eff: ${Math.round(workerInfo.efficiency * 100)}%)
                                        </span>
                                    `;
            } else {
                // Regular worker ID format
                const workerId = typeof workerInfo === 'object' ? workerInfo.id : workerInfo;
                const worker = this.getWorkerById(workerId);
                return worker ? `
                                        <span style="background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                            ${worker.name} (${worker.age})
                                        </span>
                                    ` : '';
            }
        }).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #e74c3c;">
                        <div style="color: #e74c3c; font-weight: bold; font-size: 12px;">⚠️ No Builders Assigned</div>
                        <div style="color: #ecf0f1; font-size: 11px; margin-top: 4px;">
                            Use the Jobs Management panel to assign builders to this construction site.
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    // Helper method to get worker by ID
    getWorkerById(workerId) {
        if (!window.gameState?.populationManager?.population) return null;
        return window.gameState.populationManager.population.find(w => w.id === workerId);
    }

    // Get benefits for the next building level
    getNextLevelBenefits(buildingType, nextLevel) {
        // Get building production data from GameData
        const buildingProduction = window.GameData?.buildingProduction?.[buildingType];
        if (!buildingProduction) {
            return `<div style="color: #95a5a6; font-style: italic;">Benefits information not available</div>`;
        }

        const benefits = [];

        // Population capacity increase
        if (buildingProduction.populationCapacity) {
            const capacity = buildingProduction.populationCapacity * nextLevel;
            benefits.push(`👥 Population Capacity: +${capacity}`);
        }

        // Job slots
        if (buildingProduction.jobs) {
            Object.entries(buildingProduction.jobs).forEach(([jobType, slots]) => {
                const totalSlots = slots * nextLevel;
                const jobIcon = this.getJobIcon(jobType);
                benefits.push(`${jobIcon} ${jobType.charAt(0).toUpperCase() + jobType.slice(1)} Jobs: ${totalSlots} slots`);
            });
        }

        // Storage benefits
        if (buildingProduction.storage) {
            const st = buildingProduction.storage;
            if (typeof st.all === 'number') {
                benefits.push(`📦 Storage: +${st.all * nextLevel} all resources`);
            }
            Object.entries(st).forEach(([res, cap]) => {
                if (res !== 'all' && typeof cap === 'number') {
                    benefits.push(`📦 Storage: +${cap * nextLevel} ${res}`);
                }
            });
        }

        // Other bonuses (efficiency or known effects)
        const bonusLabels = this.getBuildingBonusLabels(buildingProduction);
        bonusLabels.forEach(label => benefits.push(label));

        if (benefits.length === 0) {
            return `<div style="color: #95a5a6; font-style: italic;">Level ${nextLevel} provides general improvements</div>`;
        }

        return benefits.map(benefit =>
            `<div style="color: #ecf0f1; font-size: 13px; margin-bottom: 4px;">• ${benefit}</div>`
        ).join('');
    }

    // Helper method to get resource icons
    getResourceIcon(resource) {
        const icons = {
            food: '🍞',
            wood: '🪵',
            stone: '🪨',
            metal: '⚙️',
            gold: '💰',
            production: '🔧'
        };
        return icons[resource] || '📦';
    }

    // Set building priority in queue
    setBuildingPriority(buildingId, priority) {
        if (this.gameState.setBuildPriority(buildingId, priority)) {
            // Refresh the modal
            this.showConstructionPriorityModal(buildingId);

            // Show feedback
            if (window.modalSystem) {
                window.modalSystem.showNotification(
                    `Priority set to ${priority}`,
                    { type: 'success', duration: 2000 }
                );
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

    showConstructionModal(type, x, y) {
        const modal = document.getElementById('construction-modal');
        const message = document.getElementById('construction-message');
        const resourceList = document.getElementById('resource-spent-list');
        const timeText = document.getElementById('construction-time-text');

        if (!modal) return;

        // Update modal content
        const buildingName = GameData.getBuildingName(type);
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
        if (!container) {
            console.error('[Village] Grid container not found - cannot render buildings');
            return;
        }

        // Clear existing buildings (but not building sites)
        container.querySelectorAll('.building:not(.building-site)').forEach(el => el.remove());

        console.log('[Village] Rendering buildings - count:', this.gameState.buildings.length);
        console.log('[Village] Container size:', container.offsetWidth, 'x', container.offsetHeight);

        // Group buildings by coordinates to detect overlaps
        const buildingsByPosition = {};
        this.gameState.buildings.forEach(building => {
            const key = `${building.x},${building.y}`;
            if (!buildingsByPosition[key]) {
                buildingsByPosition[key] = [];
            }
            buildingsByPosition[key].push(building);
        });

        // Log overlapping buildings
        Object.entries(buildingsByPosition).forEach(([position, buildings]) => {
            if (buildings.length > 1) {
                console.warn(`[Village] Multiple buildings at ${position}:`, buildings.map(b => b.type));
            }
        });

        // Render all buildings (both completed and under construction)
        this.gameState.buildings.forEach(building => {
            console.log('[Village] Rendering building:', building.type, 'at pixel coords', building.x, building.y, 'level:', building.level, 'built:', building.built);

            const buildingEl = document.createElement('div');
            buildingEl.className = `building ${building.type}`;
            buildingEl.style.left = building.x + 'px';
            buildingEl.style.top = building.y + 'px';

            // Use consistent size with CSS
            buildingEl.style.width = '45px';
            buildingEl.style.height = '45px';
            buildingEl.style.position = 'absolute';
            buildingEl.style.zIndex = '10';

            // Only override colors for construction status, let CSS handle the rest
            if (building.level === 0 || !building.built) {
                buildingEl.style.border = '2px solid #f1c40f';
                buildingEl.style.backgroundColor = 'rgba(241, 196, 15, 0.7)';
                buildingEl.title = `${building.type} (Under Construction) - Click for info`;
            } else {
                // Let CSS handle the styling for completed buildings
                buildingEl.title = `${building.type} (Level ${building.level}) - Click for info`;
            }

            buildingEl.textContent = this.getBuildingSymbol(building.type, building.level !== undefined ? building.level : 1);
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

                // Check if we're in rune targeting mode
                if (this.runeTargeting && this.runeTargeting.active) {
                    this.applyRuneToBuilding(buildingEl, building);
                    return;
                }

                // Construction site - show priority modal
                if (building.level === 0) {
                    this.showConstructionPriorityModal(building.id);
                }
                // Use new building management modal for completed buildings
                else if (building.level > 0) {
                    this.showBuildingManagement(building.id);
                }
            });

            // Add right-click handler to cancel rune targeting
            buildingEl.addEventListener('contextmenu', (e) => {
                if (this.runeTargeting && this.runeTargeting.active) {
                    e.preventDefault();
                    this.exitRuneTargetingMode();
                }
            });

            container.appendChild(buildingEl);
            console.log('[Village] Added building element to container:', building.type, 'at', building.x, building.y);
        });

        console.log(`[Village] Rendered ${this.gameState.buildings.length} buildings to container`);
        console.log('[Village] Container now has', container.querySelectorAll('.building').length, 'building elements');
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
            // Get construction progress from the work-point construction system
            const constructionProgress = this.gameState.constructionManager?.getConstructionProgress(building.id);

            if (constructionProgress) {
                // Use work-point construction system data
                const progressPercent = constructionProgress.progressPercent;
                const currentPoints = constructionProgress.currentPoints;
                const totalPoints = constructionProgress.totalPoints;
                const pointsRemaining = constructionProgress.pointsRemaining;
                const assignedBuilders = constructionProgress.assignedBuilders;
                const dailyProgress = constructionProgress.dailyProgress;
                const estimatedDays = constructionProgress.estimatedCompletion;
                const season = constructionProgress.currentSeason;

                contentHTML += `
                    <div style="background: rgba(241, 196, 15, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #f1c40f;">
                        <div style="color: #f1c40f; font-weight: bold; font-size: 12px;">🏗️ UNDER CONSTRUCTION</div>
                        <div style="color: #ecf0f1; font-size: 11px;">Progress: ${Math.round(currentPoints)}/${totalPoints} work points (${progressPercent}%)</div>
                        <div style="color: #ecf0f1; font-size: 11px;">Builders: ${assignedBuilders} (+${dailyProgress.toFixed(1)} points/day)</div>
                        <div style="color: #ecf0f1; font-size: 11px;">Estimated completion: ${estimatedDays === Infinity ? 'No builders' : estimatedDays + ' days'}</div>
                        <div style="color: #ecf0f1; font-size: 11px;">Season: ${season}</div>
                        
                        <!-- Efficiency breakdown -->
                        <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <div style="color: #95a5a6; font-size: 10px;">Efficiency Modifiers:</div>
                            <div style="color: #ecf0f1; font-size: 10px;">⚡ Skill: ${Math.round((constructionProgress.skillEfficiency - 1) * 100)}%</div>
                            <div style="color: #ecf0f1; font-size: 10px;">🌤️ Season: ${Math.round((constructionProgress.seasonalEfficiency - 1) * 100)}%</div>
                            <div style="color: #ecf0f1; font-size: 10px;">👥 Teamwork: ${Math.round((constructionProgress.teamworkBonus - 1) * 100)}%</div>
                        </div>
                    </div>
                `;
            } else {
                // Fallback for legacy construction system
                const constructionPoints = GameData.constructionPoints?.[building.type] || 25;
                const progress = building.constructionProgress || 0;
                const pointsLeft = Math.max(0, constructionPoints - progress);
                contentHTML += `
                    <div style="background: rgba(241, 196, 15, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #f1c40f;">
                        <div style="color: #f1c40f; font-weight: bold; font-size: 12px;">🏗️ UNDER CONSTRUCTION</div>
                        <div style="color: #ecf0f1; font-size: 11px;">Progress: ${progress}/${constructionPoints} work points</div>
                        <div style="color: #ecf0f1; font-size: 11px;">${pointsLeft} points remaining</div>
                    </div>
                `;
            }
        }

        // Capabilities (jobs, storage, bonuses)
        if (production) {
            contentHTML += `<div style="margin-bottom: 10px;">
                <div style="color: #2ecc71; font-weight: bold; font-size: 12px; margin-bottom: 4px;">🧭 CAPABILITIES:</div>
            `;

            // Population capacity
            if (production.populationCapacity) {
                contentHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="color: #ecf0f1; font-size: 11px;">👥 Population Capacity</span>
                        <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">+${production.populationCapacity * building.level}</span>
                    </div>
                `;
            }

            // Jobs
            if (production.jobs) {
                Object.entries(production.jobs).forEach(([jobType, slots]) => {
                    const totalSlots = slots * building.level;
                    const jobIcon = this.getJobIcon(jobType);
                    contentHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <span style="color: #ecf0f1; font-size: 11px;">${jobIcon} ${jobType.charAt(0).toUpperCase() + jobType.slice(1)} Jobs</span>
                            <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">${totalSlots} slots</span>
                        </div>
                    `;
                });
            }

            // Storage
            if (production.storage) {
                const st = production.storage;
                if (typeof st.all === 'number') {
                    contentHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <span style="color: #ecf0f1; font-size: 11px;">📦 Storage (All)</span>
                            <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">+${st.all * building.level}</span>
                        </div>
                    `;
                }
                Object.entries(st).forEach(([res, cap]) => {
                    if (res !== 'all' && typeof cap === 'number') {
                        contentHTML += `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <span style="color: #ecf0f1; font-size: 11px;">📦 Storage (${res})</span>
                                <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">+${cap * building.level}</span>
                            </div>
                        `;
                    }
                });
            }

            // Other bonuses
            const bonusLabels = this.getBuildingBonusLabels(production, building.level);
            bonusLabels.forEach(label => {
                contentHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="color: #ecf0f1; font-size: 11px;">${label.name}</span>
                        <span style="color: #2ecc71; font-weight: bold; font-size: 11px;">${label.value}</span>
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
            barracks: '⚔️',
            workshop: '🔧',
            woodcutterLodge: '🪚',
            quarry: '⛏️',
            market: '🏪',
            blacksmith: '⚒️',
            academy: '📚',
            castle: '🏰',
            university: '🎓',
            keep: '🏰',
            monument: '🗿',
            fortifications: '🛡️',
            militaryAcademy: '🎓',
            mine: '⛏️',
            lumberMill: '🪓',
            magicalTower: '🔮',
            grandLibrary: '🏛️',
            tent: '⛺',
            foundersWagon: '🚛',
            buildersHut: '🏗️',
            storehouse: '📦'
        };
        return symbols[type] || '?';
    }

    // Helper to extract common bonuses for display
    getBuildingBonusLabels(def, level = 1) {
        const labels = [];
        if (!def) return labels;

        if (typeof def.efficiency === 'number' && def.efficiency !== 1) {
            const pct = Math.round((def.efficiency - 1) * 100);
            labels.push({ name: '⚡ Efficiency Bonus', value: `+${pct}%` });
        }
        if (typeof def.dynastyMagic === 'number' && def.dynastyMagic !== 1) {
            const pct = Math.round((def.dynastyMagic - 1) * 100);
            labels.push({ name: '✨ Dynasty Magic', value: `+${pct}%` });
        }
        if (typeof def.knowledgePreservation === 'number' && def.knowledgePreservation !== 1) {
            const pct = Math.round((def.knowledgePreservation - 1) * 100);
            labels.push({ name: '📚 Knowledge Preservation', value: `+${pct}%` });
        }
        if (typeof def.royalCapacity === 'number') {
            labels.push({ name: '👑 Royal Capacity', value: `+${def.royalCapacity * level}` });
        }
        if (typeof def.prestige === 'number') {
            labels.push({ name: '🏅 Prestige', value: `+${def.prestige * level}` });
        }
        if (typeof def.happiness === 'number') {
            labels.push({ name: '😊 Happiness', value: `+${def.happiness * level}` });
        }
        if (typeof def.influence === 'number') {
            labels.push({ name: '🏛️ Influence', value: `+${def.influence * level}` });
        }
        if (typeof def.defense === 'number') {
            labels.push({ name: '🛡️ Defense', value: `+${def.defense * level}` });
        }
        if (typeof def.soldiers === 'number') {
            labels.push({ name: '⚔️ Soldiers', value: `+${def.soldiers * level}` });
        }
        if (typeof def.commanderTraining === 'number') {
            labels.push({ name: '🎖️ Commander Training', value: `+${def.commanderTraining * level}` });
        }
        if (typeof def.tacticalBonus === 'number' && def.tacticalBonus !== 1) {
            const pct = Math.round((def.tacticalBonus - 1) * 100);
            labels.push({ name: '🗺️ Tactical Bonus', value: `+${pct}%` });
        }
        if (typeof def.territoryControl === 'number') {
            labels.push({ name: '📏 Territory Control', value: `+${def.territoryControl * level}` });
        }
        return labels;
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
        // Visual supply lines removed
        // No longer clear or create supply-route/carriage elements
        // Function now does nothing
    }

    createSupplyRoute(fromBuilding, toBuilding) {
        // Visual supply lines removed
        // Function now does nothing
    }

    createCarriage(startX, startY, endX, endY, sourceType) {
        // Visual supply lines removed
        // Function now does nothing
    }

    animateSupplyMovement() {
        // Visual supply lines removed
        // Function now does nothing
    }

    // Automation features based on prestige level
    getAutomationLevel() {
        return this.gameState.automationLevel;
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
        // Use JobManager production for planner
        const currentProduction = this.gameState.jobManager
            ? this.gameState.jobManager.calculateDailyProduction()
            : { food: 0, wood: 0, stone: 0 };

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

        // Update effects display
        this.updateEffectsDisplay();

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

        // Update production tab display
        this.updateProductionTabDisplay();
    }

    updateProductionTabDisplay() {
        if (!this.gameState || !this.gameState.jobManager) return;

        // Use worker-based calculation for consistency
        const detailedProduction = this.gameState.jobManager.calculateDetailedDailyProduction();
        const currentProduction = detailedProduction.production;

        // Update basic production numbers
        const foodProdEl = document.getElementById('daily-food-production');
        const woodProdEl = document.getElementById('daily-wood-production');
        const stoneProdEl = document.getElementById('daily-stone-production');
        const metalProdEl = document.getElementById('daily-metal-production');
        const productionGainEl = document.getElementById('daily-production-gain');

        if (foodProdEl) foodProdEl.textContent = Math.round(currentProduction.food);
        if (woodProdEl) woodProdEl.textContent = Math.round(currentProduction.wood);
        if (stoneProdEl) stoneProdEl.textContent = Math.round(currentProduction.stone);
        if (metalProdEl) metalProdEl.textContent = Math.round(currentProduction.metal);
        if (productionGainEl) productionGainEl.textContent = Math.round(currentProduction.production);

        // Calculate and display net values
        const foodConsumption = this.gameState.population;
        const foodConsumptionEl = document.getElementById('daily-food-consumption');
        const foodNetEl = document.getElementById('daily-food-net');

        if (foodConsumptionEl) foodConsumptionEl.textContent = foodConsumption;
        if (foodNetEl) foodNetEl.textContent = Math.round(currentProduction.food - foodConsumption);

        const woodConsumptionEl = document.getElementById('daily-wood-consumption');
        const woodNetEl = document.getElementById('daily-wood-net');
        if (woodConsumptionEl) woodConsumptionEl.textContent = '0';
        if (woodNetEl) woodNetEl.textContent = Math.round(currentProduction.wood);

        const stoneConsumptionEl = document.getElementById('daily-stone-consumption');
        const stoneNetEl = document.getElementById('daily-stone-net');
        if (stoneConsumptionEl) stoneConsumptionEl.textContent = '0';
        if (stoneNetEl) stoneNetEl.textContent = Math.round(currentProduction.stone);

        const metalConsumptionEl = document.getElementById('daily-metal-consumption');
        const metalNetEl = document.getElementById('daily-metal-net');
        if (metalConsumptionEl) metalConsumptionEl.textContent = '0';
        if (metalNetEl) metalNetEl.textContent = Math.round(currentProduction.metal);

        const productionConsumptionEl = document.getElementById('daily-production-consumption');
        const productionNetEl = document.getElementById('daily-production-net');
        if (productionConsumptionEl) productionConsumptionEl.textContent = '0';
        if (productionNetEl) productionNetEl.textContent = Math.round(currentProduction.production);

        // Update production sources
        this.updateProductionSources();
    }

    updateProductionSources() {
        if (!this.gameState.jobManager) return;

        const detailedProduction = this.gameState.jobManager.calculateDetailedDailyProduction();
        const sources = detailedProduction.sources;
        const workerCounts = detailedProduction.workerCounts;

        // Update food sources
        const foodSourcesEl = document.querySelector('#food-sources .sources-list');
        if (foodSourcesEl) {
            const foodSources = [];
            if (sources.food && sources.food.length > 0) {
                foodSources.push(...sources.food);
            }
            // Add worker count summary if there are workers
            if (workerCounts.food > 0) {
                foodSources.push(`Total: ${workerCounts.food} workers`);
            }
            // Add population upkeep as a loss source
            foodSources.push('Population upkeep -5');
            foodSourcesEl.textContent = foodSources.join(', ');
        }

        // Update wood sources
        const woodSourcesEl = document.querySelector('#wood-sources .sources-list');
        if (woodSourcesEl) {
            const woodSources = [];
            if (sources.wood && sources.wood.length > 0) {
                woodSources.push(...sources.wood);
            }
            if (workerCounts.wood > 0) {
                woodSources.push(`Total: ${workerCounts.wood} workers`);
            }
            if (woodSources.length === 0) {
                woodSources.push('No production');
            }
            woodSourcesEl.textContent = woodSources.join(', ');
        }

        // Update stone sources
        const stoneSourcesEl = document.querySelector('#stone-sources .sources-list');
        if (stoneSourcesEl) {
            const stoneSources = [];
            if (sources.stone && sources.stone.length > 0) {
                stoneSources.push(...sources.stone);
            }
            if (workerCounts.stone > 0) {
                stoneSources.push(`Total: ${workerCounts.stone} workers`);
            }
            if (stoneSources.length === 0) {
                stoneSources.push('No production');
            }
            stoneSourcesEl.textContent = stoneSources.join(', ');
        }

        // Update metal sources
        const metalSourcesEl = document.querySelector('#metal-sources .sources-list');
        if (metalSourcesEl) {
            const metalSources = [];
            if (sources.metal && sources.metal.length > 0) {
                metalSources.push(...sources.metal);
            }
            if (workerCounts.metal > 0) {
                metalSources.push(`Total: ${workerCounts.metal} workers`);
            }
            if (metalSources.length === 0) {
                metalSources.push('No production');
            }
            metalSourcesEl.textContent = metalSources.join(', ');
        }

        // Update production sources
        const productionSourcesEl = document.querySelector('#production-sources .sources-list');
        if (productionSourcesEl) {
            const productionSources = [];
            if (sources.production && sources.production.length > 0) {
                productionSources.push(...sources.production);
            }
            if (workerCounts.production > 0) {
                productionSources.push(`Total: ${workerCounts.production} workers`);
            }
            if (productionSources.length === 0) {
                productionSources.push('No production');
            }
            productionSourcesEl.textContent = productionSources.join(', ');
        }
    }

    // Population View System
    setupPopulationViewButton() {
        const populationBtn = document.getElementById('population-view-btn');
        if (populationBtn) {
            let isPopulationModalOpen = false;
            populationBtn.addEventListener('click', () => {
                // Prevent rapid clicking and errors
                if (isPopulationModalOpen) {
                    console.log('[Village] Population modal already open, ignoring click');
                    return;
                }
                isPopulationModalOpen = true;
                console.log('[Village] Population view button clicked');
                this.showPopulationView();

                // Reset the flag after a short delay
                setTimeout(() => {
                    isPopulationModalOpen = false;
                }, 1000);
            });
            console.log('[Village] Population view button set up');
        } else {
            console.error('[Village] population-view-btn element not found');
        }
    }

    setupJobsButton() {
        const jobsBtn = document.getElementById('jobs-btn');
        if (jobsBtn) {
            let isJobsModalOpen = false;
            jobsBtn.addEventListener('click', () => {
                // Prevent rapid clicking and duplicate modals
                if (isJobsModalOpen) {
                    console.log('[Village] Jobs modal already open, ignoring click');
                    return;
                }
                isJobsModalOpen = true;
                this.showJobsManagement();

                // Reset the flag after a short delay
                setTimeout(() => {
                    isJobsModalOpen = false;
                }, 1000);
            });
            console.log('[Village] Jobs button event listener added');
        } else {
            console.warn('[Village] Jobs button not found');
        }
    }

    setupEffectsButton() {
        const effectsBtn = document.getElementById('effects-btn');
        if (effectsBtn) {
            let isEffectsModalOpen = false;
            effectsBtn.addEventListener('click', () => {
                // Prevent rapid clicking and duplicate modals
                if (isEffectsModalOpen) {
                    console.log('[Village] Effects modal already open, ignoring click');
                    return;
                }
                isEffectsModalOpen = true;
                this.showEffectsManagement();

                // Reset the flag after a short delay
                setTimeout(() => {
                    isEffectsModalOpen = false;
                }, 1000);
            });
            console.log('[Village] Effects button event listener added');
        } else {
            console.warn('[Village] Effects button not found');
        }
    }

    showJobsManagement() {
        // Initialize job manager if not already done
        if (!this.gameState.jobManager) {
            this.gameState.jobManager = new JobManager(this.gameState);
        }

        // Update available jobs
        this.gameState.jobManager.updateAvailableJobs();

        const availableJobs = this.gameState.jobManager.getAllAvailableJobs();
        const availableWorkers = this.gameState.jobManager.getAvailableWorkers();
        const jobSummary = this.gameState.jobManager.getJobSummary();
        const jobStats = this.gameState.jobManager.getJobDistributionStats();

        let contentHTML = `
            <div style="padding: 20px; max-width: 1000px;">
                <h2 style="color: #3498db; margin-bottom: 20px; text-align: center;">🔨 Jobs Management</h2>
                
                <!-- Job Distribution Visualization -->
                ${this.generateJobVisualization(jobStats)}
                
                <!-- Summary Stats -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    <div style="background: rgba(52, 152, 219, 0.2); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="color: #3498db; font-weight: bold;">Total Jobs</div>
                        <div style="color: #ecf0f1; font-size: 18px;">${jobSummary.totalJobs}</div>
                    </div>
                    <div style="background: rgba(46, 204, 113, 0.2); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="color: #2ecc71; font-weight: bold;">Filled Jobs</div>
                        <div style="color: #ecf0f1; font-size: 18px;">${jobSummary.totalWorkers}</div>
                    </div>
                    <div style="background: rgba(241, 196, 15, 0.2); padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="color: #f1c40f; font-weight: bold;">Available Workers</div>
                        <div style="color: #ecf0f1; font-size: 18px;">${availableWorkers.length}</div>
                    </div>
                </div>
        `;

        // Available Jobs Section
        if (availableJobs.length > 0) {
            contentHTML += `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #2ecc71; margin-bottom: 15px;">📋 Available Job Positions</h3>
                    <div style="display: grid; gap: 10px;">
            `;

            availableJobs.forEach(job => {
                const jobIcon = this.getJobIcon(job.jobType);
                contentHTML += `
                    <div style="background: rgba(39, 174, 96, 0.1); border: 1px solid #27ae60; border-radius: 8px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;">${job.buildingIcon}</span>
                                <div>
                                    <div style="color: #2ecc71; font-weight: bold;">${jobIcon} ${job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}</div>
                                    <div style="color: #bdc3c7; font-size: 12px;">${job.buildingType} (${job.position.x}, ${job.position.y})</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #ecf0f1; font-size: 14px;">${job.currentWorkers}/${job.maxWorkers} filled</div>
                                <div style="color: #f39c12; font-size: 12px;">${job.availableSlots} available</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            contentHTML += `</div></div>`;
        }

        // Available Workers Section
        if (availableWorkers.length > 0) {
            contentHTML += `
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #e74c3c; margin-bottom: 15px;">👥 Available Workers</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
            `;

            availableWorkers.slice(0, 8).forEach(worker => { // Show first 8 workers
                const bestSkill = this.getBestSkill(worker.skills);
                contentHTML += `
                    <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; border-radius: 8px; padding: 10px;">
                        <div style="color: #e74c3c; font-weight: bold; margin-bottom: 5px;">${worker.name}</div>
                        <div style="color: #bdc3c7; font-size: 12px; margin-bottom: 3px;">Age: ${worker.age}</div>
                        <div style="color: #bdc3c7; font-size: 12px; margin-bottom: 3px;">Health: ${worker.health}%</div>
                        ${bestSkill ? `<div style="color: #f39c12; font-size: 12px;">Best: ${bestSkill.name} (${bestSkill.level})</div>` : ''}
                    </div>
                `;
            });

            if (availableWorkers.length > 8) {
                contentHTML += `
                    <div style="background: rgba(149, 165, 166, 0.1); border: 1px solid #95a5a6; border-radius: 8px; padding: 10px; display: flex; align-items: center; justify-content: center;">
                        <div style="color: #95a5a6; text-align: center;">
                            <div style="font-weight: bold;">+${availableWorkers.length - 8} more</div>
                            <div style="font-size: 12px;">workers available</div>
                        </div>
                    </div>
                `;
            }

            contentHTML += `</div></div>`;
        }

        // Auto-assign button
        contentHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.villageManager.autoAssignAllWorkers()" 
                        style="background: linear-gradient(45deg, #3498db, #2ecc71); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">
                    🔄 Auto-Assign Workers
                </button>
            </div>
        `;

        contentHTML += `</div>`;

        // Show the modal with expanded width
        if (window.showModal) {
            window.showModal('Jobs Management', contentHTML, {
                maxWidth: '900px',
                width: '90vw'
            });
        } else {
            console.warn('[Village] showModal function not available');
        }
    }

    showEffectsManagement() {
        // Initialize effects manager if not already done
        if (!window.effectsManager) {
            console.warn('[Village] Effects manager not available');
            return;
        }

        const effectsSummary = window.effectsManager.getEffectSummary();
        const activeEffects = window.effectsManager.getActiveEffects();

        let contentHTML = `
            <div style="padding: 20px; color: #ecf0f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <h2 style="color: #3498db; margin-bottom: 20px; text-align: center;">✨ Village Effects</h2>
                
                <div style="margin-bottom: 25px; background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px;">
                    <h3 style="color: #3498db; margin: 0 0 10px 0;">📊 Effects Summary</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${effectsSummary.total}</div>
                            <div style="font-size: 12px;">Total Active Effects</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #9b59b6;">${effectsSummary.magical}</div>
                            <div style="font-size: 12px;">⚡ Magical Effects</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #2ecc71;">${effectsSummary.weather}</div>
                            <div style="font-size: 12px;">🌤️ Weather Effects</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #f39c12;">${(effectsSummary.buildingEfficiency * 100).toFixed(0)}%</div>
                            <div style="font-size: 12px;">🏗️ Building Efficiency</div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <h3 style="color: #3498db; margin: 0 0 15px 0;">🔮 Active Effects</h3>
        `;

        if (activeEffects.length === 0) {
            contentHTML += `
                <div style="text-align: center; padding: 40px; background: rgba(149, 165, 166, 0.1); border-radius: 8px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🌟</div>
                    <p style="margin: 0; color: #95a5a6;">No active effects</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #7f8c8d;">Use magic runes or wait for weather changes to see effects here.</p>
                </div>
            `;
        } else {
            contentHTML += `<div style="display: grid; gap: 15px;">`;

            activeEffects.forEach(effect => {
                const remaining = window.effectsManager.getEffectRemainingDays(effect.id);
                const progressPercent = ((effect.duration - remaining) / effect.duration) * 100;

                contentHTML += `
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #3498db;">
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 24px;">${effect.icon}</span>
                                <div>
                                    <div style="font-weight: bold; color: #3498db;">${effect.name}</div>
                                    <div style="font-size: 12px; color: #95a5a6;">${effect.description}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: bold; color: #e74c3c;">${remaining} days</div>
                                <div style="font-size: 11px; color: #95a5a6;">remaining</div>
                            </div>
                        </div>
                        
                        <div style="background: rgba(0,0,0,0.2); border-radius: 10px; height: 6px; margin-bottom: 10px;">
                            <div style="background: linear-gradient(90deg, #3498db, #2ecc71); height: 100%; border-radius: 10px; width: ${progressPercent}%;"></div>
                        </div>
                        
                        <div style="font-size: 11px; color: #bdc3c7;">
                            Category: <span style="color: #f39c12; text-transform: capitalize;">${effect.category}</span>
                `;

                // Show effect details
                if (effect.effects) {
                    const effectsList = Object.entries(effect.effects).map(([key, value]) => {
                        const effectName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        const multiplierText = typeof value === 'number' && value !== 1 ?
                            ` (${value > 1 ? '+' : ''}${((value - 1) * 100).toFixed(0)}%)` : '';
                        return `${effectName}${multiplierText}`;
                    }).join(', ');

                    contentHTML += ` | Effects: <span style="color: #2ecc71;">${effectsList}</span>`;
                }

                contentHTML += `
                        </div>
                    </div>
                `;
            });

            contentHTML += `</div>`;
        }

        contentHTML += `
                </div>

                <div style="margin-top: 25px;">
                    <h3 style="color: #3498db; margin: 0 0 15px 0;">🧙‍♂️ Apply Effects</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                        
                        <div style="background: rgba(155, 89, 182, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(155, 89, 182, 0.3);">
                            <div style="text-align: center; margin-bottom: 10px;">
                                <span style="font-size: 32px;">⚡</span>
                                <div style="font-weight: bold; color: #9b59b6;">Haste Rune</div>
                                <div style="font-size: 12px; color: #95a5a6;">+50% Building Efficiency</div>
                            </div>
                            <button onclick="window.effectsManager.applyHasteRune(10); setTimeout(() => window.villageManager.showEffectsManagement(), 500);" 
                                    style="width: 100%; padding: 8px; background: #9b59b6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Apply (10 days)
                            </button>
                        </div>

                        <div style="background: rgba(52, 152, 219, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(52, 152, 219, 0.3);">
                            <div style="text-align: center; margin-bottom: 10px;">
                                <span style="font-size: 32px;">☀️</span>
                                <div style="font-weight: bold; color: #3498db;">Sunny Weather</div>
                                <div style="font-size: 12px; color: #95a5a6;">Farm +20%, Quarry +10%</div>
                            </div>
                            <button onclick="window.effectsManager.applyWeatherEffect('sunny', 3); setTimeout(() => window.villageManager.showEffectsManagement(), 500);" 
                                    style="width: 100%; padding: 8px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Apply (3 days)
                            </button>
                        </div>

                        <div style="background: rgba(46, 204, 113, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(46, 204, 113, 0.3);">
                            <div style="text-align: center; margin-bottom: 10px;">
                                <span style="font-size: 32px;">🌧️</span>
                                <div style="font-weight: bold; color: #2ecc71;">Rainy Weather</div>
                                <div style="font-size: 12px; color: #95a5a6;">Farm +30%, Others -10-20%</div>
                            </div>
                            <button onclick="window.effectsManager.applyWeatherEffect('rainy', 3); setTimeout(() => window.villageManager.showEffectsManagement(), 500);" 
                                    style="width: 100%; padding: 8px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Apply (3 days)
                            </button>
                        </div>

                        <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(231, 76, 60, 0.3);">
                            <div style="text-align: center; margin-bottom: 10px;">
                                <span style="font-size: 32px;">⛈️</span>
                                <div style="font-weight: bold; color: #e74c3c;">Storm</div>
                                <div style="font-size: 12px; color: #95a5a6;">All outdoor work -30-40%</div>
                            </div>
                            <button onclick="window.effectsManager.applyWeatherEffect('stormy', 2); setTimeout(() => window.villageManager.showEffectsManagement(), 500);" 
                                    style="width: 100%; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Apply (2 days)
                            </button>
                        </div>

                    </div>
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="window.effectsManager.activeEffects.clear(); window.effectsManager.updateBuildingEfficiency(); setTimeout(() => window.villageManager.showEffectsManagement(), 500);" 
                            style="padding: 8px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        🗑️ Clear All Effects
                    </button>
                </div>
            </div>
        `;

        // Show the modal
        if (window.showModal) {
            window.showModal('Village Effects', contentHTML, {
                maxWidth: '800px',
                width: '90vw'
            });
        } else {
            console.warn('[Village] showModal function not available');
        }
    }

    getJobIcon(jobType) {
        const icons = {
            farmer: '🌾',
            woodcutter: '🪓',
            sawyer: '🪚',
            miner: '⛏️',
            stonecutter: '🔨',
            builder: '🔨',
            crafter: '⚒️',
            gatherer: '🧺',
            foreman: '👷‍♂️'
        };
        return icons[jobType] || '👷';
    }

    getBestSkill(skills) {
        if (!skills || Object.keys(skills).length === 0) return null;

        let bestSkill = null;
        let highestLevel = 0;

        Object.entries(skills).forEach(([skillName, level]) => {
            if (level > highestLevel) {
                highestLevel = level;
                bestSkill = { name: skillName, level };
            }
        });

        return bestSkill;
    }

    autoAssignAllWorkers() {
        if (!this.gameState.jobManager) {
            this.gameState.jobManager = new JobManager(this.gameState);
        }

        const assigned = this.gameState.jobManager.autoAssignWorkers();

        if (window.showNotification) {
            window.showNotification(
                `🔄 Auto-Assignment Complete!`,
                `Assigned ${assigned} workers to available jobs`,
                { timeout: 3000, icon: '👷' }
            );
        }

        // Refresh the jobs panel
        setTimeout(() => this.showJobsManagement(), 500);
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

        const roles = ['peasant', 'farmer', 'builder', 'gatherer', 'woodcutter', 'crafter', 'worker'];
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
        console.log('[Village] showPopulationView called');

        // Initialize population manager if needed
        this.initializePopulationManager();

        if (!this.gameState.populationManager) {
            console.error('[Village] PopulationManager not available for population view');
            if (window.modalSystem) {
                window.modalSystem.showMessage('Population Unavailable', 'Population management system is not initialized.');
            }
            return;
        }

        console.log('[Village] PopulationManager available, getting population data');
        const populationData = this.gameState.populationManager.getDetailedStatistics();

        // Generate enhanced content HTML with modern design and skill system
        let contentHTML = `
            <div class="population-overview">
                <div class="overview-header">
                    <h3><span class="header-icon">👥</span> Population Management</h3>
                    <div class="overview-subtitle">Manage your village demographics, workforce, and skills</div>
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
                        <div class="stat-icon">😊</div>
                        <div class="stat-content">
                            <div class="stat-value">${Math.round(populationData.happiness.average)}%</div>
                            <div class="stat-label">Avg Happiness</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-content">
                            <div class="stat-value">${Math.round(populationData.productivity.average * 100)}%</div>
                            <div class="stat-label">Avg Productivity</div>
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
        `;

        // Add skills section if skill system is available
        if (populationData.skills && populationData.skills.available) {
            contentHTML += `
                <div class="population-section">
                    <div class="section-header">
                        <h4><span class="section-icon">🎯</span> Skills & Training</h4>
                        <div class="section-subtitle">Population expertise and development</div>
                    </div>
                    <div class="skills-overview">
                        <div class="skills-stats">
                            <div class="skill-stat">
                                <span class="skill-stat-icon">📚</span>
                                <span class="skill-stat-value">${populationData.skills.totalSkills}</span>
                                <span class="skill-stat-label">Total Skills</span>
                            </div>
                            <div class="skill-stat">
                                <span class="skill-stat-icon">👨‍🏫</span>
                                <span class="skill-stat-value">${populationData.training.mentors}</span>
                                <span class="skill-stat-label">Mentors</span>
                            </div>
                            <div class="skill-stat">
                                <span class="skill-stat-icon">📖</span>
                                <span class="skill-stat-value">${populationData.training.total}</span>
                                <span class="skill-stat-label">In Training</span>
                            </div>
                            <div class="skill-stat">
                                <span class="skill-stat-icon">⚡</span>
                                <span class="skill-stat-value">${Math.round(populationData.skills.averageSkillsPerVillager * 10) / 10}</span>
                                <span class="skill-stat-label">Avg Skills/Person</span>
                            </div>
                        </div>
                        
                        <div class="skill-levels">
                            <h5>Skill Level Distribution</h5>
                            <div class="skill-level-bars">
            `;

            // Check if skills data exists and has overview
            if (populationData.skills && populationData.skills.overview) {
                // Calculate total level counts across all skills
                const levelCounts = {
                    novice: 0,
                    apprentice: 0,
                    journeyman: 0,
                    expert: 0,
                    master: 0
                };

                Object.values(populationData.skills.overview).forEach(skillData => {
                    levelCounts.novice += skillData.novice || 0;
                    levelCounts.apprentice += skillData.apprentice || 0;
                    levelCounts.journeyman += skillData.journeyman || 0;
                    levelCounts.expert += skillData.expert || 0;
                    levelCounts.master += skillData.master || 0;
                });

                Object.entries(levelCounts).forEach(([level, count]) => {
                    if (count > 0) {
                        const percentage = Math.round((count / populationData.skills.totalSkills * 100));
                        const levelIcons = {
                            novice: '🔰',
                            apprentice: '🥉',
                            journeyman: '🥈',
                            expert: '🥇',
                            master: '💎'
                        };

                        contentHTML += `
                            <div class="skill-level-bar">
                                <div class="skill-level-info">
                                    <span class="skill-level-icon">${levelIcons[level]}</span>
                                    <span class="skill-level-name">${level.charAt(0).toUpperCase() + level.slice(1)}</span>
                                    <span class="skill-level-count">${count}</span>
                                </div>
                                <div class="skill-level-progress">
                                    <div class="skill-level-fill skill-level-${level}" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    }
                });
            } else {
                contentHTML += `
                    <div class="no-skills-message">
                        <span class="message-icon">📚</span>
                        <span class="message-text">No skilled villagers yet. Skills develop through work experience.</span>
                    </div>
                `;
            }

            contentHTML += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add happiness section
        contentHTML += `
                <div class="population-section">
                    <div class="section-header">
                        <h4><span class="section-icon">😊</span> Happiness & Morale</h4>
                        <div class="section-subtitle">Population satisfaction and well-being</div>
                    </div>
                    <div class="happiness-overview">
                        <div class="happiness-meter">
                            <div class="happiness-value">${Math.round(populationData.happiness.average)}%</div>
                            <div class="happiness-label">Average Happiness</div>
                        </div>
                        <div class="happiness-distribution">
        `;

        const happinessLabels = {
            veryUnhappy: { icon: '😢', label: 'Very Unhappy', color: '#e74c3c' },
            unhappy: { icon: '😞', label: 'Unhappy', color: '#f39c12' },
            neutral: { icon: '😐', label: 'Neutral', color: '#95a5a6' },
            happy: { icon: '😊', label: 'Happy', color: '#27ae60' },
            veryHappy: { icon: '😍', label: 'Very Happy', color: '#2ecc71' }
        };

        Object.entries(populationData.happiness.distribution).forEach(([level, count]) => {
            if (count > 0) {
                const percentage = Math.round((count / populationData.happiness.total * 100));
                const info = happinessLabels[level];

                // Safety check for undefined happiness levels
                if (!info) {
                    console.warn(`[Village] Unknown happiness level: ${level}`);
                    return; // Skip this entry
                }

                contentHTML += `
                    <div class="happiness-bar">
                        <div class="happiness-info">
                            <span class="happiness-icon">${info.icon}</span>
                            <span class="happiness-name">${info.label}</span>
                            <span class="happiness-count">${count}</span>
                        </div>
                        <div class="happiness-progress">
                            <div class="happiness-fill" style="width: ${percentage}%; background-color: ${info.color}"></div>
                        </div>
                    </div>
                `;
            }
        });

        contentHTML += `
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="population-actions">
                <button class="action-btn primary" onclick="window.villageManager.showDetailedPopulationView();">
                    <span class="btn-icon">📋</span>
                    <span class="btn-text">View Individual Villagers</span>
                </button>
                <button class="action-btn secondary" onclick="window.villageManager.showSkillTrainingModal();">
                    <span class="btn-icon">🎓</span>
                    <span class="btn-text">Manage Training</span>
                </button>
                <button class="action-btn secondary" onclick="window.modalSystem.closeTopModal();">
                    <span class="btn-icon">✖️</span>
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
            maxWidth: '900px',
            customClass: 'population-modal modern-modal enhanced-population'
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

    // Building Management Modal
    showBuildingManagement(buildingId) {
        const building = this.gameState.buildings.find(b => b.id === buildingId);
        if (!building) {
            console.error('[Village] Building not found for management:', buildingId);
            return;
        }

        const bonuses = this.buildingEffectsManager?.getActiveBonuses() || {};
        const buildingKey = `${building.type}_${building.x},${building.y}`;
        const buildingBonus = bonuses[buildingKey];
        const currentLevel = buildingBonus?.level || building.level || 1;
        const specialization = buildingBonus?.specialization;

        let contentHTML = `
            <div class="building-management">
                <div class="building-header">
                    <div class="building-icon">${GameData.getBuildingIcon(building.type)}</div>
                    <div class="building-details">
                        <h3>${GameData.getBuildingName(building.type)}</h3>
                        <p>Level ${currentLevel} ${specialization ? `(${specialization})` : ''}</p>
                        <p class="building-location">Position: ${building.x}, ${building.y}</p>
                    </div>
                </div>

                <div class="building-stats">
                    <h4>🔧 Building Effects</h4>
                    <div class="effects-grid">
        `;

        // Show building effects from GameData
        const buildingInfo = GameData.buildingInfo[building.type];
        if (buildingInfo?.effects) {
            contentHTML += `
                <div class="building-effects-description">
                    <p class="effects-text">${buildingInfo.effects}</p>
                </div>
            `;
        }

        // Show dynamic building effects from building effects manager
        if (buildingBonus?.effects) {
            contentHTML += `<div class="dynamic-effects-title"><strong>Active Bonuses:</strong></div>`;
            Object.entries(buildingBonus.effects).forEach(([effect, value]) => {
                let displayValue = value;
                let displayName = effect.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                if (typeof value === 'number') {
                    if (value < 1 && value > 0) {
                        displayValue = `+${Math.round(value * 100)}%`;
                    } else if (value > 1 && value < 10) {
                        displayValue = `${value.toFixed(1)}x`;
                    } else {
                        displayValue = `+${Math.floor(value)}`;
                    }
                } else if (typeof value === 'boolean' && value) {
                    displayValue = 'Enabled';
                }

                contentHTML += `
                    <div class="effect-item">
                        <span class="effect-name">${displayName}:</span>
                        <span class="effect-value">${displayValue}</span>
                    </div>
                `;
            });
        } else if (!buildingInfo?.effects) {
            contentHTML += `<p class="no-effects">No special effects for this building type.</p>`;
        }

        contentHTML += `
                    </div>
                </div>

                ${this.getBuildingJobInfo(buildingId, building)}

                <div class="building-actions">
                    <h4>⚙️ Building Actions</h4>
                    <div class="action-buttons">
        `;

        // Upgrade button
        if (this.buildingEffectsManager?.canUpgradeBuilding(building.type, `${building.x},${building.y}`)) {
            const upgradeCost = this.buildingEffectsManager.getBuildingUpgradeCost(building.type, `${building.x},${building.y}`);
            const canAfford = Object.entries(upgradeCost).every(([resource, cost]) =>
                (this.gameState.resources[resource] || 0) >= cost
            );

            contentHTML += `
                <button class="action-btn upgrade-btn${canAfford ? '' : ' disabled'}" 
                        onclick="window.villageManager.upgradeBuilding('${building.type}', '${building.x},${building.y}')"
                        ${canAfford ? '' : 'disabled'}>
                    🔧 Upgrade to Level ${currentLevel + 1}
                    <div class="cost-preview">
                        ${Object.entries(upgradeCost).map(([resource, cost]) =>
                `${cost} ${resource}`
            ).join(', ')}
                    </div>
                </button>
            `;
        } else {
            contentHTML += `
                <button class="action-btn disabled" disabled>
                    🔧 Max Level Reached
                </button>
            `;
        }

        // Specialization button (levels 5, 10, 15)
        if (currentLevel >= 5 && !specialization && [5, 10, 15].includes(currentLevel)) {
            contentHTML += `
                <button class="action-btn specialize-btn" 
                        onclick="window.villageManager.showSpecializationOptions('${building.type}', '${building.x},${building.y}')">
                    ⭐ Choose Specialization
                </button>
            `;
        }

        // Demolish button
        contentHTML += `
                <button class="action-btn demolish-btn" 
                        onclick="window.villageManager.demolishBuilding('${buildingId}')">
                    💥 Demolish Building
                </button>
        `;

        contentHTML += `
                    </div>
                </div>

                <div class="building-workers">
                    <h4>👷 Workers</h4>
                    <div class="worker-info">
        `;

        // Show assigned workers
        const assignedWorkers = this.getAssignedWorkers(building);
        const workerSlots = this.getWorkerSlotsForBuilding(building);

        contentHTML += `
                        <p>Assigned: ${assignedWorkers.length} / ${workerSlots} workers</p>
                        <div class="worker-list">
        `;

        assignedWorkers.forEach(worker => {
            contentHTML += `
                            <div class="worker-item">
                                <span class="worker-name">${worker.name}</span>
                                <span class="worker-role">(${worker.role})</span>
                            </div>
            `;
        });

        if (assignedWorkers.length === 0) {
            contentHTML += `<p class="no-workers">No workers assigned</p>`;
        }

        contentHTML += `
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show the modal
        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: `🏗️ Building Management`,
                content: contentHTML,
                width: '600px',
                className: 'building-management-modal'
            });
        }
    }

    // Get job information for a building
    getBuildingJobInfo(buildingId, building) {
        if (!window.gameState?.jobManager) {
            return '';
        }

        const buildingJobs = window.gameState.jobManager.availableJobs.get(buildingId);
        if (!buildingJobs || Object.keys(buildingJobs).length === 0) {
            return `
                <div style="background: rgba(149, 165, 166, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="color: #95a5a6; margin-bottom: 8px;">💼 Jobs Available</h4>
                    <div style="color: #bdc3c7; font-size: 14px;">This building does not provide any job positions.</div>
                </div>
            `;
        }

        let jobInfoHTML = `
            <div style="background: rgba(241, 196, 15, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="color: #f1c40f; margin-bottom: 12px;">💼 Jobs Available</h4>
        `;

        Object.entries(buildingJobs).forEach(([jobType, maxWorkers]) => {
            const assignedWorkers = window.gameState.jobManager.getWorkersInJob(buildingId, jobType) || [];
            const jobIcon = this.getJobIcon(jobType);

            jobInfoHTML += `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 18px;">${jobIcon}</span>
                            <span style="color: #ecf0f1; font-weight: bold; font-size: 16px;">
                                ${jobType.charAt(0).toUpperCase() + jobType.slice(1)}
                            </span>
                        </div>
                        <div style="color: ${assignedWorkers.length === maxWorkers ? '#27ae60' : assignedWorkers.length > 0 ? '#f39c12' : '#e74c3c'}; font-weight: bold;">
                            ${assignedWorkers.length}/${maxWorkers}
                        </div>
                    </div>
                    
                    ${assignedWorkers.length > 0 ? `
                        <div style="margin-top: 8px;">
                            <div style="color: #bdc3c7; font-size: 12px; margin-bottom: 5px;">Assigned Workers:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${assignedWorkers.map(workerId => {
                const worker = this.getWorkerById(workerId);
                if (!worker) return '';

                const skillLevel = this.getWorkerSkillLevel(worker, jobType);
                return `
                                        <span style="background: rgba(52, 152, 219, 0.2); color: #3498db; padding: 3px 6px; border-radius: 3px; font-size: 11px;">
                                            ${worker.name} (${skillLevel})
                                        </span>
                                    `;
            }).join('')}
                            </div>
                        </div>
                        
                        <!-- Production Information -->
                        ${this.getBuildingProductionInfo(jobType, assignedWorkers.length)}
                    ` : `
                        <div style="color: #95a5a6; font-size: 12px; font-style: italic;">
                            No workers assigned to this position
                        </div>
                    `}
                </div>
            `;
        });

        jobInfoHTML += `
                <div style="text-align: center; margin-top: 12px;">
                    <button onclick="window.villageManager.showJobsManagement()" 
                            style="background: linear-gradient(45deg, #f39c12, #e67e22); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        📋 Manage All Jobs
                    </button>
                </div>
            </div>
        `;

        return jobInfoHTML;
    }

    // Helper method to get worker skill level for a job
    getWorkerSkillLevel(worker, jobType) {
        if (!worker.skills) return 'Novice';

        // Map job types to relevant skills
        const skillMapping = {
            farmer: 'Agriculture',
            builder: 'Carpentry',
            gatherer: 'Hunting',
            woodcutter: 'Forestry',
            crafter: 'Carpentry',
            sawyer: 'Forestry',
            foreman: 'Engineering'
        };

        const relevantSkill = skillMapping[jobType] || 'Agriculture';
        const skillXP = worker.skills[relevantSkill] || 0;

        // Convert XP to skill level name
        if (skillXP >= 1001) return 'Master';
        if (skillXP >= 601) return 'Expert';
        if (skillXP >= 301) return 'Journeyman';
        if (skillXP >= 101) return 'Apprentice';
        return 'Novice';
    }

    // Upgrade building through effects manager
    upgradeBuilding(buildingType, position) {
        if (!this.buildingEffectsManager) {
            console.error('[Village] Building effects manager not available');
            return;
        }

        const upgradeCost = this.buildingEffectsManager.getBuildingUpgradeCost(buildingType, position);

        // Check if can afford
        const canAfford = Object.entries(upgradeCost).every(([resource, cost]) =>
            (this.gameState.resources[resource] || 0) >= cost
        );

        if (!canAfford) {
            this.showMessage('Insufficient Resources', 'You don\'t have enough resources to upgrade this building.');
            return;
        }

        // Spend resources
        Object.entries(upgradeCost).forEach(([resource, cost]) => {
            this.gameState.resources[resource] -= cost;
        });

        // Upgrade building
        const newLevel = this.buildingEffectsManager.upgradeBuildingLevel(buildingType, position);

        this.showNotification(
            'Building Upgraded!',
            `${buildingType} upgraded to level ${newLevel}`,
            'success',
            3000
        );

        // Update displays
        this.renderBuildings();
        this.gameState.updateResourcesDisplay();

        // Close modal and reopen to show new stats
        if (window.modalSystem) {
            window.modalSystem.closeModal();
        }

        // Find building and reopen management
        const building = this.gameState.buildings.find(b =>
            b.type === buildingType && `${b.x},${b.y}` === position
        );
        if (building) {
            setTimeout(() => this.showBuildingManagement(building.id), 100);
        }
    }

    // Show specialization options
    showSpecializationOptions(buildingType, position) {
        // Define specializations per building type
        const specializations = {
            barracks: [
                { id: 'elite', name: 'Elite Training', description: 'Trains elite units with +20 morale bonus' },
                { id: 'rapid', name: 'Rapid Deployment', description: '50% faster unit recruitment' },
                { id: 'fortified', name: 'Fortified Barracks', description: '+30 defense and siege resistance' }
            ],
            workshop: [
                { id: 'masterwork', name: 'Masterwork Crafting', description: '15% chance for masterwork items' },
                { id: 'mass', name: 'Mass Production', description: '40% faster crafting speed' },
                { id: 'precision', name: 'Precision Tools', description: 'Crafted tools last 50% longer' }
            ],
            mine: [
                { id: 'deep', name: 'Deep Mining', description: 'Access rare ores and +15% chance for rare finds' },
                { id: 'efficient', name: 'Efficient Extraction', description: '60% bonus to ore/stone yield' },
                { id: 'safe', name: 'Safety First', description: 'No mining accidents, +20% worker satisfaction' }
            ]
            // Add more building specializations as needed
        };

        const availableSpecs = specializations[buildingType] || [];

        if (availableSpecs.length === 0) {
            this.showMessage('No Specializations', 'This building type does not have specialization options.');
            return;
        }

        let contentHTML = `
            <div class="specialization-selection">
                <p>Choose a specialization for your ${buildingType}. This is permanent and cannot be changed.</p>
                <div class="specialization-options">
        `;

        availableSpecs.forEach(spec => {
            contentHTML += `
                <div class="specialization-option" 
                     onclick="window.villageManager.applySpecialization('${buildingType}', '${position}', '${spec.id}')">
                    <h4>${spec.name}</h4>
                    <p>${spec.description}</p>
                </div>
            `;
        });

        contentHTML += `
                </div>
            </div>
        `;

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: '⭐ Choose Specialization',
                content: contentHTML,
                width: '500px',
                className: 'specialization-modal'
            });
        }
    }

    // Apply specialization to building
    applySpecialization(buildingType, position, specializationId) {
        if (!this.buildingEffectsManager) {
            console.error('[Village] Building effects manager not available');
            return;
        }

        const success = this.buildingEffectsManager.addBuildingSpecialization(buildingType, position, specializationId);

        if (success) {
            this.showNotification(
                'Specialization Applied!',
                `${buildingType} has been specialized`,
                'success',
                3000
            );

            // Close modal and return to building management
            if (window.modalSystem) {
                window.modalSystem.closeModal();
            }

            const building = this.gameState.buildings.find(b =>
                b.type === buildingType && `${b.x},${b.y}` === position
            );
            if (building) {
                setTimeout(() => this.showBuildingManagement(building.id), 100);
            }
        }
    }

    // Demolish building
    demolishBuilding(buildingId) {
        const building = this.gameState.buildings.find(b => b.id === buildingId);
        if (!building) {
            console.error('[Village] Building not found for demolition:', buildingId);
            return;
        }

        // Confirm demolition
        if (!confirm(`Are you sure you want to demolish this ${building.type}? This action cannot be undone.`)) {
            return;
        }

        // Remove building effects
        if (this.buildingEffectsManager) {
            this.buildingEffectsManager.removeBuildingEffects(building.type, `${building.x},${building.y}`);
        }

        // Unassign workers
        const assignedWorkers = this.getAssignedWorkers(building);
        assignedWorkers.forEach(worker => {
            worker.status = 'idle';
            worker.buildingId = null;
        });

        // Remove building from gameState
        this.gameState.buildings = this.gameState.buildings.filter(b => b.id !== buildingId);

        this.showNotification(
            'Building Demolished',
            `${building.type} has been demolished`,
            'info',
            3000
        );

        // Update displays
        this.renderBuildings();

        // Close modal
        if (window.modalSystem) {
            window.modalSystem.closeModal();
        }
    }

    // Inventory UI Methods
    showInventoryModal() {
        if (!window.inventoryManager) {
            console.error('[Village] InventoryManager not available');
            // Try to initialize if not available
            if (window.gameState && window.gameState.ensureInventoryManager) {
                window.gameState.ensureInventoryManager();
            }
            if (!window.inventoryManager) {
                return;
            }
        }

        const inventory = window.inventoryManager.getInventory();
        const equipped = window.inventoryManager.getEquippedItems();

        // Get city inventory from tile manager if available
        const cityInventory = window.tileManager ? window.tileManager.getCityInventory() : {};

        const modalContent = `
            <div class="inventory-modal">
                <h2>City Inventory & Army Supplies</h2>
                <div class="inventory-tabs">
                    <button class="tab-button active" onclick="window.villageManager.switchInventoryTab('all')">All Items</button>
                    <button class="tab-button" onclick="window.villageManager.switchInventoryTab('consumables')">Consumables</button>
                    <button class="tab-button" onclick="window.villageManager.switchInventoryTab('building')">Building Items</button>
                    <button class="tab-button" onclick="window.villageManager.switchInventoryTab('city')">City Storage</button>
                </div>
                
                <div class="inventory-notice">
                    <p><strong>📍 Note:</strong> Equipment and weapons are managed in the <strong>Throne Room</strong> → Equipment tab</p>
                </div>

                <div class="inventory-items" id="inventory-items">
                    ${this.renderInventoryItems(inventory, 'all')}
                </div>
            </div>
        `;

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: 'Inventory',
                content: modalContent,
                className: 'large'
            });
        }
    }

    switchInventoryTab(category) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        event.target.classList.add('active');

        // Update items display
        const inventory = window.inventoryManager.getInventory();
        document.getElementById('inventory-items').innerHTML = this.renderInventoryItems(inventory, category);
    }

    renderInventoryItems(inventory, category) {
        let filteredItems;

        if (category === 'city') {
            // Show city storage from tile manager
            const cityInventory = window.tileManager ? window.tileManager.getCityInventory() : {};

            // Name mapping for better display
            const itemNames = {
                'foundersWagon': GameData.getBuildingName('foundersWagon'),
                'tent': 'Tent',
                'haste_rune': 'Haste Rune',
                'haste_rune_ii': 'Haste Rune II',
                'haste_rune_iii': 'Haste Rune III'
            };

            filteredItems = Object.entries(cityInventory).map(([itemId, data]) => ({
                id: itemId,
                name: itemNames[itemId] || itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                category: 'city',
                quantity: data.quantity,
                locations: data.locations,
                description: `Stored in city locations: ${data.locations.length} tiles`
            }));
        } else {
            // Filter out equipment items (weapons, armor, tools, magical) - these go to throne room
            const equipmentTypes = ['weapon', 'armor', 'tool', 'magical'];
            const nonEquipmentInventory = inventory.filter(item => !equipmentTypes.includes(item.type));

            filteredItems = category === 'all' ?
                nonEquipmentInventory :
                nonEquipmentInventory.filter(item => item.category === category);
        }

        if (filteredItems.length === 0) {
            return '<p class="no-items">No items in this category</p>';
        }

        return filteredItems.map(item => `
            <div class="inventory-item ${item.rarity || 'common'}" data-item-id="${item.id}">
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">x${item.quantity}</span>
                </div>
                <div class="item-description">${item.description}</div>
                <div class="item-stats">
                    ${Object.entries(item.effects || {}).map(([stat, value]) =>
            `<span class="stat-bonus">+${value} ${stat}</span>`
        ).join(' ')}
                </div>
                <div class="item-actions">
                    ${category === 'city' ?
                `<button onclick="window.villageManager.viewCityItemLocations('${item.id}')">View Locations</button>` :
                this.renderItemActionButtons(item)
            }
                    <button onclick="window.villageManager.showItemDetails('${item.id}')">Details</button>
                </div>
            </div>
        `).join('');
    }

    renderItemActionButtons(item) {
        const buttons = [];

        if (item.category === 'consumable') {
            buttons.push(`<button onclick="window.villageManager.useInventoryItem('${item.id}')">Use</button>`);
        } else if (item.category === 'building' && window.inventoryManager.canPlaceBuilding && window.inventoryManager.canPlaceBuilding(item.id)) {
            buttons.push(`<button onclick="window.villageManager.placeBuildingItem('${item.id}')">Place Building</button>`);
        } else {
            buttons.push(`<button onclick="window.villageManager.equipInventoryItem('${item.id}')">Equip</button>`);
        }

        return buttons.join(' ');
    }

    // Use inventory item (for consumables)
    useInventoryItem(itemId) {
        if (!window.inventoryManager) {
            console.warn('[Village] Inventory manager not available');
            return;
        }

        const itemDef = window.inventoryManager.getItemDefinition(itemId);
        if (!itemDef) {
            console.error('[Village] Item definition not found:', itemId);
            return;
        }

        // Check if item is a haste rune (building targeter)
        if (itemDef.subcategory === 'rune' && itemDef.effects && itemDef.effects.productivityMultiplier) {
            this.enterRuneTargetingMode(itemId, itemDef);
        } else {
            // Regular consumable use
            const success = window.inventoryManager.useItem(itemId);
            if (success) {
                if (window.modalSystem) {
                    window.modalSystem.showNotification(`Used ${itemDef.name}!`, { type: 'success' });
                }
            }
        }
    }

    // Enter rune targeting mode - change cursor and wait for building click
    enterRuneTargetingMode(itemId, itemDef) {
        console.log('[Village] Entering rune targeting mode for:', itemDef.name);

        // Store targeting state
        this.runeTargeting = {
            active: true,
            itemId: itemId,
            itemDef: itemDef
        };

        // Change cursor to rune icon
        const container = document.getElementById('village-container');
        if (container) {
            container.style.cursor = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><text y=\'24\' font-size=\'20\'>⚡</text></svg>") 16 16, crosshair';
            container.classList.add('rune-targeting-mode');
        }

        // Show instruction toast
        if (window.showNotification) {
            window.showNotification(
                `🪄 Rune Active`,
                `Click on a building to apply ${itemDef.name}. Right-click to cancel.`,
                { timeout: 0, type: 'info' }
            );
        }
    }

    // Exit rune targeting mode
    exitRuneTargetingMode() {
        console.log('[Village] Exiting rune targeting mode');

        this.runeTargeting = { active: false };

        // Reset cursor
        const container = document.getElementById('village-container');
        if (container) {
            container.style.cursor = 'default';
            container.classList.remove('rune-targeting-mode');
        }

        // Clear notification
        if (window.clearNotifications) {
            window.clearNotifications();
        }
    }

    // Apply rune effect to building
    applyRuneToBuilding(buildingElement, building) {
        if (!this.runeTargeting || !this.runeTargeting.active) return false;

        const { itemId, itemDef } = this.runeTargeting;

        // Use the rune item
        const success = window.inventoryManager.useItem(itemId);
        if (success) {
            // Apply effect to building
            const effect = {
                id: `haste_rune_${building.id}_${Date.now()}`,
                type: 'haste_rune',
                name: itemDef.name,
                icon: itemDef.icon,
                buildingId: building.id,
                buildingType: building.type,
                multiplier: itemDef.effects.productivityMultiplier,
                duration: 24, // 24 in-game days
                startDay: window.gameState.currentDay || 1,
                description: `${itemDef.name} applied to ${building.type}`
            };

            // Add effect to effects manager
            if (window.gameState.effectsManager) {
                window.gameState.effectsManager.addEffect(effect);
            }

            // Show success notification
            if (window.showNotification) {
                window.showNotification(
                    `✨ Rune Applied!`,
                    `${itemDef.name} applied to ${building.type} (+${Math.round((itemDef.effects.productivityMultiplier - 1) * 100)}% efficiency for 24 days)`,
                    { timeout: 4000, type: 'success' }
                );
            }

            // Exit targeting mode
            this.exitRuneTargetingMode();

            return true;
        }

        return false;
    }

    // Show job targeting modal for haste runes
    showJobTargetingModal(itemId, itemDef) {
        if (!window.gameState || !window.gameState.populationManager) {
            console.warn('[Village] Population manager not available');
            return;
        }

        const population = window.gameState.populationManager.getAll();
        const workers = population.filter(p => p.role !== 'child' && p.role !== 'royal');

        if (workers.length === 0) {
            if (window.modalSystem) {
                window.modalSystem.showModal({
                    title: 'No Workers Available',
                    content: `
                        <div class="no-workers-modal">
                            <p>There are no workers available to boost with the ${itemDef.name}.</p>
                            <button onclick="window.modalSystem.closeTopModal()">OK</button>
                        </div>
                    `,
                    width: '300px'
                });
            }
            return;
        }

        const workerOptions = workers.map(worker => `
            <div class="worker-option">
                <button onclick="window.villageManager.applyHasteRuneToWorker('${itemId}', ${worker.id})" class="worker-btn">
                    <div class="worker-info">
                        <strong>${worker.name}</strong>
                        <span class="worker-role">${worker.role}</span>
                        <span class="boost-info">→ ${itemDef.effects.productivityMultiplier}x productivity</span>
                    </div>
                </button>
            </div>
        `).join('');

        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: `Use ${itemDef.name}`,
                content: `
                    <div class="job-targeting-modal">
                        <p>Select a worker to boost their productivity by ${itemDef.effects.productivityMultiplier}x:</p>
                        <div class="worker-list">
                            ${workerOptions}
                        </div>
                        <button onclick="window.modalSystem.closeTopModal()" class="cancel-btn">Cancel</button>
                    </div>
                `,
                width: '450px'
            });
        }
    }

    // Apply haste rune to specific worker
    applyHasteRuneToWorker(itemId, workerId) {
        if (!window.inventoryManager || !window.gameState || !window.gameState.populationManager) {
            console.warn('[Village] Required managers not available');
            return;
        }

        const itemDef = window.inventoryManager.getItemDefinition(itemId);
        const worker = window.gameState.populationManager.getById(workerId);

        if (!itemDef || !worker) {
            console.error('[Village] Item or worker not found');
            return;
        }

        // Use the item from inventory
        const success = window.inventoryManager.useItem(itemId);
        if (success) {
            // Apply productivity boost to worker
            const multiplier = itemDef.effects.productivityMultiplier;
            worker.productivityBoost = {
                multiplier: multiplier,
                source: itemDef.name,
                duration: 24, // 24 hours/days
                startDay: window.gameState.currentDay || 1
            };

            // Close modal
            if (window.modalSystem) {
                window.modalSystem.closeTopModal();
            }

            // Show success notification
            if (window.modalSystem) {
                window.modalSystem.showNotification(
                    `${worker.name} now has ${multiplier}x productivity from ${itemDef.name}!`,
                    { type: 'success' }
                );
            }

            console.log('[Village] Applied productivity boost:', {
                worker: worker.name,
                multiplier: multiplier,
                duration: 24
            });

            // Update UI
            this.gameState?.updateUI();
        }
    }

    // View city item locations
    viewCityItemLocations(itemId) {
        if (!window.tileManager) {
            console.warn('[Village] Tile manager not available');
            return;
        }

        const locations = window.tileManager.findItemLocations(itemId);
        const locationText = locations.map(loc => {
            if (loc.isCityStorage) {
                return `City Storage: ${loc.quantity} available`;
            } else {
                return `Tile (${loc.x}, ${loc.y}): ${loc.quantity}`;
            }
        }).join('<br>');

        // Get proper item name
        const itemNames = {
            'foundersWagon': GameData.getBuildingName('foundersWagon'),
            'tent': GameData.getBuildingName('tent'),
            'haste_rune': 'Haste Rune',
            'haste_rune_ii': 'Haste Rune II',
            'haste_rune_iii': 'Haste Rune III'
        };

        if (window.modalSystem) {
            window.modalSystem.showModal(`
                <div class="item-locations-modal">
                    <h3>${itemNames[itemId] || itemId} Locations</h3>
                    <div class="locations-list">
                        ${locationText || 'No locations found'}
                    </div>
                    <button onclick="window.modalSystem.closeModal()">Close</button>
                </div>
            `, 'medium');
        }
    }

    // Place building item
    placeBuildingItem(itemId) {
        if (!window.inventoryManager) {
            console.warn('[Village] Inventory manager not available');
            return;
        }

        // Close the inventory modal first
        if (window.modalSystem) {
            window.modalSystem.closeTopModal();
        }

        // Enable building placement mode
        this.enterBuildingPlacementMode(itemId);
    }

    // Enter building placement mode for inventory items
    enterBuildingPlacementMode(itemId) {
        console.log('[Village] Entering building placement mode for:', itemId);

        // Set building mode
        this.buildMode = {
            active: true,
            itemId: itemId,
            buildingType: itemId, // For tents, the itemId is the building type
            source: 'inventory'
        };

        // Add visual indicators like regular build mode
        this.villageGrid.classList.add('build-mode');
        this.villageGrid.style.cursor = 'crosshair';

        // Show placement instructions
        if (window.modalSystem) {
            window.modalSystem.showNotification(
                `Click on an empty tile to place your ${itemId}. Right-click to cancel.`,
                { type: 'info', duration: 5000 }
            );
        }

        // Update UI to show building mode
        this.gameState?.updateUI();

        // Setup ghost preview for inventory items
        this.setupInventoryBuildPreview(itemId);

        // Add event listeners for placement
        this.setupBuildingPlacementListeners();
    }

    // Setup listeners for building placement from inventory
    setupBuildingPlacementListeners() {
        const gameView = document.getElementById('village-view');
        if (!gameView) return;

        // Remove existing listeners
        this.removeBuildingPlacementListeners();

        // Add click listener for placement
        this.placementClickHandler = (event) => {
            if (!this.buildMode || !this.buildMode.active) return;

            // Get tile coordinates from click using the village grid bounds and accounting for view offset
            const rect = this.villageGrid.getBoundingClientRect();
            const offsetX = this.viewOffsetX || 0;
            const offsetY = this.viewOffsetY || 0;
            const x = Math.floor((event.clientX - rect.left - offsetX) / this.gridSize); // Use actual grid size
            const y = Math.floor((event.clientY - rect.top - offsetY) / this.gridSize);

            this.attemptBuildingPlacement(x, y);
        };

        // Add right-click listener for cancellation
        this.placementCancelHandler = (event) => {
            if (event.button === 2) { // Right click
                event.preventDefault();
                this.cancelBuildingPlacement();
            }
        };

        gameView.addEventListener('click', this.placementClickHandler);
        gameView.addEventListener('contextmenu', this.placementCancelHandler);
    }

    // Attempt to place building at coordinates
    attemptBuildingPlacement(x, y) {
        if (!this.buildMode || !window.inventoryManager || !window.tileManager) return;

        console.log('[Village] Attempting to place building at:', x, y);

        // Check if tile is valid and empty
        const tile = window.tileManager.getTileAt(x, y);
        if (!tile) {
            console.log('[Village] Invalid tile coordinates');
            return;
        }

        if (tile.building) {
            if (window.modalSystem) {
                window.modalSystem.showNotification('Tile already occupied!', { type: 'warning' });
            }
            return;
        }

        // Get the item definition to determine building type
        const item = window.inventoryManager?.getItemDefinition(this.buildMode.itemId);
        if (!item || !item.buildingType) {
            console.error('[Village] Invalid item for building placement:', this.buildMode.itemId);
            return;
        }

        // Check if we have the item in inventory
        if (!window.inventoryManager.hasItem(this.buildMode.itemId, 1)) {
            window.modalSystem.showNotification('You don\'t have this item!', { type: 'error' });
            return;
        }

        // Remove the item from inventory first
        if (!window.inventoryManager.removeItem(this.buildMode.itemId, 1)) {
            window.modalSystem.showNotification('Failed to consume item!', { type: 'error' });
            return;
        }

        // Place the building using different logic for inventory items
        const buildingType = item.buildingType;
        let success = false;

        // For inventory items like tents, place immediately without construction
        if (this.buildMode.source === 'inventory') {
            success = this.placeInventoryBuilding(buildingType, x, y);
        } else {
            success = this.placeBuilding(buildingType, x, y);
        }

        if (success) {
            console.log('[Village] Building placed successfully');

            // Re-render buildings to show the new one
            this.renderBuildings();

            // Show success notification
            if (window.modalSystem) {
                window.modalSystem.showNotification(
                    `${this.buildMode.itemId} placed successfully!`,
                    { type: 'success' }
                );
            }

            // Exit building mode
            this.cancelBuildingPlacement();

            // Update UI
            this.gameState?.updateUI();
        } else {
            // Refund the item since placement failed
            window.inventoryManager.addItem(this.buildMode.itemId, 1);
            if (window.modalSystem) {
                window.modalSystem.showNotification('Failed to place building!', { type: 'error' });
            }
        }
    }

    // Cancel building placement mode
    cancelBuildingPlacement() {
        console.log('[Village] Cancelling building placement mode');

        this.buildMode = { active: false };

        // Remove visual indicators
        this.villageGrid.classList.remove('build-mode');
        this.villageGrid.style.cursor = '';

        // Remove ghost preview
        this.removeGhostPreview();

        this.removeBuildingPlacementListeners();

        if (window.modalSystem) {
            window.modalSystem.showNotification('Building placement cancelled', { type: 'info' });
        }

        this.gameState?.updateUI();
    }

    // Remove building placement listeners
    removeBuildingPlacementListeners() {
        const gameView = document.getElementById('village-view');
        if (gameView && this.placementClickHandler) {
            gameView.removeEventListener('click', this.placementClickHandler);
            gameView.removeEventListener('contextmenu', this.placementCancelHandler);
        }
    }

    equipInventoryItem(itemId) {
        const result = window.inventoryManager.equipItem(itemId);
        if (result.success) {
            this.showNotification('Item Equipped', result.message, 'success', 3000);
            // Refresh inventory display
            this.showInventoryModal();
        } else {
            this.showNotification('Cannot Equip Item', result.message, 'error', 3000);
        }
    }

    unequipItem(slot) {
        const result = window.inventoryManager.unequipItem(slot);
        if (result.success) {
            this.showNotification('Item Unequipped', result.message, 'success', 3000);
            // Refresh inventory display
            this.showInventoryModal();
        } else {
            this.showNotification('Cannot Unequip Item', result.message, 'error', 3000);
        }
    }

    showItemDetails(itemId) {
        const item = window.inventoryManager.getItemById(itemId);
        if (!item) return;

        const detailsContent = `
            <div class="item-details">
                <h3 class="${item.rarity}">${item.name}</h3>
                <p class="item-category">Category: ${item.category}</p>
                <p class="item-rarity">Rarity: ${item.rarity}</p>
                <p class="item-description">${item.description}</p>
                
                ${item.effects && Object.keys(item.effects).length > 0 ? `
                    <div class="item-effects">
                        <h4>Effects:</h4>
                        ${Object.entries(item.effects).map(([stat, value]) =>
            `<p>+${value} ${stat}</p>`
        ).join('')}
                    </div>
                ` : ''}
                
                ${item.craftingCost ? `
                    <div class="crafting-cost">
                        <h4>Crafting Cost:</h4>
                        ${Object.entries(item.craftingCost).map(([resource, amount]) =>
            `<p>${amount} ${resource}</p>`
        ).join('')}
                    </div>
                ` : ''}
                
                ${item.requirements ? `
                    <div class="requirements">
                        <h4>Requirements:</h4>
                        ${Object.entries(item.requirements).map(([req, value]) =>
            `<p>${req}: ${value}</p>`
        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        if (window.modalSystem) {
            window.modalSystem.showModal(detailsContent, 'medium');
        }
    }

    // Debug method to add test items
    addTestItems() {
        if (!window.inventoryManager) {
            console.error('[Village] InventoryManager not available');
            return;
        }

        // Add various test items
        window.inventoryManager.addItem('steel_sword', 1);
        window.inventoryManager.addItem('chainmail_armor', 1);
        window.inventoryManager.addItem('steel_pickaxe', 1);
        window.inventoryManager.addItem('magic_staff', 1);
        window.inventoryManager.addItem('enchanted_ring', 1);
        window.inventoryManager.addItem('healing_potion', 5);
        window.inventoryManager.addItem('rune_of_power', 2);

        this.showNotification('Test Items Added', 'Added various test items to inventory', 'success', 3000);
        console.log('[Village] Test items added to inventory');
    }

    /**
     * Show skill training modal for managing population training programs
     */
    showSkillTrainingModal() {
        console.log('[Village] showSkillTrainingModal called');

        if (!this.gameState.populationManager || !this.gameState.populationManager.skillSystem) {
            window.modalSystem.showMessage('Skills Unavailable', 'Skill system is not available in this game.');
            return;
        }

        const populationManager = this.gameState.populationManager;
        const skillSystem = populationManager.skillSystem;
        const population = populationManager.getAll();

        // Get available training programs
        const trainingPrograms = skillSystem.trainingPrograms;
        const skillCategories = skillSystem.skillCategories;

        // Get population eligible for training
        const eligibleForTraining = population.filter(villager =>
            villager.age >= 16 && villager.age <= 190 &&
            villager.status !== 'training' &&
            villager.status !== 'traveling' &&
            villager.status !== 'sick'
        );

        // Get currently training population
        const inTraining = population.filter(villager => villager.status === 'training');

        let contentHTML = `
            <div class="skill-training-overview">
                <div class="training-header">
                    <h3><span class="header-icon">🎓</span> Skill Training Management</h3>
                    <div class="training-subtitle">Develop your population's expertise through training programs</div>
                </div>
                
                <div class="training-stats">
                    <div class="training-stat">
                        <span class="stat-icon">👨‍🎓</span>
                        <span class="stat-value">${eligibleForTraining.length}</span>
                        <span class="stat-label">Eligible for Training</span>
                    </div>
                    <div class="training-stat">
                        <span class="stat-icon">📚</span>
                        <span class="stat-value">${inTraining.length}</span>
                        <span class="stat-label">Currently Training</span>
                    </div>
                    <div class="training-stat">
                        <span class="stat-icon">👨‍🏫</span>
                        <span class="stat-value">${population.filter(v => v.mentoring).length}</span>
                        <span class="stat-label">Active Mentors</span>
                    </div>
                </div>
            </div>
            
            <div class="training-sections">
        `;

        // Current Training Section
        if (inTraining.length > 0) {
            contentHTML += `
                <div class="training-section">
                    <div class="section-header">
                        <h4><span class="section-icon">📖</span> Current Training Programs</h4>
                        <div class="section-subtitle">Villagers currently enrolled in training</div>
                    </div>
                    <div class="training-list">
            `;

            inTraining.forEach(villager => {
                const training = villager.training;
                const program = trainingPrograms[training.program];
                const progress = Math.round((training.progress / program.duration) * 100);
                const daysLeft = program.duration - training.progress;

                contentHTML += `
                    <div class="training-item">
                        <div class="trainee-info">
                            <div class="trainee-name">${villager.name}</div>
                            <div class="training-details">
                                <span class="training-program">${program.name}</span>
                                <span class="training-skill">${training.skillName}</span>
                            </div>
                        </div>
                        <div class="training-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                                <div class="progress-text">${progress}% (${daysLeft} days left)</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            contentHTML += `
                    </div>
                </div>
            `;
        }

        // Available Training Programs
        contentHTML += `
            <div class="training-section">
                <div class="section-header">
                    <h4><span class="section-icon">🏫</span> Available Training Programs</h4>
                    <div class="section-subtitle">Start new training programs for your villagers</div>
                </div>
                <div class="programs-list">
        `;

        Object.entries(trainingPrograms).forEach(([programKey, program]) => {
            const eligibleCount = eligibleForTraining.filter(villager => {
                const check = skillSystem.canEnrollInTraining(villager, programKey);
                return check.canEnroll;
            }).length;

            contentHTML += `
                <div class="training-program">
                    <div class="program-header">
                        <div class="program-info">
                            <div class="program-name">${program.name}</div>
                            <div class="program-description">${program.description}</div>
                        </div>
                        <div class="program-stats">
                            <div class="program-duration">${program.duration} days</div>
                            <div class="program-eligible">${eligibleCount} eligible</div>
                        </div>
                    </div>
                    <div class="program-details">
                        <div class="program-cost">
                            <strong>Cost:</strong> 
                            ${Object.entries(program.cost).map(([resource, amount]) =>
                `${amount} ${resource}`
            ).join(', ')}
                        </div>
                        <div class="program-bonus">
                            <strong>Skill Bonus:</strong> +${program.skillBonus} XP
                        </div>
                    </div>
                    ${eligibleCount > 0 ? `
                        <button class="start-training-btn" onclick="window.villageManager.showTrainingEnrollment('${programKey}')">
                            Start Training
                        </button>
                    ` : `
                        <div class="no-eligible">No eligible villagers</div>
                    `}
                </div>
            `;
        });

        contentHTML += `
                </div>
            </div>
            
            <div class="training-section">
                <div class="section-header">
                    <h4><span class="section-icon">🎯</span> Skill Categories</h4>
                    <div class="section-subtitle">Overview of available skill areas</div>
                </div>
                <div class="skill-categories">
        `;

        Object.entries(skillCategories).forEach(([categoryKey, category]) => {
            const skillCount = Object.keys(category.skills).length;

            contentHTML += `
                <div class="skill-category">
                    <div class="category-header">
                        <span class="category-icon">${category.name.split(' ')[0]}</span>
                        <div class="category-info">
                            <div class="category-name">${category.name}</div>
                            <div class="category-count">${skillCount} skills available</div>
                        </div>
                    </div>
                    <div class="category-skills">
                        ${Object.entries(category.skills).map(([skillKey, skill]) =>
                `<span class="skill-tag">${skill.icon} ${skill.name}</span>`
            ).join('')}
                    </div>
                </div>
            `;
        });

        contentHTML += `
                </div>
            </div>
            </div>
            
            <div class="training-actions">
                <button class="action-btn secondary" onclick="window.villageManager.showPopulationView();">
                    <span class="btn-icon">👥</span>
                    <span class="btn-text">Back to Population</span>
                </button>
                <button class="action-btn secondary" onclick="window.modalSystem.closeTopModal();">
                    <span class="btn-icon">✖️</span>
                    <span class="btn-text">Close</span>
                </button>
            </div>
        `;

        window.showModal('Skill Training', contentHTML, {
            maxWidth: '1000px',
            customClass: 'skill-training-modal modern-modal'
        });
    }

    /**
     * Show training enrollment modal for a specific program
     */
    showTrainingEnrollment(programKey) {
        const populationManager = this.gameState.populationManager;
        const skillSystem = populationManager.skillSystem;
        const program = skillSystem.trainingPrograms[programKey];
        const population = populationManager.getAll();

        // Get eligible villagers for this program
        const eligibleVillagers = population.filter(villager => {
            const check = skillSystem.canEnrollInTraining(villager, programKey);
            return check.canEnroll;
        });

        let contentHTML = `
            <div class="enrollment-overview">
                <h3>Enroll in ${program.name}</h3>
                <p>${program.description}</p>
                
                <div class="program-details">
                    <div class="detail-item">
                        <strong>Duration:</strong> ${program.duration} days
                    </div>
                    <div class="detail-item">
                        <strong>Cost:</strong> ${Object.entries(program.cost).map(([resource, amount]) =>
            `${amount} ${resource}`
        ).join(', ')}
                    </div>
                    <div class="detail-item">
                        <strong>Skill Bonus:</strong> +${program.skillBonus} XP
                    </div>
                </div>
            </div>
            
            <div class="enrollment-form">
                <h4>Select Villager and Skill</h4>
                
                <div class="form-group">
                    <label for="villager-select">Villager:</label>
                    <select id="villager-select" class="form-control">
                        <option value="">Choose a villager...</option>
                        ${eligibleVillagers.map(villager =>
            `<option value="${villager.id}">${villager.name} (Age: ${villager.age}, Role: ${villager.role})</option>`
        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="skill-category-select">Skill Category:</label>
                    <select id="skill-category-select" class="form-control" onchange="window.villageManager.updateSkillOptions()">
                        <option value="">Choose a category...</option>
                        ${Object.entries(skillSystem.skillCategories).map(([categoryKey, category]) =>
            `<option value="${categoryKey}">${category.name}</option>`
        ).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="skill-select">Specific Skill:</label>
                    <select id="skill-select" class="form-control" disabled>
                        <option value="">First choose a category...</option>
                    </select>
                </div>
                
                <div class="enrollment-actions">
                    <button class="action-btn primary" onclick="window.villageManager.confirmTrainingEnrollment('${programKey}')">
                        Start Training
                    </button>
                    <button class="action-btn secondary" onclick="window.villageManager.showSkillTrainingModal()">
                        Back
                    </button>
                </div>
            </div>
        `;

        window.showModal('Enroll in Training', contentHTML, {
            maxWidth: '600px',
            customClass: 'enrollment-modal modern-modal'
        });
    }

    /**
     * Update skill options based on selected category
     */
    updateSkillOptions() {
        const categorySelect = document.getElementById('skill-category-select');
        const skillSelect = document.getElementById('skill-select');
        const selectedCategory = categorySelect.value;

        skillSelect.innerHTML = '';
        skillSelect.disabled = true;

        if (selectedCategory) {
            const skillSystem = this.gameState.populationManager.skillSystem;
            const category = skillSystem.skillCategories[selectedCategory];

            skillSelect.innerHTML = '<option value="">Choose a skill...</option>';
            Object.entries(category.skills).forEach(([skillKey, skill]) => {
                const option = document.createElement('option');
                option.value = skillKey;
                option.textContent = `${skill.icon} ${skill.name}`;
                skillSelect.appendChild(option);
            });
            skillSelect.disabled = false;
        }
    }

    /**
     * Confirm training enrollment with selected villager and skill
     */
    confirmTrainingEnrollment(programKey) {
        const villagerSelect = document.getElementById('villager-select');
        const categorySelect = document.getElementById('skill-category-select');
        const skillSelect = document.getElementById('skill-select');

        const villagerId = parseInt(villagerSelect.value);
        const skillCategory = categorySelect.value;
        const skillName = skillSelect.value;

        if (!villagerId || !skillCategory || !skillName) {
            window.modalSystem.showMessage('Incomplete Selection', 'Please select a villager, skill category, and specific skill.');
            return;
        }

        const result = this.gameState.populationManager.startTraining(villagerId, programKey, skillCategory, skillName);

        if (result.success) {
            window.modalSystem.showMessage('Training Started',
                `Training has begun! The villager will complete their training in ${result.program.duration} days.`
            );
            this.showSkillTrainingModal(); // Refresh the training modal
        } else {
            window.modalSystem.showMessage('Training Failed', result.reason);
        }
    }

    /**
     * Generate job distribution visualization with pie chart and experience breakdowns
     */
    generateJobVisualization(jobStats) {
        if (jobStats.totalWorkers === 0) {
            return `
                <div style="background: rgba(127, 140, 141, 0.1); border: 1px solid #7f8c8d; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
                    <h3 style="color: #7f8c8d; margin-bottom: 10px;">📊 Job Distribution</h3>
                    <div style="color: #bdc3c7;">No workers currently assigned to jobs</div>
                </div>
            `;
        }

        // Job colors for consistency
        const jobColors = {
            farmer: '#27ae60',
            builder: '#3498db',
            gatherer: '#f39c12',
            woodcutter: '#8e44ad',
            crafter: '#e74c3c',
            sawyer: '#16a085',
            foreman: '#d35400'
        };

        // Generate main overview pie chart
        let cumulativePercentage = 0;
        const pieSegments = [];

        Object.entries(jobStats.jobCounts).forEach(([jobType, count]) => {
            const percentage = (count / jobStats.totalWorkers) * 100;
            const color = jobColors[jobType] || '#95a5a6';

            pieSegments.push(`${color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`);
            cumulativePercentage += percentage;
        });

        const mainPieGradient = `conic-gradient(${pieSegments.join(', ')})`;

        // Generate individual job cards with mini pie charts
        let jobCards = '';
        Object.entries(jobStats.jobCounts).forEach(([jobType, count]) => {
            const color = jobColors[jobType] || '#95a5a6';
            const jobIcon = this.getJobIcon(jobType);
            const levels = jobStats.experienceLevels[jobType];

            // Create mini pie chart for this job's experience levels
            const experienceColors = {
                novice: '#95a5a6',
                apprentice: '#3498db',
                journeyman: '#f39c12',
                expert: '#9b59b6',
                master: '#e74c3c'
            };

            let expCumulative = 0;
            const expSegments = [];

            Object.entries(levels).forEach(([level, levelCount]) => {
                if (levelCount > 0) {
                    const percentage = (levelCount / count) * 100;
                    const expColor = experienceColors[level];
                    expSegments.push(`${expColor} ${expCumulative}% ${expCumulative + percentage}%`);
                    expCumulative += percentage;
                }
            });

            const jobPieGradient = expSegments.length > 0 ? `conic-gradient(${expSegments.join(', ')})` : color;

            jobCards += `
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid ${color}; border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 15px; align-items: center;">
                        <!-- Mini Pie Chart -->
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; background: ${jobPieGradient}; margin-bottom: 5px; border: 2px solid ${color};"></div>
                            <div style="color: #ecf0f1; font-size: 11px; text-align: center;">
                                <strong>${count}</strong> workers
                            </div>
                        </div>
                        
                        <!-- Job Details -->
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                                <span style="font-size: 20px;">${jobIcon}</span>
                                <h4 style="color: ${color}; margin: 0; font-size: 18px;">${jobType.charAt(0).toUpperCase() + jobType.slice(1)}</h4>
                            </div>
                            
                            <!-- Production Information -->
                            ${this.generateJobProductionInfo(jobType, count)}
                            
                            <!-- Experience Level Details -->
                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px;">
                                ${this.generateExperienceBar('Novice', levels.novice, count, '#95a5a6')}
                                ${this.generateExperienceBar('Apprentice', levels.apprentice, count, '#3498db')}
                                ${this.generateExperienceBar('Journeyman', levels.journeyman, count, '#f39c12')}
                                ${this.generateExperienceBar('Expert', levels.expert, count, '#9b59b6')}
                                ${this.generateExperienceBar('Master', levels.master, count, '#e74c3c')}
                            </div>
                            
                            <!-- Efficiency Info -->
                            <div style="color: #bdc3c7; font-size: 12px;">
                                <div><strong>Efficiency:</strong> ${this.calculateJobEfficiency(levels)}%</div>
                                <div><strong>Production Bonus:</strong> +${this.calculateProductionBonus(levels)}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        return `
            <div style="background: rgba(52, 152, 219, 0.1); border: 1px solid #3498db; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <h3 style="color: #3498db; margin-bottom: 20px; text-align: center;">📊 Current Job Distribution</h3>
                
                <!-- Main Overview -->
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 25px; align-items: start; margin-bottom: 25px;">
                    <!-- Main Pie Chart -->
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 150px; height: 150px; border-radius: 50%; background: ${mainPieGradient}; margin-bottom: 10px; border: 3px solid #34495e;"></div>
                        <div style="color: #ecf0f1; font-size: 14px; text-align: center;">
                            <strong>${jobStats.totalWorkers}</strong> total workers
                        </div>
                        <div style="color: #bdc3c7; font-size: 12px; text-align: center; margin-top: 5px;">
                            ${Object.keys(jobStats.jobCounts).length} different jobs
                        </div>
                    </div>
                    
                    <!-- Summary Stats -->
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 15px;">
                        <h4 style="color: #ecf0f1; margin-bottom: 10px;">🎯 Workforce Summary</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; color: #bdc3c7; font-size: 13px;">
                            <div><strong>Total Assigned:</strong> ${jobStats.totalWorkers}</div>
                            <div><strong>Available Jobs:</strong> ${this.getAvailableJobSlots()}</div>
                            <div><strong>Most Common:</strong> ${this.getMostCommonJob(jobStats.jobCounts)}</div>
                            <div><strong>Avg Experience:</strong> ${this.getAverageExperience(jobStats)}%</div>
                        </div>
                    </div>
                </div>
                
                <!-- Individual Job Cards -->
                <div>
                    <h4 style="color: #ecf0f1; margin-bottom: 15px;">🔍 Detailed Job Analysis</h4>
                    ${jobCards}
                </div>
            </div>
        `;
    }

    // Helper methods for enhanced job statistics
    getAvailableJobSlots() {
        if (!window.gameState?.jobManager) return 0;
        try {
            const jobs = window.gameState.jobManager.getAvailableJobsList();
            return jobs.reduce((total, job) => total + job.maxWorkers, 0);
        } catch (e) {
            return 0;
        }
    }

    getMostCommonJob(jobCounts) {
        const entries = Object.entries(jobCounts);
        if (entries.length === 0) return 'None';

        const [jobType, count] = entries.reduce((max, current) =>
            current[1] > max[1] ? current : max
        );
        return `${jobType.charAt(0).toUpperCase() + jobType.slice(1)} (${count})`;
    }

    getAverageExperience(jobStats) {
        let totalExperience = 0;
        let totalWorkers = 0;

        Object.entries(jobStats.experienceLevels).forEach(([jobType, levels]) => {
            const jobWorkers = Object.values(levels).reduce((sum, count) => sum + count, 0);
            totalWorkers += jobWorkers;

            // Calculate weighted experience (novice=1, apprentice=2, etc.)
            totalExperience += levels.novice * 1 + levels.apprentice * 2 +
                levels.journeyman * 3 + levels.expert * 4 + levels.master * 5;
        });

        if (totalWorkers === 0) return 0;
        return Math.round((totalExperience / totalWorkers / 5) * 100);
    }

    /**
     * Test tooltip functionality - call in console: villageManager.testTooltips()
     */
    testTooltips() {
        console.log('[Village] Testing tooltip system...');
        const buttons = document.querySelectorAll('.build-btn');
        buttons.forEach(btn => {
            const buildingType = btn.dataset.building;
            const isUnlocked = this.gameState.isBuildingUnlocked(buildingType);
            console.log(`Button ${buildingType}: unlocked=${isUnlocked}, tooltip="${btn.title}"`);

            if (!isUnlocked && window.unlockSystem) {
                const requirements = window.unlockSystem.getUnlockRequirementsText(buildingType);
                console.log(`  - Requirements: ${requirements}`);
            }
        });
    }

    calculateJobEfficiency(levels) {
        const totalWorkers = Object.values(levels).reduce((sum, count) => sum + count, 0);
        if (totalWorkers === 0) return 100;

        // Each level has different efficiency multipliers
        const efficiency = (levels.novice * 100 + levels.apprentice * 125 +
            levels.journeyman * 150 + levels.expert * 175 + levels.master * 200) / totalWorkers;
        return Math.round(efficiency);
    }

    calculateProductionBonus(levels) {
        const efficiency = this.calculateJobEfficiency(levels);
        return Math.max(0, efficiency - 100);
    }

    /**
     * Generate experience level bar for job breakdown
     */
    generateExperienceBar(levelName, count, total, color) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return `
            <div style="text-align: center;">
                <div style="color: ${color}; font-weight: bold; margin-bottom: 2px;">${levelName}</div>
                <div style="background: rgba(255, 255, 255, 0.1); height: 20px; border-radius: 4px; overflow: hidden; position: relative;">
                    <div style="background: ${color}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ecf0f1; font-size: 10px; font-weight: bold;">
                        ${count}
                    </div>
                </div>
            </div>
        `;
    }

    // Update the effects display in the Village Manager tab
    updateEffectsDisplay() {
        this.updateWeatherEffects();
        this.updateBuildingEffects();
        this.updateMagicalEffects();
        this.updateTemporaryEffects();
    }

    updateWeatherEffects() {
        const weatherList = document.getElementById('weather-effects-list');
        if (!weatherList) return;

        // Get current weather from world manager
        const weather = window.worldManager?.getCurrentWeather?.() || { name: 'Clear', icon: '☀️', effects: { productivity: 1.0 } };

        const weatherEffect = `
            <div class="effect-item">
                <span class="effect-icon">${weather.icon}</span>
                <div class="effect-details">
                    <div class="effect-name">${weather.name}</div>
                    <div class="effect-description">${this.getWeatherDescription(weather)}</div>
                </div>
            </div>
        `;

        weatherList.innerHTML = weatherEffect;
    }

    updateBuildingEffects() {
        const buildingList = document.getElementById('building-effects-list');
        if (!buildingList) return;

        const effects = [];

        // Check for building-specific effects (like lumber mill construction speed bonus)
        if (window.gameState?.villageManager?.buildingEffectsManager) {
            const effectsManager = window.gameState.villageManager.buildingEffectsManager;
            // Add any permanent building effects here
        }

        if (effects.length === 0) {
            buildingList.innerHTML = '<div class="no-effects">No active building effects</div>';
        } else {
            buildingList.innerHTML = effects.join('');
        }
    }

    updateMagicalEffects() {
        const magicalList = document.getElementById('magical-effects-list');
        if (!magicalList) return;

        const effects = [];

        // Check for haste rune effects on buildings
        if (window.gameState?.buildings) {
            window.gameState.buildings.forEach(building => {
                if (building.hasteRune) {
                    const timeLeft = this.calculateTimeLeft(building.hasteRune);
                    effects.push(`
                        <div class="effect-item">
                            <span class="effect-icon">⚡</span>
                            <div class="effect-details">
                                <div class="effect-name">${building.hasteRune.runeName} on ${building.type}</div>
                                <div class="effect-description">${building.hasteRune.multiplier}x productivity boost</div>
                                <div class="effect-duration">⏱️ ${timeLeft} remaining</div>
                            </div>
                        </div>
                    `);
                }
            });
        }

        if (effects.length === 0) {
            magicalList.innerHTML = '<div class="no-effects">No active magical effects</div>';
        } else {
            magicalList.innerHTML = effects.join('');
        }
    }

    updateTemporaryEffects() {
        const temporaryList = document.getElementById('temporary-effects-list');
        if (!temporaryList) return;

        const effects = [];

        // Check for worker productivity boosts
        if (window.gameState?.populationManager) {
            const population = window.gameState.populationManager.getAll();
            population.forEach(worker => {
                if (worker.productivityBoost) {
                    const timeLeft = this.calculateTimeLeft(worker.productivityBoost);
                    effects.push(`
                        <div class="effect-item">
                            <span class="effect-icon">⚡</span>
                            <div class="effect-details">
                                <div class="effect-name">${worker.productivityBoost.source} on ${worker.name}</div>
                                <div class="effect-description">${worker.productivityBoost.multiplier}x worker productivity</div>
                                <div class="effect-duration">⏱️ ${timeLeft} remaining</div>
                            </div>
                        </div>
                    `);
                }
            });
        }

        if (effects.length === 0) {
            temporaryList.innerHTML = '<div class="no-effects">No temporary bonuses active</div>';
        } else {
            temporaryList.innerHTML = effects.join('');
        }
    }

    getWeatherDescription(weather) {
        const effects = weather.effects || {};
        const descriptions = [];

        if (effects.productivity && effects.productivity !== 1.0) {
            const change = Math.round((effects.productivity - 1.0) * 100);
            if (change > 0) {
                descriptions.push(`+${change}% productivity`);
            } else {
                descriptions.push(`${change}% productivity`);
            }
        }

        if (effects.construction && effects.construction !== 1.0) {
            const change = Math.round((effects.construction - 1.0) * 100);
            if (change > 0) {
                descriptions.push(`+${change}% construction speed`);
            } else {
                descriptions.push(`${change}% construction speed`);
            }
        }

        return descriptions.length > 0 ? descriptions.join(', ') : 'No significant effects';
    }

    calculateTimeLeft(effect) {
        if (!effect.duration || !effect.startDay) return 'Unknown';

        const currentDay = window.gameState?.currentDay || 1;
        const daysLeft = Math.max(0, effect.duration - (currentDay - effect.startDay));

        if (daysLeft === 0) return 'Expired';
        if (daysLeft === 1) return '1 day';
        return `${daysLeft} days`;
    }

    // Reassign idle builders to other production roles when no construction is happening
    reassignIdleBuilders() {
        console.log('[Village] Reassigning idle builders...');

        if (!this.gameState.populationManager || !this.gameState.populationManager.population) {
            console.log('[Village] No population manager or population available');
            return;
        }

        // Log all current worker jobs for debugging
        const allWorkers = this.gameState.populationManager.population.filter(p => p.status === 'working');
        console.log('[Village] All current worker jobs:', allWorkers.map(w => `${w.name}: ${w.job}`));

        // Find all builders (workers assigned to construction roles)
        const builders = this.gameState.populationManager.population.filter(p =>
            p.status === 'working' &&
            p.job &&
            (p.job.includes('construction') || p.job.includes('builder') || p.job === 'foreman')
        );

        if (builders.length === 0) {
            console.log('[Village] No builders found to reassign');
            return;
        }

        console.log(`[Village] Found ${builders.length} builders to potentially reassign:`, builders.map(b => `${b.name}: ${b.job}`));

        // Find production buildings that need more workers
        const productionBuildings = this.gameState.buildings.filter(b => {
            if (!b.built || b.level === 0) return false;

            const buildingData = window.GameData.buildingData[b.type];
            if (!buildingData || !buildingData.role) return false;

            // Check if building has available worker slots
            const currentWorkers = b.workers || 0;
            const maxWorkers = buildingData.workerSlots || 1;

            return currentWorkers < maxWorkers;
        });

        console.log(`[Village] Found ${productionBuildings.length} production buildings with available slots`);

        let reassignmentCount = 0;

        // Reassign builders to production buildings
        for (const builder of builders) {
            if (productionBuildings.length === 0) break;

            // Find a suitable building for this builder
            const availableBuilding = productionBuildings.find(b => {
                const currentWorkers = b.workers || 0;
                const buildingData = window.GameData.buildingData[b.type];
                const maxWorkers = buildingData.workerSlots || 1;
                return currentWorkers < maxWorkers;
            });

            if (availableBuilding) {
                const buildingData = window.GameData.buildingData[availableBuilding.type];

                // Update builder's job
                builder.job = buildingData.role;
                builder.building = `${availableBuilding.x},${availableBuilding.y}`;

                // Update building's worker count
                availableBuilding.workers = (availableBuilding.workers || 0) + 1;

                console.log(`[Village] Reassigned builder to ${availableBuilding.type} at ${availableBuilding.x},${availableBuilding.y} as ${buildingData.role}`);
                reassignmentCount++;

                // Remove this building from available list if it's now full
                const maxWorkers = buildingData.workerSlots || 1;
                if (availableBuilding.workers >= maxWorkers) {
                    const index = productionBuildings.indexOf(availableBuilding);
                    if (index > -1) {
                        productionBuildings.splice(index, 1);
                    }
                }
            }
        }

        console.log(`[Village] Reassigned ${reassignmentCount} builders to production roles`);

        // Update the UI to reflect the changes
        this.updateResourceDisplay();
    }

    // Generate production information for a specific job type
    generateJobProductionInfo(jobType, workerCount) {
        if (workerCount === 0) {
            return '<div style="color: #95a5a6; font-size: 12px; margin-bottom: 10px;">No workers assigned</div>';
        }

        // Get production data for this job type
        const productionData = this.calculateJobTypeProduction(jobType, workerCount);

        if (!productionData || productionData.length === 0) {
            return '<div style="color: #95a5a6; font-size: 12px; margin-bottom: 10px;">No direct production</div>';
        }

        let productionHTML = '<div style="margin-bottom: 10px;">';
        productionHTML += '<div style="color: #f39c12; font-size: 12px; font-weight: bold; margin-bottom: 5px;">📊 Daily Production:</div>';
        productionHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 5px;">';

        productionData.forEach(item => {
            const resourceIcon = this.getResourceIcon(item.resource);
            productionHTML += `
                <div style="background: rgba(243, 156, 18, 0.1); border: 1px solid #f39c12; border-radius: 6px; padding: 5px; text-align: center;">
                    <div style="color: #f39c12; font-size: 10px;">${resourceIcon} ${item.resource}</div>
                    <div style="color: #ecf0f1; font-size: 11px; font-weight: bold;">+${item.amount.toFixed(1)}</div>
                </div>
            `;
        });

        productionHTML += '</div></div>';

        return productionHTML;
    }

    // Calculate production for a specific job type
    calculateJobTypeProduction(jobType, workerCount) {
        const production = [];

        // Map job types to their base production rates (per worker per day)
        const baseProduction = {
            farmer: [{ resource: 'food', amount: 2.0 }],
            gatherer: [
                { resource: 'food', amount: 1.0 },
                { resource: 'wood', amount: 0.5 }
            ],
            woodcutter: [{ resource: 'wood', amount: 2.5 }],
            crafter: [{ resource: 'tools', amount: 0.8 }],
            sawyer: [
                { resource: 'wood', amount: 1.5 },
                { resource: 'planks', amount: 1.0 }
            ],
            foreman: [{ resource: 'stone', amount: 1.2 }],
            builder: [] // Builders don't produce resources directly
        };

        const jobProduction = baseProduction[jobType] || [];

        // Calculate total production for this job type
        jobProduction.forEach(item => {
            production.push({
                resource: item.resource,
                amount: item.amount * workerCount
            });
        });

        return production;
    }

    // Get icon for resource type
    getResourceIcon(resource) {
        const icons = {
            food: '🍞',
            wood: '🪵',
            stone: '🪨',
            tools: '🔨',
            planks: '📦',
            iron: '⚒️',
            gold: '💰'
        };
        return icons[resource] || '📦';
    }

    // Get production information for a building's job type
    getBuildingProductionInfo(jobType, workerCount) {
        const productionData = this.calculateJobTypeProduction(jobType, workerCount);

        if (!productionData || productionData.length === 0) {
            return '';
        }

        let productionHTML = `
            <div style="margin-top: 8px; padding: 8px; background: rgba(46, 204, 113, 0.1); border: 1px solid #2ecc71; border-radius: 4px;">
                <div style="color: #2ecc71; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📈 Daily Production:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        `;

        productionData.forEach(item => {
            const resourceIcon = this.getResourceIcon(item.resource);
            productionHTML += `
                <span style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; padding: 2px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap;">
                    ${resourceIcon} +${item.amount.toFixed(1)} ${item.resource}
                </span>
            `;
        });

        productionHTML += `
                </div>
            </div>
        `;

        return productionHTML;
    }
}

// Add global test function for easy debugging
window.testTooltips = function () {
    if (window.villageManager) {
        window.villageManager.testTooltips();
    } else {
        console.log('[Village] villageManager not available');
    }
};

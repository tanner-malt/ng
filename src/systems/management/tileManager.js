/**
 * tileManager.js - Tile-based City Management System
 * 
 * This system manages a grid-based city where each tile can contain:
 * - Buildings
 * - Terrain modifications
 * - Special markers
 */

class TileManager {
    constructor(gameState, width = 20, height = 20, setupInitial = false, skipDefaults = false) {
        this.gameState = gameState;
        this.width = width;
        this.height = height;

        // Initialize empty grid
        this.grid = [];
        this.initializeGrid();

        // Only setup initial town if explicitly requested (disabled by default)
        if (setupInitial) {
            this.setupInitialTown();
        }

        console.log('[TileManager] Initialized with', width, 'x', height, 'grid');
    }

    initializeGrid() {
        this.grid = [];
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.grid[x][y] = {
                    x: x,
                    y: y,
                    terrain: 'grass', // grass, forest, stone, water, etc.
                    building: null, // { type, level, built, id }
                    items: new Map(), // itemId -> quantity
                    special: null, // roads, decorations, etc.
                    explored: x < 5 && y < 5 // start with a small explored area
                };
            }
        }

        console.log('[TileManager] Empty grid initialized');
    }

    // Setup initial town (only called for new games)
    setupInitialTown() {
        // Place initial foundersWagon at center - humble beginnings!
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        this.placeBuildingAtInternal(centerX, centerY, 'foundersWagon');

        console.log('[TileManager] Initial foundersWagon placed at', centerX, centerY, '- humble beginnings!');
    }

    // Get tile at coordinates
    getTileAt(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.grid[x][y];
    }

    // Set tile data
    setTileAt(x, y, tileData) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        this.grid[x][y] = { ...this.grid[x][y], ...tileData };
        this.gameState?.save(); // Auto-save via unified system
        return true;
    }

    // Place building at coordinates (public method with auto-save)
    placeBuildingAt(x, y, buildingType) {
        const result = this.placeBuildingAtInternal(x, y, buildingType);
        if (result) {
            console.log('[TileManager] 🏗️ Building placed, triggering save...');
            this.gameState?.save(); // Auto-save via unified system
        }
        return result;
    }

    // Internal building placement without auto-save
    placeBuildingAtInternal(x, y, buildingType) {
        const tile = this.getTileAt(x, y);
        if (!tile) return false;

        // Remove existing building if any
        if (tile.building) {
            console.log('[TileManager] Replacing existing building at', x, y);
        }

        // Create building object
        const building = {
            id: Date.now() + Math.random(),
            type: buildingType,
            level: 1,
            built: true,
            x: x,
            y: y,
            placedAt: Date.now()
        };

        // Place building
        tile.building = building;

        // Add to gameState buildings list if available
        if (this.gameState && this.gameState.buildings) {
            this.gameState.buildings.push(building);
        }

        console.log('[TileManager] Placed', buildingType, 'at', x, y);
        return true;
    }

    // Remove building from coordinates
    removeBuildingAt(x, y) {
        const tile = this.getTileAt(x, y);
        if (!tile || !tile.building) return false;

        const building = tile.building;
        tile.building = null;

        // Remove from gameState buildings list
        if (this.gameState && this.gameState.buildings) {
            this.gameState.buildings = this.gameState.buildings.filter(b => b.id !== building.id);
        }

        console.log('[TileManager] Removed building at', x, y);
        console.log('[TileManager] 🗑️ Building removed, triggering save...');
        this.gameState?.save(); // Auto-save via unified system
        return true;
    }

    // Add item to a specific tile (deprecated - no inventory system)
    addItemToTile(x, y, itemId, quantity = 1) {
        console.warn('[TileManager] Item system removed - addItemToTile is deprecated');
        return false;
    }

    // Remove item from a specific tile (deprecated - no inventory system)
    removeItemFromTile(x, y, itemId, quantity = 1) {
        console.warn('[TileManager] Item system removed - removeItemFromTile is deprecated');
        return false;
    }

    // Find all tiles with a specific building type
    findBuildingsByType(buildingType) {
        const buildings = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                if (tile.building && tile.building.type === buildingType) {
                    buildings.push({
                        ...tile.building,
                        x: x,
                        y: y
                    });
                }
            }
        }
        return buildings;
    }

    // Get grid area around a point
    getAreaAround(centerX, centerY, radius = 3) {
        const area = [];
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                const tile = this.getTileAt(x, y);
                if (tile) {
                    area.push(tile);
                }
            }
        }
        return area;
    }

    // Main serialize method for unified save system
    serialize() {
        return {
            version: '1.0',
            width: this.width,
            height: this.height,
            grid: this.serializeGrid()
        };
    }

    // Main deserialize method for unified save system
    deserialize(data) {
        try {
            // Clear current state
            this.initializeGrid();

            // Restore grid from save data
            if (data.grid) {
                this.deserializeGrid(data.grid);
            }

            console.log('[TileManager] Data deserialized successfully');
            return true;
        } catch (error) {
            console.error('[TileManager] Failed to deserialize data:', error);
            return false;
        }
    }

    // Serialize grid for saving
    serializeGrid() {
        const serialized = [];
        for (let x = 0; x < this.width; x++) {
            serialized[x] = [];
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                serialized[x][y] = {
                    terrain: tile.terrain,
                    building: tile.building,
                    special: tile.special,
                    explored: tile.explored
                };
            }
        }
        return serialized;
    }

    // Deserialize grid from save data
    deserializeGrid(gridData) {
        this.grid = [];
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = [];
            for (let y = 0; y < this.height; y++) {
                const tileData = gridData[x] && gridData[x][y];
                if (tileData) {
                    this.grid[x][y] = {
                        x: x,
                        y: y,
                        terrain: tileData.terrain || 'grass',
                        building: tileData.building,
                        items: new Map(), // Keep empty for compatibility
                        special: tileData.special,
                        explored: tileData.explored !== false
                    };

                    // Add building to gameState if it exists
                    if (tileData.building && this.gameState && this.gameState.buildings) {
                        const existingBuilding = this.gameState.buildings.find(b => b.id === tileData.building.id);
                        if (!existingBuilding) {
                            this.gameState.buildings.push({
                                ...tileData.building,
                                x: x,
                                y: y
                            });
                        }
                    }
                } else {
                    // Create empty tile
                    this.grid[x][y] = {
                        x: x,
                        y: y,
                        terrain: 'grass',
                        building: null,
                        items: new Map(),
                        special: null,
                        explored: false
                    };
                }
            }
        }
    }

    // Get statistics about the city
    getCityStats() {
        let totalBuildings = 0;
        let exploredTiles = 0;
        const buildingTypes = {};

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];

                if (tile.explored) exploredTiles++;

                if (tile.building) {
                    totalBuildings++;
                    buildingTypes[tile.building.type] = (buildingTypes[tile.building.type] || 0) + 1;
                }
            }
        }

        return {
            totalBuildings,
            exploredTiles,
            totalTiles: this.width * this.height,
            buildingTypes
        };
    }

    // Reset city to initial state
    resetCity() {
        this.initializeGrid();

        console.log('[TileManager] 🔄 City reset, triggering save...');
        this.gameState?.save(); // Auto-save via unified system
        console.log('[TileManager] City reset to initial state');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileManager;
}

// Export to global window for browser use
if (typeof window !== 'undefined') {
    window.TileManager = TileManager;
    console.log('[TileManager] Class exported to window object');
}

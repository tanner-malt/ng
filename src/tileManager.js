/**
 * tileManager.js - Tile-based City Management and Persistence System
 * 
 * This system manages a grid-based city where each tile can contain:
 * - Buildings
 * - Items
 * - Terrain modifications
 * - Special markers
 * 
 * It provides persistent storage for the entire city state including inventory items.
 */

class TileManager {
    constructor(gameState, width = 20, height = 20, setupInitial = false, skipDefaults = false) {
        this.gameState = gameState;
        this.width = width;
        this.height = height;
        
        // Initialize empty grid
        this.grid = [];
        this.initializeGrid();
        
        // Central inventory for all items in the city
        this.cityInventory = new Map(); // itemId -> { quantity, locations: [{ x, y, quantity }] }
        
        // Initialize with basic items only if not skipping defaults
        if (!skipDefaults) {
            this.addItemToInventory('haste_rune', 2);
            this.addItemToInventory('tent', 5);
        }
        
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
        // Place initial town center at center
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        
        // Place building without auto-saving during setup
        this.placeBuildingAtInternal(centerX, centerY, 'townCenter');
        
        console.log('[TileManager] Initial town center placed at', centerX, centerY);
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
    
    // Add item to a specific tile
    addItemToTile(x, y, itemId, quantity = 1) {
        const tile = this.getTileAt(x, y);
        if (!tile) return false;
        
        const currentQuantity = tile.items.get(itemId) || 0;
        tile.items.set(itemId, currentQuantity + quantity);
        
        // Update central inventory
        this.addItemToInventory(itemId, quantity, x, y);
        
        console.log('[TileManager] Added', quantity, itemId, 'to tile', x, y);
        console.log('[TileManager] 📦 Item added, triggering save...');
        this.gameState?.save(); // Auto-save via unified system
        return true;
    }
    
    // Remove item from a specific tile
    removeItemFromTile(x, y, itemId, quantity = 1) {
        const tile = this.getTileAt(x, y);
        if (!tile) return false;
        
        const currentQuantity = tile.items.get(itemId) || 0;
        if (currentQuantity < quantity) return false;
        
        if (currentQuantity === quantity) {
            tile.items.delete(itemId);
        } else {
            tile.items.set(itemId, currentQuantity - quantity);
        }
        
        // Update central inventory
        this.removeItemFromInventory(itemId, quantity, x, y);
        
        console.log('[TileManager] Removed', quantity, itemId, 'from tile', x, y);
        console.log('[TileManager] 📤 Item removed, triggering save...');
        this.gameState?.save(); // Auto-save via unified system
        return true;
    }
    
    // Add item to central city inventory
    addItemToInventory(itemId, quantity = 1, tileX = null, tileY = null) {
        const inventoryItem = this.cityInventory.get(itemId) || { 
            quantity: 0, 
            locations: [] 
        };
        
        inventoryItem.quantity += quantity;
        
        // Track location if provided
        if (tileX !== null && tileY !== null) {
            const existingLocation = inventoryItem.locations.find(loc => loc.x === tileX && loc.y === tileY);
            if (existingLocation) {
                existingLocation.quantity += quantity;
            } else {
                inventoryItem.locations.push({ x: tileX, y: tileY, quantity: quantity });
            }
        }
        
        this.cityInventory.set(itemId, inventoryItem);
        console.log('[TileManager] Added', quantity, itemId, 'to city inventory (total:', inventoryItem.quantity, ')');
    }
    
    // Remove item from central city inventory
    removeItemFromInventory(itemId, quantity = 1, tileX = null, tileY = null) {
        const inventoryItem = this.cityInventory.get(itemId);
        if (!inventoryItem || inventoryItem.quantity < quantity) return false;
        
        inventoryItem.quantity -= quantity;
        
        // Remove from specific location if provided
        if (tileX !== null && tileY !== null) {
            const locationIndex = inventoryItem.locations.findIndex(loc => loc.x === tileX && loc.y === tileY);
            if (locationIndex >= 0) {
                const location = inventoryItem.locations[locationIndex];
                location.quantity -= quantity;
                if (location.quantity <= 0) {
                    inventoryItem.locations.splice(locationIndex, 1);
                }
            }
        }
        
        // Remove from city inventory if quantity reaches 0
        if (inventoryItem.quantity <= 0) {
            this.cityInventory.delete(itemId);
        }
        
        console.log('[TileManager] Removed', quantity, itemId, 'from city inventory');
        return true;
    }
    
    // Get all items in city inventory
    getCityInventory() {
        const inventory = {};
        this.cityInventory.forEach((data, itemId) => {
            inventory[itemId] = {
                quantity: data.quantity,
                locations: data.locations.slice() // copy array
            };
        });
        return inventory;
    }
    
    // Check if city has item
    hasItem(itemId, quantity = 1) {
        const inventoryItem = this.cityInventory.get(itemId);
        return inventoryItem && inventoryItem.quantity >= quantity;
    }
    
    // Use an item from inventory (for tent placement, rune consumption, etc.)
    useItem(itemId, quantity = 1) {
        if (!this.hasItem(itemId, quantity)) {
            console.warn('[TileManager] Cannot use item - insufficient quantity:', itemId);
            return false;
        }
        
        return this.removeItemFromInventory(itemId, quantity);
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
    
    // Find all tiles with a specific item
    findItemLocations(itemId) {
        const locations = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                if (tile.items.has(itemId)) {
                    locations.push({
                        x: x,
                        y: y,
                        quantity: tile.items.get(itemId)
                    });
                }
            }
        }
        return locations;
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
    
    // Place a tent building using an item
    placeTentFromInventory(x, y) {
        // Check if the main inventory has a tent item
        if (!window.inventoryManager || !window.inventoryManager.hasItem('tent', 1)) {
            console.warn('[TileManager] No tent items available in main inventory');
            return false;
        }
        
        // Check if tile is valid and empty
        const tile = this.getTileAt(x, y);
        if (!tile) {
            console.warn('[TileManager] Invalid tile coordinates:', x, y);
            return false;
        }
        
        if (tile.building) {
            console.warn('[TileManager] Tile already has building:', tile.building.type);
            return false;
        }
        
        // Remove item from main inventory
        if (!window.inventoryManager.removeItem('tent', 1)) {
            return false;
        }
        
        // Place the tent building
        if (this.placeBuildingAtInternal(x, y, 'tent')) {
            console.log('[TileManager] Successfully placed tent at', x, y, 'using inventory item');
            return true;
        }
        
        // If placement failed, refund the item
        window.inventoryManager.addItem('tent', 1);
        return false;
    }

    // Main serialize method for unified save system
    serialize() {
        return {
            version: '1.0',
            width: this.width,
            height: this.height,
            grid: this.serializeGrid(),
            cityInventory: this.serializeCityInventory()
        };
    }

    // Main deserialize method for unified save system
    deserialize(data) {
        if (!data || !data.grid || !data.cityInventory) {
            console.warn('[TileManager] Invalid save data format');
            return false;
        }

        try {
            // Restore grid
            this.deserializeGrid(data.grid);
            
            // Restore inventory
            this.deserializeCityInventory(data.cityInventory);
            
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
                    items: Array.from(tile.items.entries()),
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
                        items: new Map(tileData.items || []),
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
    
    // Serialize city inventory for saving
    serializeCityInventory() {
        const serialized = {};
        if (this.cityInventory && this.cityInventory.forEach) {
            this.cityInventory.forEach((data, itemId) => {
                serialized[itemId] = {
                    quantity: data.quantity,
                    locations: data.locations.slice()
                };
            });
        }
        return serialized;
    }
    
    // Deserialize city inventory from save data
    deserializeCityInventory(inventoryData) {
        this.cityInventory.clear();
        Object.entries(inventoryData).forEach(([itemId, data]) => {
            this.cityInventory.set(itemId, {
                quantity: data.quantity,
                locations: data.locations || []
            });
        });
    }
    
    // Get statistics about the city
    getCityStats() {
        let totalBuildings = 0;
        let totalItems = 0;
        let exploredTiles = 0;
        const buildingTypes = {};
        const itemTypes = {};
        
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const tile = this.grid[x][y];
                
                if (tile.explored) exploredTiles++;
                
                if (tile.building) {
                    totalBuildings++;
                    buildingTypes[tile.building.type] = (buildingTypes[tile.building.type] || 0) + 1;
                }
                
                tile.items.forEach((quantity, itemId) => {
                    totalItems += quantity;
                    itemTypes[itemId] = (itemTypes[itemId] || 0) + quantity;
                });
            }
        }
        
        return {
            totalBuildings,
            totalItems,
            exploredTiles,
            totalTiles: this.width * this.height,
            buildingTypes,
            itemTypes,
            cityInventoryItems: this.cityInventory.size
        };
    }
    
    // Reset city to initial state
    resetCity() {
        this.initializeGrid();
        this.cityInventory.clear();
        
        // Re-add basic items
        this.addItemToInventory('haste_rune', 2);
        this.addItemToInventory('tent', 5);
        
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

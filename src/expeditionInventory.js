// Simple inventory manager for expedition supplies
class ExpeditionInventoryManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.medicineSupplies = 0;
        this.equipmentSupplies = 0;
        this.specialItems = [];
    }

    // Get medicine count for expeditions
    getMedicineCount() {
        return this.medicineSupplies;
    }

    // Get equipment count for expeditions
    getEquipmentCount() {
        return this.equipmentSupplies;
    }

    // Consume medicine for expeditions
    consumeMedicine(amount) {
        const consumed = Math.min(amount, this.medicineSupplies);
        this.medicineSupplies -= consumed;
        return consumed;
    }

    // Consume equipment for expeditions
    consumeEquipment(amount) {
        const consumed = Math.min(amount, this.equipmentSupplies);
        this.equipmentSupplies -= consumed;
        return consumed;
    }

    // Add medicine supplies
    addMedicine(amount) {
        this.medicineSupplies += amount;
    }

    // Add equipment supplies
    addEquipment(amount) {
        this.equipmentSupplies += amount;
    }

    // Get all items (for expedition planning)
    getAllItems() {
        return this.specialItems;
    }

    // Add special expedition item
    addSpecialItem(item) {
        this.specialItems.push({
            ...item,
            expeditionBonus: true
        });
    }

    // Initialize basic supplies for testing
    initializeBasicSupplies() {
        this.medicineSupplies = 50;
        this.equipmentSupplies = 25;
        this.specialItems = [
            {
                name: 'Expedition Map',
                type: 'expedition',
                effect: 'Reduces travel time by 10%',
                expeditionBonus: true
            },
            {
                name: 'Field Surgery Kit',
                type: 'expedition',
                effect: 'Reduces casualty risk by 15%',
                expeditionBonus: true
            }
        ];
    }
}

// Make available globally
window.ExpeditionInventoryManager = ExpeditionInventoryManager;

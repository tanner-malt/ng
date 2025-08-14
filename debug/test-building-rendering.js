// Building Rendering Debug Script
// Run this in the browser console to debug building rendering issues

function debugBuildingRendering() {
    console.log('=== Building Rendering Debug ===');
    
    if (!window.gameState) {
        console.error('GameState not available');
        return;
    }
    
    console.log('1. Checking gameState buildings:', window.gameState.buildings.length);
    window.gameState.buildings.forEach((building, index) => {
        console.log(`  Building ${index}: ${building.type} at (${building.x}, ${building.y}) level ${building.level} built: ${building.built}`);
    });
    
    console.log('2. Checking village grid container:');
    const container = document.querySelector('.village-grid');
    if (container) {
        console.log('  Grid container found:', container);
        console.log('  Container size:', container.offsetWidth, 'x', container.offsetHeight);
        console.log('  Container style:', window.getComputedStyle(container).position);
        
        const buildingElements = container.querySelectorAll('.building');
        console.log('  Building elements in container:', buildingElements.length);
        
        buildingElements.forEach((el, index) => {
            console.log(`    Element ${index}:`, el.className, 'at', el.style.left, el.style.top, 'content:', el.textContent);
        });
    } else {
        console.error('  Grid container not found!');
    }
    
    console.log('3. Checking inventory items:');
    if (window.gameState.inventoryManager) {
        const inventory = window.gameState.inventoryManager.getAllItems();
        console.log('  Inventory items:', Object.keys(inventory));
        Object.entries(inventory).forEach(([id, data]) => {
            if (data.category === 'building') {
                console.log(`    ${id}: ${data.name} x${data.quantity}`);
            }
        });
    }
    
    console.log('4. Manual building render test:');
    if (window.villageManager) {
        console.log('  Triggering manual renderBuildings...');
        window.villageManager.renderBuildings();
    }
    
    console.log('5. Checking for any JavaScript errors in console...');
    console.log('=== Debug Complete ===');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('Building debug script loaded. Run debugBuildingRendering() to test.');
    
    // Auto-run after a short delay to let everything load
    setTimeout(() => {
        if (window.gameState && window.villageManager) {
            debugBuildingRendering();
        }
    }, 2000);
}

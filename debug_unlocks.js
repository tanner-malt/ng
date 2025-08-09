// Debug script to check unlock status
console.log('=== UNLOCK DEBUG ===');

// Check if systems are loaded
console.log('unlockSystem exists:', !!window.unlockSystem);
console.log('gameState exists:', !!window.gameState);
console.log('achievementSystem exists:', !!window.achievementSystem);

if (window.unlockSystem) {
    console.log('world_view unlocked:', window.unlockSystem.isViewUnlocked('world'));
    console.log('world_view direct check:', window.unlockSystem.isUnlocked('world_view'));
    
    // Check feeding_people achievement
    if (window.achievementSystem) {
        console.log('feeding_people achievement unlocked:', window.achievementSystem.isUnlocked('feeding_people'));
        console.log('All unlocked achievements:', window.achievementSystem.getUnlocked());
    }
    
    // Check unlock conditions for world_view
    console.log('world_view unlock progress:', window.unlockSystem.getUnlockProgress('world_view'));
    console.log('All unlocked content:', Array.from(window.unlockSystem.unlockedContent));
}

// Check if farm buildings exist (should trigger feeding_people achievement)
if (window.gameState) {
    const buildings = window.gameState.buildings || [];
    const farmCount = buildings.filter(b => b.type === 'farm').length;
    console.log('Number of farms built:', farmCount);
    console.log('Total buildings:', buildings.length);
}

// Check nav button state
const worldBtn = document.querySelector('[data-view="world"]');
if (worldBtn) {
    console.log('World button classes:', worldBtn.className);
    console.log('World button locked:', worldBtn.classList.contains('locked'));
}

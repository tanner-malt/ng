// Test script for the new population skill system

function testPopulationSkillSystem() {
    console.log('=== Testing Enhanced Population Skill System ===');
    
    // Check if all required components are available
    if (!window.gameState) {
        console.error('GameState not available');
        return;
    }
    
    if (!window.gameState.populationManager) {
        console.error('PopulationManager not available');
        return;
    }
    
    const popManager = window.gameState.populationManager;
    
    // Test 1: Check skill level system
    console.log('\n1. Testing Skill Level System:');
    
    // Create a test villager with some experience
    const testVillager = {
        experience: {
            'Agriculture': 150,
            'Carpentry': 50,
            'Mining': 400
        }
    };
    
    console.log('Test villager experience:', testVillager.experience);
    
    const agricultureLevel = popManager.getSkillLevel(testVillager, 'Agriculture');
    const carpentryLevel = popManager.getSkillLevel(testVillager, 'Carpentry');
    const miningLevel = popManager.getSkillLevel(testVillager, 'Mining');
    
    console.log(`Agriculture (150 XP): ${agricultureLevel.title} (${agricultureLevel.efficiency}x efficiency)`);
    console.log(`Carpentry (50 XP): ${carpentryLevel.title} (${carpentryLevel.efficiency}x efficiency)`);
    console.log(`Mining (400 XP): ${miningLevel.title} (${miningLevel.efficiency}x efficiency)`);
    
    // Test 2: Check best skill detection
    console.log('\n2. Testing Best Skill Detection:');
    const bestSkill = popManager.getBestSkill(testVillager);
    console.log(`Best skill: ${bestSkill.skillName} (${bestSkill.title}, ${bestSkill.xp} XP)`);
    
    // Test 3: Test job effectiveness calculation
    console.log('\n3. Testing Job Effectiveness:');
    testVillager.age = 50;
    testVillager.happiness = 80;
    
    const farmerEffectiveness = popManager.calculateJobEffectiveness(testVillager, 'farmer');
    const builderEffectiveness = popManager.calculateJobEffectiveness(testVillager, 'builder');
    const minerEffectiveness = popManager.calculateJobEffectiveness(testVillager, 'miner');
    
    console.log(`Farmer effectiveness: ${farmerEffectiveness.toFixed(2)}`);
    console.log(`Builder effectiveness: ${builderEffectiveness.toFixed(2)}`);
    console.log(`Miner effectiveness: ${minerEffectiveness.toFixed(2)}`);
    
    // Test 4: Check current population age distribution
    console.log('\n4. Current Population Age Distribution:');
    const populationGroups = popManager.getPopulationGroups();
    console.log(`Total population: ${populationGroups.total}`);
    console.log(`Children (0-15): ${populationGroups.ageGroups.children.count}`);
    console.log(`Working Age (16-190): ${populationGroups.ageGroups.workingAge.count}`);
    console.log(`Elderly (191-197): ${populationGroups.ageGroups.elderly.count}`);
    
    // Test 5: Check job assignments
    console.log('\n5. Current Job Distribution:');
    Object.entries(populationGroups.jobGroups).forEach(([jobType, data]) => {
        if (data.count > 0) {
            console.log(`${data.name}: ${data.count} workers`);
        }
    });
    
    // Test 6: Test training mode setting
    console.log('\n6. Testing Training Mode:');
    console.log(`Current training mode: ${popManager.trainingMode}`);
    
    popManager.setTrainingMode('training');
    console.log('Set training mode to: training (focus on skill development)');
    
    popManager.setTrainingMode('resources');
    console.log('Set training mode to: resources (focus on maximum production)');
    
    popManager.setTrainingMode('balanced');
    console.log('Set training mode to: balanced (mix of both)');
    
    // Test 7: Experience award system
    console.log('\n7. Testing Experience Award System:');
    const population = popManager.getAll();
    if (population.length > 0) {
        const testWorker = population[0];
        console.log(`Testing with ${testWorker.name} (age ${testWorker.age})`);
        
        const oldLevel = popManager.getSkillLevel(testWorker, 'Agriculture');
        console.log(`Before: Agriculture ${oldLevel.title} (${oldLevel.xp} XP)`);
        
        const levelUp = popManager.awardExperience(testWorker.id, 'Agriculture', 10);
        
        const newLevel = popManager.getSkillLevel(testWorker, 'Agriculture');
        console.log(`After: Agriculture ${newLevel.title} (${newLevel.xp} XP)`);
        
        if (levelUp) {
            console.log(`🎉 ${testWorker.name} leveled up in Agriculture!`);
        }
    }
    
    console.log('\n=== Population Skill System Test Complete ===');
}

// Export for browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    console.log('[PopulationSkillTest] Running in Node.js environment');
    testPopulationSkillSystem();
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.testPopulationSkillSystem = testPopulationSkillSystem;
    console.log('[PopulationSkillTest] Test script loaded. Run testPopulationSkillSystem() to test.');
}

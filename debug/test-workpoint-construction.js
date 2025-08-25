// Test script for work-point construction system
// Run this in browser console to test the new construction system

function testWorkPointConstruction() {
    console.log('=== Testing Work-Point Construction System ===');

    // Check if systems are available
    if (!window.gameState) {
        console.error('GameState not available');
        return;
    }

    if (!window.gameState.constructionManager) {
        console.error('ConstructionManager not available');
        return;
    }

    if (!window.gameState.jobManager) {
        console.error('JobManager not available');
        return;
    }

    const constructionManager = window.gameState.constructionManager;
    const jobManager = window.gameState.jobManager;

    console.log('✅ All systems available');

    // Test 1: Check construction points data
    console.log('\n1. Testing Construction Points Data:');
    const testBuildings = ['house', 'tent', 'townCenter', 'farm', 'woodcutterLodge'];
    testBuildings.forEach(buildingType => {
        const points = GameData.constructionPoints?.[buildingType];
        console.log(`  ${buildingType}: ${points} work points`);
    });

    // Test 2: Check job manager builder jobs
    console.log('\n2. Testing Builder Job System:');
    jobManager.updateAvailableJobs();
    const availableJobs = jobManager.getAllAvailableJobs();
    const builderJobs = availableJobs.filter(job => job.jobType === 'builder');
    console.log(`  Builder jobs available: ${builderJobs.length}`);
    builderJobs.forEach(job => {
        console.log(`    ${job.buildingType}: ${job.availableSlots}/${job.maxWorkers} builder slots`);
    });

    // Test 3: Simulate construction
    console.log('\n3. Testing Construction Site Creation:');

    // Find a place to build a test house
    const testPosition = { x: 5, y: 5 };
    const testBuilding = {
        id: 'test-house-' + Date.now(),
        type: 'house',
        x: testPosition.x,
        y: testPosition.y,
        level: 1,
        built: false
    };

    // Add building to gameState for testing
    window.gameState.buildings.push(testBuilding);

    // Initialize construction site
    const site = constructionManager.initializeConstructionSite(testBuilding);
    if (site) {
        console.log(`  ✅ Created construction site for house`);
        console.log(`    Total points needed: ${site.totalPoints}`);
        console.log(`    Current points: ${site.currentPoints}`);
        console.log(`    Points remaining: ${site.pointsRemaining}`);
    } else {
        console.error('  ❌ Failed to create construction site');
        return;
    }

    // Test 4: Test builder efficiency calculation
    console.log('\n4. Testing Builder Efficiency:');
    const availableWorkers = jobManager.getAvailableWorkers();
    if (availableWorkers.length > 0) {
        const testWorker = availableWorkers[0];
        console.log(`  Testing with worker: ${testWorker.name} (age ${testWorker.age})`);

        const efficiency = constructionManager.calculateBuilderEfficiency(testWorker);
        console.log(`  Builder efficiency: ${efficiency.toFixed(2)} points per day`);
    } else {
        console.log('  No available workers to test');
    }

    // Test 5: Test daily construction processing
    console.log('\n5. Testing Daily Construction Processing:');

    // Auto-assign builders if possible
    const assignedCount = jobManager.autoAssignWorkers();
    console.log(`  Auto-assigned ${assignedCount} workers to jobs`);

    // Update construction site with current builders
    constructionManager.recalculateSiteEfficiency(site);
    console.log(`  Daily progress: ${site.dailyProgress.toFixed(2)} points per day`);
    console.log(`  Estimated completion: ${site.estimatedCompletion} days`);

    // Process one day of construction
    const initialPoints = site.currentPoints;
    constructionManager.processDailyConstruction();
    const finalPoints = site.currentPoints;
    const pointsGained = finalPoints - initialPoints;

    console.log(`  Points gained in one day: ${pointsGained.toFixed(2)}`);
    console.log(`  New progress: ${site.currentPoints}/${site.totalPoints} (${Math.round((site.currentPoints / site.totalPoints) * 100)}%)`);

    // Test 6: Get construction progress info
    console.log('\n6. Testing Progress Display:');
    const progressInfo = constructionManager.getConstructionProgress(testBuilding.id);
    if (progressInfo) {
        console.log(`  Progress: ${progressInfo.progressPercent}%`);
        console.log(`  Assigned builders: ${progressInfo.assignedBuilders}`);
        console.log(`  Daily progress: ${progressInfo.dailyProgress.toFixed(2)} points/day`);
        console.log(`  Seasonal efficiency: ${(progressInfo.seasonalEfficiency * 100).toFixed(1)}%`);
    }

    // Test 7: System status
    console.log('\n7. System Status:');
    const status = constructionManager.getSystemStatus();
    console.log(`  Active construction sites: ${status.activeSites}`);
    console.log(`  Total builders assigned: ${status.totalAssignedBuilders}`);
    console.log(`  Total progress per day: ${status.totalProgressPerDay.toFixed(2)} points`);
    console.log(`  Current season: ${status.currentSeason}`);

    console.log('\n=== Test Complete ===');

    // Clean up test building
    const buildingIndex = window.gameState.buildings.findIndex(b => b.id === testBuilding.id);
    if (buildingIndex !== -1) {
        window.gameState.buildings.splice(buildingIndex, 1);
        constructionManager.constructionSites.delete(testBuilding.id);
        console.log('Test building cleaned up');
    }
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    console.log('Work-point construction test script loaded. Run testWorkPointConstruction() to test.');
}

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = { testWorkPointConstruction };
}

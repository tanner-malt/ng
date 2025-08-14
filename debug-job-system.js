// Job System Diagnostic Script
// Run this in the browser console to diagnose job system issues

function diagnosJobSystem() {
    console.log("🔍 === JOB SYSTEM DIAGNOSTIC ===");
    
    // 1. Check basic game state
    console.log("\n1️⃣ BASIC GAME STATE:");
    console.log("Game state exists:", !!window.gameState);
    console.log("Auto-play active:", window.gameState?.autoPlayActive);
    console.log("Current day:", window.gameState?.currentDay || window.gameState?.day);
    console.log("Population count:", window.gameState?.populationManager?.population?.length || window.gameState?.population?.length || 0);
    
    // 2. Check JobManager initialization
    console.log("\n2️⃣ JOB MANAGER STATUS:");
    console.log("JobManager exists:", !!window.gameState?.jobManager);
    
    if (!window.gameState?.jobManager) {
        console.log("⚠️ JobManager not initialized - trying to initialize...");
        try {
            if (window.JobManager) {
                window.gameState.jobManager = new window.JobManager(window.gameState);
                console.log("✅ JobManager manually initialized");
            } else {
                console.log("❌ JobManager class not available");
                return;
            }
        } catch (e) {
            console.log("❌ Failed to initialize JobManager:", e);
            return;
        }
    }
    
    // 3. Check buildings and jobs
    console.log("\n3️⃣ BUILDINGS & AVAILABLE JOBS:");
    const buildings = window.gameState?.buildings || [];
    console.log("Total buildings:", buildings.length);
    
    const completedBuildings = buildings.filter(b => b.level > 0 && b.built);
    console.log("Completed buildings:", completedBuildings.length);
    completedBuildings.forEach(b => {
        console.log(`  - ${b.type} (Level ${b.level}) at (${b.x}, ${b.y})`);
    });
    
    // Update available jobs
    try {
        window.gameState.jobManager.updateAvailableJobs();
        const availableJobs = window.gameState.jobManager.getAllAvailableJobs();
        console.log("Available job positions:", availableJobs.length);
        
        if (availableJobs.length > 0) {
            console.log("Job breakdown:");
            availableJobs.forEach(job => {
                console.log(`  - ${job.jobType} at ${job.buildingType} (${job.availableSlots}/${job.maxWorkers})`);
            });
        } else {
            console.log("⚠️ No available jobs found");
        }
    } catch (e) {
        console.log("❌ Error getting available jobs:", e);
    }
    
    // 4. Check population and workers
    console.log("\n4️⃣ POPULATION & WORKERS:");
    let population = [];
    
    if (window.gameState?.populationManager?.population) {
        population = window.gameState.populationManager.population;
    } else if (window.gameState?.population) {
        population = window.gameState.population;
    }
    
    console.log("Total population:", population.length);
    
    if (population.length > 0) {
        const availableWorkers = population.filter(p => !p.jobAssignment || p.status === 'idle');
        const assignedWorkers = population.filter(p => p.jobAssignment && p.status === 'working');
        
        console.log("Available workers:", availableWorkers.length);
        console.log("Assigned workers:", assignedWorkers.length);
        
        if (assignedWorkers.length > 0) {
            console.log("Current assignments:");
            assignedWorkers.forEach(w => {
                console.log(`  - ${w.name}: ${w.jobAssignment?.jobType} at building ${w.jobAssignment?.buildingId}`);
            });
        }
        
        if (availableWorkers.length > 0) {
            console.log("Available workers:");
            availableWorkers.slice(0, 5).forEach(w => {
                console.log(`  - ${w.name} (Age: ${w.age}, Status: ${w.status || 'unknown'})`);
            });
        }
    } else {
        console.log("⚠️ No population found");
    }
    
    // 5. Test job assignment
    console.log("\n5️⃣ JOB ASSIGNMENT TEST:");
    try {
        const beforeAssignments = window.gameState.jobManager.jobAssignments.size;
        window.gameState.jobManager.autoAssignWorkers();
        const afterAssignments = window.gameState.jobManager.jobAssignments.size;
        
        console.log("Job assignments before:", beforeAssignments);
        console.log("Job assignments after:", afterAssignments);
        
        if (afterAssignments > beforeAssignments) {
            console.log("✅ New job assignments created");
        } else {
            console.log("⚠️ No new job assignments");
        }
    } catch (e) {
        console.log("❌ Error in job assignment:", e);
    }
    
    // 6. Test daily production
    console.log("\n6️⃣ DAILY PRODUCTION TEST:");
    try {
        const production = window.gameState.jobManager.calculateDailyProduction();
        console.log("Daily production:", production);
        
        Object.entries(production).forEach(([resource, amount]) => {
            if (amount > 0) {
                console.log(`  - ${resource}: +${amount.toFixed(2)}`);
            }
        });
    } catch (e) {
        console.log("❌ Error calculating production:", e);
    }
    
    // 7. Check auto-play and daily processing
    console.log("\n7️⃣ AUTO-PLAY & DAILY PROCESSING:");
    console.log("Auto-play timer exists:", !!window.gameState?._autoPlayTimer);
    console.log("Auto-play speed:", window.gameState?.autoPlaySpeed, "ms");
    
    // 8. Summary and recommendations
    console.log("\n8️⃣ SUMMARY & RECOMMENDATIONS:");
    
    if (!window.gameState?.autoPlayActive) {
        console.log("🎯 ISSUE: Auto-play is not active");
        console.log("   💡 Solution: Click the auto-play button or run: gameState.startAutoPlay()");
    }
    
    if (completedBuildings.length === 0) {
        console.log("🎯 ISSUE: No completed buildings to provide jobs");
        console.log("   💡 Solution: Wait for construction to complete or manually complete a building");
    }
    
    if (population.length === 0) {
        console.log("🎯 ISSUE: No population to assign to jobs");
        console.log("   💡 Solution: Check PopulationManager initialization");
    }
    
    console.log("\n✅ Diagnostic complete!");
    console.log("📋 Quick commands:");
    console.log("   - Start auto-play: gameState.startAutoPlay()");
    console.log("   - Manual daily processing: gameState.endDay()");
    console.log("   - Force job assignment: gameState.jobManager.autoAssignWorkers()");
    console.log("   - Check job summary: gameState.jobManager.getJobSummary()");
}

// Auto-run the diagnostic
diagnosJobSystem();

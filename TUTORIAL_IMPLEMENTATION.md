# Tutorial System - Technical Implementation

## 🎯 Tutorial Progression System

### Current State Analysis
The tutorial system has several components that need to work together:

1. **TutorialManager Class** (`tutorial.js`)
2. **Event System Integration** (`eventBusIntegrations.js`)
3. **UI Highlighting** (CSS + JavaScript)
4. **State Persistence** (localStorage)
5. **Step Validation** (completion conditions)

## 🔧 Tutorial Architecture

### Class Structure
```javascript
class TutorialManager {
  constructor() {
    this.currentStep = 0
    this.isActive = false
    this.dynastyName = null
    this.completedSteps = new Set()
    this.steps = this.createSteps()
  }
}
```

## 🔄 Game Loop Integration with Tutorial System

### Multi-Layer Time System Architecture

The game operates on **three distinct time systems** that the tutorial must coordinate with:

#### 1. **Real-Time Loop** (Primary Game Loop)
```javascript
// app.js - Main game loop running at ~60fps
startGameLoop() {
    const gameLoop = () => {
        this.gameState.update();          // UI updates, season progression
        if (this.currentView === 'battle' && this.gameState.battleInProgress) {
            // Battle system has separate timer
        }
        this.gameLoopId = requestAnimationFrame(gameLoop);
    };
    gameLoop();
}
```

**Tutorial Integration Points:**
- **UI State Updates**: Tutorial highlights refresh with game loop
- **Season Transitions**: Tutorial can react to seasonal changes
- **Visual Feedback**: Tutorial animations synchronized with frame rate
- **Performance**: Tutorial listeners must be lightweight (called 60x/second)

#### 2. **Turn-Based System** (Day Progression)
```javascript
// gameState.js - Manual/Auto day advancement
endDay() {
    this.currentDay++;
    this.processBuildingConstruction(8);  // 8 hours per day
    this.processDailyResources();
    this.updateScoutProgress();
    
    // CRITICAL: Tutorial events emitted here
    if (window.eventBus) {
        window.eventBus.emit('day_ended', { day: this.currentDay });
    }
}
```

**Tutorial Dependencies:**
- **Building Construction**: Tutorial steps 4-8 depend on construction completion
- **Resource Generation**: Tutorial must account for resource changes per day
- **Event Timing**: Tutorial step triggers tied to day progression
- **Auto-Play Impact**: Tutorial must handle 20-second auto-advancement

#### 3. **Expedition Time Flow** (Accelerated Background Processing)
```javascript
// gameState.js - Time acceleration during expeditions
processExpeditionTime(duration) {
    const gameHours = Math.floor(duration / 60000); // 1 real min = 1 game hour
    this.processBuildingConstruction(gameHours);
    this.processExpeditionResourceGeneration(gameHours);
    this.processPopulationGrowth(gameHours);
}
```

**Tutorial Considerations:**
- **Time Scaling**: Tutorial must handle rapid time progression
- **Background Building**: Buildings complete during expeditions
- **Resource Accumulation**: Large resource gains from time compression
- **State Synchronization**: Tutorial state must remain consistent

### Game Loop Event Emission Points

#### Building Placement Events
```javascript
// village.js - Where tutorial building events should trigger
placeBuilding(x, y, buildingType) {
    // ... building placement logic ...
    
    // CRITICAL: This event drives tutorial progression
    if (window.eventBus) {
        window.eventBus.emit('building_placed', {
            type: buildingType,    // Must match tutorial.buildingType
            x: x,
            y: y,
            id: building.id,
            day: this.gameState.currentDay
        });
    }
}
```

#### Day Progression Events
```javascript
// gameState.js - Daily events for tutorial milestones
endDay() {
    // ... day processing ...
    
    if (window.eventBus) {
        window.eventBus.emit('day_ended', { 
            day: this.currentDay,
            resources: this.resources,
            buildings: this.buildings.length
        });
        
        // Tutorial milestone checks
        if (this.currentDay === 5) {
            window.eventBus.emit('scout_report_ready');
        }
    }
}
```

#### Battle System Events
```javascript
// battle.js - Combat events for tutorial step 8+
startBattle() {
    // ... battle setup ...
    
    this.battleTimer = setInterval(() => {
        this.updateBattle();  // 1-second battle progression
    }, 1000);
    
    if (window.eventBus) {
        window.eventBus.emit('battle_started', {
            wave: this.gameState.wave,
            enemies: this.enemies.length
        });
    }
}
```

### Tutorial State Synchronization

#### Real-Time Sync Requirements
```javascript
// tutorial.js - Must handle async game loop updates
setupStepRequirements(step) {
    if (step.waitFor === 'building_placed') {
        const handler = (data) => {
            // CRITICAL: This runs in game loop context
            if (data.type === step.buildingType) {
                // Must be performant - called at 60fps potential
                this.completeStep();
                window.eventBus.off('building_placed', handler);
            }
        };
        window.eventBus.on('building_placed', handler);
    }
}
```

#### Auto-Play Integration
```javascript
// gameState.js - Auto-play affects tutorial timing
startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
        this.endDay();  // Triggers tutorial events every 20 seconds
    }, this.autoPlaySpeed);
}
```

**Tutorial Auto-Play Considerations:**
- **Rapid Progression**: Steps may complete very quickly
- **User Agency**: Tutorial should guide manual play, not auto-play
- **Timing Windows**: Events fire every 20 seconds during auto-play
- **Visual Feedback**: Highlights must be visible during rapid advancement

### Performance Optimization for Tutorial

#### Event Handler Cleanup
```javascript
// tutorial.js - Prevent memory leaks in game loop
completeStep() {
    // CRITICAL: Clean up event listeners
    this.cleanupStepHandlers();
    
    // Process completion
    this.completedSteps.add(this.currentStep);
    
    // Execute next step action
    if (step.action) {
        step.action();
    }
}
```

#### Efficient Highlighting
```javascript
// tutorial.js - Optimize highlights for 60fps
highlightElement(selector) {
    // Cache DOM queries to avoid repeated lookups
    if (this.cachedElements[selector]) {
        element = this.cachedElements[selector];
    } else {
        element = document.querySelector(selector);
        this.cachedElements[selector] = element;
    }
    
    if (element) {
        element.classList.add('tutorial-highlight');
    }
}
```

### Tutorial-Game Loop Interaction Matrix

| Tutorial Step | Game Loop Dependency | Event Source | Timing Critical |
|---------------|---------------------|--------------|-----------------|
| Dynasty Name | None | Modal system | No |
| Intro/Story | None | Modal system | No |
| Building Tutorial | None | Modal system | No |
| Town Center | Building placement | village.js | Yes |
| House Building | Building completion | gameState.js day progression | Yes |
| Farm Building | Resource generation | gameState.js day progression | Yes |
| Barracks | Military unlock | gameState.js + building completion | Yes |
| Battle Intro | Battle system | battle.js event emission | Yes |
| Tutorial Complete | Achievement system | achievement.js | No |

### Step Definition Format
```javascript
{
  id: 'step_identifier',
  title: 'Display Title',
  story: '<html content>',
  instruction: 'What to do next',
  icon: '🎯',
  highlight: '.css-selector',       // Element to highlight
  waitFor: 'event_name',           // Completion trigger
  buildingType: 'building_name',   // For building steps
  action: () => { /* next step */ } // Post-completion action
}
```

## 🎮 Tutorial Steps Implementation

### Step 1: Dynasty Name
```javascript
{
  id: 'dynasty_name',
  title: 'The Royal Bloodline',
  requiresInput: true,
  action: () => this.startStep('intro')
}
```
**Issues Found:**
- ✅ Dynasty name validation working
- ✅ localStorage persistence working
- ✅ Progression to next step working

### Step 2: Royal Mission
```javascript
{
  id: 'intro',
  title: 'The King\'s Command',
  action: () => this.startStep('building_tutorial')
}
```
**Status:** ✅ Working correctly

### Step 3: Building Tutorial
```javascript
{
  id: 'building_tutorial',
  title: 'The Art of Construction',
  action: () => this.startStep('settlement')
}
```
**Status:** ✅ Working correctly

### Step 4: Town Center (NEEDS FIXING)
```javascript
{
  id: 'settlement',
  title: 'Establishing Your Settlement',
  highlight: '.building-btn[data-building="townCenter"]',
  waitFor: 'building_placed',
  buildingType: 'townCenter',
  action: () => this.startStep('first_citizens')
}
```
**Issues to Fix:**
- 🔍 Building placement detection
- 🔍 Event system integration
- 🔍 Step progression triggering

## 🐛 Known Issues & Fixes Needed

### Issue 1: Building Placement Not Detected
**Problem:** Tutorial doesn't advance when building is placed
**Root Cause Analysis:**
1. **Event Emission Timing**: Building placement might emit before tutorial listener attached
2. **Game Loop Interference**: Real-time loop may interfere with event processing
3. **Auto-Play Conflicts**: 20-second auto-play may skip tutorial interaction windows
4. **Event Data Structure**: Mismatch between emitted data and expected tutorial format

**Technical Details:**
```javascript
// Current emission in village.js - may need enhancement
placeBuilding(x, y, buildingType) {
    // Building creation logic...
    
    // Event emission - timing critical
    if (window.eventBus) {
        window.eventBus.emit('building_placed', {
            type: buildingType,     // Must exactly match step.buildingType
            x: x, y: y,            // Position data
            id: building.id,       // Unique identifier
            timestamp: Date.now(), // For debugging timing issues
            gameDay: this.gameState.currentDay  // Tutorial context
        });
    }
}
```

**Fix Strategy:**
1. **Synchronous Event Processing**: Ensure tutorial listeners process immediately
2. **Event Queue Debugging**: Log all building_placed events with timestamps
3. **Game Loop Integration**: Verify events don't get lost in 60fps cycle
4. **Auto-Play Handling**: Disable auto-play during active tutorial steps

### Issue 2: Game Loop State Desynchronization
**Problem:** Tutorial state may become inconsistent with game state
**Game Loop Conflicts:**
1. **Resource Updates**: Real-time resource generation affects tutorial conditions
2. **Day Progression**: Auto-play advances days while tutorial expects manual control
3. **Building Construction**: Expedition timers complete buildings during tutorial
4. **Season Changes**: Seasonal effects alter tutorial-expected game state

**Technical Impact:**
```javascript
// gameState.js - Multiple systems updating simultaneously
update() {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    
    // Season progression - affects tutorial
    this.seasonTimer += deltaTime;
    if (this.seasonTimer >= this.seasonDuration) {
        this.updateSeason(); // May trigger unrelated events
    }
    
    // UI updates every second - tutorial must sync
    if (Math.floor(now / 1000) !== Math.floor((now - deltaTime) / 1000)) {
        this.updateUI(); // Tutorial highlights may be affected
    }
}
```

**Fix Strategy:**
1. **Tutorial Mode Flag**: Disable certain game loop features during tutorial
2. **State Freezing**: Pause auto-progression systems during tutorial steps
3. **Event Prioritization**: Give tutorial events priority in processing queue
4. **Rollback Mechanism**: Undo game state changes that break tutorial flow

### Issue 3: Auto-Play System Interference
**Problem:** Auto-play (20-second intervals) disrupts tutorial pacing
**Interference Points:**
1. **Rapid Day Advancement**: Auto-play doesn't wait for tutorial completion
2. **Resource Accumulation**: Auto-generated resources skip tutorial learning
3. **Building Completion**: Auto-play processes construction without user awareness
4. **Event Flooding**: Multiple day_ended events overwhelm tutorial system

**Auto-Play Logic Analysis:**
```javascript
// gameState.js - Auto-play system
startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
        this.endDay(); // Triggers all tutorial-relevant events
    }, this.autoPlaySpeed); // Default: 20 seconds
}

endDay() {
    this.currentDay++;
    this.processBuildingConstruction(8); // May complete tutorial buildings
    this.processDailyResources();        // Generates tutorial-expected resources
    
    // Tutorial events fired here - may be too frequent
    if (window.eventBus) {
        window.eventBus.emit('day_ended', { day: this.currentDay });
    }
}
```

**Fix Strategy:**
1. **Tutorial Auto-Play Override**: Disable auto-play when tutorial active
2. **Selective Event Blocking**: Filter auto-generated events during tutorial
3. **Paced Progression**: Slow down auto-play during tutorial phases
4. **Manual Control Emphasis**: Force manual interaction for tutorial steps

### Issue 4: Event System Performance Impact
**Problem:** Tutorial event listeners affect game loop performance
**Performance Bottlenecks:**
1. **60fps Event Processing**: Tutorial listeners called every frame
2. **DOM Query Overhead**: Highlight system performs expensive DOM lookups
3. **Memory Leaks**: Event handlers not properly cleaned up
4. **Event Handler Accumulation**: Multiple tutorial restarts create handler bloat

**Performance Analysis:**
```javascript
// tutorial.js - Potential performance issues
highlightElement(selector) {
    // Called potentially 60 times per second
    const element = document.querySelector(selector); // Expensive DOM query
    if (element) {
        element.classList.add('tutorial-highlight'); // Style recalculation
    }
}

setupStepRequirements(step) {
    const handler = (data) => {
        // This runs in main game loop context
        if (data.type === step.buildingType) {
            this.completeStep(); // Complex state changes
        }
    };
    // Handler may not be cleaned up properly
    window.eventBus.on('building_placed', handler);
}
```

**Fix Strategy:**
1. **Event Handler Caching**: Pre-compile and cache event handlers
2. **DOM Query Optimization**: Cache frequently accessed elements
3. **Debounced Processing**: Limit tutorial processing frequency
4. **Cleanup Enforcement**: Strict event handler cleanup on step completion

### Issue 5: Battle System Integration Complexity
**Problem:** Battle system has separate timer conflicting with tutorial
**Battle Timer Conflicts:**
1. **Independent Timing**: 1-second battle timer vs 60fps game loop
2. **Event Processing Order**: Battle events may preempt tutorial events
3. **State Synchronization**: Battle state changes affect tutorial conditions
4. **Memory Usage**: Battle system creates separate event loops

**Battle System Analysis:**
```javascript
// battle.js - Separate timing system
startBattle() {
    this.battleTimer = setInterval(() => {
        this.updateBattle(); // Independent of main game loop
    }, 1000);
    
    // Events emitted on different timing
    if (window.eventBus) {
        window.eventBus.emit('battle_started', battleData);
    }
}
```

**Fix Strategy:**
1. **Timer Coordination**: Synchronize battle timer with main game loop
2. **Event Queuing**: Queue battle events for main loop processing
3. **Tutorial Battle Mode**: Simplified battle system for tutorial
4. **State Isolation**: Isolate battle state from tutorial progression

## 🔧 Debug Implementation Plan

### Phase 1: Game Loop Integration Debugging
```javascript
// Enhanced debug logging for game loop interactions
window.debugTutorial = {
    // Monitor game loop performance impact
    trackGameLoopEvents: () => {
        let eventCount = 0;
        const originalEmit = window.eventBus.emit;
        window.eventBus.emit = function(event, data) {
            eventCount++;
            console.log(`[GameLoop-Tutorial] Event ${eventCount}: ${event}`, {
                timestamp: Date.now(),
                gameDay: window.gameState?.currentDay,
                tutorialStep: window.tutorialManager?.currentStep,
                data: data
            });
            return originalEmit.call(this, event, data);
        };
    },
    
    // Monitor auto-play interference
    trackAutoPlayConflicts: () => {
        const gameState = window.gameState;
        if (gameState.autoPlayActive) {
            console.warn('[Tutorial-Debug] Auto-play active during tutorial!');
            console.log('[Tutorial-Debug] Auto-play speed:', gameState.autoPlaySpeed);
            console.log('[Tutorial-Debug] Days advancing every:', gameState.autoPlaySpeed/1000, 'seconds');
        }
    },
    
    // Check event timing issues
    measureEventDelay: () => {
        window.eventBus.on('building_placed', (data) => {
            const delay = Date.now() - data.timestamp;
            console.log(`[Tutorial-Timing] Building placed event delay: ${delay}ms`);
        });
    }
};
```

### Phase 2: Time System Synchronization
```javascript
// Debug multiple time systems interaction
window.debugTimeSystems = {
    // Monitor all three time systems
    trackAllTimers: () => {
        console.log('[Time-Debug] === TIME SYSTEM STATUS ===');
        console.log('Real-time loop active:', !!window.game?.gameLoopId);
        console.log('Auto-play active:', window.gameState?.autoPlayActive);
        console.log('Battle timer active:', window.battleManager?.battleTimer);
        console.log('Expedition time flow:', window.gameState?.expeditionTimeFlow);
        console.log('Tutorial active:', window.tutorialManager?.isActive);
    },
    
    // Check for timer conflicts
    detectConflicts: () => {
        const conflicts = [];
        if (window.gameState?.autoPlayActive && window.tutorialManager?.isActive) {
            conflicts.push('Auto-play running during tutorial');
        }
        if (window.gameState?.expeditionTimeFlow && window.tutorialManager?.isActive) {
            conflicts.push('Expedition time flow during tutorial');
        }
        if (conflicts.length > 0) {
            console.error('[Time-Debug] Timer conflicts detected:', conflicts);
        }
        return conflicts;
    }
};
```

### Phase 3: Event System Performance Analysis
```javascript
// Performance monitoring for tutorial system
window.debugPerformance = {
    eventProcessingTimes: [],
    domQueryTimes: [],
    
    measureEventPerformance: () => {
        const originalHandler = window.tutorialManager?.setupStepRequirements;
        if (originalHandler) {
            window.tutorialManager.setupStepRequirements = function(step) {
                const start = performance.now();
                const result = originalHandler.call(this, step);
                const duration = performance.now() - start;
                window.debugPerformance.eventProcessingTimes.push(duration);
                console.log(`[Performance] Event setup took ${duration.toFixed(2)}ms`);
                return result;
            };
        }
    },
    
    measureDOMQueries: () => {
        const originalQuery = document.querySelector;
        document.querySelector = function(selector) {
            const start = performance.now();
            const result = originalQuery.call(this, selector);
            const duration = performance.now() - start;
            window.debugPerformance.domQueryTimes.push(duration);
            if (duration > 1) { // Log slow queries
                console.log(`[Performance] Slow DOM query: ${selector} (${duration.toFixed(2)}ms)`);
            }
            return result;
        };
    },
    
    getPerformanceReport: () => {
        const avgEventTime = window.debugPerformance.eventProcessingTimes.reduce((a,b) => a+b, 0) / 
                            window.debugPerformance.eventProcessingTimes.length;
        const avgDOMTime = window.debugPerformance.domQueryTimes.reduce((a,b) => a+b, 0) / 
                          window.debugPerformance.domQueryTimes.length;
        
        return {
            averageEventProcessing: avgEventTime?.toFixed(2) + 'ms',
            averageDOMQuery: avgDOMTime?.toFixed(2) + 'ms',
            totalEvents: window.debugPerformance.eventProcessingTimes.length,
            totalQueries: window.debugPerformance.domQueryTimes.length,
            slowQueries: window.debugPerformance.domQueryTimes.filter(t => t > 1).length
        };
    }
};
```

### Phase 4: State Synchronization Testing
```javascript
// Deep state analysis for tutorial-game integration
window.debugState = {
    // Capture complete game state snapshot
    captureGameState: () => {
        return {
            tutorial: {
                active: window.tutorialManager?.isActive,
                currentStep: window.tutorialManager?.currentStep,
                completedSteps: Array.from(window.tutorialManager?.completedSteps || []),
                dynastyName: window.tutorialManager?.dynastyName
            },
            gameLoop: {
                active: !!window.game?.gameLoopId,
                currentView: window.game?.currentView,
                tutorialActive: window.game?.tutorialActive
            },
            gameState: {
                currentDay: window.gameState?.currentDay,
                season: window.gameState?.season,
                autoPlayActive: window.gameState?.autoPlayActive,
                expeditionTimeFlow: window.gameState?.expeditionTimeFlow,
                buildings: window.gameState?.buildings?.length,
                resources: { ...window.gameState?.resources }
            },
            timing: {
                timestamp: Date.now(),
                performanceNow: performance.now()
            }
        };
    },
    
    // Compare states for inconsistencies
    compareStates: (state1, state2) => {
        const differences = [];
        
        // Tutorial state changes
        if (state1.tutorial.currentStep !== state2.tutorial.currentStep) {
            differences.push(`Tutorial step: ${state1.tutorial.currentStep} → ${state2.tutorial.currentStep}`);
        }
        
        // Game progression changes
        if (state1.gameState.currentDay !== state2.gameState.currentDay) {
            differences.push(`Game day: ${state1.gameState.currentDay} → ${state2.gameState.currentDay}`);
        }
        
        // Building changes
        if (state1.gameState.buildings !== state2.gameState.buildings) {
            differences.push(`Buildings: ${state1.gameState.buildings} → ${state2.gameState.buildings}`);
        }
        
        return differences;
    },
    
    // Auto-monitoring for state desync
    startStateMonitoring: () => {
        let lastState = window.debugState.captureGameState();
        
        setInterval(() => {
            const currentState = window.debugState.captureGameState();
            const differences = window.debugState.compareStates(lastState, currentState);
            
            if (differences.length > 0) {
                console.log('[State-Debug] State changes detected:', differences);
                
                // Check for problematic combinations
                if (currentState.tutorial.active && currentState.gameState.autoPlayActive) {
                    console.warn('[State-Debug] WARNING: Tutorial active with auto-play!');
                }
                if (currentState.tutorial.active && currentState.gameState.expeditionTimeFlow) {
                    console.warn('[State-Debug] WARNING: Tutorial active during expedition!');
                }
            }
            
            lastState = currentState;
        }, 1000); // Check every second
    }
};
```

## 📝 Implementation Checklist

### Debug Logging Enhancement
- [ ] Add detailed logging to `placeBuilding` in village.js
- [ ] Add event emission logging
- [ ] Add tutorial event listener logging
- [ ] Add step transition logging
- [ ] Add highlight system logging

### Event System Verification
- [ ] Verify `building_placed` event structure
- [ ] Check event listener attachment timing
- [ ] Test building type matching logic
- [ ] Validate event cleanup on step completion

### UI System Testing
- [ ] Test CSS selector accuracy
- [ ] Verify DOM element availability
- [ ] Check highlight style visibility
- [ ] Test highlight clearing functionality

### State Management
- [ ] Verify tutorial state persistence
- [ ] Test step completion tracking
- [ ] Check dynasty name integration
- [ ] Validate tutorial reset functionality

## 🎯 Expected Event Flow

### Building Placement Flow with Game Loop Integration
```javascript
// Complete flow from user action to tutorial progression
1. User clicks building button 
   → village.js: enterBuildMode()
   → Game loop: continues running at 60fps
   → Tutorial: highlights button (DOM updated in next frame)

2. User clicks on grid 
   → village.js: placeBuilding()
   → gameState.js: addBuilding()
   → Game loop: processes building addition
   → Resources: deducted via spend() method

3. Building placed event emission
   → village.js: eventBus.emit('building_placed', data)
   → Event queue: processed in current frame
   → Tutorial listener: receives event immediately
   → Game loop: continues uninterrupted

4. Tutorial progression
   → tutorial.js: completeStep()
   → Event cleanup: removes listeners
   → Next step: action() method called
   → Game loop: highlights updated in next frame
```

### Critical Timing Dependencies
```javascript
// Events must fire in correct order within game loop cycle
Frame N:     User clicks → enterBuildMode() → highlight shown
Frame N+1:   Game loop updates → UI reflects build mode
Frame N+2:   User clicks grid → placeBuilding() starts
Frame N+3:   Building created → resources updated
Frame N+4:   Event emitted → tutorial listener fires
Frame N+5:   Tutorial step complete → next step starts
Frame N+6:   New highlights applied → DOM updated
```

### Data Structure with Game Loop Context
```javascript
// Enhanced building_placed event data
{
  type: 'townCenter',           // Building type identifier
  x: 150,                      // Grid position X
  y: 200,                      // Grid position Y  
  id: 'building_123',          // Unique building ID
  timestamp: Date.now(),       // Event emission time
  gameDay: gameState.currentDay, // Current game day
  gameTime: {
    realTime: performance.now(), // High-precision timing
    gameLoop: gameLoopFrame,     // Frame number
    season: gameState.season     // Current season
  },
  resources: {
    before: { wood: 100, stone: 50 }, // Pre-construction
    after: { wood: 50, stone: 25 },   // Post-construction
    spent: { wood: 50, stone: 25 }    // Amount consumed
  },
  construction: {
    immediate: false,            // Built immediately vs queued
    queuePosition: 0,           // Position in build queue
    completionTime: gameHours   // Hours until completion
  },
  tutorialContext: {
    expectedStep: 'settlement',  // Tutorial step this should complete
    stepIndex: 3,               // Numeric step position
    isCorrectBuilding: true     // Matches tutorial requirements
  }
}
```

### Auto-Play Event Flow Modifications
```javascript
// Auto-play affects event timing significantly
Normal Flow (Manual):
  User action → Event → Tutorial response → Next step (user-paced)

Auto-Play Flow (20-second intervals):
  Auto-advance → endDay() → Multiple events → Tutorial overwhelmed
  
Required Auto-Play Handling:
1. Detect tutorial active state
2. Pause auto-play during tutorial steps
3. Resume after tutorial completion
4. Handle partial auto-play states

// Implementation for auto-play tutorial integration
if (window.tutorialManager?.isActive) {
    // Pause auto-play during tutorial
    if (window.gameState?.autoPlayActive) {
        window.gameState.pauseAutoPlayForTutorial = true;
        window.gameState.stopAutoPlay();
        console.log('[Tutorial] Auto-play paused for tutorial');
    }
}
```

### Battle System Event Integration
```javascript
// Battle events must coordinate with main game loop
Battle Timer (1000ms intervals):
  updateBattle() → battle events → tutorial listener
  
Main Game Loop (16ms intervals):
  update() → UI updates → tutorial highlights
  
Coordination Required:
1. Battle events queued for main loop processing
2. Tutorial battle steps use simplified timing
3. Battle completion events synchronized with day progression

// Battle event structure for tutorial
{
  type: 'battle_started',
  battleId: 'battle_123',
  gameLoopSync: {
    frameQueued: gameLoopFrame,
    processedFrame: gameLoopFrame + 1
  },
  tutorialRelevant: true,
  expectedTutorialStep: 'battle_intro'
}
```

### Performance-Optimized Event Processing
```javascript
// Tutorial events must be lightweight for 60fps performance
Efficient Event Handler Pattern:
1. Pre-compile event conditions
2. Cache DOM elements
3. Minimize per-frame processing
4. Batch DOM updates

// Optimized tutorial event handler
const optimizedHandler = (() => {
    // Pre-compiled conditions
    const expectedType = step.buildingType;
    const cachedElement = document.querySelector(step.highlight);
    
    return (data) => {
        // Fast type comparison
        if (data.type === expectedType) {
            // Batch DOM updates
            requestAnimationFrame(() => {
                cachedElement?.classList.remove('tutorial-highlight');
                this.completeStep();
            });
        }
    };
})();
```

## 🚀 Next Steps for Tutorial Fixing

### Phase 1: Game Loop Integration (Critical Priority)
1. **Implement Tutorial Game Loop Mode**
   ```javascript
   // Add to gameState.js
   setTutorialMode(active) {
       this.tutorialMode = active;
       if (active) {
           this.pauseAutoPlay();
           this.pauseExpeditionTimeFlow();
           console.log('[GameState] Tutorial mode activated');
       }
   }
   ```

2. **Optimize Event Processing for 60fps**
   - Cache DOM elements for tutorial highlights
   - Pre-compile event conditions
   - Batch DOM updates with requestAnimationFrame
   - Implement event handler cleanup verification

3. **Add Game Loop Performance Monitoring**
   - Track tutorial event processing times
   - Monitor DOM query performance
   - Detect game loop frame drops during tutorial
   - Log auto-play conflicts with tutorial

### Phase 2: Time System Coordination (High Priority)
1. **Auto-Play Tutorial Integration**
   ```javascript
   // Modify gameState.js auto-play logic
   startAutoPlay() {
       // Prevent auto-play during tutorial
       if (window.tutorialManager?.isActive) {
           console.warn('[GameState] Auto-play blocked during tutorial');
           return;
       }
       // ... existing auto-play logic
   }
   ```

2. **Expedition Time Flow Control**
   - Disable expedition timers during tutorial
   - Queue expedition events for post-tutorial processing
   - Ensure building construction doesn't skip tutorial steps

3. **Battle System Synchronization**
   - Integrate battle timer with main game loop during tutorial
   - Simplify battle mechanics for tutorial steps
   - Ensure battle events don't interfere with tutorial progression

### Phase 3: Enhanced Event System (Medium Priority)
1. **Comprehensive Event Debugging**
   - Implement all debug functions from Phase 1-4 debug plan
   - Add real-time event monitoring dashboard
   - Create automated tutorial flow testing

2. **Event Data Structure Enhancement**
   - Include game loop context in all tutorial events
   - Add performance timing data to events  
   - Implement event versioning for compatibility

3. **Memory Management**
   - Strict event handler cleanup on tutorial completion
   - Monitor for memory leaks in game loop integration
   - Implement tutorial state garbage collection

### Phase 4: Performance Optimization (Low Priority)
1. **Tutorial Highlight Optimization**
   ```javascript
   // Optimized highlighting system
   class TutorialHighlighter {
       constructor() {
           this.cachedElements = new Map();
           this.animationFrameId = null;
       }
       
       highlight(selector) {
           if (!this.cachedElements.has(selector)) {
               this.cachedElements.set(selector, document.querySelector(selector));
           }
           
           const element = this.cachedElements.get(selector);
           if (element && !this.animationFrameId) {
               this.animationFrameId = requestAnimationFrame(() => {
                   element.classList.add('tutorial-highlight');
                   this.animationFrameId = null;
               });
           }
       }
   }
   ```

2. **Game Loop Tutorial Mode**
   - Reduce game loop frequency during tutorial (30fps instead of 60fps)
   - Disable non-essential game loop features during tutorial
   - Implement tutorial-specific rendering optimizations

### Implementation Priority Matrix

| Task | Game Loop Impact | Tutorial Critical | Implementation Complexity |
|------|-----------------|------------------|---------------------------|
| Auto-play tutorial integration | High | Critical | Low |
| Event processing optimization | High | Critical | Medium |
| Battle timer coordination | Medium | High | Medium |
| Expedition time flow control | Medium | High | Low |
| Performance monitoring | Low | Medium | High |
| Memory management | Medium | Medium | Medium |
| Highlight optimization | Low | Low | Low |

### Success Metrics

1. **Performance Targets**
   - Tutorial event processing < 1ms per event
   - No game loop frame drops > 33ms during tutorial
   - Memory usage increase < 10MB during tutorial
   - DOM queries < 0.5ms average during tutorial

2. **Functionality Targets**
   - 100% tutorial step completion rate
   - Zero auto-play conflicts during tutorial
   - All building placement events detected within 16ms
   - Battle system integration with < 100ms latency

3. **User Experience Targets**
   - Tutorial highlights visible within 1 frame
   - No noticeable performance degradation during tutorial
   - Smooth transitions between tutorial steps
   - Reliable tutorial completion and state persistence

## 🧪 Testing Protocol

### Game Loop Integration Testing

#### Real-Time Performance Testing
```javascript
// Performance test suite for tutorial-game loop integration
window.tutorialPerformanceTest = {
    // Test event processing under game loop load
    testEventProcessingUnderLoad: async () => {
        console.log('[Perf-Test] Starting event processing load test...');
        
        const eventCounts = [];
        const processingTimes = [];
        
        // Simulate high event load
        for (let i = 0; i < 1000; i++) {
            const start = performance.now();
            
            window.eventBus.emit('building_placed', {
                type: 'townCenter',
                x: 100, y: 100,
                id: `test_${i}`,
                timestamp: Date.now()
            });
            
            const duration = performance.now() - start;
            processingTimes.push(duration);
            
            // Wait for next frame
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        const avgTime = processingTimes.reduce((a,b) => a+b, 0) / processingTimes.length;
        console.log(`[Perf-Test] Average event processing: ${avgTime.toFixed(3)}ms`);
        console.log(`[Perf-Test] Max processing time: ${Math.max(...processingTimes).toFixed(3)}ms`);
        
        return {
            averageTime: avgTime,
            maxTime: Math.max(...processingTimes),
            passed: avgTime < 1.0 // Target: < 1ms per event
        };
    },
    
    // Test game loop frame rate during tutorial
    testFrameRateDuringTutorial: () => {
        let frameCount = 0;
        let startTime = performance.now();
        
        const measureFrames = () => {
            frameCount++;
            const elapsed = performance.now() - startTime;
            
            if (elapsed >= 1000) { // 1 second
                const fps = frameCount / (elapsed / 1000);
                console.log(`[Perf-Test] Tutorial FPS: ${fps.toFixed(1)}`);
                
                if (fps < 30) {
                    console.warn('[Perf-Test] WARNING: Low FPS during tutorial!');
                }
                
                return { fps, passed: fps >= 30 };
            } else {
                requestAnimationFrame(measureFrames);
            }
        };
        
        requestAnimationFrame(measureFrames);
    }
};
```

#### Auto-Play Conflict Testing
```javascript
// Test auto-play interactions with tutorial
window.tutorialAutoPlayTest = {
    // Test auto-play disabling during tutorial
    testAutoPlayPrevention: () => {
        console.log('[AutoPlay-Test] Testing auto-play prevention...');
        
        // Activate tutorial
        window.tutorialManager.isActive = true;
        
        // Try to start auto-play
        const autoPlayStarted = window.gameState.startAutoPlay();
        
        const result = {
            tutorialActive: window.tutorialManager.isActive,
            autoPlayBlocked: !window.gameState.autoPlayActive,
            passed: window.tutorialManager.isActive && !window.gameState.autoPlayActive
        };
        
        console.log('[AutoPlay-Test] Result:', result);
        return result;
    },
    
    // Test day advancement conflicts
    testDayAdvancementConflicts: () => {
        const initialDay = window.gameState.currentDay;
        
        // Simulate rapid day advancement during tutorial
        for (let i = 0; i < 5; i++) {
            window.gameState.endDay();
        }
        
        const result = {
            initialDay,
            finalDay: window.gameState.currentDay,
            daysAdvanced: window.gameState.currentDay - initialDay,
            tutorialStepChanged: true // Would need actual tracking
        };
        
        console.log('[AutoPlay-Test] Day advancement during tutorial:', result);
        return result;
    }
};
```

### Manual Testing Steps with Game Loop Awareness

#### Step-by-Step Integration Testing
1. **Initialize Game Loop Monitoring**
   ```javascript
   // Run before starting tutorial
   window.debugPerformance.measureEventPerformance();
   window.debugPerformance.measureDOMQueries();
   window.debugTimeSystems.startStateMonitoring();
   ```

2. **Start Fresh Game with Monitoring**
   - Clear localStorage: `localStorage.clear()`
   - Monitor initial game loop: `window.debugTimeSystems.trackAllTimers()`
   - Check for timer conflicts: `window.debugTimeSystems.detectConflicts()`

3. **Dynasty Name Entry (Performance Check)**
   - Enter dynasty name → measure DOM response time
   - Verify no auto-play activation during input
   - Check game loop continues smoothly during modal

4. **Story Progression (Event Flow Check)**
   - Complete intro steps → monitor event queue
   - Verify no background day progression
   - Check tutorial highlights render within 1 frame

5. **Building Placement (Critical Integration Test)**
   ```javascript
   // Before clicking Town Center button
   const preState = window.debugState.captureGameState();
   
   // Click Town Center button
   // ... user interaction ...
   
   // After building placement
   const postState = window.debugState.captureGameState();
   const differences = window.debugState.compareStates(preState, postState);
   console.log('[Integration-Test] State changes:', differences);
   ```

6. **Auto-Play Integration Testing**
   - Verify auto-play disabled during tutorial
   - Test manual day advancement during tutorial
   - Check resource generation alignment with tutorial

7. **Battle System Integration (Step 8+)**
   - Monitor battle timer coordination with main loop
   - Check battle event processing during tutorial
   - Verify no battle system memory leaks

### Automated Testing Suite
```javascript
// Comprehensive automated tutorial testing
window.automatedTutorialTest = {
    // Run full tutorial flow automatically
    runFullTutorialTest: async () => {
        console.log('[Auto-Test] Starting full tutorial test...');
        
        const results = {
            steps: {},
            performance: {},
            errors: []
        };
        
        try {
            // Initialize monitoring
            window.debugPerformance.measureEventPerformance();
            
            // Test each tutorial step
            for (let i = 0; i < window.tutorialManager.steps.length; i++) {
                const step = window.tutorialManager.steps[i];
                console.log(`[Auto-Test] Testing step ${i}: ${step.id}`);
                
                const stepResult = await this.testTutorialStep(step, i);
                results.steps[step.id] = stepResult;
                
                if (!stepResult.passed) {
                    results.errors.push(`Step ${i} (${step.id}) failed: ${stepResult.error}`);
                }
            }
            
            // Performance summary
            results.performance = window.debugPerformance.getPerformanceReport();
            
        } catch (error) {
            results.errors.push(`Test suite error: ${error.message}`);
        }
        
        console.log('[Auto-Test] Test complete:', results);
        return results;
    },
    
    // Test individual tutorial step
    testTutorialStep: async (step, index) => {
        const startTime = performance.now();
        
        try {
            // Simulate step activation
            window.tutorialManager.currentStep = index;
            window.tutorialManager.startStep(step.id);
            
            // Wait for step setup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simulate step completion based on type
            if (step.buildingType) {
                // Simulate building placement
                window.eventBus.emit('building_placed', {
                    type: step.buildingType,
                    x: 100, y: 100,
                    id: `test_${Date.now()}`,
                    timestamp: Date.now()
                });
            } else if (step.action) {
                // Execute step action
                step.action();
            }
            
            const duration = performance.now() - startTime;
            
            return {
                passed: true,
                duration: duration,
                stepId: step.id
            };
            
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                stepId: step.id
            };
        }
    }
};
```

### Performance Benchmarking Protocol
1. **Baseline Measurement**: Record game loop performance without tutorial
2. **Tutorial Load Testing**: Measure performance impact of tutorial system
3. **Memory Usage Monitoring**: Track memory consumption during tutorial
4. **Event Processing Benchmarking**: Measure event handling performance
5. **DOM Query Optimization**: Identify slow DOM operations during tutorial

### Success Criteria Validation
- [ ] Game loop maintains >30 FPS during tutorial
- [ ] Tutorial events process in <1ms average
- [ ] No memory leaks after tutorial completion
- [ ] Auto-play successfully disabled during tutorial
- [ ] All tutorial steps complete without errors
- [ ] Building placement events detected 100% reliably
- [ ] No conflicts between time systems during tutorial
window.testTutorial = {
  triggerBuildingPlaced: (type) => {
    window.eventBus.emit('building_placed', { type });
  },
  getCurrentStep: () => {
    return window.tutorialManager?.currentStep;
  },
  forceNextStep: () => {
    const tutorial = window.tutorialManager;
    if (tutorial && tutorial.steps[tutorial.currentStep]) {
      tutorial.steps[tutorial.currentStep].action?.();
    }
  }
};
```

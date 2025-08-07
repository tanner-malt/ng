# API Reference - Dynasty Builder

## 🎮 Game State API

### GameState Class Methods

#### Resource Management
```javascript
// Check if player can afford building
gameState.canAfford(buildingType) → boolean

// Spend resources for building
gameState.spend(buildingType) → boolean

// Add resources
gameState.addResources(resources) → void

// Get current resources
gameState.getResources() → { gold, food, wood, stone, metal }
```

#### Building System
```javascript
// Queue building for construction
gameState.queueBuilding(type, x, y) → buildingId

// Complete building construction
gameState.completeBuilding(buildingId) → void

// Get all buildings
gameState.getBuildings() → Array<Building>

// Get buildings by type
gameState.getBuildingsByType(type) → Array<Building>
```

#### Time Management
```javascript
// Advance to next day
gameState.endDay() → void

// Get current day
gameState.getCurrentDay() → number

// Get current season
gameState.getCurrentSeason() → string

// Check if auto-play is enabled
gameState.isAutoPlay() → boolean
```

#### State Persistence
```javascript
// Save game state
gameState.save() → void

// Load game state
gameState.load() → boolean

// Reset game state
gameState.reset() → void
```

## 🎯 Tutorial System API

### TutorialManager Class Methods

#### Tutorial Control
```javascript
// Start tutorial system
tutorialManager.showIntro() → void

// Start specific step
tutorialManager.startStep(stepId) → void

// Complete current step
tutorialManager.completeStep() → void

// Skip tutorial
tutorialManager.skip() → void
```

#### Dynasty Management
```javascript
// Get dynasty name
tutorialManager.getDynastyName() → string

// Set dynasty name
tutorialManager.setDynastyName(name) → void

// Clear dynasty data
tutorialManager.clearDynastyData() → void
```

#### Step Management
```javascript
// Get current step
tutorialManager.getCurrentStep() → TutorialStep

// Check if step is completed
tutorialManager.isStepCompleted(stepId) → boolean

// Get all completed steps
tutorialManager.getCompletedSteps() → Set<string>
```

#### UI Highlighting
```javascript
// Highlight element
tutorialManager.highlightElement(selector) → void

// Clear all highlights
tutorialManager.clearHighlights() → void

// Show tutorial pointer
tutorialManager.showPointer(x, y) → void
```

## 🏗️ Village System API

### Village Class Methods

#### Building Mode
```javascript
// Enter building mode
village.enterBuildMode(buildingType) → void

// Exit building mode
village.exitBuildMode() → void

// Check if in build mode
village.isInBuildMode() → boolean
```

#### Grid Management
```javascript
// Check if position is free
village.isPositionFree(x, y) → boolean

// Check if position is within bounds
village.isWithinBounds(x, y) → boolean

// Get terrain at position
village.getTerrainAt(x, y) → string
```

#### Building Operations
```javascript
// Place building at position
village.placeBuilding(type, x, y) → boolean

// Remove building
village.removeBuilding(buildingId) → void

// Get building at position
village.getBuildingAt(x, y) → Building | null
```

## 🔔 Modal System API

### SimpleModal Class Methods

#### Modal Display
```javascript
// Show modal dialog
simpleModal.show(title, content, options) → Promise<void>

// Hide current modal
simpleModal.hide() → void

// Check if modal is visible
simpleModal.isVisible() → boolean
```

#### Modal Options
```javascript
const options = {
  icon: '🎯',           // Modal icon
  closable: true,       // Can be closed by user
  showCancel: false,    // Show cancel button
  confirmText: 'OK',    // Confirm button text
  cancelText: 'Cancel'  // Cancel button text
}
```

## 📢 Notification System API

### Toast Notifications
```javascript
// Show toast notification
window.showToast(message, options) → void

// Toast options
const options = {
  icon: '🎯',          // Notification icon
  type: 'success',     // success, error, warning, info
  timeout: 3000        // Auto-dismiss time (ms)
}
```

### Message History
```javascript
// Add message to history
messageHistory.addMessage(title, content, type) → void

// Get message history
messageHistory.getMessages() → Array<Message>

// Clear message history
messageHistory.clear() → void

// Update unread count
messageHistory.updateIcon() → void
```

## 🎊 Achievement System API

### Achievement Methods
```javascript
// Check achievement requirements
achievementSystem.checkRequirements() → void

// Unlock achievement
achievementSystem.unlock(achievementId) → void

// Get unlocked achievements
achievementSystem.getUnlocked() → Array<Achievement>

// Get achievement progress
achievementSystem.getProgress(achievementId) → number
```

## 🔧 Event System API

### EventBus Methods

#### Event Management
```javascript
// Register event listener
eventBus.on(eventName, callback) → void

// Remove event listener
eventBus.off(eventName, callback) → void

// Emit event
eventBus.emit(eventName, data) → void

// Clear all listeners
eventBus.clearAll() → void
```

#### Standard Game Events
```javascript
// Building events
'building_placed'     → { type, x, y, id }
'building_completed'  → { type, id, x, y }

// Time events
'day_ended'          → { day, season }
'season_changed'     → { newSeason, day }

// Resource events
'resources_changed'  → { resources, change }
'resource_gained'    → { type, amount }

// Tutorial events
'tutorial_started'        → { stepId }
'tutorial_step_completed' → { stepId, nextStep }
'tutorial_completed'      → { totalSteps }

// UI events
'view_switched'      → { from, to }
'modal_shown'        → { title, type }
'modal_hidden'       → { }
```

## 🛠️ Debug System API

### Debug Commands (Console)
```javascript
// General debugging
debugCommands.help()              // Show all commands
debugCommands.status()            // Show system status
debugCommands.reset()             // Reset game state

// State management
debugCommands.save()              // Create save snapshot
debugCommands.load(snapshotId)    // Load snapshot
debugCommands.export()            // Export save data

// Tutorial debugging
debugDynasty()                    // Check dynasty info
clearDynasty()                    // Clear dynasty data
setTestDynasty('Name')           // Set test dynasty

// Building debugging
debugCommands.addBuilding(type, x, y)  // Add building
debugCommands.completeAll()            // Complete all construction
debugCommands.unlockAll()              // Unlock all buildings

// Resource debugging
debugCommands.addResources(resources)  // Add resources
debugCommands.maxResources()           // Max all resources
debugCommands.clearResources()         // Clear all resources
```

## 🔄 Error Recovery API

### ErrorRecovery Class Methods

#### Recovery Strategies
```javascript
// Register recovery strategy
errorRecovery.registerStrategy(errorType, strategyFn, options) → void

// Attempt recovery
errorRecovery.attemptRecovery(errorType, error, context) → Promise<boolean>

// Handle error
errorRecovery.handleError(errorType, error, context) → Promise<void>
```

#### System Control
```javascript
// Enable/disable recovery
errorRecovery.setEnabled(enabled) → void

// Get recovery statistics
errorRecovery.getStats() → Object

// Stabilize game state
errorRecovery.stabilizeGameState() → Promise<boolean>
```

## 📊 Data Structures

### Building Object
```javascript
{
  id: string,           // Unique identifier
  type: string,         // Building type
  x: number,           // Grid position X
  y: number,           // Grid position Y
  constructionDay: number,  // Day construction started
  isCompleted: boolean,     // Construction complete
  level: number        // Building level (future use)
}
```

### Tutorial Step Object
```javascript
{
  id: string,              // Step identifier
  title: string,           // Display title
  story: string,           // HTML content
  instruction: string,     // User instruction
  icon: string,           // Display icon
  highlight: string,      // CSS selector to highlight
  waitFor: string,        // Completion event
  buildingType: string,   // Required building type
  requiresInput: boolean, // Needs user input
  action: Function       // Post-completion action
}
```

### Resource Object
```javascript
{
  gold: number,    // Currency
  food: number,    // Food supply
  wood: number,    // Wood resource
  stone: number,   // Stone resource
  metal: number    // Metal resource
}
```

### Achievement Object
```javascript
{
  id: string,           // Achievement identifier
  name: string,         // Display name
  description: string,  // Description
  icon: string,        // Display icon
  requirements: Object, // Completion requirements
  unlocked: boolean,   // Unlock status
  progress: number     // Progress percentage
}
```

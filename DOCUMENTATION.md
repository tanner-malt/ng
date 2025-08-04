# Dynasty Builder - Complete Documentation

## 📁 Project Structure

```
ng/
├── public/                     # Static web assets
│   ├── game.html              # Main game interface
│   ├── game.css               # Game styles and UI
│   └── progress-icons.css     # Icon styles for progression
├── src/                       # Game source code
│   ├── systems/               # Core game systems
│   │   └── core/
│   │       └── eventBus.js    # Event system backbone
│   ├── utils/                 # Utility modules
│   │   └── errorRecovery.js   # Auto error recovery system
│   ├── app.js                 # Main game application
│   ├── gameState.js           # Game state management
│   ├── village.js             # Village view and building system
│   ├── tutorial.js            # Tutorial system
│   ├── simpleModal.js         # Modal dialog system
│   ├── uiPopups.js            # UI notifications and popups
│   ├── messageHistory.js      # Message history system
│   ├── achievements.js        # Achievement system
│   ├── eventBusIntegrations.js # Event system integrations
│   └── main.js                # Application entry point
└── docs/                      # Documentation
    ├── SYSTEM_MAPPING.md      # System architecture
    └── REFACTORING_GUIDE.md   # Code organization guide
```

## 🎮 Game Systems Overview

### Core Architecture
- **Event-Driven**: All systems communicate via the EventBus
- **Modular Design**: Each feature is self-contained
- **Error Recovery**: Automatic error detection and recovery
- **State Management**: Centralized game state with localStorage persistence

### System Dependencies
```
EventBus (Core)
├── GameState (State Management)
├── Village (Building System)
├── Tutorial (Player Guidance)
├── Modal System (User Interface)
└── Debug Tools (Development)
```

## 🏗️ Building System

### Building Types
- **Town Center**: Settlement foundation (100💰, 50🌲, 30🪨) - 3 days
- **House**: Population housing (50💰, 25🌲) - 2 days  
- **Farm**: Food production (75💰, 40🌲) - 2 days
- **Barracks**: Military training (150💰, 75🌲, 50🪨) - 4 days
- **Workshop**: Crafting facility (125💰, 60🌲, 40🪨) - 3 days

### Building Process
1. **Selection**: Click building button
2. **Placement**: Click on village grid
3. **Construction**: Building takes X days to complete
4. **Completion**: Building becomes functional

### Grid System
- **50x50 pixel tiles**
- **Terrain-based placement** (currently disabled for simplicity)
- **Collision detection** prevents overlapping
- **Visual feedback** with ghost buildings during placement

## 🎯 Tutorial System

### Tutorial Flow
1. **Dynasty Name** → Set player identity
2. **Royal Mission** → Story context
3. **Building Basics** → Learn construction
4. **Town Center** → First building
5. **Housing** → Population management
6. **Food Production** → Resource management
7. **Time Management** → Day advancement
8. **Defense** → Military preparation
9. **Completion** → Unlock features

### Tutorial Events
- `building_placed` - Triggers progression when correct building placed
- `day_ended` - Advances time-based tutorial steps
- `view_switched` - Handles navigation tutorials

### Completion Tracking
- **localStorage**: Persistent completion status
- **Event System**: Real-time progress updates
- **Step Validation**: Ensures requirements are met

## 🔧 Debug System

### Debug Commands (Console)
```javascript
// Dynasty debugging
debugDynasty()           // Check dynasty name status
clearDynasty()           // Clear dynasty data
setTestDynasty('Name')   // Set test name

// Debug tools
debugCommands.help()     // Show all commands
debugCommands.reset()    // Reset game state
debugCommands.snapshot() // Create state snapshot
```

### Error Recovery
- **Automatic Detection**: Monitors for JavaScript errors
- **State Validation**: Checks resource values and game state
- **UI Cleanup**: Removes stuck elements and resets cursors
- **User Notification**: Informs users of recovery actions

### Health Monitoring
- **System Status**: Tracks all game systems
- **Performance**: Monitors frame rates and memory
- **Error Logging**: Comprehensive error tracking
- **Snapshots**: State preservation for debugging

## 💬 Notification System

### Toast Notifications
- **Building Placement**: Construction started messages
- **Tutorial Progress**: Step completion feedback
- **Achievements**: Unlock notifications
- **Errors**: User-friendly error messages

### Message History
- **Persistent Log**: All game events recorded
- **Categorized**: Info, warning, error types
- **Searchable**: Find specific messages
- **Exportable**: Debug information export

## 🎨 UI System

### Modal System
- **Simple Modal**: Basic dialogs and confirmations
- **Tutorial Modals**: Story and instruction dialogs
- **Settings**: Configuration options
- **Progression**: Feature unlock status

### Responsive Design
- **Grid-based Layout**: Flexible village grid
- **Sidebar Controls**: Building menu and day controls
- **Top Navigation**: View switching
- **Icon System**: Emoji-based visual feedback

## 📊 State Management

### Game State Structure
```javascript
{
  resources: { gold, food, wood, stone, metal },
  population: number,
  currentDay: number,
  currentSeason: string,
  buildings: [...],
  buildingSites: [...],
  tutorial: { completed, currentStep },
  dynastyName: string
}
```

### Persistence
- **localStorage**: Automatic save/load
- **Error Recovery**: Corrupted data handling
- **Migration**: Version compatibility
- **Reset Options**: Clean slate functionality

## 🔄 Event System

### Core Events
- `building_placed` - Building construction started
- `building_completed` - Building construction finished
- `day_ended` - Day advancement
- `resources_changed` - Resource updates
- `tutorial_step_completed` - Tutorial progression

### Integration Points
- **Tutorial System**: Listens for game events
- **Achievement System**: Tracks progress events
- **UI Updates**: Refreshes displays
- **State Persistence**: Saves on significant events

## ⚙️ Configuration

### Build Settings
```javascript
// Building costs in gameState.js
buildingCosts: {
  townCenter: { gold: 100, wood: 50, stone: 30 },
  house: { gold: 50, wood: 25 },
  farm: { gold: 75, wood: 40 },
  // ...
}
```

### Tutorial Settings
```javascript
// Tutorial steps in tutorial.js
steps: [
  { id: 'dynasty_name', requiresInput: true },
  { id: 'settlement', waitFor: 'building_placed' },
  // ...
]
```

## 🚀 Development Workflow

### Adding New Buildings
1. Update `buildingCosts` in `gameState.js`
2. Add building info to `eventBusIntegrations.js`
3. Create building button in `game.html`
4. Update tutorial steps if needed
5. Add achievement triggers

### Adding Tutorial Steps
1. Define step in `tutorial.js` steps array
2. Set completion conditions (`waitFor`)
3. Add UI highlights (`highlight` property)
4. Test step progression
5. Update documentation

### Testing Features
1. Check browser developer tools
2. Test error recovery scenarios
3. Verify state persistence
4. Test tutorial flow

## 📝 Best Practices

### Code Organization
- **Single Responsibility**: Each file has one main purpose
- **Event-Driven**: Use EventBus for system communication
- **Error Handling**: Always include error recovery
- **Logging**: Use console logging for debugging

### Performance
- **Efficient Rendering**: Only update when necessary
- **Memory Management**: Clean up event listeners
- **State Optimization**: Minimize localStorage writes
- **UI Responsiveness**: Avoid blocking operations

### User Experience
- **Clear Feedback**: Always show action results
- **Error Recovery**: Graceful failure handling
- **Progressive Disclosure**: Reveal features gradually
- **Consistent Interface**: Unified design patterns

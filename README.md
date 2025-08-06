# Idle: Dynasty Builder

## Overview
Idle: Dynasty Builder is a browser-based idle strategy game where players build and manage a village, explore a hexagonal world map, and defend against threats. The game features a comprehensive tutorial system and progressive gameplay mechanics.

## Features
- **Village Management**: Build and upgrade structures (houses, farms, barracks, etc.)
- **Resource Management**: Manage food, wood, stone, and gold
- **World Exploration**: Navigate a hexagonal world map with expeditions
- **Tutorial System**: Guided experience for new players including dynasty naming
- **Auto-play System**: Automated progression for idle gameplay
- **Battle System**: Defend against waves of enemies
- **Quest System**: Complete expeditions and challenges

## Getting Started

### Installation
```bash
npm install
npm run dev
```

### Game Access
Open `http://localhost:8000/public/game.html` in your browser.

## Project Structure

```
/workspaces/ng/
├── src/                    # Core game logic
│   ├── app.js             # Main game initialization and coordination
│   ├── eventBus.js        # Event system for component communication
│   ├── gameState.js       # Game state management and persistence
│   ├── modalSystem.js     # Modal/dialog system
│   ├── tutorial.js        # Tutorial system and guidance
│   ├── village.js         # Village building and management
│   ├── worldManager.js    # World map and exploration
│   ├── battle.js          # Combat and defense systems
│   ├── throne.js          # Dynasty management and royal features
│   ├── monarch.js         # Military and army management
│   ├── quest.js           # Individual quest logic
│   ├── quests.js          # Quest system management
│   ├── uiPopups.js        # UI popups and notifications
│   └── style.less         # Game styling (LESS)
├── public/                # Public web assets
│   ├── game.html          # Main game interface
│   ├── game.css           # Compiled game styles
│   ├── progress-icons.css # UI icon styles
│   └── version.json       # Version tracking
├── scripts/               # Build and utility scripts
└── package.json           # Project configuration
```

## Core Systems


### 1. Tutorial System (`tutorial.js`)
Guides new players through a step-based onboarding:
1. **Dynasty Naming**: Name your royal house
2. **Village Building**: Learn construction and placement
3. **Resource Management**: Understand food, wood, stone, gold
4. **World Exploration**: Unlock world map and expeditions
5. **Military Preparation**: Build barracks, unlock battle mode

**Features:**
- Auto-starts for new players
- Modal-based, story-driven steps
- Progressive feature unlocking
- Dynasty-specific storytelling
- Integrates with achievements and message history

### 2. Village Management (`village.js`)
- **Building System**: Place, upgrade, and manage structures
- **Resource Generation**: Buildings produce resources per cycle
- **Construction Time**: Realistic, multi-day building times
- **Grid & Terrain**: Strategic placement, terrain types (grass, forest, hills, water, fertile, rocky)
- **Supply Chains**: Visualized resource flow from production to town center
- **Automation**: Production planning and auto-assignment (based on prestige)

**Available Buildings:**
- Town Center (central hub, boosts all production)
- House (population capacity)
- Farm (food)
- Sawmill (wood)
- Quarry (stone)
- Market (gold, trade efficiency)
- Barracks (soldiers, defense)
- Workshop (production boost)
- Temple (influence, happiness)
- Academy (research, efficiency)
- Castle (defense, influence)
- University (advanced research)

### 3. Achievement System (`achievements.js`)
- **Progress Tracking**: Unlock achievements for milestones (buildings, resources, combat, tutorial)
- **Rewards**: Achievements grant resources, prestige, influence, and more
- **Integration**: Tied to tutorial, village, and battle systems
- **UI**: Modal popups and achievement history
- **Persistence**: Progress saved in localStorage

### 4. Message History (`messageHistory.js`)
- **Notifications**: Persistent log of achievements, events, and royal messages
- **UI**: Modal-based message history with unread/new indicators
- **Types**: Info, achievement, warning, royal, tutorial, grant
- **Persistence**: Messages saved in localStorage

### 5. Game State Management (`gameState.js`)
- **Save/Load**: Persistent state using localStorage
- **Resource Tracking**: Real-time management of all resources
- **Time Progression**: Day/night cycle, seasons
- **Auto-save**: Automatic state preservation

### 6. Modal System (`modalSystem.js`)
- **Tutorial Modals**: Story-driven dialogs
- **Confirmation/Info**: User prompts and help
- **Promise-based**: Async modal handling
- **Mini-modals**: Contextual building/info popups

### 7. Event System (`eventBus.js`)
- **Component Communication**: Decoupled event-driven architecture
- **Event Broadcasting**: Game-wide notifications
- **State Sync**: UI and game state updates

### 8. World & Quest Systems
- **World Map (`worldManager.js`)**: Hex grid, exploration, weather, terrain
- **Quest System (`quest.js`, `quests.js`)**: Expeditions, Oregon Trail-style travel, modal-based quest UI

### 9. Battle System (`battle.js`)
- **Combat**: Automated battles, AI personalities, weather/terrain effects
- **Preparation**: Barracks, army management, battle phases

### 10. Unlock System (`unlockSystem.js`)
- **Feature Gating**: Achievements unlock new buildings, views, and features
- **Progression**: Dynamic content unlocking as player advances

### 11. Debug & Error Recovery (`debugTools.js`, `errorRecovery.js`)
- **Debug Tools**: Console commands, test hooks
- **Error Handling**: Recovery from common issues

### 12. Backup & Recovery (`app_backup.js`)
- **Backup**: Fallback app logic and error recovery

---

## Building Types & Effects

| Building      | Effect(s)                                 |
|-------------- |-------------------------------------------|
| Town Center   | Boosts all production, pop. capacity      |
| House         | Increases population cap                  |
| Farm          | Produces food                             |
| Sawmill       | Produces wood                             |
| Quarry        | Produces stone                            |
| Market        | Generates gold, boosts trade              |
| Barracks      | Trains soldiers, provides defense         |
| Workshop      | Boosts production efficiency              |
| Temple        | Grants influence, happiness               |
| Academy       | Research, boosts efficiency               |
| Castle        | Defense, influence                        |
| University    | Advanced research, efficiency             |

---

### 3. Game State Management (`gameState.js`)
- **Save/Load System**: Persistent game state using localStorage
- **Resource Tracking**: Real-time resource management
- **Time Progression**: Day/night cycle and seasonal changes
- **Auto-save**: Automatic game state preservation

### 4. Modal System (`modalSystem.js`)
- **Tutorial Modals**: Story-driven dialogs with rich formatting
- **Confirmation Dialogs**: User decision prompts
- **Information Displays**: Game state and help information
- **Promise-based**: Async modal handling

### 5. Event System (`eventBus.js`)
- **Component Communication**: Decoupled system communication
- **Event Broadcasting**: Game-wide event notifications
- **State Synchronization**: Keep UI and game state in sync

## Development

### File Structure Guidelines
- **Core Logic**: Keep in `/src/` directory
- **Game Interface**: Main game in `/public/game.html`
- **Styles**: Use `/public/game.css` for compiled styles
- **Documentation**: Keep README and essential docs in root

### Code Standards
- Use ES6+ JavaScript features
- Implement proper error handling
- Include console logging for debugging
- Follow class-based architecture for major systems
- Use event bus for cross-component communication

### Testing
The game includes a built-in tutorial system that serves as both user onboarding and system testing.

## Architecture

### Main Game Loop
1. **Initialization**: App.js coordinates system startup
2. **Tutorial**: Guide new players through core mechanics  
3. **Village Phase**: Building and resource management
4. **World Phase**: Exploration and expeditions
5. **Battle Phase**: Combat and defense

### Data Flow
```
User Input → Event Bus → Game Systems → State Update → UI Refresh
```

### Component Relationships
- **App.js**: Central coordinator, initializes all systems
- **GameState.js**: Single source of truth for game data
- **EventBus.js**: Communication hub between components
- **Modal System**: User interaction layer
- **Tutorial System**: User guidance and onboarding

## Future Development
- Enhanced battle mechanics
- More building types and upgrades  
- Expanded world map with more locations
- Multiplayer features
- Achievement system
- Advanced quest chains

## License
MIT License - See package.json for details.

# Idle: Dynasty Builder

## Overview
Idle: Dynasty Builder is a browser-based idle/strategy game. The codebase is organized by system, with each major mechanic in its own file. This README is for internal reference and logic mapping.

## Main Systems & File Roles
- `app.js`: Main game initialization and system coordination
- `eventBus.js`: Event system for decoupled component communication
- `gameState.js`: Game state management and persistence (localStorage)
- `modalSystem.js`: Modal/dialog logic (tutorial, info, confirmation)
- `tutorial.js`: Tutorial system and onboarding logic
- `village.js`: Village building, placement, upgrades, resource generation
- `worldManager.js`: World map, hex grid, exploration
- `battle.js`: Combat, battle phases, AI, weather/terrain effects
- `throne.js`: Dynasty management, royal features
- `monarch.js`: Monarch system (NOT military management)
- `quest.js`: Individual quest logic
- `quests.js`: Quest system management
- `uiPopups.js`: UI popups and notifications
- `achievements.js`: Achievement tracking, rewards, integration
- `messageHistory.js`: Persistent message log (achievements, events, royal messages)
- `unlockSystem.js`: Feature gating and progression
- `app_backup.js`: Backup logic and error recovery
- `style.less`: LESS source for game styling
- `debugTools.js`: UNKNOWN
- `errorRecovery.js`: UNKNOWN

## Project Structure


## Project Structure

```
/workspaces/ng/
├── src/                    # Core game logic
│   ├── app.js               # Main game initialization and coordination
│   ├── eventBus.js          # Event system for component communication
│   ├── gameState.js         # Game state management and persistence
│   ├── modalSystem.js       # Modal/dialog system
│   ├── tutorial.js          # Tutorial system and guidance
│   ├── village.js           # Village building and management
│   ├── worldManager.js      # World map and exploration
│   ├── battle.js            # Combat and defense systems
│   ├── throne.js            # Dynasty management and royal features
│   ├── monarch.js           # Military and army management
│   ├── quest.js             # Individual quest logic
│   ├── quests.js            # Quest system management
│   ├── uiPopups.js          # UI popups and notifications
│   ├── achievements.js      # Achievement system
│   ├── messageHistory.js    # Persistent message log
│   ├── unlockSystem.js      # Feature unlocking system
│   ├── app_backup.js        # Backup logic and error recovery
│   └── style.less           # Game styling (LESS)
├── public/                  # Public web assets
│   ├── game.html            # Main game interface
│   ├── game.css             # Compiled game styles
│   ├── progress-icons.css   # UI icon styles
│   └── version.json         # Version tracking
├── scripts/                 # Build and utility scripts
│   └── update-version-json.js # Version update utility
├── docs/                    # Design and system documentation
│   ├── GAME_BALANCE.md
│   ├── GAMEPLAY_GUIDE.md
│   ├── REFACTORING_GUIDE.md
│   ├── SYSTEM_MAPPING.md
├── package.json             # Project configuration
├── README.md                # Main documentation
└── TODO.md                  # Development tasks
```

## Core Systems


### 1. Tutorial System
When you start a new game, the tutorial guides you step-by-step. You'll name your dynasty, learn how to build your village, manage resources, explore the world, and prepare for battles. The tutorial is interactive and story-driven, helping you unlock new features as you progress. It also connects with the achievement and message systems, so you always know what you've accomplished.

### 2. Village Management
Your village is the heart of your dynasty. You can place and upgrade buildings, each with its own purpose—houses for population, farms for food, woodcutter lodges for wood, and so on. Building takes time, and where you place things matters: terrain types like forest, hills, and water affect your strategy. As your village grows, supply chains become visible, showing how resources flow. Automation features help you manage production as your prestige increases.

**Buildings you can construct:**
- Town Center: Boosts all production, increases population capacity
- House: Lets you support more villagers
- Farm: Produces food
- Woodcutter Lodge: Produces wood
- Quarry: Produces stone
- Market: Generates gold, improves trade
- Barracks: Trains soldiers, improves defense
- Workshop: Boosts production efficiency
- Temple: Increases influence and happiness
- Academy: Improves research and efficiency
- Castle: Adds defense and influence
- University: Unlocks advanced research

### 3. Achievement System
As you play, you'll unlock achievements for reaching milestones—like building certain structures, gathering resources, winning battles, or completing tutorial steps. Achievements reward you with resources, prestige, influence, and more, and are tracked in your history so you can see your progress at any time.
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
| Woodcutter Lodge | Produces wood                             |
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

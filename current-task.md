# Current Task: Enhanced Tutorial and World View Implementation

## Overview
Implement an integrated tutorial system that guides players through the core game loop: village management → expedition planning → world exploration → battle preparation. The tutorial should be skippable but comprehensive for new players.

## Core Changes Required

### 1. Tutorial System Improvements
- **Auto-start on game restart**: Tutorial should automatically begin when the game starts
- **Skip option**: Provide clear option to skip tutorial for returning players
- **Integration**: Tutorial steps should use actual game mechanics, not separate systems

### 2. Battle View → World View Rename
- Rename "Battle View" to "World View" throughout codebase
- World View will manage three core systems:
  - Expeditions (movement and events)
  - Quests (locked for now)
  - Battles (AI-driven combat)

### 3. Tutorial Flow Implementation

#### Phase 1: Village Setup (Days 1-4)
1. **Dynasty Naming** (existing)
2. **Town Hall Placement** - Learn basic building mechanics
3. **Resource Boost** - One-time tutorial resources grant
4. **Building Challenge** - Build 2 houses and 3 farms
5. **World View Unlock** - Button to unlock world view

#### Phase 2: World Exploration (Day 5+)
6. **Scout Report** - Introduces the Belon War Party threat
7. **World Map Introduction** - Hexagonal grid with terrain
8. **Army Drafting** - Select Ruler + 2 peasants from villagers
9. **Logistics Management** - Learn food supply mechanics
10. **Expedition Planning** - Set destination to Belon War Party
11. **Travel Events** (3 scripted events):
    - Bad: Food supply ruined
    - Good: Hunting opportunity (delay for food)
    - Neutral: Hunter gathering tribe encounter
12. **Battle Preparation** - Tutorial ends at battle start

## Technical Implementation Requirements

### World View Structure
```
World View
├── Hexagonal Map
│   ├── Village (center)
│   ├── Belon War Party (2 tiles away)
│   └── Terrain features per hex
├── Parties Management Tab
│   ├── Expeditions Section
│   │   └── Army management (Travel, Rename, View Composition, Manage Logistics)
│   ├── Quests Section (locked)
│   └── Battles Section
└── Map Interaction
    ├── Village Click → "Enter Village" / "Draft Army"
    └── Hex selection for expedition targets
```

### Expedition System
- **Base travel speed**: 7 days per hex tile
- **Events impact**: Morale, food supplies, information, troop composition
- **Logistics tracking**: Food consumption during travel
- **Army composition**: Ruler + selected villagers

### Map Features per Hex
- Terrain type (affects movement/events)
- Unit presence (armies, monsters, NPCs)
- Weather conditions
- Discovery status (explored/unexplored)
- Resource potential
- Strategic value

## Implementation Phases

### Phase 1: Tutorial Integration ✅✅ (Priority: High) - COMPLETED
- ✅ Auto-start tutorial on game restart
- ✅ Add skip tutorial option with welcome screen
- ✅ Integrate tutorial with actual game mechanics
- ✅ Dynasty naming step implemented
- ✅ Town Center placement tutorial
- ✅ Royal resource grant (150 food, 100 wood, 75 stone, 500 gold)
- ✅ Build 2 houses challenge
- ✅ Build 3 farms challenge
- ✅ World view unlock button

### Phase 2: World View Rename ✅✅ (Priority: High) - COMPLETED
- ✅ Rename all "Battle View" references to "World View"
- ✅ Update UI labels and navigation (Battle tab removed, World tab kept)
- ✅ Update documentation and comments
- ✅ Update CSS classes for world-view styling
- ✅ Update JavaScript view switching logic

### Phase 3: Hexagonal World Map ✅✅ (Priority: High) - COMPLETED
- ✅ Create hexagonal grid system with canvas rendering
- ✅ Implement terrain generation with varied biomes
- ✅ Place village at center with proper identification
- ✅ Add Belon War Party 2 tiles away as tutorial enemy
- ✅ Basic hex interaction (click to select and view details)
- ✅ Hex discovery system (fog of war)
- ✅ Weather and elevation system per hex

### Phase 4: Army Drafting System ✅✅ (Priority: High) - COMPLETED
- ✅ Village click menu (Enter Village / Draft Army)
- ✅ Villager selection interface with ruler + companions
- ✅ Army composition tracking and display
- ✅ "1st Army" creation in expeditions panel
- ✅ Warning system about ruler absence from village

### Phase 5: Expedition Management ✅✅ (Priority: Medium) - COMPLETED
- ✅ Parties Management UI with three tabs (Expeditions, Quests, Battles)
- ✅ Expedition army display with 4 buttons (Travel, Rename, View Composition, Manage Logistics)
- ✅ Logistics management with food tracking and supply costs
- ✅ Tutorial system for logistics management
- ✅ Army composition viewer with member details

### Phase 6: Travel Events System ❌ (Priority: Medium) - NOT IMPLEMENTED
- ❌ Event system framework for travel encounters
- ❌ Three scripted tutorial events implementation:
  - Bad event: Food supply ruined
  - Good event: Hunting opportunity (delay for food)
  - Neutral event: Hunter gathering tribe encounter
- ❌ Event impact on army stats (morale, food, information, troop composition)
- ❌ Progress tracking during travel (7 days per hex base speed)
- ❌ Pathfinding system for expedition routes

### Phase 7: Integration & Polish ❌ (Priority: Low) - NOT IMPLEMENTED  
- ❌ Seamless transitions between systems
- ❌ Save/load support for new features
- ❌ Tutorial progress tracking for world exploration
- ❌ UI polish and responsive design improvements

## Design Notes

### Key Gameplay Elements
- **Governor/General Unlock**: Future feature to manage village while ruler is away
- **Morale System**: Affects army effectiveness
- **Information Gathering**: Map exploration reveals strategic data
- **Resource Management**: Food consumption during expeditions
- **Discovery System**: Remember locations of encountered tribes/resources

### Tutorial Philosophy
- Use real game mechanics, not separate tutorial-only features
- Progressive complexity introduction
- Clear connection between village → world → battle
- Optional but comprehensive for new players

## Success Criteria
1. New players can complete tutorial without confusion
2. Tutorial teaches actual game mechanics used in main game
3. Smooth transition from village management to world exploration
4. All systems integrate cleanly with existing codebase
5. Tutorial can be skipped by experienced players

## Next Steps
Begin with Phase 1 (Tutorial Integration) and work through phases sequentially, testing integration at each step.

# System Mapping & Visual Documentation

## 📊 System Overview

| System | Current Location | New Location | Primary Function | UI Elements |
|--------|------------------|--------------|------------------|-------------|
| **EventBus** | `src/eventBus.js` | `src/systems/core/eventBus.js` | Inter-system communication | None (invisible) |
| **GameState** | `src/gameState.js` | `src/systems/core/gameState.js` | Central data management | Resource display |
| **SimpleModal** | `src/simpleModal.js` | `src/systems/ui/simpleModal.js` | Dialog system | Modal overlays |
| **MessageHistory** | `src/messageHistory.js` | `src/systems/ui/messageHistory.js` | Message tracking | History panel |
| **SimpleTutorial** | `src/simpleTutorial.js` | `src/systems/features/simpleTutorial.js` | New player guidance | Tutorial overlays |
| **Achievements** | `src/achievements.js` | `src/systems/features/achievements.js` | Progress tracking | Achievement popups |
| **Village** | `src/village.js` | `src/systems/gameplay/village.js` | Building management | Village grid, building buttons |
| **Battle** | `src/battle.js` | `src/systems/gameplay/battle.js` | Combat system | Battle interface |
| **Quest** | `src/quest.js` | `src/systems/gameplay/quest.js` | Mission system | Quest panels |

## 🎨 Visual System Documentation

### Core Systems (Invisible to User)

#### EventBus System
```
[GameState] ──event──> [EventBus] ──event──> [Village]
     │                      │                    │
     └──────── event ───────┼──── event ────────┘
                            │
                    [Tutorial] [Achievements]
```
- **Function**: Decoupled communication between systems
- **Visual**: No direct UI (enables all other systems)
- **Debug**: Console logging of all events

#### GameState System
```
┌─────────────────────────────────────┐
│ Resources: 💰100 🌾50 🌲50 🪨30 👥1 │ ← UI Display
├─────────────────────────────────────┤
│ Internal State:                     │
│ - buildings: [...]                  │
│ - progress: {...}                   │
│ - tutorial: {...}                   │
└─────────────────────────────────────┘
```
- **Function**: Centralized data storage and persistence
- **Visual**: Resource counters in top-left
- **Debug**: State inspector in debug tools

### UI Systems

#### SimpleModal System
```
┌────────────────────────────────────┐
│ ╔════════════════════════════════╗ │
│ ║  🏰 Welcome to Dynasty Builder! ║ │ ← Modal Window
│ ║                                ║ │
│ ║  Your mission is to build...   ║ │
│ ║                                ║ │
│ ║            [Continue]          ║ │ ← Action Button
│ ╚════════════════════════════════╝ │
└────────────────────────────────────┘
```
- **Function**: Display important messages and get user input
- **Visual**: Centered modal overlays with backdrop
- **Debug**: Modal history and state tracking

#### MessageHistory System
```
┌─────────────────────────┐
│ 📜 Message History (3)  │ ← Top-right button
└─────────────────────────┘
          │ (click)
          ▼
┌─────────────────────────────────────┐
│ ╔═════════════════════════════════╗ │
│ ║ 📜 Message History              ║ │
│ ║ ────────────────────────────── ║ │
│ ║ [Tutorial] Welcome to game...   ║ │
│ ║ [Achievement] First building... ║ │
│ ║ [Quest] New mission available   ║ │
│ ╚═════════════════════════════════╝ │
└─────────────────────────────────────┘
```
- **Function**: Track and review past messages
- **Visual**: Button with unread count + expandable panel
- **Debug**: Message categorization and timestamps

### Feature Systems

#### SimpleTutorial System
```
Step 1: Mission Explanation
┌────────────────────────────────────┐
│ ╔════════════════════════════════╗ │
│ ║ 🏰 Welcome to Dynasty Builder! ║ │
│ ║ Your mission is to build...    ║ │
│ ║            [Continue]          ║ │
│ ╚════════════════════════════════╝ │
└────────────────────────────────────┘

Step 2: Visual Guidance
┌─────────────────────────────────────┐
│  👆 (animated pointer)              │
│  ╔═══════════════════════════════╗  │
│  ║ 🏛️ Town Center                ║  │ ← Highlighted button
│  ║ 💰 100 🌲 50 🪨 30           ║  │
│  ╚═══════════════════════════════╝  │
└─────────────────────────────────────┘
```
- **Function**: Guide new players through first actions
- **Visual**: 2 modals + visual highlighting + animated pointer
- **Debug**: Step tracking and completion status

#### Achievement System
```
Unlock Notification:
┌─────────────────────────────────────┐
│ 🏆 Achievement Unlocked!            │
│ First Building                      │
│ Built your first structure         │
│ Reward: +50 💰                      │
└─────────────────────────────────────┘
```
- **Function**: Track and reward player progress
- **Visual**: Toast notifications for unlocks
- **Debug**: Achievement list and progress tracking

### Gameplay Systems

#### Village System
```
Building Controls:
┌─────────────────────────────────────┐
│ 🏗️ Buildings                        │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ 🏛️ Town Ctr │ │ 🏠 House    │    │
│ │ 💰100 🌲50  │ │ 💰50 🌲25   │    │
│ └─────────────┘ └─────────────┘    │
└─────────────────────────────────────┘

Village Grid:
┌─────────────────────────────────────┐
│ [🌲][🌾][🏛️][  ][  ]               │
│ [🏠][🏠][  ][  ][  ]               │
│ [  ][  ][  ][  ][⚔️]               │
└─────────────────────────────────────┘
```
- **Function**: Building placement and village visualization
- **Visual**: Building buttons + grid layout
- **Debug**: Building state and grid coordinates

## 🔧 Debug Tools Integration

### System Health Dashboard
```
┌─────────────────────────────────────┐
│ 🔧 System Health Monitor            │
│ ────────────────────────────────── │
│ EventBus:     ✅ 12 events active  │
│ GameState:    ✅ Save OK (2s ago)   │
│ Tutorial:     ✅ Step 2/2 complete  │
│ Village:      ✅ 3 buildings        │
│ Achievements: ✅ 2/10 unlocked      │
└─────────────────────────────────────┘
```

### Error Recovery Interface
```
┌─────────────────────────────────────┐
│ ⚠️ Error Recovery                   │
│ ────────────────────────────────── │
│ Issue: Tutorial state corrupted     │
│ Actions:                            │
│ [Reset Tutorial] [Reload Game]      │
│ [Export Save] [Load Backup]         │
└─────────────────────────────────────┘
```

This visual documentation ensures that every system's purpose and appearance is clearly understood, making debugging and development much more manageable.

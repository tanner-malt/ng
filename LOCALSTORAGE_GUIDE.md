# localStorage Save/Load System Guide

## Overview
Your Idle Dynasty Builder game now has a robust localStorage save/load system that automatically preserves player progress across browser sessions.

## What Gets Saved
The game saves the following data to localStorage:

### Core Game State
- **Resources**: `food`, `wood`, `stone`, `metal`, `gold`
- **Population**: Current population count
- **Time Progression**: Current day, season, and season index
- **Buildings**: All placed buildings with their positions and levels
- **Army**: Military units and their stats
- **Investments**: Monarch/prestige investments
- **Game Settings**: Automation level, merge items, active bonuses

### Storage Details
- **Storage Key**: `'idleDynastyBuilder'`
- **Format**: JSON string
- **Location**: Browser's localStorage (persists across sessions)
- **Size Limit**: ~5MB (more than sufficient for game data)

## How It Works

### Automatic Saving
The game automatically saves in the following situations:

1. **Resource Changes**: When resources are generated, spent, or modified
2. **Building Actions**: When buildings are placed or upgraded
3. **Time Progression**: When day/season advances
4. **Periodic Autosave**: Every 30 seconds
5. **Before Page Unload**: When browser tab is closed/refreshed

### Automatic Loading
- Game automatically loads save data when the page loads
- Falls back to default starting values if no save exists
- Validates save data integrity before loading

### Manual Save/Load
Players can also:
- Export their save data via the Settings menu
- Import save data to restore progress
- Clear save data to restart the game

## Technical Implementation

### Save Process
```javascript
// Triggered by resource updates, building actions, etc.
if (window.eventBus) {
    window.eventBus.emit('resources-updated');
}

// Event handler automatically saves
gameState.save();
```

### Load Process
```javascript
// On game initialization
const loadedSuccessfully = gameState.load();
```

### Event-Driven Updates
The system uses an event bus to ensure UI updates and saves are synchronized:
- `resources-updated` → Updates UI → Triggers save
- `building_placed` → Updates state → Triggers save
- `day_ended` → Updates time → Triggers save

## Data Validation
The system includes robust validation to prevent corruption:
- Checks data structure and types
- Validates required fields
- Handles missing optional fields gracefully
- Falls back to defaults if validation fails

## Benefits
1. **Persistent Progress**: Player progress is preserved across browser sessions
2. **Real-time Saving**: No risk of losing recent progress
3. **Reliable**: Includes validation and error handling
4. **Performance**: Efficient JSON serialization with reasonable frequency
5. **User-Friendly**: Transparent to the player - just works!

## Testing the System

1. Start the game and play for a few minutes
2. Build some buildings, generate some resources
3. Refresh the page - your progress should be preserved
4. Check browser's Developer Tools → Application → Local Storage to see the saved data

## Troubleshooting

If save/load isn't working:
1. Check browser console for any JavaScript errors
2. Verify localStorage is enabled in your browser
3. Check if you're in private/incognito mode (localStorage may be limited)
4. Try clearing localStorage and starting fresh

The system is designed to be robust and should handle most edge cases automatically.

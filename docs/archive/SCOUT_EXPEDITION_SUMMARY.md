# Scout Expedition System - Implementation Summary

## Overview
Implemented a comprehensive scout expedition system with dynamic distance-based travel mechanics and persistent scouting capabilities.

## Key Features Implemented

### 1. Scout Trips Listed in Expeditions Viewer
- **Location**: World View → Expeditions Tab
- **Display**: Scout expeditions now appear alongside army expeditions
- **Visual Distinction**: 
  - Army expeditions: Red border, ⚔️ Army Expeditions header
  - Scout expeditions: Blue border, 🔍 Scout Expeditions header
  - Stationed scouts: Orange border when stationed at destination
  - Returning scouts: Blue progress bar during return journey

### 2. Dynamic Distance-Based Travel System
**Travel Time**: Each hex traveled = 1 day
- **Outbound Journey**: Calculated by Manhattan distance from village to target
- **Stationed Phase**: Scouts remain at destination indefinitely until ordered home
- **Return Journey**: Same distance calculation from current position back to village

### 3. Persistent Scout Positioning
- **Manual Return**: Scouts must be actively ordered to return home
- **Control Methods**: 
  - Click "Order Return Home" button in expeditions list
  - Select stationed scouts on the map tile and order return
- **Visual Indicators**: Scouts shown with 👁️ icon on map tiles when stationed

### 4. Enhanced Progress Tracking
- **Travel Progress**: Shows days remaining for travel to destination
- **Stationed Status**: Indicates scouts are gathering intelligence at location
- **Return Progress**: Tracks return journey with separate progress calculation
- **Real-time Updates**: Status updates automatically each day

### 5. Scout Management
### 5. Scout Management
- **Selection modal**: Choose up to 3 villagers for expeditions
- **Status tracking**: Scouts marked as 'scouting' during expeditions
- **Map visualization**: Stationed scouts visible on map with 👁️ indicator
- **Hex info panel**: Shows scout details when selecting tiles with stationed scouts
- **Flexible control**: Order return from expedition list or map tile

## Code Changes

### WorldManager.js Updates
1. **Dynamic Travel Calculation**:
   - Distance calculated using Manhattan distance formula
   - Travel time = distance in hexes (1 day per hex)
   - Separate tracking for outbound and return journeys

2. **Enhanced expedition tracking**:
   - New expedition properties: `travelDistance`, `daysRemaining`, `isStationed`, `returningHome`
   - Multi-phase status system: traveling → stationed → returning → complete
   - Proper status management throughout expedition lifecycle

3. **Persistent Scout Positioning**:
   - Scouts remain at destination until explicitly ordered home
   - New `orderScoutsHome()` method for manual return commands
   - Updated `updateExpeditions()` for dynamic progress tracking

4. **Map Integration**:
   - Scout indicators (👁️) shown on map tiles when stationed
   - Hex info panel displays scout information and control buttons
   - Visual distinction between armies (⚔️) and scouts (👁️)

### CSS Enhancements
Added styling in `game.css`:
- `.army-expedition`: Red border for army expeditions
- `.scout-expedition`: Blue border for scout expeditions  
- `.scout-expedition.stationed`: Orange border for stationed scouts
- Enhanced progress bars with dynamic coloring based on status

## User Experience Flow

1. **Select Target**: Click any hex on the world map
2. **Choose Scouts**: Click "Explore Further" → Select up to 3 villagers
3. **Monitor Travel**: Watch scouts travel to destination (distance-based timing)
4. **Stationed Phase**: Scouts arrive and begin gathering intelligence indefinitely
5. **Manual Return**: Click "Order Return Home" when desired
6. **Return Journey**: Track return progress back to village
7. **Scout Return**: Scouts become available for new missions

## Integration Points

- **Daily Progression**: Updates called from `gameState.js` daily progression
- **Population Management**: Integrates with population status system
- **Fog of War**: Automatic map revelation when scouts arrive at destination
- **Achievement System**: Triggers exploration achievements
- **Distance Calculation**: Manhattan distance formula for realistic travel times

## Technical Details

- **Distance Formula**: `Math.abs(targetRow - villageRow) + Math.abs(targetCol - villageCol)`
- **Status Transitions**: traveling → stationed → returning → complete
- **Progress Calculation**: Travel progress based on days elapsed vs distance
- **UI Updates**: Automatic refresh on daily progression, status changes, and manual commands
- **Scout Indicators**: Visual markers on map tiles and detailed info panels

This implementation provides a realistic scout expedition system with flexible timing, persistent positioning, and intuitive control mechanisms that give players full control over their scouting operations.

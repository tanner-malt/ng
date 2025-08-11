## Recent Updates

### Season System Refactoring (December 2024)
**Issue**: Conflicting season progression systems causing crashes and unintended behavior
**Root Cause**: Two separate season systems running simultaneously:
1. Day-based seasons (endDay method) - correct behavior
2. Timer-based seasons (update method) - causing unintended progression

**Fixes Applied**:
- ✅ Removed timer-based season progression from `update()` method
- ✅ Fixed `seasonIcons` undefined error by moving to class property
- ✅ Standardized season names to use "Autumn" consistently
- ✅ Ensured `currentSeasonIndex` updates properly with season changes
- ✅ Seasons now only advance when days actually progress (30 days = 1 season)

**Files Modified**:
- `src/gameState.js`: Removed `seasonTimer`, fixed `updateSeason()`, added `this.seasonIcons`

# Scout Integration with Expedition View

## Feature Request Summary
**Date**: December 2024  
**Priority**: Medium  
**Status**: Pending Implementation  

### Overview
The scouts role are a team of up to three villagers, 

## Current Scout System Analysis

### Scout Progress Display (Village View)
- **Location**: Village view scout report bar
- **Cycle**: 7-day exploration cycles
- **Progress Indicators**:
  - Day counter: "Day X of 7"
  - Progress bar with visual fill
  - Status messages based on cycle day
  - Scout return reports with discoveries

### Scout Implementation Details
**File**: `src/gameState.js`
- **Method**: `updateScoutProgress()` - Updates UI elements
- **Method**: `showScoutReport()` - Generates discovery reports
- **Method**: `generateExplorationDiscoveries()` - Creates exploration results

### Scout UI Elements
```html
<!-- Scout Exploration Bar (game.html) -->
<div class="scout-report-bar">
    <div class="scout-info">
        <span class="day-counter">Day <span id="current-day">1</span></span>
        <div class="scout-progress-container">
            <span class="scout-status" id="scout-status">Scouts preparing...</span>
            <div class="scout-progress-bar">
                <div class="scout-progress-fill" id="scout-progress-fill"></div>
                <span class="scout-progress-text" id="scout-progress-text">Day 1 of 7</span>
            </div>
        </div>
    </div>
</div>
```

## Current Expedition System Analysis

### Expedition/Quest Modal
- **File**: `src/modalSystem.js`
- **Method**: `showQuestMenu()` - Main expedition interface
- **Method**: `generateQuestMenuContent()` - Creates expedition content
- **Features**:
  - Available expedition locations
  - Active expedition progress tracking
  - Army status during expeditions
  - Travel events and actions

### Quest Manager Structure
- **File**: `src/quest.js`
- **Class**: `QuestManager`
- **Features**:
  - Oregon Trail-style expedition system
  - Multi-day travel mechanics
  - Battle system integration
  - Supply management

## Integration Requirements

### 1. Scout Information Display in Expedition View

#### Current Scout Status Section
Add a dedicated scout section to the expedition modal showing:
```html
<div class="scout-section">
    <h4>🔭 Scout Operations</h4>
    <div class="scout-current-status">
        <div class="scout-cycle-info">
            <span>Current Cycle: Day ${dayInCycle} of 7</span>
            <div class="scout-progress-bar-expedition">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="scout-activity">
            <span class="scout-status-text">${currentActivity}</span>
        </div>
    </div>
</div>
```

#### Scout Activity Details
Display current scout activities:
- **Days 1-2**: "Preparing equipment and planning routes"
- **Days 3-5**: "Exploring unmapped territories" 
- **Day 6**: "Documenting discoveries and mapping"
- **Day 7**: "Returning with exploration data"

### 2. Scout Discovery History

#### Recent Discoveries Panel
```html
<div class="scout-discoveries">
    <h5>Recent Scout Discoveries</h5>
    <div class="discoveries-list">
        <!-- Last 5 scout reports -->
        <div class="discovery-item">
            <span class="discovery-date">Day ${dayDiscovered}</span>
            <span class="discovery-text">${discoveryDescription}</span>
        </div>
    </div>
</div>
```

#### Discovery Types to Track
- New territories mapped
- Resource deposits found
- Landmarks discovered
- Trading opportunities
- Danger warnings

### 3. Scout Management Actions

#### Scout Action Buttons
Add interactive scout management:
```html
<div class="scout-actions">
    <button class="scout-action-btn" id="focus-exploration">
        🗺️ Focus on Territory Mapping
    </button>
    <button class="scout-action-btn" id="search-resources">
        ⛏️ Search for Resource Deposits
    </button>
    <button class="scout-action-btn" id="establish-routes">
        🛤️ Establish Trade Routes
    </button>
</div>
```

#### Scout Directives System
Implement scout focus areas:
- **Territory Mapping**: +50% chance for new territories
- **Resource Search**: +75% chance for resource discoveries
- **Trade Routes**: +100% chance for trading opportunities
- **Safety Surveys**: Reduced danger warnings, safer expeditions

### 4. Scout-Expedition Integration

#### Expedition Planning Enhancement
Use scout data to improve expedition planning:
```javascript
// Enhanced expedition location data
{
    id: 'goblin_outpost',
    name: 'Goblin Outpost',
    scoutIntel: {
        discovered: true,
        lastScouted: 15, // days ago
        knownDangers: ['goblin patrols', 'difficult terrain'],
        recommendedApproach: 'northern path',
        estimatedTravelTime: '2 days (verified by scouts)'
    }
}
```

#### Scout-Verified Routes
Show scout-discovered information:
- Safer travel routes (reduced random events)
- Accurate travel time estimates
- Known hazards and how to avoid them
- Alternative approaches to targets

### 5. Implementation Plan

#### Phase 1: Basic Integration
1. **Move scout progress display** from village to expedition modal
2. **Create scout status component** for expedition view
3. **Add discovery history tracking** system
4. **Integrate with existing scout cycle** in gameState.js

#### Phase 2: Enhanced Features  
1. **Implement scout directives** system
2. **Add scout-expedition data** sharing
3. **Create enhanced expedition** planning with scout intel
4. **Add scout action buttons** and effects

#### Phase 3: Advanced Integration
1. **Scout specialization** system (mapping, combat recon, trade)
2. **Multiple scout teams** operating simultaneously  
3. **Scout equipment** and upgrades
4. **Integration with world map** for visual scout coverage

## Implementation Details

### Required File Modifications

#### 1. modalSystem.js - Expedition Modal Enhancement
```javascript
generateQuestMenuContent(questManager) {
    // Add scout section to existing content
    const scoutSection = this.generateScoutSection();
    
    if (!questManager.currentExpedition) {
        return `
            ${scoutSection}
            <div class="section-divider"></div>
            ${expeditionsHTML}
        `;
    } else {
        return `
            ${scoutSection}
            <div class="section-divider"></div>
            ${activeExpeditionHTML}
        `;
    }
}

generateScoutSection() {
    const gameState = window.gameState;
    const period = 7;
    const dayInCycle = ((gameState.currentDay - 1) % period) + 1;
    const progress = (dayInCycle / period) * 100;
    
    // Get scout status and recent discoveries
    const scoutStatus = this.getScoutStatus(dayInCycle);
    const recentDiscoveries = this.getRecentScoutDiscoveries();
    
    return `
        <div class="scout-section">
            <h4>🔭 Scout Operations</h4>
            <!-- Scout status and progress content -->
        </div>
    `;
}
```

#### 2. gameState.js - Scout Data Enhancement
```javascript
// Add to GameState constructor
this.scoutDiscoveryHistory = [];
this.scoutDirective = 'balanced'; // balanced, mapping, resources, trade, safety

// Enhance generateExplorationDiscoveries
generateExplorationDiscoveries() {
    const discoveries = {
        // ... existing properties
        timestamp: this.currentDay,
        directive: this.scoutDirective
    };
    
    // Apply directive bonuses
    this.applyScoutDirectiveBonus(discoveries);
    
    // Save to history
    this.scoutDiscoveryHistory.push(discoveries);
    if (this.scoutDiscoveryHistory.length > 20) {
        this.scoutDiscoveryHistory.shift(); // Keep last 20
    }
    
    return discoveries;
}

setScoutDirective(directive) {
    this.scoutDirective = directive;
    // Show feedback about new directive
    const messages = {
        mapping: 'Scouts will focus on mapping new territories',
        resources: 'Scouts will search for valuable resource deposits',
        trade: 'Scouts will seek trading opportunities',
        safety: 'Scouts will survey areas for expedition safety'
    };
    
    if (window.showToast) {
        window.showToast(`🔭 ${messages[directive]}`, { 
            icon: '📋', 
            type: 'info', 
            timeout: 3000 
        });
    }
}
```

#### 3. CSS Styling Requirements
```css
/* Scout section in expedition modal */
.scout-section {
    background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%);
    border: 2px solid #4a5568;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
}

.scout-cycle-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.scout-progress-bar-expedition {
    flex: 1;
    height: 8px;
    background: #1a202c;
    border-radius: 4px;
    margin-left: 12px;
    overflow: hidden;
}

.scout-progress-bar-expedition .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #38b2ac 0%, #319795 100%);
    transition: width 0.3s ease;
}

.scout-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin-top: 12px;
}

.scout-action-btn {
    background: linear-gradient(145deg, #4a5568 0%, #2d3748 100%);
    color: #e2e8f0;
    border: 1px solid #4a5568;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
}

.scout-action-btn:hover {
    background: linear-gradient(145deg, #38b2ac 0%, #319795 100%);
    border-color: #38b2ac;
    transform: translateY(-1px);
}

.scout-action-btn.active {
    background: linear-gradient(145deg, #e53e3e 0%, #c53030 100%);
    border-color: #e53e3e;
}

.discoveries-list {
    max-height: 120px;
    overflow-y: auto;
    padding: 8px;
    background: #1a202c;
    border-radius: 4px;
}

.discovery-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px solid #2d3748;
    font-size: 0.85em;
}

.discovery-item:last-child {
    border-bottom: none;
}

.discovery-date {
    color: #a0aec0;
    min-width: 60px;
}

.discovery-text {
    color: #e2e8f0;
    flex: 1;
}
```

## Testing Strategy

### Unit Tests
1. **Scout progress calculation** accuracy
2. **Discovery generation** with directives
3. **History tracking** functionality
4. **Modal content generation** with scout data

### Integration Tests  
1. **Scout-expedition data** sharing
2. **UI update synchronization** between systems
3. **Modal interaction** with scout actions
4. **Game state persistence** of scout data

### User Experience Tests
1. **Information accessibility** in expedition view
2. **Scout action feedback** clarity
3. **Progress tracking** intuitiveness  
4. **Performance impact** of additional UI elements

## Future Enhancements

### Advanced Scout Features
1. **Multiple Scout Teams**: Deploy different teams for different purposes
2. **Scout Specialization**: Scouts with specific skills (mapping, combat recon, trade)
3. **Scout Equipment**: Tools and supplies to improve scout effectiveness
4. **Scout Casualties**: Risk/reward for dangerous scouting missions

### World Map Integration
1. **Visual Scout Coverage**: Show scouted areas on world map
2. **Scout Routes**: Display paths taken by scout teams
3. **Discovery Markers**: Mark discoveries on world map
4. **Real-time Updates**: Live scout positions during expeditions

### Intelligence System
1. **Enemy Movement**: Scouts report on hostile activities
2. **Weather Patterns**: Scouts provide weather forecasts for expeditions
3. **Trade Intelligence**: Market prices and trade route conditions
4. **Resource Monitoring**: Track resource node depletion/regeneration

## Conclusion

Integrating scouts into the expedition view will create a more cohesive exploration experience by:
- **Centralizing exploration information** in one interface
- **Providing actionable scout intelligence** for expedition planning
- **Creating meaningful choices** through scout directive system
- **Enhancing immersion** through connected game systems

This integration maintains the existing 7-day scout cycle while adding depth through expedition planning synergy and player agency in scout management.

# Dynasty Builder Tutorial System

## Tutorial Flow Overview

### Step 1: Dynasty Name
- **Title**: "The Royal Bloodline"
- **Purpose**: Establish player's dynasty name
- **UI**: Text input field with validation
- **Success**: Dynasty name saved to localStorage
- **Next**: Proceed to intro story

### Step 2: Royal Mission Intro
- **Title**: "The King's Command"
- **Purpose**: Set the story context and mission
- **Content**: King assigns player to establish frontier settlement
- **UI**: Story modal with continue button
- **Next**: Building tutorial

### Step 3: Building Tutorial
- **Title**: "The Art of Construction"
- **Purpose**: Teach building mechanics
- **Content**: How to select, place, and construct buildings
- **UI**: Instructional modal
- **Next**: Town Center construction

### Step 4: Town Center Construction
- **Title**: "Establishing Your Settlement"
- **Purpose**: First building placement
- **Content**: Build Town Center as foundation
- **Action Required**: Player must place Town Center
- **Success Condition**: Town Center placed and under construction
- **Highlight**: Town Center button
- **Next**: Housing tutorial

### Step 5: Housing Tutorial
- **Title**: "Calling the First Citizens"
- **Purpose**: Explain population and housing
- **Content**: Build houses to accommodate citizens
- **Action Required**: Player must place House
- **Success Condition**: House placed and under construction
- **Highlight**: House button
- **Next**: Food production

### Step 6: Food Production
- **Title**: "Feeding Your People"
- **Purpose**: Introduce resource management
- **Content**: Build farm for food production
- **Action Required**: Player must place Farm
- **Success Condition**: Farm placed and under construction
- **Highlight**: Farm button
- **Next**: Time management

### Step 7: Time Management
- **Title**: "The Passage of Time"
- **Purpose**: Teach day advancement and construction time
- **Content**: Explain how buildings take time to construct
- **Action Required**: Wait or advance days for construction
- **Success Condition**: At least one building completes construction
- **Highlight**: End Day button
- **Next**: Defense tutorial

### Step 8: Defense Preparation
- **Title**: "Preparing for Battle"
- **Purpose**: Introduce military buildings
- **Content**: Build barracks for defense
- **Action Required**: Player must place Barracks
- **Success Condition**: Barracks placement begins
- **Highlight**: Barracks button
- **Next**: Tutorial completion

### Step 9: Tutorial Completion
- **Title**: "Dynasty Established"
- **Purpose**: Celebrate completion and unlock features
- **Content**: Summary of achievements and next steps
- **Rewards**: Unlock Battle mode, additional resources
- **Next**: Free play begins

## Tutorial States

### Active Conditions
- No save data exists (new player)
- Dynasty name not set
- Key buildings not constructed

### Completion Conditions
- Dynasty name established
- Town Center built
- Basic infrastructure (House, Farm) built
- At least one construction cycle completed
- Barracks placed

### Skip Conditions
- Save data exists with progress
- Tutorial completion flag set
- Player manually skips (if implemented)

## Building Requirements & Costs

### Town Center
- **Cost**: 100 Gold, 50 Wood, 30 Stone
- **Construction Time**: 3 days
- **Purpose**: Settlement foundation, boosts other buildings

### House
- **Cost**: 50 Gold, 25 Wood
- **Construction Time**: 2 days
- **Purpose**: Population +5

### Farm
- **Cost**: 75 Gold, 40 Wood
- **Construction Time**: 2 days
- **Purpose**: Food production

### Barracks
- **Cost**: 150 Gold, 75 Wood, 50 Stone
- **Construction Time**: 4 days
- **Purpose**: Military training, unlocks Battle mode

## UI Highlight System

### Highlight Classes
- `.tutorial-highlight`: Main highlight effect
- `.tutorial-pointer`: Animated pointing indicator
- `.tutorial-overlay`: Background overlay for focus

### Highlight Targets
- Building buttons: `.build-btn[data-building="buildingType"]`
- Day controls: `#end-day-btn`, `#auto-play-btn`
- Navigation: `.nav-btn[data-view="viewName"]`

## Tutorial Progress Tracking

### localStorage Keys
- `dynastyName`: Player's chosen dynasty name
- `tutorialComplete`: Boolean completion flag
- `tutorialStep`: Current step identifier
- `completedSteps`: Array of completed step IDs

### Event System Integration
- `tutorialStepComplete`: Fired when step completes
- `buildingPlaced`: Triggers tutorial progression checks
- `buildingCompleted`: Updates tutorial state
- `dayAdvanced`: Checks time-based tutorial conditions

## Error Handling

### Common Issues
1. **Modal not showing**: Check if simpleModal is loaded
2. **Highlights not appearing**: Verify element selectors exist
3. **Steps not progressing**: Check success conditions
4. **Dynasty name not saving**: Verify localStorage access

### Recovery Actions
- Reset tutorial progress
- Skip problematic steps
- Restore from checkpoint
- Clear corrupted tutorial data

## Implementation Notes

### Modal Integration
- Uses `window.simpleModal.show()` for all dialogs
- Supports HTML content with styling
- Handles user input validation
- Manages modal lifecycle

### Event Bus Integration
- Listens for game events to trigger progression
- Emits tutorial events for other systems
- Handles cross-system communication

### Responsive Design
- Tutorial works on different screen sizes
- Highlights adapt to element positions
- Mobile-friendly touch interactions

## Testing Checklist

- [ ] Dynasty name input and validation
- [ ] Each tutorial step displays correctly
- [ ] Building placement triggers progression
- [ ] Highlights appear on correct elements
- [ ] Time controls work properly
- [ ] Tutorial completes and unlocks features
- [ ] Skip/reset functionality works
- [ ] Mobile compatibility
- [ ] Error recovery works
- [ ] Performance is acceptable

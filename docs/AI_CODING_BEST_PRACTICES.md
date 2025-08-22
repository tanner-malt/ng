# 🤖 AI Coding Assistant Best Practices

## VS Code Copilot Configuration

### Current Setup
- **Inline suggestions**: Enabled with toolbar on hover
- **Auto-completions**: Enabled for all supported languages
- **Temperature**: 0.1 (more deterministic, less creative)
- **Context length**: 500 tokens for better accuracy

### Best Practices for AI-Assisted Development

## 🎯 **Prompt Engineering for Copilot**

### 1. **Clear Function Documentation**
```javascript
/**
 * Calculate population capacity based on buildings
 * @param {Array} buildings - Array of building objects with type and level
 * @returns {number} Total population capacity (0 if no buildings)
 * 
 * Design: Base capacity is 0, only buildings provide capacity
 * - Houses: 6 capacity each (buildingProduction.house.populationCapacity)
 * - Town Centers: 3 capacity each (hardcoded in calculatePopulationCap)
 * - Tents: 4 capacity each (buildingProduction.tent.populationCapacity)
 * - Founder Wagons: 3 capacity each (buildingProduction.foundersWagon.populationCapacity)
 * 
 * CRITICAL: No Math.max() minimum - return actual total only
 */
function calculatePopulationCap(buildings) {
    // Implementation follows...
}
```

### 2. **Descriptive Variable Names**
```javascript
// ❌ Bad - unclear intent
const cap = buildings.filter(b => b.type === 'house').length * 5;

// ✅ Good - clear intent
const totalHouseCapacity = buildings
    .filter(building => building.type === 'house')
    .reduce((total, house) => {
        const houseCapacity = GameData.buildingProduction.house.populationCapacity || 6;
        return total + houseCapacity;
    }, 0);
```

### 3. **Context Comments**
```javascript
// Game Design: Population cap starts at 0, only buildings provide capacity
// This creates survival pressure requiring immediate shelter construction
// Starting state: 5 villagers, 0 capacity = immediate housing crisis
let populationCapacity = 0;

// Construction System: Work-point based building with builder assignment
// Builders accumulate work points daily until construction completes
// Save/load system preserves construction progress across sessions
const constructionSites = this.gameState.buildings.filter(b => b.level === 0);
```

## 🔧 **Code Quality Standards**

### 1. **File-Level Documentation**
```javascript
// ===== CONSTRUCTION MANAGER =====
// Handles work-point based building construction system
// 
// Key Features:
// - Builder assignment and work accumulation
// - Construction progress persistence across save/load
// - Integration with jobManager for builder availability
// - Completion triggers building level advancement
//
// Save/Load: Serializes construction sites, progress, and builder assignments
// Dependencies: gameState.buildings, jobManager, GameData.constructionPoints
```

### 2. **Function Contracts**
```javascript
/**
 * Initialize construction site for a building
 * MUST: Building must exist in gameState.buildings with level 0
 * MUST NOT: Create duplicate construction sites for same building
 * SHOULD: Validate required resources before starting construction
 * 
 * @param {Object} building - Building object from gameState.buildings
 * @returns {Object} Construction site with work requirements and progress
 */
initializeConstructionSite(building) {
    // Implementation validates building exists and level === 0
}
```

### 3. **Design Constraints**
```javascript
// CONSTRAINT: Base population cap = 0 (enforced in GameData.calculatePopulationCap)
// CONSTRAINT: Jobs only from buildings (enforced in jobManager.updateAvailableJobs)  
// CONSTRAINT: No auto-placed buildings (enforced in gameState.reset and app.js)
// CONSTRAINT: Starting population = 1 royal + 4 villagers (enforced in generateStartingDynastyPopulation)
// CONSTRAINT: Construction requires work points + builders (enforced in constructionManager)

// ANTI-PATTERN: Never use Math.max() to create minimum population caps
// ANTI-PATTERN: Never call setupInitialTown() automatically  
// ANTI-PATTERN: Never assign specialized roles without corresponding buildings
```

## 📋 **Project-Specific Rules**

### Game Design Principles
1. **Survival Challenge**: Players start with 5 villagers, 0 housing capacity
2. **Building-Driven Gameplay**: Jobs, capacity, and progression through construction  
3. **Resource Pressure**: Immediate need for shelter creates strategic tension
4. **Earned Progression**: No automatic benefits, everything built manually
5. **Work-Point Construction**: Buildings require time and builder assignment
6. **Save/Load Persistence**: Construction progress preserved across sessions

### Code Review Checklist
- [ ] Does this maintain the 0-base population cap? (Check GameData.calculatePopulationCap)
- [ ] Are jobs tied to actual buildings? (Check buildingProduction.jobs)
- [ ] No automatic building placement? (Check setupInitial parameters)
- [ ] Follows existing naming conventions? (camelCase, descriptive names)
- [ ] Includes appropriate error handling? (try/catch, validation)
- [ ] Construction system integration? (Check constructionManager calls)
- [ ] Effects system compatibility? (Check effectsManager integration)

## 🚀 **Copilot Optimization Tips**

### 1. **Context Priming**
Start files with clear context:
```javascript
// Game: Idle Dynasty Builder - Medieval city building simulation
// Module: Construction Manager - Work-point based building system  
// Purpose: Handle construction sites, builder assignment, progress tracking
// Dependencies: GameData.constructionPoints, jobManager, gameState.buildings
// Save/Load: Serializes construction progress and builder assignments
```

### 2. **Pattern Examples**
Show Copilot the patterns you want:
```javascript
// Pattern: Always validate before modifying game state
if (!this.gameState || !Array.isArray(this.gameState.buildings)) {
    console.error('[ConstructionManager] Invalid game state');
    return false;
}

// Pattern: Construction system integration
const building = this.gameState.buildings.find(b => b.id === buildingId);
if (!building || building.level > 0) {
    console.error('[ConstructionManager] Building not found or already built');
    return false;
}

// Pattern: Effects system integration for haste runes
const hasteMultiplier = this.gameState.effectsManager?.getConstructionSpeedMultiplier() || 1.0;
const adjustedProgress = baseProgress * hasteMultiplier;
```

### 3. **Anti-Patterns**
Document what NOT to do:
```javascript
// ANTI-PATTERN: Never assume default values or create minimums
// Bad: const cap = buildings.length || 5;
// Bad: return Math.max(totalCap, 1);
// Good: return totalCap; // Return actual calculated value

// ANTI-PATTERN: Never auto-place buildings for "convenience"
// Bad: this.setupInitialTown(); // Automatically places tent
// Bad: if (isFirstTime) this.placeTent(); 
// Good: Let players place all buildings manually

// ANTI-PATTERN: Never assign jobs without corresponding buildings  
// Bad: villager.role = 'builder'; // No builder building exists
// Bad: const roles = ['farmer', 'gatherer', 'crafter']; // Pre-assigned
// Good: villager.role = 'villager'; // Jobs come from buildings
```

## 🛠️ **Development Workflow**

### 1. **Before Coding**
1. Read existing documentation
2. Check similar implementations
3. Understand game design constraints
4. Write function signature with docs first

### 2. **During Coding**
1. Use descriptive comments for complex logic
2. Validate inputs and state
3. Follow established patterns
4. Test edge cases

### 3. **After Coding**
1. Verify against design principles
2. Test with actual game scenarios
3. Update documentation if needed
4. Check for unintended side effects

## 📖 **Documentation Standards**

### Function Documentation Template
```javascript
/**
 * Brief description of what the function does
 * 
 * @param {type} paramName - Description of parameter
 * @returns {type} Description of return value
 * 
 * Design Notes:
 * - Why this approach was chosen
 * - Any constraints or assumptions
 * - Side effects or state changes
 * 
 * Example:
 * const result = functionName(exampleInput);
 * // Expected: specific output
 */
```

### Module Documentation Template
```javascript
// ===== MODULE NAME =====
// Purpose: High-level description
// 
// Responsibilities:
// - Primary responsibility
// - Secondary responsibility
// 
// Dependencies:
// - Other modules this depends on
// - External libraries used
// 
// Design Patterns:
// - Patterns used (Observer, Factory, etc.)
// - Why these patterns were chosen
```

## 🎮 **Game-Specific Guidelines**

### Population System
- Population cap MUST start at 0 (GameData.calculatePopulationCap returns totalCap, no minimum)
- Jobs MUST come from buildings (buildingProduction defines available jobs)
- No pre-assigned specialist roles (generateStartingDynastyPopulation creates basic villagers)
- Starting population: 1 royal + 4 villagers = 5 total

### Construction System  
- Work-point based construction (GameData.constructionPoints defines requirements)
- Builders assigned to construction sites accumulate progress daily
- Save/load preserves construction progress (constructionManager serialize/deserialize)
- Haste runes provide construction speed multipliers (effectsManager integration)

### Building System
- No automatic placement (setupInitial=false in all ensureTileManager calls)
- All buildings require resources (GameData.buildingCosts)
- Construction uses work-point system with builder assignment
- Inventory provides building items for manual placement

### Resource System
- No infinite resources (GameData.startingResources defines initial amounts)
- Seasonal variations affect production (GameData.seasonMultipliers)
- Storage capacity tied to buildings (GameData.calculateSeasonalStorageCap)

### Effects System
- Haste runes provide village-wide building efficiency boosts
- Effects persist for specified durations and stack appropriately
- Integration with construction speed and daily production cycles
- Modal interface for viewing active effects and their remaining time

---

**Remember**: The goal is to make Copilot an effective coding partner while maintaining code quality and game design integrity.

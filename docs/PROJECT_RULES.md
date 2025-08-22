# 🎮 Project Rules & Design Constraints

## 🎯 Core Game Design Principles

### 1. **Survival Challenge Philosophy**
- Players must EARN everything through gameplay
- No free resources or automatic benefits
- Strategic decisions have meaningful consequences
- Resource scarcity drives engagement

### 2. **Building-Driven Progression**
- ALL functionality comes from buildings
- Jobs only exist when buildings provide them
- Population capacity only from constructed buildings
- No pre-existing infrastructure

### 3. **Zero-Base Starting State**
```
Starting Conditions (ENFORCED):
- Population: 1 royal + 4 basic villagers (generateStartingDynastyPopulation)
- Buildings: 0 (gameState.buildings = [])
- Population Capacity: 0 (GameData.calculatePopulationCap returns totalCap, no Math.max)
- Jobs: None (buildingProduction.jobs only available when buildings exist)
- Auto-placement: FORBIDDEN (setupInitial=false in all calls)
- Starting Resources: GameData.startingResources (minimal survival amounts)
- Inventory: 5 tents, 2 haste runes, 1 founders wagon (tileManager initialization)
```

## 🚫 **Absolute Prohibitions**

### Code-Level Constraints
1. **NO automatic building placement**
   - No tent spawning on initialization (setupInitial=false in gameState.reset)
   - No "helpful" starting buildings (setupInitial=false in app.js)
   - Players must place everything manually (tileManager.placeTentFromInventory)

2. **NO population cap minimums**
   - Base capacity is 0, not 1 or 5 (GameData.calculatePopulationCap)
   - Only buildings provide capacity (houses=6, tents=4, townCenters=3)
   - `Math.max(cap, 1)` is FORBIDDEN (removed from calculatePopulationCap)

3. **NO pre-assigned job roles**
   - Villagers start as basic "villager" role (populationManager.generateStartingDynastyPopulation)
   - Jobs come from constructing buildings (buildingProduction.jobs definitions)
   - No builders, farmers, etc. at start (removed from starting population generation)

4. **NO magic numbers or hardcoded benefits**
   - All values must be justified by game mechanics (GameData contains all constants)
   - No hidden bonuses or fallback benefits (removed fallback Math.max from gameState)
   - Construction requires actual work points and builder assignment

## ✅ **Required Patterns**

### 1. **State Validation**
```javascript
// REQUIRED: Always validate before modifying
if (!this.gameState || !Array.isArray(this.gameState.buildings)) {
    console.error('[Module] Invalid game state');
    return false;
}
```

### 2. **Building-Job Relationship**
```javascript
// REQUIRED: Jobs must come from buildings
const building = this.gameState.buildings.find(b => b.id === buildingId && b.level > 0);
if (!building) {
    console.error('[JobManager] No completed building found for job assignment');
    return false;
}

const availableJobs = GameData.buildingProduction[building.type]?.jobs || {};
const jobCount = availableJobs[jobType] || 0;
```

### 3. **Zero-Base Calculations**
```javascript
// REQUIRED: Start calculations from 0
let totalCapacity = 0; // Not 1, not 5, ZERO
buildings.forEach(building => {
    if (building.level > 0) { // Only count completed buildings
        const buildingData = GameData.buildingProduction[building.type];
        if (buildingData?.populationCapacity) {
            totalCapacity += buildingData.populationCapacity;
        }
    }
});
return totalCapacity; // Return actual total, no minimums
```

### 4. **Construction System Integration**
```javascript
// REQUIRED: Work-point based construction with builder assignment
const constructionSite = this.constructionManager.initializeConstructionSite(building);
const assignedBuilders = this.jobManager.getWorkersForBuilding(buildingId, 'builder');
const dailyProgress = assignedBuilders.length * BUILDER_WORK_POINTS_PER_DAY;
```

## 🔍 **Verification Requirements**

### Before Making Changes
1. **Read existing documentation**
2. **Check current code behavior**
3. **Verify against game design principles**
4. **Ask if uncertain about requirements**

### Code Review Checklist
- [ ] Maintains zero-base population cap? (Check GameData.calculatePopulationCap)
- [ ] No automatic building placement? (Check setupInitial parameters)
- [ ] Jobs tied to actual buildings? (Check buildingProduction.jobs)
- [ ] No hardcoded minimums or benefits? (No Math.max fallbacks)
- [ ] Follows established naming conventions? (camelCase, descriptive)
- [ ] Includes proper error handling? (try/catch, validation)
- [ ] Documentation updated if needed? (Comments and README files)
- [ ] Construction system integration? (Work points, builder assignment)
- [ ] Effects system compatibility? (Haste runes, efficiency bonuses)
- [ ] Save/load compatibility? (Serialize/deserialize methods)

## 📁 **File-Specific Rules**

### `gameData.js`
- Contains ALL game constants and calculations
- Population cap calculation MUST return actual building total (no Math.max)
- Building costs, production rates, construction points defined here
- Starting resources and inventory items specified
- Seasonal modifiers and progression systems

### `gameState.js`
- Controls game initialization and state management
- MUST NOT place buildings automatically (setupInitial=false)
- Population cap updates based solely on buildings
- Save/load system for all game managers
- Construction manager integration and persistence

### `populationManager.js`
- Starting population: 1 royal + 4 basic villagers (generateStartingDynastyPopulation)
- No pre-assigned specialized roles (all start as 'villager')
- Jobs assigned based on available buildings
- Skills and aging system integration

### `constructionManager.js`
- Work-point based construction system
- Builder assignment and daily progress accumulation
- Save/load construction progress persistence
- Integration with effects system (haste runes)

### `tileManager.js`
- NEVER call `setupInitialTown()` automatically
- Players place all buildings manually (placeTentFromInventory)
- Inventory provides building items, not automatic placements
- Grid management and building placement validation

### `effectsManager.js`
- Haste rune system providing construction and production bonuses
- Village-wide effects with duration tracking
- Modal interface for viewing active effects
- Integration with daily processing cycles

## 🛡️ **Error Prevention**

### Common Mistakes to Avoid
1. **Assumption-based coding**
   - Don't assume what players "need"
   - Don't add "helpful" features without explicit requirements
   - Always verify requirements in documentation

2. **Magic number additions**
   - Don't add minimum values without justification
   - Don't create fallback benefits
   - All numbers must have clear game design purpose

3. **Auto-convenience features**
   - Don't place buildings to "help" players
   - Don't assign jobs automatically
   - Let players make all decisions

## 🎯 **Success Metrics**

### New Game Start Should Show:
- **Population**: 5/0 (5 villagers, 0 capacity - immediate housing crisis)
- **Buildings**: Empty village grid (no automatic tent placement)
- **Jobs**: None available (no buildings built yet)
- **Inventory**: 5 tents, 2 haste runes, 1 founders wagon for manual placement
- **Resources**: Minimal starting amounts (GameData.startingResources)

### Player Experience Goals:
- Immediate resource pressure (need housing for 5 villagers)
- Strategic placement decisions (where to build first tent/house)
- Clear progression path (build → capacity → jobs → more building)
- Sense of accomplishment (earned everything through construction)
- Construction management (assign builders, track progress)
- Effects utilization (use haste runes strategically for faster building)

---

## 🤝 **AI Assistant Guidelines**

When working on this project:

1. **ALWAYS** check documentation first
2. **NEVER** make assumptions about game design
3. **ASK** for clarification if requirements are unclear
4. **VERIFY** changes maintain design principles
5. **DOCUMENT** any changes or additions made

**Remember**: The goal is creating a challenging survival experience where every building, every job, and every bit of capacity is earned through strategic gameplay decisions.

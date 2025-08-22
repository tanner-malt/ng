# Population Demographics Guide

## Age Groups & Life Stages

The population system uses realistic age demographics with clear life stages:

### Age Brackets
- **👶 Children**: 0-15 days old
  - Cannot work or contribute to production
  - Require food and housing 
  - Will become working age at day 16

- **💪 Working Age**: 16-190 days old  
  - Prime productive years
  - Can work all job types
  - Can reproduce (16-190 range)
  - Peak efficiency around 25-120 days

- **👴 Elderly**: 191+ days old
  - Reduced work capacity but provide wisdom bonuses
  - Cannot reproduce
  - Death probability increases after day 180

### Life Expectancy
- **Average Lifespan**: ~200 days
- **Death Probability**: Starts at day 180, increases exponentially
  - Day 180: 0.1% daily chance
  - Day 200: 2% daily chance  
  - Day 220: 50% daily chance (natural maximum)

### Birth Rate System
- **Eligible Couples**: Working age villagers (16-190 days)
- **Base Birth Rate**: 1/120 chance per couple per day (~0.83% daily)
- **Modifiers**:
  - +50% if food abundant (>500 food)
  - -50% if food scarce (<50 food)
  - 0% if villagers are sick or traveling
- **Twins**: 1% chance per birth

### Gender Distribution
- **Target**: 50/50 male/female split
- **Couples**: Minimum of male and female count determines reproduction capacity

## Population Health Indicators

### Warning Signs
- **Aging Population**: >70% elderly (191+ days)
- **Low Birth Rate**: No births in 30+ days with adequate food
- **High Death Rate**: >2 deaths per day consistently  
- **Gender Imbalance**: <30% of either gender

### Optimal Demographics
- **Children**: 15-25% of population
- **Working Age**: 60-75% of population  
- **Elderly**: 5-15% of population
- **Birth/Death Balance**: Net positive or stable growth

## Troubleshooting Population Issues

### No Births Occurring
1. Check working age population (need both male/female)
2. Verify food supply (>50 food minimum)
3. Ensure villagers aren't all sick/traveling
4. Check if daily processing is running properly

### No Deaths/Aging
1. Verify villagers have realistic ages (<250 days)
2. Check if `processAging()` is being called daily
3. Ensure age values are incrementing properly

### Population Stagnation  
1. Build more houses to increase population cap
2. Ensure adequate food production
3. Check for hidden population penalties
4. Verify job assignments aren't blocking growth

## Console Commands for Testing

```javascript
// Check population demographics
window.gameState.populationManager.getPopulationGroups()

// Force aging for testing
window.gameState.populationManager.processAging()

// Test birth calculations  
window.gameState.populationManager.calculateDailyGrowth({foodAbundant: true})

// View individual villager ages
window.gameState.populationManager.getAll().map(v => ({name: v.name, age: v.age}))

// Reset ages for testing
window.gameState.populationManager.getAll().forEach(v => v.age = Math.floor(Math.random() * 50) + 20)
```

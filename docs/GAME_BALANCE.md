# Game Balance Documentation

## 🧮 Resource Economy

### Base Resource Generation Rates

| Building | Level | Food | Wood | Stone | Gold | Population | Time to ROI |
|----------|-------|------|------|-------|------|------------|-------------|
| Town Center | 1 | +0 | +0 | +0 | +0 | +0 | N/A (logistics hub) |
| House | 1 | -1/day | +0 | +0 | +0 | +5 | 5 days |
| Farm | 1 | +8/day | -1/day | +0 | +0 | -1 | 4 days |
| Sawmill | 1 | -1/day | +8/day | +0 | +0 | -1 | 4 days |
| Quarry | 1 | -2/day | -1/day | +6/day | +0 | -2 | 6 days |
| Market | 1 | -2/day | -1/day | -1/day | +12/day | -3 | 7 days |
| Barracks | 1 | -5/day | -2/day | -1/day | -10/day | -5 | N/A (military) |

### Town Center Functions
```
┌─────────────────────────────────────────────────┐
│ 🏛️ Town Center - Strategic Command Hub          │
├─────────────────────────────────────────────────┤
│ • Supply Center: Coordinates resource flow      │
│ • Army Marshaling: Central rally point         │
│ • Logistics Hub: Manages expedition supplies   │
│ • Settlement Heart: Unlocks building options   │
│ • Command Authority: Required for military ops │
│ • Village Efficiency: +10% to all production   │
└─────────────────────────────────────────────────┘
```

### Building Costs & Upgrade Scaling

| Building | Level | Gold Cost | Wood Cost | Stone Cost | Build Time | Upgrade Multiplier |
|----------|-------|-----------|-----------|------------|------------|-------------------|
| Town Center | 1 | 0 | 0 | 0 | 0 days | N/A |
| Town Center | 2 | 500 | 200 | 100 | 3 days | 1.5x output |
| House | 1 | 50 | 25 | 0 | 1 day | N/A |
| House | 2 | 100 | 50 | 25 | 2 days | 1.8x capacity |
| Farm | 1 | 75 | 50 | 0 | 1 day | N/A |
| Farm | 2 | 150 | 100 | 25 | 2 days | 1.7x output |
| Sawmill | 1 | 75 | 25 | 25 | 1 day | N/A |
| Sawmill | 2 | 150 | 50 | 50 | 2 days | 1.7x output |
| Quarry | 1 | 100 | 50 | 25 | 2 days | N/A |
| Quarry | 2 | 200 | 100 | 50 | 3 days | 1.6x output |
| Market | 1 | 150 | 75 | 50 | 2 days | N/A |
| Market | 2 | 300 | 150 | 100 | 3 days | 1.5x output |
| Barracks | 1 | 200 | 100 | 75 | 3 days | N/A |
| Barracks | 2 | 400 | 200 | 150 | 4 days | 1.5x training |


## ⚖️ Economy Formulas

### Resource Generation Formula
```
DailyResourceOutput = BaseOutput × (1 + (BuildingLevel × 0.5)) × (1 + (TownCenterBonus × 0.1))
```

### Building Time Formula
```
BuildingTime(days) = BaseBuildTime × (1 + (BuildingLevel × 0.3)) × (1 - (ConstructionTech × 0.05))
```

### Population Growth Formula
```
PopulationGrowth = BaseGrowthRate × (HouseCapacity - CurrentPopulation) / HouseCapacity
```

## 🗡️ Combat Balance

### Unit Statistics

| Unit | Cost | Attack | Defense | Health | Training Time | Upkeep |
|------|------|--------|---------|--------|---------------|--------|
| Militia | 5 food, 5 wood | 5 | 3 | 10 | 1 day | 1 food/day |
| Archer | 5 food, 15 wood | 8 | 2 | 8 | 1 day | 1 food/day |
| Spear | 5 food, 15 wood, 1 metal | 8 | 2 | 8 | 1 day | 1 food/day |
| Cavalry | 25 food, 10 wood, 1 metal | 12 | 6 | 15 | 10 days | 2 food/day |
| Knight | 25 food, 10 wood, 5 metal | 18 | 12 | 25 | 31 days | 2 food/day |


### Enemy Attacks

```
Enemy Strength = BaseDifficulty × (1 + (PlayerDays × 0.05)) × (1 + (SuccessfulRaids × 0.1))
```

## 🎮 Game Session Parameters

### Time Scales
- **Real-time tick**: 60 fps
- **Game day**: 2 minutes (real time) in normal mode
- **Auto-play day**: 20 seconds (real time)
- **Expedition time compression**: 1 minute real time = 1 hour game time

### Auto-Play Balance
- **Resource bonus**: 0.8× (80% of normal production)
- **Combat success**: 0.7× (70% of manual battle success rate)
- **Building speed**: 1.0× (same as manual play)

### Session Balance Targets
- **Initial session**: 5-10 minutes to complete tutorial
- **Daily active session**: 15-30 minutes to make meaningful progress
- **Idle return value**: Significant advancement after 8+ hours away
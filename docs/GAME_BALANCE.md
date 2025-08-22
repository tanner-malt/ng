# Game Balance Documentation

## 🎯 Starting Conditions

### New Game Initial State
- **Population**: 1 royal + 4 basic villagers = 5 total
- **Buildings**: None (empty village)
- **Population Capacity**: 0 (base case, only increased by buildings/technology)
- **Job Assignment**: Villagers have no specific jobs until buildings are constructed
- **Resources**: Starting resource amounts (defined in gameData.js)

### Design Philosophy
- Players must earn population capacity through building construction
- Job specialization comes from building infrastructure, not pre-assigned roles
- Creates immediate resource pressure and strategic building decisions

## 🧮 Resource Economy

### Base Resource Generation Rates

| Building | Level | Food | Wood | Stone | Gold | Production | Population | Time to ROI |
|----------|-------|------|------|-------|------|------------|------------|-------------|
| Town Center | 1 | +0 | +0 | +0 | +0 | +0 | +0 | N/A (logistics hub) |
| House | 1 | -1/day | +0 | +0 | +0 | +0 | +5 | 5 days |
| Farm | 1 | +8/day | -1/day | +0 | +0 | +0 | -1 | 4 days |
| Woodcutter Lodge | 1 | -1/day | +8/day | +0 | +0 | +1 | -1 | 4 days |
| Quarry | 1 | -2/day | -1/day | +6/day | +0 | +1 | -2 | 6 days |
| Lumber Mill | 1 | -1/day | +4/day | +0 | +0 | +0 | -1 | 5 days |
| Mine | 1 | -2/day | -1/day | +8/day | +0 | +0 | -2 | 7 days |
| Workshop | 1 | -1/day | -1/day | +0 | +0 | +3 | -1 | N/A (efficiency) |
| Blacksmith | 1 | -2/day | -1/day | +0 | +0 | +4 | -2 | N/A (military) |
| Market | 1 | -2/day | -1/day | -1/day | +12/day | +0 | -3 | 7 days |
| Barracks | 1 | -5/day | -2/day | -1/day | -10/day | +0 | -5 | N/A (military) |

**Notes:**
- Production (⚙️) values added for industrial buildings
- Lumber Mill produces planks (6/day) while reducing wood output
- Metal production: Mine (+3/day), Blacksmith (+4/day)

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
| Woodcutter Lodge | 1 | 75 | 25 | 25 | 1 day | N/A |
| Woodcutter Lodge | 2 | 150 | 50 | 50 | 2 days | 1.7x output |
| Quarry | 1 | 100 | 50 | 25 | 2 days | N/A |
| Quarry | 2 | 200 | 100 | 50 | 3 days | 1.6x output |
| Market | 1 | 150 | 75 | 50 | 2 days | N/A |
| Market | 2 | 300 | 150 | 100 | 3 days | 1.5x output |
| Barracks | 1 | 200 | 100 | 75 | 3 days | N/A |
| Barracks | 2 | 400 | 200 | 150 | 4 days | 1.5x training |


## ⚖️ Economy Formulas

### Resource Generation Formula
```
DailyResourceOutput = BaseOutput × (1 + (BuildingLevel × 0.5)) × (1 + (TownCenterBonus × 0.1)) × SeasonMultiplier × SkillEfficiency
```

### Building Time Formula
```
BuildingTime(days) = BaseBuildTime × (1 + (BuildingLevel × 0.3)) × (1 - (ConstructionTech × 0.05))
```

### Population Growth Formula
```
PopulationGrowth = BaseGrowthRate × (HouseCapacity - CurrentPopulation) / HouseCapacity
```

### Seasonal Production Multipliers

| Season | Duration | Food | Wood | Stone | Description |
|--------|----------|------|------|-------|-------------|
| **Spring** | 30 days | 1.2x | 1.0x | 1.0x | Growing season begins |
| **Summer** | 30 days | 1.5x | 0.8x | 1.2x | Peak harvest, dry conditions |
| **Autumn** | 30 days | 1.0x | 1.3x | 1.0x | Harvest ending, ideal logging |
| **Winter** | 30 days | 0.7x | 1.5x | 0.8x | Harsh conditions, indoor work |
| *Sprummer* | 10 days | 1.35x | 0.9x | 1.1x | Spring → Summer transition |
| *Sumtumn* | 10 days | 1.25x | 1.15x | 1.0x | Summer → Autumn transition |
| *Autinter* | 10 days | 0.9x | 1.2x | 0.95x | Autumn → Winter transition |
| *Winting* | 10 days | 0.8x | 1.25x | 0.9x | Winter → Spring transition |

### Worker Skill Efficiency

**Skill Categories:**
- **Resource Production:** Agriculture, Forestry, Mining, Quarrying
- **Crafting/Manufacturing:** Blacksmithing, Carpentry, Engineering
- **Military/Combat:** Melee Combat, Archery, Fortification
- **Knowledge/Mystical:** Scholarship, Research, Mysticism
- **Leadership/Governance:** Command, Inspiration, Diplomacy

**Skill Levels & Production Bonuses:**
- **Novice:** 1.0x (base rate)
- **Apprentice:** 1.2x (+20% efficiency)
- **Journeyman:** 1.5x (+50% efficiency)
- **Expert:** 2.0x (+100% efficiency)
- **Grandmaster:** 3.0x (+200% efficiency)

### Production Resource (⚙️) Sources

| Building | Production/Day | Additional Effects |
|----------|----------------|-------------------|
| Workshop | 3 | +10% efficiency to nearby buildings |
| Blacksmith | 4 | +15% efficiency to all production |
| Woodcutter Lodge | 1 | Primary wood producer |
| Quarry | 1 | Primary stone producer |

**Crafting Costs:**
- ⚔️ Weapon: 5⚙️ + 2💰
- 🔨 Tool: 3⚙️ + 1💰
- 🛡️ Armor: 8⚙️ + 3💰

### Idle Population Contribution

Unemployed working-age villagers (16-190 years) contribute daily:
- **40% chance:** +0.5 Food
- **20% chance:** +0.5 Wood
- **20% chance:** +0.25 Stone  
- **20% chance:** +0.1 Metal

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
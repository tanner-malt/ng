# Battle System Documentation

## Overview
The battle system has evolved from wave-based encounters to a world map army system with sophisticated AI commanders, skill-based units, and environmental modifiers.

## Core Components

### 1. Commander AI System
**Personalities:**
- **Aggressive**: Favors direct attacks and high-risk strategies
- **Defensive**: Prioritizes unit preservation and careful positioning  
- **Cunning**: Uses terrain advantages and tactical formations

**Learning System:**
- Commanders gain experience from battles
- Strategy effectiveness is tracked and influences future decisions
- Experience persists across game sessions via localStorage

### 2. Unit System
Units are recruited from the villager population based on their skills and characteristics:

**Unit Types:**
- **Militia**: Default units from unskilled villagers
- **Archer**: Woodcutters and farmers with ranged combat skills
- **Veteran Soldier**: Guards and villagers with Fighting skills
- **Heavy Infantry**: Blacksmiths and skilled workers with defensive focus
- **Engineer**: Builders specialized in siege and fortifications
- **Scout**: Merchants and traders with mobility advantages
- **Sapper**: Miners skilled in demolition and underground tactics

**Recruitment Process:**
- Adults aged 46-75 are eligible for military service
- Unit type determined by villager skills and profession
- Stats calculated based on age, happiness, and skill bonuses
- Original villager data preserved for post-service return

### 3. Weather and Terrain Modifiers

**Weather Effects:**
- **Clear**: No modifiers (baseline conditions)
- **Rain**: Reduced movement speed, increased stealth
- **Snow**: Slower movement, reduced visibility, cold penalties
- **Fog**: Limited vision range, stealth bonuses
- **Wind**: Affects ranged accuracy and formations

**Terrain Types:**
- **Plains**: Standard movement and visibility
- **Forest**: Reduced movement, archer bonuses, stealth advantages
- **Hills**: Elevation bonuses, defensive positions
- **River**: Movement penalties, defensive chokepoints
- **Desert**: Heat effects, water scarcity impacts
- **Mountains**: Extreme elevation, limited movement paths

**Modifier Application:**
- Weather and terrain effects apply to both armies equally
- Commanders adapt strategies based on conditions
- Unit positioning influenced by environmental factors
- Formation effectiveness varies with terrain type

### 4. Formation System

**Formation Types:**
- **Line Formation**: Balanced attack and defense
- **Column Formation**: Concentrated breakthrough power
- **Scattered Formation**: Anti-archer, mobility focused
- **Defensive Formation**: Maximum protection, reduced mobility
- **Flanking Formation**: Tactical positioning for side attacks

**Commander Formation Effects:**
Formations influence how commanders direct their armies without providing direct stat bonuses:

**Strategic Influences:**
- **Aggressive Commanders** + Line Formation = Coordinated charges
- **Defensive Commanders** + Defensive Formation = Layered protection
- **Cunning Commanders** + Flanking Formation = Tactical positioning

**Formation Adaptation:**
- Commanders analyze enemy formations and terrain
- Formation changes during battle based on circumstances
- Unit type composition affects formation effectiveness
- Weather and terrain influence optimal formation choice

## Battle Flow

### 1. Army Encounters
- Triggered by world map exploration or defensive battles
- Enemy armies can be predefined (world map obstacles) or generated
- Environmental conditions randomly determined or location-based

### 2. Pre-Battle Phase
- Commander selection based on experience and strategy match
- Unit recruitment from available population
- Formation selection influenced by commander personality and conditions
- Weather/terrain analysis for tactical advantages

### 3. Combat Resolution
- Turn-based combat with AI decision making
- Environmental modifiers applied to all actions
- Formation effects influence unit positioning and tactics
- Morale system affects unit performance and retreats

### 4. Post-Battle
- Experience gained by surviving units and commanders
- Casualties returned to population with status updates
- Victory rewards based on difficulty and enemy strength
- Territory control changes for world map progression

## Integration Points

### Population Manager
- Provides recruitable villagers with skills and attributes
- Receives casualties and status updates post-battle
- Manages age progression and skill development

### Achievement System
- Tracks battle victories, unit recruitment, and commander development
- Monitors formation usage and tactical innovations
- Records environmental battle conditions for completionist goals

### World Manager
- Provides enemy army data for encounters
- Manages terrain and weather for battle locations
- Updates territory control based on battle outcomes

### Quest System
- Initiates expedition battles with specific objectives
- Provides contextual enemy forces and conditions
- Integrates battle outcomes with story progression

### Technical Notes
- Battle state persists across sessions via gameState integration
- Commander AI can be expanded with machine learning techniques
- Formation system designed for visual representation in future UI updates
- Weather/terrain system extensible for new environmental types

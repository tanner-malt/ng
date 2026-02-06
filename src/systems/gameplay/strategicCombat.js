/**
 * strategicCombat.js - Strategic Combat Enhancements
 * 
 * Adds rock-paper-scissors unit counters, formations, and tactical positioning
 * to make combat feel more like a strategy game.
 */

class StrategicCombat {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Unit type definitions with counters (rock-paper-scissors style)
        this.unitTypes = {
            // Infantry types
            militia: {
                category: 'infantry',
                name: 'Militia',
                icon: '🗡️',
                stats: { hp: 30, attack: 5, defense: 3, speed: 2 },
                cost: { food: 20, gold: 10 },
                counters: ['archer', 'skirmisher'],  // Strong against
                weakTo: ['cavalry', 'knight'],       // Weak against
                description: 'Basic infantry, cheap and expendable'
            },
            spearman: {
                category: 'infantry',
                name: 'Spearman',
                icon: '🔱',
                stats: { hp: 35, attack: 6, defense: 5, speed: 2 },
                cost: { food: 25, gold: 15, weapons: 1 },
                counters: ['cavalry', 'knight', 'warhorse'],  // Anti-cavalry specialists
                weakTo: ['archer', 'crossbowman'],
                description: 'Anti-cavalry infantry with long reach'
            },
            heavyInfantry: {
                category: 'infantry',
                name: 'Heavy Infantry',
                icon: '⚔️',
                stats: { hp: 60, attack: 10, defense: 12, speed: 1 },
                cost: { food: 40, gold: 30, weapons: 2, metal: 5 },
                counters: ['militia', 'archer'],
                weakTo: ['spearman', 'siege'],
                description: 'Armored elite infantry, slow but powerful'
            },
            
            // Ranged types
            archer: {
                category: 'ranged',
                name: 'Archer',
                icon: '🏹',
                stats: { hp: 20, attack: 8, defense: 2, speed: 2, range: 3 },
                cost: { food: 20, gold: 15, wood: 5 },
                counters: ['spearman', 'siege', 'skirmisher'],
                weakTo: ['cavalry', 'militia'],
                description: 'Ranged attackers, deadly at distance'
            },
            crossbowman: {
                category: 'ranged',
                name: 'Crossbowman',
                icon: '⊕',
                stats: { hp: 25, attack: 12, defense: 3, speed: 1, range: 4 },
                cost: { food: 25, gold: 25, wood: 10, metal: 2 },
                counters: ['heavyInfantry', 'spearman', 'knight'],
                weakTo: ['cavalry', 'skirmisher'],
                description: 'Armor-piercing ranged units, slow rate of fire'
            },
            skirmisher: {
                category: 'ranged',
                name: 'Skirmisher',
                icon: '🎯',
                stats: { hp: 18, attack: 6, defense: 1, speed: 3, range: 2 },
                cost: { food: 15, gold: 10 },
                counters: ['crossbowman', 'siege'],
                weakTo: ['militia', 'cavalry'],
                description: 'Fast harassment units, hit and run tactics'
            },
            
            // Cavalry types
            cavalry: {
                category: 'cavalry',
                name: 'Light Cavalry',
                icon: '🐎',
                stats: { hp: 35, attack: 8, defense: 4, speed: 4 },
                cost: { food: 40, gold: 40 },
                counters: ['archer', 'crossbowman', 'skirmisher'],
                weakTo: ['spearman', 'heavyInfantry'],
                description: 'Fast flanking cavalry, great mobility'
            },
            knight: {
                category: 'cavalry',
                name: 'Knight',
                icon: '🛡️',
                stats: { hp: 70, attack: 15, defense: 10, speed: 3 },
                cost: { food: 60, gold: 80, weapons: 3, metal: 10 },
                counters: ['militia', 'archer', 'infantry'],
                weakTo: ['spearman', 'crossbowman'],
                description: 'Elite armored cavalry, devastating charge'
            },
            
            // Special types
            siege: {
                category: 'siege',
                name: 'Siege Engine',
                icon: '🏗️',
                stats: { hp: 80, attack: 25, defense: 5, speed: 1, range: 5 },
                cost: { food: 50, gold: 100, wood: 50, metal: 20 },
                counters: ['building', 'heavyInfantry'],
                weakTo: ['cavalry', 'skirmisher'],
                description: 'Destroys fortifications and grouped enemies'
            },
            mage: {
                category: 'special',
                name: 'Battle Mage',
                icon: '🧙',
                stats: { hp: 25, attack: 15, defense: 2, speed: 2, range: 3, magic: true },
                cost: { food: 30, gold: 100, influence: 20 },
                counters: ['heavyInfantry', 'knight'],
                weakTo: ['skirmisher', 'archer'],
                description: 'Magical attacks bypass armor'
            }
        };
        
        // Formation definitions
        this.formations = {
            line: {
                name: 'Battle Line',
                icon: '═',
                description: 'Standard formation, balanced stats',
                modifiers: { attack: 1.0, defense: 1.0, speed: 1.0 }
            },
            shieldWall: {
                name: 'Shield Wall',
                icon: '█',
                description: '+40% defense, -20% attack, immobile',
                modifiers: { attack: 0.8, defense: 1.4, speed: 0 },
                requiresCategory: 'infantry'
            },
            wedge: {
                name: 'Wedge',
                icon: '▲',
                description: '+30% attack on charge, -20% defense',
                modifiers: { attack: 1.3, defense: 0.8, speed: 1.2 },
                requiresCategory: 'cavalry'
            },
            scatter: {
                name: 'Scatter',
                icon: '✦',
                description: '-40% damage from ranged/siege, -20% attack',
                modifiers: { attack: 0.8, defense: 1.0, speed: 1.1, rangedResist: 0.6 }
            },
            concentrate: {
                name: 'Concentrate',
                icon: '◉',
                description: '+50% ranged attack, vulnerable to siege',
                modifiers: { attack: 1.5, defense: 0.8, siegeVulnerable: true },
                requiresCategory: 'ranged'
            },
            skirmish: {
                name: 'Skirmish',
                icon: '❋',
                description: '+20% speed, +10% attack, -30% defense',
                modifiers: { attack: 1.1, defense: 0.7, speed: 1.2 }
            }
        };
        
        // Terrain combat modifiers
        this.terrainModifiers = {
            plains: { 
                cavalry: { attack: 1.2, defense: 1.0 },
                infantry: { attack: 1.0, defense: 1.0 },
                ranged: { attack: 1.1, defense: 1.0 }
            },
            forest: { 
                cavalry: { attack: 0.7, defense: 0.8 },   // Cavalry struggles
                infantry: { attack: 1.1, defense: 1.2 },  // Infantry benefits
                ranged: { attack: 0.8, defense: 1.3 }     // Cover but limited sight
            },
            hills: { 
                cavalry: { attack: 0.9, defense: 0.9 },
                infantry: { attack: 1.0, defense: 1.1 },
                ranged: { attack: 1.3, defense: 1.1 }     // Height advantage
            },
            mountains: { 
                cavalry: { attack: 0.5, defense: 0.6 },   // Very bad for cavalry
                infantry: { attack: 1.1, defense: 1.3 },
                ranged: { attack: 1.2, defense: 1.2 }
            },
            swamp: { 
                cavalry: { attack: 0.6, defense: 0.6 },
                infantry: { attack: 0.8, defense: 0.9 },
                ranged: { attack: 0.9, defense: 0.8 }
            },
            desert: { 
                cavalry: { attack: 1.1, defense: 0.9 },   // Cavalry mobile
                infantry: { attack: 0.9, defense: 0.8 },
                ranged: { attack: 1.0, defense: 0.9 }
            }
        };
        
        console.log('[StrategicCombat] System initialized');
    }
    
    /**
     * Calculate combat advantage between two unit types.
     * Returns multiplier: >1 = attacker advantage, <1 = defender advantage
     */
    calculateTypeAdvantage(attackerType, defenderType) {
        const attacker = this.unitTypes[attackerType];
        const defender = this.unitTypes[defenderType];
        
        if (!attacker || !defender) return 1.0;
        
        // Check if attacker counters defender
        if (attacker.counters?.includes(defenderType) || 
            attacker.counters?.includes(defender.category)) {
            return 1.5; // 50% bonus
        }
        
        // Check if attacker is weak to defender
        if (attacker.weakTo?.includes(defenderType) || 
            attacker.weakTo?.includes(defender.category)) {
            return 0.7; // 30% penalty
        }
        
        return 1.0; // Neutral matchup
    }
    
    /**
     * Calculate terrain modifier for a unit category.
     */
    calculateTerrainModifier(terrain, unitCategory, stat) {
        const terrainMods = this.terrainModifiers[terrain];
        if (!terrainMods) return 1.0;
        
        const categoryMods = terrainMods[unitCategory];
        if (!categoryMods) return 1.0;
        
        return categoryMods[stat] || 1.0;
    }
    
    /**
     * Apply formation modifiers to unit stats.
     */
    applyFormation(unit, formationKey) {
        const formation = this.formations[formationKey];
        if (!formation) return unit;
        
        const unitDef = this.unitTypes[unit.type];
        if (!unitDef) return unit;
        
        // Check formation requirements
        if (formation.requiresCategory && unitDef.category !== formation.requiresCategory) {
            return unit; // Can't use this formation
        }
        
        return {
            ...unit,
            attack: Math.round(unit.attack * formation.modifiers.attack),
            defense: Math.round(unit.defense * formation.modifiers.defense),
            speed: Math.round(unit.speed * formation.modifiers.speed),
            formation: formationKey,
            rangedResist: formation.modifiers.rangedResist || 1.0,
            siegeVulnerable: formation.modifiers.siegeVulnerable || false
        };
    }
    
    /**
     * Simulate a battle round between two armies.
     */
    simulateCombatRound(attackingArmy, defendingArmy, terrain = 'plains') {
        const results = {
            attackerCasualties: 0,
            defenderCasualties: 0,
            events: []
        };
        
        // Calculate effective stats for each side
        const attackingUnits = attackingArmy.units.filter(u => u.alive);
        const defendingUnits = defendingArmy.units.filter(u => u.alive);
        
        if (attackingUnits.length === 0 || defendingUnits.length === 0) {
            return results;
        }
        
        // Each attacker picks a random target and attacks
        attackingUnits.forEach(attacker => {
            if (defendingUnits.length === 0) return;
            
            const target = defendingUnits[Math.floor(Math.random() * defendingUnits.length)];
            if (!target.alive) return;
            
            // Calculate damage
            const typeAdvantage = this.calculateTypeAdvantage(attacker.type, target.type);
            const unitDef = this.unitTypes[attacker.type];
            const terrainMod = this.calculateTerrainModifier(terrain, unitDef?.category || 'infantry', 'attack');
            
            // Apply legacy bonus if available
            const legacyMod = this.gameState?.legacyCombatMultiplier || 1.0;
            
            const attackPower = (attacker.attack || 5) * typeAdvantage * terrainMod * legacyMod;
            const defensePower = (target.defense || 2);
            const damage = Math.max(1, Math.round(attackPower - defensePower * 0.5 + Math.random() * 3));
            
            target.hp -= damage;
            
            if (target.hp <= 0) {
                target.alive = false;
                results.defenderCasualties++;
                
                if (typeAdvantage > 1.2) {
                    results.events.push(`${unitDef?.name || 'Unit'} countered and defeated a ${this.unitTypes[target.type]?.name || 'unit'}!`);
                }
            }
        });
        
        // Defenders counter-attack
        const survivingDefenders = defendingUnits.filter(u => u.alive);
        survivingDefenders.forEach(defender => {
            if (attackingUnits.length === 0) return;
            
            const target = attackingUnits[Math.floor(Math.random() * attackingUnits.length)];
            if (!target.alive) return;
            
            const typeAdvantage = this.calculateTypeAdvantage(defender.type, target.type);
            const unitDef = this.unitTypes[defender.type];
            const terrainMod = this.calculateTerrainModifier(terrain, unitDef?.category || 'infantry', 'attack');
            
            const attackPower = (defender.attack || 5) * typeAdvantage * terrainMod;
            const defensePower = (target.defense || 2);
            const damage = Math.max(1, Math.round(attackPower - defensePower * 0.5 + Math.random() * 3));
            
            target.hp -= damage;
            
            if (target.hp <= 0) {
                target.alive = false;
                results.attackerCasualties++;
            }
        });
        
        return results;
    }
    
    /**
     * Get army composition analysis and recommendations.
     */
    analyzeArmyComposition(units) {
        const analysis = {
            categories: { infantry: 0, ranged: 0, cavalry: 0, siege: 0, special: 0 },
            totalStrength: 0,
            weaknesses: [],
            strengths: [],
            recommendation: ''
        };
        
        units.forEach(unit => {
            const def = this.unitTypes[unit.type];
            if (def) {
                analysis.categories[def.category] = (analysis.categories[def.category] || 0) + 1;
                analysis.totalStrength += (unit.attack || 5) + (unit.defense || 2);
            }
        });
        
        const total = units.length;
        
        // Analyze composition
        if (analysis.categories.infantry / total > 0.7) {
            analysis.weaknesses.push('Heavy cavalry forces');
            analysis.strengths.push('Holding ground, siege defense');
        }
        if (analysis.categories.cavalry / total > 0.5) {
            analysis.weaknesses.push('Spearmen and rough terrain');
            analysis.strengths.push('Flanking ranged units, mobility');
        }
        if (analysis.categories.ranged / total > 0.5) {
            analysis.weaknesses.push('Fast cavalry charges');
            analysis.strengths.push('Damaging before melee, hills');
        }
        
        // Generate recommendation
        if (analysis.categories.infantry === 0) {
            analysis.recommendation = 'Add infantry to hold the line for your ranged/cavalry';
        } else if (analysis.categories.ranged === 0) {
            analysis.recommendation = 'Add ranged units to soften enemies before melee';
        } else if (analysis.categories.cavalry === 0) {
            analysis.recommendation = 'Add cavalry for flanking and chasing routers';
        } else {
            analysis.recommendation = 'Well-balanced army composition';
        }
        
        return analysis;
    }
    
    /**
     * Get threat assessment for an enemy army.
     */
    assessThreat(enemyArmy, playerArmy) {
        const analysis = {
            threatLevel: 'low',
            threatScore: 0,
            advantages: [],
            disadvantages: [],
            recommendation: ''
        };
        
        // Calculate raw strength comparison
        const enemyStrength = enemyArmy.units.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 2), 0);
        const playerStrength = playerArmy.units.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 2), 0);
        
        analysis.threatScore = Math.round((enemyStrength / Math.max(1, playerStrength)) * 100);
        
        if (analysis.threatScore < 50) {
            analysis.threatLevel = 'low';
        } else if (analysis.threatScore < 80) {
            analysis.threatLevel = 'moderate';
        } else if (analysis.threatScore < 120) {
            analysis.threatLevel = 'high';
        } else {
            analysis.threatLevel = 'extreme';
        }
        
        // Check for type matchups
        const enemyTypes = new Set(enemyArmy.units.map(u => u.type));
        const playerTypes = new Set(playerArmy.units.map(u => u.type));
        
        playerTypes.forEach(pType => {
            const pDef = this.unitTypes[pType];
            if (!pDef) return;
            
            enemyTypes.forEach(eType => {
                if (pDef.counters?.includes(eType)) {
                    analysis.advantages.push(`Your ${pDef.name} counters enemy ${this.unitTypes[eType]?.name || eType}`);
                }
                if (pDef.weakTo?.includes(eType)) {
                    analysis.disadvantages.push(`Your ${pDef.name} is weak to enemy ${this.unitTypes[eType]?.name || eType}`);
                }
            });
        });
        
        // Generate recommendation
        if (analysis.threatLevel === 'extreme') {
            analysis.recommendation = '⚠️ Avoid direct engagement. Retreat or seek reinforcements.';
        } else if (analysis.threatLevel === 'high') {
            analysis.recommendation = '⚔️ Engage carefully. Use terrain and formations to your advantage.';
        } else if (analysis.threatLevel === 'moderate') {
            analysis.recommendation = '🗡️ Winnable battle. Press your type advantages.';
        } else {
            analysis.recommendation = '✓ Favorable odds. Attack with confidence.';
        }
        
        return analysis;
    }
    
    /**
     * Get icon for threat level.
     */
    getThreatIcon(threatLevel) {
        switch(threatLevel) {
            case 'low': return '🟢';
            case 'moderate': return '🟡';
            case 'high': return '🟠';
            case 'extreme': return '🔴';
            default: return '⚪';
        }
    }
    
    /**
     * Get formation options for an army.
     */
    getAvailableFormations(army) {
        const available = [];
        const unitCategories = new Set();
        
        army.units.forEach(u => {
            const def = this.unitTypes[u.type];
            if (def) unitCategories.add(def.category);
        });
        
        Object.entries(this.formations).forEach(([key, formation]) => {
            if (!formation.requiresCategory || unitCategories.has(formation.requiresCategory)) {
                available.push({ key, ...formation });
            }
        });
        
        return available;
    }
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.StrategicCombat = StrategicCombat;
    console.log('[StrategicCombat] Class registered');
}

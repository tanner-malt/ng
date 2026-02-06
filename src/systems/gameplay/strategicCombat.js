/**
 * strategicCombat.js - Combat System
 * 
 * Simplified combat with infantry-only units for now.
 * Will expand with more unit types later.
 */

class StrategicCombat {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Simplified: Infantry only for now
        this.unitTypes = {
            infantry: {
                category: 'infantry',
                name: 'Infantry',
                icon: '⚔️',
                stats: { hp: 30, attack: 5, defense: 3, speed: 2 },
                cost: { food: 20, gold: 10 },
                isHuman: true,
                description: 'Standard infantry soldiers'
            }
        };
        
        // Simplified formations
        this.formations = {
            line: {
                name: 'Battle Line',
                icon: '═',
                description: 'Standard formation, balanced stats',
                modifiers: { attack: 1.0, defense: 1.0, speed: 1.0 }
            }
        };
        
        // Terrain combat modifiers (simplified)
        this.terrainModifiers = {
            plains: { infantry: { attack: 1.0, defense: 1.0 } },
            forest: { infantry: { attack: 1.1, defense: 1.2 } },
            hills: { infantry: { attack: 1.0, defense: 1.1 } },
            mountains: { infantry: { attack: 1.1, defense: 1.3 } },
            swamp: { infantry: { attack: 0.8, defense: 0.9 } },
            desert: { infantry: { attack: 0.9, defense: 0.8 } }
        };
        
        console.log('[StrategicCombat] System initialized (infantry-only mode)');
    }
    
    /**
     * Calculate terrain modifier for infantry.
     */
    calculateTerrainModifier(terrain, stat) {
        const terrainMods = this.terrainModifiers[terrain];
        if (!terrainMods) return 1.0;
        
        const infantryMods = terrainMods.infantry;
        if (!infantryMods) return 1.0;
        
        return infantryMods[stat] || 1.0;
    }
    
    /**
     * Simulate a battle round between two armies.
     * Simplified: All units are infantry.
     */
    simulateCombatRound(attackingArmy, defendingArmy, terrain = 'plains') {
        const results = {
            attackerCasualties: 0,
            defenderCasualties: 0,
            events: []
        };
        
        // Calculate effective stats for each side
        const attackingUnits = (attackingArmy.units || []).filter(u => u.alive);
        const defendingUnits = (defendingArmy.units || []).filter(u => u.alive);
        
        if (attackingUnits.length === 0 || defendingUnits.length === 0) {
            return results;
        }
        
        // Each attacker picks a random target and attacks
        attackingUnits.forEach(attacker => {
            const aliveDefenders = defendingUnits.filter(u => u.alive);
            if (aliveDefenders.length === 0) return;
            
            const target = aliveDefenders[Math.floor(Math.random() * aliveDefenders.length)];
            
            // Calculate damage (simplified for infantry vs infantry)
            const terrainMod = this.calculateTerrainModifier(terrain, 'attack');
            const legacyMod = this.gameState?.legacyCombatMultiplier || 1.0;
            
            const attackPower = (attacker.attack || 5) * terrainMod * legacyMod;
            const defensePower = (target.defense || 3);
            const damage = Math.max(1, Math.round(attackPower - defensePower * 0.5 + Math.random() * 3));
            
            target.hp -= damage;
            
            if (target.hp <= 0) {
                target.alive = false;
                results.defenderCasualties++;
            }
        });
        
        // Defenders counter-attack
        const survivingDefenders = defendingUnits.filter(u => u.alive);
        survivingDefenders.forEach(defender => {
            const aliveAttackers = attackingUnits.filter(u => u.alive);
            if (aliveAttackers.length === 0) return;
            
            const target = aliveAttackers[Math.floor(Math.random() * aliveAttackers.length)];
            
            const terrainMod = this.calculateTerrainModifier(terrain, 'attack');
            const attackPower = (defender.attack || 5) * terrainMod;
            const defensePower = (target.defense || 3);
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
     * Get army strength analysis (simplified for infantry-only).
     */
    analyzeArmyComposition(units) {
        const analysis = {
            totalUnits: units.length,
            totalStrength: 0,
            averageHp: 0,
            recommendation: ''
        };
        
        if (units.length === 0) {
            analysis.recommendation = 'No units in army';
            return analysis;
        }
        
        let totalHp = 0;
        units.forEach(unit => {
            analysis.totalStrength += (unit.attack || 5) + (unit.defense || 3);
            totalHp += unit.hp || 30;
        });
        
        analysis.averageHp = Math.round(totalHp / units.length);
        
        if (units.length < 5) {
            analysis.recommendation = 'Recruit more soldiers to strengthen your army';
        } else if (units.length < 10) {
            analysis.recommendation = 'Decent army size. Consider recruiting more.';
        } else {
            analysis.recommendation = 'Strong army ready for battle';
        }
        
        return analysis;
    }
    
    /**
     * Get threat assessment for an enemy army (simplified).
     */
    assessThreat(enemyArmy, playerArmy) {
        const analysis = {
            threatLevel: 'low',
            threatScore: 0,
            advantages: [],
            disadvantages: [],
            recommendation: ''
        };
        
        const enemyUnits = enemyArmy.units || [];
        const playerUnits = playerArmy.units || [];
        
        // Calculate raw strength comparison
        const enemyStrength = enemyUnits.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 3), 0);
        const playerStrength = playerUnits.reduce((sum, u) => sum + (u.attack || 5) + (u.defense || 3), 0);
        
        analysis.threatScore = Math.round((enemyStrength / Math.max(1, playerStrength)) * 100);
        
        if (analysis.threatScore < 50) {
            analysis.threatLevel = 'low';
            analysis.recommendation = '✓ Favorable odds. Attack with confidence.';
        } else if (analysis.threatScore < 80) {
            analysis.threatLevel = 'moderate';
            analysis.recommendation = '🗡️ Winnable battle with good tactics.';
        } else if (analysis.threatScore < 120) {
            analysis.threatLevel = 'high';
            analysis.recommendation = '⚔️ Even fight. Prepare carefully.';
        } else {
            analysis.threatLevel = 'extreme';
            analysis.recommendation = '⚠️ Dangerous! Consider retreating or reinforcing.';
        }
        
        // Simple numerical comparison
        if (playerUnits.length > enemyUnits.length) {
            analysis.advantages.push(`Numerical advantage: ${playerUnits.length} vs ${enemyUnits.length}`);
        } else if (enemyUnits.length > playerUnits.length) {
            analysis.disadvantages.push(`Outnumbered: ${playerUnits.length} vs ${enemyUnits.length}`);
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
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.StrategicCombat = StrategicCombat;
    console.log('[StrategicCombat] Class registered');
}

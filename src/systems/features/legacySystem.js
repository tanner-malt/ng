/**
 * legacySystem.js - Dynasty Legacy & Prestige System
 * 
 * Roguelike-style progression where ending a dynasty grants legacy points
 * that provide permanent bonuses for future runs.
 * 
 * Key Concept: "End Dynasty" = Fresh start with accumulated bonuses
 */

class LegacySystem {
    constructor() {
        this.STORAGE_KEY = 'dynastyBuilder_legacy';
        this.legacy = this.loadLegacy();
        
        console.log('[Legacy] System initialized with', this.legacy.totalPoints, 'legacy points');
    }

    /**
     * Load legacy data from persistent storage.
     */
    loadLegacy() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[Legacy] Failed to load legacy data:', e);
        }
        
        // Default legacy structure
        return {
            totalPoints: 0,
            dynastiesCompleted: 0,
            highestDay: 0,
            highestPopulation: 0,
            totalTerritoriesClaimed: 0,
            achievements: [],
            
            // Unlocked permanent bonuses
            bonuses: {
                startingGold: 0,           // +X gold at start
                startingFood: 0,           // +X food at start
                startingPopulation: 0,     // +X starting villagers
                productionBonus: 0,        // +X% all production
                buildSpeedBonus: 0,        // +X% construction speed
                combatBonus: 0,            // +X% combat effectiveness
                explorationBonus: 0        // +X% exploration speed
            },
            
            // Titles earned (cosmetic + minor bonuses)
            titles: [],
            
            // History of all dynasties
            dynastyHistory: []
        };
    }

    /**
     * Save legacy data to persistent storage.
     */
    saveLegacy() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.legacy));
            console.log('[Legacy] Saved legacy data');
        } catch (e) {
            console.error('[Legacy] Failed to save legacy data:', e);
        }
    }

    /**
     * Calculate legacy points earned from the current dynasty.
     */
    calculateLegacyPoints(gameState) {
        let points = 0;
        const breakdown = [];
        
        // Days survived (1 point per 5 days)
        const dayPoints = Math.floor((gameState.day || 0) / 5);
        if (dayPoints > 0) {
            points += dayPoints;
            breakdown.push({ label: 'Days Survived', value: dayPoints, detail: `${gameState.day} days` });
        }
        
        // Population at peak (1 point per 3 villagers)
        const pop = gameState.populationManager?.getAll()?.length || gameState.population || 0;
        const popPoints = Math.floor(pop / 3);
        if (popPoints > 0) {
            points += popPoints;
            breakdown.push({ label: 'Peak Population', value: popPoints, detail: `${pop} villagers` });
        }
        
        // Buildings constructed (1 point per building)
        const buildings = gameState.buildings?.length || 0;
        if (buildings > 0) {
            points += buildings;
            breakdown.push({ label: 'Buildings Constructed', value: buildings, detail: `${buildings} structures` });
        }
        
        // Gold accumulated (1 point per 100 gold)
        const goldPoints = Math.floor((gameState.gold || 0) / 100);
        if (goldPoints > 0) {
            points += goldPoints;
            breakdown.push({ label: 'Wealth Accumulated', value: goldPoints, detail: `${gameState.gold} gold` });
        }
        
        // Territories explored
        const territories = gameState.worldManager?.discoveredTiles?.size || 0;
        if (territories > 1) {
            const territoryPoints = territories - 1; // Don't count starting tile
            points += territoryPoints;
            breakdown.push({ label: 'Lands Explored', value: territoryPoints, detail: `${territories} hexes` });
        }
        
        // Achievements earned this run (5 points each)
        const achievements = gameState.achievementSystem?.unlockedAchievements?.size || 0;
        if (achievements > 0) {
            const achievePoints = achievements * 5;
            points += achievePoints;
            breakdown.push({ label: 'Achievements Earned', value: achievePoints, detail: `${achievements} achievements` });
        }
        
        // Bonus for surviving past certain milestones
        if (gameState.day >= 100) {
            points += 50;
            breakdown.push({ label: 'Century Bonus', value: 50, detail: 'Survived 100+ days' });
        }
        if (gameState.day >= 365) {
            points += 100;
            breakdown.push({ label: 'Year Bonus', value: 100, detail: 'Survived a full year' });
        }
        
        return { total: points, breakdown };
    }

    /**
     * End the current dynasty and grant legacy rewards.
     * This is the "prestige" action.
     */
    endDynasty(gameState, dynastyName = 'Unknown') {
        const { total: legacyPoints, breakdown } = this.calculateLegacyPoints(gameState);
        
        // Record this dynasty in history
        const dynastyRecord = {
            name: dynastyName,
            daysRuled: gameState.day || 0,
            peakPopulation: gameState.populationManager?.getAll()?.length || gameState.population || 0,
            buildings: gameState.buildings?.length || 0,
            gold: gameState.gold || 0,
            legacyEarned: legacyPoints,
            endDate: new Date().toISOString(),
            endReason: 'voluntary' // Could be 'extinction', 'conquest', etc.
        };
        
        this.legacy.dynastyHistory.push(dynastyRecord);
        this.legacy.dynastiesCompleted++;
        this.legacy.totalPoints += legacyPoints;
        
        // Update records
        if (gameState.day > this.legacy.highestDay) {
            this.legacy.highestDay = gameState.day;
        }
        const pop = gameState.populationManager?.getAll()?.length || gameState.population || 0;
        if (pop > this.legacy.highestPopulation) {
            this.legacy.highestPopulation = pop;
        }
        
        // Check for title unlocks
        this.checkTitleUnlocks();
        
        this.saveLegacy();
        
        return {
            legacyPoints,
            breakdown,
            totalLegacy: this.legacy.totalPoints,
            dynastyNumber: this.legacy.dynastiesCompleted
        };
    }

    /**
     * Check and unlock titles based on achievements.
     */
    checkTitleUnlocks() {
        const titles = this.legacy.titles;
        
        if (this.legacy.dynastiesCompleted >= 1 && !titles.includes('Founder')) {
            titles.push('Founder');
        }
        if (this.legacy.dynastiesCompleted >= 5 && !titles.includes('Veteran Ruler')) {
            titles.push('Veteran Ruler');
        }
        if (this.legacy.dynastiesCompleted >= 10 && !titles.includes('Eternal Dynasty')) {
            titles.push('Eternal Dynasty');
        }
        if (this.legacy.highestDay >= 365 && !titles.includes('Year King')) {
            titles.push('Year King');
        }
        if (this.legacy.highestPopulation >= 50 && !titles.includes('People\'s Monarch')) {
            titles.push('People\'s Monarch');
        }
        if (this.legacy.totalPoints >= 500 && !titles.includes('Legacy Builder')) {
            titles.push('Legacy Builder');
        }
        if (this.legacy.totalPoints >= 2000 && !titles.includes('Immortal Legacy')) {
            titles.push('Immortal Legacy');
        }
    }

    /**
     * Spend legacy points on permanent bonuses.
     */
    purchaseBonus(bonusType, cost) {
        if (this.legacy.totalPoints < cost) {
            return { success: false, message: 'Not enough legacy points' };
        }
        
        const bonusAmounts = {
            startingGold: 50,        // +50 gold per purchase
            startingFood: 25,        // +25 food per purchase
            startingPopulation: 1,   // +1 villager per purchase
            productionBonus: 5,      // +5% per purchase
            buildSpeedBonus: 5,      // +5% per purchase
            combatBonus: 5,          // +5% per purchase
            explorationBonus: 10     // +10% per purchase
        };
        
        if (!bonusAmounts[bonusType]) {
            return { success: false, message: 'Invalid bonus type' };
        }
        
        this.legacy.totalPoints -= cost;
        this.legacy.bonuses[bonusType] += bonusAmounts[bonusType];
        this.saveLegacy();
        
        return { 
            success: true, 
            message: `Purchased ${bonusType} bonus! New value: ${this.legacy.bonuses[bonusType]}`,
            newValue: this.legacy.bonuses[bonusType]
        };
    }

    /**
     * Get starting bonuses for a new dynasty.
     */
    getStartingBonuses() {
        return {
            gold: this.legacy.bonuses.startingGold,
            food: this.legacy.bonuses.startingFood,
            population: this.legacy.bonuses.startingPopulation,
            productionMultiplier: 1 + (this.legacy.bonuses.productionBonus / 100),
            buildSpeedMultiplier: 1 + (this.legacy.bonuses.buildSpeedBonus / 100),
            combatMultiplier: 1 + (this.legacy.bonuses.combatBonus / 100),
            explorationMultiplier: 1 + (this.legacy.bonuses.explorationBonus / 100)
        };
    }

    /**
     * Apply starting bonuses to a new game state.
     */
    applyStartingBonuses(gameState) {
        const bonuses = this.getStartingBonuses();
        
        // Apply resource bonuses
        if (bonuses.gold > 0) {
            gameState.gold = (gameState.gold || 0) + bonuses.gold;
            console.log(`[Legacy] Applied starting gold bonus: +${bonuses.gold}`);
        }
        if (bonuses.food > 0 && gameState.resources) {
            gameState.resources.food = (gameState.resources.food || 0) + bonuses.food;
            console.log(`[Legacy] Applied starting food bonus: +${bonuses.food}`);
        }
        
        // Population bonus is handled by PopulationManager on init
        // Multipliers are checked by relevant systems
        
        return bonuses;
    }

    /**
     * Show the End Dynasty confirmation modal.
     */
    showEndDynastyModal(gameState, dynastyName) {
        const { total: legacyPoints, breakdown } = this.calculateLegacyPoints(gameState);
        
        let breakdownHtml = breakdown.map(b => 
            `<div style="display:flex;justify-content:space-between;padding:4px 0;">
                <span>${b.label}</span>
                <span style="color:#f39c12;">+${b.value} <span style="color:#7f8c8d;font-size:0.85em;">(${b.detail})</span></span>
            </div>`
        ).join('');
        
        const content = `
            <div class="end-dynasty-modal">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:64px;">👑</div>
                    <h3 style="margin:10px 0 5px;color:#ecf0f1;">End the ${dynastyName} Dynasty?</h3>
                    <p style="color:#bdc3c7;margin:0;">Your legacy will live on through the ages...</p>
                </div>
                
                <div style="background:#2c3e50;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <h4 style="color:#f39c12;margin:0 0 12px;border-bottom:1px solid #34495e;padding-bottom:8px;">
                        🏆 Legacy Points Earned: <span style="font-size:1.3em;">${legacyPoints}</span>
                    </h4>
                    ${breakdownHtml}
                </div>
                
                <div style="background:#1a252f;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <h4 style="color:#e74c3c;margin:0 0 10px;">⚠️ What Resets:</h4>
                    <ul style="color:#bdc3c7;margin:0;padding-left:20px;">
                        <li>All buildings and structures</li>
                        <li>Current resources and gold</li>
                        <li>Population and armies</li>
                        <li>Discovered territories</li>
                    </ul>
                </div>
                
                <div style="background:#1a3a2f;border-radius:8px;padding:16px;margin-bottom:20px;">
                    <h4 style="color:#2ecc71;margin:0 0 10px;">✨ What Persists:</h4>
                    <ul style="color:#bdc3c7;margin:0;padding-left:20px;">
                        <li>Legacy points (spend on bonuses)</li>
                        <li>Purchased permanent upgrades</li>
                        <li>Titles and dynasty history</li>
                        <li>Unlocked knowledge (future feature)</li>
                    </ul>
                </div>
                
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button id="confirm-end-dynasty" style="padding:12px 24px;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1em;font-weight:bold;">
                        🔄 End Dynasty & Start Fresh
                    </button>
                    <button id="cancel-end-dynasty" style="padding:12px 24px;background:#34495e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1em;">
                        Continue Ruling
                    </button>
                </div>
            </div>
        `;
        
        if (window.modalSystem?.showModal) {
            window.modalSystem.showModal({
                title: '👑 End Dynasty',
                content: content,
                maxWidth: '550px',
                showCloseButton: false
            });
            
            setTimeout(() => {
                document.getElementById('confirm-end-dynasty')?.addEventListener('click', () => {
                    this.confirmEndDynasty(gameState, dynastyName);
                });
                document.getElementById('cancel-end-dynasty')?.addEventListener('click', () => {
                    window.modalSystem?.closeModal();
                });
            }, 50);
        }
    }

    /**
     * Confirm and execute dynasty end.
     */
    confirmEndDynasty(gameState, dynastyName) {
        // Calculate and save legacy
        const result = this.endDynasty(gameState, dynastyName);
        
        // Close the modal
        window.modalSystem?.closeModal();
        
        // Show success message
        setTimeout(() => {
            if (window.modalSystem?.showModal) {
                window.modalSystem.showModal({
                    title: '🌟 Legacy Secured!',
                    content: `
                        <div style="text-align:center;padding:20px;">
                            <div style="font-size:64px;margin-bottom:16px;">🏛️</div>
                            <h3 style="color:#f39c12;margin-bottom:16px;">
                                +${result.legacyPoints} Legacy Points Earned!
                            </h3>
                            <p style="color:#bdc3c7;margin-bottom:20px;">
                                Total Legacy: ${result.totalLegacy} points<br/>
                                Dynasty #${result.dynastyNumber} Complete
                            </p>
                            <button id="start-new-dynasty" style="padding:14px 28px;background:#27ae60;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.1em;font-weight:bold;">
                                🌱 Start New Dynasty
                            </button>
                        </div>
                    `,
                    maxWidth: '400px',
                    showCloseButton: false
                });
                
                setTimeout(() => {
                    document.getElementById('start-new-dynasty')?.addEventListener('click', () => {
                        // Perform the actual reset
                        if (window.app?.performReset) {
                            window.app.performReset();
                        } else {
                            localStorage.removeItem('idleDynastyBuilder');
                            localStorage.removeItem('dynastyBuilder_save');
                            location.reload();
                        }
                    });
                }, 50);
            }
        }, 300);
    }

    /**
     * Get legacy stats for display.
     */
    getStats() {
        return {
            totalPoints: this.legacy.totalPoints,
            dynastiesCompleted: this.legacy.dynastiesCompleted,
            highestDay: this.legacy.highestDay,
            highestPopulation: this.legacy.highestPopulation,
            titles: this.legacy.titles,
            bonuses: this.legacy.bonuses,
            history: this.legacy.dynastyHistory.slice(-10) // Last 10 dynasties
        };
    }
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.LegacySystem = LegacySystem;
    window.legacySystem = new LegacySystem();
    console.log('[Legacy] Legacy system ready');
}

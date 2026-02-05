/**
 * effectsManager.js - Village Effects Management System
 * 
 * Manages temporary and permanent effects that influence village operations:
 * - Haste Rune: Building efficiency boost
 * - Weather Effects: Environmental impacts
 * - Other magical/technological effects
 */

class EffectsManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.activeEffects = new Map(); // effectId -> effect data
        this.effectTypes = this.initializeEffectTypes();

        console.log('[EffectsManager] Effects management system initialized');
    }

    initializeEffectTypes() {
        return {
            weather_sunny: {
                name: 'Sunny Weather',
                description: 'Clear skies boost outdoor work efficiency',
                icon: '☀️',
                category: 'weather',
                maxStacks: 1,
                effects: {
                    farmEfficiency: 1.2,
                    quarryEfficiency: 1.1
                }
            },
            weather_rainy: {
                name: 'Rainy Weather',
                description: 'Rain slows outdoor work but helps farms',
                icon: '🌧️',
                category: 'weather',
                maxStacks: 1,
                effects: {
                    farmEfficiency: 1.3,
                    quarryEfficiency: 0.8,
                    woodcutterLodgeEfficiency: 0.9
                }
            },
            weather_stormy: {
                name: 'Stormy Weather',
                description: 'Severe weather significantly impacts all outdoor work',
                icon: '⛈️',
                category: 'weather',
                maxStacks: 1,
                effects: {
                    farmEfficiency: 0.7,
                    quarryEfficiency: 0.6,
                    woodcutterLodgeEfficiency: 0.7
                }
            }
        };
    }

    // Apply a new effect
    applyEffect(effectType, duration = 10, customData = {}) {
        if (!this.effectTypes[effectType]) {
            console.warn(`[EffectsManager] Unknown effect type: ${effectType}`);
            return false;
        }

        const effectConfig = this.effectTypes[effectType];
        const effectId = `${effectType}_${Date.now()}`;

        // Check if effect type already exists and handle stacking
        const existingEffect = this.getActiveEffectByType(effectType);
        if (existingEffect && effectConfig.maxStacks === 1) {
            // Replace existing effect of same type
            this.removeEffect(existingEffect.id);
        }

        const effect = {
            id: effectId,
            type: effectType,
            name: effectConfig.name,
            description: effectConfig.description,
            icon: effectConfig.icon,
            category: effectConfig.category,
            effects: { ...effectConfig.effects, ...customData.effects },
            startDay: this.gameState.day,
            duration: duration,
            endDay: this.gameState.day + duration,
            ...customData
        };

        this.activeEffects.set(effectId, effect);

        console.log(`[EffectsManager] Applied effect: ${effect.name} (Duration: ${duration} days)`);

        // Emit event for UI updates
        if (window.eventBus) {
            window.eventBus.emit('effect_applied', effect);
        }

        // Update building efficiency if this effect affects it
        this.updateBuildingEfficiency();

        return effectId;
    }

    // Add a custom effect directly
    addEffect(effect) {
        if (!effect.id) {
            effect.id = `${effect.type}_${Date.now()}`;
        }

        // Normalize timing and metadata so custom effects render/expire correctly
        const currentDay = (this.gameState && (typeof this.gameState.day === 'number' ? this.gameState.day : this.gameState.currentDay)) || 1;
        if (typeof effect.startDay !== 'number') {
            effect.startDay = currentDay;
        }
        if (typeof effect.duration !== 'number') {
            // Default to 10 days if not provided
            effect.duration = 10;
        }
        if (typeof effect.endDay !== 'number') {
            effect.endDay = effect.startDay + effect.duration;
        }
        if (!effect.name) {
            effect.name = (this.effectTypes[effect.type]?.name) || effect.type;
        }
        if (!effect.icon) {
            effect.icon = (this.effectTypes[effect.type]?.icon) || '✨';
        }
        if (!effect.category) {
            // Classify known custom types; default to 'magical' for runes
            effect.category = effect.type && effect.type.includes('rune') ? 'magical' : (this.effectTypes[effect.type]?.category || 'misc');
        }

        this.activeEffects.set(effect.id, effect);

        console.log(`[EffectsManager] Added custom effect: ${effect.name}`);

        // Emit event for UI updates
        if (window.eventBus) {
            window.eventBus.emit('effect_applied', effect);
        }

        // Update building efficiency if this effect affects it
        this.updateBuildingEfficiency();

        return effect.id;
    }

    // Remove an effect
    removeEffect(effectId) {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return false;

        this.activeEffects.delete(effectId);

        console.log(`[EffectsManager] Removed effect: ${effect.name}`);

        // Emit event for UI updates
        if (window.eventBus) {
            window.eventBus.emit('effect_removed', effect);
        }

        // Update building efficiency after removal
        this.updateBuildingEfficiency();

        return true;
    }

    // Get active effect by type
    getActiveEffectByType(effectType) {
        for (const [id, effect] of this.activeEffects) {
            if (effect.type === effectType) {
                return effect;
            }
        }
        return null;
    }

    // Get all active effects
    getActiveEffects() {
        return Array.from(this.activeEffects.values());
    }

    // Get effects by category
    getEffectsByCategory(category) {
        return this.getActiveEffects().filter(effect => effect.category === category);
    }

    // Update effects each day (called by game loop)
    updateDaily() {
        const currentDay = this.gameState.day;
        const expiredEffects = [];

        // Check for expired effects
        for (const [id, effect] of this.activeEffects) {
            if (effect.endDay <= currentDay) {
                expiredEffects.push(id);
            }
        }

        // Remove expired effects
        expiredEffects.forEach(id => {
            const effect = this.activeEffects.get(id);
            console.log(`[EffectsManager] Effect expired: ${effect.name}`);
            this.removeEffect(id);
        });

        // Emit daily update event
        if (window.eventBus && this.activeEffects.size > 0) {
            window.eventBus.emit('effects_daily_update', {
                activeEffects: this.getActiveEffects(),
                expiredCount: expiredEffects.length
            });
        }
    }

    // Calculate total efficiency multiplier for a building (type + optional specific buildingId)
    getBuildingEfficiencyMultiplier(buildingType, buildingId = null) {
        let multiplier = 1.0;

        for (const effect of this.getActiveEffects()) {
            const efx = effect.effects || {};

            // 1) Global building efficiency
            if (efx.buildingEfficiency) {
                multiplier *= efx.buildingEfficiency;
            }

            // 2) Specific building type efficiency (e.g., farmEfficiency)
            const specificEfficiency = efx[`${buildingType}Efficiency`];
            if (specificEfficiency) {
                multiplier *= specificEfficiency;
            }
        }

        return multiplier;
    }

    // Update building efficiency for all buildings
    updateBuildingEfficiency() {
        if (!this.gameState.buildings) return;

        // Notify buildings of efficiency changes
        this.gameState.buildings.forEach(building => {
            const multiplier = this.getBuildingEfficiencyMultiplier(building.type, building.id);

            // Store the efficiency multiplier on the building
            building.efficiencyMultiplier = multiplier;
        });

        // Emit event for UI updates
        if (window.eventBus) {
            window.eventBus.emit('building_efficiency_updated', {
                buildings: this.gameState.buildings.length
            });
        }
    }

    // Apply weather effect
    applyWeatherEffect(weatherType, duration = 3) {
        const effectType = `weather_${weatherType}`;
        return this.applyEffect(effectType, duration);
    }

    // Get remaining days for an effect
    getEffectRemainingDays(effectId) {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return 0;
        const now = (typeof this.gameState.day === 'number') ? this.gameState.day : (this.gameState.currentDay || 1);
        const remaining = (typeof effect.endDay === 'number') ? (effect.endDay - now) : (typeof effect.duration === 'number' ? (effect.startDay + effect.duration - now) : 0);
        return Math.max(0, remaining);
    }

    // Get effect summary for UI
    getEffectSummary() {
        const effects = this.getActiveEffects();
        const summary = {
            total: effects.length,
            magical: effects.filter(e => e.category === 'magical').length,
            weather: effects.filter(e => e.category === 'weather').length,
            buildingEfficiency: this.getBuildingEfficiencyMultiplier('general'),
            activeEffects: effects.map(effect => ({
                id: effect.id,
                name: effect.name,
                icon: effect.icon,
                remainingDays: this.getEffectRemainingDays(effect.id),
                category: effect.category
            }))
        };

        return summary;
    }

    // Save effects to storage
    serialize() {
        const effectsData = [];
        for (const [id, effect] of this.activeEffects) {
            effectsData.push({
                id: effect.id,
                type: effect.type,
                startDay: effect.startDay,
                duration: effect.duration,
                endDay: effect.endDay,
                customData: {
                    effects: effect.effects !== this.effectTypes[effect.type]?.effects ? effect.effects : undefined
                }
            });
        }
        return effectsData;
    }

    // Load effects from storage
    deserialize(data) {
        if (!Array.isArray(data)) return;

        this.activeEffects.clear();

        data.forEach(savedEffect => {
            if (this.effectTypes[savedEffect.type]) {
                const effectConfig = this.effectTypes[savedEffect.type];
                const effect = {
                    id: savedEffect.id,
                    type: savedEffect.type,
                    name: effectConfig.name,
                    description: effectConfig.description,
                    icon: effectConfig.icon,
                    category: effectConfig.category,
                    effects: savedEffect.customData?.effects || effectConfig.effects,
                    startDay: savedEffect.startDay,
                    duration: savedEffect.duration,
                    endDay: savedEffect.endDay
                };

                this.activeEffects.set(savedEffect.id, effect);
            }
        });

        // Update building efficiency after loading
        this.updateBuildingEfficiency();

        console.log(`[EffectsManager] Loaded ${this.activeEffects.size} effects from save data`);
    }

    // Debug methods
    listActiveEffects() {
        console.log('[EffectsManager] Active effects:');
        for (const effect of this.getActiveEffects()) {
            const remaining = this.getEffectRemainingDays(effect.id);
            console.log(`  ${effect.icon} ${effect.name} - ${remaining} days remaining`);
        }
    }

    // Debug a building's efficiency multiplier and contributing effects
    debugBuildingEfficiency(buildingType, buildingId = null) {
        let multiplier = 1.0;
        console.log(`[EffectsManager] Debug efficiency for ${buildingType}${buildingId != null ? ` (#${buildingId})` : ''}`);
        for (const effect of this.getActiveEffects()) {
            const efx = effect.effects || {};
            let applied = false;
            let appliedMult = 1.0;

            // Global building efficiency
            if (efx.buildingEfficiency) {
                applied = true;
                appliedMult *= efx.buildingEfficiency;
            }
            // Specific building type efficiency
            const specific = efx[`${buildingType}Efficiency`];
            if (specific) {
                applied = true;
                appliedMult *= specific;
            }

            if (applied && appliedMult !== 1.0) {
                console.log(`  • ${effect.icon} ${effect.name}: x${appliedMult.toFixed(2)} (${effect.id})`);
                multiplier *= appliedMult;
            }
        }
        console.log(`=> Total multiplier: x${multiplier.toFixed(2)}`);
        return multiplier;
    }

    // Console debug commands
    static setupDebugCommands() {
        if (window.effectsManager) {
            window.applyWeather = (type = 'sunny', duration = 3) => window.effectsManager.applyWeatherEffect(type, duration);
            window.listEffects = () => window.effectsManager.listActiveEffects();
            window.debugBuildingEfficiency = (type, id) => window.effectsManager.debugBuildingEfficiency(type, id);
            window.clearAllEffects = () => {
                window.effectsManager.activeEffects.clear();
                window.effectsManager.updateBuildingEfficiency();
                console.log('[EffectsManager] All effects cleared');
            };
            console.log('[EffectsManager] Debug commands: applyWeather(), listEffects(), debugBuildingEfficiency(type, id), clearAllEffects()');
        }
    }
}

// Export to window for global access
if (typeof window !== 'undefined') {
    window.EffectsManager = EffectsManager;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.gameState && !window.effectsManager) {
            window.effectsManager = new EffectsManager(window.gameState);
            EffectsManager.setupDebugCommands();
        }
    }, 500);
});

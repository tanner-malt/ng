/**
 * eventBusIntegrations.js - Event Bus Integration Layer
 * 
 * Coordinates events between different game systems and managers.
 * Provides centralized event handling for cross-system communication.
 */

// Event Bus Integration System
class EventBusIntegrations {
    constructor() {
        this.setupEventListeners();
        console.log('[EventBusIntegrations] Event integrations initialized');
    }

    setupEventListeners() {
        if (!window.eventBus) {
            console.warn('[EventBusIntegrations] EventBus not available');
            return;
        }

        // Resource update events
        window.eventBus.on('resources-updated', () => {
            this.handleResourceUpdate();
        });

        // Population update events
        window.eventBus.on('population-changed', (data) => {
            this.handlePopulationUpdate(data);
        });

        // Building events
        window.eventBus.on('building_placed', (data) => {
            this.handleBuildingPlaced(data);
        });

        // Achievement events
        window.eventBus.on('achievement-unlocked', (data) => {
            this.handleAchievementUnlocked(data);
        });

        // Tutorial events
        window.eventBus.on('tutorial-step-completed', (data) => {
            this.handleTutorialStep(data);
        });

        // UI update events
        window.eventBus.on('ui-update-needed', () => {
            this.handleUIUpdate();
        });

        console.log('[EventBusIntegrations] Event listeners registered');
    }

    handleResourceUpdate() {
        // Update UI displays
        if (window.gameState && window.villageManager) {
            window.villageManager.updateResourceDisplay();
        }

        // Also update the main game UI to keep displays in sync
        if (window.gameState) {
            window.gameState.updateUI();
        }

        // Note: Achievement checking is now handled by specific event listeners in app.js
        // to avoid circular loops when achievements grant resources

        // Update message history icon (in case of unread messages)
        if (window.messageHistory) {
            window.messageHistory.updateIcon();
        }
        
        // Note: Autosave handles periodic saving, no need to save on every resource update
    }

    handlePopulationUpdate(data) {
        console.log('[EventBusIntegrations] Population update event received:', data);
        
        // Update population-specific displays
        if (window.gameState) {
            // Ensure gameState population count is in sync with population manager
            if (data && (data.type === 'added' || data.type === 'deaths')) {
                window.gameState.updatePopulationCount();
            }
            
            window.gameState.updateVillageManagerDisplay();
            
            // Update the main UI as well for consistency
            window.gameState.updateUI();
        }

        // Update village manager display if available
        if (window.villageManager) {
            window.villageManager.updateResourceDisplay();
        }
        
        console.log('[EventBusIntegrations] Population displays updated');
    }

    handleBuildingPlaced(data) {
        console.log('[EventBusIntegrations] Building placed:', data);
        
        // Show toast notification with proper emojis
        if (window.showToast && data.type) {
            const buildingInfo = {
                'townCenter': { name: 'Town Center', emoji: '🏛️' },
                'house': { name: 'House', emoji: '🏠' },
                'farm': { name: 'Farm', emoji: '🌾' },
                'barracks': { name: 'Barracks', emoji: '⚔️' },
                'workshop': { name: 'Workshop', emoji: '🔧' }
            };
            
            const building = buildingInfo[data.type] || { name: data.type, emoji: '🏗️' };
            window.showToast(`${building.name} construction started!`, {
                icon: building.emoji,
                type: 'success',
                timeout: 3000
            });
        }
        
        // Add message to history
        if (window.messageHistory && data.type) {
            const buildingNames = {
                'townCenter': 'Town Center',
                'house': 'House',
                'farm': 'Farm',
                'barracks': 'Barracks',
                'workshop': 'Workshop'
            };
            const buildingName = buildingNames[data.type] || data.type;
            
            window.messageHistory.addMessage(
                `${buildingName} Constructed`,
                `A new ${buildingName} has been built in your settlement.`,
                'info'
            );
        }

        // Note: Achievement checking is now handled by specific event listeners in app.js
        // to avoid circular loops when achievements grant resources
    }

    handleAchievementUnlocked(data) {
        console.log('[EventBusIntegrations] Achievement unlocked:', data);
        
        // Emit UI update
        window.eventBus.emit('ui-update-needed');
    }

    handleTutorialStep(data) {
        console.log('[EventBusIntegrations] Tutorial step completed:', data);
        
        // Could trigger specific events based on tutorial progress
        if (data.stepId === 'dynasty_name') {
            window.eventBus.emit('dynasty-founded', { name: data.dynastyName });
        }
    }

    handleUIUpdate() {
        // Update various UI elements that might need refreshing
        if (window.messageHistory) {
            window.messageHistory.updateIcon();
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.eventBusIntegrations = new EventBusIntegrations();
    });
} else {
    window.eventBusIntegrations = new EventBusIntegrations();
}

console.log('[EventBusIntegrations] Event bus integrations ready');

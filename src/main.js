/**
 * main.js - Main Game Entry Point
 * 
 * Final initialization and game startup coordination.
 * Ensures all systems are properly initialized and started.
 */

// Main game initialization function
function initializeGame() {
    console.log('[Main] Starting game initialization...');

    try {
        // Check if essential systems are available
        const requiredSystems = [
            'eventBus',
            'gameState', 
            'simpleModal',
            'showModal'
        ];

        let missingSystem = false;
        requiredSystems.forEach(system => {
            if (!window[system]) {
                console.error(`[Main] Required system missing: ${system}`);
                missingSystem = true;
            }
        });

        if (missingSystem) {
            console.error('[Main] Cannot start game - missing required systems');
            return;
        }

        // Initialize message history if available
        if (window.MessageHistory && !window.messageHistory) {
            try {
                window.messageHistory = new window.MessageHistory();
                console.log('[Main] Message history initialized');
            } catch (error) {
                console.error('[Main] Failed to initialize message history:', error);
            }
        }

        // Initialize achievement system if available
        if (window.AchievementSystem && !window.achievementSystem) {
            try {
                window.achievementSystem = new window.AchievementSystem();
                window.achievementSystem.startPeriodicCheck();
                console.log('[Main] Achievement system initialized');
            } catch (error) {
                console.error('[Main] Failed to initialize achievement system:', error);
            }
        }

        // Initialize tutorial system if available and not already initialized by app.js
        if (window.SimpleTutorial && !window.tutorialSystem && !window.game) {
            try {
                // Create a minimal game object for tutorial
                const gameObj = {
                    gameState: window.gameState,
                    tutorialActive: false
                };
                window.tutorialSystem = new window.SimpleTutorial(gameObj);
                console.log('[Main] Tutorial system initialized (standalone)');
            } catch (error) {
                console.error('[Main] Failed to initialize tutorial system:', error);
            }
        } else if (window.game && window.game.tutorialManager) {
            // Tutorial system is handled by app.js
            console.log('[Main] Tutorial system managed by app.js');
        }

        // Auto-start tutorial for new players (if not on game.html)
        if (window.tutorialSystem && !localStorage.getItem('tutorialCompleted')) {
            const currentPage = window.location.pathname;
            if (!currentPage.includes('game.html')) {
                console.log('[Main] New player detected, tutorial available');
                // Don't auto-start on debug page, let user manually trigger
            }
        }

        // Set up global error handler
        window.addEventListener('error', (event) => {
            console.error('[Main] Global error:', event.error);
            if (window.messageHistory) {
                window.messageHistory.addMessage(
                    'System Error',
                    `An error occurred: ${event.error?.message || 'Unknown error'}`,
                    'warning'
                );
            }
        });

        // Set up unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Main] Unhandled promise rejection:', event.reason);
            if (window.messageHistory) {
                window.messageHistory.addMessage(
                    'System Warning',
                    `Promise rejection: ${event.reason?.message || 'Unknown rejection'}`,
                    'warning'
                );
            }
        });

        console.log('[Main] Game initialization complete');

        // Emit initialization complete event
        if (window.eventBus) {
            window.eventBus.emit('game-initialized');
        }

    } catch (error) {
        console.error('[Main] Critical error during game initialization:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Global utility functions
window.gameUtils = {
    // Safe way to check if a system is available and ready
    isSystemReady: (systemName) => {
        return window[systemName] && typeof window[systemName] === 'object';
    },

    // Safe way to emit events
    emitEvent: (eventName, data = null) => {
        if (window.eventBus && window.eventBus.emit) {
            window.eventBus.emit(eventName, data);
            return true;
        }
        return false;
    },

    // Safe way to show modals
    showModal: (title, content, options = {}) => {
        if (window.showModal) {
            return window.showModal(title, content, options);
        } else {
            console.warn('[GameUtils] Modal system not available');
            alert(`${title}: ${content}`);
            return Promise.resolve(true);
        }
    },

    // Get system status for debugging
    getSystemStatus: () => {
        const systems = [
            'eventBus',
            'gameState',
            'simpleModal',
            'messageHistory',
            'achievementSystem',
            'tutorialSystem',
            'showModal'
        ];

        const status = {};
        systems.forEach(system => {
            status[system] = window[system] ? 'ready' : 'not available';
        });

        return status;
    }
};

console.log('[Main] Main game module loaded');

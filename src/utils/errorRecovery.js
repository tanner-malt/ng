/**
 * errorRecovery.js - Automatic Error Recovery System
 * 
 * This system provides automatic detection and recovery from common game errors,
 * ensuring the game maintains a "well suited" state even when problems occur.
 * 
 * Recovery Strategies:
 * - State validation and correction
 * - Automatic fallbacks to safe defaults
 * - System restart capabilities
 * - User notification for manual intervention
 */

class ErrorRecovery {
    constructor() {
        this.recoveryStrategies = new Map();
        this.recoveryAttempts = new Map();
        this.maxRecoveryAttempts = 3;
        this.isEnabled = true;
        
        this.initializeDefaultStrategies();
        this.setupErrorHandlers();
        
        console.log('[ErrorRecovery] Error recovery system initialized');
    }

    /**
     * Register a recovery strategy for a specific error type
     */
    registerStrategy(errorType, strategyFn, options = {}) {
        this.recoveryStrategies.set(errorType, {
            recover: strategyFn,
            maxAttempts: options.maxAttempts || this.maxRecoveryAttempts,
            autoRecover: options.autoRecover !== false,
            description: options.description || `Recovery for ${errorType}`
        });
        
        console.log(`[ErrorRecovery] Registered strategy for: ${errorType}`);
    }

    /**
     * Attempt to recover from an error
     */
    async attemptRecovery(errorType, error, context = {}) {
        if (!this.isEnabled) {
            console.log('[ErrorRecovery] Recovery disabled, skipping');
            return false;
        }

        const strategy = this.recoveryStrategies.get(errorType);
        if (!strategy) {
            console.warn(`[ErrorRecovery] No recovery strategy for: ${errorType}`);
            return false;
        }

        const attemptKey = `${errorType}_${Date.now()}`;
        const currentAttempts = this.recoveryAttempts.get(errorType) || 0;

        if (currentAttempts >= strategy.maxAttempts) {
            console.error(`[ErrorRecovery] Max recovery attempts exceeded for: ${errorType}`);
            this.notifyUser('Critical Error', `Unable to recover from ${errorType}. Manual intervention required.`);
            return false;
        }

        this.recoveryAttempts.set(errorType, currentAttempts + 1);

        try {
            console.log(`[ErrorRecovery] Attempting recovery for: ${errorType} (attempt ${currentAttempts + 1})`);
            
            const result = await strategy.recover(error, context);
            
            if (result.success) {
                console.log(`[ErrorRecovery] Successfully recovered from: ${errorType}`);
                this.recoveryAttempts.delete(errorType);
                
                if (result.message) {
                    this.notifyUser('Auto-Recovery', result.message);
                }
                
                return true;
            } else {
                console.warn(`[ErrorRecovery] Recovery failed for: ${errorType} - ${result.message}`);
                return false;
            }
        } catch (recoveryError) {
            console.error(`[ErrorRecovery] Recovery strategy failed for: ${errorType}`, recoveryError);
            return false;
        }
    }

    /**
     * Initialize default recovery strategies
     */
    initializeDefaultStrategies() {
        // GameState corruption recovery
        this.registerStrategy('gamestate_corruption', async (error, context) => {
            try {
                const backup = localStorage.getItem('gamestate_backup');
                if (backup) {
                    const backupState = JSON.parse(backup);
                    Object.assign(window.gameState, backupState);
                    window.gameState.save();
                    
                    return {
                        success: true,
                        message: 'Game state restored from backup'
                    };
                }
                
                // Fall back to default state
                window.gameState.reset();
                return {
                    success: true,
                    message: 'Game state reset to defaults'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Unable to recover game state'
                };
            }
        }, { description: 'Restore game state from backup or reset to defaults' });

        // Tutorial state recovery
        this.registerStrategy('tutorial_error', async (error, context) => {
            try {
                if (window.simpleTutorial) {
                    window.simpleTutorial.reset();
                    
                    // If tutorial was active, restart it
                    if (context.wasActive) {
                        setTimeout(() => {
                            window.simpleTutorial.start();
                        }, 1000);
                    }
                    
                    return {
                        success: true,
                        message: 'Tutorial system reset'
                    };
                }
                
                return {
                    success: false,
                    message: 'Tutorial system not available'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Failed to reset tutorial'
                };
            }
        });

        // EventBus recovery
        this.registerStrategy('eventbus_error', async (error, context) => {
            try {
                if (window.eventBus) {
                    // Clear potentially corrupted event listeners
                    window.eventBus.clearAll();
                    
                    // Trigger system reinitialization
                    if (window.eventBus.emit) {
                        window.eventBus.emit('systemRestart', { reason: 'error_recovery' });
                    }
                    
                    return {
                        success: true,
                        message: 'Event system cleared and restarted'
                    };
                }
                
                return {
                    success: false,
                    message: 'EventBus not available'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Failed to restart event system'
                };
            }
        });

        // UI system recovery
        this.registerStrategy('ui_error', async (error, context) => {
            try {
                // Close any open modals
                if (window.simpleModal && window.simpleModal.hide) {
                    window.simpleModal.hide();
                }
                
                // Clear any stuck tutorial highlights
                document.querySelectorAll('.tutorial-highlight').forEach(el => {
                    el.classList.remove('tutorial-highlight');
                });
                
                // Hide tutorial pointer
                const pointer = document.getElementById('tutorial-pointer');
                const overlay = document.getElementById('tutorial-highlight-overlay');
                if (pointer) pointer.style.display = 'none';
                if (overlay) overlay.style.display = 'none';
                
                return {
                    success: true,
                    message: 'UI elements reset'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Failed to reset UI'
                };
            }
        });

        // Resource validation and correction
        this.registerStrategy('resource_error', async (error, context) => {
            try {
                if (window.gameState && window.gameState.resources) {
                    const resources = window.gameState.resources;
                    let corrected = false;
                    
                    // Ensure all resources are valid numbers
                    ['gold', 'food', 'wood', 'stone', 'metal'].forEach(resource => {
                        if (typeof resources[resource] !== 'number' || 
                            isNaN(resources[resource]) || 
                            resources[resource] < 0) {
                            resources[resource] = 0;
                            corrected = true;
                        }
                    });
                    
                    // Ensure population is valid
                    if (typeof window.gameState.population !== 'number' || 
                        window.gameState.population < 1) {
                        window.gameState.population = 1;
                        corrected = true;
                    }
                    
                    if (corrected) {
                        window.gameState.save();
                        
                        // Update UI
                        if (window.eventBus) {
                            window.eventBus.emit('resourcesChanged', resources);
                        }
                        
                        return {
                            success: true,
                            message: 'Resource values corrected'
                        };
                    }
                }
                
                return {
                    success: false,
                    message: 'No resource corrections needed'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Failed to correct resources'
                };
            }
        });
    }

    /**
     * Setup global error handlers
     */
    setupErrorHandlers() {
        // Catch unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('javascript_error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('promise_rejection', event.reason, {
                promise: event.promise
            });
        });

        // Monitor for game-specific errors
        if (window.eventBus) {
            window.eventBus.on('error', (errorData) => {
                this.handleError(errorData.type || 'generic_error', errorData.error, errorData.context);
            });
        }
    }

    /**
     * Handle an error and attempt recovery
     */
    async handleError(errorType, error, context = {}) {
        console.error(`[ErrorRecovery] Handling error: ${errorType}`, error);
        
        // Attempt recovery based on error type
        const recovered = await this.attemptRecovery(errorType, error, context);
        
        if (!recovered) {
            // If specific recovery failed, try generic recovery
            await this.attemptRecovery('generic_error', error, { originalType: errorType, ...context });
        }
    }

    /**
     * Generic error recovery strategy
     */
    initializeGenericRecovery() {
        this.registerStrategy('generic_error', async (error, context) => {
            try {
                // Try to stabilize the game state
                const stabilized = await this.stabilizeGameState();
                
                return {
                    success: stabilized,
                    message: stabilized ? 'Game state stabilized' : 'Unable to stabilize'
                };
            } catch (recoveryError) {
                return {
                    success: false,
                    message: 'Generic recovery failed'
                };
            }
        });
    }

    /**
     * Attempt to stabilize the game state
     */
    async stabilizeGameState() {
        try {
            // Validate and fix game state
            await this.attemptRecovery('resource_error', new Error('Validation check'), {});
            
            // Clear UI issues
            await this.attemptRecovery('ui_error', new Error('UI cleanup'), {});
            
            // Ensure event system is working
            if (window.eventBus && typeof window.eventBus.emit === 'function') {
                window.eventBus.emit('systemStabilized', { timestamp: Date.now() });
            }
            
            return true;
        } catch (error) {
            console.error('[ErrorRecovery] Failed to stabilize game state', error);
            return false;
        }
    }

    /**
     * Notify user of recovery actions
     */
    notifyUser(title, message) {
        // Only print to console, do not show modal or alert
        console.log(`[ErrorRecovery] ${title}: ${message}`);
    }

    /**
     * Enable/disable automatic recovery
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[ErrorRecovery] Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get recovery statistics
     */
    getStats() {
        return {
            strategiesRegistered: this.recoveryStrategies.size,
            activeAttempts: this.recoveryAttempts.size,
            isEnabled: this.isEnabled,
            strategies: Array.from(this.recoveryStrategies.keys())
        };
    }
}

// Initialize error recovery system
const errorRecovery = new ErrorRecovery();
errorRecovery.initializeGenericRecovery();

// Make available globally
if (typeof window !== 'undefined') {
    window.errorRecovery = errorRecovery;
}

console.log('[ErrorRecovery] Error recovery system loaded and monitoring for issues.');

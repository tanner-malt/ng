/**
 * debugTools.js - Comprehensive Debugging and Recovery System
 * 
 * This system provides real-time monitoring, error recovery, and development
 * tools for the Dynasty Builder game. It's designed to help maintain "well suited"
 * states and provide recovery options when things break.
 * 
 * Features:
 * - System health monitoring
 * - Error detection and recovery
 * - State snapshots and restoration
 * - Performance monitoring
 * - Development console commands
 */

class DebugTools {
    constructor() {
        this.healthChecks = new Map();
        this.errorLog = [];
        this.snapshots = [];
        this.isMonitoring = false;
        this.maxSnapshots = 10;
        this.maxErrorLog = 50;
        
        this.initializeConsoleCommands();
        this.startHealthMonitoring();
        
        console.log('[DebugTools] Debug system initialized');
    }

    /**
     * Register a system for health monitoring
     */
    registerSystem(name, healthCheckFn) {
        this.healthChecks.set(name, {
            check: healthCheckFn,
            lastStatus: null,
            lastCheck: null,
            errorCount: 0
        });
        
        console.log(`[DebugTools] Registered system: ${name}`);
    }

    /**
     * Start continuous health monitoring
     */
    startHealthMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, 5000); // Check every 5 seconds
        
        console.log('[DebugTools] Health monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        console.log('[DebugTools] Health monitoring stopped');
    }

    /**
     * Perform health checks on all registered systems
     */
    performHealthChecks() {
        const results = {};
        
        this.healthChecks.forEach((system, name) => {
            try {
                const status = system.check();
                system.lastStatus = status;
                system.lastCheck = Date.now();
                
                if (!status.healthy) {
                    system.errorCount++;
                    this.logError(`System ${name} unhealthy: ${status.message}`, status);
                } else {
                    system.errorCount = Math.max(0, system.errorCount - 1);
                }
                
                results[name] = status;
            } catch (error) {
                system.errorCount++;
                const errorStatus = { healthy: false, message: error.message, error };
                system.lastStatus = errorStatus;
                results[name] = errorStatus;
                
                this.logError(`Health check failed for ${name}`, error);
            }
        });
        
        return results;
    }

    /**
     * Log an error with context
     */
    logError(message, error = null) {
        const errorEntry = {
            timestamp: Date.now(),
            message,
            error,
            stack: error?.stack || new Error().stack
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep error log size manageable
        if (this.errorLog.length > this.maxErrorLog) {
            this.errorLog = this.errorLog.slice(-this.maxErrorLog);
        }
        
        console.error('[DebugTools]', message, error);
    }

    /**
     * Create a state snapshot for recovery
     */
    createSnapshot(name = null) {
        const snapshot = {
            timestamp: Date.now(),
            name: name || `Auto-${Date.now()}`,
            gameState: null,
            systemStates: {}
        };
        
        // Capture game state
        if (window.gameState) {
            try {
                snapshot.gameState = JSON.parse(JSON.stringify(window.gameState));
            } catch (error) {
                this.logError('Failed to capture game state in snapshot', error);
            }
        }
        
        // Capture system states
        this.healthChecks.forEach((system, name) => {
            try {
                if (system.lastStatus) {
                    snapshot.systemStates[name] = JSON.parse(JSON.stringify(system.lastStatus));
                }
            } catch (error) {
                this.logError(`Failed to capture ${name} state in snapshot`, error);
            }
        });
        
        this.snapshots.push(snapshot);
        
        // Keep snapshot count manageable
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(-this.maxSnapshots);
        }
        
        console.log(`[DebugTools] Created snapshot: ${snapshot.name}`);
        return snapshot;
    }

    /**
     * Restore from a snapshot
     */
    restoreSnapshot(snapshotIndex = -1) {
        const snapshot = this.snapshots[snapshotIndex < 0 ? this.snapshots.length + snapshotIndex : snapshotIndex];
        
        if (!snapshot) {
            console.error('[DebugTools] Snapshot not found');
            return false;
        }
        
        try {
            if (snapshot.gameState && window.gameState) {
                Object.assign(window.gameState, snapshot.gameState);
                
                // Trigger save
                if (window.gameState.save) {
                    window.gameState.save();
                }
                
                // Refresh UI
                if (window.eventBus) {
                    window.eventBus.emit('stateRestored', snapshot);
                }
            }
            
            console.log(`[DebugTools] Restored snapshot: ${snapshot.name}`);
            return true;
        } catch (error) {
            this.logError('Failed to restore snapshot', error);
            return false;
        }
    }

    /**
     * Get system health report
     */
    getHealthReport() {
        const report = {
            timestamp: Date.now(),
            overall: 'healthy',
            systems: {},
            errorCount: this.errorLog.length,
            recentErrors: this.errorLog.slice(-5)
        };
        
        let unhealthyCount = 0;
        
        this.healthChecks.forEach((system, name) => {
            const status = system.lastStatus || { healthy: true, message: 'Not checked yet' };
            report.systems[name] = {
                ...status,
                errorCount: system.errorCount,
                lastCheck: system.lastCheck
            };
            
            if (!status.healthy) {
                unhealthyCount++;
            }
        });
        
        if (unhealthyCount > 0) {
            report.overall = unhealthyCount === this.healthChecks.size ? 'critical' : 'degraded';
        }
        
        return report;
    }

    /**
     * Initialize console commands for debugging
     */
    initializeConsoleCommands() {
        // Make debug tools available globally
        window.debugTools = this;
        
        // Add helpful console commands
        window.debugCommands = {
            health: () => {
                const report = this.getHealthReport();
                console.table(report.systems);
                return report;
            },
            
            snapshot: (name) => {
                return this.createSnapshot(name);
            },
            
            restore: (index) => {
                return this.restoreSnapshot(index);
            },
            
            listSnapshots: () => {
                console.table(this.snapshots.map((s, i) => ({
                    index: i,
                    name: s.name,
                    timestamp: new Date(s.timestamp).toLocaleString()
                })));
                return this.snapshots;
            },
            
            errors: () => {
                console.table(this.errorLog.slice(-10));
                return this.errorLog;
            },
            
            reset: (systemName) => {
                if (systemName && window[systemName] && window[systemName].reset) {
                    window[systemName].reset();
                    console.log(`[DebugTools] Reset ${systemName}`);
                } else {
                    console.log('[DebugTools] Available systems with reset:', 
                        Object.keys(window).filter(key => 
                            window[key] && typeof window[key].reset === 'function'
                        )
                    );
                }
            },
            
            generatePop: (count = 20) => {
                if (window.gameState && window.gameState.generateMassPopulation) {
                    const generated = window.gameState.generateMassPopulation(count);
                    console.log(`[DebugTools] Generated ${count} villagers. Total population: ${window.gameState.population}`);
                    return generated;
                } else {
                    console.error('[DebugTools] GameState or generateMassPopulation not available');
                    return null;
                }
            },

            agePopulation: (days = 1) => {
                if (window.gameState && window.gameState.populationManager) {
                    const before = window.gameState.populationManager.getAll().length;
                    let totalDeaths = 0;
                    
                    for (let i = 0; i < days; i++) {
                        const result = window.gameState.populationManager.processAging();
                        totalDeaths += result.deaths;
                    }
                    
                    const after = window.gameState.populationManager.getAll().length;
                    window.gameState.population = after; // Update game state
                    
                    console.log(`[DebugTools] Aged population by ${days} day(s). Deaths: ${totalDeaths}, Population: ${before} -> ${after}`);
                    
                    if (window.gameState.updateResourceDisplay) {
                        window.gameState.updateResourceDisplay();
                    }
                    
                    return { daysPassed: days, deaths: totalDeaths, beforePop: before, afterPop: after };
                } else {
                    console.error('[DebugTools] PopulationManager not available');
                    return null;
                }
            },

            ageVillager: (villagerId, newAge) => {
                if (window.gameState && window.gameState.populationManager) {
                    const villager = window.gameState.populationManager.getInhabitant(villagerId);
                    if (villager) {
                        const oldAge = villager.age;
                        villager.age = newAge;
                        console.log(`[DebugTools] ${villager.name} aged from ${oldAge} to ${newAge} days`);
                        return villager;
                    } else {
                        console.error(`[DebugTools] Villager with ID ${villagerId} not found`);
                        return null;
                    }
                } else {
                    console.error('[DebugTools] PopulationManager not available');
                    return null;
                }
            },

            showPopGroups: () => {
                if (window.gameState && window.gameState.populationManager) {
                    const groups = window.gameState.populationManager.getPopulationGroups();
                    console.log('[DebugTools] Population Groups:');
                    console.log('Age Groups:', groups.ageGroups);
                    console.log('Job Groups:', groups.jobGroups);
                    console.log('Demographics:', groups.demographics);
                    return groups;
                } else {
                    console.error('[DebugTools] PopulationManager not available');
                    return null;
                }
            },

            createElders: (count = 5) => {
                if (window.gameState && window.gameState.populationManager) {
                    const before = window.gameState.populationManager.getAll().length;
                    
                    for (let i = 0; i < count; i++) {
                        window.gameState.populationManager.addInhabitant({ 
                            age: 180 + Math.floor(Math.random() * 15), // Age 180-194, close to death
                            status: 'idle' 
                        });
                    }
                    
                    const after = window.gameState.populationManager.getAll().length;
                    window.gameState.population = after;
                    
                    console.log(`[DebugTools] Created ${count} elderly villagers (age 180-194). Population: ${before} -> ${after}`);
                    
                    if (window.gameState.updateResourceDisplay) {
                        window.gameState.updateResourceDisplay();
                    }
                    
                    return { created: count, beforePop: before, afterPop: after };
                } else {
                    console.error('[DebugTools] PopulationManager not available');
                    return null;
                }
            },
            
            help: () => {
                console.log(`
🔧 Dynasty Builder Debug Commands:
  debugCommands.health()             - Check system health
  debugCommands.snapshot(name)       - Create state snapshot
  debugCommands.restore(index)       - Restore from snapshot
  debugCommands.listSnapshots()      - List all snapshots
  debugCommands.errors()             - Show recent errors
  debugCommands.reset(systemName)    - Reset specific system
  debugCommands.generatePop(count)   - Generate population (default: 20)
  debugCommands.agePopulation(days)  - Age all villagers by X days
  debugCommands.ageVillager(id, age) - Set specific villager's age
  debugCommands.showPopGroups()      - Show population groups breakdown
  debugCommands.createElders(count)  - Create elderly villagers (default: 5)
  debugCommands.help()               - Show this help
                `);
            }
        };
        
        console.log('[DebugTools] Console commands available via debugCommands.*');
    }

    /**
     * Register default system health checks
     */
    registerDefaultHealthChecks() {
        // EventBus health check
        if (window.eventBus) {
            this.registerSystem('EventBus', () => ({
                healthy: true,
                message: `${window.eventBus.getEvents().length} events registered`,
                eventCount: window.eventBus.getEvents().length
            }));
        }
        
        // GameState health check
        if (window.gameState) {
            this.registerSystem('GameState', () => {
                try {
                    const state = window.gameState;
                    const healthy = state.resources && typeof state.resources.gold === 'number';
                    
                    return {
                        healthy,
                        message: healthy ? 'State valid' : 'State corrupted',
                        resources: state.resources,
                        lastSave: state.lastSaveTime || 'never'
                    };
                } catch (error) {
                    return {
                        healthy: false,
                        message: 'GameState check failed',
                        error: error.message
                    };
                }
            });
        }
        
        // Tutorial health check
        if (window.simpleTutorial) {
            this.registerSystem('Tutorial', () => ({
                healthy: true,
                message: `Step ${window.simpleTutorial.currentStep}/${window.simpleTutorial.steps.length}`,
                currentStep: window.simpleTutorial.currentStep,
                isActive: window.simpleTutorial.isActive
            }));
        }
    }
}

// Initialize debug tools
const debugTools = new DebugTools();

// Auto-register systems when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        debugTools.registerDefaultHealthChecks();
        debugTools.createSnapshot('Initial State');
        console.log('[DebugTools] Default systems registered and initial snapshot created');
    }, 1000);
});

// Export for module systems
if (typeof window !== 'undefined') {
    window.debugTools = debugTools;
}

console.log('[DebugTools] Debug tools loaded. Type debugCommands.help() for available commands.');

/**
 * storageManager.js - Centralized localStorage Management
 * 
 * Single source of truth for all game storage keys.
 * Provides reliable hard reset that clears ALL game data.
 * 
 * Usage:
 * - StorageManager.get('achievements') - Get parsed data
 * - StorageManager.set('achievements', data) - Set data
 * - StorageManager.hardReset() - Clear ALL game data
 * - StorageManager.isHardResetInProgress() - Check if reset is happening
 */

const StorageManager = {
    // All localStorage keys used by the game
    STORAGE_KEYS: [
        // Main save data
        'dynastyBuilder_save',
        'idleDynastyBuilder',
        'gameState',
        
        // Dynasty & Legacy
        'dynastyName',
        'dynastyLegacy',
        
        // Progression systems
        'achievements',
        'unlockSystem',
        
        // Tutorial state
        'tutorialProgress',
        'tutorialComplete',
        'tutorialCompleted', // Alternative key used in some places
        'buildingTutorialState',
        
        // UI state
        'gameSettings',
        'messageHistory',
        
        // Game systems
        'techTreeState',
        'diplomacyState',
        'enemySpawnState',
        'unitManagerState',
        'commanderData',
        'worldMapData',
        
        // Backups
        'gamestate_backup'
    ],

    // Flag to prevent systems from loading during reset
    _hardResetInProgress: false,

    /**
     * Check if a hard reset is currently in progress
     * Systems should check this before loading from storage
     */
    isHardResetInProgress() {
        return this._hardResetInProgress;
    },

    /**
     * Get a value from localStorage, parsed as JSON
     * @param {string} key - The storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Parsed value or default
     */
    get(key, defaultValue = null) {
        if (this._hardResetInProgress) {
            console.log(`[StorageManager] Blocked get('${key}') - hard reset in progress`);
            return defaultValue;
        }
        
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch (error) {
            console.warn(`[StorageManager] Error parsing '${key}':`, error);
            return defaultValue;
        }
    },

    /**
     * Get raw string value from localStorage
     * @param {string} key - The storage key
     * @param {string} defaultValue - Default value if key doesn't exist
     * @returns {string} Raw value or default
     */
    getRaw(key, defaultValue = null) {
        if (this._hardResetInProgress) {
            return defaultValue;
        }
        return localStorage.getItem(key) ?? defaultValue;
    },

    /**
     * Set a value in localStorage as JSON
     * @param {string} key - The storage key
     * @param {*} value - Value to store (will be JSON stringified)
     */
    set(key, value) {
        if (this._hardResetInProgress) {
            console.log(`[StorageManager] Blocked set('${key}') - hard reset in progress`);
            return false;
        }
        
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`[StorageManager] Error saving '${key}':`, error);
            return false;
        }
    },

    /**
     * Set a raw string value in localStorage
     * @param {string} key - The storage key
     * @param {string} value - String value to store
     */
    setRaw(key, value) {
        if (this._hardResetInProgress) {
            return false;
        }
        
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`[StorageManager] Error saving '${key}':`, error);
            return false;
        }
    },

    /**
     * Remove a specific key from localStorage
     * @param {string} key - The storage key to remove
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`[StorageManager] Error removing '${key}':`, error);
            return false;
        }
    },

    /**
     * Perform a complete hard reset of ALL game data
     * This is the nuclear option - clears everything and reloads
     * @param {boolean} reload - Whether to reload the page after reset
     * @returns {boolean} Success status
     */
    hardReset(reload = true) {
        console.log('[StorageManager] ========== HARD RESET INITIATED ==========');
        this._hardResetInProgress = true;
        
        // Also set game's reset flag to prevent any saves during reset
        if (window.game) {
            window.game.isResetting = true;
            console.log('[StorageManager] Set game.isResetting = true');
        }

        try {
            // Step 1: Invalidate all in-memory state
            this._invalidateMemoryState();

            // Step 2: Clear all known keys individually (more reliable than clear())
            console.log('[StorageManager] Clearing all known storage keys...');
            let clearedCount = 0;
            for (const key of this.STORAGE_KEYS) {
                if (localStorage.getItem(key) !== null) {
                    localStorage.removeItem(key);
                    clearedCount++;
                    console.log(`[StorageManager] Removed: ${key}`);
                }
            }

            // Step 3: Also do a full clear to catch any rogue keys
            console.log('[StorageManager] Performing full localStorage.clear()...');
            localStorage.clear();

            // Step 4: Clear sessionStorage too
            console.log('[StorageManager] Clearing sessionStorage...');
            sessionStorage.clear();

            // Step 5: Verify the reset
            const remainingKeys = [];
            for (const key of this.STORAGE_KEYS) {
                if (localStorage.getItem(key) !== null) {
                    remainingKeys.push(key);
                }
            }

            if (remainingKeys.length > 0) {
                console.error('[StorageManager] WARNING: Some keys were not cleared:', remainingKeys);
            } else {
                console.log(`[StorageManager] Successfully cleared ${clearedCount} keys`);
            }

            console.log('[StorageManager] ========== HARD RESET COMPLETE ==========');

            // Step 6: Reload if requested
            if (reload) {
                console.log('[StorageManager] Reloading page...');
                // Small delay to ensure logs are visible
                setTimeout(() => {
                    window.location.href = window.location.origin + window.location.pathname;
                }, 100);
            }

            return true;
        } catch (error) {
            console.error('[StorageManager] Hard reset failed:', error);
            this._hardResetInProgress = false;
            return false;
        }
    },

    /**
     * Invalidate all in-memory game state
     * This ensures systems don't have stale data after reset
     */
    _invalidateMemoryState() {
        console.log('[StorageManager] Invalidating in-memory state...');

        // Clear global game state
        if (window.gameState) {
            window.gameState = null;
        }

        // Clear achievement system
        if (window.achievementSystem) {
            try {
                window.achievementSystem.achievements = {};
                window.achievementSystem.unlockedAchievements = [];
                window.achievementSystem.stats = {};
            } catch (e) { /* ignore */ }
        }

        // Clear unlock system
        if (window.unlockSystem) {
            try {
                window.unlockSystem.unlockedContent = new Set(['townCenter', 'village_view']);
            } catch (e) { /* ignore */ }
        }

        // Clear tutorial system
        if (window.tutorialSystem) {
            try {
                window.tutorialSystem.currentStep = -1;
                window.tutorialSystem.isActive = false;
            } catch (e) { /* ignore */ }
        }

        // Clear message history
        if (window.messageHistory) {
            try {
                window.messageHistory.messages = [];
            } catch (e) { /* ignore */ }
        }

        // Clear legacy system
        if (window.legacySystem) {
            try {
                window.legacySystem.legacyPoints = 0;
                window.legacySystem.bonuses = {};
            } catch (e) { /* ignore */ }
        }

        // Clear world manager
        if (window.worldManager) {
            try {
                window.worldManager.territories = [];
                window.worldManager.expeditions = [];
            } catch (e) { /* ignore */ }
        }

        // Clear unit manager
        if (window.unitManager) {
            try {
                window.unitManager.units = [];
            } catch (e) { /* ignore */ }
        }

        // Clear village manager
        if (window.villageManager) {
            try {
                window.villageManager.buildings = [];
            } catch (e) { /* ignore */ }
        }

        console.log('[StorageManager] In-memory state invalidated');
    },

    /**
     * List all storage keys currently in use
     * Useful for debugging
     */
    debugListKeys() {
        console.log('=== StorageManager Debug ===');
        console.log('Known keys:');
        for (const key of this.STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            const status = value !== null ? `✓ (${value.length} chars)` : '✗';
            console.log(`  ${key}: ${status}`);
        }
        
        // Check for unknown keys
        console.log('\nAll localStorage keys:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const isKnown = this.STORAGE_KEYS.includes(key);
            console.log(`  ${key}: ${isKnown ? 'known' : '⚠️ UNKNOWN'}`);
        }
    },

    /**
     * Get total storage usage in bytes
     */
    getStorageSize() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            total += key.length + (value ? value.length : 0);
        }
        return total;
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

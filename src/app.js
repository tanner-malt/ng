
/**
 * app.js - Main Game Initialization and Coordination
 * 
 * This is the central coordinator for Idle: Dynasty Builder. It initializes all
 * game systems, manages        try {
            // Initialize tutorial manager
            try {
                if (typeof SimpleTutorial !== 'undefined') {
                    this.tutorialManager = new SimpleTutorial(this);
                    console.log('[Game] Simple tutorial manager initialized successfully');
                } else {
                    console.error('[Game] SimpleTutorial class not available');
                    this.tutorialManager = null;
                }
            } catch (tutorialError) {
                console.error('[Game] Failed to initialize SimpleTutorial:', tutorialError);
                this.tutorialManager = null;
            }

            // Initialize message history system
            try {
                if (typeof MessageHistory !== 'undefined') {
                    this.messageHistory = new MessageHistory();
                    window.messageHistory = this.messageHistory; // Global reference
                    console.log('[Game] Message history system initialized');
                } else {
                    console.error('[Game] MessageHistory class not available');
                    this.messageHistory = null;
                }
            } catch (err) {
                console.error('[Game] Failed to initialize MessageHistory:', err);
                this.messageHistory = null;
            }

            // Initialize achievement system
            try {
                if (typeof AchievementSystem !== 'undefined') {
                    this.achievementSystem = new AchievementSystem();
                    window.achievementSystem = this.achievementSystem; // Global reference
                    console.log('[Game] Achievement system initialized');
                    
                    // Start periodic achievement checking
                    this.achievementSystem.startPeriodicCheck();
                } else {
                    console.error('[Game] AchievementSystem class not available');
                    this.achievementSystem = null;
                }
            } catch (err) {
                console.error('[Game] Failed to initialize AchievementSystem:', err);
                this.achievementSystem = null;
            }
        } catch (err) {
            console.error('[Game] Error initializing tutorial manager:', err);
            this.tutorialManager = null;
        }state, and coordinates communication
 * between different game modules.
 * 
 * Key Responsibilities:
 * - Initialize all game managers (Village, Battle, World, etc.)
 * - Set up event listeners and UI interactions
 * - Coordinate tutorial system startup
 * - Manage view switching and navigation
 * - Handle auto-save and game persistence
 * 
 * Architecture:
 * - Game class serves as the main controller
 * - Initializes managers in dependency order
 * - Sets up global window references for debugging
 * - Coordinates tutorial system for new players
 */

// Main application initialization and view management
// Use global TutorialManager for browser compatibility
// tutorial.js must be loaded before app.js in HTML



class Game {
    // Popup/modal logic is now in uiPopups.js
    bindTopRightPopups() {
        if (window.bindTopRightPopups) {
            console.log('[Game] window.bindTopRightPopups exists, calling it');
            window.bindTopRightPopups(this);
        } else {
            console.log('[Game] window.bindTopRightPopups is NOT defined');
        }
    }

    updateProgressPopup() {
        // Update the progression popup icons
        const world = document.getElementById('progress-world');
        const monarch = document.getElementById('progress-monarch');
        const throne = document.getElementById('progress-throne');
        if (world) world.innerHTML = `World: <span>${this.unlockedViews.world ? '✅' : '🔒'}</span>`;
        if (monarch) monarch.innerHTML = `Monarch: <span>${this.unlockedViews.monarch ? '✅' : '🔒'}</span>`;
        if (throne) throne.innerHTML = `Throne: <span>${this.unlockedViews.throne ? '✅' : '🔒'}</span>`;
    }
    updateProgressIcon() {
        // Progress: world, monarch, throne
        const progressBtn = document.getElementById('progress-btn');
        const progressIcon = document.getElementById('progress-icon');
        if (!progressBtn || !progressIcon) return;
        let unlocked = 0;
        if (this.unlockedViews.world) unlocked++;
        if (this.unlockedViews.monarch) unlocked++;
        if (this.unlockedViews.throne) unlocked++;
        if (unlocked === 3) {
            progressBtn.classList.remove('progress-incomplete', 'progress-locked');
            progressBtn.classList.add('progress-complete');
            progressIcon.textContent = '✅';
            progressBtn.title = 'All milestones complete!';
        } else if (unlocked === 0) {
            progressBtn.classList.remove('progress-incomplete', 'progress-complete');
            progressBtn.classList.add('progress-locked');
            progressIcon.textContent = '🔒';
            progressBtn.title = 'No milestones unlocked yet.';
        } else {
            progressBtn.classList.remove('progress-complete', 'progress-locked');
            progressBtn.classList.add('progress-incomplete');
            progressIcon.textContent = '�';
            progressBtn.title = `${unlocked}/3 milestones unlocked.`;
        }
    }
    // Capitalize the first letter of a string
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Stub for overlays (implement UI if needed)
    updateLockedOverlays() {
        // This can be implemented to show/hide overlays for locked views if desired
    }
    constructor() {
        try {
            this.tutorialActive = true;
            this.currentView = 'village';
            this.gameLoopId = null;
            this.gameState = gameState;
            
            // Initialize view unlocking system first
            this.unlockedViews = { village: true, world: false, monarch: false, throne: false };
            
            // EventBus should already be initialized by eventBus.js
            if (!window.eventBus) {
                console.error('[Game] EventBus not available');
            } else {
                console.log('[Game] EventBus available');
            }
            
            // Initialize modal system (needed by tutorial and other systems)
            if (typeof ModalSystem !== 'undefined') {
                this.modalSystem = new ModalSystem();
                console.log('[Game] Modal system initialized');
            } else {
                console.error('[Game] ModalSystem not available');
            }
            
            // Initialize managers with error handling
            try {
                this.villageManager = new VillageManager(this.gameState, this);
                console.log('[Game] VillageManager initialized');
            } catch (err) {
                console.error('[Game] Failed to initialize VillageManager:', err);
                this.villageManager = null;
            }

            try {
                this.battleManager = new BattleManager(this.gameState);
                console.log('[Game] BattleManager initialized');
            } catch (err) {
                console.error('[Game] Failed to initialize BattleManager:', err);
                this.battleManager = null;
            }

            try {
                this.monarchManager = new MonarchManager(this.gameState);
                console.log('[Game] MonarchManager initialized');
            } catch (err) {
                console.error('[Game] Failed to initialize MonarchManager:', err);
                this.monarchManager = null;
            }

            try {
                this.throneManager = new ThroneManager(this.gameState);
                console.log('[Game] ThroneManager initialized');
            } catch (err) {
                console.error('[Game] Failed to initialize ThroneManager:', err);
                this.throneManager = null;
            }

            try {
                if (typeof WorldManager !== 'undefined') {
                    this.worldManager = new WorldManager(this.gameState, this);
                    console.log('[Game] WorldManager initialized');
                } else {
                    console.warn('[Game] WorldManager class not available');
                    this.worldManager = null;
                }
            } catch (err) {
                console.error('[Game] Failed to initialize WorldManager:', err);
                this.worldManager = null;
            }
            
            // Initialize quest manager with error handling
            try {
                if (typeof QuestManager !== 'undefined') {
                    this.questManager = new QuestManager(this.gameState, this);
                    console.log('[Game] QuestManager initialized');
                } else {
                    console.warn('[Game] QuestManager not available, quest functionality disabled');
                    this.questManager = null;
                }
            } catch (err) {
                console.error('[Game] Failed to initialize QuestManager:', err);
                this.questManager = null;
            }
            
            // Initialize tutorial manager
            try {
                if (typeof SimpleTutorial !== 'undefined') {
                    this.tutorialManager = new SimpleTutorial(this);
                    console.log('[Game] SimpleTutorial manager initialized successfully');
                } else {
                    console.error('[Game] SimpleTutorial class not available');
                    this.tutorialManager = null;
                }
            } catch (tutorialError) {
                console.error('[Game] Failed to initialize SimpleTutorial:', tutorialError);
                this.tutorialManager = null;
            }
        } catch (err) {
            console.error('[Game] Constructor error:', err);
            this.tutorialManager = null;
        }
    }

    init() {
        try {
            console.log('[Game] Game.init called');
            // Force tutorial for new users and development testing
            const loadedSuccessfully = this.gameState.load();
            console.log('[Game] Save data loaded:', loadedSuccessfully);
            
            // Always show tutorial during development - comment out for production
            const forceTutorial = true; // Set to false for production
            
            if (loadedSuccessfully && !forceTutorial) {
                this.tutorialActive = false;
                console.log('[Game] Tutorial disabled - save data found');
            } else {
                this.tutorialActive = true;
                console.log('[Game] Tutorial enabled - no save data found or forced tutorial');
                // Clear localStorage to ensure clean tutorial experience
                if (forceTutorial) {
                    localStorage.removeItem('idleDynastyBuilder');
                    localStorage.removeItem('villageDefenseIdleo'); // Legacy key
                }
                
                setTimeout(() => {
                    try {
                        console.log('[Game] Attempting to show tutorial welcome...');
                        console.log('[Game] Tutorial manager available:', !!this.tutorialManager);
                        console.log('[Game] showModal available:', !!window.showModal);
                        
                        if (this.tutorialManager && this.tutorialManager.start) {
                            console.log('[Game] Starting tutorial...');
                            this.tutorialManager.start();
                        } else {
                            console.error('[Game] Tutorial manager not available or invalid');
                        }
                    } catch (err) {
                        console.error('[Game] Tutorial start error:', err);
                    }
                }, 1000); // Give everything time to load
            }
            
            // Initialize managers safely
            if (this.villageManager && this.villageManager.init) {
                this.villageManager.init();
            }
            if (this.battleManager && this.battleManager.init) {
                this.battleManager.init();
            }
            if (this.monarchManager && this.monarchManager.init) {
                this.monarchManager.init();
            }
            if (this.throneManager && this.throneManager.init) {
                this.throneManager.init();
            }
            if (this.worldManager && this.worldManager.init) {
                this.worldManager.init(); // Initialize WorldManager
            }
            
            this.startGameLoop();
            this.setupAutosave();
            this.setupKeyboardShortcuts();
            this.setupAutoPlayButton();
            this.setupMessageHistoryButton();
            this.setupTutorialTestButton();
            
            // Initialize scout progress
            this.gameState.updateScoutProgress();
            
            // Ensure window.game is always set, even if there are errors above
            window.game = this;
            window.gameState = this.gameState;
            window.villageManager = this.villageManager;
            
            console.log('[Game] Game initialization completed successfully');
        } catch (err) {
            console.error('[Game] Error during game initialization:', err);
            
            // Even if there's an error, set window.game so the game is accessible
            window.game = this;
            window.gameState = this.gameState;
            
            // Try to continue with basic functionality
            console.log('[Game] Continuing with partial initialization...');
        }
    }


    setupNavigation() {
        try {
            // ...
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    try {
                        const targetView = btn.dataset.view;
                        if (this.tutorialActive && targetView !== 'village') {
                            this.showTutorialLockMessage(targetView);
                            return;
                        }
                        this.switchView(targetView);
                    } catch (err) {
                        // ...
                    }
                });
            });
            this.updateTabLocks();
        } catch (err) {
            // ...
        }
    }

    updateTabLocks() {
        try {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                const targetView = btn.dataset.view;
                if (!this.unlockedViews[targetView]) {
                    btn.classList.add('locked');
                    btn.textContent = this.capitalize(targetView) + ' (LOCKED)';
                } else {
                    btn.classList.remove('locked');
                    btn.textContent = this.capitalize(targetView);
                }
            });
        } catch (err) {
            // ...
        }
    }

    showTutorialLockMessage(view) {
        // replaced by showUnlockRequirement
        this.tutorialManager.showUnlockRequirement(view);
    }

    // Called when all milestones are complete
    completeTutorial() {
        try {
            this.tutorialActive = false;
            this.updateTabLocks();
            this.updateLockedOverlays();
            // ...
        } catch (err) {
            // ...
        }
    }

    // Called by VillageManager when a milestone is reached
    unlockView(view) {
        if (!this.unlockedViews[view]) {
            this.unlockedViews[view] = true;
            this.updateTabLocks();
            this.updateLockedOverlays();
            this.updateProgressIcon();
        }
        // If all are unlocked, complete tutorial
        if (this.unlockedViews.world && this.unlockedViews.monarch && this.unlockedViews.throne) {
            this.completeTutorial();
        }
    }

    switchView(viewName) {
        try {
            const validViews = ['village', 'world', 'monarch', 'throne'];
            if (!validViews.includes(viewName)) {
                // ...
                return;
            }
            if (!this.unlockedViews[viewName]) {
                this.tutorialManager.showUnlockRequirement(viewName);
                return;
            }
            // Update current view
            this.currentView = viewName;
            
            // Trigger tutorial event for view switching
            if (window.eventBus) {
                window.eventBus.emit('view_switched', { view: viewName });
            }
            
            // Update active tab UI
            document.querySelectorAll('.nav-btn').forEach(btn => {
                if (btn.dataset.view === viewName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            // Call view-specific logic
            this.onViewSwitch(viewName);
        } catch (err) {
            // ...
        }
    }

    onViewSwitch(viewName) {
        try {
            switch (viewName) {
                case 'village':
                    this.villageManager.renderBuildings();
                    this.gameState.updateBuildButtons();
                    break;
                case 'battle':
                    this.battleManager.renderBattleField();
                    break;
                case 'monarch':
                    this.monarchManager.updateInvestmentDisplay();
                    this.monarchManager.generateAdvisorAdvice();
                    break;
                case 'throne':
                    this.throneManager.updateActiveBonuses();
                    break;
            }
            this.updateProgressIcon();
            // ...
        } catch (err) {
            // ...
        }
    }

    startGameLoop() {
        try {
            const gameLoop = () => {
                try {
                    this.gameState.update();
                    if (this.currentView === 'battle' && this.gameState.battleInProgress) {
                        // Battle updates are handled by the battle manager's own timer
                    }
                    this.gameLoopId = requestAnimationFrame(gameLoop);
                } catch (err) {
                    // ...
                }
            };
            gameLoop();
            // ...
        } catch (err) {
            // ...
        }
    }

    stopGameLoop() {
        try {
            if (this.gameLoopId) {
                cancelAnimationFrame(this.gameLoopId);
                this.gameLoopId = null;
                console.log('[Game] Game loop stopped');
            }
        } catch (err) {
            // ...
        }
    }

    setupAutosave() {
        try {
            setInterval(() => {
                try {
                    // Don't autosave if we're resetting
                    if (!this.isResetting) {
                        this.gameState.save();
                    }
                } catch (err) {
                    // ...
                }
            }, 30000);
            window.addEventListener('beforeunload', () => {
                try {
                    // Don't save on unload if we're resetting
                    if (!this.isResetting) {
                        this.gameState.save();
                    }
                } catch (err) {
                    // ...
                }
            });
            // ...
        } catch (err) {
            // ...
        }
    }

    setupKeyboardShortcuts() {
        try {
            document.addEventListener('keydown', (e) => {
                try {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                        return;
                    }
                    switch (e.key) {
                        case '1':
                            this.switchView('village');
                            break;
                        case '2':
                            this.switchView('battle');
                            break;
                        case '3':
                            this.switchView('monarch');
                            break;
                        case '4':
                            this.switchView('throne');
                            break;
                        case 'Escape':
                            if (this.currentView === 'village') {
                                this.villageManager.exitBuildMode();
                            }
                            break;
                        case 's':
                            if (e.ctrlKey) {
                                e.preventDefault();
                                this.gameState.save();
                                this.gameState.logBattleEvent('💾 Game saved manually');
                            }
                            break;
                        case 'b':
                            if (this.currentView === 'battle' && !this.gameState.battleInProgress) {
                                this.battleManager.startBattle();
                            }
                            break;
                        case 't':
                            // Demo: Press 'T' to show a toast notification
                            if (!e.ctrlKey && !e.altKey) {
                                window.showToast('This is a toast notification! 🍞', {
                                    icon: '💬',
                                    type: 'info',
                                    timeout: 3000
                                });
                            }
                            break;
                        case 'm':
                            // Demo: Press 'M' to show a modal dialog
                            if (!e.ctrlKey && !e.altKey) {
                                window.showModal(
                                    'Modal Dialog Example',
                                    'This is a modal dialog that requires your attention. It dominates the screen and must be dismissed before you can continue.',
                                    { type: 'info', icon: '📢' }
                                );
                            }
                            break;
                    }
                } catch (err) {
                    // ...
                }
            });
            // ...
        } catch (err) {
            // ...
        }
    }

    setupAutoPlayButton() {
        try {
            const autoPlayBtn = document.getElementById('auto-play-btn');
            if (autoPlayBtn) {
                autoPlayBtn.addEventListener('click', () => {
                    this.gameState.toggleAutoPlay();
                });
                console.log('[Game] Auto-play button initialized');
            } else {
                console.warn('[Game] Auto-play button not found in DOM');
            }
        } catch (err) {
            console.error('[Game] Error setting up auto-play button:', err);
        }
    }

    setupMessageHistoryButton() {
        try {
            const messageHistoryBtn = document.getElementById('message-history-btn');
            if (messageHistoryBtn) {
                messageHistoryBtn.addEventListener('click', () => {
                    console.log('[Game] Message history button clicked');
                    if (window.messageHistory && window.messageHistory.showHistory) {
                        window.messageHistory.showHistory();
                    } else if (this.messageHistory && this.messageHistory.showHistory) {
                        this.messageHistory.showHistory();
                    } else {
                        console.error('[Game] Message history system not available');
                    }
                });
                console.log('[Game] Message history button initialized');
                
                // Update icon with any unread messages
                if (window.messageHistory) {
                    window.messageHistory.updateIcon();
                } else if (this.messageHistory) {
                    this.messageHistory.updateIcon();
                }
            } else {
                console.warn('[Game] Message history button not found in DOM');
            }
        } catch (err) {
            console.error('[Game] Error setting up message history button:', err);
        }
    }

    setupTutorialTestButton() {
        try {
            const tutorialTestButton = document.getElementById('tutorial-test-btn');
            if (tutorialTestButton) {
                tutorialTestButton.addEventListener('click', () => {
                    console.log('[Game] Tutorial test button clicked');
                    
                    // Try multiple ways to start tutorial
                    if (this.tutorialManager && this.tutorialManager.start) {
                        console.log('[Game] Starting tutorial via this.tutorialManager');
                        this.tutorialActive = true;
                        this.tutorialManager.start();
                    } else if (window.tutorialSystem && window.tutorialSystem.start) {
                        console.log('[Game] Starting tutorial via window.tutorialSystem');
                        window.tutorialSystem.start();
                    } else if (window.SimpleTutorial) {
                        console.log('[Game] Creating new tutorial instance');
                        try {
                            const tutorial = new window.SimpleTutorial(this);
                            tutorial.start();
                        } catch (error) {
                            console.error('[Game] Error creating tutorial:', error);
                        }
                    } else {
                        console.error('[Game] No tutorial system available');
                        window.showModal('Tutorial Not Available', 
                            'The tutorial system is not currently available. Please check the console for errors.', 
                            { icon: '❌' });
                    }
                });
                console.log('[Game] Tutorial test button initialized');
            } else {
                console.warn('[Game] Tutorial test button not found');
            }
        } catch (err) {
            console.error('[Game] Error setting up tutorial test button:', err);
        }
    }

    resetGame() {
        try {
            if (confirm('Are you sure you want to reset the game? This cannot be undone.')) {
                // Set a flag to prevent autosave during reset
                this.isResetting = true;
                
                // Clear all localStorage data
                localStorage.clear();
                
                // Reset game state to initial values
                this.gameState.resetToDefaults();
                
                // Clear any visual elements
                this.clearGameUI();
                
                // Reset tutorial state
                this.tutorialActive = true;
                
                // Reload the page after a short delay to ensure everything is cleared
                setTimeout(() => {
                    location.reload();
                }, 100);
            }
        } catch (err) {
            // ...
        }
    }

    clearGameUI() {
        try {
            // Clear village buildings visual
            if (this.villageManager && this.villageManager.villageGrid) {
                const buildingElements = this.villageManager.villageGrid.querySelectorAll('.building, .building-site');
                buildingElements.forEach(el => el.remove());
            }
            
            // Reset UI displays
            this.gameState.updateUI();
            
            // Clear any active notifications
            const toasts = document.querySelectorAll('.toast-notification');
            toasts.forEach(toast => toast.remove());
            
            // Clear any highlights
            const highlights = document.querySelectorAll('.tutorial-highlight');
            highlights.forEach(el => {
                el.classList.remove('tutorial-highlight');
                el.style.animation = '';
            });
            
            console.log('[Game] UI cleared for reset');
        } catch (err) {
            console.error('[Game] Error clearing UI:', err);
        }
    }

    exportSave() {
        try {
            const saveData = localStorage.getItem('idleDynastyBuilder');
            if (saveData) {
                const blob = new Blob([saveData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dynasty-builder-save.json';
                a.click();
                URL.revokeObjectURL(url);
            // ...
            }
        } catch (err) {
            // ...
        }
    }

    importSave(fileInput) {
        try {
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const saveData = e.target.result;
                        localStorage.setItem('idleDynastyBuilder', saveData);
                        location.reload();
                    } catch (error) {
                        // ...
                    }
                };
                reader.readAsText(file);
            }
        } catch (err) {
            // ...
        }
    }

    getPerformanceStats() {
        try {
            return {
                buildings: this.gameState.buildings.length,
                army: this.gameState.army.length,
                mergeItems: this.gameState.mergeItems.length,
                currentView: this.currentView,
                battleInProgress: this.gameState.battleInProgress,
                wave: this.gameState.wave,
                gold: this.gameState.gold
            };
        } catch (err) {
            // ...
            return {};
        }
    }

    cheat_addGold(amount = 1000) {
        try {
            this.gameState.gold += amount;
            this.gameState.updateUI();
            // ...
        } catch (err) {
            // ...
        }
    }

    cheat_addResources(amount = 100) {
        try {
            this.gameState.resources.food += amount;
            this.gameState.resources.wood += amount;
            this.gameState.resources.stone += amount;
            this.gameState.updateUI();
            // ...
        } catch (err) {
            // ...
        }
    }

    cheat_skipWave() {
        try {
            this.gameState.wave++;
            this.battleManager.generateEnemies();
            this.gameState.updateUI();
            // ...
        } catch (err) {
            // ...
        }
    }
}

// Attach startGame to window after class definition
window.startGame = function() {
    const game = new Game();
    game.init();
    // Add CSS animations that weren't included in the CSS file
    const style = document.createElement('style');
    style.textContent = `
        @keyframes sparkle {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
            100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        }
        .drag-over {
            background: rgba(26, 188, 156, 0.3) !important;
            border-color: #1abc9c !important;
        }
        .merge-item {
            transition: all 0.3s ease;
        }
        .merge-item:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .army-unit {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
        }
        .unit-icon {
            margin-right: 10px;
            font-size: 1.2rem;
        }
        .unit-stats {
            font-size: 0.8rem;
            color: #ecf0f1;
        }
    `;
    document.head.appendChild(style);
    window._gameInstance = game;
}

// Auto-start the game on DOMContentLoaded if not already started
document.addEventListener('DOMContentLoaded', () => {
    if (!window._gameInstance) {
        console.log('[Game] DOMContentLoaded: auto-starting game');
        window.startGame();
    }
});

// Global error handling
//

console.log('🎮 Idle: Dynasty Builder - Game script loaded');

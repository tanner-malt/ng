/**
 * app.js - Main Game Initialization and Coordination
 * 
 * This is the central coordinator for Idle: Dynasty Builder. It initializes all
 * game systems, manages view switching, and coordinates the tutorial system.
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
            progressIcon.textContent = '⭐';
            progressIcon.title = `${unlocked}/3 milestones unlocked.`;
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
                if (typeof TutorialManager !== 'undefined') {
                    this.tutorialManager = new TutorialManager();
                    this.tutorialManager.game = this; // Connect tutorial to game instance
                    console.log('[Game] TutorialManager initialized successfully');
                } else {
                    console.error('[Game] TutorialManager class not available');
                    this.tutorialManager = null;
                }
            } catch (tutorialError) {
                console.error('[Game] Failed to initialize TutorialManager:', tutorialError);
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
                        
                        if (this.tutorialManager && this.tutorialManager.showWelcome) {
                            console.log('[Game] Starting tutorial...');
                            this.tutorialManager.showWelcome();
                        } else {
                            console.error('[Game] Tutorial manager not available or invalid');
                        }
                    } catch (err) {
                        console.error('[Game] Tutorial start error:', err);
                    }
                }, 500); // Reduced from 1000ms to 500ms for faster startup
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
                this.worldManager.init();
            }
            
            if (this.questManager && this.questManager.init) {
                this.questManager.init();
            }
            
            // Setup UI bindings
            this.setupNavigation();
            this.bindTopRightPopups();
            this.updateProgressIcon();
            
            // Setup auto-save
            this.setupAutoSave();
            
            console.log('[Game] Game initialization complete');
        } catch (err) {
            console.error('[Game] Initialization error:', err);
        }
    }

    // Rest of the methods would continue here...
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });
    }

    switchView(view) {
        // Check if view is unlocked
        if (!this.unlockedViews[view]) {
            this.showLockedViewMessage(view);
            return;
        }

        // Update current view
        this.currentView = view;

        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Show/hide game views
        document.querySelectorAll('.game-view').forEach(gameView => {
            gameView.classList.remove('active');
        });

        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Initialize the specific view manager if needed
        switch (view) {
            case 'village':
                if (this.villageManager && this.villageManager.refresh) {
                    this.villageManager.refresh();
                }
                break;
            case 'world':
                if (this.worldManager && this.worldManager.refresh) {
                    this.worldManager.refresh();
                }
                break;
            case 'monarch':
                if (this.monarchManager && this.monarchManager.refresh) {
                    this.monarchManager.refresh();
                }
                break;
            case 'throne':
                if (this.throneManager && this.throneManager.refresh) {
                    this.throneManager.refresh();
                }
                break;
        }
    }

    showLockedViewMessage(view) {
        const messages = {
            world: 'Build your Town Center to explore the world!',
            monarch: 'Build a Farm to unlock Monarch management!',
            throne: 'Build a House to access the Throne room!'
        };

        const message = messages[view] || 'This area is not yet available.';
        
        if (window.showToast) {
            let icon = '🔒';
            let specificMsg = '';
            
            switch (view) {
                case 'world':
                    specificMsg = 'Build your Town Center to unlock World exploration!';
                    icon = '🗺️';
                    break;
                case 'monarch':
                    specificMsg = 'Build a Farm to unlock Monarch mode!';
                    icon = '👑';
                    break;
                case 'throne':
                    specificMsg = 'Build a House to unlock Throne mode!';
                    icon = '🏰';
                    break;
            }
            
            window.showToast(specificMsg || message, { 
                icon: icon, 
                type: 'info',
                timeout: 4000 
            });
        }
    }

    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.gameState) {
                this.gameState.save();
            }
        }, 30000);
    }

    // Unlock a specific view
    unlockView(view) {
        if (this.unlockedViews[view] !== undefined) {
            this.unlockedViews[view] = true;
            
            // Update nav button
            const navBtn = document.querySelector(`[data-view="${view}"]`);
            if (navBtn) {
                navBtn.classList.remove('locked');
            }
            
            // Update progress icon
            this.updateProgressIcon();
            
            // Show unlock notification
            if (window.showToast) {
                const viewNames = {
                    world: 'World Map',
                    monarch: 'Monarch View',
                    throne: 'Throne Room'
                };
                
                window.showToast(`🎉 ${viewNames[view] || view} unlocked!`, {
                    icon: '🔓',
                    type: 'success',
                    timeout: 5000
                });
            }
        }
    }
}

// Initialize the game when DOM is ready
let game;

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM Content Loaded');
    
    try {
        game = new Game();
        window.game = game; // Make globally accessible for debugging
        game.init();
        console.log('[App] Game instance created and initialized');
    } catch (err) {
        console.error('[App] Failed to create game instance:', err);
    }
});

// Make Game class globally available
window.Game = Game;

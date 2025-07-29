

// Main application initialization and view management
// Use global TutorialManager for browser compatibility
// tutorial.js must be loaded before app.js in HTML



class Game {
    // Popup/modal logic is now in uiPopups.js
    bindTopRightPopups() {
        if (window.bindTopRightPopups) {
            window.bindTopRightPopups(this);
        }
    }

    updateProgressPopup() {
        // Update the progression popup icons
        const battle = document.getElementById('progress-battle');
        const monarch = document.getElementById('progress-monarch');
        const throne = document.getElementById('progress-throne');
        if (battle) battle.innerHTML = `Battle: <span>${this.unlockedViews.battle ? '✅' : '🔒'}</span>`;
        if (monarch) monarch.innerHTML = `Monarch: <span>${this.unlockedViews.monarch ? '✅' : '🔒'}</span>`;
        if (throne) throne.innerHTML = `Throne: <span>${this.unlockedViews.throne ? '✅' : '🔒'}</span>`;
    }
    updateProgressIcon() {
        // Progress: battle, monarch, throne
        const progressBtn = document.getElementById('progress-btn');
        const progressIcon = document.getElementById('progress-icon');
        if (!progressBtn || !progressIcon) return;
        let unlocked = 0;
        if (this.unlockedViews.battle) unlocked++;
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
            progressIcon.textContent = '🗺️';
            progressBtn.title = 'No milestones unlocked yet.';
        } else {
            progressBtn.classList.remove('progress-complete', 'progress-locked');
            progressBtn.classList.add('progress-incomplete');
            progressIcon.textContent = '🗺️';
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
            this.villageManager = new VillageManager(this.gameState, this);
            this.battleManager = new BattleManager(this.gameState);
            this.monarchManager = new MonarchManager(this.gameState);
            this.throneManager = new ThroneManager(this.gameState);
            // Milestone-based view unlocking
            this.unlockedViews = { village: true, battle: false, monarch: false, throne: false };
            this.tutorialManager = new window.TutorialManager(this);
            // ...
        } catch (err) {
            // ...
        }
    }

    init() {
        try {
            // ...
            const loadedSuccessfully = this.gameState.load();
            if (loadedSuccessfully) {
                this.tutorialActive = false;
            } else {
                this.tutorialActive = true;
                setTimeout(() => {
                    try {
                        this.tutorialManager.showIntro();
                    } catch (err) {
                        // ...
                    }
                }, 500);
            }
            this.villageManager.init();
            this.battleManager.init();
            this.monarchManager.init();
            this.throneManager.init();
            this.setupNavigation();
            this.gameState.updateUI();
            this.updateProgressIcon();
            this.bindTopRightPopups();
            this.startGameLoop();
            this.setupAutosave();
            this.setupKeyboardShortcuts();
            window.game = this;
            window.gameState = this.gameState;
            // ...
        } catch (err) {
            // ...
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
        if (this.unlockedViews.battle && this.unlockedViews.monarch && this.unlockedViews.throne) {
            this.completeTutorial();
        }
    }

    switchView(viewName) {
        try {
            const validViews = ['village', 'battle', 'monarch', 'throne'];
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
            this.updateProgressIcon();
            }
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
                    this.gameState.save();
                } catch (err) {
                    // ...
                }
            }, 30000);
            window.addEventListener('beforeunload', () => {
                try {
                    this.gameState.save();
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

    resetGame() {
        try {
            if (confirm('Are you sure you want to reset the game? This cannot be undone.')) {
                localStorage.removeItem('villageDefenseIdleo');
                location.reload();
            }
        } catch (err) {
            // ...
        }
    }

    exportSave() {
        try {
            const saveData = localStorage.getItem('villageDefenseIdleo');
            if (saveData) {
                const blob = new Blob([saveData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'village-defense-save.json';
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
                        localStorage.setItem('villageDefenseIdleo', saveData);
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

console.log('🎮 Village Defense: Idleo - Game script loaded');

// Main application initialization and view management
class Game {
    tutorialActive = true;
    constructor() {
        this.gameState = gameState;
        this.villageManager = new VillageManager(this.gameState);
        this.battleManager = new BattleManager(this.gameState);
        this.monarchManager = new MonarchManager(this.gameState);
        this.throneManager = new ThroneManager(this.gameState);
        this.currentView = 'village';
        this.gameLoopId = null;
    }
    
    init() {
        console.log('🏰 Initializing Village Defense: Idleo...');
        
        // Try to load saved game
        const loadedSuccessfully = this.gameState.load();
        if (loadedSuccessfully) {
            console.log('📁 Loaded saved game');
            this.tutorialActive = false;
        } else {
            console.log('🆕 Starting new game');
            this.tutorialActive = true;
            setTimeout(() => this.showTutorialIntro(), 500);
        }
    showTutorialIntro() {
    
    showTutorialIntro() {
        // Create chatbox if it doesn't exist
        let chatbox = document.getElementById('tutorial-chatbox');
        if (!chatbox) {
            chatbox = document.createElement('div');
            chatbox.id = 'tutorial-chatbox';
            chatbox.style.position = 'fixed';
            chatbox.style.bottom = '32px';
            chatbox.style.left = '32px';
            chatbox.style.maxWidth = '340px';
            chatbox.style.background = 'rgba(30,34,44,0.98)';
            chatbox.style.color = '#fff';
            chatbox.style.borderRadius = '12px';
            chatbox.style.boxShadow = '0 4px 24px #0008';
            chatbox.style.padding = '1.2rem 1.5rem 1.2rem 1.5rem';
            chatbox.style.fontSize = '1.08rem';
            chatbox.style.zIndex = '1000';
            chatbox.style.display = 'flex';
            chatbox.style.flexDirection = 'column';
            chatbox.style.gap = '1rem';
            document.body.appendChild(chatbox);
        }
        chatbox.innerHTML = '';
        // Tutorial message
        const msg = document.createElement('div');
        msg.innerHTML = `<b>Welcome!</b><br>This is your <b>village view mode</b>, where you will manage the logistics of your kingdom!<br><br>You are the son of the king, and the king sent you to establish a new village to defend!<br><br><b>First, place your Town Center.</b>`;
        chatbox.appendChild(msg);
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Got it!';
        nextBtn.style.background = 'linear-gradient(90deg, #4e54c8, #8f94fb)';
        nextBtn.style.color = '#fff';
        nextBtn.style.border = 'none';
        nextBtn.style.borderRadius = '8px';
        nextBtn.style.padding = '0.6rem 1.5rem';
        nextBtn.style.fontWeight = '600';
        nextBtn.style.cursor = 'pointer';
        nextBtn.onclick = () => {
            chatbox.style.display = 'none';
            this.highlightTownCenterButton();
        };
        chatbox.appendChild(nextBtn);
        chatbox.style.display = 'flex';
    }

    highlightTownCenterButton() {
        // Highlight the Town Center build button
        const btn = document.querySelector('.build-btn[data-building="townCenter"]');
        if (btn) {
            btn.classList.add('tutorial-highlight');
            btn.scrollIntoView({behavior: 'smooth', block: 'center'});
            // Remove highlight after first click
            const removeHighlight = () => {
                btn.classList.remove('tutorial-highlight');
                btn.removeEventListener('click', removeHighlight);
            };
            btn.addEventListener('click', removeHighlight);
        }
    }
        
        // Initialize all managers
        this.villageManager.init();
        this.battleManager.init();
        this.monarchManager.init();
        this.throneManager.init();
        
        // Setup navigation
        this.setupNavigation();
        
        // Update initial UI
        this.gameState.updateUI();
        
        // Start game loop
        this.startGameLoop();
        
        // Setup autosave
        this.setupAutosave();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Make game globally accessible for debugging
        window.game = this;
        window.gameState = this.gameState;
        
        console.log('✅ Game initialized successfully!');
        this.gameState.logBattleEvent('🏰 Welcome to Village Defense: Idleo!');
    }
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view;
                if (this.tutorialActive && targetView !== 'village') {
                    this.showTutorialLockMessage(targetView);
                    return;
                }
                this.switchView(targetView);
            });
        });
        this.updateTabLocks();
    }

    updateTabLocks() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const targetView = btn.dataset.view;
            if (this.tutorialActive && targetView !== 'village') {
                btn.disabled = true;
                btn.classList.add('locked');
            } else {
                btn.disabled = false;
                btn.classList.remove('locked');
            }
        });
    }

    showTutorialLockMessage(view) {
        alert('Complete the tutorial in the Village view before accessing other areas!');
    }

    completeTutorial() {
        this.tutorialActive = false;
        this.updateTabLocks();
        this.gameState.logBattleEvent('🎉 Tutorial complete! All views unlocked.');
    }
    
    switchView(viewName) {
        // Validate view name
        const validViews = ['village', 'battle', 'monarch', 'throne'];
        if (!validViews.includes(viewName)) {
            console.error(`Invalid view name: ${viewName}`);
            return;
        }
        
        // Exit build mode when switching from village
        if (this.currentView === 'village' && viewName !== 'village') {
            this.villageManager.exitBuildMode();
        }
        
        // Hide all views
        document.querySelectorAll('.game-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Remove active from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show target view
        const targetViewElement = document.getElementById(`${viewName}-view`);
        const targetNavButton = document.querySelector(`[data-view="${viewName}"]`);
        
        if (targetViewElement && targetNavButton) {
            targetViewElement.classList.add('active');
            targetNavButton.classList.add('active');
            
            this.currentView = viewName;
            
            // Perform view-specific initialization
            this.onViewSwitch(viewName);
            
            this.gameState.logBattleEvent(`📍 Switched to ${viewName} view`);
        }
    }
    
    onViewSwitch(viewName) {
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
    }
    
    startGameLoop() {
        const gameLoop = () => {
            // Update game state
            this.gameState.update();
            
            // Update view-specific logic
            if (this.currentView === 'battle' && this.gameState.battleInProgress) {
                // Battle updates are handled by the battle manager's own timer
            }
            
            // Continue loop
            this.gameLoopId = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
        console.log('🔄 Game loop started');
    }
    
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
            console.log('⏹️ Game loop stopped');
        }
    }
    
    setupAutosave() {
        // Autosave every 30 seconds
        setInterval(() => {
            this.gameState.save();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.gameState.save();
        });
        
        console.log('💾 Autosave enabled (30s intervals)');
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts if not typing in an input
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
        });
        
        console.log('⌨️ Keyboard shortcuts enabled (1-4 for views, Esc to exit build mode, Ctrl+S to save, B to start battle)');
    }
    
    // Debug and utility methods
    resetGame() {
        if (confirm('Are you sure you want to reset the game? This cannot be undone.')) {
            localStorage.removeItem('villageDefenseIdleo');
            location.reload();
        }
    }
    
    exportSave() {
        const saveData = localStorage.getItem('villageDefenseIdleo');
        if (saveData) {
            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'village-defense-save.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log('💾 Save exported');
        }
    }
    
    importSave(fileInput) {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const saveData = e.target.result;
                    localStorage.setItem('villageDefenseIdleo', saveData);
                    location.reload();
                } catch (error) {
                    alert('Invalid save file');
                    console.error('Failed to import save:', error);
                }
            };
            reader.readAsText(file);
        }
    }
    
    // Performance monitoring
    getPerformanceStats() {
        return {
            buildings: this.gameState.buildings.length,
            army: this.gameState.army.length,
            mergeItems: this.gameState.mergeItems.length,
            currentView: this.currentView,
            battleInProgress: this.gameState.battleInProgress,
            wave: this.gameState.wave,
            gold: this.gameState.gold
        };
    }
    
    // Cheat methods for testing (remove in production)
    cheat_addGold(amount = 1000) {
        this.gameState.gold += amount;
        this.gameState.updateUI();
        console.log(`Added ${amount} gold`);
    }
    
    cheat_addResources(amount = 100) {
        this.gameState.resources.food += amount;
        this.gameState.resources.wood += amount;
        this.gameState.resources.stone += amount;
        this.gameState.updateUI();
        console.log(`Added ${amount} of each resource`);
    }
    
    cheat_skipWave() {
        this.gameState.wave++;
        this.battleManager.generateEnemies();
        this.gameState.updateUI();
        console.log(`Skipped to wave ${this.gameState.wave}`);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
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
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Game error:', e.error);
    // You might want to send this to an error tracking service
});

console.log('🎮 Village Defense: Idleo - Game script loaded');

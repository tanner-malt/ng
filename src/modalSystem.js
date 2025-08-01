// Comprehensive modal and popup system for Idle: Dynasty Builder
class ModalSystem {
    constructor() {
        this.activeModals = new Set();
        this.modalStack = [];
        this.init();
    }

    init() {
        this.createModalContainer();
        this.setupEventListeners();
    }

    createModalContainer() {
        // Create main modal overlay if it doesn't exist
        if (!document.getElementById('modal-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
        }

        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    setupEventListeners() {
        // Close modal when clicking overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeTopModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                this.closeTopModal();
            }
        });
    }

    // Show a modal with custom content
    showModal(options = {}) {
        const {
            id = `modal-${Date.now()}`,
            title = 'Modal',
            content = '',
            width = '500px',
            height = 'auto',
            closable = true,
            className = '',
            onClose = null,
            showCloseButton = true,
            modalType = null
        } = options;

        // Prevent multiple instances of the same modal type
        if (modalType && this.activeModals.has(modalType)) {
            console.log(`[ModalSystem] Modal type '${modalType}' already active`);
            return;
        }

        const modalId = modalType || id;

        // Create modal element
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `modal-content ${className}`;
        modal.style.width = width;
        modal.style.height = height;

        // Create modal HTML
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                ${showCloseButton ? '<button class="modal-close-btn" aria-label="Close">×</button>' : ''}
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        // Add to modal stack
        this.modalStack.push({ id: modalId, element: modal, onClose, modalType });
        this.activeModals.add(modalId);

        // Show overlay and modal
        const overlay = document.getElementById('modal-overlay');
        overlay.appendChild(modal);
        overlay.style.display = 'flex';

        // Setup close button if enabled
        if (showCloseButton && closable) {
            const closeBtn = modal.querySelector('.modal-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(modalId));
            }
        }

        // Add entrance animation
        requestAnimationFrame(() => {
            modal.classList.add('modal-enter');
        });

        return id;
    }

    // Close specific modal
    closeModal(modalId) {
        const modalIndex = this.modalStack.findIndex(m => m.id === modalId);
        if (modalIndex === -1) return;

        const modalData = this.modalStack[modalIndex];
        const modal = modalData.element;

        // Call onClose callback
        if (modalData.onClose) {
            modalData.onClose();
        }

        // Remove from stack and active set
        this.modalStack.splice(modalIndex, 1);
        this.activeModals.delete(modalId);

        // Animate out
        modal.classList.add('modal-exit');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }

            // Hide overlay if no more modals
            if (this.modalStack.length === 0) {
                document.getElementById('modal-overlay').style.display = 'none';
            }
        }, 200);
    }

    // Close the top modal in the stack
    closeTopModal() {
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            this.closeModal(topModal.id);
        }
    }

    // Close all modals
    closeAllModals() {
        while (this.modalStack.length > 0) {
            this.closeTopModal();
        }
    }

    // Show simple message modal
    showMessage(title, message, options = {}) {
        const {
            type = 'info', // info, warning, error, success
            buttonText = 'OK',
            onConfirm = null
        } = options;

        const iconMap = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };

        const content = `
            <div class="message-modal">
                <div class="message-icon">${iconMap[type] || iconMap.info}</div>
                <div class="message-text">${message}</div>
                <div class="message-actions">
                    <button class="btn btn-primary message-confirm">${buttonText}</button>
                </div>
            </div>
        `;

        const modalId = this.showModal({
            title,
            content,
            className: `message-modal-${type}`,
            modalType: 'message',
            width: '400px',
            showCloseButton: true
        });

        // Setup confirm button
        setTimeout(() => {
            const confirmBtn = document.querySelector('.message-confirm');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    if (onConfirm) onConfirm();
                    this.closeModal(modalId);
                });
            }
        }, 100);

        return modalId;
    }

    // Show notification
    showNotification(message, options = {}) {
        const {
            type = 'info', // info, success, warning, error
            duration = 4000,
            icon = '',
            closable = true,
            position = 'top-right' // top-right, top-left, bottom-right, bottom-left, center
        } = options;

        const notification = document.createElement('div');
        const notificationId = `notification-${Date.now()}`;
        notification.id = notificationId;
        notification.className = `notification notification-${type} notification-${position}`;

        notification.innerHTML = `
            <div class="notification-content">
                ${icon ? `<span class="notification-icon">${icon}</span>` : ''}
                <div class="notification-message">${message}</div>
                ${closable ? '<button class="notification-close">×</button>' : ''}
            </div>
        `;

        // Add to container
        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Setup close button
        if (closable) {
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => this.closeNotification(notificationId));
        }

        // Auto-close after duration
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, duration);
        }

        // Entrance animation
        requestAnimationFrame(() => {
            notification.classList.add('notification-enter');
        });

        return notificationId;
    }

    // Close notification
    closeNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (!notification) return;

        notification.classList.add('notification-exit');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Show confirmation dialog
    showConfirmation(message, options = {}) {
        const {
            title = 'Confirm',
            confirmText = 'Yes',
            cancelText = 'No',
            onConfirm = null,
            onCancel = null,
            type = 'warning'
        } = options;

        const content = `
            <div class="confirmation-dialog">
                <div class="confirmation-message">${message}</div>
                <div class="confirmation-buttons">
                    <button class="btn btn-primary confirm-btn">${confirmText}</button>
                    <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                </div>
            </div>
        `;

        const modalId = this.showModal({
            title,
            content,
            width: '400px',
            className: `confirmation-modal confirmation-${type}`,
            closable: false,
            showCloseButton: false
        });

        // Setup button handlers
        const modal = document.getElementById(modalId);
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        confirmBtn.addEventListener('click', () => {
            this.closeModal(modalId);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeModal(modalId);
            if (onCancel) onCancel();
        });

        return modalId;
    }

    // Show quest menu (replacing the quest view)
    showQuestMenu(questManager) {
        const questsContent = this.generateQuestMenuContent(questManager);
        
        const modalId = this.showModal({
            id: 'quest-menu-modal',
            title: '🗺️ Expeditions & Quests',
            content: questsContent,
            width: '800px',
            height: '600px',
            className: 'quest-menu-modal',
            modalType: 'quest-menu',
            onClose: () => {
                // Clean up any quest-specific listeners
            }
        });

        // Setup quest menu interactions
        this.setupQuestMenuHandlers(modalId, questManager);
        
        return modalId;
    }

    generateQuestMenuContent(questManager) {
        if (!questManager.currentExpedition) {
            // Show available expeditions
            let expeditionsHTML = '<div class="expedition-grid">';
            
            questManager.availableLocations.forEach(location => {
                if (!location.unlocked) return;

                expeditionsHTML += `
                    <div class="expedition-card" data-location="${location.id}">
                        <h4>${location.name}</h4>
                        <p class="expedition-description">${location.description}</p>
                        <div class="expedition-details">
                            <div class="expedition-stat">
                                <span class="stat-icon">🚶</span>
                                <span>Travel: ${location.travelDays} days each way</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">⚔️</span>
                                <span>Battle: ~${location.estimatedBattleMinutes} minutes</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">💀</span>
                                <span>Risk: ${location.difficulty}</span>
                            </div>
                        </div>
                        <div class="expedition-rewards">
                            <strong>Potential Rewards:</strong>
                            <div class="rewards-list">
                                <span>🪙 ${location.rewards.gold.min}-${location.rewards.gold.max} gold</span>
                                ${location.rewards.wood ? `<span>🪵 ${location.rewards.wood.min}-${location.rewards.wood.max} wood</span>` : ''}
                                ${location.rewards.stone ? `<span>🪨 ${location.rewards.stone.min}-${location.rewards.stone.max} stone</span>` : ''}
                            </div>
                        </div>
                        <button class="expedition-start-btn" data-location="${location.id}">
                            Start Expedition
                        </button>
                    </div>
                `;
            });
            
            expeditionsHTML += '</div>';
            return expeditionsHTML;
            
        } else {
            // Show active expedition status
            const expedition = questManager.currentExpedition;
            const location = expedition.location;
            const progressPercent = questManager.calculateExpeditionProgress();
            
            return `
                <div class="active-expedition">
                    <h4>🚶 Active Expedition: ${location.name}</h4>
                    <div class="expedition-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <p>Progress: ${Math.floor(progressPercent)}% - Phase: ${questManager.expeditionState}</p>
                    </div>
                    
                    <div class="expedition-status">
                        <div class="army-status">
                            <h5>Army Status</h5>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="status-icon">🥖</span>
                                    <span>Supplies: ${expedition.supplies.food}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">💊</span>
                                    <span>Medicine: ${expedition.supplies.medicine}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">😊</span>
                                    <span>Morale: ${expedition.armyMorale}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="recent-events">
                            <h5>Recent Events</h5>
                            <div class="events-list">
                                ${expedition.events.slice(-3).map(event => 
                                    `<div class="event-item ${event.type}">
                                        <span class="event-time">${event.time}</span>
                                        <span class="event-text">${event.text}</span>
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    
                    ${questManager.expeditionState === 'traveling_out' || questManager.expeditionState === 'traveling_back' ? `
                        <div class="expedition-actions">
                            <button class="action-btn" id="rest-army-action">🏕️ Rest Army</button>
                            <button class="action-btn" id="force-march-action">⚡ Force March</button>
                            <button class="action-btn" id="hunt-food-action">🏹 Hunt for Food</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    }

    setupQuestMenuHandlers(modalId, questManager) {
        const modal = document.getElementById(modalId);
        
        // Handle expedition start buttons
        modal.querySelectorAll('.expedition-start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const locationId = e.target.dataset.location;
                questManager.startExpedition(locationId);
                this.closeModal(modalId);
            });
        });

        // Handle travel actions for active expeditions
        const restBtn = modal.querySelector('#rest-army-action');
        const marchBtn = modal.querySelector('#force-march-action');
        const huntBtn = modal.querySelector('#hunt-food-action');

        if (restBtn) restBtn.addEventListener('click', () => {
            questManager.restArmy();
            this.refreshQuestMenu(modalId, questManager);
        });

        if (marchBtn) marchBtn.addEventListener('click', () => {
            questManager.forceMarch();
            this.refreshQuestMenu(modalId, questManager);
        });

        if (huntBtn) huntBtn.addEventListener('click', () => {
            questManager.huntForFood();
            this.refreshQuestMenu(modalId, questManager);
        });
    }

    refreshQuestMenu(modalId, questManager) {
        const modal = document.getElementById(modalId);
        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = this.generateQuestMenuContent(questManager);
        this.setupQuestMenuHandlers(modalId, questManager);
    }

    // Check if any modal is currently open
    hasActiveModals() {
        return this.modalStack.length > 0;
    }

    // Show tutorial modal
    showTutorialModal(tutorialStep = null) {
        const tutorialContent = this.generateTutorialContent(tutorialStep);
        
        return this.showModal({
            title: '📚 Tutorial',
            content: tutorialContent,
            width: '600px',
            height: '500px',
            className: 'tutorial-modal',
            modalType: 'tutorial',
            onClose: () => {
                // Clean up tutorial listeners
            }
        });
    }

    generateTutorialContent(step) {
        return `
            <div class="tutorial-content">
                <div class="tutorial-section">
                    <h4>🏰 Idle: Dynasty Builder</h4>
                    <p>Welcome to your village! You are the leader responsible for defending and growing your settlement.</p>
                </div>
                
                <div class="tutorial-section">
                    <h5>🏘️ Village Management</h5>
                    <ul>
                        <li>Build structures to generate resources</li>
                        <li>Manage your population and defenses</li>
                        <li>Resources only generate during expeditions</li>
                    </ul>
                </div>

                <div class="tutorial-section">
                    <h5>⚔️ Combat & Expeditions</h5>
                    <ul>
                        <li>Send your army on expeditions to generate resources</li>
                        <li>Experience Oregon Trail-style travel events</li>
                        <li>Battle enemies and gather supplies</li>
                    </ul>
                </div>

                <div class="tutorial-section">
                    <h5>👑 Progression</h5>
                    <ul>
                        <li>Unlock new areas as you progress</li>
                        <li>Access the Monarch and Throne systems</li>
                        <li>Prestige for powerful bonuses</li>
                    </ul>
                </div>

                <div class="tutorial-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('tutorial')">Got it!</button>
                </div>
            </div>
        `;
    }

    // Show settings modal
    showSettingsModal() {
        const settingsContent = this.generateSettingsContent();
        
        return this.showModal({
            title: '⚙️ Game Settings',
            content: settingsContent,
            width: '500px',
            height: '400px',
            className: 'settings-modal',
            modalType: 'settings',
            onClose: () => {
                // Save settings
                this.saveSettings();
            }
        });
    }

    generateSettingsContent() {
        const settings = this.loadSettings();
        
        return `
            <div class="settings-content">
                <div class="setting-group">
                    <h5>🔊 Audio</h5>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}>
                            Enable Sound Effects
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="setting-music" ${settings.musicEnabled ? 'checked' : ''}>
                            Enable Background Music
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h5>🎮 Gameplay</h5>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="setting-animations" ${settings.animationsEnabled ? 'checked' : ''}>
                            Enable Animations
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="setting-notifications" ${settings.notificationsEnabled ? 'checked' : ''}>
                            Enable Notifications
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h5>💾 Data</h5>
                    <div class="setting-item">
                        <button class="btn btn-secondary" onclick="window.modalSystem.exportSave()">Export Save</button>
                        <button class="btn btn-secondary" onclick="window.modalSystem.importSave()">Import Save</button>
                    </div>
                    <div class="setting-item">
                        <button class="btn btn-danger" onclick="window.modalSystem.resetGame()">Reset Game</button>
                    </div>
                </div>

                <div class="settings-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('settings')">Save & Close</button>
                </div>
            </div>
        `;
    }

    // Show progression modal
    showProgressionModal(game) {
        const progressionContent = this.generateProgressionContent(game);
        
        return this.showModal({
            title: '🏆 Progression',
            content: progressionContent,
            width: '600px',
            height: '500px',
            className: 'progression-modal',
            modalType: 'progression',
            onClose: () => {
                // Clean up progression listeners
            }
        });
    }

    generateProgressionContent(game) {
        if (!game || !game.unlockedViews) {
            return '<p>Game data not available</p>';
        }

        return `
            <div class="progression-content">
                <div class="progression-header">
                    <h4>🎯 Your Progress</h4>
                    <p>Track your journey through the different aspects of village management.</p>
                </div>

                <div class="progression-grid">
                    <div class="progression-item ${game.unlockedViews.village ? 'unlocked' : 'locked'}">
                        <div class="progression-icon">🏘️</div>
                        <div class="progression-info">
                            <h5>Village</h5>
                            <p>Build and manage your settlement</p>
                            <span class="progression-status">${game.unlockedViews.village ? '✅ Unlocked' : '🔒 Locked'}</span>
                        </div>
                    </div>

                    <div class="progression-item ${game.unlockedViews.battle ? 'unlocked' : 'locked'}">
                        <div class="progression-icon">⚔️</div>
                        <div class="progression-info">
                            <h5>Battle</h5>
                            <p>Command your army in combat</p>
                            <span class="progression-status">${game.unlockedViews.battle ? '✅ Unlocked' : '🔒 Locked'}</span>
                        </div>
                    </div>

                    <div class="progression-item ${game.unlockedViews.monarch ? 'unlocked' : 'locked'}">
                        <div class="progression-icon">👑</div>
                        <div class="progression-info">
                            <h5>Monarch</h5>
                            <p>Rule with wisdom and power</p>
                            <span class="progression-status">${game.unlockedViews.monarch ? '✅ Unlocked' : '🔒 Locked'}</span>
                        </div>
                    </div>

                    <div class="progression-item ${game.unlockedViews.throne ? 'unlocked' : 'locked'}">
                        <div class="progression-icon">🏰</div>
                        <div class="progression-info">
                            <h5>Throne</h5>
                            <p>Access ultimate power and prestige</p>
                            <span class="progression-status">${game.unlockedViews.throne ? '✅ Unlocked' : '🔒 Locked'}</span>
                        </div>
                    </div>
                </div>

                <div class="progression-stats">
                    <h5>📊 Statistics</h5>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="stat-label">Areas Unlocked:</span>
                            <span class="stat-value">${Object.values(game.unlockedViews).filter(Boolean).length}/4</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Resources:</span>
                            <span class="stat-value">${game.gameState?.resources?.gold || 0} Gold</span>
                        </div>
                    </div>
                </div>

                <div class="progression-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('progression')">Close</button>
                </div>
            </div>
        `;
    }

    // Settings management
    loadSettings() {
        const defaultSettings = {
            soundEnabled: true,
            musicEnabled: true,
            animationsEnabled: true,
            notificationsEnabled: true
        };

        try {
            const saved = localStorage.getItem('gameSettings');
            return saved ? {...defaultSettings, ...JSON.parse(saved)} : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            const settings = {
                soundEnabled: document.getElementById('setting-sound')?.checked || false,
                musicEnabled: document.getElementById('setting-music')?.checked || false,
                animationsEnabled: document.getElementById('setting-animations')?.checked || false,
                notificationsEnabled: document.getElementById('setting-notifications')?.checked || false
            };
            localStorage.setItem('gameSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    exportSave() {
        try {
            const saveData = localStorage.getItem('gameState');
            if (saveData) {
                const blob = new Blob([saveData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dynasty-builder-save-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showNotification('Save exported successfully!', { type: 'success' });
            } else {
                this.showNotification('No save data found', { type: 'warning' });
            }
        } catch (e) {
            this.showNotification('Failed to export save', { type: 'error' });
        }
    }

    importSave() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const saveData = e.target.result;
                        JSON.parse(saveData); // Validate JSON
                        localStorage.setItem('gameState', saveData);
                        this.showNotification('Save imported successfully! Reload the page to apply.', { type: 'success' });
                    } catch (err) {
                        this.showNotification('Invalid save file', { type: 'error' });
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    resetGame() {
        this.showConfirmation(
            'Are you sure you want to reset your game? This action cannot be undone!',
            {
                title: 'Reset Game',
                type: 'danger',
                onConfirm: () => {
                    localStorage.clear();
                    this.showNotification('Game reset! Reload the page to start fresh.', { type: 'success' });
                }
            }
        );
    }

    // Show unlock requirement modal
    showUnlockRequirementModal(view) {
        let title = 'Area Locked';
        let message = 'This view is locked. Complete the required milestone in the Village view to unlock it!';
        let icon = '🔒';
        let requirement = '';
        
        switch (view) {
            case 'battle':
                message = 'The Battle area is currently locked.';
                requirement = 'Build your Town Center to unlock Battle mode!';
                icon = '⚔️';
                break;
            case 'monarch':
                message = 'The Monarch area is currently locked.';
                requirement = 'Build a Farm to unlock Monarch mode!';
                icon = '👑';
                break;
            case 'throne':
                message = 'The Throne area is currently locked.';
                requirement = 'Build a House to unlock Throne mode!';
                icon = '🏰';
                break;
        }

        const content = `
            <div class="unlock-requirement-content">
                <div class="unlock-icon">${icon}</div>
                <div class="unlock-message">
                    <h4>${message}</h4>
                    <p class="requirement-text">${requirement}</p>
                </div>
                <div class="unlock-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('unlock-requirement')">Got it!</button>
                </div>
            </div>
        `;

        return this.showModal({
            id: 'unlock-requirement',
            title: title,
            content: content,
            width: '450px',
            height: '300px',
            className: 'unlock-requirement-modal',
            modalType: 'unlock-requirement',
            onClose: () => {
                // Clean up any unlock-specific listeners
            }
        });
    }

    // Show construction queued modal
    showConstructionQueuedModal(buildingType, constructionHours) {
        const buildingNames = {
            house: 'House',
            farm: 'Farm',
            townCenter: 'Town Center',
            barracks: 'Barracks',
            workshop: 'Workshop',
            market: 'Market'
        };

        const buildingName = buildingNames[buildingType] || buildingType;
        const buildingIcons = {
            house: '🏠',
            farm: '🚜',
            townCenter: '🏛️',
            barracks: '⚔️',
            workshop: '🔨',
            market: '🏪'
        };

        const buildingIcon = buildingIcons[buildingType] || '🏗️';

        const content = `
            <div class="construction-queued-content">
                <div class="construction-icon">${buildingIcon}</div>
                <div class="construction-message">
                    <h4>Construction Queued!</h4>
                    <p class="building-name">${buildingName} has been added to the construction queue.</p>
                    <div class="construction-details">
                        <div class="detail-item">
                            <span class="detail-icon">⏱️</span>
                            <span class="detail-text">Will complete in <strong>${constructionHours} hours</strong> of expedition time</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">📋</span>
                            <span class="detail-text">Buildings are constructed automatically during expeditions</span>
                        </div>
                    </div>
                </div>
                <div class="construction-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('construction-queued')">Got it!</button>
                </div>
            </div>
        `;

        return this.showModal({
            id: 'construction-queued',
            title: '🏗️ Construction Queue',
            content: content,
            width: '500px',
            height: '350px',
            className: 'construction-queued-modal',
            modalType: 'construction-queued',
            onClose: () => {
                // Clean up any construction-specific listeners
            }
        });
    }

    // Get current modal count
    getModalCount() {
        return this.modalStack.length;
    }

    // Show a mini modal (smaller, positioned near cursor or element)
    showMiniModal(options = {}) {
        const {
            id = `mini-modal-${Date.now()}`,
            title = 'Info',
            content = '',
            width = '300px',
            height = 'auto',
            x = null,
            y = null,
            targetElement = null,
            className = '',
            closable = true,
            autoClose = false,
            autoCloseDelay = 3000,
            onClose = null,
            modalType = 'mini-modal'
        } = options;

        // Close any existing mini modals first
        this.closeMiniModals();

        // Create mini modal element
        const miniModal = document.createElement('div');
        miniModal.id = id;
        miniModal.className = `mini-modal ${className}`;
        miniModal.style.cssText = `
            position: fixed;
            width: ${width};
            height: ${height};
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            border: 2px solid #3498db;
            border-radius: 8px;
            padding: 0;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: 'Segoe UI', sans-serif;
            color: #ecf0f1;
            animation: miniModalSlideIn 0.2s ease-out;
        `;

        // Create mini modal HTML
        miniModal.innerHTML = `
            <div class="mini-modal-header" style="
                background: linear-gradient(90deg, #3498db, #2980b9);
                padding: 8px 12px;
                border-radius: 6px 6px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                font-weight: bold;
            ">
                <span class="mini-modal-title">${title}</span>
                ${closable ? '<button class="mini-modal-close" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 0; line-height: 1;">×</button>' : ''}
            </div>
            <div class="mini-modal-body" style="
                padding: 12px;
                font-size: 13px;
                line-height: 1.4;
                max-height: 250px;
                overflow-y: auto;
            ">
                ${content}
            </div>
        `;

        // Position the mini modal
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            miniModal.style.left = `${rect.right + 10}px`;
            miniModal.style.top = `${rect.top}px`;
            
            // Adjust if going off screen
            setTimeout(() => {
                const modalRect = miniModal.getBoundingClientRect();
                if (modalRect.right > window.innerWidth - 10) {
                    miniModal.style.left = `${rect.left - modalRect.width - 10}px`;
                }
                if (modalRect.bottom > window.innerHeight - 10) {
                    miniModal.style.top = `${window.innerHeight - modalRect.height - 10}px`;
                }
            }, 10);
        } else if (x !== null && y !== null) {
            miniModal.style.left = `${x}px`;
            miniModal.style.top = `${y}px`;
        } else {
            // Center on screen
            miniModal.style.left = '50%';
            miniModal.style.top = '50%';
            miniModal.style.transform = 'translate(-50%, -50%)';
        }

        // Add to DOM
        document.body.appendChild(miniModal);

        // Setup close functionality
        if (closable) {
            const closeBtn = miniModal.querySelector('.mini-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeMiniModal(id);
                    if (onClose) onClose();
                });
            }
        }

        // Auto close if specified
        if (autoClose) {
            setTimeout(() => {
                this.closeMiniModal(id);
                if (onClose) onClose();
            }, autoCloseDelay);
        }

        // Close on click outside
        setTimeout(() => {
            const clickOutsideHandler = (e) => {
                if (!miniModal.contains(e.target)) {
                    this.closeMiniModal(id);
                    if (onClose) onClose();
                    document.removeEventListener('click', clickOutsideHandler);
                }
            };
            document.addEventListener('click', clickOutsideHandler);
        }, 100);

        // Store reference
        this.activeMiniModals = this.activeMiniModals || new Set();
        this.activeMiniModals.add(id);

        return id;
    }

    // Close specific mini modal
    closeMiniModal(id) {
        const miniModal = document.getElementById(id);
        if (miniModal) {
            miniModal.style.animation = 'miniModalSlideOut 0.2s ease-in';
            setTimeout(() => {
                if (miniModal.parentNode) {
                    miniModal.parentNode.removeChild(miniModal);
                }
                if (this.activeMiniModals) {
                    this.activeMiniModals.delete(id);
                }
            }, 200);
        }
    }

    // Close all mini modals
    closeMiniModals() {
        if (this.activeMiniModals) {
            this.activeMiniModals.forEach(id => {
                this.closeMiniModal(id);
            });
        }
    }
}

// Create global modal system instance
window.modalSystem = new ModalSystem();

// Backwards compatibility - replace old showNotification function
window.showNotification = (message, options = {}) => {
    return window.modalSystem.showNotification(message, options);
};

// Make ModalSystem available globally
window.ModalSystem = ModalSystem;

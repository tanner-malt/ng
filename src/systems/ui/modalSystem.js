/**
 * modalSystem.js - Modal Dialog and Popup System
 * 
 * Comprehensive modal system supporting various dialog types including tutorial
 * modals, confirmations, notifications, and complex user interactions.
 * 
 * Key Features:
 * - Promise-based modal handling for async interactions
 * - Multiple modal types (info, warning, error, confirmation)
 * - Rich content support with HTML formatting
 * - Keyboard and click handling for accessibility
 * - Modal stacking and overlay management
 * - Integration with tutorial system
 * 
 * Usage:
 * - window.showModal(title, content, options) - Main modal function
 * - window.showNotification(message, options) - Quick notifications
 * - Automatic DOM container creation and management
 */

class ModalSystem {
    constructor() {
        this.activeModals = new Set();
        this.modalStack = [];
        this.init();
    }

    init() {
        // Ensure DOM is ready before creating modal containers
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createModalContainer();
                this.setupEventListeners();
            });
        } else {
            this.createModalContainer();
            this.setupEventListeners();
        }
    }

    createModalContainer() {
        // Ensure document.body exists
        if (!document.body) {
            console.warn('[ModalSystem] document.body not available, retrying...');
            setTimeout(() => this.createModalContainer(), 100);
            return;
        }

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
        // Close modal when clicking overlay (only for closable modals)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                if (topModal.closable !== false) {
                    if (topModal.resolve) {
                        topModal.resolve(null);
                    }
                    this.closeTopModal();
                }
            }
        });

        // Close modal with Escape key (only for closable modals)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                if (topModal.closable !== false) {
                    if (topModal.resolve) {
                        topModal.resolve(null);
                    }
                    this.closeTopModal();
                }
            }

            // Handle Enter key for modals with OK buttons
            if (e.key === 'Enter' && this.modalStack.length > 0) {
                const topModal = this.modalStack[this.modalStack.length - 1];
                const modalElement = topModal.element;

                // Look for OK button, confirm button, or close button
                const okButton = modalElement.querySelector('.btn-primary, .message-confirm, .modal-close-btn');
                if (okButton && topModal.closable !== false) {
                    e.preventDefault();
                    okButton.click();
                }
            }
        });
    }

    // Show a modal with custom content and return a Promise
    showModal(options = {}) {
        // Always close achievement modals before opening a new modal
        this.closeAchievementModals();
        return new Promise((resolve, reject) => {
            // Ensure DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this._showModalInternal(options, resolve, reject);
                });
            } else {
                this._showModalInternal(options, resolve, reject);
            }
        });
    }

    closeAchievementModals() {
        // Close any modals with modalType 'achievement-notification'
        const achievementModals = this.modalStack.filter(m => m.modalType === 'achievement-notification');
        achievementModals.forEach(m => this.closeModal(m.id));
    }

    _showModalInternal(options, resolve, reject) {
        const {
            id = 'modal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title = 'Modal',
            content = '',
            width = '600px',
            height = 'auto',
            className = '',
            onClose = null,
            closable = true,
            showCloseButton = true,
            modalType = 'general',
            priority = 0  // Add priority support: 0 = normal, 1 = high (settings), 2 = critical
        } = options;

        console.log(`[ModalSystem] Creating modal: "${title}" (type: ${modalType}, id: ${id})`);

        // Prevent multiple instances of the same modal type
        if (modalType && this.activeModals.has(modalType)) {
            console.log(`[ModalSystem] Modal type '${modalType}' already active, rejecting duplicate`);
            resolve(null);
            return;
        }

        // Special handling for tutorial modals - only prevent exact same modal type duplicates
        if (modalType && modalType.includes('tutorial') || className.includes('tutorial')) {
            // Only block if the EXACT same tutorial modal type is already active
            const existingTutorial = Array.from(this.activeModals).find(activeId =>
                activeId === modalType
            );
            if (existingTutorial) {
                console.log(`[ModalSystem] Same tutorial modal type already active (${existingTutorial}), rejecting duplicate`);
                resolve(null);
                return;
            }
        }

        // Use the provided ID, fallback to modalType for activeModals tracking
        const actualModalId = id;  // Use the actual provided ID for the DOM element
        const trackingId = modalType || id;  // Use modalType for duplicate prevention

        // Create modal element
        const modal = document.createElement('div');
        modal.id = actualModalId;  // Use the actual ID for the DOM element
        modal.className = `modal-content ${className}`;
        modal.style.width = width;
        modal.style.height = height;

        // Store resolve/reject for this modal
        modal._resolve = resolve;
        modal._reject = reject;

        // Create modal HTML
        modal.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                ${showCloseButton && closable ? '<button class="modal-close-btn" aria-label="Close">×</button>' : ''}
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        // Add to modal stack
        this.modalStack.push({
            id: actualModalId,  // Use actual ID for stack tracking
            element: modal,
            onClose,
            modalType,
            closable,
            resolve,
            reject,
            priority  // Store priority for z-index calculations
        });
        this.activeModals.add(trackingId);  // Use tracking ID for duplicate prevention

        // Calculate z-index based on priority and stack position
        // Base z-index: 10000, Priority bonus: +1000 per level, Stack position: +10 per modal
        const baseZIndex = 10000;
        const priorityBonus = priority * 1000;
        const stackPosition = this.modalStack.length * 10;
        const finalZIndex = baseZIndex + priorityBonus + stackPosition;

        // Show overlay and modal
        const overlay = document.getElementById('modal-overlay');

        overlay.appendChild(modal);

        overlay.style.display = 'flex';
        overlay.style.zIndex = finalZIndex;  // Set calculated z-index
        overlay.classList.add('show'); // Add show class for animations and selectors

        // Setup event listeners
        this._setupModalEventListeners(modal, closable);

        // Resolve the Promise with the actual modal ID
        resolve(actualModalId);
    }

    _setupModalEventListeners(modal, closable) {
        // Setup close button if enabled
        if (closable) {
            const closeBtn = modal.querySelector('.modal-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    const modalId = modal.id;
                    const modalData = this.modalStack.find(m => m.id === modalId);
                    if (modalData && modalData.resolve) {
                        modalData.resolve(null);
                    }
                    this.closeModal(modalId);
                });
            }
        }

        // Add entrance animation
        requestAnimationFrame(() => {
            modal.classList.add('modal-enter');
        });
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

        // Remove the correct tracking ID from activeModals
        const trackingId = modalData.modalType || modalId;
        this.activeModals.delete(trackingId);

        console.log(`[ModalSystem] Removed modal from tracking: ${trackingId}`);
        console.log(`[ModalSystem] Active modals remaining:`, Array.from(this.activeModals));

        // Animate out
        modal.classList.add('modal-exit');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }

            // Hide overlay if no more modals
            if (this.modalStack.length === 0) {
                const overlay = document.getElementById('modal-overlay');
                overlay.style.display = 'none';
                overlay.classList.remove('show'); // Remove show class when hiding
            } else {
                // Recalculate z-index for remaining top modal
                const topModal = this.modalStack[this.modalStack.length - 1];
                const baseZIndex = 10000;
                const priorityBonus = (topModal.priority || 0) * 1000;
                const stackPosition = this.modalStack.length * 10;
                const finalZIndex = baseZIndex + priorityBonus + stackPosition;

                const overlay = document.getElementById('modal-overlay');
                overlay.style.zIndex = finalZIndex;
            }
        }, 200);
    }

    // Close all modals (emergency cleanup)
    closeAllModals() {
        console.log('[ModalSystem] Closing all modals (emergency cleanup)');

        // Clear all tracking
        this.activeModals.clear();
        this.modalStack = [];

        // Remove all modal elements from DOM
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
            overlay.classList.remove('show');
        }

        console.log('[ModalSystem] All modals cleared');
    }

    // Debug method to show current modal state
    debugModalState() {
        console.log('=== Modal System Debug ===');
        console.log('Active modals:', Array.from(this.activeModals));
        console.log('Modal stack length:', this.modalStack.length);
        console.log('Modal stack:', this.modalStack.map(m => ({
            id: m.id,
            modalType: m.modalType,
            element: !!m.element
        })));

        const overlay = document.getElementById('modal-overlay');
        console.log('Overlay display:', overlay ? overlay.style.display : 'N/A');
        console.log('Overlay children:', overlay ? overlay.children.length : 'N/A');
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
        return new Promise((resolve, reject) => {
            const {
                title = 'Confirm',
                confirmText = 'Yes',
                cancelText = 'No',
                onConfirm = null,
                onCancel = null,
                type = 'warning',
                exclusive = false  // New option to close other modals first
            } = options;

            const createConfirmationModal = () => {
                const modalType = `confirmation-${type}-${title.toLowerCase().replace(/\s+/g, '-')}`;

                // Check if this type of confirmation is already active
                if (this.activeModals.has(modalType)) {
                    console.log(`[ModalSystem] Confirmation of type '${modalType}' already active`);
                    resolve(null);
                    return;
                }

                const content = `
                    <div class="confirmation-dialog">
                        <div class="confirmation-message">${message}</div>
                        <div class="confirmation-buttons">
                            <button class="btn btn-primary confirm-btn">${confirmText}</button>
                            <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                        </div>
                    </div>
                `;

                this.showModal({
                    title,
                    content,
                    width: '400px',
                    className: `confirmation-modal confirmation-${type}`,
                    closable: false,
                    showCloseButton: false,
                    modalType: modalType
                }).then(modalId => {
                    if (!modalId) {
                        console.error('[ModalSystem] Failed to create confirmation modal');
                        resolve(null);
                        return;
                    }

                    console.log('[ModalSystem] Confirmation modal created with ID:', modalId);
                    // Attach handlers immediately; modal element is in DOM now
                    const modal = document.getElementById(modalId);
                    if (!modal) {
                        console.error('[ModalSystem] Could not find modal element with ID:', modalId);
                        resolve(null);
                        return;
                    }

                    const confirmBtn = modal.querySelector('.confirm-btn');
                    const cancelBtn = modal.querySelector('.cancel-btn');

                    if (!confirmBtn || !cancelBtn) {
                        console.error('[ModalSystem] Could not find confirm/cancel buttons in modal');
                        resolve(null);
                        return;
                    }

                    const handleConfirm = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.closeModal(modalId);
                        if (onConfirm) onConfirm();
                        resolve(true);
                    };

                    const handleCancel = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.closeModal(modalId);
                        if (onCancel) onCancel();
                        resolve(false);
                    };

                    confirmBtn.addEventListener('click', handleConfirm);
                    cancelBtn.addEventListener('click', handleCancel);

                    // Keyboard shortcuts within this modal
                    const keyHandler = (ev) => {
                        if (ev.key === 'Enter') handleConfirm(ev);
                        if (ev.key === 'Escape') handleCancel(ev);
                    };
                    modal.addEventListener('keydown', keyHandler);
                }).catch(error => {
                    console.error('[ModalSystem] Error creating confirmation modal:', error);
                    reject(error);
                });
            };

            // If exclusive, close all other modals first
            if (exclusive && this.modalStack.length > 0) {
                console.log('[ModalSystem] Closing all modals for exclusive confirmation');
                this.closeAllModals();
                // Wait a moment for modals to close
                setTimeout(() => createConfirmationModal(), 100);
            } else {
                createConfirmationModal();
            }
        });
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
            // Check if expeditions are unlocked
            if (!questManager.areExpeditionsUnlocked()) {
                return `
                    <div class="expedition-locked">
                        <h3>🏰 Expeditions Locked</h3>
                        <p>To unlock expeditions, you need:</p>
                        <ul>
                            <li>✅ Build a Barracks</li>
                            <li>✅ Complete the "Military Establishment" achievement</li>
                        </ul>
                        <p>Expeditions allow you to send royal-led armies to explore, conquer, and gather resources from distant lands.</p>
                    </div>
                `;
            }

            // Show available expeditions
            let expeditionsHTML = '<div class="expedition-grid">';

            questManager.availableLocations.forEach(location => {
                if (!location.unlocked) return;

                const requiredSupplies = questManager.calculateRequiredSupplies(location);
                const availableSupplies = questManager.getAvailableSupplies();
                const canAfford = questManager.canStartExpedition(location, availableSupplies, requiredSupplies);
                const availableRoyals = questManager.getAvailableRoyalLeaders();

                expeditionsHTML += `
                    <div class="expedition-card ${!canAfford || availableRoyals.length === 0 ? 'insufficient' : ''}" data-location="${location.id}">
                        <h4>${location.name}</h4>
                        <p class="expedition-description">${location.description}</p>
                        <div class="expedition-details">
                            <div class="expedition-stat">
                                <span class="stat-icon">🚶</span>
                                <span>Travel: ${location.travelDays} days each way</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">⚔️</span>
                                <span>Difficulty: ${location.difficulty}</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">🌍</span>
                                <span>Terrain: ${location.terrain}</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">🎯</span>
                                <span>Type: ${location.type}</span>
                            </div>
                            <div class="expedition-stat">
                                <span class="stat-icon">👑</span>
                                <span>Leaders: ${availableRoyals.length} available</span>
                            </div>
                        </div>
                        <div class="expedition-requirements">
                            <strong>Required Supplies:</strong>
                            <div class="requirements-list">
                                ${Object.keys(requiredSupplies).map(supply => `
                                    <span class="requirement-item ${availableSupplies[supply] >= requiredSupplies[supply] ? 'sufficient' : 'insufficient'}">
                                        ${questManager.getSupplyIcon(supply)} ${requiredSupplies[supply]}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        <div class="expedition-rewards">
                            <strong>Potential Rewards:</strong>
                            <div class="rewards-list">
                                ${Object.keys(location.rewards).map(resource => {
                    if (resource === 'special') return `<span>✨ ${location.rewards[resource]}</span>`;
                    return `<span>${questManager.getSupplyIcon(resource)} ${location.rewards[resource].min}-${location.rewards[resource].max}</span>`;
                }).join('')}
                            </div>
                        </div>
                        <button class="expedition-start-btn ${!canAfford || availableRoyals.length === 0 ? 'disabled' : ''}" 
                                data-location="${location.id}"
                                ${!canAfford || availableRoyals.length === 0 ? 'disabled' : ''}>
                            ${availableRoyals.length === 0 ? 'No Royal Leaders' : !canAfford ? 'Insufficient Supplies' : 'Plan Expedition'}
                        </button>
                    </div>
                `;
            });

            expeditionsHTML += '</div>';
            return expeditionsHTML;

        } else {
            // Show active expedition status with enhanced details
            const expedition = questManager.currentExpedition;
            const location = expedition.location;
            const progressPercent = questManager.calculateExpeditionProgress();
            const leader = expedition.leader;

            return `
                <div class="active-expedition">
                    <h4>🚶 Active Expedition: ${location.name}</h4>
                    <div class="expedition-leader">
                        <span class="leader-icon">👑</span>
                        <span>Led by: ${leader ? leader.name : 'Unknown Commander'}</span>
                        ${leader ? `<span class="leader-experience">(${leader.experience} exp)</span>` : ''}
                    </div>
                    
                    <div class="expedition-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <p>Progress: ${Math.floor(progressPercent)}% - Phase: ${questManager.expeditionState}</p>
                        <p class="progress-details">
                            ${questManager.expeditionState === 'traveling_out' ? `Traveling to ${location.name}` :
                    questManager.expeditionState === 'battling' ? 'Engaged in battle' :
                        questManager.expeditionState === 'traveling_back' ? 'Returning home' : 'Preparing'}
                        </p>
                    </div>

                    <div class="expedition-status">
                        <div class="status-overview">
                            <h5>📊 Expedition Status</h5>
                            <div class="status-grid">
                                <div class="status-item">
                                    <span class="status-icon">🥖</span>
                                    <span>Food: ${expedition.supplies.food}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">💊</span>
                                    <span>Medicine: ${expedition.supplies.medicine}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">😊</span>
                                    <span>Morale: ${expedition.armyMorale}%</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">🌤️</span>
                                    <span>Weather: ${expedition.weather.name}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">⚰️</span>
                                    <span>Casualties: ${expedition.casualties}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-icon">🏃</span>
                                    <span>Desertions: ${expedition.desertions}</span>
                                </div>
                            </div>
                        </div>

                        ${expedition.pursuitRisk > 0 ? `
                            <div class="pursuit-warning">
                                <span class="warning-icon">⚠️</span>
                                <span>Pursuit Risk: ${Math.floor(expedition.pursuitRisk * 100)}%</span>
                            </div>
                        ` : ''}

                        ${expedition.inventoryItems && expedition.inventoryItems.length > 0 ? `
                            <div class="expedition-inventory">
                                <h5>📦 Special Equipment</h5>
                                <div class="inventory-items">
                                    ${expedition.inventoryItems.map(item =>
                            `<span class="inventory-item">${item.name}</span>`
                        ).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="recent-events">
                            <h5>📰 Recent Events</h5>
                            <div class="events-list">
                                ${expedition.events.slice(-4).map(event =>
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
        if (!modal) {
            console.log('[ModalSystem] Modal not found for quest menu handlers:', modalId);
            return;
        }

        // Handle expedition planning buttons (new system)
        modal.querySelectorAll('.expedition-start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const locationId = e.target.dataset.location;
                if (!e.target.disabled) {
                    // Use new planning system instead of direct start
                    if (questManager.planExpedition(locationId)) {
                        // Planning modal will handle the actual expedition start
                        this.closeModal(modalId);
                    }
                }
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

    // Show wiki menu
    showWikiMenu() {
        const wikiContent = this.generateWikiContent();

        const modalPromise = this.showModal({
            id: 'wiki-modal',
            title: '📖 Game Wiki & Documentation',
            content: wikiContent,
            width: '900px',
            height: '700px',
            className: 'wiki-modal',
            modalType: 'wiki',
            onClose: () => {
                // Clean up any wiki-specific listeners
            }
        });

        // Setup wiki interactions after modal is created
        modalPromise.then(actualModalId => {
            this.setupWikiHandlers(actualModalId);
        });

        return modalPromise;
    }

    generateWikiContent() {
        const navigation = window.WikiData ? window.WikiData.getNavigation() : this.getDefaultNavigation();

        let navigationHTML = '';
        navigation.forEach(category => {
            navigationHTML += `
                <div class="wiki-nav-section">
                    <h4>${category.title}</h4>
                    ${category.sections.map((section, index) => `
                        <button class="wiki-nav-btn ${index === 0 && category === navigation[0] ? 'active' : ''}" 
                                data-section="${section.id}">
                            ${section.label}
                        </button>
                    `).join('')}
                </div>
            `;
        });

        const initialSection = window.WikiData ? window.WikiData.getSection('getting-started') : this.getDefaultSection();

        return `
            <div class="wiki-container">
                <!-- Wiki Navigation -->
                <div class="wiki-nav">
                    ${navigationHTML}
                </div>
                
                <!-- Wiki Content Area -->
                <div class="wiki-content">
                    <div id="wiki-content-area">
                        ${initialSection.content}
                    </div>
                </div>
            </div>
        `;
    }

    getWikiSection(section) {
        if (window.WikiData) {
            return window.WikiData.getSection(section).content;
        }

        // Fallback content if WikiData not available
        return this.getDefaultSection().content;
    }

    getDefaultNavigation() {
        return [
            {
                title: '📋 Game Basics',
                sections: [
                    { id: 'getting-started', label: 'Getting Started' },
                    { id: 'buildings', label: 'Buildings Guide' },
                    { id: 'development', label: 'Development Notes' }
                ]
            }
        ];
    }

    getDefaultSection() {
        return {
            content: `
                <div class="wiki-section">
                    <h3>📖 Game Wiki</h3>
                    <p>Welcome to the game wiki! This system is loading...</p>
                    <div class="wiki-note">
                        <strong>Loading:</strong> Wiki data is being initialized. Please try again in a moment.
                    </div>
                </div>
            `
        };
    }

    setupWikiHandlers(modalId) {
        console.log('🔥 [WIKI TRACKER] setupWikiHandlers called with modalId:', modalId);

        // Wait for the modal to be fully rendered
        setTimeout(() => {
            const modal = document.getElementById('wiki-modal') || document.getElementById('wiki') || document.querySelector('.wiki-modal');
            console.log('🔥 [WIKI TRACKER] Found modal element:', !!modal);
            console.log('🔥 [WIKI TRACKER] Modal ID in DOM:', modal ? modal.id : 'N/A');

            if (!modal) {
                console.error('🔥 [WIKI TRACKER] No modal found for wiki handlers setup');
                return;
            }

            // Setup navigation button handlers
            const navButtons = modal.querySelectorAll('.wiki-nav-btn');
            console.log('🔥 [WIKI TRACKER] Found navigation buttons:', navButtons.length);

            navButtons.forEach((btn, index) => {
                console.log('🔥 [WIKI TRACKER] Setting up button', index, 'with section:', btn.dataset.section);

                btn.addEventListener('click', (e) => {
                    console.log('🔥 [WIKI TRACKER] Navigation button clicked:', e.target.dataset.section);

                    // Remove active class from all buttons
                    navButtons.forEach(b => b.classList.remove('active'));

                    // Add active class to clicked button
                    e.target.classList.add('active');

                    // Update content area
                    const section = e.target.dataset.section;
                    const contentArea = modal.querySelector('#wiki-content-area');
                    console.log('🔥 [WIKI TRACKER] Content area found:', !!contentArea);

                    if (contentArea) {
                        const newContent = this.getWikiSection(section);
                        console.log('🔥 [WIKI TRACKER] New content length:', newContent.length);
                        contentArea.innerHTML = newContent;
                    } else {
                        console.error('🔥 [WIKI TRACKER] Content area not found');
                    }
                });
            });

            console.log('🔥 [WIKI TRACKER] Wiki handlers setup complete');
        }, 200);
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

        const modalPromise = this.showModal({
            title: '⚙️ Game Settings',
            content: settingsContent,
            width: '920px',
            height: 'auto',
            className: 'settings-modal',
            modalType: 'settings',
            priority: 1,  // High priority - always appears above other modals
            onClose: () => {
                // Save settings
                this.saveSettings();
            }
        });

        // After the modal is created, wire up interactions to the actual modal id
        modalPromise.then((modalId) => {
            if (!modalId) return;
            const modal = document.getElementById(modalId);
            if (!modal) return;

            // Wire Save & Close button to close the correct modal id
            const saveBtn = modal.querySelector('#settings-save-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveSettings();
                    this.closeModal(modalId);
                });
            }

            // Auto-save on toggle change and apply immediately
            const applyNow = () => {
                try {
                    const current = this.loadSettings();
                    this.applySettingsUI(current);
                } catch (e) {
                    console.warn('[Settings] applySettingsUI error:', e);
                }
            };

            ['setting-sound', 'setting-music', 'setting-animations', 'setting-notifications']
                .forEach(id => {
                    const el = modal.querySelector(`#${id}`);
                    if (el) {
                        el.addEventListener('change', () => {
                            this.saveSettings();
                            applyNow();
                        });
                    }
                });

            // Initial apply when modal opens
            applyNow();

            // Update stats display in the modal
            setTimeout(() => {
                this.updateSettingsStats();
            }, 100);
        });

        return modalPromise;
    }

    // Update stats displayed in the settings modal
    updateSettingsStats() {
        if (!window.gameState) return;

        const gs = window.gameState;
        
        // Calculate stats from gameState
        const totalDays = gs.currentDay || 1;
        const peakPop = gs.stats?.peakPopulation || gs.population || 0;
        const buildingsBuilt = gs.stats?.buildingsBuilt || (gs.buildings?.length || 0);
        const buildingsCurrent = gs.buildings?.length || 0;
        const seasonsPassed = Math.floor(totalDays / 30);
        const yearsPassed = Math.floor(totalDays / 120); // 4 seasons = 1 year

        // Population stats
        const totalBirths = gs.stats?.totalBirths || 0;
        const totalDeaths = gs.stats?.totalDeaths || 0;

        // Expedition stats
        const expeditionsSent = gs.stats?.totalExpeditionsSent || 0;
        const expeditionsSuccess = gs.stats?.successfulExpeditions || 0;
        const expeditionsFailed = gs.stats?.failedExpeditions || 0;

        // Combat stats
        const battlesWon = window.achievementSystem?.stats?.battles_won || gs.stats?.battlesWon || 0;
        const enemiesDefeated = gs.stats?.enemiesDefeated || 0;

        // Dynasty stats
        const monarchCount = gs.royalFamily?.monarchHistory?.length || 1;
        const achievementCount = window.achievementSystem?.unlockedAchievements?.length || 0;

        // Update DOM elements
        const elements = {
            'modal-stat-total-days': totalDays,
            'modal-stat-peak-population': peakPop,
            'modal-stat-buildings-built': buildingsBuilt,
            'modal-stat-buildings-current': buildingsCurrent,
            'modal-stat-seasons-passed': seasonsPassed,
            'modal-stat-years-passed': yearsPassed,
            'modal-stat-total-births': totalBirths,
            'modal-stat-total-deaths': totalDeaths,
            'modal-stat-expeditions-sent': expeditionsSent,
            'modal-stat-expeditions-success': expeditionsSuccess,
            'modal-stat-expeditions-failed': expeditionsFailed,
            'modal-stat-battles-won': battlesWon,
            'modal-stat-enemies-defeated': enemiesDefeated,
            'modal-stat-monarchs': monarchCount,
            'modal-stat-achievements': achievementCount
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value.toLocaleString();
        });
    }

    // Show statistics in a dedicated modal
    showStatsModal() {
        const stats = this.getGameStats();
        
        const content = `
            <div class="stats-modal-content">
                <div class="stats-dashboard">
                    <!-- Time Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">⏱️ Time</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.totalDays.toLocaleString()}</div>
                                <div class="stat-box-label">Days</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.seasonsPassed.toLocaleString()}</div>
                                <div class="stat-box-label">Seasons</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.yearsPassed.toLocaleString()}</div>
                                <div class="stat-box-label">Years</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Population Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">👥 Population</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.peakPop.toLocaleString()}</div>
                                <div class="stat-box-label">Peak Pop</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.totalBirths.toLocaleString()}</div>
                                <div class="stat-box-label">Births</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.totalDeaths.toLocaleString()}</div>
                                <div class="stat-box-label">Deaths</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Building Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">🏗️ Construction</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.buildingsBuilt.toLocaleString()}</div>
                                <div class="stat-box-label">Built</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.buildingsCurrent.toLocaleString()}</div>
                                <div class="stat-box-label">Current</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Expedition Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">🗺️ Expeditions</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.expeditionsSent.toLocaleString()}</div>
                                <div class="stat-box-label">Sent</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.expeditionsSuccess.toLocaleString()}</div>
                                <div class="stat-box-label">Success</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.expeditionsFailed.toLocaleString()}</div>
                                <div class="stat-box-label">Failed</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Combat Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">⚔️ Combat</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.battlesWon.toLocaleString()}</div>
                                <div class="stat-box-label">Wins</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.enemiesDefeated.toLocaleString()}</div>
                                <div class="stat-box-label">Kills</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Dynasty Stats -->
                    <div class="stats-category">
                        <div class="stats-category-title">👑 Dynasty</div>
                        <div class="stats-row">
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.monarchCount.toLocaleString()}</div>
                                <div class="stat-box-label">Monarchs</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-box-value">${stats.achievementCount.toLocaleString()}</div>
                                <div class="stat-box-label">Achievements</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal({
            title: '📊 Game Statistics',
            content,
            modalClass: 'stats-modal',
            buttons: [
                { text: 'Close', class: 'modal-btn-primary', action: 'close' }
            ]
        });
    }

    // Helper to gather all game stats
    getGameStats() {
        const gs = window.gameState || {};
        
        const totalDays = gs.currentDay || 1;
        const seasonsPassed = Math.floor(totalDays / 30);
        const yearsPassed = Math.floor(totalDays / 120);
        
        return {
            totalDays,
            seasonsPassed,
            yearsPassed,
            peakPop: gs.stats?.peakPopulation || gs.population || 0,
            totalBirths: gs.stats?.totalBirths || 0,
            totalDeaths: gs.stats?.totalDeaths || 0,
            buildingsBuilt: gs.stats?.buildingsBuilt || (gs.buildings?.length || 0),
            buildingsCurrent: gs.buildings?.length || 0,
            expeditionsSent: gs.stats?.totalExpeditionsSent || 0,
            expeditionsSuccess: gs.stats?.successfulExpeditions || 0,
            expeditionsFailed: gs.stats?.failedExpeditions || 0,
            battlesWon: window.achievementSystem?.stats?.battles_won || gs.stats?.battlesWon || 0,
            enemiesDefeated: gs.stats?.enemiesDefeated || 0,
            monarchCount: gs.royalFamily?.monarchHistory?.length || 1,
            achievementCount: window.achievementSystem?.unlockedAchievements?.length || 0
        };
    }

    // Async method to load version without blocking
    async loadVersionAsync() {
        const possiblePaths = [
            'public/version.json',
            './version.json',
            '../version.json',
            'version.json'
        ];

        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const data = await response.json();
                    const version = data.version || '0.0.1';
                    window.GAME_VERSION = version;
                    // Update the version display if modal is still open
                    const versionElement = document.getElementById('current-version');
                    if (versionElement) {
                        versionElement.textContent = `v${version}`;
                    }
                    return version;
                }
            } catch (error) {
                // Continue to next path
            }
        }
        return '0.0.1'; // fallback
    }

    generateSettingsContent() {
        const settings = this.loadSettings();

        // Load current version safely
        let currentVersion = '0.0.1'; // fallback
        try {
            // Try to get version from window global (set by version.json)
            if (window.GAME_VERSION) {
                currentVersion = window.GAME_VERSION;
            } else if (window.gameState?.version) {
                currentVersion = window.gameState.version;
            } else {
                // Try to load version asynchronously without blocking
                this.loadVersionAsync().catch(error => {
                    console.log('[Settings] Could not load version:', error);
                });
            }
        } catch (error) {
            console.log('[Settings] Error loading version:', error);
        }

        return `
            <div class="settings-content enhanced-settings">
                <!-- Single column layout for cleaner settings -->
                <div class="settings-single-column">
                    <div class="setting-group setting-group-audio">
                        <div class="setting-group-header">
                            <span class="setting-group-icon">🔊</span>
                            <h5>Audio</h5>
                        </div>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">Sound Effects</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">Background Music</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-music" ${settings.musicEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="setting-group setting-group-gameplay">
                        <div class="setting-group-header">
                            <span class="setting-group-icon">🎮</span>
                            <h5>Gameplay</h5>
                        </div>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">Animations</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-animations" ${settings.animationsEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">Notifications</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-notifications" ${settings.notificationsEnabled ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="setting-group setting-group-data">
                        <div class="setting-group-header">
                            <span class="setting-group-icon">💾</span>
                            <h5>Data Management</h5>
                        </div>
                        <div class="setting-buttons-grid">
                            <button class="settings-btn settings-btn-export" onclick="window.modalSystem.exportSave()">
                                <span class="btn-icon">📤</span>
                                <span>Export Save</span>
                            </button>
                            <button class="settings-btn settings-btn-import" onclick="window.modalSystem.importSave()">
                                <span class="btn-icon">📥</span>
                                <span>Import Save</span>
                            </button>
                            <button class="settings-btn settings-btn-stats" onclick="window.modalSystem.showStatsModal()">
                                <span class="btn-icon">📊</span>
                                <span>View Statistics</span>
                            </button>
                            <button class="settings-btn settings-btn-tutorial" onclick="window.modalSystem.restartTutorial()">
                                <span class="btn-icon">📖</span>
                                <span>Restart Tutorial</span>
                            </button>
                            <button class="settings-btn settings-btn-endrun" onclick="window.modalSystem.endRun()">
                                <span class="btn-icon">🔄</span>
                                <span>End Run</span>
                            </button>
                            <button class="settings-btn settings-btn-reset" onclick="window.modalSystem.hardReset()">
                                <span class="btn-icon">💥</span>
                                <span>Hard Reset</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="setting-group setting-group-info">
                    <div class="game-info-bar">
                        <div class="info-item">
                            <span class="info-icon">🎮</span>
                            <span class="info-text">Idle Dynasty Builder</span>
                        </div>
                        <div class="info-divider"></div>
                        <div class="info-item">
                            <span class="info-icon">📦</span>
                            <span id="current-version" class="info-text version-badge">v${currentVersion}</span>
                        </div>
                    </div>
                </div>

                <div class="settings-actions">
                    <button id="settings-save-btn" class="btn btn-primary settings-save-btn">
                        <span class="btn-icon">✓</span>
                        Save & Close
                    </button>
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
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
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
            // Apply immediately when saved
            this.applySettingsUI(settings);
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // Apply settings to UI/runtime immediately
    applySettingsUI(settings) {
        try {
            const s = settings || this.loadSettings();
            // Toggle a class to allow CSS to disable animations globally
            document.body.classList.toggle('animations-disabled', !s.animationsEnabled);
            // Expose flags for other systems that check them
            window.notificationsEnabled = !!s.notificationsEnabled;
            window.soundEnabled = !!s.soundEnabled;
            window.musicEnabled = !!s.musicEnabled;
        } catch (e) {
            console.warn('[Settings] Failed to apply settings UI:', e);
        }
    }

    exportSave() {
        try {
            // Prefer new save key, fallback to legacy
            const saveData = localStorage.getItem('dynastyBuilder_save')
                || localStorage.getItem('idleDynastyBuilder')
                || localStorage.getItem('gameState');
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
                        // Write to new key; keep legacy for compatibility
                        localStorage.setItem('dynastyBuilder_save', saveData);
                        localStorage.setItem('idleDynastyBuilder', saveData);
                        this.showNotification('Save imported successfully! Reloading to apply...', { type: 'success', duration: 2500 });
                        setTimeout(() => location.reload(), 600);
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
        // Check if a reset confirmation is already active
        const resetModalType = 'confirmation-danger-reset-game';
        if (this.activeModals.has(resetModalType)) {
            console.log('[ModalSystem] Reset confirmation already active, ignoring duplicate request');
            return;
        }

        try {
            this.showConfirmation(
                'Are you sure you want to reset your game? This action cannot be undone!',
                {
                    title: 'Reset Game',
                    type: 'danger',
                    exclusive: true,  // Close any other modals first
                    onConfirm: () => {
                        console.log('[ModalSystem] Reset game confirmed - starting reset process...');
                        console.log('[ModalSystem] LocalStorage before reset:', Object.keys(localStorage));
                        console.log('[ModalSystem] Save data exists:', !!localStorage.getItem('idleDynastyBuilder'));

                        // Call the main app's resetGame for a full reset (in-memory and storage)
                        if (window.app && typeof window.app.resetGame === 'function') {
                            console.log('[ModalSystem] Calling window.app.resetGame()');
                            window.app.resetGame();
                        } else if (window.game && typeof window.game.resetGame === 'function') {
                            console.log('[ModalSystem] Calling window.game.resetGame()');
                            window.game.resetGame();
                        } else {
                            console.log('[ModalSystem] No app.resetGame found, using fallback reset');
                            // Fallback: Stop any running processes and clear everything
                            try {
                                // Stop any auto-play or game loops
                                if (window.gameState && window.gameState.stopAutoPlay) {
                                    console.log('[ModalSystem] Stopping auto-play...');
                                    window.gameState.stopAutoPlay();
                                }
                                if (window.game && window.game.stopGameLoop) {
                                    console.log('[ModalSystem] Stopping game loop...');
                                    window.game.stopGameLoop();
                                }

                                console.log('[ModalSystem] Clearing localStorage...');
                                // Clear all storage
                                localStorage.clear();
                                sessionStorage.clear();

                                console.log('[ModalSystem] LocalStorage after clear:', Object.keys(localStorage));
                                console.log('[ModalSystem] Reloading page...');

                                // Force full page reload to start completely fresh
                                location.href = location.href.split('?')[0]; // Remove any query params
                            } catch (error) {
                                console.error('[ModalSystem] Error during fallback reset:', error);
                                location.reload(); // Last resort
                            }
                        }
                    }
                }
            ).then(result => {
                if (result === null) {
                    console.log('[ModalSystem] Confirmation dialog failed to show properly');
                }
                // If result is the modal ID or true/false, the confirmation was shown successfully
                console.log('[ModalSystem] Confirmation dialog shown successfully');
            }).catch(error => {
                console.error('[ModalSystem] Failed to show confirmation dialog:', error);
                // Fallback to direct reset if modal system fails
                console.log('[ModalSystem] Using direct reset fallback');
                localStorage.clear();
                sessionStorage.clear();
                location.reload();
            });
        } catch (error) {
            console.error('[ModalSystem] Error in resetGame:', error);
            // Emergency fallback - just do the reset without confirmation
            console.log('[ModalSystem] Modal system failed, performing emergency reset');
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }

    /**
     * End Run - kills current run and lets you start fresh (preserves legacy data)
     */
    endRun() {
        this.showConfirmation(
            '<p>This will end your current run and return you to the home screen.</p><p>Your <strong>legacy data</strong> and <strong>achievements</strong> will be preserved.</p><p>Are you sure?</p>',
            {
                title: 'End Current Run',
                confirmText: 'End Run',
                cancelText: 'Cancel',
                type: 'warning',
                exclusive: true,
                onConfirm: () => {
                    console.log('[ModalSystem] End Run confirmed - clearing run data only');
                    
                    // Keys to preserve (legacy and achievements)
                    const preserveKeys = [
                        'dynastyBuilder_legacy',
                        'dynastyBuilder_achievements',
                        'idleDynastyBuilder_achievements'
                    ];
                    
                    // Store preserved data
                    const preserved = {};
                    preserveKeys.forEach(key => {
                        const data = localStorage.getItem(key);
                        if (data) preserved[key] = data;
                    });
                    
                    // Clear all localStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Restore preserved data
                    Object.entries(preserved).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });
                    
                    // Force reload to home screen
                    window.location.href = window.location.origin + window.location.pathname;
                }
            }
        );
    }

    /**
     * Hard Reset - wipes ALL data including legacy and returns to home screen
     */
    hardReset() {
        this.showConfirmation(
            '<p style="color: #e74c3c;"><strong>WARNING: This will delete ALL your data!</strong></p><p>This includes:</p><ul><li>Current game progress</li><li>Legacy points and upgrades</li><li>All achievements</li><li>Dynasty history</li></ul><p>This action <strong>cannot be undone</strong>.</p><p>Are you absolutely sure?</p>',
            {
                title: '⚠️ Hard Reset',
                confirmText: 'Delete Everything',
                cancelText: 'Cancel',
                type: 'danger',
                exclusive: true,
                onConfirm: () => {
                    console.log('[ModalSystem] Hard Reset confirmed - wiping all data');
                    
                    // Clear everything
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Also clear any in-memory state
                    if (window.gameState) {
                        window.gameState = null;
                    }
                    
                    // Force reload to home screen
                    window.location.href = window.location.origin + window.location.pathname;
                }
            }
        );
    }

    /**
     * End Dynasty - prestige mechanic with legacy rewards (preserved for external calls)
     */
    endDynasty() {
        if (window.legacySystem && window.gameState) {
            const dynastyName = window.gameState.dynastyName || 'Unknown';
            window.legacySystem.showEndDynastyModal(window.gameState, dynastyName);
        } else {
            // Fallback to end run if legacy system not available
            console.warn('[ModalSystem] Legacy system not available, falling back to endRun');
            this.endRun();
        }
    }

    /**
     * Show the Legacy Panel to view/spend legacy points
     */
    showLegacyPanel() {
        if (!window.legacySystem) {
            this.showError('Legacy system not available');
            return;
        }

        const stats = window.legacySystem.getStats();
        const bonuses = stats.bonuses;
        
        // Define upgrade costs (increasing)
        const upgradeCosts = {
            startingGold: Math.max(25, Math.floor((bonuses.startingGold / 50) * 10) + 25),
            startingFood: Math.max(20, Math.floor((bonuses.startingFood / 25) * 10) + 20),
            startingPopulation: Math.max(50, Math.floor(bonuses.startingPopulation * 25) + 50),
            productionBonus: Math.max(30, Math.floor((bonuses.productionBonus / 5) * 15) + 30),
            buildSpeedBonus: Math.max(30, Math.floor((bonuses.buildSpeedBonus / 5) * 15) + 30),
            combatBonus: Math.max(40, Math.floor((bonuses.combatBonus / 5) * 20) + 40),
            explorationBonus: Math.max(20, Math.floor((bonuses.explorationBonus / 10) * 10) + 20)
        };

        const upgradeLabels = {
            startingGold: { icon: '💰', name: 'Starting Gold', value: `+${bonuses.startingGold}`, per: '+50 gold' },
            startingFood: { icon: '🍖', name: 'Starting Food', value: `+${bonuses.startingFood}`, per: '+25 food' },
            startingPopulation: { icon: '👥', name: 'Starting Pop', value: `+${bonuses.startingPopulation}`, per: '+1 villager' },
            productionBonus: { icon: '⚒️', name: 'Production', value: `+${bonuses.productionBonus}%`, per: '+5%' },
            buildSpeedBonus: { icon: '🔨', name: 'Build Speed', value: `+${bonuses.buildSpeedBonus}%`, per: '+5%' },
            combatBonus: { icon: '⚔️', name: 'Combat', value: `+${bonuses.combatBonus}%`, per: '+5%' },
            explorationBonus: { icon: '🗺️', name: 'Exploration', value: `+${bonuses.explorationBonus}%`, per: '+10%' }
        };

        let upgradesHtml = Object.entries(upgradeLabels).map(([key, info]) => {
            const cost = upgradeCosts[key];
            const canAfford = stats.totalPoints >= cost;
            const btnClass = canAfford ? 'legacy-upgrade-btn' : 'legacy-upgrade-btn disabled';
            return `
                <div class="legacy-upgrade-row">
                    <span class="upgrade-icon">${info.icon}</span>
                    <span class="upgrade-name">${info.name}</span>
                    <span class="upgrade-value">${info.value}</span>
                    <button class="${btnClass}" data-upgrade="${key}" data-cost="${cost}" ${!canAfford ? 'disabled' : ''}>
                        ${info.per} (${cost} pts)
                    </button>
                </div>
            `;
        }).join('');

        let titlesHtml = stats.titles.length > 0 
            ? stats.titles.map(t => `<span class="legacy-title">${t}</span>`).join(' ') 
            : '<span style="color:#7f8c8d;">No titles earned yet</span>';

        let historyHtml = stats.history.length > 0
            ? stats.history.slice(-5).reverse().map(d => `
                <div class="dynasty-history-item">
                    <strong>${d.name}</strong> - ${d.daysRuled} days, ${d.peakPopulation} pop
                    <span style="color:#f39c12;float:right;">+${d.legacyEarned} pts</span>
                </div>
            `).join('')
            : '<p style="color:#7f8c8d;">No dynasties completed yet</p>';

        const content = `
            <div class="legacy-panel">
                <div class="legacy-header">
                    <div class="legacy-points-display">
                        <span class="points-icon">🏛️</span>
                        <span class="points-value">${stats.totalPoints}</span>
                        <span class="points-label">Legacy Points</span>
                    </div>
                    <div class="legacy-stats">
                        <div>Dynasties: ${stats.dynastiesCompleted}</div>
                        <div>Best Run: ${stats.highestDay} days</div>
                        <div>Peak Pop: ${stats.highestPopulation}</div>
                    </div>
                </div>

                <div class="legacy-section">
                    <h4>🎖️ Titles Earned</h4>
                    <div class="titles-container">${titlesHtml}</div>
                </div>

                <div class="legacy-section">
                    <h4>⬆️ Permanent Upgrades</h4>
                    <p style="color:#7f8c8d;font-size:0.9em;margin-bottom:12px;">
                        These bonuses apply to all future dynasties
                    </p>
                    <div class="upgrades-container">${upgradesHtml}</div>
                </div>

                <div class="legacy-section">
                    <h4>📜 Dynasty History</h4>
                    <div class="history-container">${historyHtml}</div>
                </div>
            </div>
            <style>
                .legacy-panel { color: #ecf0f1; }
                .legacy-header { display: flex; justify-content: space-between; align-items: center; background: #2c3e50; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
                .legacy-points-display { display: flex; align-items: center; gap: 10px; }
                .points-icon { font-size: 32px; }
                .points-value { font-size: 32px; font-weight: bold; color: #f39c12; }
                .points-label { font-size: 14px; color: #95a5a6; }
                .legacy-stats { text-align: right; font-size: 14px; color: #bdc3c7; }
                .legacy-section { background: #1a252f; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                .legacy-section h4 { margin: 0 0 12px; color: #f39c12; }
                .titles-container { display: flex; flex-wrap: wrap; gap: 8px; }
                .legacy-title { background: #34495e; padding: 4px 12px; border-radius: 16px; font-size: 0.9em; }
                .upgrades-container { display: flex; flex-direction: column; gap: 8px; }
                .legacy-upgrade-row { display: flex; align-items: center; gap: 12px; padding: 8px; background: #2c3e50; border-radius: 6px; }
                .upgrade-icon { font-size: 20px; width: 30px; text-align: center; }
                .upgrade-name { flex: 1; }
                .upgrade-value { color: #2ecc71; font-weight: bold; min-width: 60px; text-align: right; }
                .legacy-upgrade-btn { padding: 6px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
                .legacy-upgrade-btn:hover:not(:disabled) { background: #2ecc71; }
                .legacy-upgrade-btn.disabled { background: #34495e; color: #7f8c8d; cursor: not-allowed; }
                .history-container { max-height: 150px; overflow-y: auto; }
                .dynasty-history-item { padding: 8px; background: #2c3e50; border-radius: 4px; margin-bottom: 6px; font-size: 0.9em; }
            </style>
        `;

        this.showModal({
            title: '🏛️ Dynasty Legacy',
            content: content,
            maxWidth: '550px'
        });

        // Add click handlers for upgrade buttons
        setTimeout(() => {
            document.querySelectorAll('.legacy-upgrade-btn:not(.disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    const upgradeType = btn.dataset.upgrade;
                    const cost = parseInt(btn.dataset.cost);
                    const result = window.legacySystem.purchaseBonus(upgradeType, cost);
                    if (result.success) {
                        // Refresh the panel
                        this.closeAllModals();
                        setTimeout(() => this.showLegacyPanel(), 100);
                    }
                });
            });
        }, 50);
    }

    // Restart the tutorial
    restartTutorial() {
        this.showConfirmation(
            'This will restart the tutorial from the beginning. Your game progress will NOT be affected.',
            {
                title: '📖 Restart Tutorial',
                type: 'info',
                onConfirm: () => {
                    console.log('[ModalSystem] Restarting tutorial...');
                    
                    // Close settings modal first
                    this.closeAllModals();
                    
                    // Reset tutorial state
                    const tutorialManager = window.tutorialManager || (window.game && window.game.tutorialManager);
                    if (tutorialManager) {
                        tutorialManager.resetTutorial();
                        
                        // Start the tutorial again
                        setTimeout(() => {
                            tutorialManager.showIntro();
                        }, 300);
                        
                        window.showToast('Tutorial restarted!', {
                            icon: '📖',
                            type: 'success',
                            timeout: 3000
                        });
                    } else {
                        console.error('[ModalSystem] Tutorial manager not found');
                        window.showToast('Could not restart tutorial', {
                            icon: '❌',
                            type: 'error',
                            timeout: 3000
                        });
                    }
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

    // Show death report modal
    showDeathReportModal(gameState, timeframe = 'daily') {
        const deathReportContent = this.generateDeathReportContent(gameState, timeframe);

        return this.showModal({
            id: 'death-report-modal',
            title: '💀 Death Report',
            content: deathReportContent,
            width: '700px',
            height: '600px',
            className: 'death-report-modal',
            modalType: 'death-report',
            onClose: () => {
                // Clean up death report listeners
            }
        });
    }

    generateDeathReportContent(gameState, timeframe) {
        const deathData = gameState.getDeathReportData(timeframe);
        const { expectedDeaths, imminentDeaths, ageGroups, totalAtRisk, totalPopulation } = deathData;

        // Calculate percentages
        const deathPercentage = totalPopulation > 0 ? ((expectedDeaths / totalPopulation) * 100).toFixed(1) : '0.0';
        const riskPercentage = totalPopulation > 0 ? ((totalAtRisk / totalPopulation) * 100).toFixed(1) : '0.0';

        return `
            <div class="death-report-content">
                <div class="death-report-header">
                    <div class="report-summary">
                        <div class="summary-stat">
                            <span class="stat-number">${expectedDeaths}</span>
                            <span class="stat-label">Expected Deaths (${timeframe})</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-number">${deathPercentage}%</span>
                            <span class="stat-label">of Population</span>
                        </div>
                        <div class="summary-stat">
                            <span class="stat-number">${totalAtRisk}</span>
                            <span class="stat-label">At Risk</span>
                        </div>
                    </div>
                    
                    <div class="timeframe-controls">
                        <button class="timeframe-btn ${timeframe === 'daily' ? 'active' : ''}" 
                                onclick="window.modalSystem.switchDeathReportTimeframe('daily')">
                            📅 Daily View
                        </button>
                        <button class="timeframe-btn ${timeframe === 'monthly' ? 'active' : ''}" 
                                onclick="window.modalSystem.switchDeathReportTimeframe('monthly')">
                            📊 Monthly View
                        </button>
                    </div>
                </div>
                
                <div class="death-risk-groups">
                    <h4>Death Risk by Age Group</h4>
                    <div class="risk-groups-list">
                        ${Object.values(ageGroups).map(group => `
                            <div class="risk-group ${group.count > 0 ? 'has-villagers' : 'empty'}">
                                <div class="risk-group-header">
                                    <span class="risk-group-name">${group.name}</span>
                                    <span class="risk-group-count">${group.count} villagers</span>
                                </div>
                                ${group.count > 0 ? `
                                    <div class="risk-group-villagers">
                                        ${group.villagers.slice(0, 10).map(villager => `
                                            <span class="villager-name" title="Age: ${villager.age} days">${villager.name}</span>
                                        `).join('')}
                                        ${group.villagers.length > 10 ? `<span class="more-villagers">+${group.villagers.length - 10} more</span>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="death-report-info">
                    <div class="info-section">
                        <h5>📋 Report Information</h5>
                        <ul>
                            <li>Villagers die of old age at 198 days</li>
                            <li>Daily view shows expected deaths in the next day</li>
                            <li>Monthly view estimates deaths over the next 30 days</li>
                            <li>Risk calculations are based on age proximity to death</li>
                        </ul>
                    </div>
                    
                    <div class="population-overview">
                        <h5>👥 Population Overview</h5>
                        <div class="overview-stats">
                            <div class="overview-stat">Total Population: <strong>${totalPopulation}</strong></div>
                            <div class="overview-stat">At Risk (160+ days): <strong>${totalAtRisk}</strong></div>
                            <div class="overview-stat">Risk Percentage: <strong>${riskPercentage}%</strong></div>
                        </div>
                    </div>
                </div>
                
                <div class="death-report-actions">
                    <button class="btn btn-primary" onclick="window.modalSystem.closeModal('death-report-modal')">Close Report</button>
                </div>
            </div>
        `;
    }

    // Switch death report timeframe
    switchDeathReportTimeframe(timeframe) {
        if (!window.gameState) return;

        // Update the modal content
        const modal = document.getElementById('death-report-modal');
        if (modal) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.innerHTML = this.generateDeathReportContent(window.gameState, timeframe);
            }
        }
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

    // Test function to verify modal system works
    testModalSystem() {
        console.log('🔥 [TEST] Testing modal system...');
        const testModal = this.showModal({
            title: 'Test Modal',
            content: '<p>This is a test modal to verify the system works.</p>',
            width: '400px',
            height: '300px',
            modalType: 'test'
        });
        console.log('🔥 [TEST] Test modal result:', testModal);
        return testModal;
    }
}

// Create global modal system instance
window.modalSystem = new ModalSystem();

// Add test function globally
window.testModal = () => window.modalSystem.testModalSystem();

// Global showModal function for backwards compatibility
window.showModal = (title, content, options = {}) => {
    return window.modalSystem.showModal({
        title: title,
        content: content,
        ...options
    });
};

// Backwards compatibility - replace old showNotification function
window.showNotification = (message, options = {}) => {
    return window.modalSystem.showNotification(message, options);
};

// Make ModalSystem available globally
window.ModalSystem = ModalSystem;

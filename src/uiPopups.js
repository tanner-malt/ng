// ===== TOAST NOTIFICATIONS =====
// Brief, non-intrusive notifications (e.g., "Building placed", "Resource gained")
// Usage: window.showToast('Building placed successfully!', {icon: '🏠', type: 'success'})
function showToast(message, opts = {}) {
    console.log('[UI] Toast:', message);
    
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    // Limit to 3 visible toast notifications
    while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }
    
    const toast = document.createElement('div');
    const type = opts.type || 'info';
    toast.className = `toast-notification toast-${type}`;
    
    // Build toast content
    let content = '';
    if (opts.icon) {
        content += `<span class="toast-icon">${opts.icon}</span>`;
    }
    content += `<span class="toast-message">${message}</span>`;
    toast.innerHTML = content;
    
    // Style the toast
    toast.style.cssText = `
        position: relative;
        background: linear-gradient(135deg, #2c3e50, #34495e);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-left: 4px solid ${getTypeColor(type)};
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #ecf0f1;
        max-width: 320px;
        z-index: 1000;
    `;
    
    // Click to dismiss
    toast.onclick = () => dismissToast(toast);
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });
    
    // Auto-dismiss
    setTimeout(() => dismissToast(toast), opts.timeout || 3000);
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function getTypeColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db',
        building: '#9b59b6'
    };
    return colors[type] || colors.info;
}

// Export toast functions
window.showToast = showToast;

// Popup/modal UI logic for top-right icons (progression, settings, quit)
// All DOM event binding and popup show/hide logic is here

function bindTopRightPopups(game) {
    console.log('[UI] bindTopRightPopups called');
    console.log('[UI] progress-btn:', document.getElementById('progress-btn'));
    console.log('[UI] progress-popup:', document.getElementById('progress-popup'));
    console.log('[UI] quest-btn:', document.getElementById('quest-btn'));
    console.log('[UI] settings-btn:', document.getElementById('settings-btn'));
    console.log('[UI] settings-popup:', document.getElementById('settings-popup'));
    console.log('[UI] quit-btn:', document.getElementById('quit-btn'));
    
    // Progression popup
    const progressBtn = document.getElementById('progress-btn');
    if (progressBtn && window.modalSystem) {
        progressBtn.onclick = () => {
            console.log('[UI] Progression modal triggered');
            window.modalSystem.showProgressionModal();
        };
        progressBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                progressBtn.click();
            }
        });
    } else {
        if (!progressBtn) console.log('[UI] progress-btn not found');
        if (!window.modalSystem) console.log('[UI] modalSystem not available');
    }

    // Message History button
    const messageHistoryBtn = document.getElementById('message-history-btn');
    if (messageHistoryBtn && window.messageHistory) {
        messageHistoryBtn.onclick = () => {
            console.log('[UI] Message history triggered');
            window.messageHistory.showHistory();
        };
        messageHistoryBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                messageHistoryBtn.click();
            }
        });
    } else {
        if (!messageHistoryBtn) console.log('[UI] message-history-btn not found');
        if (!window.messageHistory) console.log('[UI] messageHistory not available');
    }

    // Quest menu button
    const questBtn = document.getElementById('quest-btn');
    if (questBtn && game && game.questManager && window.modalSystem) {
        questBtn.onclick = () => {
            console.log('[UI] Quest menu triggered');
            window.modalSystem.showQuestMenu(game.questManager);
        };
        questBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                questBtn.click();
            }
        });
    } else {
        if (!questBtn) console.log('[UI] quest-btn not found');
        if (!game.questManager) console.log('[UI] questManager not available');
        if (!window.modalSystem) console.log('[UI] modalSystem not available');
    }

    // Settings/menu popup
    const settingsBtn = document.getElementById('settings-btn');
    console.log('[UI] Settings button found:', !!settingsBtn);
    console.log('[UI] modalSystem available:', !!window.modalSystem);
    
    // Define game version globally if not already
    if (!window.GAME_VERSION) window.GAME_VERSION = '0.0.1';
    
    if (settingsBtn && window.modalSystem) {
        console.log('[UI] Setting up settings button click handler...');
        settingsBtn.onclick = () => {
            console.log('[UI] Settings modal triggered');
            window.modalSystem.showSettingsModal();
        };
        
        // Also add event listener as a backup
        settingsBtn.addEventListener('click', () => {
            console.log('[UI] Settings button clicked via addEventListener');
        });
        
        console.log('[UI] Settings button click handler attached successfully');
        
        settingsBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                settingsBtn.click();
            }
        });
    } else {
        if (!settingsBtn) console.log('[UI] settings-btn not found');
        if (!window.modalSystem) console.log('[UI] modalSystem not available');
    }

    // Sound button
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        let soundEnabled = true;
        soundBtn.onclick = () => {
            soundEnabled = !soundEnabled;
            soundBtn.querySelector('span').textContent = soundEnabled ? '🔊' : '🔇';
            soundBtn.title = soundEnabled ? 'Sound: On' : 'Sound: Off';
            console.log('[UI] Sound toggled:', soundEnabled ? 'ON' : 'OFF');
        };
        soundBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                soundBtn.click();
            }
        });
    } else {
        console.log('[UI] sound-btn not found');
    }

    // Quit button
    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) {
        quitBtn.onclick = () => {
            console.log('[UI] Quit button triggered');
            window.location.reload();
        };
    } else {
        console.log('[UI] quit-btn not found');
    }
}

// Simplified unified restart function - uses only modalSystem
function performGameReset() {
    console.log('[UI] performGameReset called');
    
    // Don't show our own confirmation - let modalSystem handle it
    console.log('[UI] Delegating reset to modalSystem');
    
    // Use modalSystem for reset
    if (window.modalSystem && typeof window.modalSystem.resetGame === 'function') {
        console.log('[UI] Using modalSystem reset');
        window.modalSystem.resetGame();
    } else if (window.app && typeof window.app.resetGame === 'function') {
        console.log('[UI] Using app.resetGame with confirmation');
        // Fallback - use modalSystem for confirmation if available
        if (window.modalSystem && window.modalSystem.showConfirmation) {
            window.modalSystem.showConfirmation(
                'Are you sure you want to restart the game? This will erase your progress.',
                {
                    title: 'Restart Game',
                    type: 'danger',
                    onConfirm: () => window.app.resetGame()
                }
            );
        } else {
            // Last resort - native confirm
            if (confirm('Are you sure you want to restart the game? This will erase your progress.')) {
                window.app.resetGame();
            }
        }
    } else {
        console.log('[UI] Using fallback reset - clearing localStorage and reloading');
        // Fallback - use modalSystem for confirmation if available
        if (window.modalSystem && window.modalSystem.showConfirmation) {
            window.modalSystem.showConfirmation(
                'Are you sure you want to restart the game? This will erase your progress.',
                {
                    title: 'Restart Game',
                    type: 'danger',
                    onConfirm: () => {
                        localStorage.clear();
                        sessionStorage.clear();
                        location.reload();
                    }
                }
            );
        } else {
            // Last resort - native confirm
            if (confirm('Are you sure you want to restart the game? This will erase your progress.')) {
                localStorage.clear();
                sessionStorage.clear();
                location.reload();
            }
        }
    }
}

// Attach to window for browser compatibility
window.bindTopRightPopups = bindTopRightPopups;
window.performGameReset = performGameReset;

// ===== MINI TOAST NOTIFICATIONS =====
// Ultra-lightweight notifications for small changes (resource updates, building completion)
// Usage: window.showMiniToast('🏠') or window.showMiniToast('💰', '+50')
function showMiniToast(icon, numberChange = null, opts = {}) {
    // Create mini toast container if it doesn't exist
    let container = document.getElementById('mini-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mini-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 2000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        document.body.appendChild(container);
    }
    
    // Remove old toasts (keep max 5)
    while (container.children.length >= 5) {
        container.removeChild(container.firstChild);
    }
    
    const miniToast = document.createElement('div');
    miniToast.className = 'mini-toast';
    
    // Build content
    let content = `<span class="mini-toast-icon">${icon}</span>`;
    if (numberChange) {
        const isPositive = !numberChange.startsWith('-');
        const color = isPositive ? '#2ecc71' : '#e74c3c';
        content += `<span class="mini-toast-number" style="color: ${color};">${numberChange}</span>`;
    }
    miniToast.innerHTML = content;
    
    // Style the mini toast
    const bgColor = opts.background || 'rgba(44, 62, 80, 0.9)';
    miniToast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        background: ${bgColor};
        border-radius: 20px;
        padding: 6px 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
        font-size: 14px;
        font-weight: 500;
        color: #ecf0f1;
        transform: translateX(100%) scale(0.8);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        min-width: 40px;
        justify-content: center;
    `;
    
    container.appendChild(miniToast);
    
    // Animate in
    requestAnimationFrame(() => {
        miniToast.style.transform = 'translateX(0) scale(1)';
        miniToast.style.opacity = '1';
    });
    
    // Auto-dismiss
    const duration = opts.duration || 2000;
    setTimeout(() => {
        if (miniToast.parentNode) {
            miniToast.style.transform = 'translateX(100%) scale(0.8)';
            miniToast.style.opacity = '0';
            setTimeout(() => {
                if (miniToast.parentNode) {
                    miniToast.parentNode.removeChild(miniToast);
                }
            }, 300);
        }
    }, duration);
}

// Helper function for resource changes
function showResourceChange(resource, amount) {
    const icons = {
        food: '🌾',
        wood: '🪵', 
        stone: '🪨',
        metal: '⚱️',
        gold: '💰',
        population: '👥'
    };
    
    const icon = icons[resource] || '📦';
    const change = amount > 0 ? `+${amount}` : `${amount}`;
    showMiniToast(icon, change);
}

// Helper function for building completion
function showBuildingComplete(buildingType) {
    const icons = {
        house: '🏠',
        farm: '🚜',
        townCenter: '🏛️',
        barracks: '🏰',
        mine: '⛏️',
        market: '🏪'
    };
    
    const icon = icons[buildingType] || '🏗️';
    showMiniToast(icon, null, { 
        background: 'rgba(46, 204, 113, 0.9)',
        duration: 3000 
    });
}

// Attach to window
window.showMiniToast = showMiniToast;
window.showResourceChange = showResourceChange;
window.showBuildingComplete = showBuildingComplete;

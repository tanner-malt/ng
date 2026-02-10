// ===== UNIFIED TOAST NOTIFICATION SYSTEM =====
// Single API for all transient notifications in the game.
// Usage:
//   showToast('Building placed!', { icon: '🏠', type: 'success' })
//   showToast('Stone quarry now available!', { title: 'New Unlock!', type: 'unlock', icon: '🔓', timeout: 5000 })
//   showToast('Not enough wood', { type: 'warning', log: false })  // skip message-log entry
//
// Supported types: 'info' | 'success' | 'warning' | 'error' | 'building' | 'unlock'
// All toasts auto-log to MessageHistory unless { log: false }.

function showToast(message, opts = {}) {
    const type = opts.type || 'info';
    const title = opts.title || null;
    const icon = opts.icon || null;
    const timeout = opts.timeout || (type === 'unlock' ? 5000 : 3000);
    const shouldLog = opts.log !== false;

    // --- Log to MessageHistory ---
    if (shouldLog && window.messageHistory) {
        const logTitle = title || message;
        const logContent = title ? message : '';
        window.messageHistory.addMessage(logTitle, logContent, type);
    }

    // --- DOM rendering ---
    const container = document.getElementById('notification-container');
    if (!container) return;

    // Limit to 3 visible toasts
    while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    // Build content — two-line layout when title is present
    let html = '';
    if (icon) {
        html += `<span class="toast-icon">${icon}</span>`;
    }
    if (title) {
        html += `<div class="toast-body">`;
        html += `<div class="toast-title">${title}</div>`;
        html += `<div class="toast-message">${message}</div>`;
        html += `</div>`;
    } else {
        html += `<span class="toast-message">${message}</span>`;
    }
    toast.innerHTML = html;

    // Click to dismiss
    toast.onclick = () => dismissToast(toast);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('toast-enter');
    });

    // Auto-dismiss
    setTimeout(() => dismissToast(toast), timeout);
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Export toast functions
window.showToast = showToast;

// Popup/modal UI logic for top-right icons (progression, settings, quit)
// All DOM event binding and popup show/hide logic is here

function bindTopRightPopups(game) {
    console.log('[UI] bindTopRightPopups called');
    console.log('[UI] progress-btn:', document.getElementById('progress-btn'));
    console.log('[UI] progress-popup:', document.getElementById('progress-popup'));
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

    // Settings/menu popup
    const settingsBtn = document.getElementById('settings-btn');
    console.log('[UI] Settings button found:', !!settingsBtn);
    console.log('[UI] modalSystem available:', !!window.modalSystem);
    
    // Define game version globally if not already
    if (!window.GAME_VERSION) window.GAME_VERSION = '0.0.1';
    
    if (settingsBtn && window.modalSystem) {
        console.log('[UI] Setting up settings button click handler...');
        settingsBtn.onclick = () => {
            // console.log('🔥 [CLICK TRACKER] Settings button clicked!');
            // console.log('🔥 [CLICK TRACKER] Timestamp:', new Date().toISOString());
            console.log('[UI] Settings modal triggered');
            
            try {
                const result = window.modalSystem.showSettingsModal();
                // console.log('🔥 [CLICK TRACKER] Settings modal result:', result);
                
                // Check if modal appeared
                setTimeout(() => {
                    const modal = document.getElementById('settings');
                    const overlay = document.getElementById('modal-overlay');
                    // console.log('🔥 [CLICK TRACKER] Settings modal in DOM:', !!modal);
                    // console.log('🔥 [CLICK TRACKER] Settings overlay visible:', overlay ? overlay.style.display !== 'none' : false);
                }, 100);
                
            } catch (error) {
                console.error('[UI] Settings modal error:', error);
            }
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

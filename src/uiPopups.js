// Show a notification (toast) for tutorial/milestone messages
// Usage: window.showNotification('Your message here', {timeout: 4000, icon: '⭐'})
function showNotification(message, opts = {}) {
    const container = document.getElementById('notification-container');
    const overlay = document.getElementById('notification-overlay');
    if (!container || !overlay) return;
    // Limit to 3 visible notifications
    while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }
    const notif = document.createElement('div');
    let type = opts.type || 'info';
    notif.className = 'game-notification game-notification-' + type;
    if (opts.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.textContent = opts.icon;
        notif.appendChild(iconSpan);
    }
    const msgSpan = document.createElement('span');
    msgSpan.innerHTML = message;
    notif.appendChild(msgSpan);
    // Click to dismiss
    notif.style.cursor = 'pointer';
    notif.onclick = () => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 400);
        // Hide overlay if no more notifications
        setTimeout(() => {
            if (container.children.length === 0) overlay.style.display = 'none';
        }, 400);
    };
    container.appendChild(notif);
    // Show overlay
    overlay.style.display = 'block';
    // Auto-remove after timeout
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => {
            notif.remove();
            if (container.children.length === 0) overlay.style.display = 'none';
        }, 400);
    }, opts.timeout || 4000);
}
window.showNotification = showNotification;
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
            window.modalSystem.showProgressionModal(game);
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

    // Tutorial button
    const tutorialBtn = document.getElementById('tutorial-btn');
    if (tutorialBtn && window.modalSystem) {
        tutorialBtn.onclick = () => {
            console.log('[UI] Tutorial modal triggered');
            window.modalSystem.showTutorialModal();
        };
        tutorialBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                tutorialBtn.click();
            }
        });
    } else {
        if (!tutorialBtn) console.log('[UI] tutorial-btn not found');
        if (!window.modalSystem) console.log('[UI] modalSystem not available');
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
    if (settingsBtn && window.modalSystem) {
        settingsBtn.onclick = () => {
            console.log('[UI] Settings modal triggered');
            window.modalSystem.showSettingsModal();
        };
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

// Attach to window for browser compatibility
window.bindTopRightPopups = bindTopRightPopups;

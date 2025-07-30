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
    console.log('[UI] settings-btn:', document.getElementById('settings-btn'));
    console.log('[UI] settings-popup:', document.getElementById('settings-popup'));
    console.log('[UI] quit-btn:', document.getElementById('quit-btn'));
    // Progression popup
    const progressBtn = document.getElementById('progress-btn');
    const progressPopup = document.getElementById('progress-popup');
    if (progressBtn && progressPopup) {
        let lastFocusedElement = null;
        const showProgress = () => {
            console.log('[UI] Progression popup triggered');
            progressPopup.style.display = 'flex';
            if (game && typeof game.updateProgressPopup === 'function') {
                game.updateProgressPopup();
            }
            // Focus management: save last focused and focus first button
            lastFocusedElement = document.activeElement;
            const firstBtn = progressPopup.querySelector('button, [tabindex="0"]');
            if (firstBtn) firstBtn.focus();
        };
        const closeProgress = () => {
            progressPopup.style.display = 'none';
            if (lastFocusedElement) lastFocusedElement.focus();
        };
        progressBtn.onclick = showProgress;
        progressBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                showProgress();
            }
        });
        // Accessibility: close on Escape
        document.addEventListener('keydown', (e) => {
            if (progressPopup.style.display === 'flex' && e.key === 'Escape') {
                closeProgress();
                console.log('[UI] Progression popup closed with Escape');
            }
        });
        // Accessibility: close on overlay click
        progressPopup.addEventListener('click', (e) => {
            if (e.target === progressPopup) {
                closeProgress();
                console.log('[UI] Progression popup closed by overlay click');
            }
        });
        // ARIA attributes
        progressPopup.setAttribute('role', 'dialog');
        progressPopup.setAttribute('aria-modal', 'true');
    } else {
        if (!progressBtn) console.log('[UI] progress-btn not found');
        if (!progressPopup) console.log('[UI] progress-popup not found');
    }

    // Settings/menu popup
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsBtn && settingsPopup) {
        let lastFocusedElement = null;
        settingsBtn.onclick = () => {
            console.log('[UI] Settings popup triggered');
            settingsPopup.style.display = 'flex';
            // Show version from version.json
            const versionEl = document.getElementById('game-version');
            if (versionEl) {
                fetch('version.json')
                    .then(res => res.json())
                    .then(data => {
                        versionEl.textContent = `Version: ${data.version}`;
                    })
                    .catch(() => {
                        versionEl.textContent = 'Version: unknown';
                    });
            }
            // Focus management: save last focused and focus first button
            lastFocusedElement = document.activeElement;
            const firstBtn = settingsPopup.querySelector('button, [tabindex="0"]');
            if (firstBtn) firstBtn.focus();
        };
        const closeSettings = () => {
            settingsPopup.style.display = 'none';
            if (lastFocusedElement) lastFocusedElement.focus();
        };
        // Accessibility: close on Escape
        document.addEventListener('keydown', (e) => {
            if (settingsPopup.style.display === 'flex' && e.key === 'Escape') {
                closeSettings();
                console.log('[UI] Settings popup closed with Escape');
            }
        });
        // Accessibility: close on overlay click
        settingsPopup.addEventListener('click', (e) => {
            if (e.target === settingsPopup) {
                closeSettings();
                console.log('[UI] Settings popup closed by overlay click');
            }
        });
        // ARIA attributes
        settingsPopup.setAttribute('role', 'dialog');
        settingsPopup.setAttribute('aria-modal', 'true');
    } else {
        if (!settingsBtn) console.log('[UI] settings-btn not found');
        if (!settingsPopup) console.log('[UI] settings-popup not found');
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

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
        const showProgress = () => {
            console.log('[UI] Progression popup triggered');
            progressPopup.style.display = 'flex';
            if (game && typeof game.updateProgressPopup === 'function') {
                game.updateProgressPopup();
            }
        };
        progressBtn.onclick = showProgress;
        progressBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                showProgress();
            }
        });
    } else {
        if (!progressBtn) console.log('[UI] progress-btn not found');
        if (!progressPopup) console.log('[UI] progress-popup not found');
    }

    // Settings/menu popup
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsBtn && settingsPopup) {
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
        };
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

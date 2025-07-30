// Tutorial and milestone progression logic for Village Defense: Idleo

class TutorialManager {
    constructor(game) {
        this.game = game;
        this.active = true;
    }

    showIntro() {
        window.showNotification(
            `<b>Welcome!</b><br>This is your <b>village view mode</b>, where you will manage the logistics of your kingdom!<br><br>You are the son of the king, and the king sent you to establish a new village to defend!<br><br><b>First, place your Town Center.</b>`,
            { timeout: 7000, icon: '👑' }
        );
        // Optionally, highlight the Town Center button after a delay
        setTimeout(() => this.highlightTownCenterButton(), 7000);
    }

    highlightTownCenterButton() {
        const btn = document.querySelector('.build-btn[data-building="townCenter"]');
        if (btn) {
            btn.classList.add('tutorial-highlight');
            btn.scrollIntoView({behavior: 'smooth', block: 'center'});
            const removeHighlight = () => {
                btn.classList.remove('tutorial-highlight');
                btn.removeEventListener('click', removeHighlight);
            };
            btn.addEventListener('click', removeHighlight);
        }
    }

    showUnlockRequirement(view) {
        let msg = 'This view is locked. Complete the required milestone in the Village view to unlock it!';
        let icon = '🔒';
        switch (view) {
            case 'battle':
                msg = 'Build your Town Center to unlock Battle mode!';
                icon = '⚔️';
                break;
            case 'monarch':
                msg = 'Build a Farm to unlock Monarch mode!';
                icon = '👑';
                break;
            case 'throne':
                msg = 'Build a House to unlock Throne mode!';
                icon = '🏰';
                break;
        }
        window.showNotification(msg, { timeout: 5000, icon });
    }

    // No longer needed; replaced by notification system
}

window.TutorialManager = TutorialManager;

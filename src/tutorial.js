// Tutorial and milestone progression logic for Village Defense: Idleo

class TutorialManager {
    constructor(game) {
        this.game = game;
        this.active = true;
    }

    showIntro() {
        let chatbox = document.getElementById('tutorial-chatbox');
        if (!chatbox) {
            chatbox = document.createElement('div');
            chatbox.id = 'tutorial-chatbox';
            chatbox.className = 'game-chatbox tutorial-chatbox';
            document.body.appendChild(chatbox);
        }
        chatbox.innerHTML = '';
        // Debug visual indicator
        chatbox.style.border = '3px solid #e67e22';
        chatbox.style.background = '#222';
        chatbox.style.zIndex = '9999';
        const msg = document.createElement('div');
        msg.innerHTML = `<b>Welcome!</b><br>This is your <b>village view mode</b>, where you will manage the logistics of your kingdom!<br><br>You are the son of the king, and the king sent you to establish a new village to defend!<br><br><b>First, place your Town Center.</b>`;
        chatbox.appendChild(msg);
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Got it!';
        nextBtn.className = 'chatbox-btn';
        nextBtn.onclick = () => {
            chatbox.style.display = 'none';
            this.highlightTownCenterButton();
        };
        chatbox.appendChild(nextBtn);
        chatbox.style.display = 'flex';
        chatbox.style.visibility = 'visible';
        chatbox.style.opacity = '1';
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
        switch (view) {
            case 'battle':
                msg = 'Build your Town Center to unlock Battle mode!';
                break;
            case 'monarch':
                msg = 'Build a Farm to unlock Monarch mode!';
                break;
            case 'throne':
                msg = 'Build a House to unlock Throne mode!';
                break;
        }
        this.showChatboxMessage(msg);
    }

    showChatboxMessage(message) {
        let chatbox = document.getElementById('unlock-chatbox');
        if (!chatbox) {
            chatbox = document.createElement('div');
            chatbox.id = 'unlock-chatbox';
            chatbox.className = 'game-chatbox unlock-chatbox';
            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '×';
            closeBtn.className = 'chatbox-close';
            closeBtn.onclick = () => chatbox.remove();
            chatbox.appendChild(document.createElement('span'));
            chatbox.appendChild(closeBtn);
            document.body.appendChild(chatbox);
        }
        chatbox.querySelector('span').textContent = message;
        chatbox.style.display = 'flex';
    }
}

window.TutorialManager = TutorialManager;

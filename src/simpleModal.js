/**
 * simpleModal.js - Simplified Modal System
 * 
 * A clean, simple modal system that focuses on reliability over complexity.
 * Designed specifically for the tutorial system with clear, predictable behavior.
 */

class SimpleModal {
    constructor() {
        this.currentModal = null;
        this.overlay = null;
        this.createOverlay();
    }

    createOverlay() {
        // Remove any existing overlay
        const existing = document.getElementById('modal-overlay');
        if (existing) {
            existing.remove();
        }

        // Wait for body to be available
        if (!document.body) {
            console.log('[SimpleModal] Body not ready, waiting...');
            setTimeout(() => this.createOverlay(), 100);
            return;
        }

        // Create new overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(3px);
        `;
        
        document.body.appendChild(this.overlay);
        console.log('[SimpleModal] Overlay created and attached to body');
    }

    show(title, content, options = {}) {
        console.log('[SimpleModal] show() called with title:', title);
        
        return new Promise((resolve) => {
            // Close any existing modal
            this.close();

            const {
                icon = '📋',
                closable = true,
                showCancel = false,
                confirmText = 'OK',
                cancelText = 'Cancel'
            } = options;

            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'simple-modal';
            modal.style.cssText = `
                background: linear-gradient(145deg, #2c3e50, #34495e);
                border-radius: 15px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                border: 3px solid #3498db;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                color: #ecf0f1;
                font-family: 'Segoe UI', Arial, sans-serif;
                animation: modalSlideIn 0.3s ease-out;
            `;

            // Modal header
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 25px 15px;
                border-bottom: 2px solid rgba(52, 152, 219, 0.3);
                margin-bottom: 20px;
            `;

            const titleElement = document.createElement('h2');
            titleElement.style.cssText = `
                margin: 0;
                font-size: 1.4em;
                font-weight: bold;
                color: #3498db;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            titleElement.innerHTML = `${icon} ${title}`;

            header.appendChild(titleElement);

            // Close button (if closable)
            if (closable) {
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.style.cssText = `
                    background: #e74c3c;
                    color: white;
                    border: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                `;
                closeBtn.onclick = () => {
                    this.close();
                    resolve('closed');
                };
                header.appendChild(closeBtn);
            }

            // Modal content
            const contentElement = document.createElement('div');
            contentElement.style.cssText = `
                padding: 0 25px 20px;
                line-height: 1.6;
                font-size: 1.1em;
            `;
            contentElement.innerHTML = content;

            // Modal buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                padding: 20px 25px;
                display: flex;
                justify-content: flex-end;
                gap: 15px;
                border-top: 2px solid rgba(52, 152, 219, 0.3);
            `;

            // Confirm button
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = confirmText;
            confirmBtn.style.cssText = `
                background: #27ae60;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1em;
                font-weight: bold;
                transition: background 0.2s;
            `;
            confirmBtn.onmouseover = () => confirmBtn.style.background = '#2ecc71';
            confirmBtn.onmouseout = () => confirmBtn.style.background = '#27ae60';
            confirmBtn.onclick = () => {
                // If there's a custom confirm handler, use it
                if (options.onConfirm && typeof options.onConfirm === 'function') {
                    const result = options.onConfirm();
                    // Only close modal if handler returns true or is undefined
                    if (result !== false) {
                        this.close();
                        resolve('confirmed');
                    }
                } else {
                    this.close();
                    resolve('confirmed');
                }
            };

            buttonContainer.appendChild(confirmBtn);

            // Cancel button (if needed)
            if (showCancel) {
                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = cancelText;
                cancelBtn.style.cssText = `
                    background: #7f8c8d;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1em;
                    transition: background 0.2s;
                `;
                cancelBtn.onmouseover = () => cancelBtn.style.background = '#95a5a6';
                cancelBtn.onmouseout = () => cancelBtn.style.background = '#7f8c8d';
                cancelBtn.onclick = () => {
                    this.close();
                    resolve('cancelled');
                };
                buttonContainer.insertBefore(cancelBtn, confirmBtn);
            }

            // Assemble modal
            modal.appendChild(header);
            modal.appendChild(contentElement);
            modal.appendChild(buttonContainer);

            // Add modal animation CSS
            const style = document.createElement('style');
            style.textContent = `
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.7) translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);

            // Show modal
            this.overlay.innerHTML = '';
            this.overlay.appendChild(modal);
            this.overlay.style.display = 'flex';
            this.currentModal = modal;

            console.log('[SimpleModal] Modal displayed successfully');

            // Auto-focus the confirm button
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    close() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.innerHTML = '';
        }
        this.currentModal = null;
        console.log('[SimpleModal] Modal closed');
    }

    isOpen() {
        return this.currentModal !== null;
    }
}

// Create global instance
console.log('[SimpleModal] Creating global modal system...');

// Wait for DOM to be ready before creating instance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.simpleModal = new SimpleModal();
        setupGlobalShowModal();
    });
} else {
    window.simpleModal = new SimpleModal();
    setupGlobalShowModal();
}

function setupGlobalShowModal() {
    // Global showModal function that actually works
    window.showModal = function(title, content, options = {}) {
        console.log('[SimpleModal] Global showModal called:', title);
        return window.simpleModal.show(title, content, options);
    };
    
    console.log('[SimpleModal] Simple modal system ready');
}

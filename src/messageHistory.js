/**
 * messageHistory.js - Message History System
 * 
 * Manages a history of important messages, notifications, and communications
 * that the player has received. Provides easy access to review past messages.
 */

class MessageHistory {
    constructor() {
        this.messages = [];
        this.maxMessages = 50; // Keep last 50 messages
        this.loadFromStorage();
        console.log('[MessageHistory] Message history system initialized');
    }

    addMessage(title, content, type = 'info', timestamp = null) {
        const message = {
            id: Date.now() + Math.random(),
            title: title,
            content: content,
            type: type, // 'info', 'achievement', 'warning', 'royal', 'tutorial'
            timestamp: timestamp || new Date(),
            read: false
        };

        this.messages.unshift(message); // Add to beginning
        
        // Keep only the most recent messages
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(0, this.maxMessages);
        }

        this.saveToStorage();
        this.updateIcon();
        
        console.log('[MessageHistory] Added message:', title);
        return message.id;
    }

    markAsRead(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            this.saveToStorage();
            this.updateIcon();
        }
    }

    markAllAsRead() {
        this.messages.forEach(message => message.read = true);
        this.saveToStorage();
        this.updateIcon();
    }

    getMessages() {
        return this.messages;
    }

    getUnreadCount() {
        return this.messages.filter(m => !m.read).length;
    }

    showHistory() {
        const unreadCount = this.getUnreadCount();
        let content = '';

        if (this.messages.length === 0) {
            content = `
                <div style="text-align: center; padding: 40px;">
                    <h3 style="color: #95a5a6;">📭 No Messages</h3>
                    <p>You haven't received any messages yet. Messages from royal decrees, 
                    achievements, and important events will appear here.</p>
                </div>
            `;
        } else {
            content = `
                <div style="max-height: 400px; overflow-y: auto;">
                    ${this.messages.map(message => this.formatMessage(message)).join('')}
                </div>
                <div style="text-align: center; padding: 15px; border-top: 2px solid rgba(52, 152, 219, 0.3); margin-top: 15px;">
                    <button onclick="window.messageHistory.markAllAsRead(); window.simpleModal.close();" 
                            style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                        Mark All as Read
                    </button>
                </div>
            `;
        }

        window.showModal('Message History', content, {
            icon: '📜',
            closable: true,
            confirmText: 'Close'
        }).then(() => {
            this.markAllAsRead();
        });
    }

    formatMessage(message) {
        const typeIcons = {
            'info': '📋',
            'achievement': '🏆',
            'warning': '⚠️',
            'royal': '👑',
            'tutorial': '📚',
            'grant': '🎁',
            'quest': '🗺️'
        };

        const typeColors = {
            'info': '#3498db',
            'achievement': '#f39c12',
            'warning': '#e74c3c',
            'royal': '#9b59b6',
            'tutorial': '#27ae60',
            'grant': '#e67e22',
            'quest': '#1abc9c'
        };

        const icon = typeIcons[message.type] || '📋';
        const color = typeColors[message.type] || '#3498db';
        const readStyle = message.read ? 'opacity: 0.7;' : 'opacity: 1; border-left: 4px solid #f39c12;';
        const date = new Date(message.timestamp).toLocaleDateString();
        const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        return `
            <div style="margin-bottom: 15px; padding: 15px; background: rgba(52, 73, 94, 0.3); 
                        border-radius: 8px; ${readStyle}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: ${color}; display: flex; align-items: center; gap: 8px;">
                        ${icon} ${message.title}
                    </h4>
                    <small style="color: #95a5a6;">${date} ${time}</small>
                </div>
                <div style="color: #ecf0f1; line-height: 1.5;">
                    ${message.content}
                </div>
            </div>
        `;
    }

    updateIcon() {
        const button = document.getElementById('message-history-btn');
        const unreadCount = this.getUnreadCount();
        
        if (button) {
            const span = button.querySelector('span');
            if (unreadCount > 0) {
                span.innerHTML = `📜<span style="position: absolute; top: -5px; right: -5px; 
                    background: #e74c3c; color: white; border-radius: 50%; width: 18px; height: 18px; 
                    font-size: 10px; display: flex; align-items: center; justify-content: center;">
                    ${unreadCount > 9 ? '9+' : unreadCount}</span>`;
                button.style.position = 'relative';
            } else {
                span.innerHTML = '📜';
            }
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('messageHistory', JSON.stringify(this.messages));
        } catch (error) {
            console.warn('[MessageHistory] Could not save to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('messageHistory');
            if (saved) {
                this.messages = JSON.parse(saved);
                // Convert timestamp strings back to Date objects
                this.messages.forEach(message => {
                    if (typeof message.timestamp === 'string') {
                        message.timestamp = new Date(message.timestamp);
                    }
                });
            }
        } catch (error) {
            console.warn('[MessageHistory] Could not load from localStorage:', error);
            this.messages = [];
        }
    }

    // Helper methods for common message types
    addRoyalMessage(title, content) {
        return this.addMessage(title, content, 'royal');
    }

    addAchievementMessage(title, content) {
        return this.addMessage(title, content, 'achievement');
    }

    addTutorialMessage(title, content) {
        return this.addMessage(title, content, 'tutorial');
    }

    addGrantMessage(title, content) {
        return this.addMessage(title, content, 'grant');
    }
}

// Create global instance
window.MessageHistory = MessageHistory;
console.log('[MessageHistory] Message history system ready');

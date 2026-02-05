/**
 * messageHistory.js - Message History System
 * 
 * Manages a history of important messages, notifications, and communications
 * that the player has received. Provides easy access to review past messages.
 * Enhanced with persistent storage and seen/unseen tracking.
 */

class MessageHistory {
    constructor() {
        this.messages = [];
        this.maxMessages = 50; // Keep last 50 messages
        this.seenMessages = new Set(); // Track which messages user has actually seen in UI
        this.lastViewedTimestamp = null; // Track when user last opened message history
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
            read: false,
            seen: false // New field to track if user has seen this in the UI
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

    markAsSeen(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message && !message.seen) {
            message.seen = true;
            this.seenMessages.add(messageId);
            this.saveToStorage();
            this.updateIcon();
        }
    }

    markAllAsRead() {
        this.messages.forEach(message => {
            message.read = true;
            message.seen = true;
            this.seenMessages.add(message.id);
        });
        this.lastViewedTimestamp = new Date();
        this.saveToStorage();
        this.updateIcon();
    }

    markAllAsSeen() {
        this.messages.forEach(message => {
            if (!message.seen) {
                message.seen = true;
                this.seenMessages.add(message.id);
            }
        });
        this.lastViewedTimestamp = new Date();
        this.saveToStorage();
        this.updateIcon();
    }

    getMessages() {
        return this.messages;
    }

    getUnreadCount() {
        return this.messages.filter(m => !m.read).length;
    }

    getUnseenCount() {
        return this.messages.filter(m => !m.seen).length;
    }

    getNewMessagesSince(timestamp) {
        if (!timestamp) return this.messages;
        return this.messages.filter(m => m.timestamp > timestamp && !m.seen);
    }

    showHistory() {
        const unreadCount = this.getUnreadCount();
        const unseenCount = this.getUnseenCount();
        
        // Mark all messages as seen when opening history
        this.markAllAsSeen();
        
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
                <div style="margin-bottom: 15px; text-align: center;">
                    <div style="background: rgba(52, 152, 219, 0.2); padding: 10px; border-radius: 5px;">
                        Total Messages: ${this.messages.length} | 
                        Unread: ${unreadCount} | 
                        ${unseenCount > 0 ? `New: ${unseenCount}` : 'All caught up!'}
                    </div>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${this.messages.map(message => this.formatMessage(message)).join('')}
                </div>
                <div style="text-align: center; padding: 15px; border-top: 2px solid rgba(52, 152, 219, 0.3); margin-top: 15px;">
                    <button onclick="window.messageHistory.markAllAsRead(); if(window.modalSystem) window.modalSystem.closeTopModal();" 
                            style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-right: 10px;">
                        Mark All as Read
                    </button>
                    <button onclick="window.messageHistory.clearOldMessages(); if(window.modalSystem) window.modalSystem.closeTopModal(); setTimeout(() => window.messageHistory.showHistory(), 100);" 
                            style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                        Clear Old Messages
                    </button>
                </div>
            `;
        }

        window.showModal('Message History', content, {
            icon: '📜',
            closable: true,
            confirmText: 'Close'
        });
    }

    formatMessage(message) {
        const typeIcons = {
            'info': '📋',
            'achievement': '🏆',
            'warning': '⚠️',
            'royal': '👑',
            'tutorial': '🎓',
            'grant': '💰'
        };

        const icon = typeIcons[message.type] || '📋';
        const readStatus = message.read ? '' : ' style="font-weight: bold;"';
        const newStatus = !message.seen ? '<span style="color: #e74c3c; font-weight: bold;">NEW</span> ' : '';
        const timeString = message.timestamp.toLocaleDateString() + ' ' + 
                          message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        return `
            <div style="margin-bottom: 12px; padding: 12px; background: rgba(52, 73, 94, 0.3); 
                        border-radius: 8px; border-left: 4px solid ${this.getTypeColor(message.type)};"
                 onclick="window.messageHistory.markAsRead('${message.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4${readStatus} style="margin: 0; color: #ecf0f1; display: flex; align-items: center; gap: 8px;">
                        ${icon} ${newStatus}${message.title}
                    </h4>
                    <small style="color: #95a5a6; white-space: nowrap; margin-left: 10px;">${timeString}</small>
                </div>
                <div style="color: #bdc3c7; line-height: 1.4;">
                    ${message.content}
                </div>
            </div>
        `;
    }

    getTypeColor(type) {
        const colors = {
            'info': '#3498db',
            'achievement': '#f39c12',
            'warning': '#e74c3c',
            'royal': '#9b59b6',
            'tutorial': '#2ecc71',
            'grant': '#f1c40f'
        };
        return colors[type] || '#3498db';
    }

    clearOldMessages() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep messages from last 7 days
        
        const oldCount = this.messages.length;
        this.messages = this.messages.filter(m => m.timestamp > cutoffDate || !m.read);
        
        const newCount = this.messages.length;
        const deletedCount = oldCount - newCount;
        
        if (deletedCount > 0) {
            this.saveToStorage();
            this.updateIcon();
            console.log(`[MessageHistory] Cleared ${deletedCount} old messages`);
        }
        
        return deletedCount;
    }

    updateIcon() {
        const button = document.getElementById('message-history-btn');
        if (!button) return;

        const span = button.querySelector('span');
        if (!span) return;

        const unreadCount = this.getUnreadCount();
        const unseenCount = this.getUnseenCount();
        
        if (unseenCount > 0) {
            // Show unseen count with red badge
            span.innerHTML = `📜<span style="position: absolute; top: -5px; right: -5px; 
                background: #e74c3c; color: white; border-radius: 50%; width: 18px; height: 18px; 
                font-size: 10px; display: flex; align-items: center; justify-content: center;">
                ${unseenCount > 9 ? '9+' : unseenCount}</span>`;
            button.style.position = 'relative';
        } else if (unreadCount > 0) {
            // Show unread count with orange badge
            span.innerHTML = `📜<span style="position: absolute; top: -5px; right: -5px; 
                background: #f39c12; color: white; border-radius: 50%; width: 18px; height: 18px; 
                font-size: 10px; display: flex; align-items: center; justify-content: center;">
                ${unreadCount > 9 ? '9+' : unreadCount}</span>`;
            button.style.position = 'relative';
        } else {
            span.innerHTML = '📜';
        }
    }

    saveToStorage() {
        try {
            const saveData = {
                messages: this.messages,
                seenMessages: Array.from(this.seenMessages),
                lastViewedTimestamp: this.lastViewedTimestamp
            };
            localStorage.setItem('messageHistory', JSON.stringify(saveData));
        } catch (error) {
            console.warn('[MessageHistory] Could not save to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('messageHistory');
            if (saved) {
                const data = JSON.parse(saved);
                this.messages = data.messages || [];
                this.seenMessages = new Set(data.seenMessages || []);
                this.lastViewedTimestamp = data.lastViewedTimestamp ? new Date(data.lastViewedTimestamp) : null;
                
                // Convert timestamp strings back to Date objects
                this.messages.forEach(message => {
                    if (typeof message.timestamp === 'string') {
                        message.timestamp = new Date(message.timestamp);
                    }
                    // Ensure seen property exists
                    if (message.seen === undefined) {
                        message.seen = this.seenMessages.has(message.id);
                    }
                });
            }
        } catch (error) {
            console.warn('[MessageHistory] Could not load from localStorage:', error);
            this.messages = [];
            this.seenMessages = new Set();
            this.lastViewedTimestamp = null;
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
window.messageHistory = new MessageHistory();

// Update icon once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.messageHistory.updateIcon();
    });
} else {
    // DOM already loaded
    window.messageHistory.updateIcon();
}

console.log('[MessageHistory] Message history system ready');

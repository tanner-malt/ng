// Simple event bus for game-wide event communication
class EventBus {
    constructor() {
        this.events = {};
    }

    // Subscribe to an event
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    // Unsubscribe from an event
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        const index = this.events[eventName].indexOf(callback);
        if (index > -1) {
            this.events[eventName].splice(index, 1);
        }
    }

    // Emit an event
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        
        console.log(`[EventBus] Emitting event: ${eventName}`, data);
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`[EventBus] Error in event handler for ${eventName}:`, err);
            }
        });
    }

    // Clear all listeners for an event
    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }

    // Get number of listeners for an event
    listenerCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }

    // List all active events
    getEvents() {
        return Object.keys(this.events);
    }
}

// Create global event bus instance
window.eventBus = new EventBus();

console.log('[EventBus] Event bus initialized');
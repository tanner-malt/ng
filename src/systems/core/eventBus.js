/**
 * eventBus.js - Event System for Component Communication
 * 
 * Simple but effective event bus system that enables decoupled communication
 * between different game components without direct dependencies.
 * 
 * Key Features:
 * - Event subscription with callback registration
 * - Event broadcasting to all subscribers
 * - Unsubscription support for cleanup
 * - Global event bus instance for game-wide communication
 * 
 * Common Events:
 * - 'buildingPlaced': When buildings are constructed
 * - 'resourcesChanged': When resource values update
 * - 'dayEnded': When time progresses
 * - 'tutorialStep': Tutorial progress events
 * 
 * Usage:
 * - eventBus.on('eventName', callback) - Subscribe to events
 * - eventBus.emit('eventName', data) - Broadcast events
 * - eventBus.off('eventName', callback) - Unsubscribe
 */

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
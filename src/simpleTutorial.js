/**
 * simpleTutorial.js - Minimal Tutorial System
 * 
 * Simple 2-step tutorial focused on mission and town hall building.
 * Integrates with visual highlighting system to guide player.
 */

class SimpleTutorial {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                id: 'mission',
                title: '🏰 Welcome to Dynasty Builder!',
                content: 'Your mission is to build a thriving town. Start by constructing a Town Center to establish your settlement.',
                action: 'acknowledge'
            },
            {
                id: 'buildTownHall',
                title: '🏛️ Build Your Town Center',
                content: 'Click the highlighted Town Center button to build your first building. This will be the heart of your settlement.',
                action: 'highlight',
                target: '#build-townCenter'
            }
        ];
        this.isActive = false;
    }

    start() {
        console.log('SimpleTutorial: Starting tutorial');
        if (gameState && gameState.tutorial && gameState.tutorial.completed) {
            console.log('SimpleTutorial: Tutorial already completed, skipping');
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
    }

    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[stepIndex];
        console.log(`SimpleTutorial: Showing step ${stepIndex}: ${step.id}`);

        if (step.action === 'highlight') {
            this.showHighlightedStep(step);
        } else {
            this.showRegularStep(step);
        }
    }

    showRegularStep(step) {
        if (window.simpleModal) {
            simpleModal.show(step.title, step.content, 'Continue', () => {
                this.nextStep();
            });
        }
    }

    showHighlightedStep(step) {
        // Show the modal
        if (window.simpleModal) {
            simpleModal.show(step.title, step.content, 'Got it!', () => {
                // Keep highlighting active until they build the town center
                this.setupBuildingWatcher();
            });
        }

        // Add highlighting to target element
        this.highlightElement(step.target);
        this.showPointer(step.target);
    }

    highlightElement(selector) {
        // Remove any existing highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        // Add highlight to target
        const target = document.querySelector(selector);
        if (target) {
            target.classList.add('tutorial-highlight');
            console.log('SimpleTutorial: Added highlight to', selector);
        }
    }

    showPointer(selector) {
        const target = document.querySelector(selector);
        const pointer = document.getElementById('tutorial-pointer');
        const overlay = document.getElementById('tutorial-highlight-overlay');
        
        if (target && pointer && overlay) {
            overlay.style.display = 'block';
            
            const rect = target.getBoundingClientRect();
            pointer.style.left = (rect.left + rect.width / 2 - 15) + 'px';
            pointer.style.top = (rect.top - 40) + 'px';
            pointer.style.display = 'block';
            
            console.log('SimpleTutorial: Showing pointer at', rect);
        }
    }

    hidePointer() {
        const pointer = document.getElementById('tutorial-pointer');
        const overlay = document.getElementById('tutorial-highlight-overlay');
        
        if (pointer) pointer.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        
        // Remove all highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }

    setupBuildingWatcher() {
        // Listen for town center construction
        if (window.eventBus) {
            const handler = (event) => {
                if (event.detail && event.detail.building === 'townCenter') {
                    console.log('SimpleTutorial: Town center built, completing tutorial');
                    eventBus.off('buildingBuilt', handler);
                    this.hidePointer();
                    this.complete();
                }
            };
            
            eventBus.on('buildingBuilt', handler);
        }
    }

    nextStep() {
        this.currentStep++;
        this.showStep(this.currentStep);
    }

    complete() {
        console.log('SimpleTutorial: Tutorial completed');
        this.isActive = false;
        this.hidePointer();
        
        // Mark tutorial as completed
        if (gameState) {
            if (!gameState.tutorial) {
                gameState.tutorial = {};
            }
            gameState.tutorial.completed = true;
            gameState.save();
        }

        // Show completion message
        if (window.simpleModal) {
            simpleModal.show(
                '🎉 Tutorial Complete!', 
                'Great job! You\'ve built your first Town Center. Continue building and expanding your settlement. Use the Message History button (📜) to review any messages you receive.',
                'Start Playing!'
            );
        }

        // Unlock achievement silently
        if (window.achievements) {
            achievements.unlock('tutorial_complete', true); // Silent unlock
        }
    }

    reset() {
        console.log('SimpleTutorial: Resetting tutorial');
        this.currentStep = 0;
        this.isActive = false;
        this.hidePointer();
        
        if (gameState && gameState.tutorial) {
            gameState.tutorial.completed = false;
            gameState.save();
        }
    }
}

// Global instance
window.simpleTutorial = new SimpleTutorial();

// Auto-start tutorial for new players
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other systems are loaded
    setTimeout(() => {
        if (gameState && (!gameState.tutorial || !gameState.tutorial.completed)) {
            console.log('SimpleTutorial: Auto-starting tutorial for new player');
            simpleTutorial.start();
        }
    }, 500);
});

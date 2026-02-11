/**
 * WorldTutorial — Multi-step walkthrough for the World Map view
 *
 * Triggered on first visit to the World tab. Walks the player through
 * fog of war, exploration, army movement, and enemy threats.
 *
 * Follows the BuildingTutorial pattern: self-contained, localStorage-tracked,
 * uses window.modalSystem.showModal() for each step.
 */

class WorldTutorial {
    constructor() {
        this.currentStep = 0;
        this.completed = false;
        this.active = false;

        this.steps = [
            {
                id: 'world_overview',
                title: 'The Known World',
                content: `
                    <div class="tutorial-content">
                        <p>Your kingdom sits at the center of the map. The <strong>golden tile</strong> is your capital.</p>
                        <ul>
                            <li><strong>Explored</strong> tiles are fully visible and traversable</li>
                            <li><strong>Scoutable</strong> tiles show terrain but armies can't enter yet</li>
                            <li><strong>Hidden</strong> tiles are completely unknown</li>
                        </ul>
                        <p>Armies automatically explore tiles as they move, revealing neighbors. Click any tile for details.</p>
                    </div>`,
                highlight: '.tile[data-row="2"][data-col="2"]'
            },
            {
                id: 'army_movement',
                title: 'Commanding Armies',
                content: `
                    <div class="tutorial-content">
                        <p>Click your <strong>capital tile</strong> and use <em>Draft Army</em> to raise troops. Select an army, then click <strong>Move</strong> to send it.</p>
                        <ul>
                            <li><strong>Grassland/Plains:</strong> 1 day &mdash; fast</li>
                            <li><strong>Forest/Hills:</strong> 2 days &mdash; slower, defensible</li>
                            <li><strong>Swamp:</strong> 3 days &mdash; treacherous</li>
                            <li><strong>Mountains:</strong> 4 days &mdash; slow, +40% defense</li>
                        </ul>
                        <p>Use the right panel to move, recall, or disband selected armies.</p>
                    </div>`,
                highlight: '#world-actions'
            },
            {
                id: 'world_dangers',
                title: 'Threats & Defense',
                content: `
                    <div class="tutorial-content">
                        <p>Enemies spawn at the map edges and march toward your capital. They grow stronger over time:</p>
                        <ul>
                            <li><strong>Bandits</strong> (~50 days) &mdash; small groups</li>
                            <li><strong>Raiders</strong> (~100 days) &mdash; larger forces</li>
                            <li><strong>Warlords</strong> (~200 days) &mdash; devastating armies</li>
                        </ul>
                        <p>Station armies on <strong>hills</strong> or <strong>mountains</strong> for defensive bonuses. Keep borders explored &mdash; you can't fight what you can't see!</p>
                    </div>`,
                highlight: '#hex-info'
            }
        ];

        // Load persisted state
        this.loadState();
    }

    // ── Persistence ──

    loadState() {
        try {
            const saved = localStorage.getItem('worldTutorialState');
            if (saved) {
                const data = JSON.parse(saved);
                this.completed = !!data.completed;
                this.currentStep = data.currentStep || 0;
            }
            // Also honour the dedicated complete flag
            if (localStorage.getItem('worldTutorialComplete') === 'true') {
                this.completed = true;
            }
        } catch (e) {
            console.warn('[WorldTutorial] Error loading state:', e);
        }
    }

    saveState() {
        try {
            localStorage.setItem('worldTutorialState', JSON.stringify({
                completed: this.completed,
                currentStep: this.currentStep
            }));
        } catch (e) {
            console.warn('[WorldTutorial] Error saving state:', e);
        }
    }

    // ── Trigger ──

    /**
     * Called by WorldManager.show() each time the world view opens.
     * Only shows the tutorial on the very first visit.
     */
    checkAndShow() {
        if (this.completed || this.active) return;

        // Small delay so the map finishes rendering before the modal appears
        setTimeout(() => this.showStep(0), 400);
    }

    // ── Step display ──

    showStep(index) {
        if (index >= this.steps.length) {
            this.complete();
            return;
        }

        this.active = true;
        this.currentStep = index;
        this.saveState();

        const step = this.steps[index];
        const isLast = index === this.steps.length - 1;
        const stepLabel = `Step ${index + 1} of ${this.steps.length}`;

        // Apply highlight
        this.clearHighlight();
        if (step.highlight) {
            this.applyHighlight(step.highlight);
        }

        const buttonLabel = isLast ? '✅ Got it — let me explore!' : '➡️ Next';

        const modalContent = `
            <div class="world-tutorial-modal">
                <p class="world-tutorial-step-label" style="opacity:0.6;font-size:0.8em;margin:0 0 8px;">${stepLabel}</p>
                ${step.content}
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                    <button class="world-tutorial-skip" style="background:none;border:none;color:#888;cursor:pointer;font-size:0.85em;text-decoration:underline;">Skip Tutorial</button>
                    <button class="world-tutorial-next" style="padding:8px 20px;background:#c9a84c;border:none;border-radius:4px;color:#1a1a2e;font-weight:bold;cursor:pointer;font-size:1em;">${buttonLabel}</button>
                </div>
            </div>`;

        const showFn = window.modalSystem?.showModal?.bind(window.modalSystem) || window.showModal;
        if (!showFn) {
            console.warn('[WorldTutorial] No modal system available');
            return;
        }

        showFn({
            title: step.title,
            content: modalContent,
            closable: false,
            showCloseButton: false,
            modalType: 'tutorial-step',
            width: '520px'
        });

        // Attach button handlers after DOM settles
        setTimeout(() => {
            const nextBtn = document.querySelector('.world-tutorial-next');
            const skipBtn = document.querySelector('.world-tutorial-skip');

            if (nextBtn) {
                nextBtn.onclick = () => {
                    this.clearHighlight();
                    window.modalSystem?.closeTopModal?.();
                    setTimeout(() => this.showStep(index + 1), 300);
                };
            }
            if (skipBtn) {
                skipBtn.onclick = () => {
                    this.clearHighlight();
                    window.modalSystem?.closeTopModal?.();
                    this.complete();
                };
            }
        }, 150);
    }

    // ── Highlight ──

    applyHighlight(selector) {
        try {
            const el = document.querySelector(selector);
            if (!el) return;
            el.classList.add('tutorial-highlight');
            el.style.animation = 'tutorial-pulse 2.5s infinite';
        } catch (e) {
            // Selector might be invalid — non-critical
        }
    }

    clearHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
            el.style.animation = '';
        });
    }

    // ── Completion ──

    complete() {
        this.completed = true;
        this.active = false;
        this.currentStep = this.steps.length;
        this.clearHighlight();
        localStorage.setItem('worldTutorialComplete', 'true');
        this.saveState();
        console.log('[WorldTutorial] Tutorial complete');
    }

    // ── Reset (for testing / hard reset) ──

    reset() {
        this.completed = false;
        this.active = false;
        this.currentStep = 0;
        localStorage.removeItem('worldTutorialState');
        localStorage.removeItem('worldTutorialComplete');
        console.log('[WorldTutorial] Tutorial reset');
    }
}

// Expose globally
window.worldTutorial = new WorldTutorial();
window.WorldTutorial = WorldTutorial;
console.log('[WorldTutorial] Loaded');

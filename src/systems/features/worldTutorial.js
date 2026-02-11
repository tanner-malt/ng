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
                title: '🗺️ The Known World',
                content: `
                    <div class="tutorial-content">
                        <h3>🏰 Your Kingdom Awaits</h3>
                        <p>Welcome to the world map! Your kingdom sits at the center of a vast and
                        dangerous land. The <strong>golden tile</strong> is your capital — the heart of
                        your dynasty.</p>

                        <div class="tutorial-section">
                            <h4>🔹 What You See:</h4>
                            <ul>
                                <li><strong>Explored tiles</strong> show full terrain — you can see and move through them</li>
                                <li>Tiles adjacent to your capital are already explored and safe</li>
                                <li>Beyond your borders lies the unknown...</li>
                            </ul>
                        </div>

                        <div class="tutorial-tip">
                            💡 <strong>Tip:</strong> Click any visible tile to see its terrain details, movement cost, and defensive bonuses.
                        </div>
                    </div>`,
                highlight: '.tile[data-row="2"][data-col="2"]'
            },
            {
                id: 'fog_of_war',
                title: '🧭 Fog of War',
                content: `
                    <div class="tutorial-content">
                        <h3>🌫️ Beyond the Known</h3>
                        <p>The world beyond your borders is shrouded in fog. There are three visibility states:</p>

                        <div class="tutorial-section">
                            <h4>🔹 Tile Visibility:</h4>
                            <ul>
                                <li><strong>Explored</strong> — fully visible, your armies can move here</li>
                                <li><strong>Scoutable 🧭</strong> — you can see the terrain type but cannot move armies there yet</li>
                                <li><strong>Hidden ❓</strong> — completely unknown, marked with cross-hatching</li>
                            </ul>
                        </div>

                        <div class="tutorial-section">
                            <h4>🔹 How to Explore:</h4>
                            <ul>
                                <li>Armies <strong>automatically explore</strong> tiles as they move through them</li>
                                <li>Exploring a tile also reveals its neighbors as scoutable</li>
                                <li>Push outward from your capital to uncover the map</li>
                            </ul>
                        </div>

                        <div class="tutorial-tip">
                            💡 <strong>Tip:</strong> Scoutable tiles at the edge of your territory show you what lies ahead — plan your routes!
                        </div>
                    </div>`,
                highlight: null
            },
            {
                id: 'army_movement',
                title: '⚔️ Commanding Armies',
                content: `
                    <div class="tutorial-content">
                        <h3>🚶 Army Movement</h3>
                        <p>Your armies are your eyes and sword in the wilderness. Use them to explore,
                        defend, and conquer.</p>

                        <div class="tutorial-section">
                            <h4>🔹 Deploying Forces:</h4>
                            <ul>
                                <li><strong>Click your capital tile</strong> and use "Draft Army" to raise troops from your population</li>
                                <li>Select an army, then click <strong>"Move"</strong> to send it to a destination</li>
                                <li>Armies travel along the shortest path — one tile per day</li>
                            </ul>
                        </div>

                        <div class="tutorial-section">
                            <h4>🔹 Terrain & Movement Cost:</h4>
                            <ul>
                                <li><strong>Grassland / Plains:</strong> 1 day per tile — fast and safe</li>
                                <li><strong>Forest / Hills:</strong> 2 days per tile — slower but defensible</li>
                                <li><strong>Swamp:</strong> 3 days per tile — treacherous</li>
                                <li><strong>Mountains:</strong> 4 days per tile — slow but strong defense (+40%)</li>
                            </ul>
                        </div>

                        <div class="tutorial-tip">
                            💡 <strong>Tip:</strong> Use the right panel to command selected armies — move, recall, or disband them.
                        </div>
                    </div>`,
                highlight: '#world-actions'
            },
            {
                id: 'world_dangers',
                title: '⚠️ Dangers of the Wild',
                content: `
                    <div class="tutorial-content">
                        <h3>🏴 Enemies Are Coming</h3>
                        <p>The world is not empty. Hostile forces lurk in the darkness beyond your
                        borders, and they grow bolder over time.</p>

                        <div class="tutorial-section">
                            <h4>🔹 Enemy Threats:</h4>
                            <ul>
                                <li><strong>Bandits</strong> appear after ~50 days — small but persistent</li>
                                <li><strong>Raiders</strong> emerge after ~100 days — larger and more dangerous</li>
                                <li><strong>Warlords</strong> arrive after ~200 days — powerful armies that can devastate your kingdom</li>
                            </ul>
                        </div>

                        <div class="tutorial-section">
                            <h4>🔹 How Enemies Work:</h4>
                            <ul>
                                <li>Enemies <strong>spawn in unexplored territory</strong> at the map edges</li>
                                <li>They <strong>march toward your capital</strong> — intercept them before they arrive!</li>
                                <li>Enemy groups grow stronger the longer the game runs</li>
                            </ul>
                        </div>

                        <div class="tutorial-tip">
                            ⚠️ <strong>Warning:</strong> If enemies reach your capital unchallenged, they will attack your village directly!
                        </div>
                    </div>`,
                highlight: '#hex-info'
            },
            {
                id: 'defense_strategy',
                title: '🛡️ Defend Your Dynasty',
                content: `
                    <div class="tutorial-content">
                        <h3>🏰 Strategic Defense</h3>
                        <p>Victory belongs to those who prepare. Use terrain and positioning to
                        protect your people.</p>

                        <div class="tutorial-section">
                            <h4>🔹 Defense Tips:</h4>
                            <ul>
                                <li><strong>Station armies</strong> between your capital and the frontier</li>
                                <li>Position forces on <strong>hills (+20%)</strong> or <strong>mountains (+40%)</strong> for defensive bonuses</li>
                                <li>Keep your borders <strong>explored</strong> — you can't fight what you can't see</li>
                                <li>Draft more soldiers as your population grows</li>
                            </ul>
                        </div>

                        <div class="tutorial-section">
                            <h4>🔹 What's Next:</h4>
                            <ul>
                                <li>Explore the tiles around your capital to secure your borders</li>
                                <li>Draft your first army when you have soldiers to spare</li>
                                <li>Watch for enemy movement — the info panel shows threats on selected tiles</li>
                            </ul>
                        </div>

                        <div class="tutorial-tip">
                            💡 <strong>Good luck, commander!</strong> The fate of your dynasty rests on the decisions you make here.
                        </div>
                    </div>`,
                highlight: null
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

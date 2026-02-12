/**
 * WorldTutorial — Interactive step-by-step walkthrough for the World Map
 *
 * Triggered on first visit to the World tab. Walks the player through
 * fog of war, the capital, terrain types, army drafting, movement,
 * and enemy threats in 6 bite-sized steps.
 *
 * Pattern: localStorage-tracked, uses window.modalSystem.showModal()
 * with Next / Skip controls per step + element highlighting.
 */

class WorldTutorial {
    constructor() {
        this.currentStep = 0;
        this.completed = false;
        this.active = false;
        this._eventCleanups = []; // listeners to remove on skip/complete

        this.steps = [
            // ── 1. Welcome / overview ──
            {
                id: 'world_welcome',
                title: 'Welcome to the World Map',
                content: `
                    <div class="tutorial-content">
                        <p>Beyond your village walls lies a vast and untamed land. This is where you will 
                        <strong>scout new terrain</strong>, <strong>command armies</strong>, and 
                        <strong>defend your borders</strong>.</p>
                        <p>Most of the map is hidden behind the <em>Fog of War</em>. Only explored tiles
                        are fully visible — everything else is concealed until your armies discover it.</p>
                        <p style="opacity:0.7;font-size:0.9em;">Let's walk through the basics.</p>
                    </div>`,
                highlight: '#hex-overlay'
            },
            // ── 2. Your capital ──
            {
                id: 'world_capital',
                title: 'Your Capital',
                content: `
                    <div class="tutorial-content">
                        <p>The <strong style="color:#c9a84c;">golden tile</strong> at the centre of the map is your <strong>Capital</strong>.
                        This is where your village stands and where armies are drafted.</p>
                        <p>Click the capital tile now to see its details in the left panel.</p>
                        <p>Tiles adjacent to your capital start <strong>explored</strong>.
                        Tiles further away are hidden and must be uncovered by your armies.</p>
                    </div>`,
                highlight: null, // set dynamically in showStep()
                dynamicHighlight: () => {
                    const cfg = window.WORLD_DATA?.mapConfig || { capitalPosition: { row: 4, col: 4 } };
                    return `.tile[data-row="${cfg.capitalPosition.row}"][data-col="${cfg.capitalPosition.col}"]`;
                }
            },
            // ── 3. Terrain types ──
            {
                id: 'world_terrain',
                title: 'Reading the Land',
                content: `
                    <div class="tutorial-content">
                        <p>Each tile has a <strong>terrain type</strong> that affects movement speed and defence:</p>
                        <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:0.9em;">
                            <tr style="border-bottom:1px solid #5a4230;">
                                <th style="text-align:left;padding:4px;">Terrain</th>
                                <th style="text-align:center;padding:4px;">Speed</th>
                                <th style="text-align:center;padding:4px;">Notes</th>
                            </tr>
                            <tr><td>🌱 Grassland / 🌾 Plains</td><td style="text-align:center;">1 day</td><td style="text-align:center;">Fast, open</td></tr>
                            <tr><td>🌲 Forest</td><td style="text-align:center;">2 days</td><td style="text-align:center;">Cover</td></tr>
                            <tr><td>⛰️ Hills</td><td style="text-align:center;">2 days</td><td style="text-align:center;">+5 % def</td></tr>
                            <tr><td>🪵 Swamp</td><td style="text-align:center;">3 days</td><td style="text-align:center;">Dangerous</td></tr>
                            <tr><td>🏔️ Mountains</td><td style="text-align:center;">4 days</td><td style="text-align:center;">+7 % def</td></tr>
                            <tr><td>🏜️ Desert</td><td style="text-align:center;">2 days</td><td style="text-align:center;">Drains supplies</td></tr>
                            <tr><td>🏚️ Ruins</td><td style="text-align:center;">2 days</td><td style="text-align:center;">Treasures</td></tr>
                        </table>
                        <p>Click any explored tile to see its details on the left side.</p>
                    </div>`,
                highlight: '#hex-info'
            },
            // ── 4. Drafting an army ──
            {
                id: 'world_draft',
                title: 'Raising an Army',
                content: `
                    <div class="tutorial-content">
                        <p>To explore the unknown you need soldiers.</p>
                        <ol style="padding-left:18px;">
                            <li>Click your <strong>Capital</strong> tile.</li>
                            <li>Press the <strong>⚔️ Draft Army</strong> button on the right panel.</li>
                            <li>Choose villagers to conscript and name your army.</li>
                        </ol>
                        <p>Drafted villagers leave their village jobs and become soldiers.
                        Each army carries <strong>food supplies</strong> — when supplies run out, morale drops
                        and the army may disband!</p>
                        <p style="opacity:0.7;font-size:0.9em;">You can disband an army later to return soldiers to the village.</p>
                    </div>`,
                highlight: '#world-actions'
            },
            // ── 5. Movement ──
            {
                id: 'world_movement',
                title: 'Commanding Your Troops',
                content: `
                    <div class="tutorial-content">
                        <p>Once you have an army:</p>
                        <ol style="padding-left:18px;">
                            <li>Click the army marker (⚔) or select it from the right panel.</li>
                            <li>Press <strong>🚶 Move</strong>.</li>
                            <li>Click the <strong>destination tile</strong>.</li>
                        </ol>
                        <p>Your army will march along the fastest path. Armies <strong>auto-explore</strong>
                        tiles they pass through, revealing the surrounding fog of war.</p>
                        <p>Use <strong>🏠 Return Home</strong> to recall an army to the capital, or
                        <strong>🔭 Scout</strong> to reveal a scoutable tile from an adjacent position.</p>
                    </div>`,
                highlight: '#hex-overlay'
            },
            // ── 6. Dangers ──
            {
                id: 'world_dangers',
                title: 'Threats on the Horizon',
                content: `
                    <div class="tutorial-content">
                        <p>The wilds are not empty. Enemy forces spawn at the <strong>map edges</strong>
                        and march toward your capital. They grow stronger over time:</p>
                        <ul>
                            <li><strong>⚔️ Bandits</strong> — appear around day 60, small groups.</li>
                            <li><strong>🏴 Raiders</strong> — appear around day 100, larger warbands.</li>
                            <li><strong>👹 Warlords</strong> — appear around day 150, devastating armies.</li>
                        </ul>
                        <p>Station your armies on <strong>hills</strong> or <strong>mountains</strong> for
                        a defensive terrain bonus. Keep your borders explored — you can't fight
                        what you can't see!</p>
                        <p style="opacity:0.7;font-size:0.9em;">If an enemy reaches your capital they will
                        attack your village directly.</p>
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

        // Apply highlight (static or dynamic selector)
        this.clearHighlight();
        const highlightSel = step.dynamicHighlight ? step.dynamicHighlight() : step.highlight;
        if (highlightSel) {
            this.applyHighlight(highlightSel);
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
            width: '540px'
        });

        // Attach button handlers after DOM settles
        setTimeout(() => {
            const nextBtn = document.querySelector('.world-tutorial-next');
            const skipBtn = document.querySelector('.world-tutorial-skip');

            if (nextBtn) {
                nextBtn.onclick = () => {
                    this.clearHighlight();
                    this._cleanupEvents();
                    window.modalSystem?.closeTopModal?.();
                    setTimeout(() => this.showStep(index + 1), 300);
                };
            }
            if (skipBtn) {
                skipBtn.onclick = () => {
                    this.clearHighlight();
                    this._cleanupEvents();
                    window.modalSystem?.closeTopModal?.();
                    this.complete();
                };
            }
        }, 150);
    }

    // ── Event listener management ──

    _cleanupEvents() {
        this._eventCleanups.forEach(fn => fn());
        this._eventCleanups = [];
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
        this._cleanupEvents();
        localStorage.setItem('worldTutorialComplete', 'true');
        this.saveState();
        console.log('[WorldTutorial] Tutorial complete');
    }

    // ── Reset (for testing / hard reset) ──

    reset() {
        this.completed = false;
        this.active = false;
        this.currentStep = 0;
        this._cleanupEvents();
        localStorage.removeItem('worldTutorialState');
        localStorage.removeItem('worldTutorialComplete');
        console.log('[WorldTutorial] Tutorial reset');
    }
}

// Expose globally
window.worldTutorial = new WorldTutorial();
window.WorldTutorial = WorldTutorial;
console.log('[WorldTutorial] Loaded');

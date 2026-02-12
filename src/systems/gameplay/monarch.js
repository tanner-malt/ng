// Monarch view - Prestige and investment system
class MonarchManager {
    constructor(gameState) {
        this.gameState = gameState;

        // ── Investment Definitions ──
        // Cost formula: baseCost * (costMult ^ currentLevel)
        // All reset every run (stored in gameState.investments)
        this.investmentDefs = [
            {
                id: 'hireGeneral',
                name: 'Hire General',
                icon: '⚔️',
                category: 'kingdom',
                description: 'Unlocks a general slot for your armies',
                baseCost: 1000,
                costMult: 10,
                maxLevel: Infinity
            },
            {
                id: 'hireGovernor',
                name: 'Hire Governor',
                icon: '🏛️',
                category: 'kingdom',
                description: 'Unlocks a governor slot for your cities',
                baseCost: 1000,
                costMult: 10,
                maxLevel: Infinity
            },
            {
                id: 'lookForBetrothal',
                name: 'Look for Betrothal',
                icon: '💍',
                category: 'kingdom',
                description: 'Find a suitable marriage partner for your monarch',
                baseCost: 500,
                costMult: 2,
                maxLevel: Infinity,
                special: 'betrothal'
            },
            {
                id: 'combatTraining',
                name: 'Combat Training',
                icon: '🛡️',
                category: 'kingdom',
                description: '+10% combat effectiveness per level',
                baseCost: 200,
                costMult: 2,
                maxLevel: 10
            },
            {
                id: 'leadershipMultiplier',
                name: 'Leadership Multiplier',
                icon: '👑',
                category: 'kingdom',
                description: 'Monarch leadership skill boosts all production',
                baseCost: 500,
                costMult: 2,
                maxLevel: 10
            },
            {
                id: 'armyScouts',
                name: 'Army Scouts',
                icon: '🔍',
                category: 'kingdom',
                description: '+1 sight range on the world map',
                baseCost: 1000,
                costMult: 20,
                maxLevel: Infinity
            },
            {
                id: 'productionSize',
                name: 'Increase Production Size',
                icon: '🔨',
                category: 'infrastructure',
                description: '+1 job slot in primary production buildings',
                baseCost: 100,
                costMult: 100,
                maxLevel: Infinity
            },
            {
                id: 'moPeople',
                name: 'Mo People',
                icon: '🏠',
                category: 'infrastructure',
                description: '+1 housing capacity per house',
                baseCost: 100,
                costMult: 10,
                maxLevel: Infinity
            }
        ];
    }
    
    init() {
        // Check if monarch view is unlocked and toggle locked overlay
        const monarchContent = document.getElementById('monarch-content');
        const lockedView = document.querySelector('#monarch-view .locked-view');
        
        const isUnlocked = window.unlockSystem && window.unlockSystem.isViewUnlocked('monarch');
        
        if (isUnlocked) {
            if (lockedView) lockedView.style.display = 'none';
            if (monarchContent) monarchContent.style.display = 'block';
        } else {
            if (lockedView) lockedView.style.display = 'block';
            if (monarchContent) monarchContent.style.display = 'none';
        }

        this.setupDynastyButtons();
        this.renderInvestments();
        this.renderLegacyBonuses();
        this.updateInvestmentDisplay();
        this.updateDynastyStats();
        this.updateMonarchCard();
        this.updateFamilyTree();

        // Listen for unlock event to toggle overlay later
        if (window.eventBus) {
            window.eventBus.on('content_unlocked', (data) => {
                if (data && data.unlockId === 'monarch_view') {
                    if (lockedView) lockedView.style.display = 'none';
                    if (monarchContent) monarchContent.style.display = 'block';
                }
            });
        }
    }

    /* =============================
     *  Investment helpers
     * ============================= */
    getInvestmentLevel(id) {
        const val = this.gameState.investments[id];
        return typeof val === 'number' ? val : 0;
    }

    getInvestmentCost(def) {
        const level = this.getInvestmentLevel(def.id);
        return Math.floor(def.baseCost * Math.pow(def.costMult, level));
    }

    isMaxed(def) {
        return this.getInvestmentLevel(def.id) >= def.maxLevel;
    }

    getDef(id) {
        return this.investmentDefs.find(d => d.id === id);
    }

    /* =============================
     *  Render investments into DOM
     * ============================= */
    renderInvestments() {
        const container = document.getElementById('investment-categories');
        if (!container) return;

        const categories = {
            kingdom: { title: '👑 Kingdom Development', defs: [] },
            infrastructure: { title: '🏗️ Infrastructure', defs: [] }
        };

        this.investmentDefs.forEach(d => {
            if (categories[d.category]) categories[d.category].defs.push(d);
        });

        let html = '';
        Object.values(categories).forEach(cat => {
            html += `<div class="investment-category"><h4>${cat.title}</h4><div class="investment-grid">`;
            cat.defs.forEach(def => {
                const level = this.getInvestmentLevel(def.id);
                const cost = this.getInvestmentCost(def);
                const maxed = this.isMaxed(def);
                const goldIcon = '<i class="res-icon gold"></i>';
                // For betrothal, show "Search" instead of level tracking
                const levelText = def.special === 'betrothal' ? '' : `<div class="investment-level">Level ${level}${def.maxLevel < Infinity ? '/' + def.maxLevel : ''}</div>`;
                const effectText = def.id === 'leadershipMultiplier' ? `<div class="investment-effect">${this.getLeadershipEffectText()}</div>` : '';
                const btnLabel = def.special === 'betrothal'
                    ? `Search (${this.formatGold(cost)} ${goldIcon})`
                    : maxed ? 'MAX' : `Invest (${this.formatGold(cost)} ${goldIcon})`;
                html += `
                    <div class="investment-item" data-investment="${def.id}">
                        <div class="investment-icon">${def.icon}</div>
                        <div class="investment-details">
                            <h5>${def.name}</h5>
                            <p>${def.description}</p>
                            ${levelText}
                            <div class="investment-cost">${maxed ? 'MAX' : 'Cost: ' + this.formatGold(cost) + ' ' + goldIcon}</div>
                            ${effectText}
                        </div>
                        <button class="investment-btn" data-id="${def.id}" ${maxed ? 'disabled' : ''}>
                            ${btnLabel}
                        </button>
                    </div>`;
            });
            html += `</div></div>`;
        });

        container.innerHTML = html;

        // Wire up buttons
        container.querySelectorAll('.investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.makeInvestment(id);
            });
        });
    }

    /* =============================
     *  Investment purchase logic
     * ============================= */
    makeInvestment(id) {
        const def = this.getDef(id);
        if (!def || this.isMaxed(def)) return;

        // Special handling for betrothal
        if (def.special === 'betrothal') {
            this.handleBetrothal(def);
            return;
        }

        const cost = this.getInvestmentCost(def);
        if (!this.gameState.canAffordGold(cost)) return;
        if (!this.gameState.spendGold(cost)) return;

        // Trigger first investment achievement (only once)
        if (window.achievementSystem && !window.achievementSystem.isUnlocked('royal_investor')) {
            window.achievementSystem.triggerFirstInvestment();
        }

        // Increment level
        const inv = this.gameState.investments;
        inv[id] = (inv[id] || 0) + 1;

        // Log
        const level = inv[id];
        this.gameState.logBattleEvent?.(`${def.icon} ${def.name} upgraded to level ${level}`);

        // Apply immediate effects
        this.applyInvestmentEffect(id, level);

        // Refresh UI
        this.renderInvestments();
        this.updateInvestmentDisplay();
        this.updateFamilyTree(); // general/governor slots may have changed
        this.gameState.save();
    }

    applyInvestmentEffect(id, level) {
        switch (id) {
            case 'productionSize':
                // Job slots are computed dynamically in _computeJobSlots
                // Force job system to refresh slot counts
                if (this.gameState.jobManager) {
                    this.gameState.jobManager.updateAvailableSlots?.();
                    this.gameState.jobManager.updateAvailableJobs?.();
                }
                break;
            case 'moPeople':
                // Housing cap is computed dynamically in calculatePopulationCap
                this.gameState.updatePopulationCap?.();
                this.gameState.updateUI?.();
                break;
            case 'combatTraining':
                // Combat bonus is applied dynamically via getCombatTrainingMultiplier()
                window.showToast?.(`Combat Training level ${level}: +${level * 10}% combat effectiveness`, { type: 'success' });
                break;
            case 'armyScouts':
                // Expand sight immediately if world map is active
                if (window.worldManager?.initialized) {
                    const armies = this.gameState.getAllArmies?.() || [];
                    for (const army of armies) {
                        if (army.position) {
                            const scoutBonus = this.gameState.investments.armyScouts || 0;
                            window.worldManager.revealAround(army.position.y, army.position.x, 1 + scoutBonus);
                        }
                    }
                    window.worldManager.refreshUI?.();
                }
                break;
        }
    }

    /* =============================
     *  Leadership multiplier text
     * ============================= */
    getLeadershipEffectText() {
        const level = this.getInvestmentLevel('leadershipMultiplier');
        const leadership = this.gameState.royalFamily?.currentMonarch?.skills?.leadership || 0;
        if (level === 0) return 'Current: 1.00x production';
        const mult = 1 + (leadership / 100) * level;
        return `Current: ${mult.toFixed(2)}x production (${leadership} leadership)`;
    }

    /**
     * Get the leadership production multiplier for use by other systems.
     * Formula: 1 + (monarchLeadership / 100) * investmentLevel
     */
    getLeadershipProductionMultiplier() {
        const level = this.getInvestmentLevel('leadershipMultiplier');
        if (level === 0) return 1.0;
        const leadership = this.gameState.royalFamily?.currentMonarch?.skills?.leadership || 0;
        return 1 + (leadership / 100) * level;
    }

    /**
     * Get the combat training multiplier for use by battle systems.
     * Formula: 1 + level * 0.1 (10% per level)
     */
    getCombatTrainingMultiplier() {
        const level = this.getInvestmentLevel('combatTraining');
        return 1 + level * 0.1;
    }

    /* =============================
     *  Betrothal System
     * ============================= */
    handleBetrothal(def) {
        const rf = this.gameState.royalFamily;
        if (!rf || !rf.currentMonarch) {
            window.showToast?.('No monarch to arrange betrothal for.', { type: 'warning' });
            return;
        }
        if (rf.currentMonarch.spouse) {
            window.showToast?.('Monarch is already married.', { type: 'info' });
            return;
        }

        const cost = this.getInvestmentCost(def);
        if (!this.gameState.canAffordGold(cost)) {
            window.showToast?.(`Need ${this.formatGold(cost)} gold for betrothal search.`, { type: 'warning' });
            return;
        }
        if (!this.gameState.spendGold(cost)) return;

        // Increment betrothal level (increases cost for next search)
        const inv = this.gameState.investments;
        inv.lookForBetrothal = (inv.lookForBetrothal || 0) + 1;

        // Generate 2-3 betrothal candidates
        const candidateCount = 2 + (Math.random() < 0.5 ? 1 : 0);
        const candidates = [];
        const origins = ['local_nobility', 'foreign_court', 'merchant_family', 'scholarly_house', 'military_dynasty'];
        const femaleNames = ['Isabella', 'Eleanor', 'Margaret', 'Catherine', 'Elizabeth', 'Victoria', 'Arabella', 'Sophia', 'Helena', 'Lydia'];
        const maleNames = ['Alexander', 'William', 'Henry', 'Richard', 'Edward', 'Arthur', 'Charles', 'Frederick', 'Leopold', 'Theodore'];
        const monarchAge = rf.currentMonarch.age || 25;

        for (let i = 0; i < candidateCount; i++) {
            const isFemale = Math.random() < 0.5;
            const nameList = isFemale ? femaleNames : maleNames;
            const traits = rf.generateRoyalTraits();
            const skills = rf.generateRoyalSkills();
            const origin = origins[Math.floor(Math.random() * origins.length)];
            candidates.push({
                name: nameList[Math.floor(Math.random() * nameList.length)],
                age: monarchAge + Math.floor(Math.random() * 10) - 5,
                origin,
                traits,
                skills
            });
        }

        // Show betrothal candidate selection modal
        this.showBetrothalModal(candidates);
        this.renderInvestments();
        this.updateInvestmentDisplay();
        this.gameState.save();
    }

    showBetrothalModal(candidates) {
        let html = '<div style="margin-bottom:12px;color:#bdc3c7;">Choose a marriage partner for your monarch:</div>';
        candidates.forEach((c, i) => {
            const traitStr = (c.traits || []).join(', ') || 'None';
            html += `
                <div class="betrothal-candidate" style="background:#2c3e50;border-radius:8px;padding:12px;margin-bottom:10px;border:1px solid #34495e;">
                    <h5 style="color:#f39c12;margin:0 0 6px;">💍 ${c.name}</h5>
                    <div style="color:#bdc3c7;font-size:0.85em;">
                        <p style="margin:2px 0;">Age: ${c.age} · Origin: ${c.origin.replace(/_/g, ' ')}</p>
                        <p style="margin:2px 0;">Traits: ${traitStr}</p>
                        <p style="margin:2px 0;">Skills: ⚔️${c.skills.military} 📊${c.skills.economics} 🗣️${c.skills.diplomacy} 👑${c.skills.leadership}</p>
                    </div>
                    <button class="betrothal-select-btn" data-idx="${i}" style="margin-top:8px;padding:6px 14px;background:#27ae60;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.85em;">
                        Choose ${c.name}
                    </button>
                </div>`;
        });

        window.modalSystem?.showModal({
            title: '💍 Betrothal Candidates',
            content: html,
            maxWidth: '450px'
        });

        setTimeout(() => {
            document.querySelectorAll('.betrothal-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    const chosen = candidates[idx];
                    this.completeBetrothal(chosen);
                });
            });
        }, 50);
    }

    completeBetrothal(candidate) {
        const rf = this.gameState.royalFamily;
        if (!rf) return;

        const result = rf.arrangeMarriage(rf.currentMonarch.id, {
            name: candidate.name,
            age: candidate.age,
            origin: candidate.origin
        });

        window.modalSystem?.closeTopModal();

        if (result) {
            window.showToast?.(`${rf.currentMonarch.name} married ${candidate.name}!`, { type: 'success' });
            this.updateFamilyTree();
            this.updateMonarchCard();
        } else {
            window.showToast?.('Marriage arrangement failed.', { type: 'error' });
        }
    }
    renderLegacyBonuses() {
        const container = document.getElementById('legacy-bonuses-grid');
        if (!container) return;

        const legacy = window.legacySystem?.legacy;
        if (!legacy) {
            container.innerHTML = '<p style="color:#95a5a6;">Legacy system not available.</p>';
            return;
        }

        // Update points display
        const pointsEl = document.getElementById('legacy-points-display');
        if (pointsEl) pointsEl.textContent = `${legacy.totalPoints} Legacy Points`;

        const bonusDefs = [
            { type: 'startingFood',       name: 'Starting Food',       icon: '🍖', perLevel: '+25 food',         baseCost: 10 },
            { type: 'startingPopulation', name: 'Starting Population', icon: '👤', perLevel: '+1 villager',      baseCost: 25 },
            { type: 'productionBonus',    name: 'Production Bonus',    icon: '⚡', perLevel: '+5% production',   baseCost: 20 },
            { type: 'buildSpeedBonus',    name: 'Build Speed',         icon: '🔨', perLevel: '+5% build speed',  baseCost: 20 },
            { type: 'combatBonus',        name: 'Combat Bonus',        icon: '⚔️', perLevel: '+5% combat',       baseCost: 20 },
            { type: 'explorationBonus',   name: 'Exploration Bonus',   icon: '🗺️', perLevel: '+10% map reveal',  baseCost: 15 },
            { type: 'startingScout',      name: 'Scouting Intel',      icon: '🔍', perLevel: '+1 reveal radius', baseCost: 30 }
        ];

        let html = '';
        bonusDefs.forEach(bd => {
            const current = legacy.bonuses[bd.type] || 0;
            const actualCost = window.legacySystem.getLegacyBonusCost
                ? window.legacySystem.getLegacyBonusCost(bd.baseCost, bd.type)
                : bd.baseCost;
            const canAfford = legacy.totalPoints >= actualCost;
            html += `
                <div class="legacy-bonus-item">
                    <div class="legacy-bonus-icon">${bd.icon}</div>
                    <div class="legacy-bonus-details">
                        <h5>${bd.name}</h5>
                        <p>${bd.perLevel} per purchase</p>
                        <div class="legacy-bonus-level">Current: ${this.formatLegacyBonusValue(bd, current)}</div>
                    </div>
                    <button class="legacy-buy-btn" data-type="${bd.type}" data-base-cost="${bd.baseCost}" ${canAfford ? '' : 'disabled'}>
                        ${actualCost} pts
                    </button>
                </div>`;
        });
        container.innerHTML = html;

        // Wire up buttons
        container.querySelectorAll('.legacy-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const baseCost = parseInt(btn.dataset.baseCost);
                this.purchaseLegacyBonus(type, baseCost);
            });
        });
    }

    formatLegacyBonusValue(def, value) {
        if (def.type === 'startingFood') return `+${value} food`;
        if (def.type === 'startingPopulation') return `+${value} villagers`;
        if (def.type === 'productionBonus') return `+${value}%`;
        if (def.type === 'buildSpeedBonus') return `+${value}%`;
        if (def.type === 'combatBonus') return `+${value}%`;
        if (def.type === 'explorationBonus') return `+${value}%`;
        if (def.type === 'startingScout') return `+${value} radius`;
        return `${value}`;
    }

    purchaseLegacyBonus(type, baseCost) {
        if (!window.legacySystem) return;

        // All bonus types now go through the unified purchaseBonus with exponential scaling
        const result = window.legacySystem.purchaseBonus(type, baseCost);
        if (result.success) {
            window.showToast?.(result.message, { type: 'success' });
        } else {
            window.showToast?.(result.message, { type: 'warning' });
        }
        this.renderLegacyBonuses();
        this.updateDynastyStats();
    }

    /* =============================
     *  Setup dynasty buttons
     * ============================= */
    setupDynastyButtons() {
        const calculateBtn = document.getElementById('calculate-inheritance-btn');
        const prestigeBtn = document.getElementById('prestige-reset-btn');
        const renameBtn = document.getElementById('rename-dynasty-btn');

        // Rename dynasty button
        if (renameBtn) {
            renameBtn.addEventListener('click', () => {
                this.showRenameDynastyModal();
            });
        }
        
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                if (!window.legacySystem) return;
                const { total, breakdown } = window.legacySystem.calculateLegacyPoints(this.gameState);
                const breakdownHtml = breakdown.map(b =>
                    `<div class="inheritance-item" style="display:flex;justify-content:space-between;padding:4px 0;">
                        <span class="inheritance-label">${b.label}:</span>
                        <span class="inheritance-value">+${b.value} (${b.detail})</span>
                    </div>`
                ).join('');
                if (window.showModal) {
                    window.showModal(
                        'Legacy Point Preview',
                        `<div class="dynasty-calculation">
                            <h3>🏆 Current Legacy Value</h3>
                            <p>If your dynasty ended today, you would earn:</p>
                            <div class="inheritance-breakdown">
                                ${breakdownHtml}
                                <hr style="margin: 1rem 0; border-color: #444;">
                                <div class="inheritance-total" style="display:flex;justify-content:space-between;padding:4px 0;">
                                    <span class="inheritance-label"><strong>Total Legacy Points:</strong></span>
                                    <span class="inheritance-value"><strong>${total}</strong></span>
                                </div>
                            </div>
                        </div>`,
                        { icon: '🏆', type: 'info' }
                    );
                }
            });
        }
        
        if (prestigeBtn) {
            prestigeBtn.addEventListener('click', () => {
                // Day-100 gate: cannot end dynasty before day 100
                if ((this.gameState.day || 0) < 100) {
                    window.showToast?.(`Cannot end dynasty before Day 100 (current: Day ${this.gameState.day || 0})`, { type: 'warning' });
                    return;
                }
                if (window.legacySystem) {
                    window.legacySystem.showEndDynastyModal(
                        this.gameState,
                        localStorage.getItem('dynastyName') || this.gameState.dynastyName || 'Unknown'
                    );
                } else {
                    console.warn('[Monarch] Legacy system not available for prestige');
                }
            });
        }
    }

    /* =============================
     *  Dynasty Rename
     * ============================= */
    showRenameDynastyModal() {
        const currentName = this.gameState.dynastyName || localStorage.getItem('dynastyName') || 'New Dynasty';
        const html = `
            <div style="padding:8px;">
                <p style="color:#bdc3c7;margin-bottom:12px;">Enter a new name for your dynasty:</p>
                <input type="text" id="rename-dynasty-input" value="${currentName}" maxlength="24" style="
                    width: 100%; padding: 12px; margin-bottom: 12px;
                    background: rgba(52, 152, 219, 0.1); border: 2px solid #3498db;
                    border-radius: 8px; color: #ecf0f1; font-size: 16px; text-align: center;
                "/>
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button id="confirm-rename-dynasty" style="padding:8px 20px;background:#27ae60;color:white;border:none;border-radius:6px;cursor:pointer;">✅ Confirm</button>
                    <button id="cancel-rename-dynasty" style="padding:8px 20px;background:#34495e;color:white;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
                </div>
            </div>
        `;
        window.modalSystem?.showModal({ title: '✏️ Rename Dynasty', content: html, maxWidth: '400px' });

        setTimeout(() => {
            const input = document.getElementById('rename-dynasty-input');
            input?.focus();
            input?.select();

            document.getElementById('confirm-rename-dynasty')?.addEventListener('click', () => {
                const newName = input?.value?.trim();
                if (!newName || newName.length < 2) {
                    window.showToast?.('Dynasty name must be at least 2 characters.', { type: 'warning' });
                    return;
                }
                this.gameState.dynastyName = newName;
                localStorage.setItem('dynastyName', newName);
                this.gameState.save?.();
                window.modalSystem?.closeTopModal();
                window.showToast?.(`Dynasty renamed to "${newName}"`, { type: 'success' });
                this.updateDynastyStats();
            });
            document.getElementById('cancel-rename-dynasty')?.addEventListener('click', () => {
                window.modalSystem?.closeTopModal();
            });
        }, 50);
    }

    /* =============================
     *  Gold header display
     * ============================= */
    updateGoldDisplay() {
        const el = document.getElementById('monarch-gold-display');
        if (el) {
            el.innerHTML = `<i class="res-icon gold"></i> ${this.formatGold(Math.floor(this.gameState.gold))} Gold`;
        }
    }

    formatGold(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    /* =============================
     *  Investment display update
     * ============================= */
    updateInvestmentDisplay() {
        this.investmentDefs.forEach(def => {
            const item = document.querySelector(`.investment-item[data-investment="${def.id}"]`);
            if (!item) return;

            const level = this.getInvestmentLevel(def.id);
            const cost = this.getInvestmentCost(def);
            const maxed = this.isMaxed(def);
            const canAfford = this.gameState.canAffordGold(cost);

            // Update level text
            const levelEl = item.querySelector('.investment-level');
            if (levelEl) levelEl.textContent = `Level ${level}${def.maxLevel < Infinity ? '/' + def.maxLevel : ''}`;

            // Update cost text
            const costEl = item.querySelector('.investment-cost');
            if (costEl) costEl.innerHTML = maxed ? 'MAX' : `Cost: ${this.formatGold(cost)} <i class="res-icon gold"></i>`;

            // Update effect text for leadership
            if (def.id === 'leadershipMultiplier') {
                const effectEl = item.querySelector('.investment-effect');
                if (effectEl) effectEl.textContent = this.getLeadershipEffectText();
            }

            // Update button
            const btn = item.querySelector('.investment-btn');
            if (btn) {
                btn.disabled = maxed || !canAfford;
                if (def.special === 'betrothal') {
                    btn.innerHTML = `Search (${this.formatGold(cost)} <i class="res-icon gold"></i>)`;
                } else {
                    btn.innerHTML = maxed ? 'MAX' : `Invest (${this.formatGold(cost)} <i class="res-icon gold"></i>)`;
                }
                btn.style.opacity = maxed ? '0.5' : canAfford ? '1' : '0.6';
            }
        });

        this.displayInvestmentStatus();
        this.updateGoldDisplay();
    }

    displayInvestmentStatus() {
        const statusDiv = document.getElementById('investment-status');
        if (!statusDiv) return;
        
        const inv = this.gameState.investments;
        const leaderMult = this.getLeadershipProductionMultiplier();
        const combatMult = this.getCombatTrainingMultiplier();

        statusDiv.innerHTML = `
            <div class="dynasty-stats">
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.hireGeneral || 0}</div>
                    <div class="dynasty-stat-label">General Slots</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.hireGovernor || 0}</div>
                    <div class="dynasty-stat-label">Governor Slots</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${leaderMult.toFixed(2)}x</div>
                    <div class="dynasty-stat-label">Leadership Mult</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${combatMult.toFixed(1)}x</div>
                    <div class="dynasty-stat-label">Combat Training</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">+${inv.armyScouts || 0}</div>
                    <div class="dynasty-stat-label">Scout Range</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">+${inv.productionSize || 0}</div>
                    <div class="dynasty-stat-label">Job Slots</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">+${inv.moPeople || 0}</div>
                    <div class="dynasty-stat-label">Housing Cap</div>
                </div>
            </div>
        `;
    }

    /* =============================
     *  Monarch card (current ruler)
     * ============================= */
    updateMonarchCard() {
        const el = document.getElementById('monarch-card');
        if (!el) return;

        const rf = this.gameState.royalFamily;
        const m = rf?.currentMonarch;
        if (!m) {
            el.innerHTML = `<p style="color:#bdc3c7;">No reigning monarch.</p>`;
            return;
        }

        const reignDays = (this.gameState.day || 0) - (m.reignStart || 0);
        const skills = m.skills || {};
        const traits = (m.traits || []).map(t => `<span class="trait-badge">${t}</span>`).join(' ') || '<span style="color:#95a5a6;">None</span>';

        el.innerHTML = `
            <div class="monarch-card">
                <div class="monarch-info">
                    <div class="monarch-portrait">👑</div>
                    <div class="monarch-details">
                        <h4>${m.name || 'Unknown Monarch'}</h4>
                        <p style="margin:0;color:#555;">Age: ${m.age || '?'} · Reign: ${reignDays} days</p>
                        <div style="margin-top:0.5rem;">${traits}</div>
                    </div>
                </div>
                <div class="monarch-stats">
                    <div class="stat-item"><strong>${skills.leadership || 0}</strong><br>Leadership</div>
                    <div class="stat-item"><strong>${skills.military || 0}</strong><br>Military</div>
                    <div class="stat-item"><strong>${skills.diplomacy || 0}</strong><br>Diplomacy</div>
                    <div class="stat-item"><strong>${skills.economics || 0}</strong><br>Economics</div>
                </div>
            </div>
        `;
    }

    /* =============================
     *  Dynasty stats
     * ============================= */
    updateDynastyStats() {
        const el = document.getElementById('dynasty-stats');
        if (!el) return;

        const gs = this.gameState;
        const rf = gs.royalFamily;
        const monarchName = rf?.currentMonarch?.name || 'None';
        const familySize = rf?.royalFamily?.length || 0;
        const heirs = rf?.successionOrder?.length || 0;
        const reignDays = rf?.currentMonarch ? ((gs.day || 0) - (rf.currentMonarch.reignStart || 0)) : 0;
        const pop = gs.populationManager?.getAll()?.length || gs.population || 0;
        const buildingCount = gs.buildings?.length || 0;

        // Legacy stats
        const legacy = window.legacySystem?.legacy;
        const legacyPoints = legacy?.totalPoints || 0;
        const dynastiesCompleted = legacy?.dynastiesCompleted || 0;

        el.innerHTML = `
            <div class="dynasty-stats">
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">👑 ${monarchName}</div>
                    <div class="dynasty-stat-label">Current Ruler</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${reignDays}</div>
                    <div class="dynasty-stat-label">Reign (days)</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${familySize}</div>
                    <div class="dynasty-stat-label">Royal Family</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${heirs}</div>
                    <div class="dynasty-stat-label">Eligible Heirs</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${pop}</div>
                    <div class="dynasty-stat-label">Population</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${buildingCount}</div>
                    <div class="dynasty-stat-label">Buildings</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${legacyPoints}</div>
                    <div class="dynasty-stat-label">Legacy Points</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${dynastiesCompleted}</div>
                    <div class="dynasty-stat-label">Past Dynasties</div>
                </div>
            </div>
        `;
    }

    /* =============================
     *  Royal family tree display
     * ============================= */
    updateFamilyTree() {
        const el = document.getElementById('monarch-family-tree');
        if (!el) return;

        const rf = this.gameState.royalFamily;
        if (!rf || !rf.royalFamily || rf.royalFamily.length === 0) {
            el.innerHTML = `<p style="color:#bdc3c7;">No royal family members.</p>`;
            return;
        }

        const inv = this.gameState.investments;
        const maxGenerals = inv.hireGeneral || 0;
        const maxGovernors = inv.hireGovernor || 0;
        const currentGenerals = rf.royalFamily.filter(r => r.role === 'general').length;
        const currentGovernors = rf.royalFamily.filter(r => r.role === 'governor').length;

        // Gather available armies for general assignment
        const armies = this.gameState.getAllArmies?.() || [];

        let html = '<div class="family-tree">';

        // Slot summary
        html += `<div class="role-slot-summary" style="display:flex;gap:12px;margin-bottom:10px;font-size:0.85em;color:#95a5a6;">
            <span>⚔️ Generals: ${currentGenerals}/${maxGenerals}</span>
            <span>🏛️ Governors: ${currentGovernors}/${maxGovernors}</span>
        </div>`;

        rf.royalFamily.forEach(member => {
            const isMonarch = member.id === rf.currentMonarch?.id;
            const isHeir = member.status === 'heir';
            const isSpouse = member.status === 'royal_spouse';
            const canAssign = member.age >= 16 && !isMonarch;
            let classStr = 'family-member';
            if (isHeir) classStr += ' heir';
            if (isSpouse) classStr += ' spouse';
            if (!isHeir && !isSpouse && !isMonarch) classStr += ' child';

            const icon = isMonarch ? '👑' : member.role === 'general' ? '⚔️' : member.role === 'governor' ? '🏛️' : isHeir ? '🏰' : isSpouse ? '💍' : '👤';
            let statusLabel = isMonarch ? 'Monarch' : member.status === 'heir' ? 'Heir' : member.status === 'royal_spouse' ? 'Spouse' : member.status;
            // Show active role
            if (member.role === 'general') {
                const army = armies.find(a => a.id === member.assignedTo);
                statusLabel = `General of ${army?.name || 'Army'}`;
            } else if (member.role === 'governor') {
                statusLabel = `Governor of ${member.assignedTo === 'capital' ? 'Capital' : member.assignedTo}`;
            }

            const traits = (member.traits || []).map(t => `<span class="trait-badge">${t}</span>`).join(' ');
            const skills = member.skills || {};

            html += `
                <div class="${classStr}" data-royal-id="${member.id}" style="cursor:pointer;" title="Click to view genetics">
                    <div class="member-icon">${icon}</div>
                    <div class="member-details">
                        <div class="member-name">${member.name || 'Unknown'}</div>
                        <div class="member-info">Age: ${member.age || '?'} · ${statusLabel}</div>
                        <div class="member-skills" style="font-size:0.8em;opacity:0.7;margin-top:2px;">
                            ⚔️${skills.military || 0} 📊${skills.economics || 0} 🗣️${skills.diplomacy || 0}
                        </div>
                        ${traits ? `<div class="member-traits">${traits}</div>` : ''}`;

            // Role assignment buttons (only for age 16+ non-monarch members)
            if (canAssign) {
                html += `<div class="role-buttons" style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">`;
                if (member.role) {
                    html += `<button class="role-btn role-unassign" data-royal="${member.id}" style="font-size:0.7em;padding:2px 6px;background:#5a2020;color:#e8d5b0;border:1px solid #8b3030;border-radius:3px;cursor:pointer;">✖ Unassign</button>`;
                } else {
                    // Governor option (if slots available)
                    if (currentGovernors < maxGovernors) {
                        const currentGov = rf.getGovernor?.('capital');
                        if (!currentGov) {
                            html += `<button class="role-btn role-governor" data-royal="${member.id}" style="font-size:0.7em;padding:2px 6px;background:#2a4a2a;color:#e8d5b0;border:1px solid #3a6a3a;border-radius:3px;cursor:pointer;">🏛️ Governor</button>`;
                        }
                    }
                    // General option (if slots available and armies exist)
                    if (currentGenerals < maxGenerals && armies.length > 0) {
                        armies.forEach(a => {
                            const existingGen = rf.getGeneralForArmy?.(a.id);
                            if (!existingGen) {
                                html += `<button class="role-btn role-general" data-royal="${member.id}" data-army="${a.id}" style="font-size:0.7em;padding:2px 6px;background:#2a2a4a;color:#e8d5b0;border:1px solid #3a3a6a;border-radius:3px;cursor:pointer;">⚔️ Lead ${a.name}</button>`;
                            }
                        });
                    }
                    // Show hint if no slots
                    if (maxGenerals === 0 && maxGovernors === 0) {
                        html += `<span style="font-size:0.7em;color:#7f8c8d;font-style:italic;">Hire generals/governors in Investments</span>`;
                    }
                }
                html += `</div>`;
            }

            html += `
                    </div>
                </div>
            `;
        });
        html += '</div>';
        el.innerHTML = html;

        // Wire up role buttons
        el.querySelectorAll('.role-governor').forEach(btn => {
            btn.addEventListener('click', () => {
                const royalId = btn.dataset.royal;
                rf.assignGovernor?.(royalId, 'capital');
                this.updateFamilyTree();
                window.showToast?.('Governor assigned to Capital — production boost active!', { type: 'success' });
            });
        });
        el.querySelectorAll('.role-general').forEach(btn => {
            btn.addEventListener('click', () => {
                const royalId = btn.dataset.royal;
                const armyId = btn.dataset.army;
                rf.assignGeneral?.(royalId, armyId);
                this.updateFamilyTree();
                window.showToast?.('General assigned — combat bonus active!', { type: 'success' });
            });
        });
        el.querySelectorAll('.role-unassign').forEach(btn => {
            btn.addEventListener('click', () => {
                const royalId = btn.dataset.royal;
                rf.unassignRole?.(royalId);
                this.updateFamilyTree();
                window.showToast?.('Role removed.', { type: 'info' });
            });
        });

        // Wire up genetics viewer on member card click
        el.querySelectorAll('.family-member[data-royal-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open genetics when clicking role buttons
                if (e.target.closest('button')) return;
                const royalId = card.dataset.royalId;
                this.showGeneticsViewer(royalId);
            });
        });
    }

    /* =============================
     *  Royal Genetics Viewer
     * ============================= */
    showGeneticsViewer(royalId) {
        const rf = this.gameState.royalFamily;
        if (!rf) return;
        const member = rf.findRoyalById(royalId);
        if (!member) return;

        // Trait display info
        const traitInfo = {
            magical_potential: { icon: '✨', label: 'Magical Potential', cat: 'Magic' },
            strong:     { icon: '💪', label: 'Strong',     cat: 'Physical' },
            agile:      { icon: '🏃', label: 'Agile',      cat: 'Physical' },
            enduring:   { icon: '🛡️', label: 'Enduring',   cat: 'Physical' },
            healthy:    { icon: '❤️', label: 'Healthy',     cat: 'Physical' },
            intelligent:{ icon: '🧠', label: 'Intelligent', cat: 'Mental' },
            wise:       { icon: '📖', label: 'Wise',        cat: 'Mental' },
            charismatic:{ icon: '👑', label: 'Charismatic', cat: 'Mental' },
            cunning:    { icon: '🦊', label: 'Cunning',     cat: 'Mental' }
        };

        // Build traits section
        const traits = member.traits || [];
        let traitsHtml = '';
        if (traits.length === 0) {
            traitsHtml = '<span style="color:#7f8c8d;font-style:italic;">No traits</span>';
        } else {
            traitsHtml = traits.map(t => {
                const info = traitInfo[t] || { icon: '❓', label: t, cat: 'Unknown' };
                return `<span style="display:inline-block;background:#2a2a3e;border:1px solid #4a4a6a;border-radius:4px;padding:3px 8px;margin:2px;font-size:0.85em;">
                    ${info.icon} ${info.label} <span style="color:#888;font-size:0.8em;">(${info.cat})</span>
                </span>`;
            }).join('');
        }

        // Build skills section with bars
        const skills = member.skills || { leadership: 0, military: 0, diplomacy: 0, economics: 0 };
        const skillMax = 100;
        const skillColors = { leadership: '#e67e22', military: '#e74c3c', diplomacy: '#3498db', economics: '#2ecc71' };
        let skillsHtml = Object.entries(skills).map(([key, val]) => {
            const pct = Math.min(100, Math.round((val / skillMax) * 100));
            const color = skillColors[key] || '#888';
            return `<div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:2px;">
                    <span style="text-transform:capitalize;">${key}</span>
                    <span style="color:#ccc;">${val}</span>
                </div>
                <div style="background:#1a1a2e;border-radius:3px;height:8px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
                </div>
            </div>`;
        }).join('');

        // Build lineage section
        let lineageHtml = '';
        if (member.parents && member.parents.length > 0) {
            const parentNames = member.parents.map(pid => {
                const p = rf.findRoyalById(pid);
                return p ? p.name : 'Unknown';
            });
            lineageHtml = `<div style="margin-top:8px;">
                <strong>Parents:</strong> ${parentNames.join(' & ')}
            </div>`;

            // Show inherited vs unique traits
            const parentTraits = new Set();
            member.parents.forEach(pid => {
                const p = rf.findRoyalById(pid);
                if (p && p.traits) p.traits.forEach(t => parentTraits.add(t));
            });
            const inherited = traits.filter(t => parentTraits.has(t));
            const unique = traits.filter(t => !parentTraits.has(t));
            if (inherited.length > 0) {
                lineageHtml += `<div style="margin-top:4px;font-size:0.85em;color:#a8d8a8;">
                    🧬 Inherited: ${inherited.map(t => (traitInfo[t]?.label || t)).join(', ')}
                </div>`;
            }
            if (unique.length > 0) {
                lineageHtml += `<div style="margin-top:4px;font-size:0.85em;color:#d8a8d8;">
                    ⚡ Mutation: ${unique.map(t => (traitInfo[t]?.label || t)).join(', ')}
                </div>`;
            }
        } else {
            lineageHtml = '<div style="margin-top:8px;color:#7f8c8d;font-style:italic;">Founder — no parent lineage</div>';
        }

        // Spouse info
        let spouseHtml = '';
        if (member.spouse) {
            const spouse = rf.findRoyalById(member.spouse);
            if (spouse) {
                const spouseTraits = (spouse.traits || []).map(t => (traitInfo[t]?.icon || '') + ' ' + (traitInfo[t]?.label || t)).join(', ') || 'None';
                spouseHtml = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #333;">
                    <strong>💍 Spouse:</strong> ${spouse.name}
                    <div style="font-size:0.85em;color:#ccc;margin-top:3px;">Traits: ${spouseTraits}</div>
                </div>`;
            }
        }

        // Children info
        let childrenHtml = '';
        if (member.children && member.children.length > 0) {
            const childItems = member.children.map(cid => {
                const c = rf.findRoyalById(cid);
                return c ? `${c.name} (age ${c.age})` : 'Unknown';
            }).join(', ');
            childrenHtml = `<div style="margin-top:6px;font-size:0.85em;">
                <strong>👶 Children:</strong> ${childItems}
            </div>`;
        }

        // Inheritance rules info
        const inheritInfoHtml = `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #333;font-size:0.8em;color:#888;">
            <strong>Inheritance Rules:</strong> 50% chance per parent trait · 10% mutation chance · Skills start at 0 for heirs
        </div>`;

        // Experience section (for active members)
        let expHtml = '';
        if (member.experience) {
            const exp = member.experience;
            const totalExp = Object.values(exp).reduce((a, b) => a + b, 0);
            if (totalExp > 0) {
                expHtml = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #333;">
                    <strong>Experience:</strong>
                    <div style="font-size:0.85em;color:#ccc;margin-top:4px;">
                        Leadership: ${exp.leadership || 0} · Military: ${exp.military || 0} · Diplomacy: ${exp.diplomacy || 0} · Economics: ${exp.economics || 0}
                    </div>
                </div>`;
            }
        }

        const statusLabel = { monarch: '👑 Monarch', heir: '🏰 Heir', royal_spouse: '💍 Royal Spouse' };

        const body = `
            <div style="text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div>
                        <span style="font-size:1.1em;font-weight:bold;">${member.name}</span>
                        <span style="margin-left:8px;font-size:0.85em;color:#aaa;">${statusLabel[member.status] || member.status}</span>
                    </div>
                    <span style="font-size:0.85em;color:#aaa;">Age: ${member.age}</span>
                </div>
                <div style="margin-bottom:12px;">
                    <strong>Traits</strong>
                    <div style="margin-top:4px;">${traitsHtml}</div>
                </div>
                <div style="margin-bottom:12px;">
                    <strong>Skills</strong>
                    <div style="margin-top:4px;">${skillsHtml}</div>
                </div>
                ${lineageHtml}
                ${spouseHtml}
                ${childrenHtml}
                ${expHtml}
                ${inheritInfoHtml}
            </div>
        `;

        window.showModal?.('🧬 Royal Genetics — ' + member.name, body, { type: 'info', icon: '🧬' });
    }

    /* =============================
     *  Full refresh — called on view switch
     * ============================= */
    refreshAll() {
        this.updateGoldDisplay();
        this.updateInvestmentDisplay();
        this.updateMonarchCard();
        this.updateDynastyStats();
        this.updateFamilyTree();
        this.renderLegacyBonuses();
        this.updatePrestigeButton();
    }

    /**
     * Update the End Dynasty button based on the day-100 gate.
     */
    updatePrestigeButton() {
        const btn = document.getElementById('prestige-reset-btn');
        if (!btn) return;
        const day = this.gameState.day || 0;
        if (day < 100) {
            btn.disabled = true;
            btn.title = `Available on Day 100 (current: Day ${day})`;
            btn.textContent = `⚰️ End Dynasty (Day ${day}/100)`;
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            btn.title = 'End your dynasty and start fresh with legacy points';
            btn.textContent = '⚰️ End Dynasty (Prestige Reset)';
            btn.style.opacity = '1';
        }
    }
}

// Make MonarchManager globally available
window.MonarchManager = MonarchManager;

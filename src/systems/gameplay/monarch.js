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
                description: '+1 job slot in ALL buildings',
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
                html += `
                    <div class="investment-item" data-investment="${def.id}">
                        <div class="investment-icon">${def.icon}</div>
                        <div class="investment-details">
                            <h5>${def.name}</h5>
                            <p>${def.description}</p>
                            <div class="investment-level">Level ${level}${def.maxLevel < Infinity ? '/' + def.maxLevel : ''}</div>
                            <div class="investment-cost">${maxed ? 'MAX' : 'Cost: ' + this.formatGold(cost) + ' 💰'}</div>
                            ${def.id === 'leadershipMultiplier' ? `<div class="investment-effect">${this.getLeadershipEffectText()}</div>` : ''}
                        </div>
                        <button class="investment-btn" data-id="${def.id}" ${maxed ? 'disabled' : ''}>
                            ${maxed ? 'MAX' : 'Invest (' + this.formatGold(cost) + ' 💰)'}
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

    /* =============================
     *  Legacy Bonus Spending UI
     * ============================= */
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
            { type: 'startingGold',       name: 'Starting Gold',       icon: '💰', perLevel: '+50 gold',         cost: 10 },
            { type: 'startingFood',       name: 'Starting Food',       icon: '🍖', perLevel: '+25 food',         cost: 10 },
            { type: 'startingPopulation', name: 'Starting Population', icon: '👤', perLevel: '+1 villager',      cost: 25 },
            { type: 'productionBonus',    name: 'Production Bonus',    icon: '⚡', perLevel: '+5% production',   cost: 20 },
            { type: 'buildSpeedBonus',    name: 'Build Speed',         icon: '🔨', perLevel: '+5% build speed',  cost: 20 },
            { type: 'combatBonus',        name: 'Combat Bonus',        icon: '⚔️', perLevel: '+5% combat',       cost: 20 },
            { type: 'explorationBonus',   name: 'Exploration Bonus',   icon: '🗺️', perLevel: '+10% map reveal',  cost: 15 },
            { type: 'startingScout',      name: 'Scouting Intel',      icon: '🔍', perLevel: '+1 reveal radius', cost: 30 }
        ];

        let html = '';
        bonusDefs.forEach(bd => {
            const current = legacy.bonuses[bd.type] || 0;
            const canAfford = legacy.totalPoints >= bd.cost;
            html += `
                <div class="legacy-bonus-item">
                    <div class="legacy-bonus-icon">${bd.icon}</div>
                    <div class="legacy-bonus-details">
                        <h5>${bd.name}</h5>
                        <p>${bd.perLevel} per purchase</p>
                        <div class="legacy-bonus-level">Current: ${this.formatLegacyBonusValue(bd, current)}</div>
                    </div>
                    <button class="legacy-buy-btn" data-type="${bd.type}" data-cost="${bd.cost}" ${canAfford ? '' : 'disabled'}>
                        ${bd.cost} pts
                    </button>
                </div>`;
        });
        container.innerHTML = html;

        // Wire up buttons
        container.querySelectorAll('.legacy-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const cost = parseInt(btn.dataset.cost);
                this.purchaseLegacyBonus(type, cost);
            });
        });
    }

    formatLegacyBonusValue(def, value) {
        if (def.type === 'startingGold') return `+${value} gold`;
        if (def.type === 'startingFood') return `+${value} food`;
        if (def.type === 'startingPopulation') return `+${value} villagers`;
        if (def.type === 'productionBonus') return `+${value}%`;
        if (def.type === 'buildSpeedBonus') return `+${value}%`;
        if (def.type === 'combatBonus') return `+${value}%`;
        if (def.type === 'explorationBonus') return `+${value}%`;
        if (def.type === 'startingScout') return `+${value} radius`;
        return `${value}`;
    }

    purchaseLegacyBonus(type, cost) {
        if (!window.legacySystem) return;

        // Handle startingScout specially since it's new
        if (type === 'startingScout') {
            const legacy = window.legacySystem.legacy;
            if (legacy.totalPoints < cost) {
                window.showToast?.('Not enough legacy points!', { type: 'warning' });
                return;
            }
            legacy.totalPoints -= cost;
            legacy.bonuses.startingScout = (legacy.bonuses.startingScout || 0) + 1;
            window.legacySystem.saveLegacy();
            window.showToast?.(`Scouting Intel upgraded! +1 reveal radius at start`, { type: 'success' });
            this.renderLegacyBonuses();
            this.updateDynastyStats();
            return;
        }

        const result = window.legacySystem.purchaseBonus(type, cost);
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
     *  Gold header display
     * ============================= */
    updateGoldDisplay() {
        const el = document.getElementById('monarch-gold-display');
        if (el) {
            el.textContent = `💰 ${this.formatGold(Math.floor(this.gameState.gold))} Gold`;
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
            if (costEl) costEl.textContent = maxed ? 'MAX' : `Cost: ${this.formatGold(cost)} 💰`;

            // Update effect text for leadership
            if (def.id === 'leadershipMultiplier') {
                const effectEl = item.querySelector('.investment-effect');
                if (effectEl) effectEl.textContent = this.getLeadershipEffectText();
            }

            // Update button
            const btn = item.querySelector('.investment-btn');
            if (btn) {
                btn.disabled = maxed || !canAfford;
                btn.textContent = maxed ? 'MAX' : `Invest (${this.formatGold(cost)} 💰)`;
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
                <div class="${classStr}">
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
    }
}

// Make MonarchManager globally available
window.MonarchManager = MonarchManager;

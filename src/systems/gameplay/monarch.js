// Monarch view - Prestige and investment system
class MonarchManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.activeTab = 'overview';

        // ── Trait mechanical effects ──
        this.traitInfo = {
            magical_potential: { icon: '✨', label: 'Magical Potential', cat: 'Magic', desc: 'Latent arcane affinity' },
            strong:     { icon: '💪', label: 'Strong',     cat: 'Physical', desc: '+10% army HP' },
            agile:      { icon: '🏃', label: 'Agile',      cat: 'Physical', desc: '+5% army speed' },
            enduring:   { icon: '🛡️', label: 'Enduring',   cat: 'Physical', desc: '+10% defense' },
            healthy:    { icon: '❤️', label: 'Healthy',     cat: 'Physical', desc: 'Slower aging' },
            intelligent:{ icon: '🧠', label: 'Intelligent', cat: 'Mental', desc: '+10% research speed' },
            wise:       { icon: '📖', label: 'Wise',        cat: 'Mental', desc: '+5% all production' },
            charismatic:{ icon: '👑', label: 'Charismatic', cat: 'Mental', desc: '+10% trade income' },
            cunning:    { icon: '🦊', label: 'Cunning',     cat: 'Mental', desc: '+5% combat tactics' }
        };

        // ── Investment Definitions (no longer includes general/governor/betrothal) ──
        this.investmentDefs = [
            {
                id: 'combatTraining',
                name: 'Combat Training',
                icon: '🛡️',
                category: 'kingdom',
                description: '+10% combat effectiveness per level',
                baseCost: 400,
                costMult: 2.5,
                maxLevel: 10
            },
            {
                id: 'leadershipMultiplier',
                name: 'Leadership Multiplier',
                icon: '👑',
                category: 'kingdom',
                description: 'Monarch leadership skill boosts all production',
                baseCost: 800,
                costMult: 2.5,
                maxLevel: 10
            },
            {
                id: 'armyScouts',
                name: 'Army Scouts',
                icon: '🔍',
                category: 'kingdom',
                description: '+1 sight range on the world map',
                baseCost: 1500,
                costMult: 25,
                maxLevel: Infinity
            },
            {
                id: 'productionSize',
                name: 'Increase Production Size',
                icon: '🔨',
                category: 'infrastructure',
                description: '+1 job slot in production buildings',
                baseCost: 250,
                costMult: 150,
                maxLevel: Infinity
            },
            {
                id: 'moPeople',
                name: 'Mo People',
                icon: '🏠',
                category: 'infrastructure',
                description: '+1 housing capacity per house',
                baseCost: 200,
                costMult: 12,
                maxLevel: Infinity
            }
        ];

        // ── Staff hiring costs ──
        this.generalBaseCost = 1200;
        this.generalCostMult = 3;
        this.governorBaseCost = 1200;
        this.governorCostMult = 3;
        this.betrothalBaseCost = 800;
        this.betrothalCostMult = 2.5;
    }
    
    init() {
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

        this.setupTabNavigation();
        this.setupDynastyButtons();
        this.renderActiveTab();

        // Show monarch tutorial on first view entry
        if (!localStorage.getItem('monarchTutorialShown')) {
            localStorage.setItem('monarchTutorialShown', 'true');
            setTimeout(() => {
                if (window.modalSystem?.showModal) {
                    window.modalSystem.showModal({
                        title: '👑 Welcome to the Royal Court!',
                        content: `
                            <div style="padding:8px;">
                                <p style="color:#bdc3c7;margin-bottom:12px;">Your dynasty has begun! Explore the tabs above to manage your kingdom:</p>
                                <div style="background:#2c3e50;border-radius:8px;padding:12px;margin-bottom:8px;">
                                    <h4 style="color:#f39c12;margin:0 0 6px;">⚔️ Staff</h4>
                                    <p style="color:#bdc3c7;margin:0;font-size:0.85em;">Hire generals and governors. Arrange royal marriages.</p>
                                </div>
                                <div style="background:#2c3e50;border-radius:8px;padding:12px;margin-bottom:8px;">
                                    <h4 style="color:#f39c12;margin:0 0 6px;">💰 Investments</h4>
                                    <p style="color:#bdc3c7;margin:0;font-size:0.85em;">Spend gold on combat training, production, and infrastructure.</p>
                                </div>
                                <div style="background:#2c3e50;border-radius:8px;padding:12px;margin-bottom:8px;">
                                    <h4 style="color:#f39c12;margin:0 0 6px;">🏛️ Legacy</h4>
                                    <p style="color:#bdc3c7;margin:0;font-size:0.85em;">Permanent bonuses that persist across dynasties.</p>
                                </div>
                                <div style="background:#2c3e50;border-radius:8px;padding:12px;">
                                    <h4 style="color:#f39c12;margin:0 0 6px;">⚰️ Dynasty</h4>
                                    <p style="color:#bdc3c7;margin:0;font-size:0.85em;">After Day 100, end your dynasty to earn legacy points and start fresh!</p>
                                </div>
                            </div>
                        `,
                        maxWidth: '480px'
                    });
                }
            }, 100);
        }

        if (window.eventBus) {
            window.eventBus.on('content_unlocked', (data) => {
                if (data && data.unlockId === 'monarch_view') {
                    if (lockedView) lockedView.style.display = 'none';
                    if (monarchContent) monarchContent.style.display = 'block';
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  TAB NAVIGATION
    // ═══════════════════════════════════════════════════════════════

    setupTabNavigation() {
        document.querySelectorAll('.monarch-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        // Update tab buttons
        document.querySelectorAll('.monarch-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        // Update tab content
        document.querySelectorAll('.monarch-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tabContent === tabId);
        });
        this.renderActiveTab();
    }

    renderActiveTab() {
        this.updateGoldDisplay();
        switch (this.activeTab) {
            case 'overview':
                this.updateMonarchCard();
                this.displayInvestmentStatus();
                this.updateDynastyStats();
                break;
            case 'family':
                this.renderFamilyTreeTab();
                break;
            case 'staff':
                this.renderStaffTab();
                this.updateFamilyTree();
                break;
            case 'investments':
                this.renderInvestments();
                break;
            case 'legacy':
                this.renderLegacyBonuses();
                break;
            case 'dynasty':
                this.updatePrestigeButton();
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  INVESTMENT HELPERS
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════
    //  RENDER INVESTMENTS (upgraded cards with pips)
    // ═══════════════════════════════════════════════════════════════

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
                const canAfford = this.gameState.canAffordGold(cost);
                const goldIcon = '<i class="res-icon gold"></i>';

                // Level pips (show up to 10 for finite, or current count for infinite)
                let pipsHtml = '';
                if (def.maxLevel <= 10) {
                    pipsHtml = '<div class="investment-level-pips">';
                    for (let i = 0; i < def.maxLevel; i++) {
                        const filled = i < level;
                        pipsHtml += `<span class="pip${filled ? ' filled' : ''}${filled && maxed ? ' maxed' : ''}"></span>`;
                    }
                    pipsHtml += '</div>';
                } else {
                    pipsHtml = `<div class="investment-level" style="margin-top:4px;">Level ${level}</div>`;
                }

                const effectText = def.id === 'leadershipMultiplier' ? `<div class="investment-effect">${this.getLeadershipEffectText()}</div>` : '';
                const btnLabel = maxed ? '✓ MAX' : `${this.formatGold(cost)} ${goldIcon}`;

                html += `
                    <div class="investment-item${maxed ? ' maxed' : ''}" data-investment="${def.id}">
                        <div class="investment-icon">${def.icon}</div>
                        <div class="investment-details">
                            <h5>${def.name}</h5>
                            <p>${def.description}</p>
                            ${pipsHtml}
                            ${effectText}
                        </div>
                        <button class="investment-btn" data-id="${def.id}" ${maxed || !canAfford ? 'disabled' : ''}>
                            ${btnLabel}
                        </button>
                    </div>`;
            });
            html += `</div></div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.makeInvestment(btn.dataset.id);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  INVESTMENT PURCHASE LOGIC
    // ═══════════════════════════════════════════════════════════════

    makeInvestment(id) {
        const def = this.getDef(id);
        if (!def || this.isMaxed(def)) return;

        const cost = this.getInvestmentCost(def);
        if (!this.gameState.canAffordGold(cost)) return;
        if (!this.gameState.spendGold(cost)) return;

        if (window.achievementSystem && !window.achievementSystem.isUnlocked('royal_investor')) {
            window.achievementSystem.triggerFirstInvestment();
        }

        const inv = this.gameState.investments;
        inv[id] = (inv[id] || 0) + 1;
        const level = inv[id];
        this.gameState.logBattleEvent?.(`${def.icon} ${def.name} upgraded to level ${level}`);
        this.applyInvestmentEffect(id, level);
        this.renderInvestments();
        this.displayInvestmentStatus();
        this.gameState.save();
    }

    applyInvestmentEffect(id, level) {
        switch (id) {
            case 'productionSize':
                if (this.gameState.jobManager) {
                    this.gameState.jobManager.updateAvailableSlots?.();
                    this.gameState.jobManager.updateAvailableJobs?.();
                }
                break;
            case 'moPeople':
                this.gameState.updatePopulationCap?.();
                this.gameState.updateUI?.();
                break;
            case 'combatTraining':
                window.showToast?.(`Combat Training level ${level}: +${level * 10}% combat effectiveness`, { type: 'success' });
                break;
            case 'armyScouts':
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

    getLeadershipEffectText() {
        const level = this.getInvestmentLevel('leadershipMultiplier');
        const leadership = this.gameState.royalFamily?.currentMonarch?.skills?.leadership || 0;
        if (level === 0) return 'Current: 1.00x production';
        const mult = 1 + (leadership / 100) * level;
        return `Current: ${mult.toFixed(2)}x production (${leadership} leadership)`;
    }

    getLeadershipProductionMultiplier() {
        const level = this.getInvestmentLevel('leadershipMultiplier');
        if (level === 0) return 1.0;
        const leadership = this.gameState.royalFamily?.currentMonarch?.skills?.leadership || 0;
        return 1 + (leadership / 100) * level;
    }

    getCombatTrainingMultiplier() {
        const level = this.getInvestmentLevel('combatTraining');
        return 1 + level * 0.1;
    }

    // ═══════════════════════════════════════════════════════════════
    //  STAFF TAB — Hire generals, governors, betrothal
    // ═══════════════════════════════════════════════════════════════

    renderStaffTab() {
        this._renderStaffActions();
        this._renderStaffRoster();
    }

    _getStaffHireCost(type) {
        const staff = this.gameState.hiredStaff || [];
        const count = staff.filter(s => s.role === type).length;
        if (type === 'general') return Math.floor(this.generalBaseCost * Math.pow(this.generalCostMult, count));
        if (type === 'governor') return Math.floor(this.governorBaseCost * Math.pow(this.governorCostMult, count));
        return 0;
    }

    _getBetrothalCost() {
        const searches = this.gameState.investments.lookForBetrothal || 0;
        return Math.floor(this.betrothalBaseCost * Math.pow(this.betrothalCostMult, searches));
    }

    _renderStaffActions() {
        const el = document.getElementById('staff-actions');
        if (!el) return;

        const generalCost = this._getStaffHireCost('general');
        const governorCost = this._getStaffHireCost('governor');
        const betrothalCost = this._getBetrothalCost();
        const goldIcon = '<i class="res-icon gold"></i>';

        const rf = this.gameState.royalFamily;
        const hasSpouse = rf?.currentMonarch?.spouse;

        el.innerHTML = `
            <button class="staff-hire-btn" id="hire-general-btn">
                <span class="staff-hire-icon">⚔️</span>
                <span class="staff-hire-label">Hire General</span>
                <span class="staff-hire-cost">${this.formatGold(generalCost)} ${goldIcon}</span>
            </button>
            <button class="staff-hire-btn" id="hire-governor-btn">
                <span class="staff-hire-icon">🏛️</span>
                <span class="staff-hire-label">Hire Governor</span>
                <span class="staff-hire-cost">${this.formatGold(governorCost)} ${goldIcon}</span>
            </button>
            <button class="staff-hire-btn" id="find-betrothal-btn" ${hasSpouse ? 'disabled style="opacity:0.5;"' : ''}>
                <span class="staff-hire-icon">💍</span>
                <span class="staff-hire-label">${hasSpouse ? 'Monarch Married' : 'Find Betrothal'}</span>
                <span class="staff-hire-cost">${hasSpouse ? '—' : this.formatGold(betrothalCost) + ' ' + goldIcon}</span>
            </button>
        `;

        document.getElementById('hire-general-btn')?.addEventListener('click', () => this.offerCandidates('general'));
        document.getElementById('hire-governor-btn')?.addEventListener('click', () => this.offerCandidates('governor'));
        document.getElementById('find-betrothal-btn')?.addEventListener('click', () => this.handleBetrothal());
    }

    _renderStaffRoster() {
        const el = document.getElementById('staff-roster');
        if (!el) return;

        const staff = this.gameState.hiredStaff || [];
        if (staff.length === 0) {
            el.innerHTML = '<p style="color:#7f8c8d;font-style:italic;padding:8px 0;">No hired staff yet. Use the buttons above to recruit generals and governors.</p>';
            return;
        }

        const armies = this.gameState.getAllArmies?.() || [];
        let html = '';
        staff.forEach((s, idx) => {
            const isGeneral = s.role === 'general';
            const skillKey = isGeneral ? 'military' : 'economics';
            const skillVal = s.skills?.[skillKey] || 0;
            const skillPct = Math.min(100, Math.round((skillVal / 30) * 100));
            const skillColor = isGeneral ? '#e74c3c' : '#2ecc71';
            const traits = (s.traits || []).map(t => {
                const info = this.traitInfo[t] || { icon: '❓', label: t };
                return `<span class="staff-trait">${info.icon} ${info.label}</span>`;
            }).join('');

            let assignmentHtml = '';
            if (isGeneral) {
                const assignedArmy = s.assignedTo ? armies.find(a => a.id === s.assignedTo) : null;
                if (assignedArmy) {
                    assignmentHtml = `<div style="font-size:0.8em;color:#e74c3c;margin-top:4px;">⚔️ Leading ${assignedArmy.name}</div>`;
                } else if (armies.length > 0) {
                    assignmentHtml = `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">`;
                    armies.forEach(a => {
                        // Check if army already has a general
                        const existingGen = staff.find(ss => ss.role === 'general' && ss.assignedTo === a.id);
                        if (!existingGen) {
                            assignmentHtml += `<button class="staff-assign-btn" data-staff-idx="${idx}" data-army-id="${a.id}" style="font-size:0.72em;padding:3px 8px;background:#2a2a4a;color:#e8d5b0;border:1px solid #3a3a6a;border-radius:3px;cursor:pointer;">⚔️ Assign to ${a.name}</button>`;
                        }
                    });
                    assignmentHtml += '</div>';
                } else {
                    assignmentHtml = `<div style="font-size:0.78em;color:#7f8c8d;margin-top:4px;font-style:italic;">No armies available — draft one on the World Map</div>`;
                }
            } else {
                // Governor
                if (s.assignedTo) {
                    assignmentHtml = `<div style="font-size:0.8em;color:#2ecc71;margin-top:4px;">🏛️ Governing ${s.assignedTo === 'capital' ? 'Capital' : s.assignedTo}</div>`;
                } else {
                    const currentGov = staff.find(ss => ss.role === 'governor' && ss.assignedTo === 'capital');
                    if (!currentGov) {
                        assignmentHtml = `<button class="staff-assign-gov-btn" data-staff-idx="${idx}" style="font-size:0.72em;padding:3px 8px;background:#2a4a2a;color:#e8d5b0;border:1px solid #3a6a3a;border-radius:3px;cursor:pointer;margin-top:6px;">🏛️ Assign to Capital</button>`;
                    } else {
                        assignmentHtml = `<div style="font-size:0.78em;color:#7f8c8d;margin-top:4px;font-style:italic;">Capital already governed</div>`;
                    }
                }
            }

            html += `
                <div class="staff-card ${s.role}">
                    <div class="staff-name">${s.name}</div>
                    <div class="staff-role">${isGeneral ? '⚔️ General' : '🏛️ Governor'} · ${(s.origin || 'Unknown').replace(/_/g, ' ')}</div>
                    <div style="font-size:0.82em;color:#bdc3c7;margin-bottom:4px;">${isGeneral ? 'Military' : 'Economics'}: ${skillVal}</div>
                    <div class="staff-skill-bar"><div class="fill" style="width:${skillPct}%;background:${skillColor};"></div></div>
                    <div style="margin-top:6px;">${traits}</div>
                    ${assignmentHtml}
                    <button class="staff-dismiss-btn" data-staff-idx="${idx}">✖ Dismiss</button>
                </div>
            `;
        });

        el.innerHTML = html;

        // Wire assignment buttons
        el.querySelectorAll('.staff-assign-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.staffIdx);
                const armyId = btn.dataset.armyId;
                this._assignStaffGeneral(idx, armyId);
            });
        });
        el.querySelectorAll('.staff-assign-gov-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.staffIdx);
                this._assignStaffGovernor(idx, 'capital');
            });
        });
        el.querySelectorAll('.staff-dismiss-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.staffIdx);
                this._dismissStaff(idx);
            });
        });
    }

    _assignStaffGeneral(idx, armyId) {
        const staff = this.gameState.hiredStaff;
        if (!staff || !staff[idx]) return;
        // Unassign any existing general from this army
        staff.forEach(s => { if (s.role === 'general' && s.assignedTo === armyId) s.assignedTo = null; });
        staff[idx].assignedTo = armyId;
        window.showToast?.(`${staff[idx].name} assigned as General!`, { type: 'success' });
        this.renderStaffTab();
        this.gameState.save();
    }

    _assignStaffGovernor(idx, locationKey) {
        const staff = this.gameState.hiredStaff;
        if (!staff || !staff[idx]) return;
        // Unassign any existing governor
        staff.forEach(s => { if (s.role === 'governor' && s.assignedTo === locationKey) s.assignedTo = null; });
        staff[idx].assignedTo = locationKey;
        window.showToast?.(`${staff[idx].name} assigned as Governor!`, { type: 'success' });
        this.renderStaffTab();
        this.gameState.save();
    }

    _dismissStaff(idx) {
        const staff = this.gameState.hiredStaff;
        if (!staff || !staff[idx]) return;
        const name = staff[idx].name;
        staff.splice(idx, 1);
        window.showToast?.(`${name} has been dismissed.`, { type: 'info' });
        this.renderStaffTab();
        this.gameState.save();
    }

    // ═══════════════════════════════════════════════════════════════
    //  CANDIDATE OFFERING SYSTEM (generals / governors)
    // ═══════════════════════════════════════════════════════════════

    offerCandidates(role) {
        const cost = this._getStaffHireCost(role);
        if (!this.gameState.canAffordGold(cost)) {
            window.showToast?.(`Need ${this.formatGold(cost)} gold to recruit.`, { type: 'warning' });
            return;
        }

        // Generate 2 candidates
        const candidates = [this._generateCandidate(role), this._generateCandidate(role)];

        const isGeneral = role === 'general';
        const roleLabel = isGeneral ? '⚔️ General' : '🏛️ Governor';
        const primarySkill = isGeneral ? 'military' : 'economics';
        const secondarySkill = isGeneral ? 'leadership' : 'diplomacy';

        let html = `<p style="color:#bdc3c7;margin-bottom:12px;">Choose a ${role} to hire for <span style="color:#f39c12;font-weight:bold;">${this.formatGold(cost)}</span> <i class="res-icon gold"></i>:</p>`;
        html += '<div class="candidate-grid">';

        candidates.forEach((c, i) => {
            const traits = (c.traits || []).map(t => {
                const info = this.traitInfo[t] || { icon: '❓', label: t };
                return `<span class="staff-trait">${info.icon} ${info.label}</span>`;
            }).join('');

            const skillEntries = [
                { key: primarySkill, val: c.skills[primarySkill] || 0, color: isGeneral ? '#e74c3c' : '#2ecc71' },
                { key: secondarySkill, val: c.skills[secondarySkill] || 0, color: isGeneral ? '#e67e22' : '#3498db' }
            ];

            let skillHtml = skillEntries.map(s => {
                const pct = Math.min(100, Math.round((s.val / 30) * 100));
                return `<div class="candidate-skill">
                    <span style="text-transform:capitalize;min-width:70px;">${s.key}</span>
                    <span style="margin-left:auto;color:#f1c40f;font-weight:600;">${s.val}</span>
                    <div class="bar"><div class="fill" style="width:${pct}%;background:${s.color};"></div></div>
                </div>`;
            }).join('');

            html += `
                <div class="candidate-card" data-idx="${i}">
                    <div class="candidate-name">${c.name}</div>
                    <div class="candidate-origin">${(c.origin || 'Unknown').replace(/_/g, ' ')}</div>
                    ${skillHtml}
                    <div style="margin-top:8px;">${traits || '<span style="color:#7f8c8d;">No traits</span>'}</div>
                    <button class="candidate-choose-btn" data-idx="${i}">Hire ${c.name}</button>
                </div>`;
        });
        html += '</div>';

        window.modalSystem?.showModal({
            title: `${roleLabel} Recruitment`,
            content: html,
            maxWidth: '520px'
        });

        setTimeout(() => {
            document.querySelectorAll('.candidate-choose-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    this._hireCandidate(candidates[idx], role, cost);
                });
            });
        }, 50);
    }

    _generateCandidate(role) {
        const rf = this.gameState.royalFamily;
        const isGeneral = role === 'general';
        const maleNames = ['Marcus', 'Aldric', 'Hector', 'Roland', 'Thurston', 'Gareth', 'Osric', 'Cedric', 'Alaric', 'Balthazar'];
        const femaleNames = ['Elara', 'Brenna', 'Sigrid', 'Isolde', 'Rowena', 'Astrid', 'Helga', 'Morwen', 'Freya', 'Dahlia'];
        const origins = ['local_nobility', 'foreign_court', 'merchant_family', 'military_dynasty', 'scholarly_house'];
        const isFemale = Math.random() < 0.5;
        const nameList = isFemale ? femaleNames : maleNames;

        // Skills: primary skill biased higher
        const skills = {
            leadership: Math.floor(Math.random() * 15) + 5,
            military: Math.floor(Math.random() * 15) + 5,
            diplomacy: Math.floor(Math.random() * 15) + 5,
            economics: Math.floor(Math.random() * 15) + 5
        };
        // Bias primary skill
        const primaryKey = isGeneral ? 'military' : 'economics';
        skills[primaryKey] = Math.floor(Math.random() * 15) + 12; // 12-27

        const traits = rf?.generateRoyalTraits?.() || [];
        return {
            name: nameList[Math.floor(Math.random() * nameList.length)],
            age: 20 + Math.floor(Math.random() * 25),
            origin: origins[Math.floor(Math.random() * origins.length)],
            traits,
            skills,
            role,
            assignedTo: null
        };
    }

    _hireCandidate(candidate, role, cost) {
        if (!this.gameState.canAffordGold(cost)) {
            window.showToast?.('Not enough gold!', { type: 'warning' });
            return;
        }
        if (!this.gameState.spendGold(cost)) return;

        if (!this.gameState.hiredStaff) this.gameState.hiredStaff = [];
        this.gameState.hiredStaff.push({
            id: `staff_${Date.now()}_${Math.floor(Math.random() * 999)}`,
            name: candidate.name,
            age: candidate.age,
            origin: candidate.origin,
            traits: candidate.traits,
            skills: candidate.skills,
            role: role,
            assignedTo: null
        });

        window.modalSystem?.closeTopModal();
        window.showToast?.(`${candidate.name} hired as ${role}!`, { type: 'success' });
        this.renderStaffTab();
        this.displayInvestmentStatus();
        this.gameState.save();
    }

    // ═══════════════════════════════════════════════════════════════
    //  BETROTHAL SYSTEM
    // ═══════════════════════════════════════════════════════════════

    handleBetrothal() {
        const rf = this.gameState.royalFamily;
        if (!rf || !rf.currentMonarch) {
            window.showToast?.('No monarch to arrange betrothal for.', { type: 'warning' });
            return;
        }
        if (rf.currentMonarch.spouse) {
            window.showToast?.('Monarch is already married.', { type: 'info' });
            return;
        }

        const cost = this._getBetrothalCost();
        if (!this.gameState.canAffordGold(cost)) {
            window.showToast?.(`Need ${this.formatGold(cost)} gold for betrothal search.`, { type: 'warning' });
            return;
        }
        if (!this.gameState.spendGold(cost)) return;

        const inv = this.gameState.investments;
        inv.lookForBetrothal = (inv.lookForBetrothal || 0) + 1;

        // Generate 2 candidates
        const femaleNames = ['Isabella', 'Eleanor', 'Margaret', 'Catherine', 'Elizabeth', 'Victoria', 'Arabella', 'Sophia', 'Helena', 'Lydia'];
        const maleNames = ['Alexander', 'William', 'Henry', 'Richard', 'Edward', 'Arthur', 'Charles', 'Frederick', 'Leopold', 'Theodore'];
        const origins = ['local_nobility', 'foreign_court', 'merchant_family', 'scholarly_house', 'military_dynasty'];
        const monarchAge = rf.currentMonarch.age || 25;

        const candidates = [];
        for (let i = 0; i < 2; i++) {
            const isFemale = Math.random() < 0.5;
            const nameList = isFemale ? femaleNames : maleNames;
            candidates.push({
                name: nameList[Math.floor(Math.random() * nameList.length)],
                age: monarchAge + Math.floor(Math.random() * 10) - 5,
                origin: origins[Math.floor(Math.random() * origins.length)],
                traits: rf.generateRoyalTraits(),
                skills: rf.generateRoyalSkills()
            });
        }

        this.showBetrothalModal(candidates);
        this.renderStaffTab();
        this.gameState.save();
    }

    showBetrothalModal(candidates) {
        let html = '<p style="color:#bdc3c7;margin-bottom:12px;">Choose a marriage partner for your monarch:</p>';
        html += '<div class="candidate-grid">';
        candidates.forEach((c, i) => {
            const traits = (c.traits || []).map(t => {
                const info = this.traitInfo[t] || { icon: '❓', label: t };
                return `<span class="staff-trait">${info.icon} ${info.label}</span>`;
            }).join('');

            const skillEntries = [
                { key: 'leadership', val: c.skills.leadership || 0, color: '#e67e22' },
                { key: 'diplomacy',  val: c.skills.diplomacy || 0,  color: '#3498db' },
                { key: 'economics',  val: c.skills.economics || 0,  color: '#2ecc71' }
            ];
            let skillHtml = skillEntries.map(s => {
                const pct = Math.min(100, Math.round((s.val / 30) * 100));
                return `<div class="candidate-skill">
                    <span style="text-transform:capitalize;min-width:70px;">${s.key}</span>
                    <span style="margin-left:auto;color:#f1c40f;font-weight:600;">${s.val}</span>
                    <div class="bar"><div class="fill" style="width:${pct}%;background:${s.color};"></div></div>
                </div>`;
            }).join('');

            html += `
                <div class="candidate-card" data-idx="${i}">
                    <div class="candidate-name">💍 ${c.name}</div>
                    <div class="candidate-origin">Age ${c.age} · ${(c.origin || 'Unknown').replace(/_/g, ' ')}</div>
                    ${skillHtml}
                    <div style="margin-top:8px;">${traits || '<span style="color:#7f8c8d;">No traits</span>'}</div>
                    <button class="candidate-choose-btn" data-idx="${i}">Choose ${c.name}</button>
                </div>`;
        });
        html += '</div>';

        window.modalSystem?.showModal({
            title: '💍 Betrothal Candidates',
            content: html,
            maxWidth: '520px'
        });

        setTimeout(() => {
            document.querySelectorAll('.candidate-choose-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    this.completeBetrothal(candidates[idx]);
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
            this.renderStaffTab();
            this.updateMonarchCard();
            this.renderFamilyTreeTab();
        } else {
            window.showToast?.('Marriage arrangement failed.', { type: 'error' });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  LEGACY BONUSES
    // ═══════════════════════════════════════════════════════════════

    renderLegacyBonuses() {
        const container = document.getElementById('legacy-bonuses-grid');
        if (!container) return;

        const legacy = window.legacySystem?.legacy;
        if (!legacy) {
            container.innerHTML = '<p style="color:#95a5a6;">Legacy system not available.</p>';
            return;
        }

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

        container.querySelectorAll('.legacy-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.purchaseLegacyBonus(btn.dataset.type, parseInt(btn.dataset.baseCost));
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
        const result = window.legacySystem.purchaseBonus(type, baseCost);
        if (result.success) {
            window.showToast?.(result.message, { type: 'success' });
        } else {
            window.showToast?.(result.message, { type: 'warning' });
        }
        this.renderLegacyBonuses();
        this.updateDynastyStats();
    }

    // ═══════════════════════════════════════════════════════════════
    //  DYNASTY BUTTONS & RENAME
    // ═══════════════════════════════════════════════════════════════

    setupDynastyButtons() {
        const calculateBtn = document.getElementById('calculate-inheritance-btn');
        const prestigeBtn = document.getElementById('prestige-reset-btn');
        const renameBtn = document.getElementById('rename-dynasty-btn');

        if (renameBtn) {
            renameBtn.addEventListener('click', () => this.showRenameDynastyModal());
        }
        
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                if (!window.legacySystem) return;
                const { total, breakdown } = window.legacySystem.calculateLegacyPoints(this.gameState);
                const breakdownHtml = breakdown.map(b =>
                    `<div style="display:flex;justify-content:space-between;padding:4px 0;">
                        <span>${b.label}:</span>
                        <span>+${b.value} (${b.detail})</span>
                    </div>`
                ).join('');
                window.showModal?.('Legacy Point Preview',
                    `<div style="max-width:400px;">
                        <h4 style="color:#f1c40f;margin-bottom:8px;">🏆 Current Legacy Value</h4>
                        <p style="color:#bdc3c7;margin-bottom:12px;">If your dynasty ended today:</p>
                        ${breakdownHtml}
                        <hr style="margin:12px 0;border-color:#444;">
                        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.1em;">
                            <span>Total Legacy Points:</span>
                            <span style="color:#f39c12;">${total}</span>
                        </div>
                    </div>`,
                    { icon: '🏆', type: 'info' }
                );
            });
        }
        
        if (prestigeBtn) {
            prestigeBtn.addEventListener('click', () => {
                if ((this.gameState.day || 0) < 100) {
                    window.showToast?.(`Cannot end dynasty before Day 100 (current: Day ${this.gameState.day || 0})`, { type: 'warning' });
                    return;
                }
                if (window.legacySystem) {
                    window.legacySystem.showEndDynastyModal(
                        this.gameState,
                        localStorage.getItem('dynastyName') || this.gameState.dynastyName || 'Unknown'
                    );
                }
            });
        }
    }

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

    // ═══════════════════════════════════════════════════════════════
    //  GOLD DISPLAY & FORMATTING
    // ═══════════════════════════════════════════════════════════════

    updateGoldDisplay() {
        const el = document.getElementById('monarch-gold-display');
        if (el) el.innerHTML = `<i class="res-icon gold"></i> ${this.formatGold(Math.floor(this.gameState.gold))} Gold`;
    }

    formatGold(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString();
    }

    // ═══════════════════════════════════════════════════════════════
    //  INVESTMENT STATUS DISPLAY (Overview tab)
    // ═══════════════════════════════════════════════════════════════

    displayInvestmentStatus() {
        const statusDiv = document.getElementById('investment-status');
        if (!statusDiv) return;
        
        const inv = this.gameState.investments;
        const staff = this.gameState.hiredStaff || [];
        const leaderMult = this.getLeadershipProductionMultiplier();
        const combatMult = this.getCombatTrainingMultiplier();
        const generals = staff.filter(s => s.role === 'general').length;
        const governors = staff.filter(s => s.role === 'governor').length;

        // Check wise trait
        const hasWise = this.gameState.royalFamily?.currentMonarch?.traits?.includes('wise');

        statusDiv.innerHTML = `
            <div class="dynasty-stats">
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${generals}</div>
                    <div class="dynasty-stat-label">Generals</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${governors}</div>
                    <div class="dynasty-stat-label">Governors</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${leaderMult.toFixed(2)}x</div>
                    <div class="dynasty-stat-label">Leadership</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${combatMult.toFixed(1)}x</div>
                    <div class="dynasty-stat-label">Combat</div>
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
                    <div class="dynasty-stat-label">Housing</div>
                </div>
                ${hasWise ? `<div class="dynasty-stat">
                    <div class="dynasty-stat-value">📖 +5%</div>
                    <div class="dynasty-stat-label">Wise Bonus</div>
                </div>` : ''}
            </div>
        `;
    }

    updateInvestmentDisplay() {
        this.displayInvestmentStatus();
        this.updateGoldDisplay();
    }

    // ═══════════════════════════════════════════════════════════════
    //  MONARCH CARD
    // ═══════════════════════════════════════════════════════════════

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
        const traits = (m.traits || []).map(t => {
            const info = this.traitInfo[t] || { icon: '❓', label: t, desc: '' };
            return `<span class="trait-badge" title="${info.desc}">${info.icon} ${info.label}</span>`;
        }).join(' ') || '<span style="color:#95a5a6;">None</span>';

        const skillColors = { leadership: '#e67e22', military: '#e74c3c', diplomacy: '#3498db', economics: '#2ecc71' };
        let skillBars = Object.entries(skills).map(([key, val]) => {
            const pct = Math.min(100, Math.round((val / 50) * 100));
            const color = skillColors[key] || '#888';
            return `<div style="margin-bottom:4px;">
                <div style="display:flex;justify-content:space-between;font-size:0.82em;margin-bottom:1px;">
                    <span style="text-transform:capitalize;">${key}</span>
                    <span style="color:${color};font-weight:600;">${val}</span>
                </div>
                <div style="background:#111;border-radius:3px;height:6px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
                </div>
            </div>`;
        }).join('');

        el.innerHTML = `
            <div class="monarch-card" style="cursor:pointer;" title="Click for full genetics view">
                <div class="monarch-info">
                    <div class="monarch-portrait">👑</div>
                    <div class="monarch-details">
                        <h4>${m.name || 'Unknown Monarch'}</h4>
                        <p style="margin:0;color:#95a5a6;font-size:0.85em;">Age: ${m.age || '?'} · Reign: ${reignDays} days</p>
                        <div style="margin-top:0.4rem;">${traits}</div>
                    </div>
                </div>
                <div style="margin-top:10px;">${skillBars}</div>
            </div>
        `;

        el.querySelector('.monarch-card')?.addEventListener('click', () => {
            if (m.id) this.showGeneticsViewer(m.id);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  DYNASTY STATS
    // ═══════════════════════════════════════════════════════════════

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
        const legacy = window.legacySystem?.legacy;
        const legacyPoints = legacy?.totalPoints || 0;
        const dynastiesCompleted = legacy?.dynastiesCompleted || 0;

        el.innerHTML = `
            <div class="dynasty-stats">
                <div class="dynasty-stat"><div class="dynasty-stat-value">👑 ${monarchName}</div><div class="dynasty-stat-label">Current Ruler</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${reignDays}</div><div class="dynasty-stat-label">Reign (days)</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${familySize}</div><div class="dynasty-stat-label">Royal Family</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${heirs}</div><div class="dynasty-stat-label">Eligible Heirs</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${pop}</div><div class="dynasty-stat-label">Population</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${buildingCount}</div><div class="dynasty-stat-label">Buildings</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${legacyPoints}</div><div class="dynasty-stat-label">Legacy Points</div></div>
                <div class="dynasty-stat"><div class="dynasty-stat-value">${dynastiesCompleted}</div><div class="dynasty-stat-label">Past Dynasties</div></div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    //  FAMILY TREE TAB (lineage visualization)
    // ═══════════════════════════════════════════════════════════════

    renderFamilyTreeTab() {
        const el = document.getElementById('family-tree-visual');
        if (!el) return;

        const rf = this.gameState.royalFamily;
        if (!rf || !rf.royalFamily || rf.royalFamily.length === 0) {
            el.innerHTML = '<p style="color:#bdc3c7;">No royal family members.</p>';
            return;
        }

        const monarch = rf.currentMonarch;
        const monarchId = monarch?.id;

        // Categorize: Main Lineage = monarch + spouse + direct children
        // Cousin Lineage = everyone else descended from original founder
        const mainLineage = [];
        const cousinLineage = [];

        rf.royalFamily.forEach(member => {
            const isMonarch = member.id === monarchId;
            const isSpouse = member.status === 'royal_spouse' && member.spouse === monarchId;
            const isDirectChild = member.parents && member.parents.includes(monarchId);
            const isMonarchSpouseChild = monarch?.spouse && member.parents && member.parents.includes(monarch.spouse);

            if (isMonarch || isSpouse || isDirectChild || isMonarchSpouseChild) {
                mainLineage.push(member);
            } else {
                cousinLineage.push(member);
            }
        });

        let html = '';

        // Main Lineage
        html += '<div class="lineage-section">';
        html += '<h4>👑 Main Lineage</h4>';
        html += '<div class="tree-members">';
        mainLineage.forEach(m => { html += this._renderTreeNode(m, monarchId); });
        html += '</div></div>';

        // Cousin Lineage
        if (cousinLineage.length > 0) {
            html += '<div class="lineage-section">';
            html += '<h4>🏰 Extended Family</h4>';
            html += '<div class="tree-members">';
            cousinLineage.forEach(m => { html += this._renderTreeNode(m, monarchId); });
            html += '</div></div>';
        }

        // Hired Staff (shown as reference)
        const staff = this.gameState.hiredStaff || [];
        if (staff.length > 0) {
            html += '<div class="lineage-section">';
            html += '<h4>📋 Hired Staff</h4>';
            html += '<div class="tree-members">';
            staff.forEach(s => {
                const roleIcon = s.role === 'general' ? '⚔️' : '🏛️';
                const traits = (s.traits || []).map(t => {
                    const info = this.traitInfo[t] || { icon: '❓', label: t };
                    return `<span class="staff-trait">${info.icon} ${info.label}</span>`;
                }).join('');
                html += `
                    <div class="tree-node" style="border-left-color:${s.role === 'general' ? '#e74c3c' : '#2ecc71'};">
                        <div class="node-icon">${roleIcon}</div>
                        <div class="node-name">${s.name}</div>
                        <div class="node-info">${s.role === 'general' ? 'General' : 'Governor'} · Age ${s.age || '?'}</div>
                        <div class="node-traits">${traits}</div>
                    </div>`;
            });
            html += '</div></div>';
        }

        el.innerHTML = html;

        // Wire click → genetics viewer on family nodes
        el.querySelectorAll('.tree-node[data-royal-id]').forEach(node => {
            node.addEventListener('click', () => {
                this.showGeneticsViewer(node.dataset.royalId);
            });
        });
    }

    _renderTreeNode(member, monarchId) {
        const isMonarch = member.id === monarchId;
        const isHeir = member.status === 'heir';
        const isSpouse = member.status === 'royal_spouse';
        let cls = 'tree-node';
        if (isMonarch) cls += ' monarch';
        else if (isHeir) cls += ' heir';
        else if (isSpouse) cls += ' spouse';
        else cls += ' child';

        const icon = isMonarch ? '👑' : member.role === 'general' ? '⚔️' : member.role === 'governor' ? '🏛️' : isHeir ? '🏰' : isSpouse ? '💍' : '👤';
        let statusLabel = isMonarch ? 'Monarch' : isHeir ? 'Heir' : isSpouse ? 'Spouse' : member.status || '';
        if (member.role === 'general') statusLabel = 'General';
        if (member.role === 'governor') statusLabel = 'Governor';

        const traits = (member.traits || []).map(t => {
            const info = this.traitInfo[t] || { icon: '❓', label: t };
            return `<span class="staff-trait">${info.icon} ${info.label}</span>`;
        }).join('');

        const skills = member.skills || {};
        return `
            <div class="${cls}" data-royal-id="${member.id}" title="Click to view genetics">
                <div class="node-icon">${icon}</div>
                <div class="node-name">${member.name || 'Unknown'}</div>
                <div class="node-info">Age ${member.age || '?'} · ${statusLabel}</div>
                <div class="node-skill-row">⚔️${skills.military || 0} 📊${skills.economics || 0} 🗣️${skills.diplomacy || 0} 👑${skills.leadership || 0}</div>
                <div class="node-traits">${traits}</div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    //  FAMILY ROLE ASSIGNMENTS (Staff tab — legacy family assignment)
    // ═══════════════════════════════════════════════════════════════

    updateFamilyTree() {
        const el = document.getElementById('monarch-family-tree');
        if (!el) return;

        const rf = this.gameState.royalFamily;
        if (!rf || !rf.royalFamily || rf.royalFamily.length === 0) {
            el.innerHTML = `<p style="color:#bdc3c7;">No royal family members available for assignment.</p>`;
            return;
        }

        const staff = this.gameState.hiredStaff || [];
        const armies = this.gameState.getAllArmies?.() || [];
        const assignable = rf.royalFamily.filter(m => m.age >= 16 && m.id !== rf.currentMonarch?.id);

        if (assignable.length === 0) {
            el.innerHTML = '<p style="color:#7f8c8d;font-style:italic;">No family members old enough (16+) for assignment.</p>';
            return;
        }

        let html = '<div class="family-tree">';
        assignable.forEach(member => {
            const icon = member.role === 'general' ? '⚔️' : member.role === 'governor' ? '🏛️' : member.status === 'heir' ? '🏰' : member.status === 'royal_spouse' ? '💍' : '👤';
            let statusLabel = member.status === 'heir' ? 'Heir' : member.status === 'royal_spouse' ? 'Spouse' : member.status;
            if (member.role === 'general') {
                const army = armies.find(a => a.id === member.assignedTo);
                statusLabel = `General of ${army?.name || 'Army'}`;
            } else if (member.role === 'governor') {
                statusLabel = `Governor of ${member.assignedTo === 'capital' ? 'Capital' : member.assignedTo}`;
            }

            const skills = member.skills || {};
            html += `
                <div class="family-member${member.status === 'heir' ? ' heir' : ''}${member.status === 'royal_spouse' ? ' spouse' : ''}" data-royal-id="${member.id}" style="cursor:pointer;" title="Click to view genetics">
                    <div class="member-icon">${icon}</div>
                    <div class="member-details">
                        <div class="member-name">${member.name || 'Unknown'}</div>
                        <div class="member-info">Age: ${member.age || '?'} · ${statusLabel}</div>
                        <div style="font-size:0.8em;opacity:0.7;margin-top:2px;">⚔️${skills.military || 0} 📊${skills.economics || 0} 🗣️${skills.diplomacy || 0}</div>`;

            // Role buttons
            html += '<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">';
            if (member.role) {
                html += `<button class="role-btn role-unassign" data-royal="${member.id}" style="font-size:0.7em;padding:2px 6px;background:#5a2020;color:#e8d5b0;border:1px solid #8b3030;border-radius:3px;cursor:pointer;">✖ Unassign</button>`;
            } else {
                // Governor (no slot limit — family can serve alongside hired staff)
                const currentFamilyGov = rf.getGovernor?.('capital');
                if (!currentFamilyGov) {
                    html += `<button class="role-btn role-governor" data-royal="${member.id}" style="font-size:0.7em;padding:2px 6px;background:#2a4a2a;color:#e8d5b0;border:1px solid #3a6a3a;border-radius:3px;cursor:pointer;">🏛️ Governor</button>`;
                }
                // General
                if (armies.length > 0) {
                    armies.forEach(a => {
                        const existingGen = rf.getGeneralForArmy?.(a.id);
                        const hiredGen = staff.find(s => s.role === 'general' && s.assignedTo === a.id);
                        if (!existingGen && !hiredGen) {
                            html += `<button class="role-btn role-general" data-royal="${member.id}" data-army="${a.id}" style="font-size:0.7em;padding:2px 6px;background:#2a2a4a;color:#e8d5b0;border:1px solid #3a3a6a;border-radius:3px;cursor:pointer;">⚔️ Lead ${a.name}</button>`;
                        }
                    });
                }
            }
            html += '</div></div></div>';
        });
        html += '</div>';
        el.innerHTML = html;

        // Wire buttons
        el.querySelectorAll('.role-governor').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                rf.assignGovernor?.(btn.dataset.royal, 'capital');
                this.updateFamilyTree();
                window.showToast?.('Governor assigned to Capital!', { type: 'success' });
            });
        });
        el.querySelectorAll('.role-general').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                rf.assignGeneral?.(btn.dataset.royal, btn.dataset.army);
                this.updateFamilyTree();
                window.showToast?.('General assigned!', { type: 'success' });
            });
        });
        el.querySelectorAll('.role-unassign').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                rf.unassignRole?.(btn.dataset.royal);
                this.updateFamilyTree();
                window.showToast?.('Role removed.', { type: 'info' });
            });
        });
        el.querySelectorAll('.family-member[data-royal-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                this.showGeneticsViewer(card.dataset.royalId);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  GENETICS VIEWER MODAL
    // ═══════════════════════════════════════════════════════════════

    showGeneticsViewer(royalId) {
        const rf = this.gameState.royalFamily;
        if (!rf) return;
        const member = rf.findRoyalById(royalId);
        if (!member) return;

        // Traits
        const traits = member.traits || [];
        let traitsHtml = '';
        if (traits.length === 0) {
            traitsHtml = '<span style="color:#7f8c8d;font-style:italic;">No traits</span>';
        } else {
            traitsHtml = traits.map(t => {
                const info = this.traitInfo[t] || { icon: '❓', label: t, cat: 'Unknown', desc: '' };
                return `<span style="display:inline-block;background:#2a2a3e;border:1px solid #4a4a6a;border-radius:4px;padding:3px 8px;margin:2px;font-size:0.85em;">
                    ${info.icon} ${info.label} <span style="color:#f39c12;font-size:0.8em;">${info.desc}</span>
                </span>`;
            }).join('');
        }

        // Skills
        const skills = member.skills || { leadership: 0, military: 0, diplomacy: 0, economics: 0 };
        const skillMax = 50;
        const skillColors = { leadership: '#e67e22', military: '#e74c3c', diplomacy: '#3498db', economics: '#2ecc71' };
        let skillsHtml = Object.entries(skills).map(([key, val]) => {
            const pct = Math.min(100, Math.round((val / skillMax) * 100));
            const color = skillColors[key] || '#888';
            return `<div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:2px;">
                    <span style="text-transform:capitalize;">${key}</span>
                    <span style="color:${color};font-weight:600;">${val}</span>
                </div>
                <div style="background:#1a1a2e;border-radius:3px;height:8px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
                </div>
            </div>`;
        }).join('');

        // Lineage
        let lineageHtml = '';
        if (member.parents && member.parents.length > 0) {
            const parentNames = member.parents.map(pid => {
                const p = rf.findRoyalById(pid);
                return p ? p.name : 'Unknown';
            });
            lineageHtml = `<div style="margin-top:8px;"><strong>Parents:</strong> ${parentNames.join(' & ')}</div>`;
            const parentTraits = new Set();
            member.parents.forEach(pid => {
                const p = rf.findRoyalById(pid);
                if (p && p.traits) p.traits.forEach(t => parentTraits.add(t));
            });
            const inherited = traits.filter(t => parentTraits.has(t));
            const unique = traits.filter(t => !parentTraits.has(t));
            if (inherited.length > 0) {
                lineageHtml += `<div style="margin-top:4px;font-size:0.85em;color:#a8d8a8;">🧬 Inherited: ${inherited.map(t => (this.traitInfo[t]?.label || t)).join(', ')}</div>`;
            }
            if (unique.length > 0) {
                lineageHtml += `<div style="margin-top:4px;font-size:0.85em;color:#d8a8d8;">⚡ Mutation: ${unique.map(t => (this.traitInfo[t]?.label || t)).join(', ')}</div>`;
            }
        } else {
            lineageHtml = '<div style="margin-top:8px;color:#7f8c8d;font-style:italic;">Founder — no parent lineage</div>';
        }

        // Spouse
        let spouseHtml = '';
        if (member.spouse) {
            const spouse = rf.findRoyalById(member.spouse);
            if (spouse) {
                const spouseTraits = (spouse.traits || []).map(t => (this.traitInfo[t]?.icon || '') + ' ' + (this.traitInfo[t]?.label || t)).join(', ') || 'None';
                spouseHtml = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #333;">
                    <strong>💍 Spouse:</strong> ${spouse.name}
                    <div style="font-size:0.85em;color:#ccc;margin-top:3px;">Traits: ${spouseTraits}</div>
                </div>`;
            }
        }

        // Children
        let childrenHtml = '';
        if (member.children && member.children.length > 0) {
            const childItems = member.children.map(cid => {
                const c = rf.findRoyalById(cid);
                return c ? `${c.name} (age ${c.age})` : 'Unknown';
            }).join(', ');
            childrenHtml = `<div style="margin-top:6px;font-size:0.85em;"><strong>👶 Children:</strong> ${childItems}</div>`;
        }

        // Experience
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
                <div style="margin-top:12px;padding-top:8px;border-top:1px solid #333;font-size:0.8em;color:#888;">
                    <strong>Inheritance Rules:</strong> 50% chance per parent trait · 10% mutation chance · Skills start at 0 for heirs
                </div>
            </div>
        `;

        window.showModal?.('🧬 Royal Genetics — ' + member.name, body, { type: 'info', icon: '🧬' });
    }

    // ═══════════════════════════════════════════════════════════════
    //  FULL REFRESH & PRESTIGE BUTTON
    // ═══════════════════════════════════════════════════════════════

    refreshAll() {
        this.renderActiveTab();
    }

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

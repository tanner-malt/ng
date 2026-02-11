// Monarch view - Prestige and investment system
class MonarchManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.investmentCategories = {
            village: [
                {
                    name: 'Production Boost',
                    description: '+10% efficiency to all buildings',
                    cost: 100,
                    maxLevel: 10,
                    effect: 'productionBoost',
                    icon: '⚡'
                },
                {
                    name: 'New Building Types',
                    description: 'Unlock advanced buildings',
                    cost: 250,
                    maxLevel: 3,
                    effect: 'buildingTypes',
                    icon: '🏗️'
                },
                {
                    name: 'Automation Level Up',
                    description: 'Improve citizen automation',
                    cost: 500,
                    maxLevel: 3,
                    effect: 'automationLevel',
                    icon: '🤖'
                }
            ],
            military: [
                {
                    name: 'Army Scouts',
                    description: 'Improve AI battle decision-making',
                    cost: 200,
                    maxLevel: 5,
                    effect: 'armyScouts',
                    icon: '🔍'
                },
                {
                    name: 'Elite Generals',
                    description: 'Hire better commanders',
                    cost: 400,
                    maxLevel: 3,
                    effect: 'eliteGenerals',
                    icon: '⭐'
                },
                {
                    name: 'Tactical Academy',
                    description: 'Commanders learn faster',
                    cost: 800,
                    maxLevel: 2,
                    effect: 'tacticalAcademy',
                    icon: '🎓'
                }
            ],
            legacy: [
                {
                    name: 'Parallel Villages',
                    description: 'Run multiple villages simultaneously',
                    cost: 1000,
                    maxLevel: 1,
                    effect: 'parallelVillages',
                    icon: '🏘️'
                },
                {
                    name: 'Prestige Automation',
                    description: 'Remember placement orders',
                    cost: 2000,
                    maxLevel: 1,
                    effect: 'prestigeAutomation',
                    icon: '🔄'
                },
                {
                    name: 'Dynasty Progression',
                    description: 'Multi-generational upgrades',
                    cost: 5000,
                    maxLevel: 1,
                    effect: 'dynastyProgression',
                    icon: '👑'
                }
            ]
        };
        
        this.advisors = [
            {
                name: 'Royal Advisor Magistrate',
                specialty: 'economy',
                personality: 'cautious',
                icon: '📜',
                advice: []
            },
            {
                name: 'War Council General',
                specialty: 'military',
                personality: 'aggressive',
                icon: '⚔️',
                advice: []
            },
            {
                name: 'Court Wizard',
                specialty: 'technology',
                personality: 'innovative',
                icon: '🔮',
                advice: []
            }
        ];
        
        this.currentAdvisor = this.advisors[0];
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

        this.setupInvestmentButtons();
        this.setupDynastyButtons();
        this.generateAdvisorAdvice();
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
     *  Investment level helpers
     * ============================= */
    getInvestmentLevel(effect) {
        const val = this.gameState.investments[effect];
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (typeof val === 'number') return val;
        return 0;
    }

    isMaxed(effect) {
        const def = this.findInvestmentDef(effect);
        if (!def) return false;
        return this.getInvestmentLevel(effect) >= def.maxLevel;
    }

    findInvestmentDef(effect) {
        for (const cat of Object.values(this.investmentCategories)) {
            const found = cat.find(i => i.effect === effect);
            if (found) return found;
        }
        return null;
    }

    /* =============================
     *  Setup
     * ============================= */
    setupInvestmentButtons() {
        document.querySelectorAll('.investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cost = parseInt(btn.dataset.cost);
                const investmentType = btn.dataset.type;
                
                if (this.isMaxed(investmentType)) return;
                if (this.gameState.canAffordGold(cost)) {
                    this.makeInvestment(investmentType, cost);
                }
            });
        });
    }
    
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
     *  Investment logic
     * ============================= */
    makeInvestment(investmentType, cost) {
        if (this.isMaxed(investmentType)) return;
        if (!this.gameState.spendGold(cost)) return;
        
        // Trigger first investment achievement (only once)
        if (window.achievementSystem && !window.achievementSystem.isUnlocked('royal_investor')) {
            window.achievementSystem.triggerFirstInvestment();
            console.log('[Monarch] First investment achievement triggered');
        }
        
        // Apply investment effects based on type
        const inv = this.gameState.investments;
        switch (investmentType) {
            case 'productionBoost':
                inv.productionBoost = (inv.productionBoost || 0) + 1;
                this.gameState.logBattleEvent(`💰 Invested in production boost (Level ${inv.productionBoost})`);
                break;
            case 'buildingTypes':
                inv.buildingTypes = (inv.buildingTypes || 0) + 1;
                this.gameState.logBattleEvent('🏗️ Unlocked new building types');
                break;
            case 'automationLevel':
                inv.automationLevel = (inv.automationLevel || 0) + 1;
                this.updateAutomationLevel();
                break;
            case 'armyScouts':
                inv.armyScouts = true;
                this.gameState.logBattleEvent('🔍 Army scouts improve battle intelligence');
                break;
            case 'eliteGenerals':
                inv.eliteGenerals = true;
                this.gameState.logBattleEvent('⭐ Elite generals joined your forces');
                break;
            case 'tacticalAcademy':
                inv.tacticalAcademy = true;
                this.gameState.logBattleEvent('🎓 Tactical academy built - commanders learn faster');
                break;
            case 'parallelVillages':
                inv.parallelVillages = true;
                this.gameState.logBattleEvent('🏘️ Parallel village system activated');
                break;
            case 'prestigeAutomation':
                inv.prestigeAutomation = true;
                this.gameState.logBattleEvent('🤖 Prestige automation system online');
                break;
            case 'dynastyProgression':
                inv.dynastyProgression = true;
                this.gameState.logBattleEvent('👑 Dynasty progression unlocked');
                break;
        }
        
        this.updateInvestmentDisplay();
        this.updateGoldDisplay();
        this.generateAdvisorAdvice();
        
        // Save progress
        this.gameState.save();
    }
    
    updateAutomationLevel() {
        const levels = ['manual', 'semi-auto', 'full-auto'];
        const currentIndex = levels.indexOf(this.gameState.automationLevel || 'manual');
        
        if (currentIndex < levels.length - 1) {
            this.gameState.automationLevel = levels[currentIndex + 1];
            this.gameState.logBattleEvent(`🔧 Automation upgraded to ${this.gameState.automationLevel}`);
        }
    }

    /* =============================
     *  Gold header display
     * ============================= */
    updateGoldDisplay() {
        const el = document.getElementById('monarch-gold-display');
        if (el) {
            el.textContent = `💰 ${Math.floor(this.gameState.gold)} Gold`;
        }
    }

    /* =============================
     *  Investment display
     * ============================= */
    updateInvestmentDisplay() {
        // Update investment button states
        document.querySelectorAll('.investment-btn').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            const type = btn.dataset.type;
            const level = this.getInvestmentLevel(type);
            const def = this.findInvestmentDef(type);
            const maxLevel = def ? def.maxLevel : 1;
            const maxed = level >= maxLevel;

            btn.disabled = maxed || !this.gameState.canAffordGold(cost);
            
            if (maxed) {
                btn.textContent = 'MAX';
                btn.style.opacity = '0.5';
            } else {
                btn.textContent = `Invest (${cost} 💰)`;
                btn.style.opacity = this.gameState.canAffordGold(cost) ? '1' : '0.6';
            }

            // Update the level indicator on the parent item
            const item = btn.closest('.investment-item');
            if (item) {
                let levelEl = item.querySelector('.investment-level');
                if (!levelEl) {
                    levelEl = document.createElement('div');
                    levelEl.className = 'investment-level';
                    const details = item.querySelector('.investment-details');
                    if (details) details.appendChild(levelEl);
                }
                if (maxLevel > 1) {
                    levelEl.textContent = `Level ${level}/${maxLevel}`;
                } else {
                    levelEl.textContent = level >= 1 ? '✅ Unlocked' : '🔒 Locked';
                }
            }
        });
        
        // Show current investment status summary
        this.displayInvestmentStatus();
        this.updateGoldDisplay();
    }
    
    displayInvestmentStatus() {
        const statusDiv = document.getElementById('investment-status');
        if (!statusDiv) return;
        
        const inv = this.gameState.investments;
        statusDiv.innerHTML = `
            <div class="dynasty-stats">
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.productionBoost || 0}</div>
                    <div class="dynasty-stat-label">Production Boost</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${this.gameState.automationLevel || 'manual'}</div>
                    <div class="dynasty-stat-label">Automation</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.armyScouts ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Army Scouts</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.eliteGenerals ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Elite Generals</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.tacticalAcademy ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Tactical Academy</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.parallelVillages ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Parallel Villages</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.prestigeAutomation ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Prestige Auto</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-value">${inv.dynastyProgression ? '✅' : '❌'}</div>
                    <div class="dynasty-stat-label">Dynasty Prog.</div>
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

        // Gather available armies for general assignment
        const armies = this.gameState.getAllArmies?.() || [];

        let html = '<div class="family-tree">';
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
                    // Governor option (capital)
                    const currentGov = rf.getGovernor?.('capital');
                    if (!currentGov) {
                        html += `<button class="role-btn role-governor" data-royal="${member.id}" style="font-size:0.7em;padding:2px 6px;background:#2a4a2a;color:#e8d5b0;border:1px solid #3a6a3a;border-radius:3px;cursor:pointer;">🏛️ Governor</button>`;
                    }
                    // General option (show dropdown if armies exist)
                    if (armies.length > 0) {
                        armies.forEach(a => {
                            const existingGen = rf.getGeneralForArmy?.(a.id);
                            if (!existingGen) {
                                html += `<button class="role-btn role-general" data-royal="${member.id}" data-army="${a.id}" style="font-size:0.7em;padding:2px 6px;background:#2a2a4a;color:#e8d5b0;border:1px solid #3a3a6a;border-radius:3px;cursor:pointer;">⚔️ Lead ${a.name}</button>`;
                            }
                        });
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
     *  Advisor system
     * ============================= */
    generateAdvisorAdvice() {
        // Clear previous advice
        this.advisors.forEach(advisor => advisor.advice = []);
        
        this.generateEconomicAdvice();
        this.generateMilitaryAdvice();
        this.generateTechnicalAdvice();
        
        this.displayAdvisorAdvice();
    }
    
    generateEconomicAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'economy');
        const inv = this.gameState.investments;
        
        if (this.gameState.gold > 500 && (inv.productionBoost || 0) < 3) {
            advisor.advice.push("Your Majesty, consider investing in production boosts to increase resource generation.");
        }
        
        if ((this.gameState.buildings?.length || 0) < 5) {
            advisor.advice.push("Perhaps we should focus on village expansion before major investments?");
        }
        
        if ((this.gameState.resources?.food || 0) < 50) {
            advisor.advice.push("Food stores are running low - more farms would benefit the kingdom.");
        }

        if (this.gameState.gold > 1000) {
            advisor.advice.push("Our treasury overflows! Wise investments could multiply our wealth.");
        }
    }
    
    generateMilitaryAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'military');
        const inv = this.gameState.investments;
        
        if ((this.gameState.wave || 0) > 3 && !inv.armyScouts) {
            advisor.advice.push("The enemies grow stronger. Army scouts would improve our tactical advantage.");
        }
        
        if ((this.gameState.army?.length || 0) < 3) {
            advisor.advice.push("Our forces are few. Building barracks should be a priority.");
        }
        
        if (!inv.eliteGenerals && this.gameState.gold > 400) {
            advisor.advice.push("Elite generals could turn the tide of future battles, Your Majesty.");
        }

        if (!inv.tacticalAcademy && inv.eliteGenerals) {
            advisor.advice.push("With generals in place, a Tactical Academy would sharpen their skills.");
        }
    }
    
    generateTechnicalAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'technology');
        const inv = this.gameState.investments;
        
        if ((this.gameState.automationLevel || 'manual') === 'manual' && (this.gameState.population || 0) > 20) {
            advisor.advice.push("With a larger population, automation upgrades would increase efficiency.");
        }
        
        if (this.gameState.gold > 1000 && !inv.parallelVillages) {
            advisor.advice.push("The parallel village system could exponentially increase our power.");
        }
        
        if ((this.gameState.wave || 0) > 5 && !inv.prestigeAutomation) {
            advisor.advice.push("Prestige automation would remember our successful strategies for future reigns.");
        }

        if (!inv.dynastyProgression && inv.parallelVillages) {
            advisor.advice.push("Dynasty Progression — the ultimate investment — awaits, Your Majesty.");
        }
    }
    
    displayAdvisorAdvice() {
        const advisorDiv = document.getElementById('advisor-panel');
        if (!advisorDiv) return;
        
        let adviceHtml = `
            <div class="advisor-header">
                <span class="advisor-icon">${this.currentAdvisor.icon || '📜'}</span>
                <h4>${this.currentAdvisor.name} advises:</h4>
            </div>
        `;
        
        if (this.currentAdvisor.advice.length > 0) {
            adviceHtml += '<div class="advisor-advice-list">';
            this.currentAdvisor.advice.forEach(advice => {
                adviceHtml += `<p class="advisor-advice-item">• ${advice}</p>`;
            });
            adviceHtml += '</div>';
        } else {
            adviceHtml += `<p class="advisor-advice-empty">Your kingdom prospers under your wise rule, Your Majesty.</p>`;
        }
        
        adviceHtml += `
            <div class="advisor-buttons">
                ${this.advisors.map(advisor => `
                    <button class="advisor-btn ${advisor === this.currentAdvisor ? 'active' : ''}" 
                            data-advisor="${advisor.name}">
                        ${advisor.icon || '📜'} ${this.capitalize(advisor.specialty)}
                    </button>
                `).join('')}
            </div>
        `;
        
        advisorDiv.innerHTML = adviceHtml;
        
        // Setup advisor switching
        advisorDiv.querySelectorAll('.advisor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const advisorName = btn.dataset.advisor;
                this.currentAdvisor = this.advisors.find(a => a.name === advisorName);
                this.displayAdvisorAdvice();
            });
        });
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
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
        this.generateAdvisorAdvice();
    }
}

// Make MonarchManager globally available
window.MonarchManager = MonarchManager;

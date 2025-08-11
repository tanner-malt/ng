// Monarch view - Prestige and investment system
class MonarchManager {
    constructor(gameState) {
        this.gameState = gameState;
        // NOTE: For true centralization, investment costs should be managed in GameData (not hardcoded here)
        this.investmentCategories = {
            village: [
                {
                    name: 'Production Boost',
                    description: '+10% efficiency to all buildings',
                    cost: 100,
                    maxLevel: 10,
                    effect: 'productionBoost'
                },
                {
                    name: 'New Building Types',
                    description: 'Unlock advanced buildings',
                    cost: 250,
                    maxLevel: 3,
                    effect: 'buildingTypes'
                },
                {
                    name: 'Automation Level Up',
                    description: 'Improve citizen automation',
                    cost: 500,
                    maxLevel: 3,
                    effect: 'automationLevel'
                }
            ],
            military: [
                {
                    name: 'Army Scouts',
                    description: 'Improve AI battle decision-making',
                    cost: 200,
                    maxLevel: 5,
                    effect: 'armyScouts'
                },
                {
                    name: 'Elite Generals',
                    description: 'Hire better commanders',
                    cost: 400,
                    maxLevel: 3,
                    effect: 'eliteGenerals'
                },
                {
                    name: 'Tactical Academy',
                    description: 'Commanders learn faster',
                    cost: 800,
                    maxLevel: 2,
                    effect: 'tacticalAcademy'
                }
            ],
            legacy: [
                {
                    name: 'Parallel Villages',
                    description: 'Run multiple villages simultaneously',
                    cost: 1000,
                    maxLevel: 1,
                    effect: 'parallelVillages'
                },
                {
                    name: 'Prestige Automation',
                    description: 'Remember placement orders',
                    cost: 2000,
                    maxLevel: 1,
                    effect: 'prestigeAutomation'
                },
                {
                    name: 'Dynasty Progression',
                    description: 'Multi-generational upgrades',
                    cost: 5000,
                    maxLevel: 1,
                    effect: 'dynastyProgression'
                }
            ]
        };
        
        this.advisors = [
            {
                name: 'Royal Advisor Magistrate',
                specialty: 'economy',
                personality: 'cautious',
                advice: []
            },
            {
                name: 'War Council General',
                specialty: 'military',
                personality: 'aggressive',
                advice: []
            },
            {
                name: 'Court Wizard',
                specialty: 'technology',
                personality: 'innovative',
                advice: []
            }
        ];
        
        this.currentAdvisor = this.advisors[0];
    }
    
    init() {
        this.setupInvestmentButtons();
        this.setupDynastyButtons();
        this.generateAdvisorAdvice();
        this.updateInvestmentDisplay();
        this.calculateInheritance();
    }
    
    setupInvestmentButtons() {
        document.querySelectorAll('.investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cost = parseInt(btn.dataset.cost);
                const investmentType = btn.dataset.type;
                
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
                const inheritance = this.calculateInheritance();
                if (window.showModal) {
                    window.showModal(
                        'Dynasty Inheritance Calculation',
                        `<div class="dynasty-calculation">
                            <h3>💰 Current Dynasty Value</h3>
                            <p>If your dynasty ended today, your heir would inherit:</p>
                            <div class="inheritance-breakdown">
                                <div class="inheritance-item">
                                    <span class="inheritance-label">Base Inheritance:</span>
                                    <span class="inheritance-value">500 💰</span>
                                </div>
                                <div class="inheritance-item">
                                    <span class="inheritance-label">Wave Bonus:</span>
                                    <span class="inheritance-value">${this.gameState.wave * 50} 💰</span>
                                </div>
                                <div class="inheritance-item">
                                    <span class="inheritance-label">Building Bonus:</span>
                                    <span class="inheritance-value">${this.gameState.buildings.length * 25} 💰</span>
                                </div>
                                <div class="inheritance-item">
                                    <span class="inheritance-label">Population Bonus:</span>
                                    <span class="inheritance-value">${Math.floor(this.gameState.population / 5) * 10} 💰</span>
                                </div>
                                <hr style="margin: 1rem 0; border-color: #444;">
                                <div class="inheritance-total">
                                    <span class="inheritance-label"><strong>Total Inheritance:</strong></span>
                                    <span class="inheritance-value"><strong>${inheritance} 💰</strong></span>
                                </div>
                            </div>
                        </div>`,
                        { icon: '💰', type: 'info' }
                    );
                }
            });
        }
        
        if (prestigeBtn) {
            prestigeBtn.addEventListener('click', () => {
                if (window.modalSystem && window.modalSystem.showConfirmation) {
                    window.modalSystem.showConfirmation(
                        'Are you sure you want to end your dynasty? This will reset your progress but grant legacy bonuses for your next dynasty.',
                        {
                            title: 'End Dynasty (Prestige Reset)',
                            confirmText: 'End Dynasty',
                            cancelText: 'Keep Ruling',
                            onConfirm: () => {
                                this.triggerPrestige();
                            }
                        }
                    );
                }
            });
        }
    }
    
    makeInvestment(investmentType, cost) {
        this.gameState.spendGold(cost);
        
        // Trigger first investment achievement (only once)
        if (window.achievementSystem && !window.achievementSystem.isUnlocked('royal_investor')) {
            window.achievementSystem.triggerFirstInvestment();
            console.log('[Monarch] First investment achievement triggered');
        }
        
        // Apply investment effects based on type
        switch (investmentType) {
            case 'productionBoost':
                this.gameState.investments.productionBoost++;
                this.gameState.logBattleEvent(`💰 Invested in production boost (Level ${this.gameState.investments.productionBoost})`);
                break;
            case 'buildingTypes':
                this.gameState.investments.buildingTypes++;
                this.gameState.logBattleEvent('🏗️ Unlocked new building types');
                break;
            case 'automationLevel':
                this.gameState.investments.automationLevel++;
                this.updateAutomationLevel();
                break;
            case 'armyScouts':
                this.gameState.investments.armyScouts = true;
                this.gameState.logBattleEvent('🔍 Army scouts improve battle intelligence');
                break;
            case 'eliteGenerals':
                this.gameState.investments.eliteGenerals = true;
                this.gameState.logBattleEvent('⭐ Elite generals joined your forces');
                break;
            case 'tacticalAcademy':
                this.gameState.investments.tacticalAcademy = true;
                this.gameState.logBattleEvent('🎓 Tactical academy built - commanders learn faster');
                break;
            case 'parallelVillages':
                this.gameState.investments.parallelVillages = true;
                this.gameState.logBattleEvent('🏘️ Parallel village system activated');
                break;
            case 'prestigeAutomation':
                this.gameState.investments.prestigeAutomation = true;
                this.gameState.logBattleEvent('🤖 Prestige automation system online');
                break;
            case 'dynastyProgression':
                this.gameState.investments.dynastyProgression = true;
                this.gameState.logBattleEvent('👑 Dynasty progression unlocked');
                break;
        }
        
        this.updateInvestmentDisplay();
        this.generateAdvisorAdvice();
        
        // Save progress
        this.gameState.save();
    }
    
    updateAutomationLevel() {
        const levels = ['manual', 'semi-auto', 'full-auto'];
        const currentIndex = levels.indexOf(this.gameState.automationLevel);
        
        if (currentIndex < levels.length - 1) {
            this.gameState.automationLevel = levels[currentIndex + 1];
            this.gameState.logBattleEvent(`🔧 Automation upgraded to ${this.gameState.automationLevel}`);
        }
    }
    
    updateInvestmentDisplay() {
        // Update investment button states and costs
        document.querySelectorAll('.investment-btn').forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            btn.disabled = !this.gameState.canAffordGold(cost);
            
            // Update button styling based on affordability
            if (this.gameState.canAffordGold(cost)) {
                btn.style.opacity = '1';
            } else {
                btn.style.opacity = '0.6';
            }
        });
        
        // Show current investment levels
        this.displayInvestmentStatus();
    }
    
    displayInvestmentStatus() {
        // Update the investment status display
        const statusDiv = document.getElementById('investment-status');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = `
            <h4 style="color: #1abc9c; margin-bottom: 1rem;">Current Investment Levels</h4>
            <div class="dynasty-stats">
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Production Boost</div>
                    <div class="dynasty-stat-value">Level ${this.gameState.investments.productionBoost}</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Automation Level</div>
                    <div class="dynasty-stat-value">${this.gameState.automationLevel}</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Army Scouts</div>
                    <div class="dynasty-stat-value">${this.gameState.investments.armyScouts ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Elite Generals</div>
                    <div class="dynasty-stat-value">${this.gameState.investments.eliteGenerals ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Parallel Villages</div>
                    <div class="dynasty-stat-value">${this.gameState.investments.parallelVillages ? 'Unlocked' : 'Locked'}</div>
                </div>
                <div class="dynasty-stat">
                    <div class="dynasty-stat-label">Prestige Automation</div>
                    <div class="dynasty-stat-value">${this.gameState.investments.prestigeAutomation ? 'Active' : 'Inactive'}</div>
                </div>
            </div>
        `;
    }
    
    generateAdvisorAdvice() {
        // Clear previous advice
        this.advisors.forEach(advisor => advisor.advice = []);
        
        // Generate advice based on current game state
        this.generateEconomicAdvice();
        this.generateMilitaryAdvice();
        this.generateTechnicalAdvice();
        
        // Display advice from current advisor
        this.displayAdvisorAdvice();
    }
    
    generateEconomicAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'economy');
        
        if (this.gameState.gold > 500 && this.gameState.investments.productionBoost < 3) {
            advisor.advice.push("Your Majesty, consider investing in production boosts to increase resource generation.");
        }
        
        if (this.gameState.buildings.length < 5) {
            advisor.advice.push("Perhaps we should focus on village expansion before major investments?");
        }
        
        if (this.gameState.resources.food < 50) {
            advisor.advice.push("Food stores are running low - more farms would benefit the kingdom.");
        }
    }
    
    generateMilitaryAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'military');
        
        if (this.gameState.wave > 3 && !this.gameState.investments.armyScouts) {
            advisor.advice.push("The enemies grow stronger. Army scouts would improve our tactical advantage.");
        }
        
        if (this.gameState.army.length < 3) {
            advisor.advice.push("Our forces are few. Building barracks should be a priority.");
        }
        
        if (!this.gameState.investments.eliteGenerals && this.gameState.gold > 400) {
            advisor.advice.push("Elite generals could turn the tide of future battles, Your Majesty.");
        }
    }
    
    generateTechnicalAdvice() {
        const advisor = this.advisors.find(a => a.specialty === 'technology');
        
        if (this.gameState.automationLevel === 'manual' && this.gameState.population > 20) {
            advisor.advice.push("With a larger population, automation upgrades would increase efficiency.");
        }
        
        if (this.gameState.gold > 1000 && !this.gameState.investments.parallelVillages) {
            advisor.advice.push("The parallel village system could exponentially increase our power.");
        }
        
        if (this.gameState.wave > 5 && !this.gameState.investments.prestigeAutomation) {
            advisor.advice.push("Prestige automation would remember our successful strategies for future reigns.");
        }
    }
    
    displayAdvisorAdvice() {
        // Update the existing advisor panel
        const advisorDiv = document.getElementById('advisor-panel');
        if (!advisorDiv) return;
        
        let adviceHtml = `
            <h4 style="color: #f1c40f; margin-bottom: 1rem;">
                👑 ${this.currentAdvisor.name} advises:
            </h4>
        `;
        
        if (this.currentAdvisor.advice.length > 0) {
            this.currentAdvisor.advice.forEach(advice => {
                adviceHtml += `<p style="margin-bottom: 0.75rem; font-style: italic; color: #ecf0f1;">• ${advice}</p>`;
            });
        } else {
            adviceHtml += `<p style="font-style: italic; color: #bdc3c7;">Your kingdom prospers under your wise rule, Your Majesty.</p>`;
        }
        
        // Add advisor switching buttons
        adviceHtml += `
            <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                ${this.advisors.map(advisor => `
                    <button class="advisor-btn" data-advisor="${advisor.name}" 
                            style="padding: 0.5rem 1rem; 
                                   background: ${advisor === this.currentAdvisor ? '#1abc9c' : '#34495e'}; 
                                   color: white; border: none; border-radius: 4px; cursor: pointer; 
                                   font-size: 0.9rem; transition: all 0.3s ease;
                                   border: 2px solid ${advisor === this.currentAdvisor ? '#16a085' : '#2c3e50'};">
                        ${advisor.specialty}
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
            
            // Add hover effects
            btn.addEventListener('mouseenter', () => {
                if (!btn.style.background.includes('#1abc9c')) {
                    btn.style.background = '#3498db';
                    btn.style.borderColor = '#2980b9';
                }
            });
            
            btn.addEventListener('mouseleave', () => {
                if (!btn.style.background.includes('#1abc9c')) {
                    btn.style.background = '#34495e';
                    btn.style.borderColor = '#2c3e50';
                }
            });
        });
    }
    
    calculateInheritance() {
        // Calculate gold inheritance based on performance
        const baseInheritance = 500;
        const waveBonus = this.gameState.wave * 50;
        const buildingBonus = this.gameState.buildings.length * 25;
        const populationBonus = Math.floor(this.gameState.population / 5) * 10;
        
        const totalInheritance = baseInheritance + waveBonus + buildingBonus + populationBonus;
        
        this.gameState.logBattleEvent(`💰 Inheritance calculated: ${totalInheritance} gold (Base: ${baseInheritance}, Wave: ${waveBonus}, Buildings: ${buildingBonus}, Population: ${populationBonus})`);
        
        // Update dynasty stats display
        this.updateDynastyStats(totalInheritance);
        
        return totalInheritance;
    }
    
    updateDynastyStats(inheritance) {
        const dynastyStatsDiv = document.getElementById('dynasty-stats');
        if (!dynastyStatsDiv) return;
        
        dynastyStatsDiv.innerHTML = `
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Current Wave</div>
                <div class="dynasty-stat-value">${this.gameState.wave}</div>
            </div>
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Total Buildings</div>
                <div class="dynasty-stat-value">${this.gameState.buildings.length}</div>
            </div>
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Population</div>
                <div class="dynasty-stat-value">${this.gameState.population}</div>
            </div>
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Current Gold</div>
                <div class="dynasty-stat-value">${this.gameState.gold} 💰</div>
            </div>
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Potential Inheritance</div>
                <div class="dynasty-stat-value">${inheritance} 💰</div>
            </div>
            <div class="dynasty-stat">
                <div class="dynasty-stat-label">Dynasty Age</div>
                <div class="dynasty-stat-value">${this.gameState.currentDay || 1} days</div>
            </div>
        `;
    }
    
    triggerPrestige() {
        // Save current progress
        const inheritance = this.calculateInheritance();
        
        // Show confirmation of the reset
        if (window.showModal) {
            window.showModal(
                'Dynasty Reset Complete',
                `<div class="dynasty-calculation">
                    <h3>👑 Your Dynasty Has Ended</h3>
                    <p>Your rule has come to an end, but your legacy lives on...</p>
                    <div class="inheritance-breakdown">
                        <div class="inheritance-total">
                            <span class="inheritance-label">Legacy Gold Inherited:</span>
                            <span class="inheritance-value">${inheritance} 💰</span>
                        </div>
                    </div>
                    <p><em>Your successor will begin their reign with the benefits of your accumulated wisdom and resources.</em></p>
                </div>`,
                { icon: '⚰️', type: 'info' }
            );
        }
        
        // Reset some values but keep investments
        this.gameState.wave = 1;
        this.gameState.buildings = [
            { id: 'house1', type: 'house', x: 100, y: 100, level: 1 },
            { id: 'farm1', type: 'farm', x: 200, y: 150, level: 1 }
        ];
        this.gameState.resources = { food: 100, wood: 50, stone: 25 };
        this.gameState.population = 10;
        this.gameState.gold = inheritance;
        
        // Apply prestige bonuses
        if (this.gameState.investments.prestigeAutomation) {
            this.gameState.logBattleEvent('🤖 Prestige automation remembering successful strategies...');
            // Auto-place optimal buildings based on previous runs
            this.autoPlaceOptimalBuildings();
        }
        
        this.gameState.save();
        this.gameState.updateUI();
        
        // Switch back to village view
        if (window.game) {
            window.game.switchView('village');
        }
    }
    
    autoPlaceOptimalBuildings() {
        // Simple automation - place a few optimal buildings
        const optimalBuildings = [
            { type: 'townCenter', x: 150, y: 200 },
            { type: 'barracks', x: 250, y: 250 }
        ];
        
        optimalBuildings.forEach(building => {
            if (this.gameState.canAfford(building.type)) {
                const newBuilding = {
                    id: `${building.type}_auto_${Date.now()}`,
                    type: building.type,
                    x: building.x,
                    y: building.y,
                    level: 1
                };
                
                this.gameState.spend(building.type);
                this.gameState.addBuilding(newBuilding);
                this.gameState.logBattleEvent(`🤖 Auto-placed ${building.type}`);
            }
        });
    }
}

// Make MonarchManager globally available
window.MonarchManager = MonarchManager;

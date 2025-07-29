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
        this.generateAdvisorAdvice();
        this.updateInvestmentDisplay();
        this.calculateInheritance();
    }
    
    setupInvestmentButtons() {
        document.querySelectorAll('.investment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cost = parseInt(btn.dataset.cost);
                const investmentName = btn.textContent.split('(')[0].trim();
                
                if (this.gameState.canAffordGold(cost)) {
                    this.makeInvestment(investmentName, cost);
                }
            });
        });
    }
    
    makeInvestment(investmentName, cost) {
        this.gameState.spendGold(cost);
        
        // Apply investment effects
        switch (investmentName) {
            case 'Production Boost':
                this.gameState.investments.productionBoost++;
                this.gameState.logBattleEvent(`💰 Invested in production boost (Level ${this.gameState.investments.productionBoost})`);
                break;
            case 'New Building Types':
                this.gameState.investments.buildingTypes++;
                this.gameState.logBattleEvent('🏗️ Unlocked new building types');
                break;
            case 'Automation Level Up':
                this.gameState.investments.automationLevel++;
                this.updateAutomationLevel();
                break;
            case 'Army Scouts':
                this.gameState.investments.armyScouts = true;
                this.gameState.logBattleEvent('🔍 Army scouts improve battle intelligence');
                break;
            case 'Elite Generals':
                this.gameState.investments.eliteGenerals = true;
                this.gameState.logBattleEvent('⭐ Elite generals joined your forces');
                break;
            case 'Tactical Academy':
                this.gameState.investments.tacticalAcademy = true;
                this.gameState.logBattleEvent('🎓 Tactical academy built - commanders learn faster');
                break;
            case 'Parallel Villages':
                this.gameState.investments.parallelVillages = true;
                this.gameState.logBattleEvent('🏘️ Parallel village system activated');
                break;
            case 'Prestige Automation':
                this.gameState.investments.prestigeAutomation = true;
                this.gameState.logBattleEvent('🤖 Prestige automation system online');
                break;
            case 'Dynasty Progression':
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
        // Create or update investment status display
        let statusDiv = document.getElementById('investment-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'investment-status';
            statusDiv.style.marginTop = '20px';
            statusDiv.style.padding = '15px';
            statusDiv.style.background = 'rgba(0,0,0,0.3)';
            statusDiv.style.borderRadius = '5px';
            
            const monarchContent = document.querySelector('.monarch-content');
            if (monarchContent) {
                monarchContent.appendChild(statusDiv);
            }
        }
        
        statusDiv.innerHTML = `
            <h3 style="color: #1abc9c; margin-bottom: 10px;">Current Investments</h3>
            <p>Production Boost: Level ${this.gameState.investments.productionBoost}</p>
            <p>Automation: ${this.gameState.automationLevel}</p>
            <p>Army Scouts: ${this.gameState.investments.armyScouts ? 'Active' : 'Not purchased'}</p>
            <p>Elite Generals: ${this.gameState.investments.eliteGenerals ? 'Active' : 'Not purchased'}</p>
            <p>Parallel Villages: ${this.gameState.investments.parallelVillages ? 'Unlocked' : 'Locked'}</p>
            <p>Prestige Automation: ${this.gameState.investments.prestigeAutomation ? 'Active' : 'Not purchased'}</p>
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
        // Create or update advisor panel
        let advisorDiv = document.getElementById('advisor-panel');
        if (!advisorDiv) {
            advisorDiv = document.createElement('div');
            advisorDiv.id = 'advisor-panel';
            advisorDiv.style.marginTop = '20px';
            advisorDiv.style.padding = '15px';
            advisorDiv.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
            advisorDiv.style.borderRadius = '8px';
            advisorDiv.style.border = '2px solid #1abc9c';
            
            const monarchContent = document.querySelector('.monarch-content');
            if (monarchContent) {
                monarchContent.appendChild(advisorDiv);
            }
        }
        
        let adviceHtml = `
            <h3 style="color: #f1c40f; margin-bottom: 10px;">
                👑 ${this.currentAdvisor.name} advises:
            </h3>
        `;
        
        if (this.currentAdvisor.advice.length > 0) {
            this.currentAdvisor.advice.forEach(advice => {
                adviceHtml += `<p style="margin-bottom: 8px; font-style: italic;">• ${advice}</p>`;
            });
        } else {
            adviceHtml += `<p style="font-style: italic;">Your kingdom prospers under your wise rule, Your Majesty.</p>`;
        }
        
        // Add advisor switching buttons
        adviceHtml += `
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                ${this.advisors.map(advisor => `
                    <button class="advisor-btn" data-advisor="${advisor.name}" 
                            style="padding: 5px 10px; background: ${advisor === this.currentAdvisor ? '#1abc9c' : '#34495e'}; 
                                   color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
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
        
        return totalInheritance;
    }
    
    triggerPrestige() {
        // Save current progress
        const inheritance = this.calculateInheritance();
        
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

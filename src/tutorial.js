// Tutorial and story progression logic for Village Defense: Idleo

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.dynastyName = null;
        this.completedSteps = new Set();
        this.game = null; // Will be set by the game when tutorial starts
        
        // Load existing dynasty name if available
        this.loadDynastyName();
        
        this.steps = this.createSteps();
        this.setupEventListeners();
    }

    createSteps() {
        return [
            {
                id: 'dynasty_name',
                title: 'The Royal Bloodline',
                story: `<div class="story-panel">
                    <p>Before we begin your tale, tell us the name of your noble dynasty. This name will echo through the ages as your kingdom grows and prospers.</p>
                    <p><em>What shall your royal house be called?</em></p>
                    <div class="dynasty-input-container">
                        <input type="text" id="dynasty-name-input" placeholder="Enter your dynasty name..." maxlength="20" style="
                            width: 100%;
                            padding: 12px;
                            margin: 10px 0;
                            background: rgba(52, 152, 219, 0.1);
                            border: 2px solid #3498db;
                            border-radius: 8px;
                            color: #ecf0f1;
                            font-size: 16px;
                            text-align: center;
                        "/>
                        <p style="font-size: 0.9em; color: #bdc3c7; margin-top: 8px;">Examples: Dragonborn, Stormwind, Ironforge, Blackwater</p>
                    </div>
                </div>`,
                instruction: 'Enter your dynasty name and click OK to continue',
                icon: '👑',
                requiresInput: true,
                action: () => this.startStep('intro')
            },
            {
                id: 'intro',
                title: 'The King\'s Command',
                story: `<div class="story-panel">
                    <p><em>"My child,"</em> the King says, his weathered hand pointing to the frontier map, <em>"the northern borders are under threat. Ancient evils stir in the wilderness, and our people need protection."</em></p>
                    <p><strong>You are the heir to House ${this.getDynastyName()}, noble blood of an ancient lineage.</strong> Your father has entrusted you with establishing a new defensive settlement to protect the realm.</p>
                    <p><em>"Take the ${this.getDynastyName()} banner and our finest resources. Build a village that can withstand the coming storms. The future of our dynasty depends on it."</em></p>
                </div>`,
                instruction: 'Click anywhere to accept your royal mission...',
                icon: '👑',
                action: () => this.startStep('building_tutorial')
            },
            {
                id: 'building_tutorial',
                title: 'The Art of Construction',
                story: `<div class="story-panel">
                    <p>Before establishing your settlement, you must master the art of construction. Each building serves a vital purpose in your growing domain.</p>
                    <p><strong>How to Build:</strong></p>
                    <ul style="text-align: left; margin: 15px 0;">
                        <li>Click on a building button below to select it</li>
                        <li>Move your cursor over the map to find a suitable location</li>
                        <li>Click on the map to place your building</li>
                        <li>Buildings take time to construct - check progress by clicking on them</li>
                    </ul>
                    <p><em>"Every stone placed with purpose, every timber cut with care - this is the ${this.getDynastyName()} way."</em></p>
                </div>`,
                instruction: 'Learn the building system, then proceed to establish your Town Center',
                icon: '🏗️',
                action: () => this.startStep('settlement')
            },
            {
                id: 'settlement',
                title: 'Establishing Your Settlement',
                story: `<div class="story-panel">
                    <p>You arrive at the chosen site - a strategic plateau overlooking ancient trade routes. The wind carries whispers of danger, but also opportunity.</p>
                    <p><strong>Your first task:</strong> Establish a <span class="highlight">Town Center</span> to serve as the heart of your new settlement. This grand structure will take <strong>3 days</strong> to construct, but will bear the ${this.getDynastyName()} crest and boost the productivity of all future buildings.</p>
                    <p><em>"Every great dynasty begins with a single foundation stone, and House ${this.getDynastyName()} shall be no different,"</em> you remember your father's words.</p>
                    <p><strong>Remember:</strong> Click the Town Center button, then click on the map to place it!</p>
                </div>`,
                instruction: 'Build your Town Center to begin your settlement (3 days construction)',
                icon: '🏛️',
                highlight: '.building-btn[data-building="townCenter"]',
                waitFor: 'building_placed',
                buildingType: 'townCenter',
                action: () => this.startStep('first_citizens')
            },
            {
                id: 'first_citizens',
                title: 'Calling the First Citizens',
                story: `<div class="story-panel">
                    <p>With your Town Center established, word spreads quickly. Merchants, craftsmen, and families begin arriving, drawn by the ${this.getDynastyName()} reputation for protection and prosperity.</p>
                    <p><strong>Build a House</strong> to provide shelter for your growing population. Each house can accommodate 5 citizens who will serve House ${this.getDynastyName()} with dedication.</p>
                    <p><em>"A ruler's strength lies not in gold or armies, but in the loyalty of their people,"</em> the old ${this.getDynastyName()} motto reminds you.</p>
                </div>`,
                instruction: 'Build a House to shelter your first citizens',
                icon: '🏠',
                highlight: '.building-btn[data-building="house"]',
                waitFor: 'building_placed',
                buildingType: 'house',
                action: () => this.startStep('sustenance')
            },
            {
                id: 'sustenance',
                title: 'Ensuring Survival',
                story: `<div class="story-panel">
                    <p>Your citizens are settled, but they need food to survive and thrive. The northern frontier is harsh, and supply lines from the ${this.getDynastyName()} homeland are unreliable.</p>
                    <p><strong>Build a Farm</strong> to produce food for your growing community. A well-fed population is a productive population, and you'll need their strength for the challenges ahead.</p>
                    <p><em>"An army marches on its stomach, and a settlement thrives on full bellies,"</em> the ${this.getDynastyName()} military traditions teach.</p>
                </div>`,
                instruction: 'Build a Farm to feed your people',
                icon: '🌾',
                highlight: '.building-btn[data-building="farm"]',
                waitFor: 'building_placed',
                buildingType: 'farm',
                action: () => this.startStep('first_completion')
            },
            {
                id: 'first_completion',
                title: 'The Rhythm of Progress',
                story: `<div class="story-panel">
                    <p>Your buildings are under construction, but progress takes time. In this harsh frontier, construction requires careful planning and patience - qualities that House ${this.getDynastyName()} has always possessed.</p>
                    <p><strong>Click "End Day"</strong> to advance time and complete construction. Each day brings progress, but also brings you closer to the inevitable threats on the horizon.</p>
                    <p><em>"Patience builds empires. Haste destroys them,"</em> echoes the ancient ${this.getDynastyName()} wisdom.</p>
                </div>`,
                instruction: 'Click "End Day" to complete construction and advance time',
                icon: '⏰',
                highlight: '#end-day-btn',
                waitFor: 'day_ended',
                action: () => this.startStep('military_preparation')
            },
            {
                id: 'military_preparation',
                title: 'Preparing for War',
                story: `<div class="story-panel">
                    <p>Your settlement is taking shape, but disturbing reports reach your ears. Scouts have spotted strange movements in the dark forests. The ancient threats your father warned about are stirring.</p>
                    <p><strong>Build a Barracks</strong> to train professional soldiers. Your citizens are brave, but they need proper training and equipment to uphold the ${this.getDynastyName()} legacy in battle.</p>
                    <p><em>"A ${this.getDynastyName()} never yields, never retreats, never surrenders,"</em> the old battle cry rings in your memory.</p>
                </div>`,
                instruction: 'Build a Barracks to train your military forces',
                icon: '🏰',
                highlight: '.building-btn[data-building="barracks"]',
                waitFor: 'building_placed',
                buildingType: 'barracks',
                action: () => this.startStep('battle_unlock')
            },
            {
                id: 'battle_unlock',
                title: 'The First Test Approaches',
                story: `<div class="story-panel">
                    <p>Your settlement is now a proper stronghold, but dark clouds gather on the horizon. Your scouts return with grave news: <strong>hostile forces approach your borders.</strong></p>
                    <p>The <span class="highlight">Battle Mode</span> is now unlocked! Here you can recruit troops, plan defenses, and face the waves of enemies that threaten House ${this.getDynastyName()}'s new domain.</p>
                    <p><em>"Every ${this.getDynastyName()} heir must prove themselves in battle. Your time has come to uphold our honor."</em></p>
                </div>`,
                instruction: 'Click "Battle" tab to access your military command',
                icon: '⚔️',
                highlight: '.nav-tab[data-view="battle"]',
                waitFor: 'view_switched',
                targetView: 'battle',
                action: () => this.completeTutorial()
            }
        ];
    }

    getDynastyName() {
        return this.dynastyName || 'Noble';
    }

    showIntro() {
        console.log('[Tutorial] showIntro called');
        console.log('[Tutorial] Steps available:', this.steps?.length || 0);
        console.log('[Tutorial] showModal available:', !!window.showModal);
        
        this.startStep('dynasty_name');
    }

    startStep(stepId) {
        console.log('[Tutorial] startStep called with:', stepId);
        const step = this.steps.find(s => s.id === stepId);
        
        if (!step) {
            console.error('[Tutorial] Step not found:', stepId);
            console.log('[Tutorial] Available steps:', this.steps.map(s => s.id));
            return;
        }

        console.log('[Tutorial] Found step:', step.title);
        this.currentStep = this.steps.indexOf(step);
        
        // Check if showModal is available
        if (!window.showModal) {
            console.error('[Tutorial] showModal not available, cannot show tutorial');
            return;
        }
        
        // Show the story modal
        console.log('[Tutorial] Calling showModal...');
        window.showModal(
            step.title,
            step.story + `<div class="tutorial-instruction"><strong>Next:</strong> ${step.instruction}</div>`,
            {
                icon: step.icon,
                type: 'info',
                showCancel: false
            }
        ).then(() => {
            console.log('[Tutorial] Modal shown, setting up step requirements');
            // Handle dynasty name input step
            if (step.requiresInput && stepId === 'dynasty_name') {
                this.handleDynastyNameInput(step);
            } else {
                // After modal is dismissed, set up the step requirements
                this.setupStepRequirements(step);
            }
        }).catch(error => {
            console.error('[Tutorial] Modal error:', error);
        });
    }

    handleDynastyNameInput(step) {
        const input = document.getElementById('dynasty-name-input');
        if (input) {
            input.focus();
            
            // Handle enter key and validate input
            const handleSubmit = () => {
                const dynastyName = input.value.trim();
                if (dynastyName && dynastyName.length >= 2) {
                    this.dynastyName = dynastyName;
                    
                    // Save dynasty name to localStorage for persistence
                    localStorage.setItem('dynastyName', dynastyName);
                    
                    // Show confirmation toast
                    window.showToast(`🏰 House ${dynastyName} rises! Your dynasty begins...`, {
                        icon: '👑',
                        type: 'success',
                        timeout: 3000
                    });
                    
                    // Continue to next step after brief delay
                    setTimeout(() => {
                        if (step.action) {
                            step.action();
                        }
                    }, 1500);
                } else {
                    // Show error for invalid input
                    window.showToast('Please enter a dynasty name (at least 2 characters)', {
                        icon: '❌',
                        type: 'error',
                        timeout: 3000
                    });
                    input.focus();
                }
            };
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });
            
            // Also handle modal OK button click
            const modalOverlay = document.querySelector('.modal-overlay.show');
            if (modalOverlay) {
                const okButton = modalOverlay.querySelector('.modal-close');
                if (okButton) {
                    okButton.onclick = (e) => {
                        e.preventDefault();
                        handleSubmit();
                    };
                }
            }
        }
    }

    // Load dynasty name from localStorage if available
    loadDynastyName() {
        const savedName = localStorage.getItem('dynastyName');
        if (savedName) {
            this.dynastyName = savedName;
            return true;
        }
        return false;
    }

    setupEventListeners() {
        // Tutorial system event listeners can be added here if needed
        // Currently handled in individual step methods
    }

    setupStepRequirements(step) {
        // Clear any existing highlights
        this.clearHighlights();
        
        // Highlight required element if specified
        if (step.highlight) {
            this.highlightElement(step.highlight);
        }

        // Set up event listeners for step completion
        if (step.waitFor) {
            this.setupStepListener(step);
        }
    }

    setupStepListener(step) {
        const eventBus = window.eventBus;
        if (!eventBus) return;

        const completeStep = () => {
            // Remove highlight and complete step
            this.clearHighlights();
            this.completedSteps.add(step.id);
            
            // Show completion toast
            window.showToast(`✅ ${step.title} completed!`, {
                icon: '🎉',
                type: 'success',
                timeout: 2000
            });

            // Execute step action
            if (step.action) {
                setTimeout(() => step.action(), 1000);
            }
        };

        // Listen for different completion events
        switch (step.waitFor) {
            case 'building_placed':
                const buildingHandler = (data) => {
                    if (data.type === step.buildingType) {
                        eventBus.off('building_placed', buildingHandler);
                        completeStep();
                    }
                };
                eventBus.on('building_placed', buildingHandler);
                break;

            case 'day_ended':
                const dayHandler = () => {
                    eventBus.off('day_ended', dayHandler);
                    completeStep();
                };
                eventBus.on('day_ended', dayHandler);
                break;

            case 'view_switched':
                const viewHandler = (data) => {
                    if (data.view === step.targetView) {
                        eventBus.off('view_switched', viewHandler);
                        completeStep();
                    }
                };
                eventBus.on('view_switched', viewHandler);
                break;
        }
    }

    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('tutorial-highlight');
            element.scrollIntoView({behavior: 'smooth', block: 'center'});
            
            // Add pulsing animation for extra attention
            element.style.animation = 'tutorial-pulse 2s infinite';
        }
    }

    clearHighlights() {
        const highlighted = document.querySelectorAll('.tutorial-highlight');
        highlighted.forEach(el => {
            el.classList.remove('tutorial-highlight');
            el.style.animation = '';
        });
    }

    completeTutorial() {
        this.active = false;
        this.clearHighlights();
        
        window.showModal(
            'Tutorial Complete!',
            `<div class="story-panel">
                <p><strong>Congratulations, heir of House ${this.getDynastyName()}!</strong> You have successfully established your frontier settlement.</p>
                <p>Your village now stands ready to face the challenges ahead. The <span class="highlight">Battle Mode</span> awaits your command, and greater domains will unlock as House ${this.getDynastyName()}'s influence grows.</p>
                <p><em>"You have proven yourself worthy of your lineage. Now, defend your people and forge the ${this.getDynastyName()} legacy!"</em></p>
                <div class="tutorial-complete-stats">
                    <h4>🏆 Achievement Unlocked: "Dynasty Founder"</h4>
                    <p>House ${this.getDynastyName()} has established its first settlement!</p>
                </div>
            </div>`,
            {
                icon: '🎉',
                type: 'success'
            }
        );

        // Mark tutorial as complete in the game
        if (this.game && this.game.completeTutorial) {
            this.game.completeTutorial();
        }
    }

    highlightTownCenterButton() {
        // Legacy method - now handled by step system
        this.highlightElement('.building-btn[data-building="townCenter"]');
    }

    showUnlockRequirement(view) {
        // Use toast for brief unlock requirement messages - they're informational but not critical
        let msg = 'Complete required milestone in Village view to unlock';
        let icon = '🔒';
        let specificMsg = '';
        
        switch (view) {
            case 'battle':
                specificMsg = 'Build your Town Center to unlock Battle mode!';
                icon = '⚔️';
                break;
            case 'monarch':
                specificMsg = 'Build a Farm to unlock Monarch mode!';
                icon = '👑';
                break;
            case 'throne':
                specificMsg = 'Build a House to unlock Throne mode!';
                icon = '🏰';
                break;
        }
        
        window.showToast(specificMsg || msg, { 
            icon: icon, 
            type: 'info',
            timeout: 4000 
        });
    }

    // No longer needed; replaced by notification system
}

window.TutorialManager = TutorialManager;

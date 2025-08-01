/**
 * tutorial.js - Tutorial System and User Guidance
 * 
 * Comprehensive tutorial system that guides new players through the core game
 * mechanics using modal dialogs and interactive elements. The tutorial is
 * story-driven with dynasty-specific content.
 * 
 * Key Features:
 * - Auto-starts for new players
 * - Dynasty naming system with persistence
 * - 12-step progressive tutorial covering all core mechanics
 * - Modal-based UI with rich formatting
 * - Building challenges and resource grants
 * - Integration with all game systems
 * 
 * Tutorial Flow:
 * 1. Dynasty naming → 2. Story introduction → 3. Building tutorial
 * 4. Settlement establishment → 5. Royal resource grant → 6. Housing
 * 7. Agriculture → 8. Time management → 9. World exploration
 * 10. Military preparation → 11. Battle system → 12. Completion
 */

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

    // Get dynasty name with fallback
    getDynastyName() {
        return this.dynastyName || 'Noble House';
    }

    // Load dynasty name from localStorage
    loadDynastyName() {
        try {
            const saved = localStorage.getItem('dynastyName');
            if (saved) {
                this.dynastyName = saved;
                console.log('[Tutorial] Loaded dynasty name:', this.dynastyName);
            }
        } catch (err) {
            console.warn('[Tutorial] Could not load dynasty name:', err);
        }
    }

    // Save dynasty name to localStorage
    saveDynastyName(name) {
        try {
            this.dynastyName = name;
            localStorage.setItem('dynastyName', name);
            console.log('[Tutorial] Saved dynasty name:', name);
        } catch (err) {
            console.warn('[Tutorial] Could not save dynasty name:', err);
        }
    }

    // Get tutorial steps (lazy loading with dynasty name)
    getSteps() {
        // Return cached steps if already created and dynasty name is set
        if (this.steps && this.dynastyName) {
            return this.steps;
        }

        // Create steps with current dynasty name
        this.steps = this.createSteps();
        return this.steps;
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
                action: () => this.startStep('royal_grant')
            },
            {
                id: 'royal_grant',
                title: 'Royal Decree',
                story: `<div class="story-panel">
                    <p>As the Town Center construction begins, a royal messenger arrives bearing your father's seal. <em>"By decree of the Crown, these resources are granted to House ${this.getDynastyName()} for the establishment of the frontier settlement."</em></p>
                    <p><strong>Royal Grant Received:</strong></p>
                    <ul style="text-align: left; margin: 15px 0; color: #2ecc71;">
                        <li>+150 Food (Royal Provisions)</li>
                        <li>+100 Wood (Crown Timber)</li>
                        <li>+75 Stone (Quarry Rights)</li>
                        <li>+500 Gold (Treasury Allocation)</li>
                    </ul>
                    <p><em>"Use these resources wisely, heir of ${this.getDynastyName()}. The crown's support is not limitless."</em></p>
                </div>`,
                instruction: 'Resources have been granted! Continue building your settlement',
                icon: '👑',
                requiresResourceGrant: true,
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
                title: 'The Housing Challenge',
                story: `<div class="story-panel">
                    <p>Citizens flock to House ${this.getDynastyName()}'s banner, but they need proper shelter. A growing population requires adequate housing to maintain loyalty and productivity.</p>
                    <p><strong>Challenge:</strong> Build <span class="highlight">2 Houses</span> to provide shelter for your expanding population. Each house can accommodate 5 citizens who will serve your dynasty with dedication.</p>
                    <p><em>"A ruler's strength lies not in gold or armies, but in the loyalty of their people,"</em> the old ${this.getDynastyName()} motto reminds you.</p>
                </div>`,
                instruction: 'Build 2 Houses to complete the housing challenge',
                icon: '🏠',
                highlight: '.building-btn[data-building="house"]',
                waitFor: 'building_challenge',
                buildingType: 'house',
                requiredCount: 2,
                action: () => this.startStep('agricultural_expansion')
            },
            {
                id: 'agricultural_expansion',
                title: 'The Agricultural Challenge',
                story: `<div class="story-panel">
                    <p>With housing secured, your citizens need sustenance. The northern frontier is harsh, and supply lines from the ${this.getDynastyName()} homeland are unreliable.</p>
                    <p><strong>Challenge:</strong> Build <span class="highlight">3 Farms</span> to ensure food security. Well-fed citizens are productive citizens, and you'll need their strength for the challenges ahead.</p>
                    <p><em>"An army marches on its stomach, and a settlement thrives on full bellies,"</em> the ${this.getDynastyName()} military traditions teach.</p>
                </div>`,
                instruction: 'Build 3 Farms to complete the agricultural challenge',
                icon: '🌾',
                highlight: '.building-btn[data-building="farm"]',
                waitFor: 'building_challenge',
                buildingType: 'farm',
                requiredCount: 3,
                action: () => this.startStep('time_advancement')
            },
            {
                id: 'time_advancement',
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
                action: () => this.startStep('world_view_unlock')
            },
            {
                id: 'world_view_unlock',
                title: 'Beyond the Village Walls',
                story: `<div class="story-panel">
                    <p>Your settlement prospers, but reports from the frontier grow troubling. Scouts speak of strange movements in the wilderness, and the ancient threats your father warned about stir in the darkness.</p>
                    <p><strong>The time has come to look beyond your village walls.</strong> Click the "World" tab to unlock the world map and begin planning expeditions beyond your borders.</p>
                    <p><em>"A true leader of House ${this.getDynastyName()} does not wait for danger to arrive at the gates,"</em> your father's final counsel echoes in your mind.</p>
                </div>`,
                instruction: 'Click the "World" tab to unlock the world map',
                icon: '🗺️',
                highlight: '#world-tab',
                waitFor: 'view_switched',
                targetView: 'world',
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

    // Show welcome/tutorial start
    showWelcome() {
        console.log('[Tutorial] showWelcome called');
        console.log('[Tutorial] Steps available:', this.getSteps()?.length || 0);
        console.log('[Tutorial] showModal available:', !!window.showModal);
        
        this.isActive = true;
        this.startStep('dynasty_name');
    }

    showIntro() {
        console.log('[Tutorial] showIntro called (deprecated - use showWelcome)');
        this.showWelcome();
    }

    startStep(stepId) {
        console.log('[Tutorial] startStep called with:', stepId);
        const steps = this.getSteps(); // Use lazy loading
        const step = steps.find(s => s.id === stepId);
        
        if (!step) {
            console.error('[Tutorial] Step not found:', stepId);
            console.log('[Tutorial] Available steps:', steps.map(s => s.id));
            return;
        }

        console.log('[Tutorial] Found step:', step.title);
        this.currentStep = steps.indexOf(step);
        
        // Check if showModal is available
        if (!window.showModal) {
            console.error('[Tutorial] showModal not available, cannot show tutorial');
            return;
        }
        
        // For dynasty name input, show non-closable modal
        const modalOptions = {
            icon: step.icon,
            type: 'info',
            showCancel: false,
            closable: step.id !== 'dynasty_name' // Dynasty name modal cannot be closed
        };
        
        // Show the story modal
        const modalResult = window.showModal(
            step.title,
            step.story + `<div class="tutorial-instruction"><strong>Next:</strong> ${step.instruction}</div>`,
            modalOptions
        );

        // Handle both Promise and non-Promise returns
        if (modalResult && typeof modalResult.then === 'function') {
            modalResult.then(() => {
                console.log('[Tutorial] Modal shown, setting up step requirements');
                // Handle dynasty name input step
                if (step.requiresInput && stepId === 'dynasty_name') {
                    this.handleDynastyNameInput(step);
                } else if (step.requiresResourceGrant && stepId === 'royal_grant') {
                    this.grantRoyalResources(step);
                } else {
                    // After modal is dismissed, set up the step requirements
                    this.setupStepRequirements(step);
                }
            }).catch(error => {
                console.error('[Tutorial] Modal error:', error);
            });
        } else {
            // Fallback for non-Promise showModal
            console.log('[Tutorial] Modal shown (non-Promise), setting up step requirements');
            setTimeout(() => {
                if (step.requiresInput && stepId === 'dynasty_name') {
                    this.handleDynastyNameInput(step);
                } else if (step.requiresResourceGrant && stepId === 'royal_grant') {
                    this.grantRoyalResources(step);
                } else {
                    this.setupStepRequirements(step);
                }
            }, 100);
        }
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

    grantRoyalResources(step) {
        console.log('[Tutorial] Granting royal resources...');
        
        // Grant the royal resources
        if (this.game && this.game.gameState) {
            const gameState = this.game.gameState;
            
            // Add the royal grant resources
            gameState.resources.food += 150;
            gameState.resources.wood += 100;
            gameState.resources.stone += 75;
            gameState.gold += 500;
            
            // Update UI to reflect new resources
            gameState.updateUI();
            
            // Show resource change animations
            if (window.showResourceChange) {
                setTimeout(() => window.showResourceChange('food', 150), 100);
                setTimeout(() => window.showResourceChange('wood', 100), 300);
                setTimeout(() => window.showResourceChange('stone', 75), 500);
                setTimeout(() => window.showResourceChange('gold', 500), 700);
            }
            
            // Show confirmation toast
            window.showToast('👑 Royal resources granted! Your treasury has been replenished.', {
                icon: '💰',
                type: 'success',
                timeout: 4000
            });
            
            console.log('[Tutorial] Royal resources granted successfully');
        } else {
            console.error('[Tutorial] Cannot grant resources - game state not available');
        }
        
        // Continue to next step after delay
        setTimeout(() => {
            if (step.action) {
                step.action();
            }
        }, 2000);
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

            case 'building_challenge':
                // Track multiple buildings of the same type
                let buildingCount = 0;
                const challengeHandler = (data) => {
                    if (data.type === step.buildingType) {
                        buildingCount++;
                        console.log(`[Tutorial] Building challenge progress: ${buildingCount}/${step.requiredCount} ${step.buildingType}s`);
                        
                        // Show progress toast
                        window.showToast(`${buildingCount}/${step.requiredCount} ${step.buildingType}s built`, {
                            icon: '🏗️',
                            type: 'info',
                            timeout: 2000
                        });
                        
                        if (buildingCount >= step.requiredCount) {
                            eventBus.off('building_placed', challengeHandler);
                            completeStep();
                        }
                    }
                };
                eventBus.on('building_placed', challengeHandler);
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

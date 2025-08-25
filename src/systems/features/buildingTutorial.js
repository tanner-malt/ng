// Building Tutorial Integration
// Provides guided introduction to new building features

class BuildingTutorial {
    constructor(gameState, villageManager) {
        this.gameState = gameState;
        this.villageManager = villageManager;
        this.tutorialState = {
            shownKeepTutorial: false,
            shownBuildingManagement: false,
            shownUpgrade: false,
            shownSpecialization: false
        };
        
        // Load tutorial state from localStorage
        this.loadTutorialState();
    }

    // Load tutorial state from localStorage
    loadTutorialState() {
        const saved = localStorage.getItem('buildingTutorialState');
        if (saved) {
            try {
                this.tutorialState = { ...this.tutorialState, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('[BuildingTutorial] Error loading tutorial state:', e);
            }
        }
    }

    // Save tutorial state to localStorage
    saveTutorialState() {
        localStorage.setItem('buildingTutorialState', JSON.stringify(this.tutorialState));
    }

    // Check if we should show keep tutorial when first royal building is built
    checkForKeepTutorial() {
        if (this.tutorialState.shownKeepTutorial) return;

        const hasKeep = this.gameState.buildings.some(b => b.type === 'keep' && b.level > 0);
        if (hasKeep) {
            this.showKeepTutorial();
            this.tutorialState.shownKeepTutorial = true;
            this.saveTutorialState();
        }
    }

    // Show tutorial about Keep and royal family features
    showKeepTutorial() {
        if (window.showModal) {
            window.showModal(
                '👑 Royal Keep Built!',
                `<div class="tutorial-content">
                    <h3>🏰 Welcome to Dynasty Management!</h3>
                    <p>You've built your first <strong>Keep</strong> - the heart of your royal dynasty!</p>
                    
                    <div class="tutorial-section">
                        <h4>🔹 Royal Family Features:</h4>
                        <ul>
                            <li><strong>Dynasty Management:</strong> Your royal family will grow over time</li>
                            <li><strong>Succession:</strong> Heirs will continue your legacy when monarchs pass</li>
                            <li><strong>Royal Bonuses:</strong> +10% to all village production</li>
                            <li><strong>Diplomatic Relations:</strong> +15 bonus to diplomacy</li>
                        </ul>
                    </div>

                    <div class="tutorial-section">
                        <h4>🔹 What's Next:</h4>
                        <ul>
                            <li>Your royal family will start appearing in the throne room</li>
                            <li>Marriages and children will happen automatically over time</li>
                            <li>Build monuments to generate <strong>Legacy Points</strong> for dynasty upgrades</li>
                        </ul>
                    </div>

                    <div class="tutorial-tip">
                        💡 <strong>Tip:</strong> Click on completed buildings to access building management, upgrades, and specializations!
                    </div>
                </div>`,
                { type: 'success', icon: '👑' }
            );
        }
    }

    // Check if we should show building management tutorial
    checkForBuildingManagementTutorial() {
        if (this.tutorialState.shownBuildingManagement) return;

        // Show after player has at least 3 completed buildings
        const completedBuildings = this.gameState.buildings.filter(b => b.level > 0);
        if (completedBuildings.length >= 3) {
            this.showBuildingManagementTutorial();
            this.tutorialState.shownBuildingManagement = true;
            this.saveTutorialState();
        }
    }

    // Show tutorial about building management
    showBuildingManagementTutorial() {
        if (window.showModal) {
            window.showModal(
                '🔧 Building Management',
                `<div class="tutorial-content">
                    <h3>🏗️ Advanced Building Features</h3>
                    <p>Your village is growing! It's time to learn about building management.</p>
                    
                    <div class="tutorial-section">
                        <h4>🔹 Building Management:</h4>
                        <ul>
                            <li><strong>Click any completed building</strong> to open its management panel</li>
                            <li><strong>View Effects:</strong> See what bonuses each building provides</li>
                            <li><strong>Worker Assignment:</strong> Check how many workers are assigned</li>
                            <li><strong>Upgrade Buildings:</strong> Improve building levels for better bonuses</li>
                        </ul>
                    </div>

                    <div class="tutorial-section">
                        <h4>🔹 Building Levels:</h4>
                        <ul>
                            <li>Buildings start at <strong>Level 1</strong> when construction completes</li>
                            <li>Upgrade costs increase with each level</li>
                            <li>Higher levels provide <strong>10% better effects</strong> per level</li>
                            <li>Special <strong>Specializations</strong> unlock at levels 5, 10, and 15</li>
                        </ul>
                    </div>

                    <div class="tutorial-tip">
                        💡 <strong>Try it now:</strong> Click on one of your completed buildings to see its management options!
                    </div>
                </div>`,
                { type: 'info', icon: '🔧' }
            );
        }
    }

    // Check if we should show upgrade tutorial
    checkForUpgradeTutorial() {
        if (this.tutorialState.shownUpgrade) return;

        // Show when player has resources to upgrade at least one building
        const canUpgradeAny = this.gameState.buildings.some(building => {
            if (building.level === 0) return false;
            
            if (this.villageManager.buildingEffectsManager) {
                const position = `${building.x},${building.y}`;
                if (this.villageManager.buildingEffectsManager.canUpgradeBuilding(building.type, position)) {
                    const upgradeCost = this.villageManager.buildingEffectsManager.getBuildingUpgradeCost(building.type, position);
                    return Object.entries(upgradeCost).every(([resource, cost]) => 
                        (this.gameState.resources[resource] || 0) >= cost
                    );
                }
            }
            return false;
        });

        if (canUpgradeAny) {
            this.showUpgradeTutorial();
            this.tutorialState.shownUpgrade = true;
            this.saveTutorialState();
        }
    }

    // Show tutorial about upgrading buildings
    showUpgradeTutorial() {
        if (window.showModal) {
            window.showModal(
                '⬆️ Building Upgrades Available!',
                `<div class="tutorial-content">
                    <h3>🔨 Ready to Upgrade!</h3>
                    <p>You have enough resources to upgrade one of your buildings!</p>
                    
                    <div class="tutorial-section">
                        <h4>🔹 Upgrade Benefits:</h4>
                        <ul>
                            <li><strong>+10% Effect Bonus</strong> per level increase</li>
                            <li><strong>More Worker Slots</strong> (slots = building level)</li>
                            <li><strong>Better Production</strong> and special bonuses</li>
                            <li><strong>Unlock Specializations</strong> at certain levels</li>
                        </ul>
                    </div>

                    <div class="tutorial-section">
                        <h4>🔹 How to Upgrade:</h4>
                        <ol>
                            <li>Click on a completed building</li>
                            <li>Look for the green "Upgrade" button</li>
                            <li>Check the resource cost</li>
                            <li>Click to upgrade if you can afford it</li>
                        </ol>
                    </div>

                    <div class="tutorial-tip">
                        💡 <strong>Strategy:</strong> Focus on upgrading your most important buildings first - those that provide the resources you need most!
                    </div>
                </div>`,
                { type: 'success', icon: '⬆️' }
            );
        }
    }

    // Check if we should show specialization tutorial
    checkForSpecializationTutorial() {
        if (this.tutorialState.shownSpecialization) return;

        // Show when player has a building at level 5+
        const hasLevel5Building = this.gameState.buildings.some(building => {
            if (building.level === 0) return false;
            
            if (this.villageManager.buildingEffectsManager) {
                const bonuses = this.villageManager.buildingEffectsManager.getActiveBonuses();
                const buildingKey = `${building.type}_${building.x},${building.y}`;
                const buildingBonus = bonuses[buildingKey];
                return (buildingBonus?.level || building.level) >= 5;
            }
            return false;
        });

        if (hasLevel5Building) {
            this.showSpecializationTutorial();
            this.tutorialState.shownSpecialization = true;
            this.saveTutorialState();
        }
    }

    // Show tutorial about building specializations
    showSpecializationTutorial() {
        if (window.showModal) {
            window.showModal(
                '⭐ Specializations Unlocked!',
                `<div class="tutorial-content">
                    <h3>🎯 Building Specializations</h3>
                    <p>One of your buildings has reached level 5 and can be specialized!</p>
                    
                    <div class="tutorial-section">
                        <h4>🔹 Specialization Features:</h4>
                        <ul>
                            <li><strong>Unique Bonuses:</strong> Each specialization provides different benefits</li>
                            <li><strong>Permanent Choice:</strong> Specializations cannot be changed once selected</li>
                            <li><strong>Available at Levels:</strong> 5, 10, and 15</li>
                            <li><strong>Strategic Decisions:</strong> Choose based on your village's needs</li>
                        </ul>
                    </div>

                    <div class="tutorial-section">
                        <h4>🔹 Example Specializations:</h4>
                        <ul>
                            <li><strong>Barracks:</strong> Elite Training, Rapid Deployment, or Fortified Defense</li>
                            <li><strong>Workshop:</strong> Masterwork Crafting, Mass Production, or Precision Tools</li>
                            <li><strong>Mine:</strong> Deep Mining, Efficient Extraction, or Safety First</li>
                        </ul>
                    </div>

                    <div class="tutorial-tip">
                        💡 <strong>Choose wisely:</strong> Specializations are permanent and will shape your village's development path!
                    </div>
                </div>`,
                { type: 'warning', icon: '⭐' }
            );
        }
    }

    // Run all tutorial checks
    checkAllTutorials() {
        this.checkForKeepTutorial();
        this.checkForBuildingManagementTutorial();
        this.checkForUpgradeTutorial();
        this.checkForSpecializationTutorial();
    }

    // Reset tutorial state (for testing)
    resetTutorialState() {
        this.tutorialState = {
            shownKeepTutorial: false,
            shownBuildingManagement: false,
            shownUpgrade: false,
            shownSpecialization: false
        };
        this.saveTutorialState();
        console.log('[BuildingTutorial] Tutorial state reset');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BuildingTutorial;
}

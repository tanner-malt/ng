// Royal Family Management System
// Handles dynasty succession, royal marriages, and heir management

class RoyalFamilyManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.royalFamily = [];
        this.currentMonarch = null;
        this.marriageOffers = [];
        this.successionOrder = [];
    }

    // Initialize royal family with starting monarch
    initializeRoyalFamily(monarchName = "Dynasty Founder") {
        this.currentMonarch = {
            id: `royal_${Date.now()}`,
            name: monarchName,
            age: 25, // Age in years
            status: 'monarch',
            // When governing, the monarch enables village management and does not take normal jobs
            isGoverning: true,
            traits: this.generateRoyalTraits(),
            skills: this.generateRoyalSkills(),
            children: [],
            spouse: null,
            reignStart: this.gameState.day || 0,
            experience: {
                leadership: 0,
                military: 0,
                diplomacy: 0,
                economics: 0
            }
        };

        this.royalFamily = [this.currentMonarch];
        this.updateSuccessionOrder();

        console.log('[RoyalFamily] Dynasty founded with monarch:', this.currentMonarch.name);
        try { this.gameState.save?.(); } catch (_) { }
    }

    // Generate random royal traits (genetic potential)
    generateRoyalTraits() {
        const traits = [];

        // Magic potential (rare, 10% chance)
        if (Math.random() < 0.1) {
            traits.push('magical_potential');
        }

        // Physical traits
        const physicalTraits = ['strong', 'agile', 'enduring', 'healthy'];
        if (Math.random() < 0.3) {
            traits.push(physicalTraits[Math.floor(Math.random() * physicalTraits.length)]);
        }

        // Mental traits
        const mentalTraits = ['intelligent', 'wise', 'charismatic', 'cunning'];
        if (Math.random() < 0.4) {
            traits.push(mentalTraits[Math.floor(Math.random() * mentalTraits.length)]);
        }

        return traits;
    }

    // Generate royal skills based on traits
    generateRoyalSkills() {
        return {
            leadership: Math.floor(Math.random() * 20) + 10, // 10-30 starting
            military: Math.floor(Math.random() * 15) + 5,   // 5-20 starting
            diplomacy: Math.floor(Math.random() * 15) + 5,  // 5-20 starting
            economics: Math.floor(Math.random() * 15) + 5   // 5-20 starting
        };
    }

    // Arrange marriage for current monarch or heirs
    arrangeMarriage(royalId, spouseData) {
        const royal = this.findRoyalById(royalId);
        if (!royal || royal.spouse) {
            console.warn('[RoyalFamily] Cannot arrange marriage - royal not found or already married');
            return false;
        }

        // Create spouse
        const spouse = {
            id: `spouse_${Date.now()}`,
            name: spouseData.name,
            age: spouseData.age || royal.age + Math.floor(Math.random() * 6) - 3, // Similar age
            status: 'royal_spouse',
            traits: this.generateRoyalTraits(),
            skills: this.generateRoyalSkills(),
            origin: spouseData.origin || 'local_nobility'
        };

        // Link marriage
        royal.spouse = spouse.id;
        spouse.spouse = royal.id;

        // Add spouse to royal family
        this.royalFamily.push(spouse);

        console.log(`[RoyalFamily] ${royal.name} married to ${spouse.name}`);

        // Marriage may produce children over time
        this.scheduleChildBirth(royal, spouse);

        try { this.gameState.save?.(); } catch (_) { }
        return true;
    }

    // Schedule potential child birth
    scheduleChildBirth(parent1, parent2) {
        // Random chance for children over time
        const childChance = 0.3; // 30% chance per year

        setTimeout(() => {
            if (Math.random() < childChance && parent1.age < 45) {
                this.createChild(parent1, parent2);

                // Schedule another potential child
                if (parent1.children.length < 4) { // Max 4 children
                    this.scheduleChildBirth(parent1, parent2);
                }
            }
        }, (365 * 1000) + Math.random() * 365000); // 1-2 years
    }

    // Create a child heir
    createChild(parent1, parent2) {
        const child = {
            id: `heir_${Date.now()}`,
            name: this.generateHeirName(),
            age: 0,
            status: 'heir',
            traits: this.inheritTraits(parent1, parent2),
            skills: { leadership: 0, military: 0, diplomacy: 0, economics: 0 },
            parents: [parent1.id, parent2.id],
            education: {
                focus: null, // Player can choose specialization
                tutors: [],
                progress: 0
            }
        };

        // Add to parent's children list
        parent1.children.push(child.id);
        parent2.children.push(child.id);

        // Add to royal family
        this.royalFamily.push(child);

        // Update succession order
        this.updateSuccessionOrder();

        console.log(`[RoyalFamily] New heir born: ${child.name}`);

        // Trigger birth event
        if (window.showModal) {
            window.showModal(
                '👶 Royal Birth!',
                `<p>A new heir has been born to the royal family!</p>
                 <p><strong>${child.name}</strong> joins the line of succession.</p>
                 <p>Inherited Traits: ${child.traits.join(', ') || 'None'}</p>`,
                { type: 'success', icon: '👑' }
            );
        }

        try { this.gameState.save?.(); } catch (_) { }
        return child;
    }

    // Inherit traits from parents
    inheritTraits(parent1, parent2) {
        const inheritedTraits = [];
        const allParentTraits = [...parent1.traits, ...parent2.traits];

        // 50% chance to inherit each parent trait
        allParentTraits.forEach(trait => {
            if (Math.random() < 0.5) {
                if (!inheritedTraits.includes(trait)) {
                    inheritedTraits.push(trait);
                }
            }
        });

        // Small chance for new mutations
        if (Math.random() < 0.1) {
            const newTraits = ['intelligent', 'charismatic', 'strong', 'magical_potential'];
            const newTrait = newTraits[Math.floor(Math.random() * newTraits.length)];
            if (!inheritedTraits.includes(newTrait)) {
                inheritedTraits.push(newTrait);
            }
        }

        return inheritedTraits;
    }

    // Generate heir names
    generateHeirName() {
        const maleNames = ['Alexander', 'William', 'Henry', 'Richard', 'Edward', 'Arthur', 'Charles'];
        const femaleNames = ['Isabella', 'Eleanor', 'Margaret', 'Catherine', 'Elizabeth', 'Victoria', 'Arabella'];
        const allNames = [...maleNames, ...femaleNames];
        return allNames[Math.floor(Math.random() * allNames.length)];
    }

    // ===================================================================
    // ROLE ASSIGNMENTS — Generals & Governors
    // ===================================================================

    /**
     * Assign a royal family member as General of an army.
     * Grants +10% attack per military skill point (capped at 100%).
     * @param {string} royalId
     * @param {string} armyId
     */
    assignGeneral(royalId, armyId) {
        const royal = this.findRoyalById(royalId);
        if (!royal) return false;
        if (royal.age < 16) return false; // too young

        // Check slot limit from Hire General investment
        const maxSlots = this.gameState?.investments?.hireGeneral || 0;
        const currentGenerals = this.royalFamily.filter(r => r.role === 'general').length;
        if (currentGenerals >= maxSlots && royal.role !== 'general') {
            console.warn(`[RoyalFamily] No general slots available (${currentGenerals}/${maxSlots})`);
            return false;
        }

        if (royal.role === 'governor') this.unassignRole(royalId); // remove previous role

        // Unassign previous general of this army (if any)
        const prev = this.royalFamily.find(r => r.role === 'general' && r.assignedTo === armyId);
        if (prev) { prev.role = null; prev.assignedTo = null; }

        royal.role = 'general';
        royal.assignedTo = armyId;
        console.log(`[RoyalFamily] ${royal.name} assigned as General of army ${armyId}`);
        try { this.gameState.save?.(); } catch (_) { }
        return true;
    }

    /**
     * Assign a royal family member as Governor of a location.
     * Grants +5% production per economics skill point (capped at 100%).
     * @param {string} royalId
     * @param {string} locationKey - 'capital' or tile key like '4,4'
     */
    assignGovernor(royalId, locationKey = 'capital') {
        const royal = this.findRoyalById(royalId);
        if (!royal) return false;
        if (royal.age < 16) return false;

        // Check slot limit from Hire Governor investment
        const maxSlots = this.gameState?.investments?.hireGovernor || 0;
        const currentGovernors = this.royalFamily.filter(r => r.role === 'governor').length;
        if (currentGovernors >= maxSlots && royal.role !== 'governor') {
            console.warn(`[RoyalFamily] No governor slots available (${currentGovernors}/${maxSlots})`);
            return false;
        }

        if (royal.role === 'general') this.unassignRole(royalId);

        // Unassign previous governor of this location
        const prev = this.royalFamily.find(r => r.role === 'governor' && r.assignedTo === locationKey);
        if (prev) { prev.role = null; prev.assignedTo = null; }

        royal.role = 'governor';
        royal.assignedTo = locationKey;
        console.log(`[RoyalFamily] ${royal.name} assigned as Governor of ${locationKey}`);
        try { this.gameState.save?.(); } catch (_) { }
        return true;
    }

    /** Remove role from a royal family member */
    unassignRole(royalId) {
        const royal = this.findRoyalById(royalId);
        if (!royal) return;
        royal.role = null;
        royal.assignedTo = null;
        try { this.gameState.save?.(); } catch (_) { }
    }

    /** Get the General assigned to a specific army (if any) */
    getGeneralForArmy(armyId) {
        return this.royalFamily.find(r => r.role === 'general' && r.assignedTo === armyId) || null;
    }

    /** Get the Governor of a location */
    getGovernor(locationKey = 'capital') {
        return this.royalFamily.find(r => r.role === 'governor' && r.assignedTo === locationKey) || null;
    }

    /**
     * Calculate the attack multiplier a General provides to their army.
     * +10% per military skill point, capped at +100% (2.0x).
     */
    getGeneralAttackMultiplier(armyId) {
        const general = this.getGeneralForArmy(armyId);
        if (!general) return 1.0;
        const mil = general.skills?.military || 0;
        return 1.0 + Math.min(mil * 0.10, 1.0);
    }

    /**
     * Calculate the production multiplier a Governor provides.
     * +5% per economics skill point, capped at +100% (2.0x).
     */
    getGovernorProductionMultiplier(locationKey = 'capital') {
        const governor = this.getGovernor(locationKey);
        if (!governor) return 1.0;
        const econ = governor.skills?.economics || 0;
        return 1.0 + Math.min(econ * 0.05, 1.0);
    }

    /** Get all royal members eligible for role assignment (age >= 16, not monarch) */
    getAssignableMembers() {
        return this.royalFamily.filter(r =>
            r.age >= 16 &&
            r.id !== this.currentMonarch?.id
        );
    }

    // Update succession order
    updateSuccessionOrder() {
        this.successionOrder = this.royalFamily
            .filter(royal => royal.status === 'heir' && royal.age >= 16) // Adult heirs only
            .sort((a, b) => b.age - a.age); // Oldest first

        console.log('[RoyalFamily] Succession order updated:', this.successionOrder.map(h => h.name));
    }

    // Handle monarch death and succession
    handleSuccession() {
        if (this.successionOrder.length === 0) {
            console.warn('[RoyalFamily] No viable heirs - dynasty extinction!');
            this.handleDynastyExtinction();
            return null;
        }

        const newMonarch = this.successionOrder[0];
        newMonarch.status = 'monarch';
        newMonarch.reignStart = this.gameState.day;

        this.currentMonarch = newMonarch;
        this.updateSuccessionOrder();

        console.log(`[RoyalFamily] New monarch crowned: ${newMonarch.name}`);

        // Succession event
        if (window.showModal) {
            window.showModal(
                '👑 Royal Succession!',
                `<p>Long live the new monarch!</p>
                 <p><strong>${newMonarch.name}</strong> has ascended to the throne.</p>
                 <p>The dynasty continues...</p>`,
                { type: 'success', icon: '👑' }
            );
        }

        // Dynasty founder achievement - unlocked on first succession
        try { window.achievementSystem?.triggerDynastySuccession?.(); } catch (_) { }

        try { this.gameState.save?.(); } catch (_) { }
        return newMonarch;
    }

    // Handle dynasty extinction — delegates to LegacySystem
    handleDynastyExtinction() {
        console.log('[RoyalFamily] Dynasty has ended - triggering legacy system');

        // Unlock Monarch view on dynasty end
        try { window.achievementSystem?.triggerNotAnEnd?.(); } catch (_) { }

        if (window.legacySystem) {
            const dName = localStorage.getItem('dynastyName') || this.gameState?.dynastyName || 'Unknown';
            window.legacySystem.performEndDynasty(this.gameState, dName, 'dynasty_extinct');
        } else {
            // Fallback: show non-dismissable modal then reload
            if (window.modalSystem?.showModal) {
                window.modalSystem.showModal({
                    title: '⚰️ Dynasty Extinct',
                    content: `<div style="text-align:center;padding:20px;">
                        <div style="font-size:64px;margin-bottom:16px;">💀</div>
                        <p>The royal bloodline has ended with no viable heirs.</p>
                        <p>Your legacy will be remembered...</p>
                        <button id="extinction-restart" style="margin-top:16px;padding:12px 24px;background:#c0392b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1em;font-weight:bold;">Start Over</button>
                    </div>`,
                    closable: false,
                    showCloseButton: false
                });
                setTimeout(() => {
                    document.getElementById('extinction-restart')?.addEventListener('click', () => {
                        localStorage.clear();
                        location.reload();
                    });
                }, 50);
            } else {
                setTimeout(() => location.reload(), 2000);
            }
        }
    }

    // Find royal family member by ID
    findRoyalById(id) {
        return this.royalFamily.find(royal => royal.id === id);
    }

    // Get royal family statistics
    getRoyalFamilyStats() {
        return {
            monarch: this.currentMonarch,
            totalFamily: this.royalFamily.length,
            heirs: this.royalFamily.filter(r => r.status === 'heir').length,
            successionOrder: this.successionOrder.map(h => ({ name: h.name, age: h.age })),
            dynastyAge: this.gameState.day - (this.currentMonarch?.reignStart || 0)
        };
    }

    // Age royal family members (1 unit per day) and check death using population model
    ageRoyalFamily() {
        const calcProb = (age) => {
            // Prefer the population manager's model for consistency
            try {
                const pm = this.gameState?.populationManager;
                if (pm && typeof pm.calculateDeathProbability === 'function') {
                    return pm.calculateDeathProbability(age);
                }
            } catch (_) { /* fallback */ }
            // Fallback: mirror PopulationManager.calculateDeathProbability
            if (age < 180) return 0;
            if (age <= 200) {
                const t = (age - 180) / 20; // 0..1
                return 0.001 + t * (0.02 - 0.001);
            }
            if (age <= 220) {
                const t = (age - 200) / 20; // 0..1
                return 0.02 + t * (0.5 - 0.02);
            }
            return Math.min(0.99, 0.5 + (age - 220) * 0.01);
        };

        this.royalFamily.forEach(royal => {
            royal.age += 1;
            const deathChance = calcProb(royal.age);
            if (Math.random() < deathChance) {
                this.handleRoyalDeath(royal);
            }
        });

        // Update succession after aging
        this.updateSuccessionOrder();
    }

    // Handle death of royal family member
    handleRoyalDeath(royal) {
        console.log(`[RoyalFamily] ${royal.name} has died at age ${royal.age}`);

        // Emit event and record for UI/debug
        try {
            window.eventBus?.emit?.('royal_died', { name: royal.name, age: royal.age, id: royal.id });
        } catch (_) { /* noop */ }
        try {
            if (this.gameState) {
                this.gameState.recentRoyalDeaths = this.gameState.recentRoyalDeaths || [];
                this.gameState.recentRoyalDeaths.unshift({ name: royal.name, age: royal.age, id: royal.id, day: this.gameState.day });
                this.gameState.recentRoyalDeaths = this.gameState.recentRoyalDeaths.slice(0, 10);
            }
        } catch (_) { /* noop */ }

        // Remove from royal family
        this.royalFamily = this.royalFamily.filter(r => r.id !== royal.id);

        // If monarch died, handle succession
        if (royal.id === this.currentMonarch?.id) {
            this.handleSuccession();
        }

        // Update succession order
        this.updateSuccessionOrder();

        try { this.gameState.save?.(); } catch (_) { }
    }

    // Serialize royal family state for saving
    serialize() {
        try {
            return {
                version: 1,
                royalFamily: this.royalFamily,
                currentMonarchId: this.currentMonarch ? this.currentMonarch.id : null,
                marriageOffers: this.marriageOffers,
                // successionOrder can be recomputed; include for visibility only
                successionOrderIds: Array.isArray(this.successionOrder) ? this.successionOrder.map(m => m.id) : []
            };
        } catch (_) {
            return null;
        }
    }

    // Restore royal family state from saved data
    deserialize(data) {
        if (!data) return;
        try {
            // Shallow restore is fine; objects are plain
            this.royalFamily = Array.isArray(data.royalFamily) ? data.royalFamily : [];
            const id = data.currentMonarchId;
            if (id) {
                this.currentMonarch = this.findRoyalById(id) || null;
            }
            // If not found, pick a reasonable default
            if (!this.currentMonarch && this.royalFamily.length > 0) {
                // Prefer any member with status 'monarch', else first adult heir, else first member
                this.currentMonarch = this.royalFamily.find(r => r.status === 'monarch') ||
                    this.royalFamily.find(r => r.status === 'heir' && r.age >= 16) ||
                    this.royalFamily[0];
                if (this.currentMonarch) this.currentMonarch.status = 'monarch';
            }
            // Backward compatibility: default governing to true for the active monarch if missing
            if (this.currentMonarch && typeof this.currentMonarch.isGoverning !== 'boolean') {
                this.currentMonarch.isGoverning = true;
            }
            this.marriageOffers = Array.isArray(data.marriageOffers) ? data.marriageOffers : [];
            // Recompute succession to ensure consistency
            this.updateSuccessionOrder();
        } catch (e) {
            console.warn('[RoyalFamily] Failed to deserialize royal family, reinitializing', e);
            this.royalFamily = [];
            this.currentMonarch = null;
            this.marriageOffers = [];
            this.successionOrder = [];
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoyalFamilyManager;
}

// Also attach to window for browser usage
if (typeof window !== 'undefined') {
    window.RoyalFamilyManager = window.RoyalFamilyManager || RoyalFamilyManager;
}

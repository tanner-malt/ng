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
        
        return newMonarch;
    }

    // Handle dynasty extinction (triggers reset)
    handleDynastyExtinction() {
        console.log('[RoyalFamily] Dynasty has ended - triggering reset mechanism');
        
        if (window.showModal) {
            window.showModal(
                '⚰️ Dynasty Extinct',
                `<p>The royal bloodline has ended with no viable heirs.</p>
                 <p>Your legacy will be remembered...</p>
                 <p>Preparing new dynasty with inherited bonuses.</p>`,
                { type: 'warning', icon: '💀' }
            );
        }
        
        // Trigger dynasty reset (to be implemented)
        if (this.gameState.triggerDynastyReset) {
            this.gameState.triggerDynastyReset();
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

    // Age royal family members
    ageRoyalFamily() {
        this.royalFamily.forEach(royal => {
            royal.age += 1;
            
            // Check for natural death (very rare before 60, increases with age)
            const deathChance = royal.age > 60 ? (royal.age - 60) * 0.02 : 0.001;
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
        
        // Remove from royal family
        this.royalFamily = this.royalFamily.filter(r => r.id !== royal.id);
        
        // If monarch died, handle succession
        if (royal.id === this.currentMonarch?.id) {
            this.handleSuccession();
        }
        
        // Update succession order
        this.updateSuccessionOrder();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoyalFamilyManager;
}

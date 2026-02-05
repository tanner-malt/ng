// Diplomacy System - Kingdoms, Marriage Alliances, and Relations
class DiplomacySystem {
    constructor(gameState, worldManager) {
        this.gameState = gameState;
        this.worldManager = worldManager;
        
        // Other kingdoms in the world
        this.kingdoms = [];
        this.maxKingdoms = 5;
        
        // Relations with other kingdoms (-100 to 100)
        this.relations = new Map(); // kingdomId -> relation value
        
        // Marriage candidates
        this.marriageCandidates = [];
        
        // Inbreeding tracking
        this.royalLineage = new Map(); // personId -> ancestorIds
        
        // Kingdom names
        this.kingdomNames = [
            'Valdoria', 'Karthune', 'Elmsworth', 'Drakenhold', 'Silvermere',
            'Thornwick', 'Ironforge', 'Sunhaven', 'Moonshadow', 'Stormreach',
            'Goldcrest', 'Ravenmoor', 'Ashenvale', 'Crystalpeak', 'Shadowfen'
        ];
        
        // Royal family names for other kingdoms
        this.dynastyNames = [
            'von Aldric', 'de Montfort', 'Blackwood', 'Dragonbane', 'Silverhand',
            'Ironwill', 'Sunfire', 'Moonwhisper', 'Stormborn', 'Goldenheart'
        ];
    }
    
    init() {
        this.loadState();
        
        // Create initial kingdoms if none exist
        if (this.kingdoms.length === 0) {
            this.generateInitialKingdoms();
        }
        
        console.log('[Diplomacy] Initialized with', this.kingdoms.length, 'kingdoms');
    }
    
    // Generate starting kingdoms
    generateInitialKingdoms() {
        const numKingdoms = 2 + Math.floor(Math.random() * 2); // 2-3 starting kingdoms
        
        for (let i = 0; i < numKingdoms; i++) {
            this.createKingdom();
        }
    }
    
    // Create a new kingdom
    createKingdom() {
        if (this.kingdoms.length >= this.maxKingdoms) return null;
        
        const availableNames = this.kingdomNames.filter(name => 
            !this.kingdoms.some(k => k.name === name)
        );
        
        if (availableNames.length === 0) return null;
        
        const name = availableNames[Math.floor(Math.random() * availableNames.length)];
        const dynasty = this.dynastyNames[Math.floor(Math.random() * this.dynastyNames.length)];
        
        const kingdom = {
            id: `kingdom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            dynasty,
            ruler: this.generateRuler(dynasty),
            heirs: this.generateHeirs(dynasty),
            strength: 50 + Math.floor(Math.random() * 50), // Military strength
            wealth: 100 + Math.floor(Math.random() * 200),
            destroyed: false,
            destroyedDay: null,
            createdDay: this.gameState.day || 1
        };
        
        this.kingdoms.push(kingdom);
        this.relations.set(kingdom.id, 0); // Neutral starting relation
        
        console.log(`[Diplomacy] Kingdom created: ${name}`);
        return kingdom;
    }
    
    // Generate a ruler for a kingdom
    generateRuler(dynasty) {
        const isMale = Math.random() < 0.5;
        return {
            id: `ruler_${Date.now()}`,
            name: this.generateName(isMale),
            dynasty,
            gender: isMale ? 'male' : 'female',
            age: 30 + Math.floor(Math.random() * 30),
            traits: this.generateTraits(),
            alive: true
        };
    }
    
    // Generate heirs for a kingdom
    generateHeirs(dynasty) {
        const heirs = [];
        const numHeirs = 1 + Math.floor(Math.random() * 3); // 1-3 heirs
        
        for (let i = 0; i < numHeirs; i++) {
            const isMale = Math.random() < 0.5;
            heirs.push({
                id: `heir_${Date.now()}_${i}`,
                name: this.generateName(isMale),
                dynasty,
                gender: isMale ? 'male' : 'female',
                age: 16 + Math.floor(Math.random() * 15), // 16-30
                traits: this.generateTraits(),
                married: false,
                alive: true
            });
        }
        
        return heirs;
    }
    
    // Generate random name
    generateName(isMale) {
        const maleNames = ['Alexander', 'Wilhelm', 'Edward', 'Richard', 'Henry', 'Frederick', 'Charles', 'Louis', 'Arthur', 'Edmund'];
        const femaleNames = ['Elizabeth', 'Catherine', 'Victoria', 'Eleanor', 'Margaret', 'Isabella', 'Sophia', 'Charlotte', 'Anne', 'Mary'];
        
        const names = isMale ? maleNames : femaleNames;
        return names[Math.floor(Math.random() * names.length)];
    }
    
    // Generate random traits
    generateTraits() {
        const allTraits = ['brave', 'cunning', 'kind', 'cruel', 'wise', 'foolish', 'ambitious', 'humble', 'beautiful', 'plain'];
        const numTraits = 1 + Math.floor(Math.random() * 2);
        const traits = [];
        
        for (let i = 0; i < numTraits; i++) {
            const trait = allTraits[Math.floor(Math.random() * allTraits.length)];
            if (!traits.includes(trait)) traits.push(trait);
        }
        
        return traits;
    }
    
    // Process daily diplomacy updates
    processDaily() {
        // Kingdoms can be destroyed by enemies
        this.checkKingdomSurvival();
        
        // Relations drift toward neutral
        this.processRelationsDrift();
        
        // Potentially discover new kingdoms
        this.checkKingdomDiscovery();
        
        // Age heirs and rulers
        this.ageRoyals();
        
        this.saveState();
    }
    
    // Check if kingdoms survive enemy attacks
    checkKingdomSurvival() {
        const threatLevel = this.gameState.enemySpawnSystem?.threatLevel || 1;
        
        this.kingdoms.forEach(kingdom => {
            if (kingdom.destroyed) return;
            
            // Higher threat = higher chance of kingdom being destroyed
            const survivalChance = 0.999 - (threatLevel * 0.0005); // 0.1% to 0.5% daily destruction chance
            
            if (Math.random() > survivalChance) {
                this.destroyKingdom(kingdom.id);
            }
        });
    }
    
    // Destroy a kingdom
    destroyKingdom(kingdomId) {
        const kingdom = this.kingdoms.find(k => k.id === kingdomId);
        if (!kingdom || kingdom.destroyed) return;
        
        kingdom.destroyed = true;
        kingdom.destroyedDay = this.gameState.day;
        
        // All heirs become unmarriageable
        kingdom.heirs.forEach(heir => heir.alive = false);
        kingdom.ruler.alive = false;
        
        console.log(`[Diplomacy] Kingdom ${kingdom.name} has been destroyed!`);
        window.showToast?.(`💔 The Kingdom of ${kingdom.name} has fallen to the enemy!`, { type: 'warning' });
        
        window.eventBus?.emit('kingdomDestroyed', { kingdom });
    }
    
    // Relations drift toward neutral
    processRelationsDrift() {
        this.relations.forEach((value, kingdomId) => {
            if (value > 0) {
                this.relations.set(kingdomId, Math.max(0, value - 0.1));
            } else if (value < 0) {
                this.relations.set(kingdomId, Math.min(0, value + 0.1));
            }
        });
    }
    
    // Check if new kingdoms are discovered
    checkKingdomDiscovery() {
        const activeKingdoms = this.kingdoms.filter(k => !k.destroyed).length;
        
        // Diplomacy tech increases discovery chance
        const diplomacyBonus = this.gameState.techBonuses?.kingdomDiscovery || 0;
        const baseChance = 0.001; // 0.1% daily
        
        if (activeKingdoms < this.maxKingdoms && Math.random() < baseChance * (1 + diplomacyBonus)) {
            const newKingdom = this.createKingdom();
            if (newKingdom) {
                window.showToast?.(`🏰 A new kingdom has been discovered: ${newKingdom.name}!`, { type: 'info' });
            }
        }
    }
    
    // Age royals in other kingdoms
    ageRoyals() {
        this.kingdoms.forEach(kingdom => {
            if (kingdom.destroyed) return;
            
            // Age ruler
            kingdom.ruler.age += 1 / 365; // Fractional aging per day
            
            // Check ruler death
            if (kingdom.ruler.age > 80 && Math.random() < 0.01) {
                this.handleRulerDeath(kingdom);
            }
            
            // Age heirs
            kingdom.heirs.forEach(heir => {
                if (heir.alive) {
                    heir.age += 1 / 365;
                }
            });
        });
    }
    
    // Handle death of foreign ruler
    handleRulerDeath(kingdom) {
        const livingHeirs = kingdom.heirs.filter(h => h.alive && !h.married);
        
        if (livingHeirs.length > 0) {
            // Succession
            kingdom.ruler = livingHeirs[0];
            kingdom.heirs = kingdom.heirs.filter(h => h.id !== livingHeirs[0].id);
            console.log(`[Diplomacy] ${kingdom.name} has a new ruler: ${kingdom.ruler.name}`);
        } else {
            // Kingdom falls without heir
            this.destroyKingdom(kingdom.id);
        }
    }
    
    // Get available marriage candidates
    getMarriageCandidates(seekerGender) {
        const candidates = [];
        const targetGender = seekerGender === 'male' ? 'female' : 'male';
        
        this.kingdoms.forEach(kingdom => {
            if (kingdom.destroyed) return;
            
            const relation = this.relations.get(kingdom.id) || 0;
            
            // Need positive relations for marriage
            if (relation < 0) return;
            
            // Check heirs
            kingdom.heirs.forEach(heir => {
                if (heir.alive && !heir.married && heir.gender === targetGender && heir.age >= 16) {
                    // Calculate marriage chance based on relations and diplomacy tech
                    const diplomacyBonus = this.gameState.techBonuses?.marriageChance || 0;
                    const baseChance = 0.3 + (relation / 200) + diplomacyBonus;
                    
                    candidates.push({
                        person: heir,
                        kingdom,
                        marriageChance: Math.min(0.95, baseChance),
                        dowry: this.calculateDowry(kingdom, heir)
                    });
                }
            });
        });
        
        return candidates;
    }
    
    // Calculate dowry for marriage
    calculateDowry(kingdom, heir) {
        const baseDowry = {
            gold: Math.floor(kingdom.wealth * 0.1),
            soldiers: Math.floor(kingdom.strength * 0.05)
        };
        
        // Traits affect dowry
        if (heir.traits.includes('beautiful')) baseDowry.gold *= 1.5;
        if (heir.traits.includes('wise')) baseDowry.gold *= 1.3;
        
        return baseDowry;
    }
    
    // Propose marriage
    proposeMarriage(candidateId, royalId) {
        let candidate = null;
        let kingdom = null;
        
        // Find candidate
        for (const k of this.kingdoms) {
            const heir = k.heirs.find(h => h.id === candidateId);
            if (heir) {
                candidate = heir;
                kingdom = k;
                break;
            }
        }
        
        if (!candidate || !kingdom) {
            window.showToast?.(`❌ Marriage candidate not found`, { type: 'error' });
            return false;
        }
        
        // Calculate acceptance based on relations and chance
        const relation = this.relations.get(kingdom.id) || 0;
        const diplomacyBonus = this.gameState.techBonuses?.marriageChance || 0;
        const acceptanceChance = 0.3 + (relation / 200) + diplomacyBonus;
        
        if (Math.random() < acceptanceChance) {
            // Marriage accepted!
            return this.executeMarriage(candidate, kingdom, royalId);
        } else {
            // Marriage rejected
            this.relations.set(kingdom.id, relation - 10);
            window.showToast?.(`❌ ${kingdom.name} has rejected the marriage proposal.`, { type: 'error' });
            return false;
        }
    }
    
    // Execute marriage
    executeMarriage(candidate, kingdom, royalId) {
        candidate.married = true;
        
        // Improve relations
        const relation = this.relations.get(kingdom.id) || 0;
        this.relations.set(kingdom.id, Math.min(100, relation + 30));
        
        // Calculate dowry
        const dowry = this.calculateDowry(kingdom, candidate);
        
        // Grant dowry
        if (this.gameState.resources) {
            this.gameState.resources.gold = (this.gameState.resources.gold || 0) + dowry.gold;
        }
        
        console.log(`[Diplomacy] Marriage alliance formed with ${kingdom.name}!`);
        window.showToast?.(`💒 Marriage alliance formed with ${kingdom.name}!`, { type: 'success' });
        window.showToast?.(`💰 Received ${dowry.gold} gold as dowry`, { type: 'success' });
        
        // Emit event for royal family system to handle
        window.eventBus?.emit('marriageFormed', {
            spouse: candidate,
            kingdom,
            royalId,
            dowry
        });
        
        this.saveState();
        return true;
    }
    
    // Check for inbreeding (same great-grandparent)
    checkInbreeding(person1Id, person2Id) {
        const ancestors1 = this.royalLineage.get(person1Id) || new Set();
        const ancestors2 = this.royalLineage.get(person2Id) || new Set();
        
        // Check for common ancestors
        for (const ancestor of ancestors1) {
            if (ancestors2.has(ancestor)) {
                return true; // Inbreeding detected
            }
        }
        
        return false;
    }
    
    // Register lineage for a new royal
    registerLineage(personId, parentIds) {
        const ancestors = new Set(parentIds);
        
        // Add parents' ancestors
        parentIds.forEach(parentId => {
            const parentAncestors = this.royalLineage.get(parentId);
            if (parentAncestors) {
                parentAncestors.forEach(a => ancestors.add(a));
            }
        });
        
        this.royalLineage.set(personId, ancestors);
    }
    
    // Get kingdom by ID
    getKingdom(kingdomId) {
        return this.kingdoms.find(k => k.id === kingdomId);
    }
    
    // Get all active kingdoms
    getActiveKingdoms() {
        return this.kingdoms.filter(k => !k.destroyed);
    }
    
    // Improve relations through gifts
    sendGift(kingdomId, goldAmount) {
        const kingdom = this.kingdoms.find(k => k.id === kingdomId);
        if (!kingdom || kingdom.destroyed) return false;
        
        const gold = this.gameState.resources?.gold || 0;
        if (gold < goldAmount) {
            window.showToast?.(`❌ Not enough gold`, { type: 'error' });
            return false;
        }
        
        this.gameState.resources.gold -= goldAmount;
        
        // Improve relations based on gift size
        const relationGain = Math.floor(goldAmount / 10);
        const currentRelation = this.relations.get(kingdomId) || 0;
        this.relations.set(kingdomId, Math.min(100, currentRelation + relationGain));
        
        window.showToast?.(`🎁 Sent gift to ${kingdom.name}. Relations improved!`, { type: 'success' });
        return true;
    }
    
    // Save state
    saveState() {
        const state = {
            kingdoms: this.kingdoms,
            relations: Array.from(this.relations.entries()),
            lineage: Array.from(this.royalLineage.entries()).map(([k, v]) => [k, Array.from(v)])
        };
        localStorage.setItem('diplomacyState', JSON.stringify(state));
    }
    
    // Load state
    loadState() {
        try {
            const saved = localStorage.getItem('diplomacyState');
            if (saved) {
                const state = JSON.parse(saved);
                this.kingdoms = state.kingdoms || [];
                this.relations = new Map(state.relations || []);
                this.royalLineage = new Map((state.lineage || []).map(([k, v]) => [k, new Set(v)]));
            }
        } catch (e) {
            console.error('[Diplomacy] Error loading state:', e);
        }
    }
}

// Export to window
window.DiplomacySystem = DiplomacySystem;

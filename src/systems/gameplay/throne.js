// Throne room merge system
class ThroneManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.gridSize = 6; // 6x6 merge grid
        this.mergeGrid = null;
        
        // Merge item types and their properties
        this.itemTypes = {
            // Basic ceremonial items
            candle: { 
                name: 'Ceremonial Candle', 
                maxLevel: 5, 
                baseValue: 10,
                mergeResult: 'torch',
                bonus: { type: 'food_production', value: 0.05 }
            },
            torch: { 
                name: 'Sacred Torch', 
                maxLevel: 5, 
                baseValue: 25,
                mergeResult: 'brazier',
                bonus: { type: 'wood_production', value: 0.1 }
            },
            brazier: { 
                name: 'Royal Brazier', 
                maxLevel: 3, 
                baseValue: 60,
                mergeResult: 'altar',
                bonus: { type: 'stone_production', value: 0.15 }
            },
            altar: { 
                name: 'Divine Altar', 
                maxLevel: 2, 
                baseValue: 150,
                mergeResult: null,
                bonus: { type: 'all_production', value: 0.2 }
            },
            
            // Military ceremonial items
            banner: { 
                name: 'War Banner', 
                maxLevel: 5, 
                baseValue: 15,
                mergeResult: 'standard',
                bonus: { type: 'army_attack', value: 5 }
            },
            standard: { 
                name: 'Royal Standard', 
                maxLevel: 4, 
                baseValue: 40,
                mergeResult: 'crown',
                bonus: { type: 'army_health', value: 10 }
            },
            crown: { 
                name: 'Battle Crown', 
                maxLevel: 2, 
                baseValue: 100,
                mergeResult: null,
                bonus: { type: 'commander_experience', value: 2 }
            },
            
            // Magical ceremonial items
            gem: { 
                name: 'Power Gem', 
                maxLevel: 4, 
                baseValue: 20,
                mergeResult: 'orb',
                bonus: { type: 'gold_generation', value: 1 }
            },
            orb: { 
                name: 'Mystic Orb', 
                maxLevel: 3, 
                baseValue: 50,
                mergeResult: 'scepter',
                bonus: { type: 'automation_speed', value: 0.1 }
            },
            scepter: { 
                name: 'Royal Scepter', 
                maxLevel: 2, 
                baseValue: 120,
                mergeResult: null,
                bonus: { type: 'prestige_bonus', value: 0.15 }
            }
        };
        
        this.selectedItem = null;
    }
    
    init() {
        // Check if throne view is unlocked
        const throneContent = document.getElementById('throne-content');
        const lockedView = document.querySelector('#throne-view .locked-view');
        
        // Show appropriate view based on unlock state
        if (window.unlockSystem && window.unlockSystem.isViewUnlocked('throne')) {
            if (lockedView) lockedView.style.display = 'none';
            if (throneContent) throneContent.style.display = 'block';
            
            // Initialize dynasty system
            this.initializeDynasty();
            
            // Initialize equipment system
            this.initializeEquipment();
            
            // Initialize merge system
            this.initializeMergeSystem();
        } else {
            if (lockedView) lockedView.style.display = 'block';
            if (throneContent) throneContent.style.display = 'none';
            console.log('[Throne] Throne view is locked');
            return;
        }
    }
    
    initializeMergeSystem() {
        this.mergeGrid = document.getElementById('merge-grid');
        if (!this.mergeGrid) {
            console.warn('[Throne] merge-grid element not found, skipping merge initialization');
            return;
        }
        
        this.setupMergeGrid();
        this.loadMergeItems();
        this.updateActiveBonuses();
        this.generateRandomItems();
        
        // Generate new items periodically
        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance every interval
                this.generateRandomItems();
            }
        }, 30000); // Every 30 seconds
    }
    
    setupMergeGrid() {
        if (!this.mergeGrid) return;
        
        // Clear existing grid
        this.mergeGrid.innerHTML = '';
        
        // Create grid slots
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const slot = document.createElement('div');
            slot.className = 'merge-slot';
            slot.dataset.slotIndex = i;
            
            slot.addEventListener('click', () => {
                this.handleSlotClick(i);
            });
            
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                this.handleItemDrop(i, e);
            });
            
            this.mergeGrid.appendChild(slot);
        }
    }
    
    loadMergeItems() {
        // Load existing merge items from game state
        this.gameState.mergeItems.forEach(item => {
            this.placeItemInSlot(item, item.slotIndex);
        });
    }
    
    generateRandomItems() {
        // Find empty slots
        const emptySlots = [];
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            if (!this.getItemInSlot(i)) {
                emptySlots.push(i);
            }
        }
        
        if (emptySlots.length === 0) return;
        
        // Generate 1-2 random items
        const itemCount = Math.min(Math.floor(Math.random() * 2) + 1, emptySlots.length);
        const basicItems = ['candle', 'banner', 'gem'];
        
        for (let i = 0; i < itemCount; i++) {
            const slotIndex = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            const itemType = basicItems[Math.floor(Math.random() * basicItems.length)];
            
            const newItem = {
                id: `item_${Date.now()}_${i}`,
                type: itemType,
                level: 1,
                slotIndex: slotIndex
            };
            
            this.gameState.mergeItems.push(newItem);
            this.placeItemInSlot(newItem, slotIndex);
            
            // Remove used slot from available slots
            const usedSlotIndex = emptySlots.indexOf(slotIndex);
            emptySlots.splice(usedSlotIndex, 1);
        }
        
        this.gameState.logBattleEvent(`✨ New ceremonial items appeared in the throne room`);
    }
    
    placeItemInSlot(item, slotIndex) {
        const slot = this.mergeGrid.children[slotIndex];
        if (!slot) return;
        
        // Clear slot first
        slot.innerHTML = '';
        
        // Create item element
        const itemEl = document.createElement('div');
        itemEl.className = 'merge-item';
        itemEl.dataset.itemId = item.id;
        itemEl.draggable = true;
        
        const itemConfig = this.itemTypes[item.type];
        const itemIcon = this.getItemIcon(item.type);
        
        itemEl.innerHTML = `
            <div class="item-icon">${itemIcon}</div>
            <div class="item-level">${item.level}</div>
        `;
        
        itemEl.style.background = this.getItemColor(item.type, item.level);
        itemEl.style.borderRadius = '8px';
        itemEl.style.border = '2px solid rgba(255,255,255,0.3)';
        itemEl.style.display = 'flex';
        itemEl.style.flexDirection = 'column';
        itemEl.style.alignItems = 'center';
        itemEl.style.justifyContent = 'center';
        itemEl.style.cursor = 'grab';
        itemEl.style.transition = 'all 0.3s ease';
        itemEl.style.fontSize = '12px';
        itemEl.style.color = 'white';
        itemEl.style.fontWeight = 'bold';
        itemEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        
        itemEl.title = `${itemConfig.name} (Level ${item.level})`;
        
        // Drag handlers
        itemEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.id);
            itemEl.style.opacity = '0.5';
        });
        
        itemEl.addEventListener('dragend', () => {
            itemEl.style.opacity = '1';
        });
        
        // Click handler
        itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectItem(item);
        });
        
        slot.appendChild(itemEl);
    }
    
    getItemIcon(type) {
        const icons = {
            candle: '🕯️',
            torch: '🔥',
            brazier: '🔥',
            altar: '⛩️',
            banner: '🚩',
            standard: '🏴',
            crown: '👑',
            gem: '💎',
            orb: '🔮',
            scepter: '🪄'
        };
        return icons[type] || '❓';
    }
    
    getItemColor(type, level) {
        const baseColors = {
            candle: '#f39c12',
            torch: '#e74c3c',
            brazier: '#c0392b',
            altar: '#9b59b6',
            banner: '#3498db',
            standard: '#2980b9',
            crown: '#f1c40f',
            gem: '#1abc9c',
            orb: '#16a085',
            scepter: '#8e44ad'
        };
        
        const baseColor = baseColors[type] || '#95a5a6';
        const intensity = Math.min(1, 0.6 + (level * 0.1));
        
        return `linear-gradient(135deg, ${baseColor}, ${baseColor}CC)`;
    }
    
    handleSlotClick(slotIndex) {
        if (this.selectedItem) {
            // Try to move selected item to this slot
            this.moveItem(this.selectedItem, slotIndex);
            this.clearSelection();
        }
    }
    
    handleItemDrop(slotIndex, event) {
        const itemId = event.dataTransfer.getData('text/plain');
        const item = this.gameState.mergeItems.find(i => i.id === itemId);
        
        if (item) {
            this.moveItem(item, slotIndex);
        }
    }
    
    selectItem(item) {
        this.clearSelection();
        this.selectedItem = item;
        
        const itemEl = document.querySelector(`[data-item-id="${item.id}"]`);
        if (itemEl) {
            itemEl.style.boxShadow = '0 0 15px #1abc9c';
            itemEl.style.borderColor = '#1abc9c';
        }
    }
    
    clearSelection() {
        if (this.selectedItem) {
            const itemEl = document.querySelector(`[data-item-id="${this.selectedItem.id}"]`);
            if (itemEl) {
                itemEl.style.boxShadow = '';
                itemEl.style.borderColor = 'rgba(255,255,255,0.3)';
            }
        }
        this.selectedItem = null;
    }
    
    moveItem(item, targetSlotIndex) {
        const targetItem = this.getItemInSlot(targetSlotIndex);
        
        if (targetItem && targetItem.id !== item.id) {
            // Check if items can merge
            if (this.canMerge(item, targetItem)) {
                this.mergeItems(item, targetItem);
                return;
            } else {
                // Swap items
                this.swapItems(item, targetItem);
                return;
            }
        }
        
        // Move to empty slot
        if (!targetItem) {
            const oldSlot = this.mergeGrid.children[item.slotIndex];
            oldSlot.innerHTML = '';
            
            item.slotIndex = targetSlotIndex;
            this.placeItemInSlot(item, targetSlotIndex);
        }
    }
    
    canMerge(item1, item2) {
        return item1.type === item2.type && item1.level === item2.level;
    }
    
    mergeItems(item1, item2) {
        const itemConfig = this.itemTypes[item1.type];
        
        // Check if can level up
        if (item1.level >= itemConfig.maxLevel) {
            // Transform to next tier if available
            if (itemConfig.mergeResult) {
                this.transformItem(item1, item2, itemConfig.mergeResult);
            } else {
                this.gameState.logBattleEvent(`❌ Cannot merge ${itemConfig.name} further - already at maximum level`);
            }
            return;
        }
        
        // Level up item1, remove item2
        item1.level++;
        this.removeItem(item2);
        this.placeItemInSlot(item1, item1.slotIndex);
        
        this.gameState.logBattleEvent(`✨ Merged ${itemConfig.name} to level ${item1.level}!`);
        this.updateActiveBonuses();
        
        // Add dramatic effect for high-level merges
        if (item1.level >= 3) {
            this.createMergeEffect(item1.slotIndex);
        }
    }
    
    transformItem(item1, item2, newType) {
        const oldConfig = this.itemTypes[item1.type];
        const newConfig = this.itemTypes[newType];
        
        // Transform item1, remove item2
        item1.type = newType;
        item1.level = 1;
        this.removeItem(item2);
        this.placeItemInSlot(item1, item1.slotIndex);
        
        this.gameState.logBattleEvent(`🌟 ${oldConfig.name} transformed into ${newConfig.name}!`);
        
        // Trigger Divine Altar achievement
        if (newType === 'altar' && window.achievementSystem) {
            window.achievementSystem.triggerDivineAltar();
            console.log('[Throne] Divine Altar achievement triggered');
        }
        
        this.updateActiveBonuses();
        this.createMergeEffect(item1.slotIndex);
    }
    
    swapItems(item1, item2) {
        const temp = item1.slotIndex;
        item1.slotIndex = item2.slotIndex;
        item2.slotIndex = temp;
        
        this.placeItemInSlot(item1, item1.slotIndex);
        this.placeItemInSlot(item2, item2.slotIndex);
    }
    
    removeItem(item) {
        const index = this.gameState.mergeItems.findIndex(i => i.id === item.id);
        if (index !== -1) {
            this.gameState.mergeItems.splice(index, 1);
        }
        
        const slot = this.mergeGrid.children[item.slotIndex];
        if (slot) {
            slot.innerHTML = '';
        }
    }
    
    getItemInSlot(slotIndex) {
        return this.gameState.mergeItems.find(item => item.slotIndex === slotIndex);
    }
    
    createMergeEffect(slotIndex) {
        const slot = this.mergeGrid.children[slotIndex];
        if (!slot) return;
        
        // Create sparkle effect
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '20px';
        effect.style.color = '#f1c40f';
        effect.style.pointerEvents = 'none';
        effect.style.animation = 'sparkle 1s ease-out';
        effect.textContent = '✨';
        
        slot.style.position = 'relative';
        slot.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.remove();
            }
        }, 1000);
    }
    
    updateActiveBonuses() {
        // Calculate all active bonuses from merge items
        const bonuses = {};
        
        this.gameState.mergeItems.forEach(item => {
            const itemConfig = this.itemTypes[item.type];
            if (itemConfig && itemConfig.bonus) {
                const bonusType = itemConfig.bonus.type;
                const bonusValue = itemConfig.bonus.value * item.level;
                
                if (!bonuses[bonusType]) {
                    bonuses[bonusType] = 0;
                }
                bonuses[bonusType] += bonusValue;
            }
        });
        
        // Store bonuses in game state
        this.gameState.activeBonuses = bonuses;
        
        // Update display
        this.displayActiveBonuses(bonuses);
    }
    
    displayActiveBonuses(bonuses) {
        const bonusesDiv = document.getElementById('active-bonuses');
        if (!bonusesDiv) return;
        
        if (Object.keys(bonuses).length === 0) {
            bonusesDiv.innerHTML = '<p>No bonuses yet - start merging!</p>';
            return;
        }
        
        let bonusHtml = '';
        Object.keys(bonuses).forEach(bonusType => {
            const value = bonuses[bonusType];
            const description = this.getBonusDescription(bonusType, value);
            bonusHtml += `<p style="margin-bottom: 5px; color: #1abc9c;">• ${description}</p>`;
        });
        
        bonusesDiv.innerHTML = bonusHtml;
    }
    
    getBonusDescription(bonusType, value) {
        // Use GameData for resource/production names if available
        const resourceNames = GameData && GameData.resourceNames ? GameData.resourceNames : {};
        const pretty = (key) => resourceNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const percent = (v) => `+${(v * 100).toFixed(1)}%`;
        const descriptions = {
            food_production: `${percent(value)} ${pretty('food')} Production`,
            wood_production: `${percent(value)} ${pretty('wood')} Production`,
            stone_production: `${percent(value)} ${pretty('stone')} Production`,
            all_production: `${percent(value)} All Production`,
            army_attack: `+${value} Army Attack`,
            army_health: `+${value} Army Health`,
            commander_experience: `+${value} Commander XP Gain`,
            gold_generation: `+${value} ${pretty('gold')}/minute`,
            automation_speed: `${percent(value)} Automation Speed`,
            prestige_bonus: `${percent(value)} Prestige Rewards`
        };
        return descriptions[bonusType] || `+${value} ${pretty(bonusType)}`;
    }
    
    // Apply bonuses to game mechanics
    getProductionMultiplier(resourceType) {
        const bonuses = this.gameState.activeBonuses || {};
        let multiplier = 1.0;
        
        if (bonuses.all_production) {
            multiplier += bonuses.all_production;
        }
        
        if (bonuses[`${resourceType}_production`]) {
            multiplier += bonuses[`${resourceType}_production`];
        }
        
        return multiplier;
    }
    
    getArmyBonus(bonusType) {
        const bonuses = this.gameState.activeBonuses || {};
        return bonuses[bonusType] || 0;
    }
    
    // Dynasty Management Methods
    initializeDynasty() {
        // Initialize Royal Family Manager if it doesn't exist
        if (!this.gameState.royalFamily) {
            this.gameState.royalFamily = new RoyalFamilyManager(this.gameState);
            
            // Ruler gets a randomly generated personal name
            this.gameState.royalFamily.initializeRoyalFamily();
            
            console.log('[Throne] Dynasty initialized');
        }
        
        this.setupDynastyTabs();
        this.updateDynastyDisplay();
    }
    
    setupDynastyTabs() {
        // Setup tab switching
        const tabBtns = document.querySelectorAll('.throne-tab-btn');
        const tabs = document.querySelectorAll('.throne-tab');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Remove active class from all tabs and buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked button and corresponding tab
                btn.classList.add('active');
                const tab = document.getElementById(targetTab + '-tab');
                if (tab) {
                    tab.classList.add('active');
                }
                
                // Update content when switching to dynasty tab
                if (targetTab === 'dynasty') {
                    this.updateDynastyDisplay();
                }
                // Update content when switching to equipment tab
                if (targetTab === 'equipment') {
                    this.updateEquipmentDisplay();
                }
            });
        });
        
        // Setup dynasty action buttons
        this.setupDynastyActions();
    }
    
    initializeEquipment() {
        // Equipment initialization will happen when the tab is clicked
        // But we can setup initial event listeners here
        this.setupEquipmentCategoryButtons();
    }
    
    setupDynastyActions() {
        const marriageBtn = document.getElementById('arrange-marriage-btn');
        const tutorBtn = document.getElementById('hire-tutor-btn');
        const successionBtn = document.getElementById('succession-plan-btn');
        
        if (marriageBtn) {
            marriageBtn.addEventListener('click', () => this.showMarriageModal());
        }
        
        if (tutorBtn) {
            tutorBtn.addEventListener('click', () => this.showTutorModal());
        }
        
        if (successionBtn) {
            successionBtn.addEventListener('click', () => this.showSuccessionModal());
        }
    }
    
    updateDynastyDisplay() {
        if (!this.gameState.royalFamily) return;
        
        this.updateMonarchCard();
        this.updateFamilyTree();
        this.updateSuccessionOrder();
        this.updateDynastyStats();
    }
    
    updateMonarchCard() {
        const monarchCard = document.getElementById('current-monarch');
        if (!monarchCard || !this.gameState.royalFamily.currentMonarch) return;
        
        const monarch = this.gameState.royalFamily.currentMonarch;
        
        monarchCard.innerHTML = `
            <div class="monarch-info">
                <div class="monarch-portrait">👑</div>
                <div class="monarch-details">
                    <h4>${monarch.name}</h4>
                    <p>Age: ${monarch.age} years | Reign: ${(this.gameState.day || 0) - monarch.reignStart} days</p>
                </div>
            </div>
            <div class="monarch-stats">
                <div class="stat-item">
                    <div>Leadership</div>
                    <div>${monarch.skills.leadership}</div>
                </div>
                <div class="stat-item">
                    <div>Military</div>
                    <div>${monarch.skills.military}</div>
                </div>
                <div class="stat-item">
                    <div>Diplomacy</div>
                    <div>${monarch.skills.diplomacy}</div>
                </div>
                <div class="stat-item">
                    <div>Economics</div>
                    <div>${monarch.skills.economics}</div>
                </div>
            </div>
            <div class="member-traits">
                ${monarch.traits.map(trait => `<span class="trait-badge">${trait.replace('_', ' ')}</span>`).join('')}
            </div>
        `;
    }
    
    updateFamilyTree() {
        const familyTree = document.getElementById('royal-family-tree');
        if (!familyTree || !this.gameState.royalFamily) return;
        
        const family = this.gameState.royalFamily.royalFamily;
        
        if (family.length <= 1) {
            familyTree.innerHTML = '<p style="color: #bdc3c7; font-style: italic;">No other family members yet. Arrange a marriage to expand the royal line.</p>';
            return;
        }
        
        const familyHtml = family
            .filter(member => member.id !== this.gameState.royalFamily.currentMonarch.id)
            .map(member => this.createFamilyMemberHtml(member))
            .join('');
        
        familyTree.innerHTML = familyHtml;
    }
    
    createFamilyMemberHtml(member) {
        const memberIcon = this.getMemberIcon(member);
        const memberClass = this.getMemberClass(member);
        
        return `
            <div class="family-member ${memberClass}">
                <div class="member-icon">${memberIcon}</div>
                <div class="member-details">
                    <div class="member-name">${member.name}</div>
                    <div class="member-info">
                        ${member.status} • Age: ${member.age}
                        ${member.education ? ` • ${member.education.focus || 'General Education'}` : ''}
                    </div>
                    <div class="member-traits">
                        ${member.traits.map(trait => `<span class="trait-badge">${trait.replace('_', ' ')}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    getMemberIcon(member) {
        switch (member.status) {
            case 'heir': return '👤';
            case 'royal_spouse': return '💒';
            default: return '👥';
        }
    }
    
    getMemberClass(member) {
        switch (member.status) {
            case 'heir': return 'heir';
            case 'royal_spouse': return 'spouse';
            default: return 'child';
        }
    }
    
    updateSuccessionOrder() {
        const successionList = document.getElementById('succession-order');
        if (!successionList || !this.gameState.royalFamily) return;
        
        const succession = this.gameState.royalFamily.successionOrder;
        
        if (succession.length === 0) {
            successionList.innerHTML = '<p style="color: #bdc3c7; font-style: italic;">No eligible heirs. The royal line needs children!</p>';
            return;
        }
        
        const successionHtml = succession.map((heir, index) => `
            <div class="succession-item">
                <div class="succession-rank">${index + 1}</div>
                <div class="member-details">
                    <div class="member-name">${heir.name}</div>
                    <div class="member-info">Age: ${heir.age} • Leadership: ${heir.skills.leadership}</div>
                </div>
            </div>
        `).join('');
        
        successionList.innerHTML = successionHtml;
    }
    
    updateDynastyStats() {
        const statsContainer = document.getElementById('dynasty-stats');
        if (!statsContainer) return;
        
        // Get legacy system stats if available
        const legacyStats = window.legacySystem?.getStats?.() || null;
        
        // Get royal family stats
        let familyStats = { totalFamily: 0, heirs: 0, dynastyAge: 0 };
        if (this.gameState.royalFamily) {
            familyStats = this.gameState.royalFamily.getRoyalFamilyStats();
        }
        
        // Build the stats display
        let statsHtml = `
            <div class="dynasty-stat-group">
                <h4>👑 Current Dynasty</h4>
                <div class="dynasty-stats-row">
                    <div class="dynasty-stat">
                        <div class="dynasty-stat-value">${familyStats.totalFamily}</div>
                        <div class="dynasty-stat-label">Family Members</div>
                    </div>
                    <div class="dynasty-stat">
                        <div class="dynasty-stat-value">${familyStats.heirs}</div>
                        <div class="dynasty-stat-label">Eligible Heirs</div>
                    </div>
                    <div class="dynasty-stat">
                        <div class="dynasty-stat-value">${familyStats.dynastyAge}</div>
                        <div class="dynasty-stat-label">Days of Reign</div>
                    </div>
                    <div class="dynasty-stat">
                        <div class="dynasty-stat-value">${this.gameState.dynastyGeneration || 1}</div>
                        <div class="dynasty-stat-label">Generation</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add legacy system stats if available
        if (legacyStats) {
            statsHtml += `
                <div class="dynasty-stat-group legacy-stats">
                    <h4>🏛️ Legacy</h4>
                    <div class="dynasty-stats-row">
                        <div class="dynasty-stat">
                            <div class="dynasty-stat-value" style="color:#f39c12;">${legacyStats.totalPoints}</div>
                            <div class="dynasty-stat-label">Legacy Points</div>
                        </div>
                        <div class="dynasty-stat">
                            <div class="dynasty-stat-value">${legacyStats.dynastiesCompleted}</div>
                            <div class="dynasty-stat-label">Dynasties Complete</div>
                        </div>
                        <div class="dynasty-stat">
                            <div class="dynasty-stat-value">${legacyStats.highestDay}</div>
                            <div class="dynasty-stat-label">Record: Days</div>
                        </div>
                        <div class="dynasty-stat">
                            <div class="dynasty-stat-value">${legacyStats.highestPopulation}</div>
                            <div class="dynasty-stat-label">Record: Population</div>
                        </div>
                    </div>
            `;
            
            // Show titles if any
            if (legacyStats.titles && legacyStats.titles.length > 0) {
                statsHtml += `
                    <div class="legacy-titles">
                        <h5>🏆 Titles Earned</h5>
                        <div class="title-badges">
                            ${legacyStats.titles.map(t => `<span class="title-badge">${t}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Show active bonuses if any
            const bonuses = legacyStats.bonuses;
            const activeBonuses = Object.entries(bonuses).filter(([k, v]) => v > 0);
            if (activeBonuses.length > 0) {
                statsHtml += `
                    <div class="legacy-bonuses">
                        <h5>✨ Active Bonuses</h5>
                        <ul class="bonus-list">
                            ${activeBonuses.map(([key, val]) => `<li>${this.formatBonusName(key)}: +${val}${key.includes('Bonus') ? '%' : ''}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // Add End Dynasty button
            statsHtml += `
                </div>
                <div class="dynasty-actions" style="margin-top: 20px; text-align: center;">
                    <button id="end-dynasty-btn" class="dynasty-btn danger" onclick="window.legacySystem?.showEndDynastyModal(window.gameState, localStorage.getItem('dynastyName') || 'Your Dynasty')">
                        🔄 End Dynasty (Prestige)
                    </button>
                    <p style="font-size: 0.85em; color: #7f8c8d; margin-top: 8px;">
                        End your current dynasty to earn legacy points and start fresh with bonuses
                    </p>
                </div>
            `;
        } else {
            // No legacy system available
            statsHtml += `
                <div class="dynasty-stat-group">
                    <p style="color: #7f8c8d; text-align: center;">
                        Legacy system will unlock after your first dynasty completion
                    </p>
                </div>
            `;
        }
        
        statsContainer.innerHTML = statsHtml;
    }
    
    // Helper to format bonus names nicely
    formatBonusName(key) {
        const names = {
            startingGold: 'Starting Gold',
            startingFood: 'Starting Food',
            startingPopulation: 'Starting Population',
            productionBonus: 'Production',
            buildSpeedBonus: 'Build Speed',
            combatBonus: 'Combat',
            explorationBonus: 'Exploration'
        };
        return names[key] || key;
    }
    
    showMarriageModal() {
        if (!window.modalSystem) return;
        
        const marriageCandidates = this.generateMarriageCandidates();
        
        const candidateHtml = marriageCandidates.map(candidate => `
            <div class="candidate-card" style="
                background: rgba(255,255,255,0.1); 
                padding: 1rem; 
                margin: 0.5rem 0; 
                border-radius: 6px;
                cursor: pointer;
                border: 2px solid transparent;
            " onmouseover="this.style.borderColor='#1abc9c'" onmouseout="this.style.borderColor='transparent'"
               onclick="window.game.throneManager.arrangeMarriage('${candidate.id}')">
                <h4>${candidate.name}</h4>
                <p>Age: ${candidate.age} • Origin: ${candidate.origin}</p>
                <p>Traits: ${candidate.traits.join(', ') || 'None'}</p>
                <p style="color: #1abc9c;">Click to arrange marriage</p>
            </div>
        `).join('');
        
        window.modalSystem.showModal({
            title: '💒 Arrange Royal Marriage',
            content: `
                <div style="max-height: 400px; overflow-y: auto;">
                    <p>Select a suitable marriage partner for the royal family:</p>
                    ${candidateHtml}
                </div>
            `,
            width: '500px'
        });
    }
    
    generateMarriageCandidates() {
        // Generate random marriage candidates
        const candidates = [];
        const names = ['Lady Eleanor', 'Lord William', 'Duchess Margaret', 'Duke Henry', 'Lady Catherine', 'Lord Richard'];
        const origins = ['Local Nobility', 'Foreign Royalty', 'Distinguished Military', 'Wealthy Merchant Family'];
        
        for (let i = 0; i < 3; i++) {
            candidates.push({
                id: `candidate_${Date.now()}_${i}`,
                name: names[Math.floor(Math.random() * names.length)],
                age: 20 + Math.floor(Math.random() * 15),
                origin: origins[Math.floor(Math.random() * origins.length)],
                traits: this.generateRandomTraits()
            });
        }
        
        return candidates;
    }
    
    generateRandomTraits() {
        const allTraits = ['intelligent', 'charismatic', 'strong', 'wise', 'cunning', 'healthy'];
        const numTraits = Math.floor(Math.random() * 3);
        const traits = [];
        
        for (let i = 0; i < numTraits; i++) {
            const trait = allTraits[Math.floor(Math.random() * allTraits.length)];
            if (!traits.includes(trait)) {
                traits.push(trait);
            }
        }
        
        return traits;
    }
    
    arrangeMarriage(candidateId) {
        if (!this.gameState.royalFamily) return;
        
        // Close the modal
        if (window.modalSystem) {
            window.modalSystem.closeTopModal();
        }
        
        // Find available royal family member to marry
        const availableRoyals = this.gameState.royalFamily.royalFamily.filter(
            member => !member.spouse && member.age >= 18 && member.age <= 45
        );
        
        if (availableRoyals.length === 0) {
            if (window.showToast) {
                window.showToast('No eligible royal family members for marriage', {
                    icon: '💔',
                    type: 'error'
                });
            }
            return;
        }
        
        // Use the first available royal (could be enhanced to let player choose)
        const royal = availableRoyals[0];
        
        // Create spouse data
        const spouseData = {
            name: `Spouse of ${royal.name}`,
            age: royal.age + Math.floor(Math.random() * 6) - 3,
            origin: 'arranged_marriage'
        };
        
        // Arrange the marriage
        const success = this.gameState.royalFamily.arrangeMarriage(royal.id, spouseData);
        
        if (success) {
            this.updateDynastyDisplay();
            
            if (window.showToast) {
                window.showToast(`${royal.name} has married! The royal line grows stronger.`, {
                    icon: '💒',
                    type: 'success'
                });
            }
        }
    }
    
    showTutorModal() {
        if (window.showToast) {
            window.showToast('Tutor system coming in future updates!', {
                icon: '🎓',
                type: 'info'
            });
        }
    }
    
    showSuccessionModal() {
        if (!this.gameState.royalFamily) return;
        
        const succession = this.gameState.royalFamily.successionOrder;
        
        const successionHtml = succession.length > 0 
            ? succession.map((heir, index) => `
                <div style="background: rgba(241,196,15,0.1); padding: 1rem; margin: 0.5rem 0; border-radius: 6px;">
                    <h4>${index + 1}. ${heir.name}</h4>
                    <p>Age: ${heir.age} • Leadership: ${heir.skills.leadership}</p>
                    <p>Traits: ${heir.traits.join(', ') || 'None'}</p>
                </div>
            `).join('')
            : '<p style="color: #888; font-style: italic;">No eligible heirs in the succession line.</p>';
        
        if (window.modalSystem) {
            window.modalSystem.showModal({
                title: '📜 Line of Succession',
                content: `
                    <p>Current order of royal succession:</p>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${successionHtml}
                    </div>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: #bdc3c7;">
                        <strong>Note:</strong> Succession order is based on age and legitimacy. 
                        Only heirs aged 16+ are eligible to rule.
                    </p>
                `,
                width: '450px'
            });
        }
    }
    
    // Equipment methods (DEPRECATED - inventory system removed)
    updateEquipmentDisplay() {
        console.warn('[Throne] Inventory system removed');
        this.updateRoyalEquipment();
    }
    
    updateRoyalEquipment() {
        const royalEquipmentDiv = document.getElementById('royal-equipment');
        if (!royalEquipmentDiv) return;
        
        royalEquipmentDiv.innerHTML = '<p class="empty-slot">Equipment system has been removed.</p>';
    }
    
    setupEquipmentCategoryButtons() {
        // No-op - inventory removed
    }
    
    updateEquipmentList(category) {
        const equipmentListDiv = document.getElementById('equipment-list');
        if (!equipmentListDiv) return;
        
        equipmentListDiv.innerHTML = '<p class="no-items">Equipment system has been removed.</p>';
    }
    
    equipItem(itemId) {
        console.warn('[Throne] Inventory system removed');
    }
    
    unequipItem(slotType) {
        console.warn('[Throne] Inventory system removed');
    }
}

// Make ThroneManager globally available
window.ThroneManager = ThroneManager;

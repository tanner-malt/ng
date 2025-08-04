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
        this.mergeGrid = document.getElementById('merge-grid');
        if (!this.mergeGrid) {
            console.warn('[Throne] merge-grid element not found, skipping throne initialization');
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
}

// Make ThroneManager globally available
window.ThroneManager = ThroneManager;

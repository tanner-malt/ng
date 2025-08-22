// Inventory System
// Manages war gear, tools, magical artifacts, and other items

class InventoryManager {
    constructor(gameState, skipDefaults = false) {
        this.gameState = gameState;
        this.inventory = new Map(); // item_id -> { item, quantity, metadata }
        this.equippedItems = new Map(); // slot -> item_id
        this.itemDefinitions = this.initializeItemDefinitions();
        
        // Add default items if inventory is empty and not skipping defaults
        if (!skipDefaults && this.inventory.size === 0) {
            this.addDefaultItems();
        }
    }

        // Add default starter items
    addDefaultItems() {
        console.log('[Inventory] Adding default starter items');
        
                // Initialize default items
        this.addItem('tent', 2); // For building placement - reduced from 5
        this.addItem('foundersWagon', 1); // Mobile administrative center
        this.addItem('haste_rune_iii', 2); // For productivity acceleration
        
        // Add some basic starter gear
        this.addItem('iron_sword', 1);
        this.addItem('leather_armor', 1);
        this.addItem('wooden_shield', 1);
        
        console.log('[Inventory] Default items added successfully');
    }

    // Initialize all item definitions
    initializeItemDefinitions() {
        return {
            // WAR GEAR
            weapons: {
                iron_sword: {
                    id: 'iron_sword',
                    name: 'Iron Sword',
                    category: 'weapon',
                    subcategory: 'melee',
                    icon: '⚔️',
                    rarity: 'common',
                    description: 'A sturdy iron blade forged for battle',
                    stats: { attack: 15, durability: 100 },
                    requirements: { level: 1 },
                    craftable: true,
                    craftCost: { metal: 20, wood: 5 }
                },
                steel_sword: {
                    id: 'steel_sword',
                    name: 'Steel Sword',
                    category: 'weapon',
                    subcategory: 'melee',
                    icon: '⚔️',
                    rarity: 'uncommon',
                    description: 'A superior steel blade with excellent balance',
                    stats: { attack: 25, durability: 150 },
                    requirements: { level: 5 },
                    craftable: true,
                    craftCost: { metal: 50, gold: 10 }
                },
                enchanted_blade: {
                    id: 'enchanted_blade',
                    name: 'Enchanted Blade',
                    category: 'weapon',
                    subcategory: 'melee',
                    icon: '✨⚔️',
                    rarity: 'rare',
                    description: 'A magical sword crackling with arcane energy',
                    stats: { attack: 40, durability: 200, magicAttack: 15 },
                    requirements: { level: 10, magicSkill: 5 },
                    enchantments: ['flame_touch', 'mana_drain'],
                    craftable: false
                },
                war_hammer: {
                    id: 'war_hammer',
                    name: 'War Hammer',
                    category: 'weapon',
                    subcategory: 'melee',
                    icon: '🔨',
                    rarity: 'uncommon',
                    description: 'A heavy hammer that crushes armor',
                    stats: { attack: 30, durability: 120, armorPiercing: 10 },
                    requirements: { level: 7, strength: 15 },
                    craftable: true,
                    craftCost: { metal: 40, stone: 15 }
                },
                longbow: {
                    id: 'longbow',
                    name: 'Longbow',
                    category: 'weapon',
                    subcategory: 'ranged',
                    icon: '🏹',
                    rarity: 'common',
                    description: 'A well-crafted bow for long-range combat',
                    stats: { rangedAttack: 20, durability: 80, range: 150 },
                    requirements: { level: 3, dexterity: 10 },
                    craftable: true,
                    craftCost: { wood: 30, string: 5 }
                },
                crossbow: {
                    id: 'crossbow',
                    name: 'Crossbow',
                    category: 'weapon',
                    subcategory: 'ranged',
                    icon: '🏹',
                    rarity: 'uncommon',
                    description: 'A mechanical bow with devastating power',
                    stats: { rangedAttack: 35, durability: 100, accuracy: 15 },
                    requirements: { level: 6 },
                    craftable: true,
                    craftCost: { wood: 25, metal: 15, string: 3 }
                }
            },
            
            armor: {
                leather_armor: {
                    id: 'leather_armor',
                    name: 'Leather Armor',
                    category: 'armor',
                    subcategory: 'light',
                    icon: '🥼',
                    rarity: 'common',
                    description: 'Basic protection made from tanned hides',
                    stats: { defense: 8, durability: 80, mobility: 5 },
                    requirements: { level: 1 },
                    craftable: true,
                    craftCost: { leather: 15, string: 3 }
                },
                chainmail: {
                    id: 'chainmail',
                    name: 'Chainmail',
                    category: 'armor',
                    subcategory: 'medium',
                    icon: '🥽',
                    rarity: 'uncommon',
                    description: 'Interlocked metal rings providing good protection',
                    stats: { defense: 18, durability: 120, weight: 20 },
                    requirements: { level: 4 },
                    craftable: true,
                    craftCost: { metal: 40, string: 5 }
                },
                plate_armor: {
                    id: 'plate_armor',
                    name: 'Plate Armor',
                    category: 'armor',
                    subcategory: 'heavy',
                    icon: '🛡️',
                    rarity: 'rare',
                    description: 'Full body protection of forged steel plates',
                    stats: { defense: 35, durability: 180, weight: 40, prestige: 10 },
                    requirements: { level: 8, strength: 20 },
                    craftable: true,
                    craftCost: { metal: 80, gold: 20 }
                },
                dragon_scale_armor: {
                    id: 'dragon_scale_armor',
                    name: 'Dragon Scale Armor',
                    category: 'armor',
                    subcategory: 'legendary',
                    icon: '🐲🛡️',
                    rarity: 'legendary',
                    description: 'Armor crafted from the scales of an ancient dragon',
                    stats: { defense: 50, durability: 300, fireResistance: 75, prestige: 25 },
                    requirements: { level: 15 },
                    enchantments: ['fire_immunity', 'fear_aura'],
                    craftable: false
                }
            },

            shields: {
                wooden_shield: {
                    id: 'wooden_shield',
                    name: 'Wooden Shield',
                    category: 'shield',
                    icon: '🛡️',
                    rarity: 'common',
                    description: 'A simple shield made from hardwood',
                    stats: { defense: 5, durability: 60, blockChance: 15 },
                    requirements: { level: 1 },
                    craftable: true,
                    craftCost: { wood: 20, metal: 5 }
                },
                iron_shield: {
                    id: 'iron_shield',
                    name: 'Iron Shield',
                    category: 'shield',
                    icon: '🛡️',
                    rarity: 'uncommon',
                    description: 'A reinforced shield with iron boss and rim',
                    stats: { defense: 12, durability: 100, blockChance: 25 },
                    requirements: { level: 4 },
                    craftable: true,
                    craftCost: { wood: 15, metal: 25 }
                },
                tower_shield: {
                    id: 'tower_shield',
                    name: 'Tower Shield',
                    category: 'shield',
                    icon: '🛡️',
                    rarity: 'rare',
                    description: 'A massive shield that provides excellent protection',
                    stats: { defense: 20, durability: 150, blockChance: 40, weight: 15 },
                    requirements: { level: 7, strength: 18 },
                    craftable: true,
                    craftCost: { wood: 30, metal: 40, leather: 10 }
                }
            },

            // TOOLS
            tools: {
                iron_pickaxe: {
                    id: 'iron_pickaxe',
                    name: 'Iron Pickaxe',
                    category: 'tool',
                    subcategory: 'mining',
                    icon: '⛏️',
                    rarity: 'common',
                    description: 'A reliable pickaxe for mining stone and ore',
                    stats: { miningPower: 15, durability: 100, efficiency: 10 },
                    requirements: { miningSkill: 1 },
                    craftable: true,
                    craftCost: { metal: 15, wood: 10 }
                },
                steel_pickaxe: {
                    id: 'steel_pickaxe',
                    name: 'Steel Pickaxe',
                    category: 'tool',
                    subcategory: 'mining',
                    icon: '⛏️',
                    rarity: 'uncommon',
                    description: 'A superior pickaxe that mines faster and lasts longer',
                    stats: { miningPower: 25, durability: 150, efficiency: 20 },
                    requirements: { miningSkill: 5 },
                    craftable: true,
                    craftCost: { metal: 30, wood: 15, gold: 5 }
                },
                enchanted_pickaxe: {
                    id: 'enchanted_pickaxe',
                    name: 'Enchanted Pickaxe',
                    category: 'tool',
                    subcategory: 'mining',
                    icon: '✨⛏️',
                    rarity: 'rare',
                    description: 'A magical pickaxe that never dulls and finds rare ores',
                    stats: { miningPower: 40, durability: 999, efficiency: 35, oreBonus: 25 },
                    requirements: { miningSkill: 10 },
                    enchantments: ['auto_repair', 'ore_sense'],
                    craftable: false
                },
                iron_axe: {
                    id: 'iron_axe',
                    name: 'Iron Axe',
                    category: 'tool',
                    subcategory: 'woodcutting',
                    icon: '🪓',
                    rarity: 'common',
                    description: 'A sharp axe for felling trees efficiently',
                    stats: { woodcuttingPower: 18, durability: 90, speed: 12 },
                    requirements: { woodcuttingSkill: 1 },
                    craftable: true,
                    craftCost: { metal: 12, wood: 15 }
                },
                masterwork_hammer: {
                    id: 'masterwork_hammer',
                    name: 'Masterwork Hammer',
                    category: 'tool',
                    subcategory: 'crafting',
                    icon: '🔨',
                    rarity: 'rare',
                    description: 'A perfectly balanced hammer for fine craftsmanship',
                    stats: { craftingPower: 30, durability: 200, quality: 25 },
                    requirements: { craftingSkill: 8 },
                    craftable: true,
                    craftCost: { metal: 40, wood: 20, gold: 15 }
                }
            },

            // MAGICAL ARTIFACTS
            magical: {
                haste_rune: {
                    id: 'haste_rune',
                    name: 'Haste Rune',
                    category: 'consumable',
                    subcategory: 'rune',
                    icon: '⚡',
                    rarity: 'common',
                    description: 'A magical rune that boosts productivity by 2x for selected job',
                    effects: { productivityMultiplier: 2 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    targetable: true, // Can target specific jobs
                    craftable: true,
                    craftCost: { arcaneEssence: 3, stone: 5 }
                },
                haste_rune_ii: {
                    id: 'haste_rune_ii',
                    name: 'Haste Rune II',
                    category: 'consumable',
                    subcategory: 'rune',
                    icon: '⚡⚡',
                    rarity: 'uncommon',
                    description: 'An enhanced magical rune that boosts productivity by 3x for selected job',
                    effects: { productivityMultiplier: 3 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    targetable: true, // Can target specific jobs
                    craftable: true,
                    craftCost: { arcaneEssence: 8, stone: 10, gold: 5 }
                },
                haste_rune_iii: {
                    id: 'haste_rune_iii',
                    name: 'Haste Rune III',
                    category: 'consumable',
                    subcategory: 'rune',
                    icon: '⚡⚡⚡',
                    rarity: 'rare',
                    description: 'A powerful magical rune that boosts productivity by 4x for selected job',
                    effects: { productivityMultiplier: 4 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    targetable: true, // Can target specific jobs
                    craftable: true,
                    craftCost: { arcaneEssence: 15, stone: 20, gold: 15 }
                },
                runes_of_haste: {
                    id: 'runes_of_haste',
                    name: 'Runes of Haste',
                    category: 'magical',
                    subcategory: 'rune',
                    icon: '🔮',
                    rarity: 'uncommon',
                    description: 'Magical runes that accelerate construction and crafting',
                    stats: { speedBonus: 50, duration: 7 },
                    consumable: true,
                    stackable: true,
                    maxStack: 10,
                    craftable: true,
                    craftCost: { arcaneEssence: 5, stone: 10 }
                },
                crystal_of_vision: {
                    id: 'crystal_of_vision',
                    name: 'Crystal of Vision',
                    category: 'magical',
                    subcategory: 'crystal',
                    icon: '🔮',
                    rarity: 'rare',
                    description: 'A mystical crystal that reveals hidden resources',
                    stats: { scouting: 50, manaRegen: 5 },
                    requirements: { magicSkill: 5 },
                    craftable: false
                },
                tome_of_knowledge: {
                    id: 'tome_of_knowledge',
                    name: 'Tome of Knowledge',
                    category: 'magical',
                    subcategory: 'book',
                    icon: '📚',
                    rarity: 'rare',
                    description: 'An ancient tome filled with forgotten wisdom',
                    stats: { experienceBonus: 25, skillGain: 15 },
                    requirements: { intelligence: 15 },
                    craftable: false
                },
                staff_of_elements: {
                    id: 'staff_of_elements',
                    name: 'Staff of Elements',
                    category: 'magical',
                    subcategory: 'staff',
                    icon: '🪄',
                    rarity: 'legendary',
                    description: 'A powerful staff that commands fire, ice, and lightning',
                    stats: { magicAttack: 60, manaBonus: 100, spellPower: 40 },
                    requirements: { magicSkill: 15, level: 12 },
                    enchantments: ['elemental_mastery', 'mana_overflow'],
                    craftable: false
                },
                amulet_of_protection: {
                    id: 'amulet_of_protection',
                    name: 'Amulet of Protection',
                    category: 'magical',
                    subcategory: 'accessory',
                    icon: '🔱',
                    rarity: 'uncommon',
                    description: 'A blessed amulet that wards off harm',
                    stats: { magicDefense: 15, luckBonus: 10 },
                    requirements: { level: 3 },
                    craftable: true,
                    craftCost: { gold: 25, arcaneEssence: 3 }
                },
                ring_of_power: {
                    id: 'ring_of_power',
                    name: 'Ring of Power',
                    category: 'magical',
                    subcategory: 'accessory',
                    icon: '💍',
                    rarity: 'legendary',
                    description: 'A ring that amplifies the wearer\'s inner strength',
                    stats: { allStats: 10, leadership: 25, charisma: 20 },
                    requirements: { level: 20 },
                    enchantments: ['stat_amplify', 'aura_of_command'],
                    craftable: false
                }
            },

            // CONSUMABLES
            consumables: {
                health_potion: {
                    id: 'health_potion',
                    name: 'Health Potion',
                    category: 'consumable',
                    subcategory: 'potion',
                    icon: '🧪',
                    rarity: 'common',
                    description: 'A red potion that restores health',
                    effects: { healHealth: 50 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    craftable: true,
                    craftCost: { herbs: 5, water: 2 }
                },
                mana_potion: {
                    id: 'mana_potion',
                    name: 'Mana Potion',
                    category: 'consumable',
                    subcategory: 'potion',
                    icon: '🧪',
                    rarity: 'common',
                    description: 'A blue potion that restores magical energy',
                    effects: { restoreMana: 30 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    craftable: true,
                    craftCost: { arcaneEssence: 3, water: 2 }
                },
                strength_elixir: {
                    id: 'strength_elixir',
                    name: 'Strength Elixir',
                    category: 'consumable',
                    subcategory: 'elixir',
                    icon: '💪',
                    rarity: 'uncommon',
                    description: 'An elixir that temporarily increases physical power',
                    effects: { strengthBonus: 5, duration: 24 },
                    consumable: true,
                    stackable: true,
                    maxStack: 10,
                    craftable: true,
                    craftCost: { herbs: 10, gold: 5 }
                },
                energy_potion: {
                    id: 'energy_potion',
                    name: 'Energy Potion',
                    category: 'consumable',
                    subcategory: 'potion',
                    icon: '⚡',
                    rarity: 'common',
                    description: 'A yellow potion that restores energy and stamina',
                    effects: { restoreEnergy: 40 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    craftable: true,
                    craftCost: { herbs: 3, water: 2 }
                },
                crystal_shard: {
                    id: 'crystal_shard',
                    name: 'Crystal Shard',
                    category: 'material',
                    subcategory: 'magical',
                    icon: '💎',
                    rarity: 'uncommon',
                    description: 'A glowing crystal shard containing magical energy',
                    effects: { magicalPower: 2 },
                    consumable: false,
                    stackable: true,
                    maxStack: 50,
                    craftable: false
                },
                rune_of_haste: {
                    id: 'rune_of_haste',
                    name: 'Rune of Haste',
                    category: 'magical',
                    subcategory: 'rune',
                    icon: '🏃',
                    rarity: 'rare',
                    description: 'A magical rune that accelerates construction work',
                    effects: { constructionSpeedBonus: 50, duration: 60 },
                    consumable: true,
                    stackable: true,
                    maxStack: 10,
                    craftable: true,
                    craftCost: { crystal_shard: 3, gold: 20 }
                },
                haste_rune: {
                    id: 'haste_rune',
                    name: 'Haste Rune',
                    category: 'magical',
                    subcategory: 'rune',
                    icon: '⚡',
                    rarity: 'uncommon',
                    description: 'A magical rune that speeds up construction and crafting',
                    effects: { constructionSpeedBonus: 25, craftingSpeedBonus: 25, duration: 30 },
                    consumable: true,
                    stackable: true,
                    maxStack: 20,
                    craftable: true,
                    craftCost: { crystal_shard: 1, gold: 10 }
                }
            },

            // BUILDING ITEMS
            buildings: {
                tent: {
                    id: 'tent',
                    name: 'Tent',
                    category: 'building',
                    subcategory: 'shelter',
                    icon: '🏕️',
                    rarity: 'common',
                    description: 'A portable shelter that provides 4 housing and worker jobs',
                    effects: { housing: 4, builderJobs: 2 },
                    consumable: true, // Used when placed
                    stackable: true,
                    maxStack: 50,
                    craftable: true,
                    craftCost: { wood: 10, fabric: 5 },
                    placeable: true, // Can be placed as building
                    buildingType: 'tent'
                },
                foundersWagon: {
                    id: 'foundersWagon',
                    name: 'Founder Wagon',
                    category: 'building',
                    subcategory: 'administration',
                    icon: '🚛',
                    rarity: 'rare',
                    description: 'Mobile command center and storage facility for new settlements',
                    effects: { housing: 3, gathererJobs: 2, crafterJobs: 1, storage: 300 },
                    consumable: true, // Used when placed
                    stackable: true,
                    maxStack: 5,
                    craftable: false,
                    placeable: true, // Can be placed as building
                    buildingType: 'foundersWagon'
                }
            }
        };
    }

    // Add item to inventory
    addItem(itemId, quantity = 1, metadata = {}) {
        const itemDef = this.getItemDefinition(itemId);
        if (!itemDef) {
            console.error('[Inventory] Unknown item:', itemId);
            return false;
        }

        const existingItem = this.inventory.get(itemId);
        
        if (existingItem && itemDef.stackable) {
            // Stack with existing item
            const maxStack = itemDef.maxStack || 99;
            const canStack = Math.min(quantity, maxStack - existingItem.quantity);
            existingItem.quantity += canStack;
            
            console.log(`[Inventory] Added ${canStack} ${itemDef.name} (now ${existingItem.quantity})`);
            
            // Return remaining quantity that couldn't be stacked
            return quantity - canStack;
        } else {
            // Add new item
            this.inventory.set(itemId, {
                item: itemDef,
                quantity: quantity,
                metadata: {
                    ...metadata,
                    acquiredDate: this.gameState.currentDay,
                    durability: itemDef.stats?.durability || null
                }
            });
            
            console.log(`[Inventory] Added ${quantity} ${itemDef.name}`);
            return 0;
        }
    }

    // Remove item from inventory
    removeItem(itemId, quantity = 1) {
        const existingItem = this.inventory.get(itemId);
        if (!existingItem) {
            console.warn('[Inventory] Item not found:', itemId);
            return false;
        }

        if (existingItem.quantity <= quantity) {
            // Remove entire stack
            this.inventory.delete(itemId);
            console.log(`[Inventory] Removed all ${existingItem.item.name}`);
        } else {
            // Reduce quantity
            existingItem.quantity -= quantity;
            console.log(`[Inventory] Removed ${quantity} ${existingItem.item.name} (${existingItem.quantity} remaining)`);
        }

        return true;
    }

    // Check if player has item
    hasItem(itemId, quantity = 1) {
        const existingItem = this.inventory.get(itemId);
        return existingItem && existingItem.quantity >= quantity;
    }

    // Get item definition
    getItemDefinition(itemId) {
        // Search through all categories
        for (const category of Object.values(this.itemDefinitions)) {
            if (category[itemId]) {
                return category[itemId];
            }
        }
        return null;
    }

    // Get all items in inventory
    getAllItems() {
        const items = {};
        this.inventory.forEach((data, itemId) => {
            items[itemId] = data;
        });
        return items;
    }

    // Get items by category
    getItemsByCategory(category) {
        const items = {};
        this.inventory.forEach((data, itemId) => {
            if (data.item.category === category) {
                items[itemId] = data;
            }
        });
        return items;
    }

    // Equip item to slot
    equipItem(itemId, slot) {
        const item = this.inventory.get(itemId);
        if (!item) {
            console.warn('[Inventory] Cannot equip - item not in inventory:', itemId);
            return false;
        }

        // Auto-determine slot if not provided
        if (!slot) {
            slot = this.getItemSlot(item.item);
            if (!slot) {
                console.warn('[Inventory] Cannot determine slot for item:', itemId);
                return false;
            }
        }

        // Check requirements
        if (!this.meetsRequirements(item.item)) {
            console.warn('[Inventory] Does not meet requirements to equip:', itemId);
            return false;
        }

        // Unequip current item in slot
        const currentEquipped = this.equippedItems.get(slot);
        if (currentEquipped) {
            this.unequipItem(slot);
        }

        // Equip new item
        this.equippedItems.set(slot, itemId);
        console.log(`[Inventory] Equipped ${item.item.name} to ${slot}`);
        
        // Apply item effects
        this.applyItemEffects(item.item, true);
        
        return true;
    }

    // Determine which slot an item should go in
    getItemSlot(item) {
        // Haste runes should not be equipped - they target buildings
        if (item.subcategory === 'rune' && item.effects && item.effects.productivityMultiplier) {
            return null; // Cannot be equipped to slots
        }

        switch(item.category) {
            case 'weapon':
                return 'weapon';
            case 'armor':
                return 'armor';
            case 'shield':
                return 'shield';
            case 'tool':
                return 'tool';
            case 'magical':
                if (item.subcategory === 'accessory') {
                    return 'accessory';
                }
                return 'magical';
            default:
                return null;
        }
    }

    // Unequip item from slot
    unequipItem(slot) {
        const itemId = this.equippedItems.get(slot);
        if (!itemId) return false;

        const item = this.inventory.get(itemId);
        if (item) {
            // Remove item effects
            this.applyItemEffects(item.item, false);
        }

        this.equippedItems.delete(slot);
        console.log(`[Inventory] Unequipped item from ${slot}`);
        return true;
    }

    // Check if player meets item requirements
    meetsRequirements(itemDef) {
        if (!itemDef.requirements) return true;

        const reqs = itemDef.requirements;
        const player = this.gameState.player || {};

        // Check level requirement
        if (reqs.level && (player.level || 1) < reqs.level) {
            return false;
        }

        // Check skill requirements
        if (reqs.magicSkill && (player.skills?.magic || 0) < reqs.magicSkill) {
            return false;
        }

        // Check stat requirements
        if (reqs.strength && (player.stats?.strength || 10) < reqs.strength) {
            return false;
        }

        return true;
    }

    // Apply or remove item effects
    applyItemEffects(itemDef, apply = true) {
        if (!itemDef.stats) return;

        const player = this.gameState.player || {};
        const multiplier = apply ? 1 : -1;

        // Apply stat bonuses
        Object.entries(itemDef.stats).forEach(([stat, value]) => {
            if (typeof value === 'number') {
                player.stats = player.stats || {};
                player.stats[stat] = (player.stats[stat] || 0) + (value * multiplier);
            }
        });

        console.log(`[Inventory] ${apply ? 'Applied' : 'Removed'} effects for ${itemDef.name}`);
    }

    // Use consumable item
    useItem(itemId) {
        const item = this.inventory.get(itemId);
        if (!item || !item.item.consumable) {
            console.warn('[Inventory] Item cannot be used:', itemId);
            return false;
        }

        // Apply effects
        if (item.item.effects) {
            Object.entries(item.item.effects).forEach(([effect, value]) => {
                this.applyConsumableEffect(effect, value);
            });
        }

        // Remove one from inventory
        this.removeItem(itemId, 1);
        
        console.log(`[Inventory] Used ${item.item.name}`);
        return true;
    }

    // Apply consumable effects
    applyConsumableEffect(effect, value) {
        const player = this.gameState.player || {};

        switch(effect) {
            case 'healHealth':
                player.health = Math.min((player.maxHealth || 100), (player.health || 100) + value);
                break;
            case 'restoreMana':
                player.mana = Math.min((player.maxMana || 50), (player.mana || 50) + value);
                break;
            case 'strengthBonus':
                // Apply temporary effect (would need timer system)
                player.tempEffects = player.tempEffects || {};
                player.tempEffects.strength = (player.tempEffects.strength || 0) + value;
                break;
        }
    }

    // Get all items in inventory format expected by UI
    getInventory() {
        const inventoryArray = [];
        
        for (const [itemId, data] of this.inventory) {
            inventoryArray.push({
                id: itemId,
                name: data.item.name,
                category: data.item.category,
                rarity: data.item.rarity,
                description: data.item.description,
                quantity: data.quantity,
                effects: data.item.effects || data.item.stats,
                requirements: data.item.requirements,
                craftingCost: data.item.craftCost || data.item.craftingCost
            });
        }
        
        return inventoryArray;
    }

    // Get currently equipped items
    getEquippedItems() {
        const equipped = {};
        
        for (const [slot, itemId] of this.equippedItems) {
            const itemData = this.inventory.get(itemId);
            if (itemData) {
                equipped[slot] = {
                    id: itemId,
                    name: itemData.item.name,
                    category: itemData.item.category,
                    rarity: itemData.item.rarity,
                    description: itemData.item.description,
                    effects: itemData.item.effects || itemData.item.stats
                };
            }
        }
        
        return equipped;
    }

    // Get item by ID (for item details modal)
    getItemById(itemId) {
        const itemData = this.inventory.get(itemId);
        if (itemData) {
            return {
                id: itemId,
                name: itemData.item.name,
                category: itemData.item.category,
                rarity: itemData.item.rarity,
                description: itemData.item.description,
                quantity: itemData.quantity,
                effects: itemData.item.effects || itemData.item.stats,
                requirements: itemData.item.requirements,
                craftingCost: itemData.item.craftCost || itemData.item.craftingCost
            };
        }
        return null;
    }

    // Get inventory statistics
    getInventoryStats() {
        let totalItems = 0;
        let totalValue = 0;
        const categoryCount = {};

        this.inventory.forEach((data, itemId) => {
            totalItems += data.quantity;
            categoryCount[data.item.category] = (categoryCount[data.item.category] || 0) + data.quantity;
            
            // Calculate value based on crafting cost or rarity
            const itemValue = this.calculateItemValue(data.item);
            totalValue += itemValue * data.quantity;
        });

        return {
            totalItems,
            totalValue,
            categoryCount,
            equippedItems: this.equippedItems.size
        };
    }

    // Calculate item value
    calculateItemValue(itemDef) {
        if (itemDef.craftCost) {
            return Object.values(itemDef.craftCost).reduce((sum, cost) => sum + cost, 0);
        }
        
        // Base value by rarity
        const rarityValues = {
            common: 10,
            uncommon: 25,
            rare: 50,
            legendary: 100
        };
        
        return rarityValues[itemDef.rarity] || 10;
    }

    // Place a building item from inventory
    placeBuilding(itemId, x = null, y = null) {
        const item = this.inventory.get(itemId);
        if (!item || !item.item.placeable) {
            console.warn('[Inventory] Item cannot be placed as building:', itemId);
            return false;
        }

        // Check if we have the item
        if (!this.hasItem(itemId, 1)) {
            console.warn('[Inventory] Not enough items to place:', itemId);
            return false;
        }

        // Fallback: add to gameState buildings list and consume item
        if (this.gameState && this.gameState.buildings) {
            const building = {
                id: Date.now() + Math.random(),
                type: item.item.buildingType,
                level: 1,
                built: true,
                x: x,
                y: y
            };
            
            this.gameState.buildings.push(building);
            this.removeItem(itemId, 1);
            
            console.log('[Inventory] Building added to gameState:', building);
            return true;
        }

        console.warn('[Inventory] Unable to place building - no placement system available');
        return false;
    }

    // Check if item can be placed as building
    canPlaceBuilding(itemId) {
        const item = this.inventory.get(itemId);
        return item && item.item.placeable && item.item.buildingType;
    }

    // Serialize for unified save system
    serialize() {
        return {
            version: '1.0',
            inventory: Array.from(this.inventory.entries()),
            equippedItems: Array.from(this.equippedItems.entries())
        };
    }

    // Deserialize from unified save system
    deserialize(data) {
        if (!data || !data.inventory) {
            console.warn('[InventoryManager] Invalid save data format');
            return false;
        }

        try {
            // Restore inventory
            this.inventory = new Map(data.inventory);
            
            // Migration: Rename cityWagon to foundersWagon if it exists
            if (this.inventory.has('cityWagon')) {
                const cityWagonData = this.inventory.get('cityWagon');
                this.inventory.set('foundersWagon', cityWagonData);
                this.inventory.delete('cityWagon');
                console.log('[InventoryManager] Migrated cityWagon to foundersWagon');
            }
            
            // Restore equipped items
            if (data.equippedItems) {
                this.equippedItems = new Map(data.equippedItems);
            }
            
            console.log('[InventoryManager] Data deserialized successfully');
            return true;
        } catch (error) {
            console.error('[InventoryManager] Failed to deserialize data:', error);
            return false;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryManager;
}

// Export to global window for browser use
if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
    console.log('[InventoryManager] Class exported to window object');
}

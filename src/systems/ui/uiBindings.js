/**
 * uiBindings.js - Reactive UI Binding System
 * 
 * This system automatically updates UI elements when model data changes.
 * It provides declarative bindings between DOM elements and data models.
 * 
 * Features:
 * - Auto-updating building buttons based on unlock/afford states
 * - Resource display updates when values change
 * - Conditional visibility based on model state
 * 
 * Usage:
 *   UIBindings.bindBuildingButton(element, 'house');
 *   UIBindings.bindResourceDisplay(element, 'wood');
 */

class UIBindingSystem {
    constructor() {
        this._bindings = new Map();
        this._buildingBindings = new Map();
        this._resourceBindings = new Map();
        this._cleanupCallbacks = [];
        
        console.log('[UIBindings] System created');
    }

    /**
     * Initialize the binding system
     */
    initialize() {
        // Subscribe to model events
        if (window.eventBus) {
            // Building unlock state changes
            window.eventBus.on('model:buildingDef:changed', (data) => {
                this._updateBuildingBinding(data.model.id);
            });

            // Resource changes
            window.eventBus.on('resources:changed', (data) => {
                this._updateResourceBinding(data.resource);
                this._updateAllBuildingAffordability();
            });

            // Affordability updates
            window.eventBus.on('ui:update:affordability', () => {
                this._updateAllBuildingAffordability();
            });

            // Building unlocked
            window.eventBus.on('building:unlocked', (data) => {
                this._updateBuildingBinding(data.buildingId);
            });
        }

        console.log('[UIBindings] Initialized');
    }

    /**
     * Bind a DOM element to a building definition
     * Element will auto-update when building state changes
     * 
     * @param {HTMLElement} element - DOM element to bind
     * @param {string} buildingId - Building type ID
     * @param {object} options - Binding options
     */
    bindBuildingButton(element, buildingId, options = {}) {
        if (!element) return;

        // Store binding
        if (!this._buildingBindings.has(buildingId)) {
            this._buildingBindings.set(buildingId, new Set());
        }
        this._buildingBindings.get(buildingId).add({ element, options });

        // Add data attribute for identification
        element.dataset.bindingType = 'building';
        element.dataset.bindingId = buildingId;

        // Initial render
        this._renderBuildingButton(element, buildingId, options);
    }

    /**
     * Bind a DOM element to a resource display
     * 
     * @param {HTMLElement} element - DOM element to bind
     * @param {string} resourceId - Resource ID
     * @param {string} display - What to display: 'amount', 'capacity', 'rate', 'full'
     */
    bindResourceDisplay(element, resourceId, display = 'amount') {
        if (!element) return;

        if (!this._resourceBindings.has(resourceId)) {
            this._resourceBindings.set(resourceId, new Set());
        }
        this._resourceBindings.get(resourceId).add({ element, display });

        element.dataset.bindingType = 'resource';
        element.dataset.bindingId = resourceId;

        this._renderResourceDisplay(element, resourceId, display);
    }

    /**
     * Generate building buttons from registry
     * @param {HTMLElement} container - Container element
     * @param {object} options - Generation options
     */
    generateBuildingButtons(container, options = {}) {
        if (!container || !window.BuildingRegistry) return;

        const definitions = window.BuildingRegistry.getAllDefinitions();
        const categories = window.BUILDING_CATEGORIES || {};

        // Group by category
        const byCategory = new Map();
        for (const def of definitions) {
            const category = def.get('category');
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category).push(def);
        }

        // Sort categories by order
        const sortedCategories = Array.from(byCategory.keys())
            .sort((a, b) => {
                const orderA = categories[a]?.order ?? 99;
                const orderB = categories[b]?.order ?? 99;
                return orderA - orderB;
            });

        // Clear container
        container.innerHTML = '';

        // Generate category sections
        for (const category of sortedCategories) {
            const buildings = byCategory.get(category);
            const categoryInfo = categories[category] || { name: category };

            // Create category section
            const section = document.createElement('div');
            section.className = 'building-category';
            section.dataset.category = category;

            // Category header
            const header = document.createElement('h4');
            header.textContent = categoryInfo.name;
            if (categoryInfo.description) {
                header.title = categoryInfo.description;
            }
            section.appendChild(header);

            // Building list container
            const buildingList = document.createElement('div');
            buildingList.className = 'building-list';
            buildingList.id = `${category}-buildings`;

            // Generate buttons for each building
            for (const def of buildings) {
                const button = this._createBuildingButtonElement(def);
                this.bindBuildingButton(button, def.id, options);
                buildingList.appendChild(button);
            }

            section.appendChild(buildingList);
            container.appendChild(section);
        }

        console.log(`[UIBindings] Generated ${definitions.length} building buttons`);
    }

    /**
     * Generate resource bar
     * @param {HTMLElement} container - Container element
     */
    generateResourceBar(container) {
        if (!container || !window.resourceManager) return;

        const resources = window.resourceManager.all();
        const categories = window.RESOURCE_CATEGORIES || {};

        container.innerHTML = '';

        // Only show resources that should be in main UI
        const visibleResources = resources.filter(r => {
            const category = r.get('category');
            return categories[category]?.showInMainUI !== false;
        });

        for (const resource of visibleResources) {
            const resourceEl = document.createElement('div');
            resourceEl.className = 'resource-display';
            resourceEl.dataset.resource = resource.id;

            const icon = document.createElement('span');
            icon.className = 'resource-icon';
            icon.textContent = resource.get('icon');

            const amount = document.createElement('span');
            amount.className = 'resource-amount';
            this.bindResourceDisplay(amount, resource.id, 'full');

            resourceEl.appendChild(icon);
            resourceEl.appendChild(amount);
            container.appendChild(resourceEl);
        }

        console.log(`[UIBindings] Generated ${visibleResources.length} resource displays`);
    }

    /**
     * Create a building button DOM element
     * @private
     */
    _createBuildingButtonElement(definition) {
        const row = document.createElement('div');
        row.className = 'building-row';
        row.dataset.building = definition.id;

        // Name column
        const nameDiv = document.createElement('div');
        nameDiv.className = 'building-name';
        nameDiv.innerHTML = `
            <div class="building-name-row">
                <span class="building-icon">${definition.get('icon')}</span>
                <span class="building-title">${definition.get('name')}</span>
                <span class="building-lock-icon"></span>
            </div>
            <div class="building-description">${definition.get('description')}</div>
        `;

        // Resources column
        const resourcesDiv = document.createElement('div');
        resourcesDiv.className = 'building-resources';
        resourcesDiv.textContent = definition.get('costText');

        // Work points column
        const workPointsDiv = document.createElement('div');
        workPointsDiv.className = 'building-work-points';
        const points = definition.get('constructionPoints');
        workPointsDiv.textContent = points > 0 ? `${points} WP` : 'Instant';

        row.appendChild(nameDiv);
        row.appendChild(resourcesDiv);
        row.appendChild(workPointsDiv);

        return row;
    }

    /**
     * Render a building button based on current state
     * @private
     */
    _renderBuildingButton(element, buildingId, options = {}) {
        const definition = window.BuildingRegistry?.getDefinition(buildingId);
        if (!definition) return;

        const isUnlocked = definition.get('isUnlocked') || definition.get('startsUnlocked');
        const resources = this._getCurrentResources();
        const canAfford = definition.canAfford(resources);

        // Clear old classes
        element.classList.remove('locked', 'building-locked', 'building-unaffordable', 
                                 'building-available', 'building-governance-locked');

        // Update lock icon
        const lockIcon = element.querySelector('.building-lock-icon');
        const titleSpan = element.querySelector('.building-title');

        if (!isUnlocked) {
            element.classList.add('locked', 'building-locked');
            element.title = definition.getRequirementsText();
            if (lockIcon) lockIcon.textContent = '🔒';
        } else if (!canAfford) {
            element.classList.add('building-unaffordable');
            element.title = `Not enough resources for ${definition.get('name')}`;
            if (lockIcon) lockIcon.textContent = '';
        } else {
            element.classList.add('building-available');
            element.title = `Click to place ${definition.get('name')}`;
            if (lockIcon) lockIcon.textContent = '';
        }
    }

    /**
     * Render a resource display
     * @private
     */
    _renderResourceDisplay(element, resourceId, display) {
        const resource = window.resourceManager?.get(resourceId);
        if (!resource) return;

        switch (display) {
            case 'amount':
                element.textContent = resource.get('displayAmount');
                break;
            case 'capacity':
                element.textContent = resource.get('capacity');
                break;
            case 'rate':
                const rate = resource.get('netRate');
                element.textContent = rate >= 0 ? `+${rate}` : rate;
                break;
            case 'full':
            default:
                element.textContent = `${resource.get('displayAmount')}/${resource.get('capacity')}`;
                break;
        }
    }

    /**
     * Update a specific building binding
     * @private
     */
    _updateBuildingBinding(buildingId) {
        const bindings = this._buildingBindings.get(buildingId);
        if (!bindings) return;

        for (const { element, options } of bindings) {
            if (element.isConnected) {
                this._renderBuildingButton(element, buildingId, options);
            }
        }
    }

    /**
     * Update all building buttons for affordability
     * @private
     */
    _updateAllBuildingAffordability() {
        for (const [buildingId, bindings] of this._buildingBindings) {
            for (const { element, options } of bindings) {
                if (element.isConnected) {
                    this._renderBuildingButton(element, buildingId, options);
                }
            }
        }
    }

    /**
     * Update a specific resource binding
     * @private
     */
    _updateResourceBinding(resourceId) {
        const bindings = this._resourceBindings.get(resourceId);
        if (!bindings) return;

        for (const { element, display } of bindings) {
            if (element.isConnected) {
                this._renderResourceDisplay(element, resourceId, display);
            }
        }
    }

    /**
     * Get current resource amounts from resourceManager or gameState
     * @private
     */
    _getCurrentResources() {
        if (window.resourceManager) {
            const resources = {};
            for (const resource of window.resourceManager.all()) {
                resources[resource.id] = resource.get('amount');
            }
            return resources;
        }

        // Fallback to gameState
        return window.gameState?.resources || {};
    }

    /**
     * Clean up all bindings (e.g., on view change)
     */
    cleanup() {
        this._buildingBindings.clear();
        this._resourceBindings.clear();
        this._cleanupCallbacks.forEach(cb => cb());
        this._cleanupCallbacks = [];
        console.log('[UIBindings] Cleaned up bindings');
    }

    /**
     * Register a cleanup callback
     * @param {Function} callback - Cleanup function
     */
    onCleanup(callback) {
        this._cleanupCallbacks.push(callback);
    }
}

// Create global instance
window.UIBindings = new UIBindingSystem();

// Initialize when models are ready
if (window.eventBus) {
    window.eventBus.on('models:initialized', () => {
        window.UIBindings.initialize();
    });
}

console.log('[UIBindings] UI binding system loaded');

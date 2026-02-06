// Map Renderer for world grid view
// Converted to classic global for browser compatibility

class MapRenderer {
  constructor(worldManager) {
    this.world = worldManager;
    this.container = null;
    this.tileElements = new Map(); // key: row,col
    this.entityLayer = null;
    this.ready = false;
    this.resizeObserver = null;
    this.currentTileSize = 80;
  }

  init() {
    this.container = document.getElementById('hex-overlay');
    console.log('[MapRenderer] init(): container found?', !!this.container);
    if (!this.container) return false;
    this.container.innerHTML = '';
    this.container.classList.add('world-grid');

    // Layers
    const tileLayer = document.createElement('div');
    tileLayer.className = 'tile-layer';
    const entityLayer = document.createElement('div');
    entityLayer.className = 'entity-layer';
    entityLayer.style.pointerEvents = 'none';

    this.container.appendChild(tileLayer);
    this.container.appendChild(entityLayer);
    this.entityLayer = entityLayer;

    console.log('[MapRenderer] Building persistent tiles');
    this.buildPersistentTiles(tileLayer);
    this.observeResize();
    this.ready = true;
    console.log('[MapRenderer] init complete. Tiles:', this.tileElements.size);
    return true;
  }

  observeResize() {
    if (this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.container);
  }

  buildPersistentTiles(layer) {
    const { mapHeight, mapWidth } = this.world;
    console.log(`[MapRenderer] buildPersistentTiles: size ${mapWidth}x${mapHeight}`);
    for (let r = 0; r < mapHeight; r++) {
      for (let c = 0; c < mapWidth; c++) {
        const tile = document.createElement('button');
        tile.className = 'tile';
        tile.dataset.row = r;
        tile.dataset.col = c;
        tile.addEventListener('click', () => this.world.selectHex(r, c));
        layer.appendChild(tile);
        this.tileElements.set(`${r},${c}`, tile);
      }
    }
    
    // Wait for container to be ready, then layout
    setTimeout(() => {
      this.layout();
      this.fullTileStyleRefresh();
    }, 100);
    
    console.log('[MapRenderer] buildPersistentTiles finished. Total tiles:', this.tileElements.size);
  }

  layout() {
    const { mapHeight, mapWidth } = this.world;
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const padding = 32;
    const availableW = rect.width - padding;
    const availableH = rect.height - padding;

    // simple square grid
    const gap = 6;
    const tileSize = Math.min(
      Math.floor((availableW - gap * (mapWidth - 1)) / mapWidth),
      Math.floor((availableH - gap * (mapHeight - 1)) / mapHeight),
      140
    );
    
    // Ensure minimum tile size for visibility
    this.currentTileSize = Math.max(tileSize, 60);

    console.log('[MapRenderer] layout(): rect', rect.width, rect.height, 'computed tileSize', this.currentTileSize, 'tiles', this.tileElements.size);

    for (let [key, el] of this.tileElements.entries()) {
      const [r, c] = key.split(',').map(Number);
      el.style.position = 'absolute';
      el.style.width = this.currentTileSize + 'px';
      el.style.height = this.currentTileSize + 'px';
      el.style.left = (padding / 2 + c * (this.currentTileSize + gap)) + 'px';
      el.style.top = (padding / 2 + r * (this.currentTileSize + gap)) + 'px';
      el.style.borderRadius = '10px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = Math.max(16, this.currentTileSize * 0.4) + 'px';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s, box-shadow 0.15s, background 0.25s';
      el.style.border = '2px solid rgba(255,255,255,0.3)';
      el.style.background = '#444'; // temporary fallback color
    }
  }

  fullTileStyleRefresh() {
    console.log('[MapRenderer] fullTileStyleRefresh start');
    const { hexMap } = this.world;
    for (let [key, el] of this.tileElements.entries()) {
      const [r, c] = key.split(',').map(Number);
      const data = hexMap[r]?.[c];
      if (data) {
        this.applyTileState(el, data, r, c);
      }
    }
    console.log('[MapRenderer] fullTileStyleRefresh done');
  }

  applyTileState(el, data, r, c) {
    // Use global getTerrain function
    const getTerrainFn = window.getTerrain || function(key) { 
      return { color: '#444', symbol: '?' }; 
    };
    const terrain = getTerrainFn(data.terrain);
    
    // Always ensure tile is visible first
    el.style.display = 'flex';
    el.style.position = 'absolute';
    
    // Use new visibility model with fallback for legacy
    const visibility = data.visibility || (data.discovered ? 'explored' : data.scoutable ? 'scoutable' : 'hidden');
    
    // Format coordinates relative to capital
    const coordLabel = this.world.formatCoords?.(r, c) || `(${r}, ${c})`;
    
    if (visibility === 'hidden') {
      // True fog of war - unexplored
      el.textContent = '?';
      el.style.background = 'linear-gradient(135deg,#1a252f,#2c3e50)';
      el.style.border = '2px solid #4a5568';
      el.style.opacity = '0.5';
      el.style.color = '#718096';
      el.title = `${coordLabel} - Unexplored`;
    } else if (visibility === 'scoutable') {
      // Scoutable - adjacent to explored tiles
      el.textContent = '👁️';
      el.style.background = 'linear-gradient(135deg,#2c5282,#2b6cb0)';
      el.style.border = '2px dashed #4299e1';
      el.style.opacity = '0.85';
      el.style.color = '#bee3f8';
      el.title = `${coordLabel} - Send scouts to explore`;
    } else if (data.isPlayerVillage) {
      // Player village - special styling
      el.style.opacity = '1';
      el.style.background = `linear-gradient(145deg, #f6e05e, #d69e2e)`;
      el.style.border = '3px solid #f1c40f';
      el.style.boxShadow = '0 0 12px rgba(241,196,15,0.5)';
      el.style.color = '#fff';
      el.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
      el.textContent = '🏰';
      el.title = `${coordLabel} - Your Capital`;
    } else {
      // Explored - show terrain
      el.style.opacity = data.hasPlayerUnit ? '1' : '0.9';
      el.style.background = terrain.color;
      el.style.border = '2px solid rgba(255,255,255,0.25)';
      el.style.boxShadow = 'none';
      el.style.color = '#fff';
      el.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
      el.textContent = terrain.symbol;
      el.title = `${coordLabel} - ${data.terrain}`;
    }

    // selection highlight
    if (this.world.selectedHex && this.world.selectedHex.row === r && this.world.selectedHex.col === c) {
      el.classList.add('selected');
      el.style.transform = 'scale(1.07)';
      el.style.zIndex = 10;
      el.style.boxShadow = '0 0 14px rgba(255,255,255,0.65)';
    } else {
      el.classList.remove('selected');
      el.style.transform = 'scale(1)';
      if (!data.isPlayerVillage) el.style.boxShadow = 'none';
      el.style.zIndex = 1;
    }
  }

  updateTile(r, c) {
    const el = this.tileElements.get(`${r},${c}`);
    if (!el) return;
    const data = this.world.hexMap[r]?.[c];
    if (data) {
      this.applyTileState(el, data, r, c);
    }
  }

  updateEntities() {
    console.log('[MapRenderer] updateEntities start');
    if (!this.entityLayer) return;
    this.entityLayer.innerHTML = '';
    
    // path preview
    if (this.world.pendingPath && this.world.pendingPath.length) {
      this.world.pendingPath.forEach(step => {
        const marker = document.createElement('div');
        marker.className = 'entity path-step';
        marker.textContent = '•';
        this.positionEntity(marker, step.row, step.col);
        marker.style.background = 'rgba(255,255,255,0.15)';
        marker.style.border = '1px solid #fff';
        marker.style.width = (this.currentTileSize*0.25)+'px';
        marker.style.height = (this.currentTileSize*0.25)+'px';
        this.entityLayer.appendChild(marker);
      });
    }
    
    // armies
    if (this.world.gameState && typeof this.world.gameState.getAllArmies === 'function') {
      const armies = this.world.gameState.getAllArmies();
      armies.forEach(a => {
        const marker = document.createElement('div');
        marker.className = 'entity army-marker';
        marker.textContent = '⚔';
        this.positionEntity(marker, a.position.y, a.position.x);
        this.entityLayer.appendChild(marker);
      });
    }
    
    // Enemy armies with threat indicators
    if (window.enemySpawnSystem && window.enemySpawnSystem.enemyArmies) {
      window.enemySpawnSystem.enemyArmies.forEach(enemy => {
        if (!enemy.hostile) return;
        
        const marker = document.createElement('div');
        marker.className = 'entity enemy-army-marker';
        marker.textContent = '☠️';
        this.positionEntity(marker, enemy.row, enemy.col);
        marker.style.background = '#e74c3c';
        
        // Add threat indicator if strategic combat is available
        if (window.strategicCombat && this.world.gameState?.army) {
          const playerArmy = { units: this.world.gameState.army };
          const assessment = window.strategicCombat.assessThreat(enemy, playerArmy);
          const threatIcon = window.strategicCombat.getThreatIcon(assessment.threatLevel);
          
          // Add small threat badge
          const badge = document.createElement('span');
          badge.className = 'threat-badge';
          badge.textContent = threatIcon;
          badge.style.position = 'absolute';
          badge.style.top = '-6px';
          badge.style.right = '-6px';
          badge.style.fontSize = '12px';
          marker.appendChild(badge);
          marker.title = `${enemy.name || 'Enemy Army'} - Threat: ${assessment.threatLevel.toUpperCase()}`;
        }
        
        this.entityLayer.appendChild(marker);
      });
    }
    
    // Enemy lairs
    if (window.enemySpawnSystem && window.enemySpawnSystem.lairs) {
      window.enemySpawnSystem.lairs.forEach(lair => {
        if (lair.destroyed) return;
        
        // Only show lairs on explored tiles
        const hexData = this.world.hexMap?.[lair.row]?.[lair.col];
        const visibility = hexData?.visibility || (hexData?.discovered ? 'explored' : 'hidden');
        if (visibility === 'hidden') return;
        
        const marker = document.createElement('div');
        marker.className = 'entity lair-marker';
        marker.textContent = lair.icon || '🕳️';
        this.positionEntity(marker, lair.row, lair.col);
        marker.style.background = 'rgba(100, 50, 50, 0.9)';
        marker.style.border = '2px solid #a00';
        
        // Strength indicator
        const strength = Math.round(lair.currentUnits);
        const maxUnits = lair.maxUnits;
        const fillPercent = Math.round((strength / maxUnits) * 100);
        
        marker.title = `${lair.name} - Strength: ${strength}/${maxUnits} (${fillPercent}%)`;
        
        // Add garrison count badge
        const badge = document.createElement('span');
        badge.className = 'garrison-badge';
        badge.textContent = strength.toString();
        badge.style.position = 'absolute';
        badge.style.bottom = '-4px';
        badge.style.right = '-4px';
        badge.style.fontSize = '10px';
        badge.style.background = '#c0392b';
        badge.style.borderRadius = '50%';
        badge.style.padding = '2px 4px';
        badge.style.color = 'white';
        marker.appendChild(badge);
        
        this.entityLayer.appendChild(marker);
      });
    }
    
    // scouts/expeditions (legacy)
    (this.world.expeditions || []).filter(e => e.status === 'stationed').forEach(exp => {
      const marker = document.createElement('div');
      marker.className = 'entity scout-marker';
      marker.textContent = '👁';
      this.positionEntity(marker, exp.targetHex.row, exp.targetHex.col);
      this.entityLayer.appendChild(marker);
    });
    
    // Render units from UnitManager (new system)
    this.renderUnits();
    
    console.log('[MapRenderer] updateEntities done');
  }

  /**
   * Render units from UnitManager with allegiance-based styling
   */
  renderUnits() {
    if (!window.unitManager) return;
    
    const visibleUnits = window.unitManager.getVisibleUnits();
    
    visibleUnits.forEach(unit => {
      const marker = document.createElement('div');
      marker.className = `entity unit-marker unit-${unit.allegiance} unit-mode-${unit.mode}`;
      marker.dataset.unitId = unit.id;
      
      // Main icon
      marker.textContent = unit.icon;
      
      // Position the marker
      this.positionUnitMarker(marker, unit.row, unit.col, unit);
      
      // Apply allegiance-based styling
      marker.style.background = this.getAllegianceBackground(unit.allegiance);
      marker.style.borderColor = unit.color;
      
      // Mode indicator badge
      if (unit.mode !== 'idle') {
        const modeBadge = document.createElement('span');
        modeBadge.className = 'unit-mode-badge';
        modeBadge.textContent = unit.getModeIcon();
        modeBadge.style.cssText = `
          position: absolute;
          top: -6px;
          left: -6px;
          font-size: 10px;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          padding: 2px;
        `;
        marker.appendChild(modeBadge);
      }
      
      // Strength indicator for armies
      if (unit.strength > 1) {
        const strengthBadge = document.createElement('span');
        strengthBadge.className = 'unit-strength-badge';
        strengthBadge.textContent = unit.strength.toString();
        strengthBadge.style.cssText = `
          position: absolute;
          bottom: -4px;
          right: -4px;
          font-size: 9px;
          background: ${unit.color};
          border-radius: 50%;
          padding: 1px 4px;
          color: white;
          font-weight: bold;
        `;
        marker.appendChild(strengthBadge);
      }
      
      // Travel indicator (direction arrow)
      if (unit.mode === 'travel' && unit.travelPlan) {
        const plan = unit.travelPlan;
        if (plan.index < plan.path.length - 1) {
          const next = plan.path[plan.index + 1];
          const dirArrow = this.getDirectionArrow(unit.row, unit.col, next.row, next.col);
          const travelBadge = document.createElement('span');
          travelBadge.className = 'unit-travel-badge';
          travelBadge.textContent = dirArrow;
          travelBadge.style.cssText = `
            position: absolute;
            top: -8px;
            right: -4px;
            font-size: 12px;
          `;
          marker.appendChild(travelBadge);
        }
      }
      
      // Tooltip
      marker.title = this.getUnitTooltip(unit);
      
      // Make player units clickable
      if (unit.allegiance === 'player') {
        marker.style.pointerEvents = 'auto';
        marker.style.cursor = 'pointer';
        marker.onclick = (e) => {
          e.stopPropagation();
          window.eventBus?.emit('unit_selected', { unit });
        };
      }
      
      this.entityLayer.appendChild(marker);
    });
  }

  /**
   * Get background color based on allegiance
   */
  getAllegianceBackground(allegiance) {
    const backgrounds = {
      'player': 'linear-gradient(135deg, #2980b9, #3498db)',
      'ally': 'linear-gradient(135deg, #27ae60, #2ecc71)',
      'neutral': 'linear-gradient(135deg, #d35400, #f39c12)',
      'enemy': 'linear-gradient(135deg, #c0392b, #e74c3c)'
    };
    return backgrounds[allegiance] || 'rgba(0,0,0,0.5)';
  }

  /**
   * Get direction arrow for travel indication
   */
  getDirectionArrow(fromRow, fromCol, toRow, toCol) {
    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;
    
    if (dRow < 0 && dCol === 0) return '↑';
    if (dRow > 0 && dCol === 0) return '↓';
    if (dRow === 0 && dCol < 0) return '←';
    if (dRow === 0 && dCol > 0) return '→';
    if (dRow < 0 && dCol < 0) return '↖';
    if (dRow < 0 && dCol > 0) return '↗';
    if (dRow > 0 && dCol < 0) return '↙';
    if (dRow > 0 && dCol > 0) return '↘';
    return '•';
  }

  /**
   * Get tooltip text for unit
   */
  getUnitTooltip(unit) {
    const info = unit.getDisplayInfo();
    let tooltip = `${info.name}`;
    tooltip += `\nType: ${unit.type.replace(/_/g, ' ')}`;
    tooltip += `\nMode: ${info.mode} ${info.modeIcon}`;
    tooltip += `\nStrength: ${info.strength}`;
    if (info.morale < 100) {
      tooltip += `\nMorale: ${info.morale}%`;
    }
    if (info.supplies.food > 0) {
      tooltip += `\nFood: ${info.supplies.food}`;
    }
    if (info.isMoving) {
      tooltip += `\n[Traveling]`;
    }
    return tooltip;
  }

  /**
   * Position a unit marker with offset for multiple units
   */
  positionUnitMarker(el, row, col, unit) {
    const size = this.currentTileSize || 60;
    const gap = 6;
    const padding = 32;
    
    // Get all units at this position to calculate offset
    const unitsAtPos = window.unitManager?.getUnitsAt(row, col) || [unit];
    const unitIndex = unitsAtPos.findIndex(u => u.id === unit.id);
    const offsetAngle = (unitIndex / unitsAtPos.length) * Math.PI * 2;
    const offsetDist = unitsAtPos.length > 1 ? size * 0.15 : 0;
    
    const baseLeft = padding / 2 + col * (size + gap) + size * 0.55;
    const baseTop = padding / 2 + row * (size + gap) - size * 0.15;
    
    el.style.position = 'absolute';
    el.style.width = size * 0.4 + 'px';
    el.style.height = size * 0.4 + 'px';
    el.style.left = (baseLeft + Math.cos(offsetAngle) * offsetDist) + 'px';
    el.style.top = (baseTop + Math.sin(offsetAngle) * offsetDist) + 'px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.border = '2px solid';
    el.style.borderRadius = '50%';
    el.style.fontSize = Math.max(12, size * 0.22) + 'px';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
    el.style.zIndex = '10';
  }

  positionEntity(el, row, col) {
    const size = this.currentTileSize || 60;
    const gap = 6;
    const padding = 32;
    el.style.position = 'absolute';
    el.style.width = size * 0.45 + 'px';
    el.style.height = size * 0.45 + 'px';
    el.style.left = (padding / 2 + col * (size + gap) + size * 0.55) + 'px';
    el.style.top = (padding / 2 + row * (size + gap) - size * 0.15) + 'px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.background = 'rgba(0,0,0,0.35)';
    el.style.border = '2px solid #fff';
    el.style.borderRadius = '50%';
    el.style.fontSize = Math.max(10, size * 0.25) + 'px';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
  }
}

// Inject basic styles once
if (typeof document !== 'undefined' && !document.getElementById('map-renderer-style')) {
  const s = document.createElement('style');
  s.id = 'map-renderer-style';
  s.textContent = `
    .world-grid { position: absolute; inset:0; }
    .world-grid .tile-layer { position:absolute; inset:0; }
    .world-grid .entity-layer { position:absolute; inset:0; }
    .world-grid .tile:hover { transform: scale(1.04); z-index:5; }
    .world-grid .tile.selected { outline:none; }
    .world-grid .entity { pointer-events:none; }
    .army-marker { color:#fff; background:#c0392b !important; }
    .scout-marker { color:#fff; background:#2980b9 !important; }
    .enemy-army-marker { color:#fff; animation: pulse-threat 1.5s infinite; }
    .lair-marker { color:#fff; }
    .path-step { font-size:10px; color:#fff; }
    @keyframes pulse-threat {
      0%, 100% { box-shadow: 0 0 8px rgba(231, 76, 60, 0.6); }
      50% { box-shadow: 0 0 16px rgba(231, 76, 60, 0.9); }
    }
    .threat-badge { text-shadow: 0 0 4px rgba(0,0,0,0.8); }
    .garrison-badge { font-weight: bold; text-shadow: 0 0 2px rgba(0,0,0,0.8); }
    
    /* Unit marker styles */
    .unit-marker { 
      color: #fff; 
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .unit-marker:hover {
      transform: scale(1.15);
      z-index: 20 !important;
    }
    .unit-player { 
      animation: pulse-player 2s ease-in-out infinite;
    }
    .unit-ally {
      animation: pulse-ally 2.5s ease-in-out infinite;
    }
    .unit-enemy { 
      animation: pulse-enemy 1.5s ease-in-out infinite;
    }
    .unit-neutral {
      opacity: 0.9;
    }
    .unit-mode-travel {
      animation: unit-travel 0.8s ease-in-out infinite !important;
    }
    .unit-mode-scout {
      box-shadow: 0 0 12px rgba(41, 128, 185, 0.6) !important;
    }
    .unit-mode-trade {
      box-shadow: 0 0 8px rgba(243, 156, 18, 0.6) !important;
    }
    .unit-mode-battle {
      box-shadow: 0 0 12px rgba(231, 76, 60, 0.8) !important;
    }
    @keyframes pulse-player {
      0%, 100% { box-shadow: 0 0 8px rgba(52, 152, 219, 0.5); }
      50% { box-shadow: 0 0 14px rgba(52, 152, 219, 0.8); }
    }
    @keyframes pulse-ally {
      0%, 100% { box-shadow: 0 0 6px rgba(46, 204, 113, 0.4); }
      50% { box-shadow: 0 0 10px rgba(46, 204, 113, 0.7); }
    }
    @keyframes pulse-enemy {
      0%, 100% { box-shadow: 0 0 8px rgba(231, 76, 60, 0.6); }
      50% { box-shadow: 0 0 16px rgba(231, 76, 60, 0.9); }
    }
    @keyframes unit-travel {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .unit-mode-badge, .unit-strength-badge, .unit-travel-badge {
      text-shadow: 0 0 3px rgba(0,0,0,0.9);
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

// Expose to global scope for browser use
if (typeof window !== 'undefined') {
  window.MapRenderer = MapRenderer;
}

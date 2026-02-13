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

    this.buildPersistentTiles(tileLayer);
    this.observeResize();
    this.ready = true;
    return true;
  }

  observeResize() {
    if (this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.container);
  }

  buildPersistentTiles(layer) {
    const { mapHeight, mapWidth } = this.world;
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
  }

  layout() {
    const { mapHeight, mapWidth } = this.world;
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const padding = 32;
    const availableW = rect.width - padding;
    const availableH = rect.height - padding;

    // simple square grid
    const gap = 4;
    const tileSize = Math.min(
      Math.floor((availableW - gap * (mapWidth - 1)) / mapWidth),
      Math.floor((availableH - gap * (mapHeight - 1)) / mapHeight),
      140
    );
    
    // Ensure minimum tile size for visibility
    this.currentTileSize = Math.max(tileSize, 60);

    for (let [key, el] of this.tileElements.entries()) {
      const [r, c] = key.split(',').map(Number);
      el.style.position = 'absolute';
      el.style.width = this.currentTileSize + 'px';
      el.style.height = this.currentTileSize + 'px';
      el.style.left = (padding / 2 + c * (this.currentTileSize + gap)) + 'px';
      el.style.top = (padding / 2 + r * (this.currentTileSize + gap)) + 'px';
      el.style.borderRadius = '3px';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = Math.max(16, this.currentTileSize * 0.35) + 'px';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s, box-shadow 0.15s, background 0.25s';
      el.style.fontFamily = "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
    }
  }

  fullTileStyleRefresh() {
    const { hexMap } = this.world;
    for (let [key, el] of this.tileElements.entries()) {
      const [r, c] = key.split(',').map(Number);
      const data = hexMap[r]?.[c];
      if (data) {
        this.applyTileState(el, data, r, c);
      }
    }
  }

  // Parchment-themed terrain colors (earthy, muted)
  static TERRAIN_COLORS = {
    grass:    { bg: 'linear-gradient(145deg, #7a9955, #6b8a48)', border: '#5e7a3a', label: 'Grassland' },
    plains:   { bg: 'linear-gradient(145deg, #c8b478, #b5a168)', border: '#8b7d4a', label: 'Plains' },
    village:  { bg: 'linear-gradient(145deg, #c9a84c, #b8943e)', border: '#8b6914', label: 'Capital' },
    forest:   { bg: 'linear-gradient(145deg, #4a6b3a, #3d5a30)', border: '#2e4424', label: 'Forest' },
    hill:     { bg: 'linear-gradient(145deg, #9a8a6a, #887858)', border: '#6b5d45', label: 'Hills' },
    mountain: { bg: 'linear-gradient(145deg, #6b6b6b, #555555)', border: '#3a3a3a', label: 'Mountains' },
    swamp:    { bg: 'linear-gradient(145deg, #5a6b4a, #4a5a3a)', border: '#384830', label: 'Swamp' },
    desert:   { bg: 'linear-gradient(145deg, #d4b87a, #c4a86a)', border: '#a08050', label: 'Desert' },
    ruins:    { bg: 'linear-gradient(145deg, #7a6a5a, #6a5a4a)', border: '#4a3e32', label: 'Ruins' }
  };

  applyTileState(el, data, r, c) {
    const getTerrainFn = window.getTerrain || function(key) { 
      return { color: '#444', symbol: '?' }; 
    };
    const terrain = getTerrainFn(data.terrain);
    const colors = MapRenderer.TERRAIN_COLORS[data.terrain] || { bg: '#6b5d45', border: '#4a3e32', label: data.terrain };
    
    el.style.display = 'flex';
    el.style.position = 'absolute';
    
    const visibility = data.visibility || (data.discovered ? 'explored' : data.scoutable ? 'scoutable' : 'hidden');
    const coordLabel = this.world.formatCoords?.(r, c) || `(${r}, ${c})`;
    
    // Reset common properties
    el.style.textShadow = 'none';
    el.style.boxShadow = 'none';
    el.style.backgroundImage = 'none';
    el.innerHTML = '';
    
    if (visibility === 'hidden') {
      // Fog of war — aged parchment with cross-hatch pattern
      el.style.background = '#b8a88a';
      el.style.backgroundImage = `
        repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(90,66,48,0.12) 4px, rgba(90,66,48,0.12) 5px),
        repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(90,66,48,0.08) 4px, rgba(90,66,48,0.08) 5px)`;
      el.style.border = '1px solid #9a8a6a';
      el.style.opacity = '0.6';
      el.style.color = '#6b5540';
      el.innerHTML = '<span style="font-size:1.1em;opacity:0.6">?</span>';
      el.title = `${coordLabel} — Terra Incognita`;
    } else if (visibility === 'scoutable') {
      // Scoutable — parchment with compass markings
      el.style.background = '#c8b898';
      el.style.backgroundImage = `
        radial-gradient(circle at 50% 50%, rgba(180,150,100,0.3) 0%, transparent 70%)`;
      el.style.border = '2px dashed #8b7355';
      el.style.opacity = '0.85';
      el.style.color = '#5a4230';
      el.innerHTML = '<span style="font-size:1.1em">🧭</span>';
      el.title = `${coordLabel} — Uncharted (armies auto-explore)`;
    } else if (data.isPlayerVillage) {
      // Player capital — golden seal on parchment
      el.style.opacity = '1';
      el.style.background = colors.bg;
      el.style.border = '3px solid #8b6914';
      el.style.boxShadow = '0 0 10px rgba(180,140,50,0.5), inset 0 0 8px rgba(255,220,100,0.2)';
      el.style.color = '#3a2e1f';
      el.style.textShadow = '0 1px 2px rgba(255,220,100,0.3)';
      el.innerHTML = '<span style="font-size:1.2em">🏰</span><span style="font-size:0.5em;color:#5a4230;margin-top:1px">Capital</span>';
      el.title = `${coordLabel} — Your Capital City`;
    } else if (data.city) {
      // Player-established city — green-gold marker
      el.style.opacity = '1';
      el.style.background = colors.bg;
      el.style.border = '3px solid #2a6a2a';
      el.style.boxShadow = '0 0 8px rgba(42,106,42,0.4), inset 0 0 6px rgba(100,200,100,0.15)';
      el.style.color = '#2a1f14';
      const cityName = data.city.name || 'City';
      el.innerHTML = `<span style="font-size:1em">🏛️</span><span style="font-size:0.4em;color:#2a6a2a;margin-top:1px">${cityName}</span>`;
      el.title = `${coordLabel} — ${cityName}`;
    } else {
      // Explored terrain — earthy map colors
      el.style.opacity = data.hasPlayerUnit ? '1' : '0.92';
      el.style.background = colors.bg;
      el.style.border = `2px solid ${colors.border}`;
      el.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.15)';
      el.style.color = '#2a1f14';
      el.style.textShadow = '0 1px 1px rgba(255,255,255,0.2)';
      const symbolSpan = `<span style="font-size:1em">${terrain.symbol}</span>`;
      const labelSpan = `<span style="font-size:0.45em;color:${colors.border};margin-top:1px;letter-spacing:0.5px">${colors.label}</span>`;
      el.innerHTML = symbolSpan + labelSpan;
      el.title = `${coordLabel} — ${colors.label}`;
    }

    // Selection highlight — ink-circled look
    if (this.world.selectedHex && this.world.selectedHex.row === r && this.world.selectedHex.col === c) {
      el.classList.add('selected');
      el.style.transform = 'scale(1.08)';
      el.style.zIndex = 10;
      el.style.boxShadow = '0 0 0 3px #3a2e1f, 0 0 12px rgba(58,46,31,0.5)';
      el.style.border = '2px solid #2a1f14';
    } else {
      el.classList.remove('selected');
      el.style.transform = 'scale(1)';
      if (!data.isPlayerVillage) el.style.boxShadow = visibility === 'explored' ? 'inset 0 1px 3px rgba(0,0,0,0.15)' : 'none';
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
    if (!this.entityLayer) return;
    this.entityLayer.innerHTML = '';

    // Track entities per tile for displacement when multiple share a tile
    const tileCounts = {};
    const getTileKey = (row, col) => `${row},${col}`;
    const getDisplacement = (row, col) => {
      const key = getTileKey(row, col);
      const idx = tileCounts[key] || 0;
      tileCounts[key] = idx + 1;
      if (idx === 0) return 0;            // first entity centered
      const sign = idx % 2 === 1 ? 1 : -1; // odd right, even left
      const magnitude = Math.ceil(idx / 2);
      const size = this.currentTileSize || 60;
      return sign * magnitude * (size * 0.25);
    };

    // path preview (pending move before confirmation)
    if (this.world.pendingPath && this.world.pendingPath.length) {
      this.renderPathArrows(this.world.pendingPath, 'pending');
    }
    
    // Player armies from gameState
    if (this.world.gameState && typeof this.world.gameState.getAllArmies === 'function') {
      const armies = this.world.gameState.getAllArmies();
      const selectedId = this.world.selectedArmyId || null;
      armies.forEach(a => {
        // Render travel path arrows for armies that are moving
        if (a.status === 'traveling' && a.travelPlan && a.travelPlan.path) {
          const remaining = a.travelPlan.path.slice(a.travelPlan.index);
          if (remaining.length >= 2) {
            this.renderPathArrows(remaining, a.id === selectedId ? 'selected' : 'travel');
          }
        }

        const marker = document.createElement('div');
        marker.className = 'entity army-marker';
        if (a.id === selectedId) marker.classList.add('selected');

        // Traveling armies get movement indicator
        if (a.status === 'traveling') {
          marker.classList.add('army-moving');
          // Direction arrow overlay
          const plan = a.travelPlan;
          if (plan && plan.path && plan.index < plan.path.length - 1) {
            const cur = plan.path[plan.index];
            const nxt = plan.path[plan.index + 1];
            const dr = (nxt?.row ?? 0) - (cur?.row ?? 0);
            const dc = (nxt?.col ?? 0) - (cur?.col ?? 0);
            let arrow = '→';
            if (dc === 1 && dr === 0) arrow = '→';
            else if (dc === -1 && dr === 0) arrow = '←';
            else if (dr === 1 && dc === 0) arrow = '↓';
            else if (dr === -1 && dc === 0) arrow = '↑';
            else if (dc > 0 && dr > 0) arrow = '↘';
            else if (dc < 0 && dr > 0) arrow = '↙';
            else if (dc > 0 && dr < 0) arrow = '↗';
            else if (dc < 0 && dr < 0) arrow = '↖';
            marker.textContent = arrow;

            // Distance badge — how many steps remain
            const stepsLeft = plan.path.length - 1 - plan.index;
            if (stepsLeft > 0) {
              const badge = document.createElement('span');
              badge.className = 'travel-badge';
              badge.textContent = stepsLeft.toString();
              marker.appendChild(badge);
            }
          } else {
            marker.textContent = '⚔';
          }
        } else if (a.status === 'garrisoned') {
          marker.textContent = '🏰';
        } else {
          marker.textContent = '⚔';
        }

        marker.title = `${a.name} (${a.units?.length || 0} units) — ${a.status || 'idle'}`;

        // Unit count badge (like enemy markers)
        const unitCount = a.units?.length || 0;
        if (unitCount > 0) {
          const badge = document.createElement('span');
          badge.className = 'army-count-badge';
          badge.textContent = unitCount.toString();
          badge.style.position = 'absolute';
          badge.style.top = '-5px';
          badge.style.right = '-5px';
          badge.style.fontSize = '9px';
          badge.style.background = '#8b6914';
          badge.style.borderRadius = '50%';
          badge.style.padding = '1px 4px';
          badge.style.color = '#e8d5b0';
          badge.style.fontWeight = 'bold';
          badge.style.border = '1px solid #5a4230';
          marker.appendChild(badge);
        }

        // Make army markers clickable
        marker.style.pointerEvents = 'auto';
        marker.style.cursor = 'pointer';
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.world.selectArmy) this.world.selectArmy(a.id);
        });
        this.positionEntity(marker, a.position.y, a.position.x);
        // Displace if multiple entities share this tile
        const armyOffset = getDisplacement(a.position.y, a.position.x);
        if (armyOffset !== 0) {
          marker.style.left = (parseFloat(marker.style.left) + armyOffset) + 'px';
        }
        this.entityLayer.appendChild(marker);
      });
    }
    
    // Enemy groups from WorldManager (visible ones only)
    if (this.world.enemies) {
      this.world.enemies.forEach(enemy => {
        if (enemy.status !== 'advancing') return;
        if (!this.world.isEnemyVisible?.(enemy)) return;
        
        const typeInfo = this.world.getEnemyTypeInfo?.(enemy) || { icon: '⚔️', color: '#8b2020' };
        const marker = document.createElement('div');
        marker.className = 'entity enemy-army-marker';
        marker.textContent = typeInfo.icon;
        this.positionEntity(marker, enemy.position.row, enemy.position.col);
        marker.style.background = 'linear-gradient(135deg, #6b1a1a, #8b2020)';
        marker.title = `${enemy.name} — ${enemy.units.length} units`;
        // Strength badge
        if (enemy.units.length > 1) {
          const badge = document.createElement('span');
          badge.className = 'threat-badge';
          badge.textContent = enemy.units.length.toString();
          badge.style.position = 'absolute';
          badge.style.top = '-5px';
          badge.style.right = '-5px';
          badge.style.fontSize = '9px';
          badge.style.background = '#8b2020';
          badge.style.borderRadius = '50%';
          badge.style.padding = '1px 4px';
          badge.style.color = '#e8d5b0';
          badge.style.fontWeight = 'bold';
          badge.style.border = '1px solid #5a1010';
          marker.appendChild(badge);
        }

        // Displace if multiple entities share this tile
        const enemyOffset = getDisplacement(enemy.position.row, enemy.position.col);
        if (enemyOffset !== 0) {
          marker.style.left = (parseFloat(marker.style.left) + enemyOffset) + 'px';
        }
        this.entityLayer.appendChild(marker);
      });
    }
  }

  /**
   * Render directional arrows along a path of {row, col} steps.
   * @param {Array<{row:number,col:number}>} path - ordered waypoints
   * @param {'pending'|'travel'|'selected'} style - visual variant
   */
  renderPathArrows(path, style) {
    const size = this.currentTileSize || 60;
    const gap = 4;
    const padding = 32;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const dr = to.row - from.row;
      const dc = to.col - from.col;

      // Pick arrow character based on direction
      let arrow = '→';
      let angle = 0;
      if (dc === 1 && dr === 0) { arrow = '→'; angle = 0; }
      else if (dc === -1 && dr === 0) { arrow = '←'; angle = 0; }
      else if (dr === 1 && dc === 0) { arrow = '↓'; angle = 0; }
      else if (dr === -1 && dc === 0) { arrow = '↑'; angle = 0; }
      else if (dc > 0 && dr > 0) { arrow = '↘'; angle = 0; }
      else if (dc < 0 && dr > 0) { arrow = '↙'; angle = 0; }
      else if (dc > 0 && dr < 0) { arrow = '↗'; angle = 0; }
      else if (dc < 0 && dr < 0) { arrow = '↖'; angle = 0; }

      // Position the arrow between the two tiles (midpoint)
      const midRow = (from.row + to.row) / 2;
      const midCol = (from.col + to.col) / 2;
      const arrowSize = size * 0.3;
      const el = document.createElement('div');
      el.className = `entity path-arrow path-arrow-${style}`;
      el.textContent = arrow;
      el.style.position = 'absolute';
      el.style.width = arrowSize + 'px';
      el.style.height = arrowSize + 'px';
      el.style.left = (padding / 2 + midCol * (size + gap) + (size - arrowSize) / 2) + 'px';
      el.style.top = (padding / 2 + midRow * (size + gap) + (size - arrowSize) / 2) + 'px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = Math.max(12, size * 0.28) + 'px';
      el.style.zIndex = '15';
      el.style.pointerEvents = 'none';
      this.entityLayer.appendChild(el);
    }

    // Destination marker (flag at last step)
    const dest = path[path.length - 1];
    const flagSize = size * 0.3;
    const flag = document.createElement('div');
    flag.className = `entity path-destination path-arrow-${style}`;
    flag.textContent = '🚩';
    flag.style.position = 'absolute';
    flag.style.width = flagSize + 'px';
    flag.style.height = flagSize + 'px';
    flag.style.left = (padding / 2 + dest.col * (size + gap) + (size - flagSize) / 2) + 'px';
    flag.style.top = (padding / 2 + dest.row * (size + gap) + (size - flagSize) / 2) + 'px';
    flag.style.display = 'flex';
    flag.style.alignItems = 'center';
    flag.style.justifyContent = 'center';
    flag.style.fontSize = Math.max(10, size * 0.22) + 'px';
    flag.style.zIndex = '15';
    flag.style.pointerEvents = 'none';
    flag.style.filter = style === 'selected' ? 'drop-shadow(0 0 4px rgba(201,168,76,0.8))' : 'none';
    this.entityLayer.appendChild(flag);
  }

  positionEntity(el, row, col) {
    const size = this.currentTileSize || 60;
    const gap = 4;
    const padding = 32;
    const markerSize = size * 0.4;
    el.style.position = 'absolute';
    el.style.width = markerSize + 'px';
    el.style.height = markerSize + 'px';
    // Center the marker on the tile
    el.style.left = (padding / 2 + col * (size + gap) + (size - markerSize) / 2) + 'px';
    el.style.top = (padding / 2 + row * (size + gap) + (size - markerSize) / 2) + 'px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.background = 'rgba(42,31,20,0.4)';
    el.style.border = '2px solid #5a4230';
    el.style.borderRadius = '50%';
    el.style.fontSize = Math.max(10, size * 0.22) + 'px';
    el.style.boxShadow = '0 1px 4px rgba(42,31,20,0.4)';
    el.style.zIndex = '20';
  }
}

// Inject basic styles once
if (typeof document !== 'undefined' && !document.getElementById('map-renderer-style')) {
  const s = document.createElement('style');
  s.id = 'map-renderer-style';
  s.textContent = `
    .world-grid { position: absolute; inset:0; }
    .world-grid .tile-layer { position:absolute; inset:0; z-index: 1; }
    .world-grid .entity-layer { position:absolute; inset:0; z-index: 10; pointer-events: none; }
    .world-grid .tile:hover { transform: scale(1.05); z-index:5; }
    .world-grid .tile.selected { outline:none; }
    .world-grid .entity { pointer-events:none; }
    .army-marker {
      color: #e8d5b0;
      background: linear-gradient(135deg, #8b6914, #a07828) !important;
      border-color: #5a4230 !important;
      font-weight: bold;
      transition: box-shadow 0.2s, transform 0.15s;
    }
    .army-marker:hover {
      transform: scale(1.15);
      box-shadow: 0 0 8px rgba(201,168,76,0.6) !important;
    }
    .army-marker.army-moving {
      animation: army-march 1.2s ease-in-out infinite;
      border-color: #c9a84c !important;
    }
    @keyframes army-march {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .travel-badge {
      position: absolute;
      bottom: -5px;
      right: -5px;
      font-size: 8px;
      background: #2a1f14;
      color: #e8d5b0;
      border-radius: 50%;
      padding: 1px 4px;
      font-weight: bold;
      border: 1px solid #5a4230;
      line-height: 1.2;
    }
    .army-marker.selected {
      border-color: #c9a84c !important;
      box-shadow: 0 0 10px rgba(201,168,76,0.8), 0 0 20px rgba(201,168,76,0.4) !important;
      animation: pulse-selected 1.5s infinite;
    }
    @keyframes pulse-selected {
      0%, 100% { box-shadow: 0 0 10px rgba(201,168,76,0.8), 0 0 20px rgba(201,168,76,0.4); }
      50% { box-shadow: 0 0 14px rgba(201,168,76,1), 0 0 28px rgba(201,168,76,0.6); }
    }
    .enemy-army-marker {
      color: #e8d5b0;
      animation: pulse-threat 2s infinite;
      border-radius: 50%;
      border-color: #5a1010 !important;
    }
    .path-step { font-size:10px; color: #5a4230; }
    .path-arrow {
      color: #c9a84c;
      font-weight: bold;
      text-shadow: 0 1px 2px rgba(0,0,0,0.6);
      border-radius: 50%;
    }
    .path-arrow-pending {
      color: rgba(90,66,48,0.7);
      text-shadow: none;
    }
    .path-arrow-travel {
      color: #a08050;
      opacity: 0.7;
    }
    .path-arrow-selected {
      color: #c9a84c;
      opacity: 1;
      filter: drop-shadow(0 0 3px rgba(201,168,76,0.6));
      animation: path-glow 2s infinite;
    }
    .path-destination {
      border-radius: 50%;
    }
    @keyframes path-glow {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(201,168,76,0.4)); }
      50% { filter: drop-shadow(0 0 6px rgba(201,168,76,0.9)); }
    }
    @keyframes pulse-threat {
      0%, 100% { box-shadow: 0 0 6px rgba(139, 32, 32, 0.5); }
      50% { box-shadow: 0 0 14px rgba(139, 32, 32, 0.8); }
    }
    .threat-badge { text-shadow: 0 0 3px rgba(0,0,0,0.8); font-weight: bold; }
  `;
  document.head.appendChild(s);
}

// Expose to global scope for browser use
if (typeof window !== 'undefined') {
  window.MapRenderer = MapRenderer;
}

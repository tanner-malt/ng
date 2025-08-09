import { getTerrain } from './config/terrain.js';

export class MapRenderer {
  constructor(worldManager) {
    this.world = worldManager;
    this.container = null;
    this.tileElements = new Map(); // key: row,col
    this.entityLayer = null;
    this.ready = false;
    this.resizeObserver = null;
  }

  init() {
    this.container = document.getElementById('hex-overlay');
    console.log('[MapRenderer] init(): container found?', !!this.container);
    if (!this.container) return false;
    this.container.innerHTML = '';
    this.container.classList.add('world-grid');
    // temp debug outline
    this.container.style.outline = '1px solid #2de0c6';

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

    // simple square grid for now
    const gap = 6;
    const tileSize = Math.min(
      Math.floor((availableW - gap * (mapWidth - 1)) / mapWidth),
      Math.floor((availableH - gap * (mapHeight - 1)) / mapHeight),
      140
    );
    
    // Ensure minimum tile size for visibility
    this.currentTileSize = Math.max(tileSize, 80);

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
      const data = hexMap[r][c];
      this.applyTileState(el, data, r, c);
    }
    console.log('[MapRenderer] fullTileStyleRefresh done');
  }

  applyTileState(el, data, r, c) {
    const terrain = getTerrain(data.terrain);
    
    // Always ensure tile is visible first
    el.style.display = 'flex';
    el.style.position = 'absolute';
    
    if (data.fogOfWar) {
      el.textContent = '🌫️';
      el.style.background = 'linear-gradient(135deg,#2c3e50,#34495e)';
      el.style.border = '2px solid #566';
      el.style.opacity = '0.8';
      el.style.color = '#a5b1b5';
    } else {
      el.style.opacity = '1';
      el.style.background = terrain.color;
      el.style.border = data.isPlayerVillage ? '3px solid #f1c40f' : '2px solid rgba(255,255,255,0.3)';
      el.style.boxShadow = data.isPlayerVillage ? '0 0 10px rgba(241,196,15,0.4)' : 'none';
      el.style.color = '#fff';
      el.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
      el.textContent = terrain.symbol;
    }

    // selection
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
    const data = this.world.hexMap[r][c];
    this.applyTileState(el, data, r, c);
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
    // scouts
    (this.world.expeditions || []).filter(e => e.status === 'stationed').forEach(exp => {
      const marker = document.createElement('div');
      marker.className = 'entity scout-marker';
      marker.textContent = '👁';
      this.positionEntity(marker, exp.targetHex.row, exp.targetHex.col);
      this.entityLayer.appendChild(marker);
    });
    console.log('[MapRenderer] updateEntities done');
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

// basic style injection once
if (!document.getElementById('map-renderer-style')) {
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
    .path-step { font-size:10px; color:#fff; }
  `;
  document.head.appendChild(s);
}
// Expose for non-module environments
if (typeof window !== 'undefined') {
  window.MapRenderer = MapRenderer;
}

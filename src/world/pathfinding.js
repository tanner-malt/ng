// Simple A* pathfinding for row/col grid respecting terrain moveCost
// Converted to classic global for browser compatibility

function findPath(hexMap, start, goal) {
  // Use global getTerrain function
  const getTerrainFn = window.getTerrain || function(key) { return { moveCost: 1 }; };
  
  const rows = hexMap.length;
  const cols = hexMap[0].length;
  const key = (r, c) => r + ',' + c;
  const open = new Set([key(start.row, start.col)]);
  const cameFrom = new Map();
  const g = new Map([[key(start.row, start.col), 0]]);
  const f = new Map([[key(start.row, start.col), heuristic(start, goal)]]);

  function neighbors(r, c) {
    // 4-directional movement for grid (no diagonals for cleaner pathing)
    const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const list = [];
    for (const [dr, dc] of deltas) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        list.push({ row: nr, col: nc });
      }
    }
    return list;
  }
  
  function heuristic(a, b) { 
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col); 
  }
  
  function moveCost(a, b) { 
    const t = getTerrainFn(hexMap[b.row][b.col].terrain); 
    return t.moveCost >= 99 ? Infinity : t.moveCost; 
  }

  while (open.size) {
    let currentKey = null; 
    let lowest = Infinity;
    for (const k of open) { 
      const val = f.get(k) ?? Infinity; 
      if (val < lowest) { 
        lowest = val; 
        currentKey = k; 
      } 
    }
    if (!currentKey) break;
    
    const [cr, cc] = currentKey.split(',').map(Number);
    if (cr === goal.row && cc === goal.col) {
      const path = [{ row: cr, col: cc }];
      let ck = currentKey;
      while (cameFrom.has(ck)) { 
        ck = cameFrom.get(ck); 
        const [r, c] = ck.split(',').map(Number); 
        path.push({ row: r, col: c }); 
      }
      return path.reverse();
    }
    
    open.delete(currentKey);
    for (const n of neighbors(cr, cc)) {
      const tentative = g.get(currentKey) + moveCost({ row: cr, col: cc }, n);
      if (tentative >= Infinity) continue;
      const nk = key(n.row, n.col);
      if (tentative < (g.get(nk) ?? Infinity)) {
        cameFrom.set(nk, currentKey);
        g.set(nk, tentative);
        f.set(nk, tentative + heuristic(n, goal));
        open.add(nk);
      }
    }
  }
  return null; // no path
}

// Expose to global scope for browser use
if (typeof window !== 'undefined') {
  window.findPath = findPath;
}

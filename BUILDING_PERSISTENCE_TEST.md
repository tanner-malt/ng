# Testing Building Persistence

## Steps to Test
1. Open the game in the browser
2. Place a building (e.g., Town Center)
3. Check the browser console for debug messages
4. Refresh the page
5. Check if the building is still there

## Expected Debug Messages
When loading save data, you should see:
```
[GameState] Save data loaded successfully
[GameState] Buildings loaded: [number]
[Village] Rendering buildings - count: [number]
[Village] Rendering building: [type] at [x] [y]
```

## Troubleshooting
If buildings don't appear after refresh:
1. Check browser console for errors
2. Check if buildings are being saved: Open DevTools → Application → Local Storage → idleDynastyBuilder
3. Look for the buildings array in the JSON data
4. Verify x, y coordinates are present

## Quick Debug Commands
Open browser console and run:
```javascript
// Check current buildings
console.log('Buildings:', window.gameState.buildings);

// Force re-render buildings
window.villageManager.renderBuildings();

// Check save data
console.log('Save data:', localStorage.getItem('idleDynastyBuilder'));
```

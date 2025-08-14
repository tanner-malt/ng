# Deployment Troubleshooting Guide

This document helps fix common 404 errors when deploying Idle Dynasty Builder.

## Common 404 Errors

### 1. `wikiData.js:1 Failed to load resource: the server responded with a status of 404`

**Cause:** The game cannot find the wikiData.js file at the expected location.

**Solutions:**
- Run `npm run build` before deploying to ensure wikiData.js is copied to the public directory
- Verify that both `src/wikiData.js` and `public/wikiData.js` exist
- The game will try multiple paths automatically:
  - `../src/wikiData.js` (original location)
  - `./wikiData.js` (same directory as game.html)
  - `src/wikiData.js` (from root)
  - `wikiData.js` (current directory)

### 2. `/public/version.json:1 Failed to load resource: the server responded with a status of 404`

**Cause:** The game cannot find the version.json file.

**Solutions:**
- Run `npm run build` to generate/update version.json
- Verify that `public/version.json` exists
- The game will try multiple paths automatically:
  - `public/version.json` (from root)
  - `./version.json` (same directory)
  - `../version.json` (one level up)
  - `version.json` (current directory)

## Deployment Steps

1. **Before deploying:**
   ```bash
   npm install
   npm run build
   ```

2. **Verify files exist:**
   ```bash
   ls -la public/version.json
   ls -la public/wikiData.js
   ls -la src/wikiData.js
   ```

3. **Test locally:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8000/test-deployment.html` to verify resource loading.

4. **Deploy:**
   Upload the entire project directory, maintaining the folder structure:
   ```
   /
   ├── index.html
   ├── public/
   │   ├── game.html
   │   ├── version.json
   │   ├── wikiData.js
   │   └── ...
   └── src/
       ├── wikiData.js
       └── ...
   ```

## File Structure Requirements

The game expects this directory structure when deployed:
- Main entry: `index.html` (in root)
- Game page: `public/game.html`
- Resources: `public/version.json`, `public/wikiData.js`
- Sources: `src/wikiData.js` (backup)

## Testing Deployment

1. Open `test-deployment.html` in your browser
2. Check that both version.json and wikiData.js tests pass
3. Open the game via the test page buttons

## Manual Fixes

If automatic path resolution doesn't work:

1. **Copy files manually:**
   ```bash
   cp src/wikiData.js public/wikiData.js
   cp package.json public/version.json  # Extract version field
   ```

2. **Update paths in game.html:**
   Change script src from `../src/wikiData.js` to `./wikiData.js`

3. **Update paths in JavaScript:**
   Change fetch URLs to use relative paths appropriate for your deployment structure.

## Common Deployment Scenarios

### Serving from root directory
- Game URL: `http://yoursite.com/public/game.html`
- Resources accessible at: `http://yoursite.com/public/version.json`

### Serving from subdirectory
- Game URL: `http://yoursite.com/game/public/game.html`
- May require path adjustments in the code

### Static hosting (GitHub Pages, Netlify, etc.)
- Ensure all files are committed to repository
- Run build step in CI/CD pipeline
- Set appropriate build commands in hosting service

## Build Script Details

The `npm run build` command:
1. Compiles wiki markdown to `src/wikiData.js`
2. Copies `src/wikiData.js` to `public/wikiData.js`
3. Extracts version from `package.json` to `public/version.json`

## Troubleshooting Commands

```bash
# Check if build completed successfully
npm run build

# Verify file contents
cat public/version.json
head -10 public/wikiData.js

# Test local server
npm run dev
curl http://localhost:8000/public/version.json
curl http://localhost:8000/public/wikiData.js | head -5

# Test deployment paths
node -e "console.log(require('./package.json').version)"
```

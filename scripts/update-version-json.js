// Script to sync version from package.json to public/version.json
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../package.json');
const versionPath = path.join(__dirname, '../public/version.json');
const wikiDataSrcPath = path.join(__dirname, '../src/config/wikiData.js');
const wikiDataPublicPath = path.join(__dirname, '../public/wikiData.js');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.0.0';

// Sync version
fs.writeFileSync(versionPath, JSON.stringify({ version }, null, 2) + '\n');
console.log(`Synced version ${version} to public/version.json`);

// Copy wikiData.js to public for deployment compatibility
try {
    fs.copyFileSync(wikiDataSrcPath, wikiDataPublicPath);
    console.log('Copied wikiData.js to public/wikiData.js');
} catch (error) {
    console.error('Failed to copy wikiData.js:', error.message);
}

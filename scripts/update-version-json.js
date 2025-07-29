// Script to sync version from package.json to public/version.json
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '../package.json');
const versionPath = path.join(__dirname, '../public/version.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.0.0';

fs.writeFileSync(versionPath, JSON.stringify({ version }, null, 2) + '\n');
console.log(`Synced version ${version} to public/version.json`);

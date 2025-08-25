const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked for better HTML output
marked.setOptions({
    headerIds: false,
    mangle: false
});

// Wiki sections configuration
const sections = [
    { id: 'getting-started', file: 'getting-started.md', title: '🎮 Getting Started' },
    { id: 'buildings', file: 'buildings.md', title: '🏗️ Buildings Guide' },
    { id: 'resources', file: 'resources.md', title: '💰 Resources' },
    { id: 'mechanics', file: 'mechanics.md', title: '⚙️ Game Mechanics' },
    { id: 'village', file: 'village.md', title: '🏘️ Village View' },
    { id: 'expeditions', file: 'expeditions.md', title: '🗺️ Expeditions' },
    { id: 'battle', file: 'battle.md', title: '⚔️ Battle View' },
    { id: 'monarch', file: 'monarch.md', title: '👑 Monarch View' },
    { id: 'throne', file: 'throne.md', title: '🏰 Throne View' },
    { id: 'dynasty', file: 'dynasty.md', title: '👑 Dynasty System' },
    { id: 'population-management', file: 'population-management.md', title: '👥 Population Management' },
    { id: 'achievements', file: 'achievements.md', title: '🏆 Achievements' },
    { id: 'unlocks', file: 'unlocks.md', title: '🔓 Unlocking Views' }
];

// Navigation structure
const navigationStructure = [
    {
        title: '📋 Basics',
        sections: [
            { id: 'getting-started', label: 'Getting Started' },
            { id: 'buildings', label: 'Buildings' },
            { id: 'resources', label: 'Resources' },
            { id: 'mechanics', label: 'Game Mechanics' }
        ]
    },
    {
        title: '🎮 Views',
        sections: [
            { id: 'village', label: 'Village' },
            { id: 'expeditions', label: 'Expeditions' },
            { id: 'battle', label: 'Battle' },
            { id: 'monarch', label: 'Monarch' },
            { id: 'throne', label: 'Throne' }
        ]
    },
    {
        title: '👑 Dynasty Management',
        sections: [
            { id: 'dynasty', label: 'Dynasty System' },
            { id: 'population-management', label: 'Population Management' }
        ]
    },
    {
        title: '🏆 Progression',
        sections: [
            { id: 'achievements', label: 'Achievements' },
            { id: 'unlocks', label: 'Unlocking Views' }
        ]
    }
];

/**
 * Sanitize/normalize HTML produced from markdown to avoid bad Unicode artifacts.
 * - Normalizes to NFC
 * - Removes U+FFFD (replacement char) and stray BOMs
 */
function sanitizeHtml(html) {
    if (!html) return html;
    return html
        .normalize('NFC')
        .replace(/[\uFFFD\uFEFF]/g, '')
        .trim();
}

function compileWikiData() {
    const wikiDir = path.join(__dirname, '../docs/wiki');
    const outDirSrc = path.join(__dirname, '../src/config');
    const outDirPublic = path.join(__dirname, '../public');
    const outputFileCJS = path.join(outDirSrc, 'wikiData.js');
    const outputFileESM = path.join(outDirSrc, 'wikiData.mjs');
    const outputFileJSON = path.join(outDirSrc, 'wikiData.json');
    const outputFilePublic = path.join(outDirPublic, 'wikiData.js');

    console.log('🔄 Compiling wiki from markdown...');

    const compiledSections = {};

    sections.forEach(section => {
        const mdPath = path.join(wikiDir, section.file);

        if (fs.existsSync(mdPath)) {
            const markdown = fs.readFileSync(mdPath, 'utf8');
            const html = marked(markdown);

            // Wrap in wiki-section div and add custom classes
            const wrappedHtml = `
                <div class="wiki-section">
                    ${html}
                </div>
            `.trim();

            compiledSections[section.id] = {
                title: section.title,
                content: sanitizeHtml(wrappedHtml)
            };

            console.log(`✅ Compiled: ${section.id}`);
        } else {
            console.warn(`⚠️  Missing: ${section.file}`);
        }
    });

    const header = `/**
 * wikiData - Game Wiki Content Management
 *
 * AUTO-GENERATED from markdown files in docs/wiki/
 * DO NOT EDIT DIRECTLY - Edit the markdown files instead!
 *
 * To regenerate: npm run build:wiki
 */`;

    // JSDoc typedefs for type safety/intellisense
    const typedefs = `
/**
 * @typedef {Object} WikiSection
 * @property {string} title
 * @property {string} content // HTML string
 *
 * @typedef {Object} NavEntry
 * @property {string} id
 * @property {string} label
 *
 * @typedef {Object} NavGroup
 * @property {string} title
 * @property {NavEntry[]} sections
 */`;

    // Common class body used by both CJS and ESM outputs
    const classBody = `
class WikiData {
    /** @type {Record<string, WikiSection>} */
    static sections = ${JSON.stringify(compiledSections, null, 8)};

    /** @type {NavGroup[]} */
    static navigationStructure = ${JSON.stringify(navigationStructure, null, 8)};

    static getSection(sectionId) {
        return this.sections[sectionId] || this.sections['getting-started'];
    }

    static getAllSections() {
        return this.sections;
    }

    static getNavigation() {
        return this.navigationStructure;
    }

    static addSection(sectionId, title, content) {
        this.sections[sectionId] = { title, content };
    }

    static updateSection(sectionId, content) {
        if (this.sections[sectionId]) {
            this.sections[sectionId].content = content;
        }
    }
}`;

    // UMD/CJS build (also attaches to window if present)
    const jsContentCJS = `${header}
${typedefs}
${classBody}

(function(root, factory){
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root.WikiData = factory();
    }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis, function(){
    return WikiData;
});
`;

    // ESM build
    const jsContentESM = `${header}
${typedefs}
${classBody}

export default WikiData;
export { WikiData };
`;

    // Browser global build for public/ (kept for backwards-compat)
    const jsContentPublic = `${header}
${typedefs}
${classBody}

// Make WikiData available globally in browser
if (typeof window !== 'undefined') {
    window.WikiData = WikiData;
}
`;

    // JSON payload (data-only) for alternative consumers
    const jsonPayload = JSON.stringify({
        sections: compiledSections,
        navigation: navigationStructure
    }, null, 2);

    // Ensure directories exist
    fs.mkdirSync(outDirSrc, { recursive: true });
    fs.mkdirSync(outDirPublic, { recursive: true });

    // Write outputs
    fs.writeFileSync(outputFileCJS, jsContentCJS);
    fs.writeFileSync(outputFileESM, jsContentESM);
    fs.writeFileSync(outputFileJSON, jsonPayload);
    fs.writeFileSync(outputFilePublic, jsContentPublic);

    console.log(`🎉 Wiki compiled to:\n - ${outputFileCJS}\n - ${outputFileESM}\n - ${outputFileJSON}\n - ${outputFilePublic}`);
}

if (require.main === module) {
    compileWikiData();
}

module.exports = { compileWikiData };

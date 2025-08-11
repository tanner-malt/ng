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

function compileWikiData() {
    const wikiDir = path.join(__dirname, '../docs/wiki');
    const outputFile = path.join(__dirname, '../src/wikiData.js');
    
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
                content: wrappedHtml
            };
            
            console.log(`✅ Compiled: ${section.id}`);
        } else {
            console.warn(`⚠️  Missing: ${section.file}`);
        }
    });
    
    // Generate the JavaScript file
    const jsContent = `/**
 * wikiData.js - Game Wiki Content Management
 * 
 * AUTO-GENERATED from markdown files in docs/wiki/
 * DO NOT EDIT DIRECTLY - Edit the markdown files instead!
 * 
 * To regenerate: npm run build:wiki
 */

class WikiData {
    static sections = ${JSON.stringify(compiledSections, null, 8)};
    
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
        this.sections[sectionId] = {
            title: title,
            content: content
        };
    }
    
    static updateSection(sectionId, content) {
        if (this.sections[sectionId]) {
            this.sections[sectionId].content = content;
        }
    }
}

// Make WikiData available globally
window.WikiData = WikiData;
`;
    
    fs.writeFileSync(outputFile, jsContent);
    console.log(`🎉 Wiki compiled successfully to ${outputFile}`);
}

if (require.main === module) {
    compileWikiData();
}

module.exports = { compileWikiData };

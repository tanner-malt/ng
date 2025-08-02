// Comprehensive emoji fix script
const fs = require('fs');
const path = require('path');

const emojiMappings = {
    // Basic success/error indicators  
    'Γ£à': '✅',
    'Γ¥î': '❌', 
    'ΓÜá∩╕Å': '⚠️',
    'Γä╣∩╕Å': 'ℹ️',
    
    // Construction and buildings
    '≡ƒÅù∩╕Å': '🔨',
    '≡ƒö¿': '🏗️',
    'ΓÜÆ∩╕Å': '⚒️',
    '≡ƒÄ»': '✨',
    '≡ƒÅ¢∩╕Å': '🏛️',
    '≡ƒÅá': '🏠',
    'ΓÜö∩╕Å': '⚔️',
    
    // Resources
    '≡ƒî╛': '🌾',
    '≡ƒ¬╡': '🌲', 
    '≡ƒ¬¿': '🪨',
    '≡ƒÆ░': '💰',
    '≡ƒæÑ': '👥',
    '≡ƒôª': '📦',
    'ΓÜí': '⚡',
    
    // Army and units
    '≡ƒÅ╣': '🏹',
    '≡ƒÉÄ': '🐎',
    '≡ƒæñ': '👤',
    
    // Seasons and time
    '≡ƒî╕': '🌸',
    'ΓÿÇ∩╕Å': '☀️',
    '≡ƒìé': '🍂',
    'Γ¥ä∩╕Å': '❄️',
    '≡ƒùô∩╕Å': '📅',
    
    // Actions and controls
    'ΓÅ╕∩╕Å': '▶️',
    'Γû╢∩╕Å': '⏸️',
    '≡ƒôï': '✅',
    '≡ƒôê': '🎯',
    '≡ƒæ╢': '👶',
    '≡ƒîì': '🌍',
    
    // General interface
    '≡ƒÄë': '🏆',
    '≡ƒÄ«': '🎮',
    '≡ƒææ': '👑',
    '≡ƒÅ░': '🏰',
    '≡ƒöÆ': '🔒',
    '≡ƒöº': '🔧',
    '≡ƒÅ¡': '💎',
    '≡ƒôè': '🏭',
    '≡ƒÆº': '💧',
    
    // Transport
    '≡ƒÜ¢': '🚚',
    '≡ƒÜ¿': '🔍',
    '🚨': '🚨',
    
    // Terrain (already fixed but include for completeness)
    '≡ƒî▒': '🌱',
    '≡ƒî▓': '🌲',
    'Γ¢░∩╕Å': '⛰️',
    '≡ƒù╗': '🪨'
};

function fixEmojisInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // Apply emoji mappings
        for (const [corrupted, fixed] of Object.entries(emojiMappings)) {
            if (content.includes(corrupted)) {
                content = content.replaceAll(corrupted, fixed);
                hasChanges = true;
                console.log(`Fixed ${corrupted} → ${fixed} in ${filePath}`);
            }
        }
        
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated ${filePath}`);
        }
        
        return hasChanges;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Files to fix
const filesToFix = [
    'src/app.js',
    'src/village.js', 
    'src/gameState.js',
    'src/tutorial.js',
    'src/battle.js',
    'src/monarch.js',
    'src/throne.js',
    'src/quest.js',
    'src/quests.js'
];

console.log('🔧 Starting comprehensive emoji fix...\n');

let totalFixed = 0;
for (const file of filesToFix) {
    if (fs.existsSync(file)) {
        if (fixEmojisInFile(file)) {
            totalFixed++;
        }
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
}

console.log(`\n✨ Fixed emojis in ${totalFixed} files!`);

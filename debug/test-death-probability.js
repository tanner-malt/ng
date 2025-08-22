// Test the new probability-based death system
const PopulationManager = require('../src/populationManager.js');

console.log('=== Testing Probability-Based Death System ===');

const populationManager = new PopulationManager();

// Test death probability calculation at different ages
console.log('\n1. Death Probability by Age:');
const testAges = [150, 170, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230];
testAges.forEach(age => {
    const probability = populationManager.calculateDeathProbability(age);
    console.log(`Age ${age}: ${(probability * 100).toFixed(2)}% death chance`);
});

// Test elder bonuses
console.log('\n2. Testing Elder Bonuses:');
const elderWithMasterSkill = {
    id: 'elder1',
    name: 'Wise Elder',
    age: 195,
    skills: { crafting: 5 },
    experience: { crafting: 1200 } // Master level (1001+ XP)
};

const elderWithExpertSkill = {
    id: 'elder2', 
    name: 'Skilled Elder',
    age: 193,
    skills: { farming: 4 },
    experience: { farming: 750 } // Expert level (601+ XP)
};

populationManager.population.push(elderWithMasterSkill, elderWithExpertSkill);
const elderBonuses = populationManager.getElderBonuses();
console.log('Elder bonuses:', elderBonuses);

// Test age-based learning
console.log('\n3. Testing Age-Based Learning:');
const youngWorker = {
    id: 'young1',
    name: 'Young Worker',
    age: 25,
    skills: { farming: 1 },
    experience: { farming: 10 }
};

const oldWorker = {
    id: 'old1',
    name: 'Experienced Worker', 
    age: 150,
    skills: { farming: 1 },
    experience: { farming: 10 }
};

populationManager.population.push(youngWorker, oldWorker);

// Award same XP to both and compare
console.log('Before XP award:');
console.log(`Young worker (${youngWorker.age}): ${youngWorker.experience.farming} XP`);
console.log(`Old worker (${oldWorker.age}): ${oldWorker.experience.farming} XP`);

populationManager.awardExperience(youngWorker.id, 'farming', 20);
populationManager.awardExperience(oldWorker.id, 'farming', 20);

console.log('After 20 XP award (with age bonus):');
console.log(`Young worker (${youngWorker.age}): ${youngWorker.experience.farming} XP`);
console.log(`Old worker (${oldWorker.age}): ${oldWorker.experience.farming} XP`);

// Test mentorship bonus
console.log('\n4. Testing Mentorship Bonus:');
const novice = {
    id: 'novice1',
    name: 'Novice Farmer',
    age: 30,
    skills: { farming: 1 },
    experience: { farming: 10 }
};

populationManager.population.push(novice);
const mentorshipBonus = populationManager.getMentorshipBonus(novice, 'farming');
console.log(`Mentorship bonus for novice farmer: ${mentorshipBonus.toFixed(2)}x`);

console.log('\n=== Death Probability Test Complete ===');

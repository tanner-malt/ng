// Simple Node.js test for PopulationManager
const PopulationManager = require('../src/populationManager.js');

console.log('=== Simple Population Skill System Test ===');

// Create a mock population manager
const populationManager = new PopulationManager();

// Add some test population members
const testPeople = [
    {
        id: 'person1',
        name: 'Alice',
        age: 25,
        gender: 'female',
        role: 'farmer',
        status: 'working',
        happiness: 80,
        productivity: 1.2,
        skills: { farming: 3, crafting: 1 },
        experience: { farming: 250, crafting: 10 }
    },
    {
        id: 'person2', 
        name: 'Bob',
        age: 35,
        gender: 'male',
        role: 'builder',
        status: 'working',
        happiness: 75,
        productivity: 1.5,
        skills: { building: 4, farming: 2 },
        experience: { building: 400, farming: 80 }
    },
    {
        id: 'person3',
        name: 'Charlie',
        age: 8,
        gender: 'male',
        role: 'child',
        status: 'idle',
        happiness: 90,
        productivity: 0.1,
        skills: {},
        experience: {}
    },
    {
        id: 'person4',
        name: 'Diana',
        age: 192,
        gender: 'female',
        role: 'elder',
        status: 'idle',
        happiness: 60,
        productivity: 0.8,
        skills: { crafting: 5, farming: 4 },
        experience: { crafting: 500, farming: 300 }
    }
];

// Add people to population manager
testPeople.forEach(person => {
    populationManager.population.push(person);
});

console.log('\n1. Testing Basic Functions:');
console.log(`Total population: ${populationManager.population.length}`);
const workingAge = populationManager.population.filter(p => p.age >= 16 && p.age <= 190);
console.log(`Working age population: ${workingAge.length}`);

console.log('\n2. Testing Skill System:');
testPeople.forEach(person => {
    if (person.skills && Object.keys(person.skills).length > 0) {
        const bestSkill = populationManager.getBestSkill(person);
        console.log(`${person.name}: Best skill is ${bestSkill.skillName} (level ${bestSkill.level} - ${bestSkill.title})`);
        
        // Test job effectiveness
        const effectiveness = populationManager.calculateJobEffectiveness(person, 'farmer');
        console.log(`  Job effectiveness as farmer: ${effectiveness.toFixed(2)}`);
    }
});

console.log('\n3. Testing Age Brackets:');
const populationGroups = populationManager.getPopulationGroups();
console.log('Population groups:', populationGroups);

console.log('\n4. Testing Detailed Statistics:');
try {
    const stats = populationManager.getDetailedStatistics();
    console.log('Statistics generated successfully');
    console.log(`Total population: ${stats.total}`);
    console.log(`Working age: ${stats.workingAge?.count || 'N/A'}`);
    console.log(`Skill overview available: ${stats.skillOverview ? 'Yes' : 'No'}`);
    if (stats.topSkilledWorkers) {
        console.log(`Top skilled workers count: ${stats.topSkilledWorkers.length}`);
    }
} catch (error) {
    console.error('Error generating statistics:', error.message);
}

console.log('\n5. Testing Daily Skill Progression:');
try {
    populationManager.processDailySkillProgression();
    console.log('Daily skill progression completed successfully');
} catch (error) {
    console.error('Error in daily skill progression:', error.message);
}

console.log('\n=== Test Complete ===');

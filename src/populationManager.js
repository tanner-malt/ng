// populationManager.js - Manages population details, roles, and assignments
// Used by both VillageManager and WorldManager

class PopulationManager {
    /**
     * Calculate daily population growth based on eligible couples and food status.
     * - Each eligible couple (young adults 10–15 days) tries for a child every day
     * - Base chance: 1/7 per couple per day (so +1 per week per couple, before modifiers)
     * - Modifiers: +50% if food abundant, -50% if food scarce, 0 if sick/traveling
     * - 1% chance for twins per birth
     * @param {object} options - { foodAbundant: bool, foodScarce: bool }
     * @returns {object} { births, twins, bonus, eligibleCouples }
     */
    calculateDailyGrowth(options = {}) {
        // Find eligible young adults by gender
        const youngAdults = this.population.filter(p => p.age >= 10 && p.age <= 15 && p.status !== 'sick' && p.status !== 'traveling');
        const males = youngAdults.filter(p => p.gender === 'male');
        const females = youngAdults.filter(p => p.gender === 'female');
        const eligibleCouples = Math.min(males.length, females.length);
        if (eligibleCouples === 0) return { births: 0, twins: 0, bonus: 0, eligibleCouples: 0 };

        // Base: Each couple has a 1/7 chance per day
        let baseChance = 1 / 7;
        let bonus = 0;
        if (options.foodAbundant) bonus += 0.5;
        if (options.foodScarce) bonus -= 0.5;
        // Clamp bonus to [-0.5, 0.5]
        bonus = Math.max(-0.5, Math.min(0.5, bonus));
        let finalChance = baseChance * (1 + bonus);
        finalChance = Math.max(0, finalChance); // No negative chance

        let births = 0;
        let twins = 0;
        for (let i = 0; i < eligibleCouples; i++) {
            if (Math.random() < finalChance) {
                births++;
                if (Math.random() < 0.01) twins++;
            }
        }
        births += twins; // Each twin birth adds one more child

        return { births, twins, bonus, eligibleCouples };
    }
    constructor(initialPopulation = []) {
        // Each inhabitant: { id, name, role, age, status, location, skills, ... }
        this.population = initialPopulation;
        this.nextId = initialPopulation.length > 0 ? Math.max(...initialPopulation.map(p => p.id)) + 1 : 1;
    }

    addInhabitant(details) {
        // If age is not specified, default to 0 (newborn)
        const age = details.age !== undefined ? details.age : 0;
        // Determine if this villager is a child (not eligible to work)
        const isChild = age < 10;
        const canWork = !isChild;
        const inhabitant = {
            id: this.nextId++,
            name: details.name || `Inhabitant ${this.nextId}`,
            role: details.role || 'peasant',
            age: age,
            status: details.status || 'idle',
            location: details.location || 'village',
            skills: details.skills || [],
            gender: details.gender || (Math.random() < 0.5 ? 'male' : 'female'),
            isChild,
            canWork,
            ...details
        };
        this.population.push(inhabitant);
        return inhabitant;
    }

    removeInhabitant(id) {
        const idx = this.population.findIndex(p => p.id === id);
        if (idx !== -1) {
            return this.population.splice(idx, 1)[0];
        }
        return null;
    }

    getInhabitant(id) {
        return this.population.find(p => p.id === id) || null;
    }

    getAll() {
        return this.population;
    }

    getByRole(role) {
        return this.population.filter(p => p.role === role);
    }

    assignRole(id, newRole) {
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.role = newRole;
            return true;
        }
        return false;
    }

    updateStatus(id, status) {
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.status = status;
            return true;
        }
        return false;
    }

    moveInhabitant(id, newLocation) {
        const inhabitant = this.getInhabitant(id);
        if (inhabitant) {
            inhabitant.location = newLocation;
            return true;
        }
        return false;
    }

    // Utility: get population count by location or status
    countBy(filterFn) {
        return this.population.filter(filterFn).length;
    }

    toJSON() {
        return this.population;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopulationManager;
} else if (typeof window !== 'undefined') {
    window.PopulationManager = PopulationManager;
}

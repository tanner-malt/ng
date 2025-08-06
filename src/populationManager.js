// populationManager.js - Manages population details, roles, and assignments
// Used by both VillageManager and WorldManager

class PopulationManager {
    constructor(initialPopulation = []) {
        // Each inhabitant: { id, name, role, age, status, location, skills, ... }
        this.population = initialPopulation;
        this.nextId = initialPopulation.length > 0 ? Math.max(...initialPopulation.map(p => p.id)) + 1 : 1;
    }

    addInhabitant(details) {
        const inhabitant = {
            id: this.nextId++,
            name: details.name || `Inhabitant ${this.nextId}`,
            role: details.role || 'peasant',
            age: details.age || 18,
            status: details.status || 'idle', // idle, working, traveling, etc.
            location: details.location || 'village',
            skills: details.skills || [],
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

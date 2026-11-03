/**
 * scripts/seed.js
 * Generates initial seed JSON fixture and helper script for seeding database.
 */
const fs = require('fs');
const path = require('path');
const SeedGenerator = require('../shared/SeedGenerator.js');

const seedData = SeedGenerator.getInitialDatabase();
const targetPath = path.join(__dirname, '..', 'tests', 'fixtures', 'initial_seed.json');

fs.writeFileSync(targetPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`Initial seed database written to: ${targetPath}`);
console.log(`Total Tables: ${Object.keys(seedData).length}`);
console.log(`Total Initial Activities: ${seedData.Activities.length}`);

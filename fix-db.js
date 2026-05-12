const fs = require('fs');
const path = require('path');
const dbPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Insomnia', 'insomnia.Environment.db');
const lines = fs.readFileSync(dbPath, 'utf8').split('\n').filter(Boolean);
const envs = lines.map(l => JSON.parse(l));

console.log('Total envs:', envs.length);
const seen = new Set();
const toKeep = [];
for (const env of envs) {
  if (env.parentId && env.parentId !== 'proj_scratchpad' && env.parentId !== 'proj_default-project') {
     const key = env.parentId + '|' + env.name;
     if (seen.has(key)) {
        console.log('Duplicate found and removing:', env.name);
        continue;
     }
     seen.add(key);
  }
  toKeep.push(env);
}

fs.writeFileSync(dbPath, toKeep.map(e => JSON.stringify(e)).join('\n') + '\n');
console.log('DB fixed.');

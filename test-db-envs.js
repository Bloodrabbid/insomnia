const fs = require('fs');
const path = require('path');
const dbPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Insomnia', 'insomnia.Environment.db');
const lines = fs.readFileSync(dbPath, 'utf8').split('\n').filter(Boolean);
const envs = lines.map(l => JSON.parse(l));

for (const env of envs) {
  console.log(`_id: ${env._id}, parentId: ${env.parentId}, name: ${env.name}`);
  if (env.kvPairData) {
     console.log(`  Variables: ${env.kvPairData.map(v => v.name).join(', ')}`);
  }
}

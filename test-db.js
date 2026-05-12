const fs = require('fs');
const path = require('path');
const dbPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'Insomnia', 'insomnia.Workspace.db');
if (fs.existsSync(dbPath)) {
  console.log(fs.readFileSync(dbPath, 'utf8'));
} else {
  console.log('No workspace db found at', dbPath);
}

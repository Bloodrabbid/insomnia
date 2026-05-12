const url = "10.12.94.12:9000/v2/promocodes";
const subEnvironments = [
  {name: 'Dev', data: {backend_node: '10.12.94.12:9000'}},
  {name: 'Test', data: {backend_node: '127.0.0.1'}}
];

let foundSuggestion = null;

const checkEnv = (env, envName) => {
  if (!env?.data) return;
  for (const [key, val] of Object.entries(env.data)) {
    if (typeof val === 'string' && val.length > 3 && url.includes(val)) {
      foundSuggestion = { name: key, value: val, envName: envName };
      return true; // stop searching
    }
  }
}

// Check active first? Doesn't matter, we want ANY match.
for (const env of subEnvironments) {
  if (checkEnv(env, env.name)) break;
}

console.log("MATCH:", foundSuggestion);

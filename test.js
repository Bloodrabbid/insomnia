const url = "10.12.94.12:9000/v2/promocodes";
const subEnvironments = [{name: 'Dev', data: {backend_node: '10.12.94.12:9000'}}];
const activeEnvironment = {name: 'Test', data: {}};
const allVariables = {};

subEnvironments.forEach(env => {
  if (env.data) {
    Object.entries(env.data).forEach(([key, val]) => {
      if (typeof val === 'string' && val.length > 3) {
        allVariables[key] = { value: val, envName: env.name };
      }
    });
  }
});

for (const [name, meta] of Object.entries(allVariables)) {
  if (url.includes(meta.value)) {
    console.log("MATCH FOUND:", meta);
  }
}

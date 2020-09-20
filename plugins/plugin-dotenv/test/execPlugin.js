const dotenvPlugin = require('../plugin');

dotenvPlugin();

const testEnvs = Object.keys(process.env)
  .filter((key) => key.startsWith('__DOTENV_'))
  .reduce((ret, curr) => {
    ret[curr] = process.env[curr];
    return ret;
  }, {});

console.log(JSON.stringify(testEnvs));

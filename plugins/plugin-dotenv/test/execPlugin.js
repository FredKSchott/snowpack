const dotenvPlugin = require('../plugin');
const params = JSON.parse(process.argv[2]);

dotenvPlugin(null, params);

const testEnvs = Object.keys(process.env)
  .filter((key) => key.startsWith('__DOTENV_'))
  .reduce((ret, curr) => {
    ret[curr] = process.env[curr];
    return ret;
  }, {});

console.log(JSON.stringify(testEnvs));

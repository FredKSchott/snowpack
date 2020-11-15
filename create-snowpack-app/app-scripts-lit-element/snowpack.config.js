const fs = require('fs');
const path = require('path');
const url = require('url');

const isTS = fs.existsSync(url.pathToFileURL(path.join(process.cwd(), 'tsconfig.json')));

module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: ['@snowpack/plugin-babel', '@snowpack/plugin-dotenv'],
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
};

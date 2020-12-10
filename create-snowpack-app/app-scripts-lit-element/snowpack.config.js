const fs = require('fs');
const path = require('path');
const url = require('url');

const isTS = fs.existsSync(url.pathToFileURL(path.join(process.cwd(), 'tsconfig.json')));

module.exports = {
  mount: {
    public: {url: '/', static: true},
    src: {url: '/dist'},
  },
  plugins: ['@snowpack/plugin-babel', '@snowpack/plugin-dotenv'],
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
};

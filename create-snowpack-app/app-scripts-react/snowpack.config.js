const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const isTS = fs.existsSync(path.join(cwd, 'tsconfig.json'));

module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    ...(isTS ? [['@snowpack/plugin-run-script', {cmd: 'tsc --noEmit', watch: '$1 --watch'}]] : []),
  ],
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
};

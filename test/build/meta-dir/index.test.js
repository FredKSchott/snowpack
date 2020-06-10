const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('buildOptions.metaDir', () => {
  execa.commandSync('npm run TEST', {cwd: __dirname});
  // expect dir in package.json to exist
  expect(fs.existsSync(path.resolve(__dirname, 'build', 'static', 'snowpack')));
});

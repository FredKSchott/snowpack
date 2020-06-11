const fs = require('fs');
const assert = require('assert');
const path = require('path');
const execa = require('execa');

it('buildOptions.metaDir', () => {
  execa('node', ['npm', 'run', 'TEST']);
  // expect dir in package.json to exist
  assert(fs.existsSync(path.resolve(__dirname, 'build', 'static', 'snowpack')));
});

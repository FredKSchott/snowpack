const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('custom web_modules folder', () => {
  execa.sync('npm', ['run', 'TEST'], {
    cwd: __dirname,
    // override NODE_ENV=test from jest, otherwise snowpack will assume
    // development mode and try to copy from DEV_DEPENDENCIES_DIR
    env: { NODE_ENV: 'production' }
  });

  // should write modules to the custom folder on disk
  expect(fs.existsSync(path.join(__dirname, 'build', 'my_modules', 'array-flatten.js'))).toBe(true);

  // should rewrite path for web_modules imports
  const outputJS = fs.readFileSync(path.resolve(__dirname, 'build', '_dist_', 'index.js'), 'utf8');
  expect(outputJS).toContain('/my_modules/array-flatten.js');
});

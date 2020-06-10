const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('linked package install', () => {
  // setup
  const cwd = __dirname;
  execa.sync('npm', ['link'], {cwd: path.resolve(__dirname, 'packages', 'test-link')});
  execa.sync('npm', ['link', '@snowpack/test-link'], {cwd});
  execa.sync('npm', ['install'], {cwd});

  // test output (the assumption is if anything went wrong, these files wouldn’t be built)
  execa.sync('npm', ['run', 'TEST'], {cwd});
  expect(fs.existsSync(path.resolve(__dirname, 'build', '_dist_', 'index.js'))).toBe(true);
});

const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('yarn workspaces can build', () => {
  // run snowpack build on a Yarn workspaces project
  execa.sync('npm', ['run', 'TEST'], {cwd: path.resolve(__dirname, 'packages', 'snowpack')});

  const builtFile = fs.existsSync(
    path.resolve(__dirname, 'packages', 'snowpack', 'build', '_dist_', 'index.js'),
  );

  // expect the built file to exist (build didn’t fail with “missing dep”, etc.)
  expect(builtFile).toBe(true);
});

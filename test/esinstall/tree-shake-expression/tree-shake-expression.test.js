const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

const cwd = __dirname;

describe('tree shaking expressions', () => {
  it('works', async () => {
    const pkg = 'inner-module';
    const dest = path.join(cwd, 'test-output');
    await runTest([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    expect(output).toEqual(
      // left hand assignment not removed
      expect.stringContaining(`var wiggle`),
    );
  });
});

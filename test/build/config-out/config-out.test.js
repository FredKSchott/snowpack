const fs = require('fs');
const path = require('path');

const cwd = path.join(__dirname, 'TEST_BUILD_OUT');

describe('config: buildOptions.out', () => {
  it('respects buildOptions.out', () => {
    const distJS = path.join(cwd, 'src', 'index.js');
    expect(fs.existsSync(distJS)).toBe(true);

    const snowpackMeta = path.join(cwd, '__snowpack__', 'env.js');
    expect(fs.existsSync(snowpackMeta)).toBe(true);
  });
});

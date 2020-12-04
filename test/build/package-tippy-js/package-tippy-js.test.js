const fs = require('fs');
const path = require('path');

const cwd = path.join(__dirname, 'build');

describe('package: tippy.js', () => {
  it('builds to the correct path', () => {
    const mainEntry = path.join(cwd, 'web_modules', 'tippyjs.js');
    const assets = path.join(cwd, 'web_modules', 'tippyjs');

    expect(fs.existsSync(mainEntry) && fs.statSync(mainEntry).isFile()).toBe(true);
    expect(fs.existsSync(assets) && fs.statSync(assets).isDirectory()).toBe(true);
  });

  it('resolves imports', () => {
    const distJS = fs.readFileSync(path.join(cwd, '_dist_', 'index.js'), 'utf-8');

    expect(distJS).toEqual(
      expect.stringContaining(`import tippy from '../web_modules/tippyjs.js';`),
    );
  });
});

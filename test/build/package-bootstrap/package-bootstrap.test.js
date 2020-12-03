const fs = require('fs');
const path = require('path');

const cwd = path.join(__dirname, 'build');

describe('package: bootstrap', () => {
  it('resolves JS', () => {
    const distJS = fs.readFileSync(path.join(cwd, '_dist_', 'index.js'), 'utf-8');
    expect(distJS).toEqual(
      expect.stringContaining(
        `import '../web_modules/bootstrap/dist/css/bootstrap.min.css.proxy.js';`,
      ),
    );
  });
});

const fs = require('fs');
const path = require('path');

describe('installOptions.treeshake', () => {
  it('built web_modules/array-flatten.js', () => {
    const webModule = path.join(__dirname, 'build', 'web_modules', 'array-flatten.js');

    expect(fs.existsSync(webModule)).toBe(true);
    expect(fs.readFileSync(webModule, 'utf-8')).toBeTruthy();
  });

  it('built web_modules/async.js', () => {
    const webModule = path.join(__dirname, 'build', 'web_modules', 'async.js');

    expect(fs.existsSync(webModule)).toBe(true);
    expect(fs.readFileSync(webModule, 'utf-8')).toBeTruthy();
  });
});

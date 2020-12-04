const fs = require('fs');
const path = require('path');

describe('bugfix: named import', () => {
  // if this file built successfully, then the ipmort worked
  it('built', () => {
    const webModule = path.join(__dirname, 'build', 'web_modules', 'array-flatten.js');

    expect(fs.existsSync(webModule)).toBe(true);
    expect(fs.readFileSync(webModule, 'utf-8')).toBeTruthy();
  });
});

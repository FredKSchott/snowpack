/**
 * ⚠️ Note: this test has a special setup! Refer to tests/setup.js
 */

const fs = require('fs');
const path = require('path');

const IMPORTS = ['ansi-styles', 'chalk'];

describe('core: web_modules resolution', () => {
  it('resolves web_modules without case-sensitivity', () => {
    const distJS = fs.readFileSync(path.join(__dirname, 'build', '_dist_', 'index.js'), 'utf-8');
    IMPORTS.forEach((i) => {
      expect(distJS).toEqual(expect.stringContaining(`import '../web_modules/${i}.js';`));
    });
  });
});

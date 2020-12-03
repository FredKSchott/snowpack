const fs = require('fs');
const path = require('path');

const distJS = fs.readFileSync(path.join(__dirname, 'build', '_dist_', 'index.js'), 'utf-8');

describe('config: installOptions.externalPackage', () => {
  it('preserves external package', () => {
    expect(distJS.includes(`import 'fs';`)).toBe(true);
  });
});

const fs = require('fs');
const path = require('path');

describe('config: instantiated objects', () => {
  it('instantiated objects don’t affect build', () => {
    expect(fs.existsSync(path.join(__dirname, 'build', '_dist_', 'index.js'))).toBe(true);
  });
});

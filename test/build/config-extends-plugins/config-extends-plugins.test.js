const fs = require('fs');
const path = require('path');

describe('config: extends', () => {
  it('loads the appropriate plugins', () => {
    const snowpackEnv = fs.readFileSync(
      path.join(__dirname, 'build', '__snowpack__', 'env.js'),
      'utf-8',
    );
    expect(snowpackEnv.includes(`"SNOWPACK_PUBLIC_SECRET_VALUE":"pumpernickel"`)).toBe(true);
  });
});

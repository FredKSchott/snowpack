const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('@snowpack/plugin-vue', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('assumes .vue.js', () => {
    const index = fs.readFileSync(path.join(cwd, '_dist_', 'index.vue.js'), 'utf8');
    expect(index).toEqual(
      expect.stringContaining(`import MyComponent from './MyComponent.vue.js'`),
    );
  });
});

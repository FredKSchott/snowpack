const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

describe('prepare: packageOptions.external', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });
  it('prepare external package', () => {
    expect(
      fs.existsSync(path.join(__dirname, 'node_modules/.cache/snowpack/test/array-flatten@3.0.0')),
    ).toEqual(true);
    expect(fs.existsSync(path.join(__dirname, 'node_modules/.cache/snowpack/test/fs'))).toEqual(
      false,
    );
    expect(
      fs.existsSync(path.join(__dirname, 'node_modules/.cache/snowpack/test/vue/types')),
    ).toEqual(false);
  });
});

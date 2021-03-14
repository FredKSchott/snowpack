const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config-custom-path', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('Uses the configuration in the custom config path', () => {
    expect(files['/src/index.js']).toEqual(
      expect.stringContaining(`import {flatten} from '../other_folder/pkg/array-flatten.js';`),
    );
  });
});

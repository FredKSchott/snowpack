const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: buildOptions.jsxInject', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('injects jsxInject string in JSX file', () => {
    expect(files['/_dist_/jsx-file.js']).toContain(
      'import {h, Fragment} from "../_snowpack/pkg/preact.js"',
    );
  });

  it('injects jsxInject string in TSX file', () => {
    expect(files['/_dist_/tsx-file.js']).toContain(
      'import {h, Fragment} from "../_snowpack/pkg/preact.js"',
    );
  });

  it('does not inject jsxInject string into JS file', () => {
    expect(files['/_dist_/js-file.js']).not.toContain(
      'import {h, Fragment} from "../_snowpack/pkg/preact.js"',
    );
  });

  it('does not inject jsxInject string into TS file', () => {
    expect(files['/_dist_/ts-file.js']).not.toContain(
      'import {h, Fragment} from "../_snowpack/pkg/preact.js"',
    );
  });
});

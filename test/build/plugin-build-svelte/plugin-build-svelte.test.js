const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('@snowpack/plugin-build-svelte', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('builds source svelte files as expected', () => {
    const jsLoc = path.join(cwd, '_dist_', 'index.svelte.js');
    expect(fs.existsSync(jsLoc)).toBe(true); // file exists
    expect(fs.readFileSync(jsLoc, 'utf-8')).toContain(
      `import { refresh, comment, camera } from "../_snowpack/pkg/svelte-awesome/icons.js";`,
    ); // file has expected imports
    expect(fs.readFileSync(jsLoc, 'utf-8')).toContain(`import './index.svelte.css.proxy.js';`); // file has expected imports

    const cssLoc = path.join(cwd, '_dist_', 'index.svelte.css.proxy.js');
    expect(fs.existsSync(cssLoc)).toBe(true); // file exists
  });

  it('builds package svelte files as expected', () => {
    expect(fs.existsSync(path.join(cwd, '_snowpack', 'pkg', 'svelte-awesome.js'))).toBe(true); // import exists
    expect(
      fs.readFileSync(path.join(cwd, '_snowpack', 'pkg', 'svelte-awesome', 'icons.js'), 'utf-8'),
    ).toMatchSnapshot('svelte-awesome treeshaking'); // import exists, and was tree-shaken
  });
});

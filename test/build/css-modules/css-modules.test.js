const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('builds css.proxy.js file', () => {
    // test 1: classnames are transformed
    expect(files['/src/App.module.css.proxy.js']).toEqual(
      expect.stringMatching(/\._App_[A-Za-z0-9]+_[A-Za-z0-9]+ \{/),
    ); // note: we’re testing the CSS module classname somewhat—we’re asserting a specific format but allowing it to differ a little between builds

    // test 2: original classnames are discarded
    expect(files['/src/App.module.css.proxy.js']).not.toEqual(expect.stringContaining(`.App {`));
  });

  it('preserves CSS file (with CSS Module names)', () => {
    expect(files['/src/App.module.css']).not.toEqual(expect.stringContaining(`.App {`));
  });

  it('generates JSON', () => {
    expect(files['/src/App.module.css.json']).toBeTruthy();
  });
});

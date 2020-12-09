const {install} = require('esinstall');

describe('package-entrypoints browser configuration', () => {
  it('supports all of the variations', async () => {
    const cwd = __dirname;

    const targets = [
      // ".": "index.js"
      'export-map-dot-no-slash',

      // ".": { "browser": "index.js" }
      'export-map-object-browser',

      // ".": { "import": "index.js" }
      'export-map-object-import',

      // ".": { "default": "index.js" }
      'export-map-object-default',

      // ".": { "require": "index.js" }
      'export-map-object-require',
    ];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it.skip('"exports": "./index.js"', async () => {
    // This should be in the "supports all of the variations" test, putting here for visibility.
  });

  it.skip('"exports": { browser, import, etc. }', async () => {
    // This should be in the "supports all of the variations" test, putting here for visibility.
    /**
     * "exports": {
          "browser": "./esm/index.js",
          "require": "./cjs/index.js"
        }
     */
  });

  it.skip('"exports": { ".": "./index.js" }', async () => {
    // This should be in the "supports all of the variations" test, putting here for visibility.
    /**
     * "exports": {
          ".": "./index.js",
     */
  });

  it.skip('"exports" wildcards', async () => {
    // This should be in the "supports all of the variations" test, putting here for visibility.
    /**
     * "exports": {
          // …
          "./utils/*": "./utils/*.js"
        }
     */
  });

  it.skip('"exports" with arrays', async () => {
    // This should be in the "supports all of the variations" test, putting here for visibility.
    /**
     * WHY!
     *   "exports": {
            ".": ["./index.js", "./fallback.js"]
          }
     */
  });

  it("supports preact's configuration", async () => {
    const cwd = __dirname;

    const targets = ['preact', 'preact/hooks', 'preact/debug'];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('export . with slash throws', async () => {
    const cwd = __dirname;

    const targets = ['export-map-dot-slash'];

    const run = async () => {
      await install(targets, {
        cwd,
      });
    };

    expect(run).rejects.toThrow();
  });

  it('loading a missing export throws', async () => {
    const cwd = __dirname;

    const targets = ['preact/debug/src/check-props'];

    const run = async () => {
      await install(targets, {
        cwd,
      });
    };

    expect(run).rejects.toThrow();
  });
});

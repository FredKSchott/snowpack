const {findExportMapEntry, findManifestEntry, explodeExportMap} = require('../esinstall/lib');

describe('ESInstall API', () => {
  describe('findExportMapEntry', () => {
    it('returns a string value', () => {
      expect(findExportMapEntry('foo.js')).toBe('foo.js');
    });

    it('prefers browser', () => {
      expect(
        findExportMapEntry({
          browser: 'browser.js',
          import: 'import.js',
          default: 'default.js',
          require: 'require.js',
        }),
      ).toBe('browser.js');
    });

    it('picks import', () => {
      expect(
        findExportMapEntry({
          import: 'import.js',
          default: 'default.js',
          require: 'require.js',
        }),
      ).toBe('import.js');
    });

    it('picks default', () => {
      expect(
        findExportMapEntry({
          default: 'default.js',
          require: 'require.js',
        }),
      ).toBe('default.js');
    });

    it('picks require', () => {
      expect(
        findExportMapEntry({
          require: 'require.js',
          other: 'other.js',
        }),
      ).toBe('require.js');
    });

    it('takes conditions', () => {
      expect(
        findExportMapEntry(
          {
            development: {
              browser: 'error.js',
            },
            production: {
              import: 'prod.js',
            },
          },
          ['production'],
        ),
      ).toBe('prod.js');
    });
  });

  describe('findManifestEntry', () => {
    it('gets "exports"', () => {
      let entry = findManifestEntry({exports: 'esm.js', main: 'main.js'});
      expect(entry).toBe('esm.js');
    });

    it('gets "exports[.]"', () => {
      let entry = findManifestEntry({
        exports: {
          '.': 'esm.js',
        },
        main: 'main.js',
      });
      expect(entry).toBe('esm.js');
    });

    it('gets "main"', () => {
      let entry = findManifestEntry({main: 'foo.js'});
      expect(entry).toBe('foo.js');
    });

    it('gets "module"', () => {
      let entry = findManifestEntry({main: 'error.js', module: 'foo.js'});
      expect(entry).toBe('foo.js');
    });

    it('gets "browser:module"', () => {
      let entry = findManifestEntry({main: 'error.js', 'browser:module': 'mod.js'});
      expect(entry).toBe('mod.js');
    });

    it('gets "main:esnext"', () => {
      let entry = findManifestEntry({main: 'error.js', 'main:esnext': 'main.js'});
      expect(entry).toBe('main.js');
    });

    it('gets "jsnext:main"', () => {
      let entry = findManifestEntry({main: 'error.js', 'jsnext:main': 'jsnext.js'});
      expect(entry).toBe('jsnext.js');
    });

    it('gets "browser"', () => {
      let entry = findManifestEntry({
        main: 'error.js',
        browser: 'browser.js',
      });
      expect(entry).toBe('browser.js');

      entry = findManifestEntry({
        main: 'error.js',
        browser: {
          './': 'browser.js',
        },
      });
      expect(entry).toBe('browser.js');
    });
  });

  describe('explodeExportMap', () => {
    const cwd = __dirname;

    it('when export map is a string, returns an object with a .', () => {
      let map = explodeExportMap('./main.js', {cwd});

      expect(map).toStrictEqual({
        '.': './main.js',
      });
    });

    it('resolves keys to the entry', () => {
      let map = explodeExportMap(
        {
          '.': {
            browser: './entrypoint.js',
          },
          './other': {
            import: './other.js',
          },
        },
        {cwd},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './other': './other.js',
      });
    });

    it("ignores keys that don't start with .", () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          bad: './error.js',
        },
        {cwd},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
      });
    });

    it('ignores wildcards', () => {
      let map = explodeExportMap(
        {
          './other': './other.js',
          './': './',
        },
        {cwd},
      );

      expect(map).toStrictEqual({
        './other': './other.js',
      });
    });

    it('resolves arrays the first value', () => {
      let map = explodeExportMap(
        {
          '.': ['./entrypoint.js', './fallback.js'],
        },
        {cwd},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
      });
    });

    it('returns undefined if there are no valid entries', () => {
      let map = explodeExportMap(
        {
          bad: './error.js',
        },
        {cwd},
      );
      expect(map).toBe(undefined);
    });

    it('explodes wildcard exports', () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          './extras/*': './src/extras/*.js',
        },
        {cwd: __dirname + '/esinstall/package-entrypoints/export-map-star'},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './extras/one': './src/extras/one.js',
        './extras/two': './src/extras/two.js',
        './extras/three': './src/extras/three.js',
      });
    });

    it('explodes wildcard exports with object values', () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          './extras/*': {
            import: './src/extras/*.js',
          },
        },
        {cwd: __dirname + '/esinstall/package-entrypoints/export-map-star'},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './extras/one': './src/extras/one.js',
        './extras/two': './src/extras/two.js',
        './extras/three': './src/extras/three.js',
      });
    });

    it('explodes trailing slash exports', () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          './extras/': './src/extras/',
        },
        {cwd: __dirname + '/esinstall/package-entrypoints/export-map-trailing-slash'},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './extras/one.js': './src/extras/one.js',
        './extras/other.css': './src/extras/other.css',
        './extras/two.js': './src/extras/two.js',
        './extras/three.js': './src/extras/three.js',
      });
    });

    it('explodes trailing slash exports with object values', () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          './extras/': {
            default: './src/extras/',
          },
        },
        {cwd: __dirname + '/esinstall/package-entrypoints/export-map-trailing-slash'},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './extras/one.js': './src/extras/one.js',
        './extras/other.css': './src/extras/other.css',
        './extras/two.js': './src/extras/two.js',
        './extras/three.js': './src/extras/three.js',
      });
    });

    it('explodes trailing slash exports but ignores subdirs', () => {
      let map = explodeExportMap(
        {
          '.': './entrypoint.js',
          './dist/': './dist/',
          './dist/esm/helpers.js': './dist/esm/helpers.js',
        },
        {cwd: __dirname + '/esinstall/package-entrypoints/export-map-trailing-slash'},
      );

      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './dist/index.js': './dist/index.js',
        './dist/esm/helpers.js': './dist/esm/helpers.js',
      });
    });
  });
});

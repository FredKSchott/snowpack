const {
  normalizeExportMap,
  resolveExportMapEntry,
  resolveMainEntrypoint
} = require('../esinstall/lib');

describe('ESInstall API', () => {
  describe('resolveExportMapEntry', () => {
    it('returns a string value', () => {
      expect(resolveExportMapEntry('foo.js')).toBe('foo.js');
    })

    it('prefers browser', () => {
      expect(resolveExportMapEntry({ 
        browser: 'browser.js',
        import: 'import.js',
        default: 'default.js',
        require: 'require.js'
      })).toBe('browser.js');
    });

    it('picks import', () => {
      expect(resolveExportMapEntry({ 
        import: 'import.js',
        default: 'default.js',
        require: 'require.js'
      })).toBe('import.js');
    });

    it('picks default', () => {
      expect(resolveExportMapEntry({ 
        default: 'default.js',
        require: 'require.js'
      })).toBe('default.js');
    });

    it('picks require', () => {
      expect(resolveExportMapEntry({ 
        require: 'require.js',
        other: 'other.js'
      })).toBe('require.js');
    });
  })

  describe('normalizeExportMap', () => {
    it('when export map is a string, returns an object with a .', () => {
      let map = normalizeExportMap('./main.js');

      expect(map).toStrictEqual({
        '.': './main.js'
      });
    });

    it('resolves keys to the entry', () => {
      let map = normalizeExportMap({
        '.': {
          browser: './entrypoint.js'
        },
        './other': {
          import: './other.js'
        }
      });
      expect(map).toStrictEqual({
        '.': './entrypoint.js',
        './other': './other.js'
      });
    });

    it('ignores keys that don\'t start with .', () => {
      let map = normalizeExportMap({
        '.': './entrypoint.js',
        'bad': './error.js'
      });

      expect(map).toStrictEqual({
        '.': './entrypoint.js'
      });
    });

    it('ignores wildcards', () => {
      let map = normalizeExportMap({
        '.': './entrypoint.js',
        '/lib/*': './lib/*.js'
      });

      expect(map).toStrictEqual({
        '.': './entrypoint.js'
      });
    });

    it('resolves arrays the first value', () => {
      let map = normalizeExportMap({
        '.': [
          './entrypoint.js',
          './fallback.js'
        ]
      });

      expect(map).toStrictEqual({
        '.': './entrypoint.js'
      });
    });

    it('returns undefined if there are no valid entries', () => {
      let map = normalizeExportMap({
        'bad': './error.js'
      });
      expect(map).toBe(undefined);
    })
  });

  describe('resolveMainEntrypoint', () => {
    it('gets "exports"', () => {
      let entry = resolveMainEntrypoint({ exports: 'esm.js', main: 'main.js' });
      expect(entry).toBe('esm.js');
    });

    it('gets "exports[.]"', () => {
      debugger;
      let entry = resolveMainEntrypoint({
        exports: {
          '.': 'esm.js'
        },
        main: 'main.js'
      });
      expect(entry).toBe('esm.js');
    });

    it('gets "main"', () => {
      let entry = resolveMainEntrypoint({ main: 'foo.js' });
      expect(entry).toBe('foo.js');
    });

    it('gets "module"', () => {
      let entry = resolveMainEntrypoint({ main: 'error.js', module: 'foo.js' });
      expect(entry).toBe('foo.js');
    });

    it('gets "browser:module"', () => {
      let entry = resolveMainEntrypoint({ main: 'error.js', 'browser:module': 'mod.js' });
      expect(entry).toBe('mod.js');
    });

    it('gets "main:esnext"', () => {
      let entry = resolveMainEntrypoint({ main: 'error.js', 'main:esnext': 'main.js' });
      expect(entry).toBe('main.js');
    });

    it('gets "jsnext:main"', () => {
      let entry = resolveMainEntrypoint({ main: 'error.js', 'jsnext:main': 'jsnext.js' });
      expect(entry).toBe('jsnext.js');
    });

    it('gets "browser"', () => {
      let entry = resolveMainEntrypoint({
        main: 'error.js',
        browser: 'browser.js'
      });
      expect(entry).toBe('browser.js');

      entry = resolveMainEntrypoint({
        main: 'error.js',
        browser: {
          './': 'browser.js'
        }
      });
      expect(entry).toBe('browser.js');
    });
  });
});
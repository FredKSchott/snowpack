const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('import resource', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  describe('css', () => {
    it('proxy is created', () => {
      expect(files['/_dist_/styles.css.proxy.js']).toEqual(
        expect.stringContaining(`font-family: fantasy;`),
      );
    });

    it('proxy is resolved in JS', () => {
      expect(files['/_dist_/index.js']).toEqual(
        expect.stringContaining(`import "./styles.css.proxy.js";`),
      );
    });
  });

  describe('image', () => {
    it('proxy is resolved in JS', () => {
      expect(files['/_dist_/index.js']).toEqual(
        expect.stringContaining(`import "./logo.png.proxy.js";`),
      );
    });
  });

  describe('os compat', () => {
    // note: this test isn‘t aware of OS; it’s just something to run in multiple environments
    it('there are no backslashes anywhere in Windows', () => {
      expect(files['/_dist_/index.js']).not.toEqual(expect.stringContaining(`\\`));
    });
  });
});

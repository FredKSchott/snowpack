const plugin = require('../plugin.js');

jest.mock('@babel/core');
const babel = require('@babel/core');
babel.transformFileAsync = jest.fn(() => Promise.resolve({code: 'code', map: 'map'}));

/** jest mock above in worker will not work */
jest.mock('workerpool');
const workerpool = require('workerpool');
workerpool.pool = jest.fn((path) => ({
  proxy: jest.fn(() =>
    Promise.resolve({
      transformFileAsync: (...args) => babel.transformFileAsync(...args).then(JSON.stringify),
    }),
  ),
}));

beforeEach(() => {
  babel.transformFileAsync.mockClear();
});

describe('plugin-babel', () => {
  test('no options', async () => {
    const p = plugin(
      {
        buildOptions: {},
      },
      {},
    );
    expect(p).toMatchInlineSnapshot(`
      Object {
        "cleanup": [Function],
        "load": [Function],
        "name": "@snowpack/plugin-babel",
        "resolve": Object {
          "input": Array [
            ".js",
            ".mjs",
            ".jsx",
            ".ts",
            ".tsx",
          ],
          "output": Array [
            ".js",
          ],
        },
      }
    `);
    const result = await p.load({
      filePath: 'test.js',
    });
    const [filePath, options] = babel.transformFileAsync.mock.calls[0];
    expect(filePath).toMatchInlineSnapshot(`"test.js"`);
    expect(options).toMatchObject({
      cwd: process.cwd(),
      ast: false,
      compact: false,
      sourceMaps: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        ".js": Object {
          "code": "code",
          "map": "map",
        },
      }
    `);
  });

  describe('input option', () => {
    test('input option must be an array has at least 1 value', () => {
      expect(() =>
        plugin(
          {
            buildOptions: {},
          },
          {
            input: '.js',
          },
        ),
      ).toThrowErrorMatchingInlineSnapshot(
        `"options.input must be an array (e.g. ['.js', '.mjs', '.jsx', '.ts', '.tsx'])"`,
      );
      expect(() =>
        plugin(
          {
            buildOptions: {},
          },
          {
            input: [],
          },
        ),
      ).toThrowErrorMatchingInlineSnapshot(`"options.input must specify at least one filetype"`);
    });
    test('input option will overwrite the default resolve config', () => {
      expect(
        plugin(
          {
            buildOptions: {},
          },
          {
            input: ['.js'],
          },
        ).resolve,
      ).toMatchInlineSnapshot(`
        Object {
          "input": Array [
            ".js",
          ],
          "output": Array [
            ".js",
          ],
        }
      `);
    });
  });
  test('has transformOptions', async () => {
    const transformOptions = {
      ast: true,
      plugins: ['jsx'],
    };
    const p = plugin(
      {buildOptions: {}},
      {
        transformOptions,
      },
    );
    await p.load({
      filePath: 'test.js',
    });
    const [filePath, options] = babel.transformFileAsync.mock.calls[0];
    expect(options).toMatchObject({
      cwd: process.cwd(),
      ast: false,
      compact: false,
      sourceMaps: undefined,
      ...transformOptions,
    });
  });
  test('sourceMaps option will be overwritten', async () => {
    const transformOptions = {
      sourceMaps: 'inline',
    };
    const p = plugin(
      {
        buildOptions: {
          sourceMaps: false,
        },
      },
      {
        transformOptions,
      },
    );
    await p.load({
      filePath: 'test.js',
    });
    const [filePath, options] = babel.transformFileAsync.mock.calls[0];
    expect(options).toMatchObject({
      cwd: process.cwd(),
      ast: false,
      compact: false,
      ...transformOptions,
    });
  });
  test('process.env will be converted for source files', async () => {
    // Modify transformFileAsync mock to include a dummy `process.env`
    babel.transformFileAsync = jest.fn(() =>
      Promise.resolve({code: 'code [process.env.test]', map: 'map'}),
    );
    const p = plugin({
      buildOptions: {},
    });
    const result = await p.load({
      filePath: 'test.js',
      isPackage: false, // testing a source file
    });
    // Expect process.env to be converted to import.meta.env
    expect(result).toMatchInlineSnapshot(`
      Object {
        ".js": Object {
          "code": "code [import.meta.env.test]",
          "map": "map",
        },
      }
    `);
  });
  test('process.env will not be touched for package files', async () => {
    // Modify transformFileAsync mock to include a dummy `process.env`
    babel.transformFileAsync = jest.fn(() =>
      Promise.resolve({code: 'code [process.env.test]', map: 'map'}),
    );
    const p = plugin({
      buildOptions: {},
    });
    const result = await p.load({
      filePath: 'test.js',
      isPackage: true, // testing a package file
    });
    // Expect output to include import.meta.env default snippet
    expect(result).toMatchInlineSnapshot(`
      Object {
        ".js": Object {
          "code": "code [process.env.test]",
          "map": "map",
        },
      }
    `);
  });
});

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
});

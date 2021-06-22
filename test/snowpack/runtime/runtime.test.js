const {testRuntimeFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('runtime', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Can invalidate proxy files', async () => {
    const fixture = await testRuntimeFixture({
      'main.js': dedent`
        import data from './data.json';

        export function getData() {
          return data;
        }
      `,
      'data.json': dedent`
        [ 1, 2 ]
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-runtime-invalidate"
        }  
      `,
    });

    let mod = await fixture.runtime.importModule('/main.js');

    expect(mod.exports.getData()).toStrictEqual([1, 2]);

    // Change the file
    await fixture.writeFile(
      'data.json',
      dedent`
      [ 1, 2, 3 ]
    `,
    );

    try {
      fixture.runtime.invalidateModule('/data.json');
      mod = await fixture.runtime.importModule('/main.js');
      expect(mod.exports.getData()).toStrictEqual([1, 2, 3]);
    } finally {
      await fixture.cleanup();
    }
  });

  // This test is skipped due to the way Jest runs tests, you can't use dynamic import
  // which this test depends on. See:
  // https://github.com/nodejs/node/issues/35889
  it.skip('Provides import.meta.fileURL in SSR', async () => {
    const fixture = await testRuntimeFixture({
      'main.js': dedent`
        import fs from 'node:fs/promises';

        const url = new URL('./data.json', import.meta.url);

        export async function getData() {
          const json = await fs.readFile(url, 'utf-8');
          const data = JSON.parse(json);
          return data;
        }
      `,
      'data.json': dedent`
        [ 1, 2 ]
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-runtime-invalidate"
        }
      `,
      'snowpack.config.json': dedent`
        {
          "packageOptions": {
            "external": ["node:fs/promises"]
          }
        }
      `
    });

    try {
      let mod = await fixture.runtime.importModule('/main.js');

      expect(await mod.exports.getData()).toStrictEqual([1, 2]);
    } finally {
      await fixture.cleanup();
    }
  });

  it('Can import a CommonJS module as the default export', async () => {
    const fixture = await testRuntimeFixture({
      'packages/other/package.json': dedent`
        {
          "version": "1.0.0",
          "name": "other",
          "main": "main.js"
        }
      `,
      'packages/other/main.js': dedent`
        module.exports = () => 'works';
      `,
      'main.js': dedent`
        import fn from 'other';

        export function test() {
          return fn();
        }
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-runtime-import-cjs",
          "dependencies": {
            "other": "file:./packages/other"
          }
        }
      `,
      'snowpack.config.json': dedent`
        {
          "packageOptions": {
            "external": ["other"]
          }
        }
      `
    });

    try {
      let mod = await fixture.runtime.importModule('/main.js');
      expect(await mod.exports.test()).toEqual('works');
    } finally {
      await fixture.cleanup();
    }
  });
});

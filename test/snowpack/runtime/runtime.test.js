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
      'packages/dep/package.json': dedent`
        {
          "name": "@snowpack/test-runtime-metaurl-dep",
          "version": "0.0.1",
          "main": "main.js"
        }
      `,
      'packages/dep/main.js': dedent`
        import fs from 'node:fs';
        const readFile = fs.promises.readFile;

        export async function getData(url) {
          const json = await fs.readFile(url, 'utf-8');
          const data = JSON.parse(json);
          return data;
        }
      `,
      'main.js': dedent`
        import fs from 'node:fs/promises';
        import { getData as getDataDepFn } from '@snowpack/test-runtime-metaurl-dep';

        const url = new URL('./data.json', import.meta.url);
        const depUrl = new URL('./packages/dep/package.json', import.meta.url);

        export async function getData() {
          const json = await fs.readFile(url, 'utf-8');
          const data = JSON.parse(json);
          return data;
        }

        export async function getDepVersion() {
          return (await getDataDepFn(depUrl)).version;
        }
      `,
      'data.json': dedent`
        [ 1, 2 ]
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-runtime-metaurl"
        }
      `,
      'snowpack.config.json': dedent`
        {
          "packageOptions": {
            "external": ["node:fs/promises"]
          }
        }
      `,
    });

    try {
      let mod = await fixture.runtime.importModule('/main.js');

      expect(await mod.exports.getData()).toStrictEqual([1, 2]);
      expect(await mod.exports.getDepVersion()).equal('0.0.1');
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
      `,
    });

    try {
      let mod = await fixture.runtime.importModule('/main.js');
      expect(await mod.exports.test()).toEqual('works');
    } finally {
      await fixture.cleanup();
    }
  });

  it('Can handle folders with dots', async () => {
    const fixture = await testRuntimeFixture({
      'public/example.com/index.html': `<html></html>\n`,
      'public/example/index.html': `<html></html>\n`,
      'snowpack.config.js': `
        module.exports = {
          mount: {
            public: { url: '/', static: true }
          }
        }
      `,
    });
    try {
      let contents = (await fixture.loadUrl('/example.com/')).contents.toString('utf8');
      expect(contents).toEqual('<html></html>\n');
    } finally {
      await fixture.cleanup();
    }
  });

  it('Executes scripts in the correct order', async () => {
    const fixture = await testRuntimeFixture({
      'one.js': dedent`
        global.NUM = 1;
        export default {};
      `,
      'two.js': dedent`
        global.NUM++;
        export default global.NUM;
      `,
      'main.js': dedent`
        import one from './one.js';
        import two from './two.js';
        export const val = two;
      `
    });

    try {
      let mod = await fixture.runtime.importModule('/main.js');
      expect(await mod.exports.val).toEqual(2);
    } finally {
      await fixture.cleanup();
    }
  })
});

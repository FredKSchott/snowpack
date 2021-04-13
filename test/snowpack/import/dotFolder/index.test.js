const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('dotFolder', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Importing files in a dot folder works', async () => {
    const result = await testFixture({
      '.dot/file.js': dedent`
        export const a = 'b';
      `,
      'index.js': dedent`
        import {a} from './.dot/file.js';
        console.log('i got', a);
      `,
    });
    expect(result['.dot/file.js']).toBeDefined();
    expect(result['index.js']).toContain("import {a} from './.dot/file.js';");
  });
});

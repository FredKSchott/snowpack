const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('buildOptions.metaUrlPath', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Uses the configuration in the custom config path', async () => {
    const result = await testFixture(
      {
        packageOptions: {
          knownEntrypoints: ['array-flatten'],
        },
        buildOptions: {
          metaUrlPath: 'other_folder',
        },
      },
      {
        'index.js': dedent`
          import {flatten} from 'array-flatten';
          console.log(flatten);
        `,
      },
    );
    expect(result['index.js']).toEqual(
      expect.stringContaining(`import {flatten} from './other_folder/pkg/array-flatten.js';`),
    );
  });
});

const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('buildOptions.metaUrlPath', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Uses the meta url path in the config with knownEntrypoints', async () => {
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
    expect(result['other_folder/pkg/array-flatten.js']).toBeDefined();
    expect(result['index.js']).toEqual(
      expect.stringContaining(`import {flatten} from './other_folder/pkg/array-flatten.js';`),
    );
  });

  it('Uses the meta url path in the config with mounted directory', async () => {
    const result = await testFixture(
      {
        mount: {
          './public': '/',
        },
        buildOptions: {
          metaUrlPath: '/static/snowpack',
        },
      },
      {
        'public/index.js': dedent`
          export default function doNothing() {}
          console.log(import.meta.env);        
        `,
        'public/sub/index.js': dedent`
          export default function doNothing() {}
          console.log(import.meta.env);        
        `,
      },
    );
    expect(result['static/snowpack/env.js']).toBeDefined();
    expect(result['index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from './static/snowpack/env.js';`),
    );
    expect(result['sub/index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from '../static/snowpack/env.js';`),
    );
  });
});

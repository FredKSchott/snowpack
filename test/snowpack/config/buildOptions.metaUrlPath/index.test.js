const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('buildOptions.metaUrlPath', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Uses the meta url path in the config with knownEntrypoints', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import {flatten} from 'array-flatten';
        console.log(flatten);
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            knownEntrypoints: ['array-flatten'],
          },
          buildOptions: {
            metaUrlPath: 'other_folder',
          },
        };
      `,
    });
    expect(result['other_folder/pkg/array-flatten.js']).toBeDefined();
    expect(result['index.js']).toContain(
      `import {flatten} from './other_folder/pkg/array-flatten.js';`,
    );
  });

  it('Uses the meta url path in the config with mounted directory', async () => {
    const result = await testFixture({
      'public/index.js': dedent`
          export default function doNothing() {}
          console.log(import.meta.env);        
        `,
      'public/sub/index.js': dedent`
          export default function doNothing() {}
          console.log(import.meta.env);        
        `,
      'snowpack.config.js': dedent`
          module.exports = {
            mount: {
              './public': '/',
            },
            buildOptions: {
              metaUrlPath: '/static/snowpack',
            },
          };
        `,
    });
    expect(result['static/snowpack/env.js']).toBeDefined();
    expect(result['index.js']).toContain(
      `import * as __SNOWPACK_ENV__ from './static/snowpack/env.js';`,
    );
    expect(result['sub/index.js']).toContain(
      `import * as __SNOWPACK_ENV__ from '../static/snowpack/env.js';`,
    );
  });
});

const {testFixture, testRuntimeFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

const pkg = {
  'index.js': dedent`
    import {NetworkCanvas} from '@nivo/network';
  `,
  'package.json': JSON.stringify(
    {
      dependencies: {
        '@nivo/core': '^0.72.0',
        '@nivo/network': '^0.72.0',
      },
    },
    undefined,
    2,
  ),
};

// Main thing we’re testing for here is this keeps on resolving circular deps and never stops (https://github.com/snowpackjs/snowpack/issues/3466)
describe('@nivo/core', () => {
  it('dev', async () => {
    const server = await testRuntimeFixture(pkg);
    const js = (await server.loadUrl('/index.js')).contents.toString('utf8');
    expect(js).toBeTruthy(); // if this returned some response,
    await server.cleanup(); // clean up
  });

  it('build', async () => {
    const result = await testFixture(pkg);
    expect(result['index.js']).toBeTruthy();
  });
});

const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('importing .astro files', () => {
  it('included in the bundle', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-astro');

    // Run Test
    const {
      importMap: {imports},
    } = await runTest(['astro-components/Wow.astro'], {
      cwd,
      dest,
      rollup: {
        plugins: [
          {
            load() {
              return 'export default "so wow";';
            },
          },
        ],
      },
    });

    expect(imports['astro-components/Wow.astro']).toBe('./astro-components/Wow.astro.js');
  });
});

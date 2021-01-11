const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('Rollup config', () => {
  it('it can be passed through the rollup option', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-rollup');
    const spec = 'svelte-routing';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
      rollup: {
        plugins: [require('rollup-plugin-svelte')()],
      },
    });

    // install would have thrown without the plugin, so getting here is enough.
    expect(imports[spec]).toBeTruthy();
  });

  it('omitting the rollup plugin will throw on install', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-rollup-no-plugin');
    const spec = 'svelte-routing';

    try {
      await runTest([spec], {
        cwd,
        dest,
        rollup: {
          // No plugin makes svelte sad
        },
      });

      // Shouldn't have gotten here :(
      expect(false).toBeTruthy();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});

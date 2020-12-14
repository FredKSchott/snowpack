const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('Rollup config', () => {
  it('it can be passed through the rollup option', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-rollup');
    const spec = 'svelte-routing';

    const {
      importMap: {imports}
    } = await install([spec], {
      cwd,
      dest,
      rollup: {
        plugins: [require('rollup-plugin-svelte')()]
      }
    });

    // install would have thrown without the plugin, so getting here is enough.
    expect(imports[spec]).toBeTruthy();
  });
});

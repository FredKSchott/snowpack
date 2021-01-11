const {runTest} = require('../esinstall-test-utils.js');

require('jest-specific-snapshot'); // allows to call expect().toMatchSpecificSnapshot(filename, snapshotName)

describe('config-package-svelte', () => {
  it('fails when no svelte plugin provided', async () => {
    return expect(() =>
      runTest(['simple-svelte-autocomplete'], {cwd: __dirname, packageLookupFields: ['svelte']}),
    ).rejects.toThrowError(`Install failed.`);
    // TODO:
    // Assert the reason: Failed to load ../../../node_modules/simple-svelte-autocomplete/src/SimpleAutocomplete.svelte
    // Try installing rollup-plugin-vue and adding it to Snowpack (https://www.snowpack.dev/guides/vue)
  });

  it('succeeds when svelte plugin is provided', async () => {
    const result = await runTest(['simple-svelte-autocomplete'], {
      cwd: __dirname,
      packageLookupFields: ['svelte'],
      rollup: {
        plugins: [require('rollup-plugin-svelte')({include: /\.svelte$/})],
      },
    });
    return expect(result.importMap).toEqual({
      imports: {'simple-svelte-autocomplete': './simple-svelte-autocomplete.js'},
    });
  });
});

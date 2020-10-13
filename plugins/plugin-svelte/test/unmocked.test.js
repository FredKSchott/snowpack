const path = require('path');
const plugin = require('../plugin');

const mockConfig = {buildOptions: {sourceMaps: false}, installOptions: {rollup: {plugins: []}}};
const mockComponent = path.join(__dirname, 'Button.svelte');

describe('@snowpack/plugin-svelte (unmocked)', () => {
  it('generates code', async () => {
    const options = {configFilePath: './plugins/plugin-svelte/test/svelte.config.js'};
    const sveltePlugin = plugin(mockConfig, options);
    const result = await sveltePlugin.load({filePath: mockComponent});

    // assume if some CSS & JS were returned, it transformed successfully
    expect(result['.css'].code).toBeTruthy();
    expect(result['.js'].code).toBeTruthy();
  });
  it('logs error if config options set but finds no file', async () => {
    const consoleSpy = await jest.spyOn(console, 'error').mockImplementation(() => {});
    const options = {configFilePath: './plugins/plugin-svelte/svelte.config.js'};
    const sveltePlugin = plugin(mockConfig, options);
    const result = await sveltePlugin.load({filePath: mockComponent});

    expect(consoleSpy).toHaveBeenCalled();
  });
});

const path = require('path');

const mockCompiler = jest.fn().mockImplementation((code) => ({js: {code}}));
const mockPreprocessor = jest.fn().mockImplementation((code) => code);
jest.mock('svelte/compiler', () => ({compile: mockCompiler, preprocess: mockPreprocessor})); // important: mock before import

const plugin = require('../plugin');

const mockConfig = {buildOptions: {sourceMaps: false}, installOptions: {rollup: {plugins: []}}};
const mockComponent = path.join(__dirname, 'Button.svelte');

describe('@snowpack/plugin-svelte (mocked)', () => {
  afterEach(() => {
    mockCompiler.mockClear();
    mockPreprocessor.mockClear();
  });

  it('passes options to compiler', async () => {
    const options = {
      generate: 'ssr',
      isDev: false,
    };
    const sveltePlugin = plugin(mockConfig, options);
    await sveltePlugin.load({filePath: mockComponent});
    const passedOptions = mockCompiler.mock.calls[0][1];

    // this tests that all options passed above made it to the compiler
    // objectContaining() allows additional options to be passed, but we only care that our options have been preserved
    expect(passedOptions).toEqual(expect.objectContaining(options));
  });

  it('handles preprocessing', async () => {
    // test-only config option
    const options = {__config: path.join(__dirname, 'svelte.config.js')};

    const sveltePlugin = plugin(mockConfig, options);

    await sveltePlugin.load({filePath: mockComponent});

    // as long as this function has been called, we can assume success
    expect(mockPreprocessor).toHaveBeenCalled();
  });
});

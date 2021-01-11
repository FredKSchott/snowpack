const path = require('path');

const mockCompiler = jest.fn().mockImplementation((code) => ({js: {code}}));
const mockPreprocessor = jest.fn().mockImplementation((code) => code);
jest.mock('svelte/compiler', () => ({compile: mockCompiler, preprocess: mockPreprocessor})); // important: mock before import

const plugin = require('../plugin');

let DEFAULT_CONFIG;
const mockComponent = path.join(__dirname, 'Button.svelte');

describe('@snowpack/plugin-svelte (mocked)', () => {
  beforeEach(() => {
    DEFAULT_CONFIG = {
      buildOptions: {sourceMaps: false},
      packageOptions: {
        source: 'local',
        rollup: {plugins: []},
        packageLookupFields: [],
      },
    };
  });
  afterEach(() => {
    mockCompiler.mockClear();
    mockPreprocessor.mockClear();
  });

  it('logs error if config options set but finds no file', async () => {
    expect(() => {
      plugin(DEFAULT_CONFIG, {
        configFilePath: './plugins/plugin-svelte/this-file-does-not-exist.js',
      });
    }).toThrow(/failed to find Svelte config file/);
  });

  it('logs error if compileOptions is used instead of compilerOptions', async () => {
    expect(() => {
      plugin(DEFAULT_CONFIG, {
        compileOptions: {__test: 'ignore'},
      });
    }).toThrow(
      `[plugin-svelte] Could not recognize "compileOptions". Did you mean "compilerOptions"?`,
    );
  });

  it('logs error if old style config format is used', async () => {
    const badOptionCheck = /Svelte\.compile options moved to new config value/;
    expect(() =>
      plugin(DEFAULT_CONFIG, {
        css: false,
      }),
    ).toThrow(badOptionCheck);
    expect(() =>
      plugin(DEFAULT_CONFIG, {
        generate: 'dom',
      }),
    ).toThrow(badOptionCheck);
  });

  it('logs error if resolve input is invalid', async () => {
    expect(() => {
      plugin(DEFAULT_CONFIG, {
        input: '.svelte',
      });
    }).toThrow(`[plugin-svelte] Option "input" must be an array (e.g. ['.svelte', '.svx'])`);
    expect(() => {
      plugin(DEFAULT_CONFIG, {
        input: [],
      });
    }).toThrow(`[plugin-svelte] Option "input" must specify at least one filetype`);
  });

  it('passes compilerOptions to compiler', async () => {
    const compilerOptions = {
      __test: 'compilerOptions',
    };
    const sveltePlugin = plugin(DEFAULT_CONFIG, {compilerOptions});
    await sveltePlugin.load({filePath: mockComponent});
    expect(mockCompiler.mock.calls[0][1]).toEqual({
      __test: 'compilerOptions',
      css: false,
      dev: true,
      filename: mockComponent,
      generate: 'dom',
      outputFilename: mockComponent,
    });
  });

  it('passes preprocess options to compiler', async () => {
    const preprocess = {__test: 'preprocess'};
    const sveltePlugin = plugin(DEFAULT_CONFIG, {preprocess});
    await sveltePlugin.load({filePath: mockComponent});
    expect(mockPreprocessor.mock.calls[0][1]).toEqual(preprocess);
  });

  // For our users we load from the current working directory, but in jest that doesn't make sense
  it.skip('load config from a default svelte config file', async () => {
    const sveltePlugin = plugin(DEFAULT_CONFIG, {});
    await sveltePlugin.load({filePath: mockComponent});
    expect(mockCompiler.mock.calls[0][1]).toEqual({__test: 'svelte.config.js'});
    expect(mockPreprocessor.mock.calls[0][1]).toEqual({__test: 'svelte.config.js::preprocess'});
  });

  it('load config from a custom svelte config file', async () => {
    const sveltePlugin = plugin(DEFAULT_CONFIG, {
      configFilePath: './plugins/plugin-svelte/test/custom-config.js',
    });
    await sveltePlugin.load({filePath: mockComponent});
    expect(mockCompiler.mock.calls[0][1]).toEqual({
      __test: 'custom-config.js',
      css: false,
      dev: true,
      filename: mockComponent,
      generate: 'dom',
      outputFilename: mockComponent,
    });
    expect(mockPreprocessor.mock.calls[0][1]).toEqual({__test: 'custom-config.js::preprocess'});
  });

  it('resolves custom file extensions', async () => {
    expect(
      plugin(DEFAULT_CONFIG, {
        input: ['.svelte', '.svx'],
      }).resolve.input,
    ).toMatchInlineSnapshot(`
      Array [
        ".svelte",
        ".svx",
      ]
    `);
    expect(
      plugin(DEFAULT_CONFIG, {
        input: ['.svx'],
      }).resolve.input,
    ).toMatchInlineSnapshot(`
      Array [
        ".svx",
      ]
    `);
  });
  it('supports importing svelte components', async () => {
    const config = {...DEFAULT_CONFIG};
    plugin(config, {});
    expect(config.packageOptions.packageLookupFields).toEqual(['svelte']);
    config.packageOptions.packageLookupFields = ['module'];
    plugin(config, {});
    expect(config.packageOptions.packageLookupFields).toEqual(['module', 'svelte']);
  });
});

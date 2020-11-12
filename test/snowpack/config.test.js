const {extractImports} = require('css-modules-loader-core');
const {loadAndValidateConfig} = require('../../snowpack/lib/config.js');

describe('config', () => {
  it('default', () => {
    const defaultConfig = loadAndValidateConfig([], {});

    // test generic values
    expect(defaultConfig).toEqual(
      expect.objectContaining({
        alias: {},
        buildOptions: expect.objectContaining({
          baseUrl: '/',
          clean: false,
          metaDir: '__snowpack__',
          minify: false,
          sourceMaps: false,
          watch: false,
          webModulesUrl: '/web_modules',
        }),
        devOptions: expect.objectContaining({
          fallback: 'index.html',
          hmrDelay: 0,
          hmrErrorOverlay: true,
          hmrPort: undefined,
          hostname: 'localhost',
          open: 'default',
          output: 'dashboard',
          port: 8080,
          secure: false,
        }),
        exclude: expect.arrayContaining([
          '**/node_modules/**/*',
          '**/web_modules/**/*',
          '**/.types/**/*',
        ]),
        installOptions: {
          packageLookupFields: [],
          rollup: {plugins: []},
        },
        knownEntrypoints: [],
        proxy: [],
        scripts: {},
        testOptions: {files: ['__tests__/**/*', '**/*.@(spec|test).*']},
        webDependencies: undefined,
      }),
    );

    // test system-specific values (this changes according to the machine)
    expect(defaultConfig.buildOptions.out.length).toBeGreaterThan(0);

    // add more here
  });
});

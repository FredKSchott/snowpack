mockBabel();
const path = require('path');
const fs = require('fs');
const pluginReactRefresh = require('../plugin');

const htmlFilePath = path.resolve(__dirname, './stubs/stub.html');
const htmlFileContent = fs.readFileSync(htmlFilePath, {
  encoding: 'utf-8',
});
const htmlTransformOptions = {
  contents: htmlFileContent,
  fileExt: '.html',
  id: 'stub.html',
  isDev: true,
};
const jsFilePath = path.resolve(__dirname, './stubs/stub.js');
const jsFileContent = fs.readFileSync(jsFilePath, {
  encoding: 'utf-8',
});
const jsTransformOptions = {
  contents: jsFileContent,
  fileExt: '.js',
  id: 'stub.js',
  isDev: true,
};

function mockBabel() {
  jest.mock('@babel/core');
  const babel = require('@babel/core');
  babel.transformAsync = jest
    .fn()
    .mockName('babel.transformAsync')
    .mockImplementation(async (contents, options, ...args) => {
      options.plugins = (options.plugins || []).map((plugin) => {
        if (Array.isArray(plugin)) {
          if (plugin[1]) {
            plugin[1].skipEnvCheck = true;
          }
          return plugin;
        }
        // Fix: React Refresh Babel transform should only be enabled in development environment.
        // Instead, the environment is: "test".
        // If you want to override this check, pass {skipEnvCheck: true} as plugin options.
        return [plugin, { skipEnvCheck: true }];
      });

      // Stop `jest.requireActual('@babel/core').transformAsync()` from requiring mocked babel function
      jest.unmock('@babel/core');
      const ret = await jest
        .requireActual('@babel/core')
        .transformAsync(contents, options, ...args);
      mockBabel();

      return ret;
    });
}

/**
 * 
 * This 1-liner depends on `flatMap`, which is not yet available in Node 10
 * TODO use this 1-liner when Node 10 is deprecated
const cartesian = (...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
 */
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

describe('@snowpack/plugin-react-refresh', () => {
  const hmrConfigs = [true, false];
  const babelConfigs = [true, false];
  const devConfigs = [true, false];

  cartesian(hmrConfigs, babelConfigs, devConfigs).forEach(([hmr, babel, isDev]) => {
    describe(`hmr=${hmr}, babel=${babel}, isDev=${isDev}`, () => {
      const pluginInstance = pluginReactRefresh(
        {
          devOptions: {
            hmr,
          },
        },
        { babel },
      );
      const pluginTransform = pluginInstance.transform;
      it('transforms html correctly', async () => expect(await pluginTransform({ ...htmlTransformOptions, isDev })).toMatchSnapshot());
      it('transforms js correctly', async () => expect(await pluginTransform({ ...jsTransformOptions, isDev })).toMatchSnapshot());
    });
  });
});

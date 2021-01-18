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
  isHmrEnabled: true,
  isSSR: false
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
  isHmrEnabled: true,
  isSSR: false
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
        return [plugin, {skipEnvCheck: true}];
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

async function testPluginInstance(pluginInstance, overrides = {}) {
  const pluginTransform = pluginInstance.transform;
  expect(await pluginTransform({...htmlTransformOptions, ...overrides})).toMatchSnapshot('html');
  expect(await pluginTransform({...jsTransformOptions, ...overrides})).toMatchSnapshot('js');
}

describe('@snowpack/plugin-react-refresh', () => {
  test('transform js and html', async () => {
    const pluginInstance = pluginReactRefresh(
      {},
      {babel: true},
    );
    await testPluginInstance(pluginInstance);
  });
  test('don\'t transform when disabled', async () => {
    const pluginInstance = pluginReactRefresh(
      {},
      {babel: true},
    );
    await testPluginInstance(pluginInstance, {isDev: false});
  })
  test('transform js and html when hmr is disabled', async () => {
    const pluginInstance = pluginReactRefresh(
      {},
      {babel: true},
    );
    await testPluginInstance(pluginInstance, {isHmrEnabled: false});
  });

  test('transform js and html when running in SSR', async () => {
    const pluginInstance = pluginReactRefresh(
      {},
      {babel: true},
    );
    await testPluginInstance(pluginInstance, {isSSR: true});
  });

  test('transform js and html when babel is disabled', async () => {
    const pluginInstance = pluginReactRefresh(
      {
        devOptions: {
          hmr: true,
        },
      },
      {babel: false},
    );
    await testPluginInstance(pluginInstance);
  });
});

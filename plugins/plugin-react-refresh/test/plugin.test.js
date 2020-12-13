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

async function testPluginInstance(pluginInstance) {
  const pluginTransform = pluginInstance.transform;
  expect(await pluginTransform(htmlTransformOptions)).toMatchSnapshot('html');
  expect(await pluginTransform(jsTransformOptions)).toMatchSnapshot('js');
  expect(await pluginTransform({...htmlTransformOptions, isDev: false})).toMatchSnapshot(
    'html and isDev=false',
  );
  expect(await pluginTransform({...jsTransformOptions, isDev: false})).toMatchSnapshot(
    'js and isDev=false',
  );
}

describe('@snowpack/plugin-react-refresh', () => {
  test('transform js and html', async () => {
    const pluginInstance = pluginReactRefresh(
      {
        devOptions: {
          hmr: true,
        },
      },
      {babel: true, reactRefreshOptions: {skipEnvCheck: true}},
    );
    await testPluginInstance(pluginInstance);
  });

  test('transform js and html when hmr is disabled', async () => {
    const pluginInstance = pluginReactRefresh(
      {
        devOptions: {
          hmr: false,
        },
      },
      {babel: true, reactRefreshOptions: {skipEnvCheck: true}},
    );
    await testPluginInstance(pluginInstance);
  });

  test('transform js and html when babel is disabled', async () => {
    const pluginInstance = pluginReactRefresh(
      {
        devOptions: {
          hmr: true,
        },
      },
      {babel: false, reactRefreshOptions: {skipEnvCheck: true}},
    );
    await testPluginInstance(pluginInstance);
  });
});

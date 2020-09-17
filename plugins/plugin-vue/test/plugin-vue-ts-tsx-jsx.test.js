const path = require('path');
const plugin = require('../plugin');

test('plugin vue with ts', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentTs.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin vue with tsx', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentTsx.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin vue with jsx', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentJsx.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

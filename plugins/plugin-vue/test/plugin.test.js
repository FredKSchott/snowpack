const path = require('path');
const plugin = require('../plugin');

test('plugin base', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: false,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContent.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin base with sourceMap', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContent.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin base only tpl', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentOnlyTpl.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin base style scoped', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentStyleScoped.vue');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
  });
  expect(resultContent['.css'].code).toMatch(/h1\[data-v-.*\]/);
});

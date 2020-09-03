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

// BUG: hashsum maybe different in test environment
test.skip('plugin base style scoped', async () => {
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
  expect(resultContent).toMatchSnapshot();
});

test.skip('plugin base with error tpl', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentErrorTpl.vue');
  try {
    const resultContent = await pluginLoad({
      filePath: codeFilePath,
    });
    expect(resultContent).toMatchSnapshot();
  } catch (error) {
    expect(error).toMatchSnapshot();
  }
});

test.skip('plugin base with error style', async () => {
  const pluginInstance = plugin({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/VueContentErrorStyle.vue');
  try {
    const resultContent = await pluginLoad({
      filePath: codeFilePath,
    });
    expect(resultContent).toMatchSnapshot();
  } catch (error) {
    expect(error).toMatchSnapshot();
  }
});
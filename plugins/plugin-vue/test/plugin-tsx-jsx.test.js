const path = require('path');
const pluginTsxJsx = require('../plugin-tsx-jsx.js');

test('plugin with tsx', async () => {
  const pluginInstance = pluginTsxJsx({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/TsxContent.tsx');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
    fileExt: '.tsx',
  });
  expect(resultContent).toMatchSnapshot();
});

test('plugin with jsx', async () => {
  const pluginInstance = pluginTsxJsx({
    buildOptions: {
      sourceMap: true,
    },
  });
  const pluginLoad = pluginInstance.load;
  const codeFilePath = path.resolve(__dirname, './stubs/JsxContent.jsx');
  const resultContent = await pluginLoad({
    filePath: codeFilePath,
    fileExt: '.jsx',
  });
  expect(resultContent).toMatchSnapshot();
});

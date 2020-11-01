const fs = require('fs');
const path = require('path');
const plugin = require('../plugin.js');

const cssPath = path.resolve(__dirname, './stubs/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');
const configFilePath = path.resolve(__dirname, './stubs/postcss.config.js');

jest.mock('execa');
const execa = require('execa');

describe('@snowpack/plugin-postcss', () => {
  beforeEach(() => {
    execa.mockClear();
    execaFn = jest.fn(() => {
      return {
        stdout: 'stdout',
        stderr: 'stderr',
      };
    });
    execa.mockImplementation(execaFn);
  });

  test('with no options', async () => {
    const pluginInstance = plugin({}, {});
    const transformCSSResults = await pluginInstance.transform({
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(execa.mock.calls[0]).toContain('postcss');
    expect(execa.mock.calls[0][1]).not.toEqual([`--config ${configFilePath}`]);
  });

  test('passing in a config file', async () => {
    const options = {
      config: path.resolve(configFilePath),
    };
    const pluginInstance = plugin({}, options);
    const transformCSSResults = await pluginInstance.transform({
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(execa.mock.calls[0]).toContain('postcss');
    expect(execa.mock.calls[0][1]).toEqual([`--config ${configFilePath}`]);
  });
});

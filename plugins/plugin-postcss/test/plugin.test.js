const fs = require('fs');
const path = require('path');
const plugin = require('../plugin.js');

const cssPath = path.resolve(__dirname, 'stubs', 'style.css');
const minCssPath = path.resolve(__dirname, 'stubs', 'style.min.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const minCssContent = fs.readFileSync(minCssPath, 'utf8');
const configFilePath = path.resolve(__dirname, './stubs/postcss.config.js');

describe('@snowpack/plugin-postcss', () => {
  test('loads postcss config with no options', async () => {
    const pluginInstance = plugin({root: path.resolve(__dirname, 'stubs')}, {});
    const transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(transformCSSResults.code).toBe(minCssContent); // TODO: remove this?
    expect(transformCSSResults.contents).toBe(minCssContent);
    expect(transformCSSResults.map).toBe(undefined);
    await pluginInstance.cleanup();
  });

  test('accepts a path to a config file', async () => {
    const options = {
      config: path.resolve(configFilePath),
    };
    const pluginInstance = plugin({}, options);
    const transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(transformCSSResults.code).toBe(minCssContent); // TODO: remove this?
    expect(transformCSSResults.contents).toBe(minCssContent);
    expect(transformCSSResults.map).toBe(undefined);
    await pluginInstance.cleanup();
  });

  test('produces source maps with sourceMaps: true', async () => {
    const pluginInstance = plugin(
      {root: path.resolve(__dirname, 'stubs'), buildOptions: {sourceMaps: true}},
      {},
    );
    const transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(transformCSSResults.code).toBe(minCssContent); // TODO: remove this?
    expect(transformCSSResults.contents).toBe(minCssContent);
    expect(transformCSSResults.map).toEqual(
      // a raw source map object
      expect.objectContaining({
        version: expect.any(Number),
        mappings: expect.any(String),
      }),
    );
    await pluginInstance.cleanup();
  });

  test('bails with empty input array', async () => {
    const pluginInstance = plugin({root: path.resolve(__dirname, 'stubs')}, {input: []});
    const transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(transformCSSResults).toBeFalsy();
    await pluginInstance.cleanup();
  });
});

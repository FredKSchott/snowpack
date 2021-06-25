const fs = require('fs');
const path = require('path');
const plugin = require('../plugin.js');

const cssPath = path.join(__dirname, 'fixtures', 'style.css');
const minCssPath = path.join(__dirname, 'fixtures', 'style.min.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const minCssContent = fs.readFileSync(minCssPath, 'utf8');

describe('@snowpack/plugin-postcss', () => {
  test('loads postcss config with no options', async () => {
    const pluginInstance = plugin({root: path.join(__dirname, 'fixtures')}, {});
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
    const pluginInstance = plugin(
      {},
      {config: path.join(__dirname, 'fixtures', 'postcss.config.js')},
    );
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
      {root: path.join(__dirname, 'fixtures'), buildOptions: {sourceMaps: true}},
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
    const pluginInstance = plugin({root: path.join(__dirname, 'fixtures')}, {input: []});
    const transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });
    expect(transformCSSResults).toBeFalsy();
    await pluginInstance.cleanup();
  });

  test('allows dynamic config', async () => {
    // important: make sure to NOT set {root:} here so it doesn’t automatically pick up fixtures/postcss.config.js
    const pluginInstance = plugin({}, {config: {plugins: {cssnano: {}}}});
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

  test('the correct "from" is provided', async () => {
    const pluginInstance = plugin(
      {root: path.join(__dirname, 'fixtures', 'from')},
      {
        config: path.join(__dirname, 'fixtures', 'from', 'postcss.config.js'),
      },
    );

    const cssPath = path.join(__dirname, 'fixtures', 'from', 'style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    let transformCSSResults = await pluginInstance.transform({
      id: cssPath,
      fileExt: path.extname(cssPath),
      contents: cssContent,
    });

    const fromCssPath = path.join(__dirname, 'fixtures', 'from', 'from.css');
    const fromCssContent = fs.readFileSync(fromCssPath, 'utf8');
    transformCSSResults = await pluginInstance.transform({
      id: fromCssPath,
      fileExt: path.extname(fromCssPath),
      contents: fromCssContent,
    });
    expect(transformCSSResults.code).toEqual(expect.stringContaining('from.css'));

    await pluginInstance.cleanup();
  });
});

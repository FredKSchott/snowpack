const path = require('path');
const fs = require('fs-extra');

const plugin = require('../plugin');
const readFilesSync = require('./readFilesSync');

const STUBS_DIR = path.join(__dirname, 'stubs/minimal/');
const INGORED_STUBS_DIR = path.join(__dirname, 'stubs/minimal_ignore/');

describe('@snowpack/plugin-webpack', () => {
  // Copy over the stub folder to an git-ignored path and mock console.log
  beforeEach(() => {
    if (fs.existsSync(INGORED_STUBS_DIR)) fs.removeSync(INGORED_STUBS_DIR);
    fs.copySync(STUBS_DIR, INGORED_STUBS_DIR);
  });

  afterAll(() => {
    if (fs.existsSync(INGORED_STUBS_DIR)) fs.removeSync(INGORED_STUBS_DIR);
  });

  it('minimal - no options', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    await pluginInstance.optimize({
      buildDirectory: INGORED_STUBS_DIR,
    });

    expect(readFilesSync(INGORED_STUBS_DIR)).toMatchSnapshot('files');
  });

  it('minimal - all options', async () => {
    const pluginInstance = plugin(
      {
        buildOptions: {},
      },
      {
        sourceMap: true,
        outputPattern: {
          js: '[name]-[id].js',
        },
        extendConfig: (config) => config,
        manifest: true,
        htmlMinifierOptions: true,
      },
    );

    await pluginInstance.optimize({
      buildDirectory: INGORED_STUBS_DIR,
    });

    expect(readFilesSync(INGORED_STUBS_DIR)).toMatchSnapshot('files');
  });
});

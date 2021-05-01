const path = require('path');
const fs = require('fs-extra');

const plugin = require('../plugin');
const readFilesSync = require('./readFilesSync');

const STUBS_DIR = path.join(__dirname, 'stubs/minimal/');
const IGNORED_STUBS_DIR = path.join(__dirname, 'stubs/minimal_ignore/');

describe('@snowpack/plugin-webpack', () => {
  // Copy over the stub folder to an git-ignored path and mock console.log
  beforeEach(() => {
    if (fs.existsSync(IGNORED_STUBS_DIR)) fs.removeSync(IGNORED_STUBS_DIR);
    fs.copySync(STUBS_DIR, IGNORED_STUBS_DIR);
  });

  afterAll(() => {
    if (fs.existsSync(IGNORED_STUBS_DIR)) fs.removeSync(IGNORED_STUBS_DIR);
  });

  it('minimal - no options', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    await pluginInstance.optimize({
      buildDirectory: IGNORED_STUBS_DIR,
    });

    expect(readFilesSync(IGNORED_STUBS_DIR)).toMatchSnapshot('files');
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
      buildDirectory: IGNORED_STUBS_DIR,
    });

    expect(readFilesSync(IGNORED_STUBS_DIR)).toMatchSnapshot('files');
  });

  it('respect extendedConfig.output.path', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    }, {
      extendConfig: (config) => {
        config.output.path = path.resolve(IGNORED_STUBS_DIR, 'dist');

        return config;
      },
    });

    await pluginInstance.optimize({
      buildDirectory: IGNORED_STUBS_DIR,
    });

    expect(readFilesSync(path.join(IGNORED_STUBS_DIR, 'dist'))).toMatchSnapshot('files');
    expect(fs.existsSync(path.join(IGNORED_STUBS_DIR, 'js'))).toBe(false);
    expect(fs.existsSync(path.join(IGNORED_STUBS_DIR, 'css'))).toBe(false);
    expect(fs.existsSync(path.join(IGNORED_STUBS_DIR, 'assets'))).toBe(false);
  });
});

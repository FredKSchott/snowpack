const path = require('path');
const fs = require('fs-extra');

const plugin = require('../plugin');
const readFilesSync = require('./readFilesSync');

const STUBS_DIR = path.join(__dirname, 'stubs/minimal/');
const IGNORED_STUBS_DIR = path.join(__dirname, 'stubs/minimal_ignore/');

const MULTIPLE_DIR = path.join(__dirname, 'stubs/multiple-entrypoints/');
const IGNORED_MULTIPLE_DIR = path.join(__dirname, 'stubs/multiple-entrypoints_ignore/');

describe('@snowpack/plugin-webpack', () => {
  // Copy over the stub folder to an git-ignored path and mock console.log
  beforeEach(() => {
    if (fs.existsSync(IGNORED_STUBS_DIR)) fs.removeSync(IGNORED_STUBS_DIR);
    fs.copySync(STUBS_DIR, IGNORED_STUBS_DIR);

    if (fs.existsSync(IGNORED_MULTIPLE_DIR)) fs.removeSync(IGNORED_MULTIPLE_DIR);
    fs.copySync(MULTIPLE_DIR, IGNORED_MULTIPLE_DIR);
  });

  afterAll(() => {
    if (fs.existsSync(IGNORED_STUBS_DIR)) fs.removeSync(IGNORED_STUBS_DIR);
    if (fs.existsSync(IGNORED_MULTIPLE_DIR)) fs.removeSync(IGNORED_MULTIPLE_DIR);
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

  it('multiple entrypoints w/ same filename', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    await pluginInstance.optimize({
      buildDirectory: IGNORED_MULTIPLE_DIR,
    });

    const rootHtml = fs.readFileSync(path.join(IGNORED_MULTIPLE_DIR, 'index.html'), {
      encoding: 'utf8',
    });
    const adminHtml = fs.readFileSync(path.join(IGNORED_MULTIPLE_DIR, 'admin/index.html'), {
      encoding: 'utf8',
    });

    const rootScripts = rootHtml.match(/<script src="([^>]+)">/g);
    const adminScripts = adminHtml.match(/<script src="([^>]+)">/g);

    expect(rootScripts).not.toEqual(expect.arrayContaining(adminScripts));

    expect(readFilesSync(IGNORED_MULTIPLE_DIR)).toMatchSnapshot('files');
    expect(readFilesSync(path.join(IGNORED_MULTIPLE_DIR, 'admin'))).toMatchSnapshot('files');
  });
});

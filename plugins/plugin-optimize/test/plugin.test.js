const path = require('path');
const fs = require('fs');

const plugin = require('../plugin').default;
const {getSnowpackPluginOutputSnapshotSerializer} = require('./serializer');

describe('@snowpack/plugin-optimize', () => {
  beforeEach(() => {
    expect.addSnapshotSerializer(getSnowpackPluginOutputSnapshotSerializer(__dirname));

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = jest
      .fn()
      .mockName('fs.writeFileSync')
      .mockImplementation((path, ...args) => {
        if (path.startsWith(__dirname)) return;

        // write files outside of the current folder
        originalWriteFileSync(path, ...args);
      });

    console.log = jest.fn().mockName('console.log');
  });

  it('minimal - no options', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync');
    expect(console.log).toMatchSnapshot('console.log');
  });

  it('minimal - no minification', async () => {
    const pluginInstance = plugin(
      {
        buildOptions: {},
      },
      {
        minifyJS: false,
        minifyCSS: false,
        minifyHTML: false,
      },
    );

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync');
    expect(console.log).toMatchSnapshot('console.log');
  });

  it('no HTML minification, with preloadModules', async () => {
    const pluginInstance = plugin(
      {
        buildOptions: {},
      },
      {
        minifyHTML: false,
        preloadModules: true,
      },
    );

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync');
    expect(console.log).toMatchSnapshot('console.log');
  });
});

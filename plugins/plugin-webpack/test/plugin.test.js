const path = require('path');
const fs = require('fs');

const plugin = require('../plugin');
const {getSnowpackPluginOutputSnapshotSerializer} = require('./serializer');

describe('@snowpack/plugin-webpack', () => {
  beforeEach(() => {
    expect.addSnapshotSerializer(getSnowpackPluginOutputSnapshotSerializer(__dirname));

    const originalWriteFileSync = fs.writeFileSync;
    fs.writeFileSync = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) return;

      // write files outside of the current folder
      originalWriteFileSync(path, ...args);
    });

    const originalWriteFile = fs.writeFile;
    fs.writeFile = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) {
        const callback = args.pop();
        callback();
        return;
      }

      // write files outside of the current folder
      originalWriteFile(path, ...args);
    });

    console.log = jest.fn();
  });

  it('minimal - no options', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync calls');
    expect(fs.writeFile).toMatchSnapshot('fs.writeFile calls');
    expect(console.log).toMatchSnapshot('console.log calls');
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
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync calls');
    expect(fs.writeFile).toMatchSnapshot('fs.writeFile calls');
    expect(console.log).toMatchSnapshot('console.log calls');
  });
});

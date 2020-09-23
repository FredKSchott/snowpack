const path = require('path');
const fs = require('fs');

const plugin = require('../plugin');

describe('@snowpack/plugin-webpack', () => {
  it('minimal - no options', async () => {
    const pluginInstance = plugin({
      buildOptions: {},
    });

    // terser-webpack-plugin reads out cache files after writing them,
    // pass these through to the original method
    // see https://github.com/pikapkg/snowpack/pull/1061#issuecomment-695112537
    const originalWriteFileSync = fs.writeFileSync;
    const originalWriteFile = fs.writeFile;

    fs.writeFileSync = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) return;

      originalWriteFileSync(path, ...args);
    });

    fs.writeFile = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) {
        const callback = args.pop();
        callback();
        return;
      }

      originalWriteFile(path, ...args);
    });
    console.log = jest.fn();

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync.mock.calls.filter(isLocal).map(toPathAndStringContent)).toMatchSnapshot(
      'fs.writeFileSync calls',
    );
    expect(fs.writeFile.mock.calls.filter(isLocal).map(toPathAndStringContent)).toMatchSnapshot(
      'fs.writeFile calls',
    );
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

    // terser-webpack-plugin reads out cache files after writing them,
    // pass these through to the original method
    // see https://github.com/pikapkg/snowpack/pull/1061#issuecomment-695112537
    const originalWriteFileSync = fs.writeFileSync;
    const originalWriteFile = fs.writeFile;

    fs.writeFileSync = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) return;

      originalWriteFileSync(path, ...args);
    });

    fs.writeFile = jest.fn().mockImplementation((path, ...args) => {
      if (path.startsWith(__dirname)) {
        const callback = args.pop();
        callback();
        return;
      }

      originalWriteFile(path, ...args);
    });
    console.log = jest.fn();

    await pluginInstance.optimize({
      buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
    });

    expect(fs.writeFileSync.mock.calls.filter(isLocal).map(toPathAndStringContent)).toMatchSnapshot(
      'fs.writeFileSync calls',
    );
    expect(fs.writeFile.mock.calls.filter(isLocal).map(toPathAndStringContent)).toMatchSnapshot(
      'fs.writeFile calls',
    );
    expect(console.log).toMatchSnapshot('console.log calls');
  });
});

function toPathAndStringContent([path, content]) {
  const shortPath = path.replace(process.cwd(), '');
  // unix-ify folder separators for Windows
  const normalizedPath = shortPath.replace(/\\/g, '/');
  return [normalizedPath, content.toString()];
}

function isLocal(mock) {
  return mock[0].startsWith(__dirname);
}

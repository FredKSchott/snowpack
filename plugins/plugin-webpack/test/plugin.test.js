const path = require('path');
const fs = require('fs');
const {format} = require('util');

const strpAnsi = require('strip-ansi');
const plugin = require('../plugin');

/**
 * Serializer of written files as well as console.log output.
 *
 * Both file contents and log output is normalized to account for differences
 * in UNIX and Windows systems.
 *
 * @todo move serializer into seperate file and make it reusable by other tests
 */
const snowpackPluginOutputSnapshotSerializer = {
  serialize({mock}) {
    const firstCallArg = mock.calls[0][0];

    if (firstCallArg.startsWith(__dirname)) {
      const calls = mock.calls.filter(isLocal).map(toPathAndStringContent);
      return calls
        .map(([path, content]) => {
          return `FILE: ${path}\n${content}`;
        })
        .join(
          '\n\n--------------------------------------------------------------------------------\n\n',
        );
    }

    const outputs = mock.calls.map(toSingleArgument).map(toNoralizedByteSize).map(removeColors);

    return outputs.join('\n');
  },

  test(value) {
    return value && value.mock;
  },
};

function toPathAndStringContent([path, content]) {
  const shortPath = path.replace(__dirname, '').substr(1);
  // unix-ify folder separators for Windows
  const normalizedPath = shortPath.replace(/\\/g, '/');
  // unix-ify new lines
  const normalizedContent = content.toString().replace(/(\\r\\n)/g, '\\n');
  return [normalizedPath, normalizedContent];
}

function toSingleArgument([output, ...args]) {
  return format(output, ...args);
}
function toNoralizedByteSize(output) {
  return output.replace(/(\s{2,})\d+ bytes/g, '$1XXX bytes');
}

function removeColors(output) {
  return strpAnsi(output);
}

function isLocal(mock) {
  return mock[0].startsWith(__dirname);
}

describe('@snowpack/plugin-webpack', () => {
  it('minimal - no options', async () => {
    expect.addSnapshotSerializer(snowpackPluginOutputSnapshotSerializer);

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

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync calls');
    expect(fs.writeFile).toMatchSnapshot('fs.writeFile calls');
    expect(console.log).toMatchSnapshot('console.log calls');
  });

  it('minimal - all options', async () => {
    expect.addSnapshotSerializer(snowpackPluginOutputSnapshotSerializer);

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

    expect(fs.writeFileSync).toMatchSnapshot('fs.writeFileSync calls');
    expect(fs.writeFile).toMatchSnapshot('fs.writeFile calls');
    expect(console.log).toMatchSnapshot('console.log calls');
  });
});

module.exports = {
  getSnowpackPluginOutputSnapshotSerializer,
};

const {format} = require('util');

const strpAnsi = require('strip-ansi');

/**
 * Serializer of written files as well as console.log output.
 *
 * Both file contents and log output is normalized to account for differences
 * in UNIX and Windows systems.
 *
 * @param string basePath all files written outside this path will be ignored (usually set to __dirname)
 */
function getSnowpackPluginOutputSnapshotSerializer(basePath) {
  return {
    serialize(value) {
      if (value.getMockName() === 'console.log') {
        return value.mock.calls
          .map(toSingleArgument)
          .map(toNoralizedByteSize)
          .map(removeColors)
          .join('\n');
      }

      const calls = value.mock.calls
        .filter(isLocal)
        .map(toPathAndStringContent.bind(null, basePath));
      return calls
        .sort((a, b) => {
          return a[0] < b[0] ? -1 : 1;
        })
        .map(([path, content]) => {
          return `FILE: ${path}\n${content}`;
        })
        .join(
          '\n\n--------------------------------------------------------------------------------\n\n',
        );
    },

    test(value) {
      return value && value.mock;
    },
  };
}

function toPathAndStringContent(basePath, [path, content]) {
  const shortPath = path.replace(basePath, '').substr(1);
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

function isLocal(call) {
  return call[0].startsWith(__dirname);
}

const {isTestFilePath} = require('@web/test-runner');
const snowpack = require('snowpack');
const path = require('path');

module.exports = function (snowpackConfig = {}) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`@snowpack/web-test-runner-plugin: NODE_ENV must === "test" to build files correctly.
To Resolve:
  1. Set "process.env.NODE_ENV = 'test';" at the top of your web-test-runner.config.js file (before all imports).
  2. Prefix your web-test-runner CLI command: "NODE_ENV=test web-test-runner ...".
`);
  }
  const pkgManifest = require(path.join(snowpackConfig.root || process.cwd(), 'package.json'));
  let server, config;

  return {
    name: 'snowpack-plugin',
    async serverStart({fileWatcher}) {
      config = await snowpack.loadAndValidateConfig(
        {
          externalPackage: ['/__web-dev-server__web-socket.js'],
          hmr: false,
          open: 'none',
          output: 'stream',
        },
        pkgManifest,
      );
      fileWatcher.add(Object.keys(config.mount));
      server = await snowpack.startDevServer({
        cwd: snowpackConfig.root || process.cwd(),
        config,
        lockfile: null,
        pkgManifest,
      });
    },
    async serverStop() {
      return server.shutdown();
    },
    async serve({request}) {
      if (request.url.startsWith('/__web-dev-server')) {
        return;
      }
      const reqPath = request.path;
      const result = await server.loadUrl(reqPath, {isSSR: false});
      return {body: result.contents, type: result.contentType};
    },
    transformImport({source}) {
      if (!isTestFilePath(source) || source.startsWith('/__web-dev-server')) {
        return;
      }
      // PERF(fks): https://github.com/snowpackjs/snowpack/pull/1259/files#r502963818
      const reqPath = source.substring(
        0,
        source.indexOf('?') === -1 ? undefined : source.indexOf('?'),
      );
      const sourcePath = path.join(snowpackConfig.root || process.cwd(), reqPath);
      const mountedUrl = snowpack.getUrlForFile(sourcePath, config);
      if (!mountedUrl) {
        throw new Error(`${source} could not be mounted!`);
      }
      return mountedUrl;
    },
  };
};

const {isTestFilePath} = require('@web/test-runner');
const snowpack = require('snowpack');
const path = require('path');

/**
 * Checks whether the url is a virtual file served by @web/test-runner.
 * @param {string} url
 */
function isTestRunnerFile(url) {
  return url.startsWith('/__web-dev-server') || url.startsWith('/__web-test-runner');
}

module.exports = function () {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`@snowpack/web-test-runner-plugin: NODE_ENV must === "test" to build files correctly.
To Resolve:
  1. Set "process.env.NODE_ENV = 'test';" at the top of your web-test-runner.config.js file (before all imports).
  2. Prefix your web-test-runner CLI command: "NODE_ENV=test web-test-runner ...".
`);
  }
  let server, config;

  return {
    name: 'snowpack-plugin',
    async serverStart({fileWatcher}) {
      config = await snowpack.loadConfiguration({
        packageOptions: {external: ['/__web-dev-server__web-socket.js']},
        devOptions: {open: 'none', output: 'stream', hmr: false},
      });
      fileWatcher.add(Object.keys(config.mount));
      server = await snowpack.startServer({
        config,
        lockfile: null,
      });
    },
    async serverStop() {
      return server.shutdown();
    },
    async serve({request}) {
      if (isTestRunnerFile(request.url)) {
        return;
      }
      const reqPath = request.path;
      try {
        const result = await server.loadUrl(reqPath, {isSSR: false});
        return {body: result.contents, type: result.contentType};
      } catch {
        return;
      }
    },
    transformImport({source}) {
      if (!isTestFilePath(source) || isTestRunnerFile(source)) {
        return;
      }
      // PERF(fks): https://github.com/snowpackjs/snowpack/pull/1259/files#r502963818
      const reqPath = source.substring(
        0,
        source.indexOf('?') === -1 ? undefined : source.indexOf('?'),
      );
      const sourcePath = path.join(config.root || process.cwd(), reqPath);
      try {
        return snowpack.getUrlForFile(sourcePath, config);
      } catch {
        return;
      }
    },
  };
};

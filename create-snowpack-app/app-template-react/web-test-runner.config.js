const { isTestFilePath } = require('@web/test-runner');
const snowpack = require('../../snowpack');
const path = require('path');
const url = require('url');

const cwd = process.cwd();
const pkgManifest = require(path.join(cwd, 'package.json'));
const config = snowpack.unstable__loadAndValidateConfig(
  { devOptions: { hmr: false, open: 'none' } },
  pkgManifest,
);
let loadByUrl;

// TODO: Refactor idea of test files being skipped when scanning for deps, they shouldn't be skipped for tests!

module.exports = {
  plugins: [
    {
      name: 'my-plugin',
      async serverStart({ app }) {
        const server = await snowpack.unstable__startServer({
          cwd: process.cwd(),
          config,
          lockfile: null,
          pkgManifest,
        });

        loadByUrl = server.loadByUrl;
      },
      async serve(context) {
        const reqPath = url.parse(context.request.url).pathname;
        const data = await loadByUrl(reqPath, { isSSR: false });
        return data;
      },
      transformImport({ source }) {
        if (isTestFilePath(source)) {
          const sourcePath = url.parse(path.join(cwd, source)).pathname;
          const mountedUrl = snowpack.getUrlForFile(sourcePath, config);
          console.log('transforming', sourcePath, mountedUrl);
          if (!mountedUrl) {
            throw new Error(`${source} could not be mounted!`);
          }
          return mountedUrl;
        }
      },
    },
  ],
};

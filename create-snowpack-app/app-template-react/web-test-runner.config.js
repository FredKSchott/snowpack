const snowpack = require('snowpack');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Load the current package manifest
const cwd = process.cwd();
const pkgManifest = require(path.join(cwd, 'package.json'));
const config = snowpack.unstable__loadAndValidateConfig({}, pkgManifest);
const DEPS_DIR = path.join(cwd, `node_modules/.cache/snowpack/dev`);
const DEPS_IMPORT_MAP = require(path.join(DEPS_DIR, `import-map.json`));
console.log(DEPS_DIR, DEPS_IMPORT_MAP);

module.exports = {
  plugins: [
    {
      name: 'my-plugin',
      async serve(context) {
        const reqPath = url.parse(context.request.url).pathname;
        console.log('A', reqPath);
        if (reqPath === '/__snowpack__/env.js') {
          return { body: `export default {};`, type: 'js' };
        }
        if (reqPath.startsWith('/web_modules/')) {
          const bareModuleSpec = reqPath.substr('/web_modules/'.length);
          console.log(bareModuleSpec);
          const importMapEntry =
            DEPS_IMPORT_MAP.imports[bareModuleSpec] || bareModuleSpec;
          console.log(importMapEntry);
          const code = fs.readFileSync(path.join(DEPS_DIR, importMapEntry), {
            encoding: 'utf8',
          });
          return { body: code, type: 'js' };
        }
        const filePath = path.join(process.cwd(), reqPath);
        const buildResult = await snowpack.unstable__buildFile(filePath, {
          plugins: config.plugins,
          isDev: false,
          isSSR: false,
          isExitOnBuild: true,
          isHmrEnabled: false,
          sourceMaps: false,
        });
        console.log(filePath, buildResult);
        if (buildResult['.js']) {
          return { body: buildResult['.js'].code, type: 'js' };
        } else {
          return {
            body: await snowpack.unstable__wrapImportProxy({
              url: reqPath,
              code: Object.values(buildResult)[0].code,
              hmr: false,
              config,
            }),
            type: 'js',
          };
        }
      },
      async resolveImport({ source, context }) {
        if (source.startsWith('/__web-test-runner__/')) {
          return;
        }
        if (
          source.startsWith('./') ||
          source.startsWith('../') ||
          source.startsWith('/') ||
          url.parse(source).protocol
        ) {
          return source;
        }
        return path.join('/web_modules/', source);
      },
    },
  ],
};

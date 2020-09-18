const snowpack = require('../../snowpack/pkg');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Load the current package manifest
const cwd = process.cwd();
const pkgManifest = require(path.join(cwd, 'package.json'));
const config = snowpack.unstable__loadAndValidateConfig({}, pkgManifest);
const FileBuilder = snowpack.FileBuilder;

const DEPS_DIR = path.join(cwd, `node_modules/.cache/snowpack/dev`);
const DEPS_IMPORT_MAP = require(path.join(DEPS_DIR, `import-map.json`));

module.exports = {
  plugins: [
    {
      name: 'my-plugin',
      async serve(context) {
        const reqPath = url.parse(context.request.url).pathname;
        
        // TODO: handle Snowpack metaDir files (like env.js)

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

        const locOnDisk = path.join(cwd, reqPath);
        console.log('A', reqPath, locOnDisk);
        const buildPipelineFile = new FileBuilder({filepath: locOnDisk, outDir: '/dev/null', config});
        await buildPipelineFile.buildFile();
        const jsBuildResult = Object.entries(buildPipelineFile.output).find(([key]) => key.endsWith('.js'));
        console.log('B', buildPipelineFile.output, jsBuildResult);
        if (jsBuildResult) {
          return {
            body: jsBuildResult[1],
            type: 'js',
          };
        }
        console.log('C', Object.entries(buildPipelineFile.output)[0][0], await buildPipelineFile.getProxy(Object.entries(buildPipelineFile.output)[0][0]));
        return {
          body: await buildPipelineFile.getProxy(Object.entries(buildPipelineFile.output)[0][0]),
          type: 'js',
        };
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

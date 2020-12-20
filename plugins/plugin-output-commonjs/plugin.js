const {startService} = require('esbuild');
const glob = require('glob');
const fs = require('fs');
let esbuildService = null;

module.exports = function plugin(config, args = {}) {
 
  return {
    name: '@snowpack/plugin-output-commonjs',
    async optimize({buildDirectory, log}) {
      // for every JS file, transform using format=cjs
      esbuildService = esbuildService || (await startService());
      const allFiles = glob.sync('**/*.js', {
          cwd: buildDirectory,
          ignore: [`${config.buildOptions.metaDir}/*`],
          nodir: true,
          absolute: true
        });
      await Promise.all(allFiles.map((f) => {
        const contents = await fs.readFile(f, 'utf8');
        const {code, map, warnings} = await esbuildService.transform(contents, {
          loader: getLoader(filePath),
          jsxFactory,
          jsxFragment,
          sourcefile: filePath,
          sourcemap: config.buildOptions.sourceMaps,
        });
        await fs.writeFile(f, code, 'utf8');
        // TODO: read original sourcemap, and merge with new sourcemap
      }));
    },
  };
};

import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import babel from '@babel/core';
import babelPluginDynamicImportSyntax from '@babel/plugin-syntax-dynamic-import';
import babelPluginImportMetaSyntax from '@babel/plugin-syntax-import-meta';
import babelPluginImportRewrite from './babel-plugin-import-rewrite.js';
import * as rollup from 'rollup';

function transformWebModuleFilename(depName:string):string {
  return depName.replace('/', '-');
}

const cwd = process.cwd();
let arrayOfDeps = [
  "@pika/fetch",
  "preact",
  "epoch-timeago",
  "htm"
];
const WEB_ENV = {modules: false, targets: {esmodules: true}};

(async () => {

  rimraf.sync(path.join(cwd, 'web_modules'));

  let dep;
  while (dep = arrayOfDeps.shift()) {
    const writeToWebNative = path.join(cwd, 'web_modules', dep, `${transformWebModuleFilename(dep)}.js`);
    const depLoc = path.join(cwd, 'node_modules', dep);
    const manifest = require(path.join(cwd, 'node_modules', dep, 'package.json'));

    const packageBundle = await rollup.rollup({
      // @ts-ignore
      input: path.join(depLoc, manifest.module),
      // @ts-ignore
      onwarn: (warning, defaultOnWarnHandler) => {
        console.log(warning);
        if (warning.code === 'UNRESOLVED_IMPORT') {
          return;
        }
        defaultOnWarnHandler(warning);
      },
    });
    const {output: bundledOutput} = await packageBundle.generate({
      format: 'esm',
      name: dep,
      file: `${dep}.js`,
    });

    const relativeDepsInfo = {};
    for (const [depDepName, _] of Object.entries(manifest.dependencies || {})) {
      const depManifest = require(path.join(cwd, 'node_modules', depDepName, 'package.json'));
      const depDepLoc = path.join(cwd, 'web_modules', depDepName, depManifest.module);
      relativeDepsInfo[depDepName] = path.relative(path.dirname(writeToWebNative), depDepLoc);
    }

    for (const chunkOrAsset of bundledOutput) {
      if (chunkOrAsset.isAsset) {
        console.log('Asset', chunkOrAsset);
        fs.writeFileSync(path.join(path.dirname(writeToWebNative), chunkOrAsset.fileName), chunkOrAsset.source);
      } else {
        const bundledCode = chunkOrAsset.code;
        const resultWebModule = await babel.transformAsync(bundledCode, {
          cwd: depLoc,
          compact: false,
          babelrc: false,
          plugins: [
            [babelPluginImportRewrite, {deps: relativeDepsInfo}],
            babelPluginDynamicImportSyntax,
            babelPluginImportMetaSyntax,
          ],
        });
        mkdirp.sync(path.dirname(writeToWebNative));
        fs.writeFileSync(writeToWebNative, resultWebModule.code);

        // For chunks, this contains
        // {
        //   code: string,                  // the generated JS code
        //   dynamicImports: string[],      // external modules imported dynamically by the chunk
        //   exports: string[],             // exported variable names
        //   facadeModuleId: string | null, // the id of a module that this chunk corresponds to
        //   fileName: string,              // the chunk file name
        //   imports: string[],             // external modules imported statically by the chunk
        //   isDynamicEntry: boolean,       // is this chunk a dynamic entry point
        //   isEntry: boolean,              // is this chunk a static entry point
        //   map: string | null,            // sourcemaps if present
        //   modules: {                     // information about the modules in this chunk
        //     [id: string]: {
        //       renderedExports: string[]; // exported variable names that were included
        //       removedExports: string[];  // exported variable names that were removed
        //       renderedLength: number;    // the length of the remaining code in this module
        //       originalLength: number;    // the original length of the code in this module
        //     };
        //   },
        //   name: string                   // the name of this chunk as used in naming patterns
        // }
        // console.log('Chunk', chunkOrAsset.modules);
      }
    }

    // or write the bundle to disk
    // await packageBundle.write({
    //   // dir: path.dirname(writeToWebNative),
    //   format: 'esm',
    //   name: dep,
    //   file: writeToWebNative,
    // });

  }
})();

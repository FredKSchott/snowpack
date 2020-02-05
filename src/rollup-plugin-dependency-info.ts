import fs from 'fs';
import path from 'path';
import {OutputOptions, OutputBundle} from 'rollup';

export function rollupPluginDependencyInfo() {
  return {
    generateBundle(options: OutputOptions, bundle: OutputBundle) {
      // console.log(options);
      const files = fs.readdirSync(options.dir);
      // console.log(files);

      for (let fileName of Object.keys(bundle)) {
        const previousModuleFile = fs.existsSync(path.join(options.dir, fileName));
        if (previousModuleFile) {
          console.log('file already exists!', fileName);
        }

        // console.log(fileName, bundle[fileName].type);
      }
    },
  };
}

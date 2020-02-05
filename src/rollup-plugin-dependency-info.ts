import fs from 'fs';
import path from 'path';
import {OutputOptions, OutputBundle} from 'rollup';

type Dependency = {
  fileName: string;
  size: number;
  delta?: number;
};
type Dependencies = {
  [filePath: string]: Dependency;
};
type DependencyType = 'direct' | 'shared';
export type DependencyInfoOutput = Record<DependencyType, Dependencies>;

export function rollupPluginDependencyInfo(cb: (dependencyInfo: DependencyInfoOutput) => void) {
  let outputDir: string;
  let cache: {
    [fileName: string]: number;
  } = {};
  let output: DependencyInfoOutput = {
    direct: {},
    shared: {},
  };

  const compareDependencies = (files: string[], type: DependencyType) => {
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const {size} = fs.statSync(filePath);
      output[type][file] = {
        fileName: path.basename(file),
        size,
      };

      if (cache[file]) {
        const delta = (size - cache[file]) / 1000;
        output[type][file].delta = delta;
      }
    });
  };

  return {
    generateBundle(options: OutputOptions, bundle: OutputBundle) {
      outputDir = options.dir;

      for (let fileName of Object.keys(bundle)) {
        const filePath = path.join(outputDir, fileName);
        if (fs.existsSync(filePath)) {
          const {size} = fs.statSync(filePath);
          cache[fileName] = size;
        }
      }
    },
    writeBundle(bundle: OutputBundle) {
      const files = Object.keys(bundle);

      const [directDependencies, sharedDependencies] = files.reduce(
        ([d, s], f) => (f.startsWith('common') ? [d, [...s, f]] : [[...d, f], s]),
        [[], []],
      );

      compareDependencies(directDependencies, 'direct');
      compareDependencies(sharedDependencies, 'shared');

      cb(output);
    },
  };
}

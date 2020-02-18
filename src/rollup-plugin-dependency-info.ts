import fs from 'fs';
import path from 'path';
import {OutputOptions, OutputBundle} from 'rollup';

type DependencyStats = {
  size: number;
  delta?: number;
};
type DependencyStatsMap = {
  [filePath: string]: DependencyStats;
};
type DependencyType = 'direct' | 'common';
export type DependencyStatsOutput = Record<DependencyType, DependencyStatsMap>;

export function rollupPluginDependencyStats(cb: (dependencyInfo: DependencyStatsOutput) => void) {
  let outputDir: string;
  let cache: {[fileName: string]: number} = {};
  let output: DependencyStatsOutput = {
    direct: {},
    common: {},
  };

  function buildCache(bundle: OutputBundle) {
    for (let fileName of Object.keys(bundle)) {
      const filePath = path.join(outputDir, fileName);
      if (fs.existsSync(filePath)) {
        const {size} = fs.statSync(filePath);
        cache[fileName] = size;
      }
    }
  }

  function compareDependencies(files: string[], type: DependencyType) {
    for (let file of files) {
      const filePath = path.join(outputDir, file);
      const {size} = fs.statSync(filePath);
      output[type][file] = {
        size,
      };

      if (cache[file]) {
        const delta = (size - cache[file]) / 1000;
        output[type][file].delta = delta;
      }
    }
  }

  return {
    generateBundle(options: OutputOptions, bundle: OutputBundle) {
      outputDir = options.dir;
      buildCache(bundle);
    },
    writeBundle(bundle: OutputBundle) {
      const files = Object.keys(bundle);

      const [directDependencies, commonDependencies] = files.reduce(
        ([direct, common], fileName) =>
          fileName.startsWith('common')
            ? [direct, [...common, fileName]]
            : [[...direct, fileName], common],
        [[], []],
      );

      compareDependencies(directDependencies, 'direct');
      compareDependencies(commonDependencies, 'common');

      cb(output);
    },
  };
}

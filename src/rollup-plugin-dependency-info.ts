import fs from 'fs';
import path from 'path';
import {OutputBundle, Plugin} from 'rollup';

export type DependencyStats = {
  size: number;
  delta?: number;
};
type DependencyStatsMap = {
  [filePath: string]: DependencyStats;
};
type DependencyType = 'direct' | 'common';
export type DependencyStatsOutput = Record<DependencyType, DependencyStatsMap>;

export function rollupPluginDependencyStats(
  cb: (dependencyInfo: DependencyStatsOutput) => void,
): Plugin {
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
    name: 'pika:rollup-plugin-dependency-info',
    generateBundle(options, bundle) {
      outputDir = options.dir!;
      buildCache(bundle);
    },
    writeBundle(bundle) {
      const directDependencies: string[] = [];
      const commonDependencies: string[] = [];

      for (const fileName of Object.keys(bundle)) {
        if (fileName.startsWith('common')) {
          commonDependencies.push(fileName);
        } else {
          directDependencies.push(fileName);
        }
      }

      compareDependencies(directDependencies, 'direct');
      compareDependencies(commonDependencies, 'common');

      cb(output);
    },
  };
}

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {OutputOptions, OutputBundle} from 'rollup';

export type DependencyStats = {
  size: number;
  gzip: number;
  brotli: number;
  delta?: number;
};
type DependencyStatsMap = {
  [filePath: string]: DependencyStats;
};
type DependencyType = 'direct' | 'common';
export type DependencyStatsOutput = Record<DependencyType, DependencyStatsMap>;

export function rollupPluginDependencyStats(cb: (dependencyInfo: DependencyStatsOutput) => void) {
  let outputDir: string;
  let existingFileCache: {[fileName: string]: number} = {};
  let statsSummary: DependencyStatsOutput = {
    direct: {},
    common: {},
  };

  function buildExistingFileCache(bundle: OutputBundle) {
    for (let fileName of Object.keys(bundle)) {
      const filePath = path.join(outputDir, fileName);
      if (fs.existsSync(filePath)) {
        const {size} = fs.statSync(filePath);
        existingFileCache[fileName] = size;
      }
    }
  }

  function compareDependencies(
    files: {fileName: string; contents: Buffer}[],
    type: DependencyType,
  ) {
    for (let {fileName, contents} of files) {
      const size = contents.byteLength;
      statsSummary[type][fileName] = {
        size: size,
        gzip: zlib.gzipSync(contents).byteLength,
        brotli: zlib.brotliCompressSync(contents).byteLength,
      };
      if (existingFileCache[fileName]) {
        const delta = (size - existingFileCache[fileName]) / 1000;
        statsSummary[type][fileName].delta = delta;
      }
    }
  }

  return {
    generateBundle(options: OutputOptions, bundle: OutputBundle) {
      outputDir = options.dir!;
      buildExistingFileCache(bundle);
    },
    writeBundle(bundle: OutputBundle) {
      const directDependencies: {fileName: string; contents: Buffer}[] = [];
      const commonDependencies: {fileName: string; contents: Buffer}[] = [];
      for (const [fileName, assetOrChunk] of Object.entries(bundle)) {
        const raw = assetOrChunk.type === 'asset' ? assetOrChunk.source : assetOrChunk.code;
        const contents = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'utf8');
        if (fileName.startsWith('common')) {
          commonDependencies.push({fileName, contents});
        } else {
          directDependencies.push({fileName, contents});
        }
      }
      compareDependencies(directDependencies, 'direct');
      compareDependencies(commonDependencies, 'common');
      cb(statsSummary);
    },
  };
}

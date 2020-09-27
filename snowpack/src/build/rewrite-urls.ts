import path from 'path';
import {SnowpackConfig} from '../types/snowpack';
import {getExt, replaceExt} from '../util';

export const defaultFileExtensionMapping = {
  '.mjs': '.js',
  '.jsx': '.js',
  '.ts': '.js',
  '.tsx': '.js',
  '.vue': '.js',
  '.svelte': '.js',
  '.mdx': '.js',
  '.svx': '.js',
  '.elm': '.js',
  '.yaml': '.json',
  '.toml': '.json',
  '.php': '.html',
  '.md': '.html',
  '.ejs': '.html',
  '.njk': '.html',
  '.scss': '.css',
  '.sass': '.css',
  '.less': '.css',
};

export function transformMountedUrl(
  fileLoc: string,
  [dirDisk, toUrl]: [string, string],
  config: SnowpackConfig,
): string {
  const {baseExt} = getExt(fileLoc);
  const resolvedDirUrl = toUrl === '/' ? '' : toUrl;
  return replaceExt(
    fileLoc.replace(dirDisk, resolvedDirUrl).replace(/[/\\]+/g, '/'),
    baseExt,
    config._extensionMap[baseExt] || defaultFileExtensionMapping[baseExt] || baseExt,
  );
}

export function getMountedUrl(fileLoc: string, config: SnowpackConfig): string | null {
  for (const [dirDisk, toUrl] of Object.entries(config.mount)) {
    if (fileLoc.startsWith(dirDisk + path.sep)) {
      return transformMountedUrl(fileLoc, [dirDisk, toUrl], config);
    }
  }
  return null;
}

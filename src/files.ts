import path from 'path';

import {BuildScript} from './config';

export const srcFileExtensionMapping = {
  jsx: 'js',
  ts: 'js',
  tsx: 'js',
  vue: 'js',
  svelte: 'js',
  mdx: 'js',
  php: 'html',
  md: 'html',
  ejs: 'html',
  njk: 'html',
  scss: 'css',
  less: 'css',
};

export function getEncodingType(ext: string): 'utf-8' | 'binary' {
  if (ext === '.js' || ext === '.css' || ext === '.html') {
    return 'utf-8';
  } else {
    return 'binary';
  }
}

export function getUrlFromFile(
  mountedDirectories: [string, string][],
  filePath: string,
): string | null {
  for (const [dirDisk, dirUrl] of mountedDirectories) {
    if (filePath.startsWith(dirDisk + path.sep)) {
      const fileExt = path.extname(filePath).substr(1);
      const resolvedDirUrl = dirUrl === '/' ? '' : dirUrl;
      return filePath
        .replace(dirDisk, resolvedDirUrl)
        .replace(/[/\\]+/g, '/')
        .replace(new RegExp(`${fileExt}$`), srcFileExtensionMapping[fileExt] || fileExt);
    }
  }
  return null;
}

export function getMountedDirectory(cwd: string, workerConfig: BuildScript): [string, string] {
  const {args} = workerConfig;
  return [path.resolve(cwd, args.fromDisk), args.toUrl];
}

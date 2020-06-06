import path from 'path';

import {BuildScript} from '../config';
import attemptLoadFile from './attempt-load-file';
import {srcFileExtensionMapping} from '../files';
import {MiddlewareContext} from '.';

interface GetFileFromUrlOptions {
  context: MiddlewareContext;
  attemptedFileLoads: string[];
  isRoute: boolean;
  reqPath: string;
  requestedFileExt: string;
}

export default async function getFileFromUrl({
  context: {commandOptions, mountedDirectories},
  attemptedFileLoads,
  isRoute,
  reqPath,
  requestedFileExt,
}: GetFileFromUrlOptions): Promise<{
  filePath?: string;
  script?: BuildScript;
  responseFileExt?: string;
}> {
  const {config} = commandOptions;
  for (const [dirDisk, dirUrl] of mountedDirectories) {
    let requestedFile: string;
    if (dirUrl === '/') {
      requestedFile = path.join(dirDisk, reqPath);
    } else if (reqPath.startsWith(dirUrl)) {
      requestedFile = path.join(dirDisk, reqPath.replace(dirUrl, './'));
    } else {
      continue;
    }
    if (requestedFile.startsWith(commandOptions.config.installOptions.dest)) {
      const filePath = await attemptLoadFile({requestedFile, attemptedFileLoads});
      if (filePath) {
        return {filePath};
      }
    }
    if (isRoute) {
      let filePath =
        (await attemptLoadFile({requestedFile: requestedFile + '.html', attemptedFileLoads})) ||
        (await attemptLoadFile({
          requestedFile: requestedFile + 'index.html',
          attemptedFileLoads,
        })) ||
        (await attemptLoadFile({requestedFile: requestedFile + '/index.html', attemptedFileLoads}));

      if (!filePath && dirUrl === '/' && config.devOptions.fallback) {
        const fallbackFile = path.join(dirDisk, config.devOptions.fallback);
        filePath = await attemptLoadFile({requestedFile: fallbackFile, attemptedFileLoads});
      }
      if (filePath) {
        return {filePath, responseFileExt: '.html'};
      }
    } else {
      for (const script of config.scripts) {
        const {type, match} = script;
        if (type !== 'build') {
          continue;
        }
        for (const extMatcher of match) {
          if (
            extMatcher === requestedFileExt.substr(1) ||
            srcFileExtensionMapping[extMatcher] === requestedFileExt.substr(1)
          ) {
            const srcFile = requestedFile.replace(requestedFileExt, `.${extMatcher}`);
            const filePath = await attemptLoadFile({requestedFile: srcFile, attemptedFileLoads});
            if (filePath) {
              return {filePath, script};
            }
          }
        }
      }
      const filePath =
        (await attemptLoadFile({requestedFile: requestedFile, attemptedFileLoads})) ||
        (await attemptLoadFile({
          requestedFile: requestedFile.replace(/\.js$/, '.jsx'),
          attemptedFileLoads,
        })) ||
        (await attemptLoadFile({
          requestedFile: requestedFile.replace(/\.js$/, '.ts'),
          attemptedFileLoads,
        })) ||
        (await attemptLoadFile({
          requestedFile: requestedFile.replace(/\.js$/, '.tsx'),
          attemptedFileLoads,
        }));
      if (filePath) {
        return {filePath};
      }
    }
  }
  return {};
}

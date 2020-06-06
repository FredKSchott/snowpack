import cacache from 'cacache';
import chalk from 'chalk';
import etag from 'etag';
import {promises as fs, readFileSync} from 'fs';
import http from 'http';
import HttpProxy from 'http-proxy';
import path from 'path';
import url from 'url';

import sendFile from './send-file';
import {
  FileBuilder,
  wrapEsmProxyResponse,
  getFileBuilderForWorker,
  wrapHtmlResponse,
  wrapCssModuleResponse,
  wrapImportMeta,
  generateEnvModule,
} from '../commands/build-util';
import {getEncodingType} from '../files';
import getFileFromUrl from './get-file-from-url';
import sendError from './send-error';
import {transformEsmImports, scanCodeImportsExports} from '../rewrite-imports';
import buildFile from './build-file';
import {SnowpackPluginBuildResult} from '../config';
import shouldProxy from './should-proxy';
import {MiddlewareContext} from '.';
import {BUILD_CACHE} from '../util';

const HMR_DEV_CODE = readFileSync(path.join(__dirname, '../assets/hmr.js'));

interface RequestListenerOptions {
  context: MiddlewareContext;
  devProxies?: {[pathPrefix: string]: HttpProxy};
}

export default function requestListener({context, devProxies}: RequestListenerOptions) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const {
      cache: {inMemoryResourceCache, inMemoryBuildCache, filesBeingDeleted},
      messageBus,
      commandOptions: {config, cwd},
    } = context;
    const {hmr} = config.devOptions;
    const reqUrl = req.url!;
    let reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const originalReqPath = reqPath;
    let isProxyModule = false;
    let isCssModule = false;
    if (reqPath.endsWith('.proxy.js')) {
      isProxyModule = true;
      reqPath = reqPath.replace('.proxy.js', '');
    }
    if (reqPath.endsWith('.module.css')) {
      isCssModule = true;
    }

    // const requestStart = Date.now();
    res.on('finish', () => {
      const {method, url} = req;
      const {statusCode} = res;
      if (statusCode !== 200) {
        messageBus?.emit('SERVER_RESPONSE', {
          method,
          url,
          statusCode,
          // processingTime: Date.now() - requestStart,
        });
      }
    });

    if (reqPath === '/__snowpack__/hmr.js') {
      sendFile({req, res, body: HMR_DEV_CODE, ext: '.js'});
      return;
    }
    if (reqPath === '/__snowpack__/env.js') {
      sendFile({req, res, body: generateEnvModule('development'), ext: '.js'});
      return;
    }

    if (devProxies) {
      for (const [pathPrefix] of config.proxy) {
        if (!shouldProxy(pathPrefix, req)) {
          continue;
        }
        devProxies[pathPrefix].web(req, res);
        return;
      }
    }

    const attemptedFileLoads: string[] = [];

    let requestedFileExt = path.parse(reqPath).ext.toLowerCase();
    let responseFileExt = requestedFileExt;
    let fileBuilder: FileBuilder | undefined;
    let isRoute = !requestedFileExt;

    // Now that we've set isRoute properly, give `requestedFileExt` a fallback
    requestedFileExt = requestedFileExt || '.html';

    // 0. Check if the request is for a virtual sub-resource. These are populated by some
    // builders when a file compiles to multiple files. For example, Svelte & Vue files
    // compile to a main JS file + related CSS to import with the JS.
    let virtualResourceResponse: string | undefined = inMemoryResourceCache.get(reqPath);
    if (virtualResourceResponse) {
      if (isProxyModule) {
        responseFileExt = '.js';
        virtualResourceResponse = wrapEsmProxyResponse(
          reqPath,
          virtualResourceResponse,
          requestedFileExt,
          true,
        );
      }
      sendFile({req, res, body: virtualResourceResponse, ext: responseFileExt});
      return;
    }

    const {
      filePath,
      script: selectedWorker,
      responseFileExt: newResponseFileExt,
    } = await getFileFromUrl({attemptedFileLoads, context, isRoute, reqPath, requestedFileExt});
    responseFileExt = newResponseFileExt || responseFileExt;

    if (isRoute) {
      messageBus.emit('NEW_SESSION');
    }

    if (!filePath) {
      const prefix = chalk.red('  ✘ ');
      console.error(`[404] ${reqUrl}\n${attemptedFileLoads.map((loc) => prefix + loc).join('\n')}`);
      return sendError(res, 404);
    }

    if (selectedWorker) {
      fileBuilder = getFileBuilderForWorker(cwd, selectedWorker, messageBus);
    }

    async function wrapResponse(code: string, cssResource: string | undefined) {
      if (isRoute) {
        code = wrapHtmlResponse(code, hmr);
      } else if (isProxyModule) {
        responseFileExt = '.js';
        code = wrapEsmProxyResponse(reqPath, code, requestedFileExt, hmr);
      } else if (isCssModule) {
        responseFileExt = '.js';
        code = await wrapCssModuleResponse(reqPath, code, requestedFileExt, hmr);
      } else if (responseFileExt === '.js') {
        code = wrapImportMeta(code, {env: true, hmr});
      }
      if (responseFileExt === '.js' && cssResource) {
        code = `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` + code;
      }
      return code;
    }

    // 1. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: string | Buffer | undefined = inMemoryBuildCache.get(filePath);
    if (hotCachedResponse) {
      hotCachedResponse = hotCachedResponse.toString(getEncodingType(requestedFileExt));
      const isHot = reqUrl.includes('?mtime=');
      if (isHot) {
        const [, mtime] = reqUrl.split('?');
        hotCachedResponse = await transformEsmImports(hotCachedResponse as string, (imp) => {
          const importUrl = path.posix.resolve(path.posix.dirname(reqPath), imp);

          if (context.hmrEngine) {
            const node = context.hmrEngine.getEntry(importUrl);
            if (node && node.needsReplacement) {
              context.hmrEngine.markEntryForReplacement(node, false);
              return `${imp}?${mtime}`;
            }
          }
          return imp;
        });
      }

      const wrappedResponse = await wrapResponse(
        hotCachedResponse,
        inMemoryResourceCache.get(reqPath.replace(/.js$/, '.css')),
      );
      sendFile({req, res, body: wrappedResponse, ext: responseFileExt});
      return;
    }

    // 2. Load the file from disk. We'll need it to check the cold cache or build from scratch.
    let fileContents: string;
    try {
      fileContents = await fs.readFile(filePath, getEncodingType(requestedFileExt));
    } catch (err) {
      console.error(filePath, err);
      return sendError(res, 500);
    }

    // 3. Check the persistent cache. If found, serve it via a "trust-but-verify" strategy.
    // Build it after sending, and if it no longer matches then assume the entire cache is suspect.
    // In that case, clear the persistent cache and then force a live-reload of the page.
    const cachedBuildData =
      !filesBeingDeleted.has(filePath) &&
      (await cacache.get(BUILD_CACHE, filePath).catch(() => null));
    if (cachedBuildData) {
      const {originalFileHash, resources} = cachedBuildData.metadata;
      const newFileHash = etag(fileContents);
      if (originalFileHash === newFileHash) {
        const coldCachedResponse: Buffer = cachedBuildData.data;
        inMemoryBuildCache.set(filePath, coldCachedResponse);
        if (resources?.css) {
          inMemoryResourceCache.set(reqPath.replace(/.js$/, '.css'), resources.css);
        }
        // Trust...
        const wrappedResponse = await wrapResponse(
          coldCachedResponse.toString(getEncodingType(requestedFileExt)),
          resources?.css,
        );

        if (responseFileExt === '.js') {
          const isHmrEnabled = wrappedResponse.includes('import.meta.hot');
          const rawImports = await scanCodeImportsExports(wrappedResponse);
          const resolvedImports = rawImports.map((imp) => {
            let spec = wrappedResponse.substring(imp.s, imp.e);
            if (imp.d > -1) {
              const importSpecifierMatch = spec.match(/^\s*['"](.*)['"]\s*$/m);
              spec = importSpecifierMatch![1];
            }
            return path.posix.resolve(path.posix.dirname(reqPath), spec);
          });
          context.hmrEngine?.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
        }

        sendFile({req, res, body: wrappedResponse, ext: responseFileExt});
        // ...but verify.
        let checkFinalBuildResult: string | null | undefined = null;
        let checkFinalBuildCss: string | null | undefined = null;
        try {
          const checkFinalBuildAnyway = await buildFile({
            context,
            fileContents,
            filePath,
            reqPath,
            fileBuilder,
          });
          checkFinalBuildResult = checkFinalBuildAnyway && checkFinalBuildAnyway.result;
          checkFinalBuildCss = checkFinalBuildAnyway && checkFinalBuildAnyway.resources?.css;
        } catch (err) {
          // safe to ignore, it will be surfaced later anyway
        } finally {
          if (
            checkFinalBuildCss !== resources?.css ||
            !checkFinalBuildResult ||
            !coldCachedResponse.equals(
              Buffer.from(checkFinalBuildResult, getEncodingType(requestedFileExt)),
            )
          ) {
            inMemoryBuildCache.clear();
            await cacache.rm.all(BUILD_CACHE);
            context.hmrEngine?.broadcastMessage({type: 'reload'});
          }
        }
        return;
      }
    }

    // 4. Final option: build the file, serve it, and cache it.
    let finalBuild: SnowpackPluginBuildResult | undefined;
    try {
      finalBuild = await buildFile({
        context,
        fileContents,
        filePath,
        reqPath,
        fileBuilder,
      });
    } catch (err) {
      console.error(filePath, err);
    }
    if (!finalBuild || finalBuild.result === '') {
      return sendError(res, 500);
    }
    inMemoryBuildCache.set(
      filePath,
      Buffer.from(finalBuild.result, getEncodingType(requestedFileExt)),
    );
    if (finalBuild.resources?.css) {
      inMemoryResourceCache.set(reqPath.replace(/.js$/, `.css`), finalBuild.resources.css);
    }
    const originalFileHash = etag(fileContents);
    cacache.put(
      BUILD_CACHE,
      filePath,
      Buffer.from(finalBuild.result, getEncodingType(requestedFileExt)),
      {metadata: {originalFileHash, resources: finalBuild.resources}},
    );
    const wrappedResponse = await wrapResponse(finalBuild.result, finalBuild.resources?.css);

    if (responseFileExt === '.js') {
      const isHmrEnabled = wrappedResponse.includes('import.meta.hot');
      const rawImports = await scanCodeImportsExports(wrappedResponse);
      const resolvedImports = rawImports.map((imp) => {
        let spec = wrappedResponse.substring(imp.s, imp.e);
        if (imp.d > -1) {
          const importSpecifierMatch = spec.match(/^\s*['"](.*)['"]\s*$/m);
          spec = importSpecifierMatch![1];
        }
        return path.posix.resolve(path.posix.dirname(reqPath), spec);
      });
      context.hmrEngine?.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
    }

    sendFile({req, res, body: wrappedResponse, ext: responseFileExt});
  };
}

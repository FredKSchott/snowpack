import cacache from 'cacache';
import etag from 'etag';
import { promises as fs } from 'fs';
import mime from 'mime-types';
import path from 'path';
import url from 'url';
import { logger } from '../../logger';
import {
  CommandOptions,
  LoadResult,
  SnowpackBuildMap,
} from '../../types';
import {
  BUILD_CACHE,
  hasExtension,
  HMR_CLIENT_CODE,
  HMR_OVERLAY_CODE,
  readFile,
  removeExtension,
} from '../../util';

import { isBinaryFile } from 'isbinaryfile';
import {
  generateEnvModule,
  getMetaUrlPath,
  wrapImportProxy,
} from '../../build/build-import-proxy';

import type { FoundFile } from './file-getter';
import { FileGetter } from './file-getter';
import type { LoaderBuilderContext }  from './file-builder';
import { FileBuilder } from './file-builder';
import type { SourceImportMap } from './source-import-map';

const FILE_BUILD_RESULT_ERROR = `Build Result Error: There was a problem with a file build result.`;

export class UrlLoader {
  constructor(
    private readonly loaderBuilderContext: LoaderBuilderContext,
    private readonly loaderContext: {
    filesBeingDeleted: Set<string>,
    commandOptions: CommandOptions,
  },
  private readonly sourceImportMap: SourceImportMap,
  private readonly port: number,
  ) { }

  loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }?: { isSSR?: boolean; allowStale?: boolean; encoding?: undefined },
  ): Promise<LoadResult<Buffer | string>>;
  loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }: { isSSR?: boolean; allowStale?: boolean; encoding: BufferEncoding },
  ): Promise<LoadResult<string>>;
  loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }: { isSSR?: boolean; allowStale?: boolean; encoding: null },
  ): Promise<LoadResult<Buffer>>;
  async loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      isHMR: _isHMR,
      allowStale: _allowStale,
      encoding: _encoding,
    }: {
      isSSR?: boolean;
      isHMR?: boolean;
      allowStale?: boolean;
      encoding?: BufferEncoding | null;
    } = {},
  ): Promise<LoadResult> {
    const {
      config,
      hmrEngine,
      inMemoryBuildCache,
      getCacheKey,
      pkgSource,
    } = this.loaderBuilderContext;
    const {
      commandOptions,
      filesBeingDeleted,
    } = this.loaderContext;

    const isSSR = _isSSR ?? false;
    // Default to HMR on, but disable HMR if SSR mode is enabled.
    const isHMR = _isHMR ?? ((config.devOptions.hmr ?? true) && !isSSR);
    const allowStale = _allowStale ?? false;
    const encoding = _encoding ?? null;
    let reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const originalReqPath = reqPath;
    let isProxyModule = false;
    if (hasExtension(reqPath, '.proxy.js')) {
      isProxyModule = true;
      reqPath = removeExtension(reqPath, '.proxy.js');
    } else if (hasExtension(reqPath, '.map')) {
      reqPath = removeExtension(reqPath, '.map');
    }

    if (reqPath === getMetaUrlPath('/hmr-client.js', config)) {
      return {
        contents: encodeResponse(HMR_CLIENT_CODE, encoding),
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }
    if (reqPath === getMetaUrlPath('/hmr-error-overlay.js', config)) {
      return {
        contents: encodeResponse(HMR_OVERLAY_CODE, encoding),
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }
    if (reqPath === getMetaUrlPath('/env.js', config)) {
      return {
        contents: encodeResponse(generateEnvModule({ mode: 'development', isSSR }), encoding),
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }

    if (reqPath.startsWith(config.buildOptions.webModulesUrl)) {
      try {
        const webModuleUrl = reqPath.substr(config.buildOptions.webModulesUrl.length + 1);
        const loadedModule = await pkgSource.load(webModuleUrl, commandOptions);
        let code = loadedModule;
        if (isProxyModule) {
          code = await wrapImportProxy({ url: reqPath, code: code.toString(), hmr: isHMR, config });
        }
        return {
          contents: encodeResponse(code, encoding),
          originalFileLoc: null,
          contentType: path.extname(originalReqPath)
            ? mime.lookup(path.extname(originalReqPath))
            : 'application/javascript',
        };
      } catch (err) {
        const errorTitle = `Dependency Load Error`;
        const errorMessage = err.message;
        logger.error(`${errorTitle}: ${errorMessage}`);
        hmrEngine.broadcastMessage({
          type: 'error',
          title: errorTitle,
          errorMessage,
          fileLoc: reqPath,
        });
        throw err;
      }
    }

    const attemptedFileLoads: string[] = [];
    async function attemptLoadFile(requestedFile: string): Promise<null | string> {
      if (attemptedFileLoads.includes(requestedFile)) {
        return null;
      }
      attemptedFileLoads.push(requestedFile);
      try {
        const stat = await fs.stat(requestedFile);
        return stat.isFile() ? requestedFile : null;
      } catch (e) {
        return null /* ignore */;
      }
    }

    let requestedFile = path.parse(reqPath);
    let requestedFileExt = requestedFile.ext.toLowerCase();
    let isRoute = !requestedFileExt || requestedFileExt === '.html';

    const fileBuilder = new FileBuilder(
      this.loaderBuilderContext,
      {
      reqUrl,
      isSSR,
      isHMR,
      isRoute,
      isProxyModule,
      reqPath,
      originalReqPath,
      requestedFile,
    }, 
    requestedFileExt,
    this.sourceImportMap,
    this.port,
    );

    const fileGetter = new FileGetter(config, attemptLoadFile);

    async function getFileFromLazyUrl(reqPath: string): Promise<FoundFile | null> {
      for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
        let requestedFile: string;
        if (mountEntry.url === '/') {
          requestedFile = path.join(mountKey, reqPath);
        } else if (reqPath.startsWith(mountEntry.url)) {
          requestedFile = path.join(mountKey, reqPath.replace(mountEntry.url, './'));
        } else {
          continue;
        }
        let fileLoc =
          (await attemptLoadFile(requestedFile + '.html')) ||
          (await attemptLoadFile(requestedFile + 'index.html')) ||
          (await attemptLoadFile(requestedFile + '/index.html'));
        if (fileLoc) {
          requestedFileExt = '.html';
          fileBuilder.responseFileExt = '.html';
          return { fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve };
        }
      }
      return null;
    }

    async function getFileFromFallback(): Promise<FoundFile | null> {
      if (!config.devOptions.fallback) {
        return null;
      }
      for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
        if (mountEntry.url !== '/') {
          continue;
        }
        const fallbackFile = path.join(mountKey, config.devOptions.fallback);
        const fileLoc = await attemptLoadFile(fallbackFile);
        if (fileLoc) {
          requestedFileExt = '.html';
          fileBuilder.responseFileExt = '.html';
          return { fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve };
        }
      }
      return null;
    }

    let foundFile = await fileGetter.getFileFromUrl(reqPath);
    if (!foundFile && isRoute) {
      foundFile =
        (await getFileFromLazyUrl(reqPath)) ||
        // @deprecated: to be removed in v3
        (await getFileFromFallback());
    }

    if (!foundFile) {
      throw new NotFoundError(attemptedFileLoads);
    }


    const { fileLoc, isStatic: _isStatic, isResolve } = foundFile;
    // Workaround: HMR plugins need to add scripts to HTML file, even if static.
    // TODO: Once plugins are able to add virtual files + imports, this will no longer be needed.
    const isStatic = _isStatic && !hasExtension(fileLoc, '.html');

    // 1. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: SnowpackBuildMap | undefined = inMemoryBuildCache.get(
      getCacheKey(fileLoc, { isSSR, env: process.env.NODE_ENV }),
    );
    if (hotCachedResponse) {
      let responseContent: string | Buffer | null;
      try {
        responseContent = await fileBuilder.finalizeResponse(fileLoc, requestedFileExt, hotCachedResponse);
      } catch (err) {
        logger.error(FILE_BUILD_RESULT_ERROR);
        hmrEngine.broadcastMessage({
          type: 'error',
          title: FILE_BUILD_RESULT_ERROR,
          errorMessage: err.toString(),
          fileLoc,
          errorStackTrace: err.stack,
        });
        throw err;
      }
      if (!responseContent) {
        throw new NotFoundError([fileLoc]);
      }
      return {
        contents: encodeResponse(responseContent, encoding),
        originalFileLoc: fileLoc,
        contentType: mime.lookup(fileBuilder.responseFileExt),
      };
    }

    // 2. Load the file from disk. We'll need it to check the cold cache or build from scratch.
    const fileContents = await readFile(url.pathToFileURL(fileLoc));

    // 3. Send static files directly, since they were already build & resolved at install time.
    if (!isProxyModule && isStatic) {
      // If no resolution needed, just send the file directly.
      if (!isResolve) {
        return {
          contents: encodeResponse(fileContents, encoding),
          originalFileLoc: fileLoc,
          contentType: mime.lookup(fileBuilder.responseFileExt),
        };
      }
      // Otherwise, finalize the response (where resolution happens) before sending.
      let responseContent: string | Buffer | null;
      try {
        responseContent = await fileBuilder.finalizeResponse(fileLoc, requestedFileExt, {
          [requestedFileExt]: { code: fileContents },
        });
      } catch (err) {
        logger.error(FILE_BUILD_RESULT_ERROR);
        hmrEngine.broadcastMessage({
          type: 'error',
          title: FILE_BUILD_RESULT_ERROR,
          errorMessage: err.toString(),
          fileLoc,
          errorStackTrace: err.stack,
        });
        throw err;
      }
      if (!responseContent) {
        throw new NotFoundError([fileLoc]);
      }
      return {
        contents: encodeResponse(responseContent, encoding),
        originalFileLoc: fileLoc,
        contentType: mime.lookup(fileBuilder.responseFileExt),
      };
    }

    // 4. Check the persistent cache. If found, serve it via a
    // "trust-but-verify" strategy. Build it after sending, and if it no longer
    // matches then assume the entire cache is suspect. In that case, clear the
    // persistent cache and then force a live-reload of the page.
    const cachedBuildData =
      allowStale &&
      process.env.NODE_ENV !== 'test' &&
      !filesBeingDeleted.has(fileLoc) &&
      !(await isBinaryFile(fileLoc)) &&
      (await cacache
        .get(BUILD_CACHE, getCacheKey(fileLoc, { isSSR, env: process.env.NODE_ENV }))
        .catch(() => null));
    if (cachedBuildData) {
      const { originalFileHash } = cachedBuildData.metadata;
      const newFileHash = etag(fileContents);
      if (originalFileHash === newFileHash) {
        // IF THIS FAILS TS CHECK: If you are changing the structure of
        // SnowpackBuildMap, be sure to also update `BUILD_CACHE` in util.ts to
        // a new unique name, to guarantee a clean cache for our users.
        const coldCachedResponse: SnowpackBuildMap = JSON.parse(
          cachedBuildData.data.toString(),
        ) as Record<
          string,
          {
            code: string;
            map?: string;
          }
        >;
        inMemoryBuildCache.set(
          getCacheKey(fileLoc, { isSSR, env: process.env.NODE_ENV }),
          coldCachedResponse,
        );

        let wrappedResponse: string | Buffer | null;
        try {
          wrappedResponse = await fileBuilder.finalizeResponse(fileLoc, requestedFileExt, coldCachedResponse);
        } catch (err) {
          logger.error(FILE_BUILD_RESULT_ERROR);
          hmrEngine.broadcastMessage({
            type: 'error',
            title: FILE_BUILD_RESULT_ERROR,
            errorMessage: err.toString(),
            fileLoc,
            errorStackTrace: err.stack,
          });
          throw err;
        }

        if (!wrappedResponse) {
          throw new NotFoundError([fileLoc]);
        }
        // Trust...
        return {
          contents: encodeResponse(wrappedResponse, encoding),
          originalFileLoc: fileLoc,
          contentType: mime.lookup(fileBuilder.responseFileExt),
          // ...but verify.
          checkStale: async () => {
            let checkFinalBuildResult: SnowpackBuildMap | null = null;
            try {
              checkFinalBuildResult = await fileBuilder.buildFile(fileLoc!);
            } catch (err) {
              // safe to ignore, it will be surfaced later anyway
            } finally {
              if (
                !checkFinalBuildResult ||
                !cachedBuildData.data.equals(Buffer.from(JSON.stringify(checkFinalBuildResult)))
              ) {
                inMemoryBuildCache.clear();
                await cacache.rm.all(BUILD_CACHE);
                hmrEngine.broadcastMessage({ type: 'reload' });
              }
            }
            return;
          },
        };
      }
    }

    // 5. Final option: build the file, serve it, and cache it.
    let responseContent: string | Buffer | null;
    let responseOutput: SnowpackBuildMap;
    try {
      responseOutput = await fileBuilder.buildFile(fileLoc);
    } catch (err) {
      hmrEngine.broadcastMessage({
        type: 'error',
        title:
          `Build Error` +
          (err.__snowpackBuildDetails ? `: ${err.__snowpackBuildDetails.name}` : ''),
        errorMessage: err.toString(),
        fileLoc,
        errorStackTrace: err.stack,
      });
      throw err;
    }
    try {
      responseContent = await fileBuilder.finalizeResponse(fileLoc, requestedFileExt, responseOutput);
    } catch (err) {
      logger.error(FILE_BUILD_RESULT_ERROR);
      hmrEngine.broadcastMessage({
        type: 'error',
        title: FILE_BUILD_RESULT_ERROR,
        errorMessage: err.toString(),
        fileLoc,
        errorStackTrace: err.stack,
      });
      throw err;
    }
    if (!responseContent) {
      throw new NotFoundError([fileLoc]);
    }

    // Save the file to the cold cache for reuse across restarts.
    cacache
      .put(
        BUILD_CACHE,
        getCacheKey(fileLoc, { isSSR, env: process.env.NODE_ENV }),
        Buffer.from(JSON.stringify(responseOutput)),
        {
          metadata: { originalFileHash: etag(fileContents) },
        },
      )
      .catch((err) => {
        logger.error(`Cache Error: ${err.toString()}`);
      });

    return {
      contents: encodeResponse(responseContent, encoding),
      originalFileLoc: fileLoc,
      contentType: mime.lookup(fileBuilder.responseFileExt),
    };
  }
}

/**
 * If encoding is defined, return a string. Otherwise, return a Buffer.
 */
function encodeResponse(
  response: Buffer | string,
  encoding: BufferEncoding | undefined | null,
): Buffer | string {
  if (encoding === undefined) {
    return response;
  }
  if (encoding) {
    if (typeof response === 'string') {
      return response;
    } else {
      return response.toString(encoding);
    }
  }
  if (typeof response === 'string') {
    return Buffer.from(response);
  } else {
    return response;
  }
}


/**
 * A helper class for "Not Found" errors, storing data about what file lookups were attempted.
 */
export class NotFoundError extends Error {
  lookups: string[];

  constructor(lookups: string[]) {
    super('NOT_FOUND');
    this.lookups = lookups;
  }
}

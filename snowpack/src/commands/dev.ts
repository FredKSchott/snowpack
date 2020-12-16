/**
 * This license applies to parts of this file originating from the
 * https://github.com/lukejacksonn/servor repository:
 *
 * MIT License
 * Copyright (c) 2019 Luke Jackson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import cacache from 'cacache';
import isCompressible from 'compressible';
import etag from 'etag';
import {EventEmitter} from 'events';
import {createReadStream, promises as fs, statSync} from 'fs';
import http from 'http';
import http2 from 'http2';
import https from 'https';
import {isBinaryFile} from 'isbinaryfile';
import * as colors from 'kleur/colors';
import mime from 'mime-types';
import os from 'os';
import path from 'path';
import {performance} from 'perf_hooks';
import onProcessExit from 'signal-exit';
import stream from 'stream';
import url from 'url';
import util from 'util';
import zlib from 'zlib';
import {
  generateEnvModule,
  getMetaUrlPath,
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from '../build/build-import-proxy';
import {buildFile as _buildFile, getInputsFromOutput} from '../build/build-pipeline';
import {getUrlForFile} from '../build/file-urls';
import {createImportResolver} from '../build/import-resolver';
import {EsmHmrEngine} from '../hmr-server-engine';
import {logger} from '../logger';
import {
  scanCodeImportsExports,
  transformEsmImports,
  transformFileImports,
} from '../rewrite-imports';
import {matchDynamicImportValue} from '../scan-imports';
import {
  CommandOptions,
  LoadResult,
  OnFileChangeCallback,
  RouteConfigObject,
  SnowpackBuildMap,
  SnowpackDevServer,
} from '../types/snowpack';
import {
  BUILD_CACHE,
  cssSourceMappingURL,
  getPackageSource,
  hasExtension,
  HMR_CLIENT_CODE,
  HMR_OVERLAY_CODE,
  isFsEventsEnabled,
  isRemoteUrl,
  jsSourceMappingURL,
  openInBrowser,
  parsePackageImportSpecifier,
  readFile,
  relativeURL,
  removeExtension,
  resolveDependencyManifest,
} from '../util';
import {getPort, getServerInfoMessage, paintDashboard, paintEvent} from './paint';

interface FoundFile {
  fileLoc: string;
  isStatic: boolean;
  isResolve: boolean;
}

const FILE_BUILD_RESULT_ERROR = `Build Result Error: There was a problem with a file build result.`;

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

function getCacheKey(fileLoc: string, {isSSR, env}) {
  return `${fileLoc}?env=${env}&isSSR=${isSSR ? '1' : '0'}`;
}

/**
 * A helper class for "Not Found" errors, storing data about what file lookups were attempted.
 */
class NotFoundError extends Error {
  lookups: string[];

  constructor(lookups: string[]) {
    super('NOT_FOUND');
    this.lookups = lookups;
  }
}

function sendResponseFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  {contents, originalFileLoc, contentType}: LoadResult,
) {
  const body = Buffer.from(contents);
  const ETag = etag(body, {weak: true});
  const headers: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': contentType || 'application/octet-stream',
    ETag,
    Vary: 'Accept-Encoding',
  };

  if (req.headers['if-none-match'] === ETag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  let acceptEncoding = (req.headers['accept-encoding'] as string) || '';
  if (
    req.headers['cache-control']?.includes('no-transform') ||
    ['HEAD', 'OPTIONS'].includes(req.method!) ||
    !contentType ||
    !isCompressible(contentType)
  ) {
    acceptEncoding = '';
  }

  // Handle gzip compression
  if (/\bgzip\b/.test(acceptEncoding) && stream.Readable.from) {
    const bodyStream = stream.Readable.from([body]);
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    stream.pipeline(bodyStream, zlib.createGzip(), res, function onError(err) {
      if (err) {
        res.end();
        logger.error(`✘ An error occurred serving ${colors.bold(req.url!)}`);
        logger.error(typeof err !== 'string' ? err.toString() : err);
      }
    });
    return;
  }

  // Handle partial requests
  // TODO: This throws out a lot of hard work, and ignores any build. Improve.
  const {range} = req.headers;
  if (range) {
    if (!originalFileLoc) {
      throw new Error('Virtual files do not support partial requests');
    }
    const {size: fileSize} = statSync(originalFileLoc);
    const [rangeStart, rangeEnd] = range.replace(/bytes=/, '').split('-');

    const start = parseInt(rangeStart, 10);
    const end = rangeEnd ? parseInt(rangeEnd, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileStream = createReadStream(originalFileLoc, {start, end});
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
    });
    fileStream.pipe(res);
    return;
  }

  res.writeHead(200, headers);
  res.write(body);
  res.end();
}

function sendResponseError(req: http.IncomingMessage, res: http.ServerResponse, status: number) {
  const contentType = mime.contentType(path.extname(req.url!) || '.html');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType || 'application/octet-stream',
    Vary: 'Accept-Encoding',
  };
  res.writeHead(status, headers);
  res.end();
}

function handleResponseError(req, res, err: Error | NotFoundError) {
  if (err instanceof NotFoundError) {
    // Don't log favicon "Not Found" errors. Browsers automatically request a favicon.ico file
    // from the server, which creates annoying errors for new apps / first experiences.
    if (req.path !== '/favicon.ico') {
      const attemptedFilesMessage = err.lookups.map((loc) => '  ✘ ' + loc).join('\n');
      logger.error(`[404] ${req.url}\n${attemptedFilesMessage}`);
    }
    sendResponseError(req, res, 404);
    return;
  }
  logger.error(err.toString());
  logger.error(`[500] ${req.url}`, {
    // @ts-ignore
    name: err.__snowpackBuildDetails?.name,
  });
  sendResponseError(req, res, 500);
  return;
}

export async function startDevServer(commandOptions: CommandOptions): Promise<SnowpackDevServer> {
  const {config} = commandOptions;
  // Start the startup timer!
  let serverStart = performance.now();

  const {port: defaultPort, hostname, open} = config.devOptions;
  const messageBus = new EventEmitter();
  const port = await getPort(defaultPort);
  const pkgSource = getPackageSource(config.experiments.source);

  // Reset the clock if we had to wait for the user prompt to select a new port.
  if (port !== defaultPort) {
    serverStart = performance.now();
  }

  // Fill in any command-specific plugin methods.
  for (const p of config.plugins) {
    p.markChanged = (fileLoc) => {
      knownETags.clear();
      onWatchEvent(fileLoc);
    };
  }

  if (config.devOptions.output === 'dashboard') {
    // "dashboard": Pipe console methods to the logger, and then start the dashboard.
    logger.debug(`attaching console.log listeners`);
    console.log = (...args: [any, ...any[]]) => {
      logger.info(util.format(...args));
    };
    console.warn = (...args: [any, ...any[]]) => {
      logger.warn(util.format(...args));
    };
    console.error = (...args: [any, ...any[]]) => {
      logger.error(util.format(...args));
    };
    paintDashboard(messageBus, config);
    logger.debug(`dashboard started`);
  } else {
    // "stream": Log relevent events to the console.
    messageBus.on(paintEvent.WORKER_MSG, ({id, msg}) => {
      logger.info(msg.trim(), {name: id});
    });
    messageBus.on(paintEvent.SERVER_START, (info) => {
      console.log(getServerInfoMessage(info));
    });
  }

  const inMemoryBuildCache = new Map<string, SnowpackBuildMap>();
  const filesBeingDeleted = new Set<string>();
  const filesBeingBuilt = new Map<string, Promise<SnowpackBuildMap>>();

  logger.debug(`Using in-memory cache.`);
  logger.debug(`Mounting directories:`, {
    task: () => {
      for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
        logger.debug(` -> '${mountKey}' as URL '${mountEntry.url}'`);
      }
    },
  });

  let sourceImportMap = await pkgSource.prepare(commandOptions);
  const readCredentials = async (cwd: string) => {
    const [cert, key] = await Promise.all([
      fs.readFile(path.join(cwd, 'snowpack.crt')),
      fs.readFile(path.join(cwd, 'snowpack.key')),
    ]);

    return {
      cert,
      key,
    };
  };

  let credentials: {cert: Buffer; key: Buffer} | undefined;
  if (config.devOptions.secure) {
    try {
      logger.debug(`reading credentials`);
      credentials = await readCredentials(config.root);
    } catch (e) {
      logger.error(
        `✘ No HTTPS credentials found! Missing Files:  ${colors.bold(
          'snowpack.crt',
        )}, ${colors.bold('snowpack.key')}`,
      );
      logger.info(`You can automatically generate credentials for your project via either:

  - ${colors.cyan('devcert')}: ${colors.yellow('npx devcert-cli generate localhost')}
    https://github.com/davewasmer/devcert-cli (no install required)

  - ${colors.cyan('mkcert')}: ${colors.yellow(
        'mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost',
      )}

    https://github.com/FiloSottile/mkcert (install required)`);
      process.exit(1);
    }
  }

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      logger.debug(`starting ${runPlugin.name} run() in watch/isDev mode`);
      runPlugin
        .run({
          isDev: true,
          // @ts-ignore: internal API only
          log: (msg, data) => {
            if (msg === 'CONSOLE_INFO') {
              logger.info(data.msg, {name: runPlugin.name});
            } else {
              messageBus.emit(msg, {...data, id: runPlugin.name});
            }
          },
        })
        .then(() => {
          logger.info('Command completed.', {name: runPlugin.name});
        })
        .catch((err) => {
          logger.error(`Command exited with error code: ${err}`, {name: runPlugin.name});
          process.exit(1);
        });
    }
  }

  function loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }?: {isSSR?: boolean; allowStale?: boolean; encoding?: undefined},
  ): Promise<LoadResult<Buffer | string>>;
  function loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }: {isSSR?: boolean; allowStale?: boolean; encoding: BufferEncoding},
  ): Promise<LoadResult<string>>;
  function loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      allowStale: _allowStale,
      encoding: _encoding,
    }: {isSSR?: boolean; allowStale?: boolean; encoding: null},
  ): Promise<LoadResult<Buffer>>;
  async function loadUrl(
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
    const isSSR = _isSSR ?? false;
    // Default to HMR on, but disable HMR if SSR mode is enabled.
    const isHMR = _isHMR ?? ((config.devOptions.hmr ?? true) && !isSSR);
    const allowStale = _allowStale ?? false;
    const encoding = _encoding ?? null;
    const reqUrlHmrParam = reqUrl.includes('?mtime=') && reqUrl.split('?')[1];
    let reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const originalReqPath = reqPath;
    let isProxyModule = false;
    let isSourceMap = false;
    if (hasExtension(reqPath, '.proxy.js')) {
      isProxyModule = true;
      reqPath = removeExtension(reqPath, '.proxy.js');
    } else if (hasExtension(reqPath, '.map')) {
      isSourceMap = true;
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
        contents: encodeResponse(generateEnvModule({mode: 'development', isSSR}), encoding),
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
          code = await wrapImportProxy({url: reqPath, code: code.toString(), hmr: isHMR, config});
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
    function attemptLoadFile(requestedFile): Promise<null | string> {
      if (attemptedFileLoads.includes(requestedFile)) {
        return Promise.resolve(null);
      }
      attemptedFileLoads.push(requestedFile);
      return fs
        .stat(requestedFile)
        .then((stat) => (stat.isFile() ? requestedFile : null))
        .catch(() => null /* ignore */);
    }

    let requestedFile = path.parse(reqPath);
    let requestedFileExt = requestedFile.ext.toLowerCase();
    let responseFileExt = requestedFileExt;
    let isRoute = !requestedFileExt || requestedFileExt === '.html';

    async function getFileFromUrl(reqPath: string): Promise<FoundFile | null> {
      for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
        let requestedFile: string;
        if (mountEntry.url === '/') {
          requestedFile = path.join(mountKey, reqPath);
        } else if (reqPath.startsWith(mountEntry.url)) {
          requestedFile = path.join(mountKey, reqPath.replace(mountEntry.url, './'));
        } else {
          continue;
        }
        const fileLocExact = await attemptLoadFile(requestedFile);
        if (fileLocExact) {
          return {
            fileLoc: fileLocExact,
            isStatic: mountEntry.static,
            isResolve: mountEntry.resolve,
          };
        }
        if (!mountEntry.static) {
          for (const potentialSourceFile of getInputsFromOutput(requestedFile, config.plugins)) {
            const fileLoc = await attemptLoadFile(potentialSourceFile);
            if (fileLoc) {
              return {fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve};
            }
          }
        }
      }
      return null;
    }

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
          responseFileExt = '.html';
          return {fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve};
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
          responseFileExt = '.html';
          return {fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve};
        }
      }
      return null;
    }

    let foundFile = await getFileFromUrl(reqPath);
    if (!foundFile && isRoute) {
      foundFile =
        (await getFileFromLazyUrl(reqPath)) ||
        // @deprecated: to be removed in v3
        (await getFileFromFallback());
    }

    if (!foundFile) {
      throw new NotFoundError(attemptedFileLoads);
    }

    /**
     * Given a file, build it. Building a file sends it through our internal
     * file builder pipeline, and outputs a build map representing the final
     * build. A Build Map is used because one source file can result in multiple
     * built files (Example: .svelte -> .js & .css).
     */
    async function buildFile(fileLoc: string): Promise<SnowpackBuildMap> {
      const existingBuilderPromise = filesBeingBuilt.get(fileLoc);
      if (existingBuilderPromise) {
        return existingBuilderPromise;
      }
      const fileBuilderPromise = (async () => {
        const builtFileOutput = await _buildFile(url.pathToFileURL(fileLoc), {
          config,
          isDev: true,
          isSSR,
          isHmrEnabled: isHMR,
        });
        inMemoryBuildCache.set(
          getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV}),
          builtFileOutput,
        );
        return builtFileOutput;
      })();
      filesBeingBuilt.set(fileLoc, fileBuilderPromise);
      try {
        messageBus.emit(paintEvent.BUILD_FILE, {id: fileLoc, isBuilding: true});
        return await fileBuilderPromise;
      } finally {
        filesBeingBuilt.delete(fileLoc);
        messageBus.emit(paintEvent.BUILD_FILE, {id: fileLoc, isBuilding: false});
      }
    }

    /**
     * Wrap Response: The same build result can be expressed in different ways
     * based on the URL. For example, "App.css" should return CSS but
     * "App.css.proxy.js" should return a JS representation of that CSS. This is
     * handled in the wrap step.
     */
    async function wrapResponse(
      code: string | Buffer,
      {
        sourceMap,
        sourceMappingURL,
      }: {
        sourceMap?: string;
        sourceMappingURL: string;
      },
    ) {
      // transform special requests
      if (isRoute) {
        code = wrapHtmlResponse({
          code: code as string,
          hmr: isHMR,
          hmrPort: hmrEngine.port !== port ? hmrEngine.port : undefined,
          isDev: true,
          config,
          mode: 'development',
        });
      } else if (isProxyModule) {
        responseFileExt = '.js';
      } else if (isSourceMap && sourceMap) {
        responseFileExt = '.map';
        code = sourceMap;
      }

      // transform other files
      switch (responseFileExt) {
        case '.css': {
          if (sourceMap) code = cssSourceMappingURL(code as string, sourceMappingURL);
          break;
        }
        case '.js': {
          if (isProxyModule) {
            code = await wrapImportProxy({url: reqPath, code, hmr: isHMR, config});
          } else {
            code = wrapImportMeta({code: code as string, env: true, hmr: isHMR, config});
          }

          // source mapping
          if (sourceMap) code = jsSourceMappingURL(code, sourceMappingURL);

          break;
        }
      }

      // by default, return file from disk
      return code;
    }

    /**
     * Resolve Imports: Resolved imports are based on the state of the file
     * system, so they can't be cached long-term with the build.
     */
    async function resolveResponseImports(
      fileLoc: string,
      responseExt: string,
      wrappedResponse: string,
      retryMissing = true,
    ): Promise<string> {
      let missingPackages: string[] = [];
      const resolveImportSpecifier = createImportResolver({
        fileLoc,
        config,
      });
      wrappedResponse = await transformFileImports(
        {
          locOnDisk: fileLoc,
          contents: wrappedResponse,
          root: config.root,
          baseExt: responseExt,
        },
        (spec) => {
          // Try to resolve the specifier to a known URL in the project
          let resolvedImportUrl = resolveImportSpecifier(spec);
          // Handle a package import
          if (!resolvedImportUrl) {
            resolvedImportUrl = pkgSource.resolvePackageImport(spec, sourceImportMap, config);
          }
          // Handle a package import that couldn't be resolved
          if (!resolvedImportUrl) {
            missingPackages.push(spec);
            return spec;
          }
          // Ignore "http://*" imports
          if (isRemoteUrl(resolvedImportUrl)) {
            return resolvedImportUrl;
          }
          // Ignore packages marked as external
          if (config.installOptions.externalPackage?.includes(resolvedImportUrl)) {
            return spec;
          }
          // Handle normal "./" & "../" import specifiers
          const importExtName = path.posix.extname(resolvedImportUrl);
          const isProxyImport =
            importExtName &&
            (responseExt === '.js' || responseExt === '.html') &&
            importExtName !== '.js';
          const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
          if (isProxyImport) {
            resolvedImportUrl = resolvedImportUrl + '.proxy.js';
          }

          // When dealing with an absolute import path, we need to honor the baseUrl
          // proxy modules may attach code to the root HTML (like style) so don't resolve
          if (isAbsoluteUrlPath && !isProxyModule) {
            resolvedImportUrl = relativeURL(path.posix.dirname(reqPath), resolvedImportUrl);
          }
          // Make sure that a relative URL always starts with "./"
          if (!resolvedImportUrl.startsWith('.') && !resolvedImportUrl.startsWith('/')) {
            resolvedImportUrl = './' + resolvedImportUrl;
          }
          return resolvedImportUrl;
        },
      );

      // A missing package is a broken import, so we need to recover instantly if possible.
      if (missingPackages.length > 0) {
        // if retryMissing is true, do a fresh dependency install and then retry.
        // Only retry once, to prevent an infinite loop when a package doesn't actually exist.
        if (retryMissing) {
          try {
            sourceImportMap = await pkgSource.recoverMissingPackageImport(missingPackages);
            return resolveResponseImports(fileLoc, responseExt, wrappedResponse, false);
          } catch (err) {
            const errorTitle = `Dependency Install Error`;
            const errorMessage = err.message;
            logger.error(`${errorTitle}: ${errorMessage}`);
            hmrEngine.broadcastMessage({
              type: 'error',
              title: errorTitle,
              errorMessage,
              fileLoc,
            });
            return wrappedResponse;
          }
        }
        // Otherwise, we need to send an error to the user, telling them about this issue.
        // A failed retry usually means that Snowpack couldn't detect the import that the browser
        // eventually saw post-build. In that case, you need to add it manually.
        const errorTitle = `Error: Import "${missingPackages[0]}" could not be resolved.`;
        const errorMessage = `If this import doesn't exist in the source file, add ${colors.bold(
          `"install": ["${missingPackages[0]}"]`,
        )} to your Snowpack config file.`;
        logger.error(`${errorTitle}\n${errorMessage}`);
        hmrEngine.broadcastMessage({
          type: 'error',
          title: errorTitle,
          errorMessage,
          fileLoc,
        });
      }

      let code = wrappedResponse;
      if (responseFileExt === '.js' && reqUrlHmrParam)
        code = await transformEsmImports(code as string, (imp) => {
          const importUrl = path.posix.resolve(path.posix.dirname(reqPath), imp);
          const node = hmrEngine.getEntry(importUrl);
          if (node && node.needsReplacement) {
            hmrEngine.markEntryForReplacement(node, false);
            return `${imp}?${reqUrlHmrParam}`;
          }
          return imp;
        });

      if (responseFileExt === '.js') {
        const isHmrEnabled = code.includes('import.meta.hot');
        const rawImports = await scanCodeImportsExports(code);
        const resolvedImports = rawImports.map((imp) => {
          let spec = code.substring(imp.s, imp.e);
          if (imp.d > -1) {
            spec = matchDynamicImportValue(spec) || '';
          }
          spec = spec.replace(/\?mtime=[0-9]+$/, '');
          return path.posix.resolve(path.posix.dirname(reqPath), spec);
        });
        hmrEngine.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
      }

      wrappedResponse = code;
      return wrappedResponse;
    }

    /**
     * Given a build, finalize it for the response. This involves running
     * individual steps needed to go from build result to sever response,
     * including:
     *   - wrapResponse(): Wrap responses
     *   - resolveResponseImports(): Resolve all ESM imports
     */
    async function finalizeResponse(
      fileLoc: string,
      requestedFileExt: string,
      output: SnowpackBuildMap,
    ): Promise<string | Buffer | null> {
      // Verify that the requested file exists in the build output map.
      if (!output[requestedFileExt] || !Object.keys(output)) {
        return null;
      }
      const {code, map} = output[requestedFileExt];
      let finalResponse = code;
      // Handle attached CSS.
      if (requestedFileExt === '.js' && output['.css']) {
        finalResponse =
          `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` +
          finalResponse;
      }
      // Resolve imports.
      if (
        requestedFileExt === '.js' ||
        requestedFileExt === '.html' ||
        requestedFileExt === '.css'
      ) {
        finalResponse = await resolveResponseImports(
          fileLoc,
          requestedFileExt,
          finalResponse as string,
        );
      }
      // Wrap the response.
      finalResponse = await wrapResponse(finalResponse, {
        sourceMap: map,
        sourceMappingURL: path.basename(requestedFile.base) + '.map',
      });
      // Return the finalized response.
      return finalResponse;
    }

    const {fileLoc, isStatic: _isStatic, isResolve} = foundFile;
    // Workaround: HMR plugins need to add scripts to HTML file, even if static.
    // TODO: Once plugins are able to add virtual files + imports, this will no longer be needed.
    const isStatic = _isStatic && !hasExtension(fileLoc, '.html');

    // 1. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: SnowpackBuildMap | undefined = inMemoryBuildCache.get(
      getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV}),
    );
    if (hotCachedResponse) {
      let responseContent: string | Buffer | null;
      try {
        responseContent = await finalizeResponse(fileLoc, requestedFileExt, hotCachedResponse);
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
        contentType: mime.lookup(responseFileExt),
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
          contentType: mime.lookup(responseFileExt),
        };
      }
      // Otherwise, finalize the response (where resolution happens) before sending.
      let responseContent: string | Buffer | null;
      try {
        responseContent = await finalizeResponse(fileLoc, requestedFileExt, {
          [requestedFileExt]: {code: fileContents},
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
        contentType: mime.lookup(responseFileExt),
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
        .get(BUILD_CACHE, getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV}))
        .catch(() => null));
    if (cachedBuildData) {
      const {originalFileHash} = cachedBuildData.metadata;
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
          getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV}),
          coldCachedResponse,
        );

        let wrappedResponse: string | Buffer | null;
        try {
          wrappedResponse = await finalizeResponse(fileLoc, requestedFileExt, coldCachedResponse);
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
          contentType: mime.lookup(responseFileExt),
          // ...but verify.
          checkStale: async () => {
            let checkFinalBuildResult: SnowpackBuildMap | null = null;
            try {
              checkFinalBuildResult = await buildFile(fileLoc!);
            } catch (err) {
              // safe to ignore, it will be surfaced later anyway
            } finally {
              if (
                !checkFinalBuildResult ||
                !cachedBuildData.data.equals(Buffer.from(JSON.stringify(checkFinalBuildResult)))
              ) {
                inMemoryBuildCache.clear();
                await cacache.rm.all(BUILD_CACHE);
                hmrEngine.broadcastMessage({type: 'reload'});
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
      responseOutput = await buildFile(fileLoc);
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
      responseContent = await finalizeResponse(fileLoc, requestedFileExt, responseOutput);
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
        getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV}),
        Buffer.from(JSON.stringify(responseOutput)),
        {
          metadata: {originalFileHash: etag(fileContents)},
        },
      )
      .catch((err) => {
        logger.error(`Cache Error: ${err.toString()}`);
      });

    return {
      contents: encodeResponse(responseContent, encoding),
      originalFileLoc: fileLoc,
      contentType: mime.lookup(responseFileExt),
    };
  }

  /**
   * A simple map to optimize the speed of our 304 responses. If an ETag check is
   * sent in the request, check if it matches the last known etag for tat file.
   *
   * Remember: This is just a nice-to-have! If we get this logic wrong, it can mean
   * stale files in the user's cache. Feel free to clear aggressively, as needed.
   */
  const knownETags = new Map<string, string>();

  function matchRoute(reqUrl: string): RouteConfigObject | null {
    let reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const reqExt = path.extname(reqPath);
    const isRoute = !reqExt || reqExt.toLowerCase() === '.html';
    for (const route of config.experiments.routes) {
      if (route.match === 'routes' && !isRoute) {
        continue;
      }
      if (route._srcRegex.test(reqPath)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Fully handle the response for a given request. This is used internally for
   * every response that the dev server sends, but it can also be used via the
   * JS API to handle most boilerplate around request handling.
   */
  async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    {handleError}: {handleError?: boolean} = {},
  ) {
    let reqUrl = req.url!;
    const matchedRoute = matchRoute(reqUrl);
    // If a route is matched, rewrite the URL or call the route function
    if (matchedRoute) {
      if (typeof matchedRoute.dest === 'string') {
        reqUrl = matchedRoute.dest;
      } else {
        return matchedRoute.dest(req, res);
      }
    }
    // Check if we can send back an optimized 304 response
    const quickETagCheck = req.headers['if-none-match'];
    const quickETagCheckUrl = reqUrl.replace(/\/$/, '/index.html');
    if (quickETagCheck && quickETagCheck === knownETags.get(quickETagCheckUrl)) {
      logger.debug(`optimized etag! sending 304...`);
      res.writeHead(304, {'Access-Control-Allow-Origin': '*'});
      res.end();
      return;
    }
    // Otherwise, load the file and respond if successful.
    try {
      const result = await loadUrl(reqUrl, {allowStale: true, encoding: null});
      sendResponseFile(req, res, result);
      if (result.checkStale) {
        await result.checkStale();
      }
      if (result.contents) {
        const tag = etag(result.contents, {weak: true});
        const reqPath = decodeURI(url.parse(reqUrl).pathname!);
        knownETags.set(reqPath, tag);
      }
      return;
    } catch (err) {
      // Some consumers may want to handle/ignore errors themselves.
      if (handleError === false) {
        throw err;
      }
      handleResponseError(req, res, err);
    }
  }

  type Http2RequestListener = (
    request: http2.Http2ServerRequest,
    response: http2.Http2ServerResponse,
  ) => void;
  const createServer = (responseHandler: http.RequestListener | Http2RequestListener) => {
    if (credentials) {
      return http2.createSecureServer(
        {...credentials!, allowHTTP1: true},
        responseHandler as Http2RequestListener,
      );
    } else if (credentials) {
      return https.createServer(credentials, responseHandler as http.RequestListener);
    }

    return http.createServer(responseHandler as http.RequestListener);
  };

  const server = createServer(async (req, res) => {
    // Attach a request logger.
    res.on('finish', () => {
      const {method, url} = req;
      const {statusCode} = res;
      logger.debug(`[${statusCode}] ${method} ${url}`);
    });
    // Otherwise, pass requests directly to Snowpack's request handler.
    handleRequest(req, res);
  })
    .on('error', (err: Error) => {
      logger.error(colors.red(`  ✘ Failed to start server at port ${colors.bold(port)}.`), err);
      server.close();
      process.exit(1);
    })
    .listen(port);

  const {hmrDelay} = config.devOptions;
  const hmrEngineOptions = Object.assign(
    {delay: hmrDelay},
    config.devOptions.hmrPort ? {port: config.devOptions.hmrPort} : {server, port},
  );
  const hmrEngine = new EsmHmrEngine(hmrEngineOptions);
  onProcessExit(() => {
    hmrEngine.disconnectAllClients();
  });

  // Live Reload + File System Watching
  let isLiveReloadPaused = false;

  function updateOrBubble(url: string, visited: Set<string>) {
    if (visited.has(url)) {
      return;
    }
    const node = hmrEngine.getEntry(url);
    const isBubbled = visited.size > 0;
    if (node && node.isHmrEnabled) {
      hmrEngine.broadcastMessage({type: 'update', url, bubbled: isBubbled});
    }
    visited.add(url);
    if (node && node.isHmrAccepted) {
      // Found a boundary, no bubbling needed
    } else if (node && node.dependents.size > 0) {
      node.dependents.forEach((dep) => {
        hmrEngine.markEntryForReplacement(node, true);
        updateOrBubble(dep, visited);
      });
    } else {
      // We've reached the top, trigger a full page refresh
      hmrEngine.broadcastMessage({type: 'reload'});
    }
  }
  function handleHmrUpdate(fileLoc: string, originalUrl: string) {
    if (isLiveReloadPaused) {
      return;
    }

    // CSS files may be loaded directly in the client (not via JS import / .proxy.js)
    // so send an "update" event to live update if thats the case.
    if (hasExtension(originalUrl, '.css') && !hasExtension(originalUrl, '.module.css')) {
      hmrEngine.broadcastMessage({type: 'update', url: originalUrl, bubbled: false});
    }

    // Append ".proxy.js" to Non-JS files to match their registered URL in the
    // client app.
    let updatedUrl = originalUrl;
    if (!hasExtension(updatedUrl, '.js')) {
      updatedUrl += '.proxy.js';
    }

    // Check if a virtual file exists in the resource cache (ex: CSS from a
    // Svelte file) If it does, mark it for HMR replacement but DONT trigger a
    // separate HMR update event. This is because a virtual resource doesn't
    // actually exist on disk, so we need the main resource (the JS) to load
    // first. Only after that happens will the CSS exist.
    const virtualCssFileUrl = updatedUrl.replace(/.js$/, '.css');
    const virtualNode = hmrEngine.getEntry(`${virtualCssFileUrl}.proxy.js`);
    if (virtualNode) {
      hmrEngine.markEntryForReplacement(virtualNode, true);
    }

    // If the changed file exists on the page, trigger a new HMR update.
    if (hmrEngine.getEntry(updatedUrl)) {
      updateOrBubble(updatedUrl, new Set());
      return;
    }

    // Otherwise, reload the page if the file exists in our hot cache (which
    // means that the file likely exists on the current page, but is not
    // supported by HMR (HTML, image, etc)).
    if (inMemoryBuildCache.has(getCacheKey(fileLoc, {isSSR: false, env: process.env.NODE_ENV}))) {
      hmrEngine.broadcastMessage({type: 'reload'});
      return;
    }
  }

  // Announce server has started
  const remoteIps = Object.values(os.networkInterfaces())
    .reduce((every: os.NetworkInterfaceInfo[], i) => [...every, ...(i || [])], [])
    .filter((i) => i.family === 'IPv4' && i.internal === false)
    .map((i) => i.address);
  const protocol = config.devOptions.secure ? 'https:' : 'http:';
  messageBus.emit(paintEvent.SERVER_START, {
    protocol,
    hostname,
    port,
    remoteIp: remoteIps[0],
    startTimeMs: Math.round(performance.now() - serverStart),
  });

  // Open the user's browser (ignore if failed)
  if (open !== 'none') {
    await openInBrowser(protocol, hostname, port, open).catch((err) => {
      logger.debug(`Browser open error: ${err}`);
    });
  }

  // Start watching the file system.
  // Defer "chokidar" loading to here, to reduce impact on overall startup time
  const chokidar = await import('chokidar');

  // Allow the user to hook into this callback, if they like (noop by default)
  let onFileChangeCallback: OnFileChangeCallback = () => {};

  // Watch src files
  async function onWatchEvent(fileLoc: string) {
    logger.info(colors.cyan('File changed...'));
    onFileChangeCallback({filePath: fileLoc});
    const updatedUrl = getUrlForFile(fileLoc, config);
    if (updatedUrl) {
      handleHmrUpdate(fileLoc, updatedUrl);
      knownETags.delete(updatedUrl);
      knownETags.delete(updatedUrl + '.proxy.js');
    }
    inMemoryBuildCache.delete(getCacheKey(fileLoc, {isSSR: true, env: process.env.NODE_ENV}));
    inMemoryBuildCache.delete(getCacheKey(fileLoc, {isSSR: false, env: process.env.NODE_ENV}));
    filesBeingDeleted.add(fileLoc);
    await cacache.rm.entry(
      BUILD_CACHE,
      getCacheKey(fileLoc, {isSSR: true, env: process.env.NODE_ENV}),
    );
    await cacache.rm.entry(
      BUILD_CACHE,
      getCacheKey(fileLoc, {isSSR: false, env: process.env.NODE_ENV}),
    );
    for (const plugin of config.plugins) {
      plugin.onChange && plugin.onChange({filePath: fileLoc});
    }
    filesBeingDeleted.delete(fileLoc);
  }

  const watcher = chokidar.watch(Object.keys(config.mount), {
    ignored: config.exclude,
    persistent: true,
    ignoreInitial: true,
    disableGlobbing: false,
    useFsEvents: isFsEventsEnabled(),
  });
  watcher.on('add', (fileLoc) => {
    knownETags.clear();
    onWatchEvent(fileLoc);
  });
  watcher.on('unlink', (fileLoc) => {
    knownETags.clear();
    onWatchEvent(fileLoc);
  });
  watcher.on('change', (fileLoc) => {
    onWatchEvent(fileLoc);
  });

  // Watch node_modules & rerun snowpack install if symlinked dep updates
  const symlinkedFileLocs = new Set(
    Object.keys(sourceImportMap.imports)
      .map((specifier) => {
        const [packageName] = parsePackageImportSpecifier(specifier);
        return resolveDependencyManifest(packageName, config.root);
      }) // resolve symlink src location
      .filter(([_, packageManifest]) => packageManifest && !packageManifest['_id']) // only watch symlinked deps for now
      .map(([fileLoc]) => `${path.dirname(fileLoc!)}/**`),
  );
  function onDepWatchEvent() {
    hmrEngine.broadcastMessage({type: 'reload'});
  }
  const depWatcher = chokidar.watch([...symlinkedFileLocs], {
    cwd: '/', // we’re using absolute paths, so watch from root
    persistent: true,
    ignoreInitial: true,
    disableGlobbing: false,
    useFsEvents: isFsEventsEnabled(),
  });
  depWatcher.on('add', onDepWatchEvent);
  depWatcher.on('change', onDepWatchEvent);
  depWatcher.on('unlink', onDepWatchEvent);

  return {
    port,
    loadUrl,
    handleRequest,
    sendResponseFile,
    sendResponseError,
    onFileChange: (callback) => (onFileChangeCallback = callback),
    async shutdown() {
      await watcher.close();
      server.close();
    },
  };
}

export async function command(commandOptions: CommandOptions) {
  try {
    await startDevServer(commandOptions);
  } catch (err) {
    logger.error(err.message);
    logger.debug(err.stack);
    process.exit(1);
  }
  return new Promise(() => {});
}

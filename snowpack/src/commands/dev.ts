import {FSWatcher} from 'chokidar';
import isCompressible from 'compressible';
import {InstallTarget} from 'esinstall';
import etag from 'etag';
import {EventEmitter} from 'events';
import {createReadStream, promises as fs, statSync} from 'fs';
import {glob} from 'glob';
import http from 'http';
import http2 from 'http2';
import * as colors from 'kleur/colors';
import mime from 'mime-types';
import os from 'os';
import path from 'path';
import {performance} from 'perf_hooks';
import slash from 'slash';
import stream from 'stream';
import url from 'url';
import zlib from 'zlib';
import {generateEnvModule, getMetaUrlPath, wrapImportProxy} from '../build/build-import-proxy';
import {FileBuilder} from '../build/file-builder';
import {getBuiltFileUrls, getMountEntryForFile, getUrlsForFile} from '../build/file-urls';
import {startHmrEngine} from '../dev/hmr';
import {logger} from '../logger';
import {getPackageSource} from '../sources/util';
import {createLoader as createServerRuntime} from '../ssr-loader';
import {
  CommandOptions,
  LoadResult,
  LoadUrlOptions,
  OnFileChangeCallback,
  RouteConfigObject,
  ServerRuntime,
  SnowpackDevServer,
} from '../types';
import {
  getCacheKey,
  HMR_CLIENT_CODE,
  HMR_OVERLAY_CODE,
  isFsEventsEnabled,
  openInBrowser,
} from '../util';
import {getPort, startDashboard, paintEvent} from './paint';
export class OneToManyMap {
  readonly keyToValue = new Map<string, string[]>();
  readonly valueToKey = new Map<string, string>();
  add(key: string, _value: string | string[]) {
    const value = Array.isArray(_value) ? _value : [_value];
    this.keyToValue.set(key, value);
    for (const val of value) {
      this.valueToKey.set(val, key);
    }
  }
  delete(key: string) {
    const value = this.value(key);
    this.keyToValue.delete(key);
    if (value) {
      for (const val of value) {
        this.keyToValue.delete(val);
      }
    }
  }
  key(value: string) {
    return this.valueToKey.get(value);
  }
  value(key: string) {
    return this.keyToValue.get(key);
  }
}

interface FoundFile {
  loc: string;
  type: string;
  // contents: Buffer;
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

/**
 * A helper class for "Not Found" errors, storing data about what file lookups were attempted.
 */
class NotFoundError extends Error {
  constructor(url: string, lookups?: string[]) {
    if (!lookups) {
      super(`Not Found (${url})`);
    } else {
      super(`Not Found (${url}):\n${lookups.map((loc) => '  ✘ ' + loc).join('\n')}`);
    }
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
    if (req.url !== '/favicon.ico') {
      logger.error(`[404] ${err.message}`);
    }
    sendResponseError(req, res, 404);
    return;
  }
  console.log(err);
  logger.error(err.toString());
  logger.error(`[500] ${req.url}`, {
    // @ts-ignore
    name: err.__snowpackBuildDetails?.name,
  });
  sendResponseError(req, res, 500);
  return;
}

function getServerRuntime(
  sp: SnowpackDevServer,
  options: {invalidateOnChange?: boolean} = {},
): ServerRuntime {
  const runtime = createServerRuntime({
    load: (url) => sp.loadUrl(url, {isSSR: true, allowStale: false, encoding: 'utf8'}),
  });
  if (options.invalidateOnChange !== false) {
    sp.onFileChange(({filePath}) => {
      const url = sp.getUrlForFile(filePath);
      if (url) {
        runtime.invalidateModule(url);
      }
    });
  }
  return runtime;
}

export async function startServer(
  commandOptions: CommandOptions,
  {isDev}: {isDev: boolean} = {isDev: true},
): Promise<SnowpackDevServer> {
  const {config} = commandOptions;
  // Start the startup timer!
  let serverStart = performance.now();

  const {port: defaultPort, hostname, open} = config.devOptions;
  const messageBus = new EventEmitter();
  const pkgSource = getPackageSource(config.packageOptions.source);
  const PACKAGE_PATH_PREFIX = path.posix.join(config.buildOptions.metaUrlPath, 'pkg/');
  const PACKAGE_LINK_PATH_PREFIX = path.posix.join(config.buildOptions.metaUrlPath, 'link/');
  let port: number | undefined;
  if (defaultPort !== 0) {
    port = await getPort(defaultPort);
    // Reset the clock if we had to wait for the user prompt to select a new port.
    if (port !== defaultPort) {
      serverStart = performance.now();
    }
  }

  // Fill in any command-specific plugin methods.
  for (const p of config.plugins) {
    p.markChanged = (fileLoc) => {
      knownETags.clear();
      onWatchEvent(fileLoc);
    };
  }

  messageBus.on(paintEvent.SERVER_START, (info) => {
    logger.info(`Server ready in ${info.startTimeMs}ms.`);
    logger.info(`${colors.bold('Local:')} ${`${info.protocol}//${hostname}:${port}`}`);
    if (info.remoteIp) {
      logger.info(`${colors.bold('Network:')} ${`${info.protocol}//${info.remoteIp}:${port}`}`);
    }
  });

  if (config.devOptions.output === 'dashboard') {
    startDashboard(messageBus, config);
  } else {
    // "stream": Log relevent events to the console.
    messageBus.on(paintEvent.WORKER_MSG, ({id, msg}) => {
      logger.info(msg.trim(), {name: id});
    });
  }

  const symlinkDirectories = new Set();
  const inMemoryBuildCache = new Map<string, FileBuilder>();
  let fileToUrlMapping = new OneToManyMap();

  for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
    logger.debug(`Mounting directory: '${mountKey}' as URL '${mountEntry.url}'`);
    const files = glob.sync(path.join(mountKey, '**'), {
      absolute: true,
      nodir: true,
      ignore: [
        ...config.exclude,
        ...(process.env.NODE_ENV === 'test' ? [] : config.testOptions.files),
      ],
    });
    for (const f of files) {
      const normalizedFileLoc = path.normalize(f);
      fileToUrlMapping.add(normalizedFileLoc, getUrlsForFile(normalizedFileLoc, config)!);
    }
  }

  logger.debug(`Using in-memory cache: ${fileToUrlMapping}`);

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
      logger.debug(`starting ${runPlugin.name} run() workers`);
      runPlugin
        .run({
          isDev,
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
    opt?: (LoadUrlOptions & {encoding?: undefined}) | undefined,
  ): Promise<LoadResult<Buffer | string>>;
  function loadUrl(
    reqUrl: string,
    opt: LoadUrlOptions & {encoding: BufferEncoding},
  ): Promise<LoadResult<string>>;
  function loadUrl(
    reqUrl: string,
    opt: LoadUrlOptions & {encoding: null},
  ): Promise<LoadResult<Buffer>>;
  async function loadUrl(
    reqUrl: string,
    {
      isSSR: _isSSR,
      isHMR: _isHMR,
      isResolve: _isResolve,
      encoding: _encoding,
      importMap,
    }: LoadUrlOptions = {},
  ): Promise<LoadResult> {
    const isSSR = _isSSR ?? false;
    //   // Default to HMR on, but disable HMR if SSR mode is enabled.
    const isHMR = _isHMR ?? (!!config.devOptions.hmr && !isSSR);
    const encoding = _encoding ?? null;
    const reqUrlHmrParam = reqUrl.includes('?mtime=') && reqUrl.split('?')[1];
    const reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const resourcePath = reqPath.replace(/\.map$/, '').replace(/\.proxy\.js$/, '');
    const resourceType = path.extname(resourcePath) || '.html';

    if (reqPath === getMetaUrlPath('/hmr-client.js', config)) {
      return {
        contents: encodeResponse(HMR_CLIENT_CODE, encoding),
        imports: [],
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }
    if (reqPath === getMetaUrlPath('/hmr-error-overlay.js', config)) {
      return {
        contents: encodeResponse(HMR_OVERLAY_CODE, encoding),
        imports: [],
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }
    if (reqPath === getMetaUrlPath('/env.js', config)) {
      return {
        contents: encodeResponse(generateEnvModule({mode: 'development', isSSR}), encoding),
        imports: [],
        originalFileLoc: null,
        contentType: 'application/javascript',
      };
    }
    // * NPM Packages:
    // NPM packages are served via `/_snowpack/pkg/` URLs. Behavior varies based on package source (local, remote)
    // but as a general rule all URLs contained within are managed by the package source loader. When this URL
    // prefix is hit, we load the file through the selected package source loader.
    if (reqPath.startsWith(PACKAGE_PATH_PREFIX)) {
      const webModuleUrl = resourcePath.substr(PACKAGE_PATH_PREFIX.length);
      let loadedModule = await pkgSource.load(webModuleUrl, isSSR, commandOptions);
      if (!loadedModule) {
        throw new NotFoundError(reqPath);
      }
      if (reqPath.endsWith('.proxy.js')) {
        return {
          imports: [],
          contents: await wrapImportProxy({
            url: resourcePath,
            code: loadedModule.contents,
            hmr: isHMR,
            config: config,
          }),
          originalFileLoc: null,
          contentType: 'application/javascript',
        };
      }
      return {
        imports: loadedModule.imports,
        contents: encodeResponse(loadedModule.contents, encoding),
        originalFileLoc: null,
        contentType: mime.lookup(reqPath) || 'application/javascript',
      };
    }

    let foundFile: FoundFile;

    // * Workspaces & Linked Packages:
    // The "local" package resolver supports npm packages that live in a local directory, usually a part of your monorepo/workspace.
    // Snowpack treats these files as source files, with each file served individually and rebuilt instantly when changed.
    // In the future, these linked packages may be bundled again with a rapid bundler like esbuild.
    if (reqPath.startsWith(PACKAGE_LINK_PATH_PREFIX)) {
      const symlinkResourceUrl = reqPath.substr(PACKAGE_LINK_PATH_PREFIX.length);
      const symlinkResourceLoc = path.resolve(
        config.workspaceRoot!,
        process.platform === 'win32' ? symlinkResourceUrl.replace(/\//g, '\\') : symlinkResourceUrl,
      );
      const symlinkResourceDirectory = path.dirname(symlinkResourceLoc);
      const fileStat = await fs.stat(symlinkResourceDirectory).catch(() => null);
      if (!fileStat) {
        throw new NotFoundError(reqPath, [symlinkResourceDirectory]);
      }
      // If this is the first file served out of this linked directory, add it to our file watcher
      // (to enable HMR) PLUS add it to our file<>URL mapping for future lookups. Each directory
      // is scanned shallowly, so nested directories inside of `symlinkDirectories` are okay.
      if (!symlinkDirectories.has(symlinkResourceDirectory)) {
        symlinkDirectories.add(symlinkResourceDirectory);
        watcher && watcher.add(symlinkResourceDirectory);
        logger.debug(
          `Mounting symlink directory: '${symlinkResourceDirectory}' as URL '${path.dirname(
            reqPath,
          )}'`,
        );
        for (const f of glob.sync(path.join(symlinkResourceDirectory, '*'), {
          nodir: true,
          absolute: true,
        })) {
          const normalizedFileLoc = path.normalize(f);
          fileToUrlMapping.add(
            normalizedFileLoc,
            getBuiltFileUrls(normalizedFileLoc, config).map((u) =>
              path.posix.join(
                config.buildOptions.metaUrlPath,
                'link',
                slash(path.relative(config.workspaceRoot!, u)),
              ),
            ),
          );
        }
      }
      const fileLocation = fileToUrlMapping.key(reqPath);
      if (!fileLocation) {
        throw new NotFoundError(reqPath);
      }
      const fileLocationExists = await fs.stat(fileLocation).catch(() => null);
      if (!fileLocationExists) {
        throw new NotFoundError(reqPath, [fileLocation]);
      }
      foundFile = {
        loc: fileLocation,
        type: path.extname(reqPath),
        isStatic: false,
        isResolve: true,
      };
    }
    // * Local Files
    // If this is not a special URL route, then treat it as a normal file request.
    // Check our file<>URL mapping for the most relevant match, and continue if found.
    // Otherwise, return a 404.
    else {
      const attemptedFileLoc =
        fileToUrlMapping.key(resourcePath) ||
        fileToUrlMapping.key(resourcePath + '.html') ||
        fileToUrlMapping.key(resourcePath + 'index.html') ||
        fileToUrlMapping.key(resourcePath + '/index.html');
      if (!attemptedFileLoc) {
        throw new NotFoundError(reqPath, [resourcePath]);
      }

      const [, mountEntry] = getMountEntryForFile(attemptedFileLoc, config)!;

      // TODO: This data type structuring/destructuring is neccesary for now,
      // but we hope to add "virtual file" support soon via plugins. This would
      // be the interface for those response types.
      foundFile = {
        loc: attemptedFileLoc,
        type: path.extname(reqPath) || '.html',
        isStatic: mountEntry.static,
        isResolve: mountEntry.resolve,
      };
    }

    const {loc: fileLoc, type: responseType} = foundFile;

    // TODO: Once plugins are able to add virtual files + imports, this will no longer be needed.
    // - isStatic Workaround: HMR plugins need to add scripts to HTML file, even if static.
    const isStatic = foundFile.isStatic && responseType !== '.html';
    const isResolve = _isResolve ?? true;

    // 1. Check the hot build cache. If it's already found, then just serve it.
    const cacheKey = getCacheKey(fileLoc, {isSSR, env: process.env.NODE_ENV});
    let fileBuilder: FileBuilder | undefined = inMemoryBuildCache.get(cacheKey);
    if (!fileBuilder) {
      fileBuilder = new FileBuilder({
        loc: fileLoc,
        isDev,
        isSSR,
        isHMR,
        config,
        hmrEngine,
      });
      inMemoryBuildCache.set(cacheKey, fileBuilder);
    }

    function handleFinalizeError(err: Error) {
      logger.error(FILE_BUILD_RESULT_ERROR);
      hmrEngine &&
        hmrEngine.broadcastMessage({
          type: 'error',
          title: FILE_BUILD_RESULT_ERROR,
          errorMessage: err.toString(),
          fileLoc,
          errorStackTrace: err.stack,
        });
    }

    let finalizedResponse: string | Buffer | undefined;
    let resolvedImports: InstallTarget[] = [];
    try {
      if (Object.keys(fileBuilder.buildOutput).length === 0) {
        await fileBuilder.build(isStatic);
      }
      if (reqPath.endsWith('.proxy.js')) {
        finalizedResponse = await fileBuilder.getProxy(resourcePath, resourceType);
      } else if (reqPath.endsWith('.map')) {
        finalizedResponse = fileBuilder.getSourceMap(resourcePath);
      } else {
        if (foundFile.isResolve) {
          // TODO: Warn if reqUrlHmrParam was needed here? HMR can't work if URLs aren't resolved.
          resolvedImports = await fileBuilder.resolveImports(isResolve, reqUrlHmrParam, importMap);
        }
        finalizedResponse = fileBuilder.getResult(resourceType);
      }
    } catch (err) {
      handleFinalizeError(err);
      throw err;
    }
    if (finalizedResponse === undefined) {
      throw new NotFoundError(reqPath);
    }

    return {
      imports: resolvedImports,
      contents: encodeResponse(finalizedResponse, encoding),
      originalFileLoc: fileLoc,
      contentType: mime.lookup(responseType),
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
    if (reqUrl.startsWith(config.buildOptions.metaUrlPath)) {
      return null;
    }
    const reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const reqExt = path.extname(reqPath);
    const isRoute = !reqExt || reqExt.toLowerCase() === '.html';
    for (const route of config.routes) {
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
    }

    return http.createServer(responseHandler as http.RequestListener);
  };

  let server: ReturnType<typeof createServer> | undefined;
  if (port) {
    server = createServer(async (req, res) => {
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
        logger.error(colors.red(`  ✘ Failed to start server at port ${colors.bold(port!)}.`), err);
        server!.close();
        process.exit(1);
      })
      .listen(port);

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
  }

  // HMR Engine
  const {hmrEngine, handleHmrUpdate} = config.devOptions.hmr
    ? startHmrEngine(inMemoryBuildCache, server, config)
    : {hmrEngine: undefined, handleHmrUpdate: undefined};

  // Allow the user to hook into this callback, if they like (noop by default)
  let onFileChangeCallback: OnFileChangeCallback = () => {};
  let watcher: FSWatcher | undefined;

  // Watch src files
  async function onWatchEvent(fileLoc: string) {
    logger.info(
      colors.cyan('File changed... ') +
        colors.dim(path.relative(config.workspaceRoot || config.root, fileLoc)),
    );
    await onFileChangeCallback({filePath: fileLoc});
    const updatedUrls = getUrlsForFile(fileLoc, config);
    if (updatedUrls) {
      handleHmrUpdate && handleHmrUpdate(fileLoc, updatedUrls[0]);
      knownETags.delete(updatedUrls[0]);
      knownETags.delete(updatedUrls[0] + '.proxy.js');
    }
    inMemoryBuildCache.delete(getCacheKey(fileLoc, {isSSR: true, env: process.env.NODE_ENV}));
    inMemoryBuildCache.delete(getCacheKey(fileLoc, {isSSR: false, env: process.env.NODE_ENV}));
    for (const plugin of config.plugins) {
      plugin.onChange && plugin.onChange({filePath: fileLoc});
    }
  }

  if (config.buildOptions.watch) {
    // Start watching the file system.
    // Defer "chokidar" loading to here, to reduce impact on overall startup time
    const chokidar = await import('chokidar');
    watcher = chokidar.watch(Object.keys(config.mount), {
      ignored: config.exclude,
      persistent: true,
      ignoreInitial: true,
      disableGlobbing: false,
      useFsEvents: isFsEventsEnabled(),
    });
    watcher.on('add', (fileLoc) => {
      knownETags.clear();
      onWatchEvent(fileLoc);
      fileToUrlMapping.add(fileLoc, getUrlsForFile(fileLoc, config)!);
    });
    watcher.on('unlink', (fileLoc) => {
      knownETags.clear();
      onWatchEvent(fileLoc);
      fileToUrlMapping.delete(fileLoc);
    });
    watcher.on('change', (fileLoc) => {
      onWatchEvent(fileLoc);
    });
  }

  // Open the user's browser (ignore if failed)
  if (server && port && open && open !== 'none') {
    const protocol = config.devOptions.secure ? 'https:' : 'http:';
    await openInBrowser(protocol, hostname, port, open).catch((err) => {
      logger.debug(`Browser open error: ${err}`);
    });
  }

  const sp = {
    port,
    hmrEngine,
    loadUrl,
    handleRequest,
    sendResponseFile,
    sendResponseError,
    getUrlForFile: (fileLoc: string) => {
      const result = getUrlsForFile(fileLoc, config);
      return result ? result[0] : result;
    },
    onFileChange: (callback) => (onFileChangeCallback = callback),
    getServerRuntime: (options) => getServerRuntime(sp, options),
    async shutdown() {
      watcher && (await watcher.close());
      server && server.close();
    },
  } as SnowpackDevServer;
  return sp;
}

export async function command(commandOptions: CommandOptions) {
  try {
    // Set some CLI-focused defaults
    commandOptions.config.devOptions.output =
      commandOptions.config.devOptions.output || 'dashboard';
    commandOptions.config.devOptions.open = commandOptions.config.devOptions.open || 'default';
    commandOptions.config.buildOptions.watch = true;
    commandOptions.config.devOptions.hmr = true;
    // Start the server
    const pkgSource = getPackageSource(commandOptions.config.packageOptions.source);
    await pkgSource.prepare(commandOptions);
    await startServer(commandOptions);
    if (commandOptions.config.devOptions.output !== 'dashboard') {
      logger.info(colors.cyan('watching for file changes...'));
    }
  } catch (err) {
    logger.error(err.message);
    logger.debug(err.stack);
    process.exit(1);
  }
  return new Promise(() => {});
}

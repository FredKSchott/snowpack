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
import {getUrlForFile} from '../build/file-urls';
import {EsmHmrEngine} from '../hmr-server-engine';
import {logger} from '../logger';
import {
  CommandOptions,
  LoadResult,
  OnFileChangeCallback,
  RouteConfigObject,
  SnowpackBuildMap,
  SnowpackDevServer,
} from '../types';
import {
  BUILD_CACHE,
  getPackageSource,
  hasExtension,
  isFsEventsEnabled,
  openInBrowser,
  parsePackageImportSpecifier,
  resolveDependencyManifest,
} from '../util';
import {getPort, getServerInfoMessage, paintDashboard, paintEvent} from './paint';

import {NotFoundError, UrlLoader} from './dev/url-loader';
import {SourceImportMap} from './dev/source-import-map';

function getCacheKey(fileLoc: string, {isSSR, env}) {
  return `${fileLoc}?env=${env}&isSSR=${isSSR ? '1' : '0'}`;
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

  logger.debug(`Using in-memory cache.`);
  logger.debug(`Mounting directories:`, {
    task: () => {
      for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
        logger.debug(` -> '${mountKey}' as URL '${mountEntry.url}'`);
      }
    },
  });

  const sourceImportMap = new SourceImportMap(pkgSource, commandOptions);
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
      const result = await urlLoader.loadUrl(reqUrl, {allowStale: true, encoding: null});
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

  const urlLoader = new UrlLoader({
    config,
    hmrEngine,
    inMemoryBuildCache,
    getCacheKey,
    messageBus,
    pkgSource,
  }, {
    commandOptions,
    filesBeingDeleted,
  },
  sourceImportMap,
  port,
  );

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
    (await sourceImportMap.getImportKeys())
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
    loadUrl: urlLoader.loadUrl.bind(urlLoader),
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

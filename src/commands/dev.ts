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
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
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
import merge from 'deepmerge';
import {EventEmitter} from 'events';
import execa from 'execa';
import {existsSync, promises as fs, readFileSync} from 'fs';
import http from 'http';
import https from 'https';
import HttpProxy from 'http-proxy';
import http2 from 'http2';
import * as colors from 'kleur/colors';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import os from 'os';
import path from 'path';
import onProcessExit from 'signal-exit';
import stream from 'stream';
import url from 'url';
import zlib from 'zlib';
import {SnowpackBuildMap} from '../config';
import {EsmHmrEngine} from '../hmr-server-engine';
import {
  BUILD_CACHE,
  checkLockfileHash,
  CommandOptions,
  DEV_DEPENDENCIES_DIR,
  ImportMap,
  isYarn,
  openInBrowser,
  resolveDependencyManifest,
  updateLockfileHash,
  getExt,
  parsePackageImportSpecifier,
} from '../util';
import {generateEnvModule, buildFile} from './build-util';
import {command as installCommand} from './install';
import {fileToURLs, urlToFile} from './import-resolver';
import {getPort, paint} from './paint';
const HMR_DEV_CODE = readFileSync(path.join(__dirname, '../assets/hmr.js'));

const DEFAULT_PROXY_ERROR_HANDLER = (
  err: Error,
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => {
  const reqUrl = req.url!;
  console.error(`✘ ${reqUrl}\n${err.message}`);
  sendError(res, 502);
};

function shouldProxy(pathPrefix: string, req: http.IncomingMessage) {
  const reqPath = decodeURI(url.parse(req.url!).pathname!);
  return reqPath.startsWith(pathPrefix);
}

function getEncodingType(ext: string): 'utf-8' | 'binary' {
  const UTF8_FORMATS = ['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml'];
  return UTF8_FORMATS.includes(ext) ? 'utf-8' : 'binary';
}

const sendFile = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string | Buffer,
  ext = '.html',
) => {
  const ETag = etag(body, {weak: true});
  const contentType = mime.contentType(ext);
  const headers: Record<string, string> = {
    'Content-Type': contentType || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
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

  function onError(err) {
    if (err) {
      res.end();
      console.error(
        colors.red(`  ✘ An error occurred while compressing ${colors.bold(req.url)}`),
        err,
      );
    }
  }

  if (/\bgzip\b/.test(acceptEncoding) && stream.Readable.from) {
    const bodyStream = stream.Readable.from([body]);
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    stream.pipeline(bodyStream, zlib.createGzip(), res, onError);
    return;
  }

  res.writeHead(200, headers);
  res.write(body, getEncodingType(ext));
  res.end();
};

const sendError = (res, status) => {
  res.writeHead(status);
  res.end();
};

let currentlyRunningCommand: any = null;

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  const {port: defaultPort, open} = config.devOptions;
  let serverStart = Date.now();
  const port = await getPort(defaultPort);
  // Reset the clock if we had to wait for the user to select a new port.
  if (port !== defaultPort) {
    serverStart = Date.now();
  }

  const inMemoryBuildCache = new Map<string, Buffer>();
  const inMemoryResourceCache = new Map<string, string>();
  const filesBeingDeleted = new Set<string>();
  const messageBus = new EventEmitter();

  console.log = (...args) => {
    messageBus.emit('CONSOLE', {level: 'log', args});
  };
  console.warn = (...args) => {
    messageBus.emit('CONSOLE', {level: 'warn', args});
  };
  console.error = (...args) => {
    messageBus.emit('CONSOLE', {level: 'error', args});
  };

  // Start painting immediately, so we can surface errors & warnings to the
  // user, and they can watch the server starting up. Search for ”SERVER_START”
  // for the actual start event below.
  paint(messageBus, Object.keys(config.scripts), undefined, {
    addPackage: async (pkgName: string) => {
      isLiveReloadPaused = true;
      messageBus.emit('INSTALLING');
      currentlyRunningCommand = execa(
        isYarn(cwd) ? 'yarn' : 'npm',
        isYarn(cwd) ? ['add', pkgName] : ['install', '--save', pkgName],
        {
          env: npmRunPath.env(),
          extendEnv: true,
          shell: true,
          cwd,
        },
      );
      currentlyRunningCommand.stdout.on('data', (data) => process.stdout.write(data));
      currentlyRunningCommand.stderr.on('data', (data) => process.stderr.write(data));
      await currentlyRunningCommand;
      currentlyRunningCommand = installCommand(installCommandOptions);
      await currentlyRunningCommand;
      await updateLockfileHash(DEV_DEPENDENCIES_DIR);
      await cacache.rm.all(BUILD_CACHE);
      inMemoryBuildCache.clear();
      currentlyRunningCommand = null;

      dependencyImportMap = JSON.parse(
        await fs
          .readFile(dependencyImportMapLoc, {encoding: 'utf-8'})
          .catch(() => `{"imports": {}}`),
      );
      messageBus.emit('INSTALL_COMPLETE');
      isLiveReloadPaused = false;
    },
  });

  // Set the proper install options, in case an install is needed.
  const dependencyImportMapLoc = path.join(DEV_DEPENDENCIES_DIR, 'import-map.json');
  const installCommandOptions = merge(commandOptions, {
    config: {
      installOptions: {
        dest: DEV_DEPENDENCIES_DIR,
        env: {NODE_ENV: process.env.NODE_ENV || 'development'},
        treeshake: false,
      },
    },
  });

  // Start with a fresh install of your dependencies, if needed.
  if (!(await checkLockfileHash(DEV_DEPENDENCIES_DIR)) || !existsSync(dependencyImportMapLoc)) {
    console.log(colors.yellow('! updating dependencies...'));
    await installCommand(installCommandOptions);
    await updateLockfileHash(DEV_DEPENDENCIES_DIR);
  }

  let dependencyImportMap: ImportMap = {imports: {}};
  try {
    dependencyImportMap = JSON.parse(
      await fs.readFile(dependencyImportMapLoc, {encoding: 'utf-8'}),
    );
  } catch (err) {
    // no import-map found, safe to ignore
  }

  /** Rerun `snowpack install` while dev server is running */
  async function reinstallDependencies() {
    if (!currentlyRunningCommand) {
      isLiveReloadPaused = true;
      messageBus.emit('INSTALLING');
      currentlyRunningCommand = installCommand(installCommandOptions);
      await currentlyRunningCommand.then(async () => {
        dependencyImportMap = JSON.parse(
          await fs
            .readFile(dependencyImportMapLoc, {encoding: 'utf-8'})
            .catch(() => `{"imports": {}}`),
        );
        await updateLockfileHash(DEV_DEPENDENCIES_DIR);
        await cacache.rm.all(BUILD_CACHE);
        inMemoryBuildCache.clear();
        messageBus.emit('INSTALL_COMPLETE');
        isLiveReloadPaused = false;
        currentlyRunningCommand = null;
      });
    }
  }

  const devProxies = {};
  config.proxy.forEach(([pathPrefix, proxyOptions]) => {
    const proxyServer = (devProxies[pathPrefix] = HttpProxy.createProxyServer(proxyOptions));
    for (const [onEventName, eventHandler] of Object.entries(proxyOptions.on)) {
      proxyServer.on(onEventName, eventHandler as () => void);
    }
    if (!proxyOptions.on.error) {
      proxyServer.on('error', DEFAULT_PROXY_ERROR_HANDLER);
    }
  });

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
      credentials = await readCredentials(cwd);
    } catch (e) {
      console.error(
        colors.red(
          `✘ No HTTPS credentials found! Missing Files:  ${colors.bold(
            'snowpack.crt',
          )}, ${colors.bold('snowpack.key')}`,
        ),
      );
      console.log();
      console.log('You can automatically generate credentials for your project via either:');
      console.log();
      console.log(
        `  - ${colors.cyan('devcert')}: ${colors.yellow('npx devcert-cli generate localhost')}`,
      );
      console.log('    https://github.com/davewasmer/devcert-cli (no install required)');
      console.log();
      console.log(
        `  - ${colors.cyan('mkcert')}: ${colors.yellow(
          'mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost',
        )}`,
      );
      console.log('    https://github.com/FiloSottile/mkcert (install required)');
      console.log();
      process.exit(1);
    }
  }

  async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    const reqUrl = req.url!;
    const reqPath = decodeURI(url.parse(reqUrl).pathname!);

    // const requestStart = Date.now();
    res.on('finish', () => {
      const {method, url} = req;
      const {statusCode} = res;
      if (statusCode !== 200) {
        messageBus.emit('SERVER_RESPONSE', {
          method,
          url,
          statusCode,
          // processingTime: Date.now() - requestStart,
        });
      }
    });

    // 1. handle internal URLs
    if (reqPath === `/${config.buildOptions.metaDir}/hmr.js`) {
      sendFile(req, res, HMR_DEV_CODE, '.js');
      return;
    }
    if (reqPath === `/${config.buildOptions.metaDir}/env.js`) {
      sendFile(req, res, generateEnvModule('development'), '.js');
      return;
    }

    // 2. if route change (no file extension), restart dev server
    const reqExt = getExt(reqUrl);
    if (!reqExt.baseExt) {
      messageBus.emit('NEW_SESSION');
    }

    // 3. resolve URL request using plugins’ input/output options
    const {locOnDisk, lookups} = urlToFile(reqUrl, {config, dependencyImportMap});

    // 4. handle 404
    if (!locOnDisk) {
      const prefix = colors.red('  ✘ ');
      console.error(`[404] ${reqUrl}\n${lookups.map((loc) => `${prefix}${loc}`).join('\n')}`);
      return sendError(res, 404);
    }

    // 5. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: string | Buffer | undefined = inMemoryBuildCache.get(reqUrl);
    if (hotCachedResponse) {
      hotCachedResponse = hotCachedResponse.toString(getEncodingType(reqExt.baseExt));
      sendFile(req, res, hotCachedResponse, reqExt.baseExt);
      return;
    }

    // 6. Check the persistent cache. If found, serve it via a
    // "trust-but-verify" strategy. Build it after sending, and if it no longer
    // matches then assume the entire cache is suspect. In that case, clear the
    // persistent cache and then force a live-reload of the page.
    const cachedBuildData =
      !filesBeingDeleted.has(reqUrl) && (await cacache.get(BUILD_CACHE, reqUrl).catch(() => null));

    if (cachedBuildData) {
      // Trust...
      // ...but verify.
    }

    // 7. Final option: build the file, serve it, and cache it.
    let output: SnowpackBuildMap = {};
    try {
      output = await buildFile(locOnDisk, reqUrl, {config});
    } catch (err) {
      console.error(reqPath, err);
    }
    if (!output[reqExt.baseExt] || !Object.keys(output)) {
      return sendError(res, 500);
    }

    Object.entries(output).forEach(([outputPath, response]) => {
      inMemoryBuildCache.set(
        outputPath,
        Buffer.from(response.code, getEncodingType(response.baseExt)),
      );
      const originalFileHash = etag(locOnDisk as string);
      cacache.put(
        BUILD_CACHE,
        reqUrl,
        Buffer.from(response.code, getEncodingType(response.baseExt)),
        {metadata: {originalFileHash}},
      );
    });

    sendFile(req, res, output[reqExt.baseExt].code, reqExt.baseExt);
  }

  type Http2RequestListener = (
    request: http2.Http2ServerRequest,
    response: http2.Http2ServerResponse,
  ) => void;

  const createServer = (requestHandler: http.RequestListener | Http2RequestListener) => {
    if (credentials && config.proxy.length === 0) {
      return http2.createSecureServer(
        {...credentials!, allowHTTP1: true},
        requestHandler as Http2RequestListener,
      );
    } else if (credentials) {
      return https.createServer(credentials, requestHandler as http.RequestListener);
    }

    return http.createServer(requestHandler as http.RequestListener);
  };

  const server = createServer(async (req, res) => {
    try {
      return await requestHandler(req, res);
    } catch (err) {
      console.error(`[500] ${req.url}`);
      console.error(err);
      return sendError(res, 500);
    }
  })
    .on('error', (err: Error) => {
      console.error(colors.red(`  ✘ Failed to start server at port ${colors.bold(port)}.`), err);
      server.close();
      process.exit(1);
    })
    .on('upgrade', (req: http.IncomingMessage, socket, head) => {
      config.proxy.forEach(([pathPrefix, proxyOptions]) => {
        const isWebSocket = proxyOptions.ws || proxyOptions.target?.toString().startsWith('ws');
        if (isWebSocket && shouldProxy(pathPrefix, req)) {
          devProxies[pathPrefix].ws(req, socket, head);
          console.log('Upgrading to WebSocket');
        }
      });
    })
    .listen(port);

  const hmrEngine = new EsmHmrEngine({server});
  onProcessExit(() => {
    hmrEngine.disconnectAllClients();
  });

  // Live Reload + File System Watching
  let isLiveReloadPaused = false;

  function updateOrBubble(url: string, visited: Set<string>) {
    if (visited.has(url)) {
      return;
    }
    visited.add(url);
    const node = hmrEngine.getEntry(url);
    if (node && node.isHmrEnabled) {
      hmrEngine.broadcastMessage({type: 'update', url});
    }
    if (node && node.isHmrAccepted) {
      // Found a boundary, no bubbling needed
    } else if (node && node.dependents.size > 0) {
      hmrEngine.markEntryForReplacement(node, true);
      node.dependents.forEach((dep) => updateOrBubble(dep, visited));
    } else {
      // We've reached the top, trigger a full page refresh
      hmrEngine.broadcastMessage({type: 'reload'});
    }
  }

  function handleHmrUpdate(fileLoc: string) {
    if (isLiveReloadPaused) {
      return;
    }

    // iterate through all the possible extensions this file will build and update
    for (let updateUrl of fileToURLs(fileLoc, {config})) {
      // Append ".proxy.js" to Non-JS files to match their registered URL in the client app.
      if (!updateUrl.endsWith('.js') && !updateUrl.endsWith('.module.css')) {
        updateUrl += '.proxy.js';
      }
      // Check if a virtual file exists in the resource cache (ex: CSS from a Svelte file)
      // If it does, mark it for HMR replacement but DONT trigger a separate HMR update event.
      // This is because a virtual resource doesn't actually exist on disk, so we need the main
      // resource (the JS) to load first. Only after that happens will the CSS exist.
      const virtualCssFileUrl = updateUrl.replace(/.js$/, '.css');
      const virtualNode = hmrEngine.getEntry(`${virtualCssFileUrl}.proxy.js`);
      if (virtualNode && inMemoryResourceCache.has(virtualCssFileUrl)) {
        inMemoryResourceCache.delete(virtualCssFileUrl);
        hmrEngine.markEntryForReplacement(virtualNode, true);
      }
      // If the changed file exists on the page, trigger a new HMR update.
      if (hmrEngine.getEntry(updateUrl)) {
        updateOrBubble(updateUrl, new Set());
        return;
      }

      // Otherwise, reload the page if the file exists in our hot cache (which means that the
      // file likely exists on the current page, but is not supported by HMR (HTML, image, etc)).
      if (inMemoryBuildCache.has(fileLoc)) {
        hmrEngine.broadcastMessage({type: 'reload'});
        return;
      }
    }
  }

  // Announce server has started
  const ips = Object.values(os.networkInterfaces())
    .reduce((every: os.NetworkInterfaceInfo[], i) => [...every, ...(i || [])], [])
    .filter((i) => i.family === 'IPv4' && i.internal === false)
    .map((i) => i.address);
  const protocol = config.devOptions.secure ? 'https:' : 'http:';
  messageBus.emit('SERVER_START', {
    protocol,
    port,
    ips,
    startTimeMs: Date.now() - serverStart,
  });

  // Open the user's browser
  if (open !== 'none') await openInBrowser(protocol, port, open);

  // Start watching the file system.
  // Defer "chokidar" loading to here, to reduce impact on overall startup time
  const chokidar = await import('chokidar');

  // Watch src files
  async function onWatchEvent(fileLoc) {
    handleHmrUpdate(fileLoc);
    inMemoryBuildCache.delete(fileLoc);
    filesBeingDeleted.add(fileLoc);
    await cacache.rm.entry(BUILD_CACHE, fileLoc);
    filesBeingDeleted.delete(fileLoc);
  }
  const watcher = chokidar.watch(Object.keys(config.__mountedDirs), {
    ignored: config.exclude,
    persistent: true,
    ignoreInitial: true,
    disableGlobbing: false,
  });
  watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('unlink', (fileLoc) => onWatchEvent(fileLoc));

  // Watch node_modules & rerun snowpack install if symlinked dep updates
  const symlinkedFileLocs = new Set(
    Object.keys(dependencyImportMap.imports)
      .map((specifier) => {
        const [packageName] = parsePackageImportSpecifier(specifier);
        return resolveDependencyManifest(packageName, cwd);
      }) // resolve symlink src location
      .filter(([_, packageManifest]) => packageManifest && !packageManifest['_id']) // only watch symlinked deps for now
      .map(([fileLoc]) => `${path.dirname(fileLoc!)}/**`),
  );
  function onDepWatchEvent() {
    reinstallDependencies().then(() => hmrEngine.broadcastMessage({type: 'reload'}));
  }
  const depWatcher = chokidar.watch([...symlinkedFileLocs], {
    cwd: '/', // we’re using absolute paths, so watch from root
    persistent: true,
    ignoreInitial: true,
    disableGlobbing: false,
  });
  depWatcher.on('add', onDepWatchEvent);
  depWatcher.on('change', onDepWatchEvent);
  depWatcher.on('unlink', onDepWatchEvent);

  return new Promise(() => {});
}

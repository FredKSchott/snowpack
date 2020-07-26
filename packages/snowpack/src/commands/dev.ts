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
import merge from 'deepmerge';
import etag from 'etag';
import {EventEmitter} from 'events';
import execa from 'execa';
import {existsSync, promises as fs, readFileSync} from 'fs';
import http from 'http';
import HttpProxy from 'http-proxy';
import http2 from 'http2';
import https from 'https';
import * as colors from 'kleur/colors';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import os from 'os';
import path from 'path';
import onProcessExit from 'signal-exit';
import stream from 'stream';
import url from 'url';
import zlib from 'zlib';
import {
  generateEnvModule,
  getMetaUrlPath,
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from '../build/build-import-proxy';
import {buildFile as _buildFile, getInputsFromOutput} from '../build/build-pipeline';
import {createImportResolver} from '../build/import-resolver';
import srcFileExtensionMapping from '../build/src-file-extension-mapping';
import {SnowpackBuildMap, SnowpackConfig} from '../config';
import {EsmHmrEngine} from '../hmr-server-engine';
import {
  scanCodeImportsExports,
  transformEsmImports,
  transformFileImports,
} from '../rewrite-imports';
import {
  BUILD_CACHE,
  checkLockfileHash,
  CommandOptions,
  DEV_DEPENDENCIES_DIR,
  getEncodingType,
  getExt,
  ImportMap,
  isYarn,
  openInBrowser,
  parsePackageImportSpecifier,
  replaceExt,
  resolveDependencyManifest,
  updateLockfileHash,
} from '../util';
import {command as installCommand} from './install';
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

function getUrlFromFile(
  mountedDirectories: [string, string][],
  fileLoc: string,
  config: SnowpackConfig,
): string | null {
  for (const [dirDisk, dirUrl] of mountedDirectories) {
    if (fileLoc.startsWith(dirDisk + path.sep)) {
      const {baseExt} = getExt(fileLoc);
      const resolvedDirUrl = dirUrl === '/' ? '' : dirUrl;
      return replaceExt(
        fileLoc.replace(dirDisk, resolvedDirUrl).replace(/[/\\]+/g, '/'),
        config._extensionMap[baseExt] || srcFileExtensionMapping[baseExt] || baseExt,
      );
    }
  }
  return null;
}

let currentlyRunningCommand: any = null;

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  const {port: defaultPort, hostname, open, hmr: isHmr} = config.devOptions;

  // Start the startup timer!
  let serverStart = Date.now();
  const port = await getPort(defaultPort);
  // Reset the clock if we had to wait for the user to select a new port.
  if (port !== defaultPort) {
    serverStart = Date.now();
  }

  const inMemoryBuildCache = new Map<string, SnowpackBuildMap>();
  const filesBeingDeleted = new Set<string>();
  const filesBeingBuilt = new Map<string, Promise<SnowpackBuildMap>>();
  const messageBus = new EventEmitter();
  const mountedDirectories: [string, string][] = Object.entries(config.mount).map(
    ([fromDisk, toUrl]) => {
      return [path.resolve(cwd, fromDisk), toUrl];
    },
  );

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
  paint(
    messageBus,
    config.plugins.map((p) => p.name),
    undefined,
    {
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
    },
  );

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

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      messageBus.emit('WORKER_START', {id: runPlugin.name});
      runPlugin
        .run({
          isDev: true,
          log: (msg, data) => {
            messageBus.emit(msg, {...data, id: runPlugin.name});
          },
        })
        .then(() => {
          messageBus.emit('WORKER_COMPLETE', {id: runPlugin.name, error: null});
        })
        .catch((err) => {
          messageBus.emit('WORKER_COMPLETE', {id: runPlugin.name, error: err});
        });
    }
  }

  async function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    const reqUrl = req.url!;
    const reqUrlHmrParam = reqUrl.includes('?mtime=') && reqUrl.split('?')[1];
    let reqPath = decodeURI(url.parse(reqUrl).pathname!);
    const originalReqPath = reqPath;
    let isProxyModule = false;
    if (reqPath.endsWith('.proxy.js')) {
      isProxyModule = true;
      reqPath = reqPath.replace('.proxy.js', '');
    }

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

    if (reqPath === getMetaUrlPath('/hmr.js', true, config)) {
      sendFile(req, res, HMR_DEV_CODE, '.js');
      return;
    }
    if (reqPath === getMetaUrlPath('/env.js', true, config)) {
      sendFile(req, res, generateEnvModule('development'), '.js');
      return;
    }

    for (const [pathPrefix] of config.proxy) {
      if (!shouldProxy(pathPrefix, req)) {
        continue;
      }
      devProxies[pathPrefix].web(req, res);
      return;
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

    let requestedFileExt = path.parse(reqPath).ext.toLowerCase();
    let responseFileExt = requestedFileExt;
    let isRoute = !requestedFileExt;

    // Now that we've set isRoute properly, give `requestedFileExt` a fallback
    requestedFileExt = requestedFileExt || '.html';

    async function getFileFromUrl(reqPath: string): Promise<string | null> {
      if (reqPath.startsWith(config.buildOptions.webModulesUrl)) {
        const fileLoc = await attemptLoadFile(
          reqPath.replace(config.buildOptions.webModulesUrl, DEV_DEPENDENCIES_DIR),
        );
        if (fileLoc) {
          return fileLoc;
        }
      }
      for (const [dirDisk, dirUrl] of mountedDirectories) {
        let requestedFile: string;
        if (dirUrl === '/') {
          requestedFile = path.join(dirDisk, reqPath);
        } else if (reqPath.startsWith(dirUrl)) {
          requestedFile = path.join(dirDisk, reqPath.replace(dirUrl, './'));
        } else {
          continue;
        }
        if (isRoute) {
          let fileLoc =
            (await attemptLoadFile(requestedFile + '.html')) ||
            (await attemptLoadFile(requestedFile + 'index.html')) ||
            (await attemptLoadFile(requestedFile + '/index.html'));

          if (!fileLoc && dirUrl === '/' && config.devOptions.fallback) {
            const fallbackFile = path.join(dirDisk, config.devOptions.fallback);
            fileLoc = await attemptLoadFile(fallbackFile);
          }
          if (fileLoc) {
            responseFileExt = '.html';
            return fileLoc;
          }
        } else {
          for (const potentialSourceFile of getInputsFromOutput(requestedFile, config.plugins)) {
            const fileLoc = await attemptLoadFile(potentialSourceFile);
            if (fileLoc) {
              return fileLoc;
            }
          }
        }
      }
      return null;
    }

    const fileLoc = await getFileFromUrl(reqPath);

    if (isRoute) {
      messageBus.emit('NEW_SESSION');
    }

    if (!fileLoc) {
      const prefix = colors.red('  ✘ ');
      console.error(`[404] ${reqUrl}\n${attemptedFileLoads.map((loc) => prefix + loc).join('\n')}`);
      return sendError(res, 404);
    }

    /**
     * Given a file, build it. Building a file sends it through our internal file builder
     * pipeline, and outputs a build map representing the final build. A Build Map is used
     * because one source file can result in multiple built files (Example: .svelte -> .js & .css).
     */
    async function buildFile(fileLoc: string): Promise<SnowpackBuildMap> {
      const existingBuilderPromise = filesBeingBuilt.get(fileLoc);
      if (existingBuilderPromise) {
        return existingBuilderPromise;
      }
      const fileBuilderPromise = (async () => {
        const builtFileOutput = await _buildFile(fileLoc, {
          buildPipeline: config.plugins,
          messageBus,
          isDev: true,
        });
        inMemoryBuildCache.set(fileLoc, builtFileOutput);
        return builtFileOutput;
      })();
      filesBeingBuilt.set(fileLoc, fileBuilderPromise);
      try {
        messageBus.emit('BUILD_FILE', {id: fileLoc, isBuilding: true});
        return await fileBuilderPromise;
      } finally {
        filesBeingBuilt.delete(fileLoc);
        messageBus.emit('BUILD_FILE', {id: fileLoc, isBuilding: false});
      }
    }

    /**
     * Wrap Response: The same build result can be expressed in different ways based on
     * the URL. For example, "App.css" should return CSS but "App.css.proxy.js" should
     * return a JS representation of that CSS. This is handled in the wrap step.
     */
    async function wrapResponse(code: string, hasCssResource: boolean) {
      if (isRoute) {
        code = wrapHtmlResponse({code: code, isDev: true, hmr: isHmr, config});
      } else if (isProxyModule) {
        responseFileExt = '.js';
        code = await wrapImportProxy({
          url: reqPath,
          code,
          isDev: true,
          hmr: isHmr,
          config,
          messageBus,
        });
      } else if (responseFileExt === '.js') {
        code = wrapImportMeta({code, env: true, isDev: true, hmr: isHmr, config});
      }
      if (responseFileExt === '.js' && hasCssResource) {
        code = `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` + code;
      }
      if (responseFileExt === '.js' && reqUrlHmrParam) {
        code = await transformEsmImports(code as string, (imp) => {
          const importUrl = path.posix.resolve(path.posix.dirname(reqPath), imp);
          const node = hmrEngine.getEntry(importUrl);
          if (node && node.needsReplacement) {
            hmrEngine.markEntryForReplacement(node, false);
            return `${imp}?${reqUrlHmrParam}`;
          }
          return imp;
        });
      }
      if (responseFileExt === '.js') {
        const isHmrEnabled = code.includes('import.meta.hot');
        const rawImports = await scanCodeImportsExports(code);
        const resolvedImports = rawImports.map((imp) => {
          let spec = code.substring(imp.s, imp.e);
          if (imp.d > -1) {
            const importSpecifierMatch = spec.match(/^\s*['"](.*)['"]\s*$/m);
            spec = importSpecifierMatch![1];
          }
          return path.posix.resolve(path.posix.dirname(reqPath), spec);
        });
        hmrEngine.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
      }
      return code;
    }

    /**
     * Resolve Imports: Resolved imports are based on the state of the file system, so
     * they can't be cached long-term with the build.
     */
    async function resolveResponseImports(
      fileLoc: string,
      responseExt: string,
      wrappedResponse: string,
    ): Promise<string> {
      let missingWebModule: {spec: string; pkgName: string} | null = null;
      const resolveImportSpecifier = createImportResolver({
        fileLoc,
        dependencyImportMap,
        isBundled: false,
        config,
      });
      wrappedResponse = await transformFileImports(
        {
          locOnDisk: fileLoc,
          contents: wrappedResponse,
          baseExt: responseExt,
          expandedExt: getExt(fileLoc).expandedExt,
        },
        (spec) => {
          // Try to resolve the specifier to a known URL in the project
          const resolvedImportUrl = resolveImportSpecifier(spec);
          if (resolvedImportUrl) {
            return resolvedImportUrl;
          }
          // If that fails, return a placeholder import and attempt to resolve.
          const [packageName] = parsePackageImportSpecifier(spec);
          const [depManifestLoc] = resolveDependencyManifest(packageName, cwd);
          const doesPackageExist = !!depManifestLoc;
          if (doesPackageExist) {
            reinstallDependencies();
          } else {
            missingWebModule = {
              spec: spec,
              pkgName: packageName,
            };
          }
          // Return a placeholder while Snowpack goes out and tries to re-install (or warn)
          // on the missing package.
          return spec;
        },
      );
      messageBus.emit('MISSING_WEB_MODULE', {
        id: fileLoc,
        data: missingWebModule,
      });
      return wrappedResponse;
    }

    /**
     * Given a build, finalize it for the response. This involves running individual steps
     * needed to go from build result to sever response, including:
     *   - wrapResponse(): Wrap responses
     *   - resolveResponseImports(): Resolve all ESM imports
     */
    async function finalizeResponse(
      fileLoc: string,
      requestedFileExt: string,
      output: SnowpackBuildMap,
    ): Promise<string | null> {
      // Verify that the requested file exists in the build output map.
      if (!output[requestedFileExt] || !Object.keys(output)) {
        return null;
      }
      // Wrap the response.
      const hasAttachedCss = requestedFileExt === '.js' && !!output['.css'];
      let wrappedResponse = await wrapResponse(output[requestedFileExt], hasAttachedCss);

      // Resolve imports.
      if (requestedFileExt === '.js' || requestedFileExt === '.html') {
        wrappedResponse = await resolveResponseImports(fileLoc, requestedFileExt, wrappedResponse);
      }
      // Return the finalized response.
      return wrappedResponse;
    }

    // 1. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: SnowpackBuildMap | undefined = inMemoryBuildCache.get(fileLoc);
    if (hotCachedResponse) {
      const responseContent = await finalizeResponse(fileLoc, requestedFileExt, hotCachedResponse);
      if (!responseContent) {
        sendError(res, 404);
        return;
      }
      sendFile(req, res, responseContent, responseFileExt);
      return;
    }

    // 2. Load the file from disk. We'll need it to check the cold cache or build from scratch.
    const fileContents = await fs.readFile(fileLoc, getEncodingType(requestedFileExt));

    // 3. Send dependencies directly, since they were already build & resolved at install time.
    if (reqPath.startsWith(config.buildOptions.webModulesUrl)) {
      sendFile(req, res, fileContents, responseFileExt);
      return;
    }

    // 4. Check the persistent cache. If found, serve it via a "trust-but-verify" strategy.
    // Build it after sending, and if it no longer matches then assume the entire cache is suspect.
    // In that case, clear the persistent cache and then force a live-reload of the page.
    const cachedBuildData =
      !filesBeingDeleted.has(fileLoc) &&
      (await cacache.get(BUILD_CACHE, fileLoc).catch(() => null));
    if (cachedBuildData) {
      const {originalFileHash} = cachedBuildData.metadata;
      const newFileHash = etag(fileContents);
      if (originalFileHash === newFileHash) {
        const coldCachedResponse: SnowpackBuildMap = JSON.parse(cachedBuildData.data.toString());
        inMemoryBuildCache.set(fileLoc, coldCachedResponse);
        // Trust...
        const wrappedResponse = await finalizeResponse(
          fileLoc,
          requestedFileExt,
          coldCachedResponse,
        );
        if (!wrappedResponse) {
          sendError(res, 404);
          return;
        }
        sendFile(req, res, wrappedResponse, responseFileExt);
        // ...but verify.
        let checkFinalBuildResult: SnowpackBuildMap | null = null;
        try {
          checkFinalBuildResult = await buildFile(fileLoc);
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
      }
    }

    // 5. Final option: build the file, serve it, and cache it.
    let responseContent: string | null;
    let responseOutput: SnowpackBuildMap;
    try {
      responseOutput = await buildFile(fileLoc);
    } catch (err) {
      sendError(res, 500);
      return;
    }
    try {
      responseContent = await finalizeResponse(fileLoc, requestedFileExt, responseOutput);
    } catch (err) {
      console.error(reqPath, err);
      sendError(res, 500);
      return;
    }
    if (!responseContent) {
      sendError(res, 404);
      return;
    }

    sendFile(req, res, responseContent, responseFileExt);
    const originalFileHash = etag(fileContents);
    cacache.put(BUILD_CACHE, fileLoc, Buffer.from(JSON.stringify(responseOutput)), {
      metadata: {originalFileHash},
    });
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
    let updateUrl = getUrlFromFile(mountedDirectories, fileLoc, config);
    if (!updateUrl) {
      return;
    }

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
    if (virtualNode) {
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

  // Announce server has started
  const ips = Object.values(os.networkInterfaces())
    .reduce((every: os.NetworkInterfaceInfo[], i) => [...every, ...(i || [])], [])
    .filter((i) => i.family === 'IPv4' && i.internal === false)
    .map((i) => i.address);
  const protocol = config.devOptions.secure ? 'https:' : 'http:';
  messageBus.emit('SERVER_START', {
    protocol,
    hostname,
    port,
    ips,
    startTimeMs: Date.now() - serverStart,
  });

  // Open the user's browser
  if (open !== 'none') await openInBrowser(protocol, hostname, port, open);

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
  const watcher = chokidar.watch(
    mountedDirectories.map(([dirDisk]) => dirDisk),
    {
      ignored: config.exclude,
      persistent: true,
      ignoreInitial: true,
      disableGlobbing: false,
    },
  );
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

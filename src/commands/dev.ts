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
import chalk from 'chalk';
import chokidar from 'chokidar';
import isCompressible from 'compressible';
import etag from 'etag';
import {EventEmitter} from 'events';
import execa from 'execa';
import {existsSync, promises as fs, readFileSync} from 'fs';
import http from 'http';
import http2 from 'http2';
import HttpProxy from 'http-proxy';
import inquirer from 'inquirer';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import net from 'net';
import os from 'os';
import path from 'path';
import onProcessExit from 'signal-exit';
import stream from 'stream';
import url from 'url';
import zlib from 'zlib';
import {BuildScript, SnowpackPluginBuildResult} from '../config';
import {EsmHmrEngine} from '../hmr-server-engine';
import {scanCodeImportsExports, transformEsmImports} from '../rewrite-imports';
import {
  BUILD_CACHE,
  checkLockfileHash,
  CommandOptions,
  DEV_DEPENDENCIES_DIR,
  ImportMap,
  isYarn,
  openInBrowser,
  resolveDependencyManifest,
  findMatchingMountScript,
  updateLockfileHash,
} from '../util';
import {
  FileBuilder,
  getFileBuilderForWorker,
  isDirectoryImport,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapHtmlResponse,
  wrapImportMeta,
  generateEnvModule,
} from './build-util';
import {command as installCommand} from './install';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';

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
  if (ext === '.js' || ext === '.css' || ext === '.html') {
    return 'utf-8';
  } else {
    return 'binary';
  }
}

const sendFile = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string | Buffer,
  ext = '.html',
) => {
  const ETag = etag(body, {weak: true});
  const headers: Record<string, string> = {
    'Content-Type': mime.contentType(ext) || 'application/octet-stream',
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
    !isCompressible(mime.contentType(ext))
  ) {
    acceptEncoding = '';
  }

  function onError(err) {
    if (err) {
      res.end();
      console.error(
        chalk.red(`  ✘ An error occurred while compressing ${chalk.bold(req.url)}`),
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

function getUrlFromFile(mountedDirectories: [string, string][], fileLoc: string): string | null {
  for (const [dirDisk, dirUrl] of mountedDirectories) {
    if (fileLoc.startsWith(dirDisk + path.sep)) {
      const fileExt = path.extname(fileLoc).substr(1);
      const resolvedDirUrl = dirUrl === '/' ? '' : dirUrl;
      return fileLoc
        .replace(dirDisk, resolvedDirUrl)
        .replace(/[/\\]+/g, '/')
        .replace(new RegExp(`${fileExt}$`), srcFileExtensionMapping[fileExt] || fileExt);
    }
  }
  return null;
}

function getMountedDirectory(cwd: string, workerConfig: BuildScript): [string, string] {
  const {args} = workerConfig;
  return [path.resolve(cwd, args.fromDisk), args.toUrl];
}

const isPortAvailable = (port: number) =>
  new Promise<number>((resolve, reject) => {
    const server = net
      .createServer()
      .once('error', reject)
      .once('listening', () => server.once('close', () => resolve(port)).close())
      .listen(port);
  });

const getNextFreePort = (port: number, limit = 10) =>
  new Promise<number>((resolve, reject) => {
    let limitReached = false;
    (function checkPort(currentPort) {
      if (!limitReached) {
        limitReached = currentPort >= port + limit;
        isPortAvailable(currentPort)
          .then(resolve)
          .catch((err) => {
            if (err.code === 'EADDRINUSE') {
              // we have a EADDRINUSE error so we retry with the next port
              checkPort(currentPort + 1);
            } else {
              reject('Network Error while starting');
            }
          });
      } else {
        reject(
          `We have searched ${limit} next ports starting from ${port} and none was available.`,
        );
      }
    })(port);
  });

let currentlyRunningCommand: any = null;

export async function command(commandOptions: CommandOptions) {
  let serverStart = Date.now();
  const {cwd, config} = commandOptions;
  const {port: defaultPort, open, hmr: isHmr} = config.devOptions;
  let port = defaultPort;

  const inMemoryBuildCache = new Map<string, Buffer>();
  const inMemoryResourceCache = new Map<string, string>();
  const filesBeingDeleted = new Set<string>();
  const filesBeingBuilt = new Map<string, Promise<SnowpackPluginBuildResult>>();
  const messageBus = new EventEmitter();
  const mountedDirectories: [string, string][] = [];

  // Check whether the default port is available
  const isDefaultPortAvailable =
    defaultPort ===
    (await isPortAvailable(defaultPort).catch((err) => {
      /* error while opening default port */
    }));

  if (!isDefaultPortAvailable) {
    const question = {
      type: 'confirm',
      name: 'nextPort',
      message: 'Default port 8080 is not available. Would you like to run on another port instead?',
      default: true,
    };
    const answer = await inquirer.prompt(question);
    // because of the question, we will reset the starting time here
    serverStart = Date.now();
    if (answer.nextPort) {
      try {
        port = await getNextFreePort(port);
      } catch (err) {
        console.error(
          '\n',
          chalk.red(`  ✘ ${err}`),
          '\n',
          chalk.red(`    Use ${chalk.bold('--port')} to specify a different port.`),
          '\n',
        );
        process.exit(1);
      }
    } else {
      console.error(
        '\n',
        chalk.red(
          `  ✘ port ${chalk.bold(port)} is not available. Use ${chalk.bold(
            '--port',
          )} to specify a different port.`,
        ),
        '\n',
      );
      process.exit(1);
    }
  }

  // Set the proper install options, in case an install is needed.
  commandOptions.config.installOptions.dest = DEV_DEPENDENCIES_DIR;
  commandOptions.config.installOptions.env.NODE_ENV = process.env.NODE_ENV || 'development';
  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');

  // Start with a fresh install of your dependencies, if needed.
  if (!(await checkLockfileHash(DEV_DEPENDENCIES_DIR)) || !existsSync(dependencyImportMapLoc)) {
    console.log(chalk.yellow('! updating dependencies...'));
    await installCommand(commandOptions);
    await updateLockfileHash(DEV_DEPENDENCIES_DIR);
    serverStart = Date.now();
  }

  let dependencyImportMap: ImportMap = {imports: {}};
  try {
    dependencyImportMap = JSON.parse(
      await fs.readFile(dependencyImportMapLoc, {encoding: 'utf-8'}),
    );
  } catch (err) {
    // no import-map found, safe to ignore
  }

  async function buildFile(
    fileContents: string,
    fileLoc: string,
    reqPath: string,
    fileBuilder: FileBuilder | undefined,
  ): Promise<SnowpackPluginBuildResult> {
    let builtFileResult: SnowpackPluginBuildResult;
    let fileBuilderPromise = filesBeingBuilt.get(fileLoc);
    if (fileBuilderPromise) {
      builtFileResult = await fileBuilderPromise;
    } else {
      fileBuilderPromise = (async () => {
        let _builtFileResult: SnowpackPluginBuildResult = {result: fileContents};
        if (fileBuilder) {
          _builtFileResult =
            (await fileBuilder({
              contents: fileContents,
              filePath: fileLoc,
              isDev: true,
            })) || _builtFileResult;
        }
        for (const plugin of config.plugins) {
          if (plugin.transform) {
            _builtFileResult.result =
              (
                await plugin.transform({
                  contents: _builtFileResult.result,
                  urlPath: reqPath,
                  isDev: true,
                })
              )?.result || _builtFileResult.result;
          }
        }
        return _builtFileResult;
      })();
      try {
        filesBeingBuilt.set(fileLoc, fileBuilderPromise);
        builtFileResult = await fileBuilderPromise;
      } finally {
        filesBeingBuilt.delete(fileLoc);
      }
    }
    const ext = path.extname(fileLoc).substr(1);
    if (ext === 'js' || srcFileExtensionMapping[ext] === 'js') {
      let missingWebModule: {spec: string; pkgName: string} | null = null;
      builtFileResult.result = await transformEsmImports(builtFileResult.result, (spec) => {
        if (spec.startsWith('http')) {
          return spec;
        }
        let mountScript = findMatchingMountScript(config.scripts, spec);
        if (mountScript) {
          let {fromDisk, toUrl} = mountScript.args;
          spec = spec.replace(fromDisk, toUrl);
        }
        if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
          const ext = path.extname(spec).substr(1);
          if (!ext) {
            if (isDirectoryImport(fileLoc, spec)) {
              return spec + '/index.js';
            } else {
              return spec + '.js';
            }
          }
          const extToReplace = srcFileExtensionMapping[ext];
          if (extToReplace) {
            spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
          }
          if (!spec.endsWith('.module.css') && (extToReplace || ext) !== 'js') {
            spec = spec + '.proxy.js';
          }
          return spec;
        }
        if (dependencyImportMap.imports[spec]) {
          let resolvedImport = path.posix.resolve(
            `/web_modules`,
            dependencyImportMap.imports[spec],
          );
          const extName = path.extname(resolvedImport);
          if (extName && extName !== '.js') {
            resolvedImport = resolvedImport + '.proxy.js';
          }
          return resolvedImport;
        }
        let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
        if (missingPackageName.startsWith('@')) {
          missingPackageName += '/' + deepPackagePathParts.shift();
        }
        const [depManifestLoc] = resolveDependencyManifest(missingPackageName, cwd);
        const doesPackageExist = !!depManifestLoc;
        if (doesPackageExist && !currentlyRunningCommand) {
          isLiveReloadPaused = true;
          messageBus.emit('INSTALLING');
          currentlyRunningCommand = installCommand(commandOptions);
          currentlyRunningCommand.then(async () => {
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
        } else if (!doesPackageExist) {
          missingWebModule = {
            spec: spec,
            pkgName: missingPackageName,
          };
        }
        const extName = path.extname(spec);
        if (extName && extName !== '.js') {
          spec = spec + '.proxy';
        }
        return `/web_modules/${spec}.js`;
      });

      messageBus.emit('MISSING_WEB_MODULE', {
        id: fileLoc,
        data: missingWebModule,
      });
    }

    return builtFileResult;
  }

  function runLintAll(workerConfig: BuildScript) {
    let {id, cmd, watch: watchCmd} = workerConfig;
    const workerPromise = execa.command(watchCmd || cmd, {
      env: npmRunPath.env(),
      extendEnv: true,
      shell: true,
      cwd,
    });
    const {stdout, stderr} = workerPromise;
    stdout?.on('data', (b) => {
      let stdOutput = b.toString();
      if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
        messageBus.emit('WORKER_RESET', {id});
        stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
      }
      if (id.endsWith(':tsc')) {
        if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
          messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
        }
        if (/Watching for file changes./gm.test(stdOutput)) {
          messageBus.emit('WORKER_UPDATE', {id, state: 'WATCH'});
        }
        const errorMatch = stdOutput.match(/Found (\d+) error/);
        if (errorMatch && errorMatch[1] !== '0') {
          messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
        }
      }
      messageBus.emit('WORKER_MSG', {id, level: 'log', msg: stdOutput});
    });
    stderr?.on('data', (b) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: b.toString()});
    });
    workerPromise.catch((err) => {
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    workerPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    });
  }

  for (const workerConfig of config.scripts) {
    if (workerConfig.type === 'run') {
      runLintAll(workerConfig);
    }
    if (workerConfig.type === 'mount') {
      mountedDirectories.push(getMountedDirectory(cwd, workerConfig));
      setTimeout(
        () => messageBus.emit('WORKER_UPDATE', {id: workerConfig.id, state: ['DONE', 'green']}),
        400,
      );
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
        chalk.red(
          `✘ No HTTPS credentials found! Missing Files:  ${chalk.bold(
            'snowpack.crt',
          )}, ${chalk.bold('snowpack.key')}`,
        ),
      );
      console.log();
      console.log('You can automatically generate credentials for your project via either:');
      console.log();
      console.log(
        `  - ${chalk.cyan('devcert')}: ${chalk.yellow('npx devcert-cli generate localhost')}`,
      );
      console.log('    https://github.com/davewasmer/devcert-cli (no install required)');
      console.log();
      console.log(
        `  - ${chalk.cyan('mkcert')}: ${chalk.yellow('mkcert -install && mkcert localhost')}`,
      );
      console.log('    https://github.com/FiloSottile/mkcert (install required)');
      console.log();
      process.exit(1);
    }
  }

  const createServer = credentials
    ? (requestHandler) => http2.createSecureServer(credentials!, requestHandler)
    : (requestHandler) => http.createServer(requestHandler);

  const server = createServer(async (req, res) => {
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
        messageBus.emit('SERVER_RESPONSE', {
          method,
          url,
          statusCode,
          // processingTime: Date.now() - requestStart,
        });
      }
    });

    if (reqPath === '/__snowpack__/hmr.js') {
      sendFile(req, res, HMR_DEV_CODE, '.js');
      return;
    }
    if (reqPath === '/__snowpack__/env.js') {
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
    let fileBuilder: FileBuilder | undefined;
    let isRoute = !requestedFileExt;

    // Now that we've set isRoute properly, give `requestedFileExt` a fallback
    requestedFileExt = requestedFileExt || '.html';

    async function getFileFromUrl(reqPath: string): Promise<[string | null, BuildScript | null]> {
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
          const fileLoc = await attemptLoadFile(requestedFile);
          if (fileLoc) {
            return [fileLoc, null];
          }
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
            return [fileLoc, null];
          }
        } else {
          for (const workerConfig of config.scripts) {
            const {type, match} = workerConfig;
            if (type !== 'build') {
              continue;
            }
            for (const extMatcher of match) {
              if (
                extMatcher === requestedFileExt.substr(1) ||
                srcFileExtensionMapping[extMatcher] === requestedFileExt.substr(1)
              ) {
                const srcFile = requestedFile.replace(requestedFileExt, `.${extMatcher}`);
                const fileLoc = await attemptLoadFile(srcFile);
                if (fileLoc) {
                  return [fileLoc, workerConfig];
                }
              }
            }
          }
          const fileLoc =
            (await attemptLoadFile(requestedFile)) ||
            (await attemptLoadFile(requestedFile.replace(/\.js$/, '.jsx'))) ||
            (await attemptLoadFile(requestedFile.replace(/\.js$/, '.ts'))) ||
            (await attemptLoadFile(requestedFile.replace(/\.js$/, '.tsx')));
          if (fileLoc) {
            return [fileLoc, null];
          }
        }
      }
      return [null, null];
    }

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
      sendFile(req, res, virtualResourceResponse, responseFileExt);
      return;
    }

    const [fileLoc, selectedWorker] = await getFileFromUrl(reqPath);

    if (isRoute) {
      messageBus.emit('NEW_SESSION');
    }

    if (!fileLoc) {
      const prefix = chalk.red('  ✘ ');
      console.error(`[404] ${reqUrl}\n${attemptedFileLoads.map((loc) => prefix + loc).join('\n')}`);
      return sendError(res, 404);
    }

    if (selectedWorker) {
      fileBuilder = getFileBuilderForWorker(cwd, selectedWorker, messageBus);
    }

    async function wrapResponse(code: string, cssResource: string | undefined) {
      if (isRoute) {
        code = wrapHtmlResponse(code, isHmr);
      } else if (isProxyModule) {
        responseFileExt = '.js';
        code = wrapEsmProxyResponse(reqPath, code, requestedFileExt, isHmr);
      } else if (isCssModule) {
        responseFileExt = '.js';
        code = await wrapCssModuleResponse(reqPath, code, requestedFileExt, isHmr);
      } else if (responseFileExt === '.js') {
        code = wrapImportMeta(code, {env: true, hmr: isHmr});
      }
      if (responseFileExt === '.js' && cssResource) {
        code = `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` + code;
      }
      return code;
    }

    // 1. Check the hot build cache. If it's already found, then just serve it.
    let hotCachedResponse: string | Buffer | undefined = inMemoryBuildCache.get(fileLoc);
    if (hotCachedResponse) {
      hotCachedResponse = hotCachedResponse.toString(getEncodingType(requestedFileExt));
      const isHot = reqUrl.includes('?mtime=');
      if (isHot) {
        const [, mtime] = reqUrl.split('?');
        hotCachedResponse = await transformEsmImports(hotCachedResponse as string, (imp) => {
          const importUrl = path.posix.resolve(path.posix.dirname(reqPath), imp);
          const node = hmrEngine.getEntry(importUrl);
          if (node && node.needsReplacement) {
            hmrEngine.markEntryForReplacement(node, false);
            return `${imp}?${mtime}`;
          }
          return imp;
        });
      }

      const wrappedResponse = await wrapResponse(
        hotCachedResponse,
        inMemoryResourceCache.get(reqPath.replace(/.js$/, '.css')),
      );
      sendFile(req, res, wrappedResponse, responseFileExt);
      return;
    }

    // 2. Load the file from disk. We'll need it to check the cold cache or build from scratch.
    let fileContents: string;
    try {
      fileContents = await fs.readFile(fileLoc, getEncodingType(requestedFileExt));
    } catch (err) {
      console.error(fileLoc, err);
      return sendError(res, 500);
    }

    // 3. Check the persistent cache. If found, serve it via a "trust-but-verify" strategy.
    // Build it after sending, and if it no longer matches then assume the entire cache is suspect.
    // In that case, clear the persistent cache and then force a live-reload of the page.
    const cachedBuildData =
      !filesBeingDeleted.has(fileLoc) &&
      (await cacache.get(BUILD_CACHE, fileLoc).catch(() => null));
    if (cachedBuildData) {
      const {originalFileHash, resources} = cachedBuildData.metadata;
      const newFileHash = etag(fileContents);
      if (originalFileHash === newFileHash) {
        const coldCachedResponse: Buffer = cachedBuildData.data;
        inMemoryBuildCache.set(fileLoc, coldCachedResponse);
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
          hmrEngine.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
        }

        sendFile(req, res, wrappedResponse, responseFileExt);
        // ...but verify.
        let checkFinalBuildResult: string | null | undefined = null;
        let checkFinalBuildCss: string | null | undefined = null;
        try {
          const checkFinalBuildAnyway = await buildFile(
            fileContents,
            fileLoc,
            reqPath,
            fileBuilder,
          );
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
            hmrEngine.broadcastMessage({type: 'reload'});
          }
        }
        return;
      }
    }

    // 4. Final option: build the file, serve it, and cache it.
    let finalBuild: SnowpackPluginBuildResult | undefined;
    try {
      finalBuild = await buildFile(fileContents, fileLoc, reqPath, fileBuilder);
    } catch (err) {
      console.error(fileLoc, err);
    }
    if (!finalBuild || finalBuild.result === '') {
      return sendError(res, 500);
    }
    inMemoryBuildCache.set(
      fileLoc,
      Buffer.from(finalBuild.result, getEncodingType(requestedFileExt)),
    );
    if (finalBuild.resources?.css) {
      inMemoryResourceCache.set(reqPath.replace(/.js$/, `.css`), finalBuild.resources.css);
    }
    const originalFileHash = etag(fileContents);
    cacache.put(
      BUILD_CACHE,
      fileLoc,
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
      hmrEngine.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
    }

    sendFile(req, res, wrappedResponse, responseFileExt);
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
  async function onWatchEvent(fileLoc) {
    let updateUrl = getUrlFromFile(mountedDirectories, fileLoc);
    if (updateUrl) {
      if (!updateUrl.endsWith('.js')) {
        updateUrl += '.proxy.js';
      }
      if (isLiveReloadPaused) {
        return;
      }
      // If no entry exists, file has never been loaded, safe to ignore
      if (hmrEngine.getEntry(updateUrl)) {
        updateOrBubble(updateUrl, new Set());
      }
    }
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

  onProcessExit(() => {
    hmrEngine.disconnectAllClients();
  });

  console.log = (...args) => {
    messageBus.emit('CONSOLE', {level: 'log', args});
  };
  console.warn = (...args) => {
    messageBus.emit('CONSOLE', {level: 'warn', args});
  };
  console.error = (...args) => {
    messageBus.emit('CONSOLE', {level: 'error', args});
  };

  const ips = Object.values(os.networkInterfaces())
    .reduce((every: os.NetworkInterfaceInfo[], i) => [...every, ...(i || [])], [])
    .filter((i) => i.family === 'IPv4' && i.internal === false)
    .map((i) => i.address);

  const protocol = config.devOptions.secure ? 'https:' : 'http:';

  paint(messageBus, config.scripts, undefined, {
    protocol,
    port,
    ips,
    startTimeMs: Date.now() - serverStart,
    addPackage: async (pkgName) => {
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
      currentlyRunningCommand = installCommand(commandOptions);
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

  if (open !== 'none') await openInBrowser(protocol, port, open);
  return new Promise(() => {});
}

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
import etag from 'etag';
import {EventEmitter} from 'events';
import execa from 'execa';
import {existsSync, promises as fs, readFileSync} from 'fs';
import got from 'got';
import http from 'http';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import os from 'os';
import path from 'path';
import url from 'url';
import {BuildScript, SnowpackPluginBuildResult} from '../config';
import {transformEsmImports} from '../rewrite-imports';
import {BUILD_CACHE, CommandOptions, ImportMap, openInBrowser} from '../util';
import {addCommand} from './add-rm';
import {
  FileBuilder,
  getFileBuilderForWorker,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapHtmlResponse,
  wrapJSModuleResponse,
} from './build-util';
import {command as installCommand} from './install';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';
import {EsmHmrEngine} from '../hmr-server-engine';

const HMR_DEV_CODE = readFileSync(path.join(__dirname, '../assets/hmr.js'));

function getEncodingType(ext: string): 'utf8' | 'binary' {
  if (ext === '.js' || ext === '.css' || ext === '.html') {
    return 'utf8';
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
  res.writeHead(200, {
    'Content-Type': mime.contentType(ext) || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
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

let currentlyRunningCommand: any = null;

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  console.log(chalk.bold('Snowpack Dev Server (Beta)'));
  console.log('NOTE: Still experimental, default behavior may change.');
  console.log('Starting up...\n');

  const {port, open} = config.devOptions;
  const hmrEngine = new EsmHmrEngine();
  const inMemoryBuildCache = new Map<string, Buffer>();
  const inMemoryResourceCache = new Map<string, string>();
  const filesBeingDeleted = new Set<string>();
  const filesBeingBuilt = new Map<string, Promise<SnowpackPluginBuildResult>>();
  const messageBus = new EventEmitter();
  const mountedDirectories: [string, string][] = [];
  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');
  if (!existsSync(dependencyImportMapLoc)) {
    messageBus.emit('INSTALLING');
    currentlyRunningCommand = installCommand(commandOptions);
    await currentlyRunningCommand;
    currentlyRunningCommand = null;
    messageBus.emit('INSTALL_COMPLETE');
  }

  const serverStart = Date.now();
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
          _builtFileResult = await fileBuilder({
            contents: fileContents,
            filePath: fileLoc,
            isDev: true,
          });
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
      filesBeingBuilt.set(fileLoc, fileBuilderPromise);
      builtFileResult = await fileBuilderPromise;
      filesBeingBuilt.delete(fileLoc);
    }
    const ext = path.extname(fileLoc).substr(1);
    if (ext === 'js' || srcFileExtensionMapping[ext] === 'js') {
      builtFileResult.result = await transformEsmImports(builtFileResult.result, (spec) => {
        if (spec.startsWith('http')) {
          return spec;
        }
        if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
          const ext = path.extname(spec).substr(1);
          if (!ext) {
            return spec + '.js';
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
          return path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
        }
        let isMissingSpecInstalled = false;
        try {
          require.resolve(spec, {paths: [cwd]});
          isMissingSpecInstalled = true;
        } catch (err) {
          // that's fine, ignore
        }

        let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
        if (missingPackageName.startsWith('@')) {
          missingPackageName += '/' + deepPackagePathParts.shift();
        }
        let doesPackageExist = false;
        try {
          require.resolve(missingPackageName, {paths: [cwd]});
          doesPackageExist = true;
        } catch (err) {
          // that's okay, it just doesn't exist
        }
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
            messageBus.emit('INSTALL_COMPLETE');
            isLiveReloadPaused = false;
            currentlyRunningCommand = null;
          });
        } else if (!doesPackageExist) {
          messageBus.emit('MISSING_WEB_MODULE', {
            spec: spec,
            pkgName: missingPackageName,
          });
        }
        return `/web_modules/${spec}.js`;
      });
    }
    return builtFileResult;
  }

  function runLintAll(workerConfig: BuildScript) {
    let {id, cmd} = workerConfig;
    if (workerConfig.watch) {
      cmd += workerConfig.watch.replace('$1', '');
    }
    const workerPromise = execa.command(cmd, {
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
    stderr?.on('data', (b) => {});
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
    if (workerConfig.type === 'proxy') {
      setTimeout(
        () => messageBus.emit('WORKER_UPDATE', {id: workerConfig.id, state: ['DONE', 'green']}),
        400,
      );
    }
    if (workerConfig.type === 'mount') {
      mountedDirectories.push(getMountedDirectory(cwd, workerConfig));
      setTimeout(
        () => messageBus.emit('WORKER_UPDATE', {id: workerConfig.id, state: ['DONE', 'green']}),
        400,
      );
    }
  }

  http
    .createServer(async (req, res) => {
      const reqUrl = req.url!;
      let reqPath = decodeURI(url.parse(reqUrl).pathname!);
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

      if (reqPath === '/livereload') {
        hmrEngine.connectClient(res);
        req.on('close', () => hmrEngine.disconnectClient(res));
        return;
      }

      if (reqPath === '/livereload/hmr.js') {
        sendFile(req, res, HMR_DEV_CODE, '.js');
        return;
      }

      for (const workerConfig of config.scripts) {
        if (workerConfig.type !== 'proxy') {
          continue;
        }
        if (reqPath.startsWith(workerConfig.args.toUrl)) {
          const newPath = reqPath.substr(workerConfig.args.toUrl);
          try {
            const response = await got(`${workerConfig.args.fromUrl}${newPath}`, {
              headers: req.headers,
              throwHttpErrors: false,
            });
            res.writeHead(response.statusCode, response.headers);
            res.write(response.body);
          } catch (err) {
            console.error(`✘ ${reqUrl}\n${err.message}`);
            sendError(res, 500);
          } finally {
            res.end();
          }
          return;
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

      let requestedFileExt = path.parse(reqPath).ext.toLowerCase();
      let responseFileExt = requestedFileExt;
      let fileBuilder: FileBuilder | undefined;
      let isRoute = false;

      async function getFileFromUrl(reqPath: string): Promise<[string | null, BuildScript | null]> {
        for (const [dirDisk, dirUrl] of mountedDirectories) {
          let requestedFile: string;
          if (dirUrl === '/') {
            requestedFile = path.join(dirDisk, reqPath);
          } else if (reqPath.startsWith(dirUrl)) {
            requestedFile = path.join(dirDisk, reqPath.replace(dirUrl, '.'));
          } else {
            continue;
          }

          if (requestedFileExt) {
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
          } else {
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
              isRoute = true;
            }
            return [fileLoc, null];
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
        console.error(
          `[404] ${reqUrl}\n${attemptedFileLoads.map((loc) => prefix + loc).join('\n')}`,
        );
        return sendError(res, 404);
      }

      if (selectedWorker) {
        fileBuilder = getFileBuilderForWorker(cwd, selectedWorker, messageBus);
      }

      async function wrapResponse(code: string, cssResource: string | undefined) {
        if (isRoute) {
          code = wrapHtmlResponse(code, true);
        } else if (isProxyModule) {
          responseFileExt = '.js';
          code = wrapEsmProxyResponse(reqPath, code, requestedFileExt, true);
        } else if (isCssModule) {
          responseFileExt = '.js';
          code = await wrapCssModuleResponse(reqPath, code, requestedFileExt, true);
        } else if (responseFileExt === '.js') {
          code = await wrapJSModuleResponse(code, true);
        }
        if (responseFileExt === '.js' && cssResource) {
          code = `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` + code;
        }
        return code;
      }

      // 1. Check the hot build cache. If it's already found, then just serve it.
      let hotCachedResponse: string | Buffer | undefined = inMemoryBuildCache.get(fileLoc);
      if (hotCachedResponse) {
        const wrappedResponse = await wrapResponse(
          hotCachedResponse.toString(getEncodingType(requestedFileExt)),
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
              hmrEngine.broadcastMessage('message', {type: 'reload'});
            }
          }
          return;
        }
      }

      // 4. Final option: build the file, serve it, and cache it.
      let finalBuild: SnowpackPluginBuildResult;
      try {
        finalBuild = await buildFile(fileContents, fileLoc, reqPath, fileBuilder);
      } catch (err) {
        console.error(fileLoc, err);
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
      sendFile(req, res, wrappedResponse, responseFileExt);
    })
    .listen(port);

  // Live Reload + File System Watching
  let isLiveReloadPaused = false;
  async function onWatchEvent(fileLoc) {
    const fileUrl = getUrlFromFile(mountedDirectories, fileLoc);
    if (!isLiveReloadPaused) {
      hmrEngine.broadcastMessage('message', {type: 'update', url: fileUrl});
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

  process.on('SIGINT', () => {
    hmrEngine.disconnectAllClients();
    process.exit(0);
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

  paint(messageBus, config.scripts, undefined, {
    port,
    ips,
    startTimeMs: Date.now() - serverStart,
    addPackage: async (pkgName) => {
      isLiveReloadPaused = true;
      messageBus.emit('INSTALLING');
      currentlyRunningCommand = addCommand(pkgName, commandOptions);
      await currentlyRunningCommand;
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

  if (open) await openInBrowser(port);
  return new Promise(() => {});
}

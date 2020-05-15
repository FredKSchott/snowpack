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
import {promises as fs, existsSync, readFileSync} from 'fs';
import http from 'http';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import os from 'os';
import path from 'path';
import url from 'url';
import yargs from 'yargs-parser';
import {DevScript, SnowpackConfig} from '../config';
import {transformEsmImports} from '../rewrite-imports';
import {BUILD_CACHE, CommandOptions, ImportMap} from '../util';
import {wrapEsmProxyResponse, getFileBuilderForWorker, wrapCssModuleResponse} from './build-util';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';
import got from 'got';
import {addCommand} from './add-rm';
import {command as installCommand} from './install';
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

const sendMessage = (res, channel, data) => {
  res.write(`event: ${channel}\nid: 0\ndata: ${data}\n`);
  res.write('\n\n');
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

function getMountedDirectory(cwd: string, workerConfig: DevScript): [string, string] {
  const {id, cmd} = workerConfig;
  const cmdArr = cmd.split(/\s+/);
  if (cmdArr[0] !== 'mount') {
    throw new Error(`script[${id}] must use the mount command`);
  }
  cmdArr.shift();
  const {to, _} = yargs(cmdArr);
  if (_.length !== 1 || (to && to[0] !== '/')) {
    throw new Error(`script[${id}] must use the format: "mount dir [--to /PATH]"`);
  }
  const dirDisk = path.resolve(cwd, cmdArr[0]);
  const dirUrl = to || `/${cmdArr[0]}`;
  return [dirDisk, dirUrl];
}

function getProxyConfig(workerConfig: DevScript): [string, string] {
  const {id, cmd} = workerConfig;
  const cmdArr = cmd.split(/\s+/);
  if (cmdArr[0] !== 'proxy') {
    throw new Error(`script[${id}] must use the proxy command`);
  }
  cmdArr.shift();
  const {to, _} = yargs(cmdArr);
  if (_.length !== 1 || !to || to[0] !== '/') {
    throw new Error(`script[${id}] must use the format: "proxy http://SOME.URL --to /PATH"`);
  }
  return [_[0], to];
}

let currentlyRunningCommand: any = null;

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  console.log(chalk.bold('Snowpack Dev Server (Beta)'));
  console.log('NOTE: Still experimental, default behavior may change.');
  console.log('Starting up...\n');

  const {port} = config.devOptions;
  let inMemoryBuildCache = new Map<string, Buffer>();
  const filesBeingDeleted = new Set<string>();
  const filesBeingBuilt = new Map<string, Promise<string>>();
  const liveReloadClients: http.ServerResponse[] = [];
  const messageBus = new EventEmitter();
  const mountedDirectories: [string, string][] = [];
  const proxyDetails: [string, string][] = [];
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

  function broadcastMessage(channel: string, data: object) {
    for (const client of liveReloadClients) {
      sendMessage(client, channel, JSON.stringify(data));
    }
  }

  async function buildFile(
    fileContents: string,
    fileLoc: string,
    fileBuilder: ((code: string, {filename: string}) => Promise<string>) | undefined,
  ) {
    if (fileBuilder) {
      let fileBuilderPromise = filesBeingBuilt.get(fileLoc);
      if (!fileBuilderPromise) {
        fileBuilderPromise = fileBuilder(fileContents, {filename: fileLoc});
        filesBeingBuilt.set(fileLoc, fileBuilderPromise);
      }
      fileContents = await fileBuilderPromise;
      filesBeingBuilt.delete(fileLoc);
    }
    const ext = path.extname(fileLoc).substr(1);
    if (ext === 'js' || srcFileExtensionMapping[ext] === 'js') {
      fileContents = await transformEsmImports(fileContents, (spec) => {
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
    return fileContents;
  }

  function runLintAll(workerConfig: DevScript) {
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
          messageBus.emit('WORKER_UPDATE', {id, state: 'WATCHING'});
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
      proxyDetails.push(getProxyConfig(workerConfig));
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
        res.writeHead(200, {
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        sendMessage(res, 'connected', 'ready');
        setInterval(sendMessage, 60000, res, 'ping', 'waiting');
        liveReloadClients.push(res);
        req.on('close', () => {
          liveReloadClients.splice(liveReloadClients.indexOf(res), 1);
        });
        return;
      }

      if (reqPath === '/web_modules/@snowpack/hmr.js') {
        sendFile(req, res, HMR_DEV_CODE, '.js');
        return;
      }

      for (const [url, path] of proxyDetails) {
        if (reqPath.startsWith(path)) {
          const newPath = reqPath.substr(path.length);
          try {
            const response = await got(`${url}${newPath}`, {
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
      function attemptLoadFile(requestedFile) {
        attemptedFileLoads.push(requestedFile);
        return fs
          .stat(requestedFile)
          .then((stat) => (stat.isFile() ? requestedFile : null))
          .catch(() => null /* ignore */);
      }

      let requestedFileExt = path.parse(reqPath).ext.toLowerCase();
      let responseFileExt = requestedFileExt;
      let fileBuilder: ((code: string, {filename: string}) => Promise<string>) | undefined;
      let isRoute = false;

      async function getFileFromUrl(reqPath: string): Promise<[string | null, DevScript | null]> {
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
              if (type !== 'build' && type !== 'plugin') {
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
            const fileLoc = await attemptLoadFile(requestedFile);
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
        fileBuilder = getFileBuilderForWorker(cwd, fileLoc, selectedWorker, config, messageBus);
      }

      // 1. Check the hot build cache. If it's already found, then just serve it.
      let hotCachedResponse: string | Buffer | undefined = inMemoryBuildCache.get(fileLoc);
      if (hotCachedResponse) {
        if (isRoute) {
          hotCachedResponse =
            hotCachedResponse.toString() +
            `<script type="module" src="/web_modules/@snowpack/hmr.js"></script>`;
        }
        if (isProxyModule) {
          responseFileExt = '.js';
          hotCachedResponse = wrapEsmProxyResponse(
            reqPath,
            hotCachedResponse.toString(),
            requestedFileExt,
            true,
          );
        }
        if (isCssModule) {
          responseFileExt = '.js';
          hotCachedResponse = await wrapCssModuleResponse(
            reqPath,
            hotCachedResponse.toString(),
            requestedFileExt,
            true,
          );
        }
        sendFile(req, res, hotCachedResponse, responseFileExt);
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
        const {originalFileHash} = cachedBuildData.metadata;
        const newFileHash = etag(fileContents);
        if (originalFileHash === newFileHash) {
          const coldCachedResponse: Buffer = cachedBuildData.data;
          inMemoryBuildCache.set(fileLoc, coldCachedResponse);
          let serverResponse: Buffer | string = coldCachedResponse;
          if (isRoute) {
            serverResponse =
              serverResponse.toString() +
              `<script type="module" src="/web_modules/@snowpack/hmr.js"></script>`;
          }
          if (isProxyModule) {
            responseFileExt = '.js';
            serverResponse = wrapEsmProxyResponse(
              reqPath,
              coldCachedResponse.toString(),
              requestedFileExt,
              true,
            );
          }
          if (isCssModule) {
            responseFileExt = '.js';
            serverResponse = await wrapCssModuleResponse(
              reqPath,
              coldCachedResponse.toString(),
              requestedFileExt,
              true,
            );
          }
          // Trust... but verify.
          sendFile(req, res, serverResponse, responseFileExt);
          let checkFinalBuildAnyway: string | null = null;
          try {
            checkFinalBuildAnyway = await buildFile(fileContents, fileLoc, fileBuilder);
            if (checkFinalBuildAnyway && isProxyModule) {
              checkFinalBuildAnyway = wrapEsmProxyResponse(
                reqPath,
                checkFinalBuildAnyway,
                requestedFileExt,
                true,
              );
            }
            if (checkFinalBuildAnyway && isCssModule) {
              responseFileExt = '.js';
              serverResponse = await wrapCssModuleResponse(
                reqPath,
                checkFinalBuildAnyway,
                requestedFileExt,
                true,
              );
            }
          } catch (err) {
            // safe to ignore, it will be surfaced later anyway
          } finally {
            if (
              !checkFinalBuildAnyway ||
              !coldCachedResponse.equals(
                Buffer.from(checkFinalBuildAnyway, getEncodingType(requestedFileExt)),
              )
            ) {
              inMemoryBuildCache.clear();
              await cacache.rm.all(BUILD_CACHE);
              broadcastMessage('message', {reload: true});
            }
          }
          return;
        }
      }

      // 4. Final option: build the file, serve it, and cache it.
      let finalBuild: string;
      try {
        finalBuild = await buildFile(fileContents, fileLoc, fileBuilder);
      } catch (err) {
        console.error(fileLoc, err);
        return sendError(res, 500);
      }
      inMemoryBuildCache.set(fileLoc, Buffer.from(finalBuild, getEncodingType(requestedFileExt)));
      const originalFileHash = etag(fileContents);
      cacache.put(
        BUILD_CACHE,
        fileLoc,
        Buffer.from(finalBuild, getEncodingType(requestedFileExt)),
        {metadata: {originalFileHash}},
      );
      if (isRoute) {
        finalBuild += `<script type="module" src="/web_modules/@snowpack/hmr.js"></script>`;
      }
      if (isProxyModule) {
        responseFileExt = '.js';
        finalBuild = wrapEsmProxyResponse(reqPath, finalBuild, requestedFileExt, true);
      }
      if (isCssModule) {
        responseFileExt = '.js';
        finalBuild = await wrapCssModuleResponse(reqPath, finalBuild, requestedFileExt, true);
      }
      sendFile(req, res, finalBuild, responseFileExt);
    })
    .listen(port);
  let isLiveReloadPaused = false;
  async function onWatchEvent(fileLoc) {
    const fileUrl = getUrlFromFile(mountedDirectories, fileLoc);
    if (!isLiveReloadPaused) {
      broadcastMessage('message', {url: fileUrl});
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
    for (const client of liveReloadClients) {
      client.end();
    }
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

  await openInBrowser(port);

  return new Promise(() => {});
}

async function openInBrowser(port) {
  const url = `http://localhost:${port}`;
  const args = [url];
  let openCmd = 'xdg-open';
  if (process.platform === 'darwin') {
    // If we're on OS X, we can try opening
    // Chrome with AppleScript. This lets us reuse an
    // existing tab when possible instead of creating a new one.
    try {
      await execa.command('ps cax | grep "Google Chrome"', {
        shell: true,
      });
      await execa('osascript ../assets/openChrome.applescript "' + encodeURI(url) + '"', {
        cwd: __dirname,
        stdio: 'ignore',
        shell: true,
      });
      return true;
    } catch (err) {
      // If OSX auto-reuse doesn't work, just open normally.
      openCmd = 'open';
    }
  }
  if (process.platform === 'win32') {
    openCmd = 'start';
    args.unshift('');
  }
  execa(openCmd, args).catch(() => {
    // couldn't open automatically, safe to ignore
  });
}

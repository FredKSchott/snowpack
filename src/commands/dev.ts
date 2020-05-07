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

import chalk from 'chalk';
import {EventEmitter} from 'events';
import execa from 'execa';
import {promises as fs, existsSync, readdirSync, statSync, watch as fsWatch} from 'fs';
import http from 'http';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import path from 'path';
import url from 'url';
import os from 'os';
import {SnowpackConfig, DevScript} from '../config';
import {paint} from './paint';
import yargs from 'yargs-parser';
import srcFileExtensionMapping from './src-file-extension-mapping';
import {transformEsmImports} from '../rewrite-imports';
import {ImportMap} from '../util';

// const FILE_CACHE = new Map<string, string>();

const LIVE_RELOAD_SNIPPET = `
  <script>
    const source = new EventSource('/livereload');
    const reload = () => location.reload(true);
    source.onmessage = reload;
    source.onerror = () => (source.onopen = reload);
    console.log('[snowpack] listening for file changes');
  </script>
`;

function getEncodingType(ext: string): 'utf8' | 'binary' {
  if (ext === '.js' || ext === '.css' || ext === '.html') {
    return 'utf8';
  } else {
    return 'binary';
  }
}

function watch(fileLoc: string, notify: (event: string, filename: string) => void) {
  if (process.platform !== 'linux') {
    fsWatch(fileLoc, {recursive: true}, notify);
    return;
  }
  // For performance: don't step into node_modules directories
  if (fileLoc.endsWith('node_modules')) {
    return;
  }
  if (statSync(fileLoc).isDirectory()) {
    fsWatch(fileLoc, notify);
  } else {
    readdirSync(fileLoc).forEach((entry) => watch(path.join(fileLoc, entry), notify));
  }
}

const sendFile = (req: http.IncomingMessage, res: http.ServerResponse, body, ext = '.html') => {
  res.writeHead(200, {
    'Content-Type': mime.contentType(ext) || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(body, getEncodingType(ext));
  res.end();
};

const sendRedirect = (res: http.ServerResponse, url: string) => {
  res.writeHead(301, {
    Location: url,
  });
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

interface DevOptions {
  cwd: string;
  config: SnowpackConfig;
}

export async function command({cwd, config}: DevOptions) {
  console.log(chalk.bold('Snowpack Dev Server (Beta)'));
  console.log('NOTE: Still experimental, default behavior may change.');
  console.log('Starting up...');

  const {port} = config.devOptions;
  const fileBuildCache = new Map<string, string>();
  const liveReloadClients: http.ServerResponse[] = [];
  const messageBus = new EventEmitter();
  const serverStart = Date.now();

  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');
  const dependencyImportMap: ImportMap = require(dependencyImportMapLoc);
  const registeredWorkers = Object.entries(config.scripts);
  // const workerDirectories: string[] = [];
  const mountedDirectories: [string, string][] = [];

  for (const [id, workerConfig] of registeredWorkers) {
    if (!id.startsWith('mount:')) {
      continue;
    }
    const cmdArr = workerConfig.cmd.split(/\s+/);
    if (cmdArr[0] !== 'mount') {
      throw new Error(`script[${id}] must use the mount command`);
    }
    cmdArr.shift();
    let dirUrl, dirDisk;
    dirDisk = path.resolve(cwd, cmdArr[0]);
    if (cmdArr.length === 1) {
      dirUrl = cmdArr[0];
    } else {
      const {to} = yargs(cmdArr);
      dirUrl = to;
    }
    mountedDirectories.push([dirDisk, dirUrl]);
    setTimeout(() => messageBus.emit('WORKER_UPDATE', {id, state: ['DONE', 'green']}), 400);
  }

  for (const [id, workerConfig] of registeredWorkers) {
    let {cmd} = workerConfig;

    if (!id.startsWith('lintall:')) {
      continue;
    }
    if (workerConfig.watch) {
      cmd += workerConfig.watch.replace('$1', '');
    }
    // const tempBuildDir = await fs.mkdtemp(path.join(os.tmpdir(), `snowpack-${id}`));
    // workerDirectories.unshift(tempBuildDir);
    // cmd = cmd.replace(/\$DIST/g, tempBuildDir);
    const workerPromise = execa.command(cmd, {env: npmRunPath.env(), extendEnv: true, shell: true});
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

  http
    .createServer(async (req, res) => {
      const reqUrl = req.url!;
      let reqPath = url.parse(reqUrl).pathname!;

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
        return;
      }

      const attemptedFileLoads: string[] = [];
      function attemptLoadFile(requestedFile) {
        attemptedFileLoads.push(requestedFile);
        return fs
          .stat(requestedFile)
          .then((stat) => (stat.isFile() ? requestedFile : null))
          .catch(() => null /* ignore */);
      }

      const resource = decodeURI(reqPath);
      let requestedFileExt = path.parse(resource).ext.toLowerCase();
      let isRoute = false;
      let fileLoc: string | null = null;
      let fileContents: string | null = null;
      let fileBuilder: ((code: string, {filename: string}) => Promise<string>) | undefined;

      // for (const dirDisk of workerDirectories) {
      //   if (fileLoc || !requestedFileExt) {
      //     continue;
      //   }
      //   let requestedFile = path.join(dirDisk, resource.replace(`${config.devOptions.dist}`, ''));
      //   fileLoc = await attemptLoadFile(requestedFile);
      // }

      let selectedWorker: [string, DevScript] | null = null;
      let responseFileExt = requestedFileExt;
      for (const [dirDisk, dirUrl] of mountedDirectories) {
        if (fileLoc) {
          continue;
        }
        let requestedFile: string;
        if (dirUrl === '.') {
          requestedFile = path.join(dirDisk, resource);
        } else if (resource.startsWith('/' + dirUrl)) {
          requestedFile = path.join(dirDisk, resource.replace(dirUrl, '.'));
        } else {
          continue;
        }
        fileLoc = await attemptLoadFile(requestedFile);

        if (requestedFileExt) {
          for (const [id, workerConfig] of registeredWorkers) {
            if (fileLoc || (!id.startsWith('build:') && !id.startsWith('plugin:'))) {
              continue;
            }
            const srcExtMatchers = id.split(':')[1].split(',');
            for (const ext of srcExtMatchers) {
              if (fileLoc) {
                continue;
              }
              if (!srcFileExtensionMapping[ext]) {
                continue;
              }
              if (srcFileExtensionMapping[ext] === requestedFileExt.substr(1)) {
                const srcFile = requestedFile.replace(requestedFileExt, `.${ext}`);
                fileLoc = await attemptLoadFile(srcFile);
                if (fileLoc) {
                  selectedWorker = [id, workerConfig];
                }
              }
            }
          }
          continue;
        }

        fileLoc =
          fileLoc ||
          (await attemptLoadFile(requestedFile + '.html')) ||
          (await attemptLoadFile(requestedFile + '/index.html')) ||
          (await attemptLoadFile(requestedFile + 'index.html'));

        if (!fileLoc && dirUrl === '.' && config.devOptions.fallback) {
          const fallbackFile =
            dirUrl === '.'
              ? path.join(dirDisk, config.devOptions.fallback)
              : path.join(cwd, config.devOptions.fallback);
          fileLoc = await attemptLoadFile(fallbackFile);
        }
        if (fileLoc) {
          responseFileExt = '.html';
          isRoute = true;
        }
      }

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
        const [id, {cmd}] = selectedWorker;
        if (id.startsWith('plugin:')) {
          const modulePath = require.resolve(cmd, {paths: [cwd]});
          const {build} = require(modulePath);
          fileBuilder = async (code: string, options: {filename: string}) => {
            messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
            try {
              let {result} = await build(fileLoc);
              return result;
            } catch (err) {
              err.message = `[${id}] ${err.message}`;
              console.error(err);
              return '';
            } finally {
              messageBus.emit('WORKER_UPDATE', {id, state: null});
            }
          };
        }
        if (id.startsWith('build:')) {
          fileBuilder = async (code: string, options: {filename: string}) => {
            messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
            let cmdWithFile = cmd.replace('$FILE', options.filename);
            const {stdout, stderr} = await execa.command(cmdWithFile, {
              env: npmRunPath.env(),
              extendEnv: true,
              shell: true,
              input: code,
            });
            if (stderr) {
              console.error(stderr);
            }
            messageBus.emit('WORKER_UPDATE', {id, state: null});
            return stdout;
          };
        }
      }

      fileContents = fileBuildCache.get(fileLoc) || null;
      if (!fileContents) {
        try {
          fileContents = await fs.readFile(fileLoc, getEncodingType(requestedFileExt));
          if (fileBuilder) {
            fileContents = await fileBuilder(fileContents, {filename: fileLoc});
          }
          if (isRoute) {
            fileContents += LIVE_RELOAD_SNIPPET;
          }
          if (requestedFileExt === '.js') {
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
                if ((extToReplace || ext) !== 'js') {
                  spec = spec + '?snowpack-esm-proxy';
                }
                return spec;
              }
              if (dependencyImportMap.imports[spec]) {
                return path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
              }
              messageBus.emit('MISSING_WEB_MODULE', {specifier: spec});
              return `/web_modules/${spec}.js`;
            });
          }
        } catch (err) {
          console.error(fileLoc, err);
          return sendError(res, 500);
        }
      }
      fileBuildCache.set(fileLoc, fileContents);

      if (req.url?.includes('?snowpack-esm-proxy')) {
        responseFileExt = '.js';
        if (requestedFileExt === '.css') {
          fileContents = `
            const styleEl = document.createElement("style");
            styleEl.type = 'text/css';
            styleEl.appendChild(document.createTextNode(${JSON.stringify(fileContents)}));
            document.head.appendChild(styleEl);
          `;
        } else {
          fileContents = `export default ${JSON.stringify(reqPath)};`;
        }
      }

      sendFile(req, res, fileContents, responseFileExt);
    })
    .listen(port);

  async function onWatchEvent(event, fileLoc) {
    while (liveReloadClients.length > 0) {
      sendMessage(liveReloadClients.pop(), 'message', 'reload');
    }
    fileBuildCache.delete(fileLoc);
    // let requestId = fileLoc;
    // if (requestId.startsWith(cwd)) {
    //   requestId = requestId.replace(/\.(js|ts|jsx|tsx)$/, '.js');
    // }
    // FILE_CACHE.delete(requestId);
    // if (babelFileErrors.has(fileLoc)) {
    //   const fileContents = await fs.readFile(fileLoc, 'utf-8').catch((err) => null /* ignore */);
    //   if (!fileContents) {
    //     babelFileErrors.delete(fileLoc);
    //   } else {
    //     buildBabelFile(fileLoc, fileContents);
    //   }
    // }
  }

  for (const [dirDisk] of mountedDirectories) {
    watch(dirDisk, (event, partialFileName) =>
      onWatchEvent(event, path.resolve(dirDisk, partialFileName)),
    );
  }

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
  paint(messageBus, registeredWorkers, undefined, {
    port,
    ips,
    startTimeMs: Date.now() - serverStart,
  });

  openInBrowser(port);

  return new Promise(() => {});
}

function openInBrowser(port) {
  const url = `http://localhost:${port}`;

  let openCmd = 'xdg-open';
  if (process.platform === 'darwin') openCmd = 'open';
  if (process.platform === 'win32') openCmd = 'start';

  execa(openCmd, [url]).catch(() => {
    // couldn't open automatically, safe to ignore
  });
}

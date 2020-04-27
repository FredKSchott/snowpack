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
import {promises as fs, readdirSync, statSync, watch as fsWatch} from 'fs';
import http from 'http';
import mime from 'mime-types';
import npmRunPath from 'npm-run-path';
import path from 'path';
import url from 'url';
import os from 'os';
import {SnowpackConfig, DevScript} from '../config';
import {paint} from './paint';
import yargs from 'yargs-parser';

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

const sendFile = (res, file, ext = '.html') => {
  res.writeHead(200, {
    'Content-Type': mime.contentType(ext) || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(file, getEncodingType(ext));
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

function exitWithInvalidBabelConfiguration() {
  console.log(chalk.bold.red('⚠️  Valid Babel configuration could not be found!'));
  console.log(`To continue, create a "babel.config.json" file and include the Snowpack plugin:

{
  "plugins": [
    ["snowpack/assets/babel-plugin.js"]
  ]
}
`);
  process.exit(1);
}

interface DevOptions {
  cwd: string;
  port: number;
  config: SnowpackConfig;
}

export async function command({cwd, port, config}: DevOptions) {
  console.log(chalk.bold('☶ Snowpack Dev Server (Beta)'));
  console.log('NOTE: Still experimental, default behavior may change.');
  console.log('Starting up...');

  const liveReloadClients: http.ServerResponse[] = [];
  const messageBus = new EventEmitter();

  // const {dest: webModulesLoc} = config.installOptions;
  // const babelUserConfig = babel.loadPartialConfig({cwd}) || {options: {}};
  // const hasBabelUserConfig = !!babelUserConfig.options.babelrc || !!babelUserConfig.config;
  // const babelConfig = hasBabelUserConfig && babelUserConfig.options;
  // const babelFileErrors = new Map<string, Error>();
  // const hasTypeScriptConfig = existsSync(path.resolve(cwd, 'tsconfig.json'));

  // async function buildBabelFile(fileLoc, fileContents) {
  //   try {
  //     messageBus.emit('BABEL_START', {file: fileLoc});
  //     const result = await babel.transformAsync(fileContents, {
  //       ...babelConfig,
  //       filename: fileLoc,
  //     });
  //     babelFileErrors.delete(fileLoc);
  //     messageBus.emit('BABEL_FINISH', {file: fileLoc, result});
  //     return [null, result];
  //   } catch (err) {
  //     babelFileErrors.set(fileLoc, err);
  //     messageBus.emit('BABEL_ERROR', {file: fileLoc, err});
  //     return [err];
  //   }
  // }

  // TODO: Support a default Babel config if none is found.
  // if (!babelConfig || !babelConfig.plugins) {
  //   exitWithInvalidBabelConfiguration();
  //   return;
  // }
  // const hasSnowpackBabelPlugin = !!babelConfig.plugins.find((p: any) => {
  //   if (p.file) {
  //     return p.file.request === 'snowpack/assets/babel-plugin.js';
  //   }
  //   if (p.name) {
  //     return p.name === 'snowpack/assets/babel-plugin.js';
  //   }
  //   return false;
  // });
  // const hasJsxBabelPlugin = !!babelConfig.plugins.find((p: any) => {
  //   if (p.file) {
  //     return p.file.request === '@babel/plugin-syntax-jsx';
  //   }
  //   if (p.name) {
  //     return p.name === '@babel/plugin-syntax-jsx';
  //   }
  //   return false;
  // });
  // if (!hasSnowpackBabelPlugin || !hasJsxBabelPlugin) {
  //   exitWithInvalidBabelConfiguration();
  //   return;
  // }

  // const snowpackInstallPromise = execa(require.resolve('./index.bin.js'), []);
  // snowpackInstallPromise.stdout!.pipe(process.stdout);
  // snowpackInstallPromise.stderr!.pipe(process.stderr);
  // await snowpackInstallPromise;
  // spin up a web server, serve each file from our cache
  const registeredWorkers = Object.entries(config.scripts);

  // .filter(([id, workerConfig]) => {
  //   return id.startsWith('build') || workerConfig.watch;
  // })
  // .sort((a, b) => {
  //   const categoryA = a[0].split(':')[0];
  //   const categoryB = b[0].split(':')[0];
  //   if (categoryA !== categoryB) {
  //     return categoryA.localeCompare(categoryB);
  //   }
  //   if (a[1].watch && !b[1].watch) {
  //     return 1;
  //   }
  //   if (b[1].watch && a[1].watch) {
  //     return -1;
  //   }
  //   return a[0].localeCompare(b[0]);
  // });

  // - add config value for "src"
  // - add config value for "/_dist_/"
  // - dev: mount src to _dist_

  // build: attach to server handler
  // buildall: start workers
  // server handler:
  //   - if /_dist_/ & file extension, check build:* workers for a match
  //     - if match, read from src/*, pipe into worker, return output
  //     - otherwise, check each DEST on disk
  //     - otherwise, check src/ on disk
  //     - otherwise, 404
  //   - if not /_dist_/, check each mounted directory
  //     - otherwise, 404
  //
  const workerDirectories: string[] = [];
  const mountedDirectories: [string, string][] = [];

  for (const [id, workerConfig] of registeredWorkers) {
    if (!id.startsWith('mount:')) {
      continue;
    }

    const cmdArr = workerConfig.cmd.split(/\s+/);
    if (cmdArr[0] !== 'mount') {
      throw new Error(`script[${id}] must use the mount command`);
    }
    cmdArr.unshift();
    let dirUrl, dirDisk;
    if (cmdArr.length === 1) {
      dirDisk = path.resolve(cwd, cmdArr[0]);
      dirUrl = cmdArr[0];
    } else {
      const {from, to} = yargs(cmdArr);
      dirDisk = path.resolve(cwd, from);
      dirUrl = to;
    }
    mountedDirectories.push([dirDisk, dirUrl]);
    setTimeout(() => messageBus.emit('WORKER_UPDATE', {id, state: ['DONE', 'green']}), 400);
  }

  for (const [id, workerConfig] of registeredWorkers) {
    let {cmd} = workerConfig;

    if (!id.startsWith('buildall:') && !id.startsWith('lintall:')) {
      continue;
    }
    if (workerConfig.watch) {
      cmd += workerConfig.watch.replace('$1', '');
    }
    const tempBuildDir = await fs.mkdtemp(path.join(os.tmpdir(), `snowpack-${id}`));
    workerDirectories.unshift(tempBuildDir);
    cmd = cmd.replace(/\$DIST/g, tempBuildDir);
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

      // let isSrc = false;

      // for (const {src: pathSrc, dest: pathDest} of mount) {
      //   if (new RegExp(pathSrc).test(reqPath)) {
      //     requestedFile = path.join(cwd, resource);
      //     isSrc = true;
      //     if (pathDest) {
      //       requestedFile = path.resolve(cwd, resource.replace(new RegExp(pathSrc), pathDest));
      //     }
      //   }
      // }

      // if (FILE_CACHE.has(requestedFile)) {
      //   sendFile(res, FILE_CACHE.get(requestedFile), requestedFileExt);
      //   return;
      // }

      const resource = decodeURI(reqPath);
      let requestedFileExt = path.parse(resource).ext.toLowerCase();
      let isRoute = false;
      let fileLoc: string | null = null;
      let fileContents: string | null = null;
      let fileBuilder: ((code: string) => Promise<string>) | undefined;

      for (const [id, workerConfig] of registeredWorkers) {
        if (
          fileLoc ||
          !resource.startsWith(config.dev.dist) ||
          !requestedFileExt ||
          !id.startsWith('build:')
        ) {
          continue;
        }
        const srcExtMatchers =
          id.split('::').length > 1 ? id.split('::')[1].split(',') : id.split(':')[1].split(',');
        const destExtMatcher = id.split(':')[1];
        if (destExtMatcher !== requestedFileExt.substr(1)) {
          continue;
        }

        const {cmd} = workerConfig;
        let requestedFile = path.join(config.dev.src, resource.replace(`${config.dev.dist}`, ''));
        for (const ext of srcExtMatchers) {
          fileLoc =
            fileLoc ||
            (await fs
              .stat(requestedFile.replace(requestedFileExt, `.${ext}`))
              .then(() => requestedFile.replace(requestedFileExt, `.${ext}`))
              .catch(() => null /* ignore */));
        }

        fileBuilder = async (code: string) => {
          const {stdout, stderr} = await execa.command(cmd, {
            env: npmRunPath.env(),
            extendEnv: true,
            shell: true,
            input: code,
          });
          if (stderr) {
            const missingWebModuleRegex = /warn\: bare import "(.*?)" not found in import map\, ignoring\.\.\./m;
            const missingWebModuleMatch = stderr.match(missingWebModuleRegex);
            if (missingWebModuleMatch) {
              messageBus.emit('MISSING_WEB_MODULE', {specifier: missingWebModuleMatch[1]});
            }
            console.error(stderr);
          }
          return stdout;
        };
      }

      for (const dirDisk of workerDirectories) {
        if (fileLoc || !requestedFileExt || !resource.startsWith(config.dev.dist)) {
          continue;
        }
        let requestedFile = path.join(dirDisk, resource.replace(`${config.dev.dist}`, ''));
        fileLoc = await fs
          .stat(requestedFile)
          .then((stat) => (stat.isFile() ? requestedFile : null))
          .catch(() => null /* ignore */);
      }

      for (const [dirDisk, dirUrl] of mountedDirectories) {
        if (fileLoc) {
          continue;
        }
        if (resource.startsWith(config.dev.dist)) {
          continue;
        }
        let requestedFile: string;
        if (dirUrl === '/') {
          requestedFile = path.join(dirDisk, resource);
        } else if (resource.startsWith(dirUrl)) {
          requestedFile = path.join(dirDisk, resource.replace(dirUrl, '/'));
        } else {
          continue;
        }
        fileLoc =
          fileLoc ||
          (await fs
            .stat(requestedFile)
            .then((stat) => (stat.isFile() ? requestedFile : null))
            .catch(() => null /* ignore */));

        if (requestedFileExt) {
          continue;
        }

        fileLoc =
          fileLoc ||
          (await fs
            .stat(requestedFile + '.html')
            .then(() => requestedFile + '.html')
            .catch(() => null /* ignore */)) ||
          (await fs
            .stat(requestedFile + '/index.html')
            .then(() => requestedFile + '/index.html')
            .catch(() => null /* ignore */)) ||
          (await fs
            .stat(requestedFile + 'index.html')
            .then(() => requestedFile + 'index.html')
            .catch(() => null /* ignore */));

        if (!fileLoc && config.dev.fallback) {
          const fallbackFile =
            dirUrl === '/'
              ? path.join(dirDisk, config.dev.fallback)
              : path.join(cwd, config.dev.fallback);
          fileLoc =
            (await fs
              .stat(fallbackFile)
              .then((stat) => (stat.isFile() ? fallbackFile : null))
              .catch(() => null /* ignore */)) || null;
        }
        if (fileLoc) {
          requestedFileExt = '.html';
          isRoute = true;
        }
      }

      // if (!fileLoc && isSrc) {
      //   fileLoc =
      //     fileLoc ||
      //     (await fs
      //       .stat(requestedFile.replace(/\.js$/, '.ts'))
      //       .then(() => requestedFile.replace(/\.js$/, '.ts'))
      //       .catch(() => null /* ignore */)) ||
      //     (await fs
      //       .stat(requestedFile.replace(/\.js$/, '.jsx'))
      //       .then(() => requestedFile.replace(/\.js$/, '.jsx'))
      //       .catch(() => null /* ignore */)) ||
      //     (await fs
      //       .stat(requestedFile.replace(/\.js$/, '.tsx'))
      //       .then(() => requestedFile.replace(/\.js$/, '.tsx'))
      //       .catch(() => null /* ignore */));
      // }
      // if (!fileLoc && !requestedFileExt) {

      if (!fileLoc) {
        return sendError(res, 404);
      }

      try {
        fileContents = await fs.readFile(fileLoc, getEncodingType(requestedFileExt));
        if (fileBuilder) {
          fileContents = await fileBuilder(fileContents);
        }
      } catch (err) {
        console.error(fileLoc, err);
        return sendError(res, 500);
      }

      if (!fileContents) {
        return sendError(res, 404);
      }

      if (isRoute) {
        fileContents = fileContents + LIVE_RELOAD_SNIPPET;
        messageBus.emit('NEW_SESSION');
      }

      // let responseContents = fileContents;
      // if (requestedFileExt === '.js' && !fileLoc.includes('/web_modules/')) {
      //   const [babelErr, babelResult] = await buildBabelFile(fileLoc, fileContents);
      //   if (babelErr || !babelResult.code) {
      //     return sendError(res, 500);
      //   }
      //   responseContents = babelResult.code;
      // }

      // FILE_CACHE.set(fileLoc, responseContents);
      sendFile(res, fileContents, requestedFileExt);
    })
    .listen(port);

  async function onWatchEvent(event, fileLoc) {
    while (liveReloadClients.length > 0) {
      sendMessage(liveReloadClients.pop(), 'message', 'reload');
    }
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

  watch(cwd, onWatchEvent);

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

  paint(messageBus, registeredWorkers, true);
  return new Promise(() => {});
}

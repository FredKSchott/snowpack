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
import detectPort from 'detect-port';
import execa from 'execa';
import {promises as fs} from 'fs';
import http from 'http';
import http2 from 'http2';
import HttpProxy from 'http-proxy';
import npmRunPath from 'npm-run-path';
import path from 'path';
import os from 'os';
import onProcessExit from 'signal-exit';
import {
  BUILD_CACHE,
  CommandOptions,
  DEV_DEPENDENCIES_DIR,
  isYarn,
  openInBrowser,
  updateLockfileHash,
} from '../util';
import {command as installCommand} from './install';
import {paint} from './paint';
import sendError from '../middleware/send-error';
import snowpack from '../middleware/index';
import shouldProxy from '../middleware/should-proxy';

const DEFAULT_PROXY_ERROR_HANDLER = (
  err: Error,
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => {
  const reqUrl = req.url!;
  console.error(`✘ ${reqUrl}\n${err.message}`);
  sendError(res, 502);
};

export async function command(commandOptions: CommandOptions) {
  let serverStart = Date.now();
  const {cwd, config} = commandOptions;
  const {port, open} = config.devOptions;

  // Check whether the port is available
  const availablePort = await detectPort(port);
  const isPortAvailable = port === availablePort;

  if (!isPortAvailable) {
    console.error();
    console.error(
      chalk.red(
        `  ✘ port ${chalk.bold(port)} is not available. use ${chalk.bold(
          '--port',
        )} to specify a different port.`,
      ),
    );
    console.error();
    process.exit(1);
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

  const {context, middleware, hmr} = await snowpack({
    commandOptions,
    devProxies,
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

  const server = createServer(middleware)
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

  const {currentlyRunningCommand, messageBus} = context;
  const {inMemoryBuildCache} = context.cache;
  const {hmrEngine, watcher} = hmr(server);

  onProcessExit(() => {
    hmrEngine.disconnectAllClients();
    watcher.close();
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
      context.isLiveReloadPaused = true;
      messageBus.emit('INSTALLING');
      context.currentlyRunningCommand = execa(
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
      context.currentlyRunningCommand = installCommand(commandOptions);
      await currentlyRunningCommand;
      await updateLockfileHash(DEV_DEPENDENCIES_DIR);
      await cacache.rm.all(BUILD_CACHE);
      inMemoryBuildCache.clear();
      context.currentlyRunningCommand = null;

      context.dependencyImportMap = JSON.parse(
        await fs
          .readFile(context.dependencyImportMapLoc, {encoding: 'utf-8'})
          .catch(() => `{"imports": {}}`),
      );
      messageBus.emit('INSTALL_COMPLETE');
      context.isLiveReloadPaused = false;
    },
  });

  if (open !== 'none') await openInBrowser(protocol, port, open);
  return new Promise(() => {});
}

import chalk from 'chalk';
import {EventEmitter} from 'events';
import {existsSync, promises as fs} from 'fs';
import http from 'http';
import http2 from 'http2';
import HttpProxy from 'http-proxy';
import path from 'path';

import {command as installCommand} from '../commands/install';
import {
  CommandOptions,
  DEV_DEPENDENCIES_DIR,
  checkLockfileHash,
  updateLockfileHash,
  ImportMap,
} from '../util';
import runLintAll from './run-lint-all';
import {getMountedDirectory} from '../files';

import createCache, {MiddlewareCache} from './cache';
import {EsmHmrEngine} from '../hmr-server-engine';
import hmr, {MiddlewareHmr} from './hmr';
import requestListener from './request-listener';

export interface MiddlewareBuildOptions {
  commandOptions: CommandOptions;
  devProxies?: {[pathPrefix: string]: HttpProxy};
}

export interface MiddlewareContext {
  cache: MiddlewareCache;
  commandOptions: CommandOptions;
  currentlyRunningCommand: any; // TODO: Create command interface
  dependencyImportMap: ImportMap;
  dependencyImportMapLoc: string;
  hmrEngine?: EsmHmrEngine;
  isLiveReloadPaused: boolean;
  messageBus: EventEmitter;
  mountedDirectories: [string, string][];
}

interface SnowpackMiddleWare {
  context: MiddlewareContext;
  middleware: http.RequestListener;
  hmr: (server: http.Server | http2.Http2Server) => MiddlewareHmr;
}

export default async function build({
  commandOptions,
  devProxies,
}: MiddlewareBuildOptions): Promise<SnowpackMiddleWare> {
  const {config, cwd} = commandOptions;

  const cache = createCache();
  const messageBus = new EventEmitter();
  const mountedDirectories: [string, string][] = [];

  let currentlyRunningCommand: any = null;
  // Live Reload + File System Watching
  let isLiveReloadPaused: boolean = false;

  // Set the proper install options, in case an install is needed.
  config.installOptions.dest = DEV_DEPENDENCIES_DIR;
  config.installOptions.env.NODE_ENV = process.env.NODE_ENV || 'development';
  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');

  // Start with a fresh install of your dependencies, if needed.
  if (!(await checkLockfileHash(DEV_DEPENDENCIES_DIR)) || !existsSync(dependencyImportMapLoc)) {
    console.log(chalk.yellow('! updating dependencies...'));
    await installCommand(commandOptions);
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

  // create middleware context
  const context: MiddlewareContext = {
    cache,
    commandOptions,
    currentlyRunningCommand,
    dependencyImportMap,
    dependencyImportMapLoc,
    isLiveReloadPaused,
    messageBus,
    mountedDirectories,
  };

  for (const workerConfig of config.scripts) {
    if (workerConfig.type === 'run') {
      runLintAll({context, workerConfig});
    }
    if (workerConfig.type === 'mount') {
      mountedDirectories.push(getMountedDirectory(cwd, workerConfig));
      setTimeout(
        () => messageBus?.emit('WORKER_UPDATE', {id: workerConfig.id, state: ['DONE', 'green']}),
        400,
      );
    }
  }

  const middleware = requestListener({context, devProxies});

  return {context, middleware, hmr: (server) => hmr({context, server})};
}

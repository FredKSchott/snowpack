import chalk from 'chalk';
import {EventEmitter} from 'events';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import path from 'path';
import {SnowpackConfig, DevScript} from '../config';
import {paint} from './paint';
const {copy} = require('fs-extra');

interface DevOptions {
  cwd: string;
  config: SnowpackConfig;
}

export async function command({cwd, config}: DevOptions) {
  console.log(chalk.bold('☶ Snowpack Build'));
  console.log('NOTE: Still experimental, default behavior may change.');

  const messageBus = new EventEmitter();
  const registeredWorkers = Object.entries(config.scripts);

  const buildDirectoryLoc = path.resolve(cwd, config.dev.dest);
  const mountWorkers: [string, DevScript][] = [];
  for (const [dirDisk, dirUrl] of config.dev.mount) {
    const id = `mount:${path.relative(cwd, dirDisk)}`;
    const destinationFile =
      dirUrl === '.' ? path.join(buildDirectoryLoc, dirUrl) : path.join(buildDirectoryLoc, dirUrl);
    const copyMountPromise = copy(dirDisk, destinationFile);
    copyMountPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    copyMountPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    });
    mountWorkers.push([id, {cmd: 'NA', watch: undefined}]);
  }

  for (const [id, workerConfig] of registeredWorkers) {
    let {cmd} = workerConfig;
    cmd = cmd.replace(/\$DEST/g, config.dev.dest);
    const workerPromise = execa.command(cmd, {env: npmRunPath.env(), shell: true});
    workerPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    workerPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
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
  }

  paint(messageBus, [...mountWorkers, ...registeredWorkers], false);
  return new Promise(() => {});
}

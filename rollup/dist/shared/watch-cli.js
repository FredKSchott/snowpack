/*
  @license
	Rollup.js v2.34.2
	Sun, 06 Dec 2020 05:40:46 GMT - commit 92a2dfa8f18350373aa2329dec45e56bd076909d


	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

var cli = require('../bin/rollup');
var rollup = require('./rollup.js');
require('util');
var fs = require('fs');
require('path');
require('./mergeOptions.js');
var loadConfigFile_js = require('./loadConfigFile.js');
require('crypto');
var require$$0 = require('events');
require('module');
require('url');
var index = require('./index.js');
require('stream');
require('os');
var assert = require('assert');

var timeZone = date => {
	const offset = (date || new Date()).getTimezoneOffset();
	const absOffset = Math.abs(offset);
	const hours = Math.floor(absOffset / 60);
	const minutes = absOffset % 60;
	const minutesOut = minutes > 0 ? ':' + ('0' + minutes).slice(-2) : '';

	return (offset < 0 ? '+' : '-') + hours + minutesOut;
};

const dateTime = options => {
	options = Object.assign({
		date: new Date(),
		local: true,
		showTimeZone: false,
		showMilliseconds: false
	}, options);

	let {date} = options;

	if (options.local) {
		// Offset the date so it will return the correct value when getting the ISO string
		date = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
	}

	let end = '';

	if (options.showTimeZone) {
		end = ' UTC' + (options.local ? timeZone(date) : '');
	}

	if (options.showMilliseconds && date.getUTCMilliseconds() > 0) {
		end = ` ${date.getUTCMilliseconds()}ms${end}`;
	}

	return date
		.toISOString()
		.replace(/T/, ' ')
		.replace(/\..+/, end);
};

var dateTime_1 = dateTime;
// TODO: Remove this for the next major release
var _default = dateTime;
dateTime_1.default = _default;

var signals = rollup.createCommonjsModule(function (module) {
// This is not the set of all possible signals.
//
// It IS, however, the set of all signals that trigger
// an exit on either Linux or BSD systems.  Linux is a
// superset of the signal names supported on BSD, and
// the unknown signals just fail to register, so we can
// catch that easily enough.
//
// Don't bother with SIGKILL.  It's uncatchable, which
// means that we can't fire any callbacks anyway.
//
// If a user does happen to register a handler on a non-
// fatal signal like SIGWINCH or something, and then
// exit, it'll end up firing `process.emit('exit')`, so
// the handler will be fired anyway.
//
// SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
// artificially, inherently leave the process in a
// state from which it is not safe to try and enter JS
// listeners.
module.exports = [
  'SIGABRT',
  'SIGALRM',
  'SIGHUP',
  'SIGINT',
  'SIGTERM'
];

if (process.platform !== 'win32') {
  module.exports.push(
    'SIGVTALRM',
    'SIGXCPU',
    'SIGXFSZ',
    'SIGUSR2',
    'SIGTRAP',
    'SIGSYS',
    'SIGQUIT',
    'SIGIOT'
    // should detect profiler and enable/disable accordingly.
    // see #21
    // 'SIGPROF'
  );
}

if (process.platform === 'linux') {
  module.exports.push(
    'SIGIO',
    'SIGPOLL',
    'SIGPWR',
    'SIGSTKFLT',
    'SIGUNUSED'
  );
}
});

// Note: since nyc uses this module to output coverage, any lines
// that are in the direct sync flow of nyc's outputCoverage are
// ignored, since we can never get coverage for them.

var signals$1 = signals;
var isWin = /^win/i.test(process.platform);

var EE = require$$0;
/* istanbul ignore if */
if (typeof EE !== 'function') {
  EE = EE.EventEmitter;
}

var emitter;
if (process.__signal_exit_emitter__) {
  emitter = process.__signal_exit_emitter__;
} else {
  emitter = process.__signal_exit_emitter__ = new EE();
  emitter.count = 0;
  emitter.emitted = {};
}

// Because this emitter is a global, we have to check to see if a
// previous version of this library failed to enable infinite listeners.
// I know what you're about to say.  But literally everything about
// signal-exit is a compromise with evil.  Get used to it.
if (!emitter.infinite) {
  emitter.setMaxListeners(Infinity);
  emitter.infinite = true;
}

var signalExit = function (cb, opts) {
  assert.equal(typeof cb, 'function', 'a callback must be provided for exit handler');

  if (loaded === false) {
    load();
  }

  var ev = 'exit';
  if (opts && opts.alwaysLast) {
    ev = 'afterexit';
  }

  var remove = function () {
    emitter.removeListener(ev, cb);
    if (emitter.listeners('exit').length === 0 &&
        emitter.listeners('afterexit').length === 0) {
      unload();
    }
  };
  emitter.on(ev, cb);

  return remove
};

var unload_1 = unload;
function unload () {
  if (!loaded) {
    return
  }
  loaded = false;

  signals$1.forEach(function (sig) {
    try {
      process.removeListener(sig, sigListeners[sig]);
    } catch (er) {}
  });
  process.emit = originalProcessEmit;
  process.reallyExit = originalProcessReallyExit;
  emitter.count -= 1;
}

function emit (event, code, signal) {
  if (emitter.emitted[event]) {
    return
  }
  emitter.emitted[event] = true;
  emitter.emit(event, code, signal);
}

// { <signal>: <listener fn>, ... }
var sigListeners = {};
signals$1.forEach(function (sig) {
  sigListeners[sig] = function listener () {
    // If there are no other listeners, an exit is coming!
    // Simplest way: remove us and then re-send the signal.
    // We know that this will kill the process, so we can
    // safely emit now.
    var listeners = process.listeners(sig);
    if (listeners.length === emitter.count) {
      unload();
      emit('exit', null, sig);
      /* istanbul ignore next */
      emit('afterexit', null, sig);
      /* istanbul ignore next */
      if (isWin && sig === 'SIGHUP') {
        // "SIGHUP" throws an `ENOSYS` error on Windows,
        // so use a supported signal instead
        sig = 'SIGINT';
      }
      process.kill(process.pid, sig);
    }
  };
});

var signals_1 = function () {
  return signals$1
};

var load_1 = load;

var loaded = false;

function load () {
  if (loaded) {
    return
  }
  loaded = true;

  // This is the number of onSignalExit's that are in play.
  // It's important so that we can count the correct number of
  // listeners on signals, and don't wait for the other one to
  // handle it instead of us.
  emitter.count += 1;

  signals$1 = signals$1.filter(function (sig) {
    try {
      process.on(sig, sigListeners[sig]);
      return true
    } catch (er) {
      return false
    }
  });

  process.emit = processEmit;
  process.reallyExit = processReallyExit;
}

var originalProcessReallyExit = process.reallyExit;
function processReallyExit (code) {
  process.exitCode = code || 0;
  emit('exit', process.exitCode, null);
  /* istanbul ignore next */
  emit('afterexit', process.exitCode, null);
  /* istanbul ignore next */
  originalProcessReallyExit.call(process, process.exitCode);
}

var originalProcessEmit = process.emit;
function processEmit (ev, arg) {
  if (ev === 'exit') {
    if (arg !== undefined) {
      process.exitCode = arg;
    }
    var ret = originalProcessEmit.apply(this, arguments);
    emit('exit', process.exitCode, null);
    /* istanbul ignore next */
    emit('afterexit', process.exitCode, null);
    return ret
  } else {
    return originalProcessEmit.apply(this, arguments)
  }
}
signalExit.unload = unload_1;
signalExit.signals = signals_1;
signalExit.load = load_1;

const CLEAR_SCREEN = '\u001Bc';
function getResetScreen(configs, allowClearScreen) {
    let clearScreen = allowClearScreen;
    for (const config of configs) {
        if (config.watch && config.watch.clearScreen === false) {
            clearScreen = false;
        }
    }
    if (clearScreen) {
        return (heading) => loadConfigFile_js.stderr(CLEAR_SCREEN + heading);
    }
    let firstRun = true;
    return (heading) => {
        if (firstRun) {
            loadConfigFile_js.stderr(heading);
            firstRun = false;
        }
    };
}

async function watch(command) {
    process.env.ROLLUP_WATCH = 'true';
    const isTTY = process.stderr.isTTY;
    const silent = command.silent;
    let configs;
    let warnings;
    let watcher;
    let configWatcher;
    const configFile = command.config ? cli.getConfigPath(command.config) : null;
    signalExit(close);
    process.on('uncaughtException', close);
    if (!process.stdin.isTTY) {
        process.stdin.on('end', close);
        process.stdin.resume();
    }
    if (configFile) {
        let reloadingConfig = false;
        let aborted = false;
        let configFileData = null;
        configWatcher = index.chokidar.watch(configFile).on('change', () => reloadConfigFile());
        await reloadConfigFile();
        async function reloadConfigFile() {
            try {
                const newConfigFileData = fs.readFileSync(configFile, 'utf-8');
                if (newConfigFileData === configFileData) {
                    return;
                }
                if (reloadingConfig) {
                    aborted = true;
                    return;
                }
                if (configFileData) {
                    loadConfigFile_js.stderr(`\nReloading updated config...`);
                }
                configFileData = newConfigFileData;
                reloadingConfig = true;
                ({ options: configs, warnings } = await loadConfigFile_js.loadAndParseConfigFile(configFile, command));
                reloadingConfig = false;
                if (aborted) {
                    aborted = false;
                    reloadConfigFile();
                }
                else {
                    if (watcher) {
                        watcher.close();
                    }
                    start(configs);
                }
            }
            catch (err) {
                configs = [];
                reloadingConfig = false;
                loadConfigFile_js.handleError(err, true);
            }
        }
    }
    else {
        ({ options: configs, warnings } = await cli.loadConfigFromCommand(command));
        start(configs);
    }
    // tslint:disable-next-line:no-unnecessary-type-assertion
    const resetScreen = getResetScreen(configs, isTTY);
    function start(configs) {
        try {
            watcher = rollup.watch(configs);
        }
        catch (err) {
            return loadConfigFile_js.handleError(err);
        }
        watcher.on('event', event => {
            switch (event.code) {
                case 'ERROR':
                    warnings.flush();
                    loadConfigFile_js.handleError(event.error, true);
                    break;
                case 'START':
                    if (!silent) {
                        resetScreen(loadConfigFile_js.underline(`rollup v${rollup.version}`));
                    }
                    break;
                case 'BUNDLE_START':
                    if (!silent) {
                        let input = event.input;
                        if (typeof input !== 'string') {
                            input = Array.isArray(input)
                                ? input.join(', ')
                                : Object.keys(input)
                                    .map(key => input[key])
                                    .join(', ');
                        }
                        loadConfigFile_js.stderr(loadConfigFile_js.cyan(`bundles ${loadConfigFile_js.bold(input)} → ${loadConfigFile_js.bold(event.output.map(rollup.relativeId).join(', '))}...`));
                    }
                    break;
                case 'BUNDLE_END':
                    warnings.flush();
                    if (!silent)
                        loadConfigFile_js.stderr(loadConfigFile_js.green(`created ${loadConfigFile_js.bold(event.output.map(rollup.relativeId).join(', '))} in ${loadConfigFile_js.bold(cli.prettyMs(event.duration))}`));
                    if (event.result && event.result.getTimings) {
                        cli.printTimings(event.result.getTimings());
                    }
                    break;
                case 'END':
                    if (!silent && isTTY) {
                        loadConfigFile_js.stderr(`\n[${dateTime_1()}] waiting for changes...`);
                    }
            }
        });
    }
    function close(code) {
        process.removeListener('uncaughtException', close);
        // removing a non-existent listener is a no-op
        process.stdin.removeListener('end', close);
        if (watcher)
            watcher.close();
        if (configWatcher)
            configWatcher.close();
        if (code) {
            process.exit(code);
        }
    }
}

exports.watch = watch;
//# sourceMappingURL=watch-cli.js.map

/*
  @license
	Rollup.js v2.34.2
	Sun, 06 Dec 2020 05:40:46 GMT - commit 92a2dfa8f18350373aa2329dec45e56bd076909d


	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

var rollup = require('./rollup.js');
var fs = require('fs');
var sysPath = require('path');
var mergeOptions = require('./mergeOptions.js');
var url = require('url');

let enabled =
  !("NO_COLOR" in process.env) &&
  ("FORCE_COLOR" in process.env ||
    process.platform === "win32" ||
    (process.stdout != null &&
      process.stdout.isTTY &&
      process.env.TERM &&
      process.env.TERM !== "dumb"));

const raw = (open, close, searchRegex, replaceValue) => (s) =>
  enabled
    ? open +
      (~(s += "").indexOf(close, 4) // skip opening \x1b[
        ? s.replace(searchRegex, replaceValue)
        : s) +
      close
    : s;

const init = (open, close) => {
  return raw(
    `\x1b[${open}m`,
    `\x1b[${close}m`,
    new RegExp(`\\x1b\\[${close}m`, "g"),
    `\x1b[${open}m`
  )
};

const options = Object.defineProperty({}, "enabled", {
  get: () => enabled,
  set: (value) => (enabled = value),
});
const bold = raw("\x1b[1m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[1m");
const dim = raw("\x1b[2m", "\x1b[22m", /\x1b\[22m/g, "\x1b[22m\x1b[2m");
const underline = init(4, 24);
const red = init(31, 39);
const green = init(32, 39);
const yellow = init(33, 39);
const cyan = init(36, 39);
const gray = init(90, 39);

// @see https://no-color.org
// @see https://www.npmjs.com/package/chalk
if (process.env.FORCE_COLOR === '0' || process.env.NO_COLOR) {
    options.enabled = false;
}
// log to stderr to keep `rollup main.js > bundle.js` from breaking
const stderr = console.error.bind(console);
function handleError(err, recover = false) {
    let description = err.message || err;
    if (err.name)
        description = `${err.name}: ${description}`;
    const message = (err.plugin ? `(plugin ${err.plugin}) ${description}` : description) || err;
    stderr(bold(red(`[!] ${bold(message.toString())}`)));
    if (err.url) {
        stderr(cyan(err.url));
    }
    if (err.loc) {
        stderr(`${rollup.relativeId((err.loc.file || err.id))} (${err.loc.line}:${err.loc.column})`);
    }
    else if (err.id) {
        stderr(rollup.relativeId(err.id));
    }
    if (err.frame) {
        stderr(dim(err.frame));
    }
    if (err.stack) {
        stderr(dim(err.stack));
    }
    stderr('');
    if (!recover)
        process.exit(1);
}

function batchWarnings() {
    let count = 0;
    let deferredWarnings = new Map();
    let warningOccurred = false;
    return {
        get count() {
            return count;
        },
        get warningOccurred() {
            return warningOccurred;
        },
        add: (warning) => {
            count += 1;
            warningOccurred = true;
            if (warning.code in deferredHandlers) {
                rollup.getOrCreate(deferredWarnings, warning.code, () => []).push(warning);
            }
            else if (warning.code in immediateHandlers) {
                immediateHandlers[warning.code](warning);
            }
            else {
                title(warning.message);
                if (warning.url)
                    info(warning.url);
                const id = (warning.loc && warning.loc.file) || warning.id;
                if (id) {
                    const loc = warning.loc
                        ? `${rollup.relativeId(id)}: (${warning.loc.line}:${warning.loc.column})`
                        : rollup.relativeId(id);
                    stderr(bold(rollup.relativeId(loc)));
                }
                if (warning.frame)
                    info(warning.frame);
            }
        },
        flush: () => {
            if (count === 0)
                return;
            const codes = Array.from(deferredWarnings.keys()).sort((a, b) => deferredWarnings.get(b).length - deferredWarnings.get(a).length);
            for (const code of codes) {
                deferredHandlers[code](deferredWarnings.get(code));
            }
            deferredWarnings = new Map();
            count = 0;
        }
    };
}
const immediateHandlers = {
    UNKNOWN_OPTION: warning => {
        title(`You have passed an unrecognized option`);
        stderr(warning.message);
    },
    MISSING_NODE_BUILTINS: warning => {
        title(`Missing shims for Node.js built-ins`);
        const detail = warning.modules.length === 1
            ? `'${warning.modules[0]}'`
            : `${warning
                .modules.slice(0, -1)
                .map((name) => `'${name}'`)
                .join(', ')} and '${warning.modules.slice(-1)}'`;
        stderr(`Creating a browser bundle that depends on ${detail}. You might need to include https://github.com/ionic-team/rollup-plugin-node-polyfills`);
    }
};
const deferredHandlers = {
    CIRCULAR_DEPENDENCY(warnings) {
        title(`Circular dependenc${warnings.length > 1 ? 'ies' : 'y'}`);
        const displayed = warnings.length > 5 ? warnings.slice(0, 3) : warnings;
        for (const warning of displayed) {
            stderr(warning.cycle.join(' -> '));
        }
        if (warnings.length > displayed.length) {
            stderr(`...and ${warnings.length - displayed.length} more`);
        }
    },
    EMPTY_BUNDLE(warnings) {
        title(`Generated${warnings.length === 1 ? ' an' : ''} empty ${warnings.length > 1 ? 'chunks' : 'chunk'}`);
        stderr(warnings.map(warning => warning.chunkName).join(', '));
    },
    EVAL(warnings) {
        title('Use of eval is strongly discouraged');
        info('https://rollupjs.org/guide/en/#avoiding-eval');
        showTruncatedWarnings(warnings);
    },
    MISSING_EXPORT(warnings) {
        title('Missing exports');
        info('https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module');
        for (const warning of warnings) {
            stderr(bold(warning.importer));
            stderr(`${warning.missing} is not exported by ${warning.exporter}`);
            stderr(gray(warning.frame));
        }
    },
    MISSING_GLOBAL_NAME(warnings) {
        title(`Missing global variable ${warnings.length > 1 ? 'names' : 'name'}`);
        stderr(`Use output.globals to specify browser global variable names corresponding to external modules`);
        for (const warning of warnings) {
            stderr(`${bold(warning.source)} (guessing '${warning.guess}')`);
        }
    },
    MIXED_EXPORTS: warnings => {
        title('Mixing named and default exports');
        info(`https://rollupjs.org/guide/en/#outputexports`);
        stderr(bold('The following entry modules are using named and default exports together:'));
        const displayedWarnings = warnings.length > 5 ? warnings.slice(0, 3) : warnings;
        for (const warning of displayedWarnings) {
            stderr(rollup.relativeId(warning.id));
        }
        if (displayedWarnings.length < warnings.length) {
            stderr(`...and ${warnings.length - displayedWarnings.length} other entry modules`);
        }
        stderr(`\nConsumers of your bundle will have to use chunk['default'] to access their default export, which may not be what you want. Use \`output.exports: 'named'\` to disable this warning`);
    },
    NAMESPACE_CONFLICT(warnings) {
        title(`Conflicting re-exports`);
        for (const warning of warnings) {
            stderr(`${bold(rollup.relativeId(warning.reexporter))} re-exports '${warning.name}' from both ${rollup.relativeId(warning.sources[0])} and ${rollup.relativeId(warning.sources[1])} (will be ignored)`);
        }
    },
    NON_EXISTENT_EXPORT(warnings) {
        title(`Import of non-existent ${warnings.length > 1 ? 'exports' : 'export'}`);
        showTruncatedWarnings(warnings);
    },
    PLUGIN_WARNING(warnings) {
        var _a;
        const nestedByPlugin = nest(warnings, 'plugin');
        for (const { key: plugin, items } of nestedByPlugin) {
            const nestedByMessage = nest(items, 'message');
            let lastUrl = '';
            for (const { key: message, items } of nestedByMessage) {
                title(`Plugin ${plugin}: ${message}`);
                for (const warning of items) {
                    if (warning.url && warning.url !== lastUrl)
                        info((lastUrl = warning.url));
                    const id = warning.id || ((_a = warning.loc) === null || _a === void 0 ? void 0 : _a.file);
                    if (id) {
                        let loc = rollup.relativeId(id);
                        if (warning.loc) {
                            loc += `: (${warning.loc.line}:${warning.loc.column})`;
                        }
                        stderr(bold(loc));
                    }
                    if (warning.frame)
                        info(warning.frame);
                }
            }
        }
    },
    SOURCEMAP_BROKEN(warnings) {
        title(`Broken sourcemap`);
        info('https://rollupjs.org/guide/en/#warning-sourcemap-is-likely-to-be-incorrect');
        const plugins = Array.from(new Set(warnings.map(w => w.plugin).filter(Boolean)));
        const detail = plugins.length > 1
            ? ` (such as ${plugins
                .slice(0, -1)
                .map(p => `'${p}'`)
                .join(', ')} and '${plugins.slice(-1)}')`
            : ` (such as '${plugins[0]}')`;
        stderr(`Plugins that transform code${detail} should generate accompanying sourcemaps`);
    },
    THIS_IS_UNDEFINED(warnings) {
        title('`this` has been rewritten to `undefined`');
        info('https://rollupjs.org/guide/en/#error-this-is-undefined');
        showTruncatedWarnings(warnings);
    },
    UNRESOLVED_IMPORT(warnings) {
        title('Unresolved dependencies');
        info('https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency');
        const dependencies = new Map();
        for (const warning of warnings) {
            rollup.getOrCreate(dependencies, warning.source, () => []).push(warning.importer);
        }
        for (const dependency of dependencies.keys()) {
            const importers = dependencies.get(dependency);
            stderr(`${bold(dependency)} (imported by ${importers.join(', ')})`);
        }
    },
    UNUSED_EXTERNAL_IMPORT(warnings) {
        title('Unused external imports');
        for (const warning of warnings) {
            stderr(`${warning.names} imported from external module '${warning.source}' but never used`);
        }
    }
};
function title(str) {
    stderr(bold(yellow(`(!) ${str}`)));
}
function info(url) {
    stderr(gray(url));
}
function nest(array, prop) {
    const nested = [];
    const lookup = new Map();
    for (const item of array) {
        const key = item[prop];
        rollup.getOrCreate(lookup, key, () => {
            const items = {
                items: [],
                key
            };
            nested.push(items);
            return items;
        }).items.push(item);
    }
    return nested;
}
function showTruncatedWarnings(warnings) {
    const nestedByModule = nest(warnings, 'id');
    const displayedByModule = nestedByModule.length > 5 ? nestedByModule.slice(0, 3) : nestedByModule;
    for (const { key: id, items } of displayedByModule) {
        stderr(bold(rollup.relativeId(id)));
        stderr(gray(items[0].frame));
        if (items.length > 1) {
            stderr(`...and ${items.length - 1} other ${items.length > 2 ? 'occurrences' : 'occurrence'}`);
        }
    }
    if (nestedByModule.length > displayedByModule.length) {
        stderr(`\n...and ${nestedByModule.length - displayedByModule.length} other files`);
    }
}

const stdinName = '-';
let stdinResult = null;
function stdinPlugin(arg) {
    const suffix = typeof arg == 'string' && arg.length ? '.' + arg : '';
    return {
        name: 'stdin',
        resolveId(id) {
            if (id === stdinName) {
                return id + suffix;
            }
        },
        load(id) {
            if (id === stdinName || id.startsWith(stdinName + '.')) {
                return stdinResult || (stdinResult = readStdin());
            }
        }
    };
}
function readStdin() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        process.stdin.setEncoding('utf8');
        process.stdin
            .on('data', chunk => chunks.push(chunk))
            .on('end', () => {
            const result = chunks.join('');
            resolve(result);
        })
            .on('error', err => {
            reject(err);
        });
    });
}

function waitForInputPlugin() {
    return {
        name: 'wait-for-input',
        async buildStart(options) {
            const inputSpecifiers = Array.isArray(options.input)
                ? options.input
                : Object.keys(options.input);
            let lastAwaitedSpecifier = null;
            checkSpecifiers: while (true) {
                for (const specifier of inputSpecifiers) {
                    if ((await this.resolve(specifier)) === null) {
                        if (lastAwaitedSpecifier !== specifier) {
                            stderr(`waiting for input ${bold(specifier)}...`);
                            lastAwaitedSpecifier = specifier;
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                        continue checkSpecifiers;
                    }
                }
                break;
            }
        }
    };
}

function addCommandPluginsToInputOptions(inputOptions, command) {
    if (command.stdin !== false) {
        inputOptions.plugins.push(stdinPlugin(command.stdin));
    }
    if (command.waitForBundleInput === true) {
        inputOptions.plugins.push(waitForInputPlugin());
    }
    const commandPlugin = command.plugin;
    if (commandPlugin) {
        const plugins = Array.isArray(commandPlugin) ? commandPlugin : [commandPlugin];
        for (const plugin of plugins) {
            if (/[={}]/.test(plugin)) {
                // -p plugin=value
                // -p "{transform(c,i){...}}"
                loadAndRegisterPlugin(inputOptions, plugin);
            }
            else {
                // split out plugins joined by commas
                // -p node-resolve,commonjs,buble
                plugin.split(',').forEach((plugin) => loadAndRegisterPlugin(inputOptions, plugin));
            }
        }
    }
}
function loadAndRegisterPlugin(inputOptions, pluginText) {
    let plugin = null;
    let pluginArg = undefined;
    if (pluginText[0] === '{') {
        // -p "{transform(c,i){...}}"
        plugin = new Function('return ' + pluginText);
    }
    else {
        const match = pluginText.match(/^([@.\/\\\w|^{}-]+)(=(.*))?$/);
        if (match) {
            // -p plugin
            // -p plugin=arg
            pluginText = match[1];
            pluginArg = new Function('return ' + match[3])();
        }
        else {
            throw new Error(`Invalid --plugin argument format: ${JSON.stringify(pluginText)}`);
        }
        if (!/^\.|^rollup-plugin-|[@\/\\]/.test(pluginText)) {
            // Try using plugin prefix variations first if applicable.
            // Prefix order is significant - left has higher precedence.
            for (const prefix of ['@rollup/plugin-', 'rollup-plugin-']) {
                try {
                    plugin = require(prefix + pluginText);
                    break;
                }
                catch (ex) {
                    // if this does not work, we try requiring the actual name below
                }
            }
        }
        if (!plugin) {
            try {
                if (pluginText[0] == '.')
                    pluginText = sysPath.resolve(pluginText);
                plugin = require(pluginText);
            }
            catch (ex) {
                throw new Error(`Cannot load plugin "${pluginText}": ${ex.message}.`);
            }
        }
    }
    // some plugins do not use `module.exports` for their entry point,
    // in which case we try the named default export and the plugin name
    if (typeof plugin === 'object') {
        plugin = plugin.default || plugin[getCamelizedPluginBaseName(pluginText)];
    }
    if (!plugin) {
        throw new Error(`Cannot find entry for plugin "${pluginText}". The plugin needs to export a function either as "default" or "${getCamelizedPluginBaseName(pluginText)}" for Rollup to recognize it.`);
    }
    inputOptions.plugins.push(typeof plugin === 'function' ? plugin.call(plugin, pluginArg) : plugin);
}
function getCamelizedPluginBaseName(pluginText) {
    var _a;
    return (((_a = pluginText.match(/(@rollup\/plugin-|rollup-plugin-)(.+)$/)) === null || _a === void 0 ? void 0 : _a[2]) || pluginText)
        .split(/[\\/]/)
        .slice(-1)[0]
        .split('.')[0]
        .split('-')
        .map((part, index) => (index === 0 || !part ? part : part[0].toUpperCase() + part.slice(1)))
        .join('');
}

function supportsNativeESM() {
    return Number(/^v(\d+)/.exec(process.version)[1]) >= 13;
}
async function loadAndParseConfigFile(fileName, commandOptions = {}) {
    const configs = await loadConfigFile(fileName, commandOptions);
    const warnings = batchWarnings();
    try {
        const normalizedConfigs = configs.map(config => {
            const options = mergeOptions.mergeOptions(config, commandOptions, warnings.add);
            addCommandPluginsToInputOptions(options, commandOptions);
            return options;
        });
        return { options: normalizedConfigs, warnings };
    }
    catch (err) {
        warnings.flush();
        throw err;
    }
}
async function loadConfigFile(fileName, commandOptions) {
    const extension = sysPath.extname(fileName);
    const configFileExport = extension === '.mjs' && supportsNativeESM()
        ? (await import(url.pathToFileURL(fileName).href)).default
        : extension === '.cjs'
            ? getDefaultFromCjs(require(fileName))
            : await getDefaultFromTranspiledConfigFile(fileName, commandOptions.silent);
    return getConfigList(configFileExport, commandOptions);
}
function getDefaultFromCjs(namespace) {
    return namespace.__esModule ? namespace.default : namespace;
}
async function getDefaultFromTranspiledConfigFile(fileName, silent) {
    const warnings = batchWarnings();
    const bundle = await rollup.rollup({
        external: (id) => (id[0] !== '.' && !sysPath.isAbsolute(id)) || id.slice(-5, id.length) === '.json',
        input: fileName,
        onwarn: warnings.add,
        treeshake: false
    });
    if (!silent && warnings.count > 0) {
        stderr(bold(`loaded ${rollup.relativeId(fileName)} with warnings`));
        warnings.flush();
    }
    const { output: [{ code }] } = await bundle.generate({
        exports: 'named',
        format: 'cjs'
    });
    return loadConfigFromBundledFile(fileName, code);
}
async function loadConfigFromBundledFile(fileName, bundledCode) {
    const resolvedFileName = fs.realpathSync(fileName);
    const extension = sysPath.extname(resolvedFileName);
    const defaultLoader = require.extensions[extension];
    require.extensions[extension] = (module, requiredFileName) => {
        if (requiredFileName === resolvedFileName) {
            module._compile(bundledCode, requiredFileName);
        }
        else {
            defaultLoader(module, requiredFileName);
        }
    };
    delete require.cache[resolvedFileName];
    try {
        const config = getDefaultFromCjs(require(fileName));
        require.extensions[extension] = defaultLoader;
        return config;
    }
    catch (err) {
        if (err.code === 'ERR_REQUIRE_ESM') {
            return rollup.error({
                code: 'TRANSPILED_ESM_CONFIG',
                message: `While loading the Rollup configuration from "${rollup.relativeId(fileName)}", Node tried to require an ES module from a CommonJS file, which is not supported. A common cause is if there is a package.json file with "type": "module" in the same folder. You can try to fix this by changing the extension of your configuration file to ".cjs" or ".mjs" depending on the content, which will prevent Rollup from trying to preprocess the file but rather hand it to Node directly.`,
                url: 'https://rollupjs.org/guide/en/#using-untranspiled-config-files'
            });
        }
        throw err;
    }
}
async function getConfigList(configFileExport, commandOptions) {
    const config = await (typeof configFileExport === 'function'
        ? configFileExport(commandOptions)
        : configFileExport);
    if (Object.keys(config).length === 0) {
        return rollup.error({
            code: 'MISSING_CONFIG',
            message: 'Config file must export an options object, or an array of options objects',
            url: 'https://rollupjs.org/guide/en/#configuration-files'
        });
    }
    return Array.isArray(config) ? config : [config];
}

exports.addCommandPluginsToInputOptions = addCommandPluginsToInputOptions;
exports.batchWarnings = batchWarnings;
exports.bold = bold;
exports.cyan = cyan;
exports.green = green;
exports.handleError = handleError;
exports.loadAndParseConfigFile = loadAndParseConfigFile;
exports.stderr = stderr;
exports.stdinName = stdinName;
exports.underline = underline;
//# sourceMappingURL=loadConfigFile.js.map

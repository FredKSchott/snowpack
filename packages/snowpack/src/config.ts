import buildScriptPlugin from '@snowpack/plugin-build-script';
import runScriptPlugin from '@snowpack/plugin-run-script';
import {cosmiconfigSync} from 'cosmiconfig';
import {all as merge} from 'deepmerge';
import fs from 'fs';
import http from 'http';
import {validate, ValidatorResult} from 'jsonschema';
import path from 'path';
import yargs from 'yargs-parser';
import createLogger from './logger';
import srcFileExtensionMapping from './build/src-file-extension-mapping';
import {esbuildPlugin} from './plugins/plugin-esbuild';
import {
  CLIFlags,
  DeepPartial,
  PluginLoadOptions,
  PluginOptimizeOptions,
  Proxy,
  ProxyOptions,
  SnowpackConfig,
  SnowpackPlugin,
  LegacySnowpackPlugin,
  PluginLoadResult,
} from './types/snowpack';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['**/node_modules/**/*', '**/.types/**/*'];

const logger = createLogger({name: 'snowpack'});

// default settings
const DEFAULT_CONFIG: Partial<SnowpackConfig> = {
  exclude: ['__tests__/**/*', '**/*.@(spec|test).*'],
  plugins: [],
  alias: {},
  installOptions: {
    dest: 'web_modules',
    externalPackage: [],
    installTypes: false,
    polyfillNode: false,
    env: {},
    namedExports: [],
    rollup: {
      plugins: [],
      dedupe: [],
    },
  },
  scripts: {},
  devOptions: {
    secure: false,
    hostname: 'localhost',
    port: 8080,
    open: 'default',
    out: 'build',
    fallback: 'index.html',
    hmr: true,
  },
  buildOptions: {
    baseUrl: '/',
    webModulesUrl: '/web_modules',
    clean: false,
    metaDir: '__snowpack__',
    minify: true,
    sourceMaps: false,
  },
};

const configSchema = {
  type: 'object',
  properties: {
    extends: {type: 'string'},
    install: {type: 'array', items: {type: 'string'}},
    exclude: {type: 'array', items: {type: 'string'}},
    plugins: {type: 'array'},
    webDependencies: {
      type: ['object'],
      additionalProperties: {type: 'string'},
    },
    scripts: {
      type: ['object'],
      additionalProperties: {type: 'string'},
    },
    alias: {
      type: 'object',
      additionalProperties: {type: 'string'},
    },
    devOptions: {
      type: 'object',
      properties: {
        secure: {type: 'boolean'},
        port: {type: 'number'},
        out: {type: 'string'},
        fallback: {type: 'string'},
        bundle: {type: 'boolean'},
        open: {type: 'string'},
        hmr: {type: 'boolean'},
      },
    },
    installOptions: {
      type: 'object',
      properties: {
        dest: {type: 'string'},
        externalPackage: {type: 'array', items: {type: 'string'}},
        treeshake: {type: 'boolean'},
        installTypes: {type: 'boolean'},
        polyfillNode: {type: 'boolean'},
        sourceMap: {oneOf: [{type: 'boolean'}, {type: 'string'}]},
        alias: {
          type: 'object',
          additionalProperties: {type: 'string'},
        },
        env: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              {id: 'EnvVarString', type: 'string'},
              {id: 'EnvVarNumber', type: 'number'},
              {id: 'EnvVarTrue', type: 'boolean', enum: [true]},
            ],
          },
        },
        rollup: {
          type: 'object',
          properties: {
            plugins: {type: 'array', items: {type: 'object'}},
            dedupe: {
              type: 'array',
              items: {type: 'string'},
            },
          },
        },
      },
    },
    buildOptions: {
      type: ['object'],
      properties: {
        baseUrl: {type: 'string'},
        clean: {type: 'boolean'},
        metaDir: {type: 'string'},
        minify: {type: 'boolean'},
        sourceMaps: {type: 'boolean'},
      },
    },
    proxy: {
      type: 'object',
    },
  },
};

/**
 * Convert CLI flags to an incomplete Snowpack config representation.
 * We need to be careful about setting properties here if the flag value
 * is undefined, since the deep merge strategy would then overwrite good
 * defaults with 'undefined'.
 */
function expandCliFlags(flags: CLIFlags): DeepPartial<SnowpackConfig> {
  const result = {
    installOptions: {} as any,
    devOptions: {} as any,
    buildOptions: {} as any,
  };
  const {help, version, reload, config, ...relevantFlags} = flags;
  for (const [flag, val] of Object.entries(relevantFlags)) {
    if (flag === '_' || flag.includes('-')) {
      continue;
    }
    if (configSchema.properties[flag]) {
      result[flag] = val;
      continue;
    }
    if (configSchema.properties.installOptions.properties[flag]) {
      result.installOptions[flag] = val;
      continue;
    }
    if (configSchema.properties.devOptions.properties[flag]) {
      result.devOptions[flag] = val;
      continue;
    }
    if (configSchema.properties.buildOptions.properties[flag]) {
      result.buildOptions[flag] = val;
      continue;
    }
    logger.error(`Unknown CLI flag: "${flag}"`);
    process.exit(1);
  }
  if (result.installOptions.env) {
    result.installOptions.env = result.installOptions.env.reduce((acc, id) => {
      const index = id.indexOf('=');
      const [key, val] = index > 0 ? [id.substr(0, index), id.substr(index + 1)] : [id, true];
      acc[key] = val;
      return acc;
    }, {});
  }
  return result;
}

/** ensure extensions all have preceding dots */
function parseScript(script: string): {scriptType: string; input: string[]; output: string[]} {
  const [scriptType, extMatch] = script.toLowerCase().split(':');
  const [inputMatch, outputMatch] = extMatch ? extMatch.split('->') : [];
  const cleanInput = [...new Set(inputMatch.split(',').map((ext) => `.${ext}`))];
  let cleanOutput: string[] = [];
  if (outputMatch) {
    cleanOutput = [...new Set(outputMatch.split(',').map((ext) => `.${ext}`))];
  } else if (cleanInput[0] === '.svelte') {
    cleanOutput = ['.js', '.css'];
  } else if (cleanInput[0] === '.vue') {
    cleanOutput = ['.js', '.css'];
  } else if (cleanInput.length > 0) {
    cleanOutput = Array.from(new Set(cleanInput.map((ext) => srcFileExtensionMapping[ext] || ext)));
  }

  return {
    scriptType,
    input: cleanInput,
    output: cleanOutput,
  };
}

/** load and normalize plugins from config */
function loadPlugins(
  config: SnowpackConfig,
): {
  plugins: SnowpackPlugin[];
  extensionMap: Record<string, string>;
} {
  const plugins: SnowpackPlugin[] = [];

  function loadPluginFromScript(specifier: string): SnowpackPlugin | undefined {
    try {
      const pluginLoc = require.resolve(specifier, {paths: [process.cwd()]});
      return require(pluginLoc)(config); // no plugin options to load because we’re loading from a string
    } catch (err) {
      // ignore
    }
  }

  function loadPluginFromConfig(name: string, options?: any): SnowpackPlugin {
    const pluginLoc = require.resolve(name, {paths: [process.cwd()]});
    const pluginRef = require(pluginLoc);
    let plugin: SnowpackPlugin & LegacySnowpackPlugin;
    try {
      plugin = typeof pluginRef.default === 'function' ? pluginRef.default : pluginRef;
      if (typeof plugin !== 'function') logger.error(`plugin ${name} doesn’t return function`);
      plugin = (plugin as any)(config, options);
    } catch (err) {
      logger.error(err);
      throw err;
    }
    plugin.name = plugin.name || name;

    // Legacy support: Map the new load() interface to the old build() interface
    const {build, bundle} = plugin;
    if (build) {
      plugin.load = async (options: PluginLoadOptions) => {
        const result = await build({
          ...options,
          contents: fs.readFileSync(options.filePath, 'utf-8'),
        }).catch((err) => {
          logger.error(
            `[${plugin.name}] There was a problem running this older plugin. Please update the plugin to the latest version.`,
          );
          throw err;
        });
        if (!result) {
          return null;
        }
        if (result.resources) {
          return {
            '.js': result.result,
            '.css': result.resources.css,
          };
        }
        return result.result;
      };
    }
    // Legacy support: Map the new optimize() interface to the old bundle() interface
    if (bundle) {
      plugin.optimize = async (options: PluginOptimizeOptions) => {
        return bundle({
          srcDirectory: options.buildDirectory,
          destDirectory: options.buildDirectory,
          // @ts-ignore internal API only
          log: options.log,
          // It turns out, this was more or less broken (included all files, not just JS).
          // Confirmed no plugins are using this now, so safe to use an empty array.
          jsFilePaths: [],
        }).catch((err) => {
          logger.fatal(
            `[${plugin.name}] There was a problem running this older plugin. Please update the plugin to the latest version.`,
          );
          throw err;
        });
      };
    }
    if (
      !plugin.resolve &&
      plugin.defaultBuildScript &&
      plugin.defaultBuildScript.startsWith('build:')
    ) {
      const {input, output} = parseScript(plugin.defaultBuildScript);
      plugin.resolve = {input, output};
    } else if (plugin.resolve) {
      const {input, output} = plugin.resolve;
      plugin.resolve = {input, output};
    }

    validatePlugin(plugin);
    return plugin;
  }

  // 1. require & load config.scripts
  // TODO: deprecate scripts and move out of this function
  Object.entries(config.scripts).forEach(([target, cmd]) => {
    const {scriptType, input, output} = parseScript(target);
    if ((config.plugins as any).some((p) => (Array.isArray(p) ? p[0] : p) === cmd)) {
      handleConfigError(
        `[${name}]: loaded in both \`scripts\` and \`plugins\`. Please choose one (preferably \`plugins\`).`,
      );
    }

    switch (scriptType) {
      case 'run': {
        if (target.endsWith('::watch')) {
          break;
        }
        const watchCmd = config.scripts[target + '::watch'];
        plugins.push(runScriptPlugin(config, {cmd, watch: watchCmd || cmd}));
        break;
      }

      case 'build': {
        plugins.push(buildScriptPlugin(config, {input, output, cmd}));
        break;
      }

      case 'bundle': {
        plugins.push(loadPluginFromScript(cmd)!);
        break;
      }
    }
  });

  // 2. config.plugins
  config.plugins.forEach((ref) => {
    const pluginName = Array.isArray(ref) ? ref[0] : ref;
    const pluginOptions = Array.isArray(ref) ? ref[1] : {};
    const plugin = loadPluginFromConfig(pluginName, pluginOptions);
    logger.debug(`loaded plugin: ${pluginName}`);
    plugins.push(plugin);
  });

  const needsDefaultPlugin = new Set(['.mjs', '.jsx', '.ts', '.tsx']);
  plugins
    .filter(({resolve}) => !!resolve)
    .reduce((arr, a) => arr.concat(a.resolve!.input), [] as string[])
    .forEach((ext) => needsDefaultPlugin.delete(ext));
  if (needsDefaultPlugin.size > 0) {
    plugins.unshift(esbuildPlugin(config, {input: [...needsDefaultPlugin]}));
  }

  const extensionMap = plugins.reduce((map, {resolve}) => {
    if (resolve) {
      for (const inputExt of resolve.input) {
        map[inputExt] = resolve.output[0];
      }
    }
    return map;
  }, {} as Record<string, string>);

  return {
    plugins,
    extensionMap,
  };
}

/**
 * Convert deprecated proxy scripts to
 * FUTURE: Remove this on next major release
 */
function handleLegacyProxyScripts(config: any) {
  for (const scriptId in config.scripts as any) {
    if (!scriptId.startsWith('proxy:')) {
      continue;
    }
    const cmdArr = config.scripts[scriptId]!.split(/\s+/);
    if (cmdArr[0] !== 'proxy') {
      handleConfigError(`scripts[${scriptId}] must use the proxy command`);
    }
    cmdArr.shift();
    const {to, _} = yargs(cmdArr);
    if (_.length !== 1) {
      handleConfigError(
        `scripts[${scriptId}] must use the format: "proxy http://SOME.URL --to /PATH"`,
      );
    }
    if (to && to[0] !== '/') {
      handleConfigError(
        `scripts[${scriptId}]: "--to ${to}" must be a URL path, and start with a "/"`,
      );
    }
    const {toUrl, fromUrl} = {fromUrl: _[0], toUrl: to};
    if (config.proxy[toUrl]) {
      handleConfigError(`scripts[${scriptId}]: Cannot overwrite proxy[${toUrl}].`);
    }
    (config.proxy as any)[toUrl] = fromUrl;
    delete config.scripts[scriptId];
  }
  return config;
}

type RawProxies = Record<string, string | ProxyOptions>;
function normalizeProxies(proxies: RawProxies): Proxy[] {
  return Object.entries(proxies).map(([pathPrefix, options]) => {
    if (typeof options !== 'string') {
      return [
        pathPrefix,
        {
          //@ts-ignore - Seems to be a strange 3.9.x bug
          on: {},
          ...options,
        },
      ];
    }
    return [
      pathPrefix,
      {
        on: {
          proxyReq: (proxyReq: http.ClientRequest, req: http.IncomingMessage) => {
            const proxyPath = proxyReq.path.split(req.url!)[0];
            proxyReq.path = proxyPath + req.url!.replace(pathPrefix, '');
          },
        },
        target: options,
        changeOrigin: true,
        secure: false,
      },
    ];
  });
}

function normalizeMount(config: SnowpackConfig) {
  const mountedDirs: Record<string, string> = config.mount || {};
  for (const [target, cmd] of Object.entries(config.scripts)) {
    if (target.startsWith('mount:')) {
      const cmdArr = cmd.split(/\s+/);
      if (cmdArr[0] !== 'mount') {
        handleConfigError(`scripts[${target}] must use the mount command`);
      }
      cmdArr.shift();
      const {to, _} = yargs(cmdArr);
      if (_.length !== 1) {
        handleConfigError(`scripts[${target}] must use the format: "mount dir [--to /PATH]"`);
      }
      if (target === 'mount:web_modules') {
        config.buildOptions.webModulesUrl = to;
      } else {
        mountedDirs[cmdArr[0]] = to || `/${cmdArr[0]}`;
      }
    }
  }
  for (const [mountDir, mountUrl] of Object.entries(mountedDirs)) {
    const fromDisk = path.posix.normalize(mountDir + '/');
    delete mountedDirs[mountDir];
    mountedDirs[fromDisk] = mountUrl;
    if (mountUrl[0] !== '/') {
      handleConfigError(
        `mount[${mountDir}]: Value "${mountUrl}" must be a URL path, and start with a "/"`,
      );
    }
  }
  // if no mounted directories, mount the root directory to the base URL
  if (!Object.keys(mountedDirs).length) {
    mountedDirs['.'] = '/';
  }
  return mountedDirs;
}

function normalizeAlias(config: SnowpackConfig, createMountAlias: boolean) {
  const cwd = process.cwd();
  const cleanAlias: Record<string, string> = config.alias || {};
  if (createMountAlias) {
    for (const mountDir of Object.keys(config.mount)) {
      if (mountDir !== '.') {
        cleanAlias[removeTrailingSlash(mountDir)] = `./${mountDir}`;
      }
    }
  }
  for (const [target, replacement] of Object.entries(config.alias)) {
    if (
      replacement.startsWith('./') ||
      replacement.startsWith('../') ||
      replacement.startsWith('/')
    ) {
      cleanAlias[target] = path.resolve(cwd, replacement);
    }
  }
  return cleanAlias;
}

/** resolve --dest relative to cwd, etc. */
function normalizeConfig(config: SnowpackConfig): SnowpackConfig {
  const cwd = process.cwd();
  config.knownEntrypoints = (config as any).install || [];
  config.installOptions.dest = path.resolve(cwd, config.installOptions.dest);
  config.devOptions.out = path.resolve(cwd, config.devOptions.out);
  config.exclude = Array.from(new Set([...ALWAYS_EXCLUDE, ...config.exclude]));

  if (!config.proxy) {
    config.proxy = {} as any;
  }

  // normalize config URL/path values
  config.buildOptions.baseUrl = addTrailingSlash(config.buildOptions.baseUrl);
  config.buildOptions.webModulesUrl = addLeadingSlash(config.buildOptions.webModulesUrl);
  config.buildOptions.metaDir = removeLeadingSlash(
    removeTrailingSlash(config.buildOptions.metaDir),
  );

  const isLegacyMountConfig = !config.mount;
  config = handleLegacyProxyScripts(config);
  config.proxy = normalizeProxies(config.proxy as any);
  config.mount = normalizeMount(config);
  config.alias = normalizeAlias(config, isLegacyMountConfig);

  // new pipeline
  const {plugins, extensionMap} = loadPlugins(config);
  config.plugins = plugins;
  config._extensionMap = extensionMap;

  // If any plugins defined knownEntrypoints, add them here
  for (const {knownEntrypoints} of config.plugins) {
    if (knownEntrypoints) {
      config.knownEntrypoints = config.knownEntrypoints.concat(knownEntrypoints);
    }
  }

  return config;
}

function handleConfigError(msg: string) {
  logger.fatal(msg);
  process.exit(1);
}

function handleValidationErrors(filepath: string, errors: {toString: () => string}[]) {
  logger.fatal(`! ${filepath || 'Configuration error'}
${errors.map((err) => `    - ${err.toString()}`).join('\n')}
    See https://www.snowpack.dev/#configuration for more info.`);
  process.exit(1);
}

function handleDeprecatedConfigError(mainMsg: string, ...msgs: string[]) {
  logger.fatal(`${mainMsg}
${msgs.join('\n')}
See https://www.snowpack.dev/#configuration for more info.`);
  process.exit(1);
}

function validateConfigAgainstV1(rawConfig: any, cliFlags: any) {
  // Moved!
  if (rawConfig.dedupe || cliFlags.dedupe) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `dedupe` is now `installOptions.rollup.dedupe`.',
    );
  }
  if (rawConfig.namedExports) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `rollup.namedExports` is no longer required. See also: installOptions.namedExports',
    );
  }
  if (rawConfig.installOptions?.rollup?.namedExports) {
    delete rawConfig.installOptions.rollup.namedExports;
    logger.error(
      '[Snowpack v2.3.0] `rollup.namedExports` is no longer required. See also: installOptions.namedExports',
    );
  }
  if (rawConfig.rollup) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] top-level `rollup` config is now `installOptions.rollup`.',
    );
  }
  if (rawConfig.installOptions?.include || cliFlags.include) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.include` is now handled via "mount" build scripts!',
    );
  }
  if (rawConfig.installOptions?.exclude) {
    handleDeprecatedConfigError('[Snowpack v1 -> v2] `installOptions.exclude` is now `exclude`.');
  }
  if (Array.isArray(rawConfig.webDependencies)) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] The `webDependencies` array is now `install`.',
    );
  }
  if (rawConfig.knownEntrypoints) {
    handleDeprecatedConfigError('[Snowpack v1 -> v2] `knownEntrypoints` is now `install`.');
  }
  if (rawConfig.entrypoints) {
    handleDeprecatedConfigError('[Snowpack v1 -> v2] `entrypoints` is now `install`.');
  }
  if (rawConfig.include) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] All files are now included by default. "include" config is safe to remove.',
      'Whitelist & include specific folders via "mount" build scripts.',
    );
  }
  // Replaced!
  if (rawConfig.source || cliFlags.source) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `source` is now detected automatically, this config is safe to remove.',
    );
  }
  if (rawConfig.stat || cliFlags.stat) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `stat` is now the default output, this config is safe to remove.',
    );
  }
  if (
    rawConfig.scripts &&
    Object.keys(rawConfig.scripts).filter((k) => k.startsWith('lintall')).length > 0
  ) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `scripts["lintall:..."]` has been renamed to scripts["run:..."]',
    );
  }
  if (
    rawConfig.scripts &&
    Object.keys(rawConfig.scripts).filter((k) => k.startsWith('plugin:`')).length > 0
  ) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `scripts["plugin:..."]` have been renamed to scripts["build:..."].',
    );
  }
  // Removed!
  if (rawConfig.devOptions?.dist) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `devOptions.dist` is no longer required. This config is safe to remove.',
      `If you'd still like to host your src/ directory at the "/_dist/*" URL, create a mount script:',
      '    {"scripts": {"mount:src": "mount src --to /_dist_"}} `,
    );
  }
  if (rawConfig.hash || cliFlags.hash) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.hash` has been replaced by `snowpack build`.',
    );
  }
  if (rawConfig.installOptions?.nomodule || cliFlags.nomodule) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.nomodule` has been replaced by `snowpack build`.',
    );
  }
  if (rawConfig.installOptions?.nomoduleOutput || cliFlags.nomoduleOutput) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.nomoduleOutput` has been replaced by `snowpack build`.',
    );
  }
  if (rawConfig.installOptions?.babel || cliFlags.babel) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.babel` has been replaced by `snowpack build`.',
    );
  }
  if (rawConfig.installOptions?.optimize) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.optimize` has been replaced by `snowpack build` minification.',
    );
  }
  if (rawConfig.installOptions?.strict || cliFlags.strict) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.strict` is no longer supported.',
    );
  }
  if (rawConfig.installOptions?.alias) {
    handleDeprecatedConfigError(
      '[New in v2.7] `installOptions.alias` has been moved to a top-level `alias` config. (https://snowpack.dev#all-config-options)',
    );
  }
}

function validatePlugin(plugin: SnowpackPlugin) {
  const pluginName = plugin.name;
  if (plugin.resolve && !plugin.load) {
    handleConfigError(`[${pluginName}] "resolve" config found but "load()" method missing.`);
  }
  if (!plugin.resolve && plugin.load) {
    handleConfigError(`[${pluginName}] "load" method found but "resolve()" config missing.`);
  }
  if (plugin.resolve && !Array.isArray(plugin.resolve.input)) {
    handleConfigError(
      `[${pluginName}] "resolve.input" should be an array of input file extensions.`,
    );
  }
  if (plugin.resolve && !Array.isArray(plugin.resolve.output)) {
    handleConfigError(
      `[${pluginName}] "resolve.output" should be an array of output file extensions.`,
    );
  }
}

export function validatePluginLoadResult(
  plugin: SnowpackPlugin,
  result: PluginLoadResult | void | undefined | null,
) {
  const pluginName = plugin.name;
  if (!result) {
    return;
  }
  if (typeof result === 'string' && plugin.resolve!.output.length !== 1) {
    handleConfigError(
      `[plugin=${pluginName}] "load()" returned a string, but "resolve.output" contains multiple possible outputs. If multiple outputs are expected, the object return format is required.`,
    );
  }
  const unexpectedOutput =
    typeof result === 'object' &&
    Object.keys(result).find((fileExt) => !plugin.resolve!.output.includes(fileExt));
  if (unexpectedOutput) {
    handleConfigError(
      `[plugin=${pluginName}] "load()" returned entry "${unexpectedOutput}" not found in "resolve.output": ${
        plugin.resolve!.output
      }`,
    );
  }
}

export function createConfiguration(
  config: Partial<SnowpackConfig>,
): [ValidatorResult['errors'], undefined] | [null, SnowpackConfig] {
  const {errors: validationErrors} = validate(config, configSchema, {
    propertyName: CONFIG_NAME,
    allowUnknownAttributes: false,
  });
  if (validationErrors.length > 0) {
    return [validationErrors, undefined];
  }
  const mergedConfig = merge<SnowpackConfig>([DEFAULT_CONFIG, config]);
  return [null, normalizeConfig(mergedConfig)];
}

export function loadAndValidateConfig(flags: CLIFlags, pkgManifest: any): SnowpackConfig {
  const explorerSync = cosmiconfigSync(CONFIG_NAME, {
    // only support these 3 types of config for now
    searchPlaces: ['package.json', 'snowpack.config.js', 'snowpack.config.json'],
    // don't support crawling up the folder tree:
    stopDir: path.dirname(process.cwd()),
  });

  let result;
  // if user specified --config path, load that
  if (flags.config) {
    result = explorerSync.load(path.resolve(process.cwd(), flags.config));
    if (!result) {
      handleConfigError(`Could not locate Snowpack config at ${flags.config}`);
    }
  }

  // If no config was found above, search for one.
  result = result || explorerSync.search();

  // If still no config found, assume none exists and use the default config.
  if (!result || !result.config || result.isEmpty) {
    result = {config: {...DEFAULT_CONFIG}};
  }

  // validate against schema; throw helpful user if invalid
  const config: SnowpackConfig = result.config;
  validateConfigAgainstV1(config, flags);
  const cliConfig = expandCliFlags(flags);

  let extendConfig: SnowpackConfig = {} as SnowpackConfig;
  if (config.extends) {
    const extendConfigLoc = config.extends.startsWith('.')
      ? path.resolve(path.dirname(result.filepath), config.extends)
      : require.resolve(config.extends, {paths: [process.cwd()]});
    const extendResult = explorerSync.load(extendConfigLoc);
    if (!extendResult) {
      handleConfigError(`Could not locate Snowpack config at ${flags.config}`);
      process.exit(1);
    }
    extendConfig = extendResult.config;
    const extendValidation = validate(extendConfig, configSchema, {
      allowUnknownAttributes: false,
      propertyName: CONFIG_NAME,
    });
    if (extendValidation.errors && extendValidation.errors.length > 0) {
      handleValidationErrors(result.filepath, extendValidation.errors);
      process.exit(1);
    }
    if (extendConfig.plugins) {
      const extendConfgDir = path.dirname(extendConfigLoc);
      extendConfig.plugins = extendConfig.plugins.map((plugin) => {
        const name = Array.isArray(plugin) ? plugin[0] : plugin;
        const absName = path.isAbsolute(name)
          ? name
          : require.resolve(name, {paths: [extendConfgDir]});
        return Array.isArray(plugin) ? plugin.splice(0, 1, absName) : absName;
      });
    }
  }
  // if valid, apply config over defaults
  const mergedConfig = merge<SnowpackConfig>([
    pkgManifest.homepage ? {buildOptions: {baseUrl: pkgManifest.homepage}} : {},
    extendConfig,
    {webDependencies: pkgManifest.webDependencies},
    config,
    cliConfig as any,
  ]);
  for (const webDependencyName of Object.keys(mergedConfig.webDependencies || {})) {
    if (pkgManifest.dependencies && pkgManifest.dependencies[webDependencyName]) {
      handleConfigError(
        `"${webDependencyName}" is included in "webDependencies". Please remove it from your package.json "dependencies" config.`,
      );
    }
    if (pkgManifest.devDependencies && pkgManifest.devDependencies[webDependencyName]) {
      handleConfigError(
        `"${webDependencyName}" is included in "webDependencies". Please remove it from your package.json "devDependencies" config.`,
      );
    }
  }

  const [validationErrors, configResult] = createConfiguration(mergedConfig);
  if (validationErrors) {
    handleValidationErrors(result.filepath, validationErrors);
    process.exit(1);
  }
  return configResult!;
}

export function removeLeadingSlash(path: string) {
  return path.replace(/^[/\\]+/, '');
}

export function removeTrailingSlash(path: string) {
  return path.replace(/[/\\]+$/, '');
}

export function addLeadingSlash(path: string) {
  return path.replace(/^\/?/, '/');
}

export function addTrailingSlash(path: string) {
  return path.replace(/\/?$/, '/');
}

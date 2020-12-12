import {cosmiconfigSync} from 'cosmiconfig';
import {all as merge} from 'deepmerge';
import * as esbuild from 'esbuild';
import {isPlainObject} from 'is-plain-object';
import {validate, ValidatorResult} from 'jsonschema';
import os from 'os';
import path from 'path';
import {logger} from './logger';
import {esbuildPlugin} from './plugins/plugin-esbuild';
import {
  CLIFlags,
  DeepPartial,
  MountEntry,
  PluginLoadResult,
  RouteConfigObject,
  SnowpackConfig,
  SnowpackPlugin,
  SnowpackUserConfig,
} from './types/snowpack';
import {addLeadingSlash, addTrailingSlash, removeLeadingSlash, removeTrailingSlash} from './util';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['**/node_modules/**/*', '**/web_modules/**/*', '**/.types/**/*'];

// default settings
const DEFAULT_CONFIG: SnowpackUserConfig = {
  plugins: [],
  alias: {},
  exclude: [],
  installOptions: {
    packageLookupFields: [],
  },
  devOptions: {
    secure: false,
    hostname: 'localhost',
    port: 8080,
    open: 'default',
    output: 'dashboard',
    fallback: 'index.html',
    hmrDelay: 0,
    hmrPort: undefined,
    hmrErrorOverlay: true,
  },
  buildOptions: {
    out: 'build',
    baseUrl: '/',
    webModulesUrl: '/web_modules',
    clean: false,
    metaDir: '__snowpack__',
    minify: false,
    sourceMaps: false,
    watch: false,
    htmlFragments: false,
  },
  testOptions: {
    files: ['__tests__/**/*', '**/*.@(spec|test).*'],
  },
  experiments: {
    source: 'local',
    routes: [],
    ssr: false,
  },
};

const configSchema = {
  type: 'object',
  properties: {
    extends: {type: 'string'},
    install: {type: 'array', items: {type: 'string'}},
    exclude: {type: 'array', items: {type: 'string'}},
    plugins: {type: 'array'},
    alias: {
      type: 'object',
      additionalProperties: {type: 'string'},
    },
    mount: {
      type: 'object',
      additionalProperties: {
        oneOf: [
          {type: 'string'},
          {
            type: ['object'],
            properties: {
              url: {type: 'string'},
              static: {type: 'boolean'},
              resolve: {type: 'boolean'},
            },
          },
        ],
      },
    },
    devOptions: {
      type: 'object',
      properties: {
        secure: {type: 'boolean'},
        port: {type: 'number'},
        fallback: {type: 'string'},
        bundle: {type: 'boolean'},
        open: {type: 'string'},
        output: {type: 'string', enum: ['stream', 'dashboard']},
        hmr: {type: 'boolean'},
        hmrDelay: {type: 'number'},
        hmrPort: {type: 'number'},
        hmrErrorOverlay: {type: 'boolean'},
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
            context: {type: 'string'},
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
        out: {type: 'string'},
        baseUrl: {type: 'string'},
        clean: {type: 'boolean'},
        metaDir: {type: 'string'},
        minify: {type: 'boolean'},
        sourceMaps: {type: 'boolean'},
        watch: {type: 'boolean'},
        ssr: {type: 'boolean'},
        htmlFragments: {type: 'boolean'},
        jsxFactory: {type: 'string'},
        jsxFragment: {type: 'string'},
      },
    },
    testOptions: {
      type: 'object',
      properties: {
        files: {type: 'array', items: {type: 'string'}},
      },
    },
    experiments: {
      type: ['object'],
      properties: {
        ssr: {type: 'boolean'},
        app: {},
        routes: {},
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
    experiments: {} as any,
  };
  const {help, version, reload, config, ...relevantFlags} = flags;

  const CLI_ONLY_FLAGS = ['quiet', 'verbose'];

  for (const [flag, val] of Object.entries(relevantFlags)) {
    if (flag === '_' || flag.includes('-')) {
      continue;
    }
    if (configSchema.properties[flag]) {
      result[flag] = val;
      continue;
    }
    // Special: we moved `devOptions.out` -> `buildOptions.out`.
    // Handle that flag special here, to prevent risk of undefined matching.
    if (flag === 'out') {
      result.buildOptions['out'] = val;
      continue;
    }
    if (configSchema.properties.experiments.properties[flag]) {
      result.experiments[flag] = val;
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
    if (CLI_ONLY_FLAGS.includes(flag)) {
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

/** load and normalize plugins from config */
function loadPlugins(
  config: SnowpackConfig,
): {plugins: SnowpackPlugin[]; extensionMap: Record<string, string>} {
  const plugins: SnowpackPlugin[] = [];

  function execPluginFactory(pluginFactory: any, pluginOptions: any = {}): SnowpackPlugin {
    let plugin: SnowpackPlugin | null = null;
    plugin = pluginFactory(config, pluginOptions) as SnowpackPlugin;
    return plugin;
  }

  function loadPluginFromConfig(name: string, options?: any): SnowpackPlugin {
    const pluginLoc = require.resolve(name, {paths: [process.cwd()]});
    const pluginRef = require(pluginLoc);
    let plugin: SnowpackPlugin;
    try {
      plugin = typeof pluginRef.default === 'function' ? pluginRef.default : pluginRef;
      if (typeof plugin !== 'function') logger.error(`plugin ${name} doesn’t return function`);
      plugin = execPluginFactory(plugin, options) as SnowpackPlugin;
    } catch (err) {
      logger.error(err.toString());
      throw err;
    }
    plugin.name = plugin.name || name;

    // Add any internal plugin methods. Placeholders are okay when individual
    // commands implement these differently.
    plugin.markChanged = (file) => {
      logger.debug(`clearCache(${file}) called, but function not yet hooked up.`, {
        name: plugin.name,
      });
    };

    // Finish up.
    validatePlugin(plugin);
    return plugin;
  }

  // 2. config.plugins
  config.plugins.forEach((ref) => {
    const pluginName = Array.isArray(ref) ? ref[0] : ref;
    const pluginOptions = Array.isArray(ref) ? ref[1] : {};
    const plugin = loadPluginFromConfig(pluginName, pluginOptions);
    logger.debug(`loaded plugin: ${pluginName}`);
    plugins.push(plugin);
  });

  // add internal JS handler plugin if none specified
  const needsDefaultPlugin = new Set(['.mjs', '.jsx', '.ts', '.tsx']);
  plugins
    .filter(({resolve}) => !!resolve)
    .reduce((arr, a) => arr.concat(a.resolve!.input), [] as string[])
    .forEach((ext) => needsDefaultPlugin.delete(ext));
  if (needsDefaultPlugin.size > 0) {
    plugins.unshift(execPluginFactory(esbuildPlugin, {input: [...needsDefaultPlugin]}));
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

function normalizeMount(config: SnowpackConfig, cwd: string) {
  const mountedDirs: Record<string, string | Partial<MountEntry>> = config.mount || {};
  const normalizedMount: Record<string, MountEntry> = {};
  for (const [mountDir, rawMountEntry] of Object.entries(mountedDirs)) {
    const mountEntry: Partial<MountEntry> =
      typeof rawMountEntry === 'string'
        ? {url: rawMountEntry, static: false, resolve: true}
        : rawMountEntry;
    if (!mountEntry.url) {
      handleConfigError(
        `mount[${mountDir}]: Object "${mountEntry.url}" missing required "url" option.`,
      );
      return normalizedMount;
    }
    if (mountEntry.url[0] !== '/') {
      handleConfigError(
        `mount[${mountDir}]: Value "${mountEntry.url}" must be a URL path, and start with a "/"`,
      );
    }
    normalizedMount[path.resolve(cwd, removeTrailingSlash(mountDir))] = {
      url: mountEntry.url === '/' ? '/' : removeTrailingSlash(mountEntry.url),
      static: mountEntry.static ?? false,
      resolve: mountEntry.resolve ?? true,
    };
  }
  // if no mounted directories, mount the root directory to the base URL
  if (!Object.keys(normalizedMount).length) {
    normalizedMount[cwd] = {
      url: '/',
      static: false,
      resolve: true,
    };
  }
  return normalizedMount;
}

function normalizeRoutes(routes: RouteConfigObject[]): RouteConfigObject[] {
  return routes.map(({src, dest, match}, i) => {
    // Normalize
    if (typeof dest === 'string') {
      dest = addLeadingSlash(dest);
    }
    if (!src.startsWith('^')) {
      src = '^' + src;
    }
    if (!src.endsWith('$')) {
      src = src + '$';
    }
    // Validate
    try {
      return {src, dest, match: match || 'all', _srcRegex: new RegExp(src)};
    } catch (err) {
      throw new Error(`config.routes[${i}].src: invalid regular expression syntax "${src}"`);
    }
  });
}

function normalizeAlias(config: SnowpackConfig, cwd: string, createMountAlias: boolean) {
  const cleanAlias: Record<string, string> = config.alias || {};
  if (createMountAlias) {
    for (const mountDir of Object.keys(config.mount)) {
      if (mountDir !== cwd) {
        cleanAlias[addTrailingSlash(mountDir.substr(cwd.length + 1))] = addTrailingSlash(
          `./${mountDir}`,
        );
      }
    }
  }
  for (const [target, replacement] of Object.entries(config.alias)) {
    if (
      replacement === '.' ||
      replacement === '..' ||
      replacement.startsWith('./') ||
      replacement.startsWith('../') ||
      replacement.startsWith('/')
    ) {
      delete cleanAlias[target];
      cleanAlias[target] = target.endsWith('/')
        ? addTrailingSlash(path.resolve(cwd, replacement))
        : removeTrailingSlash(path.resolve(cwd, replacement));
    }
  }
  return cleanAlias;
}

/** resolve --dest relative to cwd, etc. */
function normalizeConfig(_config: SnowpackUserConfig): SnowpackConfig {
  const cwd = process.cwd();
  // TODO: This function is really fighting with TypeScript. Now that we have an accurate
  // SnowpackUserConfig type, we can have this function construct a fresh config object
  // from scratch instead of trying to modify the user's config object in-place.
  let config: SnowpackConfig = (_config as any) as SnowpackConfig;
  config.knownEntrypoints = (config as any).install || [];
  config.buildOptions.out = path.resolve(cwd, config.buildOptions.out);
  config.installOptions.rollup = config.installOptions.rollup || {};
  config.installOptions.rollup.plugins = config.installOptions.rollup.plugins || [];
  config.exclude = Array.from(
    new Set([...ALWAYS_EXCLUDE, `${config.buildOptions.out}/**/*`, ...config.exclude]),
  );

  // normalize config URL/path values
  config.buildOptions.baseUrl = addTrailingSlash(config.buildOptions.baseUrl);
  config.buildOptions.webModulesUrl = removeTrailingSlash(
    addLeadingSlash(config.buildOptions.webModulesUrl),
  );
  config.buildOptions.metaDir = removeLeadingSlash(
    removeTrailingSlash(config.buildOptions.metaDir),
  );

  const isLegacyMountConfig = !config.mount;
  config.mount = normalizeMount(config, cwd);
  config.alias = normalizeAlias(config, cwd, isLegacyMountConfig);
  config.experiments.routes = normalizeRoutes(config.experiments.routes);
  if (config.experiments.optimize) {
    config.experiments.optimize = {
      entrypoints: config.experiments.optimize.entrypoints ?? 'auto',
      preload: config.experiments.optimize.preload ?? false,
      bundle: config.experiments.optimize.bundle ?? false,
      manifest: config.experiments.optimize.manifest ?? false,
      target: config.experiments.optimize.target ?? 'es2020',
      minify: config.experiments.optimize.minify ?? false,
    };
  }

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

  plugins.forEach((plugin) => {
    if (plugin.config) {
      plugin.config(config);
    }
  });

  return config;
}

function handleConfigError(msg: string) {
  logger.error(msg);
  process.exit(1);
}

function handleValidationErrors(filepath: string, errors: {toString: () => string}[]) {
  logger.error(`! ${filepath || 'Configuration error'}
${errors.map((err) => `    - ${err.toString()}`).join('\n')}
    See https://www.snowpack.dev for more info.`);
  process.exit(1);
}

function handleDeprecatedConfigError(mainMsg: string, ...msgs: string[]) {
  logger.error(`${mainMsg}
${msgs.join('\n')}
See https://www.snowpack.dev for more info.`);
  process.exit(1);
}

function valdiateDeprecatedConfig(rawConfig: any, _: any) {
  if (rawConfig.scripts) {
    handleDeprecatedConfigError('[v3.0] Legacy "scripts" config is deprecated.');
  }
  if (rawConfig.proxy) {
    handleDeprecatedConfigError('[v3.0] Legacy "proxy" config is deprecated in favor of "routes".');
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
  result: PluginLoadResult | string | void | undefined | null,
) {
  const pluginName = plugin.name;
  if (!result) {
    return;
  }
  const isValidSingleResultType = typeof result === 'string' || Buffer.isBuffer(result);
  if (isValidSingleResultType && plugin.resolve!.output.length !== 1) {
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
  config: SnowpackUserConfig = {},
): [ValidatorResult['errors'], undefined] | [null, SnowpackConfig] {
  const {errors: validationErrors} = validate(config, configSchema, {
    propertyName: CONFIG_NAME,
    allowUnknownAttributes: false,
  });
  if (validationErrors.length > 0) {
    return [validationErrors, undefined];
  }
  const mergedConfig = merge<SnowpackUserConfig>([DEFAULT_CONFIG, config], {
    isMergeableObject: isPlainObject,
  });
  return [null, normalizeConfig(mergedConfig)];
}

export function loadConfigurationForCLI(flags: CLIFlags, pkgManifest: any): SnowpackConfig {
  const explorerSync = cosmiconfigSync(CONFIG_NAME, {
    // only support these 5 types of config for now
    searchPlaces: [
      'package.json',
      'snowpack.config.cjs',
      'snowpack.config.js',
      'snowpack.config.ts',
      'snowpack.config.json',
    ],
    loaders: {
      '.ts': (configPath) => {
        const outPath = path.join(os.tmpdir(), '.snowpack.config.cjs');

        try {
          esbuild.buildSync({
            entryPoints: [configPath],
            outfile: outPath,
            bundle: true,
            platform: 'node',
          });

          const exported = require(outPath);

          return exported.default || exported;
        } catch (error) {
          logger.error(
            'Warning: TypeScript config file support is still experimental. Convert back to a JavaScript/JSON config file if you continue to have problems.',
          );
          throw error;
        }
      },
    },
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
  const config: SnowpackUserConfig = result.config;
  valdiateDeprecatedConfig(config, flags);
  const cliConfig = expandCliFlags(flags);

  let extendConfig: SnowpackUserConfig = {} as SnowpackUserConfig;
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
      const extendConfigDir = path.dirname(extendConfigLoc);
      extendConfig.plugins = extendConfig.plugins.map((plugin) => {
        const name = Array.isArray(plugin) ? plugin[0] : plugin;
        const absName = path.isAbsolute(name)
          ? name
          : require.resolve(name, {paths: [extendConfigDir]});
        if (Array.isArray(plugin)) {
          plugin.splice(0, 1, absName);
          return plugin;
        }
        return absName;
      });
    }
  }
  // if valid, apply config over defaults
  const mergedConfig = merge<SnowpackUserConfig>(
    [
      pkgManifest.homepage ? {buildOptions: {baseUrl: pkgManifest.homepage}} : {},
      extendConfig,
      {webDependencies: pkgManifest.webDependencies},
      config,
      cliConfig as any,
    ],
    {
      isMergeableObject: isPlainObject,
    },
  );

  const [validationErrors, configResult] = createConfiguration(mergedConfig);
  if (validationErrors) {
    handleValidationErrors(result.filepath, validationErrors);
    process.exit(1);
  }
  return configResult!;
}

import {all as merge} from 'deepmerge';
import {existsSync} from 'fs';
import {isPlainObject} from 'is-plain-object';
import {validate} from 'jsonschema';
import {dim} from 'kleur/colors';
import os from 'os';
import path from 'path';
import {logger} from './logger';
import {esbuildPlugin} from './plugins/plugin-esbuild';
import {
  CLIFlags,
  MountEntry,
  PackageSourceLocal,
  PackageSourceSkypack,
  PluginLoadResult,
  RouteConfigObject,
  SnowpackConfig,
  SnowpackPlugin,
  SnowpackUserConfig,
} from './types';
import {
  addLeadingSlash,
  addTrailingSlash,
  NATIVE_REQUIRE,
  removeLeadingSlash,
  removeTrailingSlash,
} from './util';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['**/node_modules/**/*', '**/web_modules/**/*', '**/.types/**/*'];

// default settings
const DEFAULT_ROOT = process.cwd();
const DEFAULT_CONFIG: SnowpackUserConfig = {
  root: DEFAULT_ROOT,
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
    clean: true,
    metaDir: '__snowpack__',
    sourceMaps: false,
    watch: false,
    htmlFragments: false,
  },
  testOptions: {
    files: ['__tests__/**/*', '**/*.@(spec|test).*'],
  },
  packageOptions: {source: 'local'},
  experiments: {
    routes: [],
    ssr: false,
  },
};

const DEFAULT_PACKAGES_LOCAL_CONFIG: PackageSourceLocal = {
  source: 'local',
};

const DEFAULT_PACKAGES_SKYPACK_CONFIG: PackageSourceSkypack = {
  source: 'skypack',
  cache: '.snowpack',
  types: false,
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
export function expandCliFlags(flags: CLIFlags): SnowpackUserConfig {
  const result = {
    packageOptions: {} as any,
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
    if (flag === 'source') {
      result.packageOptions = {source: val};
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
): {plugins: SnowpackPlugin[]; extensionMap: Record<string, string[]>} {
  const plugins: SnowpackPlugin[] = [];

  function execPluginFactory(pluginFactory: any, pluginOptions: any = {}): SnowpackPlugin {
    let plugin: SnowpackPlugin | null = null;
    plugin = pluginFactory(config, pluginOptions) as SnowpackPlugin;
    return plugin;
  }

  function loadPluginFromConfig(pluginLoc: string, options?: any): SnowpackPlugin {
    if (!path.isAbsolute(pluginLoc)) {
      throw new Error(
        `Snowpack Internal Error: plugin ${pluginLoc} should have been resolved to an absolute path.`,
      );
    }
    const pluginRef = NATIVE_REQUIRE(pluginLoc);
    let plugin: SnowpackPlugin;
    try {
      plugin = typeof pluginRef.default === 'function' ? pluginRef.default : pluginRef;
      if (typeof plugin !== 'function') logger.error(`plugin ${pluginLoc} must export a function.`);
      plugin = execPluginFactory(plugin, options) as SnowpackPlugin;
    } catch (err) {
      logger.error(err.toString());
      throw err;
    }

    if (!plugin.name) {
      plugin.name = path.relative(process.cwd(), pluginLoc);
    }

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
        map[inputExt] = resolve.output;
      }
    }
    return map;
  }, {} as Record<string, string[]>);

  return {
    plugins,
    extensionMap,
  };
}

function normalizeMount(config: SnowpackConfig) {
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
    normalizedMount[removeTrailingSlash(mountDir)] = {
      url: mountEntry.url === '/' ? '/' : removeTrailingSlash(mountEntry.url),
      static: mountEntry.static ?? false,
      resolve: mountEntry.resolve ?? true,
    };
  }
  // if no mounted directories, mount the root directory to the base URL
  if (!Object.keys(normalizedMount).length) {
    normalizedMount[process.cwd()] = {
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

/** resolve --dest relative to cwd, etc. */
function normalizeConfig(_config: SnowpackUserConfig): SnowpackConfig {
  // TODO: This function is really fighting with TypeScript. Now that we have an accurate
  // SnowpackUserConfig type, we can have this function construct a fresh config object
  // from scratch instead of trying to modify the user's config object in-place.
  let config: SnowpackConfig = (_config as any) as SnowpackConfig;
  config.knownEntrypoints = (config as any).install || [];
  config.installOptions.cwd = config.root;
  config.installOptions.rollup = config.installOptions.rollup || {};
  config.installOptions.rollup.plugins = config.installOptions.rollup.plugins || [];
  config.exclude = Array.from(
    new Set([...ALWAYS_EXCLUDE, `${config.buildOptions.out}/**/*`, ...config.exclude]),
  );

  // normalize config URL/path values
  config.buildOptions.out = removeTrailingSlash(config.buildOptions.out);
  config.buildOptions.baseUrl = addTrailingSlash(config.buildOptions.baseUrl);
  config.buildOptions.webModulesUrl = removeTrailingSlash(
    addLeadingSlash(config.buildOptions.webModulesUrl),
  );
  config.buildOptions.metaDir = removeLeadingSlash(
    removeTrailingSlash(config.buildOptions.metaDir),
  );

  config.mount = normalizeMount(config);
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

function handleValidationErrors(filepath: string, err: ConfigValidationError) {
  logger.error(`! ${filepath}\n${err.message}`);
  logger.info(dim(`See https://www.snowpack.dev for more info.`));
  process.exit(1);
}

function handleDeprecatedConfigError(mainMsg: string, ...msgs: string[]) {
  logger.error(`${mainMsg}
${msgs.join('\n')}
See https://www.snowpack.dev for more info.`);
  process.exit(1);
}

function valdiateDeprecatedConfig(rawConfig: any) {
  if (rawConfig.scripts) {
    handleDeprecatedConfigError('[v3.0] Legacy "scripts" config is deprecated.');
  }
  if (rawConfig.proxy) {
    handleDeprecatedConfigError('[v3.0] Legacy "proxy" config is deprecated in favor of "routes".');
  }
  if (rawConfig.experiments?.source) {
    handleDeprecatedConfigError('[v3.0] "config.experiments.source" is now "config.packageOptions".');
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

/**
 * Get the config base path, that all relative config values should resolve to. In order:
 *   - The directory of the config file path, if it exists.
 *   - The config.root value, if given.
 *   - Otherwise, the current working directory of the process.
 */
function getConfigBasePath(configFileLoc: string | undefined, configRoot: string | undefined) {
  return (
    (configFileLoc && path.dirname(configFileLoc)) ||
    (configRoot && path.resolve(process.cwd(), configRoot)) ||
    process.cwd()
  );
}

function resolveRelativeConfigAlias(
  aliasConfig: Record<string, string>,
  configBase: string,
): SnowpackUserConfig['alias'] {
  const cleanAliasConfig = {};
  for (const [target, replacement] of Object.entries(aliasConfig)) {
    const isDirectory = target.endsWith('/');
    const isPath =
      replacement === '.' ||
      replacement === '..' ||
      replacement.startsWith('./') ||
      replacement.startsWith('../') ||
      replacement.startsWith('/');
    if (isPath) {
      cleanAliasConfig[target] = isDirectory
        ? addTrailingSlash(path.resolve(configBase, replacement))
        : removeTrailingSlash(path.resolve(configBase, replacement));
    } else {
      cleanAliasConfig[target] = replacement;
    }
  }
  return cleanAliasConfig;
}

function resolveRelativeConfigMount(
  mountConfig: Record<string, any>,
  configBase: string,
): SnowpackUserConfig['mount'] {
  const cleanMountConfig = {};
  for (const [target, replacement] of Object.entries(mountConfig)) {
    cleanMountConfig[path.resolve(configBase, target)] = replacement;
  }
  return cleanMountConfig;
}

function resolveRelativeConfig(config: SnowpackUserConfig, configBase: string): SnowpackUserConfig {
  if (config.root) {
    config.root = path.resolve(configBase, config.root);
  }
  if (config.buildOptions?.out) {
    config.buildOptions.out = path.resolve(configBase, config.buildOptions.out);
  }
  if (config.installOptions?.cwd) {
    config.installOptions.cwd = path.resolve(configBase, config.installOptions.cwd);
  }
  if (config.packageOptions?.source === 'skypack' && config.packageOptions.cache) {
    config.packageOptions.cache = path.resolve(configBase, config.packageOptions.cache);
  }
  if (config.extends) {
    config.extends = path.resolve(configBase, config.extends);
  }
  if (config.plugins) {
    config.plugins = config.plugins.map((plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      const absName = path.isAbsolute(name) ? name : require.resolve(name, {paths: [configBase]});
      if (Array.isArray(plugin)) {
        plugin.splice(0, 1, absName);
        return plugin;
      }
      return absName;
    });
  }
  if (config.mount) {
    config.mount = resolveRelativeConfigMount(config.mount, configBase);
  }
  if (config.alias) {
    config.alias = resolveRelativeConfigAlias(config.alias, configBase);
  }
  return config;
}

class ConfigValidationError extends Error {
  constructor(errors: Error[]) {
    super(`Configuration Error:\n${errors.map((err) => `  - ${err.toString()}`).join(os.EOL)}`);
  }
}

export function createConfiguration(config: SnowpackUserConfig = {}): SnowpackConfig {
  // Validate the configuration object against our schema. Report any errors.
  const {errors: validationErrors} = validate(config, configSchema, {
    propertyName: CONFIG_NAME,
    allowUnknownAttributes: false,
  });
  if (validationErrors.length > 0) {
    throw new ConfigValidationError(validationErrors);
  }
  // Inherit any undefined values from the default configuration. If no config argument
  // was passed (or no configuration file found in loadConfiguration) then this function
  // will effectively return a copy of the DEFAULT_CONFIG object.
  const mergedConfig = merge<SnowpackUserConfig>(
    [
      DEFAULT_CONFIG,
      {
        packageOptions:
          config.packageOptions?.source === 'skypack'
            ? DEFAULT_PACKAGES_SKYPACK_CONFIG
            : DEFAULT_PACKAGES_LOCAL_CONFIG,
      },
      config,
    ],
    {
      isMergeableObject: (val) => isPlainObject(val) || Array.isArray(val),
    },
  );
  // Resolve relative config values. If using loadConfiguration, all config values should
  // already be resolved relative to the config file path so that this should be a no-op.
  // But, we still need to run it in case you called this function directly.
  const configBase = getConfigBasePath(undefined, config.root);
  resolveRelativeConfig(mergedConfig, configBase);
  // Normalize & return.
  return normalizeConfig(mergedConfig);
}

function loadConfigurationFile(
  filename: string,
): {filepath: string | undefined; config: SnowpackUserConfig} | null {
  const loc = path.resolve(process.cwd(), filename);
  if (!existsSync(loc)) {
    return null;
  }
  return {filepath: loc, config: NATIVE_REQUIRE(loc)};
}

export async function loadConfiguration(
  overrides: SnowpackUserConfig = {},
  configPath?: string,
): Promise<SnowpackConfig> {
  let result: ReturnType<typeof loadConfigurationFile> = null;
  // if user specified --config path, load that
  if (configPath) {
    result = loadConfigurationFile(configPath);
    if (!result) {
      throw new Error(`Snowpack config file could not be found: ${configPath}`);
    }
  }

  // If no config was found above, search for one.
  result =
    result ||
    loadConfigurationFile('snowpack.config.mjs') ||
    loadConfigurationFile('snowpack.config.cjs') ||
    loadConfigurationFile('snowpack.config.js') ||
    loadConfigurationFile('snowpack.config.json');

  // Support package.json "snowpack" config
  if (!result) {
    const potentialPackageJsonConfig = loadConfigurationFile('package.json');
    if (potentialPackageJsonConfig && (potentialPackageJsonConfig.config as any).snowpack) {
      result = {
        filepath: potentialPackageJsonConfig.filepath,
        config: (potentialPackageJsonConfig.config as any).snowpack,
      };
    }
  }

  if (!result) {
    logger.warn('Hint: run "snowpack init" to create a project config file. Using defaults...');
    result = {filepath: undefined, config: {}};
  }

  const {config, filepath} = result;
  const configBase = getConfigBasePath(filepath, config.root);
  valdiateDeprecatedConfig(config);
  valdiateDeprecatedConfig(overrides);
  resolveRelativeConfig(config, configBase);

  let extendConfig: SnowpackUserConfig = {} as SnowpackUserConfig;
  if (config.extends) {
    const extendConfigLoc = require.resolve(config.extends, {paths: [configBase]});
    const extendResult = loadConfigurationFile(extendConfigLoc);
    if (!extendResult) {
      handleConfigError(`Could not locate "extends" config at ${extendConfigLoc}`);
      process.exit(1);
    }
    extendConfig = extendResult.config;
    const extendValidation = validate(extendConfig, configSchema, {
      allowUnknownAttributes: false,
      propertyName: CONFIG_NAME,
    });
    if (extendValidation.errors && extendValidation.errors.length > 0) {
      handleValidationErrors(extendConfigLoc, new ConfigValidationError(extendValidation.errors));
    }
    resolveRelativeConfig(extendConfig, extendConfigLoc);
  }

  // if valid, apply config over defaults
  const mergedConfig = merge<SnowpackUserConfig>([extendConfig, config, overrides], {
    isMergeableObject: (val) => isPlainObject(val) || Array.isArray(val),
  });

  try {
    return createConfiguration(mergedConfig);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      handleValidationErrors(filepath!, err);
    }
    throw err;
  }
}

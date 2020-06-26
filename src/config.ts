import {cosmiconfigSync} from 'cosmiconfig';
import {all as merge} from 'deepmerge';
import {validate, ValidatorResult} from 'jsonschema';
import http from 'http';
import type HttpProxy from 'http-proxy';
import * as colors from 'kleur/colors';
import path from 'path';
import {Plugin as RollupPlugin} from 'rollup';
import yargs from 'yargs-parser';
import {esbuildPlugin} from './commands/esbuildPlugin';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['**/node_modules/**/*', '**/.types/**/*'];

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type EnvVarReplacements = Record<string, string | number | true>;

type RunCmd = {id: string; cmd: string};

/** Snowpack export map */
export type SnowpackBuildMap = {[outputLoc: string]: SnowpackSourceFile};

/** Standard file interface */
export interface SnowpackSourceFile {
  /** base extension (e.g. `.js`) */
  baseExt: string;
  /** file contents */
  code: string;
  /** expanded extension (e.g. `.proxy.js` or `.module.css`) */
  expandedExt: string;
  /** if no location on disk, assume this exists in memory */
  locOnDisk?: string;
}

export interface BuildOptions {
  code: string;
  contents?: string; // deprecated in favor of “code“
  filePath: string;
  isDev: boolean;
}

/** DEPRECATED */
export type __OldBuildResult = {result: string; resources?: {css?: string}};

/** map of extensions -> code (e.g. { ".js": "[code]", ".css": "[code]" }) */
export type BuildResult = string | {[fileExtension: string]: string} | __OldBuildResult;

export interface BundleOptions {
  srcDirectory: string;
  destDirectory: string;
  jsFilePaths: Set<string>;
  log: (msg, level?: 'INFO' | 'WARN' | 'ERROR') => void;
}

export interface __OldTransformOptions {
  contents: string;
  urlPath: string;
  isDev: boolean;
}

export interface SnowpackPlugin {
  /** name of the plugin */
  name: string;
  /** file extensions this plugin takes as input (e.g. [".jsx", ".js", …]) */
  input: string | string[];
  /** file extensions this plugin outputs (e.g. [".js", ".css"]) */
  output: string | string[];
  /** transform input to output */
  build?(BuildOptions): Promise<BuildResult>;
  /** bundle  */
  bundle?(BundleOptions): Promise<void>;
  /** DEPRECATED */
  transform?(__OldTransformOptions): Promise<__OldBuildResult>;
  /** DEPRECATED */
  defaultBuildScript?: string;
  /** DEPRECATED */
  knownEntrypoints?: string[];
}

export type ProxyOptions = HttpProxy.ServerOptions & {
  // Custom on: {} event handlers
  on: Record<string, Function>;
};
export type Proxy = [string, ProxyOptions];

// interface this library uses internally
export interface SnowpackConfig {
  install: string[];
  extends?: string;
  exclude: string[];
  knownEntrypoints: string[];
  webDependencies?: {[packageName: string]: string};
  scripts: Record<string, string>;
  plugins: SnowpackPlugin[];
  devOptions: {
    secure: boolean;
    port: number;
    out: string;
    fallback: string;
    open: string;
    bundle: boolean | undefined;
    hmr: boolean;
  };
  installOptions: {
    dest: string;
    env: EnvVarReplacements;
    treeshake?: boolean;
    installTypes: boolean;
    sourceMap?: boolean | 'inline';
    externalPackage: string[];
    alias: {[key: string]: string};
    namedExports: string[];
    rollup: {
      plugins: RollupPlugin[]; // for simplicity, only Rollup plugins are supported for now
      dedupe?: string[];
    };
  };
  buildOptions: {
    baseUrl: string;
    metaDir: string;
  };
  proxy: Proxy[];
  // experimental API; don’t expose to external config
  __buildPipeline: Record<string, SnowpackPlugin[]>;
  __runCommands: RunCmd[];
  __buildCommands: Record<string, RunCmd>;
  __mountedDirs: Record<string, string>;
  __bundler: SnowpackPlugin | undefined;
  __webModulesDir: string; // TODO: delete this once mount:web_modules no longer supported
}

export interface CLIFlags extends Omit<Partial<SnowpackConfig['installOptions']>, 'env'> {
  help?: boolean; // display help text
  version?: boolean; // display Snowpack version
  reload?: boolean;
  config?: string; // manual path to config file
  env?: string[]; // env vars
  open?: string[];
  secure?: boolean;
}

// default settings
const DEFAULT_CONFIG: Partial<SnowpackConfig> = {
  exclude: ['__tests__/**/*', '**/*.@(spec|test).*'],
  plugins: [],
  installOptions: {
    dest: 'web_modules',
    externalPackage: [],
    installTypes: false,
    env: {},
    alias: {},
    namedExports: [],
    rollup: {
      plugins: [],
      dedupe: [],
    },
  },
  scripts: {},
  devOptions: {
    secure: false,
    port: 8080,
    open: 'default',
    out: 'build',
    fallback: 'index.html',
    hmr: true,
    bundle: undefined,
  },
  buildOptions: {
    baseUrl: '/',
    metaDir: '__snowpack__',
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
        metaDir: {type: 'string'},
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
    console.error(`Unknown CLI flag: "${flag}"`);
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
function parseScript(script: string): {scriptType: string; extensions: string[]} {
  const [scriptType, extMatch] = script.toLowerCase().split(':');
  return {
    scriptType,
    extensions: [...new Set(extMatch.split(',').map((ext) => `.${ext}`.replace(/^\./, '').trim()))], // only keep unique extensions
  };
}

/** load and normalize plugins from config */
function loadPlugins(
  config: SnowpackConfig,
): {
  plugins: SnowpackPlugin[];
  bundler: SnowpackPlugin | undefined;
  mountedDirs: Record<string, string>;
  runCommands: RunCmd[];
  buildCommands: Record<string, RunCmd>;
  webModulesDir: string;
} {
  const plugins: SnowpackPlugin[] = [];
  const mountedDirs: Record<string, string> = {};
  const runCommands: RunCmd[] = [];
  let webModulesDir = config.installOptions.dest || '/web_modules';
  let bundler: SnowpackPlugin | undefined;

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
    return require(pluginLoc)(config, options);
  }

  // 1. require & load config.scripts
  // TODO: deprecate scripts and move out of this function
  const scriptPlugins: {[pluginName: string]: SnowpackPlugin} = {};
  const buildCommands: Record<string, RunCmd> = {};
  Object.entries(config.scripts).forEach(([target, cmd]) => {
    const {scriptType, extensions} = parseScript(target);

    switch (scriptType) {
      case 'run': {
        runCommands.push({id: target, cmd});
        break;
      }
      case 'build': {
        const pluginName = cmd;
        const plugin = loadPluginFromScript(pluginName);
        if (plugin) {
          // path a: plugin
          if (!scriptPlugins[pluginName]) {
            // if plugin not loaded, add it (copying extensions -> input/output)
            scriptPlugins[pluginName] = {...plugin};
          }
        } else {
          // path b: command
          extensions.forEach((ext) => {
            buildCommands[ext] = {id: target, cmd};
          });
        }
        break;
      }
      case 'mount': {
        const cmdArr = cmd.split(/\s+/);
        if (cmdArr[0] !== 'mount') {
          handleConfigError(`scripts[${target}] must use the mount command`);
        }
        cmdArr.shift();
        const {to, _} = yargs(cmdArr);
        if (_.length !== 1) {
          handleConfigError(`scripts[${target}] must use the format: "mount dir [--to /PATH]"`);
        }
        if (to && to[0] !== '/') {
          handleConfigError(
            `scripts[${target}]: "--to ${to}" must be a URL path, and start with a "/"`,
          );
        }

        const fromDisk = path.posix.normalize(cmdArr[0] + '/');
        const dirUrl = to || `/${cmdArr[0]}`;
        const toUrl = path.posix.normalize(dirUrl + '/');

        // TODO: skip this once mount:web_modules no longer supported
        if (target === 'mount:web_modules') {
          webModulesDir = toUrl;
          break;
        }

        mountedDirs[fromDisk] = toUrl;
        break;
      }
      case 'bundle': {
        const bundlerName = cmd;
        bundler = loadPluginFromScript(bundlerName);
        if (!bundler) {
          handleConfigError(
            `Failed to load plugin "${bundlerName}". Only installed Snowpack Plugins are supported for bundle:*`,
          );
          return;
        }
        // TODO: remove with new bundler API
        if (!bundler.name) bundler.name = bundlerName;
        break;
      }
    }
  });

  plugins.push(...Object.values(scriptPlugins));

  // 2. config.plugins
  config.plugins.forEach((ref) => {
    const pluginName = Array.isArray(ref) ? ref[0] : ref;
    const pluginOptions = Array.isArray(ref) ? ref[1] : {};

    if (scriptPlugins[pluginName]) {
      handleConfigError(
        `[${pluginName}]: loaded in both \`scripts\` and \`plugins\`. Please choose one (preferably \`plugins\`).`,
      );
      return;
    }

    const plugin = loadPluginFromConfig(pluginName, pluginOptions);

    // TODO: remove this transition code when all plugins use new API
    if (!plugin.defaultBuildScript && !plugin.input) {
      handleConfigError(`[${pluginName}]: missing input options (see snowpack.dev/plugins)`);
      return;
    }

    if (plugin.defaultBuildScript && !plugin.input) {
      const {extensions} = parseScript(plugin.defaultBuildScript);
      // TODO: remove these when plugins are updated
      if (extensions[0] === '.svelte') {
        plugin.input = ['.svelte'];
        plugin.output = ['.js', '.css'];
      } else if (extensions[0] === '.vue') {
        plugin.input = ['.vue'];
        plugin.output = ['.js', '.css'];
      } else {
        plugin.input = extensions;
        plugin.output = extensions;
      }
    }

    if (!name) {
      plugin.name = pluginName;
    }
    // END transition code

    plugins.push(plugin);
  });

  // if no mounted directories, mount root
  if (!Object.keys(mountedDirs).length) mountedDirs['.'] = '/';

  return {
    plugins,
    bundler,
    mountedDirs,
    runCommands, // TODO: handle this elsewhere (in config?)
    buildCommands, // TODO: remove this when plugins handle building
    webModulesDir, // TODO: remove this when mount:web_modules no longer supported
  };
}

/** create build pipeline from plugin array */
export function createBuildPipeline(plugins: SnowpackPlugin[]): Record<string, SnowpackPlugin[]> {
  const pipeline: Record<string, SnowpackPlugin[]> = {};
  [...plugins, esbuildPlugin()].forEach((plugin) => {
    const inputs = Array.isArray(plugin.input) ? plugin.input : [plugin.input]; // builds only care about inputs (outputs are handled during build)
    inputs.forEach((ext) => {
      if (pipeline[ext]) pipeline[ext].push(plugin);
      else pipeline[ext] = [plugin];
    });
  });

  return pipeline;
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

/** resolve --dest relative to cwd, etc. */
function normalizeConfig(config: SnowpackConfig): SnowpackConfig {
  const cwd = process.cwd();
  config.knownEntrypoints = (config as any).install || [];
  config.devOptions.out = path.resolve(cwd, config.devOptions.out);
  config.exclude = Array.from(new Set([...ALWAYS_EXCLUDE, ...config.exclude]));

  if (!config.proxy) {
    config.proxy = {} as any;
  }

  // remove leading/trailing slashes
  config.buildOptions.metaDir = config.buildOptions.metaDir
    .replace(/^(\/|\\)/g, '') // replace leading slash
    .replace(/(\/|\\)$/g, ''); // replace trailing slash

  if (config.devOptions.bundle === true && !config.scripts['bundle:*']) {
    handleConfigError(`--bundle set to true, but no "bundle:*" script/plugin was provided.`);
  }

  config = handleLegacyProxyScripts(config);
  config.proxy = normalizeProxies(config.proxy as any);

  // new pipeline
  const {plugins, runCommands, mountedDirs, buildCommands, bundler, webModulesDir} = loadPlugins(
    config,
  );
  const buildPipeline = createBuildPipeline(plugins);
  config.plugins = plugins;
  config.__buildPipeline = buildPipeline;
  config.__mountedDirs = mountedDirs;
  config.__runCommands = runCommands;
  config.__buildCommands = buildCommands;
  config.__bundler = bundler;
  config.__webModulesDir = webModulesDir;

  // resolve webModulesDir to absolute dir as last step
  config.installOptions.dest = path.resolve(cwd, config.installOptions.dest);

  return config;
}

function handleConfigError(msg: string) {
  console.error(`[error]: ${msg}`);
  process.exit(1);
}

function handleValidationErrors(filepath: string, errors: {toString: () => string}[]) {
  console.error(colors.red(`! ${filepath || 'Configuration error'}`));
  console.error(errors.map((err) => `    - ${err.toString()}`).join('\n'));
  console.error(`    See https://www.snowpack.dev/#configuration for more info.`);
  process.exit(1);
}

function handleDeprecatedConfigError(mainMsg: string, ...msgs: string[]) {
  console.error(colors.red(mainMsg));
  msgs.forEach(console.error);
  console.error(`See https://www.snowpack.dev/#configuration for more info.`);
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
    console.error(
      colors.yellow(
        '[Snowpack v2.3.0] `rollup.namedExports` is no longer required. See also: installOptions.namedExports',
      ),
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
  if (rawConfig.installOptions?.optimize || cliFlags.optimize) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.optimize` has been replaced by `snowpack build`.',
    );
  }
  if (rawConfig.installOptions?.strict || cliFlags.strict) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.strict` is no longer supported.',
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

  let extendConfig: SnowpackConfig | {} = {};
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

import chalk from 'chalk';
import {cosmiconfigSync} from 'cosmiconfig';
import {all as merge} from 'deepmerge';
import {validate, ValidatorResult} from 'jsonschema';
import http from 'http';
import type HttpProxy from 'http-proxy';
import path from 'path';
import {Plugin as RollupPlugin} from 'rollup';
import yargs from 'yargs-parser';
import {esbuildPlugin} from './commands/esbuildPlugin';
import {BUILD_DEPENDENCIES_DIR, DEV_DEPENDENCIES_DIR} from './util';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['**/node_modules/**/*', '**/.types/**/*'];
const SCRIPT_TYPES_WEIGHTED = {
  proxy: 1,
  mount: 2,
  run: 3,
  build: 4,
  bundle: 100,
} as {[type in ScriptType]: number};

type ScriptType = 'mount' | 'run' | 'build' | 'bundle';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type EnvVarReplacements = Record<string, string | number | true>;

export type SnowpackPluginBuildArgs = {
  contents: string;
  filePath: string;
  isDev: boolean;
};
export type SnowpackPluginTransformArgs = {
  contents: string;
  urlPath: string;
  isDev: boolean;
};
export type SnowpackPluginBuildResult = {
  result: string;
  resources?: {css?: string};
};
export type SnowpackPluginTransformResult = {
  result: string;
  resources?: {css?: string};
};
/** A plugin that controls transformations of files through Snowpack */
export type SnowpackPlugin = {
  defaultBuildScript?: string;
  knownEntrypoints?: string[];
  build?: (
    args: SnowpackPluginBuildArgs,
  ) => null | SnowpackPluginBuildResult | Promise<null | SnowpackPluginBuildResult>;
  transform?: (
    args: SnowpackPluginTransformArgs,
  ) => null | SnowpackPluginTransformResult | Promise<null | SnowpackPluginTransformResult>;
  bundle?(args: {
    srcDirectory: string;
    destDirectory: string;
    jsFilePaths: Set<string>;
    log: (msg) => void;
  }): Promise<void>;
};
export type BuildScript = {
  id: string;
  match: string[];
  type: ScriptType;
  cmd: string;
  watch?: string;
  plugin?: SnowpackPlugin;
  args?: any;
};

/** Snowpack’s snapshot of a file at any given point through a pipeline (keep in mind that a file may be in an intermediary phase, between initial input & final output) */
export interface SnowpackFile {
  /** Original location on disk */
  filePath: string;
  /** The code of the file in memory (keep in mind this may differ from the contents on disk) */
  code: string;
  /** Full import path of the file */
  importPath: string;
}

export type ProxyOptions = HttpProxy.ServerOptions & {
  // Custom on: {} event handlers
  on: Record<string, Function>;
};
export type Proxy = [string, ProxyOptions];
/** Pipeline step **/
export type SnowpackPipelineStep = string | [string, any]; // Snowpack plugins may be in [plugin, options] tuple format
/** Transform steps for files, separated by file extension */
export type SnowpackPipeline = {[ext: string]: SnowpackPipelineStep[]};

/** Full shape of Snowpack configuration */
export interface SnowpackConfig {
  install: string[];
  extends?: string;
  exclude: string[];
  knownEntrypoints: string[];
  webDependencies?: {[packageName: string]: string};
  scripts: BuildScript[];
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
  /** Array of commands to run for each file type */
  pipeline?: SnowpackPipeline;
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
  pipeline: {
    '.proxy.js': ['@snowpack/plugin-proxy'], // TODO: release this externally?
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
    pipeline: {
      type: ['object'],
      additionalProperties: {type: 'array', items: {oneOf: [{type: 'string'}, {type: 'array'}]}}, // chained commands and/or Snowpack plugins (Snowpack plugins may be in tuple format to pass options)
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

type RawScripts = Record<string, string>;
function normalizeScripts(cwd: string, scripts: RawScripts): BuildScript[] {
  const dependenciesLoc =
    process.env.NODE_ENV === 'production' ? BUILD_DEPENDENCIES_DIR : DEV_DEPENDENCIES_DIR;
  const processedScripts: BuildScript[] = [];
  if (Object.keys(scripts).filter((k) => k.startsWith('bundle:')).length > 1) {
    handleConfigError(`scripts can only contain 1 script of type "bundle:".`);
  }
  for (const scriptId of Object.keys(scripts)) {
    if (scriptId.includes('::watch')) {
      continue;
    }
    const [scriptType, scriptMatch] = scriptId.split(':') as [ScriptType, string];
    if (!SCRIPT_TYPES_WEIGHTED[scriptType]) {
      handleConfigError(`scripts[${scriptId}]: "${scriptType}" is not a known script type.`);
    }
    const cmd = (scripts[scriptId] as any) as string;
    const newScriptConfig: BuildScript = {
      id: scriptId,
      type: scriptType,
      match: scriptMatch.split(','),
      cmd,
      watch: (scripts[`${scriptId}::watch`] as any) as string | undefined,
    };
    if (newScriptConfig.watch) {
      newScriptConfig.watch = newScriptConfig.watch.replace('$1', newScriptConfig.cmd);
    }
    if (scriptType === 'mount') {
      const cmdArr = cmd.split(/\s+/);
      if (cmdArr[0] !== 'mount') {
        handleConfigError(`scripts[${scriptId}] must use the mount command`);
      }
      cmdArr.shift();
      const {to, _} = yargs(cmdArr);
      if (_.length !== 1) {
        handleConfigError(`scripts[${scriptId}] must use the format: "mount dir [--to /PATH]"`);
      }
      if (to && to[0] !== '/') {
        handleConfigError(
          `scripts[${scriptId}]: "--to ${to}" must be a URL path, and start with a "/"`,
        );
      }
      let dirDisk = cmdArr[0];
      const dirUrl = to || `/${cmdArr[0]}`;

      // mount:web_modules is a special case script where the fromDisk
      // arg is harcoded to match the internal dependency dir
      if (scriptId === 'mount:web_modules') {
        dirDisk = dependenciesLoc;
      }

      newScriptConfig.args = {
        fromDisk: path.posix.normalize(dirDisk + '/'),
        toUrl: path.posix.normalize(dirUrl + '/'),
      };
    }
    processedScripts.push(newScriptConfig);
  }
  const allBuildMatch = new Set<string>();
  for (const {type, match} of processedScripts) {
    if (type !== 'build') {
      continue;
    }
    for (const ext of match) {
      if (allBuildMatch.has(ext)) {
        handleConfigError(
          `Multiple "scripts" match the "${ext}" file extension.\nCurrently, only one script per file type is supported.`,
        );
      }
      allBuildMatch.add(ext);
    }
  }

  if (!scripts['mount:web_modules']) {
    processedScripts.push({
      id: 'mount:web_modules',
      type: 'mount',
      match: ['web_modules'],
      cmd: `mount $WEB_MODULES --to /web_modules`,
      args: {
        fromDisk: dependenciesLoc,
        toUrl: '/web_modules',
      },
    });
  }

  const defaultBuildMatch = ['js', 'jsx', 'ts', 'tsx'].filter((ext) => !allBuildMatch.has(ext));
  if (defaultBuildMatch.length > 0) {
    const defaultBuildWorkerConfig = {
      id: `build:${defaultBuildMatch.join(',')}`,
      type: 'build',
      match: defaultBuildMatch,
      cmd: '(default) esbuild',
      plugin: esbuildPlugin(),
    } as BuildScript;
    processedScripts.push(defaultBuildWorkerConfig);
  }
  processedScripts.sort((a, b) => {
    if (a.type === b.type) {
      if (a.id === 'mount:web_modules') {
        return -1;
      }
      if (b.id === 'mount:web_modules') {
        return 1;
      }
      return a.id.localeCompare(b.id);
    }
    return SCRIPT_TYPES_WEIGHTED[a.type] - SCRIPT_TYPES_WEIGHTED[b.type];
  });
  return processedScripts;
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
  config.installOptions.dest = path.resolve(cwd, config.installOptions.dest);
  config.devOptions.out = path.resolve(cwd, config.devOptions.out);
  config.exclude = Array.from(new Set([...ALWAYS_EXCLUDE, ...config.exclude]));
  if (!config.scripts) {
    config.exclude.push('**/.*');
    config.scripts = {
      'mount:*': 'mount . --to /',
    } as any;
  }
  if (!config.proxy) {
    config.proxy = {} as any;
  }
  const allPlugins = {};
  // remove leading/trailing slashes
  config.buildOptions.metaDir = config.buildOptions.metaDir
    .replace(/^(\/|\\)/g, '') // replace leading slash
    .replace(/(\/|\\)$/g, ''); // replace trailing slash
  config.plugins = (config.plugins as any).map((plugin: string | [string, any]) => {
    const configPluginPath = Array.isArray(plugin) ? plugin[0] : plugin;
    const configPluginOptions = (Array.isArray(plugin) && plugin[1]) || {};
    const configPluginLoc = require.resolve(configPluginPath, {paths: [cwd]});
    const configPlugin = require(configPluginLoc)(config, configPluginOptions);
    if (
      (configPlugin.build ? 1 : 0) +
        (configPlugin.transform ? 1 : 0) +
        (configPlugin.bundle ? 1 : 0) >
      1
    ) {
      handleConfigError(
        `plugin[${configPluginLoc}]: A valid plugin can only have one build(), transform(), or bundle() function.`,
      );
    }
    allPlugins[configPluginPath] = configPlugin;
    if (configPlugin.knownEntrypoints) {
      config.knownEntrypoints.push(...configPlugin.knownEntrypoints);
    }
    if (
      configPlugin.defaultBuildScript &&
      !(config.scripts as any)[configPlugin.defaultBuildScript] &&
      !Object.values(config.scripts as any).includes(configPluginPath)
    ) {
      (config.scripts as any)[configPlugin.defaultBuildScript] = configPluginPath;
    }
    return configPlugin;
  });
  if (config.devOptions.bundle === true && !config.scripts['bundle:*']) {
    handleConfigError(`--bundle set to true, but no "bundle:*" script/plugin was provided.`);
  }
  config = handleLegacyProxyScripts(config);
  config.proxy = normalizeProxies(config.proxy as any);
  config.scripts = normalizeScripts(cwd, config.scripts as any);
  config.scripts.forEach((script: BuildScript, i) => {
    if (script.plugin) return;

    // Ensure plugins are properly registered/configured
    if (['build', 'bundle'].includes(script.type)) {
      if (allPlugins[script.cmd]?.[script.type]) {
        script.plugin = allPlugins[script.cmd];
      } else if (allPlugins[script.cmd] && !allPlugins[script.cmd][script.type]) {
        handleConfigError(
          `scripts[${script.id}]: Plugin "${script.cmd}" has no ${script.type} script.`,
        );
      } else if (script.cmd.startsWith('@') || script.cmd.startsWith('.')) {
        handleConfigError(
          `scripts[${script.id}]: Register plugin "${script.cmd}" in your Snowpack "plugins" config.`,
        );
      }
    }
  });

  return config;
}

function handleConfigError(msg: string) {
  console.error(`[error]: ${msg}`);
  process.exit(1);
}

function handleValidationErrors(filepath: string, errors: {toString: () => string}[]) {
  console.error(chalk.red(`! ${filepath || 'Configuration error'}`));
  console.error(errors.map((err) => `    - ${err.toString()}`).join('\n'));
  console.error(`    See https://www.snowpack.dev/#configuration for more info.`);
  process.exit(1);
}

function handleDeprecatedConfigError(mainMsg: string, ...msgs: string[]) {
  console.error(chalk.red(mainMsg));
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
      chalk.yellow(
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

import path from 'path';
import fs from 'fs';
import {cosmiconfigSync} from 'cosmiconfig';
import {Plugin} from 'rollup';
import {validate, ValidationError} from 'jsonschema';
import {all as merge} from 'deepmerge';
import chalk from 'chalk';

const CONFIG_NAME = 'snowpack';
const ALWAYS_EXCLUDE = ['node_modules/**/*', '.*'];

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type EnvVarReplacements = Record<string, string | number | true>;

export type DevScript = {cmd: string; watch: string | undefined};
export type DevScripts = {[id: string]: DevScript};

// interface this library uses internally
export interface SnowpackConfig {
  extends?: string;
  exclude: string[];
  knownEntrypoints: string[];
  webDependencies?: {[packageName: string]: string};
  scripts: DevScripts;
  devOptions: {
    port: number;
    out: string;
    fallback: string;
  };
  installOptions: {
    dest: string;
    env: EnvVarReplacements;
    installTypes: boolean;
    sourceMap?: boolean | 'inline';
    externalPackage: string[];
    alias: {[key: string]: string};
    rollup: {
      plugins: Plugin[]; // for simplicity, only Rollup plugins are supported for now
      dedupe?: string[];
      namedExports?: {[filepath: string]: string[]};
    };
  };
}

export interface CLIFlags extends Omit<Partial<SnowpackConfig['installOptions']>, 'env'> {
  help?: boolean; // display help text
  version?: boolean; // display Snowpack version
  reload?: boolean;
  config?: string; // manual path to config file
  env?: string[]; // env vars
}

// default settings
const DEFAULT_CONFIG: Partial<SnowpackConfig> = {
  exclude: ['__tests__/**/*', '**/*.@(spec|test).*'],
  knownEntrypoints: [],
  installOptions: {
    dest: 'web_modules',
    externalPackage: [],
    installTypes: false,
    env: {},
    alias: {},
    rollup: {
      plugins: [],
      dedupe: [],
    },
  },
  devOptions: {
    port: 8080,
    out: 'build',
    fallback: 'index.html',
  },
};

const configSchema = {
  type: 'object',
  properties: {
    extends: {type: 'string'},
    knownEntrypoints: {type: 'array', items: {type: 'string'}},
    exclude: {type: 'array', items: {type: 'string'}},
    webDependencies: {
      type: ['object'],
      additionalProperties: {type: 'string'},
    },
    installOptions: {
      type: 'object',
      properties: {
        dest: {type: 'string'},
        externalPackage: {type: 'array', items: {type: 'string'}},
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
            namedExports: {
              type: 'object',
              additionalProperties: {type: 'array', items: {type: 'string'}},
            },
          },
        },
      },
    },
    devOptions: {
      type: 'object',
      properties: {
        port: {type: 'number'},
        out: {type: 'string'},
        fallback: {type: 'string'},
      },
    },
    scripts: {
      type: 'object',
      additionalProperties: {type: ['string']},
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
  };
  const {help, version, config, ...relevantFlags} = flags;
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

/** resolve --dest relative to cwd, etc. */
function normalizeConfig(config: SnowpackConfig): SnowpackConfig {
  const cwd = process.cwd();
  config.installOptions.dest = path.resolve(cwd, config.installOptions.dest);
  config.devOptions.out = path.resolve(cwd, config.devOptions.out);
  if (!config.scripts) {
    config.scripts = {
      'mount:*': 'mount . --to .' as any,
    };
  }
  config.exclude = Array.from(new Set([...ALWAYS_EXCLUDE, ...config.exclude]));
  for (const scriptId of Object.keys(config.scripts)) {
    if (scriptId.includes('::watch')) {
      continue;
    }
    config.scripts[scriptId] = {
      cmd: (config.scripts[scriptId] as any) as string,
      watch: (config.scripts[`${scriptId}::watch`] as any) as string | undefined,
    };
  }
  for (const scriptId of Object.keys(config.scripts)) {
    if (scriptId.includes('::watch')) {
      delete config.scripts[scriptId];
    }
  }
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
  if (rawConfig.namedExports || cliFlags.namedExports) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `namedExports` is now `installOptions.rollup.namedExports`.',
    );
  }
  if (rawConfig.rollup) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] top-level `rollup` config is now `installOptions.rollup`.',
    );
  }
  if (rawConfig.installOptions?.include) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `installOptions.include` is now `include` but its syntax has also changed!',
    );
  }
  if (rawConfig.installOptions?.exclude) {
    handleDeprecatedConfigError('[Snowpack v1 -> v2] `installOptions.exclude` is now `exclude`.');
  }
  if (Array.isArray(rawConfig.webDependencies)) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] The `webDependencies` array is now `knownEntrypoints`.',
    );
  }
  if (rawConfig.entrypoints) {
    handleDeprecatedConfigError('[Snowpack v1 -> v2] `entrypoints` is now `knownEntrypoints`.');
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
  // Removed!
  if (rawConfig.devOptions?.bundle || cliFlags.bundle) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `devOptions.bundle` is now the default build behavior. This config is safe to remove.',
    );
  }
  if (rawConfig.devOptions?.dist) {
    handleDeprecatedConfigError(
      '[Snowpack v1 -> v2] `devOptions.dist` is no longer required. This config is safe to remove.',
      `If you'd still like to host your src/ directory at the "/_dist/*" URL, create a mount script:',
      '    {"scripts": {"mount:src": "mount src --to _dist_"}} `,
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

  const validation = validate(config, configSchema, {
    allowUnknownAttributes: false,
    propertyName: CONFIG_NAME,
  });
  if (validation.errors && validation.errors.length > 0) {
    handleValidationErrors(result.filepath, validation.errors);
    process.exit(1);
  }

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
  const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray;
  const mergedConfig = merge<SnowpackConfig>(
    [
      DEFAULT_CONFIG,
      extendConfig,
      {webDependencies: pkgManifest.webDependencies},
      config,
      cliConfig as any,
    ],
    {arrayMerge: overwriteMerge},
  );

  // if CLI flags present, apply those as overrides
  return normalizeConfig(mergedConfig);
}

import path from 'path';
import {cosmiconfigSync} from 'cosmiconfig';
import {Plugin} from 'rollup';
import {validate} from 'jsonschema';
import {all as merge} from 'deepmerge';

const CONFIG_NAME = 'snowpack';

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
  source: 'local' | 'pika';
  extends?: string;
  webDependencies?: {[packageName: string]: string};
  entrypoints?: string[];
  dedupe?: string[];
  namedExports?: {[filepath: string]: string[]};
  dev: {
    out: string;
    src: string;
    dist: string;
    bundle: boolean;
    fallback: string;
  };
  scripts: DevScripts;
  installOptions: {
    babel?: boolean;
    clean: boolean;
    hash: boolean;
    dest: string;
    exclude: string[];
    externalPackage: string[];
    include?: string;
    nomodule?: string;
    nomoduleOutput: string;
    optimize: boolean;
    env?: EnvVarReplacements;
    installTypes: boolean;
    remotePackage?: string[];
    remoteUrl: string;
    sourceMap?: boolean | 'inline';
    stat: boolean;
    strict: boolean;
  };
  rollup: {
    plugins: Plugin[]; // for simplicity, only Rollup plugins are supported for now
  };
}

export interface CLIFlags extends Omit<Partial<SnowpackConfig['installOptions']>, 'env'> {
  help?: boolean; // display help text
  version?: boolean; // display Snowpack version
  reload?: boolean;
  source?: SnowpackConfig['source'];
  config?: string; // manual path to config file
  env?: string[]; // env vars
}

// default settings
const DEFAULT_CONFIG: Partial<SnowpackConfig> = {
  dedupe: [],
  installOptions: {
    clean: false,
    hash: false,
    dest: 'web_modules',
    exclude: ['**/__tests__/*', '**/*.@(spec|test).@(js|mjs)'],
    externalPackage: [],
    nomoduleOutput: 'app.nomodule.js',
    optimize: false,
    installTypes: false,
    remoteUrl: 'https://cdn.pika.dev',
    stat: false,
    strict: false,
    env: {},
  },
  dev: {
    src: 'src',
    out: 'build',
    dist: '/_dist_/',
    fallback: 'index.html',
    bundle: false,
  },
  rollup: {plugins: []},
};

const configSchema = {
  type: 'object',
  properties: {
    source: {type: 'string'},
    extends: {type: 'string'},
    entrypoints: {type: 'array', items: {type: 'string'}},
    // TODO: Array of strings data format is deprecated, remove for v2
    webDependencies: {
      type: ['array', 'object'],
      additionalProperties: {type: 'string'},
      items: {type: 'string'},
    },
    dedupe: {
      type: 'array',
      items: {type: 'string'},
    },
    namedExports: {
      type: 'object',
      additionalProperties: {type: 'array', items: {type: 'string'}},
    },
    installOptions: {
      type: 'object',
      properties: {
        babel: {type: 'boolean'},
        hash: {type: 'boolean'},
        clean: {type: 'boolean'},
        dest: {type: 'string'},
        exclude: {type: 'array', items: {type: 'string'}},
        externalPackage: {type: 'array', items: {type: 'string'}},
        include: {type: 'string'},
        nomodule: {type: 'string'},
        nomoduleOutput: {type: 'string'},
        optimize: {type: 'boolean'},
        installTypes: {type: 'boolean'},
        remotePackage: {type: 'array', items: {type: 'string'}},
        remoteUrl: {type: 'string'},
        sourceMap: {oneOf: [{type: 'boolean'}, {type: 'string'}]},
        stat: {type: 'boolean'},
        strict: {type: 'boolean'},
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
      },
    },
    dev: {
      type: 'object',
      properties: {
        src: {type: 'string'},
        out: {type: 'string'},
        dist: {type: 'string'},
        bundle: {type: 'boolean'},
        fallback: {type: 'string'},
      },
    },
    scripts: {
      type: 'object',
      additionalProperties: {type: ['string']},
    },
    rollup: {
      type: 'object',
      properties: {
        plugins: {type: 'array', items: {type: 'object'}}, // type: 'object' ensures the user loaded the Rollup plugins correctly
      },
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
  const {source, env, help, version, ...installOptions} = flags;
  const result: DeepPartial<SnowpackConfig> = {installOptions};
  if (source) {
    result.source = source;
  }
  result.installOptions!.env = (env || []).reduce((acc, id) => {
    const index = id.indexOf('=');
    const [key, val] = index > 0 ? [id.substr(0, index), id.substr(index + 1)] : [id, true];
    acc[key] = val;
    return acc;
  }, {});
  return result;
}

/** resolve --dest relative to cwd, and set the default "source" */
function normalizeConfig(config: SnowpackConfig): SnowpackConfig {
  const cwd = process.cwd();
  config.installOptions.dest = path.resolve(cwd, config.installOptions.dest);
  config.dev.src = path.resolve(cwd, config.dev.src);
  config.dev.out = path.resolve(cwd, config.dev.out);
  if (Array.isArray(config.webDependencies)) {
    config.entrypoints = config.webDependencies;
    delete config.webDependencies;
  }
  if (!config.source) {
    const isDetailedObject = config.webDependencies && typeof config.webDependencies === 'object';
    config.source = isDetailedObject ? 'pika' : 'local';
  }
  if (config.scripts) {
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
  }
  return config;
}

export default function loadConfig(flags: CLIFlags, pkgManifest: any) {
  const cliConfig = expandCliFlags(flags);

  const explorerSync = cosmiconfigSync(CONFIG_NAME, {
    // only support these 3 types of config for now
    searchPlaces: ['package.json', 'snowpack.config.js', 'snowpack.config.json'],
    // don't support crawling up the folder tree:
    stopDir: path.dirname(process.cwd()),
  });

  let result;

  // if user specified --config path, load that
  const errors: string[] = [];
  if (flags.config) {
    result = explorerSync.load(path.resolve(process.cwd(), flags.config));
    if (!result) {
      errors.push(`Could not locate Snowpack config at ${flags.config}`);
    }
  } else {
    // if --config not given, try searching up the file tree
    result = explorerSync.search();
  }

  // no config found
  if (!result || !result.config || result.isEmpty) {
    // if CLI flags present, apply those as overrides
    return {
      config: normalizeConfig(
        merge<SnowpackConfig>([
          DEFAULT_CONFIG,
          {webDependencies: pkgManifest.webDependencies},
          cliConfig as any,
        ]),
      ),
      errors,
    };
  }

  // validate against schema; throw helpful user if invalid
  const config: SnowpackConfig = result.config;
  const validation = validate(config, configSchema, {
    allowUnknownAttributes: false,
    propertyName: CONFIG_NAME,
  });
  let validationErrors = validation.errors;

  let extendConfig: SnowpackConfig | {} = {};
  if (config.extends) {
    const extendConfigLoc = config.extends.startsWith('.')
      ? path.resolve(path.dirname(result.filepath), config.extends)
      : require.resolve(config.extends, {paths: [process.cwd()]});
    const extendResult = explorerSync.load(extendConfigLoc);
    if (!extendResult) {
      errors.push(`Could not locate Snowpack config at ${flags.config}`);
    } else {
      extendConfig = extendResult.config;
      validationErrors = validationErrors.concat(
        validate(extendConfig, configSchema, {
          allowUnknownAttributes: false,
          propertyName: CONFIG_NAME,
        }).errors,
      );
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
  return {
    config: normalizeConfig(mergedConfig),
    errors: validationErrors.map((msg) => `${path.basename(result.filepath)}: ${msg.toString()}`),
  };
}

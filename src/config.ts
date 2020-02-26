import path from 'path';
import {cosmiconfigSync} from 'cosmiconfig';
import {Plugin} from 'rollup';
import {validate} from 'jsonschema';
import merge from 'deepmerge';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

// interface this library uses internally
export interface SnowpackConfig {
  source: 'local' | 'pika';
  webDependencies?: string[];
  dedupe?: string[];
  namedExports?: {[filepath: string]: string[]};
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

export interface CLIFlags extends Partial<SnowpackConfig['installOptions']> {
  help?: boolean;
  version?: boolean;
  source?: SnowpackConfig['source'];
}

// default settings
const DEFAULT_CONFIG: SnowpackConfig = {
  source: 'local',
  dedupe: [],
  installOptions: {
    clean: false,
    hash: false,
    dest: 'web_modules',
    exclude: ['**/__tests__/*', '**/*.@(spec|test).@(js|mjs)'],
    externalPackage: [],
    nomoduleOutput: 'app.nomodule.js',
    optimize: false,
    remoteUrl: 'https://cdn.pika.dev',
    stat: false,
    strict: false,
  },
  rollup: {plugins: []},
};

const configSchema = {
  type: 'object',
  properties: {
    source: {type: 'string'},
    webDependencies: {type: 'array', items: {type: 'string'}},
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
        remotePackage: {type: 'array', items: {type: 'string'}},
        remoteUrl: {type: 'string'},
        sourceMap: {oneOf: [{type: 'boolean'}, {type: 'string'}]},
        stat: {type: 'boolean'},
        strict: {type: 'boolean'},
      },
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
  const {source, help, version, ...installOptions} = flags;
  const result: DeepPartial<SnowpackConfig> = {installOptions};
  if (source) {
    result.source = source;
  }
  return result;
}

/** resolve --dest relative to cwd */
function normalizeDest(config: SnowpackConfig) {
  config.installOptions.dest = path.resolve(process.cwd(), config.installOptions.dest);
  return config;
}

export default function loadConfig(flags: CLIFlags) {
  const cliConfig = expandCliFlags(flags);
  const explorerSync = cosmiconfigSync('snowpack', {
    // only support these 3 types of config for now
    searchPlaces: ['package.json', 'snowpack.config.js', 'snowpack.config.json'],
    // don't support crawling up the folder tree:
    stopDir: path.dirname(process.cwd()),
  });
  const result = explorerSync.search(); // search for snowpack config

  // user has no config
  if (!result || !result.config || result.isEmpty) {
    // if CLI flags present, apply those as overrides
    return {
      config: normalizeDest(merge<any>(DEFAULT_CONFIG, cliConfig)),
      errors: [],
    };
  }

  const config: SnowpackConfig = result.config;

  // validate against schema; throw helpful user if invalid
  const validation = validate(config, configSchema, {
    allowUnknownAttributes: false,
    propertyName: 'snowpack',
  });

  // if valid, apply config over defaults
  const mergedConfig = merge(DEFAULT_CONFIG, config);

  // if CLI flags present, apply those as overrides
  return {
    config: normalizeDest(merge<any>(mergedConfig, cliConfig)),
    errors: validation.errors.map(msg => `${path.basename(result.filepath)}: ${msg.toString()}`),
  };
}

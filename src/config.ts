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

// interface this library uses internally
export interface SnowpackConfig {
  source: 'local' | 'pika';
  webDependencies?: {[packageName: string]: string};
  entrypoints?: string[];
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
    nodeEnv?: string;
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
  help?: boolean; // display help text
  version?: boolean; // display Snowpack version
  reload?: boolean;
  source?: SnowpackConfig['source'];
  config?: string; // manual path to config file
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
        nodeEnv: {type: 'string'},
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

/** resolve --dest relative to cwd, and set the default "source" */
function normalizeConfig(config: SnowpackConfig): SnowpackConfig {
  config.installOptions.dest = path.resolve(process.cwd(), config.installOptions.dest);
  if (Array.isArray(config.webDependencies)) {
    config.entrypoints = config.webDependencies;
    delete config.webDependencies;
  }
  if (!config.source) {
    const isDetailedObject = config.webDependencies && typeof config.webDependencies === 'object';
    config.source = isDetailedObject ? 'pika' : 'local';
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
    result = explorerSync.load(path.resolve(flags.config));
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

  const config: SnowpackConfig = result.config;

  // validate against schema; throw helpful user if invalid
  const validation = validate(config, configSchema, {
    allowUnknownAttributes: false,
    propertyName: CONFIG_NAME,
  });

  // if valid, apply config over defaults
  const mergedConfig = merge<SnowpackConfig>([
    DEFAULT_CONFIG,
    {webDependencies: pkgManifest.webDependencies},
    config,
    cliConfig as any,
  ]);

  // if CLI flags present, apply those as overrides
  return {
    config: normalizeConfig(mergedConfig),
    errors: validation.errors.map((msg) => `${path.basename(result.filepath)}: ${msg.toString()}`),
  };
}

import path from 'path';
import {cosmiconfigSync} from 'cosmiconfig';
import {validate} from 'jsonschema';
import {merge} from 'lodash';

export interface SnowpackConfig {
  dedupe?: string[];
  namedExports?: {[filepath: string]: string[]};
  options: {
    babel?: boolean;
    clean?: boolean;
    dest?: string;
    exclude?: string[];
    externalPackage?: string[];
    include?: string;
    nomodule?: string;
    nomoduleOutput?: string;
    optimize?: boolean;
    remotePackage?: string[];
    remoteUrl?: string;
    sourceMap?: boolean;
    strict?: boolean;
  };
  webDependencies?: string[];
}

const defaultConfig: SnowpackConfig = {
  dedupe: [],
  options: {
    clean: false,
    dest: 'web_modules',
    exclude: ['**/__tests__/*', '**/*.@(spec|test).@(js|mjs)'],
    externalPackage: [],
    nomoduleOutput: 'app.nomodule.js',
    optimize: false,
    remoteUrl: 'https://cdn.pika.dev',
    strict: false,
  },
};

const configSchema = {
  type: 'object',
  properties: {
    dedupe: {
      type: 'array',
      items: {type: 'string'},
    },
    namedExports: {
      type: 'object',
      additionalProperties: {type: 'array', items: {type: 'string'}},
    },
    options: {
      type: 'object',
      properties: {
        babel: {type: 'boolean'},
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
        sourceMap: {type: 'boolean'},
        strict: {type: 'boolean'},
      },
    },
    webDependencies: {type: 'array', items: {type: 'string'}},
  },
};

export default function loadConfig(cliFlags?: SnowpackConfig) {
  const explorerSync = cosmiconfigSync('snowpack');
  const result = explorerSync.search(); // search for snowpack config

  // user has no config
  if (!result || !result.config || result.isEmpty) {
    return {
      config: cliFlags ? merge(defaultConfig, cliFlags) : defaultConfig,
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
  const mergedConfig = merge(defaultConfig, config);

  // if CLI flags present, return those as overrides
  return {
    config: cliFlags ? merge(mergedConfig, cliFlags) : mergedConfig,
    errors: validation.errors.map(msg => `${path.basename(result.filepath)}: ${msg.toString()}`),
  };
}

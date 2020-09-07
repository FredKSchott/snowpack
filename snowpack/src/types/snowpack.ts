import type HttpProxy from 'http-proxy';
import {Plugin as RollupPlugin} from 'rollup';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type EnvVarReplacements = Record<string, string | number | true>;

export type SnowpackBuiltFile = {code: string | Buffer; map?: string};
export type SnowpackBuildMap = Record<string, SnowpackBuiltFile>;

/** Standard file interface */
export interface SnowpackSourceFile {
  /** base extension (e.g. `.js`) */
  baseExt: string;
  /** file contents */
  contents: string;
  /** expanded extension (e.g. `.proxy.js` or `.module.css`) */
  expandedExt: string;
  /** if no location on disk, assume this exists in memory */
  locOnDisk: string;
}

export interface PluginLoadOptions {
  filePath: string;
  fileExt: string;
  isDev: boolean;
  isHmrEnabled: boolean;
}

export interface PluginTransformOptions {
  id: string;
  fileExt: string;
  contents: string | Buffer;
  isDev: boolean;
  isHmrEnabled: boolean;
}

export interface PluginRunOptions {
  isDev: boolean;
  isHmrEnabled: boolean;
}

/** map of extensions -> code (e.g. { ".js": "[code]", ".css": "[code]" }) */
export type PluginLoadResult = string | SnowpackBuildMap;

export interface PluginOptimizeOptions {
  buildDirectory: string;
}

export interface SnowpackPlugin {
  /** name of the plugin */
  name: string;
  /** Tell Snowpack how the load() function will resolve files. */
  resolve?: {
    /** file extensions that this load function takes as input (e.g. [".jsx", ".js", …]) */
    input: string[];
    /** file extensions that this load function outputs (e.g. [".js", ".css"]) */
    output: string[];
  };
  /** load a file that matches resolve.input */
  load?(options: PluginLoadOptions): Promise<PluginLoadResult | null | undefined | void>;
  /** transform a file that matches resolve.input */
  transform?(options: PluginTransformOptions): Promise<string | null | undefined | void>;
  /** runs a command, unrelated to file building (e.g. TypeScript, ESLint) */
  run?(options: PluginRunOptions): Promise<unknown>;
  /** optimize the entire built application */
  optimize?(options: PluginOptimizeOptions): Promise<void>;
  /** cleanup any long-running instances/services before exiting.  */
  cleanup?(): void | Promise<void>;
  /** Known dependencies that should be installed */
  knownEntrypoints?: string[];
  /** read and modify the Snowpack config object */
  config?(snowpackConfig: SnowpackConfig): void;
}

export interface LegacySnowpackPlugin {
  defaultBuildScript: string;
  build?(options: PluginLoadOptions & {contents: string}): Promise<any>;
  bundle?(options: {
    srcDirectory: string;
    destDirectory: string;
    jsFilePaths: string[];
  }): Promise<any>;
}

/** Snowpack Build Plugin type */
export type SnowpackPluginFactory<PluginOptions = object> = (
  snowpackConfig: SnowpackConfig,
  pluginOptions?: PluginOptions,
) => SnowpackPlugin;

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
  proxy: Proxy[];
  mount: Record<string, string>;
  alias: Record<string, string>;
  scripts: Record<string, string>;
  plugins: SnowpackPlugin[];
  devOptions: {
    secure: boolean;
    hostname: string;
    port: number;
    out: string;
    fallback: string;
    open: string;
    hmr: boolean;
  };
  installOptions: {
    dest: string;
    env: EnvVarReplacements;
    treeshake?: boolean;
    installTypes: boolean;
    polyfillNode: boolean;
    sourceMap?: boolean | 'inline';
    externalPackage: string[];
    namedExports: string[];
    rollup: {
      plugins: RollupPlugin[]; // for simplicity, only Rollup plugins are supported for now
      dedupe?: string[];
    };
  };
  buildOptions: {
    baseUrl: string;
    webModulesUrl: string;
    clean: boolean;
    metaDir: string;
    minify: boolean;
    sourceMaps: boolean;
    watch: boolean;
  };
  _extensionMap: Record<string, string>;
}

export interface CLIFlags extends Omit<Partial<SnowpackConfig['installOptions']>, 'env'> {
  help?: boolean; // display help text
  version?: boolean; // display Snowpack version
  reload?: boolean;
  config?: string; // manual path to config file
  env?: string[]; // env vars
  open?: string[];
  secure?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export interface ImportMap {
  imports: {[packageName: string]: string};
}

export interface CommandOptions {
  cwd: string;
  config: SnowpackConfig;
  lockfile: ImportMap | null;
  pkgManifest: any;
}

/**
 * An install target represents information about a dependency to install.
 * The specifier is the key pointing to the dependency, either as a package
 * name or as an actual file path within node_modules. All other properties
 * are metadata about what is actually being imported.
 */
export type InstallTarget = {
  specifier: string;
  all: boolean;
  default: boolean;
  namespace: boolean;
  named: string[];
};

export type DependencyStats = {
  size: number;
  gzip: number;
  brotli?: number;
  delta?: number;
};

export type DependencyType = 'direct' | 'common';

export type DependencyStatsMap = {
  [filePath: string]: DependencyStats;
};

export type DependencyStatsOutput = Record<DependencyType, DependencyStatsMap>;

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'; // same as Pino
export type LoggerEvent = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerOptions {
  /** (optional) change name at beginning of line */
  name?: string;
}

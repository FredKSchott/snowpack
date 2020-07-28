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

export type SnowpackBuildMap = Record<string, string>;

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

export interface LoadOptions {
  filePath: string;
  fileExt: string;
  isDev: boolean;
  log: (msg, data) => void;
}

export interface TransformOptions {
  filePath: string;
  fileExt: string;
  contents: string;
  isDev: boolean;
  log: (msg, data) => void;
}

export interface PluginProxyOptions {
  fileUrl: string;
  contents: string;
  isDev: boolean;
  log: (msg, data) => void;
}

export interface RunOptions {
  isDev: boolean;
  log: (msg, data) => void;
}

/** DEPRECATED */
export type __OldBuildResult = {result: string; resources?: {css?: string}};

/** map of extensions -> code (e.g. { ".js": "[code]", ".css": "[code]" }) */
export type LoadResult = string | {[fileExtension: string]: string};

export interface OptimizeOptions {
  buildDirectory: string;
  log: (msg, level?: 'INFO' | 'WARN' | 'ERROR') => void;
}

export interface SnowpackPlugin {
  /** name of the plugin */
  name: string;
  resolve?: {
    /** file extensions that this load function takes as input (e.g. [".jsx", ".js", …]) */
    input: string[];
    /** file extensions that this load function outputs (e.g. [".js", ".css"]) */
    output: string[];
  };
  /** load a file that matches resolve.input */
  load?(options: LoadOptions): Promise<LoadResult | null | undefined | void>;
  /** transform a file that matches resolve.input */
  transform?(options: TransformOptions): Promise<string | null | undefined | void>;
  /** controls how a non-JS file should be imported into JS. */
  proxy?(options: PluginProxyOptions): string | null | undefined | void;
  /** runs a command, unrelated to file building (e.g. TypeScript, ESLint) */
  run?(options: RunOptions): Promise<unknown>;
  /** optimize the entire built application */
  optimize?(options: OptimizeOptions): Promise<void>;
  /** Known dependencies that should be installed */
  knownEntrypoints?: string[];
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

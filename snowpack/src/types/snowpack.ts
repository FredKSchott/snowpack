import type HttpProxy from 'http-proxy';
import type * as http from 'http';
import type {InstallOptions} from 'esinstall';
import type {RawSourceMap} from 'source-map';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type SnowpackBuiltFile = {
  code: string | Buffer;
  map?: string;
};

export type SnowpackBuildMap = Record<string, SnowpackBuiltFile>;

/** Standard file interface */
export interface SnowpackSourceFile<Type = string | Buffer> {
  /** base extension (e.g. `.js`) */
  baseExt: string;
  /** file contents */
  contents: Type;
  /** expanded extension (e.g. `.proxy.js` or `.module.css`) */
  expandedExt: string;
  /** if no location on disk, assume this exists in memory */
  locOnDisk: string;
}

export interface PluginLoadOptions {
  filePath: string;
  fileExt: string;
  isDev: boolean;
  isSSR: boolean;
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
export type PluginLoadResult = SnowpackBuildMap;

export type PluginTransformResult = {contents: string; map: string | RawSourceMap};

export interface PluginOptimizeOptions {
  buildDirectory: string;
}

export interface SnowpackPlugin {
  /** name of the plugin */
  name: string;
  /** Tell Snowpack how the load() function will resolve files. */
  resolve?: {
    /**
       file extensions that this load function takes as input (e.g. [".jsx",
       ".js", …])
     */
    input: string[];
    /**
       file extensions that this load function outputs (e.g. [".js", ".css"])
     */
    output: string[];
  };
  /** load a file that matches resolve.input */
  load?(options: PluginLoadOptions): Promise<PluginLoadResult | string | null | undefined | void>;
  /** transform a file that matches resolve.input */
  transform?(
    options: PluginTransformOptions,
  ): Promise<PluginTransformResult | string | null | undefined | void>;
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
  build?(options: PluginLoadOptions & {contents: string | Buffer}): Promise<any>;
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
  testFiles: string[];
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
    hmr?: boolean;
    hmrDelay: number;
    hmrPort: number;
  };
  installOptions: InstallOptions;
  buildOptions: {
    baseUrl: string;
    webModulesUrl: string;
    clean: boolean;
    metaDir: string;
    minify: boolean;
    sourceMaps: boolean;
    watch: boolean;
  };
  /** EXPERIMENTAL - This section is experimental and not yet finalized. May change across minor versions. */
  experiments: {
    /** (EXPERIMENTAL) If true, "snowpack build" should build your site for SSR. */
    ssr: boolean;
    /** (EXPERIMENTAL) Custom request handler for the dev server. */
    app?: (
      req: http.IncomingMessage,
      res: http.ServerResponse,
      next: (err?: Error) => void,
    ) => unknown;
  };
  _extensionMap: Record<string, string>;
}

export interface CLIFlags extends Omit<InstallOptions, 'env'> {
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

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'; // same as Pino
export type LoggerEvent = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerOptions {
  /** (optional) change name at beginning of line */
  name?: string;
}

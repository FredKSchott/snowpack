import type {InstallOptions} from 'esinstall';
import type * as http from 'http';
import type {RawSourceMap} from 'source-map';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export interface LoadResult<T = Buffer | string> {
  contents: T;
  originalFileLoc: string | null;
  contentType: string | false;
  checkStale?: () => Promise<void>;
}

export type OnFileChangeCallback = ({filePath: string}) => any;
export interface SnowpackDevServer {
  port: number;
  loadUrl: {
    (
      reqUrl: string,
      opt?:
        | {
            isSSR?: boolean | undefined;
            allowStale?: boolean | undefined;
            encoding?: undefined;
          }
        | undefined,
    ): Promise<LoadResult<Buffer | string>>;
    (
      reqUrl: string,
      opt: {
        isSSR?: boolean;
        allowStale?: boolean;
        encoding: BufferEncoding;
      },
    ): Promise<LoadResult<string>>;
    (
      reqUrl: string,
      opt: {
        isSSR?: boolean;
        allowStale?: boolean;
        encoding: null;
      },
    ): Promise<LoadResult<Buffer>>;
  };
  handleRequest: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    options?: {handleError?: boolean},
  ) => Promise<void>;
  sendResponseFile: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    {contents, originalFileLoc, contentType}: LoadResult,
  ) => void;
  sendResponseError: (req: http.IncomingMessage, res: http.ServerResponse, status: number) => void;
  onFileChange: (callback: OnFileChangeCallback) => void;
  shutdown(): Promise<void>;
}

export type SnowpackBuildResultFileManifest = Record<
  string,
  {source: string; contents: string | Buffer}
>;

export interface SnowpackBuildResult {
  result: SnowpackBuildResultFileManifest;
  onFileChange: (callback: OnFileChangeCallback) => void;
  shutdown(): Promise<void>;
}

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
  /** The absolute file path of the source file, on disk. */
  filePath: string;
  /** A helper for just the file extension of the source file (ex: ".js", ".svelte") */
  fileExt: string;
  /** True if builder is in dev mode (`snowpack dev` or `snowpack build --watch`) */
  isDev: boolean;
  /** True if builder is in SSR mode */
  isSSR: boolean;
  /** True if HMR is enabled (add any HMR code to the output here). */
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
  /** Called when a watched file changes during development. */
  onChange?({filePath}: {filePath: string}): void;
  /** (internal interface, not set by the user) Mark a file as changed. */
  markChanged?(file: string): void;
}

/** Snowpack Build Plugin type */
export type SnowpackPluginFactory<PluginOptions = object> = (
  snowpackConfig: SnowpackConfig,
  pluginOptions?: PluginOptions,
) => SnowpackPlugin;

export type MountEntry = {
  url: string;
  static: boolean;
  resolve: boolean;
};

export interface OptimizeOptions {
  entrypoints: 'auto' | string[] | ((options: {files: string[]}) => string[]);
  preload: boolean;
  bundle: boolean;
  manifest: boolean;
  minify: boolean;
  target: 'es2020' | 'es2019' | 'es2018' | 'es2017';
}

export interface RouteConfigObject {
  src: string;
  dest: string | ((req: http.IncomingMessage, res: http.ServerResponse) => void);
  match: 'routes' | 'all';
  _srcRegex: RegExp;
}

// interface this library uses internally
export interface SnowpackConfig {
  install: string[];
  extends?: string;
  exclude: string[];
  knownEntrypoints: string[];
  mount: Record<string, MountEntry>;
  alias: Record<string, string>;
  plugins: SnowpackPlugin[];
  devOptions: {
    secure: boolean;
    hostname: string;
    port: number;
    fallback: string;
    open: string;
    output: 'stream' | 'dashboard';
    hmr?: boolean;
    hmrDelay: number;
    hmrPort: number | undefined;
    hmrErrorOverlay: boolean;
  };
  installOptions: Omit<InstallOptions, 'alias'>;
  buildOptions: {
    out: string;
    baseUrl: string;
    webModulesUrl: string;
    clean: boolean;
    metaDir: string;
    minify: boolean;
    sourceMaps: boolean;
    watch: boolean;
    htmlFragments: boolean;
    jsxFactory: string | undefined;
    jsxFragment: string | undefined;
  };
  testOptions: {
    files: string[];
  };
  /** EXPERIMENTAL - This section is experimental and not yet finalized. May change across minor versions. */
  experiments: {
    /** (EXPERIMENTAL) Where should dependencies be loaded from? */
    source: 'local' | 'skypack';
    /** (EXPERIMENTAL) If true, "snowpack build" should build your site for SSR. */
    ssr: boolean;
    /** (EXPERIMENTAL) Optimize your site for production. */
    optimize?: OptimizeOptions;
    /** (EXPERIMENTAL) Configure routes during development. */
    routes: RouteConfigObject[];
  };
  _extensionMap: Record<string, string>;
}

export type SnowpackUserConfig = {
  install?: string[];
  extends?: string;
  exclude?: string[];
  mount?: Record<string, string | Partial<MountEntry>>;
  alias?: Record<string, string>;
  plugins?: (string | [string, any])[];
  devOptions?: Partial<SnowpackConfig['devOptions']>;
  installOptions?: Partial<SnowpackConfig['installOptions']>;
  buildOptions?: Partial<SnowpackConfig['buildOptions']>;
  testOptions?: Partial<SnowpackConfig['testOptions']>;
  experiments?: {
    source?: SnowpackConfig['experiments']['source'];
    ssr?: SnowpackConfig['experiments']['ssr'];
    optimize?: Partial<SnowpackConfig['experiments']['optimize']>;
    routes?: Pick<RouteConfigObject, 'src' | 'dest' | 'match'>[];
  };
};

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
  [flag: string]: any;
}

export interface ImportMap {
  imports: {[specifier: string]: string};
}

export interface LockfileManifest extends ImportMap {
  dependencies: {[packageName: string]: string};
}

export interface CommandOptions {
  // TODO(fks): remove `cwd`, replace with a new `config.root` property on SnowpackConfig.
  cwd: string;
  config: SnowpackConfig;
  lockfile: LockfileManifest | null;
}

export type LoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'; // same as Pino
export type LoggerEvent = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerOptions {
  /** (optional) change name at beginning of line */
  name?: string;
  /** (optional) do some additional work after logging a message, if log level is enabled */
  task?: Function;
}

/** PackageSource - a common interface for loading and interacting with dependencies.  */
export interface PackageSource {
  /**
   * Do any work needed before starting the dev server or build. Either will wait
   * for this to complete before continuing. Example: For "local", this involves
   * running esinstall (if needed) to prepare your local dependencies as ESM.
   */
  prepare(commandOptions: CommandOptions): Promise<ImportMap>;
  /**
   * Load a dependency with the given spec (ex: "/web_modules/react" -> "react")
   * If load fails or is unsuccessful, reject the promise.
   */
  load(
    spec: string,
    options: {config: SnowpackConfig; lockfile: ImportMap | null},
  ): Promise<Buffer | string>;
  /** Resolve a package import to URL (ex: "react" -> "/web_modules/react") */
  resolvePackageImport(spec: string, importMap: ImportMap, config: SnowpackConfig): string | false;
  /** Handle 1+ missing package imports before failing, if possible. */
  recoverMissingPackageImport(missingPackages: string[]): Promise<ImportMap>;
  /** Modify the build install config for optimized build install. */
  modifyBuildInstallConfig(options: {
    config: SnowpackConfig;
    lockfile: ImportMap | null;
  }): Promise<void>;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

export type DefineReplacements = Record<string, string>;
export type EnvVarReplacements = Record<string, string | number | true>;

export interface ImportMap {
  imports: {[packageName: string]: string};
}

export interface AbstractLogger {
  debug: (...args: any[]) => void;
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
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

// TODO this is incomplete and could be an array.
export type ExportMapEntry =
  | string
  | {
      browser?: ExportMapEntry;
      import?: ExportMapEntry;
      default?: ExportMapEntry;
      require?: ExportMapEntry;
    };

export type ExportMap = Record<string, ExportMapEntry>;
export type ExportField = string | ExportMap;

//
/**
 * https://github.com/defunctzombie/package-browser-field-spec
 * "browser": "main.js",
 * "browser": { "./": "main.js" }
 * "browser": { "./foo": false } // don't include in bundle
 */
export type BrowserField = string | Record<string, string | boolean>;

// This is the package.json, with fields we care about
export type PackageManifest = {
  name: string;
  version: string;
  main?: string; // This is optional, actually
  module?: string;
  exports?: ExportField;
  browser?: BrowserField;
  types?: string;
  typings?: string;
};

export type PackageManifestWithExports = PackageManifest & {
  exports: ExportMap;
};

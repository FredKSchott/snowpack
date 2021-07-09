import type esbuild from 'esbuild';
import type {EventEmitter} from 'stream';

export interface BinaryFile {
  /** Content-Type */
  contentType: string;
  /** File contents */
  content: Buffer;
  /** No encoding */
  encoding: undefined;
  /** original location on disk */
  src?: URL;
}

export interface DevServer {
  listen(port: number): Promise<void>;
  on: EventEmitter;
  stop(): Promise<void>;
}

export interface StringFile {
  /** Content-Type */
  contentType: string;
  /** File contents */
  content: string;
  /** UTF-8 if string */
  encoding: 'UTF-8';
  /** original location on disk */
  src?: URL;
}

/** Snowpack config format */
export interface Config {
  /** options for build */
  buildOptions?: {
    /** dist folder for build */
    out?: string;
  };
  /** options for dev server */
  devOptions?: {
    /** enable HMR (hot module reloading)? (default: true) */
    hmr?: boolean;
    /** HMR delay in milliseconds (default: 0) */
    hmrDelay?: number;
    /** HMR port (default: 12321) */
    hmrPort?: number;
    /** dev server hostname (default: localhost) */
    hostname?: string;
    /** port (default: 8080) */
    port?: number;
    /** enable SSL for dev */
    secure?: boolean | {cert: Buffer; key: Buffer};
    /** use static folder (default: "./public/") */
    static?: string;
  };
  /** entrypoints of your application for bundling (omit to scan all code) */
  entryPoints?: string[];
  /** globs to exclude */
  exclude?: string | string[];
  /** build mode (default: 'development' for dev, 'production' for build) */
  mode?: 'development' | 'production' | 'test';
  /** source code location (default: "./src/") */
  srcRoot?: string;
}

/** Result of loading a Snowpack URL */
export interface LoadResult {
  /** The primary build result (e.g. JS for .svelte) */
  data: StringFile | BinaryFile;
  /** Other additional build results (e.g CSS and sourcemap for .svelte) */
  assets?: (StringFile | BinaryFile)[];
}

/** Initialized config (mirrors user  Config, but all values are initialized and normalized) */
export interface InitConfig {
  buildOptions: {
    out: string;
  };
  devOptions: {
    hmr: boolean;
    hmrDelay: number;
    hmrPort: number;
    hostname: string;
    port: number;
    secure: {
      cert: Buffer;
      key: Buffer;
    };
    static: string;
  };
  entryPoints: string[];
  exclude: string[];
  mode: 'development' | 'production' | 'test';
  srcRoot: string;
}

/** Runtime */
export interface Runtime {
  /** Load any URL */
  load(url: string): Promise<LoadResult | undefined>;
  /** Stop & cleanup all processes */
  shutdown(): void;
}

/** Runtime Options */
export interface RuntimeOptions {
  /** Snowpack config */
  config: InitConfig;
  /** Current working directory (process.cwd() by default) */
  cwd?: string | URL;
  /** Runtime mode */
  mode?: 'development' | 'production';
  /** Output target */
  target?: string;
}

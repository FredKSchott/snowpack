# esinstall

Bundle a set of imports from your `node_modules/` directory into a fresh, new directory guarenteed to be 100% [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). Great for using npm dependencies in web apps without a traditional bundler like webpack.

 ⚡️ Powering Snowpack and the next generation of JavaScript tooling.

```
npm install esinstall
```

```js
import {install} from 'esinstall';

await install(['preact', 'preact/hooks'], {/*options*/}); 
// Result: Creates `preact.js` and `preact/hooks.js` inside a `web_modules/` directory in your current directory.
```

## Features

```js
import {install, printStats} from 'esinstall';

// Feature: Handles CJS packages with ease, converting everything to ESM!
await install(['react', 'react-dom', 'react-redux', 'react-router']); 

// Feature: Print detailed install stats to the console, including installed file sizes.
const {success, stats} = install([...]);
if (success) {
  printStats(stats);
}

// Feature: Tree-shaking! Supports more detailed install targets.
await install([{specifier: 'preact/hooks', all: false, default: false, namespace: false, named: ['useState', 'useEffect']}], {treeshake: true}); 
```

## API

Still TODO: Adding more detailed descriptions about each `InstallOptions` option. 

```ts
import { Plugin as RollupPlugin } from 'rollup';
import { DependencyStatsOutput, EnvVarReplacements, ImportMap, InstallTarget, LoggerLevel } from './types';

interface InstallOptions {
    alias: Record<string, string>;
    lockfile?: ImportMap;
    logLevel: LoggerLevel;
    verbose?: boolean;
    dest: string;
    env: EnvVarReplacements;
    treeshake?: boolean;
    polyfillNode: boolean;
    sourceMap?: boolean | 'inline';
    externalPackage: string[];
    namedExports: string[];
    rollup: {
        plugins?: RollupPlugin[];
        dedupe?: string[];
    };
}
declare type PublicInstallOptions = Partial<InstallOptions>;
declare type InstallResult = {
    success: false;
    importMap: null;
    stats: null;
} | {
    success: true;
    importMap: ImportMap;
    stats: DependencyStatsOutput;
};

export declare function printStats(dependencyStats: DependencyStatsOutput): string;
export declare function install(_installTargets: (InstallTarget | string)[], _options?: PublicInstallOptions): Promise<InstallResult>;
```


# esinstall

Convert a set of imports from your `node_modules/` directory into a fresh, new directory guarenteed to be 100% [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). Great for using npm dependencies in web apps without a traditional bundler like webpack.

 ⚡️ Powering Snowpack and the next generation of JavaScript tooling.

```
npm install esinstall
```

```js
import {install} from 'esinstall';

await install(['preact', 'preact/hooks'], {/*options*/}); 
// Result: Creates `preact.js` and `preact/hooks.js` inside a `web_modules/` directory in your current directory.
```

## Background

Before [Snowpack](https://snowpack.dev/) was a frontend build tool, it was a CJS->ESM package converter.  `snowpack install` would read your package.json "dependencies" and re-install every frontend package from your "node_modules/" directory to a new "web_modules/" directory. "web_modules/" was guarenteed to be 100% ESM regardless of how each package was originally written. This dramatically simplified the minimum tooling required to build a website by removing a whole class of problem for the frontend basically summarized as "oh no this package was written for Node.js, it will never run in the browser, what do we do???"

Snowpack is now a fully-featured frontend build tool, but it's still built entirely on that original foundation. That foundation is now **esbuild**, a general-purpose JavaScript interface for creating ESM single-file versions of locally installed npm packages.

Our hope is that now others can build on top of this too. And while today we're focused on the web use-case, [we're seeing a growing need for a CJS->ESM story for Node.js](https://changelog.com/jsparty/137) as well.

## How it Works

To simplify things a ton, here's what **esbuild** does internally when you run `install()`:

1. Resolves the given package specifiers to exact file paths in your "node_modules/" directory.
2. Runs Rollup with those file paths as entrypoints, essentially "bundling" your dependency tree into as few JS files as possible.
3. Writes the result to a new, fully ESM output directory.

If you check out the code, you'll see it's not as easy as it sounds. But at a high level, that's what **esinstall** is all about.
## Features

```js
import {install, printStats} from 'esinstall';

// Feature: Handle CJS packages with ease, converting everything to ESM!
await install(['react', 'react-dom', 'react-redux', 'react-router']); 

// Feature: Handle CSS!
await install(['bootstrap/dist/css/bootstrap.min.css']); 

// Feature: Handle Non-standard packages!
await install(['some-svelte-component'], {rollup: {plugins: [require('rollup-plugin-svelte')()]}}); 

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


## Special Thanks 

A huge thanks to all the contributors of Snowpack over the last year. This wouldn't have been possible without you.

Also, it can't be stressed enough: this tool would never have existed without Rollup. If you can, consider donating to their team: https://opencollective.com/rollup

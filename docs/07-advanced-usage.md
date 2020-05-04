## Advanced Usage

### JS + CSS Support

Most CSS-in-JS libraries work great with Snowpack. However, using the JavaScript `import` keyword to load a CSS inside of a JavaScript file isn't supported by any browser. If you'd still like to control your CSS loading inside of JavaScript, you can consider one of these alternatives:

#### 1. [TODO] Plugin (Recommended)

``` js
import './style.css';
```

The [TODO] babel plugin replaces every CSS import with a `<style>` element to inject the CSS file contents at runtime. We reccomend this because unlike the other of the solutions listed here, this is the only one that also works with the `--bundle` flag, so that you also get fully bundled application CSS in production.

#### 2. CSZ

``` js
import csz from 'csz';
const className = csz`./style.css`;
```

[csz](https://github.com/lukejacksonn/csz) supports run-time CSS modules with SASS-like selectors via the [TODO] babel plugin. CSZ runs directly in the browser, so you can skip the SASS build/watch step.

#### 3. CSZ + [TODO] Plugin

``` js
import className from './style.css';
```
The [TODO] babel plugin lets you write CSS imports via the JavaScript `import` keyword and then Babel will automatically transform it to to the csz equivalent above.


### TypeScript Support

When you are working with TypeScript, Snowpack will automatically install all package type declarations into the `web_modules/.types/` directory. We default to this behavior when we find a `tsconfig.json` file inside of your project, but it can also be enabled via the `--installTypes` flag.

Snowpack will automatically go out and fetch type declarations for every package you use: first looking for first-party declarations (provided by the package creator) OR falling back to community-provided `@types/*` declarations if no official types were found.

NOTE: TypeScript isn't yet aware of this new `/web_modules/.types/` location by default. To use Snowpack with TypeScript, you'll want to add the following lines to your `tsconfig.json` so that your packages can continue to get type information:

```js
// tsconfig.json
{
  // 1. TypeScript needs to know about the new package types location
  "baseUrl": "./",
  "paths": { "*": ["web_modules/.types/*"] },
  // 2. Don't fail if there are any errors inside community-provided type packages.
  "skipLibCheck": true,
}
```

### Snowpack-Managed Dependencies

By default, Snowpack will install your `web_modules/` dependencies usinng the raw package code found in your `node_modules/` directory. This means that each packages is installed twice in your project: once in each directory.

Snowpack can be configured to fully manage your frontend dependencies via the new "webDependencies" key in your `package.json` project manifest.

```diff
{
  "dependencies": {
    "@babel/core": "^1.2.3",
-   /* previously managed by npm */
-   "react": "^16.13.0",
-   "react-dom": "^16.13.0"
  },
+ /* now managed by Snowpack */
+ "webDependencies": {
+   "react": "^16.13.0",
+   "react-dom": "^16.13.0"
+ }
}
```

In the example above, `npm` or `yarn` would no longer see React as a dependency to install. Instead, Snowpack would install this package directly from the web to your `"web_modules/"` directory without ever reading from `node_modules/`. Snowpack would do all the work upfront to convert each package into a web-ready, single JS file that runs natively in your browser.

Snowpack also provides `add` & `rm` helper commands to help you manage your "webDependencies" config via the CLI.


### Lockfiles

When Snowpack manages and installs your packages via `webDependencies`, it will also save a `snowpack.lock.json` file to your project directory. **This file is important, so don't delete it!** This lockfile locks down the installed versions of your entire dependency tree, including sub-dependencies. When you have this file, you are guarenteed to get a reproducible, deterministic installation every time that you run `snowpack install`.

When it's time to update your dependencies. Delete this file and re-run `snowpack install`. This will generate an updated depenency tree and save an updated lockfile to your project.


### Import Maps

> Note [Import Maps](https://github.com/WICG/import-maps) are an experimental web technology that is not supported in every browser. For polyfilling import maps, [check out es-module-shims](https://github.com/guybedford/es-module-shims#import-maps).

Snowpack generates an [Import Map](https://github.com/WICG/import-maps) with every installation to `web_modules/import-map.json`. If your browser supports Import Maps, you can load the import map somewhere in your application and unlock the ability to import packages by name natively in the browser (no Babel step required).

``` markdown
<!-- Include this in your application HTML... -->
<script type="importmap" src="/web_modules/import-map.json"></script>

<!-- ... to enable browser-native package name imports. -->
import * as _ from 'lodash';
```

Note that Snowpack already performs these rewrites for you at both `dev` and `build` time, so this is only useful for experimentation and 3rd-party tooling integrations. As a general rule: if you don't care about this file, keep it but feel free to ignore it.


### Legacy Browser Support

You can customize the set of browsers you'd like to support via the package.json "browserslist" property. When running `snowpack build`, Snowpack will read this property and transpile all JavaScript files accordingly via @babel/preset-env.

```js
/* package.json */
"browserslist": ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

Note: During development (`snowpack dev`) we preform no transpilation.


### Non-Standard Packages

When installing packages from npm, You may encounter some non-JS code that can only run with additional parsing/processing. Svelte packages, for example, commonly include `.svelte` files that will require additional tooling to parse and install for the browser.

Because our internal installer is powered by Rollup, you can add Rollup plugins to your [Snowpack config](#configuration-options) to handle these special, rare files:

```js
/* snowpack.config.js */
module.exports = {
  rollup: {
    plugins: [require('rollup-plugin-svelte')()]
  }
};
```

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information.

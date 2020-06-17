---
layout: layouts/extend.njk
---

#### Who is this page for?

- Anyone writing a custom plugin for Snowpack.
- Anyone extending Snowpack's default behavior.
- Anyone adding framework-specific auto-HMR.
- Anyone using Snowpack programatically (ex: `snowpack.install()`).

Looking for help using Snowpack in your project?
👉 **[Check out our main docs.](/)**

## Overview

Snowpack runs through 3 stages internally: _build_, _transform_, and _bundle_. Snowpack plugins hook into **one** of these stages:

<ol class="ol">
  <li class="tc-green">
    <h4 class="ol-title">Build</h4>
    <div class="tc-text">The main action Snowpack uses. This handles most operations, such as transforming JSX to JS, or converting Sass to CSS. Every build plugin should map to an existing <a href="/#build-scripts">build script</a>.</div>
  </li>
  <li class="tc-blue">
    <h4 class="ol-title">Transform</h4>
    <div class="tc-text">This stage happens after the <strong>build</strong> step, and can be used for additional transformations if needed. This has more context since it comes later, such as which URL the module was requested at.</div>
  </li>
  <li class="tc-magenta">
    <h4 class="ol-title">Bundle</h4>
    <div class="tc-text">Optional stage that only happens when using a bundler plugin such as <a href="https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack" target="_blank" rel="noopener nofollow">@snowpack/plugin-webpack</a> or <a href="https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel" target="_blank" rel="noopener nofollow">@snowpack/plugin-parcel</a>. This passes all of Snowpack’s built files to a final bundler. <em>Note: only 1 bundler plugin can receive the final files.</em></div>
  </li>
</ol>


## Plugin API

A Snowpack plugin is a JavaScript module that exports a function. That function takes Snowpack config & plugin options as it's function arguments and must return a valid Snowpack Plugin object.

### Example

```js
// snowpack.config.json
"plugins": [["@prefresh/snowpack", { /* `pluginOptions` (optional) */ }]]
```

```js
// "@prefresh/snowpack": This plugin adds automatic HMR for Preact applications.
module.exports = function createPlugin(snowpackConfig, pluginOptions) {
  return {
    knownEntrypoints: ['@prefresh/core'],
    /**
     * transform() - Transform web assets (JS, CSS, or HTML). Useful for
     * post-processing or adding functionality into your web app.
     */
    async transform({ contents, urlPath, isDev }) {
      if (!isDev) {
        return;
      }
      if (!urlPath.endsWith('.js')) {
        return;
      }
      return {
        result: `
          import '@prefresh/core';
          ${contents}

          if (import.meta.hot) {
            /* IMPLEMENTATION, REMOVED FOR BREVITY */
          }`,
      };
    },
  };
};
```

### knownEntrypoints

```ts
knownEntrypoints?: string[]
```

Additional web_modules to install in the project that may not otherwise be picked up by the install command. Similar to the "install" config value. If your plugin relies on dependencies the user may not import directly (or a necessary part of a dependency gets tree-shaken by Snowpack because the user didn’t import it), list those dependencies here.

#### Example

```ts
knownEntrypoints: ["svelte/internal"], // ensures svelte/internal exists in web_modules at the end
```

### defaultBuildScript

```ts
defaultBuildScript?: string
```

The build script that will be used for this plugin, if none is provided by the user. If your plugin uses the `build()` method, this is what controls which files your build command will match against by default.

If you don't include this, the user will need to define the build script themselves for the plugin to do anything.

#### Example

```ts
defaultBuildScript: "build:vue", // hooks into the user’s build:vue script automatically unless they manually override this
```

### build()

```ts
build?: async ({
  filePath: string,
  contents: string,
  isDev: boolean,
}) => null | {
  result: string;
  resources?: {css?: string};
};
```

Build any file from source. Files can be built from any source file type, but must be returned as their final file type. For example, a JSX file must be converted to JS at the build stage and not the transform stage.

The build function is run on all files that match the file extensions in the build script (or `defaultBuildScript` if none is provided by the user). The build function must return a result, or an error will be thrown. You can validate the `filePath` ahead of time if you know that you can only handle a certain set of file extensions.

Note that production optimizations like minification, dead code elimination, and legacy browser transpilation are all handled automatically by Snowpack and are not a concern for plugin authors. A plugin's output should always be modern code.

Use `resources` if your build outputs multiple files from your one source file. For example, Svelte & Vue files output both JavaScript and CSS. Return the JS output as `result` and the CSS output as `resources.css`. Snowpack will make sure that they're handled together in your final build.

### transform()

```ts
transform?: async ({
  urlPath: string,
  contents: string,
  isDev: boolean,
}) => null | {result: string};
```

Transform an already-loaded file before it is sent to the browser. This is called for every file in your build, so be sure to test the `urlPath` extension to filter your transform by a certain file type. Return `false` to skip transforming this file.

Note that production optimizations like minification, dead code elimination, and legacy browser transpilation are all handled automatically by Snowpack and are not a concern for plugin authors. A plugin's output should always be modern code.

#### Use Cases

- Adding framework-specific HMR code, if a matching import is found.

### bundle()

```ts
bundle?(args: {
  srcDirectory: string;
  destDirectory: string;
  jsFilePaths: Set<string>;
  log: (msg) => void;
}): Promise<void>;
```

Bundle the web application for production.


👉 **[Back to the main docs.](/)**

## TypeScript types

Building your Snowpack plugin with TypeScript? You can typecheck your plugin by importing the following type:

```ts
import { SnowpackPlugin } from 'snowpack/dist-types/config';

export default function mySnowpackPlugin() {
  const plugin: SnowpackPlugin = { /* … */ };
  return plugin;
}
```

## JavaScript API

### Overview

```js
// TODO: More documentation coming soon.
```

### install()
```js
// TODO: More documentation coming soon.
```

### build()
```js
// TODO: More documentation coming soon.
```


👉 **[Back to the main docs.](/)**

## Back to Main Docs

👉 **[Back to the main docs.](/)**

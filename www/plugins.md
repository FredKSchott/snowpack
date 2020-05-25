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

## Plugin API

### Example

```js
// Example: This plugin adds automatic HMR for Preact applications.
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

```
knownEntrypoints?: string[]
```

Additional web_modules to install in the project that may not otherwise be picked up by the install command. If your plugin itself injects package imports, then put them here.

### defaultBuildScript

```
defaultBuildScript?: string
```

The build script that will be used for this plugin, if none is provided by the user. If your plugin uses the `build()` method, this is what controls which files your build command will match against by default.

If you don't include this, the user will need to define the build script themselves for the plugin to do anything.


### build()

```
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

```
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

```  
bundle?(args: {
  srcDirectory: string;
  destDirectory: string;
  jsFilePaths: Set<string>;
  log: (msg) => void;
}): Promise<void>;
```

Bundle the web application for production.


👉 **[Back to the main docs.](/)**


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

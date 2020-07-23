import type CSSModuleLoader from 'css-modules-loader-core';
import {EventEmitter} from 'events';
import path from 'path';
import {BuildOptions, SnowpackBuildMap, SnowpackConfig, SnowpackPlugin} from '../config';
import {getExt, URL_HAS_PROTOCOL_REGEX} from '../util';

export interface BuildFileOptions {
  buildPipeline: SnowpackPlugin[];
  messageBus: EventEmitter;
  isDev: boolean;
}

export function getInputsFromOutput(fileLoc: string, plugins: SnowpackPlugin[]) {
  const {baseExt} = getExt(fileLoc);
  const potentialInputs = new Set([fileLoc]);
  for (const plugin of plugins) {
    if (plugin.output.includes(baseExt)) {
      plugin.input.forEach((inp) => potentialInputs.add(fileLoc.replace(baseExt, inp)));
    }
  }
  return Array.from(potentialInputs);
}

/** SnowpackPlugin interface + legacy support for Snowpack v1 plugin system. */
interface SnowpackPluginWithLegacy extends SnowpackPlugin {
  /** DEPRECATED */
  transform?(options: BuildOptions): Promise<{result: string} | null>;
}

/** Core Snowpack file pipeline builder */
export async function buildFile(
  srcPath: string,
  srcContents: string,
  {buildPipeline, messageBus, isDev}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExt(srcPath).baseExt;
  const rootFileName = path.basename(srcPath).replace(srcExt, '');
  const output: SnowpackBuildMap = {
    [srcExt]: srcContents,
  };

  // Run the file through the Snowpack build pipeline:
  for (const step of buildPipeline as SnowpackPluginWithLegacy[]) {
    // DEPRECATED: Plugin legacy transform() support. If a plugin defines a transform() function,
    // call it. Transform cannot change the file extension, and was designed to run on every file
    // type and return null if no change was needed.
    if (step.transform) {
      for (const destExt of Object.keys(output)) {
        const destBuildFile = output[destExt];
        const result = await step.transform({
          contents: destBuildFile,
          fileExt: destExt,
          filePath: rootFileName + destExt,
          isDev,
          log: (msg, data = {}) => {
            messageBus.emit(msg, {
              ...data,
              id: step.name,
              msg: data.msg && `[${srcPath}] ${data.msg}`,
            });
          },
          // Deprecated
          urlPath: `./${path.basename(rootFileName + destExt)}`,
        });
        if (result) {
          output[destExt] = result.result;
        }
      }
      continue;
    }

    // For now, we only run through build plugins that match at least one file extension.
    // All other plugins are ignored.
    if (!step.build || step.input.length === 0) {
      continue;
    }
    const staleOutputs = new Set<string>();
    for (const destExt of Object.keys(output)) {
      // If the current output file extension doesn't match a plugin input, skip it.
      if (!step.input.includes(destExt)) {
        continue;
      }
      const destBuildFile = output[destExt];
      const result = await step.build({
        contents: destBuildFile,
        fileExt: destExt,
        filePath: rootFileName + destExt,
        isDev,
        log: (msg, data = {}) => {
          messageBus.emit(msg, {
            ...data,
            id: step.name,
            msg: data.msg && `[${srcPath}] ${data.msg}`,
          });
        },
        // Deprecated
        urlPath: `./${path.basename(rootFileName + destExt)}`,
      });
      if (!result) {
        continue;
      }
      if (typeof result === 'string') {
        // Path A: single-output (assume extension is same)
        output[destExt] = result;
      } else if (typeof result === 'object' && !result.result) {
        // Path B: multi-file output ({ js: [string], css: [string], … })
        Object.entries(result as SnowpackBuildMap).forEach(([ext, contents]) => {
          if (!contents) {
            return;
          }
          output[ext] = contents;
          staleOutputs.add(destExt);
          staleOutputs.delete(ext);
        });
      } else if (typeof result === 'object' && result.result) {
        // Path C: DEPRECATED output ({ result, resources })
        const ext = step.output[0];
        output[ext] = result.result;
        staleOutputs.add(destExt);
        staleOutputs.delete(ext);
        // handle CSS output for Svelte/Vue
        if (typeof result.resources === 'object' && result.resources.css) {
          output['.css'] = result.resources.css;
          staleOutputs.delete('.css');
        }
      }

      // filter out unused extensions (i.e. don’t emit source files to build)
      for (const staleOutput of staleOutputs) {
        delete output[staleOutput];
      }
    }
  }

  return output;
}

export function getMetaUrlPath(urlPath: string, isDev: boolean, config: SnowpackConfig): string {
  let {baseUrl, metaDir} = config.buildOptions || {};
  if (isDev) {
    return path.posix.normalize(path.posix.join('/', metaDir, urlPath));
  }
  if (URL_HAS_PROTOCOL_REGEX.test(baseUrl)) {
    return baseUrl + path.posix.normalize(path.posix.join(metaDir, urlPath));
  }
  return path.posix.normalize(path.posix.join(baseUrl, metaDir, urlPath));
}

export function wrapImportMeta({
  code,
  hmr,
  env,
  isDev,
  config,
}: {
  code: string;
  hmr: boolean;
  env: boolean;
  isDev: boolean;
  config: SnowpackConfig;
}) {
  if (!code.includes('import.meta')) {
    return code;
  }
  return (
    (hmr
      ? `import * as  __SNOWPACK_HMR__ from '${getMetaUrlPath(
          'hmr.js',
          isDev,
          config,
        )}';\nimport.meta.hot = __SNOWPACK_HMR__.createHotContext(import.meta.url);\n`
      : ``) +
    (env
      ? `import __SNOWPACK_ENV__ from '${getMetaUrlPath(
          'env.js',
          isDev,
          config,
        )}';\nimport.meta.env = __SNOWPACK_ENV__;\n`
      : ``) +
    '\n' +
    code
  );
}

let _cssModuleLoader: CSSModuleLoader;
export async function wrapCssModuleResponse({
  url,
  code,
  isDev,
  hmr,
  config,
}: {
  url: string;
  code: string;
  ext: string;
  isDev: boolean;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  _cssModuleLoader = _cssModuleLoader || new (require('css-modules-loader-core'))();
  const {injectableSource, exportTokens} = await _cssModuleLoader.load(code, url, undefined, () => {
    throw new Error('Imports in CSS Modules are not yet supported.');
  });
  return `${
    hmr
      ? `
import * as __SNOWPACK_HMR_API__ from '${getMetaUrlPath('hmr.js', isDev, config)}';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
import.meta.hot.accept(({module}) => {
  code = module.code;
  json = module.default;
});
import.meta.hot.dispose(() => {
  document.head.removeChild(styleEl);
});\n`
      : ``
  }
export let code = ${JSON.stringify(injectableSource)};
let json = ${JSON.stringify(exportTokens)};
export default json;

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);`;
}

export function wrapHtmlResponse({
  code,
  isDev,
  hmr,
  config,
}: {
  code: string;
  isDev: boolean;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  // replace %PUBLIC_URL% in HTML files (along with surrounding slashes, if any)
  code = code.replace(/\/?%PUBLIC_URL%\/?/g, config.buildOptions.baseUrl);

  if (hmr) {
    code += `<script type="module" src="${getMetaUrlPath('hmr.js', isDev, config)}"></script>`;
  }
  return code;
}

export function wrapEsmProxyResponse({
  url,
  code,
  ext,
  isDev,
  hmr,
  config,
}: {
  url: string;
  code: string;
  ext: string;
  isDev: boolean;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  if (ext === '.json') {
    return `${
      hmr
        ? `
    import * as __SNOWPACK_HMR_API__ from '${getMetaUrlPath('hmr.js', isDev, config)}';
    import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
    import.meta.hot.accept(({module}) => {
      json = module.default;
    });`
        : ''
    }
let json = ${JSON.stringify(JSON.parse(code))};
export default json;`;
  }

  if (ext === '.css') {
    return `${
      hmr
        ? `
import * as __SNOWPACK_HMR_API__ from '${getMetaUrlPath('hmr.js', isDev, config)}';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
import.meta.hot.accept();
import.meta.hot.dispose(() => {
  document.head.removeChild(styleEl);
});\n`
        : ''
    }
const code = ${JSON.stringify(code)};

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);`;
  }

  return `export default ${JSON.stringify(url)};`;
}

const PUBLIC_ENV_REGEX = /^SNOWPACK_PUBLIC_/;
export function generateEnvModule(mode: 'development' | 'production') {
  const envObject = {...process.env};
  for (const env of Object.keys(envObject)) {
    if (!PUBLIC_ENV_REGEX.test(env)) {
      delete envObject[env];
    }
  }
  envObject.MODE = mode;
  envObject.NODE_ENV = mode;
  return `export default ${JSON.stringify(envObject)};`;
}

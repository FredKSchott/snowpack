import type CSSModuleLoader from 'css-modules-loader-core';
import {EventEmitter} from 'events';
import path from 'path';
import {SnowpackBuildMap, SnowpackConfig, SnowpackPlugin} from '../config';
import {getExt} from '../util';

export interface BuildFileOptions {
  buildPipeline: SnowpackPlugin[];
  messageBus: EventEmitter;
  isDev: boolean;
}

const IS_PREACT = /from\s+['"]preact['"]/;
export function checkIsPreact(filePath: string, contents: string) {
  return filePath.endsWith('.jsx') && IS_PREACT.test(contents);
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
  for (const step of buildPipeline) {
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
        filePath: rootFileName + destExt,
        isDev,
        log: (msg, data) => {
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

export function wrapImportMeta({
  code,
  hmr,
  env,
  config: {buildOptions},
}: {
  code: string;
  hmr: boolean;
  env: boolean;
  config: SnowpackConfig;
}) {
  if (!code.includes('import.meta')) {
    return code;
  }
  return (
    (hmr
      ? `import * as  __SNOWPACK_HMR__ from '/${buildOptions.metaDir}/hmr.js';\nimport.meta.hot = __SNOWPACK_HMR__.createHotContext(import.meta.url);\n`
      : ``) +
    (env
      ? `import __SNOWPACK_ENV__ from '/${buildOptions.metaDir}/env.js';\nimport.meta.env = __SNOWPACK_ENV__;\n`
      : ``) +
    '\n' +
    code
  );
}

let _cssModuleLoader: CSSModuleLoader;
export async function wrapCssModuleResponse({
  url,
  code,
  hasHmr = false,
  config: {buildOptions},
}: {
  url: string;
  code: string;
  ext: string;
  hasHmr?: boolean;
  config: SnowpackConfig;
}) {
  _cssModuleLoader = _cssModuleLoader || new (require('css-modules-loader-core'))();
  const {injectableSource, exportTokens} = await _cssModuleLoader.load(code, url, undefined, () => {
    throw new Error('Imports in CSS Modules are not yet supported.');
  });
  return `${
    hasHmr
      ? `
import * as __SNOWPACK_HMR_API__ from '/${buildOptions.metaDir}/hmr.js';
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
  hasHmr = false,
  buildOptions,
}: {
  code: string;
  hasHmr?: boolean;
  buildOptions: SnowpackConfig['buildOptions'];
}) {
  // replace %PUBLIC_URL% in HTML files (along with surrounding slashes, if any)
  code = code.replace(/\/?%PUBLIC_URL%\/?/g, buildOptions.baseUrl);

  if (hasHmr) {
    code += `<script type="module" src="/${buildOptions.metaDir}/hmr.js"></script>`;
  }
  return code;
}

export function wrapEsmProxyResponse({
  url,
  code,
  ext,
  hasHmr = false,
  config: {buildOptions},
}: {
  url: string;
  code: string;
  ext: string;
  hasHmr?: boolean;
  config: SnowpackConfig;
}) {
  if (ext === '.json') {
    return `${
      hasHmr
        ? `
    import * as __SNOWPACK_HMR_API__ from '/${buildOptions.metaDir}/hmr.js';
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
      hasHmr
        ? `
import * as __SNOWPACK_HMR_API__ from '/${buildOptions.metaDir}/hmr.js';
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

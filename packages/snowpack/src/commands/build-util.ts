import type CSSModuleLoader from 'css-modules-loader-core';
import {EventEmitter} from 'events';
import {promises as fs} from 'fs';
import path from 'path';
import {SnowpackBuildMap, SnowpackConfig, SnowpackPlugin} from '../config';
import {getEncodingType, getExt, URL_HAS_PROTOCOL_REGEX} from '../util';

export interface BuildFileOptions {
  buildPipeline: SnowpackPlugin[];
  messageBus: EventEmitter;
  isDev: boolean;
}

export function getInputsFromOutput(fileLoc: string, plugins: SnowpackPlugin[]) {
  const {baseExt} = getExt(fileLoc);
  const potentialInputs = new Set([fileLoc]);
  for (const plugin of plugins) {
    if (plugin.resolve && plugin.resolve.output.includes(baseExt)) {
      plugin.resolve.input.forEach((inp) => potentialInputs.add(fileLoc.replace(baseExt, inp)));
    }
  }
  return Array.from(potentialInputs);
}

/**
 * Build Plugin First Pass: If a plugin defines a
 * `resolve` object, check it against the current
 * file's extension. If it matches, call the load()
 * functon and return it's result.
 *
 * If no match is found, fall back to just reading
 * the file from disk and return it.
 */
async function runPipelineLoadStep(
  srcPath: string,
  {buildPipeline, messageBus, isDev}: BuildFileOptions,
) {
  const srcExt = getExt(srcPath).baseExt;
  for (const step of buildPipeline) {
    if (!step.resolve || !step.resolve.input.includes(srcExt)) {
      continue;
    }
    if (!step.load) {
      continue;
    }
    const result = await step.load({
      fileExt: srcExt,
      filePath: srcPath,
      isDev,
      log: (msg, data = {}) => {
        messageBus.emit(msg, {
          ...data,
          id: step.name,
          msg: data.msg && `[${srcPath}] ${data.msg}`,
        });
      },
    });
    const mainOutputExt = step.resolve.output[0];
    if (typeof result === 'string') {
      return {[mainOutputExt]: result};
    } else if (result && typeof result === 'object') {
      return result;
    } else {
      continue;
    }
  }
  return {[srcExt]: await fs.readFile(srcPath, getEncodingType(srcExt))};
}

/**
 * Build Plugin Second Pass: If a plugin defines a
 * transform() method,call it. Transform cannot change
 * the file extension, and was designed to run on
 * every file type and return null/undefined if no
 * change needed.
 */
async function runPipelineTransformStep(
  output: Record<string, string>,
  srcPath: string,
  {buildPipeline, messageBus, isDev}: BuildFileOptions,
) {
  const srcExt = getExt(srcPath).baseExt;
  const rootFileName = path.basename(srcPath).replace(srcExt, '');
  for (const step of buildPipeline) {
    if (!step.transform) {
      continue;
    }
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
        // @ts-ignore: Deprecated
        urlPath: `./${path.basename(rootFileName + destExt)}`,
      });
      if (typeof result === 'string') {
        output[srcExt] = result;
      } else if (result && typeof result === 'object' && result.result) {
        output[srcExt] = result.result;
      }
    }
  }
  return output;
}
/** Core Snowpack file pipeline builder */
export async function buildFile(
  srcPath: string,
  buildFileOptions: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  // Pass 1: Find the first plugin to load this file, and return the result
  const loadResult = await runPipelineLoadStep(srcPath, buildFileOptions);
  // Pass 2: Pass that result through every plugin transfomr() method.
  const transformResult = await runPipelineTransformStep(loadResult, srcPath, buildFileOptions);
  // Return the final build result.
  return transformResult;
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

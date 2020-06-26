import {promises as fs} from 'fs';
import type CSSModuleLoader from 'css-modules-loader-core';
import execa from 'execa';
import {EventEmitter} from 'events';
import npmRunPath from 'npm-run-path';
import {BuildResult, SnowpackConfig, SnowpackSourceFile, SnowpackBuildMap} from '../config';
import {getExt, replaceExt} from '../util';

const IS_PREACT = /from\s+['"]preact['"]/;
export function checkIsPreact(filePath: string, contents: string) {
  return filePath.endsWith('.jsx') && IS_PREACT.test(contents);
}

interface BuildFileOptions {
  config: SnowpackConfig;
  dest?: string;
  messageBus?: EventEmitter;
}

/** Core Snowpack file pipeline builder */
export async function buildFile(
  srcPath: string,
  destPath = srcPath,
  options: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const {config, messageBus} = options;
  const srcExt = getExt(srcPath);
  const output: SnowpackBuildMap = {}; // important: clear output for each src file to keep memory low
  output[destPath] = {...srcExt, code: await fs.readFile(srcPath, 'utf8'), locOnDisk: srcPath}; // this is the object we’ll mutate through transformations

  // 1. transform with build CLI commands
  const buildCmd =
    config.__buildCommands[srcExt.expandedExt] || config.__buildCommands[srcExt.baseExt];
  if (buildCmd) {
    const {id, cmd} = buildCmd;
    let cmdWithFile = cmd.replace('$FILE', srcPath);
    try {
      const {stdout, stderr} = await execa.command(cmdWithFile, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        input: output[destPath].code,
        cwd: process.cwd(),
      });
      if (stderr && messageBus) {
        messageBus.emit('WORKER_MSG', {id, level: 'warn', msg: `${srcPath}\n${stderr}`});
      }
      output[destPath].code = stdout;
    } catch (err) {
      if (messageBus) {
        messageBus.emit('WORKER_MSG', {id, level: 'error', msg: `${srcPath}\n${err.stderr}`});
        messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
      }
    }
  }

  // 2. transform with Snowpack plugins (main build pipeline)
  for (const step of config.__buildPipeline[srcExt.expandedExt || srcExt.baseExt] || []) {
    // TODO: remove transform() from plugin API when no longer used
    if (step.transform) {
      const urlPath = destPath.substr(destPath.length + 1);
      const {result} = await step.transform({
        contents: output[destPath].code,
        urlPath,
        isDev: false,
      });
      output[destPath].code = result;
    }

    if (step.build) {
      let result: BuildResult;
      try {
        result = await step.build({
          code: output[destPath].code,
          contents: output[destPath].code,
          filePath: srcPath,
          isDev: false,
        });
      } catch (err) {
        if (messageBus) {
          messageBus.emit('WORKER_MSG', {id: step.name, level: 'error', msg: err.message});
          messageBus.emit('WORKER_UPDATE', {id: step.name, state: ['ERROR', 'red']});
        }
        process.exit(1);
      }

      if (typeof result === 'string') {
        // Path A: single-output (assume extension is same)
        output[destPath].code = result;
      } else if (typeof result === 'object' && !result.result) {
        // Path B: multi-file output ({ js: [string], css: [string], … })
        Object.entries(result as {[ext: string]: string}).forEach(([ext, code]) => {
          const newDest = replaceExt(destPath, ext);
          output[newDest] = {baseExt: ext, expandedExt: ext, code, locOnDisk: srcPath};
        });
      } else if (typeof result === 'object' && result.result) {
        // Path C: DEPRECATED output ({ result, resources })
        output[destPath].code = result.result;

        // handle CSS output for Svelte/Vue
        if (typeof result.resources === 'object' && result.resources.css) {
          const cssFile = replaceExt(destPath, '.css');
          output[cssFile] = {
            baseExt: '.css',
            expandedExt: '.css',
            code: result.resources.css,
            locOnDisk: srcPath,
          };
        }
      }

      // filter out unused extensions (i.e. don’t emit source files to build)
      const outputs = Array.isArray(step.output) ? step.output : [step.output];
      Object.keys(output).forEach((key) => {
        const {baseExt} = getExt(key);
        if (!outputs.includes(baseExt)) {
          delete output[key];
        }
      });
    }
  }

  // 3. final transformations (proxies, shims, etc.)
  for (let [outputPath, file] of Object.entries(output)) {
    output[outputPath] = snowpackTransformations(file, config);
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
  code = code.replace(/\/?%PUBLIC_URL%\/?/g, '/');

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

/** Snowpack-specific file transformations */
export function snowpackTransformations(
  input: SnowpackSourceFile,
  config: SnowpackConfig,
): SnowpackSourceFile {
  switch (input.baseExt) {
    case '.js': {
      input.code = wrapImportMeta({code: input.code, env: true, hmr: false, config});
      return input;
    }
    case '.html': {
      // replace %PUBLIC_URL% with baseUrl
      input.code = input.code.replace(/%PUBLIC_URL%\/?/g, config.buildOptions.baseUrl);
      return input;
    }
    default: {
      return input;
    }
  }
}

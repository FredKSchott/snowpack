import type CSSModuleLoader from 'css-modules-loader-core';
import path from 'path';
import {SnowpackConfig} from '../config';
import {getExt, URL_HAS_PROTOCOL_REGEX} from '../util';

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

function generateJsonImportProxy({
  code,
  hmr,
  isDev,
  config,
}: {
  code: string;
  hmr: boolean;
  isDev: boolean;
  config: SnowpackConfig;
}) {
  const jsonImportProxyCode = `${
    hmr ? `import.meta.hot.accept(({module}) => { json = module.default; });` : ''
  }
let json = ${JSON.stringify(JSON.parse(code))};
export default json;`;
  return wrapImportMeta({code: jsonImportProxyCode, hmr, env: false, isDev, config});
}

function generateCssImportProxy({
  code,
  hmr,
  isDev,
  config,
}: {
  code: string;
  hmr: boolean;
  isDev: boolean;
  config: SnowpackConfig;
}) {
  const cssImportProxyCode = `${
    hmr
      ? `
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
  return wrapImportMeta({code: cssImportProxyCode, hmr, env: false, isDev, config});
}

let _cssModuleLoader: CSSModuleLoader;
async function generateCssModuleImportProxy({
  url,
  code,
  isDev,
  hmr,
  config,
}: {
  url: string;
  code: string;
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

function generateDefaultImportProxy(url: string) {
  return `export default ${JSON.stringify(url)};`;
}

export async function wrapImportProxy({
  url,
  code,
  isDev,
  hmr,
  config,
}: {
  url: string;
  code: string;
  isDev: boolean;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  const {baseExt, expandedExt} = getExt(url);
  if (baseExt === '.json') {
    return generateJsonImportProxy({code, hmr, isDev, config});
  }
  if (expandedExt.endsWith('.module.css')) {
    return await generateCssModuleImportProxy({
      url,
      code,
      isDev,
      hmr,
      config,
    });
  }
  if (baseExt === '.css') {
    return generateCssImportProxy({code, hmr, isDev, config});
  }
  return generateDefaultImportProxy(url);
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

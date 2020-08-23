import type CSSModuleLoader from 'css-modules-loader-core';
import path from 'path';
import {SnowpackConfig} from '../types/snowpack';
import {appendHTMLToBody, getExt} from '../util';
import {logger} from '../logger';

export function getMetaUrlPath(urlPath: string, config: SnowpackConfig): string {
  let {metaDir} = config.buildOptions || {};
  return path.posix.normalize(path.posix.join('/', metaDir, urlPath));
}

export function wrapImportMeta({
  code,
  hmr,
  env,
  config,
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
      ? `import * as  __SNOWPACK_HMR__ from '${getMetaUrlPath(
          'hmr.js',
          config,
        )}';\nimport.meta.hot = __SNOWPACK_HMR__.createHotContext(import.meta.url);\n`
      : ``) +
    (env
      ? `import __SNOWPACK_ENV__ from '${getMetaUrlPath(
          'env.js',
          config,
        )}';\nimport.meta.env = __SNOWPACK_ENV__;\n`
      : ``) +
    '\n' +
    code
  );
}

export function wrapHtmlResponse({
  code,
  hmr,
  isDev,
  config,
  mode,
}: {
  code: string;
  hmr: boolean;
  isDev: boolean;
  config: SnowpackConfig;
  mode: 'development' | 'production';
}) {
  // replace %PUBLIC_URL% (along with surrounding slashes, if any)
  code = code.replace(/\/?%PUBLIC_URL%\/?/g, isDev ? '/' : config.buildOptions.baseUrl);

  // replace %MODE%
  code = code.replace(/%MODE%/g, mode);

  const snowpackPublicEnv = getSnowpackPublicEnvVariables();

  code = code.replace(/%SNOWPACK_PUBLIC_.+?%/gi, (match: string) => {
    const envVariableName = match.slice(1, -1);

    if (envVariableName in snowpackPublicEnv) {
      return snowpackPublicEnv[envVariableName] || '';
    }

    logger.warn(`Environment variable "${envVariableName}" is not set`);

    return match;
  });

  if (hmr) {
    const hmrScript = `<script type="module" src="${getMetaUrlPath('hmr.js', config)}"></script>`;
    code = appendHTMLToBody(code, hmrScript);
  }
  return code;
}

function generateJsonImportProxy({
  code,
  hmr,
  config,
}: {
  code: string;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  const jsonImportProxyCode = `let json = ${JSON.stringify(JSON.parse(code))};
export default json;`;
  return wrapImportMeta({code: jsonImportProxyCode, hmr, env: false, config});
}

function generateCssImportProxy({
  code,
  hmr,
  config,
}: {
  code: string;
  hmr: boolean;
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
  return wrapImportMeta({code: cssImportProxyCode, hmr, env: false, config});
}

let _cssModuleLoader: CSSModuleLoader;
async function generateCssModuleImportProxy({
  url,
  code,
  hmr,
  config,
}: {
  url: string;
  code: string;
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
import * as __SNOWPACK_HMR_API__ from '${getMetaUrlPath('hmr.js', config)}';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
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
  hmr,
  config,
}: {
  url: string;
  code: string | Buffer;
  hmr: boolean;
  config: SnowpackConfig;
}) {
  const {baseExt, expandedExt} = getExt(url);

  if (typeof code === 'string') {
    if (baseExt === '.json') {
      return generateJsonImportProxy({code, hmr, config});
    }

    if (baseExt === '.css') {
      // if proxying a CSS file, remove its source map (the path no longer applies)
      const sanitized = code.replace(/\/\*#\s*sourceMappingURL=[^/]+\//gm, '');
      return expandedExt.endsWith('.module.css')
        ? generateCssModuleImportProxy({url, code: sanitized, hmr, config})
        : generateCssImportProxy({code: sanitized, hmr, config});
    }
  }

  return generateDefaultImportProxy(url);
}

export function generateEnvModule(mode: 'development' | 'production') {
  const envObject = getSnowpackPublicEnvVariables();
  envObject.MODE = mode;
  envObject.NODE_ENV = mode;
  return `export default ${JSON.stringify(envObject)};`;
}

const PUBLIC_ENV_REGEX = /^SNOWPACK_PUBLIC_.+/;
function getSnowpackPublicEnvVariables() {
  const envObject = {...process.env};
  for (const env of Object.keys(envObject)) {
    if (!PUBLIC_ENV_REGEX.test(env)) {
      delete envObject[env];
    }
  }
  return envObject;
}

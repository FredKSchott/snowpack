import type CSSModuleLoader from 'css-modules-loader-core';
import path from 'path';
import {readFileSync} from 'fs';
import {SnowpackConfig} from '../types/snowpack';
import {appendHtmlToHead, getExt} from '../util';
import {logger} from '../logger';
import {generateSRI} from './import-sri';

const SRI_CLIENT_HMR_SNOWPACK = generateSRI(
  readFileSync(path.join(__dirname, '../../assets/hmr-client.js')),
);

const SRI_ERROR_HMR_SNOWPACK = generateSRI(
  readFileSync(path.join(__dirname, '../../assets/hmr-error-overlay.js')),
);

const importMetaRegex = /import\s*\.\s*meta/;

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
  if (!importMetaRegex.test(code)) {
    return code;
  }
  return (
    (hmr
      ? `import * as  __SNOWPACK_HMR__ from '${getMetaUrlPath(
          'hmr-client.js',
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
  hmrPort,
  isDev,
  config,
  mode,
}: {
  code: string;
  hmr: boolean;
  hmrPort?: number;
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

  // Full Page Transformations: Only full page responses should get these transformations.
  // Any code not containing `<!DOCTYPE html>` is assumed to be a code snippet/partial.
  const isFullPage = code.startsWith('<!DOCTYPE html>');
  if (hmr && isFullPage) {
    let hmrScript = ``;
    if (hmrPort) {
      hmrScript += `<script type="text/javascript">window.HMR_WEBSOCKET_PORT=${hmrPort}</script>\n`;
    }
    hmrScript += `<script type="module" integrity="${SRI_CLIENT_HMR_SNOWPACK}" src="${getMetaUrlPath(
      'hmr-client.js',
      config,
    )}"></script>`;
    if (config.devOptions.hmrErrorOverlay) {
      hmrScript += `<script type="module" integrity="${SRI_ERROR_HMR_SNOWPACK}" src="${getMetaUrlPath(
        'hmr-error-overlay.js',
        config,
      )}"></script>`;
    }
    code = appendHtmlToHead(code, hmrScript);
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
  const cssImportProxyCode = `// [snowpack] add styles to the page (skip if no document exists)
if (typeof document !== 'undefined') {${
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
  document.head.appendChild(styleEl);
}`;
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
  return `
export let code = ${JSON.stringify(injectableSource)};
let json = ${JSON.stringify(exportTokens)};
export default json;
${
    hmr
      ? `
import * as __SNOWPACK_HMR_API__ from '${getMetaUrlPath('hmr-client.js', config)}';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);\n` : ``}
// [snowpack] add styles to the page (skip if no document exists)
if (typeof document !== 'undefined') {${
    hmr
      ? `
  import.meta.hot.dispose(() => {
    document && document.head.removeChild(styleEl);
  });\n`
      : ``}
  const styleEl = document.createElement("style");
  const codeEl = document.createTextNode(code);
  styleEl.type = 'text/css';

  styleEl.appendChild(codeEl);
  document.head.appendChild(styleEl);
}`;
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

export function generateEnvModule({mode, isSSR}: {mode: 'development' | 'production', isSSR: boolean}) {
  const envObject: Record<string, string | boolean | undefined> = getSnowpackPublicEnvVariables();
  envObject.MODE = mode;
  envObject.NODE_ENV = mode;
  envObject.SSR = isSSR;
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

import Core from 'css-modules-loader-core';
import type {EventEmitter} from 'events';
import execa from 'execa';
import path from 'path';
import {statSync} from 'fs';
import npmRunPath from 'npm-run-path';
import {
  SnowpackConfig,
  BuildScript,
  SnowpackPluginBuildArgs,
  SnowpackPluginBuildResult,
} from '../config';

const IS_PREACT = /from\s+['"]preact['"]/;
export function checkIsPreact(filePath: string, contents: string) {
  return filePath.endsWith('.jsx') && IS_PREACT.test(contents);
}

export function isDirectoryImport(fileLoc: string, spec: string): boolean {
  const importedFileOnDisk = path.resolve(path.dirname(fileLoc), spec);
  try {
    const stat = statSync(importedFileOnDisk);
    return stat.isDirectory();
  } catch (err) {
    // file doesn't exist, that's fine
  }
  return false;
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

export async function wrapCssModuleResponse({
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
  let core = new Core();
  const {injectableSource, exportTokens} = await core.load(code, url, () => {
    throw new Error('Imports in CSS Modules are not yet supported.');
  });
  return `
export let code = ${JSON.stringify(injectableSource)};
let json = ${JSON.stringify(exportTokens)};
export default json;

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);
${
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
});
`
    : ``
}`;
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
    return `
let json = ${JSON.stringify(JSON.parse(code))};
export default json;
${
  hasHmr
    ? `
import * as __SNOWPACK_HMR_API__ from '/${buildOptions.metaDir}/hmr.js';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
import.meta.hot.accept(({module}) => {
  json = module.default;
});
`
    : ''
}`;
  }

  if (ext === '.css') {
    return `
const code = ${JSON.stringify(code)};

const styleEl = document.createElement("style");
const codeEl = document.createTextNode(code);
styleEl.type = 'text/css';

styleEl.appendChild(codeEl);
document.head.appendChild(styleEl);
${
  hasHmr
    ? `
import * as __SNOWPACK_HMR_API__ from '/${buildOptions.metaDir}/hmr.js';
import.meta.hot = __SNOWPACK_HMR_API__.createHotContext(import.meta.url);
import.meta.hot.accept();
import.meta.hot.dispose(() => {
  document.head.removeChild(styleEl);
});
`
    : ''
}`;
  }

  return `export default ${JSON.stringify(url)};`;
}

export type FileBuilder = (
  args: SnowpackPluginBuildArgs,
) => null | SnowpackPluginBuildResult | Promise<null | SnowpackPluginBuildResult>;
export function getFileBuilderForWorker(
  cwd: string,
  selectedWorker: BuildScript,
  messageBus: EventEmitter,
): FileBuilder | undefined {
  const {id, type, cmd, plugin} = selectedWorker;
  if (type !== 'build') {
    throw new Error(`scripts[${id}] is not a build script.`);
  }
  if (plugin?.build) {
    const buildFn = plugin.build;
    return async (args: SnowpackPluginBuildArgs) => {
      try {
        const result = await buildFn(args);
        return result;
      } catch (err) {
        messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.message});
        messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
        return null;
      }
    };
  }
  return async ({contents, filePath}: SnowpackPluginBuildArgs) => {
    let cmdWithFile = cmd.replace('$FILE', filePath);
    try {
      const {stdout, stderr} = await execa.command(cmdWithFile, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        input: contents,
        cwd,
      });
      if (stderr) {
        messageBus.emit('WORKER_MSG', {id, level: 'warn', msg: `${filePath}\n${stderr}`});
      }
      return {result: stdout};
    } catch (err) {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: `${filePath}\n${err.stderr}`});
      messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
      return null;
    }
  };
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

import execa from 'execa';
import npmRunPath from 'npm-run-path';
import type {EventEmitter} from 'events';
import {SnowpackConfig, DevScript} from '../config';
import Core from 'css-modules-loader-core';

export async function wrapCssModuleResponse(
  url: string,
  code: string,
  ext: string,
  hasHmr = false,
) {
  let core = new Core();
  const {injectableSource, exportTokens} = await core.load(code, url, () => {
    throw new Error('BOTHER');
  });
  return `
const styleEl = document.createElement("style");
styleEl.type = 'text/css';
  
export let code = ${JSON.stringify(injectableSource)};
let json = ${JSON.stringify(exportTokens)};
export default json;

${
  hasHmr
    ? `
const isMainAsset = !new URL(import.meta.url).search;
if (isMainAsset) {
  styleEl.appendChild(document.createTextNode(code));
  document.head.appendChild(styleEl);
}

import {apply} from '/web_modules/@snowpack/hmr.js';
if (isMainAsset) {
  apply(import.meta.url, ({module}) => {
    styleEl.removeChild(styleEl.lastChild);
    styleEl.appendChild(document.createTextNode(module.code));
    code = module.code;
    json = module.default;
  });
}`
    : `styleEl.appendChild(document.createTextNode(code));
document.head.appendChild(styleEl);`
}`;
}

export function wrapEsmProxyResponse(url: string, code: string, ext: string, hasHmr = false) {
  if (ext === '.json') {
    return `
let json = ${JSON.stringify(JSON.parse(code))};
export default json;
${
  hasHmr
    ? `
import {apply} from '/web_modules/@snowpack/hmr.js';
apply(import.meta.url, ({code}) => {
  json = JSON.parse(JSON.stringify(JSON.parse(code)));
});
`
    : ''
}`;
  }

  if (ext === '.css') {
    return `
const styleEl = document.createElement("style");
styleEl.type = 'text/css';
styleEl.appendChild(document.createTextNode(${JSON.stringify(code)}));
document.head.appendChild(styleEl);
${
  hasHmr
    ? `
import {apply} from '/web_modules/@snowpack/hmr.js';
apply(import.meta.url, ({code}) => {
  styleEl.removeChild(styleEl.lastChild);
  styleEl.appendChild(document.createTextNode(code));
});
`
    : ''
}`;
  }

  return `export default ${JSON.stringify(url)};`;
}

export function getFileBuilderForWorker(
  cwd: string,
  fileLoc: string,
  selectedWorker: DevScript,
  config: SnowpackConfig,
  messageBus?: EventEmitter,
): ((code: string, {filename: string}) => Promise<string>) | undefined {
  const {id, type, cmd, plugin} = selectedWorker;
  if (type === 'plugin') {
    return async (code: string, options: {filename: string}) => {
      const {build} = plugin!;
      try {
        let {result} = await build(fileLoc);
        return result;
      } catch (err) {
        err.message = `[${id}] ${err.message}`;
        console.error(err);
        return '';
      } finally {
        messageBus && messageBus.emit('WORKER_UPDATE', {id, state: null});
      }
    };
  }
  if (type === 'build') {
    return async (code: string, options: {filename: string}) => {
      let cmdWithFile = cmd.replace('$FILE', options.filename);
      const {stdout, stderr} = await execa.command(cmdWithFile, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        input: code,
        cwd,
      });
      if (stderr) {
        console.error(stderr);
      }
      messageBus && messageBus.emit('WORKER_UPDATE', {id, state: null});
      return stdout;
    };
  }
}

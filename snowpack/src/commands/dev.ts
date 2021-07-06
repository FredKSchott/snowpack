import http from 'http';
import mime from 'mime-types';
import path from 'path';
import * as esbuild from 'esbuild';
import glob from 'glob';
import esbuildSvelte from 'esbuild-svelte';
// import esbuildVue from 'esbuild-vue';
import {logger} from '../logger';
import {CommandOptions, SnowpackDevServer} from '../types';

function sendResponseError(req: http.IncomingMessage, res: http.ServerResponse, status: number) {
  const contentType = mime.contentType(path.extname(req.url!) || '.html');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType || 'application/octet-stream',
    Vary: 'Accept-Encoding',
  };
  res.writeHead(status, headers);
  res.end();
}

export async function startServer(
  commandOptions: CommandOptions,
  {
    isDev: _isDev,
    isWatch: _isWatch,
    preparePackages: _preparePackages,
  }: {isDev?: boolean; isWatch?: boolean; preparePackages?: boolean} = {},
): Promise<SnowpackDevServer> {
  const port = commandOptions.config.devOptions.port || 8080;

  const mounted: Record<string, esbuild.ServeResult> = {};
  for (const [k, v] of Object.entries(commandOptions.config.mount)) {
    const entryPoints = glob
      .sync('**/*', {cwd: k, absolute: true})
      .filter((f) => new Set(['.js', '.cjs', '.mjs']).has(path.extname(f)));
    mounted[v.url] = await esbuild.serve(
      {servedir: k},
      {
        bundle: true,
        entryPoints,
        minify: commandOptions.config.mode === 'production',
        plugins: [
          esbuildSvelte(),
          // esbuildVue(),
        ],
      },
    );
  }
  async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    let {url = '/'} = req;
    for (const k of Object.keys(mounted)) {
      if (!url.startsWith(k)) continue;
      const esbuildReq = http.request(
        {
          hostname: mounted[k].host,
          port: mounted[k].port,
          path: url.replace(new RegExp(`^${k}`), ''),
          method: req.method,
          headers: req.headers,
        },
        (esbuildRes) => {
          res.writeHead(esbuildRes.statusCode || 200, esbuildRes.headers);
          esbuildRes.pipe(res, {end: true});
        },
      );
      req.pipe(esbuildReq, {end: true});
      return;
    }

    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end(`Not found: "${url}"`);
  }

  const server = http.createServer(handleRequest).listen(port);

  console.log(`Live at http://localhost:${port}`);

  return {
    port,
    hmrEngine: {} as any,
    rawServer: server,
    async loadUrl() {
      return {
        contents: 'something',
        imports: [],
        originalFileLoc: '/',
        contentType: 'text/html',
        async checkStale() {},
      } as any;
    },
    handleRequest,
    sendResponseFile: handleRequest,
    sendResponseError,
    async getUrlForPackage(pkgSpec: string) {
      return pkgSpec;
    },
    getUrlForFile(fileLoc: string) {
      return fileLoc;
    },
    onFileChange(callback) {
      return callback({filePath: 'boo'});
    },
    getServerRuntime(options) {
      return {
        async importModule() {
          return {exports: {} as any, css: []};
        },
        invalidateModule() {
          return options?.invalidateOnChange;
        },
      };
    },
    async shutdown() {
      for (const k of Object.keys(mounted)) {
        mounted[k].stop();
      }
    },
    markChanged(fileLoc) {
      console.log({changed: fileLoc});
    },
  };
}

export async function command(commandOptions: CommandOptions) {
  try {
    // Set some CLI-focused defaults
    commandOptions.config.devOptions.output =
      commandOptions.config.devOptions.output || 'dashboard';
    commandOptions.config.devOptions.open = commandOptions.config.devOptions.open || 'default';
    commandOptions.config.devOptions.hmr = commandOptions.config.devOptions.hmr !== false;
    // Start the server
    await startServer(commandOptions, {isWatch: true});
  } catch (err) {
    logger.error(err.message);
    logger.debug(err.stack);
    process.exit(1);
  }
  return new Promise(() => {});
}

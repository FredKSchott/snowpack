import colors from 'kleur/colors';
import * as esbuild from 'esbuild';
import esbuildSvelte from 'esbuild-svelte';
import http from 'http';
import {createConfig} from './config';
import type {LoadResult, RuntimeOptions, Runtime, StringFile, BinaryFile} from '../@types/snowpack';
import {HTML, isBinary} from './util/content-type';
import {logger} from './util/logger';
import {ext} from './util/filename';

interface LoadOptions {
  esbuildServer: esbuild.ServeResult;
}

export async function load(
  url: string,
  {esbuildServer}: LoadOptions,
): Promise<LoadResult | undefined> {
  return new Promise((resolve, reject) => {
    const esbuildReq = http.request(
      {
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'gzip,deflate',
          Connection: 'keep-alive',
        },
        hostname: esbuildServer.host,
        port: esbuildServer.port,
        path: url,
        method: 'GET',
      },
      (esbuildRes) => {
        let data: any[] = [];
        esbuildRes.on('data', (chunk) => {
          data.push(chunk);
        });
        esbuildRes.on('end', async () => {
          if (esbuildRes.statusCode === 404) resolve(undefined); // not found
          let contentType = esbuildRes.headers['content-type'] || HTML;
          const body = Buffer.concat(data);
          const msg = esbuildRes.statusCode === 200 ? 'OK' : body.toString();
          logger.info(`[${url}] ${colors.yellow(`${esbuildRes.statusCode}`)} ${msg}`);

          const assets: (StringFile | BinaryFile)[] = [];

          // CSS
          const urlExt = ext(url);
          if (urlExt === '.js') {
            const maybeCSS = await load(url.replace(new RegExp(`${urlExt}$`), '.css'), {
              esbuildServer,
            });
            if (maybeCSS) assets.push(maybeCSS.data);
          }

          resolve({
            data: isBinary(contentType)
              ? {content: body, contentType, encoding: undefined}
              : {content: body.toString('utf8'), contentType, encoding: 'UTF-8'},
            assets: assets.length ? assets : undefined,
          });
        });
      },
    );
    esbuildReq.end();
    esbuildReq.on('error', (err) => {
      reject(err);
    });
  });
}

export async function createRuntime(options: RuntimeOptions): Promise<Runtime> {
  let cwd = new URL(`file://${process.cwd()}/`);
  if (typeof options.cwd === 'string') cwd = new URL(options.cwd, cwd);
  else if (options.cwd instanceof URL) cwd = options.cwd;
  const config = createConfig(options.config, cwd);

  // TODO: profile esbuild startup here & report to debug
  const esbuildServer = await esbuild.serve(
    {
      servedir: config.devOptions.static,
    },
    {
      bundle: true,
      define: {
        'process.env.NODE_ENV': JSON.stringify(config.mode),
      },
      entryPoints: config.entryPoints,
      incremental: true,
      platform: 'node',
      plugins: [esbuildSvelte()],
      target: options.target || 'es2019',
    },
  );

  return {
    load(url: string) {
      return load(url, {esbuildServer});
    },
    shutdown() {
      esbuildServer.stop();
    },
  };
}

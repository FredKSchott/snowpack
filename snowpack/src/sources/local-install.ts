import {install, InstallOptions as EsinstallOptions, InstallTarget} from 'esinstall';
import url from 'url';
import util from 'util';
import {buildFile} from '../build/build-pipeline';
import {logger} from '../logger';
import {ImportMap, SnowpackBuiltFile, SnowpackConfig} from '../types';

interface InstallOptions {
  config: SnowpackConfig;
  isDev: boolean;
  isSSR: boolean;
  installOptions: EsinstallOptions;
  installTargets: (InstallTarget | string)[];
}

interface InstallResult {
  importMap: ImportMap;
  needsSsrBuild: boolean;
}

export async function installPackages({
  config,
  isDev,
  isSSR,
  installOptions,
  installTargets,
}: InstallOptions): Promise<InstallResult> {
  if (installTargets.length === 0) {
    return {
      importMap: {imports: {}} as ImportMap,
      needsSsrBuild: false,
    };
  }
  const loggerName =
    installTargets.length === 1
      ? `esinstall:${
          typeof installTargets[0] === 'string' ? installTargets[0] : installTargets[0].specifier
        }`
      : `esinstall`;
  let needsSsrBuild = false;

  const finalResult = await install(installTargets, {
    cwd: config.root,
    alias: config.alias,
    logger: {
      debug: (...args: [any, ...any[]]) => logger.debug(util.format(...args), {name: loggerName}),
      log: (...args: [any, ...any[]]) => logger.info(util.format(...args), {name: loggerName}),
      warn: (...args: [any, ...any[]]) => logger.warn(util.format(...args), {name: loggerName}),
      error: (...args: [any, ...any[]]) => logger.error(util.format(...args), {name: loggerName}),
    },
    ...installOptions,
    stats: false,
    rollup: {
      plugins: [
        ...(config?.packageOptions?.rollup?.plugins ?? []),
        {
          name: 'esinstall:snowpack',
          async load(id: string) {
            // SSR Packages: Some file types build differently for SSR vs. non-SSR.
            // This line checks for those file types. Svelte is the only known file
            // type for now, but you can add to this line if you encounter another.
            needsSsrBuild = needsSsrBuild || id.endsWith('.svelte');
            const output = await buildFile(url.pathToFileURL(id), {
              config,
              isDev,
              isSSR,
              isPackage: true,
              isHmrEnabled: false,
            });
            let jsResponse: SnowpackBuiltFile | undefined;
            for (const [outputType, outputContents] of Object.entries(output)) {
              if (outputContents && outputType === '.js') {
                jsResponse = outputContents;
              }
            }
            if (jsResponse && Buffer.isBuffer(jsResponse.code)) {
              jsResponse.code = jsResponse.code.toString();
            }
            return jsResponse as {code: string; map?: string};
          },
        },
      ],
    },
  });
  logger.debug('Successfully ran esinstall.');
  return {importMap: finalResult.importMap, needsSsrBuild};
}

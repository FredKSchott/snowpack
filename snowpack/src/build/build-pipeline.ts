import path from 'path';
import {RawSourceMap, SourceMapConsumer, SourceMapGenerator} from 'source-map';
import url from 'url';
import {validatePluginLoadResult} from '../config';
import {logger} from '../logger';
import {PluginTransformResult, SnowpackBuildMap, SnowpackConfig} from '../types';
import {getExtension, readFile, removeExtension} from '../util';
import {cssModules, needsCSSModules} from './import-css';

export interface BuildFileOptions {
  isDev: boolean;
  isSSR: boolean;
  isPackage: boolean;
  isHmrEnabled: boolean;
  config: SnowpackConfig;
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
  {isDev, isSSR, isPackage, isHmrEnabled, config}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExtension(srcPath);

  const result: SnowpackBuildMap = {};

  for (const step of config.plugins) {
    if (!step.resolve || !step.resolve.input.some((ext) => srcPath.endsWith(ext))) {
      continue;
    }
    if (!step.load) {
      continue;
    }
    // v3.1: Some plugins break when run on node_modules/. This fix is in place until the plugins themselves have a chance to update.
    if (step.name.endsWith('@prefresh/snowpack/dist/index.js') && isPackage) {
      continue;
    }
    try {
      const debugPath = path.relative(config.root, srcPath);
      logger.debug(`load() starting… [${debugPath}]`, {name: step.name});
      const stepResult = await step.load({
        fileExt: srcExt,
        filePath: srcPath,
        isDev,
        isSSR,
        isPackage,
        isHmrEnabled,
      });
      logger.debug(`✔ load() success [${debugPath}]`, {name: step.name});

      validatePluginLoadResult(step, stepResult);

      if (typeof stepResult === 'string' || Buffer.isBuffer(stepResult)) {
        const mainOutputExt = step.resolve.output[0];
        result[mainOutputExt] = {code: stepResult};
      } else if (stepResult && typeof stepResult === 'object') {
        Object.keys(stepResult).forEach((ext) => {
          const output = stepResult[ext];

          // normalize to {code, map} format
          if (typeof output === 'string' || Buffer.isBuffer(output)) {
            result[ext] = {code: output};
          } else if (output) {
            result[ext] = output;
          }

          // ensure source maps are strings (it’s easy for plugins to pass back a JSON object)
          if (result[ext].map && typeof result[ext].map === 'object') {
            result[ext].map = JSON.stringify(stepResult[ext].map);
          }

          // if source maps disabled, don’t return any
          if (!config.buildOptions.sourcemap) result[ext].map = undefined;
        });

        break;
      }
    } catch (err) {
      // Attach metadata detailing where the error occurred.
      err.__snowpackBuildDetails = {name: step.name, step: 'load'};
      throw err;
    }
  }

  // if no result was generated, return file as-is
  if (!Object.keys(result).length) {
    return {
      [srcExt]: {
        code: await readFile(srcPath),
      },
    };
  }

  return result;
}

async function composeSourceMaps(
  id: string,
  base: string | RawSourceMap,
  derived: string | RawSourceMap,
): Promise<string> {
  const [baseMap, transformedMap] = await Promise.all([
    new SourceMapConsumer(base),
    new SourceMapConsumer(derived),
  ]);
  try {
    const generator = SourceMapGenerator.fromSourceMap(transformedMap);
    generator.applySourceMap(baseMap, id);
    return generator.toString();
  } finally {
    baseMap.destroy();
    transformedMap.destroy();
  }
}

/**
 * Build Plugin Second Pass: If a plugin defines a
 * transform() method,call it. Transform cannot change
 * the file extension, and was designed to run on
 * every file type and return null/undefined if no
 * change needed.
 */
async function runPipelineTransformStep(
  output: SnowpackBuildMap,
  srcPath: string,
  {isDev, isHmrEnabled, isPackage, isSSR, config}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const rootFilePath = removeExtension(srcPath, getExtension(srcPath));
  const rootFileName = path.basename(rootFilePath);
  for (const step of config.plugins) {
    if (!step.transform) {
      continue;
    }
    // v3.1: Some plugins break when run on node_modules/. This fix is in place until the plugins themselves have a chance to update.
    if (step.name.endsWith('@prefresh/snowpack/dist/index.js') && isPackage) {
      continue;
    }

    try {
      for (const destExt of Object.keys(output)) {
        const destBuildFile = output[destExt];
        const {code} = destBuildFile;
        const fileName = rootFileName + destExt;
        const filePath = rootFilePath + destExt;
        const debugPath = path.relative(config.root, filePath);
        logger.debug(`transform() starting… [${debugPath}]`, {name: step.name});
        const result = await step.transform({
          contents: code,
          isDev,
          isPackage,
          fileExt: destExt,
          id: filePath,
          srcPath,
          // @ts-ignore: Deprecated
          filePath: fileName,
          // @ts-ignore: Deprecated
          urlPath: `./${path.basename(rootFileName + destExt)}`,
          isHmrEnabled,
          isSSR,
        });
        logger.debug(`✔ transform() success [${debugPath}]`, {name: step.name});
        if (typeof result === 'string' || Buffer.isBuffer(result)) {
          // V2 API, simple string variant
          output[destExt].code = result;
          output[destExt].map = undefined;
        } else if (result && typeof result === 'object') {
          // V2 API, structured result variant
          const contents = (result as PluginTransformResult).contents || (result as any).result;
          if (contents) {
            output[destExt].code = contents;
            const map = (result as PluginTransformResult).map;
            let outputMap: string | undefined = undefined;
            if (map && config.buildOptions.sourcemap) {
              // if source maps disabled, don’t return any
              if (output[destExt].map) {
                outputMap = await composeSourceMaps(filePath, output[destExt].map!, map);
              } else {
                outputMap = typeof map === 'object' ? JSON.stringify(map) : map;
              }
            }
            output[destExt].map = outputMap;
          }
        }
      }
    } catch (err) {
      // Attach metadata detailing where the error occurred.
      err.__snowpackBuildDetails = {name: step.name, step: 'transform'};
      throw err;
    }
  }

  // handle CSS Modules, after plugins run
  if (needsCSSModules(srcPath)) {
    let contents: string = output['.css']
      ? (output['.css'].code as string)
      : ((await readFile(srcPath)) as string);
    if (contents) {
      // for CSS Modules URLs, we only need the destination URL (POSIX-style)
      let url = srcPath;
      for (const dir in config.mount) {
        if (srcPath.startsWith(dir)) {
          url = srcPath
            .replace(dir, config.mount[dir].url)
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .replace(/\.(scss|sass)$/i, '.css');
          break;
        }
      }
      const {css, json} = await cssModules({contents, url});
      output['.css'] = {...(output['.css'] || {}), code: css};
      output['.json'] = {code: JSON.stringify(json)};
    }
  }

  return output;
}

export async function runPipelineOptimizeStep(
  buildDirectory: string,
  {config}: {config: SnowpackConfig},
) {
  for (const step of config.plugins) {
    if (!step.optimize) {
      continue;
    }

    try {
      logger.debug('optimize() starting…', {name: step.name});
      await step.optimize({
        buildDirectory,
        // @ts-ignore: internal API only
        log: (msg) => {
          logger.info(msg, {name: step.name});
        },
      });
      logger.debug('✔ optimize() success', {name: step.name});
    } catch (err) {
      logger.error(err.toString() || err, {name: step.name});
      process.exit(1); // exit on error
    }
  }
  return null;
}

export async function runPipelineCleanupStep({plugins}: SnowpackConfig) {
  for (const step of plugins) {
    if (!step.cleanup) {
      continue;
    }
    await step.cleanup();
  }
}

/** Core Snowpack file pipeline builder */
export async function buildFile(
  srcURL: URL,
  buildFileOptions: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  // Pass 1: Find the first plugin to load this file, and return the result
  const loadResult = await runPipelineLoadStep(url.fileURLToPath(srcURL), buildFileOptions);
  // Pass 2: Pass that result through every plugin transform() method.
  const transformResult = await runPipelineTransformStep(
    loadResult,
    url.fileURLToPath(srcURL),
    buildFileOptions,
  );
  // Return the final build result.
  return transformResult;
}

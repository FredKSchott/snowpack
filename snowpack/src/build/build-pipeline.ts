import path from 'path';
import url from 'url';
import {validatePluginLoadResult} from '../config';
import {logger} from '../logger';
import {
  SnowpackBuildMap,
  SnowpackConfig,
  SnowpackPlugin,
  PluginTransformResult,
} from '../types/snowpack';
import {getExt, readFile, replaceExt} from '../util';
import {SourceMapConsumer, SourceMapGenerator, RawSourceMap} from 'source-map';

export interface BuildFileOptions {
  isDev: boolean;
  isSSR: boolean;
  isHmrEnabled: boolean;
  plugins: SnowpackPlugin[];
  sourceMaps: boolean;
}

export function getInputsFromOutput(fileLoc: string, plugins: SnowpackPlugin[]) {
  const srcFile = replaceExt(fileLoc, '.map', ''); // if this is a .map file, try loading source
  const {baseExt} = getExt(srcFile);

  const potentialInputs = new Set([srcFile]);
  for (const plugin of plugins) {
    if (plugin.resolve && plugin.resolve.output.includes(baseExt)) {
      plugin.resolve.input.forEach((input) =>
        potentialInputs.add(replaceExt(srcFile, baseExt, input)),
      );
    }
  }
  return Array.from(potentialInputs);
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
  {isDev, isSSR, isHmrEnabled, plugins, sourceMaps}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExt(srcPath).baseExt;
  for (const step of plugins) {
    if (!step.resolve || !step.resolve.input.includes(srcExt)) {
      continue;
    }
    if (!step.load) {
      continue;
    }

    try {
      const debugPath = path.relative(process.cwd(), srcPath);
      logger.debug(`load() starting… [${debugPath}]`, {name: step.name});
      const result = await step.load({
        fileExt: srcExt,
        filePath: srcPath,
        isDev,
        isSSR,
        isHmrEnabled,
      });
      logger.debug(`✔ load() success [${debugPath}]`, {name: step.name});

      validatePluginLoadResult(step, result);

      if (typeof result === 'string' || Buffer.isBuffer(result)) {
        const mainOutputExt = step.resolve.output[0];
        return {
          [mainOutputExt]: {
            code: result,
          },
        };
      } else if (result && typeof result === 'object') {
        Object.keys(result).forEach((ext) => {
          const output = result[ext];

          // normalize to {code, map} format
          if (typeof output === 'string' || Buffer.isBuffer(output)) {
            result[ext] = {code: output};
          }

          // ensure source maps are strings (it’s easy for plugins to pass back a JSON object)
          if (result[ext].map && typeof result[ext].map === 'object')
            result[ext].map = JSON.stringify(result[ext].map);

          // if source maps disabled, don’t return any
          if (!sourceMaps) result[ext].map = undefined;

          // clean up empty files
          if (!result[ext].code) delete result[ext];
        });
        return result;
      }
    } catch (err) {
      // Attach metadata detailing where the error occurred.
      err.__snowpackBuildDetails = {name: step.name, step: 'load'};
      throw err;
    }
  }

  return {
    [srcExt]: {
      code: await readFile(url.pathToFileURL(srcPath)),
    },
  };
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
  {isDev, plugins, sourceMaps}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExt(srcPath).baseExt;
  const rootFilePath = srcPath.replace(srcExt, '');
  const rootFileName = path.basename(rootFilePath);
  for (const step of plugins) {
    if (!step.transform) {
      continue;
    }

    try {
      for (const destExt of Object.keys(output)) {
        const destBuildFile = output[destExt];
        const {code} = destBuildFile;
        const fileName = rootFileName + destExt;
        const filePath = rootFilePath + destExt;
        const debugPath = path.relative(process.cwd(), filePath);
        logger.debug(`transform() starting… [${debugPath}]`, {name: step.name});
        const result = await step.transform({
          contents: code,
          isDev,
          fileExt: destExt,
          id: filePath,
          // @ts-ignore: Deprecated
          filePath: fileName,
          // @ts-ignore: Deprecated
          urlPath: `./${path.basename(rootFileName + destExt)}`,
        });
        logger.debug(`✔ transform() success [${debugPath}]`, {name: step.name});
        if (typeof result === 'string' || Buffer.isBuffer(result)) {
          // V2 API, simple string variant
          output[destExt].code = result;
          output[destExt].map = undefined;
        } else if (
          result &&
          typeof result === 'object' &&
          (result as PluginTransformResult).contents
        ) {
          // V2 API, structured result variant
          output[destExt].code = (result as PluginTransformResult).contents;
          const map = (result as PluginTransformResult).map;
          let outputMap: string | undefined = undefined;
          if (map && sourceMaps) {
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
    } catch (err) {
      // Attach metadata detailing where the error occurred.
      err.__snowpackBuildDetails = {name: step.name, step: 'transform'};
      throw err;
    }
  }

  return output;
}

export async function runPipelineOptimizeStep(buildDirectory: string, {plugins}: BuildFileOptions) {
  for (const step of plugins) {
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
  const transformResult = await runPipelineTransformStep(loadResult, url.fileURLToPath(srcURL), buildFileOptions);
  // Return the final build result.
  return transformResult;
}

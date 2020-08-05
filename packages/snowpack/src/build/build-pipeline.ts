import {EventEmitter} from 'events';
import {promises as fs} from 'fs';
import path from 'path';
import {SnowpackBuildMap, SnowpackPlugin} from '../types/snowpack';
import {getEncodingType, getExt, replaceExt} from '../util';
import {validatePluginLoadResult} from '../config';

export interface BuildFileOptions {
  plugins: SnowpackPlugin[];
  messageBus: EventEmitter;
  isDev: boolean;
  isHmrEnabled: boolean;
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
  {plugins, messageBus, isDev, isHmrEnabled, sourceMaps}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExt(srcPath).baseExt;
  for (const step of plugins) {
    if (!step.resolve || !step.resolve.input.includes(srcExt)) {
      continue;
    }
    if (!step.load) {
      continue;
    }
    const result = await step.load({
      fileExt: srcExt,
      filePath: srcPath,
      isDev,
      isHmrEnabled,
      // @ts-ignore: internal API only
      log: (msg, data: any = {}) => {
        messageBus.emit(msg, {
          ...data,
          id: step.name,
          msg: data.msg && `${data.msg} [${path.relative(process.cwd(), srcPath)}]`,
        });
      },
    });

    validatePluginLoadResult(step, result);

    if (typeof result === 'string') {
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
        if (typeof output === 'string') result[ext] = {code: output};

        // ensure source maps are strings (it’s easy for plugins to pass back a JSON object)
        if (result[ext].map && typeof result[ext].map === 'object')
          result[ext].map = JSON.stringify(result[ext].map);

        // if source maps disabled, don’t return any
        if (!sourceMaps) result[ext].map = undefined;
      });
      return result;
    } else {
      continue;
    }
  }

  return {
    [srcExt]: {
      code: await fs.readFile(srcPath, getEncodingType(srcExt)),
    },
  };
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
  {plugins, messageBus, isDev, sourceMaps}: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  const srcExt = getExt(srcPath).baseExt;
  const rootFileName = path.basename(srcPath).replace(srcExt, '');
  for (const step of plugins) {
    if (!step.transform) {
      continue;
    }
    for (const destExt of Object.keys(output)) {
      const destBuildFile = output[destExt];
      const {code, map} =
        typeof destBuildFile === 'string' ? {code: destBuildFile, map: undefined} : destBuildFile;
      const result = await step.transform({
        contents: code,
        fileExt: destExt,
        filePath: rootFileName + destExt,
        isDev,
        // @ts-ignore: internal API only
        log: (msg, data: any = {}) => {
          messageBus.emit(msg, {
            ...data,
            id: step.name,
            msg: data.msg && `[${srcPath}] ${data.msg}`,
          });
        },
        // @ts-ignore: Deprecated
        urlPath: `./${path.basename(rootFileName + destExt)}`,
      });
      if (typeof result === 'string') {
        output[destExt] = {code: result, map};
      } else if (result && typeof result === 'object' && (result as {result: string}).result) {
        output[destExt] = {code: (result as {result: string}).result, map};
      }

      // if source maps disabled, don’t return any
      if (!sourceMaps) output[destExt].map = undefined;
    }
  }

  return output;
}

export async function runPipelineOptimizeStep(
  buildDirectory: string,
  {plugins, messageBus}: BuildFileOptions,
) {
  for (const step of plugins) {
    if (!step.optimize) {
      continue;
    }
    await step.optimize({
      buildDirectory,
      // @ts-ignore: internal API only
      log: (msg) => {
        messageBus.emit('WORKER_MSG', {id: step.name, level: 'log', msg});
      },
    });
  }
  return null;
}

/** Core Snowpack file pipeline builder */
export async function buildFile(
  srcPath: string,
  buildFileOptions: BuildFileOptions,
): Promise<SnowpackBuildMap> {
  // Pass 1: Find the first plugin to load this file, and return the result
  const loadResult = await runPipelineLoadStep(srcPath, buildFileOptions);
  // Pass 2: Pass that result through every plugin transfomr() method.
  const transformResult = await runPipelineTransformStep(loadResult, srcPath, buildFileOptions);
  // Return the final build result.
  return transformResult;
}

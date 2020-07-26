import {EventEmitter} from 'events';
import {promises as fs} from 'fs';
import path from 'path';
import {SnowpackBuildMap, SnowpackPlugin} from '../config';
import {getEncodingType, getExt} from '../util';

export interface BuildFileOptions {
  buildPipeline: SnowpackPlugin[];
  messageBus: EventEmitter;
  isDev: boolean;
}

export function getInputsFromOutput(fileLoc: string, plugins: SnowpackPlugin[]) {
  const {baseExt} = getExt(fileLoc);
  const potentialInputs = new Set([fileLoc]);
  for (const plugin of plugins) {
    if (plugin.resolve && plugin.resolve.output.includes(baseExt)) {
      plugin.resolve.input.forEach((inp) => potentialInputs.add(fileLoc.replace(baseExt, inp)));
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
  {buildPipeline, messageBus, isDev}: BuildFileOptions,
) {
  const srcExt = getExt(srcPath).baseExt;
  for (const step of buildPipeline) {
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
      log: (msg, data = {}) => {
        messageBus.emit(msg, {
          ...data,
          id: step.name,
          msg: data.msg && `[${srcPath}] ${data.msg}`,
        });
      },
    });
    const mainOutputExt = step.resolve.output[0];
    if (typeof result === 'string') {
      return {[mainOutputExt]: result};
    } else if (result && typeof result === 'object') {
      return result;
    } else {
      continue;
    }
  }
  return {[srcExt]: await fs.readFile(srcPath, getEncodingType(srcExt))};
}

/**
 * Build Plugin Second Pass: If a plugin defines a
 * transform() method,call it. Transform cannot change
 * the file extension, and was designed to run on
 * every file type and return null/undefined if no
 * change needed.
 */
async function runPipelineTransformStep(
  output: Record<string, string>,
  srcPath: string,
  {buildPipeline, messageBus, isDev}: BuildFileOptions,
) {
  const srcExt = getExt(srcPath).baseExt;
  const rootFileName = path.basename(srcPath).replace(srcExt, '');
  for (const step of buildPipeline) {
    if (!step.transform) {
      continue;
    }
    for (const destExt of Object.keys(output)) {
      const destBuildFile = output[destExt];
      const result = await step.transform({
        contents: destBuildFile,
        fileExt: destExt,
        filePath: rootFileName + destExt,
        isDev,
        log: (msg, data = {}) => {
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
        output[srcExt] = result;
      } else if (result && typeof result === 'object' && (result as {result: string}).result) {
        output[srcExt] = (result as {result: string}).result;
      }
    }
  }
  return output;
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

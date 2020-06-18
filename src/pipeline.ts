/**
 * 🏄‍♂️ Pipeline
 */
import path from 'path';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import {
  SnowpackFile,
  SnowpackPipelineStep,
  SnowpackPlugin,
  SnowpackConfig,
  SnowpackPipeline,
} from './config';

type ExtensionMap = {input: string; output?: string};

/** Convert extension mappings, such as "js,ts" or "scss->css" */
function parseExtString(ext: string): ExtensionMap[] {
  const normalize = (s: string) => `.${s.replace(/^\./, '').trim()}`; // add initial "." if missing

  // handle output extensions
  const ARROW = '->';
  const output = ext.split(ARROW)[1] || undefined; // the `|| undefined` is for TS
  if (output?.includes(',')) {
    throw new Error(`Only one output extension may be defined: ${ext}`); // throw error for things like tsx,jsx->ts,js
  }

  // separate inputs by comma & return
  const inputs = ext.split(',').map(normalize);
  return inputs.map((input) => ({input, output: output ? normalize(output) : undefined})); // if output exists, use it for all extensions; otherwise input === output
}

/** Rename extension */
function renameExt(filename: string, replace: [string, string]): string {
  const extRegEx = new RegExp(`${replace[0]}$`); // replace only the end of the filename
  return filename.replace(extRegEx, replace[1]);
}

/** Create a new Snowpack Pipeline from a config. */
export default class Pipeline {
  config: SnowpackConfig;
  isDev: boolean;

  constructor({config, isDev}: {config: SnowpackConfig; isDev?: boolean}) {
    this.config = config;
    this.isDev = isDev || false;
  }

  /** Load a Snowpack plugin from a string or tuple */
  loadPlugin(name: string, options: any = {}): SnowpackPlugin | undefined {
    const config = this.config;

    // internal proxy plugin (remove this when published to npm)
    if (name === '@snowpack/plugin-proxy') {
      return require('./plugin-proxy');
    }

    try {
      const pluginLoc = require.resolve(name, {paths: [process.cwd()]});
      return require(pluginLoc)(config, options);
    } catch (err) {
      return undefined;
    }
  }

  /** Match a file with an existing pipeline */
  public match(
    filename: string,
  ): {matched: string; replace?: [string, string]; pipeline: SnowpackPipelineStep[]} | undefined {
    const pipeline = this.config.pipeline as SnowpackPipeline;

    // note: don’t use path.extname() because that will convert things like *.proxy.js to .js
    const allMatchers = Object.keys(pipeline);

    for (let i = 0; i < allMatchers.length; i++) {
      const matchedFiles = parseExtString(allMatchers[i]);
      const firstMatch = matchedFiles.find(({input}) => filename.endsWith(input));

      // short-circuit loop as soon as a match is found and don’t continue
      if (firstMatch) {
        const {input, output} = firstMatch;
        return {
          matched: input,
          pipeline: pipeline[allMatchers[i]],
          replace: output ? [input, output] : undefined,
        };
      }
    }
  }

  /** Transform a file through plugins to generate a final result */
  public async transform(input: SnowpackFile): Promise<SnowpackFile> {
    const cwd = process.cwd();
    const result = {...input}; // result to mutate

    if (!input.filePath) {
      throw new Error(`Couldn’t locate "${input.importPath}"`);
    }

    const match = this.match(input.filePath);

    if (!match) {
      return input; // no match; return as is
    }

    const {pipeline, replace} = match;

    // for loop ensures we execute async transforms in order
    for (let i = 0; i < pipeline.length; i++) {
      const isLastStep = i === pipeline.length - 1;

      // update extension
      if (isLastStep && replace) {
        result.filePath = renameExt(result.filePath, replace);
        result.importPath = renameExt(result.importPath, replace);
      }

      const name = Array.isArray(pipeline[i]) ? pipeline[i][0] : (pipeline[i] as string);
      const options = Array.isArray(pipeline[i]) ? pipeline[i][1] : {};

      // Path A: try loading Snowpack plugin
      const plugin = this.loadPlugin(name, options);
      if (plugin) {
        // 1. build()
        if (plugin.build) {
          const build = await plugin.build({
            contents: result.code,
            filePath: result.filePath,
            isDev: this.isDev,
          });
          if (build) result.code = build.result;
        }

        // 2. transform()
        if (plugin.transform) {
          const build = await plugin.transform({
            contents: result.code,
            urlPath: result.importPath,
            isDev: this.isDev,
          });
          if (build) result.code = build.result;
        }
      } else {
        // Path B: Snowpack plugin failed; try running as CLI command
        const {stdout, stderr} = await execa.command(name, {
          env: {
            ...npmRunPath.env(),
            FILE: result.filePath,
          },
          input: result.code,
          extendEnv: true,
          shell: true,
          cwd,
        });

        if (stderr) {
          throw new Error(stderr);
        }

        if (stdout) result.code = stdout;
      }
    }

    return result;
  }
}

import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs-parser';

import * as rollup from 'rollup';
import rollupPluginNodeResolve from 'rollup-plugin-node-resolve';
import rollupPluginCommonjs from 'rollup-plugin-commonjs';
import { terser as rollupPluginTerser } from "rollup-plugin-terser";

export interface InstallOptions {
  destLoc: string;
  isCleanInstall?: boolean;
  isExplicitDeps?: boolean;
  isStrict?: boolean;
  isOptimized?: boolean;
}

type DependencyType
  = 'package'
  | 'module';

interface ESModuleResolutionResult {
  isPackageLackingModule?: boolean;
  path?: string;
  depNameRefersTo: DependencyType;
}

const cwd = process.cwd();
let spinner = ora(chalk.bold(`@pika/web`) + ` installing...`);

function showHelp() {
  console.log(`${chalk.bold(`@pika/web`)} - Install npm dependencies to run natively on the web.`);
  console.log(`
  Options
    --dest      Specify destination directory (default: "web_modules/").
    --clean     Clear out the destination directory before install.
    --optimize  Minify installed dependencies.
    --strict    Only install pure ESM dependency trees. Fail if a CJS module is encountered.
`);
}

function logError(msg) {
  spinner.stopAndPersist({symbol: chalk.cyan('⠼')});
  spinner = ora(chalk.red(msg));
  spinner.fail();
}

function dependencyDescriptorToWebModuleFileName(dependencyDescriptor: string, dependencyType: DependencyType): string {
  let dependencyName;
  if (dependencyType === 'package') {
    dependencyName = dependencyDescriptor;
  } else if (dependencyType === 'module') {
    dependencyName = dependencyDescriptor.replace(/\.js$/, '');
  } else {
    throw new Error(`Unsupported dependency type, "${dependencyType}".`);
  }
  return sanitizeReservedFilesystemCharacters(dependencyName);
}

function sanitizeReservedFilesystemCharacters(path: string): string {
  return path.replace('/', '--');
}

class ErrorWithHint extends Error {
  constructor(message: string, public readonly hint: string) {
    super(message);
    // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

function locateEsModule(dependencyDescriptor: string): ESModuleResolutionResult {
  const dependencyPath = path.join(cwd, 'node_modules', dependencyDescriptor);
  if (!fs.existsSync(dependencyPath)) {
    throw new Error(`dependency "${dependencyDescriptor}" not found in your node_modules/ directory. Did you run npm install?`);
  }
  const dependencyStats = fs.statSync(dependencyPath);
  if (dependencyStats.isDirectory()) {
    return locateEsModuleWithinDirectory(dependencyPath);
  }
  if (dependencyStats.isFile()) {
    return {
      depNameRefersTo: 'module',
      path: dependencyPath,
    };
  }
  throw new Error(`Dependency "${dependencyDescriptor}"'s path, "${dependencyPath}" refers to neither a directory nor a regular file.`);
}

function locateEsModuleWithinDirectory(packageDirectory: string): ESModuleResolutionResult {
  const manifestPath = path.join(packageDirectory, 'package.json');
  const manifest = require(manifestPath);
  if (!manifest.module) {
    return {
      depNameRefersTo: 'package',
      isPackageLackingModule: true,
    };
  }
  return {
    depNameRefersTo: 'package',
    path: path.join(packageDirectory, manifest.module),
  };
}

export async function install(arrayOfDeps: string[], {isCleanInstall, destLoc, isExplicitDeps, isStrict, isOptimized}: InstallOptions) {
  const depObject = {};
  try {
    if (arrayOfDeps.length === 0) {
      throw new Error('no dependencies found.');
    }
    if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
      throw new Error('no node_modules/ directory exists. Run "npm install" in your project before running @pika/web.');
    }

    if (isCleanInstall) {
      rimraf.sync(destLoc);
    }

    for (const dep of arrayOfDeps) {
      const resolutionResult = locateEsModule(dep);
      if (resolutionResult.isPackageLackingModule) {
        if (isExplicitDeps) {
          throw new ErrorWithHint(
            `dependency "${dep}"'s package.json has no ES "module" entrypoint.`,
            '\n' + chalk.italic(`Tip: Find modern, web-ready packages at ${chalk.underline('https://pikapkg.com/packages')}`) + '\n'
            );
        }
        // user didn't explicitly specify which packages they care about, so we settle for best-effort
        continue;
      }
      depObject[dependencyDescriptorToWebModuleFileName(dep, resolutionResult.depNameRefersTo)] = resolutionResult.path;
    }

  } catch(err) {
    logError(err.message);
    if (err instanceof ErrorWithHint) {
      console.log(err.hint);
    }
    return;
  }

  const inputOptions = {
    input: depObject,
    plugins: [
      rollupPluginNodeResolve({
        module: true, // Default: true
        jsnext: false,  // Default: false
        main: !isStrict,  // Default: true
        browser: false,  // Default: false
        modulesOnly: isStrict, // Default: false
        extensions: [ '.mjs', '.js', '.json' ],  // Default: [ '.mjs', '.js', '.json', '.node' ]
        jail: path.join(cwd, 'node_modules'),
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: false,  // Default: true
      }),
      !isStrict && rollupPluginCommonjs({
        extensions: [ '.js', '.cjs' ],  // Default: [ '.js' ]
      }),
      isOptimized && rollupPluginTerser()
    ]
  };
  const outputOptions = {
    dir: destLoc,
    format: "esm" as 'esm',
    sourcemap: true,
    exports: 'named' as 'named',
    chunkFileNames: "common/[name]-[hash].js"
  };
  const packageBundle = await rollup.rollup(inputOptions);
  await packageBundle.write(outputOptions);
  return true;
}

export async function cli(args: string[]) {
  const {help, optimize = false, strict = false, clean = false, dest = "web_modules"} = yargs(args);
  const destLoc = path.join(cwd, dest);

	if (help) {
    showHelp();
    process.exit(0);
  }

  const cwdManifest = require(path.join(cwd, 'package.json'));
  const isExplicitDeps = !!cwdManifest && !!cwdManifest['@pika/web'] && !!cwdManifest['@pika/web'].webDependencies;
  const arrayOfDeps = isExplicitDeps ? cwdManifest['@pika/web'].webDependencies : Object.keys(cwdManifest.dependencies || {});
  spinner.start();
  const startTime = Date.now();
  const result = await install(arrayOfDeps, {isCleanInstall: clean, destLoc, isExplicitDeps, isStrict: strict, isOptimized: optimize});
  if (result) {
    spinner.succeed(chalk.green.bold(`@pika/web`) + ` installed web-native dependencies. ` + chalk.dim(`[${((Date.now() - startTime) / 1000).toFixed(2)}s]`));
  }
}
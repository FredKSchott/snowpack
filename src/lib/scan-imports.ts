import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import glob from 'glob';
import {parse} from '@babel/parser';
import traverse, {NodePath} from '@babel/traverse';
import {
  CallExpression,
  ImportDeclaration,
  isImportDeclaration,
  isCallExpression,
} from '@babel/types';

interface DependencyTree {
  [key: string]: string[];
}

const cwd = process.cwd();

/**
 * Renames `web_modules/vue.js` to `vue` based on --dest
 */
function getNpmName(modulePath: string, dest: string) {
  const noExtension = modulePath.replace(/\.[^.]+$/, '');

  // this RegEx allows for web_modules, web_modules/, ./folder/web_modules, etc. as valid --dest options
  const [lastSegment] = dest.match(/\/?([^/]+)\/?$/);
  const [_, moduleName] = noExtension.split(lastSegment);

  if (!moduleName) {
    return noExtension; // module not in --dest
  }

  const parts = moduleName.split('/').filter(part => part); // split into folders
  const isScoped = parts[0].startsWith('@');
  return isScoped ? `${parts[0]}/${parts[1]}` : parts[0];
}

/**
 * Return module name from static import
 */
function importModuleName(node: NodePath<ImportDeclaration>) {
  if (isImportDeclaration(node)) {
    return node.node.source.value;
  }
  return undefined;
}

/**
 * Return dynamic module name
 */
function dynamicImportModuleName(node: NodePath<CallExpression>) {
  if (isCallExpression(node)) {
    if (node.node.callee.type === 'Import' && node.node.arguments && node.node.arguments.length) {
      return (node.node.arguments[0] as any).value;
    }
  }
  return undefined;
}

/**
 * Return array of dependencies
 */
function getDependencies(file: string) {
  const code = fs.readFileSync(file, 'utf8');
  if (!code) {
    throw new Error(`Could not read ${file}`);
  }
  const ast = parse(code, {plugins: ['dynamicImport'], sourceType: 'module'});

  const deps: string[] = [];

  traverse(ast, {
    enter(node) {
      const moduleName =
        importModuleName(node as NodePath<ImportDeclaration>) ||
        dynamicImportModuleName(node as NodePath<CallExpression>);

      if (!moduleName) {
        return;
      }

      // if remote module
      if (moduleName.startsWith('http://') || moduleName.startsWith('https://')) {
        if (!deps.includes(moduleName)) {
          deps.push(moduleName);
        }
        return;
      }

      try {
        // if local module
        const resolvedPath = path.resolve(path.dirname(file), moduleName);
        if (exists(resolvedPath) && !deps.includes(resolvedPath)) {
          deps.push(resolvedPath.replace(cwd, '')); // strip out full path above project root (cwd) when adding
        }
      } catch (e) {
        // if npm module
        if (!deps.includes(moduleName)) {
          deps.push(moduleName);
        }
      }
    },
  });

  return [...deps].sort((a, b) => a.localeCompare(b));
}

/**
 * Check if filepath is valid
 */

function exists(filename: string) {
  const stats = fs.statSync(filename);
  return stats && stats.isFile();
}

/**
 * Take an array of files, recursively scan imports, and return dependencies
 */
function buildDependencyTree(
  files: string[],
  dependencyTree: DependencyTree = {},
  npmDependencies: string[] = [],
) {
  files.forEach(file => {
    const key = file.replace(cwd, ''); // don’t expose full filepath

    // if file already parsed, skip
    if (dependencyTree[key]) {
      return;
    }

    // if new module, add to tree
    const modules = getDependencies(file);
    dependencyTree[key] = modules;

    // resolve modules
    const localModules: string[] = [];
    modules.forEach(moduleName => {
      if (moduleName.startsWith('http://') || moduleName.startsWith('https://')) {
        return; // skip remote modules
      }

      // if local, try and resolve (this will throw if missing)
      try {
        const localModule = path.resolve(cwd, moduleName.replace(/^\//, ''));
        if (exists(localModule)) {
          localModules.push(localModule);
        }
      } catch (e) {
        // if file can’t be located, it might be an npm module
        if (!npmDependencies.includes(moduleName)) {
          npmDependencies.push(moduleName);
        }
      }
    });

    // recursively scan these modules until there are none left
    if (localModules.length) {
      buildDependencyTree(localModules, dependencyTree, npmDependencies);
    }
  });

  return {dependencyTree, npmDependencies};
}

interface ScanOptions {
  dest: string;
}

interface ScanResults {
  dependencies: string[];
  dependencyTree?: DependencyTree;
}

/**
 * Scan files and their imports for dependencies
 */
export default function scanImports(entry: string, options: ScanOptions): ScanResults {
  // return on missing entry
  if (!entry.length) {
    return {dependencies: []};
  }

  const files = glob.sync(entry);

  // return & warn on no matching files
  if (!files.length) {
    console.warn(`No files found matching ${entry}`);
    return {dependencies: []};
  }

  // start perf benchmark
  const spinner = ora(`Scanning ${entry}`).start();
  const timeStart = process.hrtime();

  // build dep tree
  const {dependencyTree, npmDependencies} = buildDependencyTree(files);

  // end perf benchmark & print
  const timeEnd = process.hrtime(timeStart);
  const ms = timeEnd[0] + Math.round(timeEnd[1] / 1e6);
  spinner.succeed(
    `@pika/web resolved: ${npmDependencies.length} dependencies ${chalk.dim(
      `[${ms.toString()}ms]`,
    )}`,
  );

  return {
    dependencies: [...npmDependencies]
      .map(dep => getNpmName(dep, options.dest))
      .sort((a, b) => a.localeCompare(b)),
    dependencyTree,
  };
}

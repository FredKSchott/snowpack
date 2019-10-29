import fs from 'fs';
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

/**
 * Splits a filename into folder segments
 */
function explode(file: string) {
  return file.split('/').filter(part => part);
}

/**
 * Renames `web_modules/vue.js` to `vue` based on --dest
 */
function getNpmName(modulePath: string, dest: string) {
  const noExt = modulePath.replace(/\.[^.]+$/, '');

  const lastPart = [...explode(dest)].pop();
  const [_, moduleName] = noExt.split(lastPart);
  if (!moduleName) {
    return noExt; // module not in --dest
  }

  const parts = explode(moduleName);
  const isScoped = parts[0].startsWith('@');
  return isScoped ? `${parts[0]}/${parts[1]}` : parts[0];
}

/**
 * Return import name (or undefined)
 */
function importModuleName(node: NodePath<ImportDeclaration>): string | undefined {
  if (isImportDeclaration(node)) {
    return node.node.source.value;
  }
  return undefined;
}

/**
 * Return dynamic import name (or undefined)
 */
function dynamicImportModuleName(node: NodePath<CallExpression>): string | undefined {
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
function parseImports(file: string) {
  const code = fs.readFileSync(file, 'utf8');

  // skip file if empty, or if permissions error
  if (!code) {
    return [];
  }
  const deps = new Set<string>(); // micro-optimization: use Set() to dedupe

  // try to parse; this will fail if not JS
  try {
    const ast = parse(code, {plugins: ['dynamicImport'], sourceType: 'module'});
    traverse(ast, {
      enter(node) {
        const moduleName =
          importModuleName(node as NodePath<ImportDeclaration>) ||
          dynamicImportModuleName(node as NodePath<CallExpression>);

        if (moduleName) {
          deps.add(moduleName);
        }
      },
    });
    return [...deps]; // return Array for simplicity
  } catch (e) {
    return [];
  }
}

interface ScanOptions {
  dependencies: {[key: string]: string};
  dest: string;
}

/**
 * Scan files and their imports for dependencies
 */
export default function scanImports(entry: string, options: ScanOptions): string[] {
  // return on missing entry
  if (!entry.length) {
    return [];
  }

  // if package.json has no dependencies, skip
  if (!Object.keys(options.dependencies).length) {
    return [];
  }

  // return & warn on no matching files
  const files = glob.sync(entry, {nodir: true});
  if (!files.length) {
    console.warn(`No files found matching ${entry}`);
    return [];
  }

  // start perf benchmark
  const spinner = ora(`Scanning ${entry}`).start();
  const timeStart = process.hrtime();

  // get all dependencies within globs
  const allDependencies = new Set<string>();
  files.forEach(file => {
    parseImports(file).forEach(dep => {
      allDependencies.add(dep);
    });
  });

  // filter out dependencies not in deps or devDeps
  const npmDependencies = [...allDependencies]
    .map(dep => getNpmName(dep, options.dest))
    .filter(dep => !!options.dependencies[dep])
    .sort((a, b) => a.localeCompare(b));

  // end perf benchmark & print
  const timeEnd = process.hrtime(timeStart);
  const ms = timeEnd[0] + Math.round(timeEnd[1] / 1e6);
  spinner.succeed(
    `@pika/web resolved: ${npmDependencies.length} dependencies ${chalk.dim(
      `[${ms.toString()}ms]`,
    )}`,
  );

  return [...npmDependencies]
    .map(dep => getNpmName(dep, options.dest))
    .sort((a, b) => a.localeCompare(b));
}

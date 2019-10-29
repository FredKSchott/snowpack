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
 * Remove file extension
 */
function noExtension(file: string) {
  return file.replace(/\.[^.]+$/, '');
}

/**
 * Attempt to return npm package name
 */
function packageName(name: string) {
  // if there’s no slash, this is likely a package name already
  if (!name.includes('/')) {
    return name;
  }
  // return first 2 segments if scoped package, or first if not scoped
  const [scope, pkg] = explode(name);
  return scope.startsWith('@') ? `${scope}/${pkg}` : scope;
}

/**
 * Attempt to figure out web_module’s identity
 */
function resolveWebModule(name: string, dest: string) {
  const lastSegment = [...explode(dest)].pop();
  // is the last folder segment of --dest present?
  if (name.includes(lastSegment)) {
    const [_, webModule] = name.split(lastSegment);
    if (webModule) {
      return packageName(noExtension(webModule)); // remove file extension if web module
    }
  }

  // otherwise, return package name
  return packageName(name);
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
  const deps = new Set<string>();

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
    return [...deps];
  } catch (e) {
    return [];
  }
}

interface ScanOptions {
  dependencies: {[key: string]: string};
  dest: string;
}

/**
 * Scan glob pattern for imports
 */
export default function scanImports(entry: string, options: ScanOptions): string[] {
  if (!Object.keys(options.dependencies).length) {
    console.warn(`No dependencies or devDependencies found in package.json`);
    return [];
  }

  const files = glob.sync(entry, {nodir: true});
  if (!files.length) {
    console.warn(`No files found matching ${entry}`);
    return [];
  }

  // start perf benchmark
  const spinner = ora(`Scanning ${entry}`).start();
  const timeStart = process.hrtime();

  // get all dependencies (even local ones)
  const allDependencies = new Set<string>();
  files.forEach(file => {
    parseImports(file).forEach(dep => {
      allDependencies.add(resolveWebModule(dep, options.dest));
    });
  });

  // filter out dependencies not in package.json and sort
  const npmDependencies = [...allDependencies]
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

  return npmDependencies;
}

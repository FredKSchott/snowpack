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
 * Attempt to figure out web_module’s identity
 */
function resolveWebModule(name: string, dest: string) {
  const lastSegment = [...explode(dest)].pop();
  // is the last folder segment of --dest present?
  if (name.includes(lastSegment)) {
    const [_, webModule] = name.split(lastSegment);
    if (webModule) {
      return webModule.replace(/^\//, ''); // remove file extension, and leading slash, if any
    }
  }

  // otherwise, return package name
  return name;
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
export default function scanImports(include: string, options: ScanOptions): string[] {
  if (!Object.keys(options.dependencies).length) {
    console.warn(`No dependencies or devDependencies found in package.json`);
    return [];
  }

  const files = glob.sync(include, {nodir: true});
  if (!files.length) {
    console.warn(`No files found matching ${include}`);
    return [];
  }

  // start perf benchmark
  const spinner = ora(`Scanning ${include}`).start();
  const timeStart = process.hrtime();

  // get all dependencies (even local ones)
  const allDependencies = new Set<string>();
  files.forEach(file => {
    parseImports(file).forEach(dep => {
      allDependencies.add(resolveWebModule(dep, options.dest));
    });
  });

  // filter out modules not in options.dependencies and sort
  const foundInDeps = (name: string) => !!options.dependencies[name];
  const npmDependencies = [...allDependencies]
    .map(originalName => {
      // npm name (ex: `vue`)
      if (foundInDeps(originalName)) {
        return originalName;
      }
      // npm name + extension (ex: `graphql.js`)
      const noExt = originalName.replace(/\.[^.]+$/, '');
      if (foundInDeps(noExt)) {
        return noExt;
      }
      // nested dep (ex: `algoliasearch/dist/algoliasearchLite.js`)
      const [scope, name] = explode(originalName);
      const rootName = scope.startsWith('@') ? `${scope}/${name}` : scope;
      if (foundInDeps(rootName)) {
        return originalName;
      }
      // dep not found
      return undefined;
    })
    .filter(dep => dep) // filter out unresolved
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

import fs from 'fs';
import path from 'path';
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
function getDependencies(file: string, cwd: string) {
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
export default function autoResolve(files: string[], cwd: string, deps: DependencyTree = {}) {
  files.forEach(file => {
    const key = file.replace(cwd, ''); // don’t expose full filepath

    // if file already parsed, skip
    if (deps[key]) {
      return;
    }

    // if new module, add to tree
    const modules = getDependencies(file, cwd);
    deps[key] = modules;

    // if these modules can be resolved, try and resolve them
    const localModules: string[] = [];
    modules.forEach(moduleName => {
      if (moduleName.startsWith('http://') || moduleName.startsWith('https://')) {
        return; // skip remote modules
      }

      // if local, try and resolve
      try {
        const localModule = path.resolve(cwd, moduleName.replace(/^\//, ''));
        if (exists(localModule)) {
          localModules.push(localModule);
        }
      } catch (e) {
        // don’t worry champ you tried your best (don’t do anything if file can’t be located)
      }
    });

    // recursively scan these modules until there are none left
    if (localModules.length) {
      autoResolve(localModules, cwd, deps);
    }
  });

  return deps;
}

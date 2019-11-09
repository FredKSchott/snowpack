import nodePath from 'path';
import fs from 'fs';
import glob from 'glob';
import {parse} from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * An install target represents information about a dependency to install.
 * The specifier is the key pointing to the dependency, either as a package
 * name or as an actual file path within node_modules. All other properties
 * are metadata about what is actually being imported.
 */
export type InstallTarget = {
  specifier: string;
  all: boolean;
  default: boolean;
  namespace: boolean;
  named: string[];
};

function stripJsExtension(dep) {
  return dep.replace(/\.js$/, '');
}

function createInstallTarget(specifier: string, all = true): InstallTarget {
  return {
    specifier,
    all,
    default: false,
    namespace: false,
    named: [],
  };
}

/**
 * parses an import specifier, looking for a web modules to install. If a web module is not detected,
 * null is returned.
 */
function parseWebModuleSpecifier(specifier: string, knownDependencies: string[]): null | string {
  const webModulesIndex = specifier.indexOf('web_modules/');
  if (webModulesIndex === -1) {
    return null;
  }
  // check if the resolved specifier (including file extension) is a known package.
  const resolvedSpecifier = specifier.substring(webModulesIndex + 'web_modules/'.length);
  if (knownDependencies.includes(resolvedSpecifier)) {
    return resolvedSpecifier;
  }
  // check if the resolved specifier (without extension) is a known package.
  const resolvedSpecifierWithoutExtension = stripJsExtension(resolvedSpecifier);
  if (knownDependencies.includes(resolvedSpecifierWithoutExtension)) {
    return resolvedSpecifierWithoutExtension;
  }
  // Otherwise, this is an explicit import to a file within a package.
  return resolvedSpecifier;
}

function getInstallTargetsForFile(code: string, knownDependencies: string[]): InstallTarget[] {
  const allImports: InstallTarget[] = [];
  try {
    const ast = parse(code, {plugins: ['dynamicImport'], sourceType: 'module'});
    traverse(ast, {
      ImportDeclaration(path) {
        const webModuleSpecifier = parseWebModuleSpecifier(
          path.node.source.value,
          knownDependencies,
        );
        if (webModuleSpecifier) {
          allImports.push({
            specifier: webModuleSpecifier,
            all: false,
            default: path.node.specifiers.some(s => s.type === 'ImportDefaultSpecifier'),
            namespace: path.node.specifiers.some(s => s.type === 'ImportNamespaceSpecifier'),
            named: path.node.specifiers
              .map(s => s.type === 'ImportSpecifier' && s.imported.name)
              .filter(Boolean),
          });
        }
      },
      Import(path) {
        // Only match dynamic imports that are called as a function
        if (path.parent.type !== 'CallExpression') {
          return;
        }
        // Only match dynamic imports called with a single string argument
        const [argNode] = path.parent.arguments;
        if (argNode.type !== 'StringLiteral') {
          return;
        }
        // Analyze that string argument as an import specifier
        const webModuleSpecifier = parseWebModuleSpecifier(argNode.value, knownDependencies);
        if (webModuleSpecifier) {
          allImports.push(createInstallTarget(webModuleSpecifier, true));
        }
      },
    });
  } catch (e) {
    // TODO: report the error
    return [];
  }
  return allImports;
}

export function scanWhitelist(whitelist: string[], cwd: string): InstallTarget[] {
  const nodeModulesLoc = nodePath.join(cwd, 'node_modules');
  return whitelist
    .map(whitelistItem => {
      if (!glob.hasMagic(whitelistItem)) {
        return [createInstallTarget(whitelistItem, true)];
      } else {
        return scanWhitelist(glob.sync(whitelistItem, {cwd: nodeModulesLoc, nodir: true}), cwd);
      }
    })
    .reduce((flat, item) => flat.concat(item));
}

export function scanImports(include: string, knownDependencies: string[]): InstallTarget[] {
  const includeFiles = glob.sync(include, {nodir: true});
  if (!includeFiles.length) {
    console.warn(`Warning: No files matching "${include}"`);
    return [];
  }

  // Scan every matched JS file for web dependency imports
  return includeFiles
    .filter(file => file.endsWith('.js') || file.endsWith('mjs'))
    .map(file => fs.readFileSync(file, 'utf8'))
    .map(code => getInstallTargetsForFile(code, knownDependencies))
    .reduce((flat, item) => flat.concat(item))
    .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier));
}

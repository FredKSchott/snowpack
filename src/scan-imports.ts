import nodePath from 'path';
import fs from 'fs';
import glob from 'glob';
import validatePackageName from 'validate-npm-package-name';
import {init, parse} from 'es-module-lexer';

const WEB_MODULES_TOKEN = 'web_modules/';
const WEB_MODULES_TOKEN_LENGTH = WEB_MODULES_TOKEN.length;

// [@\w] - Match a word-character or @ (valid package name)
// (?!.*(:\/\/)) - Ignore if previous match was a protocol (ex: http://)
const BARE_SPECIFIER_REGEX = /^[@\w](?!.*(:\/\/))/;
const NAMED_IMPORTS_REGEX = /^[\w\s\,]*\{(.*)\}/;

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

function stripJsExtension(dep: string): string {
  return dep.replace(/\.m?js$/i, '');
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

function removeSpecifierQueryString(specifier: string) {
  const queryStringIndex = specifier.indexOf('?');
  if (queryStringIndex >= 0) {
    specifier = specifier.substring(0, queryStringIndex);
  }
  return specifier;
}

function removeSpecifierQuotes(specifier: string) {
  const strippedSpecifier = specifier.replace(/[\'\"]/g, '');
  return strippedSpecifier;
}

/**
 * parses an import specifier, looking for a web modules to install. If a web module is not detected,
 * null is returned.
 */
function parseWebModuleSpecifier(specifier: string): null | string {
  // Remove any quotes included in the specifier
  // (left over from dynamic import parameters)
  const pureSpecifier = removeSpecifierQuotes(specifier);

  // If specifier is a "bare module specifier" (ie: package name) just return it directly
  if (BARE_SPECIFIER_REGEX.test(pureSpecifier)) {
    return pureSpecifier;
  }
  // Clean the specifier, remove any query params that may mess with matching
  const cleanedSpecifier = removeSpecifierQueryString(pureSpecifier);
  // Otherwise, check that it includes the "web_modules/" directory
  const webModulesIndex = cleanedSpecifier.indexOf(WEB_MODULES_TOKEN);
  if (webModulesIndex === -1) {
    return null;
  }

  // Check if this matches `@scope/package.js` or `package.js` format.
  // If it is, assume that this is a top-level pcakage that should be installed without the “.js”
  const resolvedSpecifier = cleanedSpecifier.substring(webModulesIndex + WEB_MODULES_TOKEN_LENGTH);
  const resolvedSpecifierWithoutExtension = stripJsExtension(resolvedSpecifier);
  if (validatePackageName(resolvedSpecifierWithoutExtension).validForNewPackages) {
    return resolvedSpecifierWithoutExtension;
  }
  // Otherwise, this is an explicit import to a file within a package.
  return resolvedSpecifier;
}

function getInstallTargetsForFile(filePath: string, code: string): InstallTarget[] {
  const [imports] = parse(code) || [];
  const allImports: InstallTarget[] = [];

  for (const {s: start, e: end, ss: sStart, se: sEnd, d: dynamicImportIndex} of imports) {
    const webModuleSpecifier = parseWebModuleSpecifier(code.substring(start, end));
    if (!webModuleSpecifier) {
      continue;
    }

    const importStatement = code.substring(sStart, sEnd);
    const dynamicImport = dynamicImportIndex > -1;
    const defaultImport = !dynamicImport && !importStatement.includes('{');
    const namespaceImport = !dynamicImport && importStatement.includes('as');

    const namedImports = (importStatement.match(NAMED_IMPORTS_REGEX) || [, ''])[1]
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);

    allImports.push({
      specifier: webModuleSpecifier,
      all: dynamicImport,
      default: defaultImport,
      namespace: namespaceImport,
      named: namedImports,
    });
  }

  return allImports;
}

// function getInstallTargetsForFile(filePath: string, code: string): InstallTarget[] {
//   console.log('getInstallTargetsForFile');
//   const allImports: InstallTarget[] = [];
//   try {
//     const ast = parse(code, {plugins: ['dynamicImport'], sourceType: 'module'});
//     traverse(ast, {
//       ImportDeclaration(path) {
//         const webModuleSpecifier = parseWebModuleSpecifier(path.node.source.value);
//         if (webModuleSpecifier) {
//           allImports.push({
//             specifier: webModuleSpecifier,
//             all: false,
//             default: path.node.specifiers.some(s => s.type === 'ImportDefaultSpecifier'),
//             namespace: path.node.specifiers.some(s => s.type === 'ImportNamespaceSpecifier'),
//             named: path.node.specifiers
//               .map(s => s.type === 'ImportSpecifier' && s.imported.name)
//               .filter(Boolean),
//           });
//         }
//       },
//       Import(path) {
//         // Only match dynamic imports that are called as a function
//         if (path.parent.type !== 'CallExpression') {
//           return;
//         }
//         // Only match dynamic imports called with a single string argument
//         const [argNode] = path.parent.arguments;
//         if (argNode.type !== 'StringLiteral') {
//           return;
//         }
//         // Analyze that string argument as an import specifier
//         const webModuleSpecifier = parseWebModuleSpecifier(argNode.value);
//         if (webModuleSpecifier) {
//           allImports.push(createInstallTarget(webModuleSpecifier, true));
//         }
//       },
//     });
//   } catch (e) {
//     console.error(`[PARSE ERROR]: Skipping ${filePath}`);
//     return [];
//   }
//   console.log(allImports);
//   return allImports;
// }

export function scanDepList(depList: string[], cwd: string): InstallTarget[] {
  const nodeModulesLoc = nodePath.join(cwd, 'node_modules');
  return depList
    .map(whitelistItem => {
      if (!glob.hasMagic(whitelistItem)) {
        return [createInstallTarget(whitelistItem, true)];
      } else {
        return scanDepList(glob.sync(whitelistItem, {cwd: nodeModulesLoc, nodir: true}), cwd);
      }
    })
    .reduce((flat, item) => flat.concat(item), []);
}

interface ScanImportsParams {
  include: string;
  exclude?: glob.IOptions['ignore'];
}

export async function scanImports({include, exclude}: ScanImportsParams): Promise<InstallTarget[]> {
  await init;
  const includeFiles = glob.sync(include, {ignore: exclude, nodir: true});
  if (!includeFiles.length) {
    console.warn(`[SCAN ERROR]: No files matching "${include}"`);
    return [];
  }

  // Scan every matched JS file for web dependency imports
  return includeFiles
    .filter(filePath => filePath.endsWith('.js') || filePath.endsWith('mjs'))
    .map(filePath => [filePath, fs.readFileSync(filePath, 'utf8')])
    .map(([filePath, code]) => getInstallTargetsForFile(filePath, code))
    .reduce((flat, item) => flat.concat(item), [])
    .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier));
}

import chalk from 'chalk';
import nodePath from 'path';
import fs from 'fs';
import glob from 'glob';
import validatePackageName from 'validate-npm-package-name';
import {init as initESModuleLexer, parse, ImportSpecifier} from 'es-module-lexer';
import {isTruthy} from './util';

const WEB_MODULES_TOKEN = 'web_modules/';
const WEB_MODULES_TOKEN_LENGTH = WEB_MODULES_TOKEN.length;

// [@\w] - Match a word-character or @ (valid package name)
// (?!.*(:\/\/)) - Ignore if previous match was a protocol (ex: http://)
const BARE_SPECIFIER_REGEX = /^[@\w](?!.*(:\/\/))/;
const HAS_NAMED_IMPORTS_REGEX = /^[\w\s\,]*\{(.*)\}/s;
const SPLIT_NAMED_IMPORTS_REGEX = /\bas\s+\w+|,/s;
const DEFAULT_IMPORT_REGEX = /import\s+(\w)+(,\s\{[\w\s]*\})?\s+from/s;

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

function getWebModuleSpecifierFromCode(code: string, imp: ImportSpecifier) {
  if (imp.d > -1) {
    return code.substring(imp.s + 1, imp.e - 1);
  }
  return code.substring(imp.s, imp.e);
}

/**
 * parses an import specifier, looking for a web modules to install. If a web module is not detected,
 * null is returned.
 */
function parseWebModuleSpecifier(specifier: string): null | string {
  // If specifier is a "bare module specifier" (ie: package name) just return it directly
  if (BARE_SPECIFIER_REGEX.test(specifier)) {
    return specifier;
  }
  // Clean the specifier, remove any query params that may mess with matching
  const cleanedSpecifier = removeSpecifierQueryString(specifier);
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

function parseImportStatement(code: string, imp: ImportSpecifier): null | InstallTarget {
  const webModuleSpecifier = parseWebModuleSpecifier(getWebModuleSpecifierFromCode(code, imp));

  if (!webModuleSpecifier) {
    return null;
  }

  const importStatement = code.substring(imp.ss, imp.se);
  const dynamicImport = imp.d > -1;
  const defaultImport = !dynamicImport && DEFAULT_IMPORT_REGEX.test(importStatement);
  const namespaceImport = !dynamicImport && importStatement.includes('*');

  const namedImports = (importStatement.match(HAS_NAMED_IMPORTS_REGEX)! || [, ''])[1]
    .split(SPLIT_NAMED_IMPORTS_REGEX)
    .map(name => name.trim())
    .filter(isTruthy);

  return {
    specifier: webModuleSpecifier,
    all: dynamicImport,
    default: defaultImport,
    namespace: namespaceImport,
    named: namedImports,
  };
}

function getInstallTargetsForFile(filePath: string, code: string): InstallTarget[] {
  const [imports] = parse(code) || [];
  const allImports: InstallTarget[] = imports
    .map(imp => parseImportStatement(code, imp))
    .filter(isTruthy);
  return allImports;
}

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
  await initESModuleLexer;
  const includeFiles = glob.sync(include, {ignore: exclude, nodir: true});
  if (!includeFiles.length) {
    console.warn(`[SCAN ERROR]: No files matching "${include}"`);
    return [];
  }

  // Scan every matched JS file for web dependency imports
  return includeFiles
    .filter(filePath => {
      if (filePath.endsWith('.js') || filePath.endsWith('mjs') || filePath.endsWith('.ts')) {
        return true;
      }
      console.warn(chalk.dim(`ignoring unsupported file "${filePath}"`));
      return false;
    })
    .map(filePath => [filePath, fs.readFileSync(filePath, 'utf8')])
    .map(([filePath, code]) => getInstallTargetsForFile(filePath, code))
    .reduce((flat, item) => flat.concat(item), [])
    .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier));
}

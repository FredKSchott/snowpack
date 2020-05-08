import babel from '@babel/core';
import chalk from 'chalk';
import nodePath from 'path';
import fs from 'fs';
import glob from 'glob';
import mime from 'mime-types';
import validatePackageName from 'validate-npm-package-name';
import {init as initESModuleLexer, parse, ImportSpecifier} from 'es-module-lexer';
import {isTruthy} from './util';
import {DevScripts, SnowpackConfig} from './config';

const WEB_MODULES_TOKEN = 'web_modules/';
const WEB_MODULES_TOKEN_LENGTH = WEB_MODULES_TOKEN.length;

// [@\w] - Match a word-character or @ (valid package name)
// (?!.*(:\/\/)) - Ignore if previous match was a protocol (ex: http://)
const BARE_SPECIFIER_REGEX = /^[@\w](?!.*(:\/\/))/;
const HAS_NAMED_IMPORTS_REGEX = /^[\w\s\,]*\{(.*)\}/s;
const SPLIT_NAMED_IMPORTS_REGEX = /\bas\s+\w+|,/s;
const DEFAULT_IMPORT_REGEX = /import\s+(\w)+(,\s\{[\w\s]*\})?\s+from/s;

const HTML_JS_REGEX = /<script.*?>(.*)<\/script>/gm;

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
  // import.meta: we can ignore
  if (imp.d === -2) {
    return null;
  }
  // Static imports: easy to parse
  if (imp.d === -1) {
    return code.substring(imp.s, imp.e);
  }
  // Dynamic imports: a bit trickier to parse. Today, we only support string literals.
  const importStatement = code.substring(imp.s, imp.e);
  const importSpecifierMatch = importStatement.match(/^\s*['"](.*)['"]\s*$/m);
  return importSpecifierMatch ? importSpecifierMatch[1] : null;
}

/**
 * parses an import specifier, looking for a web modules to install. If a web module is not detected,
 * null is returned.
 */
function parseWebModuleSpecifier(specifier: string | null): null | string {
  if (!specifier) {
    return null;
  }
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
  if (/^import\s+type/.test(importStatement)) {
    return null;
  }

  const dynamicImport = imp.d > -1;
  const defaultImport = !dynamicImport && DEFAULT_IMPORT_REGEX.test(importStatement);
  const namespaceImport = !dynamicImport && importStatement.includes('*');

  const namedImports = (importStatement.match(HAS_NAMED_IMPORTS_REGEX)! || [, ''])[1]
    .split(SPLIT_NAMED_IMPORTS_REGEX)
    .map((name) => name.trim())
    .filter(isTruthy);

  return {
    specifier: webModuleSpecifier,
    all: dynamicImport,
    default: defaultImport,
    namespace: namespaceImport,
    named: namedImports,
  };
}

function getInstallTargetsForFile(code: string): InstallTarget[] {
  const [imports] = parse(code) || [];
  const allImports: InstallTarget[] = imports
    .map((imp) => parseImportStatement(code, imp))
    .filter(isTruthy);
  return allImports;
}

export function scanDepList(depList: string[], cwd: string): InstallTarget[] {
  return depList
    .map((whitelistItem) => {
      if (!glob.hasMagic(whitelistItem)) {
        return [createInstallTarget(whitelistItem, true)];
      } else {
        const nodeModulesLoc = nodePath.join(cwd, 'node_modules');
        return scanDepList(glob.sync(whitelistItem, {cwd: nodeModulesLoc, nodir: true}), cwd);
      }
    })
    .reduce((flat, item) => flat.concat(item), []);
}

export async function scanImports(
  cwd: string,
  {scripts, exclude}: SnowpackConfig,
): Promise<InstallTarget[]> {
  await initESModuleLexer;
  const includeFileSets = await Promise.all(
    Object.entries(scripts).map(([id, scriptConfig]) => {
      if (!id.startsWith('mount:')) {
        return [];
      }
      const cmdArr = scriptConfig.cmd.split(/\s+/);
      if (cmdArr[0] !== 'mount') {
        throw new Error(`script[${id}] must use the mount command`);
      }
      cmdArr.shift();
      if (cmdArr[0].includes('web_modules')) {
        return [];
      }
      const dirDisk = nodePath.resolve(cwd, cmdArr[0]);
      return glob.sync(`**/*`, {
        ignore: exclude,
        cwd: dirDisk,
        absolute: true,
        nodir: true,
      });
    }),
  );
  const includeFiles = Array.from(new Set(([] as string[]).concat.apply([], includeFileSets)));
  if (includeFiles.length === 0) {
    console.warn(`[ERROR]: No mouned files.`);
    return [];
  }

  // Scan every matched JS file for web dependency imports
  const loadedFiles = await Promise.all(
    includeFiles.map(async (filePath) => {
      const ext = nodePath.extname(filePath);
      // Always ignore dotfiles
      if (filePath.startsWith('.')) {
        return null;
      }
      // Probably a license, a README, etc
      if (ext === '') {
        return null;
      }
      // Our import scanner can handle normal JS & even TypeScript without a problem.
      if (ext === '.js' || ext === '.mjs' || ext === '.ts') {
        return fs.promises.readFile(filePath, 'utf-8');
      }
      // JSX breaks our import scanner, so we need to transform it before sending it to our scanner.
      if (ext === '.jsx' || ext === '.tsx') {
        const result = await babel.transformFileAsync(filePath, {
          plugins: [
            [require('@babel/plugin-transform-react-jsx'), {runtime: 'classic'}],
            [require('@babel/plugin-syntax-typescript'), {isTSX: true}],
          ],
          babelrc: false,
          configFile: false,
        });
        return result && result.code;
      }
      if (ext === '.vue' || ext === '.svelte') {
        const result = await fs.promises.readFile(filePath, 'utf-8');
        // TODO: Replace with matchAll once Node v10 is out of TLS.
        // const allMatches = [...result.matchAll(HTML_JS_REGEX)];
        const allMatches: string[] = [];
        let match;
        while ((match = HTML_JS_REGEX.exec(result))) {
          allMatches.push(match);
        }
        return allMatches.map((full, code) => code).join('\n');
      }
      // If we don't recognize the file type, it could be source. Warn just in case.
      if (!mime.lookup(nodePath.extname(filePath))) {
        console.warn(
          chalk.dim(`ignoring unsupported file "${nodePath.relative(process.cwd(), filePath)}"`),
        );
      }
      return null;
    }),
  );
  return (loadedFiles as string[])
    .filter((code) => !!code)
    .map((code) => getInstallTargetsForFile(code))
    .reduce((flat, item) => flat.concat(item), [])
    .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier));
}
